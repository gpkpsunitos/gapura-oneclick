# Analisa: Vercel + Supabase vs Server Ubuntu Lokal

## Ringkasan Eksekutif

Berdasarkan audit kode Gapura IRRS2, aplikasi ini memiliki **94 route API**, **59 file** yang terhubung ke Supabase (206 pemanggilan), **7 fitur real-time**, dan integrasi dengan Google Sheets + AI. Seluruh arsitektur dirancang untuk platform managed (Vercel + Supabase). Pindah ke server Ubuntu lokal memerlukan membangun ulang sebagian besar infrastruktur secara manual.

---

## 1. Keamanan

| Aspek | Vercel + Supabase | Ubuntu Lokal |
|-------|-------------------|--------------|
| **SSL/TLS** | Otomatis, selalu aktif, auto-renew | Harus beli sertifikat atau pakai Let's Encrypt + setup manual renew |
| **DDoS Protection** | Bawaan dari Vercel Edge Network (global CDN) | Harus install & konfigurasi sendiri (Cloudflare/iptables/fail2ban) |
| **Firewall Database** | Supabase mengelola akses — tidak perlu expose port database ke internet | Harus buka port 5432 atau setup SSH tunnel, risiko serangan lebih besar |
| **Row Level Security** | Supabase RLS aktif di semua tabel — keamanan di level database, bukan cuma aplikasi | Harus implementasi manual di PostgreSQL, atau taruh semua logic di aplikasi (lebih rentan bug) |
| **Backup Otomatis** | Supabase: backup harian otomatis, point-in-time recovery | Harus setup pg_dump cron + offsite storage sendiri |
| **Security Headers** | Vercel menerapkan headers (HSTS, CSP, X-Frame-Options) di edge — tidak bisa bypass | Harus konfigurasi Nginx/Apache manual, rawan salah config |
| **Kriptografi** | `JWT_SECRET` disimpan di Vercel Environment Variables — terenkripsi saat simpan | Tersimpan di `.env` file di server — risiko terbaca kalau server diretas |
| **Isolasi Server** | Setiap request berjalan di container terpisah — celah di satu request tidak merusak yang lain | Semua request berjalan di 1 server — celah di satu titik bisa kompromi seluruh sistem |
| **Audit Trail** | Semua keamanan tercatat di `audit_logs` + `security_events` Supabase | Sama — tapi kalau server kena ransomware, log ikut hilang |

**Dampak keamanan spesifik pada kode kita:**
- **18+ mekanisme keamanan** yang sudah diimplementasikan (JWT, RLS, HMAC, rate limiting, detection engine) bergantung pada infrastruktur managed
- Row Level Security (RLS) Supabase adalah lapis pertahanan terakhir — ini tidak otomatis ada di PostgreSQL biasa
- Rate limiting persisten pakai tabel `rate_limits` di Supabase — di server lokal, harus setup tabel sendiri

---

## 2. Ketersediaan & Keandalan

| Aspek | Vercel + Supabase | Ubuntu Lokal |
|-------|-------------------|--------------|
| **Uptime** | Vercel: 99.99% SLA, edge global | Bergantung pada 1 mesin — mati listrik / hardware rusak = down total |
| **Failover** | Otomatis ke server lain jika satu node mati | Tidak ada — harus setup clustering sendiri |
| **CDN** | 100+ edge location global, konten statis di-cache dekat user | Tidak ada CDN — semua request ke 1 lokasi |
| **Real-time** | Supabase Realtime (WebSocket managed) — dipakai di 7 komponen | Harus setup WebSocket server sendiri (Socket.io/ws) + scaling |
| **Auto-scaling** | Otomatis saat traffic naik | Kapasitas terbatas hardware — harus beli RAM/CPU baru |

**Fitur yang terdampak:**
- Live Security Feed (`components/security/LiveSecurityFeed.tsx`) — bergantung pada Supabase Realtime
- Update komentar report real-time — pakai `.subscribe()` Supabase
- Sync laporan otomatis jam 3 pagi — bergantung pada Vercel Cron

---

## 3. Pemeliharaan & Operasional

| Aspek | Vercel + Supabase | Ubuntu Lokal |
|-------|-------------------|--------------|
| **OS Update** | Tidak perlu — Vercel mengelola | Harus update Ubuntu, security patch, kernel manual |
| **Database Admin** | Supabase mengelola PostgreSQL | Harus install, konfigurasi, backup, vacuum, tune PostgreSQL sendiri |
| **SSL Renewal** | Otomatis | Let's Encrypt perlu renewal tiap 90 hari, setup cron certbot |
| **Monitoring** | Vercel Analytics + Supabase Dashboard | Harus install Prometheus, Grafana, alerting sendiri |
| **Log Management** | Vercel Logs + Supabase Logs | Harus setup ELK stack atau setara untuk mengumpulkan log |
| **Deployment** | `git push` → otomatis deploy | Harus setup CI/CD pipeline (GitHub Actions + SSH deploy) |
| **Scaling** | Tambah instance otomatis | Beli hardware baru, setup load balancer |

**Yang perlu dikelola di Ubuntu tapi tidak di Vercel/Supabase:**
- Nginx/Apache web server
- PM2 atau systemd untuk Node.js process management
- PostgreSQL installation, tuning, backup
- Redis (kalau butuh caching terpusat)
- SSL certificate management
- Firewall rules (ufw/iptables)
- Log rotation
- Disk space monitoring
- Memory monitoring
- DDoS mitigation

---

## 4. Biaya

