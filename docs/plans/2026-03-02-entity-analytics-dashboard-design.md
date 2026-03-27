# Entity Analytics Dashboard Design

**Date:** March 2, 2026
**Status:** Approved
**Author:** Claude
**Feature:** Comprehensive Entity Analytics Dashboard for AI Reports

---

## Executive Summary

Fitur Entity Analytics Dashboard akan ditambahkan ke AI Reports page untuk memberikan kemampuan analisis mendalam terhadap entities (maskapai, rute, lokasi, nomor penerbangan) yang terekstrak dari laporan-laporan insiden. Dashboard ini akan diintegrasikan ke dalam tab Overview yang sudah ada dan menyediakan cross-entity filtering capabilities dengan visualisasi interaktif.

**Key Benefits:**
- 🔍 Cross-entity analysis dengan multi-filter support
- 📊 Visualisasi interaktif untuk pattern recognition
- ⚡ Real-time filtering tanpa API calls (instant UX)
- 🇮🇩 Semua penjelasan dalam Bahasa Indonesia

---

## 1. Requirements

### 1.1 Functional Requirements

**Must Have:**
- ✅ Extract dan aggregate entities dari batch analysis results
- ✅ Visualisasi top entities dengan breakdown severity
- ✅ Multi-entity filtering (airline + route + hub + severity)
- ✅ Drill-down ke detail reports dari visualisasi
- ✅ Real-time filtering tanpa loading states
- ✅ Semua UI text dalam Bahasa Indonesia

**Nice to Have:**
- Export filtered data ke CSV
- Save filter presets
- Comparison view (compare 2+ entities)
- Trend analysis over time

### 1.2 Non-Functional Requirements

**Performance:**
- Filtering response time < 100ms untuk 1000 records
- Initial processing time < 2 seconds untuk 1000 records
- Smooth animations dan transitions

**Scalability:**
- Support hingga 10,000 records dengan acceptable performance
- Virtual scrolling untuk tables dengan 500+ rows

**Usability:**
- Intuitive filter interface
- Clear visual feedback untuk semua interactions
- Mobile-responsive design
- Accessible (WCAG 2.1 AA compliance)

---

## 2. Architecture

### 2.1 Component Structure

```
Tab Overview
├── Quick Actions (existing)
├── Feature Importance (existing)
├── Ringkasan CGO & Non-Cargo (existing)
└── 🆕 Entity Analytics Dashboard (NEW)
    ├── EntityFilterBar
    ├── EntitySummaryStats
    ├── EntityVisualizationGrid
    │   ├── TopAirlinesChart
    │   ├── RouteHeatmap
    │   ├── HubDistribution
    │   └── SeverityByEntity
    └── EntityDetailTable
```

### 2.2 Data Flow

```
batchResults (from API)
    ↓
processEntityData() - Extract & aggregate entities
    ↓
entityStats (state) - Computed statistics
    ↓
[User applies filters]
    ↓
filterEntities() - Client-side filtering
    ↓
filteredStats (state) - Filtered results
    ↓
Update all visualizations instantly
```

### 2.3 Technology Stack

- **Frontend:** React 18+ dengan TypeScript
- **State Management:** React hooks (useState, useMemo, useCallback)
- **Visualization:** Custom components dengan Tailwind CSS
- **Charts:** CSS-based charts (no external charting library needed)
- **Performance:** Memoization + Debouncing

---

## 3. Component Specifications

### 3.1 EntityFilterBar

**Purpose:** Multi-select filter interface untuk cross-entity analysis

**Features:**
- Multi-select dropdown dengan search functionality
- Filter categories: Airlines, Routes, Hubs/Branches, Flight Numbers, Severity
- Chips display untuk selected filters
- Counter menunjukkan jumlah laporan yang terfilter
- "Clear All" button untuk reset cepat
- Visual indicator (badge) ketika filter aktif

**Behavior:**
```typescript
interface FilterState {
  airlines: string[];
  routes: string[];
  hubs: string[];
  severities: ('Critical' | 'High' | 'Medium' | 'Low')[];
  dateRange: { start: Date; end: Date } | null;
}
```

**Penjelasan (Bahasa Indonesia):**
> Bilah filter ini memungkinkan analyst untuk memilih kombinasi entity yang spesifik untuk dianalisis. Analyst dapat memilih satu atau beberapa maskapai, rute tertentu, lokasi hub, nomor penerbangan, dan tingkat keparahan secara bersamaan. Hasil filter akan langsung diterapkan ke semua visualisasi di dashboard secara real-time.

