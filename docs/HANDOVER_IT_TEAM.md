# HANDOVER PROYEK GAPURA ONECLICK (IRRS2) - TIM IT

Tanggal dokumen: 2026-04-20  
Workspace: `gapura-oneclick`  
Status: Draft operasional siap review tim IT
Dibuat oleh: Claude

## 1) Tujuan Dokumen

Dokumen ini disusun untuk handover teknis end-to-end dari tim pengembang ke tim IT/Infra, mencakup:

- Gambaran sistem dan arsitektur aplikasi.
- Inventaris codebase dan ownership area.
- Daftar environment variables yang dipakai aplikasi.
- Baseline keamanan dan kontrol yang sudah diterapkan.
- SOP operasional harian, observability, backup, dan incident response.
- Panduan migrasi ke Ubuntu Server + PostgreSQL, termasuk autentikasi dan upload evidence/dokumen.
- Rekomendasi implementasi production.

## 2) Ringkasan Sistem

Gapura OneClick (IRRS2) adalah aplikasi Next.js full-stack untuk pelaporan irregularity, dashboard analitik lintas divisi, integrasi Google Sheets, AI insights, dan security monitoring.

Karakteristik utama saat ini:

- Frontend + backend berada di satu codebase Next.js (`app/` + `app/api/`).
- Data utama disimpan di PostgreSQL (saat ini via Supabase).
- Storage evidence/media memakai bucket object storage (`evidence`, `videos`, `hc-request-attachments`).
- Autentikasi adalah custom JWT + cookie session + tabel `security_sessions`.
- Ada cron sinkronisasi data laporan dan webhook Google Sheets.
- Ada modul keamanan (rate limiting, audit log, detection engine, signed token upload, validasi magic byte file).

## 3) Inventaris Codebase

### 3.1 Ringkasan ukuran codebase

Berdasarkan inventaris aktual repository:

- Total file terdokumentasi: **710**
- API routes (`app/api/**/route.ts`): **94**
- Next.js pages (`app/**/page.tsx`): **115**
- React components (`components/**/*.tsx`): **212+**
- Shared libraries (`lib/**/*`): **88**
- Script otomasi (`scripts/*`): **25**
- SQL migration/schema (`supabase_migration/*`, `supabase/migrations/*`): **25+**

### 3.2 Dokumentasi detail per file

Dokumentasi detail setiap file codebase telah digabung di dokumen ini pada:

- Bagian 13) Lampiran A - Katalog File Lengkap

File tersebut memuat:

- Kategori tiap file (API Route, Next Page, Component, Security Library, Migration, Config, dll).
- Deskripsi fungsi ringkas per file.
- Directory ownership guide untuk pembagian tanggung jawab tim.

## 4) Tech Stack

### 4.1 Runtime dan framework utama

- Node.js: `>=20.9.0 <25`
- NPM: `>=10`
- Next.js: `16.1.6`
- React: `19.2.1`
- TypeScript: `5.x`

### 4.2 Frontend/UI

- Tailwind CSS + PostCSS
- Radix UI
- Framer Motion
- Recharts
- Fontsource + Next font optimization

### 4.3 Backend/API

- Next.js Route Handlers (`app/api/**`)
- Validasi data dan request handling custom di `lib/`
- Scheduler berbasis cron endpoint (`vercel.json` saat ini)

### 4.4 Data, storage, dan integrasi

- PostgreSQL (saat ini melalui Supabase)
- Supabase Storage bucket
- Google Sheets API (`googleapis`)
- AI external service (`AI_SERVICE_URL`, `OPENROUTER_API_KEY`, dll). LLM chat completion utama memakai OpenRouter (`meta-llama/llama-3-70b-instruct`) melalui `lib/ai/openrouter.ts`.

### 4.5 Security dan observability

- JWT (`jose`) + bcrypt (`bcryptjs`)
- Bot protection (`botid`)
- Rate limiting (in-memory + DB table `rate_limits`)
- Security events + audit logging
- Vercel analytics/speed insights (jika tetap di Vercel)

## 5) Arsitektur Sistem

## 5.1 Arsitektur logis

```mermaid
flowchart TD
    U[User Browser / PWA] --> N[Next.js App Router]
    N --> MW[Middleware proxy.ts - auth + RBAC]
    MW --> PG[Pages app/**]
    MW --> API[API Routes app/api/**]

    API --> AUTH[Auth Utils + Auth Bundle]
    API --> SEC[Security Layer rate-limit, botid, detection]
    API --> SVC[Service Layer lib/services/**]

    SVC --> DB[(PostgreSQL / Supabase)]
    SVC --> STO[(Object Storage evidence/videos/docs)]
    SVC --> GS[Google Sheets API]
    SVC --> AI[AI Service API]

    API --> AUD[(Audit Logs + Security Events)]
```

### 5.2 Komponen runtime kritikal

- `proxy.ts`: gate utama auth, role-based routing, public path policy.
- `lib/auth-utils.ts`: JWT sign/verify, bcrypt, session cache, revoke check ke DB.
- `lib/auth-bundle.ts`: signed auth bundle (HMAC) untuk akun eskalasi multi-session.
- `lib/supabase.ts` dan `lib/supabase-admin.ts`: data access client.
- `lib/services/reports-service.ts`: orkestrasi laporan + sinkronisasi Google Sheets.
- `app/api/uploads/**`: alur upload evidence/image/video/document.

### 5.3 Struktur data utama

Tabel inti (lihat `supabase_migration/03_schema.sql`):

- `users`, `stations`, `reports_sync`, `report_comments`
- `security_sessions`, `security_events`, `security_configs`, `audit_logs`
- `division_documents`, `hc_requests`, `hc_leave_records`
- `notification_recipients`, `notification_delivery_log`
- `ai_cache_entries`, `ai_audit_logs`, dan tabel pendukung lainnya

Storage bucket inti (lihat `supabase_migration/06_storage.sql`):

- `evidence` (public)
- `videos` (public)
- `hc-request-attachments` (private)

## 6) Environment Variables

## 6.1 Daftar env key terdeteksi di codebase

Total env key unik: **45**

- `AI_SERVICE_URL`
- `CRON_SECRET`
- `DEBUG_SHEETS`
- `DEBUG_SHEETS_PRINT_ALL`
- `DEBUG_SHEETS_SAMPLE`
- `DEFAULT_NOTIFICATION_EMAIL`
- `DEMO_MODE`
- `DIVISION_PASSWORD_HC`
- `DIVISION_PASSWORD_OS`
- `DRY_RUN`
- `GMAIL_SMTP_APP_PASSWORD`
- `GMAIL_SMTP_USER`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SHEETS_WEBHOOK_SECRET`
- `GOOGLE_SHEET_ID`
- `OPENROUTER_API_KEY`
- `HF_CACHE_TTL_MS`
- `HF_MAX_RETRIES`
- `HF_RATE_LIMIT_RPM`
- `HF_RETRY_BACKOFF_MS`
- `HF_TIMEOUT_MS`
- `JOUMPA_SHEET_ID`
- `JWT_SECRET`
- `LOG_LEVEL`
- `NEXT_DIST_DIR`
- `NEXT_PUBLIC_AI_SERVICE_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_BASE_URL`
- `NEXT_PUBLIC_GOOGLE_SHEET_ID`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NODE_ENV`
- `NOTIFICATION_FROM_EMAIL`
- `OSC_NOTIFICATION_EMAIL`
- `QUICK_ACCESS_PASSWORD`
- `SECURITY_INGEST_KEY`
- `SLA_FULL_SERVICE_SHEET_ID`
- `SMTP_HOST`
- `SMTP_PASS`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WSN_SHEET_ID`

## 6.2 Klasifikasi env untuk production

### A. Wajib (core app tidak dapat boot/berisiko fatal)

- `NODE_ENV`
- `JWT_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL` (atau replacement jika DAL diganti)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (jika masih pakai Supabase API)
- `SUPABASE_SERVICE_ROLE_KEY` (untuk admin operations server-side)

### B. Wajib untuk sinkronisasi data/scheduler

- `CRON_SECRET`
- `GOOGLE_SHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_SHEETS_WEBHOOK_SECRET`

### C. Wajib untuk fitur upload/public security

- `JWT_SECRET` (dipakai juga untuk signed upload token)
- `SECURITY_INGEST_KEY` (untuk security ingest API)

### D. Opsional sesuai fitur

- Notifikasi email: `SMTP_*`, `GMAIL_SMTP_*`, `NOTIFICATION_FROM_EMAIL`, `DEFAULT_NOTIFICATION_EMAIL`, `OSC_NOTIFICATION_EMAIL`
- AI: `AI_SERVICE_URL`, `NEXT_PUBLIC_AI_SERVICE_URL`, `OPENROUTER_API_KEY`, `HF_*`
- Password fitur khusus: `DIVISION_PASSWORD_OS`, `DIVISION_PASSWORD_HC`, `QUICK_ACCESS_PASSWORD`
- Debugging/dev: `DEBUG_SHEETS*`, `DRY_RUN`, `LOG_LEVEL`, `DEMO_MODE`, `NEXT_DIST_DIR`
- Feature-specific sheets: `JOUMPA_SHEET_ID`, `WSN_SHEET_ID`, `SLA_FULL_SERVICE_SHEET_ID`, `NEXT_PUBLIC_GOOGLE_SHEET_ID`

## 6.3 Template env production (contoh)

```bash
# Core
NODE_ENV=production
JWT_SECRET=replace_with_strong_random_secret_min_32_chars
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=replace_with_anon_key
SUPABASE_SERVICE_ROLE_KEY=replace_with_service_role_key

# App base urls
NEXT_PUBLIC_APP_URL=https://app.domainanda.id
NEXT_PUBLIC_BASE_URL=https://app.domainanda.id
NEXT_PUBLIC_AI_SERVICE_URL=https://ai.domainanda.id
AI_SERVICE_URL=https://ai.domainanda.id

# Scheduler and webhook
CRON_SECRET=replace_with_long_random_secret
GOOGLE_SHEETS_WEBHOOK_SECRET=replace_with_long_random_secret

# Google Sheets integration
GOOGLE_SHEET_ID=replace_sheet_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"
NEXT_PUBLIC_GOOGLE_SHEET_ID=replace_sheet_id_if_needed
JOUMPA_SHEET_ID=replace_if_used
WSN_SHEET_ID=replace_if_used
SLA_FULL_SERVICE_SHEET_ID=replace_if_used

# Security
SECURITY_INGEST_KEY=replace_with_long_random_secret
QUICK_ACCESS_PASSWORD=replace_if_feature_enabled
DIVISION_PASSWORD_OS=replace_if_feature_enabled
DIVISION_PASSWORD_HC=replace_if_feature_enabled

# SMTP / Notification
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_email@domain.com
SMTP_PASS=your_app_password
GMAIL_SMTP_USER=your_email@domain.com
GMAIL_SMTP_APP_PASSWORD=your_app_password
NOTIFICATION_FROM_EMAIL=OneKlik <your_email@domain.com>
DEFAULT_NOTIFICATION_EMAIL=ops@domain.com
OSC_NOTIFICATION_EMAIL=osc@domain.com

# AI tuning (optional)
OPENROUTER_API_KEY=replace_if_used
HF_RATE_LIMIT_RPM=100
HF_CACHE_TTL_MS=900000
HF_MAX_RETRIES=3
HF_TIMEOUT_MS=120000
HF_RETRY_BACKOFF_MS=1000

