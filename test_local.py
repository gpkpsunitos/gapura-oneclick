"""
Local end-to-end test for all Gapura ML models.
Does NOT require a running server — calls model functions directly.

Usage:
  python test_local.py                        # use sample_data.csv (auto-generated if missing)
  python test_local.py --csv my_data.csv      # use a specific CSV
  python test_local.py --sheets               # fetch live data from Google Sheets
  python test_local.py --skip-train           # skip retraining, use existing saved models
"""
import argparse
import json
import os
import sys
import time
import traceback
from pathlib import Path

# Load .env from the same directory as this script
_env_path = Path(__file__).parent / ".env"
if _env_path.exists():
    for _line in _env_path.read_text().splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _v = _line.split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip())

import pandas as pd

# ── colour helpers ──────────────────────────────────────────────────────────
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

def ok(msg):  print(f"  {GREEN}✓{RESET} {msg}")
def fail(msg): print(f"  {RED}✗{RESET} {msg}")
def warn(msg): print(f"  {YELLOW}!{RESET} {msg}")
def section(title): print(f"\n{BOLD}{CYAN}{'─'*60}\n  {title}\n{'─'*60}{RESET}")


# ── helpers ──────────────────────────────────────────────────────────────────

def load_data(args) -> pd.DataFrame:
    if args.sheets:
        from data_fetcher import fetch_sheet
        print("Fetching from Google Sheets...")
        return fetch_sheet()

    csv_path = Path(args.csv) if args.csv else Path("sample_data.csv")
    if not csv_path.exists():
        warn(f"{csv_path} not found — generating sample data...")
        from generate_sample_data import generate
        generate(200, str(csv_path))
    print(f"Loading CSV: {csv_path}")
    return pd.read_csv(csv_path)


def assert_eq(label: str, actual, expected=None, check=None):
    try:
        if check is not None:
            result = check(actual)
        elif expected is not None:
            result = actual == expected
        else:
            result = actual is not None
        if result:
            ok(f"{label}: {str(actual)[:80]}")
            return True
        else:
            fail(f"{label}: got {actual!r}, expected {expected!r}")
            return False
    except Exception as e:
        fail(f"{label}: raised {e}")
        return False


# ── test sections ─────────────────────────────────────────────────────────────

def test_schema(df: pd.DataFrame) -> dict:
    section("1. SCHEMA AUTO-DETECTION")
    from schema_detector import detect_schema, validate_schema

    schema = detect_schema(df)
    print(f"  Detected schema: {json.dumps(schema, indent=4)}")

    passes = 0
    for role in ["date", "description"]:
        if role in schema:
            ok(f"Role '{role}' → '{schema[role]}'")
            passes += 1
        else:
            warn(f"Role '{role}' not detected — check column names or add more rows")

    schema = validate_schema(schema, df)
    ok(f"Schema validated against DataFrame ({len(df)} rows × {len(df.columns)} cols)")
    return schema


def test_forecaster(df: pd.DataFrame, schema: dict, skip_train: bool) -> bool:
    section("2. FORECASTER (Holt-Winters)")
    from preprocessor import prepare_time_series
    from models import forecaster

    ts = prepare_time_series(df, schema)
    if ts is None:
        warn("No date column or insufficient rows — forecaster skipped")
        return False

    ok(f"Time series: {len(ts)} days, range {ts.index[0].date()} → {ts.index[-1].date()}")
    ok(f"Total incidents in series: {int(ts.sum())}, mean/day: {ts.mean():.2f}")

    if not skip_train:
        t0 = time.perf_counter()
        metrics = forecaster.train(ts)
        elapsed = time.perf_counter() - t0
        ok(f"Training complete in {elapsed:.2f}s")
        assert_eq("MAE",  metrics.get("mae"),  check=lambda v: v is not None and v >= 0)
        assert_eq("RMSE", metrics.get("rmse"), check=lambda v: v is not None and v >= 0)
        mape = metrics.get("mape")
        if mape is not None:
            label = "MAPE < 25%" if mape < 25 else "MAPE (high — may need more data)"
            (ok if mape < 25 else warn)(f"{label}: {mape:.2f}%")

    result = forecaster.predict(n_days=14)
    if result is None:
        fail("predict() returned None — model not saved?")
        return False

    ok(f"Forecast for next 14 days:")
    for pt in result["forecast"][:5]:
        print(f"     {pt['date']}  →  {pt['predicted_count']:.1f} incidents")
    if len(result["forecast"]) > 5:
        print(f"     ... ({len(result['forecast']) - 5} more)")

    # Sanity: no negative predictions
    negatives = [p for p in result["forecast"] if p["predicted_count"] < 0]
    assert_eq("No negative predictions", negatives, expected=[])
    return True


