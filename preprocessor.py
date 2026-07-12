"""
Clean raw DataFrame using detected schema.
Returns typed inputs per task.

Classification inputs come in two shapes:
  X_serve — report text + context tokens available at report time
            (category / airline / branch / area / form type). This is
            EXACTLY what the API can reconstruct at prediction time.
  X_aug   — X_serve enriched with post-investigation text (Root Caused,
            Action Taken, ...). Used as training augmentation only; never
            evaluated on, never served.

Target-leakage guard: any column the label was derived from is excluded
from BOTH shapes for that role.
"""
from typing import Optional

import numpy as np
import pandas as pd

from canonicalize import consolidate_labels
from config import today
from models.classifier import _clean_text, build_serve_text

# Post-investigation text columns usable as training augmentation, per role.
# root_cause's label is keyword-derived from 'Root Caused' → leakage → excluded.
ROLE_AUG_COLUMNS: dict[str, list[str]] = {
    "category":    ["Root Caused", "Action Taken"],
    "root_cause":  ["Action Taken"],
    "subcategory": ["Root Caused", "Action Taken", "Identification of Root"],
}

# Higher floor for subcategory: many area-category classes have only 3-5
# examples which adds noise without adding signal.
ROLE_MIN_SAMPLES: dict[str, int] = {
    "subcategory": 8,
}

KNOWN_CONTEXT_COLS = {
    "category": ["Report Category", "Category"],
    "airline":  ["Airlines", "Airline"],
    "branch":   ["Station", "Branch"],
    "area":     ["Area"],
}


def _coerce_dates(series: pd.Series) -> pd.Series:
    """Convert Excel serial numbers or date strings (including 'January 25, 2025') to datetime."""
    epoch = pd.Timestamp("1899-12-30")

    def _parse(v):
        if v is None or (isinstance(v, float) and np.isnan(v)):
            return pd.NaT
        if isinstance(v, pd.Timestamp):
            return v
        s = str(v).strip()
        if not s or s.lower() in ("none", "nan", ""):
            return pd.NaT
        if s.replace(".", "").isdigit():
            try:
                return epoch + pd.Timedelta(days=float(s))
            except Exception:
                return pd.NaT
        for fmt in ("%B %d, %Y", "%d %B %Y", "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y"):
            try:
                return pd.to_datetime(s, format=fmt)
            except Exception:
                continue
        return pd.to_datetime(s, errors="coerce", dayfirst=False)

    return series.apply(_parse)


def prepare_time_series(df: pd.DataFrame, schema: dict) -> Optional[pd.Series]:
    """
    Returns daily incident count Series indexed by date.
    Returns None if date column missing or fewer than 14 data points.
    """
    date_col = schema.get("date")
    if not date_col or date_col not in df.columns:
        return None

    dates = _coerce_dates(df[date_col])
    valid = dates.dropna()
    # Never let a future-dated row pad the series with phantom zero-days:
    # everything downstream (forecast horizon, STL, trend windows) anchors
    # to the series' max index.
    valid = valid[valid <= today()]
    if len(valid) < 14:
        print(f"[preprocess] Only {len(valid)} valid dates — skipping forecaster")
        return None

    ts = valid.dt.normalize().value_counts().sort_index()
    full_idx = pd.date_range(ts.index.min(), ts.index.max(), freq="D")
    ts = ts.reindex(full_idx, fill_value=0)
    return ts


def _resolve_col(df: pd.DataFrame, candidates: list[str]) -> Optional[str]:
    for c in candidates:
        if c in df.columns:
            return c
    return None


def _get_context_col(df: pd.DataFrame, schema: dict, role: str) -> Optional[str]:
    col = schema.get(role)
    if col and col in df.columns:
        return col
    return _resolve_col(df, KNOWN_CONTEXT_COLS.get(role, []))


def _cell(row: pd.Series, col: Optional[str]):
    if not col:
        return None
    v = row.get(col)
    if v is None or str(v).strip().lower() in ("", "none", "nan"):
        return None
    return v


