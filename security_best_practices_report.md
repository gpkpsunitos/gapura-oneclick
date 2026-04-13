# Security Audit Report

Tanggal audit: 2026-04-14  
Target: `gapura-irrs2`

## Executive Summary
Tidak ditemukan backdoor eksplisit yang langsung menunjukkan penyisipan modul judi online, web shell, atau remote command loader tersembunyi. Risiko utama yang ditemukan ada pada boundary otorisasi aplikasi: beberapa route sebelumnya dapat dibypass memakai `SUPABASE_SERVICE_ROLE_KEY`, `auth_bundle` belum ditandatangani, dan middleware masih memberi pengecualian publik yang terlalu lebar untuk kelas route sensitif.

Audit ini juga menemukan beberapa surface yang masih perlu hardening lanjutan, terutama upload publik, endpoint inspect/debug/admin, artefak cadangan di repo, dan verifikasi operasional di luar codebase.

## Attack Surface Map
- Route publik:
  `/`, `/embed/*`, `/api/embed/*`, `/api/dashboards/insights`, `/api/master-data`, `/api/reports/public`, `/api/uploads/evidence/public`
- Route auth/session:
  `/api/auth/login`, `/api/auth/register`, `/api/auth/me`, `/api/auth/inspect`, `/api/auth/bundle`, `/api/auth/switch`, `/api/auth/switch-division`
- Route admin/internal:
  `/api/admin/sync-reports`, `/api/admin/test-email`, `/api/debug/clear-cache`, `/api/security/*`
- Route integrasi eksternal:
  `/api/integrations/google-sheets/webhook`, AI upstream via `lib/hf-client.ts`, Google Sheets via `lib/google-sheets.ts`
- Route upload/storage:
  `/api/uploads/*`, `/api/reports/[id]/evidence`, Supabase storage bucket `evidence`
- Scheduler/deploy:
  `vercel.json` cron ke `/api/admin/sync-reports`

## Fixed Findings

### F-001
- Severity: Critical
- Location: [proxy.ts](/Users/nrzngr/Desktop/gapura-irrs2/proxy.ts:96)
- Evidence: middleware sebelumnya memasukkan `path.startsWith('/api/ai/')` ke allowlist publik.
- Impact: seluruh kelas route AI diperlakukan publik di layer boundary utama. Walau sebagian route memverifikasi session sendiri, ini tetap membuka ruang regresi berbahaya jika ada route AI baru yang lupa auth.
- Fix: allowlist publik untuk `/api/ai/*` dihapus dari middleware.
- Status: fixed

### F-002
- Severity: Critical
- Location: [lib/auth-bundle.ts](/Users/nrzngr/Desktop/gapura-irrs2/lib/auth-bundle.ts:27), [app/api/auth/switch/route.ts](/Users/nrzngr/Desktop/gapura-irrs2/app/api/auth/switch/route.ts:11), [app/api/auth/bundle/route.ts](/Users/nrzngr/Desktop/gapura-irrs2/app/api/auth/bundle/route.ts:9)
- Evidence: `auth_bundle` sebelumnya berupa JSON mentah tanpa signature/HMAC dan route switch/bundle tidak mengikat bundle ke session aktif secara ketat.
- Impact: cookie bundle yang dipalsukan atau dimanipulasi dapat menjadi jalur eskalasi akun pada mekanisme impersonation/switch.
- Fix: bundle sekarang ditandatangani dengan HMAC berbasis `JWT_SECRET`, diverifikasi dengan `timingSafeEqual`, dan route `switch`/`bundle` mengharuskan session aktif valid serta bundle cocok dengan akun aktif.
- Status: fixed

### F-003
- Severity: High
- Location: [app/api/admin/sync-reports/route.ts](/Users/nrzngr/Desktop/gapura-irrs2/app/api/admin/sync-reports/route.ts:23), [app/api/integrations/google-sheets/webhook/route.ts](/Users/nrzngr/Desktop/gapura-irrs2/app/api/integrations/google-sheets/webhook/route.ts:23), [app/api/admin/test-email/route.ts](/Users/nrzngr/Desktop/gapura-irrs2/app/api/admin/test-email/route.ts:16)
- Evidence: route aplikasi sebelumnya menerima `Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}` sebagai bypass auth aplikasi.
- Impact: kebocoran satu secret database/service-role akan langsung berubah menjadi bypass admin aplikasi lintas endpoint, bukan hanya akses database.
- Fix: bypass berbasis `SUPABASE_SERVICE_ROLE_KEY` dihapus dari route-route tersebut. Sync cron sekarang bergantung pada `CRON_SECRET` atau session admin/analyst. Webhook hanya menerima webhook secret khusus atau session admin/analyst.
- Status: fixed