**Use Case Example:**
> "Tampilkan semua laporan Critical dari maskapai Garuda di rute CGK-SUB"

---

### 3.2 EntitySummaryStats

**Purpose:** Display key metrics dalam card format

**Metrics:**
1. **Total Unique Entities** - Jumlah entity unik (maskapai, rute, dll)
2. **Most Active Entity** - Entity dengan insiden terbanyak + count
3. **Cross-filtered Results** - Jumlah laporan yang match filter aktif
4. **Critical Issues** - Jumlah laporan Critical dari filtered results

**Visual Design:**
- 4 stat cards dalam grid layout
- Icon untuk setiap metric
- Color-coded berdasarkan context
- Trend indicator (optional)

**Penjelasan (Bahasa Indonesia):**
> Kartu statistik ini memberikan gambaran cepat tentang entity analytics. Analyst dapat langsung melihat berapa banyak entity unik dalam data, entity mana yang paling aktif, dan berapa banyak laporan yang sesuai dengan filter yang dipilih.

---

### 3.3 TopAirlinesChart

**Purpose:** Visualisasi maskapai dengan insiden terbanyak

**Visualization Type:** Horizontal Stacked Bar Chart

**Features:**
- Top 10 airlines by incident count
- Stacked bars by severity (Critical, High, Medium, Low)
- Color-coded: Red (Critical), Orange (High), Amber (Medium), Green (Low)
- Hover tooltip dengan detail breakdown
- Click untuk drill-down ke reports airline tersebut
- Responsive untuk mobile view

**Data Structure:**
```typescript
interface AirlineStats {
  name: string;
  count: number;
  severityBreakdown: {
    Critical: number;
    High: number;
    Medium: number;
    Low: number;
  };
  avgPredictionDays: number;
  lastIncident: Date;
}
```

**Penjelasan (Bahasa Indonesia):**
> Visualisasi ini menampilkan 10 maskapai dengan jumlah insiden terbanyak dalam bentuk horizontal bar chart. Setiap bar menunjukkan total laporan per maskapai dan di-breakdown berdasarkan tingkat keparahan (Critical, High, Medium, Low) dengan warna berbeda. Analyst dapat langsung melihat maskapai mana yang paling sering bermasalah dan proporsi severity-nya.

---

### 3.4 RouteHeatmap

**Purpose:** Visualisasi rute dengan tingkat insiden tertinggi

**Visualization Type:** Color-coded Grid/List

**Features:**
- Color gradient: Green (low) → Yellow (medium) → Red (high)
- Toggle view: Grid atau List
- Sort options:
  - Most incidents
  - Highest critical rate
  - Newest issues
- Click untuk filter semua laporan di rute tersebut
- Badge menunjukkan trend (↑ increasing, ↓ decreasing)

**Data Structure:**
```typescript
interface RouteStats {
  route: string; // e.g., "CGK-SUB"
  count: number;
  criticalRate: number; // percentage
  lastIncident: Date;
  primaryIssueType: string;
}
```

**Penjelasan (Bahasa Indonesia):**
> Heatmap ini memvisualisasikan rute-rute penerbangan dengan tingkat insiden tertinggi. Intensitas warna menunjukkan jumlah laporan - semakin merah berarti semakin banyak masalah di rute tersebut. Analyst dapat dengan cepat mengidentifikasi "hot routes" yang memerlukan perhatian khusus.

---

### 3.5 HubDistribution

**Purpose:** Visualisasi distribusi insiden per lokasi hub

**Visualization Type:** Interactive Pie Chart atau Treemap

**Features:**
- Interactive pie chart dengan hover effects
- Label percentage dan absolute count
- Color intensity berdasarkan average severity
- Legend dengan click-to-filter
- Summary stats per hub di sidebar

**Data Structure:**
```typescript
interface HubStats {
  name: string; // e.g., "HUB 1"
  count: number;
  percentage: number;
  severityBreakdown: Record<string, number>;
  topIssueCategory: string;
}
```

**Penjelasan (Bahasa Indonesia):**
> Visualisasi ini menampilkan distribusi insiden berdasarkan lokasi hub atau branch. Dengan pie chart atau treemap, analyst dapat melihat proporsi masalah di setiap hub. Ukuran slice menunjukkan jumlah laporan, sedangkan warna menunjukkan tingkat severity rata-rata. Klik pada slice untuk memfilter semua laporan dari hub tersebut.