# Runtime / ops
LOG_LEVEL=INFO
DEMO_MODE=false
DRY_RUN=false
NEXT_DIST_DIR=.next
DEBUG_SHEETS=
DEBUG_SHEETS_PRINT_ALL=
DEBUG_SHEETS_SAMPLE=
```

## 6.4 Nilai aktual tiap key dari `.env`

Nilai aktual `.env` tidak dicantumkan di dokumentasi. Simpan dan baca secret hanya dari secret manager atau environment runtime production. Gunakan template pada Bagian 6.3 sebagai acuan nama variabel.

## 7) Baseline Keamanan Saat Ini

Berdasarkan audit internal (`security_best_practices_report.md` dan `List Keamanan Gapura Oneclick.md`):

- JWT wajib (`JWT_SECRET`) dan server menolak start jika secret tidak ada.
- Session revocation aktif via `security_sessions`.
- Middleware `proxy.ts` membatasi akses dashboard/API berdasarkan role.
- Auth bundle ditandatangani HMAC dan diverifikasi `timingSafeEqual`.
- Upload publik pakai signed upload token + rate limit + magic byte validation.
- Security headers diset di `next.config.mjs` (CSP, HSTS, X-Frame, dll).
- Audit/security events disimpan untuk investigasi.

Temuan residual yang perlu hardening lanjut:

- Endpoint debug/inspect perlu pembatasan ketat di production.
- Rate limit in-memory harus selalu dilapisi DB/Redis centralized.
- Upload publik perlu anti-automation tambahan (captcha/token policy ketat).
- Monitoring abuse object storage harus aktif (burst write alert).

## 8) SOP Operasional Harian

### 8.1 Start, build, run

```bash
npm ci
npm run check:node
npm run build
npm run start
```

### 8.2 Quality & security checks

```bash
npm run lint
npm run security:guardrails
```

### 8.3 Sinkronisasi data

```bash
npm run sync:reports
npm run sync:verify
npm run sync:scheduler:dry
```

### 8.4 Monitoring minimum

- Error rate API (`5xx`, `401`, `429`)
- Latensi endpoint kritikal (`/api/auth/login`, `/api/reports/*`, `/api/uploads/*`)
- DB connection saturation, slow query, lock contention
- Volume upload bucket `evidence/videos`
- Kegagalan cron sync harian
- Growth tabel `security_events`, `audit_logs`, `reports_sync`

## 9) Panduan Migrasi ke Ubuntu Server + PostgreSQL

## 9.1 Keputusan arsitektur migrasi (sangat penting)

Ada 2 jalur migrasi:

### Opsi A (disarankan): Self-host Supabase stack di Ubuntu

Kelebihan:

- Perubahan code paling kecil (tetap pakai `supabase-js`).
- Fitur storage + RLS + API parity lebih mudah dipertahankan.
- Risiko regressions auth/upload lebih rendah.

Kekurangan:

- Operasional lebih kompleks (multi-service).

### Opsi B (biaya migrasi kode tinggi): Pure PostgreSQL + MinIO + custom DAL

Kelebihan:

- Kontrol penuh infra/data plane.

Kekurangan:

- Harus rewrite lapisan akses data dari `supabase-js` ke driver `pg/Prisma`.
- Harus ganti semua interaksi storage SDK.
- Risiko bug/regresi tinggi, durasi migrasi lebih panjang.

Rekomendasi handover: **gunakan Opsi A terlebih dahulu** untuk cutover cepat dan aman, lalu refactor bertahap jika target akhir adalah pure PostgreSQL.

## 9.2 Persiapan server Ubuntu

Target contoh:

- Ubuntu Server 24.04 LTS
- vCPU 8+, RAM 16 GB+, NVMe SSD 200 GB+ (sesuaikan growth)
- Firewall: hanya 22/80/443 public, DB port private only

Instalasi paket dasar:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl unzip ufw nginx certbot python3-certbot-nginx

# Node.js 20.x (contoh)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PM2
sudo npm i -g pm2
```

Hardening awal:

- Disable password SSH, gunakan key-only.
- Aktifkan UFW + fail2ban.
- Pastikan `JWT_SECRET`, `CRON_SECRET`, dsb disimpan di secret manager/`/etc/...` terbatas permission.

## 9.3 Migrasi database PostgreSQL

Sumber skema dan data:

- `supabase_migration/03_schema.sql`
- `supabase_migration/04_logic.sql`
- `supabase_migration/05_security.sql`
- `supabase_migration/06_storage.sql` (referensi bucket/policy)
- `supabase_migration/create_performance_indexes.sql`
- `supabase/export/schema.sql`
- `supabase/export/seed_data.sql`

Langkah umum:

1. Provision PostgreSQL 16+ (managed/local) dan buat DB baru.
2. Terapkan schema + enum + extension + logic + index.
3. Import data awal (users, stations, reports_sync, dll).
4. Validasi row counts tabel kritikal dan unique constraints.
5. Jalankan smoke query untuk endpoint kritikal.

Contoh urutan (sesuaikan akses actual DB):

```bash
psql "$TARGET_DB_URL" -f supabase_migration/01_extensions.sql
psql "$TARGET_DB_URL" -f supabase_migration/02_enums.sql
psql "$TARGET_DB_URL" -f supabase_migration/03_schema.sql
psql "$TARGET_DB_URL" -f supabase_migration/04_logic.sql
psql "$TARGET_DB_URL" -f supabase_migration/create_performance_indexes.sql
```

Checklist validasi DB:

- Tabel `users`, `reports_sync`, `security_sessions`, `rate_limits` terbentuk.
- Index penting tersedia (email lookup, reports filter, sessions, audit).
- Trigger `updated_at` aktif.
- Data `users` dan `stations` konsisten.

## 9.4 Migrasi autentikasi (detail)

Karena auth saat ini custom JWT + tabel user sendiri, migrasi auth ke PostgreSQL relatif langsung:

1. **Migrasikan tabel auth terkait**:
   - `users`
   - `security_sessions`
   - `audit_logs`
   - `security_events`
   - `rate_limits`

2. **Pertahankan hash bcrypt apa adanya**:
   - Jangan re-hash semua password saat migrasi.
   - Verifikasi login sample users setelah cutover.

3. **Strategi session saat cutover**:
   - Opsi aman: revoke seluruh session aktif saat go-live Ubuntu (user login ulang).
   - Opsi seamless: tetap pakai `JWT_SECRET` yang sama agar token lama masih valid sementara.

4. **Auth bundle (switch account)**:
   - Wajib pertahankan `JWT_SECRET` konsisten agar HMAC auth bundle valid.
   - Uji endpoint:
     - `/api/auth/login`
     - `/api/auth/session`
     - `/api/auth/me`
     - `/api/auth/switch`
     - `/api/auth/switch-division`
     - `/api/auth/logout`

5. **Post-cutover hardening**:
   - Rotasi `JWT_SECRET` terjadwal (dengan window maintenance).
   - Aktifkan monitoring login failure burst + lockout policy.

## 9.5 Migrasi upload evidence, media, dan dokumen (detail)

### A. Scope upload yang harus dimigrasi

- Evidence image: endpoint `/api/uploads/evidence` dan `/api/uploads/evidence/public`
- Media batch/video: endpoint `/api/uploads/batch` dan `/api/uploads/media`
- Dokumen: endpoint `/api/uploads/document`
- Dokumen divisi (`division_documents`) menyimpan `file_url`, `mime_type`, metadata audience

### B. Struktur bucket saat ini

- `evidence` (public)
- `videos` (public)
- `hc-request-attachments` (private)

### C. Strategi migrasi object storage

#### Jika pakai self-host Supabase stack

- Pertahankan nama bucket dan path object agar URL/path kompatibel.
- Migrasi object per bucket dengan sync tool.

#### Jika pindah ke MinIO/S3-compatible

1. Buat bucket baru dengan policy setara:
   - `evidence` public read (dengan guard upload di app layer)
   - `videos` public read
   - `hc-request-attachments` private signed access
2. Export object listing lama + metadata (path, mime, size, created_at).
3. Sync objek ke target bucket tanpa mengubah key path.
4. Update `file_url`/public URL base bila domain storage berubah.
5. Uji download/upload untuk:
   - laporan publik dengan evidence
   - laporan internal dengan multi-media
   - dokumen divisi (upload + download attachment)

### D. Kontrol keamanan upload yang wajib dipertahankan

- Signed upload token (HMAC, expiry 5 menit)
- Rate limit (in-memory + centralized persistent)
- Magic byte validation
- Limit ukuran file (10MB image, 20MB document, dsb)
- MIME allowlist yang ketat

## 9.6 Migrasi cron dan scheduler

Saat ini cron didefinisikan di `vercel.json` ke endpoint sync.

Di Ubuntu, ganti dengan salah satu:

- `cron` Linux + curl ke endpoint internal
- systemd timer + script Node

Contoh cron:

```bash
0 3 * * * curl -sS -H "Authorization: Bearer ${CRON_SECRET}" https://app.domainanda.id/api/admin/sync-reports/cron
15 3 * * * curl -sS -H "Authorization: Bearer ${CRON_SECRET}" https://app.domainanda.id/api/admin/sync-reports/cron
```

## 9.7 Cutover plan (runbook)

1. Freeze write traffic (maintenance mode).
2. Final sync data dari source ke target.
3. Deploy aplikasi ke Ubuntu.
4. Jalankan smoke tests endpoint kritikal.
5. Switch DNS/Load balancer.
6. Pantau 24 jam pertama (error budget ketat).

## 9.8 Rollback plan

- Trigger rollback jika:
  - login failure > threshold
  - API error 5xx melonjak
  - upload evidence gagal massal
  - data sync mismatch
- Rollback langkah:
  1. Kembalikan DNS ke platform lama.
  2. Re-enable write traffic lama.
  3. Simpan snapshot incident untuk RCA.

## 10) Rekomendasi Production (Actionable)

1. Gunakan arsitektur **blue-green deployment** untuk upgrade major.
2. Terapkan centralized logs + metrics + alerting:
   - Application logs
   - Nginx access/error logs
   - PostgreSQL performance metrics
3. Aktifkan backup strategy 3-2-1:
   - DB logical backup harian
   - WAL/archive atau PITR
   - Object storage replication/offsite backup
4. Rotasi seluruh secret minimal tiap 90 hari.
5. Pisahkan environment `dev`, `staging`, `production` secara ketat.
6. Gunakan WAF/CDN di depan Nginx untuk proteksi DDoS dasar.
7. Batasi endpoint debug di production (`/api/auth/inspect`, endpoint sejenis).
8. Jalankan uji beban berkala untuk skenario login, reports query, dan upload.
9. Tetapkan on-call matrix untuk incident prioritas tinggi.
10. Simpan dokumen operasional ini di repositori + wiki internal dan versioning per revisi.

## 11) Checklist Handover Tim IT

### A. Akses dan kredensial

- [ ] Akses server Ubuntu (SSH key-based)
- [ ] Akses DNS/Domain/CDN
- [ ] Akses PostgreSQL admin
- [ ] Akses object storage admin
- [ ] Akses Google service account
- [ ] Akses SMTP provider

### B. Konfigurasi aplikasi

- [ ] Seluruh env vars terpasang di host production
- [ ] `JWT_SECRET`, `CRON_SECRET`, `GOOGLE_SHEETS_WEBHOOK_SECRET` unik dan kuat
- [ ] Build lulus (`npm run build`)
- [ ] Start lulus (`npm run start` / PM2)

### C. Validasi fungsional

- [ ] Login/logout/session check
- [ ] Switch division untuk role eskalasi
- [ ] Create report internal dan public
- [ ] Upload evidence (public/internal), upload document
- [ ] Download division document
- [ ] Cron sync berjalan sesuai jadwal

### D. Observability & recovery

- [ ] Monitoring aktif (CPU/RAM/Disk/API/DB)
- [ ] Alerting aktif (critical/high)
- [ ] Backup restore test berhasil
- [ ] Runbook incident tersedia dan diuji

## 12) Lampiran Referensi Penting

- Lampiran A: Katalog File Lengkap (bagian 13 dokumen ini)
- `security_best_practices_report.md`
- `List Keamanan Gapura Oneclick.md`
- `Analisa Vercel Supabase vs Ubuntu Lokal.md`
- `PERFORMANCE_25K_USERS_COMPLETED.md`
- `supabase_migration/03_schema.sql`
- `supabase_migration/05_security.sql`
- `supabase_migration/06_storage.sql`
- `supabase_migration/create_performance_indexes.sql`

---

Catatan akhir: untuk minim risiko bisnis, migrasi ke Ubuntu + PostgreSQL sebaiknya melalui staging penuh terlebih dahulu, lalu cutover production dengan window maintenance terkontrol dan rollback yang telah diuji.
---

## 13) Lampiran A - Katalog File Lengkap

Lampiran ini memuat inventaris detail file dalam handover, dikategorikan berdasarkan fungsi dan ownership tim.

### Metrics Summary
- **React Component**: 212
- **Next Page**: 115
- **API Route**: 94
- **Shared Library**: 69
- **Other**: 56
- **Data Export Snapshot**: 33
- **DB Migration / Schema**: 28
- **Automation Script**: 25
- **Documentation**: 12
- **Security Library**: 11
- **Static Asset**: 10
- **Next Layout**: 9
- **Build/Deploy Config**: 8
- **Next Loading UI**: 6
- **Service Layer**: 6
- **Type Definition**: 5
- **Next Error UI**: 5
- **React Hook**: 4
- **Server Utility**: 2
- **Total**: 710

### Directory Ownership Guide
| Directory | Suggested Owner Team | Description |
|-----------|----------------------|-------------|
| `supabase/` | Backend / Data BI | Database schemas and migrations |
| `lib/security/` | Security | Sensitive logic and encryption |
| `app/api/` | Backend | Serverless functions and endpoints |
| `app/` (pages) | Frontend | UI Routes and Page components |
| `components/` | Frontend | Shared UI library |
| `scripts/` | IT Infra | Automation and maintenance |
| `public/` | Frontend | Media and static assets |

### File Details
| File Path | Category | Description |
|-----------|----------|-------------|
| `./supabase_migration/01_extensions.sql` | DB Migration / Schema | SQL Definition: 01_extensions.sql |
| `./supabase_migration/02_enums.sql` | DB Migration / Schema | SQL Definition: 02_enums.sql |
| `./supabase_migration/05_security.sql` | DB Migration / Schema | SQL Definition: 05_security.sql |
| `./supabase_migration/06_storage.sql` | DB Migration / Schema | SQL Definition: 06_storage.sql |
| `./supabase_migration/create_performance_indexes.sql` | DB Migration / Schema | SQL Definition: create_performance_indexes.sql |
| `./supabase_migration/03_schema.sql` | DB Migration / Schema | SQL Definition: 03_schema.sql |
| `./supabase_migration/04_logic.sql` | DB Migration / Schema | SQL Definition: 04_logic.sql |
| `./types/entity-analytics.ts` | Type Definition | Interface/Type: entity-analytics.ts |
| `./types/builder.ts` | Type Definition | Interface/Type: builder.ts |
| `./types/security.ts` | Type Definition | Interface/Type: security.ts |
| `./types/chart.js.d.ts` | Type Definition | Interface/Type: chart.js.d.ts |
| `./types/index.ts` | Type Definition | Interface/Type: index.ts |
| `./PERFORMANCE_25K_USERS_COMPLETED.md` | Documentation | Docs for PERFORMANCE_25K_USERS_COMPLETED.md |
| `./tailwind.config.js` | Build/Deploy Config | Configuration: tailwind.config.js |
| `./app/embed/terminal-area-category/detail/page.tsx` | Next Page | UI View for embed > terminal-area-category > detail |
| `./app/embed/severity/SeverityDetailContent.tsx` | Other | Source/Resource: SeverityDetailContent.tsx |
| `./app/embed/severity/page.tsx` | Next Page | UI View for embed > severity |
| `./app/embed/hub-report/detail/page.tsx` | Next Page | UI View for embed > hub-report > detail |
| `./app/embed/general-category/detail/page.tsx` | Next Page | UI View for embed > general-category > detail |
| `./app/embed/category/CategoryDetailContent.tsx` | Other | Source/Resource: CategoryDetailContent.tsx |
| `./app/embed/category/page.tsx` | Next Page | UI View for embed > category |
| `./app/embed/chart/page.tsx` | Next Page | UI View for embed > chart |
| `./app/embed/area-report/detail/page.tsx` | Next Page | UI View for embed > area-report > detail |
| `./app/embed/case-category-by-branch/detail/page.tsx` | Next Page | UI View for embed > case-category-by-branch > detail |
| `./app/embed/status/StatusDetailContent.tsx` | Other | Source/Resource: StatusDetailContent.tsx |
| `./app/embed/status/page.tsx` | Next Page | UI View for embed > status |
| `./app/embed/category-by-area/detail/page.tsx` | Next Page | UI View for embed > category-by-area > detail |
| `./app/embed/apron-area-category/detail/page.tsx` | Next Page | UI View for embed > apron-area-category > detail |
| `./app/embed/monthly-report/detail/page.tsx` | Next Page | UI View for embed > monthly-report > detail |
| `./app/embed/pivot-report/detail/page.tsx` | Next Page | UI View for embed > pivot-report > detail |
| `./app/embed/layout.tsx` | Next Layout | Shared layout for app/embed |
| `./app/embed/error.tsx` | Next Error UI | Error boundary for app/embed |
| `./app/embed/case-category-by-airline/detail/page.tsx` | Next Page | UI View for embed > case-category-by-airline > detail |
| `./app/embed/report-by-case-category/detail/page.tsx` | Next Page | UI View for embed > report-by-case-category > detail |
| `./app/embed/embed.css` | Other | Source/Resource: embed.css |
| `./app/embed/overview/OverviewContent.tsx` | Other | Source/Resource: OverviewContent.tsx |
| `./app/embed/overview/page.tsx` | Next Page | UI View for embed > overview |
| `./app/embed/custom/[slug]/CustomDashboardContent.tsx` | Other | Source/Resource: CustomDashboardContent.tsx |
| `./app/embed/custom/[slug]/page.tsx` | Next Page | UI View for embed > custom > [slug] |
| `./app/embed/airline-report/detail/page.tsx` | Next Page | UI View for embed > airline-report > detail |
| `./app/embed/airline/AirlineDetailContent.tsx` | Other | Source/Resource: AirlineDetailContent.tsx |
| `./app/embed/airline/page.tsx` | Next Page | UI View for embed > airline |
| `./app/embed/branch-report/detail/page.tsx` | Next Page | UI View for embed > branch-report > detail |
| `./app/auth/survey-penumpang/page.tsx` | Next Page | UI View for auth > survey-penumpang |
| `./app/auth/auth-theme.css` | Other | Source/Resource: auth-theme.css |
| `./app/auth/joumpa/page.tsx` | Next Page | UI View for auth > joumpa |
| `./app/auth/ai-chat/page.tsx` | Next Page | UI View for auth > ai-chat |
| `./app/auth/register/page.tsx` | Next Page | UI View for auth > register |
| `./app/auth/layout.tsx` | Next Layout | Shared layout for app/auth |
| `./app/auth/error.tsx` | Next Error UI | Error boundary for app/auth |
| `./app/auth/sla/page.tsx` | Next Page | UI View for auth > sla |
| `./app/auth/login/page.tsx` | Next Page | UI View for auth > login |
| `./app/auth/public-report/page.tsx` | Next Page | UI View for auth > public-report |
| `./app/.well-known/assetlinks.json/route.ts` | Other | Source/Resource: route.ts |
| `./app/sw.ts` | Other | Source/Resource: sw.ts |
| `./app/icon.svg` | Other | Source/Resource: icon.svg |
| `./app/dashboard/chart-detail/page.tsx` | Next Page | UI View for dashboard > chart-detail |
| `./app/dashboard/charts/terminal-area-category/detail/page.tsx` | Next Page | UI View for dashboard > charts > terminal-area-category > detail |
| `./app/dashboard/charts/hub-report/detail/page.tsx` | Next Page | UI View for dashboard > charts > hub-report > detail |
| `./app/dashboard/charts/general-category/detail/page.tsx` | Next Page | UI View for dashboard > charts > general-category > detail |
| `./app/dashboard/charts/area-report/detail/page.tsx` | Next Page | UI View for dashboard > charts > area-report > detail |
| `./app/dashboard/charts/case-category-by-branch/detail/page.tsx` | Next Page | UI View for dashboard > charts > case-category-by-branch > detail |
| `./app/dashboard/charts/category-by-area/detail/page.tsx` | Next Page | UI View for dashboard > charts > category-by-area > detail |
| `./app/dashboard/charts/apron-area-category/detail/page.tsx` | Next Page | UI View for dashboard > charts > apron-area-category > detail |
| `./app/dashboard/charts/monthly-report/detail/page.tsx` | Next Page | UI View for dashboard > charts > monthly-report > detail |
| `./app/dashboard/charts/pivot-report/detail/page.tsx` | Next Page | UI View for dashboard > charts > pivot-report > detail |
| `./app/dashboard/charts/case-category-by-airline/detail/page.tsx` | Next Page | UI View for dashboard > charts > case-category-by-airline > detail |
| `./app/dashboard/charts/report-by-case-category/detail/page.tsx` | Next Page | UI View for dashboard > charts > report-by-case-category > detail |
| `./app/dashboard/charts/airline-report/detail/page.tsx` | Next Page | UI View for dashboard > charts > airline-report > detail |
| `./app/dashboard/charts/branch-report/detail/page.tsx` | Next Page | UI View for dashboard > charts > branch-report > detail |
| `./app/dashboard/layout.tsx` | Next Layout | Shared layout for app/dashboard |
| `./app/dashboard/loading.tsx` | Next Loading UI | Skeleton loader for app/dashboard |
| `./app/dashboard/dashboard-theme.css` | Other | Source/Resource: dashboard-theme.css |
| `./app/dashboard/(main)/analyst/drilldown/page.tsx` | Next Page | UI View for dashboard > (main) > analyst > drilldown |
| `./app/dashboard/(main)/analyst/calendar/page.tsx` | Next Page | UI View for dashboard > (main) > analyst > calendar |
| `./app/dashboard/(main)/analyst/ai-reports/ReportAnalysisTable.tsx` | Other | Source/Resource: ReportAnalysisTable.tsx |
| `./app/dashboard/(main)/analyst/ai-reports/page.tsx` | Next Page | UI View for dashboard > (main) > analyst > ai-reports |
| `./app/dashboard/(main)/analyst/dashboards/page.tsx` | Next Page | UI View for dashboard > (main) > analyst > dashboards |
| `./app/dashboard/(main)/analyst/error.tsx` | Next Error UI | Error boundary for app/dashboard/(main)/analyst |
| `./app/dashboard/(main)/analyst/meetings/page.tsx` | Next Page | UI View for dashboard > (main) > analyst > meetings |
| `./app/dashboard/(main)/analyst/import/page.tsx` | Next Page | UI View for dashboard > (main) > analyst > import |
| `./app/dashboard/(main)/analyst/builder/page.tsx` | Next Page | UI View for dashboard > (main) > analyst > builder |
| `./app/dashboard/(main)/analyst/page.tsx` | Next Page | UI View for dashboard > (main) > analyst |
| `./app/dashboard/(main)/analyst/notifications/page.tsx` | Next Page | UI View for dashboard > (main) > analyst > notifications |
| `./app/dashboard/(main)/analyst/reports/[id]/page.tsx` | Next Page | UI View for dashboard > (main) > analyst > reports > [id] |
| `./app/dashboard/(main)/analyst/reports/page.tsx` | Next Page | UI View for dashboard > (main) > analyst > reports |
| `./app/dashboard/(main)/hc/library/loading.tsx` | Next Loading UI | Skeleton loader for app/dashboard/(main)/hc/library |
| `./app/dashboard/(main)/hc/library/page.tsx` | Next Page | UI View for dashboard > (main) > hc > library |
| `./app/dashboard/(main)/hc/layout.tsx` | Next Layout | Shared layout for app/dashboard/(main)/hc |
| `./app/dashboard/(main)/hc/loading.tsx` | Next Loading UI | Skeleton loader for app/dashboard/(main)/hc |
| `./app/dashboard/(main)/hc/page.tsx` | Next Page | UI View for dashboard > (main) > hc |
| `./app/dashboard/(main)/op/ai-reports/page.tsx` | Next Page | UI View for dashboard > (main) > op > ai-reports |
| `./app/dashboard/(main)/op/irregularity-complaint-top-cases/page.tsx` | Next Page | UI View for dashboard > (main) > op > irregularity-complaint-top-cases |
| `./app/dashboard/(main)/op/root-cause-dominant/root-cause-analytics.ts` | Other | Source/Resource: root-cause-analytics.ts |
| `./app/dashboard/(main)/op/root-cause-dominant/page.tsx` | Next Page | UI View for dashboard > (main) > op > root-cause-dominant |
| `./app/dashboard/(main)/op/joumpa/page.tsx` | Next Page | UI View for dashboard > (main) > op > joumpa |
| `./app/dashboard/(main)/op/complaint-by-category/complaint-analytics.ts` | Other | Source/Resource: complaint-analytics.ts |
| `./app/dashboard/(main)/op/complaint-by-category/page.tsx` | Next Page | UI View for dashboard > (main) > op > complaint-by-category |
| `./app/dashboard/(main)/op/layout.tsx` | Next Layout | Shared layout for app/dashboard/(main)/op |
| `./app/dashboard/(main)/op/loading.tsx` | Next Loading UI | Skeleton loader for app/dashboard/(main)/op |
| `./app/dashboard/(main)/op/page.tsx` | Next Page | UI View for dashboard > (main) > op |
| `./app/dashboard/(main)/op/reports/[id]/page.tsx` | Next Page | UI View for dashboard > (main) > op > reports > [id] |
| `./app/dashboard/(main)/op/reports/page.tsx` | Next Page | UI View for dashboard > (main) > op > reports |
| `./app/dashboard/(main)/admin/drilldown/page.tsx` | Next Page | UI View for dashboard > (main) > admin > drilldown |
| `./app/dashboard/(main)/admin/external-links/page.tsx` | Next Page | UI View for dashboard > (main) > admin > external-links |
| `./app/dashboard/(main)/admin/security/page.tsx` | Next Page | UI View for dashboard > (main) > admin > security |
| `./app/dashboard/(main)/admin/users/page.tsx` | Next Page | UI View for dashboard > (main) > admin > users |
| `./app/dashboard/(main)/admin/page.tsx` | Next Page | UI View for dashboard > (main) > admin |
| `./app/dashboard/(main)/admin/notifications/page.tsx` | Next Page | UI View for dashboard > (main) > admin > notifications |
| `./app/dashboard/(main)/admin/reports/[id]/page.tsx` | Next Page | UI View for dashboard > (main) > admin > reports > [id] |
| `./app/dashboard/(main)/admin/reports/page.tsx` | Next Page | UI View for dashboard > (main) > admin > reports |
| `./app/dashboard/(main)/lookers/page.tsx` | Next Page | UI View for dashboard > (main) > lookers |
| `./app/dashboard/(main)/eskalasi/op/page.tsx` | Next Page | UI View for dashboard > (main) > eskalasi > op |
| `./app/dashboard/(main)/eskalasi/laporan-divisi/page.tsx` | Next Page | UI View for dashboard > (main) > eskalasi > laporan-divisi |
| `./app/dashboard/(main)/eskalasi/ht/page.tsx` | Next Page | UI View for dashboard > (main) > eskalasi > ht |
| `./app/dashboard/(main)/eskalasi/os/page.tsx` | Next Page | UI View for dashboard > (main) > eskalasi > os |
| `./app/dashboard/(main)/eskalasi/select/layout.tsx` | Next Layout | Shared layout for app/dashboard/(main)/eskalasi/select |
| `./app/dashboard/(main)/eskalasi/select/page.tsx` | Next Page | UI View for dashboard > (main) > eskalasi > select |
| `./app/dashboard/(main)/eskalasi/page.tsx` | Next Page | UI View for dashboard > (main) > eskalasi |
| `./app/dashboard/(main)/uq/ai-reports/page.tsx` | Next Page | UI View for dashboard > (main) > uq > ai-reports |
| `./app/dashboard/(main)/uq/page.tsx` | Next Page | UI View for dashboard > (main) > uq |
| `./app/dashboard/(main)/uq/reports/[id]/page.tsx` | Next Page | UI View for dashboard > (main) > uq > reports > [id] |
| `./app/dashboard/(main)/uq/reports/page.tsx` | Next Page | UI View for dashboard > (main) > uq > reports |
| `./app/dashboard/(main)/ht/ai-reports/page.tsx` | Next Page | UI View for dashboard > (main) > ht > ai-reports |
| `./app/dashboard/(main)/ht/page.tsx` | Next Page | UI View for dashboard > (main) > ht |
| `./app/dashboard/(main)/ht/reports/page.tsx` | Next Page | UI View for dashboard > (main) > ht > reports |
| `./app/dashboard/(main)/layout.tsx` | Next Layout | Shared layout for app/dashboard/(main) |
| `./app/dashboard/(main)/error.tsx` | Next Error UI | Error boundary for app/dashboard/(main) |
| `./app/dashboard/(main)/ot/case-status/page.tsx` | Next Page | UI View for dashboard > (main) > ot > case-status |
| `./app/dashboard/(main)/ot/ai-reports/page.tsx` | Next Page | UI View for dashboard > (main) > ot > ai-reports |
| `./app/dashboard/(main)/ot/gse/page.tsx` | Next Page | UI View for dashboard > (main) > ot > gse |
| `./app/dashboard/(main)/ot/complaint-by-category/page.tsx` | Next Page | UI View for dashboard > (main) > ot > complaint-by-category |
| `./app/dashboard/(main)/ot/risk-severity/page.tsx` | Next Page | UI View for dashboard > (main) > ot > risk-severity |
| `./app/dashboard/(main)/ot/page.tsx` | Next Page | UI View for dashboard > (main) > ot |
| `./app/dashboard/(main)/ot/reports/[id]/page.tsx` | Next Page | UI View for dashboard > (main) > ot > reports > [id] |
| `./app/dashboard/(main)/ot/reports/page.tsx` | Next Page | UI View for dashboard > (main) > ot > reports |
| `./app/dashboard/(main)/os/drilldown/page.tsx` | Next Page | UI View for dashboard > (main) > os > drilldown |
| `./app/dashboard/(main)/os/calendar/loading.tsx` | Next Loading UI | Skeleton loader for app/dashboard/(main)/os/calendar |
| `./app/dashboard/(main)/os/calendar/page.tsx` | Next Page | UI View for dashboard > (main) > os > calendar |
| `./app/dashboard/(main)/os/ai-reports/page.tsx` | Next Page | UI View for dashboard > (main) > os > ai-reports |
| `./app/dashboard/(main)/os/joumpa/page.tsx` | Next Page | UI View for dashboard > (main) > os > joumpa |
| `./app/dashboard/(main)/os/handbook/page.tsx` | Next Page | UI View for dashboard > (main) > os > handbook |
| `./app/dashboard/(main)/os/wsn/page.tsx` | Next Page | UI View for dashboard > (main) > os > wsn |
| `./app/dashboard/(main)/os/sla/page.tsx` | Next Page | UI View for dashboard > (main) > os > sla |
| `./app/dashboard/(main)/os/meetings/page.tsx` | Next Page | UI View for dashboard > (main) > os > meetings |
| `./app/dashboard/(main)/os/page.tsx` | Next Page | UI View for dashboard > (main) > os |
| `./app/dashboard/(main)/os/reports/[id]/page.tsx` | Next Page | UI View for dashboard > (main) > os > reports > [id] |
| `./app/dashboard/(main)/os/reports/page.tsx` | Next Page | UI View for dashboard > (main) > os > reports |
| `./app/dashboard/(main)/loading.tsx` | Next Loading UI | Skeleton loader for app/dashboard/(main) |
| `./app/dashboard/(main)/employee/analyst/page.tsx` | Next Page | UI View for dashboard > (main) > employee > analyst |
| `./app/dashboard/(main)/employee/ai-reports/page.tsx` | Next Page | UI View for dashboard > (main) > employee > ai-reports |
| `./app/dashboard/(main)/employee/op/page.tsx` | Next Page | UI View for dashboard > (main) > employee > op |
| `./app/dashboard/(main)/employee/quick-access/page.tsx` | Next Page | UI View for dashboard > (main) > employee > quick-access |
| `./app/dashboard/(main)/employee/new/page.tsx` | Next Page | UI View for dashboard > (main) > employee > new |
| `./app/dashboard/(main)/employee/error.tsx` | Next Error UI | Error boundary for app/dashboard/(main)/employee |
| `./app/dashboard/(main)/employee/page.tsx` | Next Page | UI View for dashboard > (main) > employee |
| `./app/dashboard/(main)/employee/reports/[id]/page.tsx` | Next Page | UI View for dashboard > (main) > employee > reports > [id] |
| `./app/dashboard/(main)/employee/reports/page.tsx` | Next Page | UI View for dashboard > (main) > employee > reports |
| `./app/layout.tsx` | Next Layout | Shared layout for app |
| `./app/actions/getHubs.ts` | Other | Source/Resource: getHubs.ts |
| `./app/api/calendar/events/route.ts` | API Route | API endpoint for calendar |
| `./app/api/calendar/events/[id]/route.ts` | API Route | API endpoint for calendar |
| `./app/api/external-links/route.ts` | API Route | API endpoint for external-links |
| `./app/api/embed/stats/route.ts` | API Route | API endpoint for embed |
| `./app/api/embed/reports/route.ts` | API Route | API endpoint for embed |
| `./app/api/security/ingest/route.ts` | API Route | API endpoint for security |
| `./app/api/security/sessions/route.ts` | API Route | API endpoint for security |
| `./app/api/security/actions/alert-control/route.ts` | API Route | API endpoint for security |
| `./app/api/security/actions/ip-control/route.ts` | API Route | API endpoint for security |
| `./app/api/security/dashboard-data/route.ts` | API Route | API endpoint for security |
| `./app/api/auth/verify-division-password/route.ts` | API Route | API endpoint for auth |
| `./app/api/auth/inspect/route.ts` | API Route | API endpoint for auth |
| `./app/api/auth/bundle/route.ts` | API Route | API endpoint for auth |
| `./app/api/auth/logout/route.ts` | API Route | API endpoint for auth |
| `./app/api/auth/register/route.ts` | API Route | API endpoint for auth |
| `./app/api/auth/me/route.ts` | API Route | API endpoint for auth |
| `./app/api/auth/switch/route.ts` | API Route | API endpoint for auth |
| `./app/api/auth/verify-quick-access/route.ts` | API Route | API endpoint for auth |
| `./app/api/auth/switch-division/route.ts` | API Route | API endpoint for auth |
| `./app/api/auth/login/route.ts` | API Route | API endpoint for auth |
| `./app/api/auth/session/route.ts` | API Route | API endpoint for auth |
| `./app/api/admin/cache-stats/route.ts` | API Route | API endpoint for admin |
| `./app/api/admin/external-links/route.ts` | API Route | API endpoint for admin |
| `./app/api/admin/test-email/route.ts` | API Route | API endpoint for admin |
| `./app/api/admin/sync-reports/route.ts` | API Route | API endpoint for admin |
| `./app/api/admin/sync-reports/cron/route.ts` | API Route | API endpoint for admin |
| `./app/api/admin/users/approve-staff/route.ts` | API Route | API endpoint for admin |
| `./app/api/admin/users/route.ts` | API Route | API endpoint for admin |
| `./app/api/admin/notifications/test/route.ts` | API Route | API endpoint for admin |
| `./app/api/admin/notifications/recipients/route.ts` | API Route | API endpoint for admin |
| `./app/api/admin/stats/route.ts` | API Route | API endpoint for admin |
| `./app/api/admin/analytics/route.ts` | API Route | API endpoint for admin |
| `./app/api/admin/reports/route.ts` | API Route | API endpoint for admin |
| `./app/api/uploads/evidence/token/route.ts` | API Route | API endpoint for uploads |
| `./app/api/uploads/evidence/public/route.ts` | API Route | API endpoint for uploads |
| `./app/api/uploads/evidence/route.ts` | API Route | API endpoint for uploads |
| `./app/api/uploads/document/route.ts` | API Route | API endpoint for uploads |
| `./app/api/uploads/batch/route.ts` | API Route | API endpoint for uploads |
| `./app/api/uploads/media/route.ts` | API Route | API endpoint for uploads |
| `./app/api/joumpa/route.ts` | API Route | API endpoint for joumpa |
| `./app/api/division-documents/route.ts` | API Route | API endpoint for division-documents |
| `./app/api/division-documents/[id]/route.ts` | API Route | API endpoint for division-documents |
| `./app/api/integrations/google-sheets/webhook/route.ts` | API Route | API endpoint for integrations |
| `./app/api/master-data/route.ts` | API Route | API endpoint for master-data |
| `./app/api/wsn/route.ts` | API Route | API endpoint for wsn |
| `./app/api/dashboards/filter-options/route.ts` | API Route | API endpoint for dashboards |
| `./app/api/dashboards/export-insights/route.ts` | API Route | API endpoint for dashboards |
| `./app/api/dashboards/customer-feedback-generate/route.ts` | API Route | API endpoint for dashboards |
| `./app/api/dashboards/ai-generate/route.ts` | API Route | API endpoint for dashboards |
| `./app/api/dashboards/route.ts` | API Route | API endpoint for dashboards |
| `./app/api/dashboards/query/batch/route.ts` | API Route | API endpoint for dashboards |
| `./app/api/dashboards/query/route.ts` | API Route | API endpoint for dashboards |
| `./app/api/dashboards/summary/severity/route.ts` | API Route | API endpoint for dashboards |
| `./app/api/ai/forecast/seasonal/route.ts` | API Route | API endpoint for ai |
| `./app/api/ai/model-info/route.ts` | API Route | API endpoint for ai |
| `./app/api/ai/root-cause/classify/route.ts` | API Route | API endpoint for ai |
| `./app/api/ai/root-cause/categories/route.ts` | API Route | API endpoint for ai |
| `./app/api/ai/root-cause/stats/route.ts` | API Route | API endpoint for ai |
| `./app/api/ai/insights/route.ts` | API Route | API endpoint for ai |
| `./app/api/ai/branch/summary/route.ts` | API Route | API endpoint for ai |
| `./app/api/ai/cache/invalidate/route.ts` | API Route | API endpoint for ai |
| `./app/api/ai/seasonality/forecast/route.ts` | API Route | API endpoint for ai |
| `./app/api/ai/health/route.ts` | API Route | API endpoint for ai |
| `./app/api/ai/similar/route.ts` | API Route | API endpoint for ai |
| `./app/api/ai/summarize/route.ts` | API Route | API endpoint for ai |
| `./app/api/ai/dashboard/summary/route.ts` | API Route | API endpoint for ai |
| `./app/api/ai/gse/ranking/route.ts` | API Route | API endpoint for ai |
| `./app/api/ai/gse/issues/top/route.ts` | API Route | API endpoint for ai |
| `./app/api/ai/gse/serviceability/route.ts` | API Route | API endpoint for ai |
| `./app/api/ai/gse/irregularities/route.ts` | API Route | API endpoint for ai |
| `./app/api/ai/train/route.ts` | API Route | API endpoint for ai |
| `./app/api/ai/analyze/route.ts` | API Route | API endpoint for ai |
| `./app/api/ai/action-summary/route.ts` | API Route | API endpoint for ai |
| `./app/api/ai/analyze-all/route.ts` | API Route | API endpoint for ai |
| `./app/api/ai/risk/calculate/route.ts` | API Route | API endpoint for ai |
| `./app/api/ai/risk/hubs/route.ts` | API Route | API endpoint for ai |
| `./app/api/ai/risk/branches/route.ts` | API Route | API endpoint for ai |
| `./app/api/ai/risk/airlines/route.ts` | API Route | API endpoint for ai |
| `./app/api/ai/risk/summary/route.ts` | API Route | API endpoint for ai |
| `./app/api/investigative-ai/route.ts` | API Route | API endpoint for investigative-ai |
| `./app/api/sla/full-service/route.ts` | API Route | API endpoint for sla |
| `./app/api/reports/refresh/route.ts` | API Route | API endpoint for reports |
| `./app/api/reports/status/route.ts` | API Route | API endpoint for reports |
| `./app/api/reports/public/route.ts` | API Route | API endpoint for reports |
| `./app/api/reports/batch/route.ts` | API Route | API endpoint for reports |
| `./app/api/reports/route.ts` | API Route | API endpoint for reports |
| `./app/api/reports/sync/route.ts` | API Route | API endpoint for reports |
| `./app/api/reports/[id]/comments/route.ts` | API Route | API endpoint for reports |
| `./app/api/reports/[id]/evidence/route.ts` | API Route | API endpoint for reports |
| `./app/api/reports/[id]/route.ts` | API Route | API endpoint for reports |
| `./app/api/reports/analytics/route.ts` | API Route | API endpoint for reports |
| `./app/api/reports/analytics/aggregated/route.ts` | API Route | API endpoint for reports |
| `./app/api/debug/clear-cache/route.ts` | API Route | API endpoint for debug |
| `./app/manifest.ts` | Other | Source/Resource: manifest.ts |
| `./app/page.tsx` | Next Page | UI View for Root |
| `./app/globals.css` | Other | Source/Resource: globals.css |
| `./app/offline/page.tsx` | Next Page | UI View for offline |
| `./vercel.json` | Build/Deploy Config | Configuration: vercel.json |
| `./plans/ai-summary-integration-plan.md` | Documentation | Docs for ai-summary-integration-plan.md |
| `./diagram/1-flow-utama-laporan.mmd` | Other | Source/Resource: 1-flow-utama-laporan.mmd |
| `./diagram/2-flow-login-role.mmd` | Other | Source/Resource: 2-flow-login-role.mmd |
| `./diagram/4-flow-partner-eksekusi.mmd` | Other | Source/Resource: 4-flow-partner-eksekusi.mmd |
| `./diagram/3-flow-petugas-cabang.mmd` | Other | Source/Resource: 3-flow-petugas-cabang.mmd |
| `./diagram/5-flow-validasi-os.mmd` | Other | Source/Resource: 5-flow-validasi-os.mmd |
| `./next.config.mjs` | Build/Deploy Config | Configuration: next.config.mjs |
| `./.mcp.json` | Other | Source/Resource: mcp.json |
| `./.kilo/plans/1775136623637-clever-orchid.md` | Documentation | Docs for 1775136623637-clever-orchid.md |
| `./.kilo/package-lock.json` | Other | Source/Resource: package-lock.json |
| `./.kilo/package.json` | Build/Deploy Config | Configuration: package.json |
| `./.kilo/rules/frontend-designer.md` | Documentation | Docs for frontend-designer.md |
| `./.kilo/kilo.json` | Other | Source/Resource: kilo.json |
| `./.kilo/agent-manager.json` | Other | Source/Resource: agent-manager.json |
| `./.claude/settings.local.json` | Other | Source/Resource: settings.local.json |
| `./security_best_practices_report.md` | Documentation | Docs for security_best_practices_report.md |
| `./docs/specifications/2026-04-16-gapura-oneclick-design-system-spec.md` | Documentation | Docs for 2026-04-16-gapura-oneclick-design-system-spec.md |
| `./next-env.d.ts` | Other | Source/Resource: next-env.d.ts |
| `./supabase/migrations/20260401000000_drop_hc_leave_e_letter_status.sql` | DB Migration / Schema | SQL Definition: 20260401000000_drop_hc_leave_e_letter_status.sql |
| `./supabase/migrations/20260415000000_create_external_links_table.sql` | DB Migration / Schema | SQL Definition: 20260415000000_create_external_links_table.sql |
| `./supabase/migrations/20260328000100_add_sync_state_and_dashboard_cache.sql` | DB Migration / Schema | SQL Definition: 20260328000100_add_sync_state_and_dashboard_cache.sql |
| `./supabase/migrations/20260320000000_create_hc_workspace_tables.sql` | DB Migration / Schema | SQL Definition: 20260320000000_create_hc_workspace_tables.sql |
| `./supabase/migrations/20260321000200_add_hc_leave_soft_delete.sql` | DB Migration / Schema | SQL Definition: 20260321000200_add_hc_leave_soft_delete.sql |
| `./supabase/migrations/20260415000002_add_activity_fields_to_division_documents.sql` | DB Migration / Schema | SQL Definition: 20260415000002_add_activity_fields_to_division_documents.sql |
| `./supabase/migrations/20260227000001_add_calendar_type.sql` | DB Migration / Schema | SQL Definition: 20260227000001_add_calendar_type.sql |
| `./supabase/migrations/20260227000000_branch_role_hierarchy.sql` | DB Migration / Schema | SQL Definition: 20260227000000_branch_role_hierarchy.sql |
| `./supabase/migrations/20260322000000_add_source_fingerprint_to_reports.sql` | DB Migration / Schema | SQL Definition: 20260322000000_add_source_fingerprint_to_reports.sql |
| `./supabase/migrations/20260412000000_add_employee_contact_to_hc_leave_records.sql` | DB Migration / Schema | SQL Definition: 20260412000000_add_employee_contact_to_hc_leave_records.sql |
| `./supabase/migrations/20260321000100_add_hc_leave_submission_status.sql` | DB Migration / Schema | SQL Definition: 20260321000100_add_hc_leave_submission_status.sql |
| `./supabase/migrations/20260414000000_create_rate_limits_table.sql` | DB Migration / Schema | SQL Definition: 20260414000000_create_rate_limits_table.sql |
| `./supabase/migrations/20260415000003_update_wsn_external_links.sql` | DB Migration / Schema | SQL Definition: 20260415000003_update_wsn_external_links.sql |
| `./supabase/migrations/20260304000000_create_reports_sync.sql` | DB Migration / Schema | SQL Definition: 20260304000000_create_reports_sync.sql |
| `./supabase/migrations/20260415000001_seed_external_links.sql` | DB Migration / Schema | SQL Definition: 20260415000001_seed_external_links.sql |
| `./supabase/migrations/20260304000001_create_videos_bucket.sql` | DB Migration / Schema | SQL Definition: 20260304000001_create_videos_bucket.sql |
| `./supabase/migrations/20260226000001_create_calendar_events.sql` | DB Migration / Schema | SQL Definition: 20260226000001_create_calendar_events.sql |
| `./supabase/migrations/20260320010000_update_division_documents_for_targeted_audience.sql` | DB Migration / Schema | SQL Definition: 20260320010000_update_division_documents_for_targeted_audience.sql |
| `./supabase/schema/exported_schema.sql` | DB Migration / Schema | SQL Definition: exported_schema.sql |
| `./supabase/export/PERFORMANCE_OPTIMIZATION_25K_USERS.md` | Documentation | Docs for PERFORMANCE_OPTIMIZATION_25K_USERS.md |
| `./supabase/export/schema.sql` | DB Migration / Schema | SQL Definition: schema.sql |
| `./supabase/export/seed_data.sql` | DB Migration / Schema | SQL Definition: seed_data.sql |
| `./supabase/export/README.md` | Documentation | Docs for README.md |
| `./supabase/export/schema/schema_definition.json` | Other | Source/Resource: schema_definition.json |
| `./supabase/export/OPTIMIZATION_SUMMARY.md` | Documentation | Docs for OPTIMIZATION_SUMMARY.md |
| `./supabase/export/data/reports.json` | Data Export Snapshot | JSON data backup: reports.json |
| `./supabase/export/data/auth_sessions.json` | Data Export Snapshot | JSON data backup: auth_sessions.json |
| `./supabase/export/data/blocked_ips.json` | Data Export Snapshot | JSON data backup: blocked_ips.json |
| `./supabase/export/data/locations.json` | Data Export Snapshot | JSON data backup: locations.json |
| `./supabase/export/data/report_comments.json` | Data Export Snapshot | JSON data backup: report_comments.json |
| `./supabase/export/data/notification_delivery_log.json` | Data Export Snapshot | JSON data backup: notification_delivery_log.json |
| `./supabase/export/data/hc_requests.json` | Data Export Snapshot | JSON data backup: hc_requests.json |
| `./supabase/export/data/auth_schema_migrations.json` | Data Export Snapshot | JSON data backup: auth_schema_migrations.json |
| `./supabase/export/data/incident_types.json` | Data Export Snapshot | JSON data backup: incident_types.json |
| `./supabase/export/data/security_sessions.json` | Data Export Snapshot | JSON data backup: security_sessions.json |
| `./supabase/export/data/auth_identities.json` | Data Export Snapshot | JSON data backup: auth_identities.json |
| `./supabase/export/data/dashboard_charts.json` | Data Export Snapshot | JSON data backup: dashboard_charts.json |
| `./supabase/export/data/units.json` | Data Export Snapshot | JSON data backup: units.json |
| `./supabase/export/data/storage_buckets.json` | Data Export Snapshot | JSON data backup: storage_buckets.json |
| `./supabase/export/data/auth_users.json` | Data Export Snapshot | JSON data backup: auth_users.json |
| `./supabase/export/data/users.json` | Data Export Snapshot | JSON data backup: users.json |
| `./supabase/export/data/storage_migrations.json` | Data Export Snapshot | JSON data backup: storage_migrations.json |
| `./supabase/export/data/stations.json` | Data Export Snapshot | JSON data backup: stations.json |
| `./supabase/export/data/reports_sync.json` | Data Export Snapshot | JSON data backup: reports_sync.json |
| `./supabase/export/data/ai_cache_entries.json` | Data Export Snapshot | JSON data backup: ai_cache_entries.json |
| `./supabase/export/data/storage_objects.json` | Data Export Snapshot | JSON data backup: storage_objects.json |
| `./supabase/export/data/custom_dashboards.json` | Data Export Snapshot | JSON data backup: custom_dashboards.json |
| `./supabase/export/data/hc_request_attachments.json` | Data Export Snapshot | JSON data backup: hc_request_attachments.json |
| `./supabase/export/data/calendar_events.json` | Data Export Snapshot | JSON data backup: calendar_events.json |
| `./supabase/export/data/security_configs.json` | Data Export Snapshot | JSON data backup: security_configs.json |
| `./supabase/export/data/division_documents.json` | Data Export Snapshot | JSON data backup: division_documents.json |
| `./supabase/export/data/security_events.json` | Data Export Snapshot | JSON data backup: security_events.json |
| `./supabase/export/data/notification_recipients.json` | Data Export Snapshot | JSON data backup: notification_recipients.json |
| `./supabase/export/data/audit_logs.json` | Data Export Snapshot | JSON data backup: audit_logs.json |
| `./supabase/export/data/positions.json` | Data Export Snapshot | JSON data backup: positions.json |
| `./supabase/export/data/security_alerts.json` | Data Export Snapshot | JSON data backup: security_alerts.json |
| `./supabase/export/data/ai_audit_logs.json` | Data Export Snapshot | JSON data backup: ai_audit_logs.json |
| `./supabase/export/data/hc_leave_records.json` | Data Export Snapshot | JSON data backup: hc_leave_records.json |
| `./README.md` | Documentation | Docs for README.md |
| `./components/filters/MobileFilterDrawer.tsx` | React Component | Filters UI component |
| `./components/ui/GlassCard.tsx` | React Component | Ui UI component |
| `./components/ui/SignaturePad.tsx` | React Component | Ui UI component |
| `./components/ui/sheet.tsx` | React Component | Ui UI component |
| `./components/ui/tooltip.tsx` | React Component | Ui UI component |
| `./components/ui/MobileActionMenu.tsx` | React Component | Ui UI component |
| `./components/ui/PrismButton.tsx` | React Component | Ui UI component |
| `./components/ui/AuroraBackground.tsx` | React Component | Ui UI component |
| `./components/ui/QRCodeWithLogo.tsx` | React Component | Ui UI component |
| `./components/ui/NoiseTexture.tsx` | React Component | Ui UI component |
| `./components/ui/PrismSelect.tsx` | React Component | Ui UI component |
| `./components/ui/WizardStep.tsx` | React Component | Ui UI component |
| `./components/ui/PrismMultiSelect.tsx` | React Component | Ui UI component |
| `./components/ui/index.ts` | Other | Source/Resource: index.ts |
| `./components/ui/button.tsx` | React Component | Ui UI component |
| `./components/ui/dropdown-menu.tsx` | React Component | Ui UI component |
| `./components/ui/PrismInput.tsx` | React Component | Ui UI component |
| `./components/ui/carousel.tsx` | React Component | Ui UI component |
| `./components/EmbedDetailLayout.tsx` | React Component | Embeddetaillayout.tsx UI component |
| `./components/tables/CardViewTable.tsx` | React Component | Tables UI component |
| `./components/tables/ResponsiveTable.tsx` | React Component | Tables UI component |
| `./components/chart-detail/custom-charts/SubCategoryDetailChart.tsx` | React Component | Chart-detail UI component |
| `./components/chart-detail/custom-charts/StatusBreakdownChart.tsx` | React Component | Chart-detail UI component |
| `./components/chart-detail/custom-charts/SeverityDistributionChart.tsx` | React Component | Chart-detail UI component |
| `./components/chart-detail/custom-charts/AirlineTypeCategoryChart.tsx` | React Component | Chart-detail UI component |
| `./components/chart-detail/custom-charts/MonthlyTrendChart.tsx` | React Component | Chart-detail UI component |
| `./components/chart-detail/custom-charts/CategoryDistributionChart.tsx` | React Component | Chart-detail UI component |
| `./components/chart-detail/custom-charts/AreaSubCategoryChart.tsx` | React Component | Chart-detail UI component |
| `./components/chart-detail/custom-charts/TargetDivisionChart.tsx` | React Component | Chart-detail UI component |
| `./components/chart-detail/custom-charts/CategoryByBranchChart.tsx` | React Component | Chart-detail UI component |
| `./components/chart-detail/custom-charts/index.ts` | Other | Source/Resource: index.ts |
| `./components/chart-detail/custom-charts/PriorityChart.tsx` | React Component | Chart-detail UI component |
| `./components/chart-detail/ChartDetailPage.tsx` | React Component | Chart-detail UI component |
| `./components/chart-detail/InvestigativeTable.tsx` | React Component | Chart-detail UI component |
| `./components/chart-detail/DataTableWithPagination.tsx` | React Component | Chart-detail UI component |
| `./components/chart-detail/VoiceDrilldownDrawer.tsx` | React Component | Chart-detail UI component |
| `./components/chart-detail/SummaryCards.tsx` | React Component | Chart-detail UI component |
| `./components/chart-detail/SupportingCharts.tsx` | React Component | Chart-detail UI component |
| `./components/chart-detail/InsightPanel.tsx` | React Component | Chart-detail UI component |
| `./components/chart-detail/AreaAnalysisChart.tsx` | React Component | Chart-detail UI component |
| `./components/chart-detail/ChartClickHandler.tsx` | React Component | Chart-detail UI component |
| `./components/chart-detail/DrilldownDrawer.tsx` | React Component | Chart-detail UI component |
| `./components/chart-detail/GlobalControlBar.tsx` | React Component | Chart-detail UI component |
| `./components/chart-detail/useDrilldown.tsx` | React Component | Chart-detail UI component |
| `./components/chart-detail/useVoiceDrilldown.tsx` | React Component | Chart-detail UI component |
| `./components/chart-detail/DetailFilterHeader.tsx` | React Component | Chart-detail UI component |
| `./components/chart-detail/ai/AirlineAIVisualization.tsx` | React Component | Chart-detail UI component |
| `./components/chart-detail/ai/BranchRiskVisualization.tsx` | React Component | Chart-detail UI component |
| `./components/chart-detail/ai/BranchAIVisualization.tsx` | React Component | Chart-detail UI component |
| `./components/chart-detail/BranchAreaGrid.tsx` | React Component | Chart-detail UI component |
| `./components/chart-detail/EnlargedChart.tsx` | React Component | Chart-detail UI component |
| `./components/chart-detail/AIInsightsPanel.tsx` | React Component | Chart-detail UI component |
| `./components/chart-detail/ParetoChart.tsx` | React Component | Chart-detail UI component |
| `./components/chart-detail/GroupedBarChart.tsx` | React Component | Chart-detail UI component |
| `./components/PerformanceTelemetry.tsx` | React Component | Performancetelemetry.tsx UI component |
| `./components/PWAUpdatePrompt.tsx` | React Component | Pwaupdateprompt.tsx UI component |
| `./components/calendar/calendar-styles.css` | Other | Source/Resource: calendar-styles.css |
| `./components/calendar/EventDetailModal.tsx` | React Component | Calendar UI component |
| `./components/calendar/QuickEditPopover.tsx` | React Component | Calendar UI component |
| `./components/calendar/EventModal.tsx` | React Component | Calendar UI component |
| `./components/calendar/CalendarPage.tsx` | React Component | Calendar UI component |
| `./components/calendar/CalendarHeader.tsx` | React Component | Calendar UI component |
| `./components/calendar/Calendar.tsx` | React Component | Calendar UI component |
| `./components/calendar/CalendarPageLoader.tsx` | React Component | Calendar UI component |
| `./components/embed/DashboardBuilder.tsx` | React Component | Embed UI component |
| `./components/embed/EmbedCard.tsx` | React Component | Embed UI component |
| `./components/embed/DateRangeFilter.tsx` | React Component | Embed UI component |
| `./components/hc/HCLibraryClient.tsx` | React Component | Hc UI component |
| `./components/hc/HCDocumentManagementPage.tsx` | React Component | Hc UI component |
| `./components/security/LiveSecurityFeed.tsx` | React Component | Security UI component |
| `./components/security/ThreatPatternHeatMap.tsx` | React Component | Security UI component |
| `./components/security/ActiveSessions.tsx` | React Component | Security UI component |
| `./components/security/PrettyPayload.tsx` | React Component | Security UI component |
| `./components/security/ThreatActorAnalysis.tsx` | React Component | Security UI component |
| `./components/auth/LoginForm.tsx` | React Component | Auth UI component |
| `./components/auth/LoginFormLoader.tsx` | React Component | Auth UI component |
| `./components/layout/ResponsiveContainer.tsx` | React Component | Layout UI component |
| `./components/layout/DashboardFrame.tsx` | React Component | Layout UI component |
| `./components/MobileBottomNav.tsx` | React Component | Mobilebottomnav.tsx UI component |
| `./components/charts/ResponsivePieChart.tsx` | React Component | Charts UI component |
| `./components/charts/area-sub-category/AreaSubCategoryDetail.tsx` | React Component | Charts UI component |
| `./components/charts/ai-root-cause/AiRootCauseInvestigation.tsx` | React Component | Charts UI component |
| `./components/charts/hub-report/data.ts` | Other | Source/Resource: data.ts |
| `./components/charts/hub-report/HubAiRiskVisualization.tsx` | React Component | Charts UI component |
| `./components/charts/hub-report/HubReportDetail.tsx` | React Component | Charts UI component |
| `./components/charts/ChartTitle.tsx` | React Component | Charts UI component |
| `./components/charts/MonthlyTrendChart.tsx` | React Component | Charts UI component |
| `./components/charts/area-report/data.ts` | Other | Source/Resource: data.ts |
| `./components/charts/area-report/AreaReportDetail.tsx` | React Component | Charts UI component |
| `./components/charts/case-category-by-branch/data.ts` | Other | Source/Resource: data.ts |
| `./components/charts/case-category-by-branch/BranchIntelligenceDetail.tsx` | React Component | Charts UI component |
| `./components/charts/ComparisonTable.tsx` | React Component | Charts UI component |
| `./components/charts/chartConfig.ts` | Other | Source/Resource: chartConfig.ts |
| `./components/charts/ResponsiveLineChart.tsx` | React Component | Charts UI component |
| `./components/charts/category-by-area/data.ts` | Other | Source/Resource: data.ts |
| `./components/charts/category-by-area/AreaIntelligenceDetail.tsx` | React Component | Charts UI component |
| `./components/charts/monthly-report/data.ts` | Other | Source/Resource: data.ts |
| `./components/charts/monthly-report/MonthlyReportDetail.tsx` | React Component | Charts UI component |
| `./components/charts/pivot-report/data.ts` | Other | Source/Resource: data.ts |
| `./components/charts/pivot-report/PivotReportDetail.tsx` | React Component | Charts UI component |
| `./components/charts/case-category-by-airline/data.ts` | Other | Source/Resource: data.ts |
| `./components/charts/case-category-by-airline/AirlineIntelligenceDetail.tsx` | React Component | Charts UI component |
| `./components/charts/ResponsiveBarChart.tsx` | React Component | Charts UI component |
| `./components/charts/report-by-case-category/data.ts` | Other | Source/Resource: data.ts |
| `./components/charts/report-by-case-category/ReportByCaseCategoryDetail.tsx` | React Component | Charts UI component |
| `./components/charts/airline-report/data.ts` | Other | Source/Resource: data.ts |
| `./components/charts/airline-report/AirlineReportDetail.tsx` | React Component | Charts UI component |
| `./components/charts/HeatmapChart.tsx` | React Component | Charts UI component |
| `./components/charts/branch-report/data.ts` | Other | Source/Resource: data.ts |
| `./components/charts/branch-report/BranchReportDetail.tsx` | React Component | Charts UI component |
| `./components/lookers/LookersVersionPage.tsx` | React Component | Lookers UI component |
| `./components/GuestNav.tsx` | React Component | Guestnav.tsx UI component |
| `./components/dashboard/analytics-source-strip.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/DocxEditorModal.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/tabs/CgoCargoReportTab.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/tabs/SummaryReportTab.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/tabs/shared/chart-ui.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/tabs/GsePerformanceTab.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/tabs/ServiceQualityImprovementTab.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/tabs/JoumpaServiceTab.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/tabs/DelayCodeReportTab.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/tabs/summary/summary-utils.ts` | Other | Source/Resource: summary-utils.ts |
| `./components/dashboard/tabs/summary/MonthlyAreaWorkbookTable.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/tabs/summary/types.ts` | Other | Source/Resource: types.ts |
| `./components/dashboard/tabs/summary/SummaryDetailArchive.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/tabs/summary/SummaryDenseTable.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/tabs/summary/SummarySectionCard.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/tabs/summary/SummaryMatrixTable.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/EvidenceViewModal.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/ChartDetailPage.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/analyst/OSAnalystCharts.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/analyst/AnalystCharts.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/analyst/ResponsiveHeader.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/analyst/ReportsTableSection.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/analyst/ChartSection.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/analyst/CustomerFeedbackFilterModal.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/analyst/StatsCard.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/analyst/ResponsiveStatsGrid.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/analyst/ExecutiveSummaryTables.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/analyst/DashboardLinkModals.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/analyst/OPAnalystCharts.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/analyst/ReportsList.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/BriefingEditorModal.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/op-metric-card.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/DivisionAnalystDashboard.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/NotificationSettings.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/ChartFilters.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/ai-reports/AIReportsPage.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/ai-reports/AIVisualizations.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/ai-reports/OverviewSection.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/ai-reports/RouteHeatmap.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/ai-reports/EntityAnalyticsDashboard.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/ai-reports/EntitySummaryStats.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/ai-reports/DivisionAIReportsDashboard.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/ai-reports/TopAirlinesChart.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/ai-reports/ResponsiveAITabs.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/ai-reports/AIBatchAnalysisView.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/ai-reports/ResponsiveAIHeader.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/ai-reports/HubDistribution.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/ai-reports/AIAnalysisFilterPanel.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/ai-reports/AIAssistantChat.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/ai-reports/EntityFilterBar.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/op-analytics-filter-bar.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/DashboardWorkspaceSkeleton.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/ai-summary/RiskSummaryCard.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/ai-summary/ActionSummaryCard.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/ai-summary/AISummaryKPICards.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/ai-summary/AIAnalysisSection.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/ai-summary/types.ts` | Other | Source/Resource: types.ts |
| `./components/dashboard/ai-summary/index.ts` | Other | Source/Resource: index.ts |
| `./components/dashboard/DivisionReportsPage.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/PresentationSlide.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/ReportDownloadModal.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/ReportDetailView.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/ReportMasterDetail.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/OPDashboardClient.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/CreateReportModal.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/JoumpaDashboard.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/TimePeriodFilter.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/AnalystOSDashboard.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/ReportDetailModal.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/op-page-layout.tsx` | Next Layout | Shared layout for components/dashboard |
| `./components/dashboard/DashboardHeader.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/analytics-metric-card.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/AnalyticsDashboard.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/action-summary-insight-panel.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/DivisionDashboardClientLoader.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/customer-feedback/FeedbackPivotTable.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/customer-feedback/CustomerFeedbackView.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/customer-feedback/FeedbackKPI.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/customer-feedback/FeedbackBarChart.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/customer-feedback/FeedbackDonutChart.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/DrilldownDetailView.tsx` | React Component | Dashboard UI component |
| `./components/dashboard/reports/CommentInput.tsx` | React Component | Dashboard UI component |
| `./components/PWAProvider.tsx` | React Component | Pwaprovider.tsx UI component |
| `./components/QuickAccessPasswordModal.tsx` | React Component | Quickaccesspasswordmodal.tsx UI component |
| `./components/ai/AiBranchSummary.tsx` | React Component | Ai UI component |
| `./components/ai/AiSeasonalForecast.tsx` | React Component | Ai UI component |
| `./components/ai/AiSeasonalityForecast.tsx` | React Component | Ai UI component |
| `./components/ai/AiReportSummary.tsx` | React Component | Ai UI component |
| `./components/Sidebar.tsx` | React Component | Sidebar.tsx UI component |
| `./components/OfflineIndicator.tsx` | React Component | Offlineindicator.tsx UI component |
| `./components/MobileNavWrapper.tsx` | React Component | Mobilenavwrapper.tsx UI component |
| `./components/PWAInstallPrompt.tsx` | React Component | Pwainstallprompt.tsx UI component |
| `./components/builder/pivot/PivotHeader.tsx` | React Component | Builder UI component |
| `./components/builder/pivot/PivotGrid.tsx` | React Component | Builder UI component |
| `./components/builder/pivot/PivotCell.tsx` | React Component | Builder UI component |
| `./components/builder/pivot/usePivotData.ts` | Other | Source/Resource: usePivotData.ts |
| `./components/builder/ResultsPanel.tsx` | React Component | Builder UI component |
| `./components/builder/DynamicFilterHeader.tsx` | React Component | Builder UI component |
| `./components/builder/FilterBuilder.tsx` | React Component | Builder UI component |
| `./components/builder/ChartPreview.tsx` | React Component | Builder UI component |
| `./components/builder/SaveDashboardModal.tsx` | React Component | Builder UI component |
| `./components/builder/ResponsiveDashboardComposer.tsx` | React Component | Builder UI component |
| `./components/builder/ExecutivePivotView.tsx` | React Component | Builder UI component |
| `./components/builder/CustomPivotTable.tsx` | React Component | Builder UI component |
| `./components/builder/TileCard.tsx` | React Component | Builder UI component |
| `./components/builder/ResponsiveFieldSidebar.tsx` | React Component | Builder UI component |
| `./components/builder/ChartConfigPanel.tsx` | React Component | Builder UI component |
| `./components/builder/CustomTable.tsx` | React Component | Builder UI component |
| `./components/builder/DashboardComposer.tsx` | React Component | Builder UI component |
| `./components/builder/MobileBuilderTabs.tsx` | React Component | Builder UI component |
| `./components/builder/BuilderLayout.tsx` | React Component | Builder UI component |
| `./components/builder/QueryPanel.tsx` | React Component | Builder UI component |
| `./components/builder/DataTable.tsx` | React Component | Builder UI component |
| `./components/builder/DashboardSidebar.tsx` | React Component | Builder UI component |
| `./components/builder/FieldSidebar.tsx` | React Component | Builder UI component |
| `./components/builder/ResponsiveBuilderLayout.tsx` | React Component | Builder UI component |
| `./components/public-report/PublicReportLoader.tsx` | React Component | Public-report UI component |
| `./components/public-report/StaticBentoGrid.tsx` | React Component | Public-report UI component |
| `./components/public-report/PublicReportWizard.tsx` | React Component | Public-report UI component |
| `./components/Providers.tsx` | React Component | Providers.tsx UI component |
| `./public/file.svg` | Static Asset | Asset: file.svg |
| `./public/.well-known/assetlinks.json` | Static Asset | Asset: assetlinks.json |
| `./public/front-image-3.svg` | Static Asset | Asset: front-image-3.svg |
| `./public/front-image-2.svg` | Static Asset | Asset: front-image-2.svg |
| `./public/vercel.svg` | Static Asset | Asset: vercel.svg |
| `./public/next.svg` | Static Asset | Asset: next.svg |
| `./public/noise.svg` | Static Asset | Asset: noise.svg |
| `./public/globe.svg` | Static Asset | Asset: globe.svg |
| `./public/window.svg` | Static Asset | Asset: window.svg |
| `./public/sw.js` | Static Asset | Asset: sw.js |
| `./package-lock.json` | Other | Source/Resource: package-lock.json |
| `./package.json` | Build/Deploy Config | Configuration: package.json |
| `./hooks/useFilterOptions.ts` | React Hook | Custom hook for useFilterOptions.ts |
| `./hooks/use-reports-cache.ts` | React Hook | Custom hook for use-reports-cache.ts |
| `./hooks/useOfflineStorage.ts` | React Hook | Custom hook for useOfflineStorage.ts |
| `./hooks/useViewport.ts` | React Hook | Custom hook for useViewport.ts |
| `./scripts/debug-report-counts.cjs` | Automation Script | Tooling/Script: debug-report-counts.cjs |
| `./scripts/debug-report-counts.mjs` | Automation Script | Tooling/Script: debug-report-counts.mjs |
| `./scripts/simulate-threat.ts` | Automation Script | Tooling/Script: simulate-threat.ts |
| `./scripts/debug-live-schema.ts` | Automation Script | Tooling/Script: debug-live-schema.ts |
| `./scripts/google-sheets-webhook.gs` | Automation Script | Tooling/Script: google-sheets-webhook.gs |
| `./scripts/sync-reports-node.mjs` | Automation Script | Tooling/Script: sync-reports-node.mjs |
| `./scripts/fix-math-intrinsics.js` | Automation Script | Tooling/Script: fix-math-intrinsics.js |
| `./scripts/debug-sheets.ts` | Automation Script | Tooling/Script: debug-sheets.ts |
| `./scripts/check-node-version.js` | Automation Script | Tooling/Script: check-node-version.js |
| `./scripts/security-guardrails.mjs` | Automation Script | Tooling/Script: security-guardrails.mjs |
| `./scripts/debug-sheets-headers.ts` | Automation Script | Tooling/Script: debug-sheets-headers.ts |
| `./scripts/test-compression.mjs` | Automation Script | Tooling/Script: test-compression.mjs |
| `./scripts/sync-scheduler.mjs` | Automation Script | Tooling/Script: sync-scheduler.mjs |
| `./scripts/check-data.mjs` | Automation Script | Tooling/Script: check-data.mjs |
| `./scripts/backfill-reporter-email.mjs` | Automation Script | Tooling/Script: backfill-reporter-email.mjs |
| `./scripts/check-headers.ts` | Automation Script | Tooling/Script: check-headers.ts |
| `./scripts/sync-reports.sh` | Automation Script | Tooling/Script: sync-reports.sh |
| `./scripts/test-data-consistency.js` | Automation Script | Tooling/Script: test-data-consistency.js |
| `./scripts/build-sw.mjs` | Automation Script | Tooling/Script: build-sw.mjs |
| `./scripts/explore-google-sheet.ts` | Automation Script | Tooling/Script: explore-google-sheet.ts |
| `./scripts/add-triage-columns.ts` | Automation Script | Tooling/Script: add-triage-columns.ts |
| `./scripts/verify-no-duplicates.mjs` | Automation Script | Tooling/Script: verify-no-duplicates.mjs |
| `./scripts/diagnose-data.js` | Automation Script | Tooling/Script: diagnose-data.js |
| `./scripts/auto-sync-daemon.mjs` | Automation Script | Tooling/Script: auto-sync-daemon.mjs |
| `./scripts/debug-sheets.mjs` | Automation Script | Tooling/Script: debug-sheets.mjs |
| `./instrumentation-client.ts` | Other | Source/Resource: instrumentation-client.ts |
| `./proxy.ts` | Other | Source/Resource: proxy.ts |
| `./List Keamanan Gapura Oneclick.md` | Documentation | Docs for List Keamanan Gapura Oneclick.md |
| `./lib/nav-config.ts` | Shared Library | Shared utility: nav-config.ts |
| `./lib/op-shortcut-source-matrix.ts` | Shared Library | Shared utility: op-shortcut-source-matrix.ts |
| `./lib/auth-utils.ts` | Shared Library | Shared utility: auth-utils.ts |
| `./lib/hf-client.ts` | Shared Library | Shared utility: hf-client.ts |
| `./lib/external-links.ts` | Shared Library | Shared utility: external-links.ts |
| `./lib/supabase-admin.ts` | Shared Library | Shared utility: supabase-admin.ts |
| `./lib/report-persistence.ts` | Shared Library | Shared utility: report-persistence.ts |
| `./lib/google-sheets.ts` | Shared Library | Shared utility: google-sheets.ts |
| `./lib/op-shortcut-analytics.ts` | Shared Library | Shared utility: op-shortcut-analytics.ts |
| `./lib/gse-api.ts` | Shared Library | Shared utility: gse-api.ts |
| `./lib/ai-route-cache.ts` | Shared Library | Shared utility: ai-route-cache.ts |
| `./lib/security/sanitize.ts` | Security Library | Security logic: sanitize.ts |
| `./lib/security/botid.ts` | Security Library | Security logic: botid.ts |
| `./lib/security/audit-logger.ts` | Security Library | Security logic: audit-logger.ts |
| `./lib/security/perf-audit.ts` | Security Library | Security logic: perf-audit.ts |
| `./lib/security/file-validation.ts` | Security Library | Security logic: file-validation.ts |
| `./lib/security/utils.ts` | Security Library | Security logic: utils.ts |
| `./lib/security/detection-engine.ts` | Security Library | Security logic: detection-engine.ts |
| `./lib/security/api-handler.ts` | Security Library | Security logic: api-handler.ts |
| `./lib/security/compliance-engine.ts` | Security Library | Security logic: compliance-engine.ts |
| `./lib/security/rate-limit.ts` | Security Library | Security logic: rate-limit.ts |
| `./lib/security/event-service.ts` | Security Library | Security logic: event-service.ts |
| `./lib/auth/client-logout.ts` | Shared Library | Shared utility: client-logout.ts |
| `./lib/notifications.ts` | Shared Library | Shared utility: notifications.ts |
| `./lib/report-fingerprint.ts` | Shared Library | Shared utility: report-fingerprint.ts |
| `./lib/permissions.ts` | Shared Library | Shared utility: permissions.ts |
| `./lib/constants/breakpoints.ts` | Shared Library | Shared utility: breakpoints.ts |
| `./lib/constants/report-status.ts` | Shared Library | Shared utility: report-status.ts |
| `./lib/constants/irregularity-types.ts` | Shared Library | Shared utility: irregularity-types.ts |
| `./lib/constants/divisions.ts` | Shared Library | Shared utility: divisions.ts |
| `./lib/constants/airlines.ts` | Shared Library | Shared utility: airlines.ts |
| `./lib/analyst-export.ts` | Shared Library | Shared utility: analyst-export.ts |
| `./lib/dashboard-export.ts` | Shared Library | Shared utility: dashboard-export.ts |
| `./lib/dashboard-cache.ts` | Shared Library | Shared utility: dashboard-cache.ts |
| `./lib/auth-context.tsx` | Shared Library | Shared utility: auth-context.tsx |
| `./lib/charts/catalog.ts` | Shared Library | Shared utility: catalog.ts |
| `./lib/utils.ts` | Shared Library | Shared utility: utils.ts |
| `./lib/server/calendar-events.ts` | Server Utility | Server-side logic: calendar-events.ts |
| `./lib/server/workspace-auth.ts` | Server Utility | Server-side logic: workspace-auth.ts |
| `./lib/utils/briefing-generator.ts` | Shared Library | Shared utility: briefing-generator.ts |
| `./lib/utils/entity-analytics.ts` | Shared Library | Shared utility: entity-analytics.ts |
| `./lib/utils/analytics-helper.ts` | Shared Library | Shared utility: analytics-helper.ts |
| `./lib/utils/comparison-utils.ts` | Shared Library | Shared utility: comparison-utils.ts |
| `./lib/utils/calendar-utils.ts` | Shared Library | Shared utility: calendar-utils.ts |
| `./lib/utils/document-generator.ts` | Shared Library | Shared utility: document-generator.ts |
| `./lib/utils/validate-transition.ts` | Shared Library | Shared utility: validate-transition.ts |
| `./lib/aviation-chart-config.ts` | Shared Library | Shared utility: aviation-chart-config.ts |
| `./lib/validations/report.ts` | Shared Library | Shared utility: report.ts |
| `./lib/public-dashboard-data.ts` | Shared Library | Shared utility: public-dashboard-data.ts |
| `./lib/external-links-server.ts` | Shared Library | Shared utility: external-links-server.ts |
| `./lib/chart-palette.ts` | Shared Library | Shared utility: chart-palette.ts |
| `./lib/ai/openrouter.ts` | Shared Library | Shared utility: openrouter.ts |
| `./lib/hooks/useQueryExecution.ts` | Shared Library | Shared utility: useQueryExecution.ts |
| `./lib/hooks/use-auth.ts` | Shared Library | Shared utility: use-auth.ts |
| `./lib/hooks/useExternalLinks.ts` | Shared Library | Shared utility: useExternalLinks.ts |
| `./lib/hooks/useQueryBuilder.ts` | Shared Library | Shared utility: useQueryBuilder.ts |
| `./lib/hooks/use-reports.ts` | Shared Library | Shared utility: use-reports.ts |
| `./lib/hooks/index.ts` | Shared Library | Shared utility: index.ts |
| `./lib/hooks/useDashboardState.ts` | Shared Library | Shared utility: useDashboardState.ts |
| `./lib/hooks/useAIDashboard.ts` | Shared Library | Shared utility: useAIDashboard.ts |
| `./lib/auth-bundle.ts` | Shared Library | Shared utility: auth-bundle.ts |
| `./lib/pwa/client-state.ts` | Shared Library | Shared utility: client-state.ts |
| `./lib/pwa/offline-queue.ts` | Shared Library | Shared utility: offline-queue.ts |
| `./lib/pwa/offline-queue-core.ts` | Shared Library | Shared utility: offline-queue-core.ts |
| `./lib/pwa/constants.ts` | Shared Library | Shared utility: constants.ts |
| `./lib/pwa/logout.ts` | Shared Library | Shared utility: logout.ts |
| `./lib/dashboard-query-scope.ts` | Shared Library | Shared utility: dashboard-query-scope.ts |
| `./lib/ai-cache.ts` | Shared Library | Shared utility: ai-cache.ts |
| `./lib/api/risk.ts` | Shared Library | Shared utility: risk.ts |
| `./lib/sync-state.ts` | Shared Library | Shared utility: sync-state.ts |
| `./lib/chart-utils.ts` | Shared Library | Shared utility: chart-utils.ts |
| `./lib/image-compression.ts` | Shared Library | Shared utility: image-compression.ts |
| `./lib/supabase.ts` | Shared Library | Shared utility: supabase.ts |
| `./lib/swr.ts` | Shared Library | Shared utility: swr.ts |
| `./lib/builder/schema.ts` | Shared Library | Shared utility: schema.ts |
| `./lib/builder/normalization.ts` | Shared Library | Shared utility: normalization.ts |
| `./lib/builder/sql-builder.ts` | Shared Library | Shared utility: sql-builder.ts |
| `./lib/builder/customer-feedback-template.ts` | Shared Library | Shared utility: customer-feedback-template.ts |
| `./lib/engine/query-processor.ts` | Shared Library | Shared utility: query-processor.ts |
| `./lib/chart-detail-generator.ts` | Shared Library | Shared utility: chart-detail-generator.ts |
| `./lib/media-compression.ts` | Shared Library | Shared utility: media-compression.ts |
| `./lib/services/client-reports-service.ts` | Service Layer | Service integration: client-reports-service.ts |
| `./lib/services/sync-service.ts` | Service Layer | Service integration: sync-service.ts |
| `./lib/services/reports-service.ts` | Service Layer | Service integration: reports-service.ts |
| `./lib/services/gapura-ai.ts` | Service Layer | Service integration: gapura-ai.ts |
| `./lib/services/query-executor.ts` | Service Layer | Service integration: query-executor.ts |
| `./lib/services/analytics-processor.ts` | Service Layer | Service integration: analytics-processor.ts |
| `./lib/debug/google-sheets-debug.ts` | Shared Library | Shared utility: google-sheets-debug.ts |
| `./components.json` | Other | Source/Resource: components.json |
| `./tsconfig.json` | Build/Deploy Config | Configuration: tsconfig.json |
| `./Analisa Vercel Supabase vs Ubuntu Lokal.md` | Documentation | Docs for Analisa Vercel Supabase vs Ubuntu Lokal.md |
| `./.vscode/settings.json` | Other | Source/Resource: settings.json |
| `./postcss.config.js` | Build/Deploy Config | Configuration: postcss.config.js |
| `./data/airports.ts` | Other | Source/Resource: airports.ts |
| `./data/airlines.ts` | Other | Source/Resource: airlines.ts |
| `./eslint.config.mjs` | Build/Deploy Config | Configuration: eslint.config.mjs |