def test_classifiers(df: pd.DataFrame, schema: dict, skip_train: bool) -> dict:
    section("3. CLASSIFIERS (TF-IDF + Logistic Regression)")
    from preprocessor import prepare_classification
    from models import classifier

    results = {}
    for role in ["category", "root_cause", "subcategory"]:
        print(f"\n  [{role}]")
        result = prepare_classification(df, schema, role)
        if result is None:
            warn(f"Skipped — insufficient data for '{role}'")
            results[role] = False
            continue

        X, y, X_aug, X_raw = result
        classes = sorted(y.unique())
        ok(f"Training data: {len(X)} samples, {len(classes)} classes: {classes}")

        if not skip_train:
            t0 = time.perf_counter()
            metrics = classifier.train(X, y, role, X_aug=X_aug, X_raw=X_raw)
            elapsed = time.perf_counter() - t0
            ok(f"Training complete in {elapsed:.2f}s")
            acc = metrics.get("accuracy", 0)
            f1  = metrics.get("f1_weighted", 0)
            (ok if acc >= 0.7 else warn)(f"Accuracy: {acc:.4f} {'(good)' if acc >= 0.8 else '(low — add more data)'}")
            (ok if f1  >= 0.7 else warn)(f"F1 weighted: {f1:.4f}")

        # Test with sample texts
        sample_texts = [
            "Bagasi penumpang tidak ditemukan di belt setelah penerbangan mendarat.",
            "GPU gagal berfungsi saat dibutuhkan, menyebabkan keterlambatan departure.",
            "Penumpang bersikap tidak kooperatif dan menolak mengikuti arahan petugas.",
            "Terdapat kesalahan input data pada sistem DCS, boarding pass tidak valid.",
            "Ditemukan benda asing (FOD) di area apron sebelum proses pushback dimulai.",
        ]

        ok("Sample predictions:")
        for text in sample_texts:
            pred = classifier.predict(text, role)
            status = pred.get("status", "?")
            label  = pred.get("label", "?")
            conf   = pred.get("confidence")
            conf_s = f"{conf:.2f}" if conf is not None else "n/a"
            marker = "✓" if status == "ok" else "!"
            print(f"     [{marker}] {text[:55]}...")
            print(f"          → {label!r} (conf={conf_s}, status={status})")

        results[role] = True
    return results


def test_seasonality(df: pd.DataFrame, schema: dict) -> bool:
    section("4. SEASONALITY (STL Decomposition)")
    from preprocessor import prepare_time_series
    from statsmodels.tsa.seasonal import STL

    ts = prepare_time_series(df, schema)
    if ts is None or len(ts) < 14:
        warn("Not enough date data for STL — skipped")
        return False

    t0 = time.perf_counter()
    stl = STL(ts, period=7, robust=True)
    result = stl.fit()
    elapsed = time.perf_counter() - t0

    ok(f"STL complete in {elapsed:.2f}s")
    ok(f"Trend range:    {result.trend.min():.2f} – {result.trend.max():.2f}")
    ok(f"Seasonal range: {result.seasonal.min():.2f} – {result.seasonal.max():.2f}")
    ok(f"Residual std:   {result.resid.std():.4f}")

    peak_idx = result.seasonal.argmax()
    ok(f"Peak season date: {ts.index[peak_idx].strftime('%Y-%m-%d')} ({ts.index[peak_idx].strftime('%A')})")
    return True


