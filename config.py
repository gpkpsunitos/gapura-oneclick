"""
Central configuration — every tunable comes from the environment so the same
image runs in local dev, staging, and HF Spaces / production without edits.
"""
import logging
import os
from pathlib import Path
from zoneinfo import ZoneInfo

import pandas as pd

SERVICE_VERSION = "2.2.0"

# ── Paths ─────────────────────────────────────────────────────────────────────
# HF Spaces persistent volume is /data; local dev falls back to ./data
DATA_DIR = Path("/data") if Path("/data").exists() else Path(__file__).parent / "data"

# ── Operational timezone ──────────────────────────────────────────────────────
# "Today" for recency windows, forecast anchors, and future-date filtering is
# the airport operation's day — not the server's. Ground handling in Indonesia
# runs on WIB by default.
APP_TZ = os.environ.get("APP_TZ", "Asia/Jakarta")


def today() -> pd.Timestamp:
    """Naive midnight of the current operational day (sheet dates are naive)."""
    return pd.Timestamp.now(tz=ZoneInfo(APP_TZ)).tz_localize(None).normalize()


# ── Scheduling / caching ──────────────────────────────────────────────────────
RETRAIN_INTERVAL_HOURS = int(os.environ.get("RETRAIN_INTERVAL_HOURS", "6"))
# How long a fetched sheet snapshot serves requests before re-fetching
DATA_CACHE_TTL_MINUTES = int(os.environ.get("DATA_CACHE_TTL_MINUTES", "15"))

# ── Embeddings ────────────────────────────────────────────────────────────────
# Multilingual sentence embeddings blended into the classifiers. Runs on CPU
# (~30ms/text). Disable with EMBEDDINGS_ENABLED=0 — the service degrades
# gracefully to TF-IDF-only.
EMBEDDINGS_ENABLED = os.environ.get("EMBEDDINGS_ENABLED", "1") not in ("0", "false", "no")
EMBEDDING_MODEL = os.environ.get(
    "EMBEDDING_MODEL", "sentence-transformers/paraphrase-multilingual-mpnet-base-v2"
)
# Persist the downloaded model across restarts (HF Spaces /data volume)
os.environ.setdefault("SENTENCE_TRANSFORMERS_HOME", str(DATA_DIR / "st-cache"))

# ── Security ──────────────────────────────────────────────────────────────────
# If set, every endpoint except /health and /ready requires X-API-Key: <value>.
API_KEY = os.environ.get("API_KEY", "")
# Comma-separated origins; "*" (default) keeps current open behaviour.
CORS_ORIGINS = [o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o.strip()]

# ── Logging ───────────────────────────────────────────────────────────────────
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
