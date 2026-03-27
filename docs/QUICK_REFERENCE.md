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