---

### 3.6 SeverityByEntity

**Purpose:** Membandingkan distribusi severity across entities

**Visualization Type:** Grouped Stacked Bar Chart

**Features:**
- Grouped stacked bar chart
- Toggle view: by Airline, by Hub, atau by Route
- View modes:
  - Percentage view
  - Absolute count view
- Benchmark line (average severity distribution)
- Export data as CSV

**Penjelasan (Bahasa Indonesia):**
> Stacked bar chart ini membandingkan distribusi severity across different entity types. Analyst dapat melihat pola seperti "Maskapai A cenderung memiliki masalah Critical, sementara Maskapai B lebih banyak masalah Low". Visualisasi ini membantu dalam resource allocation dan prioritas penanganan.

---

### 3.7 EntityDetailTable

**Purpose:** Detailed table untuk drill-down analysis

**Features:**
- Sortable columns
- Pagination untuk large datasets
- Click row untuk melihat detail reports
- Export selected rows ke CSV
- Filter by entity type

**Columns:**
- Entity Name
- Entity Type (Airline/Route/Hub)
- Total Incidents
- Severity Breakdown (C/H/M/L)
- Average Prediction Days
- Last Incident Date
- Actions (View Reports, Export)

---

## 4. Technical Implementation

### 4.1 Core Functions

#### processEntityData()

```typescript
/**
 * Extract dan aggregate entities dari batch analysis results
 * Dipanggil sekali saat batchResults tersedia
 */
function processEntityData(results: BatchAnalysisResult): EntityStats {
  const airlines = new Map<string, AirlineStats>();
  const routes = new Map<string, RouteStats>();
  const hubs = new Map<string, HubStats>();
  const flightNumbers = new Map<string, FlightStats>();

  results.results.forEach(result => {
    // Extract entities from result
    const airline = result.originalData.airline;
    const route = result.originalData.route;
    const hub = result.originalData.hub;
    const severity = result.classification?.severity;

    // Aggregate statistics
    // Implementation details...
  });

  return {
    airlines,
    routes,
    hubs,
    flightNumbers,
    summary: {
      totalEntities: airlines.size + routes.size + hubs.size,
      totalReports: results.results.length,
      criticalCount: /* count */,
      avgPredictionDays: /* calculate */
    }
  };
}
```

#### filterEntities()

```typescript
/**
 * Filter entities berdasarkan kombinasi kriteria
 * Real-time filtering tanpa API calls
 */
function filterEntities(
  entityStats: EntityStats,
  filters: FilterState
): EntityStats {
  let filteredResults = entityStats.allReports;

  // Apply each filter
  if (filters.airlines.length > 0) {
    filteredResults = filteredResults.filter(r =>
      filters.airlines.includes(r.originalData.airline)
    );
  }

  if (filters.routes.length > 0) {
    filteredResults = filteredResults.filter(r =>
      filters.routes.includes(r.originalData.route)
    );
  }

  // ... more filters

  // Re-aggregate statistics for filtered data
  return recomputeStats(filteredResults);
}
```

### 4.2 State Management

```typescript
// Main component state
const [entityStats, setEntityStats] = useState<EntityStats | null>(null);
const [filteredStats, setFilteredStats] = useState<EntityStats | null>(null);
const [activeFilters, setActiveFilters] = useState<FilterState>({
  airlines: [],
  routes: [],
  hubs: [],
  severities: [],
  dateRange: null
});
const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(null);

// Process data when batchResults changes
useEffect(() => {
  if (batchResults) {
    const stats = processEntityData(batchResults);
    setEntityStats(stats);
    setFilteredStats(stats); // Initially, no filters applied
  }
}, [batchResults]);

// Re-filter when activeFilters changes
useEffect(() => {
  if (entityStats) {
    const filtered = filterEntities(entityStats, activeFilters);
    setFilteredStats(filtered);
  }
}, [entityStats, activeFilters]);
```

### 4.3 Performance Optimizations

#### Memoization

```typescript
// Cache processed data
const processedStats = useMemo(
  () => processEntityData(batchResults),
  [batchResults]
);

// Cache filtered results
const filteredResults = useMemo(
  () => filterEntities(processedStats, activeFilters),
  [processedStats, activeFilters]
);

// Memoize expensive computations
const topAirlines = useMemo(
  () => getTopEntities(filteredResults.airlines, 10),
  [filteredResults]
);
```

#### Debounced Filtering

