# Gapura OneClick 

Tanggal dokumen: 2026-05-19  
Status: Dokumentasi teknis terbaru berbasis codebase aktual  
Audience: engineer, IT operation, security, data/AI engineer, admin platform  
Scope: aplikasi Next.js, API, data sync, Google Sheets webhook, create report, edit dokumen DOCX, dashboard, AI, security, deployment, runbook

> Catatan keamanan: dokumen ini sengaja tidak mencantumkan credential aktif, secret value, atau path lokal pengguna. Semua path yang disebut adalah path relatif repository.

---

## Daftar Isi

1. Ringkasan Sistem
2. Peta Arsitektur
3. Stack Teknologi
4. Struktur Codebase
5. Role, Auth, dan RBAC
6. Data Model dan Database
7. Google Sheets sebagai Source of Truth Operasional
8. Webhook Google Sheets Apps Script
9. Sinkronisasi Sheets ke Supabase
10. Alur Create Report
11. Edit Document di Create Report dan Report Detail
12. Upload Evidence, Media, dan Document
13. Dashboard, Builder, dan Embed
14. AI dan Analytics
16. HC / HT Document Management
17. Calendar, Meeting, Notification
18. Security Monitoring dan Audit
19. PWA, Offline Queue, dan Service Worker
20. External Links dan Integrasi Tambahan
21. Environment Variables
22. API Catalogue
23. Script Operasional
24. Deployment dan Cron
25. Runbook Operasional
26. Troubleshooting
27. Checklist Handover

---

## 1. Ringkasan Sistem

Gapura OneClick / IRRS2 adalah aplikasi operasional berbasis Next.js App Router untuk pelaporan irregularity, complaint, compliment, monitoring multi-divisi, dashboard analitik, AI insight, document management, dan integrasi Google Sheets.

Sistem memakai dua lapisan data utama:

- **Google Sheets** sebagai sumber operasional untuk laporan live, terutama sheet `NON CARGO` dan `CGO`.
- **Supabase/PostgreSQL** sebagai persistence layer untuk user, session, cache, laporan hasil sync (`reports_sync`), komentar, dokumen divisi, security events, dashboard custom, notification, dan state sinkronisasi.

Fitur besar:

- Auth custom JWT cookie session.
- Role-based dashboard untuk cabang, analyst, super admin, divisi, partner, dan eskalasi.
- Create report 6 langkah dengan upload evidence, offline queue, lalu finalisasi DOCX.
- Google Sheets write/read/update/delete lewat service layer.
- Near real-time sync lewat Google Apps Script webhook.
- Vercel cron untuk sync berkala.
- Edit & download DOCX untuk laporan baru dan laporan existing.
- Dashboard builder dan chart detail.
- Public embed dashboard.
- AI insights, risk, forecast, root-cause, GSE analytics.
- Upload security: signed public upload token, rate limit, magic byte validation.
- Security dashboard: events, sessions, IP/alert actions.
- HC/HT library document management dengan audience scoping.

---

## 2. Peta Arsitektur

```text
Browser / PWA
  -> Next.js App Router
  -> proxy.ts auth + route guard
  -> Dashboard / Auth / Embed pages
  -> app/api route handlers

API route handlers
  -> auth-utils JWT + security_sessions
  -> reports-service
  -> sync-service
  -> upload routes
  -> AI routes + cache
  -> security modules

reports-service
  -> Google Sheets API
  -> Supabase/PostgreSQL

sync-service
  -> Google Sheets API
  -> Supabase/PostgreSQL

upload routes
  -> Supabase Storage evidence/videos/docs

AI routes
  -> OpenRouter / external AI service
  -> ai_cache_entries

Google Apps Script onEdit
  -> /api/integrations/google-sheets/webhook
  -> sync-service

Vercel Cron 03:00 + 03:15
  -> /api/admin/sync-reports/cron
  -> sync-service
```

Runtime pattern:

- Route protection terjadi di `proxy.ts`.
- API membaca cookie `session`, lalu `verifySession()` validasi JWT dan session DB.
- Business logic inti berada di `lib/services/**`.
- Google Sheets access berada di `lib/google-sheets.ts` dan `lib/services/reports-service.ts`.
- Supabase admin client dipakai server-side untuk operasi privileged.
- Cache data dashboard/AI invalidated ketika `sync_version` berubah.

---

## 3. Stack Teknologi

Runtime:

- Node.js `>=20.9.0 <25`
- npm `>=10`
- Next.js `16.1.6`
- React `19.2.1`
- TypeScript

Frontend:

- Tailwind CSS
- Radix UI
- Framer Motion
- Recharts
- Lucide React
- Fontsource

Backend/API:

- Next.js Route Handlers di `app/api/**`
- Custom service layer di `lib/**`
- Supabase JS Client
- Google APIs client
- jose JWT + bcryptjs
- Nodemailer SMTP

Documents/export:

- `docx` untuk Word document.
- `jspdf` + `jspdf-autotable` untuk PDF.
- `exceljs` untuk Excel.
- `pptxgenjs` untuk PowerPoint.
- `html-to-image` untuk export visual.

PWA:

- Serwist service worker.
- Offline queue di `lib/pwa/**`.

AI:

- External AI service URL.
- Deep-learning service URL.
- OpenRouter API.
- DB-backed AI cache.

---

## 4. Struktur Codebase

Direktori inti:

- `app/`: Next.js pages, layouts, API routes.
- `app/api/`: backend route handlers.
- `components/`: UI, dashboard, builder, chart, report, HC, security components.
- `lib/`: shared services, auth, sync, Google Sheets, AI, dashboard cache, security, PWA utilities.
- `hooks/`: React hooks global.
- `data/`: static airlines/airports data.
- `constants/`: constants lintas modul.
- `scripts/`: automation, debugging, sync, Apps Script source.
- `supabase/migrations/`: migration SQL.
- `supabase/export/`: exported schema/data snapshot.
- `docs/`: dokumentasi teknis dan handover.

Konvensi penting:

- Path API memakai App Router convention: `app/api/<domain>/route.ts`.
- Dashboard role memakai route group: `app/dashboard/(main)/<role>/page.tsx`.
- Service logic tidak ditempatkan langsung di component bila sudah ada helper di `lib/`.
- Field laporan selalu rawan alias, karena Google Sheets header historis punya variasi nama.

---

## 5. Role, Auth, dan RBAC

### 5.1 Auth Model

Auth memakai cookie `session` berisi JWT HS256. Token dibuat oleh `signSession()` dan valid selama 24 jam. Password di-hash dengan bcrypt salt 10.

Session juga disimpan di tabel `security_sessions`:

- `session_id`
- `user_id`
- `ip_address`
- `user_agent`
- `expires_at`
- `last_active`
- `is_revoked`

`verifySession()` melakukan:

1. Verify JWT signature dan expiry.
2. Ambil `sid`.
3. Cek in-memory cache 15 menit.
4. Cek `security_sessions.is_revoked`.
5. Cek user masih `active`.
6. Update `last_active` secara throttle.