### F-004
- Severity: Medium
- Location: [README.md](/Users/nrzngr/Desktop/gapura-irrs2/README.md:2)
- Evidence: repo sebelumnya menyimpan daftar akun demo dan password bersama.
- Impact: pola ini meningkatkan risiko reuse password, credential leakage, dan normalisasi praktik penyimpanan kredensial di repo.
- Fix: kredensial dihapus dan diganti dengan kebijakan distribusi akses demo melalui channel terproteksi.
- Status: fixed

## Remaining Findings

### R-001
- Severity: Medium
- Location: [app/api/uploads/evidence/public/route.ts](/Users/nrzngr/Desktop/gapura-irrs2/app/api/uploads/evidence/public/route.ts:33)
- Evidence: upload publik hanya dibatasi oleh rate limit in-memory per IP dan validasi image, lalu file dipublikasikan ke bucket `evidence`.
- Impact: surface ini masih bisa dipakai untuk abuse storage, spam, atau hosting konten gambar publik dalam volume terbatas. Rate limit in-memory juga tidak konsisten lintas instance/serverless cold start.
- Fix: pindahkan rate limit ke store terpusat, tambahkan auth token/form token untuk public submission, pertimbangkan quarantine bucket/private bucket + signed URL.
- Mitigation: monitor volume upload, aktifkan alert untuk burst bucket writes, audit MIME/content-type bucket policy.

### R-002
- Severity: Medium
- Location: [app/api/auth/inspect/route.ts](/Users/nrzngr/Desktop/gapura-irrs2/app/api/auth/inspect/route.ts:5)
- Evidence: endpoint inspect tetap aktif di production code.
- Impact: meski sudah memerlukan session, endpoint debug seperti ini memperluas reconnaissance surface dan sering terlupakan saat perubahan auth berikutnya.
- Fix: batasi hanya untuk `NODE_ENV=development` atau role admin eksplisit, atau hapus jika tidak dipakai operasional.

### R-003
- Severity: Medium
- Location: `/Users/nrzngr/Desktop/gapura-irrs2/lib/utils/document-generator.ts.bak`, `/Users/nrzngr/Desktop/gapura-irrs2/lib/utils/document-generator.ts.bak2`, `/Users/nrzngr/Desktop/gapura-irrs2/app/dashboard/(main)/hc/page 2.tsx`, `/Users/nrzngr/Desktop/gapura-irrs2/app/dashboard/(main)/employee/hc-leave/page 2.tsx`
- Evidence: ada file backup/duplikat di repo kerja.
- Impact: file seperti ini sering lolos review, dipakai sebagai tempat penyisipan logic, atau membingungkan audit saat ada perubahan sensitif.
- Fix: hapus dari repo tracked state atau pindahkan ke storage arsip di luar tree deployable.

### R-004
- Severity: Low
- Location: [app/api/admin/sync-reports/route.ts](/Users/nrzngr/Desktop/gapura-irrs2/app/api/admin/sync-reports/route.ts:16)
- Evidence: route masih menulis debug log yang cukup rinci tentang mode eksekusi dan akses.
- Impact: bukan bypass langsung, tetapi memperbesar observability untuk attacker jika log exposure terjadi.
- Fix: kurangi log debug di production dan simpan hanya audit event terstruktur.

## Hardening Plan
- Jadikan `proxy.ts` sebagai single source of truth untuk allowlist route publik; semua route baru wajib explicit review.
- Tambahkan CI guardrail: `npm run security:guardrails`.
- Audit semua endpoint yang memakai `supabaseAdmin` dan pastikan authorization check ada di route sebelum operasi admin.
- Pindahkan rate limit publik ke store bersama dan tambahkan anti-automation token untuk public upload.
- Nonaktifkan atau hapus endpoint debug/inspect yang tidak dibutuhkan di production.
- Hapus seluruh file backup/duplikasi dari tree deployable.

## Operational Verification Outside Repo
- Verifikasi `JWT_SECRET`, `CRON_SECRET`, `GOOGLE_SHEETS_WEBHOOK_SECRET`, dan semua Supabase secret tersimpan di secret manager, bukan file lokal yang dibagikan.
- Rotasi `SUPABASE_SERVICE_ROLE_KEY` jika pernah dipakai sebagai bypass aplikasi di environment mana pun.
- Audit bucket policy Supabase untuk memastikan object publik tidak bisa dieksekusi sebagai HTML/script.
- Verifikasi header final di production edge/CDN, khususnya CSP, cache policy, dan route admin/debug.
- Pastikan Vercel Cron hanya memakai `CRON_SECRET`, dan tidak ada automation lama yang masih mengirim service-role key ke route aplikasi.
