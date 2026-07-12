"""
Fetch all rows from Google Sheets into a pandas DataFrame.
Supports two credential formats:
  1. GOOGLE_CREDENTIALS_JSON  — full service account JSON string (HF Spaces)
  2. GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY  — individual fields (local dev)
Reads multiple sheet tabs and concatenates them.
Handles Excel serial date numbers automatically.
"""
import json
import os
import re
from typing import Optional

import gspread
import numpy as np
import pandas as pd
from google.oauth2.service_account import Credentials

from canonicalize import canonicalize_entities
from config import DATA_DIR, get_logger, today

log = get_logger("fetcher")

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
]

# Last successfully fetched + cleaned snapshot; served if Sheets is unreachable
SHEET_CACHE_PATH = DATA_DIR / "sheet_cache.pkl"

# Excel epoch offset: days from 1900-01-00 to 1970-01-01
_EXCEL_EPOCH = pd.Timestamp("1899-12-30")

# Values that mark a row as test/dummy data — never real operations
_TEST_VALUES = {"test", "testing", "dummy", "xxx", "coba", "percobaan"}

# Columns checked for test markers (any single hit drops the row)
_TEST_CHECK_COLS = ["Airlines", "Station", "Area", "Status", "Report Category", "Report"]

# Seed overrides for entity canonicalization: business-known aliases the fuzzy
# matcher can't infer. Novel spelling variants are handled algorithmically by
# canonicalize_entities() — no code change needed when a new typo appears.
_AIRLINE_OVERRIDES = {
    "airasia": "AirAsia",
}

_AREA_OVERRIDES = {
    "apron":    "Apron Area",
    "terminal": "Terminal Area",
}


def _parse_excel_date(val) -> Optional[pd.Timestamp]:
    """Convert Excel serial number OR date string to Timestamp."""
    if val is None or (isinstance(val, float) and np.isnan(val)):
        return None
    # Excel serial number
    if isinstance(val, (int, float)):
        try:
            return _EXCEL_EPOCH + pd.Timedelta(days=float(val))
        except Exception:
            return None
    # String date
    s = str(val).strip()
    if not s or s.lower() in ("none", "nan", ""):
        return None
    return pd.to_datetime(s, errors="coerce", dayfirst=False)


def _get_client() -> gspread.Client:
    # Format 1: full JSON
    creds_raw = os.environ.get("GOOGLE_CREDENTIALS_JSON", "")
    if creds_raw:
        info = json.loads(creds_raw)
        creds = Credentials.from_service_account_info(info, scopes=SCOPES)
        return gspread.authorize(creds)

    # Format 2: individual fields (local dev, from gapura-irrs2 .env)
    email = os.environ.get("GOOGLE_SERVICE_ACCOUNT_EMAIL", "")
    raw_key = os.environ.get("GOOGLE_PRIVATE_KEY", "")
    key = raw_key.replace("\\n", "\n")
    if email and key:
        info = {
            "type": "service_account",
            "project_id": os.environ.get("GOOGLE_PROJECT_ID", "gapura-487706"),
            "private_key": key,
            "client_email": email,
            "token_uri": "https://oauth2.googleapis.com/token",
        }
        creds = Credentials.from_service_account_info(info, scopes=SCOPES)
        return gspread.authorize(creds)

    raise EnvironmentError(
        "No Google credentials found. Set GOOGLE_CREDENTIALS_JSON or "
        "GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY."
    )