### 5.2 Route Guard

`proxy.ts` menjaga:

- `/dashboard/**`
- `/auth/**`
- `/embed/**`
- `/api/**`

Public/bypass path:

- `/`
- `/auth/**`
- `/api/auth/**`
- `/embed/**`
- `/api/embed/**`
- `/api/reports/public`
- `/api/reports/duplicates/check`
- `/api/uploads/evidence/token`
- `/api/uploads/evidence/public`
- Google Sheets webhook jika header secret valid
- Sync endpoint dalam development

### 5.3 Role Dashboard

Role redirect utama:

| Role | Dashboard |
|---|---|
| `SUPER_ADMIN` | `/dashboard/admin` |
| `ANALYST` | `/dashboard/analyst` |
| `DIVISI_ESKALASI` | `/dashboard/eskalasi/select` |
| `DIVISI_OS`, `PARTNER_OS` | `/dashboard/os` |
| `DIVISI_OP`, `PARTNER_OP` | `/dashboard/op` |
| `DIVISI_HC`, `PARTNER_HC` | `/dashboard/hc` |
| `DIVISI_HT`, `PARTNER_HT` | `/dashboard/ht` |
| `MANAGER_CABANG`, `STAFF_CABANG`, `CABANG` | `/dashboard/employee` |

### 5.4 Permission Highlights

Permission utama dari `lib/permissions.ts`:

- Export data: OS, Eskalasi, Analyst, Super Admin.
- Execute/update report: Analyst, Super Admin.
- Close/reopen case: Analyst, Super Admin.
- Manage users/master data/audit logs: Super Admin.
- Create report: Manager Cabang, Staff Cabang, Analyst, Super Admin, Divisi OS.
- Manager Cabang melihat laporan station sendiri.
- Staff Cabang dibatasi laporan sendiri.
- Division roles dapat melihat/edit laporan divisi terkait sesuai route/API.

---

## 6. Data Model dan Database

### 6.1 Tabel Inti

Core:

- `users`: akun, role, station, status.
- `stations`: master cabang/station.
- `reports`: legacy/internal report table.
- `reports_sync`: mirror utama laporan dari Google Sheets.
- `report_comments`: komentar dan system message.
- `sync_state`: status sync, lock, `sync_version`.

Dashboard:

- `custom_dashboards`
- `dashboard_charts`
- `dashboard_cache_entries`

AI:

- `ai_cache_entries`
- `ai_audit_logs`

Security:

- `security_sessions`
- `security_events`
- `security_alerts`
- `security_configs`
- `blocked_ips`
- `rate_limits`
- `audit_logs`

Documents/HC:

- `division_documents`
- `hc_leave_records`
- `hc_requests`
- `hc_request_attachments`

Notification:

- `notification_recipients`
- `notification_delivery_log`

Master:

- `units`
- `positions`
- `incident_types`
- `locations`
- `external_links`

Storage metadata:

- `storage.buckets`
- `storage.objects`

### 6.2 `reports_sync`

`reports_sync` adalah tabel paling penting untuk dashboard. Google Sheets dibaca, dinormalisasi, lalu di-upsert ke tabel ini.

Field penting:

- `id`: UUID stabil.
- `sheet_id`: format seperti `NON CARGO!row_123`.
- `original_id`: identitas row dari Sheets.
- `source_sheet`: `NON CARGO` atau `CGO`.
- `source_fingerprint`: hash konten untuk relink dan dedupe.
- `date_of_event`, `created_at`, `updated_at`, `synced_at`.
- `status`, `severity`, `priority`.
- `branch`, `station_id`, `station_code`, `hub`.
- `airline`, `airlines`, `flight_number`, `route`.
- `main_category`, `category`, `irregularity_complain_category`.
- `terminal_area_category`, `apron_area_category`, `general_category`.
- `primary_tag`, `sub_category_note`, `target_division`, `esklasi_divisi`.
- `root_caused`, `action_taken`, `preventive_action`.
- `evidence_url`, `evidence_urls`, `video_url`, `video_urls`.

Index penting ada untuk `sheet_id`, `source_fingerprint`, `date_of_event`, `created_at`, `branch`, `hub`, `status`, `main_category`, `target_division`.

### 6.3 Storage Buckets

Bucket yang tampak di migration/export:

- `evidence`: public object untuk image evidence dan document upload umum.
- `videos`: public object untuk video evidence.
- `hc-request-attachments`: private/supporting bucket untuk HC attachment.

---

## 7. Google Sheets sebagai Source of Truth Operasional

Sumber laporan utama:

- Sheet `NON CARGO`
- Sheet `CGO`
- Sheet mapping pendukung seperti `Data for Vlookup`

Service utama: `lib/services/reports-service.ts`.

Tugas `ReportsService`:

- Membaca Google Sheets via batchGet.
- Membangun mapping header ke property internal.
- Normalisasi row menjadi `Report`.
- Generate UUID stabil dari `sheetName!row_number` memakai UUID v5.
- Menentukan target sheet saat create.
- Append row baru ke Sheets.
- Update cell tertentu via batchUpdate.
- Delete row via batchUpdate `deleteDimension`.
- Fallback fetch live row untuk detail report.
- Cache header dan beberapa lookup.
- Support transfer `NON CARGO -> CGO` jika `primary_tag` jadi `CGO`.

### 7.1 Header Mapping

Header Sheets tidak selalu konsisten. Karena itu `PROP_TO_HEADER` memetakan banyak alias:

- `date_of_event`: `Date_of_Event`, `Date of Event`, `Tanggal Kejadian`, dll.
- `airline/airlines`: `Airlines`, `Airline`, `Maskapai`.
- `main_category/category`: `Report_Category`, `Irregularity_Complain_Category`, dll.
- `evidence_urls`: `Upload_Irregularity_Photo`, `Supporting Evidence`, dll.
- `target_division/esklasi_divisi`: `ESKLASI DIVISI`, `ESKLASI_DIVISI`.

Prinsip maintenance:

- Jika kolom baru ditambah di Google Sheets, update `PROP_TO_HEADER` untuk read.
- Jika kolom perlu ditulis dari aplikasi, update `WRITE_MAPPING` dan pastikan header ada.
- Jangan ubah nama header Sheets tanpa update mapping dan smoke test create/update.

### 7.2 Identity Row

Format ID row:

```text
<SHEET_NAME>!row_<ROW_NUMBER>
```

Contoh:

```text
NON CARGO!row_25
CGO!row_88
```

ID ini dipakai untuk:

- Generate UUID stabil.
- Relasi komentar.
- Patch report.
- Delete report.
- Attach edited DOCX.

---

## 8. Webhook Google Sheets Apps Script

Sistem punya dua source Apps Script:

- `scripts/google-sheets-webhook.gs`: versi baru, queue multi-row berbasis document properties.
- `scripts/google-apps-script-sync.js`: versi setup dengan Script Properties `WEBHOOK_URL` dan `WEBHOOK_SECRET`.