```typescript
// Debounce filter changes untuk smooth UX
import { useDebouncedCallback } from 'use-debounce';

const debouncedSetFilter = useDebouncedCallback(
  (filterType: string, value: any) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  },
  300 // 300ms delay
);
```

#### Virtual Scrolling (for large datasets)

```typescript
// Use react-window atau similar library untuk tables
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={filteredResults.length}
  itemSize={50}
>
  {({ index, style }) => (
    <EntityRow entity={filteredResults[index]} style={style} />
  )}
</FixedSizeList>
```

---

## 5. Type Definitions

```typescript
interface EntityStats {
  airlines: Map<string, AirlineStats>;
  routes: Map<string, RouteStats>;
  hubs: Map<string, HubStats>;
  flightNumbers: Map<string, FlightStats>;
  allReports: any[]; // Reference to original reports
  summary: {
    totalEntities: number;
    totalReports: number;
    criticalCount: number;
    avgPredictionDays: number;
  };
}

interface AirlineStats {
  name: string;
  count: number;
  severityBreakdown: {
    Critical: number;
    High: number;
    Medium: number;
    Low: number;
  };
  topRoutes: string[];
  avgPredictionDays: number;
  lastIncident: Date;
  reports: any[];
}

interface RouteStats {
  route: string;
  from: string;
  to: string;
  count: number;
  criticalRate: number;
  primaryIssueType: string;
  lastIncident: Date;
  reports: any[];
}

interface HubStats {
  name: string;
  count: number;
  percentage: number;
  severityBreakdown: Record<string, number>;
  topIssueCategory: string;
  topAirlines: string[];
  reports: any[];
}

interface FilterState {
  airlines: string[];
  routes: string[];
  hubs: string[];
  severities: ('Critical' | 'High' | 'Medium' | 'Low')[];
  dateRange: { start: Date; end: Date } | null;
}

interface SelectedEntity {
  type: 'airline' | 'route' | 'hub' | 'flight';
  name: string;
  stats: any;
}
```

---

## 6. Error Handling

### 6.1 Loading States

```typescript
// Loading state saat memproses entity data
{!entityStats && batchResults && (
  <div className="flex items-center gap-2 text-gray-500">
    <Loader2 className="animate-spin" size={20} />
    <span>Memproses data entity...</span>
  </div>
)}
```

### 6.2 Empty States

```typescript
// Ketika tidak ada data yang match filter
{filteredStats.summary.totalReports === 0 && (
  <div className="text-center py-12">
    <Search size={48} className="mx-auto mb-4 opacity-50" />
    <p className="text-gray-600 font-medium">
      Tidak ada laporan yang sesuai dengan filter
    </p>
    <p className="text-sm text-gray-500 mt-2">
      Coba ubah kombinasi filter atau reset semua filter
    </p>
    <Button onClick={clearFilters} className="mt-4">
      Reset Filter
    </Button>
  </div>
)}
```

### 6.3 Error Boundaries

```typescript
// Wrap Entity Analytics dalam Error Boundary
<EntityAnalyticsErrorBoundary>
  <EntityAnalyticsDashboard batchResults={batchResults} />
</EntityAnalyticsErrorBoundary>

// Error Boundary component
class EntityAnalyticsErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Entity Analytics Error:', error, errorInfo);
    // Log to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center py-12">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
          <p className="text-gray-700 font-medium">
            Terjadi kesalahan saat memuat Entity Analytics
          </p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Muat Ulang
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 6.4 Data Validation

```typescript
// Validate batchResults structure
function validateBatchResults(data: any): data is BatchAnalysisResult {
  return (
    data &&
    typeof data === 'object' &&
    Array.isArray(data.results) &&
    data.metadata &&
    typeof data.metadata.totalRecords === 'number'
  );
}

