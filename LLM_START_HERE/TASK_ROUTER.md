# Task Router (Task → Files Map)

Use this map to jump directly to the relevant files without scanning the whole repository.

## 1. Database & Storage (MySQL / Local Disk)
- **Consolidated MySQL Schema:** `mysql/schema.sql`
- **Schema Importer (XAMPP/MySQL):** `scripts/import-mysql-schema.mjs`
- **MySQL Connection Pool & Normalizers:** `lib/mysql/pool.ts`
- **PostgREST-Compatible Query Builder:** `lib/mysql/query-builder.ts`
- **9 Migrated RPC Functions:** `lib/mysql/rpc.ts`
- **MySQL Client Entrypoints:** `lib/mysql/client.ts`, `lib/supabase-admin.ts`, `lib/supabase.ts`
- **Local Filesystem Storage & Signed URLs:** `lib/mysql/storage.ts`, `lib/supabase-storage.ts`
- **Local File Serving Endpoint:** `app/api/storage/[bucket]/[...path]/route.ts`
- **Supabase → MySQL Data Migrator:** `scripts/migrate-from-supabase.mjs`
- **Local Admin Seeder:** `scripts/seed-local-admin.mjs`

## 2. Authentication, Sessions & RBAC
- **Middleware / Route Guard / Role Routing:** `proxy.ts`
- **JWT (`jose` HS256) & `security_sessions` Verification:** `lib/auth-utils.ts`
- **Login / Logout / Bundle / Switch:** `app/api/auth/login/route.ts`, `app/api/auth/logout/route.ts`, `app/api/auth/bundle/route.ts`, `app/api/auth/switch/route.ts`
- **Permissions & Report Access:** `lib/permissions.ts`, `lib/reports-rbac.ts`, `lib/report-access.ts`
- **Domain Types (`UserRole`, `Report`, `SessionPayload`):** `types/index.ts`

## 3. Core Reports & Bidirectional Sync
- **Reports Service & Versioned Cache:** `lib/services/reports-service.ts`, `lib/sync-state.ts`
- **Google Sheets Sync (App & Cron):** `lib/services/sync-service.ts`, `app/api/integrations/google-sheets/webhook/route.ts`, `app/api/admin/sync-reports/route.ts`
- **JOUMPA Sync:** `lib/services/joumpa-sync-service.ts`, `lib/joumpa/mapping.ts`
- **Standalone Sync Scripts (run via `npx tsx`):** `scripts/sync-scheduler.mjs`, `scripts/sync-joumpa-scheduler.mjs`, `scripts/mysql-client.mjs`
- **WIB (UTC+7) Date Helpers:** `lib/wib-date.ts`, `lib/utils/wib-date.ts`

## 4. Dashboards, Custom Builder & Public Sharing
- **Role Dashboards:** `app/dashboard/(main)/{admin,analyst,ocs,os,operasional,hc,ht,eskalasi,manager,employee}/`
- **Dashboard Overview RPC Caller:** `lib/dashboard/dashboard-overview.ts`
- **Custom Dashboard Query Engine:** `lib/services/query-executor.ts`, `lib/engine/query-processor.ts`, `lib/builder/`
- **Public Share Links & Embeds:** `lib/share/service.ts`, `app/share/[slug]/`, `app/embed/`
- **Document Exports (Excel, PDF, DOCX, PPTX):** `lib/reports-export.ts`, `lib/dashboard-export.ts`, `lib/report-documents-server.ts`

## 5. AI, ML & Virtual Assistant
- **OpenRouter LLM Client:** `lib/ai/openrouter.ts`, `app/api/ai/`
- **Hugging Face ML Client:** `lib/ml-client.ts`, `lib/hf-client.ts`
- **Virtual Assistant Proxy & Quota:** `lib/virtual-assistant.ts`, `app/api/virtual-assistant/chat/route.ts`

## 6. Security, PWA & Deployment
- **Anomaly Detection & Rate Limiting:** `lib/security/detection-engine.ts`, `lib/security/rate-limit.ts`, `lib/security/audit-logger.ts`
- **PWA Service Worker:** `app/sw.ts`, `next.config.mjs`
- **Docker + phpMyAdmin:** `docker-compose.yml`, `Dockerfile.web`, `vercel.json`
