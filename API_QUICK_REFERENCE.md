# Gapura AI API Quick Reference

**Base URL:** `http://localhost:7860`

## Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Basic health check |
| GET | `/health` | Detailed health with model status |
| POST | `/api/ai/analyze` | Batch analysis |
| POST | `/api/ai/predict-single` | Single report analysis |
| GET | `/api/ai/analyze-all` | Analyze all Google Sheets rows |
| GET | `/api/ai/model-info` | Model information |
| POST | `/api/ai/train` | Trigger retraining |
| GET | `/api/ai/train/status` | Training status |
| POST | `/api/ai/cache/invalidate` | Clear cache |
| GET | `/api/ai/cache/status` | Cache status |
| GET | `/api/ai/sheets/debug` | Inspect headers, counts, and matched records |
| GET | `/api/ai/risk/summary` | Risk overview (airlines/branches/hubs) |
| POST | `/api/ai/risk/calculate` | Recalculate risk from Sheets |
| GET | `/api/ai/risk/airlines` | Risk for all airlines |
| GET | `/api/ai/risk/airlines/{airline}` | Risk for one airline |
| GET | `/api/ai/risk/branches` | Risk for all branches |
| GET | `/api/ai/risk/hubs` | Risk for all hubs |
| GET | `/api/ai/risk/routes` | Risk for all routes |
| GET | `/api/ai/risk/routes/{route}` | Risk for one route |
| GET | `/api/ai/risk/categories` | Risk for all categories |
| GET | `/api/ai/risk/categories/{category}` | Risk for one category |
| GET | `/api/ai/action-summary` | Action intelligence summary |
| GET | `/api/ai/summarize` | Category summarization |
| GET | `/api/ai/seasonality/peaks` | Seasonality peak periods |

## Quick Examples

### Analyze Single Report
```bash
curl -X POST http://localhost:7860/api/ai/predict-single \
  -H "Content-Type: application/json" \
  -d '{
    "Date_of_Event": "2025-02-22",
    "Airlines": "Garuda Indonesia",
    "Flight_Number": "GA901",
    "Branch": "CGK",
    "HUB": "HUB 1",
    "Irregularity_Complain_Category": "GSE",
    "Report": "Kerusakan parah pada hidrolik",
    "Area": "Apron Area",
    "Status": "Closed"
  }'
```

### Analyze All Sheets
```bash
curl "http://localhost:7860/api/ai/analyze-all?max_rows_per_sheet=500"
```

### Batch Analysis
```bash
curl -X POST http://localhost:7860/api/ai/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "data": [
      {"Airlines": "Garuda", "Report": "...", "Area": "Apron Area"}
    ],
    "options": {
      "predictResolutionTime": true,
      "classifySeverity": true
    }
  }'
```

## Filters

- `esklasi_regex`: filter untuk kolom “ESKLASI DIVISI” (default: `OT|OP|UQ|HT`)
- Dapat digunakan di hampir semua endpoint Sheets (analyze-all, risk summary, action summary, seasonality, summarize, dll.)

```bash
# Analyze-all dengan filter ESKLASI DIVISI
curl "http://localhost:7860/api/ai/analyze-all?bypass_cache=true&esklasi_regex=OT%7COP%7CUQ%7CHT"
```

### Dashboard Page Notes

- OP Complaint by Category: http://localhost:3000/dashboard/op/complaint-by-category
  - Filter: ESKLASI DIVISI = OP
  - Tambahkan query parameter: `esklasi_regex=OP`
  - Contoh akses dengan query: `http://localhost:3000/dashboard/op/complaint-by-category?esklasi_regex=OP`
  
- OP Irregularity & Complaint Top Cases: http://localhost:3000/dashboard/op/irregularity-complaint-top-cases
  - Filter: ESKLASI DIVISI = OP
  - Tambahkan query parameter: `esklasi_regex=OP`
  - Contoh akses dengan query: `http://localhost:3000/dashboard/op/irregularity-complaint-top-cases?esklasi_regex=OP`
  
- OP Root Cause Dominant: http://localhost:3000/dashboard/op/root-cause-dominant
  - Filter: ESKLASI DIVISI = OP
  - Tambahkan query parameter: `esklasi_regex=OP`
  - Contoh akses dengan query: `http://localhost:3000/dashboard/op/root-cause-dominant?esklasi_regex=OP`
  
- OP Case Status: http://localhost:3000/dashboard/op/case-status
  - Filter: ESKLASI DIVISI = OP
  - Tambahkan query parameter: `esklasi_regex=OP`
  - Contoh akses dengan query: `http://localhost:3000/dashboard/op/case-status?esklasi_regex=OP`

## Sheets Debug

```bash
curl "http://localhost:7860/api/ai/sheets/debug?max_rows_per_sheet=10000&esklasi_regex=OT%7COP%7CUQ%7CHT"
```

Response ringkas:
- `headers`: raw + normalized untuk NON CARGO/CGO
- `counts`: jumlah baris per sheet dan total
- `regex`: pattern dan jumlah match
- `matchedRecords`: seluruh record yang match

## Risk Quick Examples

```bash
# Semua airlines terurut berdasarkan risk
curl "http://localhost:7860/api/ai/risk/airlines?bypass_cache=true&esklasi_regex=OT%7COP%7CUQ%7CHT"

# Satu airline
curl "http://localhost:7860/api/ai/risk/airlines/Garuda%20Indonesia?bypass_cache=true&esklasi_regex=OT%7COP%7CUQ%7CHT"

# Semua routes
curl "http://localhost:7860/api/ai/risk/routes?bypass_cache=true&esklasi_regex=OT%7COP%7CUQ%7CHT"

# Satu route
curl "http://localhost:7860/api/ai/risk/routes/CGK-DPS?bypass_cache=true&esklasi_regex=OT%7COP%7CUQ%7CHT"

# Semua categories
curl "http://localhost:7860/api/ai/risk/categories?bypass_cache=true&esklasi_regex=OT%7COP%7CUQ%7CHT"

# Satu category
curl "http://localhost:7860/api/ai/risk/categories/Cargo%20Problems?bypass_cache=true&esklasi_regex=OT%7COP%7CUQ%7CHT"
```

## Response Fields

| Field | Description |
|-------|-------------|
| `predictedDays` | Estimated resolution time |
| `severity` | Critical/High/Medium/Low |
| `urgencyScore` | 0-1 urgency score |
| `shapExplanation` | Why this prediction |
| `anomalyDetection` | Is this unusual? |

## Indonesian Keywords

| Severity | Keywords |
|----------|----------|
| Critical | darurat, kritis, parah, kecelakaan |
| High | rusak, pecah, segera, hilang |
| Medium | terlambat, salah, gagal, masalah |

## Error Codes

- `400` - Bad request
- `404` - Not found
- `422` - Validation error
- `500` - Server error

Full documentation: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