def _load_worksheet(ws: gspread.Worksheet) -> pd.DataFrame:
    """Load a worksheet into a DataFrame, handling empty sheets gracefully."""
    records = ws.get_all_values()
    if not records or len(records) < 2:
        print(f"[fetcher] Sheet '{ws.title}' is empty or header-only, skipping")
        return pd.DataFrame()

    headers = [str(h).strip() for h in records[0]]
    rows = records[1:]
    df = pd.DataFrame(rows, columns=headers)

    # Drop fully empty rows
    df = df.replace("", np.nan).dropna(how="all")

    # Tag with source tab
    df["_sheet"] = ws.title
    print(f"[fetcher] '{ws.title}': {len(df)} rows × {len(df.columns) - 1} cols")
    return df


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Data hygiene before any training or analytics:
      1. Drop test/dummy rows (e.g. Airlines/Station/Area == "TEST").
      2. Drop rows whose event date is in the future or implausibly old —
         a single future-dated row otherwise anchors every trend window,
         forecast horizon, and recency cutoff to a date that never happened.
      3. Canonicalize airline and area spellings so one carrier doesn't
         appear as several entities in rankings and trends.
    """
    df = df.copy()
    n0 = len(df)

    # 1. Test/dummy rows
    test_mask = pd.Series(False, index=df.index)
    for col in _TEST_CHECK_COLS:
        if col in df.columns:
            test_mask |= (
                df[col].astype(str).str.strip().str.lower().isin(_TEST_VALUES)
            )
    if test_mask.any():
        print(f"[clean] Dropping {int(test_mask.sum())} test/dummy rows")
        df = df[~test_mask]

    # 2. Future / ancient event dates
    date_cols = [c for c in df.columns if c.strip().lower() in
                 ("date of event", "tanggal", "date", "tgl kejadian")]
    if date_cols:
        dcol = date_cols[0]
        parsed = df[dcol].apply(_parse_excel_date)
        _today = today()
        bad = parsed.notna() & ((parsed > _today + pd.Timedelta(days=1)) |
                                (parsed < pd.Timestamp("2020-01-01")))
        if bad.any():
            print(f"[clean] Dropping {int(bad.sum())} rows with future/ancient dates "
                  f"({df.loc[bad, dcol].tolist()[:5]})")
            df = df[~bad]

    # 3. Self-healing entity canonicalization (fuzzy — handles new variants)
    if "Airlines" in df.columns:
        df["Airlines"] = canonicalize_entities(df["Airlines"], overrides=_AIRLINE_OVERRIDES)
    if "Area" in df.columns:
        df["Area"] = canonicalize_entities(df["Area"], overrides=_AREA_OVERRIDES)
    if "Station" in df.columns:
        df["Station"] = canonicalize_entities(df["Station"])

    if len(df) != n0:
        print(f"[clean] {n0} → {len(df)} rows after hygiene filters")
    return df.reset_index(drop=True)


def enrich_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Post-process the raw sheet into ML-ready columns.
    Creates derived columns that are cleaner classification targets
    than any single raw column.
    """
    df = df.copy()

    # Merge area-category columns into one subcategory label.
    # Priority: Apron Area Category > Terminal Area Category > General Category
    area_cat_cols = [
        "Apron Area Category",
        "Terminal Area Category",
        "General Category",
    ]
    existing = [c for c in area_cat_cols if c in df.columns]
    if existing:
        df["_incident_area_category"] = df[existing[0]].copy()
        for c in existing[1:]:
            df["_incident_area_category"] = df["_incident_area_category"].fillna(df[c])
        # Clean up noise values
        noise = {"-", "#n/a", "n/a", "nil", "unknown", "none", "nan", ""}
        df["_incident_area_category"] = df["_incident_area_category"].apply(
            lambda v: None if str(v).strip().lower() in noise else v
        )
        print(
            f"[enrich] _incident_area_category: "
            f"{df['_incident_area_category'].notna().sum()} non-null, "
            f"{df['_incident_area_category'].nunique()} unique values"
        )

    # Cluster Root Caused into canonical groups (reduce 800 → ~20 labels).
    if "Root Caused" in df.columns:
        rc = df["Root Caused"].astype(str).str.strip()
        noise = {"-", "#n/a", "n/a", "nil", "unknown", "none", "nan", ""}

        def _cluster_root_cause(text) -> Optional[str]:
            if text is None or (isinstance(text, float)):
                return None
            t = str(text).lower().strip()
            if not t or t in noise:
                return None
            # Compliment first (before "baik" triggers other checks)
            if any(k in t for k in ["compliment", "pujian", "apresiasi", "terima kasih",
                                      "memuji", "memberikan pujian", "sangat puas"]):
                return "Compliment"
            # Security (before "screening" catches other things).
            # Includes tampering indicators for cargo/baggage (retape, opened
            # zipper, weight-label manipulation) and staff misconduct.
            if any(k in t for k in ["security", "keamanan", "screening", "x-ray",
                                      "fod", "benda asing", "foreign object", "prohibited",
                                      "manipulasi", "tamper", "pilferage", "retape",
                                      "lakban ulang", "zipper", "dicuri", "pencurian",
                                      "theft", "stolen"]):
                return "Security Issue"
            # CGO damage patterns
            if any(k in t for k in ["penyok", "dented", "bengkok", "penyot", "penyuk"]):
                return "Cargo Dented"
            if any(k in t for k in ["robek", "torn", "pecah", "hancur", "lecet", "cacat",
                                      "sobek", "retak", "bolong", "berlubang"]):
                return "Cargo Damaged"
            if any(k in t for k in ["rusak", "damage", "kerusakan"]):
                return "Cargo Damaged"
            if any(k in t for k in ["basah", "wet", "moisture", "bocor", "lembab",
                                      "banjir", "air masuk", "terkena air"]):
                return "Cargo Wet"
            if any(k in t for k in ["hilang", "missing", "lost", "ahl", "kehilangan",
                                      "tidak ditemukan", "tidak ketemu", "tdk ditemukan",
                                      "belum ditemukan", "left behind", "left his",
                                      "left her", "no trace", "ntl",
                                      "short shipment", "tidak dikirim", "tidak terkirim"]):
                return "Lost / Missing"
            # Delay & timeliness
            if any(k in t for k in ["delay", "terlambat", "late", "keterlambatan",
                                      "telat", "mundur", "tunda", "postpone"]):
                return "Delay"
            # Equipment (before human error)
            if any(k in t for k in ["equipment", "gse", "peralatan", "mesin",
                                      "conveyor", "belt", "gpu", "apu", "loader",
                                      "garbarata", "aerobridge", "escalator", "lift",
                                      "timbangan", "scale",
                                      "malfunction", "unserviceable", "mechanical",
                                      "btt", "towing tractor", "dollies", "dolly",
                                      "vacuum", "selenoid", "solenoid", "hose",
                                      "breakdown", "mati mendadak"]):
                return "Equipment Issue"
            # Airline issue (before human error)
            if any(k in t for k in ["airline", "maskapai", "pihak maskapai",
                                      "kebijakan maskapai", "aturan maskapai"]):
                return "Airline Issue"
            # Documentation & data
            if any(k in t for k in ["passport", "paspor", "dokumen", "visa", "immigration",
                                      "imigrasi", "boarding pass", "id card", "ktp",
                                      "manifest", "hawb", "awb", "formulir",
                                      "data salah", "input salah", "salah input",
                                      "system error", "kesalahan data", "perbedaan data"]):
                return "Documentation Issue"
            # Procedure / SOP
            if any(k in t for k in ["procedure", "prosedur", "sop", "standar operasi",
                                      "protocol", "alur", "tahapan", "tidak sesuai prosedur",
                                      "melanggar", "pelanggaran", "penanganan yang salah"]):
                return "Procedure Issue"
            # External / weather
            if any(k in t for k in ["cuaca", "weather", "bencana", "force majeure",
                                      "angin", "hujan", "kabut", "fog", "rain", "storm",
                                      "banjir", "gempa", "volcanic"]):
                return "External / Weather"
            # Human error (broad, catch-all for staff mistakes)
            if any(k in t for k in ["human error", "kelalaian", "kesalahan petugas",
                                      "staff", "petugas", "officer", "lalai", "ceroboh",
                                      "kurang kooperatif", "komunikasi", "salah", "lupa",
                                      "gagal", "sikap", "attitude", "tidak sopan", "kasar",
                                      "kurang ramah", "tidak memberitahu", "tidak menginformasikan",
                                      "kesalahan", "kekeliruan", "kecerobohan",
                                      "tidak memperhatikan", "kurang teliti",
                                      "lack of", "kurangnya", "failed to", "did not",
                                      "didn", "tidak termonitor", "supervisi",
                                      "koordinasi", "pengawasan", "misunderstanding",
                                      "missunderstanding", "miskomunikasi",
                                      "fault", "porter", "checker", "marshaller"]):
                return "Human Error"
            # Customer complaint (passenger behavior / dissatisfaction)
            if any(k in t for k in ["complain", "komplain", "complaint", "protes",
                                      "keberatan", "tidak puas", "kecewa", "marah",
                                      "klaim", "claim", "ganti rugi", "kompensasi",
                                      "menolak", "tidak mau", "tidak kooperatif",
                                      "pax tidak", "penumpang tidak", "pax komplain",
                                      "penumpang komplain", "passenger complaint"]):
                return "Customer Complaint"
            return None  # don't force a label; skip in training

        df["_root_cause_clustered"] = rc.apply(_cluster_root_cause)
        n_labeled = df["_root_cause_clustered"].notna().sum()
        n_classes = df["_root_cause_clustered"].nunique()
        print(f"[enrich] _root_cause_clustered: {n_labeled} labeled rows, {n_classes} classes")

    # Normalize typos in _incident_area_category
    if "_incident_area_category" in df.columns:
        _AREA_NORMALIZE = {
            # Typo fixes
            "Passenger, Baggage & Document Profilling": "Passenger, Baggage & Document Profiling",
            "Boarding disperencies": "Boarding Management",
            "Procedure Competencies": "Procedure Compliance",
            "Accurancy & Completeness of Service (Apron)": "Accuracy & Completeness of Service (Apron)",
            # Case normalisation
            "Staff attitude & Competencies": "Staff Attitude & Competencies",
            "staff attitude & competencies": "Staff Attitude & Competencies",
            # Synonym merges
            "The Availability of GSE": "GSE Availability",
            "Officer Qualified Competencies": "Officer Competencies",
            "Qualified Competencies (Apron)": "Officer Competencies",
            # Case / spelling dupes found in sheet audit
            "On time performance": "On Time Performance",
            "Officer Qualified Competencies (Apron)": "Officer Competencies",
            # Merge Apron-specific variants into their base class
            # (area context is already captured via the Area column feature token)
            "Safety and Security (Apron)": "Safety and Security",
            "Safety and Security (General)": "Safety and Security",
            "Baggage/Special/Irregularities Handling (Apron)": "Baggage/Special/Irregularities Handling",
            "Accuracy & Completeness of Service (Apron)": "Accuracy & Completeness of Service",
        }
        # Apply iteratively to resolve chains (e.g. typo-fix → Apron-merge)
        for _ in range(3):
            df["_incident_area_category"] = df["_incident_area_category"].apply(
                lambda v: _AREA_NORMALIZE.get(str(v).strip(), v) if v is not None else v
            )

    return df


