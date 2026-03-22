# Gapura Operations Dashboard - Technical Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Architecture Overview](#architecture-overview)
5. [Authentication and Authorization](#authentication-and-authorization)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Key Features and Functionality](#key-features-and-functionality)
9. [Data Processing and Algorithms](#data-processing-and-algorithms)
10. [Frontend Components](#frontend-components)
11. [Integration with External Services](#integration-with-external-services)
12. [Security Considerations](#security-considerations)
13. [Performance Optimization](#performance-optimization)
14. [Deployment and Configuration](#deployment-and-configuration)

---

## Project Overview

Gapura Operations Dashboard is a comprehensive web-based operational reporting and monitoring system designed specifically for Gapura Angkasa, an aviation ground handling company. The system facilitates the reporting, tracking, and analysis of operational irregularities and incidents that occur within airport operations, including ground support equipment (GSE) handling, flight-related incidents, and passenger service issues.

The primary purpose of this application is to create a centralized platform where employees can report operational issues, supervisors can review and triage these reports, and management can analyze trends, identify root causes, and make data-driven decisions to improve operational efficiency and safety.

The system integrates with Google Sheets as a primary data storage mechanism for reports, enabling seamless data entry from multiple sources while leveraging Supabase for user authentication, session management, and structured data storage. Advanced analytics capabilities are provided through AI-powered features that assist with root cause analysis, risk assessment, and trend identification.

---

## Technology Stack

### Frontend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.6 | React framework with App Router |
| React | 19.2.1 | User interface library |
| TypeScript | 5.x | Type-safe JavaScript |
| Tailwind CSS | 3.4.17 | Utility-first CSS framework |
| Chart.js | 4.5.1 | Charting library |
| Recharts | 3.5.1 | React-native charting library |
| Framer Motion | 12.23.26 | Animation library |
| Lucide React | 0.560.0 | Icon library |

### Backend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js API Routes | 16.x | Serverless API endpoints |
| Supabase | 2.87.1 | PostgreSQL database and auth |
| Google Sheets API | v4 | Spreadsheet data storage |
| GROQ SDK | 0.37.0 | AI query language |
| OpenAI | 6.21.0 | AI model integration |

### Development Tools

| Technology | Purpose |
|------------|---------|
| ESLint | Code linting |
| PostCSS | CSS processing |
| Babel | JavaScript compilation |
| Vercel | Deployment platform |

---

## Project Structure

```
gapura-irrs/
├── app/                          # Next.js App Router pages
│   ├── api/                      # API routes
│   │   ├── admin/               # Admin management endpoints
│   │   ├── ai/                  # AI analysis endpoints
│   │   ├── auth/                # Authentication endpoints
│   │   ├── dashboards/          # Dashboard data endpoints
│   │   ├── debug/               # Debug utilities
│   │   ├── embed/               # Embeddable chart endpoints
│   │   ├── investigative-ai/    # AI investigation endpoints
│   │   ├── master-data/         # Master data endpoints
│   │   └── reports/             # Report CRUD endpoints
│   ├── auth/                    # Authentication pages
│   │   ├── login/               # Login page
│   │   └── register/            # Registration page
│   ├── dashboard/               # Protected dashboard pages
│   │   ├── (main)/             # Main dashboard layouts
│   │   │   ├── admin/          # Admin dashboard
│   │   │   ├── analyst/        # Analyst dashboard
│   │   │   ├── employee/       # Employee dashboard
│   │   │   ├── os/             # Operations Support division
│   │   │   ├── ot/             # Terminal Operations division
│   │   │   ├── op/             # Operations division
│   │   │   ├── uq/             # Quality division
│   │   │   ├── hc/             # Human Capital division
│   │   │   └── ht/             # Heavy Equipment division
│   │   └── charts/             # Chart detail pages
│   ├── embed/                   # Embeddable chart pages
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Home page
├── components/                   # React components
│   ├── ai/                     # AI-related components
│   ├── builder/                # Dashboard builder components
│   ├── charts/                 # Chart components
│   │   ├── airline-report/     # Airline-specific charts
│   │   ├── area-report/       # Area-specific charts
│   │   ├── branch-report/      # Branch-specific charts
│   │   ├── case-category-by-*/# Category breakdown charts
│   │   ├── monthly-report/     # Monthly trend charts
│   │   ├── pivot-report/       # Pivot table charts
│   │   └── root-cause/         # Root cause charts
│   ├── dashboard/              # Dashboard-specific components
│   ├── embed/                  # Embed components
│   ├── filters/                # Filter components
│   ├── layout/                 # Layout components
│   ├── security/               # Security components
│   ├── tables/                 # Table components
│   └── ui/                     # Reusable UI components
├── lib/                        # Utility libraries
│   ├── ai/                     # AI service utilities
│   ├── api/                    # API utilities
│   ├── builder/                # Dashboard builder utilities
│   ├── charts/                 # Chart utilities
│   ├── constants/              # Application constants
│   ├── debug/                  # Debug utilities
│   ├── engine/                 # Core engine utilities
│   ├── hooks/                  # Custom React hooks
│   ├── security/               # Security utilities
│   ├── services/               # Business logic services
│   │   ├── client-reports-service.ts
│   │   ├── gapura-ai.ts
│   │   ├── query-executor.ts
│   │   └── reports-service.ts
│   ├── validations/            # Validation utilities
│   ├── auth-utils.ts          # Authentication utilities
│   ├── google-sheets.ts       # Google Sheets integration
│   ├── notifications.ts       # Notification utilities
│   ├── permissions.ts         # Permission utilities
│   ├── supabase.ts            # Supabase client
│   ├── supabase-admin.ts      # Supabase admin client
│   ├── swr.ts                 # SWR configuration
│   └── utils.ts               # General utilities
├── hooks/                      # Custom React hooks
│   ├── useFilterOptions.ts     # Filter state management
│   ├── useReportsCache.ts     # Report caching
│   └── useViewport.ts          # Viewport detection
├── types/                      # TypeScript type definitions
│   ├── builder.ts              # Builder types
│   ├── chart.js.d.ts           # Chart.js types
│   ├── index.ts                # Core types
│   └── security.ts             # Security types
├── public/                     # Static assets
├── scripts/                    # Build and utility scripts
├── docs/                       # Documentation
├── data/                       # Static data files
├── diagram/                    # Architecture diagrams
├── middleware.ts               # Next.js middleware
├── next.config.ts              # Next.js configuration
├── tailwind.config.js          # Tailwind configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # NPM dependencies
```

---

## Architecture Overview

### System Architecture

The Gapura Operations Dashboard follows a modern three-tier architecture pattern with clear separation of concerns:

1. **Presentation Layer (Frontend)**: Built with Next.js 16 using the App Router pattern, React 19, and Tailwind CSS. The frontend handles user interface rendering, form submissions, data visualization, and client-side state management.

2. **Application Layer (API)**: Next.js API Routes serve as the backend-for-frontend (BFF) layer, handling business logic, data transformation, authentication, and authorization. This layer acts as an intermediary between the frontend and external services.

3. **Data Layer**: The system uses a hybrid data storage approach:
   - **Supabase (PostgreSQL)**: Stores user accounts, sessions, roles, permissions, and custom dashboard configurations
   - **Google Sheets**: Stores operational reports and irregularity data, enabling easy data entry and Excel-like manipulation

### Data Flow

```
User Interface
     │
     ▼
Next.js Frontend (React 19)
     │
     ▼
API Routes (Next.js)
     │
     ├──► Authentication (JWT + Supabase)
     │
     ├──► Business Logic (Services)
     │         │
     │         ▼
     │    Google Sheets API (Reports Data)
     │         │
     │         ▼
     │    Supabase (User/Session Data)
     │
     └──► External AI Services (GROQ/OpenAI)
```

### Key Architectural Patterns

1. **Server-Side Rendering (SSR)**: Next.js App Router provides SSR capabilities for initial page loads, improving performance and SEO
2. **API Routes**: Each API endpoint is a serverless function that handles specific business operations
3. **Service Layer**: Business logic is encapsulated in service files within `lib/services/`
4. **Hook Pattern**: Custom React hooks encapsulate reusable client-side logic
5. **Component Composition**: UI is built using composition of smaller, reusable components

---

## Authentication and Authorization

### Authentication System

The authentication system uses a custom JWT-based approach with the following characteristics:

**Session Management** (`lib/auth-utils.ts`):

- JWT tokens are signed using HS256 algorithm
- Session tokens have a 24-hour expiration time
- Sessions are tracked in the Supabase `security_sessions` table
- Each session has a unique ID (JTI) for revocation capabilities
- Session data includes: user ID, email, role, full name, division, and session ID

**Password Security** (`lib/auth-utils.ts`):

- Password hashing using bcryptjs with salt rounds of 10
- Password verification using bcrypt's timing-safe comparison

**Session Verification Flow**:

```typescript
// 1. Extract token from cookie
const token = cookieStore.get('session')?.value;

// 2. Verify JWT signature and expiration
const { payload } = await jwtVerify(token, key, {
    algorithms: ['HS256'],
});

// 3. Check session not revoked in database
const queryResult = await supabaseAdmin
    .from('security_sessions')
    .select('is_revoked')
    .eq('session_id', session.sid)
    .single();

// 4. Return session payload or null if invalid
```

### Authorization System

The system implements role-based access control (RBAC) with the following user roles:

| Role | Description | Dashboard Access |
|------|-------------|------------------|
| SUPER_ADMIN | Full system administration | /dashboard/admin |
| DIVISI_OS | Operations Support Division | /dashboard/os |
| PARTNER_OS | External Operations Support Partner | /dashboard/os |
| DIVISI_OT | Terminal Operations Division | /dashboard/ot |
| PARTNER_OT | External Terminal Operations Partner | /dashboard/ot |
| DIVISI_OP | Operations Division | /dashboard/op |
| PARTNER_OP | External Operations Partner | /dashboard/op |
| DIVISI_UQ | Quality Division | /dashboard/uq |
| PARTNER_UQ | External Quality Partner | /dashboard/uq |
| DIVISI_HC | Human Capital Division | /dashboard/hc |
| PARTNER_HC | External Human Capital Partner | /dashboard/hc |
| DIVISI_HT | Heavy Equipment Division | /dashboard/ht |
| PARTNER_HT | External Heavy Equipment Partner | /dashboard/ht |
| ANALYST | Data Analyst | /dashboard/analyst |
| CABANG | Branch Employee | /dashboard/employee |

### Middleware Protection

The `middleware.ts` file implements route-level security:

- Validates JWT tokens on every protected route request
- Redirects unauthorized users to login page
- Enforces role-based dashboard access
- Supports demo mode for public preview
- Handles multi-account session bundles

---

## Database Schema

### Core Tables

**users** - User accounts and profiles

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| email | TEXT | Unique email address |
| password | TEXT | Bcrypt hashed password |
| full_name | TEXT | User's full name |
| role | TEXT | User role (SUPER_ADMIN, DIVISI_*, etc.) |
| status | TEXT | Account status (pending, active, rejected) |
| nik | TEXT | Employee ID number |
| phone | TEXT | Phone number |
| station_id | UUID | Assigned station |
| unit_id | UUID | Assigned unit |
| position_id | UUID | Position/role within company |
| division | TEXT | Division code |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**security_sessions** - Active session tracking

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| session_id | TEXT | JWT session ID (JTI) |
| ip_address | TEXT | Client IP address |
| user_agent | TEXT | Client user agent |
| is_revoked | BOOLEAN | Revocation status |
| expires_at | TIMESTAMPTZ | Expiration timestamp |
| last_active | TIMESTAMPTZ | Last activity timestamp |

**custom_dashboards** - User-created dashboards

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Dashboard name |
| description | TEXT | Dashboard description |
| slug | TEXT | URL-friendly identifier |
| config | JSONB | Dashboard configuration |
| is_public | BOOLEAN | Public access flag |
| created_by | UUID | Creator user ID |
| created_at | TIMESTAMPTZ | Creation timestamp |

**dashboard_charts** - Individual charts within dashboards

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| dashboard_id | UUID | Foreign key to custom_dashboards |
| title | TEXT | Chart title |
| chart_type | TEXT | Type of chart |
| data_field | TEXT | Data source field |
| position | INTEGER | Display order |
| width | TEXT | Width (full, half, third) |
| config | JSONB | Chart configuration |
| query_config | JSONB | Query settings |
| visualization_config | JSONB | Visualization settings |
| page_name | TEXT | Page for multi-page dashboards |

**stations** - Airport stations/locations

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| code | TEXT | Station code |
| name | TEXT | Station name |

**units** - Organizational units

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | Unit name |
| description | TEXT | Unit description |

**positions** - Job positions

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Position name |
| level | INTEGER | Hierarchy level |

**incident_types** - Types of incidents/irregularities

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Incident type name |
| default_severity | TEXT | Default severity level |

**locations** - Specific locations within stations

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| station_id | UUID | Parent station |
| name | TEXT | Location name |
| area | TEXT | Area within station |

---

## API Endpoints

### Authentication Endpoints (`/api/auth/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user account |
| POST | `/api/auth/login` | Authenticate user and create session |
| POST | `/api/auth/logout` | Invalidate session |
| POST | `/api/auth/session` | Get current session info |
| POST | `/api/auth/me` | Get current user profile |
| POST | `/api/auth/switch` | Switch between accounts (multi-account) |
| POST | `/api/auth/bundle` | Manage account bundle |

### Reports Endpoints (`/api/reports/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports` | Get reports (filtered by role) |
| POST | `/api/reports` | Create new report |
| GET | `/api/reports/[id]` | Get specific report |
| PATCH | `/api/reports/[id]` | Update report |
| POST | `/api/reports/batch` | Batch operations |
| POST | `/api/reports/refresh` | Refresh from source |
| GET | `/api/reports/analytics` | Get report analytics |
| POST | `/api/reports/sync` | Sync with external sources |

### Admin Endpoints (`/api/admin/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | List all users |
| PATCH | `/api/admin/users` | Update user (status, role) |
| GET | `/api/admin/stats` | Get system statistics |
| GET | `/api/admin/reports` | Get all reports (admin view) |
| PATCH | `/api/admin/reports` | Update report status |
| GET | `/api/admin/cache-stats` | Get cache statistics |

### Dashboard Endpoints (`/api/dashboards/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboards` | List dashboards |
| GET | `/api/dashboards?slug=...` | Get specific dashboard |
| POST | `/api/dashboards` | Create dashboard |
| PATCH | `/api/dashboards` | Update dashboard |
| DELETE | `/api/dashboards` | Delete dashboard |
| GET | `/api/dashboards/query` | Execute data query |
| GET | `/api/dashboards/insights` | Get AI insights |
| GET | `/api/dashboards/filter-options` | Get filter options |

### AI Endpoints (`/api/ai/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/analyze` | Analyze a single report |
| POST | `/api/ai/analyze-all` | Analyze all reports |
| GET | `/api/ai/health` | AI service health check |
| POST | `/api/ai/similar` | Find similar reports |
| GET | `/api/ai/summarize` | Get report summary |
| POST | `/api/ai/train` | Train AI model |

### Root Cause Analysis Endpoints (`/api/ai/root-cause/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ai/root-cause/stats` | Get root cause statistics |
| GET | `/api/ai/root-cause/categories` | Get category breakdown |
| POST | `/api/ai/root-cause/classify` | Classify unclassified reports |

### Embed Endpoints (`/api/embed/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/embed/chart` | Get embeddable chart data |
| GET | `/api/embed/dashboard` | Get embeddable dashboard |

---

## Key Features and Functionality

### 1. Report Management System

The core feature of the application is the operational report management system. Reports represent irregularities, incidents, or operational issues that occur during airport operations.

**Report Fields** (from `types/index.ts`):

- **Identification**: id, user_id, created_at, updated_at
- **Basic Information**: title, description, location, area
- **Categorization**: category, main_category, incident_type_id, primary_tag, sub_category_note
- **Flight Information**: flight_number, aircraft_reg, is_flight_related
- **GSE Information**: gse_number, gse_name, is_gse_related
- **Severity & Priority**: severity, priority
- **Status Management**: status (OPEN, ON PROGRESS, CLOSED)
- **Investigation**: investigator_notes, manager_notes, partner_response_notes, validation_notes
- **Root Cause**: root_caused, root_cause, action_taken, immediate_action, preventive_action
- **Evidence**: evidence_url, evidence_urls, partner_evidence_urls
- **Triage**: target_division, primary_tag

**Report Status Flow**:

```
OPEN
  │
  ▼
ON PROGRESS
  │
  ▼
CLOSED
```

### 2. Dashboard System

The dashboard system provides role-specific views with various analytics and visualizations.

**Dashboard Types**:

- **Admin Dashboard** (`/dashboard/admin`): Full system overview, user management, all reports
- **Analyst Dashboard** (`/dashboard/analyst`): Advanced analytics, custom queries, AI insights
- **Division Dashboards**: Role-specific views for each division (OS, OT, OP, UQ, HC, HT)
- **Employee Dashboard** (`/dashboard/employee`): Personal reports, create new report

**Dashboard Features**:

- Analytics cards with key metrics
- Trend charts (daily, weekly, monthly)
- Status distribution charts
- Top locations/airlines/categories
- Recent activity feed
- Date range filtering
- Export capabilities

### 3. Custom Dashboard Builder

A drag-and-drop interface for creating custom dashboards (`components/builder/`):

- **DashboardComposer.tsx**: Main builder interface
- **ChartPreview.tsx**: Live chart preview
- **ChartConfigPanel.tsx**: Chart configuration
- **FilterBuilder.tsx**: Custom filter creation
- **FieldSidebar.tsx**: Available fields for queries
- **SaveDashboardModal.tsx**: Save/manage dashboards
- **ExecutivePivotView.tsx**: Pivot table view
- **CustomTable.tsx**: Data table with sorting/filtering

### 4. Chart System

Multiple chart types are supported:

| Chart Type | Component | Purpose |
|------------|-----------|---------|
| Bar Chart | `ResponsiveBarChart.tsx` | Category comparisons |
| Line Chart | `ResponsiveLineChart.tsx` | Trends over time |
| Pie Chart | `ResponsivePieChart.tsx` | Distribution |
| Heatmap | `HeatmapChart.tsx` | Correlation matrices |

**Chart Categories** (in `components/charts/`):

- Airline reports
- Area reports
- Branch reports
- Case categories
- Monthly trends
- Pivot tables
- Root cause analysis

### 5. AI-Powered Analytics

The system integrates AI for advanced analytics:

**Root Cause Analysis** (`lib/services/gapura-ai.ts`):

- Automatic classification of reports by root cause category
- Risk assessment by airline, branch, and hub
- Severity distribution analysis
- Trend identification
- Recommendations generation

**AI Service Endpoints**:

- `/api/ai/analyze`: Analyze single report
- `/api/ai/analyze-all`: Batch analysis
- `/api/ai/summarize`: Generate summary
- `/api/ai/root-cause/classify`: Classify by root cause

### 6. Report Creation

The report creation form (`app/dashboard/`) includes:

- Title and description
- Location selection (station, area, specific location)
- Incident type categorization
- Severity/priority selection
- Flight information (if flight-related)
- GSE information (if GSE-related)
- Photo evidence upload
- Date and time of incident
- Immediate action taken
- Supporting documentation

### 7. Export Capabilities

Multiple export formats are supported:

| Format | Library | Usage |
|--------|---------|-------|
| PDF | jspdf + jspdf-autotable | Printable reports |
| Excel | xlsx + xlsx-js-style | Data analysis |
| PowerPoint | pptxgenjs | Presentations |

### 8. Embeddable Charts

Public embeddable charts for integration:

- `/embed/charts/[id]`: Individual chart embed
- `/embed/dashboard/[slug]`: Full dashboard embed
- `/api/embed/*`: Embed data APIs
- Supports iframe embedding with public access

---

## Data Processing and Algorithms

### 1. Report Data Processing (`lib/services/reports-service.ts`)

The reports service implements complex data processing:

**Caching System**:

- TTL (Time-To-Live) cache with 5-minute default expiration
- LRU (Least Recently Used) eviction policy
- Maximum 100 entries
- Cache statistics tracking

```typescript
interface CacheEntry { data: unknown; ts: number }
const ttlCache = new Map<string, CacheEntry>();
const MAX_CACHE_ENTRIES = 100;
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes
```

**Date Parsing**:

- Handles Excel serial dates (numeric)
- Parses multiple date formats
- Robust error handling for invalid dates

**Data Mapping**:

- Flexible header name matching for Google Sheets columns
- Bidirectional mapping (read and write)
- Support for multiple possible header names per field

### 2. Data Aggregation Algorithms

The dashboard analytics use various aggregation methods:

**Grouping and Counting**:

```typescript
// Group by category
const byCategory = reports.reduce((acc, report) => {
    const cat = report.category || 'Unknown';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
}, {});
```

**Trend Calculation**:

- Daily, weekly, monthly aggregations
- Moving averages for smoothing
- Percentage change calculations

**Severity Distribution**:

- Cross-tabulation of severity vs. other dimensions
- Weighted scoring for risk assessment

### 3. Filtering and Query System

The dashboard builder supports complex queries:

**Query Configuration**:

- Field selection
- Aggregation functions (count, sum, avg, min, max)
- Grouping
- Filtering (equals, contains, greater than, etc.)
- Sorting
- Limit and offset

**Filter Types**:

- Date range filters
- Category filters
- Location filters
- Status filters
- Severity filters
- Custom field filters

### 4. AI Analysis Algorithms

The AI service uses various algorithms for analysis:

**Risk Scoring**:

```typescript
interface RiskCalculation {
    severity_multiplier: {
        urgent: 4,
        high: 3,
        medium: 2,
        low: 1
    };
    trend_factor: number;
    frequency_factor: number;
}
```

**Root Cause Classification**:

- Pattern matching against known categories
- Confidence scoring
- Similarity search for related reports

### 5. Session Management Algorithm

JWT-based session management with database verification:

**Token Structure**:

```typescript
interface SessionPayload {
    id: string;          // User ID
    email: string;       // User email
    role: string;        // User role
    full_name?: string; // Display name
    division?: string;  // Division code
    sid: string;        // Unique session ID
}
```

**Verification Process**:

1. Extract JWT from cookie
2. Verify signature using HS256
3. Check expiration
4. Query database for session validity
5. Update last_active timestamp

---

## Frontend Components

### Core Layout Components

**Sidebar.tsx** (`components/Sidebar.tsx`)

- Main navigation sidebar
- Role-based menu items
- Collapsible on mobile
- Active state highlighting

**MobileBottomNav.tsx** (`components/MobileBottomNav.tsx`)

- Mobile navigation bar
- Bottom tab layout
- Responsive design

**StatsCard.tsx** (`components/StatsCard.tsx`)

- Metric display card
- Title, value, trend indicator
- Color-coded by type

### Chart Components

All chart components are responsive and use consistent configuration patterns:

**ResponsiveBarChart.tsx**

- Horizontal and vertical bar charts
- Custom colors per bar
- Tooltips and legends
- Responsive sizing

**ResponsiveLineChart.tsx**

- Multi-series line charts
- Time series support
- Area fill options
- Point markers

**ResponsivePieChart.tsx**

- Donut and pie variants
- Percentage display
- Legend positioning

**HeatmapChart.tsx**

- Matrix visualization
- Color gradient mapping
- Cell tooltips

### Builder Components

**BuilderLayout.tsx**

- Full-screen builder interface
- Drag-and-drop canvas
- Property panels
- Toolbar

**DashboardComposer.tsx**

- Component palette
- Grid layout system
- Preview mode
- Save/load functionality

### UI Components

Common UI components in `components/ui/`:

- Button variants
- Input fields
- Select dropdowns
- Dialogs/modals
- Tables
- Cards
- Badges
- Tooltips

---

## Integration with External Services

### Google Sheets Integration

The system integrates with Google Sheets for report data storage:

**Authentication** (`lib/google-sheets.ts`):

- Service account authentication
- JWT-based OAuth
- Singleton pattern for connection pooling

**Operations**:

- Read data from specified sheets
- Write new reports
- Update existing records
- Batch operations

**Configuration**:

```typescript
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const REPORT_SHEETS = ['NON CARGO', 'CGO'];
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
```

### Supabase Integration

**Client Setup** (`lib/supabase.ts`):

- Public client for authenticated requests
- Environment-based configuration
- Row Level Security (RLS) policies

**Admin Client** (`lib/supabase-admin.ts`):

- Service role for privileged operations
- Bypasses RLS
- Used for system operations

### AI Services Integration

**GROQ SDK** (`lib/services/gapura-ai.ts`):

- Custom AI service communication
- Timeout handling
- Error recovery

**OpenAI Integration**:

- GPT model for text analysis
- Prompt engineering for analysis tasks
- Token management

---

## Security Considerations

### Authentication Security

- **Password Hashing**: bcrypt with 10 salt rounds
- **JWT Algorithm**: HS256 (symmetric)
- **Token Expiration**: 24 hours
- **Session Tracking**: Database-backed sessions with revocation support

### Authorization Security

- **Role-Based Access**: Strict role checking in middleware
- **Route Protection**: All dashboard routes protected
- **API Authorization**: Every API endpoint validates session

### Data Security

- **Environment Variables**: Secrets stored in `.env` files
- **HTTP-Only Cookies**: Session tokens not accessible to JavaScript
- **Server-Side Only**: Sensitive operations use `server-only` imports

### Security Headers

Implemented via Next.js configuration:

- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy

---

## Performance Optimization

### Caching Strategy

**Server-Side Cache**:

- In-memory TTL cache for frequently accessed data
- 5-minute cache duration
- LRU eviction for memory management

**Client-Side Cache**:

- SWR (Stale-While-Revalidate) for data fetching
- Automatic revalidation
- Optimistic UI updates

### Query Optimization

- Selective field fetching
- Pagination for large datasets
- Lazy loading for heavy components
- Code splitting per route

### Rendering Optimization

- Server Components by default (Next.js 14+)
- Client Components only where needed
- Static generation for public pages
- ISR (Incremental Static Regeneration) where appropriate

---

## Deployment and Configuration

### Environment Variables

Required environment variables (`.env`):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# JWT
JWT_SECRET=your_random_secret_key

# Google Sheets
GOOGLE_SERVICE_ACCOUNT_EMAIL=service@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=your_private_key
GOOGLE_SHEET_ID=your_spreadsheet_id

# AI Services
NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:8000
GROQ_API_KEY=your_groq_key
OPENAI_API_KEY=your_openai_key

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
DEMO_MODE=false
```

### Build and Deployment

**Development**:

```bash
npm run dev
# Starts on http://localhost:3000
```

**Production Build**:

```bash
npm run build
npm start
```

**Deployment Platforms**:

- Vercel (recommended)
- Docker containers
- Any Node.js hosting

### Node.js Requirements

- Node.js >= 20.9.0 and < 25
- Recommended: Node.js 22 LTS
- NPM >= 10

---

## Custom React Hooks

The project utilizes several custom React hooks for state management and reusable logic:

### useReportsCache.ts (`hooks/useReportsCache.ts`)

This hook manages caching for reports data to reduce unnecessary API calls and improve performance. It implements a client-side cache with SWR (Stale-While-Revalidate) pattern for optimal user experience.

**Functionality**:
- Stores fetched reports in local state
- Provides refresh functionality for manual data updates
- Handles loading and error states
- Returns typed data structures

```typescript
// Usage example
const { reports, isLoading, error, refresh } = useReportsCache();
```

### useFilterOptions.ts (`hooks/useFilterOptions.ts`)

This hook manages the filter state for dashboard queries and analytics. It provides a centralized way to handle date ranges, categories, and other filter criteria.

**Functionality**:
- Maintains filter state object
- Provides update methods for each filter type
- Supports URL query parameter synchronization
- Enables filter preset management

### useViewport.ts (`hooks/useViewport.ts`)

This hook detects the viewport size for responsive behavior, enabling the application to adapt its UI based on screen dimensions.

**Functionality**:
- Detects current viewport width and height
- Provides breakpoints for common device sizes
- Supports custom breakpoint configurations
- Returns boolean flags for each size category

---

## Utility Libraries

### auth-utils.ts (`lib/auth-utils.ts`)

This file contains the core authentication utilities used throughout the application:

**Key Functions**:

- `hashPassword(password: string)`: Generates bcrypt hash with salt rounds of 10
- `verifyPassword(password: string, hash: string)`: Compares password against hash
- `signSession(payload: SessionPayload)`: Creates JWT token with 24-hour expiration
- `verifySession(token: string)`: Validates JWT and checks session in database
- `registerSession(userId: string, sid: string, ip: string, ua: string)`: Creates session record

**Session Structure**:

The session payload includes all necessary user information for authorization decisions:

```typescript
interface SessionPayload {
    id: string;          // User ID from database
    email: string;       // User email address
    role: string;       // User role (SUPER_ADMIN, DIVISI_OS, etc.)
    full_name?: string;  // Display name for UI
    division?: string;   // Division code
    sid: string;        // Unique session identifier for revocation
}
```

### google-sheets.ts (`lib/google-sheets.ts`)

This module provides the Google Sheets API integration:

**Implementation Details**:

- Uses singleton pattern to prevent multiple auth client instances
- Service account authentication with JWT
- Exports configured sheets client for API operations
- Handles credential validation on initialization

**Singleton Pattern**:

The module maintains a single auth client instance to prevent memory leaks:

```typescript
let authClient: any = null;

export function getGoogleAuth() {
  if (authClient) return authClient;
  // Create new client only if none exists
  authClient = new google.auth.JWT({...});
  return authClient;
}
```

### utils.ts (`lib/utils.ts`)

General utility functions for common operations:

- Date formatting and parsing
- String manipulation
- Object validation
- Array transformations

---

## Constants and Configuration

### Report Status Constants (`lib/constants/report-status.ts`)

Defines the complete set of possible report statuses:

```typescript
export const REPORT_STATUS = {
    OPEN: 'OPEN',
    'ON PROGRESS': 'ON PROGRESS',
    CLOSED: 'CLOSED'
} as const;
```

### Report Severity Levels

Defines severity classifications for reports:

```typescript
export type ReportSeverity = 'low' | 'medium' | 'high' | 'urgent';

export const SEVERITY_LEVELS = {
    urgent: { weight: 4, color: '#dc2626' },
    high: { weight: 3, color: '#ea580c' },
    medium: { weight: 2, color: '#ca8a04' },
    low: { weight: 1, color: '#16a34a' }
};
```

---

## File Naming Conventions

The project follows consistent naming conventions:

| Pattern | Example | Usage |
|---------|---------|-------|
| PascalCase | `Sidebar.tsx` | Components, types |
| camelCase | `useReportsCache.ts` | Hooks, utilities |
| kebab-case | `chart-config.ts` | Config files |
| SCREAMING_SNAKE_CASE | `REPORT_STATUS` | Constants |

---

## Page Structure

### Authentication Pages

**Login Page** (`app/auth/login/page.tsx`)

The login page provides user authentication with the following features:

- Email and password input fields
- "Remember me" functionality
- Error message display
- Loading state during authentication
- Redirect to appropriate dashboard after login

**Registration Page** (`app/auth/register/page.tsx`)

New user registration with approval workflow:

- User information form (name, email, password)
- Role selection (for certain user types)
- Admin approval required before account activation
- Status tracking (pending, active, rejected)

### Dashboard Pages

**Admin Dashboard** (`app/dashboard/(main)/admin/page.tsx`)

Comprehensive administrative interface:

- System-wide statistics cards
- User management section
- All reports view with filtering
- User approval/rejection controls
- Role management

**Analyst Dashboard** (`app/dashboard/(main)/analyst/page.tsx`)

Advanced analytics for data analysts:

- Custom query builder
- AI-powered insights panel
- Executive pivot views
- Export tools
- Custom chart creation

**Division Dashboards** (`app/dashboard/(main)/[division]/page.tsx`)

Role-specific views for each operational division:

- Division-specific metrics
- Reports assigned to division
- Performance indicators
- Quick actions

**Employee Dashboard** (`app/dashboard/(main)/employee/page.tsx`)

Personal workspace for regular employees:

- My reports list
- New report creation form
- Report status tracking
- Personal statistics

### Chart Detail Pages

**Chart Detail** (`app/dashboard/charts/[id]/page.tsx`)

Detailed view for individual charts:

- Full-size chart visualization
- Filter controls
- Data table view
- Export options
- Related charts

---

## API Route Handler Patterns

### Standard GET Handler Pattern

```typescript
export async function GET(request: NextRequest) {
    try {
        // 1. Extract and validate session
        const cookieStore = await cookies();
        const token = cookieStore.get('session')?.value;
        
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Verify session
        const payload = await verifySession(token);
        if (!payload) {
            return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
        }

        // 3. Perform authorization check
        if (!hasPermission(payload.role, 'view_reports')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 4. Fetch data
        const data = await fetchData();

        // 5. Return response
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
```

### Standard POST Handler Pattern

```typescript
export async function POST(request: Request) {
    try {
        // 1. Validate session
        const cookieStore = await cookies();
        const token = cookieStore.get('session')?.value;
        
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Parse and validate request body
        const body = await request.json();
        const validation = validateInput(body);
        
        if (!validation.valid) {
            return NextResponse.json({ error: validation.errors }, { status: 400 });
        }

        // 3. Perform business logic
        const result = await processData(body);

        // 4. Return success response
        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
```

---

## Error Handling

### API Error Responses

All API endpoints follow consistent error response patterns:

```typescript
// Authentication errors
{ error: 'Unauthorized', status: 401 }
{ error: 'Invalid session', status: 401 }

// Authorization errors
{ error: 'Forbidden', status: 403 }

// Validation errors
{ error: 'Validation failed', details: [...], status: 400 }

// Server errors
{ error: 'Internal server error', status: 500 }
```

### Frontend Error Handling

React error boundaries catch component errors:

```typescript
// Error boundary component wrapping sensitive areas
<ErrorBoundary fallback={<ErrorFallback />}>
    <DashboardContent />
</ErrorBoundary>
```

---

## Data Flow Examples

### Creating a New Report

1. User fills out report form on employee dashboard
2. Form data submitted to `/api/reports` endpoint
3. API validates session and authorization
4. Report data processed and mapped to Google Sheets format
5. Data written to appropriate sheet via Google Sheets API
6. Cache invalidated for report lists
7. Response returned to client
8. UI updates to show new report in list

### Viewing Dashboard Analytics

1. User navigates to dashboard page
2. Page loads with skeleton placeholders
3. SWR triggers data fetch in parallel:
   - Reports statistics
   - Filter options
   - User session info
4. Data fetched from `/api/reports/analytics`
5. Charts render with data
6. UI transitions from skeleton to content

### Using Custom Dashboard Builder

1. User navigates to builder interface
2. Selects available fields from sidebar
3. Configures chart type and settings
4. Preview updates in real-time
5. User adds filters for data selection
6. Saves dashboard with name and configuration
7. Dashboard stored in Supabase
8. User can view or share the dashboard

---

## Testing Considerations

### Unit Testing Patterns

The codebase would benefit from unit tests for:

- Utility functions in `lib/utils.ts`
- Authentication logic in `lib/auth-utils.ts`
- Data processing in `lib/services/reports-service.ts`
- Component rendering with various props

### Integration Testing

API endpoints should be tested for:

- Authentication flow
- Authorization enforcement
- Data validation
- Error handling
- Response formats

### E2E Testing

Critical user flows to test:

- User registration and approval
- Report creation and submission
- Dashboard loading and interaction
- Chart embed functionality

---

## Future Enhancements

### Planned Features

1. **Real-time Notifications**: WebSocket-based push notifications for report status changes
2. **Mobile Application**: Native mobile apps for iOS and Android
3. **Advanced AI**: Machine learning models for predictive analytics
4. **Audit Logging**: Comprehensive audit trail for compliance
5. **Multi-language Support**: Internationalization for multiple languages
6. **Dark Mode**: Full dark theme support
7. **Offline Support**: Progressive Web App capabilities

### Performance Improvements

1. Database query optimization
2. CDN for static assets
3. Edge computing for global distribution
4. Enhanced caching strategies
5. Image optimization pipeline

---

## Conclusion

The Gapura Operations Dashboard is a sophisticated, enterprise-grade application built with modern web technologies. It provides comprehensive operational reporting and analytics capabilities for aviation ground handling operations. The architecture leverages Next.js 16's App Router for optimal performance, Supabase for robust data management, and Google Sheets for flexible data entry. Advanced AI features enable intelligent root cause analysis and risk assessment, while the custom dashboard builder empowers users to create personalized analytics views.

The system's security model, based on JWT authentication and role-based access control, ensures that sensitive operational data is protected while remaining accessible to authorized personnel. The comprehensive API layer and modular component architecture make the system highly extensible and maintainable.

---

*Document Version: 1.0*
*Last Updated: February 2026*
*Project: Gapura Operations Dashboard*
