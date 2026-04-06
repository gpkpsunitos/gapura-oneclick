# OP Shortcut Module — Functional & Technical Specification Sheet

**Project:** Gapura IRRS2 (Incident Response Reporting System)
**Module:** OP (Operasi) Division Shortcut Dashboard
**Version:** 1.0.0
**Date:** 2025-04-05
**Status:** In Development

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Module Architecture Overview](#2-module-architecture-overview)
3. [Route Map & Page Inventory](#3-route-map--page-inventory)
4. [Data Architecture](#4-data-architecture)
5. [API Integration Guide](#5-api-integration-guide)
6. [Wireframe Descriptions](#6-wireframe-descriptions)
7. [State Management Strategy](#7-state-management-strategy)
8. [Component Inventory](#8-component-inventory)
9. [Environment Configuration & Security](#9-environment-configuration--security)
10. [Error Handling Mechanisms](#10-error-handling-mechanisms)
11. [Caching Architecture](#11-caching-architecture)
12. [Performance Requirements](#12-performance-requirements)

---

## 1. Executive Summary

### Purpose

The OP Shortcut Module provides a purpose-built analytical dashboard for the **Divisi Operasi (OP)** at PT Gapura Angkasa. It consolidates operational irregularity reports, complaints, risk assessments, root cause analysis, SLA compliance, cargo irregularities, and Joumpa handling data into a unified, role-gated dashboard experience.

### Key Capabilities

| Capability | Description |
|---|---|
| **Dual-Source Analytics** | Every sub-page separates real data (Google Sheets) from AI-derived insights into distinct visual sections |
| **Division-Scoped Access** | Users with role `DIVISI_OP` or `PARTNER_OP` are routed to the OP navigation group |
| **Live Data Pipeline** | Google Sheets (NON CARGO + CGO tabs) synced via service account, proxied through `/api/reports/analytics` |
| **AI Intelligence Layer** | HuggingFace Space AI service provides risk scoring, action summaries, root cause classification, and forecasting |
| **Source Matrix Configuration** | Central `OP_SHORTCUT_SOURCE_MATRIX` in `lib/op-shortcut-source-matrix.ts` defines every page's data source mapping declaratively |

### Target Users

| Role | Nav Config Key | Access Level |
|---|---|---|
| `DIVISI_OP` / `PARTNER_OP` | `OP` | Full OP dashboard + dispatched + reports |
| `DIVISI_PELAPORAN` | `DIVISI_PELAPORAN` | Multi-division view including OP section |
| `SUPER_ADMIN` / `ANALYST` | `ANALYST` | Cross-division access including OP pages |

---

## 2. Module Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Browser (localhost:3000)                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  app/dashboard/(main)/op/*                               │   │
│  │  ┌──────────┬──────────┬───────────────────┬────────────┐ │   │
│  │  │ page.tsx │ complaint│ root-cause-       │ joumpa     │ │   │
│  │  │ (main)   │ -by-cat  │ dominant          │            │ │   │
│  │  ├──────────┼──────────┼───────────────────┼────────────┤ │   │
│  │  │ top-     │ ai-      │ dispatched        │ reports/   │ │   │
│  │  │ irreg.   │ reports  │                   │ [id]       │ │   │
│  │  └──────────┴──────────┴───────────────────┴────────────┘ │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                    ┌─────────┴──────────┐                        │
│                    │  Next.js API Routes│                        │
│                    │  (app/api/*)       │                        │
│                    └─────────┬──────────┘                        │
│                              │                                   │
│              ┌───────────────┼───────────────┐                   │
│              ▼               ▼               ▼                   │
│    ┌─────────────┐  ┌──────────────┐  ┌─────────────┐           │
│    │ Google      │  │ HuggingFace  │  │ Supabase    │           │
│    │ Sheets API  │  │ AI Space     │  │ (Auth/Cache)│           │
│    │ (Service    │  │ (via HF      │  │             │           │
│    │  Account)   │  │  Client)     │  │             │           │
│    └─────────────┘  └──────────────┘  └─────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

### Key Libraries

| Library | Version | Purpose |
|---|---|---|
| `next` | ^16.1.6 | App Router, SSR, API Routes |
| `react` | 19.2.1 | UI rendering |
| `@supabase/supabase-js` | ^2.87.1 | Auth, database, session management |
| `googleapis` | ^171.4.0 | Google Sheets API v4 via service account |
| `groq-sdk` | ^0.37.0 | Groq LLM integration |
| `recharts` | ^3.5.1 | Chart rendering (Bar, Line, Pie) |
| `swr` | ^2.4.0 | Client-side data fetching |
| `zod` | ^4.3.6 | Schema validation |
| `jose` | ^6.1.3 | JWT session management |

---

## 3. Route Map & Page Inventory

### 3.1 OP Route Table

| Route | Component | Source Matrix Key | Real Source | AI Source |
|---|---|---|---|---|
| `/dashboard/op` | `DivisionAnalystDashboard` | — | Google Sheets (NON CARGO + CGO) | General AI dashboard |
| `/dashboard/op/complaint-by-category` | `OPComplaintByCategory` | `complaintByCategory` | `/api/reports/analytics` | `/api/ai/action-summary` |
| `/dashboard/op/irregularity-complaint-top-cases` | `OPTopIrregularityComplaintCases` | `topIrregularityComplaint` | `/api/reports/analytics` | `/api/ai/action-summary` |
| `/dashboard/op/root-cause-dominant` | `OPRootCauseDominant` | `rootCauseDominant` | `/api/reports/analytics` | `/api/ai/root-cause/stats` |
| ~~`/dashboard/op/risk-severity`~~ | ~~Removed~~ | — | — | — |
| ~~`/dashboard/op/case-status`~~ | ~~Removed~~ | — | — | — |
| ~~`/dashboard/op/sla-compliance`~~ | ~~Removed~~ | — | — | — |
| ~~`/dashboard/op/cargo-irregularity`~~ | ~~Removed~~ | — | — | — |
| `/dashboard/op/joumpa` | `OPJoumpa` → `JoumpaDashboard` | `joumpa` | `/api/joumpa` (JOUMPA_SHEET_ID) | None |
| `/dashboard/op/ai-reports` | `DivisionAIReportsDashboard` | — | — | AI Reports composite |
| `/dashboard/op/dispatched` | `DivisionReportsPage` | — | `/api/admin/reports?target_division=OP` | — |
| `/dashboard/op/reports` | Division reports list | — | `/api/reports` | — |
| `/dashboard/op/reports/[id]` | Report detail | — | `/api/reports/[id]` | — |

### 3.2 Shared Pages (Cross-Division)

| Shortcut Key | Page Path | Description |
|---|---|---|
| `monitoringEfektivitas` | `/dashboard/charts/monthly-report/detail` | Monthly effectiveness monitoring |
| `monitoringKesesuaianStandar` | `/dashboard/charts/category-by-area/detail` | Standards compliance by area |

---

## 4. Data Architecture

### 4.1 Google Sheets → Frontend State Mapping

#### Primary Data Source: Main Report Sheet

| Environment Variable | Sheet ID |
|---|---|
| `GOOGLE_SHEET_ID` | `1n0bVEXD9h7v03Q_7REJQuvycGZVhWZI4u1zg1I1fqh8` |

**Sheets (tabs):** `NON CARGO`, `CGO`

#### Field Schema (Google Sheets → `Report` Type)

| Google Sheets Column | Normalized Field | Frontend Key | Type | Used By Pages |
|---|---|---|---|---|
| Date_of_Event | `date_of_event` | `date_of_event` | `string (ISO date)` | All time-series pages |
| Airlines | `airlines` | `airlines` | `string` | risk-severity, top-cases, cargo |
| Flight_Number | `flight_number` | `flight_number` | `string` | case-status |
| Branch | `branch` | `branch` | `string` | All pages |
| Reporting_Branch | `reporting_branch` | `reporting_branch` | `string` | top-cases, risk |
| HUB | `hub` | `hub` | `string` | risk-severity |
| Area | `area` | `area` | `string` | root-cause-dominant |
| Irregularity_Complain_Category | `irregularity_complain_category` | `irregularity_complain_category` | `string` | complaint-by-cat, top-cases, cargo |
| Category / Main_Category | `category` / `main_category` | `category` / `main_category` | `string` | complaint-by-cat, case-status |
| Case_Classification | `case_classification` | `case_classification` | `string` | complaint-by-cat |
| Report | `report` | `report` | `string (text)` | complaint-by-cat, case-status |
| Description | `description` | `description` | `string (text)` | complaint-by-cat |
| Status | `status` | `status` | `string` | case-status, risk-severity |
| Severity | `severity` | `severity` | `string` | risk-severity |
| Root_Caused | `root_caused` | `root_caused` | `string` | root-cause-dominant |
| Root_Cause | `root_cause` | `root_cause` | `string` | root-cause-dominant |
| Action_Taken | `action_taken` | `action_taken` | `string` | root-cause-dominant |
| Preventive_Action | `preventive_action` | `preventive_action` | `string` | root-cause-dominant |
| ESKLASI_DIVISI | `esklasi_divisi` | `esklasi_divisi` | `string` | Division filtering |
| Target_Division | `target_division` | `target_division` | `string` | Division filtering |
| Reporter_Name | `reporter_name` | `reporter_name` | `string` | case-status |
| Reporter_Email | `reporter_email` | `reporter_email` | `string` | Source classification |
| Source_Sheet | `source_sheet` | `source_sheet` | `'NON CARGO' \| 'CGO'` | All pages |
| Title | `title` | `title` | `string` | complaint-by-cat, case-status |

#### Secondary Data Sources

| Source | Env Variable | Sheet ID | Sheets/Tabs |
|---|---|---|---|
| SLA Full Service | `SLA_FULL_SERVICE_SHEET_ID` | `1-5N-VPSOH9HqOoYEC_Hc2qln2Sk2kHO9-NUUPSEr8Uk` | `Sheet1`, `AVSEC`, `Bag Handling`, `DEBRIEFING AFTER SERVICE` |
| Joumpa Handling | `JOUMPA_SHEET_ID` | `1X4KN3ukUtMsd4udL-e2OdNIMheJqutXp0IbfE-Cwwsw` | `Form Responses 1` |
| WSN Dashboard | `WSN_SHEET_ID` | `1O-wemImk4J7TIY0VmOsKs2I9MVSoN3Y5iFSFpfeLO7o` | — |
| HC Sheets | `HC_SHEETS` | `1UzDfVlOR2l6t5WaNfrmmCOeA4Op1PCzU6L6fCGUaM6g` | — |

### 4.2 Data Normalization Layer

The `lib/op-shortcut-analytics.ts` module provides normalization functions applied client-side:

| Function | Input | Output | Logic |
|---|---|---|---|
| `normalizeIssueCategory()` | Raw category text | `'Irregularity' \| 'Complaint' \| 'Compliment' \| 'Accidents / Incidents' \| 'Other'` | Regex matching on Indonesian + English keywords |
| `normalizeStatus()` | Raw status text | `'OPEN' \| 'PROGRESS' \| 'CLOSED'` | Regex matching on status keywords |
| `normalizeSeverity()` | Raw severity text | `'CRITICAL' \| 'HIGH' \| 'MEDIUM' \| 'LOW'` | Regex matching on severity levels |
| `classifyReportSource()` | Report object | `'Customer' \| 'Internal'` | Email domain check + category inference |
| `pickBranch()` | Report object | `string` | Cascading fallback: `branch` → `reporting_branch` → `station_code` → `station_id` → `'Unknown'` |
| `pickAirline()` | Report object | `string` | Cascading fallback: `airlines` → `airline` → `jenis_maskapai` → `'Unknown'` |
| `buildMonthlySeries()` | Reports + date accessor + bucket fn | `Array<{ month, ...values }>` | Groups reports into monthly buckets for trend charts |
| `topEntries()` | `Map<string, number>` | `Array<{ name, value }>` | Sorts by count, returns top N |

### 4.3 Analytics Source Matrix

Defined in `lib/op-shortcut-source-matrix.ts`, this is the single source of truth for page-to-datasource mapping:

```typescript
interface ShortcutSourceConfig {
  key: string;                    // Unique identifier
  title: string;                  // Human-readable title
  pagePath: string;               // Route path
  realSource: AnalyticsSourceDescriptor;  // Google Sheets source config
  aiSource?: AnalyticsSourceDescriptor;   // AI source config (optional)
}
```

**11 entries** are defined in `OP_SHORTCUT_SOURCE_MATRIX`:
1. `complaintByCategory`
2. `riskSeverity`
3. `topIrregularityComplaint`
4. `rootCauseDominant`
5. `caseStatus`
6. `slaCompliance` (real-only)
7. `cargoIrregularity`
8. `joumpa` (real-only)
9. `gseDashboard` (cross-division, under OT)
10. `monitoringEfektivitas` (shared page)
11. `monitoringKesesuaianStandar` (shared page)

---

## 5. API Integration Guide

### 5.1 Internal API Routes (Next.js Proxy Layer)

All AI requests are proxied through Next.js API routes (`app/api/ai/*`) which add:
- Session verification via `verifySession()`
- Response caching via `resolveCachedAI()`
- Stale fallback via `ai-route-cache.ts`
- Error boundary with degraded JSON responses

#### 5.1.1 Real Data Endpoint

**`GET /api/reports/analytics`**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `dateFrom` | `string` | — | ISO date lower bound |
| `dateTo` | `string` | — | ISO date upper bound |
| `hub` | `string` | — | Filter by hub name |
| `branch` | `string` | — | Filter by branch name |
| `area` | `string` | — | Filter by area |
| `airlines` | `string` | — | Filter by airline |
| `sourceSheet` | `string` | — | `'NON CARGO'` or `'CGO'` |
| `esklasiRegex` | `string` | — | Regex for ESKLASI_DIVISI column |
| `esklasiDivision` | `string` | — | Division code (`OP`, `OT`, etc.) |
| `targetDivision` | `string` | — | Alias for esklasiDivision |
| `gseOnly` | `boolean` | `false` | Filter only GSE-related reports |
| `fields` | `string` (csv) | — | Comma-separated field names to project |
| `refresh` | `boolean` | `false` | Force refresh from Google Sheets |

**Response:**
```json
{
  "timestamp": 1712304000000,
  "count": 1234,
  "reports": [
    {
      "id": "rpt_abc123",
      "branch": "CGK",
      "severity": "High",
      "status": "OPEN",
      "category": "GSE",
      "date_of_event": "2025-03-15",
      ...
    }
  ]
}
```

**Cache Headers:** `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`

#### 5.1.2 AI Action Summary

**`GET /api/ai/action-summary`**

| Parameter | Type | Description |
|---|---|---|
| `division` | `string` | Filter by division |
| `branch` | `string` | Filter by branch |
| `esklasi_regex` | `string` | ESKLASI regex filter |

**Response (success):**
```json
{
  "status": "ok",
  "totalRecords": 456,
  "categories": {
    "GSE": {
      "count": 89,
      "severityDistribution": { "Low": 20, "Medium": 35, "High": 25, "Critical": 9 },
      "topActions": [],
      "avgResolutionDays": 3.2,
      "topHubs": ["HUB 1"],
      "topAirlines": ["Garuda Indonesia"],
      "effectivenessScore": 0.75,
      "openCount": 89,
      "closedCount": 0,
      "highPriorityCount": 34
    }
  },
  "overallSummary": {
    "totalRecords": 456,
    "openCount": 456,
    "closedCount": 0,
    "highPriorityCount": 78,
    "severityDistribution": { "Low": 200, "Medium": 150, "High": 80, "Critical": 26 },
    "avgResolutionDays": 4.5,
    "categoriesCount": 12,
    "avgDaysSource": "predictedDays"
  },
  "topCategoriesByCount": [
    { "category": "GSE", "count": 89, "highPriority": 34 }
  ],
  "topCategoriesByRisk": [
    { "category": "Cargo Problems", "riskScore": 450, "count": 120 }
  ],
  "globalRecommendations": [
    { "action": "Prioritaskan tindakan pada kategori Cargo Problems", "priority": "HIGH", "category": "Cargo Problems", "confidence": 0.7 }
  ],
  "cached": true,
  "generatedAt": "2025-04-05T10:00:00.000Z",
  "sourceSyncAt": "2025-04-05T09:55:00.000Z",
  "stale": false
}
```

**Response (degraded):**
```json
{
  "status": "degraded",
  "totalRecords": 0,
  "categories": {},
  "overallSummary": { "totalRecords": 0, "openCount": 0, "closedCount": 0, "highPriorityCount": 0, "severityDistribution": { "Low": 0, "Medium": 0, "High": 0, "Critical": 0 }, "avgResolutionDays": 0, "categoriesCount": 0 },
  "topCategoriesByCount": [],
  "topCategoriesByRisk": [],
  "globalRecommendations": [],
  "cached": false,
  "generatedAt": "2025-04-05T10:00:00.000Z",
  "sourceSyncAt": null,
  "stale": true
}
```

#### 5.1.3 AI Risk Summary

**`GET /api/ai/risk/summary`**

No query parameters required. Returns aggregated risk scoring.

**Response:**
```json
{
  "last_updated": "2025-04-05T10:00:00Z",
  "airline_risks": { "Critical": 2, "High": 5, "Medium": 12, "Low": 30 },
  "branch_risks": { "Critical": 1, "High": 8, "Medium": 15, "Low": 25 },
  "hub_risks": { "Critical": 0, "High": 3, "Medium": 8, "Low": 18 },
  "top_risky_airlines": ["Garuda Indonesia", "Lion Air"],
  "top_risky_branches": ["CGK", "SUB"],
  "total_airlines": 49,
  "total_branches": 25,
  "total_hubs": 4,
  "airline_details": [
    {
      "name": "Garuda Indonesia",
      "risk_score": 78.5,
      "risk_level": "High",
      "severity_distribution": { "Critical": 2, "High": 5, "Medium": 10, "Low": 15 },
      "issue_categories": ["GSE", "Baggage"],
      "total_issues": 32
    }
  ],
  "branch_details": [...],
  "hub_details": [...],
  "cached": true,
  "stale": false,
  "generatedAt": "2025-04-05T10:00:00.000Z",
  "sourceSyncAt": "2025-04-05T09:55:00.000Z"
}
```

#### 5.1.4 AI Root Cause Stats

**`GET /api/ai/root-cause/stats`**

**Response:**
```json
{
  "total_records": 1234,
  "classified": 1100,
  "unknown": 134,
  "classification_rate": "89.1%",
  "by_category": {
    "Equipment Failure": {
      "count": 250,
      "percentage": 22.7,
      "top_issue_categories": { "GSE": 180, "Baggage": 70 },
      "top_areas": { "Apron Area": 200, "Terminal Area": 50 },
      "top_airlines": { "Garuda Indonesia": 120 }
    }
  }
}
```

#### 5.1.5 SLA Full Service

**`GET /api/sla/full-service`**

Fetches from `SLA_FULL_SERVICE_SHEET_ID`. Returns:
```json
{
  "filters": { "categories": [], "areas": [], "airlines": [], "branches": [] },
  "stats": {
    "categoryDistribution": [{ "name": "AVSEC", "value": 45 }],
    "areaDistribution": [{ "name": "Apron Area", "value": 30 }],
    "bagHandlingPerformance": [{ "name": "Good", "value": 80 }]
  },
  "nonCompliance": [{ "Kategori": "...", "Area": "...", "Airline": "...", "Cab": "...", "Reasons": "..." }],
  "avsec": [...],
  "bagHandling": [...],
  "debrief": [...]
}
```

#### 5.1.6 Cargo Summarize (AI)

**`GET /api/ai/summarize?category=cgo`**

Proxies to `GET {HF_SPACE}/api/ai/summarize/cgo`.

#### 5.1.7 Joumpa

**`GET /api/joumpa`**

Fetches from `JOUMPA_SHEET_ID` → `Form Responses 1` tab.

### 5.2 External AI Service (HuggingFace Space)

**Base URL:** `https://gapura-dev-gapura-ai.hf.space`
**Local proxy:** `AI_SERVICE_URL` / `NEXT_PUBLIC_AI_SERVICE_URL`

#### Complete Endpoint Inventory

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | No | Health check |
| GET | `/health` | No | Detailed health + model status |
| POST | `/api/ai/analyze` | No | Batch analysis of reports |
| POST | `/api/ai/predict-single` | No | Single report prediction |
| GET | `/api/ai/analyze-all` | No | Analyze all Google Sheets rows |
| GET | `/api/ai/model-info` | No | Model metadata |
| POST | `/api/ai/train` | No | Trigger model retraining |
| GET | `/api/ai/train/status` | No | Training progress |
| POST | `/api/ai/cache/invalidate` | No | Clear HF Space cache |
| GET | `/api/ai/cache/status` | No | Cache status |
| GET | `/api/ai/sheets/debug` | No | Inspect sheets headers/counts |
| GET | `/api/ai/risk/summary` | No | Aggregated risk overview |
| POST | `/api/ai/risk/calculate` | No | Recalculate risk from sheets |
| GET | `/api/ai/risk/airlines` | No | All airline risk scores |
| GET | `/api/ai/risk/airlines/{name}` | No | Single airline risk |
| GET | `/api/ai/risk/branches` | No | All branch risk scores |
| GET | `/api/ai/risk/hubs` | No | All hub risk scores |
| GET | `/api/ai/risk/routes` | No | All route risk scores |
| GET | `/api/ai/risk/routes/{name}` | No | Single route risk |
| GET | `/api/ai/risk/categories` | No | All category risk scores |
| GET | `/api/ai/risk/categories/{name}` | No | Single category risk |
| GET | `/api/ai/action-summary` | No | Action intelligence summary |
| GET | `/api/ai/summarize` | No | Category summarization |
| GET | `/api/ai/summarize/non-cargo` | No | Non-Cargo summary |
| GET | `/api/ai/summarize/cgo` | No | Cargo summary |
| GET | `/api/ai/summarize/compare` | No | Category comparison |
| GET | `/api/ai/branch/summary` | No | Branch analytics summary |
| GET | `/api/ai/branch/{name}` | No | Single branch metrics |
| GET | `/api/ai/branch/ranking` | No | Branch ranking |
| GET | `/api/ai/branch/comparison` | No | Branch comparison |
| POST | `/api/ai/branch/calculate` | No | Calculate branch metrics |
| POST | `/api/ai/subcategory` | No | Classify subcategory |
| GET | `/api/ai/subcategory/categories` | No | Get subcategories |
| POST | `/api/ai/action/recommend` | No | Recommend actions |
| POST | `/api/ai/action/train` | No | Train action recommender |
| POST | `/api/ai/ner/extract` | No | Named entity extraction |
| POST | `/api/ai/similar` | No | Find similar reports |
| POST | `/api/ai/similar/build-index` | No | Build similarity index |
| GET | `/api/ai/forecast/issues` | No | Issue forecasting |
| GET | `/api/ai/forecast/trends` | No | Trend prediction |
| GET | `/api/ai/forecast/seasonal` | No | Seasonal patterns |
| POST | `/api/ai/forecast/build` | No | Build forecast data |
| POST | `/api/ai/report/generate` | No | Generate report |
| GET | `/api/ai/dashboard/summary` | No | Dashboard summary |
| GET | `/api/ai/seasonality/summary` | No | Seasonality summary |
| GET | `/api/ai/seasonality/forecast` | No | Seasonality forecast |
| GET | `/api/ai/seasonality/peaks` | No | Peak season periods |
| POST | `/api/ai/seasonality/build` | No | Build seasonality patterns |
| POST | `/api/ai/root-cause/classify` | No | Classify single root cause |
| POST | `/api/ai/root-cause/classify-batch` | No | Batch root cause classification |
| GET | `/api/ai/root-cause/categories` | No | Root cause categories |
| GET | `/api/ai/root-cause/stats` | No | Root cause statistics |
| POST | `/api/ai/root-cause/train` | No | Train root cause classifier |
| GET | `/api/ai/gse` | No | GSE risk summary |
| GET | `/api/ai/gse/issues/top` | No | GSE top issues (SDA/SDM/Maintenance) |
| GET | `/api/ai/gse/ranking` | No | GSE ranking per entity |
| GET | `/api/ai/gse/serviceability` | No | GSE equipment status |
| GET | `/api/ai/gse/irregularities` | No | GSE irregularity cases |

#### Shared Query Parameters (AI Endpoints)

| Parameter | Type | Default | Description |
|---|---|---|---|
| `bypass_cache` | `boolean` | `false` | Skip HF Space internal cache |
| `esklasi_regex` | `string` | `OT\|OP\|UQ\|HT` | Filter for ESKLASI DIVISI column |
| `confidence_threshold` | `number` | `0.0` | Minimum AI confidence score |
| `sample_n` | `integer` | — | Sample N records |
| `max_rows_per_sheet` | `integer` | — | Limit rows per sheet |

#### POST `/api/ai/analyze` — Batch Analysis

**Request:**
```json
{
  "data": [
    {
      "Date_of_Event": "2025-02-22",
      "Airlines": "Garuda Indonesia",
      "Flight_Number": "GA901",
      "Branch": "CGK",
      "HUB": "HUB 1",
      "Irregularity_Complain_Category": "GSE",
      "Report": "Kerusakan parah pada hidrolik",
      "Area": "Apron Area",
      "Status": "Closed"
    }
  ],
  "options": {
    "predictResolutionTime": true,
    "classifySeverity": true
  }
}
```

**Response Fields:**

| Field | Type | Description |
|---|---|---|
| `predictedDays` | `number` | Estimated resolution time in days |
| `severity` | `string` | `Critical` / `High` / `Medium` / `Low` |
| `urgencyScore` | `number` | 0–1 urgency score |
| `shapExplanation` | `object` | Feature importance explanation |
| `anomalyDetection` | `object` | Anomaly flags |

### 5.3 HuggingFace Client Configuration

The `HuggingFaceClient` singleton (`lib/hf-client.ts`) manages all outbound AI requests:

| Config Key | Default | Env Override | Description |
|---|---|---|---|
| `baseUrl` | `https://gapura-dev-gapura-ai.hf.space` | `AI_SERVICE_URL` / `NEXT_PUBLIC_AI_SERVICE_URL` | AI service base URL |
| `rateLimitRpm` | `100` | `HF_RATE_LIMIT_RPM` | Requests per minute |
| `cacheTtlMs` | `300000` (5min) | `HF_CACHE_TTL_MS` | In-memory cache TTL |
| `maxRetries` | `3` | `HF_MAX_RETRIES` | Max retry attempts |
| `timeoutMs` | `120000` (2min) | `HF_TIMEOUT_MS` | Request timeout |
| `retryBackoffMs` | `1000` | `HF_RETRY_BACKOFF_MS` | Exponential backoff base |

Features:
- **Singleton pattern** prevents multiple auth client instances
- **In-flight deduplication**: concurrent identical requests share the same Promise
- **Request queuing**: requests exceeding rate limit are queued and processed sequentially
- **Automatic cache eviction**: max 500 entries, cleanup every 60s
- **Exponential backoff**: `baseMs × 2^attempt` on retries

---

## 6. Wireframe Descriptions

### 6.1 OP Main Dashboard (`/dashboard/op`)

```
┌──────────────────────────────────────────────────────────────────┐
│  [Sidebar: OP Division Nav]                                      │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │  DivisionAnalystDashboard                                    ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       ││
│  │  │ Total    │ │ Open     │ │ Closed   │ │ SLA      │       ││
│  │  │ Reports  │ │ Cases    │ │ Cases    │ │ Breach   │       ││
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘       ││
│  │                                                              ││
│  │  ┌─────────────────────┐  ┌─────────────────────────────┐  ││
│  │  │ Monthly Trend Chart │  │ Category Distribution Pie   │  ││
│  │  │ (Line Chart)        │  │ (Donut Chart)               │  ││
│  │  └─────────────────────┘  └─────────────────────────────┘  ││
│  │                                                              ││
│  │  ┌─────────────────────────────────────────────────────────┐││
│  │  │ Recent Reports Table (with pagination)                  │││
│  │  └─────────────────────────────────────────────────────────┘││
│  └──────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

### 6.2 Complaint per Category (`/dashboard/op/complaint-by-category`)

```
┌──────────────────────────────────────────────────────────────────┐
│  AnalyticsSourceStrip                                            │
│  [REAL: Google Sheets ●]  [AI: action-summary ○]                │
├──────────────────────────────────────────────────────────────────┤
│  Section: REAL — Distribusi Kategori dan Sumber Laporan          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ Total    │ │ Customer │ │ Internal │ │ Top      │           │
│  │ Reports  │ │ Source   │ │ Source   │ │ Category │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                                                                  │
│  ┌────────────────────┐  ┌──────────────────────────────────┐  │
│  │ Source Pie (Donut) │  │ Category Bar Chart               │  │
│  │ Customer vs Int.   │  │ Complaint|Irregularity|Compliment│  │
│  └────────────────────┘  └──────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ Monthly Trend Line Chart per Category                        ││
│  │ Lines: Complaint, Irregularity, Compliment, Accidents, Other││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ Category Tab Filter: [Complaint] [Irregularity] [Compliment]││
│  │                      [Accidents/Incidents] [Other]           ││
│  │ ┌────────────────────────────────────────────────────────┐  ││
│  │ │ Report List (scrollable, max 100)                      │  ││
│  │ │ Title | Category • Source • Branch | [Detail] button   │  ││
│  │ └────────────────────────────────────────────────────────┘  ││
│  └──────────────────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────────────────┤
│  Section: AI — Prioritas dan Rekomendasi dari AI                │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ ActionSummaryInsightPanel                                    ││
│  │ (Global recommendations + top categories by risk)            ││
│  └──────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

### 6.3 Risk & Severity (`/dashboard/op/risk-severity`)

```
┌──────────────────────────────────────────────────────────────────┐
│  AnalyticsSourceStrip                                            │
├──────────────────────────────────────────────────────────────────┤
│  Section: REAL — Eksposur Severity Aktual                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ Total    │ │ High+    │ │ Affected │ │ Open     │           │
│  │ Reports  │ │ Critical │ │ Hubs     │ │ Cases    │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐│
│  │ Severity     │ │ Status Pie   │ │ Top Airlines Bar Chart   ││
│  │ Distribution │ │ OPEN/PROG/   │ │ By volume               ││
│  │ Chart        │ │ CLOSED       │ │                          ││
│  └──────────────┘ └──────────────┘ └──────────────────────────┘│
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ Top Branches Bar Chart by Volume                             ││
│  └──────────────────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────────────────┤
│  Section: AI — Skor Risiko dari AI                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ Airlines │ │ Branches │ │ Hubs     │ │ Top Risk │           │
│  │ Scored   │ │ Scored   │ │ Scored   │ │ Branch   │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐│
│  │ AI Airline   │ │ AI Branch    │ │ AI Hub Severity Dist.    ││
│  │ Severity     │ │ Severity     │ │                          ││
│  └──────────────┘ └──────────────┘ └──────────────────────────┘│
│                                                                  │
│  ┌────────────────────────┐ ┌────────────────────────────────┐ │
│  │ Top Risky Branches Bar │ │ Top Risky Airlines Bar         │ │
│  │ (riskScore + issues)   │ │ (riskScore + issues)           │ │
│  └────────────────────────┘ └────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### 6.4 Root Cause Dominant (`/dashboard/op/root-cause-dominant`)

```
┌──────────────────────────────────────────────────────────────────┐
│  AnalyticsSourceStrip                                            │
├──────────────────────────────────────────────────────────────────┤
│  Section: REAL — Root Cause dari Data Aktual                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ Total    │ │ Classif. │ │ Unmatched│ │ Rate     │           │
│  │ Records  │ │ Records  │ │          │ │          │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                                                                  │
│  ┌────────────────────┐  ┌──────────────────────────────────┐  │
│  │ Root Cause Pie     │  │ Category Root Cause Bar          │  │
│  └────────────────────┘  └──────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ Top Root Causes by Category (DataTableWithPagination)        ││
│  └──────────────────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────────────────┤
│  Section: AI — Root Cause Statistics                             │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ AI Root Cause Distribution + Category Breakdown              ││
│  └──────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

### 6.5 Case Status (`/dashboard/op/case-status`)

```
┌──────────────────────────────────────────────────────────────────┐
│  AnalyticsSourceStrip                                            │
├──────────────────────────────────────────────────────────────────┤
│  Section: REAL                                                   │
│  Metric Cards: Total Reports | Open | On Progress | Closed      │
│  Pie: Status Distribution                                        │
│  Line: Monthly Status Trend (OPEN/PROGRESS/CLOSED stacked)       │
│  Table: Report list with status badges, link to detail           │
├──────────────────────────────────────────────────────────────────┤
│  Section: AI — Action Summary Insights                          │
│  ActionSummaryInsightPanel                                       │
└──────────────────────────────────────────────────────────────────┘
```

### 6.6 SLA Compliance (`/dashboard/op/sla-compliance`)

```
┌──────────────────────────────────────────────────────────────────┐
│  AnalyticsSourceStrip (real-only, no AI source)                  │
├──────────────────────────────────────────────────────────────────┤
│  Section: REAL — SLA Full Service Data                           │
│  Metric Cards: Compliance Rate | Total Services | Airlines | Cab │
│  Pie: Category Distribution (AVSEC/Bag Handling/Debrief)         │
│  Bar: Area Distribution                                          │
│  Bar: Bag Handling Performance                                   │
│  Table: Non-compliance cases                                     │
│  Table: AVSEC service rows                                       │
│  Table: Bag Handling rows                                        │
│  Table: Debriefing rows                                          │
├──────────────────────────────────────────────────────────────────┤
│  Section: AI — AnalyticsUnavailable                              │
│  "AI insight belum tersedia untuk SLA dataset"                   │
└──────────────────────────────────────────────────────────────────┘
```

### 6.7 Cargo Irregularity (`/dashboard/op/cargo-irregularity`)

```
┌──────────────────────────────────────────────────────────────────┐
│  AnalyticsSourceStrip (real: CGO only, AI: summarize/cgo)        │
├──────────────────────────────────────────────────────────────────┤
│  Section: REAL — Cargo-only data                                 │
│  Metric Cards: Total Cargo | Status breakdown | Top Branch | Top│
│  Pie: Status Distribution                                        │
│  Bar: Top Branches by cargo volume                               │
│  Line: Monthly Cargo Trend                                       │
│  Bar: Top Airlines by cargo                                      │
├──────────────────────────────────────────────────────────────────┤
│  Section: AI — Cargo AI Summary                                  │
│  AiReportSummary component (category=cgo)                        │
└──────────────────────────────────────────────────────────────────┘
```

### 6.8 Joumpa Handling (`/dashboard/op/joumpa`)

```
┌──────────────────────────────────────────────────────────────────┐
│  AnalyticsSourceStrip (real-only, no AI source)                  │
├──────────────────────────────────────────────────────────────────┤
│  Section: REAL — JoumpaDashboard component                       │
│  Full embedded Joumpa handling dashboard (backPath=/dashboard/op)│
├──────────────────────────────────────────────────────────────────┤
│  Section: AI — AnalyticsUnavailable                              │
│  "Tidak ada endpoint AI yang khusus membaca sheet Joumpa"       │
└──────────────────────────────────────────────────────────────────┘
```

### 6.9 AI Reports (`/dashboard/op/ai-reports`)

```
┌──────────────────────────────────────────────────────────────────┐
│  DivisionAIReportsDashboard (division="OP")                      │
│  Composite AI reporting view specialized for OP division         │
│  Dynamically loaded with next/dynamic (skeleton loading)         │
└──────────────────────────────────────────────────────────────────┘
```

### 6.10 Dispatched Reports (`/dashboard/op/dispatched`)

```
┌──────────────────────────────────────────────────────────────────┐
│  DivisionReportsPage                                             │
│  config: { code: 'OP', color: '#3b82f6',                        │
│    apiEndpoint: '/api/admin/reports?target_division=OP' }        │
│  Lists reports dispatched to OP division with filtering          │
└──────────────────────────────────────────────────────────────────┘
```

---

## 7. State Management Strategy

### 7.1 Client-Side State

OP sub-pages use **React `useState` + `useMemo`** pattern exclusively (no Redux, Zustand, or Context API for page-level state):

```
┌─────────────────────────────────┐
│  Component State (useState)     │
│  ├── reports: ReportRow[]       │
│  ├── loading: boolean           │
│  ├── error: string | null       │
│  ├── realStatus: RuntimeStatus  │
│  └── aiStatus: RuntimeStatus    │
├─────────────────────────────────┤
│  Derived State (useMemo)        │
│  ├── categoryBreakdown          │
│  ├── monthlyTrend               │
│  ├── topBranches                │
│  ├── topAirlines                │
│  ├── severityDistribution       │
│  └── sourceBreakdown            │
└─────────────────────────────────┘
```

### 7.2 Data Fetching Pattern

All sub-pages follow an identical fetching pattern:

```typescript
// 1. Load real data
useEffect(() => {
  let active = true;
  async function load() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchAnalyticsReports<ReportRow>(filters, fields);
      if (!active) return;
      setReports(response.reports || []);
      setRealStatus({ lastSyncAt: response.timestamp, count: response.count });
    } catch (e) {
      if (!active) setError(e.message);
    } finally {
      if (active) setLoading(false);
    }
  }
  load();
  return () => { active = false; }; // Abort guard
}, []);
```

### 7.3 Authentication State

- **Session**: JWT stored in `session` cookie
- **Verification**: `verifySession()` via `jose` library on every API route
- **Auth Context**: `lib/auth-context.tsx` provides React context
- **Role-based routing**: `GET_LINKS_KEY()` maps role to nav config

### 7.4 Caching Layers

| Layer | Mechanism | TTL | Storage |
|---|---|---|---|
| **Browser HTTP Cache** | `Cache-Control: s-maxage=300` | 5 min | Browser |
| **SWR** | `lib/swr.ts` configuration | Configurable | Memory |
| **HuggingFace Client** | `HuggingFaceClient` singleton | 5 min (`cacheTtlMs`) | In-memory Map |
| **AI Route Cache** | `resolveCachedAI()` | Until sync version changes | Supabase `ai_cache` table |
| **Next.js ISR** | Route-level `revalidate` | Varies | CDN edge |

---

## 8. Component Inventory

### 8.1 Shared UI Components (Radix + Shadcn)

All components use **Shadcn UI** (`components/ui/*`) built on Radix primitives:
- `@radix-ui/react-dialog` → Modal dialogs
- `@radix-ui/react-dropdown-menu` → Dropdown menus
- `@radix-ui/react-popover` → Popovers
- `@radix-ui/react-tooltip` → Tooltips
- `class-variance-authority` + `tailwind-merge` → Variant styling

### 8.2 OP-Specific Reusable Components

| Component | Path | Purpose |
|---|---|---|
| `AnalyticsSourceStrip` | `components/dashboard/analytics-source-strip.tsx` | Dual-source header strip (Real vs AI status) |
| `AnalyticsMetricCard` | `components/dashboard/analytics-metric-card.tsx` | KPI card with icon, value, caption, tone |
| `AnalyticsSection` | `components/dashboard/analytics-source-strip.tsx` | Section wrapper with `variant: 'real' \| 'ai'` |
| `AnalyticsSectionLoading` | `components/dashboard/analytics-source-strip.tsx` | Skeleton loader for AI sections |
| `AnalyticsUnavailable` | `components/dashboard/analytics-source-strip.tsx` | Empty state for unavailable AI |
| `ActionSummaryInsightPanel` | `components/dashboard/action-summary-insight-panel.tsx` | AI recommendation display |
| `DivisionAnalystDashboard` | `components/dashboard/DivisionAnalystDashboard.tsx` | Main dashboard wrapper |
| `DivisionReportsPage` | `components/dashboard/DivisionReportsPage.tsx` | Division report list |
| `DivisionAIReportsDashboard` | `components/dashboard/ai-reports/DivisionAIReportsDashboard.tsx` | AI reports composite |
| `JoumpaDashboard` | `components/dashboard/JoumpaDashboard.tsx` | Joumpa handling dashboard |
| `AiReportSummary` | `components/ai/AiReportSummary.tsx` | AI summary display |

### 8.3 Chart Components

| Component | Purpose |
|---|---|
| `ResponsiveBarChart` | Horizontal/vertical bar charts |
| `ResponsiveLineChart` | Multi-series line charts |
| `ResponsivePieChart` | Donut/pie charts |
| `SeverityDistributionChart` | Custom severity distribution visualization |
| `DataTableWithPagination` | Paginated data table |

---

## 9. Environment Configuration & Security

### 9.1 Environment Variables

| Variable | Scope | Purpose | Security Classification |
|---|---|---|---|
| `GROQ_API_KEY` | Server-only | Groq LLM API access | **SECRET** — Never expose to client |
| `NEXT_PUBLIC_AI_SERVICE_URL` | Client + Server | AI service base URL | Public |
| `AI_SERVICE_URL` | Server-only | AI service base URL (server-side) | Internal |
| `NEXT_PUBLIC_GOOGLE_SHEET_ID` | Client + Server | Primary Google Sheet ID | Low sensitivity |
| `GOOGLE_SHEET_ID` | Server-only | Primary Google Sheet ID (server) | Internal |
| `GOOGLE_PRIVATE_KEY` | Server-only | Google service account private key | **SECRET** — PEM key |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Server-only | Google service account email | Internal |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | Supabase admin access | **SECRET** — Full DB access |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Supabase anonymous access | Public (RLS protected) |
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL | Public |
| `JWT_SECRET` | Server-only | Session token signing | **SECRET** |
| `JOUMPA_SHEET_ID` | Server-only | Joumpa dataset sheet | Internal |
| `SLA_FULL_SERVICE_SHEET_ID` | Server-only | SLA dataset sheet | Internal |
| `WSN_SHEET_ID` | Server-only | WSN dataset sheet | Internal |
| `HC_SHEETS` | Server-only | HC dataset sheet | Internal |
| `GAPURA_AI_BASE_URL` | Server-only | AI base URL alias | Internal |
| `GMAIL_SMTP_USER` | Server-only | Email sender address | Internal |
| `GMAIL_SMTP_APP_PASSWORD` | Server-only | Email app password | **SECRET** |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | Server-only | SMTP configuration | Internal |
| `NOTIFICATION_FROM_EMAIL` | Server-only | Email display name | Internal |
| `NEXT_PUBLIC_QUICK_ACCESS_PASSWORD` | Client + Server | Quick access gate password | Low sensitivity |
| `NODE_ENV` | Server-only | Environment mode | Public |

### 9.2 Security Protocols

1. **Server-Only Imports**: `lib/google-sheets.ts` and `lib/ai-route-cache.ts` use `'use server-only'` to prevent client bundle inclusion
2. **Session Verification**: Every `/api/ai/*` route calls `verifySession()` which:
   - Reads `session` cookie
   - Verifies JWT signature using `JWT_SECRET`
   - Extracts `SessionPayload` (id, email, role, division)
   - Returns 401 if invalid
3. **Secret Exposure Prevention**:
   - All `NEXT_PUBLIC_*` variables are explicitly public-safe
   - `GOOGLE_PRIVATE_KEY` is only imported in `server-only` modules
   - API routes never echo back secrets in error responses
4. **Row-Level Security**: Supabase RLS policies protect data access; `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS only server-side
5. **Cookie Security**: Session cookies should be `httpOnly`, `secure` (in production), `sameSite=strict`

### 9.3 Google Sheets API Authentication

```
Service Account: sheets@gapura-487706.iam.gserviceaccount.com
Scope: https://www.googleapis.com/auth/spreadsheets
Auth: JWT via google.auth.JWT (singleton pattern to prevent memory leaks)
```

---

## 10. Error Handling Mechanisms

### 10.1 Error Hierarchy

```
┌────────────────────────────────────────────────┐
│  Level 1: UI Error Boundary                    │
│  - React error boundary wraps each page        │
│  - Displays error state with retry button      │
├────────────────────────────────────────────────┤
│  Level 2: Page-Level Error State               │
│  - useState(error) captures fetch errors       │
│  - Red error banner displayed inline           │
│  - Error message from API or catch block       │
├────────────────────────────────────────────────┤
│  Level 3: API Route Error Handling             │
│  - Try/catch on all route handlers             │
│  - Structured JSON error responses             │
│  - Degraded fallback for AI routes             │
├────────────────────────────────────────────────┤
│  Level 4: AI Service Error Recovery            │
│  - resolveCachedAI() stale fallback            │
│  - HuggingFaceClient retry with backoff        │
│  - Rate limit queue prevents overload          │
└────────────────────────────────────────────────┘
```

### 10.2 Error Response Formats

**Analytics API (Real Data):**
```json
{ "error": "Failed to fetch reports", "details": "Google Sheets API error: ..." }
```
Status: 500 (server error), 400 (bad request)

**AI Proxy Routes:**
```json
{
  "status": "degraded",
  "totalRecords": 0,
  "categories": {},
  "overallSummary": { /* zeroed metrics */ },
  "cached": false,
  "stale": true
}
```
The AI routes **never throw to the client** — they return a degraded but structurally valid response.

**Authentication Errors:**
```json
{ "error": "Unauthorized" }
```
Status: 401

### 10.3 Error Handling per Page

| Page | Real Error | AI Error | AI Unavailable |
|---|---|---|---|
| complaint-by-category | Red error banner | `ActionSummaryInsightPanel` handles internally | — |
| risk-severity | Red error banner | Red error banner | `AnalyticsUnavailable` component |
| root-cause-dominant | Red error banner | `AnalyticsSectionLoading` → `AnalyticsUnavailable` | `AnalyticsUnavailable` |
| case-status | Red error banner | `ActionSummaryInsightPanel` handles internally | — |
| sla-compliance | Red error banner | — | `AnalyticsUnavailable` |
| cargo-irregularity | Red error banner | `AiReportSummary` handles internally | — |
| joumpa | Delegated to `JoumpaDashboard` | — | `AnalyticsUnavailable` |

### 10.4 HuggingFace Client Error Codes

| HTTP Code | Meaning | Client Action |
|---|---|---|
| 200 | Success | Cache + return |
| 400 | Bad request | Throw immediately |
| 404 | Not found | Return `AnalyticsUnavailable` |
| 422 | Validation error | Throw immediately |
| 429 | Rate limited | Retry with exponential backoff (max 3) |
| 500 | Server error | Retry with backoff, fallback to stale cache |

---

## 11. Caching Architecture

### 11.1 Cache Flow

```
Client Request
    │
    ▼
┌─── Next.js API Route ───┐
│  1. Check ai-route-cache │─── Cache HIT ──→ Return cached payload
│  2. Check inflight dedup │─── Inflight   ──→ Return shared Promise
│  3. Execute resolver     │
│     │                    │
│     ▼                    │
│  ┌─ HF Client ────────┐ │
│  │ 1. Check mem cache  │─── HIT ──→ Return cached response
│  │ 2. Check rate limit │─── Full ──→ Queue request
│  │ 3. Execute fetch    │
│  │    │                │
│  │    ▼                │
│  │  HF Space API       │
│  └─────────────────────┘ │
│                          │
│  4. Write ai-route-cache│
│  5. Return response     │
└──────────────────────────┘
```

### 11.2 Cache Invalidation Triggers

1. **Sync version change**: When `sync_state` table is updated (new Google Sheets sync), cache key includes `syncVersion` which invalidates all AI cache
2. **Manual bypass**: `bypass_cache=true` query parameter on AI endpoints
3. **TTL expiry**: `ai-route-cache` entries expire based on `stale` flag and new sync events
4. **HF Client eviction**: In-memory cache evicts after `cacheTtlMs` or max 500 entries

### 11.3 Cache Headers by Route

| Route | Cache-Control | Rationale |
|---|---|---|
| `/api/reports/analytics` | `public, s-maxage=300, stale-while-revalidate=600` | 5 min fresh, 10 min stale |
| `/api/ai/action-summary` | `public, s-maxage=60, stale-while-revalidate=300` | 1 min fresh, 5 min stale |
| `/api/ai/risk/summary` | (dynamic) | Force-dynamic rendering |
| `/api/ai/root-cause/stats` | (dynamic) | Force-dynamic rendering |

---

## 12. Performance Requirements

### 12.1 Target Metrics

| Metric | Target | Measurement |
|---|---|---|
| First Contentful Paint (OP main) | < 2s | Lighthouse |
| Time to Interactive (sub-pages) | < 3s | Lighthouse |
| Analytics API response | < 2s (cached), < 8s (fresh) | Server timing |
| AI proxy response | < 5s (cached), < 30s (fresh) | Server timing |
| Chart render (1000 data points) | < 500ms | Performance API |
| Report list (100 items) | < 200ms | Performance API |

### 12.2 Optimization Strategies

1. **Field Projection**: Analytics API supports `fields` parameter to reduce payload size
2. **Code Splitting**: `DivisionAIReportsDashboard` loaded via `next/dynamic` with skeleton
3. **AbortController**: All page fetches pass `AbortSignal` for cleanup on unmount
4. **Active Guard**: `let active = true` pattern prevents state updates after unmount
5. **Memory Management**: Google Sheets auth client uses singleton pattern
6. **HF Client Queue**: Prevents concurrent request bursts to AI service
7. **Node Memory**: `--max-old-space-size=4096` allocated for large dataset processing

### 12.3 Data Volume Expectations

| Source | Approximate Records | Sheets |
|---|---|---|
| Main Report Sheet (NON CARGO + CGO) | ~5,000 rows | 2 tabs |
| SLA Full Service | ~500 rows | 4 tabs |
| Joumpa Handling | ~200 rows | 1 tab |

---

## Appendix A: File Reference Map

| File | Purpose |
|---|---|
| `lib/op-shortcut-source-matrix.ts` | Declarative source matrix for all OP shortcut pages |
| `lib/op-shortcut-analytics.ts` | Shared analytics utilities (fetch, normalize, aggregate) |
| `lib/dashboard-query-scope.ts` | Dashboard filter/scope management |
| `lib/google-sheets.ts` | Google Sheets API client (server-only) |
| `lib/hf-client.ts` | HuggingFace AI service client with caching/rate-limit |
| `lib/ai-route-cache.ts` | AI response cache with stale fallback |
| `lib/ai-cache.ts` | Low-level cache read/write to Supabase |
| `lib/auth-utils.ts` | JWT session verification utilities |
| `lib/nav-config.ts` | Role-based navigation configuration |
| `lib/constants/divisions.ts` | Division color/styling configuration |
| `types/index.ts` | Core type definitions (Report, User, etc.) |
| `app/dashboard/(main)/op/page.tsx` | OP main dashboard entry point |
| `app/dashboard/(main)/op/*/page.tsx` | Individual OP sub-pages |
| `app/api/reports/analytics/route.ts` | Real data analytics API |
| `app/api/ai/action-summary/route.ts` | AI action summary proxy |
| `app/api/ai/risk/summary/route.ts` | AI risk summary proxy |
| `app/api/ai/root-cause/stats/route.ts` | AI root cause statistics proxy |
| `components/dashboard/analytics-source-strip.tsx` | Dual-source section components |
| `components/dashboard/analytics-metric-card.tsx` | KPI metric card component |
| `components/dashboard/action-summary-insight-panel.tsx` | AI insight display |

## Appendix B: OP Shortcut → AI Endpoint Mapping

```
complaintByCategory ────────→ /api/ai/action-summary
riskSeverity ───────────────→ /api/ai/risk/summary
topIrregularityComplaint ───→ /api/ai/action-summary
rootCauseDominant ──────────→ /api/ai/root-cause/stats
caseStatus ─────────────────→ /api/ai/action-summary
slaCompliance ─────────────→ (none — real-only)
cargoIrregularity ─────────→ /api/ai/summarize?category=cgo
joumpa ────────────────────→ (none — real-only)
gseDashboard ──────────────→ /api/ai/gse/* (issues/top, ranking, serviceability, irregularities)
monitoringEfektivitas ─────→ /api/ai/summarize + /api/ai/branch/summary + /api/ai/seasonality/forecast
monitoringKesesuaianStandar→ /api/ai/root-cause/stats
```
