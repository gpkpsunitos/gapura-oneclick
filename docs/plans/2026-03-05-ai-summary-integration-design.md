# AI Summary Integration Design

**Date:** 2026-03-05
**Status:** Approved
**Approach:** Component-Based Architecture

## Overview

This document outlines the design for integrating AI-powered summary and analysis features into the Gapura IRRS2 application. The integration provides two main features:

1. **Division Reports Page Header** - AI summary KPI cards and visualizations
2. **Report Detail View** - Expandable AI analysis panel for individual reports

## Goals

- Provide actionable AI insights at a glance through KPI cards
- Offer detailed visualizations for deeper analysis
- Enable on-demand AI analysis for individual reports
- Maintain performance with lazy loading and caching
- Ensure graceful degradation when AI services are unavailable

## Architecture

### Component-Based Design

We chose a component-based architecture for:
- **Reusability** - Components can be used across different division pages
- **Testability** - Each component can be tested in isolation
- **Maintainability** - Clear separation of concerns
- **Performance** - Easy to lazy load heavy components

### File Structure

```
components/
├── dashboard/
│   ├── ai-summary/
│   │   ├── AIKPIHeader.tsx              # Main header with KPI cards
│   │   ├── AISummaryExpansion.tsx       # Expandable visualizations
│   │   ├── KPICard.tsx                  # Reusable KPI card
│   │   ├── CategoryDistributionChart.tsx # Bar chart for categories
│   │   ├── SeverityBreakdown.tsx        # Donut chart for severity
│   │   ├── TopActionsList.tsx           # Recommended actions grid
│   │   ├── RiskHeatmap.tsx              # Risk score visualization
│   │   ├── SkeletonLoaders.tsx          # Loading state components
│   │   └── AIErrorBoundary.tsx          # Error handling wrapper
│   └── report-ai-analysis/
│       ├── ReportAIAnalysis.tsx         # Main expandable panel
│       ├── SeverityPrediction.tsx       # Severity classification
│       ├── ResolutionTimePrediction.tsx  # Time prediction
│       ├── EntityExtraction.tsx         # Named entities
│       ├── ExecutiveSummary.tsx         # AI summary
│       ├── SentimentAnalysis.tsx        # Sentiment breakdown
│       └── QuickStatCard.tsx            # Reusable stat card
│
hooks/
├── useActionSummary.ts                  # Hook for action-summary API
├── useRiskSummary.ts                    # Hook for risk/summary API
└── useReportAnalysis.ts                 # Hook for analyze API
│
lib/
└── api/
    └── ai-summary.ts                    # API functions & types
```

## Data Integration

### API Endpoints

#### 1. Action Summary API
```
GET https://ridzki-nrzngr-gapura-ai.hf.space/api/ai/action-summary
Query Params: division (optional)

Response:
{
  "status": "success",
  "totalRecords": 1020,
  "categories": {
    "Pax Handling": {
      "count": 56,
      "severityDistribution": { "Low": 47, "Medium": 9 },
      "topActions": [...],
      "avgResolutionDays": 1.36,
      "effectivenessScore": 1.0
    }
  },
  "overallSummary": {
    "totalRecords": 1020,
    "openCount": 118,
    "closedCount": 902,
    "highPriorityCount": 326,
    "severityDistribution": { "Low": 614, "Medium": 80, "High": 326 },
    "avgResolutionDays": 1.85
  },
  "topCategoriesByCount": [...],
  "topCategoriesByRisk": [...],
  "globalRecommendations": [...]
}
```

#### 2. Risk Summary API
```
GET {AI_SERVICE_URL}/api/ai/risk/summary

Response:
{
  "last_updated": "2026-03-05T10:30:00Z",
  "airline_risks": { "GA": 0.65, "QG": 0.42 },
  "branch_risks": { "CGK": 0.58, "SUB": 0.35 },
  "hub_risks": { "HUB1": 0.72 },
  "top_risky_airlines": ["GA", "QG"],
  "top_risky_branches": ["CGK", "SUB"],
  "total_airlines": 15,
  "total_branches": 8,
  "total_hubs": 5
}
```