Rekomendasi production: pakai `scripts/google-sheets-webhook.gs` jika ingin queue per row. Pakai `scripts/google-apps-script-sync.js` jika ingin konfigurasi secret lewat Script Properties, bukan hardcoded const.

### 8.1 Endpoint Webhook

Endpoint:

```http
POST /api/integrations/google-sheets/webhook
Header: x-irrs-webhook-secret: <same-as-GOOGLE_SHEETS_WEBHOOK_SECRET>
Content-Type: application/json
```

Payload umum:

```json
{
  "triggerType": "onEdit",
  "sheetId": 123456,
  "sheetName": "NON CARGO",
  "rowNumber": 25,
  "rowSignature": "sha256-base64-url",
  "editedRange": "H25",
  "editedAt": "2026-05-19T10:30:00.000Z",
  "nonEmptyCellCount": 12,
  "spreadsheetId": "google-spreadsheet-id"
}
```

Webhook behavior:

1. Auth via secret header, atau session role `SUPER_ADMIN`/`ANALYST`, atau development mode.
2. Reject jika tidak authorized.
3. Skip legacy scheduled poll kecuali `GOOGLE_SHEETS_WEBHOOK_ALLOW_SCHEDULED_POLL=true`.
4. Skip sheet di luar allowlist `NON CARGO`, `CGO`.
5. Return `202 Accepted`.
6. Jalankan `SyncService.syncReportsFromSheets('google-sheets-webhook')` di background via `after()`.

### 8.2 Apps Script Setup

Langkah production:

1. Buka target Google Sheet.
2. Extensions -> Apps Script.
3. Paste script pilihan ke `Code.gs`.
4. Konfigurasi:
   - Jika pakai `google-apps-script-sync.js`, set Script Properties:
     - `WEBHOOK_URL=https://<domain>/api/integrations/google-sheets/webhook`
     - `WEBHOOK_SECRET=<same value as GOOGLE_SHEETS_WEBHOOK_SECRET>`
   - Jika pakai `google-sheets-webhook.gs`, set const:
     - `IRRS_WEBHOOK_URL`
     - `IRRS_WEBHOOK_SECRET`
5. Run setup function:
   - `installIrrsWebhookTriggers()` untuk `google-sheets-webhook.gs`.
   - `setupTriggers()` untuk `google-apps-script-sync.js`.
6. Grant Apps Script permission.
7. Edit row di `NON CARGO` atau `CGO`.
8. Check Vercel/app logs untuk `[GOOGLE_SHEETS_WEBHOOK]`.

### 8.3 Debounce dan Duplicate Protection

Apps Script:

- Hanya target sheet `NON CARGO` dan `CGO`.
- Abaikan header row.
- Minimal non-empty cells: 4.
- Build `rowSignature` dari `sheetId + rowNumber + rowValues`.
- Simpan last sent signature agar edit duplikat tidak spam.
- Debounce 15 detik sebelum flush.
- Retry terbatas pada versi `google-apps-script-sync.js`.

### 8.4 Kenapa Scheduled Polling Dinonaktifkan

Legacy scheduled polling bisa memicu sync per menit dan membakar Vercel Fluid CPU. Sistem sekarang mendorong:

- Edit webhook untuk near real-time.
- Vercel cron untuk sync berkala.
- Manual sync endpoint untuk operasi/admin.

---

## 9. Sinkronisasi Sheets ke Supabase

Service utama: `lib/services/sync-service.ts`.

Entry point:

```ts
SyncService.syncReportsFromSheets(triggerSource)
```

Trigger source:

- `google-sheets-webhook`
- cron route
- admin manual sync
- script scheduler

### 9.1 Flow Sync

```text
Trigger
  -> SyncService.syncReportsFromSheets(source)
  -> acquireSyncLock('reports')
  -> ReportsService.fetchSheetsReports()
  -> Google Sheets batchGet: NON CARGO + CGO
  -> normalize reports
  -> list existing reports_sync rows
  -> upsert reports_sync by sheet_id
  -> delete rows missing from Sheets
  -> push dirty local updates back to Sheets
  -> completeSyncState + bump sync_version
  -> notify new inserted records
```

### 9.2 Locking

`sync_state` mencegah duplicate sync:

- Jika sync sedang jalan, trigger lain join/skip.
- Lock TTL default 300 detik.
- `activeSyncPromise` mencegah duplicate work dalam instance Node yang sama.

### 9.3 Upsert dan Relink

Sync melakukan:

- Build `source_fingerprint` per row.
- Exact match via `sheet_id`.
- Relink jika row number berubah tetapi fingerprint unik sama.
- Skip relink jika fingerprint ambigu.
- Batch upsert size 100.
- Delete orphan row dari `reports_sync` dan legacy `reports`.

### 9.4 Two-Way Reconciliation

Setelah fetch dari Sheets, service mencari row `reports_sync` yang:

```text
updated_at > synced_at
```

Maksimal 50 row dirty dipush balik ke Sheets via `reportsService.updateReport()`, lalu `synced_at` diperbarui. Ini membuat perubahan dari aplikasi tidak hilang.

---

## 10. Alur Create Report

Halaman: `app/dashboard/(main)/employee/new/page.tsx`  
API: `POST /api/reports`  
Service: `reportsService.createReport()`  
Persist metadata: `persistReportMetadata()`

### 10.1 Step Wizard

Create report memakai 6 langkah:

1. Detail report: date, airline, flight number, branch, route, category.
2. Area: APRON, TERMINAL, GENERAL, CARGO.
3. Area category.
4. Content: report, root cause, action taken.
5. Evidence dan reporter name.
6. Final document editing dan DOCX/PDF generation.

Step 6 penting: report sudah dibuat di Google Sheets, lalu user mengedit representasi dokumen sebelum finish.

### 10.2 Submit Flow

```text
User
  -> Wizard step 1-5
  -> upload evidence images
  -> receive evidence_urls
  -> POST /api/reports
  -> append row to NON CARGO / CGO
  -> receive updatedRange / row number
  -> persistReportMetadata
  -> return created report identity
  -> build docEdits
  -> show step 6 edit document
```

### 10.3 Sheet Routing

Target sheet default `NON CARGO`. Pindah ke `CGO` jika:

- `area === cargo`
- category mengandung cargo
- `is_gse_related`
- `primary_tag === CGO`
- `primary_tag === CARGO`

### 10.4 Offline Mode

Jika browser offline:

- Report masuk offline queue.
- Attachments disimpan untuk upload saat online.
- User melihat status queued.
- Endpoint target tetap `/api/reports`.
- Upload target `/api/uploads/evidence`.

File terkait:

- `lib/pwa/offline-queue-core.ts`
- `lib/pwa/offline-queue.ts`
- `hooks/useOfflineStorage.ts`
- `app/offline/page.tsx`

---

## 11. Edit Document di Create Report dan Report Detail

Sistem punya dua mode edit DOCX:

