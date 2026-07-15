# Traceability Matrix

| ID | Kebutuhan fungsional | Aktor/role | Use case | Activity diagram | Sequence diagram | API/fitur terkait | Tampilan/halaman | Skenario pengujian |
|---|---|---|---|---|---|---|---|---|
| KF-01 | Login dan diarahkan sesuai peran | Semua pengguna | Autentikasi dan keluar | `activity_login` | `sequence_login` | `POST /api/auth/login` | `/auth/login` | III.7 no. 1–2 |
| KF-02 | Membuat laporan irregularity | STAFF_CABANG | Mengajukan laporan | `activity_pengajuan_laporan` | `sequence_pengajuan_laporan` | `POST /api/reports/public` | `/dashboard/employee/new` | III.7 no. 3 |
| KF-03 | Mengunggah dan menghubungkan bukti | STAFF_CABANG | Mengunggah bukti | `activity_pengajuan_laporan` | `sequence_pengajuan_laporan` | `POST /api/uploads/evidence` | Formulir laporan | III.7 no. 4 |
| KF-04 | Melihat laporan sendiri dan statusnya | STAFF_CABANG | Melihat laporan sesuai cakupan | `activity_pengajuan_laporan` | `sequence_pengajuan_laporan` | `/api/reports` + RBAC | `/dashboard/employee/reports` | III.7 no. 3–4, 13 |
| KF-05 | Memantau laporan satu stasiun | MANAGER_CABANG | Melihat dashboard/laporan | `activity_pengajuan_laporan` | `sequence_pengajuan_laporan` | `/api/dashboard/manager-cabang` | `/dashboard/manager` | III.7 no. 5, 8 |
| KF-06 | Menyetujui akun staf pending satu stasiun | MANAGER_CABANG, SUPER_ADMIN | Menyetujui akun staf | `activity_persetujuan_staf` | `sequence_persetujuan_staf` | `POST /api/admin/users/approve-staff` | `/dashboard/admin/users` atau halaman manager | III.7 no. 7 |
| KF-07 | Melihat dan menindaklanjuti laporan sesuai divisi | DIVISI_OCS, DIVISI_OS, DIVISI_OP, DIVISI_OT, DIVISI_UQ, DIVISI_HC, DIVISI_HT | Melihat laporan; memberi tanggapan | `activity_pengajuan_laporan` | `sequence_pengajuan_laporan` | `/api/reports`, comments/status API, RBAC | Dashboard divisi terkait | III.7 no. 6, 13 |
| KF-08 | Beralih ruang kerja yang diizinkan | DIVISI_ESKALASI | Beralih ruang kerja divisi | `usecase_system` | `sequence_login` (sesi) | Auth switch/session bundle | `/dashboard/eskalasi` | III.7 no. 13 + audit sesi |
| KF-09 | Membaca dashboard dan mengekspor data | MANAGER_CABANG, divisi, ANALYST, SUPER_ADMIN | Dashboard dan ekspor | `activity_analisis_ai` | `sequence_analisis_ai` | `/api/reports/analytics`, dashboard/export API | Dashboard sesuai role | III.7 no. 8–9 |
| KF-10 | Menjalankan klasifikasi teks | ANALYST dan divisi berwenang | Analitik prediktif | `activity_analisis_ai` | `sequence_analisis_ai` | `/api/ai/analyze`, ML `/classify/*` | Halaman analisis AI | III.7 no. 10–11 |
| KF-11 | Menjalankan forecasting dan seasonality | ANALYST dan divisi berwenang | Analitik prediktif | `activity_analisis_ai` | `sequence_analisis_ai` | ML `/forecast`, `/seasonality` | Halaman analisis AI | III.7 no. 10–11 |
| KF-12 | Menghitung peringkat risiko | ANALYST dan divisi berwenang | Analitik prediktif | `activity_analisis_ai` | `sequence_analisis_ai` | `/api/ai/risk/summary`, ML `/risk-score` | Dashboard risiko | III.7 no. 10–11 |
| KF-13 | Menyimpan laporan write-first dan menyinkronkan mirror | Sistem | Validasi, penyimpanan, sinkronisasi | `activity_pengajuan_laporan` | `sequence_pengajuan_laporan` | Reports Service, Sync Service | Status sinkronisasi/admin | III.7 no. 9, 11 |
| KF-14 | Bertanya pada dokumen dan meninjau evidence | Semua pengguna terautentikasi | Asisten virtual RAG | `architecture_system` | `sequence_virtual_assistant` | `POST /api/virtual-assistant/chat`, RAG `/api/chat` | `/virtual-assistant` | III.7 no. 15; 44/44 unit test RAG |
| KF-15 | Mengelola pengguna, master data, sesi, dan audit | SUPER_ADMIN | Kelola pengguna; audit/keamanan | `activity_persetujuan_staf` | `sequence_persetujuan_staf` | Admin/security API | `/dashboard/admin` | III.7 no. 7, 12–13 |
| KF-16 | Keluar dan mengakhiri sesi | Semua pengguna | Autentikasi dan keluar | `activity_login` | `sequence_login` | `POST /api/auth/logout` | Navigasi seluruh role | III.7 no. 14 |

## Catatan

- Generalisasi aktor pada `usecase_system` mengurangi hubungan berulang untuk autentikasi dan Virtual Assistant tanpa menyamakan hak akses data.
- `sequence_virtual_assistant` merupakan artefak tambahan; PlantUML tetap hanya digunakan untuk sequence diagram.
- Hasil `UNCERTAIN`, cache, atau fallback bukan keberhasilan inferensi baru dan harus ditandai pada respons/tampilan.
