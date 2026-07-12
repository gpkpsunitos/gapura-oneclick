"""
Auto-detect column roles from any Google Sheets schema.

Resilience layers (in priority order):
  0. Exact priority match on known Gapura column names
  1. Fuzzy fallback (SequenceMatcher ≥ 0.85) for renamed columns
  2. Keyword heuristic scoring
  3. Value-pattern detection (dates, status words)

validate_schema() adds one more layer: if a saved schema references a column
that no longer exists, it attempts fuzzy recovery before dropping the role.
"""
import difflib
import json
from pathlib import Path
from typing import Optional

import pandas as pd

from config import DATA_DIR

SCHEMA_PATH = DATA_DIR / "schema.json"

# Priority override for well-known Gapura sheet column names.
# Applied before heuristic detection. Keys are lowercased for matching.
PRIORITY_COLUMN_ROLES: dict[str, str] = {
    "_incident_area_category": "subcategory",
    "_root_cause_clustered":   "root_cause",
    "report":                  "description",
    "root caused":             "root_cause",
    "report category":         "category",
    "airlines":                "airline",
    "station":                 "branch",
    "date of event":           "date",
    "status":                  "status",
    "area":                    "area",
}

ROLE_KEYWORDS: dict[str, list[str]] = {
    "date":        ["tanggal", "date", "waktu", "time", "created", "tgl", "timestamp", "tgl_kejadian", "event"],
    "description": ["uraian", "description", "deskripsi", "keterangan", "detail", "narasi", "kejadian",
                    "kronologi", "uraian_kejadian", "report", "laporan", "log", "notes", "incident"],
    "subcategory": ["subkategori", "subcategory", "sub_category", "sub_kategori", "terminal_area",
                    "apron_area", "general_category", "area_category", "_incident_area_category",
                    "case_classification", "identification"],
    "root_cause":  ["akar_masalah", "root_caused", "root_cause", "rootcause", "penyebab", "akar", "cause",
                    "identification_of_root", "root"],
    "airline":     ["maskapai", "airline", "airlines", "carrier", "msk"],
    "branch":      ["cabang", "branch", "station", "stasiun", "lokasi"],
    "status":      ["status", "state", "kondisi"],
    "category":    ["kategori", "category", "cat", "report_category", "case_category"],
    "area":        ["area", "zona", "zone", "wilayah"],
}

STATUS_VALUES = {
    "open", "closed", "resolved", "pending", "in progress", "done",
    "selesai", "proses", "buka", "tutup", "close", "resolve",
}


# ── Fuzzy helpers ─────────────────────────────────────────────────────────────

def _fuzzy_col_match(query: str, candidates: list[str], threshold: float = 0.82) -> Optional[str]:
    """
    Best fuzzy match for query in candidates using Gestalt pattern matching.
    Returns None if best score is below threshold.
    """
    q = query.lower().strip()
    best_score, best_match = 0.0, None
    for c in candidates:
        score = difflib.SequenceMatcher(None, q, c.lower().strip()).ratio()
        if score > best_score:
            best_score, best_match = score, c
    return best_match if best_score >= threshold else None


# ── Column utility helpers ────────────────────────────────────────────────────

def _keyword_score(col: str, keywords: list[str]) -> int:
    col_norm = col.lower().replace(" ", "_")
    return sum(1 for kw in keywords if kw in col_norm)


def _is_string_col(series: pd.Series) -> bool:
    return series.dtype.kind in ("O", "U", "S")


def _is_url_col(series: pd.Series) -> bool:
    sample = series.dropna().astype(str).head(30)
    if len(sample) == 0:
        return False
    url_count = sum(1 for v in sample if v.startswith(("http://", "https://", "www.")))
    return url_count / len(sample) > 0.30


def _max_unique_ratio(series: pd.Series) -> float:
    n = series.notna().sum()
    return series.nunique() / n if n > 0 else 0.0


def _date_parse_rate(series: pd.Series) -> float:
    try:
        parsed = pd.to_datetime(series.astype(str), errors="coerce", dayfirst=False)
        return float(parsed.notna().mean())
    except Exception:
        return 0.0


# ── Core detection ────────────────────────────────────────────────────────────