1. **Create Report Step 6**: live document edit langsung setelah report dibuat.
2. **Report Detail Modal**: edit existing report sebelum download DOCX.

Core helper: `lib/utils/document-generator.ts`.

### 11.1 Marker Dokumen Edited

Edited Word document dikenali dengan marker:

```ts
IRREGULARITY_REPORT_EDITED
```

Filename:

```text
IRREGULARITY_REPORT_EDITED__<safe-report-id>.docx
```

Tujuan marker:

- Membedakan edited DOCX dari image/video evidence.
- Mencari dokumen edited terakhir.
- Replace dokumen edited lama saat user menyimpan versi baru.
- Menjaga evidence lain tetap ada.

### 11.2 Create Report Step 6 Flow

Function penting:

- `saveEditedWord({ download })`
- `handleExportWord()`
- `handleFinish()`
- `persistEditedWordDocument()`
- `generateWord()`

Flow:

1. User submit report di step 5.
2. Backend append row ke Google Sheets.
3. Wizard build `docEdits` untuk form IRREGULARITY REPORT FORM.
4. User edit:
   - reference no
   - to/from/cc/subject
   - incident date/branch/flight data
   - chronology
   - root cause
   - action taken
   - preventive action
   - reporter name/title
   - signature
5. Saat download/finish:
   - Patch field penting ke `/api/reports/[id]`.
   - Generate DOCX blob.
   - Upload DOCX ke `/api/uploads/document`.
   - Patch report `evidence_urls` agar URL DOCX tersimpan.
   - Jika finish berhasil, redirect ke dashboard employee.

### 11.3 Report Detail Edit & Download Flow

Component: `components/dashboard/DocxEditorModal.tsx`.

Flow:

1. User buka modal `Edit & Download Document`.
2. Form load dari `reportData`.
3. User edit chronology, root cause, corrective action, preventive action, reporter, location, signature.
4. `handleSaveAndDownload()`:
   - `PATCH /api/reports/[id]` untuk update report.
   - Merge data backend + formData agar DOCX pakai input terbaru.
   - Generate DOCX via `generateWord(updatedReport, signatureData, { filename })`.
   - Persist DOCX via `persistEditedWordDocument(reportId, blob, filename)`.
   - `onSuccess(updatedReport)`.
5. User bisa upload manual PDF/DOC/DOCX kembali ke report melalui modal.

### 11.4 Persist Edited DOCX

`persistEditedWordDocument()`:

1. Buat `FormData` berisi DOCX.
2. POST ke `/api/uploads/document`.
3. Fetch report latest via `/api/reports/[id]`.
4. Ambil existing evidence URLs.
5. Remove old edited DOCX URLs dengan marker.
6. Merge existing evidence + new doc URL.
7. PATCH `/api/reports/[id]` dengan `evidence_urls`.

Special route behavior:

- `PATCH /api/reports/[id]` punya `isEditedWordEvidencePatch()`.
- Patch aman ini boleh fallback update langsung ke `reports_sync` jika Google Sheets update tidak menemukan report.
- Ini mencegah dokumen edited gagal attach saat sync belum selesai.

### 11.5 Download Latest Saved Word

`downloadLatestSavedWordOrGenerate()`:

1. Fetch latest report by ID dengan cache busting.
2. Cari URL DOCX edited terakhir.
3. Jika ada, download blob atau fallback direct link.
4. Jika tidak ada, generate Word baru dari data report.

---

## 12. Upload Evidence, Media, dan Document

### 12.1 Authenticated Evidence Upload

Endpoint:

```http
POST /api/uploads/evidence
```

Behavior:

- Butuh session.
- Bot protection aktif.
- Hanya image.
- Max 10MB sebelum kompresi.
- Server-side magic byte validation.
- Kompres ke WebP target sekitar 5KB.
- Upload ke bucket `evidence`.
- Return public URL.

### 12.2 Public Evidence Upload

Endpoint token:

```http
GET /api/uploads/evidence/token
```

Endpoint upload:

```http
POST /api/uploads/evidence/public
Header: x-upload-token: <short-lived-token>
```

Behavior:

- Token TTL 300 detik.
- Token request rate limit 10/IP/menit.
- Upload rate limit 5/IP/menit, in-memory + DB-backed.
- Magic byte validation.
- Hanya image.
- Max 10MB.
- Kompres WebP.

### 12.3 Document Upload

Endpoint:

```http
POST /api/uploads/document
```

Accepted:

- PDF
- DOC/DOCX
- XLS/XLSX
- PPT/PPTX

Guard:

- Butuh session.
- Butuh `SUPABASE_SERVICE_ROLE_KEY`.
- Max 20MB.
- Upload ke bucket `evidence`, folder `documents/<user-id>/<uuid>/`.
- Filename disanitasi.

### 12.4 Media Upload

Endpoint:

```http
POST /api/uploads/media
POST /api/uploads/batch
POST /api/reports/[id]/evidence
```

Dokumentasi detail lihat API Catalogue. Prinsip sama: validasi tipe, ukuran, storage path aman, link disimpan ke report.

---

## 13. Dashboard, Builder, dan Embed

### 13.1 Dashboard Role

Pages utama:

- Admin: `/dashboard/admin`
- Analyst: `/dashboard/analyst`
- Employee/cabang: `/dashboard/employee`
- OS: `/dashboard/os`
- OP: `/dashboard/op`
- HC: `/dashboard/hc`
- HT: `/dashboard/ht`
- Eskalasi: `/dashboard/eskalasi`

### 13.2 Dashboard Builder

Core:

- `components/builder/**`
- `lib/builder/schema.ts`
- `lib/builder/sql-builder.ts`
- `lib/builder/normalization.ts`
- `lib/engine/query-processor.ts`
- `app/api/dashboards/query/route.ts`
- `app/api/dashboards/query/batch/route.ts`

Query source aktif: `reports`. Walau ada SQL builder, runtime query sekarang diproses terhadap data report dari `reportsService.getReports()` dan `processQuery()`. Source lain akan error:

```text
Source '<source>' is not supported with Google Sheets backend.
```

Security filter:

- `SUPER_ADMIN`, `ANALYST`, `DIVISI_ESKALASI`: view all.
- Role lain dibatasi station jika applicable.

### 13.3 Public Embed

Public route:

- `/embed/**`
- `/api/embed/reports`
- `/api/embed/stats`

Embed digunakan untuk dashboard share/read-only tanpa auth penuh. Route ini bypass proxy auth.

### 13.4 Chart Detail

Chart detail routes:

- `/dashboard/chart-detail`
- `/dashboard/charts/<chart>/detail`
- `/embed/<chart>/detail`

Generator:

- `lib/chart-detail-generator.ts`
- `components/chart-detail/**`
- `components/chart-detail/custom-charts/**`

---

## 14. AI dan Analytics

### 14.1 AI Endpoint Families

Fitur AI:

