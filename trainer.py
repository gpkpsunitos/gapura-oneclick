"""
Orchestrates the full retrain cycle:
  fetch → schema detect (with drift logging) → preprocess → train each model → save metrics
"""
import json
import traceback
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd


def _to_py(o):
    """json default: convert numpy scalars (int64/float64) to native Python."""
    if isinstance(o, np.generic):
        return o.item()
    raise TypeError(f"Object of type {type(o).__name__} is not JSON serializable")

from config import DATA_DIR, SERVICE_VERSION
from data_fetcher import fetch_sheet
from models import classifier, forecaster, risk_scorer
from preprocessor import prepare_classification, prepare_risk_inputs, prepare_time_series
from schema_detector import get_schema, validate_schema

METRICS_PATH = DATA_DIR / "last_metrics.json"


def _train_classifiers(df: pd.DataFrame, schema: dict) -> dict:
    """Train category, root_cause, and subcategory classifiers independently."""
    results = {}
    for role in ["category", "root_cause", "subcategory"]:
        try:
            result = prepare_classification(df, schema, role)
            if result is None:
                results[f"classifier_{role}"] = {"status": "skipped", "reason": "insufficient_data"}
                continue
            X_serve, y, X_aug, X_raw = result
            m = classifier.train(X_serve, y, role, X_aug=X_aug, X_raw=X_raw)
            results[f"classifier_{role}"] = {"status": "ok", **m}
        except Exception:
            results[f"classifier_{role}"] = {"status": "error", "detail": traceback.format_exc()}
            print(f"[trainer] classifier:{role} error:\n{traceback.format_exc()}")
    return results


def run_retrain(force_detect: bool = True) -> dict:
    """
    Full retrain pipeline. Returns a metrics dict.
    Individual model failures are caught and reported without aborting the others.

    force_detect=True (default): always re-detect schema from current sheet so
    column renames or additions are picked up automatically on every run.
    """
    started_at = datetime.utcnow().isoformat()
    metrics: dict = {"started_at": started_at, "service_version": SERVICE_VERSION, "models": {}}

    # 1. Fetch
    print("[trainer] Fetching data from Google Sheets...")
    try:
        df = fetch_sheet()
    except Exception as e:
        metrics["error"] = f"fetch_failed: {e}"
        print(f"[trainer] FATAL: {e}")
        return metrics

    # 2. Schema detection (always fresh so drift is caught)
    schema = get_schema(df, force_detect=force_detect)
    schema = validate_schema(schema, df)
    metrics["schema"] = schema
    print(f"[trainer] Schema: {schema}")

    # 3. Forecaster
    try:
        ts = prepare_time_series(df, schema)
        if ts is not None:
            m = forecaster.train(ts)
            metrics["models"]["forecaster"] = {"status": "ok", **m}
        else:
            metrics["models"]["forecaster"] = {"status": "skipped", "reason": "insufficient_date_data"}
    except Exception:
        metrics["models"]["forecaster"] = {"status": "error", "detail": traceback.format_exc()}
        print(f"[trainer] forecaster error:\n{traceback.format_exc()}")

    # 4. Classifiers (with cascade stacking)
    metrics["models"].update(_train_classifiers(df, schema))

    # 5. Risk scorer (stateless formula — just validate inputs exist)
    risk_inputs = prepare_risk_inputs(df, schema)
    metrics["models"]["risk_scorer"] = {
        "status": "ok",
        "available_dimensions": list(risk_inputs.keys()),
    }

    metrics["completed_at"] = datetime.utcnow().isoformat()
    metrics["row_count"] = len(df)

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    METRICS_PATH.write_text(json.dumps(metrics, indent=2, ensure_ascii=False, default=_to_py))
    print(f"[trainer] Done. {metrics['models']}")
    return metrics


def run_retrain_from_df(df: pd.DataFrame, force_detect: bool = True) -> dict:
    """Same as run_retrain() but accepts a pre-loaded DataFrame (for local testing)."""
    started_at = datetime.utcnow().isoformat()
    metrics: dict = {"started_at": started_at, "service_version": SERVICE_VERSION, "models": {}}

    schema = get_schema(df, force_detect=force_detect)
    schema = validate_schema(schema, df)
    metrics["schema"] = schema
    print(f"[trainer] Schema detected: {schema}")

    try:
        ts = prepare_time_series(df, schema)
        if ts is not None:
            m = forecaster.train(ts)
            metrics["models"]["forecaster"] = {"status": "ok", **m}
        else:
            metrics["models"]["forecaster"] = {"status": "skipped", "reason": "insufficient_date_data"}
    except Exception:
        metrics["models"]["forecaster"] = {"status": "error", "detail": traceback.format_exc()}

    metrics["models"].update(_train_classifiers(df, schema))

    risk_inputs = prepare_risk_inputs(df, schema)
    metrics["models"]["risk_scorer"] = {
        "status": "ok",
        "available_dimensions": list(risk_inputs.keys()),
    }

    metrics["completed_at"] = datetime.utcnow().isoformat()
    metrics["row_count"] = len(df)

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    METRICS_PATH.write_text(json.dumps(metrics, indent=2, ensure_ascii=False, default=_to_py))
    return metrics


def load_last_metrics() -> dict:
    if METRICS_PATH.exists():
        try:
            return json.loads(METRICS_PATH.read_text())
        except Exception:
            return {}
    return {}


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Train Gapura ML models")
    parser.add_argument("--csv", help="Path to local CSV file (skips Google Sheets fetch)")
    parser.add_argument("--force-detect", action="store_true", default=True,
                        help="Re-run schema detection (default: True)")
    args = parser.parse_args()

    if args.csv:
        print(f"[trainer] Loading from CSV: {args.csv}")
        df = pd.read_csv(args.csv)
        result = run_retrain_from_df(df, force_detect=args.force_detect)
    else:
        result = run_retrain(force_detect=args.force_detect)

    print("\n" + "=" * 60)
    print("TRAINING RESULTS")
    print("=" * 60)
    print(json.dumps(result, indent=2, ensure_ascii=False))
