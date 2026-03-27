# Gapura Operations Dashboard & AI Analytics Presentation Plan

## Slide 1: Title Slide
**Content:**
- **Title:** Gapura Operations Dashboard (IRRS2)
- **Subtitle:** Transformasi Digital & AI-Powered Operational Intelligence
- **Presenter:** [Name]
- **Date:** February 2026
- **Visual:** Logo Gapura Angkasa, background gradient modern (OKLCH Aurora).

---

## Slide 2: Problem Statement
**Content:**
- **Manual Overhead:** Ketergantungan pada spreadsheet manual dan entry data ganda.
- **Data Silos:** Informasi terfragmentasi antar Hub (CGO vs NON-CGO).
- **Delayed Insights:** Analisis akar penyebab memakan waktu lama (manual audit).
- **Reactive vs Proactive:** Sulit memprediksi lonjakan irregularity sebelum terjadi.

---

## Slide 3: The Solution: Gapura-IRRS2
**Content:**
- **Unified Platform:** Satu pusat pelaporan untuk semua jenis irregularity.
- **Real-time Monitoring:** Dashboard otomatis yang terintegrasi dengan Google Sheets & Database.
- **AI Core:** Integrasi kecerdasan buatan untuk otomatisasi klasifikasi dan prediksi.
- **Secure by Design:** Role-based access control (Admin & Karyawan) dengan JWT.

---

## Slide 4: System Architecture & Tech Stack
**Content:**
- **Frontend:** Next.js 16, React 19, TypeScript (Modern & Type-Safe).
- **Styling:** Tailwind CSS 4, Framer Motion (Fluid UI/UX).
- **Backend:** Next.js API Routes (Serverless ready).
- **Database:** PostgreSQL (Supabase) & Redis Caching.
- **AI Engine:** Python/FastAPI (DistilBERT NLP, Regression Models).

---

## Slide 5: Core Features: Reporting Flow
**Content:**
- **Easy Reporting:** Form pelaporan intuitif untuk karyawan di lapangan.
- **Evidence Management:** Upload bukti foto langsung dari device.
- **Admin Approval:** Alur manajemen user yang ketat (Register → Admin Approval → Active).
- **Status Tracking:** Pantau status laporan (Pending → Reviewed → Resolved).

---

## Slide 6: Advanced AI: Root Cause Investigation
**Content:**
- **Automated Classification:** AI mengklasifikasikan penyebab ke dalam 8 kategori operasional utama.
- **High Accuracy:** Akurasi klasifikasi mencapai 89%+.
- **Root Cause Heatmap:** Visualisasi area yang paling sering mengalami gangguan.
- **Drill-down Analytics:** Lihat detail kejadian spesifik dari ringkasan AI.

---

## Slide 7: Advanced AI: Predictive Analytics
**Content:**
- **Resolution Time Prediction:** Memprediksi berapa hari laporan akan selesai berdasarkan kompleksitas.
- **Confidence Intervals:** Memberikan rentang waktu estimasi yang akurat.
- **SHAP Explainability:** AI menjelaskan *mengapa* prediksi tersebut dibuat (Faktor dominan).
- **Anomaly Detection:** Mendeteksi prediksi yang mencurigakan atau di luar norma operasional.

---

## Slide 8: Operational Intelligence: Branch & Seasonality
**Content:**
- **Seasonality Tracking:** Analisis tren bulanan dan tahunan (YoY/MoM).
- **Branch Performance:** Bandingkan performa antar cabang (CGK, DPS, SUB, etc.).
- **Peak Analysis:** Identifikasi hari/bulan tersibuk dengan tingkat irregularity tinggi.
- **Forecasting:** Prediksi trend irregularity di masa mendatang.

---

## Slide 9: Risk Assessment Dashboard
**Content:**
- **Risk Heatmap:** Matriks Frekuensi vs Keparahan.
- **Risk Scoring:** Skor risiko otomatis untuk setiap Airline dan Hub.
- **Critical Alerts:** Notifikasi otomatis untuk insiden dengan keparahan tinggi.
- **Impact Analysis:** Mengukur dampak operational delay akibat irregularity.

---

## Slide 10: Performance & Scalability
**Content:**
- **Redis Caching:** Response time super cepat (<200ms) untuk dashboard.
- **Batched Inference:** Pemrosesan AI ribuan baris data dalam hitungan detik.
- **Resilient Fallback:** Sistem tetap berjalan meski salah satu modul AI sedang maintenance.
- **Optimized UI:** FPS tinggi (60+) dengan minimal layout shift.

---

## Slide 11: Future Roadmap
**Content:**
- **Mobile App Native:** Aplikasi iOS/Android untuk pelaporan di lapangan lebih cepat.
- **Predictive Maintenance:** Integrasi dengan sistem GSE untuk cegah kerusakan alat.
- **Automatic Report Generation:** AI menulis laporan formal otomatis ke PDF/Docx.
- **Multi-language AI:** Support bahasa daerah dan internasional lebih luas.

---

## Slide 12: Q&A & Closing
**Content:**
- **Summary:** Menjadikan Gapura Angkasa pemimpin dalam operasional berbasis data.
- **Contact Info:** [Corporate Contact]
- **Call to Action:** Implementasi fase 2 & perluasan modul AI.
- **Visual:** "Digital Excellence in Ground Handling".