#### 3. Report Analysis API
```
POST /api/ai/analyze

Request Body:
{
  "data": [{
    "Date_of_Event": "2026-02-20",
    "Airlines": "GA",
    "Flight_Number": "GA402",
    "Branch": "CGK",
    "HUB": "CGK",
    "Report_Category": "Irregularity",
    "Irregularity_Complain_Category": "Baggage Handling",
    "Report": "Passenger reported damage...",
    "Root_Caused": "Handling error",
    "Action_Taken": "Provided compensation",
    "Area": "Terminal Area",
    "Status": "Open"
  }],
  "options": {
    "predictResolutionTime": true,
    "classifySeverity": true,
    "extractEntities": true,
    "generateSummary": true,
    "analyzeTrends": true
  }
}

Response:
{
  "regression": {
    "predictions": [{
      "reportId": "row_0",
      "predictedDays": 1.62,
      "confidenceInterval": [1.12, 2.12],
      "featureImportance": { "category": 0.35, "airline": 0.28 }
    }]
  },
  "nlp": {
    "classifications": [{
      "severity": "Low",
      "severityConfidence": 0.67,
      "issueType": "Baggage Handling"
    }],
    "entities": [{ "text": "GA", "label": "AIRLINE", "confidence": 0.95 }],
    "summaries": [{
      "executiveSummary": "Passenger reported damage...",
      "keyPoints": ["Baggage handling issue"]
    }],
    "sentiment": [{
      "urgencyScore": 0.41,
      "sentiment": "Somewhat Negative",
      "keywords": ["damage", "error"]
    }]
  },
  "trends": { ... },
  "metadata": {
    "totalRecords": 1,
    "processingTime": 55.22,
    "modelVersions": { "regression": "1.0.0", "nlp": "3.0.0" }
  }
}
```

### Data Flow

```
DivisionReportsPage
    │
    ├─> useActionSummary(division)
    │      │
    │      └─> AIKPIHeader
    │             ├─> KPICard (High Priority)
    │             ├─> KPICard (Avg Resolution)
    │             ├─> KPICard (Open Cases)
    │             └─> AISummaryExpansion
    │                    ├─> CategoryDistributionChart
    │                    ├─> SeverityBreakdown
    │                    ├─> TopActionsList
    │                    └─> RiskHeatmap
    │
    └─> useRiskSummary()
           │
           └─> AIKPIHeader
                  ├─> KPICard (Top Risk Airline)
                  ├─> KPICard (Risk Branch)
                  └─> KPICard (Entities Tracked)

ReportDetailView
    │
    └─> ReportAIAnalysis
           │
           └─> useReportAnalysis(report)
                  │
                  └─> analyze (on-demand)
                         │
                         ├─> SeverityPrediction
                         ├─> ResolutionTimePrediction
                         ├─> ExecutiveSummary
                         ├─> EntityExtraction
                         └─> SentimentAnalysis
```

## Component Design

### 1. AIKPIHeader Component

**Purpose:** Display compact AI-powered metrics in the division page header

**Location:** `components/dashboard/ai-summary/AIKPIHeader.tsx`

**Features:**
- 6 KPI cards combining action-summary and risk-summary data
- Collapsible visualization section
- Loading skeletons while data fetches
- Graceful degradation if one API fails

**KPI Cards:**
1. **High Priority Cases** (from action-summary)
   - Icon: AlertTriangle
   - Value: highPriorityCount
   - Variant: danger (red)

2. **Average Resolution** (from action-summary)
   - Icon: Clock
   - Value: avgResolutionDays + " hari"
   - Variant: success (green)

3. **Open Cases** (from action-summary)
   - Icon: Activity
   - Value: openCount
   - Variant: warning (amber)

4. **Top Risk Airline** (from risk-summary)
   - Icon: Plane
   - Value: top_risky_airlines[0]

5. **Risk Branch** (from risk-summary)
   - Icon: Building2
   - Value: top_risky_branches[0]

6. **Entities Tracked** (from risk-summary)
   - Icon: Shield
   - Value: total_airlines + total_branches + total_hubs

**Visual Design:**
- Glassmorphism style matching existing header
- `bg-white/10 backdrop-blur-2xl border border-white/20`
- Rounded corners (24px radius)
- Hover scale effect (1.02x)
- Staggered entrance animations

### 2. AISummaryExpansion Component

**Purpose:** Provide detailed visualizations when user expands the summary

**Location:** `components/dashboard/ai-summary/AISummaryExpansion.tsx`

**Features:**
- Tabbed interface (Overview, Actions, Risk)
- Animated tab transitions
- Lazy-loaded chart components

**Tabs:**