- summary
- insights
- section-level AI summary and feature analysis
- risk airline/branch/hub/summary
- forecast issues/trends/seasonal
- seasonality forecast
- root cause categories/classify/stats/intelligence
- action recommendation
- similar cases
- GSE ranking/serviceability/irregularities/top issues

### 14.2 AI Service URLs

AI reads:

- `AI_SERVICE_URL`
- `NEXT_PUBLIC_AI_SERVICE_URL`
- `DL_SERVICE_URL`
- `NEXT_PUBLIC_DL_SERVICE_URL`
- `OPENROUTER_API_KEY`

LLM runtime utama memakai `lib/ai/openrouter.ts` dengan OpenRouter Chat Completions API dan model `meta-llama/llama-3-70b-instruct`.

Default fallback URL ada di beberapa route/service, tetapi production harus set env eksplisit.

### 14.3 AI Cache

Files:

- `lib/ai-cache.ts`
- `lib/ai-route-cache.ts`
- table `ai_cache_entries`

Cache key format:

```text
<feature>:<syncVersion>:<scopeHash>
```

Saat `sync_version` naik, cache key otomatis berubah. Jika AI service gagal, `resolveCachedAI()` bisa fallback ke latest stale cache.

### 14.4 Section / Feature Analysis

`/api/ai/chart-analysis`:

- `maxDuration = 300`.
- Ambil context section atau chart-like aggregate dari payload.
- Deteksi context airline, branch, GSE, CGO, category.
- Panggil endpoint orchestrator/deep-learning relevan.
- Build rows/insights/recommendation.

Catatan update: AI insight per chart sudah dinonaktifkan di UI. Tombol `ChartAiAnalysisButton` tidak merender output, panel AI chart detail dihapus, dan route lama `/api/dashboards/insights` tidak lagi tersedia. AI yang masih aktif berada pada ringkasan section/dashboard, chat analyst, dashboard generation, export insight, dan endpoint AI operasional lain.

---

## 15. Divisi Workspace

### 15.1 OS

Routes:

- `/dashboard/os`
- `/dashboard/os/reports`
- `/dashboard/os/ai-reports`
- `/dashboard/os/calendar`
- `/dashboard/os/meetings`
- `/dashboard/os/joumpa`
- `/dashboard/os/sla`
- `/dashboard/os/wsn`
- `/dashboard/os/handbook`

Fokus: operational support, SLA, Joumpa, WSN, calendar/meeting, reports.


Routes:


Fokus: GSE/peralatan, severity/risk, complaint/category.

### 15.3 OP

Routes:

- `/dashboard/op`
- `/dashboard/op/reports`
- `/dashboard/op/irregularity-complaint-top-cases`
- `/dashboard/op/ai-reports`

Fokus: operations analytics, irregularity/complaint top cases.


Routes:


Fokus: quality/safety monitoring.

### 15.5 HC

Routes:

- `/dashboard/hc`
- `/dashboard/hc/library`

Fokus: HR/Human Capital, document library, leave/request data.

### 15.6 HT

Routes:

- `/dashboard/ht`
- `/dashboard/ht/reports`
- `/dashboard/ht/ai-reports`

Fokus: training/human training.

### 15.7 Eskalasi

Routes:

- `/dashboard/eskalasi`
- `/dashboard/eskalasi/select`
- `/dashboard/eskalasi/laporan-divisi`
- `/dashboard/eskalasi/os`
- `/dashboard/eskalasi/op`
- `/dashboard/eskalasi/hc`
- `/dashboard/eskalasi/ht`

Fokus: pilih divisi eskalasi dan monitoring lintas divisi.

---

## 16. HC / HT Document Management

API:

- `GET /api/division-documents`
- `POST /api/division-documents`
- `GET /api/division-documents/[id]`
- `PATCH /api/division-documents/[id]`
- `DELETE /api/division-documents/[id]`

Division valid:

- `HC`
- `HT`

Category valid:

- `SAM_HANDBOOK`
- `EDARAN_DIREKSI`
- `MATERI_SOSIALISASI`
- `TRAINING_MATERIAL`

Source type:

- `upload`: butuh `file_url`
- `link`: butuh `external_url`

Visibility:

- `all`
- `stations`
- `roles`
- `targeted`

Audience rules:

- `stations`: minimal 1 station.
- `roles`: minimal 1 role.
- `targeted`: minimal station atau role.
- Manager/admin divisi bisa lihat/manage semua di divisinya.
- User lain melewati `canViewAudienceScopedItem()`.

Download behavior:

- `GET /api/division-documents/[id]` hanya untuk source `upload`.
- Server fetch `file_url`, lalu stream file dengan `Content-Disposition`.
- Filename dibangun dari meeting title/title + meeting date + extension.
- Cache response `private, no-store`.

Soft delete:

- `DELETE` set `is_active=false`, bukan hard delete.

---

## 17. Calendar, Meeting, Notification

Calendar:

- `GET /api/calendar/events`
- `POST /api/calendar/events`
- `GET/PATCH/DELETE /api/calendar/events/[id]`
- Helpers: `lib/utils/calendar-utils.ts`
- Table: `calendar_events`

Recurring utilities:

- `generateRecurringDates()`
- `calculateOccurrences()`
- `validateRecurringDateRange()`

Notification:

- `lib/notifications.ts`
- `notification_recipients`
- `notification_delivery_log`
- SMTP env: `SMTP_*`, `GMAIL_SMTP_*`, `NOTIFICATION_FROM_EMAIL`

Event notification:

- New report from internal create.
- New record from sync.
- Report closed.
- Test email/admin notification routes.

Delivery guard:

- `reserveDelivery()` + `finalizeDelivery()` mencegah duplicate email via fingerprint.

---

## 18. Security Monitoring dan Audit

Security modules:

- `lib/security/api-handler.ts`
- `lib/security/rate-limit.ts`
- `lib/security/file-validation.ts`
- `lib/security/botid.ts`
- `lib/security/event-service.ts`
- `lib/security/detection-engine.ts`
- `lib/security/compliance-engine.ts`
- `lib/security/audit-logger.ts`
- `lib/security/sanitize.ts`

Endpoints:

- `GET /api/security/dashboard-data`
- `POST /api/security/ingest`
- `GET/POST /api/security/sessions`
- `POST /api/security/actions/ip-control`
- `POST /api/security/actions/alert-control`

Controls:

- JWT + DB session revoke.
- Bot protection on sensitive write/upload routes.
- Rate limit in-memory and DB-backed.
- Magic byte file validation.
- Public upload signed token.
- Security events table.
- Alert/IP control.
- Audit logs.

Security ingest:

- Uses `SECURITY_INGEST_KEY`.
- Treat payload as untrusted.
- Store event, detection engine can derive alerts.

---

## 19. PWA, Offline Queue, dan Service Worker

PWA files:

