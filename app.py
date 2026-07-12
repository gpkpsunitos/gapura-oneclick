"""
Gapura OneClick — ML Inference Service
FastAPI app deployed on Hugging Face Spaces (CPU) or any container platform.

Classification endpoints (NLP). Accuracies are honest 5-fold CV measured on
serve-shape input (report text + optional context), deduped so template texts
can't leak across folds — they move as the sheet grows:
  POST /classify/category             — Report category
  POST /classify/subcategory          — Area subcategory
  POST /classify/root-cause           — Root cause
Below the confidence floor the API returns UNCERTAIN + ranked candidates
instead of guessing. Optional context fields (airline/branch/area/category/
report_type) measurably improve accuracy — send them when available.

Forecasting endpoints:
  POST /forecast                      — Global daily incident count (next N days)
  POST /analytics/forecast/by-dimension — Per-entity weekly volume forecast

Analytics endpoints:
  POST /analytics/trends              — Rising/falling trend detection per dimension
  POST /seasonality                   — STL decomposition (trend + seasonal + residual)
  POST /risk-score                    — Weighted risk ranking by airline/branch/area

Admin endpoints:
  POST /schema                        — Override column mapping
  GET  /schema                        — Current column mapping
  POST /retrain                       — Trigger retrain (background by default)
  GET  /health                        — Liveness + last metrics (never fetches)
  GET  /ready                         — Readiness (models trained & loadable)
  POST /analyze                       — All classifiers + forecast in one call

Security: set API_KEY env var to require `X-API-Key` on all endpoints except
/health and /ready. Set CORS_ORIGINS to lock down origins.
"""
import threading
import time
import traceback
from contextlib import asynccontextmanager
from typing import Literal, Optional

import pandas as pd
from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import config
from config import get_logger
from data_fetcher import fetch_sheet
from models import classifier, forecaster, risk_scorer
from models.trend_detector import detect_trends
from preprocessor import prepare_time_series
from schema_detector import get_schema, load_schema, save_schema, validate_schema
from trainer import load_last_metrics, run_retrain

log = get_logger("app")

# ---------------------------------------------------------------------------
# Shared state: thread-safe TTL cache for the sheet + retrain lock
# ---------------------------------------------------------------------------

_df_lock = threading.Lock()
_cached_df: Optional[pd.DataFrame] = None
_cached_at: float = 0.0

_retrain_lock = threading.Lock()
_retrain_state = {"running": False, "started_at": None, "last_error": None}

_scheduler = BackgroundScheduler()


def _get_df_and_schema(force_refresh: bool = False) -> tuple[pd.DataFrame, dict]:
    """Sheet snapshot with TTL; safe under concurrent requests."""
    global _cached_df, _cached_at
    ttl = config.DATA_CACHE_TTL_MINUTES * 60
    with _df_lock:
        stale = _cached_df is None or force_refresh or (time.time() - _cached_at) > ttl
        if stale:
            _cached_df = fetch_sheet()   # falls back to last good snapshot internally
            _cached_at = time.time()
        df = _cached_df
    schema = get_schema(df, force_detect=False) or {}
    schema = validate_schema(schema, df)
    return df, schema


def _invalidate_df_cache() -> None:
    global _cached_df
    with _df_lock:
        _cached_df = None


def _do_retrain(force_detect: bool) -> Optional[dict]:
    """Run one retrain if none is running. Returns metrics, or None if busy."""
    if not _retrain_lock.acquire(blocking=False):
        return None
    _retrain_state.update(running=True, started_at=pd.Timestamp.utcnow().isoformat(),
                          last_error=None)
    try:
        metrics = run_retrain(force_detect=force_detect)
        _invalidate_df_cache()
        return metrics
    except Exception:
        _retrain_state["last_error"] = traceback.format_exc(limit=3)
        raise
    finally:
        _retrain_state["running"] = False
        _retrain_lock.release()


def _scheduled_retrain():
    log.info("scheduled retrain starting")
    try:
        if _do_retrain(force_detect=True) is None:
            log.warning("scheduled retrain skipped — another retrain in progress")
    except Exception:
        log.exception("scheduled retrain failed")


@asynccontextmanager
async def lifespan(app: FastAPI):
    last = load_last_metrics()
    if not last or not last.get("models"):
        log.info("no trained models found — running initial training")
        try:
            _do_retrain(force_detect=True)
        except Exception:
            log.exception("initial training failed (will retry on schedule)")

    _scheduler.add_job(
        _scheduled_retrain, "interval",
        hours=config.RETRAIN_INTERVAL_HOURS,
        id="retrain", replace_existing=True,
        coalesce=True, max_instances=1, misfire_grace_time=3600,
    )
    _scheduler.start()
    log.info("scheduler started — retraining every %dh (version %s, tz %s)",
             config.RETRAIN_INTERVAL_HOURS, config.SERVICE_VERSION, config.APP_TZ)
    yield
    _scheduler.shutdown(wait=False)


# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

# Probe/docs paths stay open so orchestrators and humans can check liveness.
_AUTH_EXEMPT_PATHS = {"/health", "/ready", "/docs", "/openapi.json"}