**Overview Tab:**
- CategoryDistributionChart (horizontal bar chart)
- SeverityBreakdown (donut chart)

**Actions Tab:**
- TopActionsList (grid of action cards with confidence scores)

**Risk Tab:**
- RiskHeatmap (color-coded grid of risk scores)
- Toggle between airlines/branches/hubs

**Chart Library:** Recharts
- Tree-shakeable
- Responsive
- Good TypeScript support

### 3. ReportAIAnalysis Component

**Purpose:** Provide on-demand AI analysis for individual reports

**Location:** `components/dashboard/report-ai-analysis/ReportAIAnalysis.tsx`

**Integration Point:** ReportDetailView, after "Deskripsi Masalah" section

**Features:**
- Collapsible panel (collapsed by default)
- On-demand analysis (fetches only when expanded)
- Quick stat cards for immediate insights
- Detailed analysis sections

**Layout:**
```
┌─────────────────────────────────────────┐
│ [🧠] AI Analysis (click to expand)  [▼] │
├─────────────────────────────────────────┤
│ Quick Stats Row (4 cards)               │
│  [Severity] [Predicted Days] [Conf] [Sent]│
├─────────────────────────────────────────┤
│ Analysis Grid (2 columns)               │
│  ┌──────────────┐ ┌──────────────┐     │
│  │ Severity     │ │ Executive    │     │
│  │ Prediction   │ │ Summary      │     │
│  └──────────────┘ └──────────────┘     │
│  ┌──────────────┐ ┌──────────────┐     │
│  │ Resolution   │ │ Entity       │     │
│  │ Time         │ │ Extraction   │     │
│  └──────────────┘ └──────────────┘     │
├─────────────────────────────────────────┤
│ Sentiment Analysis (full width)         │
├─────────────────────────────────────────┤
│ Footer: Processing time | Re-analyze    │
└─────────────────────────────────────────┘
```

**Analysis Sections:**

1. **SeverityPrediction**
   - Severity badge (Low/Medium/High/Critical)
   - Confidence meter (progress bar)
   - Issue type and area type

2. **ResolutionTimePrediction**
   - Predicted days (large number)
   - Confidence interval (range)
   - Key factors (feature importance bars)

3. **ExecutiveSummary**
   - AI-generated summary text
   - Key points (bullet list)

4. **EntityExtraction**
   - Tag-style entities (Airline, Flight Number, Date, Location)
   - Confidence percentage
   - Color-coded by entity type

5. **SentimentAnalysis**
   - Overall sentiment (emoji + text)
   - Urgency score (progress bar)
   - Key terms (tags)

## Error Handling

### Error Types

```typescript
class AISummaryError extends Error {
  constructor(
    message: string,
    public code: 'NETWORK_ERROR' | 'API_ERROR' | 'TIMEOUT' | 'INVALID_DATA',
    public retryable: boolean = true
  ) {
    super(message);
    this.name = 'AISummaryError';
  }
}
```

### Graceful Degradation

1. **Partial Data:** If action-summary fails, show risk-summary and vice versa
2. **Error Cards:** Display warning cards for failed API calls
3. **Retry Mechanism:** Button to retry failed requests
4. **Fallback UI:** Show basic stats even if AI completely fails

### Error Boundary

```typescript
<AIErrorBoundary>
  <AIKPIHeader ... />
</AIErrorBoundary>
```

## Loading States

### Skeleton Loaders

1. **KPICardSkeleton** - Mimics KPI card structure
2. **ChartSkeleton** - Placeholder for chart area
3. **ReportAnalysisSkeleton** - Full analysis panel skeleton

### Progressive Loading

1. Basic stats show immediately (Total, Pending, Selesai)
2. AI skeleton shows while fetching
3. AI data replaces skeleton when loaded
4. Visualizations lazy-load on expand

## Performance Optimizations

### 1. Code Splitting

```typescript
const CategoryDistributionChart = lazy(() =>
  import('./CategoryDistributionChart')
);

<Suspense fallback={<ChartSkeleton />}>
  <CategoryDistributionChart data={data} />
</Suspense>
```

### 2. Memoization

```typescript
const chartData = useMemo(() => {
  return processChartData(actionSummary);
}, [actionSummary]);

const TopActionCard = memo(({ action, index }) => {
  // ...
});
```

### 3. Request Deduplication