- `app/manifest.ts`
- `app/sw.ts`
- `components/PWAProvider.tsx`
- `components/PWAInstallPrompt.tsx`
- `components/OfflineIndicator.tsx`
- `lib/pwa/constants.ts`
- `lib/pwa/offline-queue-core.ts`
- `lib/pwa/offline-queue.ts`
- `lib/pwa/client-state.ts`
- `scripts/build-sw.mjs`

Build:

```bash
npm run build:sw
npm run build
```

Offline behavior:

- Create report can queue payload + attachments.
- Queue flush saat online.
- Offline page tersedia di `/offline`.
- Service worker cache includes document/navigation strategies.

---

## 20. External Links dan Integrasi Tambahan

External links:

- `GET /api/external-links`
- Admin CRUD: `/api/admin/external-links`
- Table: `external_links`
- Files: `lib/external-links.ts`, `lib/external-links-server.ts`

Feature-specific integrations:

- Joumpa: `/api/joumpa`, `JOUMPA_SHEET_ID`
- SLA full service: `/api/sla/full-service`, `SLA_FULL_SERVICE_SHEET_ID`
- WSN: `/api/wsn`, `WSN_SHEET_ID`
- GSE analytics: `/api/ai/gse/**`, `lib/gse-api.ts`

---

## 21. Environment Variables

### 21.1 Core

| Env | Fungsi | Sensitif |
|---|---|---|
| `NODE_ENV` | mode runtime | no |
| `JWT_SECRET` | sign/verify JWT dan upload token | yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL client/server | public-ish |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key client | public-ish |
| `SUPABASE_SERVICE_ROLE_KEY` | privileged server operation | yes |
| `NEXT_PUBLIC_APP_URL` | base app URL | no |
| `NEXT_PUBLIC_BASE_URL` | base URL alternatif | no |

### 21.2 Google Sheets dan Sync

| Env | Fungsi | Sensitif |
|---|---|---|
| `GOOGLE_SHEET_ID` | spreadsheet utama backend | yes-ish |
| `NEXT_PUBLIC_GOOGLE_SHEET_ID` | spreadsheet id client jika dipakai | public-ish |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | service account email | no/limited |
| `GOOGLE_PRIVATE_KEY` | private key service account | yes |
| `GOOGLE_SHEETS_WEBHOOK_SECRET` | webhook auth secret | yes |
| `GOOGLE_SHEETS_WEBHOOK_ALLOW_SCHEDULED_POLL` | allow legacy scheduled poll | no |
| `CRON_SECRET` | protect cron sync route | yes |
| `JOUMPA_SHEET_ID` | Joumpa sheet | yes-ish |
| `WSN_SHEET_ID` | WSN sheet | yes-ish |
| `SLA_FULL_SERVICE_SHEET_ID` | SLA sheet | yes-ish |

### 21.3 AI

| Env | Fungsi | Sensitif |
|---|---|---|
| `AI_SERVICE_URL` | backend AI service | no/limited |
| `NEXT_PUBLIC_AI_SERVICE_URL` | public AI service URL | public |
| `DL_SERVICE_URL` | deep-learning service | no/limited |
| `NEXT_PUBLIC_DL_SERVICE_URL` | public DL service URL | public |
| `OPENROUTER_API_KEY` | OpenRouter LLM API key | yes |
| `HF_CACHE_TTL_MS` | HF client cache TTL | no |
| `HF_MAX_RETRIES` | retry count | no |
| `HF_RATE_LIMIT_RPM` | rate limit | no |
| `HF_RETRY_BACKOFF_MS` | retry backoff | no |
| `HF_TIMEOUT_MS` | timeout | no |

### 21.4 Email/Notification

| Env | Fungsi | Sensitif |
|---|---|---|
| `SMTP_HOST` | SMTP host | no |
| `SMTP_PORT` | SMTP port | no |
| `SMTP_SECURE` | SSL/TLS flag | no |
| `SMTP_USER` | SMTP username | yes-ish |
| `SMTP_PASS` | SMTP password | yes |
| `GMAIL_SMTP_USER` | Gmail SMTP username | yes-ish |
| `GMAIL_SMTP_APP_PASSWORD` | Gmail app password | yes |
| `NOTIFICATION_FROM_EMAIL` | sender | no |
| `DEFAULT_NOTIFICATION_EMAIL` | fallback recipient | yes-ish |
| `OSC_NOTIFICATION_EMAIL` | OSC recipient | yes-ish |

### 21.5 Security/Feature Flags

| Env | Fungsi | Sensitif |
|---|---|---|
| `SECURITY_INGEST_KEY` | security ingest auth | yes |
| `QUICK_ACCESS_PASSWORD` | quick access feature | yes |
| `DIVISION_PASSWORD_OS` | division password | yes |
| `DIVISION_PASSWORD_HC` | division password | yes |
| `DEMO_MODE` | demo mode | no |
| `LOG_LEVEL` | log verbosity | no |
| `DRY_RUN` | dry run scripts | no |
| `DEBUG_SHEETS` | debug sheets | no |
| `DEBUG_SHEETS_SAMPLE` | debug sample size | no |
| `DEBUG_SHEETS_PRINT_ALL` | debug full print | no |
| `NEXT_DIST_DIR` | alternate Next build dir | no |

---

## 22. API Catalogue

Format: `route` -> methods.

### Admin

- `/api/admin/analytics` -> `GET`
- `/api/admin/cache-stats` -> `GET`
- `/api/admin/external-links` -> `GET`, `PUT`, `POST`
- `/api/admin/notifications/recipients` -> `GET`, `POST`, `PATCH`, `DELETE`
- `/api/admin/notifications/test` -> `POST`
- `/api/admin/reports` -> `GET`, `PATCH`
- `/api/admin/stats` -> `GET`
- `/api/admin/sync-reports` -> `POST`, `GET`
- `/api/admin/sync-reports/cron` -> `GET`, `POST`
- `/api/admin/test-email` -> `POST`
- `/api/admin/users` -> `GET`, `POST`, `PATCH`
- `/api/admin/users/approve-staff` -> `POST`

### AI

- `/api/ai/action-summary` -> `GET`
- `/api/ai/action/recommend` -> `POST`
- `/api/ai/analyze` -> `POST`
- `/api/ai/analyze-all` -> `GET`
- `/api/ai/branch/summary` -> `GET`
- `/api/ai/cache/invalidate` -> `POST`
- `/api/ai/chart-analysis` -> `POST`
- `/api/ai/dashboard/summary` -> `GET`
- `/api/ai/forecast/issues` -> `GET`
- `/api/ai/forecast/seasonal` -> `GET`
- `/api/ai/forecast/trends` -> `GET`
- `/api/ai/gse/irregularities` -> `GET`
- `/api/ai/gse/issues/top` -> `GET`
- `/api/ai/gse/ranking` -> `GET`
- `/api/ai/gse/serviceability` -> `GET`
- `/api/ai/health` -> `GET`
- `/api/ai/insights` -> `POST`
- `/api/ai/model-info` -> `GET`
- `/api/ai/risk/airlines` -> `GET`
- `/api/ai/risk/branches` -> `GET`
- `/api/ai/risk/calculate` -> `POST`
- `/api/ai/risk/hubs` -> `GET`
- `/api/ai/risk/summary` -> `GET`
- `/api/ai/root-cause/categories` -> `GET`
- `/api/ai/root-cause/classify` -> `POST`
- `/api/ai/root-cause/intelligence` -> `POST`
- `/api/ai/root-cause/stats` -> `GET`
- `/api/ai/seasonality/forecast` -> `GET`
- `/api/ai/similar` -> `POST`
- `/api/ai/subcategory` -> `POST`
- `/api/ai/summarize` -> `GET`
- `/api/ai/train` -> `POST`