// Safe entity extraction
function safeExtractEntity(result: any, field: string): string {
  const value = result?.originalData?.[field];
  return value && typeof value === 'string' ? value : 'Unknown';
}
```

---

## 7. Edge Cases

### 7.1 Duplicate Entities

**Problem:** Satu laporan bisa memiliki entity yang sama multiple times

**Solution:**
```typescript
// Deduplication saat aggregation
const uniqueAirlines = new Set<string>();
results.forEach(result => {
  const airline = result.originalData.airline;
  if (airline && !uniqueAirlines.has(airline)) {
    uniqueAirlines.add(airline);
    // Process only once per unique airline
  }
});
```

**Penjelasan:** Sistem akan memastikan setiap entity hanya dihitung sekali per laporan.

### 7.2 Null/Undefined Values

**Problem:** Beberapa field mungkin kosong

**Solution:**
```typescript
// Filter out null values dan tampilkan sebagai "Unknown"
const airline = result.originalData.airline || 'Unknown Airline';
const route = result.originalData.route || 'Unknown Route';
const hub = result.originalData.hub || 'Unknown Hub';
```

**Penjelasan:** Laporan tanpa informasi entity akan dikategorikan sebagai "Unknown".

### 7.3 Large Dataset Performance

**Problem:** Jika data grow > 5000 records

**Solution:**
- Implement virtual scrolling untuk tables
- Limit visualization to top N entities (50 by default)
- Add "Load More" functionality
- Consider pagination untuk very large datasets

**Penjelasan:** Hanya tampilkan 50 entities teratas di charts, dengan opsi "Load More".

### 7.4 Special Characters

**Problem:** Nama entity dengan karakter spesial

**Solution:**
```typescript
// Sanitize entity names untuk display
function sanitizeEntityName(name: string): string {
  return name
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 100); // Limit length
}
```

**Penjelasan:** Nama entity akan ditampilkan dengan benar tanpa formatting issues.

---

## 8. Testing Strategy

### 8.1 Unit Tests

```typescript
describe('Entity Processing', () => {
  it('should extract airlines correctly', () => {
    const mockData = createMockBatchResults();
    const stats = processEntityData(mockData);
    expect(stats.airlines.size).toBeGreaterThan(0);
  });

  it('should handle empty results', () => {
    const stats = processEntityData({ results: [], metadata: {} });
    expect(stats.summary.totalReports).toBe(0);
  });

  it('should filter by multiple entities', () => {
    const stats = processEntityData(mockData);
    const filtered = filterEntities(stats, {
      airlines: ['Garuda'],
      severities: ['Critical']
    });
    expect(filtered.summary.criticalCount).toBeGreaterThan(0);
  });

  it('should deduplicate entities', () => {
    const stats = processEntityData(mockDataWithDuplicates);
    const airlineStats = stats.airlines.get('Garuda');
    expect(airlineStats.count).toBe(5); // Not 10
  });

  it('should handle null values gracefully', () => {
    const stats = processEntityData(mockDataWithNulls);
    expect(stats.airlines.has('Unknown')).toBe(true);
  });
});
```

### 8.2 Integration Tests

- Test filtering performance dengan 1000+ records
- Test cross-browser compatibility (Chrome, Firefox, Safari)
- Test responsive design di mobile devices
- Test filter combinations (all possible permutations)
- Test drill-down functionality
- Test export functionality

### 8.3 Performance Tests

```typescript
describe('Performance', () => {
  it('should process 1000 records in under 2 seconds', () => {
    const largeDataset = generateMockData(1000);
    const start = performance.now();
    const stats = processEntityData(largeDataset);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(2000);
  });

  it('should filter results in under 100ms', () => {
    const stats = processEntityData(largeDataset);
    const start = performance.now();
    const filtered = filterEntities(stats, complexFilters);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });
});
```

### 8.4 User Acceptance Testing Scenarios

- ✅ Analyst dapat melihat top 10 maskapai dengan insiden terbanyak
- ✅ Analyst dapat filter by maskapai + rute + severity secara bersamaan
- ✅ Visualisasi update secara instant saat filter diubah (< 100ms)
- ✅ Drill-down ke detail laporan dengan klik pada entity
- ✅ Export filtered data ke CSV
- ✅ Dashboard perform well dengan 1000+ records
- ✅ Semua text dalam Bahasa Indonesia dan mudah dipahami
- ✅ Mobile responsive untuk akses on-the-go

---

## 9. Monitoring & Analytics

### 9.1 Usage Tracking

```typescript
// Track filter usage untuk optimization
const trackFilterUsage = (filterType: string, value: string) => {
  analytics.track('entity_filter_applied', {
    type: filterType,
    value: value,
    totalFiltersActive: Object.values(activeFilters).flat().length,
    timestamp: new Date()
  });
};

// Track visualization interactions
const trackVisualizationClick = (vizType: string, entity: string) => {
  analytics.track('entity_visualization_clicked', {
    visualization: vizType,
    entity: entity,
    filtersActive: activeFilters,
    timestamp: new Date()
  });
};