def detect_schema(df: pd.DataFrame) -> dict:
    """
    Inspect df headers + sample values to assign column roles.
    Returns mapping like {"date": "col_name", "description": "col_name", ...}.
    Missing roles are omitted — callers must handle None gracefully.
    """
    cols = list(df.columns)
    mapping: dict[str, str] = {}
    used: set[str] = set()

    # 0. Priority exact match, then fuzzy fallback (threshold 0.85 — conservative)
    col_lower_map = {c.lower().strip(): c for c in cols}
    for col_name_lower, role in PRIORITY_COLUMN_ROLES.items():
        if role in mapping:
            continue
        if col_name_lower in col_lower_map:
            actual_col = col_lower_map[col_name_lower]
            if actual_col not in used:
                mapping[role] = actual_col
                used.add(actual_col)
        else:
            avail = [c for c in cols if c not in used]
            fuzzy = _fuzzy_col_match(col_name_lower, avail, threshold=0.85)
            if fuzzy:
                mapping[role] = fuzzy
                used.add(fuzzy)
                print(f"[schema] Fuzzy priority: '{col_name_lower}' → '{fuzzy}' (role={role})")

    # 1. Date: highest date-parse rate + keyword boost
    if "date" not in mapping:
        date_score = {
            c: _date_parse_rate(df[c]) + _keyword_score(c, ROLE_KEYWORDS["date"]) * 0.15
            for c in cols if c not in used
        }
        if date_score:
            best_date = max(date_score, key=lambda c: date_score[c])
            if _date_parse_rate(df[best_date]) > 0.4:
                mapping["date"] = best_date
                used.add(best_date)

    # 2. Description: highest avg string length among string cols (min 15 chars avg)
    obj_cols = [c for c in cols if c not in used and _is_string_col(df[c]) and not _is_url_col(df[c])]
    if "description" not in mapping and obj_cols:
        avg_len  = {c: df[c].dropna().astype(str).str.len().mean() for c in obj_cols}
        kw_boost = {c: _keyword_score(c, ROLE_KEYWORDS["description"]) * 30 for c in obj_cols}
        desc_score = {c: avg_len.get(c, 0) + kw_boost[c] for c in obj_cols}
        best_desc = max(obj_cols, key=lambda c: desc_score[c])
        if avg_len.get(best_desc, 0) > 15:
            mapping["description"] = best_desc
            used.add(best_desc)

    # 3. Categorical roles
    LABEL_ROLES = {"subcategory", "root_cause", "category", "area"}
    for role in ["category", "root_cause", "subcategory", "status", "airline", "branch", "area"]:
        if role in mapping:
            continue
        remaining = [
            c for c in cols
            if c not in used and _is_string_col(df[c]) and not _is_url_col(df[c])
        ]
        if not remaining:
            break

        if role in LABEL_ROLES:
            remaining = [
                c for c in remaining
                if not (df[c].nunique() > 80 and _max_unique_ratio(df[c]) > 0.4)
            ]

        scored = sorted(remaining, key=lambda c: _keyword_score(c, ROLE_KEYWORDS[role]), reverse=True)
        best = scored[0] if scored else None

        if best and _keyword_score(best, ROLE_KEYWORDS[role]) > 0:
            mapping[role] = best
            used.add(best)
        elif role == "status":
            for c in remaining:
                vals = set(df[c].dropna().astype(str).str.lower().unique())
                if len(vals & STATUS_VALUES) >= 1:
                    mapping["status"] = c
                    used.add(c)
                    break

    return mapping


# ── Drift detection ───────────────────────────────────────────────────────────

def detect_schema_drift(new_schema: dict, old_schema: dict) -> dict:
    """
    Compare two schemas and return a structured diff.
    Returns {"added": {...}, "removed": {...}, "changed": {...}}.
    """
    added   = {r: new_schema[r] for r in new_schema if r not in old_schema}
    removed = {r: old_schema[r] for r in old_schema if r not in new_schema}
    changed = {
        r: {"old": old_schema[r], "new": new_schema[r]}
        for r in new_schema
        if r in old_schema and old_schema[r] != new_schema[r]
    }
    return {"added": added, "removed": removed, "changed": changed}


# ── Persistence ───────────────────────────────────────────────────────────────

def load_schema() -> Optional[dict]:
    if SCHEMA_PATH.exists():
        try:
            return json.loads(SCHEMA_PATH.read_text())
        except Exception:
            return None
    return None


def save_schema(mapping: dict) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    SCHEMA_PATH.write_text(json.dumps(mapping, indent=2, ensure_ascii=False))


def get_schema(df: pd.DataFrame, force_detect: bool = True) -> dict:
    """
    Auto-detect schema from df, log drift vs previous run, and save.

    force_detect=True (default) ensures every retrain adapts to the current sheet.
    Pass force_detect=False only when you need to reuse the last saved schema
    (e.g., during inference without a fresh df).
    """
    old_schema = load_schema()

    if not force_detect and old_schema:
        return old_schema

    detected = detect_schema(df)

    if old_schema:
        drift = detect_schema_drift(detected, old_schema)
        if any(drift[k] for k in ("added", "removed", "changed")):
            print(f"[schema] DRIFT DETECTED vs last run:")
            if drift["added"]:
                print(f"  + added roles:   {drift['added']}")
            if drift["removed"]:
                print(f"  - removed roles: {drift['removed']}")
            if drift["changed"]:
                print(f"  ~ changed cols:  {drift['changed']}")
        else:
            print("[schema] No schema drift — same as last run.")

    save_schema(detected)
    return detected


def validate_schema(schema: dict, df: pd.DataFrame) -> dict:
    """
    Remove stale schema entries whose column no longer exists in df.
    Attempts fuzzy column recovery (threshold 0.82) before dropping a role.
    """
    valid = {}
    for role, col in schema.items():
        if col in df.columns:
            valid[role] = col
        else:
            avail = [c for c in df.columns if c not in valid.values()]
            fuzzy = _fuzzy_col_match(col, avail, threshold=0.82)
            if fuzzy:
                valid[role] = fuzzy
                print(f"[schema] Fuzzy recovery: '{col}' → '{fuzzy}' (role={role})")
            else:
                print(f"[schema] Stale role '{role}' ('{col}' missing, no fuzzy match) — dropping")
    return valid
