"""
Fetch real data and print a full diagnostic report.
Run: python inspect_data.py
"""
import os, sys
from pathlib import Path

# Load .env
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

import warnings; warnings.filterwarnings("ignore")
import pandas as pd
from data_fetcher import fetch_sheet
from schema_detector import detect_schema, validate_schema

print("Fetching from Google Sheets...")
df = fetch_sheet()
print(f"\n{'='*60}\nDATA OVERVIEW\n{'='*60}")
print(f"Total rows : {len(df)}")
print(f"Columns    : {len(df.columns)}")
if "_sheet" in df.columns:
    print(f"By tab     : {df['_sheet'].value_counts().to_dict()}")

print(f"\n{'─'*60}\nCOLUMN NAMES\n{'─'*60}")
for c in df.columns:
    null_pct = df[c].isna().mean() * 100
    n_unique  = df[c].nunique()
    sample    = df[c].dropna().astype(str).head(1).values
    sample_s  = sample[0][:60] if len(sample) else "(empty)"
    print(f"  {c:<40} null={null_pct:4.0f}%  uniq={n_unique:4d}  eg: {sample_s}")

schema = detect_schema(df)
schema = validate_schema(schema, df)
print(f"\n{'─'*60}\nAUTO-DETECTED SCHEMA\n{'─'*60}")
for role, col in schema.items():
    print(f"  {role:<15} → {col}")

print(f"\n{'─'*60}\nLABEL DISTRIBUTIONS\n{'─'*60}")
for role in ["category", "subcategory", "root_cause", "status", "airline", "branch"]:
    col = schema.get(role)
    if col and col in df.columns:
        vc = df[col].dropna().value_counts()
        print(f"\n  [{role}] — {col!r} ({len(vc)} unique values, {df[col].notna().sum()} non-null)")
        for label, cnt in vc.head(15).items():
            bar = "█" * min(int(cnt / max(vc) * 30), 30)
            print(f"    {str(label):<40} {cnt:4d}  {bar}")
        if len(vc) > 15:
            print(f"    ... ({len(vc)-15} more)")