### Auth

- `/api/auth/bundle` -> `GET`
- `/api/auth/inspect` -> `GET`
- `/api/auth/login` -> `GET`, `POST`
- `/api/auth/logout` -> `POST`, `GET`
- `/api/auth/me` -> `GET`
- `/api/auth/register` -> `POST`
- `/api/auth/session` -> `GET`
- `/api/auth/switch` -> `POST`
- `/api/auth/switch-division` -> `POST`
- `/api/auth/verify-division-password` -> `POST`
- `/api/auth/verify-quick-access` -> `POST`

### Calendar

- `/api/calendar/events` -> `GET`, `POST`
- `/api/calendar/events/[id]` -> `GET`, `PATCH`, `DELETE`

### Dashboard

- `/api/dashboard/manager-cabang` -> `GET`
- `/api/dashboards` -> `GET`, `POST`, `DELETE`, `PATCH`
- `/api/dashboards/ai-generate` -> `POST`
- `/api/dashboards/customer-feedback-generate` -> `POST`
- `/api/dashboards/export-insights` -> `POST`
- `/api/dashboards/filter-options` -> `GET`
- `/api/dashboards/query` -> `POST`
- `/api/dashboards/query/batch` -> `POST`
- `/api/dashboards/summary/severity` -> `GET`

### Reports

- `/api/reports` -> `GET`, `POST`
- `/api/reports/[id]` -> `GET`, `PATCH`, `DELETE`
- `/api/reports/[id]/comments` -> `GET`, `POST`
- `/api/reports/[id]/evidence` -> `POST`
- `/api/reports/analytics` -> `GET`
- `/api/reports/analytics/aggregated` -> `GET`
- `/api/reports/batch` -> `POST`
- `/api/reports/duplicates/check` -> `POST`
- `/api/reports/public` -> `POST`
- `/api/reports/refresh` -> `POST`
- `/api/reports/status` -> `GET`
- `/api/reports/sync` -> `GET`
- `/api/reports/warm` -> `GET`

### Uploads

- `/api/uploads/batch` -> `POST`
- `/api/uploads/document` -> `POST`
- `/api/uploads/evidence` -> `POST`
- `/api/uploads/evidence/public` -> `POST`
- `/api/uploads/evidence/token` -> `GET`
- `/api/uploads/media` -> `POST`

### Documents/Workspace

- `/api/division-documents` -> `GET`, `POST`
- `/api/division-documents/[id]` -> `GET`, `PATCH`, `DELETE`

### Integrations/Public/Data

- `/api/embed/reports` -> `GET`
- `/api/embed/stats` -> `GET`
- `/api/external-links` -> `GET`
- `/api/integrations/google-sheets/webhook` -> `POST`
- `/api/investigative-ai` -> `POST`
- `/api/joumpa` -> `GET`
- `/api/master-data` -> `GET`
- `/api/sla/full-service` -> `GET`
- `/api/wsn` -> `GET`
- `/api/debug/clear-cache` -> `GET`

### Security

- `/api/security/actions/alert-control` -> `POST`
- `/api/security/actions/ip-control` -> `POST`
- `/api/security/dashboard-data` -> `GET`
- `/api/security/ingest` -> `POST`
- `/api/security/sessions` -> `GET`, `POST`

---

## 23. Script Operasional

