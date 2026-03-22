% Rancang Bangun Sistem Informasi Pelaporan Terintegrasi untuk Ground Handling
% Skripsi Program Studi Sistem Informasi, Universitas Bina Sarana Informatika
% Februari 2026

# Latar Belakang & Masalah
- Ground handling mengalami pertumbuhan, sementara operasi menghasilkan banyak irregularity yang harus dilaporkan secara cepat.
- Cabang menggunakan Microsoft Form → Excel, analyst menggunakan Google Sheets & Looker Studio, sehingga data tersimpan di silo berbeda.
- Proses import manual memakan 1–2 jam, rawan human error, dan menyebabkan data dashboard tidak real-time sehingga pengambilan keputusan terlambat.

# Analisa Masalah
- Tidak ada single source of truth, data tersebar antara input (Excel) dan output (Looker).
- Analyst menghabiskan waktu mengimpor data secara manual, meningkatkan risiko data hilang atau salah.
- Dashboard hanya menampilkan data historis, tidak ada analisis prediktif.
- Fragmentasi platform meningkatkan biaya training dan maintenance.

# Solusi Terintegrasi
- Hapus silo dengan aplikasi Next.js yang menggabungkan formulir laporan dan dashboard dalam satu platform.
- Single source: data operasional disinkronkan ke Google Sheets yang bisa diakses semua pihak.
- Dashboard real-time menampilkan data segera setelah disubmit.
- Machine Learning menggunakan XGBoost untuk prediksi resolusi dan TF-IDF ensemble untuk klasifikasi severity + anomaly detection.
- Konsolidasi platform menurunkan kompleksitas operasional dan biaya perawatan.

# Manfaat Strategis
- Sumbangan teoritis: contoh integrasi sistem modern + ML untuk operational analytics.
- Manfaat praktis: karyawan cabang dapat melacak status, analyst bebas dari import manual, manajemen dapat planning berdasarkan insight, perusahaan mendapat efisiensi & competitive advantage.
- Single platform mempercepat feedback loop dan akuntabilitas.

# Arsitektur Sistem
- Frontend: Next.js 16.1.6 dengan App Router + Tailwind CSS di-deploy di Vercel untuk pengalaman global.
- ML Service: FastAPI di Hugging Face Spaces, memberikan prediksi resolusi, severity, risiko, dan anomaly detection.
- Auth & Data: Supabase PostgreSQL menangani autentikasi JWT, konfigurasi dashboard, audit log.
- Data Integration: Google Sheets API v4 menyelaraskan data operasional dengan sistem baru.
- Pendekatan serverless mikroservice memisahkan concerns agar fokus pengembangan pada logika bisnis dan ML.

# Machine Learning & Data
- Regression: 25 fitur engineered (day_of_week, sin/cos month, branch/airline encoded, report length, has_photos, dll.) untuk memprediksi hari penyelesaian.
- Classification: TF-IDF + ensemble (Random Forest, Logistic Regression, SVM, Gradient Boosting) untuk severity level Critical/High/Medium/Low.
- Indonesian keywords (darurat, rusak, terlambat, ringan) menguatkan rule-based severity mapping.
- Model XGBoost mencapai R² = 0.66 dan MAE = 0.35 hari; classification 81% akurasi; ML service latency ~1.2 detik per prediksi.

# Antarmuka & Dashboard
- Form pelaporan mengumpulkan divisi tujuan, kategori, deskripsi, lokasi, evidence foto langsung melalui browser responsif.
- Dashboard utama memvisualisasikan statistik laporan, distribusi status, dan metric kinerja operasional interaktif.
- Halaman AI menampilkan prediksi resolusi, klasifikasi severity, deteksi anomali, dan rekomendasi tindakan.

# Pengujian & Hasil
- Black Box Testing mencakup 8 skenario (login valid/invalid, input laporan, upload bukti, akses dashboard analyst, filter, prediksi ML, logout) dengan hasil semua "Berhasil".
- Unit tests 92% coverage (90/90 passed), integration 100% (44/44), UAT 96.1% (373/388).
- Sistem berhasil mengeliminasi 100% import manual, mengurangi latency 99.9%, menurunkan human error 83%, meningkatkan kepuasan pengguna 19.4%.

# Kesimpulan
- Sistem informasi pelaporan terintegrasi berhasil menggabungkan karyawan cabang, analyst, dan manajemen di satu platform.
- Single source via Google Sheets menyajikan data real-time dan konsisten.
- Dashboard real-time + ML predictions (risk scoring, anomaly detection, similarity search) mempercepat prioritas dan respons.
- JWT-based role access control menjaga keamanan dan kepatuhan data.
- SWR caching memastikan data dashboard langsung tersedia tanpa delay.

# Saran & Rekomendasi
- Tambah data training, online learning, dan fitur time-series forecasting untuk meningkatkan performa ML.
- Tambahkan anomaly detection, root cause analysis berbasis NLP, dan recommendation system berdasarkan riwayat data.
- Perbaiki UX dengan PWA, notifikasi real-time, dan mobile native apps.
- Integrasikan dengan sistem pendukung (email notifikasi, calendar SLA, reporting eksternal).
- Perkuat keamanan dengan 2FA, audit trail yang lebih komprehensif, dan enkripsi data.

# Referensi
- Skripsi "Rancang Bangun Sistem Informasi..." (Skripsi.pdf) sebagai sumber utama desain, implementasi, dan hasil.