def prepare_classification(
    df: pd.DataFrame,
    schema: dict,
    label_role: str,
    min_samples_per_class: int = 3,
) -> Optional[tuple]:
    """
    Returns (X_serve, y, X_aug, X_raw):
      X_serve — serve-shape training text (see module docstring)
      X_aug   — augmentation-shape text (aligned with X_serve row-for-row)
      X_raw   — raw report text for sentence embeddings (aligned)
    Rows are deduplicated on (cleaned report text, label) so template texts
    can't leak across CV folds. Returns None if insufficient data.
    """
    label_col = schema.get(label_role)
    if not label_col or label_col not in df.columns:
        print(f"[preprocess] No '{label_role}' column in schema — skipping classifier")
        return None

    desc_col = schema.get("description") or _resolve_col(df, ["Report"])
    if not desc_col or desc_col not in df.columns:
        print(f"[preprocess] No description column — skipping {label_role} classifier")
        return None

    # Context columns (serve-time legit). The label's own column is excluded.
    cat_col  = _get_context_col(df, schema, "category")
    air_col  = _get_context_col(df, schema, "airline")
    br_col   = _get_context_col(df, schema, "branch")
    area_col = _get_context_col(df, schema, "area")
    sheet_col = "_sheet" if "_sheet" in df.columns else None

    leak_cols = {label_col}
    _nl = lambda c: None if c in leak_cols else c
    cat_col, air_col, br_col, area_col = _nl(cat_col), _nl(air_col), _nl(br_col), _nl(area_col)

    aug_cols = [c for c in ROLE_AUG_COLUMNS.get(label_role, [])
                if c in df.columns and c not in leak_cols]

    sub = df.dropna(subset=[label_col])
    sub = sub[sub[label_col].astype(str).str.strip().ne("")]
    sub = sub[sub[desc_col].astype(str).str.strip().str.lower()
              .apply(lambda s: s not in ("", "none", "nan"))]
    if sub.empty:
        print(f"[preprocess] No labeled rows with text for {label_role}")
        return None

    def _serve_text(row):
        return build_serve_text(
            str(row.get(desc_col, "")),
            category=_cell(row, cat_col),
            airline=_cell(row, air_col),
            branch=_cell(row, br_col),
            area=_cell(row, area_col),
            sheet=_cell(row, sheet_col),
        )

    def _aug_text(row):
        extra = [str(row[c]) for c in aug_cols if _cell(row, c) is not None]
        merged = " | ".join([str(row.get(desc_col, ""))] + extra)
        return build_serve_text(
            merged,
            category=_cell(row, cat_col),
            airline=_cell(row, air_col),
            branch=_cell(row, br_col),
            area=_cell(row, area_col),
            sheet=_cell(row, sheet_col),
        )

    effective_min = ROLE_MIN_SAMPLES.get(label_role, min_samples_per_class)

    # Self-healing labels: collapse case/typo/suffix variants; rescue tail
    # classes into their token-superset parents instead of discarding them.
    y_raw = sub[label_col].astype(str).str.strip()
    y_canon = consolidate_labels(y_raw, min_samples=effective_min)

    tbl = pd.DataFrame({
        "clean_report": sub[desc_col].astype(str).apply(_clean_text),
        "X_serve":      sub.apply(_serve_text, axis=1),
        "X_aug":        sub.apply(_aug_text, axis=1),
        "X_raw":        sub[desc_col].astype(str).str.strip(),  # for sentence embeddings
        "y":            y_canon,
    })
    tbl = tbl[tbl["clean_report"].str.len() > 0]

    # Dedup on the serve-visible report text + label (one vote per template)
    n_before = len(tbl)
    tbl = tbl.drop_duplicates(subset=["clean_report", "y"]).reset_index(drop=True)
    counts = tbl["y"].value_counts()
    tbl = tbl[tbl["y"].isin(counts[counts >= effective_min].index)].reset_index(drop=True)

    if len(tbl) < 10 or tbl["y"].nunique() < 2:
        print(
            f"[preprocess] Insufficient data for {label_role}: "
            f"{len(tbl)} rows, {tbl['y'].nunique()} classes"
        )
        return None

    print(
        f"[preprocess] {label_role}: {len(tbl)} unique rows "
        f"({n_before - len(tbl)} template dupes collapsed), "
        f"{tbl['y'].nunique()} classes, aug cols: {aug_cols}"
    )
    return tbl["X_serve"], tbl["y"], tbl["X_aug"], tbl["X_raw"]


def prepare_risk_inputs(df: pd.DataFrame, schema: dict) -> dict:
    """Returns risk grouping inputs. Called by risk_scorer.score()."""
    return {
        role: schema[role]
        for role in ["airline", "branch", "area"]
        if schema.get(role) and schema[role] in df.columns
    }