NPM scripts:

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run debug:sheets
npm run sync:reports
npm run sync:auto
npm run sync:verify
npm run sync:scheduler
npm run sync:scheduler:dry
npm run security:guardrails
npm run clean
```

Script files:

- `scripts/google-sheets-webhook.gs`: Apps Script webhook baru.
- `scripts/google-apps-script-sync.js`: Apps Script setup Script Properties.
- `scripts/sync-reports-node.mjs`: manual sync Sheets -> DB.
- `scripts/auto-sync-daemon.mjs`: daemon sync setiap interval.
- `scripts/sync-scheduler.mjs`: scheduler sync, support dry run.
- `scripts/verify-no-duplicates.mjs`: duplicate verification.
- `scripts/debug-sheets.mjs`: diagnostics Sheets.
- `scripts/debug-sheets.ts`: explore Sheets.
- `scripts/debug-sheets-headers.ts`: inspect headers.
- `scripts/check-headers.ts`: check expected columns.
- `scripts/add-triage-columns.ts`: add triage columns.
- `scripts/explore-google-sheet.ts`: metadata/data exploration.
- `scripts/diagnose-data.js`: compare Sheets vs UI data.
- `scripts/test-data-consistency.js`: consistency checks.
- `scripts/backfill-reporter-email.mjs`: reporter email backfill.
- `scripts/security-guardrails.mjs`: security checks.
- `scripts/simulate-threat.ts`: security simulation.
- `scripts/build-sw.mjs`: build service worker.
- `scripts/check-node-version.js`: enforce Node engine.

---

## 24. Deployment dan Cron

### 24.1 Vercel Cron

`vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/admin/sync-reports/cron",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/admin/sync-reports/cron",
      "schedule": "15 3 * * *"
    }
  ]
}
```

Artinya sync dijalankan harian jam 03:00 dan 03:15 UTC. Pastikan interpretasi timezone disepakati dengan tim operasi.

### 24.2 Build

```bash
npm install
npm run build
npm run start
```

Build menjalankan:

1. Node version check.
2. Service worker build.
3. Next build dengan memory option.

### 24.3 Production Requirements

- Node sesuai engine.
- Semua required env tersedia.
- Supabase schema/migration apply.
- Storage bucket tersedia.
- Service account Google punya akses ke target spreadsheet.
- Apps Script webhook installed.
- SMTP configured jika notification aktif.
- AI service reachable jika fitur AI aktif.
- Cron secret valid.
- Security ingest key valid.

---

## 25. Runbook Operasional

### 25.1 Manual Sync Reports

```bash
npm run sync:reports
```

Atau via admin endpoint:

```http
POST /api/admin/sync-reports
```

Validasi:

- Check logs `[SyncService]`.
- Check `sync_state.last_sync_at`.
- Check `sync_state.sync_version`.
- Check row count `reports_sync`.

### 25.2 Test Google Sheets Webhook

Di Apps Script:

- `testIrrsWebhookForActiveRow()` untuk `google-sheets-webhook.gs`.
- `testWebhook()` untuk `google-apps-script-sync.js`.

Expected:

- Response 2xx.
- App logs show incoming trigger.
- Background sync finished.

### 25.3 Rotasi Secret

Urutan aman:

1. Generate new secret.
2. Update app env `GOOGLE_SHEETS_WEBHOOK_SECRET`.
3. Deploy/restart.
4. Update Apps Script secret.
5. Run test webhook.
6. Remove old secret from secret manager/history.

Untuk `JWT_SECRET`, rotasi akan invalidate semua session. Jadwalkan maintenance.

### 25.4 Rebuild AI Cache

AI cache mengikuti sync version. Untuk force refresh:

- Bump sync version via sync.
- Atau call `/api/ai/cache/invalidate` jika flow tersedia.

### 25.5 Restore Missing Report Attachment

Jika edited DOCX tidak muncul:

1. Buka report detail.
2. Cek `evidence_urls`.
3. Cari URL mengandung `IRREGULARITY_REPORT_EDITED`.
4. Jika upload berhasil tapi patch gagal, patch ulang `/api/reports/[id]` dengan merged `evidence_urls`.
5. Jangan replace evidence images.

---

## 26. Troubleshooting

### 26.1 Webhook 403

Penyebab:

- Header `x-irrs-webhook-secret` tidak sama.
- Env app belum terdeploy.
- Apps Script pakai header capitalization lama tapi route membaca lowercase; HTTP header case-insensitive, tapi pastikan nama benar.

Fix:

- Samakan `GOOGLE_SHEETS_WEBHOOK_SECRET` dan Script Properties/const.
- Redeploy app.
- Run test function.

### 26.2 Webhook Accepted tapi Data Tidak Update

Cek:

- Payload `sheetName` harus `NON CARGO` atau `CGO`.
- Row bukan header.
- `nonEmptyCellCount >= 4`.
- Logs background sync.
- `sync_state` lock tidak stuck.
- Service account masih punya akses Sheets.

### 26.3 Create Report Berhasil tapi Tidak Muncul di Dashboard

Cek:

- Google Sheets append berhasil.
- `persistReportMetadata()` tidak fatal tetapi perlu cek warning.
- Sync cron/webhook sudah jalan.
- `reports_sync` punya row baru.
- Dashboard cache purged setelah `sync_version` naik.

### 26.4 Edit DOCX Tidak Tersimpan

Cek:

- `/api/uploads/document` status 200.
- File <= 20MB.
- Session valid.
- `PATCH /api/reports/[id]` status 200.
- URL DOCX masuk `evidence_urls`.
- Filename mengandung `IRREGULARITY_REPORT_EDITED`.

### 26.5 Public Upload Ditolak

Cek:

- Token dari `/api/uploads/evidence/token` masih valid.
- Header `x-upload-token` terkirim.
- Rate limit IP belum kena.
- File benar-benar image, bukan MIME spoof.
- Ukuran <= 10MB.

### 26.6 AI Lambat/Gagal

Cek:

- `AI_SERVICE_URL`, `DL_SERVICE_URL`, `OPENROUTER_API_KEY`.
- External service health.
- Cache stale fallback ada.
- Function timeout untuk route berat.
- Logs endpoint AI yang gagal.

### 26.7 User Login tapi Redirect Salah

Cek:

- Role di `users.role`.
- `verifySession()` akan update role dari DB jika berbeda dengan JWT.
- `proxy.ts` dashboard mapping.
- User status harus `active`.

---

## 27. Checklist Handover

Code/app:

- [ ] `npm install` sukses.
- [ ] `npm run lint` selesai atau semua issue documented.
- [ ] `npm run build` sukses.
- [ ] App boot dengan env production.

Database:

- [ ] Migration apply.
- [ ] Tabel core ada.
- [ ] Storage bucket ada.
- [ ] RLS/policy sesuai deployment mode.
- [ ] Seed/master data ada.

Google Sheets:

- [ ] Service account punya access.
- [ ] Header `NON CARGO` dan `CGO` sesuai mapping.
- [ ] Apps Script installed.
- [ ] Test webhook 2xx.
- [ ] Cron sync aktif.

Reports:

- [ ] Create report online.
- [ ] Upload evidence.
- [ ] Create report offline queue.
- [ ] Edit DOCX step 6.
- [ ] Download latest saved Word.
- [ ] Report detail PATCH.
- [ ] Delete draft cleanup.

Documents:

- [ ] Upload document.
- [ ] Attach edited DOCX.
- [ ] Division document upload/link.
- [ ] Audience scoped document read.
- [ ] Download file with safe filename.

Security:

- [ ] JWT secret strong.
- [ ] Session revoke works.
- [ ] Public upload token works.
- [ ] Rate limit works.
- [ ] Security ingest protected.
- [ ] Admin security dashboard loads.

AI/dashboard:

- [ ] Dashboard query works.
- [ ] Builder save/load works.
- [ ] Embed route works.
- [ ] AI summary/insight route works.
- [ ] Cache invalidates on sync.

Operations:

- [ ] SMTP test email works.
- [ ] Sync runbook tested.
- [ ] Backup/restore tested.
- [ ] Secret rotation SOP documented.
- [ ] On-call troubleshooting owner assigned.

---

## Appendix A. Key File Ownership

| Area | Files |
|---|---|
| Auth/session | `lib/auth-utils.ts`, `app/api/auth/**`, `proxy.ts` |
| RBAC/workspace | `lib/permissions.ts`, `lib/server/workspace-auth.ts`, `lib/auth-context.tsx` |
| Reports API | `app/api/reports/**`, `lib/services/reports-service.ts`, `lib/report-persistence.ts` |
| Google Sheets | `lib/google-sheets.ts`, `scripts/google-sheets-webhook.gs`, `scripts/google-apps-script-sync.js` |
| Sync | `lib/services/sync-service.ts`, `lib/sync-state.ts`, `scripts/sync-*.mjs` |
| Create report | `app/dashboard/(main)/employee/new/page.tsx`, `components/public-report/**` |
| Document generation | `lib/utils/document-generator.ts`, `components/dashboard/DocxEditorModal.tsx` |
| Uploads | `app/api/uploads/**`, `lib/security/file-validation.ts`, `lib/image-compression.ts`, `lib/media-compression.ts` |
| Dashboard builder | `components/builder/**`, `lib/builder/**`, `lib/engine/query-processor.ts` |
| Chart detail | `components/chart-detail/**`, `lib/chart-detail-generator.ts` |
| AI | `app/api/ai/**`, `lib/services/gapura-ai.ts`, `lib/ai-cache.ts`, `lib/ai-route-cache.ts`, `lib/hf-client.ts` |
| Security | `app/api/security/**`, `lib/security/**` |
| HC/HT docs | `components/hc/**`, `app/api/division-documents/**` |
| Notifications | `lib/notifications.ts`, `app/api/admin/notifications/**` |
| PWA/offline | `app/sw.ts`, `app/manifest.ts`, `lib/pwa/**`, `hooks/useOfflineStorage.ts` |
