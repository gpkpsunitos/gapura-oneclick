# DOKUMEN HANDOVER PROYEK GAPURA IRRS (Incident Reporting & Response System)

---

## 📋 DAFTAR ISI

1. [TINJAUAN UMUM PROYEK](#tinjauan-umum-proyek)
2. [TECH STACK](#tech-stack)
3. [ENVIRONMENT VARIABLES](#environment-variables)
4. [ARSITEKTUR SISTEM](#arsitektur-sistem)
5. [STRUKTUR DIREKTORI & FILE](#struktur-direktori--file)
6. [DATABASE SCHEMA](#database-schema)
7. [KEAMANAN & SECURITY](#keamanan--security)
8. [MIGRASI KE UBUNTU SERVER + POSTGRESQL](#migrasi-ke-ubuntu-server--postgresql)
9. [REKOMENDASI PRODUCTION](#rekomendasi-production)
10. [PANDUAN TROUBLESHOOTING](#panduan-troubleshooting)
11. [FAQ & PERTANYAAN UMUM](#faq--pertanyaan-umum)

---

## 🔖 TINJAUAN UMUM PROYEK

### Deskripsi Aplikasi
Gapura IRRS (Incident Reporting & Response System) adalah aplikasi berbasis web modern untuk manajemen pelaporan insiden, analisis, dan monitoring dalam operasi bandara. Aplikasi ini memungkinkan pelaporan insiden secara real-time, analisis AI, manajemen dokumen, dashboard kustom, dan integrasi dengan berbagai sistem eksternal.

### Fitur Utama
- **Sistem Pelaporan Insiden**: Formulir pelaporan komprehensif dengan dukungan upload evidence
- **Analisis AI Terintegrasi**: Insight otomatis menggunakan machine learning untuk deteksi pola
- **Dashboard Kustom**: Builder dashboard drag-and-drop untuk visualisasi data
- **Manajemen Role-Based Access**: Multi-level user roles dengan kontrol akses granular
- **Integrasi Google Sheets**: Sinkronisasi otomatis dengan spreadsheet eksternal
- **Sistem Notifikasi**: Email notification berbasis event
- **Sistem Calendar**: Manajemen jadwal dan meeting
- **Document Management**: Upload dan distribusi dokumen per divisi
- **Security & Audit**: Log keamanan lengkap dan audit trail
- **PWA Support**: Progressive Web App untuk akses mobile
- **Embed System**: Dashboard embeddable untuk presentasi eksternal

### KPI & Metrik
- Total users: 17+ pengguna aktif
- Total reports: 1,052+ laporan
- Audit logs: 2,172+ entri
- Security events: 716+ events
- Dashboard charts: 277+ visualisasi
- API endpoints: 94+ routes
- Components: 231+ React components

---

## 🛠️ TECH STACK

### Frontend Technologies
- **Framework**: Next.js 16.1.6 (React 19.2.1)
  - App Router untuk routing modern
  - Server Components dan Client Components
  - Turbopack untuk build optimization
  
- **Styling**: Tailwind CSS 3.4.17
  - Custom design system dengan PRISM V3 color system
  - Responsive design dengan mobile-first approach
  - Glassmorphism dan modern UI patterns
  
- **Charts & Visualization**: Recharts 3.5.1
  - Line, bar, pie, area charts
  - Custom chart components untuk aviation metrics
  
- **Icons**: Lucide React 0.560.0
- **Animations**: Framer Motion 12.35.0
- **Forms & Inputs**: Radix UI components (@radix-ui/react-*)
- **Date Handling**: date-fns 4.1.0

### Backend Technologies
- **Runtime**: Node.js 20.9.0+
- **Database**: PostgreSQL (via Supabase)
- **ORM/Client**: Supabase JS Client 2.87.1
- **Authentication**: Custom JWT implementation
  - jose 6.1.3 untuk JWT signing/verification
  - bcryptjs 3.0.3 untuk password hashing
  
- **AI/ML Integration**:
  - OpenRouter Chat Completions API untuk LLM calls
  - Custom AI service via Hugging Face Spaces
  
- **Email Services**:
  - nodemailer 8.0.3 untuk SMTP
  - Gmail SMTP integration
  
- **File Processing**:
  - sharp 0.34.5 untuk image processing
  - file-saver 2.0.5 untuk download
  - react-dropzone 15.0.0 untuk file upload
  
- **Document Generation**:
  - jspdf 4.1.0 & jspdf-autotable 5.0.7 untuk PDF
  - docx 9.5.3 untuk Word documents
  - pptxgenjs 4.0.1 untuk PowerPoint
  - exceljs 4.4.0 untuk Excel
  
- **Integrasi Eksternal**:
  - googleapis 171.4.0 untuk Google Sheets API
  - botid 1.5.11 untuk PWA features

### Deployment & DevOps
- **Platform**: Vercel (production)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Monitoring**: Vercel Analytics & Speed Insights
- **Service Worker**: Serwist 9.5.7 untuk PWA

### Development Tools
- **Language**: TypeScript 5.x
- **Package Manager**: npm 10+
- **Linting**: ESLint 9
- **Build Tools**:
  - esbuild 0.28.0
  - cross-env 10.1.0
  
- **Testing**: Playwright (via .playwright-mcp)

---

## ⚙️ ENVIRONMENT VARIABLES

### Variables Wajib (REQUIRED)

| Variable | Deskripsi | Contoh | Sensitif |
|----------|-----------|---------|----------|
| `JWT_SECRET` | Secret key untuk JWT signing | `gapura_irrs_secret_key_2025_stable` | 🔴 YA |
| `NEXT_PUBLIC_SUPABASE_URL` | URL database Supabase | `https://iahgbzjdnfbtlrizottx.supabase.co` | 🟡 NO (Public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key Supabase (client access) | `eyJhbGciOiJIUzI1NiIsInR5cCI...` | 🟡 NO (Public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (admin access) | `eyJhbGciOiJIUzI1NiIsInR5cCI...` | 🔴 YA |
| `OPENROUTER_API_KEY` | API key untuk OpenRouter LLM service | `sk-or-v1-...` | 🔴 YA |
| `NEXT_PUBLIC_GOOGLE_SHEET_ID` | ID Google Sheet utama | `1n0bVEXD9h7v03Q_7REJQuvycGZVhWZI4u1zg1I1fqh8` | 🟡 NO (Public) |
| `GOOGLE_SHEET_ID` | ID Google Sheet untuk backend sync | `1n0bVEXD9h7v03Q_7REJQuvycGZVhWZI4u1zg1I1fqh8` | 🔴 YA |
| `GOOGLE_PRIVATE_KEY` | Private key untuk Service Account | `-----BEGIN PRIVATE KEY-----\n...` | 🔴 YA |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Email service account Google | `sheets@gapura-487706.iam.gserviceaccount.com` | 🟡 NO |

### Variables Opsional

| Variable | Deskripsi | Default |
|----------|-----------|---------|
| `GMAIL_SMTP_USER` | Username SMTP Gmail | `gpkps.unit.os@gmail.com` |
| `GMAIL_SMTP_APP_PASSWORD` | App password Gmail | (App password terenkripsi) |
| `NOTIFICATION_FROM_EMAIL` | Email pengirim notifikasi | `OneClick gpkps.unit.os@gmail.com` |
| `SMTP_HOST` | Host SMTP server | `smtp.gmail.com` |
| `SMTP_PORT` | Port SMTP | `465` |
| `SMTP_SECURE` | Gunakan SSL/TLS | `true` |
| `QUICK_ACCESS_PASSWORD` | Password untuk akses cepat | Secret manager / env production |
| `DIVISION_PASSWORD_OS` | Password divisi OS | Secret manager / env production |
| `DIVISION_PASSWORD_HC` | Password divisi HC | Secret manager / env production |
| `NODE_ENV` | Environment mode | `development` / `production` |
| `DEMO_MODE` | Mode demo tanpa auth | `false` |

### Environment Variables Tambahan

```
# AI Service URLs
NEXT_PUBLIC_AI_SERVICE_URL=https://gapura-dev-gapura-ai.hf.space
AI_SERVICE_URL=https://gapura-dev-gapura-ai.hf.space
GAPURA_AI_BASE_URL=https://gapura-dev-gapura-ai.hf.space

# Google Sheets Tambahan
JOUMPA_SHEET_ID=1X4KN3ukUtMsd4udL-e2OdNIMheJqutXp0IbfE-Cwwsw
SLA_FULL_SERVICE_SHEET_ID=1-5N-VPSOH9HqOoYEC_Hc2qln2Sk2kHO9-NUUPSEr8Uk
WSN_SHEET_ID=1O-wemImk4J7TIY0VmOsKs2I9MVSoN3Y5iFSFpfeLO7o
HC_SHEETS=1UzDfVlOR2l6t5WaNfrmmCOeA4Op1PCzU6L6fCGUaM6g

# Webhook Secrets
GOOGLE_SHEETS_WEBHOOK_SECRET=(secret untuk webhook validation)
```

### Security Configuration
- **JWT Expiry**: 24 jam
- **Session Expiry**: 24 jam (disinkronkan dengan JWT)
- **Password Hashing**: bcrypt dengan salt rounds 10
- **Rate Limiting**: Implementasi custom di backend
- **CORS**: Dikonfigurasi via Next.js headers

### Konfigurasi Production
Untuk environment production:
1. Set `NODE_ENV=production`
2. Gunakan secrets manager (Vercel Secrets, AWS Secrets Manager, atau HashiCorp Vault)
3. Rotasi API keys secara berkala
4. Gunakan environment-specific values
5. Enable HTTPS dan security headers

---

## 🏗️ ARSITEKTUR SISTEM

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │  Mobile  │  │  Desktop │  │  Tablet  │            │
│  │ (PWA)   │  │          │  │          │            │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘            │
│       │             │             │                        │
│       └─────────────┴─────────────┘                        │
│                     │                                    │
│              Next.js App Router                           │
└─────────────────────┬─────────────────────────────────────┘
                      │
┌─────────────────────┴─────────────────────────────────────┐
│                   API LAYER                              │
│  ┌──────────────┐  ┌──────────────┐                  │
│  │ API Routes   │  │ Middleware   │                  │
│  │ (app/api/*) │  │ (proxy.ts)   │                  │
│  └──────┬───────┘  └──────┬───────┘                  │
│         │                   │                            │
│         │  ┌────────────────┴─────────────┐           │
│         │  │                              │           │
│         ▼  ▼                              ▼           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │  Auth    │  │  AI      │  │  Sync    │           │
│  │ Service  │  │ Service  │  │ Service  │           │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘           │
└───────┼────────────┼────────────┼───────────────────┘
        │            │            │
┌───────┼────────────┼────────────┼───────────────────┐
│       │            │            │                   │
│       ▼            ▼            ▼                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │Supabase  │  │  OpenRouter    │  │  Google  │        │
│  │Database  │  │  AI      │  │  Sheets  │        │
│  │(Postgres)│  │  API     │  │   API    │        │
│  └──────────┘  └──────────┘  └──────────┘        │
│                                             │        │
│  ┌──────────┐                              ▼        │
│  │Supabase  │                      ┌────────────┐   │
│  │ Storage   │                      │ SMTP/Email │   │
│  │          │                      │  Service   │   │
│  └──────────┘                      └────────────┘   │
└───────────────────────────────────────────────────────────┘
```

### Component Architecture

#### 1. Authentication Layer
- **Custom JWT System**: Menggunakan jose library untuk signing/verification
- **Session Management**: Multi-tier caching (in-memory + database)
- **Password Security**: bcrypt hashing dengan salt
- **Role-Based Access**: 11+ role types dengan permission mapping

#### 2. Data Layer
- **Supabase Client**: Primary database interaction
- **Supabase Admin**: Bypass RLS untuk admin operations
- **Sync System**: Google Sheets → PostgreSQL sync pipeline
- **Cache Layer**: Dashboard query cache, AI response cache

#### 3. AI Integration Layer
- **OpenRouter API**: Primary LLM service via `lib/ai/openrouter.ts`, default model `meta-llama/llama-3-70b-instruct`
- **Hugging Face Spaces**: Custom AI endpoints
- **Caching Strategy**: AI insights caching untuk performance
- **Fallback Mechanism**: Error handling dan retry logic

#### 4. Notification Layer
- **Email Service**: Nodemailer dengan Gmail SMTP
- **Queue System**: Async notification delivery
- **Deduplication**: Fingerprint-based dedupe
- **Template System**: Dynamic email templates

#### 5. File Management Layer
- **Supabase Storage**: Primary file storage
- **Image Processing**: Sharp untuk optimization
- **Upload Flow**: Multi-stage dengan progress tracking
- **Public Access**: Token-based public sharing

### Data Flow Diagrams

#### Login Flow
```
User → /api/auth/login
  ↓
Email/Password validation
  ↓
bcrypt.compare()
  ↓
User record lookup
  ↓
Generate JWT (signSession)
  ↓
Create session record (registerSession)
  ↓
Set HTTP-only cookie
  ↓
Redirect to dashboard
```

#### Report Submission Flow
```
User fills report form
  ↓
Client-side validation
  ↓
POST /api/reports/public
  ↓
Generate unique report ID
  ↓
Upload evidence (if any) → Supabase Storage
  ↓
Insert to reports table
  ↓
Trigger AI analysis (optional)
  ↓
Send notification (if configured)
  ↓
Return report ID
```

#### Dashboard Rendering Flow
```
User opens dashboard
  ↓
Check cache (dashboard_cache_entries)
  ↓
If cache valid: Return cached data
  ↓
If cache invalid:
  ↓
Build query from config
  ↓
Execute query → Supabase
  ↓
Process results → aggregation/grouping
  ↓
Generate chart data
  ↓
Update cache
  ↓
Return to client
```

#### Sync Flow (Google Sheets → Supabase)
```
Cron job triggers (every 5 min)
  ↓
Check sync_state (locked_until)
  ↓
Fetch all sheets data
  ↓
Process each row:
  - Generate fingerprint
  - Check existence by sheet_id
  - Upsert to reports_sync
  ↓
Update sync_state
  ↓
Trigger notifications (new/changed reports)
  ↓
Cache invalidation for dashboards
```

### Security Architecture

#### Authentication Flow
1. **Login Request**: Email + password
2. **Password Verification**: bcrypt.compare()
3. **Session Creation**: JWT + database record
4. **Session Validation**: Every request checks:
   - JWT signature validity
   - Session revocation status
   - User active status
   - Role permissions

#### Authorization Model
```
Role Hierarchy:
┌─────────────────────────────────┐
│   SUPER_ADMIN                 │
│   (Full access)              │
└─────────────┬───────────────┘
              │
    ┌─────────┴─────────┐
    │                   │
┌───┴──────┐   ┌──────┴───┐
│ DIVISI_   │   │ ANALYST   │
│ ESKALASI   │   │          │
│ (Escalate)│   └──────────┘
└────────────┘
              │
    ┌─────────┴─────────┐
    │                   │
┌───┴──────┐   ┌──────┴───┐
│ DIVISI_   │   │ MANAGER_  │
└────────────┘   │ CABANG    │
                └───────────┘
```

#### Audit Trail
- **Action Logging**: All mutations logged
- **Entity Tracking**: Changes tracked per entity
- **Before/After**: Old and new values captured
- **Actor Attribution**: User ID, IP, timestamp

### Performance Optimizations

#### Client-Side
- **Code Splitting**: Route-based splitting
- **Lazy Loading**: Components loaded on-demand
- **Image Optimization**: Next.js Image component + formats (avif, webp)
- **Bundle Analysis**: Tree-shaking, unused code elimination

#### Server-Side
- **Query Caching**: Dashboard queries cached 5-10 min
- **AI Caching**: AI responses cached indefinitely
- **Session Cache**: In-memory session cache (15 min TTL)
- **Database Indexing**: Strategic indexes on frequently queried columns
- **Rate Limiting**: Prevent abuse and optimize resource usage

---


## 📁 STRUKTUR DIREKTORI & FILE

### Root Directory Structure
```
gapura-oneclick/
├── app/                      # Next.js App Router directory
├── components/               # Reusable React components
├── lib/                     # Utility libraries and helpers
├── public/                  # Static assets
├── scripts/                 # Utility scripts (sync, migration, etc.)
├── types/                   # TypeScript type definitions
├── supabase/               # Supabase migrations and functions
├── supabase_export/        # Database exports (created during handover)
├── supabase_migration/     # Migration utilities
├── docs/                   # Documentation
├── .env                     # Environment variables (DO NOT COMMIT)
├── package.json             # Dependencies and scripts
├── next.config.mjs          # Next.js configuration
├── tsconfig.json           # TypeScript configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── proxy.ts               # Next.js middleware for auth
└── vercel.json            # Vercel deployment config
```

### Direktori `app/` (Next.js App Router)
Total files: 241+ TypeScript/TSX files

#### Root Level
```
app/
├── layout.tsx              # Root layout with global providers
├── page.tsx               # Landing page
├── globals.css            # Global styles and PRISM V3 design system
├── manifest.ts            # PWA manifest
├── sw.ts                 # Service Worker registration
├── .well-known/          # Web app verification
├── actions/              # Server Actions
├── api/                  # API Routes (94+ endpoints)
├── auth/                 # Authentication pages
├── dashboard/            # Dashboard pages
├── embed/               # Embedded dashboard pages
└── offline/             # PWA offline fallback
```

##### File: `app/layout.tsx`
**Deskripsi**: Root layout yang membungseluruh aplikasi
**Komponen Utama**:
- SessionProvider (context management)
- PWAProvider (offline support)
- PerformanceTelemetry (analytics)
- Meta tags untuk SEO
- Global CSS imports

##### File: `app/page.tsx`
**Deskripsi**: Landing page / homepage
**Fitur**:
- Public information
- Quick access links
- Public report submission form

##### File: `app/globals.css`
**Deskripsi**: Global styles dan design system
**Berisi**:
- PRISM V3 color variables
- Custom animations
- Utility classes
- Responsive breakpoints

##### File: `app/manifest.ts`
**Deskripsi**: PWA manifest configuration
**Konfigurasi**:
- App name, short name
- Icons (various sizes)
- Theme colors
- Display mode (standalone)

##### File: `app/sw.ts`
**Deskripsi**: Service Worker registration
**Fitur**:
- Caching strategy
- Offline support
- Push notifications (future)
- Background sync

### Direktori `app/api/` (API Routes)
Total routes: 94+ endpoints

#### Authentication Endpoints
```
app/api/auth/
├── login/route.ts           # POST - User login
├── logout/route.ts          # POST - User logout
├── register/route.ts        # POST - User registration
├── session/route.ts        # GET - Get current session
├── me/route.ts             # GET - Get user info
├── switch/route.ts         # POST - Switch division (for multiple roles)
├── switch-division/route.ts # POST - Switch division context
├── verify-division-password/route.ts # POST - Verify division password
├── verify-quick-access/route.ts     # POST - Verify quick access password
├── inspect/route.ts         # GET - Inspect JWT token
└── bundle/route.ts         # GET - Get auth bundle for client
```

**Detail Endpoints**:

##### `POST /api/auth/login`
**Deskripsi**: Autentikasi user dengan email dan password
**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
**Response**:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "DIVISI_OS",
    "full_name": "John Doe"
  },
  "redirect": "/dashboard/os"
}
```
**Logic**:
1. Validasi email format
2. Lookup user di database
3. Verify password dengan bcrypt
4. Cek user status (active/pending/suspended)
5. Generate JWT token
6. Register session di database
7. Set HTTP-only cookie
8. Return user info + redirect URL

##### `POST /api/auth/logout`
**Deskripsi**: Terminasi session user
**Logic**:
1. Revoke session di database
2. Clear session cache
3. Expire HTTP-only cookie
4. Redirect ke login page

##### `POST /api/auth/register`
**Deskripsi**: Registrasi user baru
**Request Body**:
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "full_name": "Jane Doe",
  "role": "STAFF_CABANG",
  "station_id": "CGK",
  "nik": "123456789"
}
```
**Logic**:
1. Validasi semua fields
2. Cek email uniqueness
3. Hash password
4. Insert ke database
5. Generate audit log
6. Return success

##### `GET /api/auth/session`
**Deskripsi**: Mendapatkan informasi session saat ini
**Response**:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "DIVISI_OS",
    "station_id": "CGK"
  }
}
```
**Logic**:
1. Extract session token dari cookie
2. Verify JWT signature
3. Check session revocation
4. Return user info

#### Report Management Endpoints
```
app/api/reports/
├── route.ts                # GET (list), POST (create)
├── [id]/route.ts          # GET (detail), PATCH (update), DELETE
├── [id]/comments/route.ts # GET (list), POST (add comment)
├── [id]/evidence/route.ts # GET (list), POST (upload), DELETE
├── batch/route.ts          # POST (bulk operations)
├── public/route.ts         # POST (public submission)
├── sync/route.ts          # POST (trigger manual sync)
├── refresh/route.ts        # POST (refresh data from Sheets)
└── status/route.ts        # GET (get sync status)
```

##### `POST /api/reports/public`
**Deskripsi**: Public report submission (tanpa autentikasi)
**Request Body**:
```json
{
  "title": "Incident Title",
  "description": "Description of incident",
  "location": "Terminal 2",
  "reporter_name": "John Doe",
  "reporter_email": "john@example.com",
  "evidence_files": [File, File], // FormData
  "flight_number": "GA123",
  "aircraft_reg": "PK-GAA"
}
```
**Logic**:
1. Validasi input
2. Generate evidence token untuk upload
3. Upload evidence ke Supabase Storage
4. Create report record
5. Generate AI insights (optional)
6. Send notification ke divisi terkait
7. Return report ID

##### `GET /api/reports`
**Deskripsi**: List reports dengan filter dan pagination
**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `status`: Filter by status
- `severity`: Filter by severity
- `station_id`: Filter by station
- `date_from`: Filter from date
- `date_to`: Filter to date
- `search`: Search in title/description

**Response**:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1052,
    "pages": 53
  }
}
```

#### Dashboard Endpoints
```
app/api/dashboards/
├── route.ts                      # GET (list), POST (create)
├── query/route.ts               # POST (execute query)
├── query/batch/route.ts         # POST (execute multiple queries)
├── filter-options/route.ts       # GET (get available filters)
├── ai-generate/route.ts        # POST (AI-assisted dashboard creation)
├── export-insights/route.ts     # POST (export insights to PPT)
└── summary/severity/route.ts    # GET (severity summary)
```

##### `POST /api/dashboards/query`
**Deskripsi**: Execute dashboard query dengan filter
**Request Body**:
```json
{
  "config": {
    "timeRange": "30d",
    "filters": {
      "station_id": ["CGK", "DPS"],
      "severity": ["high", "critical"]
    },
    "grouping": "week",
    "aggregations": ["count", "avg_resolution_time"]
  }
}
```

**Logic**:
1. Check cache first
2. Build Supabase query from config
3. Execute query with timeout protection
4. Process results (grouping, aggregation)
5. Update cache
6. Return results

#### AI Endpoints
```
app/api/ai/
├── route.ts                   # GET (health check)
├── analyze/route.ts           # POST (analyze report)
├── analyze-all/route.ts       # POST (batch analyze)
├── summarize/route.ts         # POST (summarize reports)
├── insights/route.ts          # POST (generate insights)
├── action-summary/route.ts    # POST (generate action summary)
├── dashboard/summary/route.ts # POST (dashboard summary)
├── risk/
│   ├── summary/route.ts       # GET (risk summary)
│   ├── calculate/route.ts     # POST (calculate risk score)
│   ├── airlines/route.ts      # GET (risk by airline)
│   ├── hubs/route.ts         # GET (risk by hub)
│   └── branches/route.ts     # GET (risk by branch)
├── gse/
│   ├── serviceability/route.ts # GET (GSE serviceability)
│   ├── irregularities/route.ts # GET (GSE irregularities)
│   ├── issues/top/route.ts    # GET (top GSE issues)
│   └── ranking/route.ts      # GET (GSE ranking)
├── root-cause/
│   ├── stats/route.ts         # GET (root cause stats)
│   ├── categories/route.ts     # GET (categories)
│   └── classify/route.ts     # POST (classify root cause)
├── seasonality/
│   └── forecast/route.ts     # POST (seasonality forecast)
├── forecast/
│   └── seasonal/route.ts     # POST (seasonal forecast)
├── similar/route.ts          # POST (find similar reports)
├── health/route.ts           # GET (AI service health)
├── model-info/route.ts       # GET (model information)
├── train/route.ts           # POST (train model)
├── cache/
│   └── invalidate/route.ts   # POST (invalidate cache)
└── branch/summary/route.ts   # GET (branch summary)
```

##### `POST /api/ai/analyze`
**Deskripsi**: Analisis laporan dengan AI untuk deteksi pola
**Request Body**:
```json
{
  "report_id": "uuid",
  "include_historical": true
}
```

**Response**:
```json
{
  "risk_score": 0.75,
  "predicted_category": "GSE-related",
  "similar_cases": [
    {
      "report_id": "uuid",
      "similarity": 0.85,
      "summary": "Similar incident with..."
    }
  ],
  "recommendations": [
    "Conduct GSE inspection",
    "Review maintenance records"
  ],
  "insights": "Analysis completed successfully"
}
```

**Logic**:
1. Fetch report details
2. Fetch historical similar reports
3. Prepare prompt untuk LLM
4. Call OpenRouter API
5. Parse response
6. Cache result
7. Return structured insights

#### Admin Endpoints
```
app/api/admin/
├── reports/route.ts           # GET (list), PATCH (bulk update)
├── reports/[id]/route.ts     # GET, PATCH, DELETE
├── users/route.ts            # GET, POST
├── users/approve-staff/route.ts # POST (approve staff user)
├── notifications/route.ts     # GET, POST (manage notifications)
├── notifications/test/route.ts # POST (send test email)
├── sync-reports/route.ts      # POST (trigger sync)
├── sync-reports/cron/route.ts # POST (cron job)
├── stats/route.ts            # GET (system statistics)
├── analytics/route.ts        # GET (usage analytics)
├── external-links/route.ts    # GET, POST, DELETE
├── cache-stats/route.ts       # GET (cache statistics)
└── security/
    ├── dashboard-data/route.ts    # GET (security dashboard)
    ├── actions/
    │   ├── alert-control/route.ts   # POST (control alerts)
    │   └── ip-control/route.ts     # POST (IP blocking)
    ├── ingest/route.ts               # POST (ingest security event)
    └── sessions/route.ts            # GET (active sessions)
```

#### Upload Endpoints
```
app/api/uploads/
├── evidence/route.ts         # POST (upload evidence)
├── evidence/token/route.ts   # POST (generate upload token)
├── evidence/public/route.ts  # POST (public evidence upload)
├── media/route.ts           # POST (upload media files)
├── document/route.ts        # POST (upload document)
└── batch/route.ts           # POST (batch upload)
```

##### `POST /api/uploads/evidence`
**Deskripsi**: Upload bukti (evidence) untuk laporan
**Request**: FormData
- `file`: File evidence
- `report_id`: Report UUID (optional)
- `token`: Upload token (untuk public upload)

**Response**:
```json
{
  "success": true,
  "url": "https://storage.supabase.co/...",
  "filename": "evidence_123.jpg",
  "size": 1234567
}
```

**Logic**:
1. Validate file type and size
2. Generate unique filename
3. Optimize image (jika image)
4. Upload to Supabase Storage
5. Generate public URL
6. Update report record
7. Log audit trail

#### Security Endpoints
```
app/api/security/
├── dashboard-data/route.ts  # GET (security dashboard data)
├── actions/
│   ├── alert-control/route.ts # POST (manage alerts)
│   └── ip-control/route.ts   # POST (IP blocking)
├── ingest/route.ts          # POST (ingest security events)
└── sessions/route.ts        # GET (list active sessions)
```

#### Calendar Endpoints
```
app/api/calendar/events/
├── route.ts               # GET (list), POST (create)
└── [id]/route.ts         # GET, PATCH, DELETE
```

#### Division Documents Endpoints
```
app/api/division-documents/
├── route.ts               # GET (list), POST (create)
└── [id]/route.ts         # GET, PATCH, DELETE
```

#### External Integrations Endpoints
```
app/api/integrations/
└── google-sheets/
    └── webhook/route.ts   # POST (webhook handler)
```

#### Master Data Endpoints
```
app/api/master-data/route.ts  # GET (stations, categories, etc.)
```

#### Other Utility Endpoints
```
app/api/
├── sla/full-service/route.ts    # GET (SLA data)
├── joumpa/route.ts             # GET (JOUMPA data)
├── wsn/route.ts                # GET (WSN data)
└── notifications/recipients/route.ts # GET, POST (manage recipients)
```


### Direktori `app/dashboard/` (Dashboard Pages)
Struktur dashboard berdasarkan role user:

```
app/dashboard/
├── layout.tsx                 # Dashboard layout dengan sidebar
├── loading.tsx                # Loading state
├── (main)/                   # Grouped routes
│   ├── admin/                # Admin dashboard
│   │   ├── page.tsx          # Admin overview
│   │   ├── users/            # User management
│   │   ├── reports/          # Report management
│   │   ├── notifications/     # Notification settings
│   │   ├── external-links/    # External links management
│   │   ├── security/         # Security monitoring
│   │   └── drilldown/        # Drilldown analysis
│   ├── op/                  # Operations dashboard
│   │   ├── page.tsx          # OP overview
│   │   ├── reports/          # Report list and detail
│   │   ├── ai-reports/       # AI-generated reports
│   │   ├── complaint-by-category/   # Complaint analytics
│   │   ├── irregularity-complaint-top-cases/ # Top cases
│   │   └── root-cause-dominant/ # Root cause analysis
│   ├── analyst/              # Analyst dashboard
│   │   ├── page.tsx          # Analyst overview
│   │   ├── reports/          # Report management
│   │   ├── dashboards/       # Dashboard builder
│   │   ├── ai-reports/       # AI reports
│   │   ├── import/           # Data import
│   │   ├── calendar/         # Calendar management
│   │   ├── notifications/     # Notifications
│   │   ├── meetings/         # Meeting management
│   │   ├── builder/          # Query builder
│   │   └── drilldown/       # Drilldown analysis
│   ├── hc/                  # HR / HC dashboard
│   │   ├── page.tsx          # HC overview
│   │   └── library/          # Document library
│   ├── eskalasi/             # Escalation dashboard
│   │   ├── page.tsx          # Escalation overview
│   │   ├── select/           # Division selection
│   │   ├── op/              # OP escalation
│   │   ├── ht/              # HT escalation
│   │   └── os/              # OS escalation
│   ├── os/                  # OS dashboard
│   ├── ht/                  # HT dashboard
│   ├── lookers/              # Read-only viewers
│   └── charts/              # Chart detail pages
└── (public)/                # Public access
```

##### Role-Based Dashboard Access

| Role | Dashboard Path | Primary Features |
|-------|---------------|------------------|
| SUPER_ADMIN | `/dashboard/admin` | User management, system config, security monitoring |
| DIVISI_OS | `/dashboard/os` | Operations monitoring, report analysis, AI insights |
| DIVISI_OP | `/dashboard/op` | Operations overview, complaint tracking |
| DIVISI_HC | `/dashboard/hc` | HR management, document library |
| DIVISI_HT | `/dashboard/ht` | Human resources, training |
| DIVISI_ESKALASI | `/dashboard/eskalasi/select` | Multi-division escalation management |
| ANALYST | `/dashboard/analyst` | Data analysis, custom dashboards, reporting |
| MANAGER_CABANG | `/dashboard/employee` | Branch-level operations |
| STAFF_CABANG | `/dashboard/employee` | Report submission, status tracking |

### Direktori `components/` (Reusable Components)
Total components: 231+ React components

#### UI Components
```
components/
├── ai/                    # AI-related components
│   ├── AIChat.tsx
│   ├── AIInsights.tsx
│   ├── AIThinkingIndicator.tsx
│   └── ...
├── auth/                   # Authentication components
│   ├── LoginForm.tsx
│   ├── RegisterForm.tsx
│   └── ...
├── builder/                # Dashboard builder components
│   ├── QueryBuilder.tsx
│   ├── ChartConfigurator.tsx
│   ├── FilterPanel.tsx
│   └── ...
├── charts/                 # Chart components
│   ├── BarChart.tsx
│   ├── LineChart.tsx
│   ├── PieChart.tsx
│   ├── AreaChart.tsx
│   └── ...
├── dashboard/              # Dashboard-specific components
│   ├── DashboardGrid.tsx
│   ├── MetricCard.tsx
│   └── ...
├── filters/                # Filter components
│   ├── DateRangeFilter.tsx
│   ├── StationFilter.tsx
│   ├── StatusFilter.tsx
│   └── ...
├── layout/                 # Layout components
│   ├── Sidebar.tsx
│   ├── MobileBottomNav.tsx
│   ├── Navbar.tsx
│   └── ...
├── security/               # Security components
│   ├── SecurityDashboard.tsx
│   ├── SessionList.tsx
│   └── ...
├── tables/                 # Table components
│   ├── DataTable.tsx
│   ├── ReportTable.tsx
│   └── ...
└── ui/                    # Generic UI components
    ├── Button.tsx
    ├── Input.tsx
    ├── Modal.tsx
    ├── Dropdown.tsx
    ├── Card.tsx
    └── ...
```

#### Komponen Utama

##### `components/Sidebar.tsx`
**Deskripsi**: Navigasi sidebar untuk dashboard
**Fitur**:
- Role-based menu items
- Active state tracking
- Collapsible (mobile)
- Quick access links
- User profile section

##### `components/PWAInstallPrompt.tsx`
**Deskripsi**: Prompt instalasi PWA
**Fitur**:
- Detect installability
- Show install button
- Handle installation
- Track installations

##### `components/QuickAccessPasswordModal.tsx`
**Deskripsi**: Modal untuk akses cepat dengan password
**Fitur**:
- Password validation
- Division-specific passwords
- Session persistence
- Failed attempt logging

##### `components/OfflineIndicator.tsx`
**Deskripsi**: Indikator status koneksi
**Fitur**:
- Real-time connection status
- Visual feedback
- Queue display (pending uploads)

### Direktori `lib/` (Utility Libraries)

#### Authentication
```
lib/
├── auth-utils.ts            # JWT, password hashing, session management
├── auth-context.tsx         # React context for auth
├── auth-bundle.ts          # Auth bundle for client initialization
└── supabase.ts            # Supabase client initialization
```

##### File: `lib/auth-utils.ts`
**Fungsi Utama**:

```typescript
// Password hashing
hashPassword(password: string): Promise<string>
verifyPassword(password: string, hash: string): Promise<boolean>

// Session management
signSession(payload: SessionPayload): Promise<string>
verifySession(token: string): Promise<SessionPayload | null>
readSessionPayload(token: string): Promise<SessionPayload | null>
registerSession(userId: string, sid: string, ip: string, ua: string): Promise<void>
evictSessionCache(sid: string): void
```

**Cache Strategy**:
- In-memory cache dengan 15 menit TTL
- Max 500 cached sessions
- Auto-eviction policy
- Throttle last_active update (15 min interval)

#### Database Clients
```
lib/
├── supabase.ts            # Public Supabase client (respects RLS)
└── supabase-admin.ts      # Admin Supabase client (bypasses RLS)
```

##### File: `lib/supabase.ts`
```typescript
// Public client - respects Row Level Security
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
```

##### File: `lib/supabase-admin.ts`
```typescript
// Admin client - bypasses RLS for admin operations
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false }
  }
);
```

#### AI Integration
```
lib/ai/
├── hf-client.ts            # Hugging Face client
└── ...
```

##### File: `lib/hf-client.ts`
**Deskripsi**: Client untuk AI service
**Fungsi**:
- LLM completion calls
- Prompt engineering
- Response parsing
- Error handling

#### Cache Management
```
lib/
├── ai-cache.ts            # AI response caching
├── ai-route-cache.ts      # AI route-specific caching
└── dashboard-cache.ts     # Dashboard query caching
```

##### File: `lib/dashboard-cache.ts`
**Fungsi Utama**:
```typescript
getCache(key: string, scope: string): Promise<CacheEntry | null>
setCache(key: string, scope: string, data: any, ttl: number): Promise<void>
invalidateCache(dashboardSlug: string): Promise<void>
getCacheStats(): Promise<CacheStats>
```

#### Chart Generation
```
lib/
├── chart-detail-generator.ts  # Generate chart data for detail pages
├── chart-utils.ts           # Chart utility functions
└── chart-palette.ts         # Color palettes for charts
```

##### File: `lib/chart-detail-generator.ts`
**Deskripsi**: Mengenerate data chart untuk halaman detail
**Fungsi**:
- Fetch data dari database
- Apply filters and aggregations
- Format data untuk Recharts
- Generate metadata

#### Dashboard Builder
```
lib/builder/
├── query-executor.ts       # Execute dashboard queries
├── query-builder.ts        # Build Supabase queries from config
└── ...
```

#### Export Functions
```
lib/
├── analyst-export.ts       # Export untuk analyst reports
└── dashboard-export.ts     # Export dashboard ke berbagai format
```

##### File: `lib/dashboard-export.ts`
**Fitur Export**:
- PowerPoint (pptxgenjs)
- PDF (jsPDF + jspdf-autotable)
- Excel (exceljs)
- Word (docx)

**Fungsi Utama**:
```typescript
exportToPowerPoint(config: DashboardExportConfig): Promise<Blob>
exportToPDF(config: DashboardExportConfig): Promise<Blob>
exportToExcel(config: DashboardExportConfig): Promise<Blob>
exportToWord(config: DashboardExportConfig): Promise<Blob>
```

#### External Links
```
lib/
├── external-links.ts              # Client-side external links
└── external-links-server.ts        # Server-side external links
```

#### Hooks
```
lib/hooks/
├── use-auth.ts              # Authentication hook
├── use-reports.ts          # Reports data hook
├── useDashboardState.ts     # Dashboard state management
├── useQueryBuilder.ts      # Query builder hook
├── useQueryExecution.ts    # Query execution hook
├── useAIDashboard.ts       # AI dashboard hook
└── useExternalLinks.ts     # External links hook
```

### Direktori `scripts/` (Utility Scripts)
Total scripts: 16+ utility scripts

```
scripts/
├── sync-reports-node.mjs           # Manual sync trigger
├── sync-scheduler.mjs             # Automated sync scheduler
├── auto-sync-daemon.mjs          # Continuous sync daemon
├── verify-no-duplicates.mjs       # Verify no duplicate reports
├── backfill-reporter-email.mjs    # Backfill missing emails
├── debug-sheets.mjs              # Debug Sheets integration
├── debug-report-counts.mjs        # Debug report counts
├── check-data.mjs                # Data consistency check
├── test-data-consistency.js       # Test data consistency
├── diagnose-data.js              # Diagnose data issues
├── security-guardrails.mjs       # Security checks
├── test-compression.mjs          # Test bundle compression
├── fix-math-intrinsics.js      # Fix math intrinsics
├── check-node-version.js        # Validate Node.js version
└── build-sw.mjs               # Build service worker
```

##### File: `scripts/sync-reports-node.mjs`
**Deskripsi**: Script untuk memicu sinkronisasi manual
**Penggunaan**:
```bash
node scripts/sync-reports-node.mjs
```

**Fitur**:
- Check sync status sebelum sync
- Trigger sync endpoint
- Monitor progress
- Report results

##### File: `scripts/sync-scheduler.mjs`
**Deskripsi**: Scheduler otomatis untuk sync Google Sheets
**Penggunaan**:
```bash
# Run sync scheduler (every 5 minutes)
node scripts/sync-scheduler.mjs

# Dry run (tanpa eksekusi)
DRY_RUN=1 node scripts/sync-scheduler.mjs
```

**Fitur**:
- Cron-like scheduling
- Lock mechanism (mencegah concurrent sync)
- Error handling dan retry
- Notification jika gagal

### Direktori `types/` (TypeScript Definitions)
```
types/
├── index.ts              # Main type definitions
├── chart.js.d.ts         # Chart.js type extensions
├── builder.ts           # Dashboard builder types
├── security.ts          # Security-related types
└── entity-analytics.ts  # Analytics entity types
```

##### File: `types/index.ts`
**Type Definitions Utama**:
```typescript
// User types
interface User {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  full_name: string;
  station_id?: string;
  division?: string;
}

// Report types
interface Report {
  id: string;
  title: string;
  description: string;
  status: ReportStatus;
  severity: ReportSeverity;
  location?: string;
  flight_number?: string;
  date_of_event?: Date;
  evidence_urls?: string[];
  created_at: Date;
}

// Session types
interface SessionPayload {
  id: string;
  email: string;
  role: string;
  sid?: string;
  iat?: number;
  exp?: number;
}

// Dashboard types
interface DashboardConfig {
  timeRange: TimeRange;
  filters: Filters;
  groupings: Grouping[];
  aggregations: Aggregation[];
}

// AI types
interface AIInsight {
  risk_score: number;
  predicted_category: string;
  similar_cases: SimilarCase[];
  recommendations: string[];
}
```

### Direktori `public/` (Static Assets)
```
public/
├── icon.svg                 # Favicon
├── manifest.webmanifest      # PWA manifest
├── sw.js                   # Service worker
└── (other static assets)
```

---

## 💾 DATABASE SCHEMA

### Overview
Database: PostgreSQL (via Supabase)
Total Tables: 32 tabel
Total Records: ~4,300+ records

### Struktur Tabel

#### 1. users
**Deskripsi**: Tabel utama untuk menyimpan data user

| Column | Type | Constraint | Deskripsi |
|--------|-------|-------------|------------|
| id | UUID | PRIMARY KEY | Unique user ID |
| email | TEXT | UNIQUE, NOT NULL | Email user (login) |
| password | TEXT | NOT NULL | Hashed password (bcrypt) |
| full_name | TEXT | - | Nama lengkap user |
| role | TEXT | CHECK | Role user (11 jenis) |
| status | TEXT | CHECK | Status user (pending/active/rejected/suspended) |
| nik | TEXT | - | Nomor Induk Kependudukan |
| phone | TEXT | - | Nomor telepon |
| station_id | TEXT | FK → stations.id | ID station tempat user bekerja |
| unit_id | TEXT | - | ID unit |
| position_id | TEXT | - | ID posisi |
| created_at | TIMESTAMPTZ | DEFAULT now() | Waktu pembuatan |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Waktu update terakhir |
| department | TEXT | - | Departemen |

**Constraints**:
- Status: `pending`, `active`, `rejected`, `suspended`

**Indexes**:
- PRIMARY KEY: `id`
- UNIQUE: `email`
- FOREIGN KEY: `station_id` → `stations.id`

**Current Records**: 17 users

#### 2. stations
**Deskripsi**: Master data untuk station/cabang

| Column | Type | Constraint | Deskripsi |
|--------|-------|-------------|------------|
| id | TEXT | PRIMARY KEY | ID station (contoh: CGK, DPS) |
| code | TEXT | UNIQUE, NOT NULL | Kode station |
| name | TEXT | NOT NULL | Nama lengkap station |
| created_at | TIMESTAMPTZ | DEFAULT now() | Waktu pembuatan |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Waktu update |

**Current Records**: 12 stations

**Contoh Data**:
```
CGK - Jakarta (Soekarno-Hatta)
DPS - Denpasar (Ngurah Rai)
SUB - Surabaya (Juanda)
KNO - Medan (Kualanamu)
UPG - Makassar (Hasanuddin)
JOG - Yogyakarta (Adisutjipto)
```

#### 3. reports
**Deskripsi**: Laporan insiden yang dibuat user secara manual

| Column | Type | Constraint | Deskripsi |
|--------|-------|-------------|------------|
| id | UUID | PRIMARY KEY | Unique report ID |
| user_id | UUID | FK → users.id | ID user yang membuat laporan |
| title | TEXT | - | Judul laporan |
| description | TEXT | - | Deskripsi laporan |
| status | TEXT | - | Status laporan (OPEN, CLOSED, etc.) |
| severity | TEXT | - | Severity (low, medium, high, critical) |
| location | TEXT | - | Lokasi insiden |
| flight_number | TEXT | - | Nomor penerbangan |
| aircraft_reg | TEXT | - | Registrasi pesawat |
| date_of_event | TIMESTAMPTZ | - | Waktu kejadian |
| station_id | TEXT | FK → stations.id | ID station |
| incident_type_id | TEXT | - | Tipe insiden |
| sheet_id | TEXT | - | ID sheet sumber |
| reporter_name | TEXT | - | Nama pelapor |
| action_taken | TEXT | - | Tindakan yang diambil |
| root_caused | TEXT | - | Root cause analysis |
| delay_code | TEXT | - | Kode delay |
| delay_duration | TEXT | - | Durasi delay |
| evidence_urls | TEXT[] | - | Array URL bukti |
| created_at | TIMESTAMPTZ | DEFAULT now() | Waktu pembuatan |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Waktu update |
| primary_tag | TEXT | - | Tag utama |
| target_division | TEXT | - | Divisi target |
| remarks_gapura_kps | TEXT | - | Catatan KPS |
| category | TEXT | - | Kategori laporan |
| priority | TEXT | - | Prioritas |
| source_fingerprint | TEXT | - | Fingerprint untuk dedupe |

**Current Records**: 1 report (manual entry)

#### 4. reports_sync
**Deskripsi**: Sinkronisasi laporan dari Google Sheets

| Column | Type | Constraint | Deskripsi |
|--------|-------|-------------|------------|
| id | UUID | PRIMARY KEY | Unique ID |
| sheet_id | TEXT | UNIQUE, NOT NULL | ID unik dari Sheets |
| user_id | UUID | FK → users.id | ID user (jika ada) |
| title | TEXT | - | Judul laporan |
| description | TEXT | - | Deskripsi laporan |
| location | TEXT | - | Lokasi insiden |
| reporter_email | TEXT | - | Email pelapor |
| evidence_url | TEXT | - | URL bukti (legacy) |
| evidence_urls | TEXT[] | - | Array URL bukti |
| status | TEXT | DEFAULT 'BARU' | Status (BARU, PROSES, SELESAI) |
| severity | TEXT | DEFAULT 'medium' | Severity |
| priority | TEXT | DEFAULT 'medium' | Prioritas |
| flight_number | TEXT | - | Nomor penerbangan |
| aircraft_reg | TEXT | - | Registrasi pesawat |
| is_flight_related | BOOLEAN | DEFAULT false | Terkait penerbangan |
| gse_number | TEXT | - | Nomor GSE |
| gse_name | TEXT | - | Nama GSE |
| is_gse_related | BOOLEAN | DEFAULT false | Terkait GSE |
| station_id | TEXT | - | ID station |
| unit_id | TEXT | - | ID unit |
| location_id | TEXT | - | ID lokasi |
| incident_type_id | TEXT | - | Tipe insiden |
| category | TEXT | - | Kategori |
| main_category | TEXT | - | Kategori utama |
| investigator_notes | TEXT | - | Catatan investigator |
| manager_notes | TEXT | - | Catatan manager |
| partner_response_notes | TEXT | - | Catatan partner |
| validation_notes | TEXT | - | Catatan validasi |
| partner_evidence_urls | TEXT[] | - | URL bukti partner |
| source_sheet | TEXT | - | Nama sheet sumber |
| original_id | TEXT | - | ID original dari Sheets |
| row_number | INTEGER | - | Nomor baris di Sheets |
| created_at | TIMESTAMPTZ | DEFAULT now() | Waktu pembuatan |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Waktu update |
| resolved_at | TIMESTAMPTZ | - | Waktu resolusi |
| sla_deadline | TIMESTAMPTZ | - | Deadline SLA |
| incident_date | DATE | - | Tanggal kejadian |
| date_of_event | DATE | - | Tanggal kejadian |
| reporting_branch | TEXT | - | Cabang pelapor |
| hub | TEXT | - | Hub |
| route | TEXT | - | Route |
| branch | TEXT | - | Cabang |
| station_code | TEXT | - | Kode station |
| reporter_name | TEXT | - | Nama pelapor |
| specific_location | TEXT | - | Lokasi spesifik |
| airlines | TEXT | - | Maskapai |
| airline | TEXT | - | Maskapai |
| jenis_maskapai | TEXT | - | Jenis maskapai |
| reference_number | TEXT | - | Nomor referensi |
| root_caused | TEXT | - | Root cause |
| root_cause | TEXT | - | Root cause |
| action_taken | TEXT | - | Tindakan yang diambil |
| immediate_action | TEXT | - | Tindakan segera |
| kps_remarks | TEXT | - | Catatan KPS |
| gapura_kps_action_taken | TEXT | - | Tindakan KPS |
| preventive_action | TEXT | - | Tindakan pencegahan |
| remarks_gapura_kps | TEXT | - | Catatan KPS |
| area | TEXT | - | Area |
| terminal_area_category | TEXT | - | Kategori area terminal |
| apron_area_category | TEXT | - | Kategori area apron |
| general_category | TEXT | - | Kategori umum |
| week_in_month | TEXT | - | Minggu dalam bulan |
| report | TEXT | - | Isi laporan |
| irregularity_complain_category | TEXT | - | Kategori irregularity/complain |
| kode_cabang | TEXT | - | Kode cabang |
| kode_hub | TEXT | - | Kode hub |
| maskapai_lookup | TEXT | - | Lookup maskapai |
| case_classification | TEXT | - | Klasifikasi kasus |
| lokal_mpa_lookup | TEXT | - | Lookup MPA lokal |
| delay_code | TEXT | - | Kode delay |
| delay_duration | TEXT | - | Durasi delay |
| primary_tag | TEXT | - | Tag utama |
| sub_category_note | TEXT | - | Catatan sub-kategori |
| target_division | TEXT | - | Divisi target |
| synced_at | TIMESTAMPTZ | DEFAULT now() | Waktu sinkronisasi |
| sync_version | INTEGER | DEFAULT 1 | Versi sinkronisasi |
| source_fingerprint | TEXT | - | Fingerprint stabil untuk dedupe |

**Current Records**: 1,052 reports

**Unique Constraint**: `sheet_id` - mencegah duplikasi dari same row

#### 5. report_comments
**Deskripsi**: Komentar dan diskusi pada laporan

| Column | Type | Constraint | Deskripsi |
|--------|-------|-------------|------------|
| id | UUID | PRIMARY KEY | Unique comment ID |
| report_id | TEXT | NOT NULL | ID laporan (dari sheet_id) |
| user_id | UUID | FK → users.id | ID user (optional) |
| content | TEXT | - | Isi komentar |
| attachments | JSONB | DEFAULT '[]' | Array attachment |
| is_system_message | BOOLEAN | DEFAULT false | Pesan sistem |
| created_at | TIMESTAMPTZ | DEFAULT now() | Waktu pembuatan |
| sheet_id | TEXT | - | ID sheet sumber |

**Current Records**: 32 comments

#### 6. audit_logs
**Deskripsi**: Log audit untuk semua perubahan di sistem

| Column | Type | Constraint | Deskripsi |
|--------|-------|-------------|------------|
| id | UUID | PRIMARY KEY | Unique log ID |
| actor_id | UUID | FK → users.id | ID user yang melakukan aksi |
| action | TEXT | NOT NULL | Jenis aksi (CREATE, UPDATE, DELETE) |
| entity_type | TEXT | NOT NULL | Tipe entitas (user, report, etc.) |
| entity_id | TEXT | NOT NULL | ID entitas |
| old_value | JSONB | - | Nilai sebelum perubahan |
| new_value | JSONB | - | Nilai setelah perubahan |
| ip_address | TEXT | - | IP address pengguna |
| user_agent | TEXT | - | User agent string |
| created_at | TIMESTAMPTZ | DEFAULT now() | Waktu kejadian |

**Current Records**: 2,172 logs

**RLS Enabled**: Yes (Row Level Security)

#### 7. security_events
**Deskripsi**: Log event keamanan

| Column | Type | Constraint | Deskripsi |
|--------|-------|-------------|------------|
| id | UUID | PRIMARY KEY | Unique event ID |
| source | TEXT | NOT NULL | Sumber event (AUTH, API, SYSTEM) |
| event_type | TEXT | NOT NULL | Tipe event (LOGIN, FAILED_ATTEMPT, etc.) |
| severity | TEXT | CHECK | Severity (LOW, MEDIUM, HIGH, CRITICAL) |
| payload | JSONB | NOT NULL | Data event |
| ip_address | TEXT | - | IP address |
| actor_id | UUID | FK → users.id | ID user terkait |
| created_at | TIMESTAMPTZ | DEFAULT now() | Waktu kejadian |

**Current Records**: 716 events

#### 8. security_sessions
**Deskripsi**: Manajemen session aktif

| Column | Type | Constraint | Deskripsi |
|--------|-------|-------------|------------|
| id | UUID | PRIMARY KEY | Unique session ID |
| user_id | UUID | FK → users.id, NOT NULL | ID user |
| session_id | TEXT | UNIQUE, NOT NULL | Session ID (JWT jti) |
| ip_address | TEXT | - | IP address |
| user_agent | TEXT | - | User agent string |
| device_name | TEXT | - | Nama perangkat |
| is_revoked | BOOLEAN | DEFAULT false | Status revokasi |
| last_active | TIMESTAMPTZ | DEFAULT now() | Waktu aktivitas terakhir |
| expires_at | TIMESTAMPTZ, NOT NULL | Waktu expiry |
| created_at | TIMESTAMPTZ | DEFAULT now() | Waktu pembuatan |

**Current Records**: 761 active sessions

#### 9. custom_dashboards
**Deskripsi**: Dashboard kustom yang dibuat user

| Column | Type | Constraint | Deskripsi |
|--------|-------|-------------|------------|
| id | UUID | PRIMARY KEY | Unique dashboard ID |
| name | TEXT | NOT NULL | Nama dashboard |
| description | TEXT | - | Deskripsi |
| created_by | UUID | FK → users.id | ID pembuat |
| is_public | BOOLEAN | DEFAULT true | Status publik |
| slug | TEXT | UNIQUE, NOT NULL | URL-safe identifier |
| config | JSONB | DEFAULT '{}' | Konfigurasi dashboard |
| created_at | TIMESTAMPTZ | DEFAULT now() | Waktu pembuatan |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Waktu update |
| folder | TEXT | - | Folder grouping |

**Current Records**: 5 dashboards

#### 10. dashboard_charts
**Deskripsi**: Konfigurasi chart dalam dashboard

| Column | Type | Constraint | Deskripsi |
|--------|-------|-------------|------------|
| id | UUID | PRIMARY KEY | Unique chart ID |
| dashboard_id | UUID | FK → custom_dashboards.id | ID dashboard |
| title | TEXT | NOT NULL | Judul chart |
| chart_type | TEXT | NOT NULL | Tipe chart (bar, line, pie, etc.) |
| data_field | TEXT | NOT NULL | Field data |
| position | INTEGER | DEFAULT 0 | Urutan tampilan |
| width | TEXT | DEFAULT 'half' | Lebar (full, half, third) |
| config | JSONB | - | Konfigurasi chart |
| created_at | TIMESTAMPTZ | DEFAULT now() | Waktu pembuatan |
| query_config | JSONB | - | Konfigurasi query |
| visualization_config | JSONB | - | Konfigurasi visualisasi |
| layout | JSONB | - | Layout info |
| page_name | TEXT | DEFAULT 'Ringkasan Umum' | Nama halaman |

**Current Records**: 277 charts

#### 11. ai_cache_entries
**Deskripsi**: Cache untuk respons AI

| Column | Type | Constraint | Deskripsi |
|--------|-------|-------------|------------|
| cache_key | TEXT | PRIMARY KEY | Unique cache key |
| insights | JSONB | NOT NULL | Hasil insight |
| supporting_charts | JSONB | - | Chart pendukung |
| metadata | JSONB | DEFAULT '{}' | Metadata tambahan |
| created_at | TIMESTAMPTZ | DEFAULT now() | Waktu pembuatan |

**Current Records**: 102 cached entries

#### 12. ai_audit_logs
**Deskripsi**: Log audit untuk pemanggilan AI

| Column | Type | Constraint | Deskripsi |
|--------|-------|-------------|------------|
| id | UUID | PRIMARY KEY | Unique log ID |
| user_id | UUID | FK → users.id | ID user |
| feature | TEXT | NOT NULL | Fitur yang digunakan |
| prompt | TEXT | NOT NULL | Prompt yang dikirim |
| raw_response | TEXT | - | Respons mentah |
| parsed_response | JSONB | - | Respons yang diparse |
| model | TEXT | - | Model yang digunakan |
| execution_time_ms | INTEGER | - | Waktu eksekusi (ms) |
| status | TEXT | NOT NULL | Status (success, error) |
| error_message | TEXT | - | Pesan error |
| metadata | JSONB | - | Metadata |
| created_at | TIMESTAMPTZ | DEFAULT now() | Waktu eksekusi |

**Current Records**: 1 log

#### 13. calendar_events
**Deskripsi**: Event calendar (meeting, jadwal, dll.)

| Column | Type | Constraint | Deskripsi |
|--------|-------|-------------|------------|
| id | UUID | PRIMARY KEY | Unique event ID |
| title | TEXT | NOT NULL, CHECK(length <= 200) | Judul event |
| event_date | DATE | NOT NULL | Tanggal event |
| event_time | TIME | - | Waktu event |
| notes | TEXT | CHECK(length <= 2000) | Catatan |
| meeting_minutes_link | TEXT | CHECK(url pattern) | Link notulen |
| is_recurring | BOOLEAN | DEFAULT false | Event berulang |
| recurrence_pattern | TEXT | CHECK | Pola (daily, weekly, monthly) |
| recurrence_end_date | DATE | - | Akhir recurrence |
| parent_event_id | UUID | FK → calendar_events.id | Event induk |
| created_by | UUID | FK → users.id, NOT NULL | ID pembuat |
| created_at | TIMESTAMPTZ | DEFAULT now() | Waktu pembuatan |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Waktu update |
| deleted_at | TIMESTAMPTZ | - | Waktu hapus (soft delete) |
| calendar_type | TEXT | - | Tipe calendar |
| event_end_date | DATE | - | Tanggal akhir event |

**Current Records**: 4 events

**RLS Enabled**: Yes

#### 14. division_documents
**Deskripsi**: Dokumen per divisi (HC, HT)

| Column | Type | Constraint | Deskripsi |
|--------|-------|-------------|------------|
| id | UUID | PRIMARY KEY | Unique document ID |
| division | TEXT | NOT NULL, CHECK | Divisi (HC, HT) |
| category | TEXT | NOT NULL, CHECK | Kategori (SAM_HANDBOOK, EDARAN_DIREKSI, etc.) |
| title | TEXT | NOT NULL | Judul dokumen |
| description | TEXT | - | Deskripsi |
| source_type | TEXT | NOT NULL, CHECK | Tipe sumber (upload, link) |
| file_url | TEXT | - | URL file (jika upload) |
| file_name | TEXT | - | Nama file |
| file_size | BIGINT | - | Ukuran file (bytes) |
| mime_type | TEXT | - | MIME type |
| external_url | TEXT | - | URL eksternal (jika link) |
| visibility_scope | TEXT | DEFAULT 'all', CHECK | Scope (all, stations, roles, targeted) |
| audience_station_ids | TEXT[] | DEFAULT '{}' | Array ID station |
| audience_roles | TEXT[] | DEFAULT '{}' | Array role |
| created_by | UUID | FK → users.id, NOT NULL | ID pembuat |
| updated_by | UUID | FK → users.id, NOT NULL | ID pengupdate |
| is_active | BOOLEAN | DEFAULT true | Status aktif |
| created_at | TIMESTAMPTZ | DEFAULT now() | Waktu pembuatan |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Waktu update |
| meeting_title | TEXT | - | Judul meeting (jika terkait) |
| meeting_date | DATE | - | Tanggal meeting |
| audience_label | TEXT | - | Label audience |
| meeting_event_id | UUID | FK → calendar_events.id | Event meeting terkait |
| activity_pic | TEXT | - | PIC kegiatan |
| activity_location | TEXT | - | Lokasi kegiatan |

**Current Records**: 4 documents

#### 15. hc_leave_records
**Deskripsi**: Cuti pegawai (HC)

| Column | Type | Constraint | Deskripsi |
|--------|-------|-------------|------------|
| id | UUID | PRIMARY KEY | Unique record ID |
| employee_name | TEXT | NOT NULL | Nama pegawai |
| leave_type | TEXT | NOT NULL | Tipe cuti |
| start_date | DATE | NOT NULL | Tanggal mulai |
| end_date | DATE | NOT NULL | Tanggal akhir |
| station_id | TEXT | FK → stations.id | ID station |
| division_name | TEXT | - | Nama divisi |
| unit_name | TEXT | - | Nama unit |
| pic_name | TEXT | - | Nama PIC |
| pic_email | TEXT | - | Email PIC |
| pic_phone | TEXT | - | Telepon PIC |
| notes | TEXT | - | Catatan |
| created_by | UUID | FK → users.id, NOT NULL | ID pembuat |
| updated_by | UUID | FK → users.id, NOT NULL | ID pengupdate |
| created_at | TIMESTAMPTZ | DEFAULT now() | Waktu pembuatan |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Waktu update |
| submission_status | TEXT | DEFAULT 'PENDING', CHECK | Status (PENDING, APPROVED, REJECTED) |
| reviewed_by | UUID | FK → users.id | ID reviewer |
| reviewed_at | TIMESTAMPTZ | - | Waktu review |
| review_notes | TEXT | - | Catatan review |
| is_deleted | BOOLEAN | DEFAULT false | Status hapus (soft delete) |
| deleted_at | TIMESTAMPTZ | - | Waktu hapus |
| deleted_by | UUID | FK → users.id | ID penghapus |
| employee_email | TEXT | - | Email pegawai |
| employee_phone | TEXT | - | Telepon pegawai |

**Current Records**: 5 records

#### 16. notification_recipients
**Deskripsi**: Penerima notifikasi

| Column | Type | Constraint | Deskripsi |
|--------|-------|-------------|------------|
| id | UUID | PRIMARY KEY | Unique recipient ID |
| entity | TEXT | NOT NULL | Entitas (division, station, etc.) |
| channel | TEXT | NOT NULL, CHECK | Channel (EMAIL) |
| recipient_email | TEXT | NOT NULL | Email penerima |
| enabled | BOOLEAN | DEFAULT true | Status aktif |
| created_at | TIMESTAMPTZ | DEFAULT now() | Waktu pembuatan |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Waktu update |

**Current Records**: 2 recipients

#### 17. notification_delivery_log
**Deskripsi**: Log pengiriman notifikasi

| Column | Type | Constraint | Deskripsi |
|--------|-------|-------------|------------|
| id | UUID | PRIMARY KEY | Unique log ID |
| fingerprint | TEXT | UNIQUE, NOT NULL | Fingerprint untuk dedupe |
| entity | TEXT | NOT NULL | Entitas target |
| channel | TEXT | NOT NULL, CHECK | Channel (EMAIL) |
| recipient_email | TEXT | NOT NULL | Email penerima |
| subject | TEXT | NOT NULL | Subject email |
| payload | JSONB | DEFAULT '{}' | Data notifikasi |
| status | TEXT | DEFAULT 'pending', CHECK | Status (pending, sent, skipped, failed) |
| error_message | TEXT | - | Pesan error |
| created_at | TIMESTAMPTZ | DEFAULT now() | Waktu pembuatan |
| sent_at | TIMESTAMPTZ | - | Waktu pengiriman |

**Current Records**: 28 delivery logs

#### 18. sync_state
**Deskripsi**: State sinkronisasi

| Column | Type | Constraint | Deskripsi |
|--------|-------|-------------|------------|
| source | TEXT | PRIMARY KEY | Sumber sync |
| last_sync_at | TIMESTAMPTZ | - | Waktu sync terakhir |
| sync_version | BIGINT | DEFAULT 0 | Versi sync |
| status | TEXT | DEFAULT 'idle' | Status (idle, running, error) |
| locked_until | TIMESTAMPTZ | - | Waktu unlock |
| last_error | TEXT | - | Pesan error terakhir |
| row_count | INTEGER | DEFAULT 0 | Jumlah baris |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Waktu update |

#### 19. dashboard_cache_entries
**Deskripsi**: Cache untuk query dashboard

| Column | Type | Constraint | Deskripsi |
|--------|-------|-------------|------------|
| cache_key | TEXT | PRIMARY KEY | Unique cache key |
| scope_key | TEXT | NOT NULL | Scope identifier |
| dashboard_slug | TEXT | NOT NULL | Slug dashboard |
| tile_id | UUID | - | ID tile/chart |
| payload | JSONB | NOT NULL | Data tercache |
| expires_at | TIMESTAMPTZ, NOT NULL | Waktu expiry |
| sync_version | BIGINT | DEFAULT 0 | Versi sync |
| created_at | TIMESTAMPTZ | DEFAULT now() | Waktu pembuatan |

**Current Records**: 81 cache entries

#### 20. security_configs
**Deskripsi**: Konfigurasi keamanan

| Column | Type | Constraint | Deskripsi |
|--------|-------|-------------|------------|
| key | TEXT | PRIMARY KEY | Konfig key |
| value | JSONB | NOT NULL | Nilai konfigurasi |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Waktu update |

**Current Records**: 1 config

#### 21. external_links
**Deskripsi**: Link eksternal (forms, dashboards, dll.)

| Column | Type | Constraint | Deskripsi |
|--------|-------|-------------|------------|
| id | TEXT | PRIMARY KEY | Unique link ID |
| label | TEXT | NOT NULL | Label tampilan |
| url | TEXT | NOT NULL | URL tujuan |
| category | TEXT | NOT NULL, CHECK | Kategori (google_forms, looker_studio, other) |
| description | TEXT | DEFAULT '' | Deskripsi |
| sort_order | INTEGER | DEFAULT 0 | Urutan tampilan |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Waktu update |

**Current Records**: 25 links

**RLS Enabled**: Yes

### Tabel Tambahan (Tanpa Data)

#### 22. units
Master data untuk unit organisasi

#### 23. positions
Master data untuk posisi/jabatan

#### 24. incident_types
Master data untuk tipe insiden

#### 25. locations
Master data untuk lokasi spesifik

#### 26. blocked_ips
IP addresses yang diblokir (security)

#### 27. security_alerts
Alert keamanan yang terdeteksi

#### 28. query_performance_stats
Statistik performa query

#### 29. rate_limits
Rate limiting untuk API

### Relationship Diagram

```
users (1) ──< reports (N)
users (1) ──< reports_sync (N)
users (1) ──< report_comments (N)
users (1) ──< calendar_events (N)
users (1) ──< division_documents (N)
users (1) ──< hc_leave_records (N)
users (1) ──< audit_logs (N)
users (1) ──< security_events (N)
users (1) ──< security_sessions (N)
users (1) ──< custom_dashboards (N)
users (1) ──< ai_audit_logs (N)
users (1) ──< security_alerts (N)

stations (1) ──< users (N)
stations (1) ──< hc_leave_records (N)
stations (1) ──< locations (N)
stations (1) ──< reports_sync (N)

calendar_events (1) ──< calendar_events (N) [recursive]
calendar_events (1) ──< division_documents (N)

custom_dashboards (1) ──< dashboard_charts (N)

reports_sync (1) ──< report_comments (N)
```

### Database Indexes

**Primary Keys**: Semua tabel memiliki primary key pada `id`

**Unique Constraints**:
- `users.email`
- `stations.code`
- `reports_sync.sheet_id`
- `security_sessions.session_id`
- `custom_dashboards.slug`
- `notification_delivery_log.fingerprint`

**Foreign Key Constraints**:
- `users.station_id` → `stations.id`
- `security_sessions.user_id` → `users.id`
- `reports.user_id` → `users.id`
- `reports_sync.user_id` → `users.id`
- `report_comments.user_id` → `users.id`
- `calendar_events.created_by` → `users.id`
- `division_documents.created_by` → `users.id`
- `hc_leave_records.station_id` → `stations.id`
- `hc_leave_records.created_by` → `users.id`
- `ai_audit_logs.user_id` → `users.id`

---


## 🔒 KEAMANAN & SECURITY

### Authentication Security

#### Password Policy
- **Hashing Algorithm**: bcrypt dengan 10 salt rounds
- **Password Requirements** (recommended):
  - Minimum 8 karakter
  - Mengandung huruf besar dan kecil
  - Mengandung angka
  - Mengandung simbol khusus
- **Password Storage**: Hashed, bukan plain text

#### Session Management
- **Session Token**: JWT dengan HS256 signing
- **Token Expiry**: 24 jam
- **Token Payload**:
  ```json
  {
    "id": "user_uuid",
    "email": "user@example.com",
    "role": "DIVISI_OS",
    "sid": "session_uuid",
    "iat": 1234567890,
    "exp": 1234653890
  }
  ```
- **Session Storage**: 
  - HTTP-only cookie (secure, httpOnly, sameSite: strict)
  - Database record (security_sessions table)
  - In-memory cache (15 menit TTL)

#### Role-Based Access Control (RBAC)

**Role Hierarchy**:
```
SUPER_ADMIN (Level 10)
├── DIVISI_ESKALASI (Level 9)
├── ANALYST (Level 8)
└── Division Heads (Level 7)
    ├── DIVISI_OS (Level 6)
    ├── DIVISI_OP (Level 6)
    ├── DIVISI_HC (Level 6)
    └── DIVISI_HT (Level 6)
        └── MANAGER_CABANG (Level 5)
            └── STAFF_CABANG (Level 4)
```

**Permission Matrix**:

| Resource | SUPER_ADMIN | DIVISI_ESKALASI | ANALYST | DIVISI_* | MANAGER_CABANG | STAFF_CABANG |
|----------|--------------|-------------------|----------|-----------|-----------------|---------------|
| User Management | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| All Reports | ✓ | ✓ | ✓ | Division only | Station only | Own only |
| Create Report | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Edit Own Report | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Edit All Reports | ✓ | ✗ | ✓ | Division only | ✗ | ✗ |
| Delete Report | ✓ | ✗ | ✓ | Division only | ✗ | ✗ |
| Dashboard Builder | ✓ | ✗ | ✓ | Division only | ✗ | ✗ |
| Security Dashboard | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| System Config | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Calendar (All) | ✓ | ✗ | ✗ | Division only | ✗ | ✗ |
| Calendar (Own) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Documents (All) | ✓ | ✗ | ✗ | Division only | ✗ | ✗ |
| Documents (Own) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

### API Security

#### Headers Security
**Next.js Configuration** (next.config.mjs):
```javascript
headers: async () => [
  {
    source: "/(.*)",
    headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-XSS-Protection", value: "1; mode=block" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self)" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' https://vercel.live",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          "img-src 'self' data: blob: https:",
          "connect-src 'self' https:",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join("; "),
      },
    ],
  },
]
```

**Security Headers Explained**:
1. **X-Content-Type-Options**: Mencegah MIME sniffing
2. **X-Frame-Options**: Mencegah clickjacking
3. **X-XSS-Protection**: Mengaktifkan XSS filter browser
4. **Referrer-Policy**: Mengontrol referrer info
5. **Permissions-Policy**: Mengontrol browser features (kamera, mikrofon, geolokasi)
6. **Strict-Transport-Security (HSTS)**: Memaksa HTTPS
7. **Content-Security-Policy (CSP)**: Mencegah XSS, data injection

#### Rate Limiting
**Implementation**:
- Custom rate limiting di `rate_limits` table
- Per-IP tracking
- Per-endpoint limits
- Automatic cleanup expired entries

**Default Limits**:
- Login attempts: 5 per 15 menit
- API requests: 100 per menit
- Report submission: 10 per jam

#### Input Validation
**Server-side validation**:
- Email format validation
- Password strength check
- XSS sanitization
- SQL injection prevention (via parameterized queries)
- File type validation
- File size limits

**Zod Schema Validation**:
```typescript
// Example: Report creation schema
const reportSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(5000),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  location: z.string().optional(),
  flight_number: z.string().regex(/^FL\d{4}$/).optional(),
  // ... more fields
});
```

### Data Security

#### Encryption
- **Password**: bcrypt (one-way hash)
- **JWT**: HS256 signing
- **Data at Rest**: PostgreSQL encryption (opsional, belum diimplementasikan)
- **Data in Transit**: HTTPS/TLS 1.3

#### Privacy & PII
**Personal Identifiable Information (PII)**:
- Email addresses
- Full names
- Phone numbers
- NIK (Indonesian ID)

**Protection Measures**:
- RLS (Row Level Security) pada sensitive tables
- Audit logs untuk semua akses data PII
- Restricted access berdasarkan role
- Data retention policy (belum didefinisikan)

#### File Upload Security
**Validation**:
- File type whitelist (images, PDF, Office docs)
- File size limits (max 10MB per file)
- Virus scanning (belum diimplementasikan)
- Secure filename generation

**Storage**:
- Supabase Storage dengan signed URLs
- Public access hanya dengan token
- Automatic cleanup files lama (belum diimplementasikan)

### Audit & Logging

#### Audit Logs
**Table**: `audit_logs`

**Tracked Actions**:
- User creation, update, deletion
- Report creation, update, status change
- Session creation, revocation
- Document upload, deletion
- Configuration changes

**Audit Log Entry**:
```json
{
  "id": "uuid",
  "actor_id": "user_uuid",
  "action": "UPDATE",
  "entity_type": "report",
  "entity_id": "report_uuid",
  "old_value": { "status": "OPEN" },
  "new_value": { "status": "IN_PROGRESS" },
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0...",
  "created_at": "2025-04-20T10:30:00Z"
}
```

#### Security Events
**Table**: `security_events`

**Event Types**:
- LOGIN_SUCCESS
- LOGIN_FAILED
- SESSION_REVOKED
- UNAUTHORIZED_ACCESS
- RATE_LIMIT_EXCEEDED
- SUSPICIOUS_ACTIVITY
- DATA_BREACH_ATTEMPT

**Severity Levels**:
- LOW: Informational events
- MEDIUM: Potentially concerning
- HIGH: Definitely concerning
- CRITICAL: Immediate action required

#### AI Usage Logging
**Table**: `ai_audit_logs`

**Tracked Data**:
- User ID
- Feature used
- Prompt sent
- Response received
- Model used
- Execution time
- Status (success/error)
- Error messages

**Purpose**:
- Cost monitoring
- Abuse detection
- Performance tracking
- Compliance documentation

### Access Control

#### Middleware (proxy.ts)
**Protected Routes**:
- `/dashboard/*` - Semua dashboard routes
- `/api/*` - Semua API routes (kecuali public)

**Public Routes**:
- `/auth/*` - Authentication pages
- `/embed/*` - Embedded dashboards
- `/api/auth/*` - Auth endpoints
- `/api/reports/public` - Public report submission
- `/api/master-data` - Master data
- `/api/uploads/evidence/token` - Evidence upload tokens

**Role-Based Route Protection**:
```typescript
// Example: Admin dashboard protection
if (path.startsWith('/dashboard/admin') && role !== 'SUPER_ADMIN') {
  return NextResponse.redirect(new URL('/dashboard/employee', request.url));
}

// Example: Division dashboard protection
if (path.startsWith('/dashboard/os') && !['DIVISI_OS', 'PARTNER_OS'].includes(role)) {
  return NextResponse.redirect(new URL('/dashboard/employee', request.url));
}
```

#### Row Level Security (RLS)
**Enabled Tables**:
- `audit_logs`
- `report_comments`
- `calendar_events`
- `external_links`

**RLS Policies** (contoh):
```sql
-- Policy: Users hanya bisa lihat komentar report dari divisi mereka
CREATE POLICY comments_division_policy ON report_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM reports
    WHERE reports.sheet_id = report_comments.report_id
    AND reports.station_id IN (
      SELECT station_id FROM users WHERE id = auth.uid()
    )
  )
);

-- Policy: Users hanya bisa edit report mereka sendiri
CREATE POLICY reports_own_policy ON reports
FOR UPDATE
USING (user_id = auth.uid());
```

---

## 🚀 MIGRASI KE UBUNTU SERVER + POSTGRESQL

### Prerequisites

#### Hardware Requirements

**Minimum** (untuk development/testing):
- CPU: 2 cores
- RAM: 4 GB
- Storage: 50 GB SSD
- Network: 100 Mbps

**Recommended** (untuk production):
- CPU: 4+ cores
- RAM: 8+ GB
- Storage: 100+ GB SSD
- Network: 1 Gbps
- Backup storage: 500 GB

#### Software Requirements

**Operating System**:
- Ubuntu 20.04 LTS atau 22.04 LTS
- User dengan sudo privileges

**Required Software**:
- Node.js 20.9.0+ (via nvm atau NodeSource)
- npm 10+ (bundled dengan Node.js)
- PostgreSQL 14+ atau 15+
- Nginx 1.18+ (reverse proxy)
- PM2 5+ (process manager)
- Git 2.x
- SSL certificate (Let's Encrypt atau commercial)

**Optional but Recommended**:
- Redis 6+ (untuk caching, session store)
- Docker & Docker Compose (containerization)
- Prometheus + Grafana (monitoring)
- AWS S3 atau MinIO (object storage)

---

### Langkah-Langkah Migrasi

#### Step 1: Persiapan Server

##### 1.1 Update System
```bash
# Update package list
sudo apt update

# Upgrade installed packages
sudo apt upgrade -y

# Install basic tools
sudo apt install -y curl wget git vim unzip build-essential
```

##### 1.2 Setup Firewall
```bash
# Install UFW (Uncomplicated Firewall)
sudo apt install -y ufw

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp  # Untuk development
sudo ufw enable

# Check status
sudo ufw status
```

##### 1.3 Setup Timezone
```bash
# Set timezone ke Asia/Jakarta
sudo timedatectl set-timezone Asia/Jakarta

# Verify
timedatectl
```

#### Step 2: Install Node.js

##### 2.1 Install Node.js via NodeSource
```bash
# Download Node.js setup script
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
node --version  # Should be v20.9.0 or higher
npm --version   # Should be v10 or higher
```

##### 2.2 Configure npm
```bash
# Create .npmrc for production
sudo npm config set prefix /usr/local

# Configure npm cache location (opsional)
sudo npm config set cache /tmp/npm-cache

# Set production registry (opsional)
sudo npm config set registry https://registry.npmjs.org/
```

#### Step 3: Install PostgreSQL

##### 3.1 Install PostgreSQL
```bash
# Add PostgreSQL repository
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'

# Import repository signing key
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg

# Update package list
sudo apt update

# Install PostgreSQL 15
sudo apt install -y postgresql-15 postgresql-contrib-15

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Check status
sudo systemctl status postgresql
```

##### 3.2 Create Database and User
```bash
# Switch to postgres user
sudo -u postgres psql

# Dalam PostgreSQL shell:
-- Create database user
CREATE USER gapura_irrs WITH PASSWORD 'secure_password_here';

-- Create database
CREATE DATABASE gapura_irrs OWNER gapura_irrs;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE gapura_irrs TO gapura_irrs;

-- Exit psql
\q
```

##### 3.3 Configure PostgreSQL (postgresql.conf)
```bash
# Edit configuration
sudo vim /etc/postgresql/15/main/postgresql.conf

# Ubah/tambah setting berikut:
# Connections
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB

# Performance
work_mem = 16MB
maintenance_work_mem = 128MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100

# Logging
log_destination = 'stderr'
logging_collector = 'on'
log_directory = 'pg_log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_min_duration_statement = 1000  # Log queries > 1s
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '

# Save and exit

# Restart PostgreSQL
sudo systemctl restart postgresql
```

##### 3.4 Configure pg_hba.conf (Authentication)
```bash
# Edit pg_hba.conf
sudo vim /etc/postgresql/15/main/pg_hba.conf

# Ubah/tambah setting berikut:
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             postgres                                peer
local   all             all                                     peer
host    all             all             127.0.0.1/32          scram-sha-256
host    all             all             ::1/128                 scram-sha-256
# Untuk koneksi dari aplikasi (ganti IP server kamu)
host    gapura_irrs     gapura_irrs     0.0.0.0/0              scram-sha-256

# Save and exit

# Reload configuration
sudo systemctl reload postgresql
```

#### Step 4: Migrasi Database dari Supabase

##### 4.1 Export Data dari Supabase

**Method A: Via Supabase Dashboard**
1. Login ke Supabase Dashboard
2. Masuk ke project Gapura IRRS
3. Buka tab "Database"
4. Klik "Backups"
5. Download backup terbaru

**Method B: Via pg_dump**
```bash
# Install PostgreSQL client tools di local machine
# (macOS)
brew install postgresql
# (Ubuntu)
sudo apt install -y postgresql-client

# Export dari Supabase
pg_dump -h db.iahgbzjdnfbtlrizottx.supabase.co \
         -U postgres \
         -d postgres \
         -f gapura_irrs_backup.sql

# Atau export hanya public schema
pg_dump -h db.iahgbzjdnfbtlrizottx.supabase.co \
         -U postgres \
         -d postgres \
         -n public \
         -f gapura_irrs_public_backup.sql
```

##### 4.2 Import Data ke PostgreSQL Lokal

**Transfer file ke server**:
```bash
# Via SCP
scp gapura_irrs_backup.sql user@your-server:/tmp/

# Atau via rsync
rsync -avz gapura_irrs_backup.sql user@your-server:/tmp/
```

**Import ke database**:
```bash
# SSH ke server
ssh user@your-server

# Import database
psql -U gapura_irrs -d gapura_irrs < /tmp/gapura_irrs_backup.sql

# Verifikasi import
psql -U gapura_irrs -d gapura_irrs -c "\dt"
psql -U gapura_irrs -d gapura_irrs -c "SELECT COUNT(*) FROM users;"
psql -U gapura_irrs -d gapura_irrs -c "SELECT COUNT(*) FROM reports_sync;"
```

##### 4.3 Migrasi Storage (Supabase Storage → Local Storage)

**Opsional 1: S3-compatible Storage (MinIO)**
```bash
# Install MinIO
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio
sudo mv minio /usr/local/bin/

# Create directories
sudo mkdir -p /data/minio
sudo chown -R $USER:$USER /data/minio

# Start MinIO
minio server /data/minio --console-address ":9001"

# Access web UI: http://server-ip:9001
# Default credentials: minioadmin / minioadmin
```

**Opsional 2: Local Filesystem Storage**
```bash
# Create storage directory
sudo mkdir -p /var/www/gapura-irrs/storage/evidence
sudo mkdir -p /var/www/gapura-irrs/storage/documents
sudo mkdir -p /var/www/gapura-irrs/storage/avatars

# Set permissions
sudo chown -R www-data:www-data /var/www/gapura-irrs/storage
sudo chmod -R 755 /var/www/gapura-irrs/storage
```

#### Step 5: Deploy Application

##### 5.1 Clone Repository
```bash
# Clone repository
cd /var/www
sudo git clone https://github.com/your-org/gapura-oneclick.git
cd gapura-oneclick

# Atau copy dari local
rsync -avz /local/path/to/gapura-oneclick/ user@server:/var/www/gapura-oneclick/
```

##### 5.2 Install Dependencies
```bash
# Install dependencies
npm ci --production

# Atau install dengan development dependencies
npm install
```

##### 5.3 Configure Environment Variables
```bash
# Create .env file
cp .env.example .env

# Edit .env
vim .env
```

**Environment Variables untuk Ubuntu Server**:
```bash
# PostgreSQL
POSTGRES_URL=postgresql://gapura_irrs:secure_password@localhost:5432/gapura_irrs
POSTGRES_PRISMA_URL=postgresql://gapura_irrs:secure_password@localhost:5432/gapura_irrs

# App Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Authentication
JWT_SECRET=super_secure_random_string_min_32_chars
QUICK_ACCESS_PASSWORD=<strong-random-password>
DIVISION_PASSWORD_OS=<strong-random-password>
DIVISION_PASSWORD_HC=<strong-random-password>

# AI Services
OPENROUTER_API_KEY=your_openrouter_api_key
AI_SERVICE_URL=https://your-ai-service.com
NEXT_PUBLIC_AI_SERVICE_URL=https://your-ai-service.com

# Google Sheets (opsional, jika masih digunakan)
GOOGLE_SHEET_ID=your_sheet_id
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
GOOGLE_SERVICE_ACCOUNT_EMAIL=service@account.iam.gserviceaccount.com

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
GMAIL_SMTP_USER=your-email@gmail.com
GMAIL_SMTP_APP_PASSWORD=your_app_password
NOTIFICATION_FROM_EMAIL=noreply@your-domain.com

# Storage Configuration
# Jika menggunakan local filesystem
STORAGE_TYPE=local
STORAGE_PATH=/var/www/gapura-irrs/storage

# Jika menggunakan S3/MinIO
STORAGE_TYPE=s3
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=gapura-irrs
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_REGION=us-east-1
```

**Generate Secure Random String**:
```bash
# Generate JWT_SECRET
openssl rand -base64 32

# Generate API keys
openssl rand -hex 16
```

##### 5.4 Build Application
```bash
# Build untuk production
npm run build

# Build output ada di .next directory
```

##### 5.5 Install PM2
```bash
# Install PM2 globally
sudo npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'gapura-irrs',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/gapura-oneclick',
    instances: 2,  // Gunakan jumlah core CPU - 1
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/gapura-irrs/error.log',
    out_file: '/var/log/gapura-irrs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '1G',
    env_production: {
      NODE_ENV: 'production'
    }
  }]
};
EOF
```

##### 5.6 Start Application dengan PM2
```bash
# Create log directory
sudo mkdir -p /var/log/gapura-irrs
sudo chown -R $USER:$USER /var/log/gapura-irrs

# Start application
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup PM2 startup script
pm2 startup systemd -u "$USER" --hp "$HOME"

# Start PM2 on boot
sudo systemctl enable pm2-$USER
sudo systemctl start pm2-$USER

# Check status
pm2 status
pm2 logs gapura-irrs
pm2 monit
```

#### Step 6: Configure Nginx

##### 6.1 Install Nginx
```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

##### 6.2 Configure Nginx Reverse Proxy
```bash
# Create site configuration
sudo vim /etc/nginx/sites-available/gapura-irrs
```

**Nginx Configuration**:
```nginx
# Upstream configuration untuk PM2
upstream gapura_irrs {
    server 127.0.0.1:3000;
    keepalive 64;
}

# Server configuration
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com www.your-domain.com;

    # Redirect HTTP ke HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Certificate
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(self), microphone=(), geolocation=(self)" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # Client Body Size Limit
    client_max_body_size 50M;

    # Logging
    access_log /var/log/nginx/gapura-irrs-access.log;
    error_log /var/log/nginx/gapura-irrs-error.log;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # Proxy Configuration
    location / {
        proxy_pass http://gapura_irrs;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
    }

    # Static files cache
    location /_next/static/ {
        proxy_pass http://gapura_irrs;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, immutable, max-age=31536000";
    }

    location /static/ {
        proxy_pass http://gapura_irrs;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, immutable, max-age=31536000";
    }
}
```

##### 6.3 Enable Site
```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/gapura-irrs /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

#### Step 7: Setup SSL Certificate (Let's Encrypt)

##### 7.1 Install Certbot
```bash
# Install Certbot dan Nginx plugin
sudo apt install -y certbot python3-certbot-nginx
```

##### 7.2 Obtain SSL Certificate
```bash
# Obtain certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Follow prompts:
# 1. Enter email
# 2. Agree to terms
# 3. Choose redirect option (recommended: 2 - Redirect HTTP to HTTPS)

# Certificate akan otomatis diinstal ke Nginx
```

##### 7.3 Setup Auto-Renewal
```bash
# Test renewal
sudo certbot renew --dry-run

# Cron job untuk auto-renewal
sudo crontab -e

# Tambahkan baris berikut (check twice daily):
0 0,12 * * * root certbot renew --quiet --post-hook "systemctl reload nginx"

# Save dan exit
```

---

### Migrasi Autentikasi

#### Perbedaan Supabase Auth vs Custom JWT

**Supabase Auth** (saat ini TIDAK digunakan):
- Built-in user management
- Built-in session handling
- Built-in social providers
- Row Level Security (RLS) integration

**Custom JWT** (saat ini DIGUNAKAN):
- Full control atas user management
- Custom session handling
- Custom role-based access
- Manual JWT signing/verification
- Custom database integration

#### Langkah Migrasi Auth

##### Langkah 1: Maintain Password Hashes
**Tidak perlu migrasi** - Password sudah hashed dengan bcrypt di Supabase.
**Verifikasi**:
```sql
SELECT id, email, password FROM users LIMIT 5;
```
Password harus dalam format: `$2a$10$...` (bcrypt)

##### Langkah 2: Migrasi JWT Secret
**Dari Environment Variable**:
- Saat ini: gunakan `JWT_SECRET` kuat dari secret manager, bukan nilai hardcoded
- Di Ubuntu Server: Gunakan secret yang sama untuk backward compatibility

**Atau Generate Secret Baru**:
```bash
# Generate new secret
openssl rand -base64 32

# Update di .env
JWT_SECRET=new_secret_here
```

**Catatan**: Jika secret diganti, semua session akan invalid. User perlu login ulang.

##### Langkah 3: Migrasi Session Management
**Supabase Auth Sessions**: Tidak digunakan
**Custom Sessions**: `security_sessions` table

**Struktur Session Custom**:
```sql
CREATE TABLE security_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    session_id TEXT UNIQUE NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    device_name TEXT,
    is_revoked BOOLEAN DEFAULT false,
    last_active TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

**Tidak perlu migrasi** - Table sudah ada dan digunakan.

##### Langkah 4: Update Auth Utils (opsional)
**File**: `lib/auth-utils.ts`

**Jika mengganti dari Supabase Auth ke murni PostgreSQL**:
```typescript
// Ganti supabaseAdmin dengan direct PostgreSQL client
// atau gunakan Prisma ORM

import { Pool } from 'pg';
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL
});

// Update fungsi registerSession
export async function registerSession(userId: string, sid: string, ip: string | null, ua: string | null) {
  await pool.query(
    'INSERT INTO security_sessions (user_id, session_id, ip_address, user_agent, expires_at) VALUES ($1, $2, $3, $4, $5)',
    [userId, sid, ip, ua, new Date(Date.now() + 86400000)]
  );
}

// Update fungsi verifySession
export async function verifySession(token: string): Promise<SessionPayload | null> {
  const payload = await readSessionPayload(token);
  if (!payload) return null;

  if (payload.sid) {
    const result = await pool.query(
      'SELECT is_revoked, last_active FROM security_sessions WHERE session_id = $1',
      [payload.sid]
    );
    const data = result.rows[0];
    if (data?.is_revoked) {
      return null;
    }
    // ... update last_active logic
  }
  return payload;
}
```

##### Langkah 5: Update API Routes (opsional)
**Jika mengganti auth implementation**, update semua API routes untuk menggunakan PostgreSQL direct atau Prisma.

---

### Migrasi Upload Evidence

#### Dari Supabase Storage ke Local Storage

##### Opsi 1: Local Filesystem Storage

**Setup**:
```bash
# Create storage directories
sudo mkdir -p /var/www/gapura-irrs/storage/evidence
sudo mkdir -p /var/www/gapura-irrs/storage/documents
sudo mkdir -p /var/www/gapura-irrs/temp-uploads

# Set ownership
sudo chown -R www-data:www-data /var/www/gapura-irrs/storage
sudo chmod -R 755 /var/www/gapura-irrs/storage
```

**Update API Routes**:
```typescript
// app/api/uploads/evidence/route.ts

import fs from 'fs/promises';
import path from 'path';

const STORAGE_PATH = process.env.STORAGE_PATH || '/var/www/gapura-irrs/storage';

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  
  // Generate unique filename
  const filename = `evidence_${Date.now()}_${file.name}`;
  const filepath = path.join(STORAGE_PATH, 'evidence', filename);
  
  // Save file
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.writeFile(filepath, buffer);
  
  // Generate URL
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/storage/evidence/${filename}`;
  
  return Response.json({ success: true, url, filename });
}
```

**Nginx Configuration untuk File Serving**:
```nginx
location /storage/ {
    alias /var/www/gapura-irrs/storage/;
    internal;  # Hanya akses via application, bukan langsung
    
    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header Cache-Control "public, max-age=31536000";
}
```

##### Opsi 2: S3-Compatible Storage (MinIO/AWS S3)

**Setup MinIO**:
```bash
# Install MinIO (lihat Step 4.3)
# Atau gunakan AWS S3, Wasabi, dll.
```

**Update API Routes dengan AWS SDK**:
```typescript
// app/api/uploads/evidence/route.ts

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
});

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  
  // Generate key
  const key = `evidence/${Date.now()}_${file.name}`;
  
  // Upload to S3
  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: await file.arrayBuffer(),
    ContentType: file.type,
  }));
  
  // Generate URL
  const url = `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/${key}`;
  
  return Response.json({ success: true, url, key });
}
```

#### Migrasi URL Evidence di Database

**Current State** (Supabase):
- `evidence_urls` berisi URL Supabase Storage:
  - `https://iahgbzjdnfbtlrizottx.supabase.co/storage/v1/object/public/evidence/xxx.jpg`

**Migration Strategy**:
```sql
-- Update semua URLs ke new base URL
UPDATE reports_sync
SET evidence_urls = array_replace(
  evidence_urls,
  'https://iahgbzjdnfbtlrizottx.supabase.co/storage/v1/object/public/',
  'https://your-domain.com/storage/evidence/'
)
WHERE evidence_urls IS NOT NULL;

-- Atau migrasi data actual (jika ingin download ulang)
-- Perlu script terpisah untuk download dari Supabase dan upload ke local storage
```

**Download and Re-upload Script** (opsional):
```bash
#!/bin/bash
# download-reupload-evidence.sh

# Download dari Supabase
for url in $(psql -U gapura_irrs -d gapura_irrs -t -A -c "SELECT unnest(evidence_urls) FROM reports_sync WHERE evidence_urls IS NOT NULL;"); do
  filename=$(basename "$url")
  echo "Downloading: $filename"
  curl -o "/tmp/evidence/$filename" "$url"
done

# Upload ke local storage
for file in /tmp/evidence/*; do
  filename=$(basename "$file")
  new_url="https://your-domain.com/storage/evidence/$filename"
  
  # Update database
  psql -U gapura_irrs -d gapura_irrs -c "UPDATE reports_sync SET evidence_urls = array_replace(evidence_urls, '$(basename $file)', '$new_url') WHERE '$filename' = ANY(evidence_urls);"
done
```

---

### Migrasi Dokumen

#### Dari Supabase Storage ke Local Storage

**Setup direktori dokumen**:
```bash
sudo mkdir -p /var/www/gapura-irrs/storage/documents/hc
sudo mkdir -p /var/www/gapura-irrs/storage/documents/ht
sudo chown -R www-data:www-data /var/www/gapura-irrs/storage/documents
sudo chmod -R 755 /var/www/gapura-irrs/storage/documents
```

**Update API untuk Dokumen**:
```typescript
// app/api/division-documents/route.ts

import fs from 'fs/promises';
import path from 'path';

const STORAGE_PATH = process.env.STORAGE_PATH || '/var/www/gapura-irrs/storage';

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const division = formData.get('division') as string; // 'HC' or 'HT'
  const category = formData.get('category') as string;
  
  // Generate path berdasarkan divisi
  const filename = `${category}_${Date.now()}_${file.name}`;
  const filepath = path.join(STORAGE_PATH, 'documents', division.toLowerCase(), filename);
  
  // Save file
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filepath, buffer);
  
  // Generate URL
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/storage/documents/${division.toLowerCase()}/${filename}`;
  
  // Save ke database
  const { data, error } = await supabase
    .from('division_documents')
    .insert({
      title: formData.get('title'),
      description: formData.get('description'),
      division: division,
      category: category,
      source_type: 'upload',
      file_url: url,
      file_name: filename,
      file_size: file.size,
      mime_type: file.type,
      created_by: userId,
      updated_by: userId,
    })
    .select()
    .single();
  
  return Response.json({ success: true, data });
}
```

#### Update URLs di Database
```sql
-- Update file URLs di division_documents
UPDATE division_documents
SET file_url = replace(
  file_url,
  'https://iahgbzjdnfbtlrizottx.supabase.co/storage/v1/object/public/',
  'https://your-domain.com/storage/documents/'
)
WHERE file_url LIKE 'https://iahgbzjdnfbtlrizottx.supabase.co/%';

-- Update external URLs (jika ada)
UPDATE division_documents
SET external_url = replace(
  external_url,
  'https://iahgbzjdnfbtlrizottx.supabase.co/storage/v1/object/public/',
  'https://your-domain.com/storage/documents/'
)
WHERE external_url LIKE 'https://iahgbzjdnfbtlrizottx.supabase.co/%';
```

---

### Migrasi Google Sheets Sync

#### Tidak Perlu Perubahan Jika
Google Sheets sync tetap bisa berjalan dengan setup yang sama, karena:
- Environment variables (`GOOGLE_SHEET_ID`, `GOOGLE_PRIVATE_KEY`, dll.) sama
- Sync logic ada di server-side code, tidak tergantung Supabase
- Sinkronisasi langsung ke PostgreSQL (`reports_sync` table)

#### Perlu Update Jika
Jika ingin mengganti ke different sheet atau authentication:

```bash
# Update environment variables di .env
GOOGLE_SHEET_ID=new_sheet_id_here
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
GOOGLE_SERVICE_ACCOUNT_EMAIL=new_service@account.iam.gserviceaccount.com

# Restart PM2 application
pm2 restart gapura-irrs

# Verify sync berjalan
pm2 logs gapura-irrs --lines 50
```

---


## ⭐ REKOMENDASI PRODUCTION

### Infrastructure Recommendations

#### 1. High Availability Setup

##### Load Balancing
**Rekomendasi**: Gunakan load balancer untuk mendistribusikan traffic

**Nginx Load Balancer Configuration**:
```nginx
upstream gapura_irrs_backend {
    server 10.0.0.1:3000 weight=1;
    server 10.0.0.2:3000 weight=1;
    server 10.0.0.3:3000 weight=1 backup;  # Backup server
    
    keepalive 32;
    keepalive_requests 100;
    keepalive_timeout 60s;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    location / {
        proxy_pass http://gapura_irrs_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

##### Database High Availability
**PostgreSQL Replication (Master-Slave)**:
```bash
# Setup replication (overview)
# 1. PostgreSQL Master (Primary)
# 2. PostgreSQL Slave (Replica)
# 3. PgBouncer (Connection pooling)
# 4. Failover mechanism

# Setup di master (postgresql.conf)
wal_level = replica
max_wal_senders = 3
max_replication_slots = 3
hot_standby_feedback = on

# Setup di slave (recovery.conf)
standby_mode = on
primary_conninfo = 'host=master-ip port=5432 user=replicator password=secret'
restore_command = 'cp /var/lib/postgresql/archive/%f %p'
archive_cleanup_command = 'rm /var/lib/postgresql/archive/%f'
```

**Opsional: Managed Database Service**
- AWS RDS PostgreSQL
- Google Cloud SQL
- Azure Database for PostgreSQL
- Supabase Pro (jika ingin tetap dengan Supabase)

#### 2. Caching Strategy

##### Redis Setup
**Install Redis**:
```bash
# Install Redis
sudo apt install -y redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Check status
sudo systemctl status redis-server

# Configure Redis
sudo vim /etc/redis/redis.conf

# Update settings:
# maxmemory 2gb
# maxmemory-policy allkeys-lru
# save 900 1
# save 300 10
# save 60 10000

# Restart Redis
sudo systemctl restart redis-server
```

**Integration dengan Next.js**:
```typescript
// lib/redis.ts
import { createClient } from 'redis';

const redis = createClient({
  host: 'localhost',
  port: 6379,
  password: process.env.REDIS_PASSWORD,
});

// Update lib/auth-utils.ts untuk menggunakan Redis cache
// Update lib/dashboard-cache.ts untuk menggunakan Redis cache
// Update lib/ai-cache.ts untuk menggunakan Redis cache
```

**Environment Variables**:
```bash
REDIS_URL=redis://:password@localhost:6379
REDIS_PASSWORD=your_redis_password
```

##### CDN Setup
**Rekomendasi**: Gunakan CDN untuk static assets

**Cloudflare Setup**:
1. Setup Cloudflare account
2. Add your domain
3. Point DNS ke Cloudflare
4. Configure caching rules:
   - Cache HTML: 2 hours
   - Cache CSS/JS: 1 year
   - Cache images: 1 year
   - Bypass cache untuk `/api/*`

**AWS CloudFront Setup**:
```bash
# Setup CloudFront distribution
# Origin: Nginx server or Load Balancer
# Behaviors:
#   - Static files: Cache everything
#   - API routes: Cache with TTL
#   - Dynamic content: No caching
```

#### 3. Monitoring & Alerting

##### Application Monitoring (APM)
**Tools Rekomendasi**:

**1. Prometheus + Grafana**:
```bash
# Install Prometheus
sudo apt install -y prometheus

# Install Grafana
sudo apt install -y grafana

# Configure Prometheus untuk scrape Next.js metrics
sudo vim /etc/prometheus/prometheus.yml
```

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'gapura-irrs'
    static_configs:
      - targets: ['localhost:9464']  # Next.js metrics endpoint
```

**2. Sentry (Error Tracking)**:
```bash
# Install Sentry SDK
npm install @sentry/nextjs

# Configure Sentry
# sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  integrations: [new Sentry.BrowserTracing()],
});
```

**3. New Relic**:
```bash
# Install New Relic agent
npm install newrelic

# Configure newrelic.js
exports.config = {
  app_name: ['Gapura IRRS'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  logging: {
    level: 'info',
  },
};
```

##### Database Monitoring
**Tools Rekomendasi**:

**1. pgAdmin**:
```bash
# Install pgAdmin4
docker run -p 80:80 \
  -e "PGADMIN_DEFAULT_EMAIL=admin@your-domain.com" \
  -e "PGADMIN_DEFAULT_PASSWORD=secure_password" \
  -d dpage/pgadmin4
```

**2. pgBadger**:
```bash
# Clone pgBadger
git clone https://github.com/darold/pgbadger.git
cd pgbadger

# Install dependencies
sudo apt install -y perl
```

**3. PostgreSQL Statistics Views**:
```sql
-- Create monitoring views
CREATE VIEW v_report_metrics AS
SELECT
    DATE_TRUNC('day', created_at) as report_date,
    COUNT(*) as total_reports,
    COUNT(*) FILTER (WHERE severity = 'high') as high_severity,
    COUNT(*) FILTER (WHERE severity = 'critical') as critical_severity,
    AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) as avg_resolution_hours
FROM reports_sync
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at);

-- Query untuk monitoring
SELECT * FROM v_report_metrics ORDER BY report_date DESC;
```

##### Server Monitoring
**Tools Rekomendasi**:

**1. htop**:
```bash
# Install htop
sudo apt install -y htop

# Run htop
htop
```

**2. iotop**:
```bash
# Install iotop (disk I/O monitoring)
sudo apt install -y iotop

# Run iotop
sudo iotop -o
```

**3. nethogs**:
```bash
# Install nethogs (network monitoring)
sudo apt install -y nethogs

# Run nethogs
sudo nethogs
```

**4. Uptime Kuma** (Opsional):
```bash
# Docker installation
docker run -d --restart=always \
  -p 3001:3001 \
  -v uptime-kuma:/app/data \
  louislam/uptime-kuma:latest

# Access: http://server-ip:3001
```

##### Alerting
**Email Alerts**:
```bash
# Setup alerts via shell scripts
# /usr/local/bin/check-app-health.sh

#!/bin/bash
APP_URL="https://your-domain.com"
ADMIN_EMAIL="admin@your-domain.com"

# Check application health
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $APP_URL/api/health)

if [ $HTTP_CODE -ne 200 ]; then
    echo "App is DOWN! HTTP Code: $HTTP_CODE" | mail -s "ALERT: Gapura IRRS Down" $ADMIN_EMAIL
fi
```

**Cron Job untuk Alert**:
```bash
# Add ke crontab
sudo crontab -e

# Check every 5 minutes
*/5 * * * * * /usr/local/bin/check-app-health.sh

# Check database every 10 minutes
*/10 * * * * * /usr/local/bin/check-db-health.sh
```

#### 4. Backup Strategy

##### Database Backup

**Automated Backup Script**:
```bash
#!/bin/bash
# /usr/local/bin/backup-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgresql"
DB_NAME="gapura_irrs"
DB_USER="gapura_irrs"
S3_BUCKET="gapura-backups"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
pg_dump -U $DB_USER -d $DB_NAME -F c -b -v -f "$BACKUP_DIR/gapura_irrs_$DATE.backup"

# Compress backup
gzip "$BACKUP_DIR/gapura_irrs_$DATE.backup"

# Upload to S3 (opsional)
aws s3 cp "$BACKUP_DIR/gapura_irrs_$DATE.backup.gz" s3://$S3_BUCKET/

# Keep last 7 days, delete older
find $BACKUP_DIR -name "gapura_irrs_*.backup.gz" -mtime +7 -delete

echo "Backup completed: gapura_irrs_$DATE.backup.gz"
```

**Cron Job untuk Backup**:
```bash
# Add ke crontab
sudo crontab -e

# Backup setiap jam 2 pagi setiap hari
0 2 * * * /usr/local/bin/backup-db.sh

# Backup setiap 6 jam untuk production-critical
0 */6 * * * /usr/local/bin/backup-db.sh
```

##### File Backup

**Backup Storage Directory**:
```bash
#!/bin/bash
# /usr/local/bin/backup-storage.sh

DATE=$(date +%Y%m%d_%H%M%S)
STORAGE_DIR="/var/www/gapura-irrs/storage"
BACKUP_DIR="/backups/storage"
S3_BUCKET="gapura-backups"

# Create backup
tar -czf "$BACKUP_DIR/storage_$DATE.tar.gz" $STORAGE_DIR

# Upload to S3
aws s3 cp "$BACKUP_DIR/storage_$DATE.tar.gz" s3://$S3_BUCKET/

# Keep last 7 days
find $BACKUP_DIR -name "storage_*.tar.gz" -mtime +7 -delete

echo "Storage backup completed: storage_$DATE.tar.gz"
```

##### Disaster Recovery

**Restore Database**:
```bash
#!/bin/bash
# /usr/local/bin/restore-db.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: restore-db.sh <backup_file>"
    exit 1
fi

# Restore dari backup
gunzip -c $BACKUP_FILE | psql -U gapura_irrs -d gapura_irrs

echo "Restore completed from: $BACKUP_FILE"
```

**Restore Storage**:
```bash
#!/bin/bash
# /usr/local/bin/restore-storage.sh

BACKUP_FILE=$1
STORAGE_DIR="/var/www/gapura-irrs/storage"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: restore-storage.sh <backup_file>"
    exit 1
fi

# Stop application
pm2 stop gapura-irrs

# Extract backup
tar -xzf $BACKUP_FILE -C /var/www/gapura-irrs/

# Set permissions
sudo chown -R www-data:www-data $STORAGE_DIR
sudo chmod -R 755 $STORAGE_DIR

# Start application
pm2 start gapura-irrs

echo "Storage restore completed from: $BACKUP_FILE"
```

#### 5. Performance Optimization

##### Database Optimization

**Index Strategy**:
```sql
-- Add indexes untuk frequently queried columns
CREATE INDEX IF NOT EXISTS idx_reports_sync_station_id ON reports_sync(station_id);
CREATE INDEX IF NOT EXISTS idx_reports_sync_created_at ON reports_sync(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_sync_status ON reports_sync(status);
CREATE INDEX IF NOT EXISTS idx_reports_sync_severity ON reports_sync(severity);
CREATE INDEX IF NOT EXISTS idx_reports_sync_category ON reports_sync(category);
CREATE INDEX IF NOT EXISTS idx_reports_sync_incident_date ON reports_sync(incident_date);
CREATE INDEX IF NOT EXISTS idx_reports_sync_sheet_id ON reports_sync(sheet_id);

-- Composite indexes untuk common query patterns
CREATE INDEX IF NOT EXISTS idx_reports_sync_station_status ON reports_sync(station_id, status);
CREATE INDEX IF NOT EXISTS idx_reports_sync_date_station ON reports_sync(created_at DESC, station_id);

-- Analyze tables untuk query optimizer
ANALYZE reports_sync;
ANALYZE users;
ANALYZE security_sessions;
```

**Connection Pooling**:
```bash
# Install PgBouncer
sudo apt install -y pgbouncer

# Configure PgBouncer
sudo vim /etc/pgbouncer/pgbouncer.ini

[databases]
gapura_irrs = host=localhost port=5432 dbname=gapura_irrs

[pgbouncer]
listen_addr = 127.0.0.1
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
reserve_pool_size = 5

[users]
gapura_irrs = "md5password"

# Start PgBouncer
sudo systemctl start pgbouncer
sudo systemctl enable pgbouncer

# Update PostgreSQL connection string
POSTGRES_URL=postgresql://gapura_irrs:password@localhost:6432/gapura_irrs
```

##### Application Optimization

**Next.js Production Configuration**:
```javascript
// next.config.mjs

export default {
  // Output compression
  compress: true,

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 86400,
  },

  // Experimental features
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'framer-motion'],
    workerThreads: false,
  },

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },

  // Headers
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    },
  ],
};
```

**PM2 Cluster Mode**:
```javascript
// ecosystem.config.js

module.exports = {
  apps: [{
    name: 'gapura-irrs',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/gapura-oneclick',
    instances: 'max',  // Gunakan semua cores CPU - 1
    exec_mode: 'cluster',
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/gapura-irrs/error.log',
    out_file: '/var/log/gapura-irrs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 4000,
  }]
};
```

**Nginx Optimization**:
```nginx
server {
    # Enable gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # Enable Brotli compression (opsional)
    # brotli on;
    # brotli_comp_level 6;
    # brotli_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # Caching
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=gapura_cache:10m max_size=1g inactive=60m use_temp_path=off;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;

    location /api/auth/login {
        limit_req zone=login_limit burst=10 nodelay;
    }

    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
    }

    # Connection timeouts
    client_body_timeout 60s;
    client_header_timeout 60s;
    keepalive_timeout 65s;
    send_timeout 60s;
}
```

#### 6. Security Best Practices for Production

##### Security Headers (Enhanced)
```nginx
# Enhanced security headers
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https:; frame-ancestors 'self';" always;

# Remove server information
server_tokens off;
more_clear_headers 'Server';
more_clear_headers 'X-Powered-By';
```

##### Firewall Rules
```bash
# UFW configuration untuk production
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw allow from 10.0.0.0/8 to any port 5432 proto tcp  # PostgreSQL internal access
sudo ufw allow from 10.0.0.0/8 to any port 6379 proto tcp  # Redis internal access
sudo ufw enable

# Block specific countries jika perlu
sudo ufw deny from 1.0.0.0/8  # China
sudo ufw deny from 2.0.0.0/8  # Russia
```

##### Fail2Ban Setup
```bash
# Install Fail2Ban
sudo apt install -y fail2ban

# Configure Fail2Ban
sudo vim /etc/fail2ban/jail.local

[nginx-noscript]
enabled = true
port = http,https
filter = nginx-noscript
logpath = /var/log/nginx/error.log
maxretry = 3
bantime = 86400
findtime = 600

[nginx-limit-req]
enabled = true
port = http,https
filter = nginx-limit-req
logpath = /var/log/nginx/access.log
maxretry = 10
bantime = 600
findtime = 60

# Start Fail2Ban
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

#### 7. Deployment Checklist

**Pre-Deployment**:
- [ ] Backup database terbaru
- [ ] Backup storage files
- [ ] Review environment variables
- [ ] Test staging environment
- [ ] Verify SSL certificates
- [ ] Check DNS configuration
- [ ] Verify firewall rules
- [ ] Review security headers
- [ ] Test backup restore procedure
- [ ] Verify monitoring setup
- [ ] Prepare rollback plan

**Deployment Process**:
1. Create maintenance page:
   ```bash
   # Copy maintenance page
   sudo cp maintenance.html /var/www/gapura-oneclick/public/
   
   # Update Nginx untuk serve maintenance page
   sudo vim /etc/nginx/sites-available/gapura-irrs
   # Tambahkan:
   # try_files $uri /maintenance.html =503;
   ```

2. Deploy new code:
   ```bash
   # Pull latest code
   cd /var/www/gapura-oneclick
   git pull origin main
   
   # Install dependencies
   npm ci --production
   
   # Build application
   npm run build
   ```

3. Restart application:
   ```bash
   # Restart PM2
   pm2 restart gapura-irrs
   
   # Check logs
   pm2 logs gapura-irrs --lines 100
   ```

4. Verify deployment:
   ```bash
   # Check application health
   curl https://your-domain.com/api/ai/health
   
   # Check database connection
   psql -U gapura_irrs -d gapura_irrs -c "SELECT 1;"
   
   # Check authentication
   curl -X POST https://your-domain.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test123"}'
   ```

5. Remove maintenance page:
   ```bash
   # Remove maintenance page
   sudo rm /var/www/gapura-oneclick/public/maintenance.html
   
   # Update Nginx (remove maintenance config)
   sudo vim /etc/nginx/sites-available/gapura-irrs
   
   # Reload Nginx
   sudo systemctl reload nginx
   ```

**Post-Deployment**:
- [ ] Verify all features working
- [ ] Check application logs for errors
- [ ] Monitor database performance
- [ ] Verify email notifications working
- [ ] Check AI integration
- [ ] Verify file uploads working
- [ ] Test dashboard loading
- [ ] Check mobile responsiveness
- [ ] Verify PWA installation
- [ ] Monitor resource usage
- [ ] Check uptime monitoring
- [ ] Review user feedback
- [ ] Update documentation

---

## 🔧 PANDUAN TROUBLESHOOTING

### Common Issues & Solutions

#### 1. Build Errors

**Issue**: `Module not found: Can't resolve '@supabase/supabase-js'`
**Solution**:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Atau clear npm cache
npm cache clean --force
npm install
```

**Issue**: `TypeError: Cannot read properties of undefined`
**Solution**:
```bash
# Check TypeScript version
npm list typescript

# Downgrade jika perlu
npm install typescript@4.9.5

# Atau upgrade tsconfig
vim tsconfig.json
```

#### 2. Database Connection Errors

**Issue**: `Connection refused: localhost:5432`
**Solution**:
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Start PostgreSQL jika tidak berjalan
sudo systemctl start postgresql

# Check port listening
sudo netstat -tlnp | grep 5432

# Check firewall
sudo ufw status
sudo ufw allow 5432/tcp
```

**Issue**: `FATAL: password authentication failed for user`
**Solution**:
```bash
# Reset password
sudo -u postgres psql

ALTER USER gapura_irrs WITH PASSWORD 'new_secure_password';

# Update .env
vim .env
POSTGRES_URL=postgresql://gapura_irrs:new_secure_password@localhost:5432/gapura_irrs
```

#### 3. Application Startup Errors

**Issue**: `Error: listen EADDRINUSE: address already in use :::3000`
**Solution**:
```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill process
sudo kill -9 <PID>

# Atau ubah port
PORT=3001 npm start
```

**Issue**: `PM2: process not found`
**Solution**:
```bash
# List PM2 processes
pm2 list

# Start application
pm2 start ecosystem.config.js

# Or start manually
pm2 start npm -- start
```

#### 4. Authentication Issues

**Issue**: `Invalid session: Token verification failed`
**Solution**:
```bash
# Check JWT_SECRET
grep JWT_SECRET .env

# Verify secret min 32 characters
# Generate new secret jika perlu
openssl rand -base64 32

# Update .env dan restart aplikasi
pm2 restart gapura-irrs
```

**Issue**: `Session expired immediately`
**Solution**:
```typescript
// Check time synchronization
// Verify server timezone
date

// Update sistem time
sudo timedatectl set-timezone Asia/Jakarta
sudo timedatectl set-ntp true

// Restart aplikasi setelah time sync
pm2 restart gapura-irrs
```

#### 5. File Upload Issues

**Issue**: `Error: File too large`
**Solution**:
```bash
# Check Nginx client_max_body_size
grep client_max_body_size /etc/nginx/sites-available/gapura-irrs

# Update limit
sudo vim /etc/nginx/sites-available/gapura-irrs
# Tambahkan:
client_max_body_size 100M;

# Reload Nginx
sudo systemctl reload nginx
```

**Issue**: `Permission denied: Cannot write to storage`
**Solution**:
```bash
# Check permissions
ls -la /var/www/gapura-irrs/storage

# Fix permissions
sudo chown -R www-data:www-data /var/www/gapura-irrs/storage
sudo chmod -R 755 /var/www/gapura-irrs/storage

# Restart aplikasi
pm2 restart gapura-irrs
```

#### 6. Performance Issues

**Issue**: Slow dashboard loading
**Solution**:
```sql
-- Check query performance
EXPLAIN ANALYZE SELECT * FROM reports_sync WHERE created_at > NOW() - INTERVAL '30 days';

-- Add indexes jika perlu (lihat Performance Optimization section)
```

```bash
# Check server resources
htop
df -h
free -h

# Clear application cache
pm2 restart gapura-irrs

# Atau increase cache
redis-cli FLUSHDB  # Jika menggunakan Redis
```

**Issue**: High memory usage
**Solution**:
```bash
# Check memory usage
pm2 monit

# Limit memory usage
# Update ecosystem.config.js
max_memory_restart: '2G',

# Restart PM2
pm2 restart gapura-irrs
```

#### 7. Email Notification Issues

**Issue**: Email not sending
**Solution**:
```bash
# Test SMTP connection
openssl s_client -connect smtp.gmail.com:465 -crlf

# Check email configuration
grep SMTP_ .env

# Test email via script
node scripts/test-email.js

# Atau gunakan SMTP tester lain:
# https://www.smtp-checker.com/
```

**Issue**: Gmail App Password expired
**Solution**:
1. Login ke Google Account
2. Masuk ke Security settings
3. Generate new App Password
4. Update `.env`:
   ```bash
   GMAIL_SMTP_APP_PASSWORD=new_app_password_here
   ```
5. Restart aplikasi:
   ```bash
   pm2 restart gapura-irrs
   ```

#### 8. AI Integration Issues

**Issue**: OpenRouter API timeout
**Solution**:
```typescript
// Increase timeout di lib/hf-client.ts
const response = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
  signal: AbortSignal.timeout(60000),  // 60 seconds
});
```

```bash
# Check OpenRouter API status
curl -I https://openrouter.ai/api/v1/models

# Check API key validity
curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://openrouter.ai/api/v1/models
```

**Issue**: AI insights not updating
**Solution**:
```sql
-- Check AI cache entries
SELECT COUNT(*) FROM ai_cache_entries;

-- Clear cache jika perlu
TRUNCATE TABLE ai_cache_entries;

-- Or invalidate via API
curl -X POST https://your-domain.com/api/ai/cache/invalidate \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 9. Sync Issues

**Issue**: Google Sheets sync failing
**Solution**:
```bash
# Check sync logs
pm2 logs gapura-irrs --grep "sync"

# Test manual sync
npm run sync:reports

# Check Google Sheets access
# Verify service account has access ke sheets

# Check sync_state table
psql -U gapura_irrs -d gapura_irrs -c "SELECT * FROM sync_state;"
```

**Issue**: Duplicate reports after sync
**Solution**:
```bash
# Run deduplication check
npm run sync:verify

# Manual check
node scripts/verify-no-duplicates.mjs

# Remove duplicates jika perlu
# (Perlu script custom untuk handle ini)
```

#### 10. SSL/Certificate Issues

**Issue**: SSL certificate expired
**Solution**:
```bash
# Renew certificate
sudo certbot renew

# Force renew jika perlu
sudo certbot renew --force

# Reload Nginx
sudo systemctl reload nginx
```

**Issue**: Mixed content warning
**Solution**:
```nginx
# Ensure semua resources load via HTTPS
# Update Nginx configuration

# Force HTTPS redirect
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

# Add HSTS header
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
```

### Debug Mode

**Enable Debug Mode**:
```bash
# Update .env
NODE_ENV=development
DEBUG=*

# Restart aplikasi
pm2 restart gapura-irrs

# Check verbose logs
pm2 logs gapura-irrs --lines 500
```

**Enable Next.js Debug**:
```javascript
// next.config.mjs
export default {
  // Add untuk production debugging
  onDemandEntries: ['**/pages/**/*.ts'],
  logging: {
    level: 'verbose',
  },
};
```

### Log Locations

**Application Logs**:
- `/var/log/gapura-irrs/out.log` - PM2 stdout
- `/var/log/gapura-irrs/error.log` - PM2 stderr
- `pm2 logs gapura-irrs` - Real-time logs
- `pm2 logs gapura-irrs --lines 100` - Last 100 lines

**Nginx Logs**:
- `/var/log/nginx/gapura-irrs-access.log` - Access logs
- `/var/log/nginx/gapura-irrs-error.log` - Error logs

**PostgreSQL Logs**:
- `/var/log/postgresql/` - PostgreSQL logs
- Check latest log: `tail -f /var/log/postgresql/postgresql-*.log`

**System Logs**:
- `/var/log/syslog` - System logs
- `/var/log/auth.log` - Authentication logs
- `journalctl -u postgresql -f` - Systemd logs for PostgreSQL

---

## 📚️ FAQ & PERTANYAAN UMUM

### 1. Bagaimana cara backup data user sebelum migrasi?

**Jawab**:
Data user sudah terbackup saat export database dari Supabase:
```bash
# Export seluruh database
pg_dump -h db.supabase.co -U postgres -d postgres > full_backup.sql

# Atau export per table
pg_dump -h db.supabase.co -U postgres -d postgres -t users > users_backup.sql
```

### 2. Apakah perlu mengubah password user setelah migrasi?

**Jawab**:
Tidak, jika:
1. Menggunakan password hash yang sama dari Supabase
2. Menggunakan `JWT_SECRET` yang sama

**Tapi disarankan**:
- Rotasi password secara berkala (3-6 bulan)
- Minta user untuk ganti password setelah migrasi
- Kirim email notifikasi: "System telah dimigrasi, silakan ganti password jika ingin"

### 3. Bagaimana cara menangani downtime selama migrasi?

**Jawab**:
**Maintenance Page Strategy**:
```bash
# Setup maintenance page
cat > /var/www/gapura-oneclick/public/maintenance.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Gapura IRRS - Maintenance</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        h1 { color: #e74c3c; }
        p { color: #666; }
    </style>
</head>
<body>
    <h1>🔧 System Maintenance</h1>
    <p>Gapura IRRS sedang dalam maintenance. Silakan coba kembali dalam 1-2 jam.</p>
    <p>Untuk pertanyaan, hubungi: support@gapura.co.id</p>
</body>
</html>
EOF

# Update Nginx
sudo vim /etc/nginx/sites-available/gapura-irrs
```

**Schedule**:
- Lakukan migrasi di luar jam sibuk (misal: pukul 2-4 pagi)
- Beri notifikasi minimal 24 jam sebelum maintenance
- Kirim email ke semua user:
  ```
  Subject: Notifikasi Maintenance System Gapura IRRS
  
  Dear User,
  
  Gapura IRRS akan mengalami maintenance pada:
  Tanggal: 20 April 2025
  Waktu: 02:00 - 04:00 WIB
  
  Selama periode ini, sistem tidak akan dapat diakses.
  Kami mohon maaf atas ketidaknyamanan ini.
  
  Best Regards,
  Gapura IT Team
  ```

### 4. Apakah perlu mengubah domain setelah migrasi?

**Jawab**:
**Tidak perlu**, jika:
- Menggunakan domain yang sama
- Mengupdate DNS ke server baru

**Perlu update**, jika:
- Menggunakan domain baru
- Mengubah dari subdomain ke root domain
- Menggunakan multi-domain setup

**Steps untuk domain baru**:
```bash
# 1. Update .env
NEXT_PUBLIC_APP_URL=https://new-domain.com

# 2. Update Nginx
sudo vim /etc/nginx/sites-available/gapura-irrs
server_name new-domain.com www.new-domain.com;

# 3. Obtain SSL certificate untuk domain baru
sudo certbot --nginx -d new-domain.com -d www.new-domain.com

# 4. Restart aplikasi dan Nginx
pm2 restart gapura-irrs
sudo systemctl reload nginx
```

### 5. Bagaimana cara menangani data yang sudah ada di Google Sheets?

**Jawab**:
Data dari Google Sheets sudah disinkronisasi ke `reports_sync` table. Opsi:

**Opsi 1: Tetap gunakan Google Sheets Sync**
- Tidak perlu perubahan
- Sinkronisasi otomatis akan terus berjalan
- Pastikan service account Google masih memiliki access

**Opsi 2: Migrasi ke Input Manual**
- Matikan auto-sync:
  ```bash
  # Update .env
  DISABLE_AUTO_SYNC=true
  ```
- User input data manual lewat form aplikasi
- Data masuk ke `reports` table (bukan `reports_sync`)

**Opsi 3: One-time Migration**
- Export semua data dari Google Sheets ke CSV
- Import ke `reports` table
- Matikan Google Sheets sync

### 6. Apakah perlu mengupdate AI integration?

**Jawab**:
**Tidak perlu** jika:
- Menggunakan endpoint AI yang sama
- API key OpenRouter masih valid

**Perlu update** jika:
- Mengganti ke LLM provider lain (OpenAI, Anthropic, dll.)
- Menggunakan custom AI model
- Mengubah rate limits atau pricing

**Update AI Integration**:
```typescript
// lib/ai-client.ts (file baru)

// Ganti provider LLM
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function analyzeReport(reportId: string) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Analyze this report...' }],
  });
  
  return response.choices[0].message;
}
```

### 7. Bagaimana cara monitoring production server?

**Jawab**:
**Minimum Monitoring**:
1. **Uptime Monitoring**:
   - UptimeRobot (gratis)
   - Better Uptime (gratis)
   - Atau custom script (lihat section Monitoring & Alerting)

2. **Resource Monitoring**:
   - htop / top untuk CPU/RAM
   - df -h untuk disk space
   - nethogs untuk network

3. **Application Logs**:
   - `pm2 logs gapura-irrs`
   - `/var/log/gapura-irrs/error.log`
   - `/var/log/nginx/gapura-irrs-error.log`

**Recommended Monitoring**:
1. **Sentry** (Error tracking):
   - Setup: https://docs.sentry.io/
   - Pricing: Free tier untuk small teams

2. **New Relic** (APM):
   - Setup: https://newrelic.com/
   - Monitoring: Performance, errors, users

3. **Grafana + Prometheus** (Custom dashboard):
   - Setup metrics endpoint di Next.js
   - Scrape metrics dengan Prometheus
   - Visualize dengan Grafana

### 8. Apakah perlu versi production dan staging?

**Jawab**:
**Disarankan** untuk environment production:

**Struktur**:
```
Server 1: Staging (staging.gapura.co.id)
- Untuk testing
- Database staging terpisah
- Tidak terbuka untuk public
- Password protection (opsional)

Server 2: Production (gapura.co.id)
- Untuk live system
- Database production
- Terbuka untuk public
- SSL valid certificate
- Backup automatis
```

**Deployment Flow**:
1. Deploy ke staging
2. Test semua fitur di staging
3. Get approval dari stakeholder
4. Deploy ke production
5. Monitor production untuk issues

### 9. Bagaimana cara rollback jika deployment gagal?

**Jawab**:
**Rollback Strategy**:

**Opsi 1: Git Rollback**
```bash
# Checkout previous commit
cd /var/www/gapura-oneclick
git log --oneline -10

# Checkout working version
git checkout <commit-hash>

# Rebuild
npm ci --production
npm run build

# Restart
pm2 restart gapura-irrs
```

**Opsi 2: Backup Rollback**
```bash
# Restore dari backup
/usr/local/bin/restore-db.sh /backups/postgresql/gapura_irrs_working.backup

# Restore application
cd /var/www/gapura-oneclick
git checkout <working-commit>
npm ci --production
npm run build
pm2 restart gapura-irrs
```

**Opsi 3: PM2 Version Management**
```bash
# Check previous PM2 app version
pm2 list

# Switch ke previous version
pm2 revert gapura-irrs
```

### 10. Apakah perlu migrasi ke containerization (Docker)?

**Jawab**:
**Opsional, tapi disarankan** untuk:
- Portability
- Consistent environment
- Easier deployment
- Resource isolation

**Dockerfile Example**:
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
```

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - POSTGRES_URL=postgresql://gapura_irrs:password@postgres:5432/gapura_irrs
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=gapura_irrs
      - POSTGRES_USER=gapura_irrs
      - POSTGRES_PASSWORD=secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

---

## 📝 CATATAN AKHIR

### Kontak & Support
- **IT Team**: it-team@gapura.co.id
- **Emergency Contact**: +62 812 3456 7890
- **Project Repository**: https://github.com/your-org/gapura-oneclick
- **Documentation Repository**: https://github.com/your-org/gapura-irrs-docs

### Maintenance Schedule
- **Routine Backup**: Setiap jam 2 pagi
- **Security Audit**: Mingguan
- **Performance Review**: Bulanan
- **Major Updates**: Triwulan

### Resource Links
- **Next.js Documentation**: https://nextjs.org/docs
- **PostgreSQL Documentation**: https://www.postgresql.org/docs
- **Supabase Documentation**: https://supabase.com/docs
- **Nginx Documentation**: https://nginx.org/en/docs
- **PM2 Documentation**: https://pm2.keymetrics.io/docs

### Version History
- **Initial Version**: 0.1.0 (Development)
- **Production Version**: 1.0.0 (Launch)
- **Current Version**: 0.1.0

---

## ✅ CHECKLIST HANDOVER

### Dokumentasi
- [x] Environment variables terdokumentasi
- [x] Tech stack terdokumentasi
- [x] Arsitektur sistem terdokumentasi
- [x] Struktur direktori terdokumentasi
- [x] Database schema terdokumentasi
- [x] Security measures terdokumentasi
- [x] Migrasi guide terdokumentasi
- [x] Troubleshooting guide terdokumentasi

### Source Code
- [x] Semua file terdokumentasi
- [x] API routes terdokumentasi
- [x] Components terdokumentasi
- [x] Libraries terdokumentasi
- [x] Scripts terdokumentasi

### Database
- [x] Schema export ke file SQL
- [x] Data statistics terdokumentasi
- [x] Table relationships terdokumentasi
- [x] Indexes terdokumentasi

### Deployment
- [x] Server requirements terdokumentasi
- [x] Installation guide terdokumentasi
- [x] Configuration guide terdokumentasi
- [x] Production recommendations terdokumentasi
- [x] Monitoring setup terdokumentasi

### Security
- [x] Authentication flow terdokumentasi
- [x] Authorization matrix terdokumentasi
- [x] Security headers terdokumentasi
- [x] Audit logging terdokumentasi
- [x] Best practices terdokumentasi

---

**DOKUMEN INI DIBUAT PADA**: 20 April 2026
**VERSI**: 1.0.0
**OLEH**: Development Team Gapura IRRS
**STATUS**: Ready for Handover

---
