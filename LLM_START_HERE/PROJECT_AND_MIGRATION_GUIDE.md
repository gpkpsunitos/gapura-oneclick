# Gapura OneClick — Project & MySQL Migration Guide

## 1. What This Project Is
**Gapura OneClick** (`gapura-oneclick`) is an operational irregularity reporting, analytics, and document-export platform for an Indonesian ground-handling provider.
- **Stack:** Next.js `16.2.10` (App Router, Turbopack, `reactCompiler: true`), React `19.2.7`, TypeScript, Tailwind CSS, Radix UI, Recharts, `exceljs`, `jspdf`, `docx`, `pptxgenjs`, Serwist PWA.
- **Database:** Originally built on Supabase (PostgreSQL), **now converted to run on local MySQL 8.0 / MariaDB 10.4+** (tested on XAMPP `10.4.32-MariaDB`) with local filesystem storage.
- **Timezone:** Operational dates use **WIB (UTC+7)** (`lib/wib-date.ts`).

---

## 2. How Authentication & RBAC Work
- **No Supabase Auth:** Authentication uses custom `HS256` JWTs (`jose` + `JWT_SECRET`) stored in the `session` cookie, backed by `security_sessions` joined with `users` and `stations`.
- **Middleware (`proxy.ts`):** Verifies the `session` cookie once per request and forwards the verified `SessionPayload` in the `x-irrs-verified-session` header (stripping any client-supplied copy first).
- **Roles (`types/index.ts`, `proxy.ts`, `lib/reports-rbac.ts`):**
  - `SUPER_ADMIN`: Full access (`/dashboard/admin`), user approval, security dashboard, system config.
  - `ANALYST`: Company-wide visibility (`/dashboard/analyst`), custom builder, AI reports. Only `division = 'OCS'` analysts may access `/dashboard/analyst/{ocs,calendar,meetings,notifications,performance-links,documents,import}`.
  - `DIVISI_ESKALASI`: Lands on `/dashboard/eskalasi/select`; full report visibility, edit, export, division switching.
  - `DIVISI_{OCS,OS,OP,OT,UQ,HC,HT}` / `PARTNER_*`: Full report visibility (`applyReportsRbacFilter`), edit rights (`DIVISI_*`), division-scoped routes (`DIVISI_HC` lands on `/dashboard/hc`; `OCS` & `OS` can export).
  - `MANAGER_CABANG`: Station-locked (`/dashboard/manager`), branch export, can approve staff in their station (`/dashboard/admin/users`).
  - `STAFF_CABANG` / `CABANG`: Own reports only (`/dashboard/employee`).
- **Public Surfaces (no login):** `/auth/*` (including `/auth/public-report`), `/embed/*`, `/share/*`, `/api/quick-access/*`, `/api/master-data`, `/api/reports/public`, `GET /api/dashboards`, `GET /api/reports/analytics`, `/api/storage/*` (public buckets `uploads`, `evidence`; private buckets require HMAC-signed URLs).

---

## 3. How the Supabase → MySQL Conversion Works
Rather than rewriting all 79 server files that call `supabaseAdmin`, the conversion swaps the underlying engine behind `lib/supabase-admin.ts`:

1. **Drop-in MySQL Client (`lib/mysql/client.ts`):**
   - `supabaseAdmin` and `supabase` both return `createMysqlClient()`.
   - Zero client-side browser code imports Supabase (`lib/supabase.ts` was unused on the client).
2. **Query Builder (`lib/mysql/query-builder.ts`):**
   - Translates PostgREST chains (`.from().select().eq().ilike().in().contains().or().order().range().upsert()`) into parameterized `mysql2/promise` SQL.
   - Supports `{ count: 'exact', head: true }`, `update(..., { count: 'exact' })`, and batched nested relation hydration (`stations:station_id(...)`, `user:users!user_id(...)`).
   - Uses `JSON_CONTAINS(col, ?)` (without `CAST(? AS JSON)`) so it works on both **MySQL 8.0** and **XAMPP MariaDB 10.4**.
3. **9 RPC Functions (`lib/mysql/rpc.ts`):**
   - All 9 PostgreSQL PL/pgSQL functions called via `.rpc()` are implemented in TypeScript + MySQL transactions:
     - `acquire_sync_lock`, `complete_sync_state`, `bump_sync_state_version`
     - `consume_rate_limit`
     - `get_active_published_dashboard`
     - `delete_report_cascade`
     - `relink_report_children_batch`
     - `upsert_report_document_bundle`
     - `dashboard_ground_overview`
4. **Local Storage (`lib/mysql/storage.ts` + `app/api/storage/[bucket]/[...path]/route.ts`):**
   - Stores files on disk under `LOCAL_STORAGE_DIR` (default `./storage`).
   - Public buckets (`uploads`, `evidence`) serve directly at `/api/storage/<bucket>/<path>`.
   - Private buckets (`report-documents`) require `?exp=...&sig=...` HMAC-SHA256 tokens from `createSignedUrl()`.

---

## 4. Data Sync Architecture
- **Main Irregularity Reports (`ground_handling_irregularity_report`):**
  - Synced from Google Sheets (`NON CARGO`, `CGO`) using deterministic `uuidv5(sheet_id, IRRS_NAMESPACE_UUID)` IDs, `content_hash` / `source_fingerprint`, and `shouldKeepLocalEdit` conflict guards.
  - Note: Sync scripts (`scripts/sync-scheduler.mjs`, `scripts/sync-joumpa-scheduler.mjs`) import `.ts` helpers, so run them with **`npx tsx scripts/sync-scheduler.mjs`** on Node 22.
- **JOUMPA Reports (`joumpa_reports_sync`):**
  - Bidirectional sync via `lib/services/joumpa-sync-service.ts` and `scripts/sync-joumpa-scheduler.mjs`.

---

## 5. Useful Commands
- **Start dev server:** `npm run dev`
- **Type-check:** `npx tsc --noEmit`
- **Import schema into MySQL/XAMPP:** `node scripts/import-mysql-schema.mjs`
- **Seed local Super Admin:** `node scripts/seed-local-admin.mjs` (`admin@gapura.local` / `Admin123!`)
- **Migrate non-sheet tables from Supabase:** `node scripts/migrate-from-supabase.mjs`
- **Sync Google Sheets → MySQL:** `npx tsx scripts/sync-scheduler.mjs` and `npx tsx scripts/sync-joumpa-scheduler.mjs`
