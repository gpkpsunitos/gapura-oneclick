# List Keamanan Gapura OneClick

## Server (Vercel & Source Code)

### 1. JWT Authentication (Autentikasi Berbasis Token)
**Untuk apa:** Memastikan hanya user yang sudah login bisa mengakses sistem. Setiap user mendapat "kartu identitas digital" (token) saat login yang berlaku 24 jam.

**Mekanisme:** Server membuat token JWT yang ditandatangani pakai `JWT_SECRET` (kunci rahasia). Setiap request dicek token-nya — kalau token palsu atau kadaluarsa, ditolak. Token juga dicatat di database, jadi kalau admin mau mencabut akses user tertentu, token langsung invalid.

**File:** [lib/auth-utils.ts](lib/auth-utils.ts)

---

### 2. Role-Based Access Control (Pengendalian Akses Berbasis Peran)
**Untuk apa:** Membatasi halaman apa yang bisa dilihat setiap orang berdasarkan jabatannya (role). Misalnya, staff cabang tidak bisa buka halaman admin, divisi HC tidak bisa buka dashboard divisi OS.

**Mekanisme:** Middleware di [proxy.ts](proxy.ts) memeriksa role user sebelum mengizinkan akses ke halaman tertentu. Ada 17 role yang masing-masing punya dashboard sendiri. User yang salah role akan otomatis di-redirect.

**File:** [proxy.ts](proxy.ts)

---

### 3. Bcrypt Password Hashing (Enkripsi Password)
**Untuk apa:** Password user tidak disimpan sebagai teks biasa. Kalau database bocor, password tetap aman.

**Mekanisme:** Password di-hash pakai `bcrypt` dengan salt rounds 10 — artinya setiap password diacak 1024 kali sebelum disimpan. Tidak bisa di-reverse kembali ke password asli.