// Track performance metrics
const trackPerformance = (operation: string, duration: number) => {
  analytics.track('entity_analytics_performance', {
    operation: operation,
    duration_ms: duration,
    recordCount: entityStats?.summary.totalReports || 0,
    timestamp: new Date()
  });
};
```

### 9.2 Success Metrics

**Usage Metrics:**
- Daily active users of Entity Analytics
- Average number of filters applied per session
- Most frequently used filter combinations
- Drill-down rate dari visualizations

**Performance Metrics:**
- Average filtering response time
- Initial load time
- Error rate

**Business Metrics:**
- Reduction in time-to-insight untuk analysts
- Increase in reports analyzed per day
- User satisfaction score (via feedback)

---

## 10. Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
- [ ] Create type definitions
- [ ] Implement `processEntityData()` function
- [ ] Implement `filterEntities()` function
- [ ] Set up state management
- [ ] Create basic UI components (Card, Badge, etc.)

### Phase 2: Filter & Summary (Week 1-2)
- [ ] Implement EntityFilterBar component
- [ ] Implement EntitySummaryStats component
- [ ] Add filter state management
- [ ] Test filtering performance

### Phase 3: Visualizations (Week 2-3)
- [ ] Implement TopAirlinesChart
- [ ] Implement RouteHeatmap
- [ ] Implement HubDistribution
- [ ] Implement SeverityByEntity
- [ ] Add interactivity (click to filter)

### Phase 4: Detail Table & Polish (Week 3)
- [ ] Implement EntityDetailTable
- [ ] Add export functionality
- [ ] Implement loading states
- [ ] Implement error handling
- [ ] Add all Bahasa Indonesia explanations

### Phase 5: Testing & Optimization (Week 4)
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Performance optimization
- [ ] Mobile responsive testing
- [ ] User acceptance testing

---

## 11. Future Enhancements

**Potential Phase 2 Features:**
- Trend analysis over time (time-series charts)
- Comparison mode (compare 2+ entities side-by-side)
- Save filter presets
- Advanced export options (PDF reports, scheduled exports)
- Machine learning insights (predict emerging issues)
- Integration dengan external data sources (weather, flight schedules)

**Scalability Improvements (if data grows > 10,000 records):**
- Move aggregation to backend with caching
- Implement server-side filtering
- Add pagination untuk all views
- Consider WebSocket untuk real-time updates

---

## 12. Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Performance degradation dengan large datasets | High | Medium | Virtual scrolling, lazy loading, limit visualization data |
| Complex filter combinations confuse users | Medium | Low | Clear UI, tooltips, example use cases |
| Browser compatibility issues | Medium | Low | Cross-browser testing, progressive enhancement |
| Data quality issues (nulls, duplicates) | Medium | Medium | Robust data validation, graceful degradation |

---

## 13. Approval

**Design Approved By:**
- [ ] Product Owner
- [ ] Tech Lead
- [ ] UX Designer
- [ ] User Representative

**Approval Date:** _______________

**Next Steps:**
1. Create implementation plan menggunakan writing-plans skill
2. Set up development branch
3. Begin Phase 1 implementation

---

## Appendix A: Mock Data Examples

```json
{
  "entityStats": {
    "airlines": {
      "Garuda Indonesia": {
        "name": "Garuda Indonesia",
        "count": 45,
        "severityBreakdown": {
          "Critical": 5,
          "High": 12,
          "Medium": 18,
          "Low": 10
        },
        "avgPredictionDays": 1.2,
        "topRoutes": ["CGK-SUB", "CGK-DPS", "CGK-SIN"]
      }
    },
    "routes": {
      "CGK-SUB": {
        "route": "CGK-SUB",
        "count": 32,
        "criticalRate": 15.6,
        "primaryIssueType": "GSE"
      }
    }
  }
}
```

## Appendix B: UI Wireframe References

*[Wireframes would be included here in a real design doc]*

## Appendix C: Bahasa Indonesia Glossary

| English Term | Bahasa Indonesia | Context |
|--------------|------------------|---------|
| Entity | Entitas | Maskapai, rute, hub, nomor penerbangan |
| Filter | Filter | Penyaringan data |
| Severity | Tingkat Keparahan | Critical, High, Medium, Low |
| Drill-down | Drill-down | Melihat detail lebih dalam |
| Cross-entity | Lintas-entitas | Analisis kombinasi multiple entities |
| Heatmap | Peta Panas | Visualisasi intensitas |
| Breakdown | Rincian | Pembagian detail per kategori |

---

**Document Version:** 1.0
**Last Updated:** March 2, 2026
**Maintained By:** Development Team