def test_risk_scorer(df: pd.DataFrame, schema: dict) -> bool:
    section("5. RISK SCORER (Deterministic Formula)")
    from models.risk_scorer import score

    t0 = time.perf_counter()
    rankings = score(df, schema)
    elapsed = time.perf_counter() - t0

    if not rankings:
        warn("No grouping columns (airline/branch/area) detected in schema")
        return False

    ok(f"Scoring complete in {elapsed:.4f}s")
    for dim, rows in rankings.items():
        ok(f"Dimension '{dim}' — top 3 by risk:")
        col = schema.get(dim, dim)
        for row in rows[:3]:
            entity = row.get(col, "?")
            print(f"     #{row['rank']}  {entity:<15}  score={row['risk_score']:5.1f}  incidents={row['incident_count']}")
    return True


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Local test for Gapura ML service")
    parser.add_argument("--csv",        default=None,  help="Path to CSV file")
    parser.add_argument("--sheets",     action="store_true", help="Fetch from Google Sheets")
    parser.add_argument("--skip-train", action="store_true", help="Skip training, use saved models")
    args = parser.parse_args()

    print(f"\n{BOLD}Gapura OneClick — ML Local Test{RESET}")
    print("=" * 60)

    # ── load data ──────────────────────────────────────────────────────
    try:
        df = load_data(args)
        ok(f"Data loaded: {len(df)} rows × {len(df.columns)} columns")
        print(f"  Columns: {list(df.columns)}")
    except Exception as e:
        fail(f"Data load failed: {e}")
        traceback.print_exc()
        sys.exit(1)

    # ── run all tests ──────────────────────────────────────────────────
    results = {}

    try:
        schema = test_schema(df)
        results["schema"] = bool(schema)
    except Exception as e:
        fail(f"Schema detection crashed: {e}")
        traceback.print_exc()
        schema = {}
        results["schema"] = False

    try:
        results["forecaster"] = test_forecaster(df, schema, args.skip_train)
    except Exception as e:
        fail(f"Forecaster test crashed: {e}")
        traceback.print_exc()
        results["forecaster"] = False

    try:
        clf_results = test_classifiers(df, schema, args.skip_train)
        results.update({f"classifier_{k}": v for k, v in clf_results.items()})
    except Exception as e:
        fail(f"Classifier test crashed: {e}")
        traceback.print_exc()
        results.setdefault("classifier_category", False)

    try:
        results["seasonality"] = test_seasonality(df, schema)
    except Exception as e:
        fail(f"Seasonality test crashed: {e}")
        traceback.print_exc()
        results["seasonality"] = False

    try:
        results["risk_scorer"] = test_risk_scorer(df, schema)
    except Exception as e:
        fail(f"Risk scorer test crashed: {e}")
        traceback.print_exc()
        results["risk_scorer"] = False

    # ── summary ────────────────────────────────────────────────────────
    section("SUMMARY")
    passed = sum(1 for v in results.values() if v)
    total  = len(results)
    for name, status in results.items():
        (ok if status else warn)(name)
    print()
    color = GREEN if passed == total else (YELLOW if passed > 0 else RED)
    print(f"  {color}{BOLD}{passed}/{total} components passed{RESET}\n")

    if not args.skip_train:
        from pathlib import Path
        data_dir = Path("/data") if Path("/data").exists() else Path("data")
        saved = list(data_dir.glob("*.joblib")) + list(data_dir.glob("*.json"))
        if saved:
            ok(f"Saved model files in {data_dir}/:")
            for f in saved:
                print(f"     {f.name}  ({f.stat().st_size / 1024:.1f} KB)")

    if passed < total:
        sys.exit(1)


if __name__ == "__main__":
    main()