async def require_api_key(request: Request):
    """If API_KEY is configured, every non-probe endpoint requires the header."""
    if not config.API_KEY or request.url.path in _AUTH_EXEMPT_PATHS:
        return
    if request.headers.get("X-API-Key") != config.API_KEY:
        raise HTTPException(status_code=401, detail="invalid or missing X-API-Key")


app = FastAPI(
    title="Gapura OneClick ML Service",
    version=config.SERVICE_VERSION,
    lifespan=lifespan,
    dependencies=[Depends(require_api_key)],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _internal_error(context: str, exc: Exception) -> HTTPException:
    """Log full detail server-side; return a safe message to the client."""
    log.exception("%s failed", context)
    return HTTPException(status_code=500, detail=f"{context} failed — see server logs")


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

Dimension = Literal["airline", "branch", "area", "subcategory", "category"]


class ForecastRequest(BaseModel):
    n_days: int = Field(30, ge=1, le=90)


class ClassifyRequest(BaseModel):
    text: str = Field(..., max_length=20_000)
    # Optional context known at report time — improves accuracy when provided.
    category: Optional[str] = Field(None, max_length=100)   # not used for /classify/category
    airline:  Optional[str] = Field(None, max_length=100)
    branch:   Optional[str] = Field(None, max_length=100)   # station code, e.g. "CGK"
    area:     Optional[str] = Field(None, max_length=100)   # e.g. "Apron Area"
    report_type: Optional[str] = Field(None, max_length=50)  # form/tab: "CGO" | "NON CARGO"


class SchemaOverride(BaseModel):
    mapping: dict[str, str]


class RetrainRequest(BaseModel):
    force_detect: bool = False
    wait: bool = False   # true → block until retrain completes and return metrics


class TrendRequest(BaseModel):
    dimension:    Dimension = "airline"
    window_weeks: int = Field(12, ge=2, le=52)
    significance: float = Field(0.10, ge=0.001, le=0.5)


class DimensionForecastRequest(BaseModel):
    dimension: Dimension = "subcategory"
    n_weeks:   int = Field(4, ge=1, le=26)


# ---------------------------------------------------------------------------
# Health / readiness (unauthenticated by design)
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    """Liveness + last training metrics. Never fetches the sheet."""
    last = load_last_metrics()
    return {
        "status": "ok",
        "version": config.SERVICE_VERSION,
        "timezone": config.APP_TZ,
        "schema_detected": load_schema(),
        "last_retrain": last.get("completed_at"),
        "row_count": last.get("row_count"),
        "retrain_running": _retrain_state["running"],
        "retrain_last_error": (_retrain_state["last_error"] or "")[:500] or None,
        "models": last.get("models", {}),
    }


@app.get("/ready")
def ready():
    """Readiness: are the models on disk and loadable?"""
    roles = ["category", "subcategory", "root_cause"]
    missing = [r for r in roles if not classifier.model_exists(r)]
    ok = not missing
    return {"ready": ok, "missing_models": missing}


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------

@app.get("/schema")
def get_current_schema():
    saved = load_schema()
    if saved:
        return {"source": "override", "mapping": saved}
    try:
        df, schema = _get_df_and_schema()
        return {"source": "auto_detected", "mapping": schema}
    except Exception as e:
        log.exception("schema detection failed")
        raise HTTPException(status_code=503, detail="data source unavailable")


@app.post("/schema")
def override_schema(body: SchemaOverride):
    """
    Called by the frontend to push the current column mapping.
    Forces the service to use this mapping on next retrain.
    """
    save_schema(body.mapping)
    _invalidate_df_cache()
    return {"status": "saved", "mapping": body.mapping}


@app.post("/retrain", status_code=202)
def trigger_retrain(body: RetrainRequest = RetrainRequest()):
    """
    Trigger a retrain. Default: starts in the background and returns 202 —
    poll GET /health for completion. Pass {"wait": true} to block (may take
    minutes; ensure your client timeout allows it).
    """
    if body.wait:
        metrics = _do_retrain(force_detect=body.force_detect)
        if metrics is None:
            raise HTTPException(status_code=409, detail="retrain already in progress")
        return {"status": "ok", "metrics": metrics}

    if _retrain_state["running"]:
        raise HTTPException(status_code=409, detail="retrain already in progress")

    def _bg():
        try:
            _do_retrain(force_detect=body.force_detect)
        except Exception:
            log.exception("background retrain failed")

    threading.Thread(target=_bg, name="retrain", daemon=True).start()
    return {"status": "started", "poll": "/health"}


# ---------------------------------------------------------------------------
# Forecasting & analytics
# ---------------------------------------------------------------------------

@app.post("/forecast")
def forecast(body: ForecastRequest):
    result = forecaster.predict(n_days=body.n_days)
    if result is None:
        return {
            "status": "model_not_trained",
            "fallback": True,
            "message": "Forecaster not yet trained. Trigger /retrain or wait for the scheduled cycle.",
        }
    return {"status": "ok", **result}


@app.post("/seasonality")
def seasonality():
    """STL decomposition of the historical time series."""
    try:
        df, schema = _get_df_and_schema()
        ts = prepare_time_series(df, schema)
        if ts is None or len(ts) < 14:
            return {"status": "insufficient_data", "fallback": True}

        from statsmodels.tsa.seasonal import STL

        stl = STL(ts, period=7, robust=True)
        result = stl.fit()
        dates = [d.strftime("%Y-%m-%d") for d in ts.index]
        return {
            "status": "ok",
            "dates": dates,
            "observed": ts.tolist(),
            "trend": result.trend.tolist(),
            "seasonal": result.seasonal.tolist(),
            "residual": result.resid.tolist(),
            "peak_season_date": ts.index[result.seasonal.argmax()].strftime("%Y-%m-%d"),
        }
    except Exception as e:
        raise _internal_error("seasonality", e)


@app.post("/risk-score")
def risk_score():
    try:
        df, schema = _get_df_and_schema()
        scores = risk_scorer.score(df, schema)
        if not scores:
            return {
                "status": "no_grouping_columns",
                "fallback": True,
                "message": "Schema has no airline/branch/area column detected.",
            }
        return {"status": "ok", "rankings": scores}
    except Exception as e:
        raise _internal_error("risk-score", e)


@app.post("/analytics/trends")
def analytics_trends(body: TrendRequest):
    """
    Detect statistically significant rising / falling trends per entity.
    Uses linear regression on weekly-binned incident counts.
    """
    try:
        df, schema = _get_df_and_schema()
        result = detect_trends(
            df, schema,
            dimension=body.dimension,
            window_weeks=body.window_weeks,
            significance=body.significance,
        )
        return {"status": "ok", **result}
    except Exception as e:
        raise _internal_error("trend detection", e)


@app.post("/analytics/forecast/by-dimension")
def analytics_forecast_by_dimension(body: DimensionForecastRequest):
    """
    Forecast incident volume per entity within a dimension for the next N weeks.
    Holt-Winters (≥14 weeks history) or linear-trend projection, sorted by
    predicted total (highest risk first).
    """
    try:
        df, schema = _get_df_and_schema()
        result = forecaster.forecast_by_dimension(
            df, schema,
            dimension=body.dimension,
            n_weeks=body.n_weeks,
        )
        return {"status": "ok", **result}
    except Exception as e:
        raise _internal_error("dimension forecast", e)


# ---------------------------------------------------------------------------
# Classification
# ---------------------------------------------------------------------------

def _ctx_kwargs(body: ClassifyRequest, include_category: bool = True) -> dict:
    return {
        "category": body.category if include_category else None,
        "airline":  body.airline,
        "branch":   body.branch,
        "area":     body.area,
        "sheet":    body.report_type,
    }


@app.post("/classify/category")
def classify_category(body: ClassifyRequest):
    """Classify report category (Irregularity / Complaint / Compliment / Occurrence)."""
    if not body.text.strip():
        raise HTTPException(status_code=422, detail="text must not be empty")
    # category is the target here — never feed it in as context
    result = classifier.predict(body.text, role="category", **_ctx_kwargs(body, include_category=False))
    return {"status": result.get("status", "ok"), "category": result}


@app.post("/classify/subcategory")
def classify_subcategory(body: ClassifyRequest):
    if not body.text.strip():
        raise HTTPException(status_code=422, detail="text must not be empty")
    result = classifier.predict(body.text, role="subcategory", **_ctx_kwargs(body))
    return {"status": result.get("status", "ok"), "subcategory": result}


@app.post("/classify/root-cause")
def classify_root_cause(body: ClassifyRequest):
    if not body.text.strip():
        raise HTTPException(status_code=422, detail="text must not be empty")
    result = classifier.predict(body.text, role="root_cause", **_ctx_kwargs(body))
    return {"status": result.get("status", "ok"), "root_cause": result}


@app.post("/analyze")
def analyze_all(body: ClassifyRequest):
    """
    Convenience endpoint: runs all analytics for a single report text.
    Compatible with the Next.js /api/ai/analyze call shape.
    """
    if not body.text.strip():
        raise HTTPException(status_code=422, detail="text must not be empty")
    text = body.text
    cat_result = classifier.predict(text, "category", **_ctx_kwargs(body, include_category=False))
    # Chain: a confidently-predicted category becomes context for the others
    # (unless the caller supplied one).
    chained_cat = body.category or (
        cat_result.get("label")
        if cat_result.get("status") == "ok" and cat_result.get("label") not in (None, "UNCERTAIN")
        else None
    )
    ctx = {**_ctx_kwargs(body), "category": chained_cat}
    result = {
        "category":    cat_result,
        "subcategory": classifier.predict(text, "subcategory", **ctx),
        "root_cause":  classifier.predict(text, "root_cause", **ctx),
        "forecast":    forecaster.predict(n_days=14),
    }
    try:
        df, schema = _get_df_and_schema()
        result["risk_rankings"] = risk_scorer.score(df, schema)
    except Exception:
        log.exception("risk rankings unavailable in /analyze")
        result["risk_rankings"] = None
    return result