| Aspek | Vercel + Supabase | Ubuntu Lokal |
|-------|-------------------|--------------|
| **Biaya awal** | Rp 0 (free tier tersedia) | Beli server fisik: Rp 15-50 juta + UPS + rak |
| **Biaya bulanan** | Vercel Pro: $20/bulan, Supabase Pro: $25/bulan | Listrik 24/7 + internet stabil + ganti hardware |
| **Biaya SDM** | Tidak perlu sysadmin | Perlu orang yang bisa manage Linux + PostgreSQL |
| **Biaya saat down** | Minimal — ada SLA | Tinggi — sistem tidak bisa diakses sampe diperbaiki |
| **Biaya scaling** | Bayar sesuai pemakaian | Beli hardware baru |
| **Biaya keamanan** | Termasuk dalam layanan | Beli firewall, antivirus, audit tool terpisah |

**Estimasi total:**
- **Vercel + Supabase Pro:** ~$45/bulan (±Rp 750.000)
- **Ubuntu Lokal:** Hardware Rp 30 juta + listrik Rp 500-1 juta/bulan + SDM sysadmin + risiko downtime

---

## 5. Fitur yang Harus Dibangun Ulang di Ubuntu Lokal

Kalau pindah ke Ubuntu lokal, fitur-fitur berikut harus dibangun atau dipasang dari nol:

| # | Fitur | Di Vercel/Supabase | Yang harus dilakukan di Ubuntu |
|---|-------|--------------------|-------------------------------|
| 1 | Image Optimization | Next.js Image Optimization bawaan Vercel | Install Sharp + konfigurasi custom loader |
| 2 | Cron Jobs | `vercel.json` cron, otomatis | Setup crontab Linux + auth mechanism |
| 3 | Real-time Updates | Supabase Realtime (WebSocket) | Setup Socket.io server + auth |
| 4 | File Storage | Supabase Storage bucket | Setup MinIO / S3-compatible storage |
| 5 | Database RLS | Supabase Row Level Security | Implementasi di application layer (rawan bug) |
| 6 | Database Backup | Point-in-time recovery otomatis | Setup pg_dump cron + offsite rsync |
| 7 | Edge Caching | Vercel Edge Network | Setup Nginx cache + Cloudflare |
| 8 | Serverless Functions | 94 API routes auto-scaling | Setup PM2 cluster + load testing |
| 9 | Security Headers | 7 header otomatis di edge | Konfigurasi Nginx manual |
| 10 | DDoS Protection | Vercel Edge Network | Cloudflare Free tier atau iptables |
| 11 | SSL/TLS | Auto-provision + renew | Certbot + cron renewal |
| 12 | `after()` API | Vercel-specific API | Replace dengan background worker |
| 13 | Log Aggregation | Vercel dashboard | Setup ELK / Loki |
| 14 | Monitoring | Bawaan | Setup Prometheus + Grafana |
| 15 | CI/CD | Git push → deploy | Setup GitHub Actions + SSH |

---

## 6. Risiko Pindah ke Ubuntu Lokal

### Risiko Keamanan
- Server fisik bisa dicuri, kena ransomware, atau diakses fisik oleh orang tidak berwenang
- Kalau 1 celah ditemukan di server, seluruh sistem (database + aplikasi + file) terekspos
- Tidak ada isolasi antar request — bug di satu API bisa merusak data request lain
- Backup ada di mesin yang sama — kalau harddisk rusak, data dan backup hilang bersamaan

### Risiko Operasional
- Mati listrik = sistem down sampai listrik nyala + server boot ulang
- Internet kantor putus = sistem tidak bisa diakses siapapun
- Hardware rusak = waktu perbaikan tidak terprediksi (hari-minggu)
- Tidak ada tim 24/7 yang standby kalau ada masalah jam 3 pagi

### Risiko Compliance
- Audit keamanan lebih sulit — tidak ada logging bawaan
- Tidak ada bukti otomatis bahwa keamanan terjaga (SLA, uptime report)
- Backup manual rawan human error

---

## 7. Kenapa Vercel + Supabase Cocok untuk Gapura IRRS

1. **Tim kecil, tanpa sysadmin** — tidak perlu mengelola server, bisa fokus ke pengembangan fitur
2. **33 keamanan sudah terimplementasikan** — sebagian besar bergantung pada infrastruktur managed
3. **94 API routes** berjalan sebagai serverless functions — otomatis scale tanpa konfigurasi
4. **7 fitur real-time** menggunakan Supabase Realtime — tidak perlu bangun WebSocket server sendiri
5. **Integrasi AI + Google Sheets** — request ke external API lebih cepat dari Vercel edge daripada dari kantor
6. **Budget terbatas** — biaya tetap $45/bulan vs investasi awal puluhan juta + SDM berkelanjutan
7. **Deployment simpel** — `git push` langsung live, tanpa SSH, tanpa downtime
8. **Audit trail lengkap** — semua aksi tercatat di `audit_logs` + `security_events` yang aman di Supabase
9. **Claude Code bisa langsung terhubung** — untuk development dan maintenance tanpa setup VPN/SSH ke server lokal
10. **Uptime terjamin** — SLA 99.99% artinya dalam setahun cuma down maksimal ~52 menit

---

## Kesimpulan

Gapura IRRS2 dirancang sebagai aplikasi cloud-native. Seluruh arsitektur keamanan, real-time, storage, dan deployment dibangun di atas layanan managed Vercel + Supabase. Pindah ke server Ubuntu lokal bukan sekedar "pindah hosting" — tapi **membangun ulang infrastruktur dari nol** dengan biaya lebih tinggi, risiko keamanan lebih besar, dan memerlukan SDM yang saat ini tidak ada di tim.