**File:** [lib/auth-utils.ts:35-37](lib/auth-utils.ts#L35-L37)

---

### 4. Auth Bundle HMAC Signing (Tanda Tangan Digital Cookie Multi-Akun)
**Untuk apa:** Mencegah pemalsuan cookie saat user punya akses ke beberapa akun (fitur switch akun).

**Mekanisme:** Cookie `auth_bundle` ditandatangani digital dengan HMAC-SHA256. Setiap kali cookie dibaca, tanda tangannya diverifikasi pakai `timingSafeEqual` (perbandingan waktu konstan agar tidak bisa di-tebak).

**File:** [lib/auth-bundle.ts](lib/auth-bundle.ts)

---

### 5. Security Headers (Pelindung HTTP)
**Untuk apa:** Mencegah berbagai serangan web di level browser: clickjacking, XSS, MIME sniffing, dan downgrade HTTP.

**Mekanisme:** 7 header keamanan dipasang otomatis di setiap response:

- `Strict-Transport-Security` — wajib HTTPS selama 2 tahun
- `Content-Security-Policy` — hanya boleh load script/gambar dari sumber terpercaya
- `X-Frame-Options: DENY` — situs tidak bisa dimuat di iframe orang lain
- `X-Content-Type-Options: nosniff` — browser tidak boleh menebak tipe file
- `X-XSS-Protection` — browser blokir script berbahaya
- `Referrer-Policy` — tidak bocor URL saat navigasi ke situs lain
- `Permissions-Policy` — kamera/mikrofon/geolokasi dibatasi

**File:** [next.config.mjs:53-77](next.config.mjs#L53-L77)

---

### 6. XSS Protection / HTML Sanitization (Pencegah Serangan Script di Web)
**Untuk apa:** Mencegah penyusup menyisipkan kode jahat (seperti `<script>alert('hack')</script>`) ke dalam data yang ditampilkan di website.

**Mekanisme:** 3 lapis sanitasi: (1) `escapeHtml` — ubah karakter berbahaya jadi teks aman, (2) `sanitizeHtml` — hapus tag `<script>`, `<iframe>`, event handler `onclick=`, URL `javascript:`, (3) `sanitizeTableCell` — semua data tabel di-escape otomatis.

**File:** [lib/security/sanitize.ts](lib/security/sanitize.ts)

---

### 7. Rate Limiting (Pembatas Kecepatan Akses)
**Untuk apa:** Mencegah orang/bot mengirim terlalu banyak request dalam waktu singkat (brute force, spam, DDoS).

**Mekanisme:** 2 lapis — (1) in-memory: cepat, batasi per server instance, (2) database: persisten, batasi lintas server. Upload publik dibatasi 5 upload per menit per IP. Request token dibatasi 10 per menit per IP.

**File:** [lib/security/rate-limit.ts](lib/security/rate-limit.ts)

---

### 8. Signed Upload Token (Token Berhasil Upload)
**Untuk apa:** Upload file publik tidak bisa dilakukan langsung oleh bot — harus minta token dulu.

**Mekanisme:** Client harus `GET /api/uploads/evidence/token` untuk mendapat token HMAC-SHA256 yang berlaku 5 menit. Token ini wajib dikirim di header `X-Upload-Token` saat upload. Tanpa token, upload ditolak.

**File:** [lib/security/rate-limit.ts](lib/security/rate-limit.ts), [app/api/uploads/evidence/token/route.ts](app/api/uploads/evidence/token/route.ts)

---

### 9. Magic Byte File Validation (Verifikasi Tipe File Sebenarnya)
**Untuk apa:** Mencegah upload file berbahaya yang menyamar sebagai gambar (misalnya file `.exe` diganti nama jadi `.jpg`).

**Mekanisme:** Server membaca byte pertama file (file signature) untuk mengetahui tipe sebenarnya — bukan cuma percaya ekstensi atau MIME type yang dikirim browser. Mendukung deteksi JPEG, PNG, GIF, WebP, BMP, TIFF, MP4, WebM, AVI.

**File:** [lib/security/file-validation.ts](lib/security/file-validation.ts)

---

### 10. Webhook Secret Verification (Verifikasi Panggilan Otomatis)
**Untuk apa:** Hanya Google Sheets yang berhak memicu sinkronisasi data — bukan sembarang orang yang tahu URL endpoint.

**Mekanisme:** Setiap webhook harus mengirim header `x-irrs-webhook-secret` yang cocok dengan `GOOGLE_SHEETS_WEBHOOK_SECRET` di server. Tanpa secret yang benar, request ditolak.

**File:** [app/api/integrations/google-sheets/webhook/route.ts](app/api/integrations/google-sheets/webhook/route.ts)

---

### 11. Cron Secret (Pengaman Tugas Otomatis Vercel)
**Untuk apa:** Tugas otomatis harian (sinkronisasi jam 3 pagi) hanya bisa dijalankan oleh Vercel Cron, bukan oleh siapapun yang mengakses URL-nya.

**Mekanisme:** Endpoint sync mengecek header `x-vercel-cron` atau `Authorization: Bearer CRON_SECRET`. Hanya Vercel yang bisa mengirim header ini secara otomatis.

**File:** [app/api/admin/sync-reports/route.ts](app/api/admin/sync-reports/route.ts), [vercel.json](vercel.json)

---

### 12. Detection Engine (Mesin Deteksi Ancaman Real-Time)
**Untuk apa:** Mendeteksi serangan yang sedang berlangsung secara otomatis — seperti brute force, kebocoran data, atau eskalasi hak akses.

**Mekanisme:** Menganalisis event keamanan secara real-time pakai 3 aturan: (1) Brute Force — 10+ login gagal dari IP yang sama dalam 30 detik = alert, (2) Anomali Traffic — Z-Score > 3.5 = indikasi kebocoran data, (3) Privilege Escalation — percobaan naik ke SUPER_ADMIN tanpa otorisasi = alert. Menggunakan circular buffer O(1) yang hemat memori.

**File:** [lib/security/detection-engine.ts](lib/security/detection-engine.ts)

---

### 13. Audit Logging (Pencatatan Aktivitas Keamanan)
**Untuk apa:** Mencatat semua aksi sensitif (login, ubah data, sinkronisasi) untuk jejak audit dan investigasi.

**Mekanisme:** Setiap aksi sensitif dicatat ke tabel `audit_logs` dengan info: siapa (`actor_id`), apa (`action`), target (`entity_type/id`), data lama vs baru, IP address, dan user agent.

**File:** [lib/security/audit-logger.ts](lib/security/audit-logger.ts)

---

### 14. Security Event Service (Pencatatan & Analisis Event Keamanan)
**Untuk apa:** Mencatat event keamanan (login gagal, akses tidak sah) dan meneruskannya ke detection engine untuk analisis.

**Mekanisme:** Event disimpan ke tabel `security_events` lalu di-batch secara otomatis ke detection engine pakai micro-buffer — hemat resource dan mencegah memory leak saat banyak event masuk bersamaan.

**File:** [lib/security/event-service.ts](lib/security/event-service.ts)

---

### 15. Session Revocation (Pencabutan Sesi)
**Untuk apa:** Admin bisa langsung memutus akses user tertentu — misalnya kalau akun dicurigai diretas.

**Mekanisme:** Setiap session punya ID unik (`sid`) yang tercatat di tabel `security_sessions`. Saat verifikasi token, dicek apakah session di-revoke. Kalau ya, akses langsung ditolak meskipun token JWT masih berlaku.

**File:** [lib/auth-utils.ts:136-150](lib/auth-utils.ts#L136-L150)

---

### 16. Session Activity Tracking (Pelacakan Aktivitas Sesi)
**Untuk apa:** Mendeteksi sesi yang sudah tidak aktif dan menyediakan data untuk investigasi keamanan.

**Mekanisme:** Setiap session mencatat IP address dan user agent. `last_active` di-update otomatis setiap 15 menit. Data ini bisa dipakai untuk melihat dari mana dan perangkat apa user mengakses sistem.

**File:** [lib/auth-utils.ts:153-159](lib/auth-utils.ts#L153-L159)

---

### 17. Cookie Security Attributes (Atribut Keamanan Cookie)
**Untuk apa:** Mencegah cookie session dicuri atau disalahgunakan.

**Mekanisme:** Cookie session dan `auth_bundle` di-set dengan: `httpOnly` (tidak bisa diakses JavaScript), `secure` (hanya HTTPS di production), `sameSite: lax` (mencegah pengiriman lintas situs), `maxAge: 24 jam`.

**File:** [app/api/auth/switch/route.ts:37-43](app/api/auth/switch/route.ts#L37-L43)

---

### 18. Inspect Endpoint Restriction (Pembatasan Endpoint Debug)
**Untuk apa:** Endpoint debug untuk melihat detail session hanya bisa diakses di environment development atau oleh Super Admin di production.

**Mekanisme:** Di production, hanya `SUPER_ADMIN` yang bisa akses. Non-admin mendapat response 404 (bukan 403) agar tidak membocorkan keberadaan endpoint. Di development mode, semua authenticated user bisa akses untuk debugging.

**File:** [app/api/auth/inspect/route.ts](app/api/auth/inspect/route.ts)

---

## Database (Supabase)

### 1. Row Level Security / RLS (Keamanan Per Baris Data)
**Untuk apa:** Setiap baris data di tabel punya pengaman — user hanya bisa lihat/ubah data yang berhak diaksesnya.

**Mekanisme:** Supabase RLS diaktifkan di tabel-tabel kritis. Setiap query otomatis difilter berdasarkan kebijakan akses. Meskipun ada celah di aplikasi, database tetap melindungi datanya sendiri.

**Dikelola di:** Supabase Dashboard

---

### 2. Parameterized Queries (Query Berparameter)
**Untuk apa:** Mencegah SQL Injection — serangan di mana penyerang menyisipkan perintah SQL berbahaya.

**Mekanisme:** Semua query ke database menggunakan method Supabase (`.eq()`, `.in()`, `.select()`) yang otomatis memisahkan parameter dari perintah SQL. Tidak ada string concatenation untuk query.

**File:** Seluruh file di `app/api/` dan `lib/`

---

### 3. Service Role Isolation (Isolasi Kunci Admin Database)
**Untuk apa:** Kunci admin database (`SUPABASE_SERVICE_ROLE_KEY`) TIDAK dipakai sebagai bypass autentikasi aplikasi — hanya untuk operasi server-side yang sah.

**Mekanisme:** `SUPABASE_SERVICE_ROLE_KEY` hanya diimport di file server-only ([lib/supabase-admin.ts](lib/supabase-admin.ts) dengan `import 'server-only'`). Tidak pernah terekspos ke client. Bypass auth berbasis service role key sudah dihapus dari semua route.

**File:** [lib/supabase-admin.ts](lib/supabase-admin.ts)

---

### 4. Audit Logs Table (Tabel Jejak Audit)
**Untuk apa:** Menyimpan catatan semua aksi sensitif secara permanen di database untuk keperluan audit dan investigasi.

**Mekanisme:** Tabel `audit_logs` menyimpan: siapa yang melakukan aksi, aksi apa, target apa, data sebelum dan sesudah perubahan, IP address, dan timestamp.

**File:** [lib/security/audit-logger.ts](lib/security/audit-logger.ts)

---

### 5. Security Sessions Table (Tabel Sesi Keamanan)
**Untuk apa:** Melacak semua sesi aktif — memungkinkan admin melihat siapa sedang online dan mencabut akses kapan saja.

**Mekanisme:** Tabel `security_sessions` menyimpan: session ID, user ID, IP address, user agent, status revoked, dan waktu terakhir aktif.

**File:** [lib/auth-utils.ts:212-220](lib/auth-utils.ts#L212-L220)

---

### 6. Security Events & Alerts Tables (Tabel Event dan Peringatan)
**Untuk apa:** Menyimpan semua event keamanan dan peringatan yang dihasilkan detection engine.

**Mekanisme:** Tabel `security_events` mencatat event (login gagal, anomali traffic, dll). Tabel `security_alerts` menyimpan peringatan yang dihasilkan otomatis oleh detection engine dengan severity level (LOW, MEDIUM, HIGH, CRITICAL).

**File:** [lib/security/detection-engine.ts](lib/security/detection-engine.ts), [lib/security/event-service.ts](lib/security/event-service.ts)

---

### 7. Rate Limits Table (Tabel Pembatas Kecepatan)
**Untuk apa:** Menyimpan data rate limiting secara persisten di database supaya konsisten lintas server.

**Mekanisme:** Tabel `rate_limits` menyimpan counter per IP/key dengan waktu reset. Otomatis dibersihkan saat entri kadaluarsa.

**File:** [supabase/migrations/20260414000000_create_rate_limits_table.sql](supabase/migrations/20260414000000_create_rate_limits_table.sql)

---

## Lain-Lain

### 1. Secret Management (Pengelolaan Rahasia)
**Untuk apa:** Kunci rahasia (`JWT_SECRET`, database key, webhook secret) tidak disimpan di source code — aman dari kebocoran melalui repository.

**Mekanisme:** Semua secret disimpan di environment variable Vercel/Supabase. File `.env` ada di `.gitignore` sehingga tidak masuk git. Aplikasi menolak berjalan jika `JWT_SECRET` tidak diset.

**File:** [lib/auth-utils.ts:16-18](lib/auth-utils.ts#L16-L18), [.gitignore](.gitignore)

---

### 2. `server-only` Import Guard (Pengaman Kode Server)
**Untuk apa:** Mencegah kode admin/sensitif tidak sengaja terekspos ke browser user.

**Mekanisme:** File [lib/supabase-admin.ts](lib/supabase-admin.ts) dan [lib/auth-utils.ts](lib/auth-utils.ts) mengimport `'server-only'` — package ini akan throw error kalau file tersebut di-import dari client-side (browser).

**File:** [lib/supabase-admin.ts](lib/supabase-admin.ts), [lib/auth-utils.ts](lib/auth-utils.ts)

---

### 3. Console Log Removal di Production (Penghapusan Log Debug)
**Untuk apa:** Informasi internal (debug log) tidak terekspos di production sehingga tidak memudahkan penyerang melakukan reconnaissance.

**Mekanisme:** Konfigurasi Next.js `removeConsole` otomatis menghapus semua `console.log` saat build production, hanya menyimpan `console.error` dan `console.warn`.

**File:** [next.config.mjs:16-19](next.config.mjs#L16-L19)

---

### 4. X-Powered-By Header Removal (Penyembunyian Teknologi)
**Untuk apa:** Menyembunyikan informasi teknologi yang dipakai agar penyerang tidak bisa mencari celah berdasarkan versi framework.

**Mekanisme:** `poweredByHeader: false` menghilangkan header `X-Powered-By: Next.js` dari semua response HTTP.

**File:** [next.config.mjs:3](next.config.mjs#L3)

---

### 5. Image Remote Pattern Restriction (Pembatasan Sumber Gambar)
**Untuk apa:** Hanya gambar dari Supabase yang bisa di-optimasi oleh Next.js Image — mencegah Server-Side Request Forgery (SSRF) melalui manipulasi URL gambar.

**Mekanisme:** `images.remotePatterns` hanya mengizinkan domain `*.supabase.co` dan `*.supabase.in`.

**File:** [next.config.mjs:39-51](next.config.mjs#L39-L51)

---

### 6. Demo Mode Isolation (Isolasi Mode Demo)
**Untuk apa:** Mode demo untuk presentasi tidak mengurangi keamanan sistem utama.

**Mekanisme:** Hanya aktif jika `DEMO_MODE=true` di environment variable. Di production, variabel ini tidak diset sehingga demo mode tidak aktif.

**File:** [proxy.ts:86-87](proxy.ts#L86-L87)

---

### 7. Backup File Prevention (Pencegahan File Cadangan di Repository)
**Untuk apa:** File backup/duplikat (`*.bak`, `*.bak2`) tidak masuk ke repository karena bisa dipakai sebagai tempat penyisipan kode jahat.

**Mekanisme:** `.gitignore` mengecualikan pattern `*.bak`, `*.bak2`, dan `*page 2*`.

**File:** [.gitignore](.gitignore)

---

### 8. Compliance Engine (Mesin Kepatuhan)
**Untuk apa:** Monitoring otomatis kepatuhan terhadap standar keamanan (ISO 27001, GDPR, NIST).

**Mekanisme:** Scoring otomatis berdasarkan metrik keamanan yang dikumpulkan dari sistem.

**File:** [lib/security/compliance-engine.ts](lib/security/compliance-engine.ts)