```typescript
const requestCache = new Map<string, Promise<any>>();

// Prevent duplicate requests for same division
if (requestCache.has(cacheKey)) {
  return requestCache.get(cacheKey);
}
```

### 4. Lazy Loading Strategy

- **KPI Cards:** Load immediately (lightweight)
- **Visualizations:** Load on expand (heavy)
- **Report Analysis:** Load on demand (only when user opens)

## Caching Strategy

| Data Source | Cache Duration | Invalidation |
|-------------|----------------|--------------|
| Action Summary | 5 minutes | Manual refresh |
| Risk Summary | 10 minutes | Manual refresh |
| Report Analysis | No cache | Fresh analysis each time |

## Accessibility

### ARIA Labels

```typescript
<button
  aria-expanded={isExpanded}
  aria-controls="ai-summary-content"
  aria-label="Toggle AI analysis details"
>
```

### Keyboard Navigation

- Tab navigation through all interactive elements
- Enter/Space to toggle expand/collapse
- Focus management on modal/tab changes

### Screen Reader Support

- Semantic HTML structure
- Descriptive labels for charts (aria-label)
- Status announcements for loading/error states

### Color Contrast

- All text meets WCAG AA standards
- Not relying solely on color to convey information
- Icons + color + text for status indicators

## Responsive Design

### Breakpoints

- **Mobile (< 768px):** 2-column grid for KPIs, single column for analysis
- **Tablet (768px - 1024px):** 3-column grid, 2-column analysis
- **Desktop (> 1024px):** Flexbox layout, full visualization grid

### Touch Optimization

- Minimum tap target: 44x44px
- Adequate spacing between interactive elements
- Swipe gestures for tabs (optional enhancement)

## Dependencies

### New Dependencies

```json
{
  "recharts": "^2.12.0"
}
```

### Existing Dependencies Used

- `framer-motion` - Animations
- `lucide-react` - Icons
- `clsx` + `tailwind-merge` - Class utilities

## Testing Strategy

### Unit Tests

1. **Component Rendering**
   - Renders with valid data
   - Renders with null/undefined data
   - Renders loading states
   - Renders error states

2. **User Interactions**
   - Expand/collapse functionality
   - Tab switching
   - Retry button clicks

3. **Data Processing**
   - Chart data transformation
   - KPI derivation logic
   - Error handling

### Integration Tests

1. **API Integration**
   - Successful data fetch
   - Failed request handling
   - Timeout handling

2. **Component Integration**
   - Parent-child data flow
   - Event propagation
   - State management

### E2E Tests

1. **User Flows**
   - View division page with AI insights
   - Expand visualizations
   - Analyze individual report
   - Handle network failures

## Migration Path

### Phase 1: Foundation
- Create API functions and types
- Implement custom hooks
- Set up error handling utilities

### Phase 2: Division Page Integration
- Create AIKPIHeader component
- Implement KPI cards
- Add visualization components
- Integrate into DivisionReportsPage

### Phase 3: Report Detail Integration
- Create ReportAIAnalysis component
- Implement analysis sub-components
- Integrate into ReportDetailView

### Phase 4: Polish & Optimization
- Add loading states
- Implement caching
- Performance optimization
- Accessibility improvements

## Success Metrics

1. **Performance**
   - Initial load: < 2s for KPI cards
   - Visualization expand: < 500ms
   - Report analysis: < 5s

2. **User Engagement**
   - 50%+ users expand visualizations
   - 30%+ users analyze reports
   - Low error rate (< 5%)

3. **Code Quality**
   - 80%+ test coverage
   - Zero TypeScript errors
   - All accessibility checks pass

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| External API downtime | High | Graceful degradation, cached fallbacks |
| Slow API responses | Medium | Loading states, timeout handling |
| Large bundle size | Medium | Code splitting, lazy loading |
| Complex chart rendering | Low | Virtualization, pagination |

## Future Enhancements

1. **Real-time Updates** - WebSocket integration for live data
2. **Export Functionality** - Download AI insights as PDF/Excel
3. **Custom Dashboards** - User-configurable KPI selection
4. **AI Recommendations** - Actionable suggestions based on patterns
5. **Historical Trends** - Time-series analysis and forecasting

## Conclusion

This design provides a robust, performant, and user-friendly AI integration that enhances the existing Gapura IRRS2 application without disrupting current workflows. The component-based architecture ensures maintainability and extensibility for future enhancements.

**Approved by:** User
**Date:** 2026-03-05