def fetch_sheet(
    sheet_id: Optional[str] = None,
    sheet_names: Optional[list[str]] = None,
    fallback_to_cache: bool = True,
) -> pd.DataFrame:
    """
    Fetch and concatenate rows from one or more worksheet tabs.
    On success the cleaned+enriched snapshot is persisted; if Google Sheets is
    unreachable, the last good snapshot is served instead (stale > down).

    Env vars:
      GOOGLE_SHEET_ID    — spreadsheet ID (required)
      GOOGLE_SHEET_NAMES — comma-separated tab names (default: all sheets)
      GOOGLE_SHEET_NAME  — single tab name (fallback)
    """
    try:
        df = _fetch_sheet_live(sheet_id, sheet_names)
    except Exception as e:
        if fallback_to_cache and SHEET_CACHE_PATH.exists():
            log.warning("Sheet fetch failed (%s) — serving last good snapshot from %s",
                        e, SHEET_CACHE_PATH)
            return pd.read_pickle(SHEET_CACHE_PATH)
        raise
    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        df.to_pickle(SHEET_CACHE_PATH)
    except Exception as e:
        log.warning("Could not persist sheet snapshot: %s", e)
    return df


def _fetch_sheet_live(
    sheet_id: Optional[str] = None,
    sheet_names: Optional[list[str]] = None,
) -> pd.DataFrame:
    sheet_id = sheet_id or os.environ.get("GOOGLE_SHEET_ID", "")
    if not sheet_id:
        raise EnvironmentError("GOOGLE_SHEET_ID env var not set")

    client = _get_client()
    spreadsheet = client.open_by_key(sheet_id)

    # Resolve which tabs to read
    if sheet_names is None:
        names_env = os.environ.get("GOOGLE_SHEET_NAMES", "")
        single_env = os.environ.get("GOOGLE_SHEET_NAME", "")
        if names_env:
            sheet_names = [n.strip() for n in names_env.split(",") if n.strip()]
        elif single_env:
            sheet_names = [single_env]
        else:
            sheet_names = [ws.title for ws in spreadsheet.worksheets()]

    frames = []
    for name in sheet_names:
        try:
            ws = spreadsheet.worksheet(name)
            df = _load_worksheet(ws)
            if not df.empty:
                frames.append(df)
        except gspread.exceptions.WorksheetNotFound:
            print(f"[fetcher] Warning: sheet tab '{name}' not found, skipping")

    if not frames:
        raise ValueError("All sheets returned empty or were not found")

    combined = pd.concat(frames, ignore_index=True)

    # Normalise column names: strip whitespace
    combined.columns = [str(c).strip() for c in combined.columns]

    # Try to parse any numeric-looking date columns to proper dates
    for col in combined.columns:
        sample = combined[col].dropna().head(20)
        numeric_count = sum(1 for v in sample if isinstance(v, (int, float)) or
                            (isinstance(v, str) and v.replace(".", "").isdigit()))
        if numeric_count > len(sample) * 0.5:
            # Looks like Excel serial numbers — convert
            combined[col] = combined[col].apply(
                lambda v: _parse_excel_date(float(v)) if str(v).replace(".", "").isdigit() else v
            )

    # Strip whitespace from all string values
    for col in combined.select_dtypes(include="object").columns:
        combined[col] = combined[col].astype(str).str.strip().replace(
            {"None": None, "": None, "nan": None, "NaN": None}
        )

    print(f"[fetcher] Combined: {len(combined)} rows × {len(combined.columns)} cols")
    combined = clean_dataframe(combined)
    combined = enrich_dataframe(combined)
    return combined
