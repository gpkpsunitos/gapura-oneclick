# Gapura AI API Documentation

**Version:** 1.0.0  
**Base URL:** `http://localhost:8000`  
**Content-Type:** `application/json`

---

## Table of Contents

- [Gapura AI API Documentation](#gapura-ai-api-documentation)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Authentication](#authentication)
  - [Rate Limiting](#rate-limiting)
  - [Endpoints](#endpoints)
    - [Health Check](#health-check)
    - [Detailed Health](#detailed-health)
    - [Analyze Reports](#analyze-reports)
    - [Predict Single](#predict-single)
    - [Analyze All Sheets](#analyze-all-sheets)
    - [Model Info](#model-info)
    - [Train Models](#train-models)
    - [Training Status](#training-status)
    - [Cache Invalidate](#cache-invalidate)
    - [Cache Status](#cache-status)
    - [Root Cause Classification (Batch)](#root-cause-classification-batch)
    - [Root Cause Training (Async)](#root-cause-training-async)
    - [Seasonality Summary](#seasonality-summary)
    - [Branch Analytics Summary](#branch-analytics-summary)
    - [Category Summarization](#category-summarization)
    - [Seasonality Forecast](#seasonality-forecast)
    - [Seasonality Peak Analysis](#seasonality-peak-analysis)
    - [Branch Specific Metrics](#branch-specific-metrics)
    - [Branch Performance Ranking](#branch-performance-ranking)
    - [Risk Assessment Summary](#risk-assessment-summary)
    - [Risk Assessment (Airlines/Hubs)](#risk-assessment-airlineshubs)
    - [Calculate Risk Scores](#calculate-risk-scores)
    - [Subcategory Classification](#subcategory-classification)
    - [Action Recommendations](#action-recommendations)
    - [Similarity Search](#similarity-search)
    - [Forecasting \& Trends](#forecasting--trends)
    - [Formal Report Generation](#formal-report-generation)
  - [Data Models](#data-models)
    - [IrregularityReport](#irregularityreport)
    - [Severity Levels](#severity-levels)
    - [Indonesian Keywords Detected](#indonesian-keywords-detected)
  - [Error Handling](#error-handling)
    - [Error Response Format](#error-response-format)
    - [Common Error Codes](#common-error-codes)
    - [Validation Error Response](#validation-error-response)
  - [Examples](#examples)
    - [Python Example](#python-example)
    - [JavaScript Example](#javascript-example)
    - [cURL Examples](#curl-examples)
  - [Changelog](#changelog)
    - [v1.1.0 (2026-02-21)](#v110-2026-02-21)
    - [v1.0.0 (2025-02-17)](#v100-2025-02-17)
  - [Support](#support)

---

## Overview

Gapura AI API provides machine learning-powered analysis for irregularity reports from airport operations. It offers:

- **Regression Analysis**: Predicts resolution time for irregularity reports
- **NLP Analysis**: Classifies severity, extracts entities, generates summaries
- **Root Cause Classification**: **(New)** Categorizes incident origins into 8+ operational categories with 89%+ accuracy
- **Anomaly Detection**: Identifies unusual predictions
- **SHAP Explainability**: Explains prediction factors
- **Resilient Caching**: Distributed Redis with automatic In-Memory dictionary fallback
- **Bilingual Support**: Indonesian and English keywords
- **High-Performance Inference**: Batched Transformer processing for large datasets

---

## Authentication

Currently, the API has no authentication. For production deployments, consider adding:
- API Key authentication
- JWT tokens
- OAuth 2.0

---

## Rate Limiting

Currently, no rate limiting is enforced. Consider implementing for production:
- 100 requests per minute per IP
- 1000 requests per hour per API key

---

## Endpoints

---

### Health Check

Basic health check endpoint.

**Endpoint:** `GET /`

**Request:**
```bash
curl http://localhost:8000/
```

**Response:**
```json
{
  "status": "healthy"
}
```

---

### Detailed Health

Detailed health check with model and cache status.

**Endpoint:** `GET /health`

**Request:**
```bash
curl http://localhost:8000/health
```

**Response:**
```json
{
  "status": "healthy",
  "models": {
    "regression": {
      "version": "1.0.0-trained",
      "loaded": true,
      "metrics": {
        "train_mae": 0.046,
        "train_rmse": 0.102,
        "train_r2": 0.986,
        "test_mae": 0.348,
        "test_rmse": 0.457,
        "test_r2": 0.657,
        "n_samples": 922,
        "n_features": 25,
        "feature_importance": {
          "area_encoded": 0.337,
          "cos_month": 0.265,
          "category_encoded": 0.077
        }
      }
    },
      "nlp": {
        "version": "4.0.0-synthetic-plus",
        "status": "active",
        "architecture": "Multi-Task DistilBERT",
        "tasks": ["severity", "issue_type", "area", "root_cause"]
      }
    },
    "cache": {
      "status": "healthy",
      "mode": "redis" | "in_memory_fallback",
      "used_memory": "1.05M",
      "connected_clients": 2
    },
  "timestamp": "2025-02-17T10:00:00.000000"
}
```

---

### Analyze Reports

Analyze a batch of irregularity reports with AI models.

**Endpoint:** `POST /api/ai/analyze`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "data": [
    {
      "Date_of_Event": "2025-02-22",
      "Airlines": "Garuda Indonesia",
      "Flight_Number": "GA901",
      "Branch": "CGK",
      "HUB": "HUB 1",
      "Route": "CGK-DPS",
      "Report_Category": "Irregularity",
      "Irregularity_Complain_Category": "GSE",
      "Report": "Kerusakan parah pada hidrolik pintu kargo",
      "Root_Caused": "Keausan pada sistem hidrolik",
      "Action_Taken": "Mengganti segel hidrolik",
      "Area": "Apron Area",
      "Status": "Closed"
    }
  ],
  "options": {
    "predictResolutionTime": true,
    "classifySeverity": true,
    "extractEntities": true,
    "generateSummary": true,
    "analyzeTrends": true,
    "bypassCache": false
  }
}
```

**Request:**
```bash
curl -X POST http://localhost:8000/api/ai/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "data": [
      {
        "Date_of_Event": "2025-02-22",
        "Airlines": "Garuda Indonesia",
        "Flight_Number": "GA901",
        "Branch": "CGK",
        "HUB": "HUB 1",
        "Report_Category": "Irregularity",
        "Irregularity_Complain_Category": "GSE",
        "Report": "Kerusakan parah pada hidrolik pintu kargo",
        "Root_Caused": "Keausan pada sistem hidrolik",
        "Action_Taken": "Mengganti segel hidrolik",
        "Area": "Apron Area",
        "Status": "Closed"
      }
    ],
    "options": {
      "predictResolutionTime": true,
      "classifySeverity": true,
      "extractEntities": true,
      "generateSummary": true,
      "analyzeTrends": true
    }
  }'
```

**Response:**
```json
{
  "regression": {
    "predictions": [
      {
        "reportId": "row_0",
        "predictedDays": 3.73,
        "confidenceInterval": [3.38, 4.07],
        "featureImportance": {
          "area_encoded": 0.337,
          "cos_month": 0.265,
          "category_encoded": 0.077,
          "has_photos": 0.049
        },
        "hasUnknownCategories": false,
        "shapExplanation": {
          "baseValue": 2.45,
          "predictionExplained": true,
          "topFactors": [
            {
              "feature": "category_encoded",
              "shap_value": 1.055,
              "abs_contribution": 1.055,
              "direction": "increases"
            },
            {
              "feature": "report_length",
              "shap_value": -0.265,
              "abs_contribution": 0.265,
              "direction": "decreases"
            }
          ],
          "explanation": "Higher category increases resolution time."
        },
        "anomalyDetection": {
          "isAnomaly": false,
          "anomalyScore": 0.088,
          "anomalies": [
            {
              "type": "global_outlier",
              "severity": "low",
              "message": "Prediction 3.73 is somewhat unusual",
              "z_score": 2.19
            }
          ]
        }
      }
    ],
    "modelMetrics": {
      "mae": 0.348,
      "rmse": 0.457,
      "r2": 0.657,
      "model_loaded": true,
      "note": "Using trained model"
    }
  },
  "nlp": {
    "classifications": [
      {
        "reportId": "row_0",
        "severity": "Critical",
        "severityConfidence": 0.92,
        "areaType": "Apron",
        "issueType": "GSE",
        "issueTypeConfidence": 0.85
      }
    ],
    "entities": [
      {
        "reportId": "row_0",
        "entities": [
          {
            "text": "Garuda Indonesia",
            "label": "AIRLINE",
            "start": 0,
            "end": 16,
            "confidence": 0.95
          },
          {
            "text": "GA901",
            "label": "FLIGHT_NUMBER",
            "start": 0,
            "end": 5,
            "confidence": 0.92
          },
          {
            "text": "2025-02-22",
            "label": "DATE",
            "start": 0,
            "end": 10,
            "confidence": 0.9
          }
        ]
      }
    ],
    "summaries": [
      {
        "reportId": "row_0",
        "executiveSummary": "Kerusakan parah pada hidrolik pintu kargo Keausan pada sistem hidrolik Mengganti segel hidrolik.",
        "keyPoints": [
          "Cargo-related issue",
          "Physical damage reported"
        ]
      }
    ],
    "sentiment": [
      {
        "reportId": "row_0",
        "urgencyScore": 1.0,
        "sentiment": "Negative",
        "keywords": ["rusak", "segera", "parah"]
      }
    ]
  },
  "trends": {
    "byAirline": {
      "Garuda Indonesia": {
        "count": 1,
        "avgResolutionDays": 3.73,
        "topIssues": ["GSE"]
      }
    },
    "byHub": {
      "HUB 1": {
        "count": 1,
        "avgResolutionDays": 3.73,
        "topIssues": ["GSE"]
      }
    },
    "byCategory": {
      "GSE": {
        "count": 1,
        "avgResolutionDays": 3.73
      }
    },
    "timeSeries": []
  },
  "metadata": {
    "totalRecords": 1,
    "processingTime": 0.125,
    "modelVersions": {
      "regression": "1.0.0-trained",
      "nlp": "1.0.0-rule-based"
    }
  }
}
```

---

### Predict Single

Analyze a single report with all available AI models.

**Endpoint:** `POST /api/ai/predict-single`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "Date_of_Event": "2025-02-22",
  "Airlines": "Garuda Indonesia",
  "Flight_Number": "GA901",
  "Branch": "CGK",
  "HUB": "HUB 1",
  "Route": "CGK-DPS",
  "Report_Category": "Irregularity",
  "Irregularity_Complain_Category": "GSE",
  "Report": "Kerusakan parah pada hidrolik pintu kargo",
  "Root_Caused": "Keausan pada sistem hidrolik",
  "Action_Taken": "Mengganti segel hidrolik",
  "Area": "Apron Area",
  "Status": "Closed"
}
```

**Request:**
```bash
curl -X POST http://localhost:8000/api/ai/predict-single \
  -H "Content-Type: application/json" \
  -d '{
    "Date_of_Event": "2025-02-22",
    "Airlines": "Garuda Indonesia",
    "Flight_Number": "GA901",
    "Branch": "CGK",
    "HUB": "HUB 1",
    "Report_Category": "Irregularity",
    "Irregularity_Complain_Category": "GSE",
    "Report": "Kerusakan parah pada hidrolik pintu kargo",
    "Root_Caused": "Keausan pada sistem hidrolik",
    "Action_Taken": "Mengganti segel hidrolik",
    "Area": "Apron Area",
    "Status": "Closed"
  }'
```

**Response:**
```json
{
  "prediction": {
    "reportId": "row_0",
    "predictedDays": 3.73,
    "confidenceInterval": [3.38, 4.07],
    "featureImportance": {
      "area_encoded": 0.337,
      "cos_month": 0.265,
      "category_encoded": 0.077
    },
    "hasUnknownCategories": false,
    "shapExplanation": {
      "baseValue": 2.45,
      "predictionExplained": true,
      "topFactors": [
        {
          "feature": "category_encoded",
          "shap_value": 1.055,
          "abs_contribution": 1.055,
          "direction": "increases"
        }
      ],
      "explanation": "Higher category increases resolution time."
    },
    "anomalyDetection": {
      "isAnomaly": false,
      "anomalyScore": 0.088,
      "anomalies": []
    }
  },
  "classification": {
    "reportId": "row_0",
    "severity": "Critical",
    "severityConfidence": 0.92,
    "areaType": "Apron",
    "issueType": "GSE",
    "issueTypeConfidence": 0.85
  },
  "entities": {
    "reportId": "row_0",
    "entities": [
      {
        "text": "Garuda Indonesia",
        "label": "AIRLINE",
        "start": 0,
        "end": 16,
        "confidence": 0.95
      }
    ]
  },
  "summary": {
    "reportId": "row_0",
    "executiveSummary": "Kerusakan parah pada hidrolik...",
    "keyPoints": ["Cargo-related issue", "Physical damage reported"]
  },
  "sentiment": {
    "reportId": "row_0",
    "urgencyScore": 1.0,
    "sentiment": "Negative",
    "keywords": ["rusak", "segera", "parah"]
  },
  "modelLoaded": true
}
```

---

### Analyze All Sheets

Fetch and analyze ALL rows from all Google Sheets (NON CARGO and CGO).

**Endpoint:** `GET /api/ai/analyze-all`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `bypass_cache` | boolean | false | Skip cache and fetch fresh data |
| `include_regression` | boolean | true | Include regression predictions |
| `include_nlp` | boolean | true | Include NLP analysis |
| `include_trends` | boolean | true | Include trend analysis |
| `max_rows_per_sheet` | integer | 10000 | Maximum rows to process per sheet |

**Request:**
```bash
# Basic request
curl "http://localhost:8000/api/ai/analyze-all"

# With custom parameters
curl "http://localhost:8000/api/ai/analyze-all?max_rows_per_sheet=100&bypass_cache=true"

# NLP only (skip regression)
curl "http://localhost:8000/api/ai/analyze-all?include_regression=false"

# Regression only (skip NLP)
curl "http://localhost:8000/api/ai/analyze-all?include_nlp=false"
```

**Response:**
```json
{
  "status": "success",
  "metadata": {
    "totalRecords": 925,
    "processingTimeSeconds": 12.5,
    "recordsPerSecond": 74.0,
    "modelVersions": {
      "regression": "1.0.0-trained",
      "nlp": "1.0.0-rule-based"
    }
  },
  "sheets": {
    "NON CARGO": {
      "rows_fetched": 426,
      "status": "success"
    },
    "CGO": {
      "rows_fetched": 499,
      "status": "success"
    }
  },
  "results": [
    {
      "rowId": "NON CARGO_2",
      "sourceSheet": "NON CARGO",
      "originalData": {
        "date": "January 25, 2025",
        "airline": "Thai Airways",
        "flightNumber": "TG435",
        "branch": "CGK",
        "hub": "HUB 1",
        "route": "BKK-CGK",
        "category": "Irregularity",
        "issueType": "Pax Handling",
        "report": "Komplain Penanganan Bagasi...",
        "status": "Closed"
      },
      "prediction": {
        "predictedDays": 2.53,
        "confidenceInterval": [2.16, 2.9],
        "hasUnknownCategories": false,
        "shapExplanation": {
          "baseValue": 2.45,
          "predictionExplained": true,
          "topFactors": [...],
          "explanation": "Higher category increases resolution time."
        },
        "anomalyDetection": {
          "isAnomaly": false,
          "anomalyScore": 0.0,
          "anomalies": []
        }
      },
      "classification": {
        "reportId": "row_0",
        "severity": "Critical",
        "severityConfidence": 0.92,
        "areaType": "Terminal",
        "issueType": "Pax Handling",
        "issueTypeConfidence": 0.85
      },
      "entities": {
        "reportId": "row_0",
        "entities": [...]
      },
      "summary": {
        "reportId": "row_0",
        "executiveSummary": "Komplain Penanganan Bagasi...",
        "keyPoints": ["Baggage handling issue", "Physical damage reported"]
      },
      "sentiment": {
        "reportId": "row_0",
        "urgencyScore": 0.33,
        "sentiment": "Somewhat Negative",
        "keywords": ["rusak"]
      }
    }
  ],
  "summary": {
    "totalRecords": 925,
    "sheetsProcessed": 2,
    "regressionEnabled": true,
    "nlpEnabled": true,
    "severityDistribution": {
      "Critical": 45,
      "High": 189,
      "Medium": 312,
      "Low": 379
    },
    "predictionStats": {
      "min": 1.2,
      "max": 5.8,
      "mean": 2.95
    }
  },
  "timestamp": "2025-02-17T10:30:00.000000"
}
```

---

### Model Info

Get current model information and metrics.

**Endpoint:** `GET /api/ai/model-info`

**Request:**
```bash
curl http://localhost:8000/api/ai/model-info
```

**Response:**
```json
{
  "regression": {
    "version": "1.0.0-trained",
    "type": "GradientBoostingRegressor",
    "status": "loaded",
    "last_trained": "2025-02-17",
    "metrics": {
      "train_mae": 0.046,
      "train_rmse": 0.102,
      "train_r2": 0.986,
      "test_mae": 0.348,
      "test_rmse": 0.457,
      "test_r2": 0.657,
      "n_samples": 922,
      "n_features": 25,
      "feature_importance": {
        "area_encoded": 0.337,
        "cos_month": 0.265,
        "category_encoded": 0.077,
        "has_photos": 0.049,
        "root_cause_length": 0.037
      }
    }
  },
  "nlp": {
    "version": "1.0.0-rule-based",
    "type": "Rule-based + Keyword extraction",
    "status": "active",
    "tasks": ["classification", "ner", "summarization", "sentiment"],
    "note": "Full ML NLP models coming soon"
  }
}
```

---

### Train Models

Trigger model retraining in the background.

**Endpoint:** `POST /api/ai/train`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `force` | boolean | false | Force training regardless of conditions |

**Request:**
```bash
# Normal training (only if conditions met)
curl -X POST http://localhost:8000/api/ai/train

# Force training
curl -X POST "http://localhost:8000/api/ai/train?force=true"
```

**Response:**
```json
{
  "status": "training_queued",
  "message": "Model retraining has been started in the background",
  "force": false,
  "timestamp": "2025-02-17T10:35:00.000000"
}
```

---

### Training Status

Get training status and history.

**Endpoint:** `GET /api/ai/train/status`

**Request:**
```bash
curl http://localhost:8000/api/ai/train/status
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "last_training": "2025-02-17T10:00:00.000000",
    "last_record_count": 925,
    "should_retrain": false,
    "reason": "Retraining not needed (10 new records, 2 days since last training)",
    "config": {
      "min_new_records": 50,
      "max_interval_days": 7,
      "auto_retrain_enabled": true
    },
    "recent_events": [
      {
        "timestamp": "2025-02-17T10:00:00.000000",
        "records": 925,
        "metrics": {
          "test_mae": 0.348,
          "test_r2": 0.657
        },
        "trigger": "Manual training"
      }
    ]
  },
  "timestamp": "2025-02-17T10:40:00.000000"
}
```

---

### Cache Invalidate

Invalidate cached Google Sheets data.

**Endpoint:** `POST /api/ai/cache/invalidate`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `sheet_name` | string | null | Specific sheet to invalidate (optional) |

**Request:**
```bash
# Invalidate all sheets cache
curl -X POST http://localhost:8000/api/ai/cache/invalidate

# Invalidate specific sheet
curl -X POST "http://localhost:8000/api/ai/cache/invalidate?sheet_name=NON%20CARGO"
```

**Response:**
```json
{
  "status": "success",
  "message": "Invalidated all sheets cache",
  "keys_deleted": 2
}
```

---

### Cache Status

Get Redis cache status and statistics.

**Endpoint:** `GET /api/ai/cache/status`

**Request:**
```bash
curl http://localhost:8000/api/ai/cache/status
```

**Response:**
```json
{
  "status": "healthy",
  "used_memory": "1.05M",
  "connected_clients": 2
}
```

---

---

### Root Cause Classification (Batch)

Classify root causes for all records in the database.

**Endpoint:** `POST /api/ai/root-cause/classify-batch`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `bypass_cache` | boolean | false | Skip cache and fetch fresh data |

**Response:**
```json
{
  "status": "success",
  "records_processed": 1006,
  "classifications": [...],
  "total_classified": 895
}
```

---

### Root Cause Categories

Get all available root cause categories with their descriptions and severity multipliers.

**Endpoint:** `GET /api/ai/root-cause/categories`

**Request:**
```bash
curl http://localhost:8000/api/ai/root-cause/categories
```

**Response:**
```json
{
  "Equipment Failure": {
    "name": "Equipment Failure",
    "description": "Issues caused by equipment malfunction or failure",
    "keyword_count": 28,
    "severity_multiplier": 1.3
  },
  "Staff Competency": {
    "name": "Staff Competency",
    "description": "Issues caused by staff knowledge or skill gaps",
    "keyword_count": 26,
    "severity_multiplier": 1.2
  }
}
```

---

### Root Cause Stats

Trigger training for the Root Cause classifier in the background.

**Endpoint:** `POST /api/ai/root-cause/train`

**Response:**
```json
{
  "status": "training_started",
  "records_fetched": 1006,
  "message": "Classification training is now running in the background. The model will be automatically updated once complete."
}
```

> [!NOTE]
> This endpoint is asynchronous. It returns immediately and offloads the training process to a background worker to prevent API timeouts.

---

### Seasonality Summary

Get seasonality patterns and forecast.

**Endpoint:** `GET /api/ai/seasonality/summary`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `category_type` | string | "landside_airside", "cgo", or null for both |

**Response:**
```json
{
  "total_records": 1006,
  "overall_peak_month": "December",
  "seasonal_patterns": {...}
}
```

---

### Branch Analytics Summary

Get summary analytics for all branches.

**Endpoint:** `GET /api/ai/branch/summary`

**Response:**
```json
{
  "total_branches": 24,
  "top_risk_branches": [...],
  "branch_metrics": {...}
}
```

---

### Category Summarization

Get summarized insights for Non-cargo and/or CGO categories.

**Endpoint:** `GET /api/ai/summarize`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `category` | string | "all" | "non_cargo", "cgo", or "all" |
| `bypass_cache` | boolean | false | Skip cache and fetch fresh data |

**Response:**
```json
{
  "status": "success",
  "category_type": "all",
  "summary": {
    "severity_distribution": {...},
    "top_categories": [...],
    "key_insights": [...]
  },
  "timestamp": "2026-02-21T10:00:00.000000"
}
```

---

---

### Seasonality Forecast

Forecast future issue volumes based on historical seasonal patterns.

**Endpoint:** `GET /api/ai/seasonality/forecast`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `category_type` | string | null | "landside_airside" or "cgo" |
| `periods` | integer | 4 | Number of periods to forecast |
| `granularity` | string | "weekly" | "daily", "weekly", or "monthly" |

---

### Seasonality Peak Analysis

Identify peak periods where volume exceeds standard averages.

**Endpoint:** `GET /api/ai/seasonality/peaks`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `category_type` | string | null | "landside_airside" or "cgo" |
| `threshold` | float | 1.2 | Multiplier above average (e.g., 1.2 = 20% above) |

---

### Branch Specific Metrics

Get detailed metrics for a specific airport branch.

**Endpoint:** `GET /api/ai/branch/{branch_name}`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `branch_name` | string | The name of the branch (e.g., "CGK") |

---

### Branch Performance Ranking

Rank branches based on risk scores or issue volume.

**Endpoint:** `GET /api/ai/branch/ranking`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `sort_by` | string | "risk_score" | "risk_score", "total_issues", or "critical_high_count" |
| `limit` | integer | 20 | Maximum number of branches to return |

---

### Risk Assessment Summary

Get overall system risk summary.

**Endpoint:** `GET /api/ai/risk/summary`

---

### Risk Categories

Get detailed risk categories with severity distributions for airlines, branches, areas, and categories.

**Endpoint:** `GET /api/ai/risk/categories`

**Request:**
```bash
curl http://localhost:8000/api/ai/risk/categories
```

**Response:**
```json
{
  "airline_details": [
    {
      "name": "Garuda Indonesia",
      "risk_score": 45.2,
      "risk_level": "High",
      "severity_distribution": {
        "Critical": 12,
        "High": 28,
        "Medium": 45,
        "Low": 67
      },
      "issue_categories": ["GSE", "Pax Handling", "Baggage Handling"]
    }
  ],
  "branch_details": [...],
  "area_details": [...],
  "category_details": [...],
  "last_updated": "2026-02-21T10:00:00.000000"
}
```

---

### Risk Assessment (Airlines/Hubs)

Get risk profiles for all airlines, hubs, or specific entities.

**Endpoints:**
- `GET /api/ai/risk/airlines`
- `GET /api/ai/risk/hubs`
- `GET /api/ai/risk/branches`
- `GET /api/ai/risk/airlines/{airline_name}`

---

### Calculate Risk Scores

Trigger a full recalculation of risk scores across all datasets.

**Endpoint:** `POST /api/ai/risk/calculate`

---

### Subcategory Classification

Deep classification into granular operational subcategories.

**Endpoint:** `POST /api/ai/subcategory`

**Request Body:**
```json
{
  "report": "Text description...",
  "area": "Apron",
  "issue_type": "GSE"
}
```

---

### Action Recommendations

Get AI-powered mitigation strategies for reported issues.

**Endpoint:** `POST /api/ai/action/recommend`

**Request Body:**
```json
{
  "report": "Incident text...",
  "issue_type": "Safety",
  "severity": "High"
}
```

---

### Similarity Search

Find historically similar reports to assist in resolution.

**Endpoint:** `POST /api/ai/similar`

**Request Body:**
```json
{
  "text": "Current incident description...",
  "top_k": 5
}
```

---

### Forecasting & Trends

Predict future incident volumes and category-specific trends.

**Endpoints:**
- `GET /api/ai/forecast/issues`
- `GET /api/ai/forecast/trends`
- `GET /api/ai/forecast/seasonal`

---

### Formal Report Generation

Generate a structured, formal incident report for stakeholders.

**Endpoint:** `POST /api/ai/report/generate`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `row_id` | string | Unique record ID (e.g., "NON CARGO_42") |

---

## Data Models

### IrregularityReport

Input data for analysis.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `Date_of_Event` | string | No | Date of the event (any format) |
| `Airlines` | string | No | Airline name |
| `Flight_Number` | string | No | Flight number |
| `Branch` | string | No | Airport branch code |
| `HUB` | string | No | Hub identifier |
| `Route` | string | No | Flight route |
| `Report_Category` | string | No | Category (Irregularity/Complaint) |
| `Irregularity_Complain_Category` | string | No | Issue type |
| `Report` | string | No | Report description |
| `Root_Caused` | string | No | Root cause analysis |
| `Action_Taken` | string | No | Action taken |
| `Area` | string | No | Area (Apron Area/Terminal Area) |
| `Status` | string | No | Status (Open/Closed) |
| `Reported_By` | string | No | Reporter name |
| `Upload_Irregularity_Photo` | string | No | Photo URL |

### Severity Levels

| Level | Confidence | Description |
|-------|------------|-------------|
| `Critical` | 0.92 | Emergency, severe damage, injury |
| `High` | 0.82-0.88 | Damage, broken, urgent issues |
| `Medium` | 0.72-0.78 | Delay, wrong, errors |
| `Low` | 0.80-0.85 | Minor issues, routine reports |

### Indonesian Keywords Detected

| Severity | Indonesian Keywords |
|----------|---------------------|
| Critical | darurat, kritis, genting, parah, serius, cedera, kecelakaan, kebakaran, ledakan |
| High | rusak, robek, pecah, mendesak, segera, hilang, dicuri, keamanan, keselamatan |
| Medium | terlambat, telat, salah, keliru, hilang, kesalahan, gagal, masalah, keluhan |

---

## Error Handling

### Error Response Format

```json
{
  "detail": "Error message description"
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `400` | Bad Request - Invalid input data |
| `404` | Not Found - Resource not found |
| `422` | Validation Error - Invalid field values |
| `500` | Internal Server Error - Server error |

### Validation Error Response

```json
{
  "detail": "Validation error",
  "errors": [
    {
      "loc": ["body", "data"],
      "msg": "data array cannot be empty",
      "type": "value_error"
    }
  ]
}
```

---

## Examples

### Python Example

```python
import requests
import json

BASE_URL = "http://localhost:8000"

# Analyze single report
def analyze_report(report_data):
    response = requests.post(
        f"{BASE_URL}/api/ai/predict-single",
        json=report_data
    )
    return response.json()

# Analyze all sheets
def analyze_all_sheets(max_rows=100):
    response = requests.get(
        f"{BASE_URL}/api/ai/analyze-all",
        params={"max_rows_per_sheet": max_rows}
    )
    return response.json()

# Example usage
report = {
    "Date_of_Event": "2025-02-22",
    "Airlines": "Garuda Indonesia",
    "Flight_Number": "GA901",
    "Branch": "CGK",
    "HUB": "HUB 1",
    "Report_Category": "Irregularity",
    "Irregularity_Complain_Category": "GSE",
    "Report": "Kerusakan parah pada hidrolik pintu kargo",
    "Root_Caused": "Keausan pada sistem hidrolik",
    "Action_Taken": "Mengganti segel hidrolik",
    "Area": "Apron Area",
    "Status": "Closed"
}

result = analyze_report(report)
print(f"Predicted resolution: {result['prediction']['predictedDays']} days")
print(f"Severity: {result['classification']['severity']}")
```

### JavaScript Example

```javascript
const BASE_URL = "http://localhost:8000";

// Analyze single report
async function analyzeReport(reportData) {
  const response = await fetch(`${BASE_URL}/api/ai/predict-single`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reportData),
  });
  return response.json();
}

// Analyze all sheets
async function analyzeAllSheets(maxRows = 100) {
  const response = await fetch(
    `${BASE_URL}/api/ai/analyze-all?max_rows_per_sheet=${maxRows}`
  );
  return response.json();
}

// Example usage
const report = {
  Date_of_Event: "2025-02-22",
  Airlines: "Garuda Indonesia",
  Flight_Number: "GA901",
  Branch: "CGK",
  HUB: "HUB 1",
  Report_Category: "Irregularity",
  Irregularity_Complain_Category: "GSE",
  Report: "Kerusakan parah pada hidrolik pintu kargo",
  Root_Caused: "Keausan pada sistem hidrolik",
  Action_Taken: "Mengganti segel hidrolik",
  Area: "Apron Area",
  Status: "Closed",
};

analyzeReport(report).then((result) => {
  console.log(`Predicted resolution: ${result.prediction.predictedDays} days`);
  console.log(`Severity: ${result.classification.severity}`);
});
```

### cURL Examples

```bash
# Health check
curl http://localhost:8000/health

# Predict single
curl -X POST http://localhost:8000/api/ai/predict-single \
  -H "Content-Type: application/json" \
  -d @report.json

# Analyze batch
curl -X POST http://localhost:8000/api/ai/analyze \
  -H "Content-Type: application/json" \
  -d @reports.json

# Analyze all sheets
curl "http://localhost:8000/api/ai/analyze-all?max_rows_per_sheet=100"

# Force retrain
curl -X POST "http://localhost:8000/api/ai/train?force=true"

# Clear cache
curl -X POST http://localhost:8000/api/ai/cache/invalidate
```

---

## Changelog

### v1.1.0 (2026-02-21)
- **High-Accuracy NLP**: Upgraded to Multi-Task Transformer (89%+ Root Cause accuracy)
- **Performance Fixes**: Batched tensor inference and Singleton model loading
- **Async Training**: Retraining now handles 1000+ records via BackgroundTasks
- **Seasonality Analytics**: Added peak period identification and forecasting
- **Branch Risk Profiling**: New heuristics for branch-level risk assessment
- **Resilience**: In-memory cache fallback for Redis-less environments (HF Spaces)

### v1.0.0 (2025-02-17)
- Initial release
- Regression model with 25 features
- NLP with bilingual support
- SHAP explainability
- Anomaly detection
- Redis caching
- Scheduled retraining

---

## Support

For issues and feature requests, please contact the development team or create an issue in the repository.
