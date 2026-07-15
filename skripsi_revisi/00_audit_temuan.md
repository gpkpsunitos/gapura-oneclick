# Audit Temuan Naskah

## Ruang Lingkup dan Bukti

Audit dilakukan terhadap `revisi_skripsi_v5.docx` (baseline 78 halaman, 673 paragraf, 22 tabel, 34 section, dan 19 inline shape) serta tiga repositori berikut:

- Aplikasi utama: `gpkpsunitos/gapura-oneclick`, commit `09e49f87eb9e7e85b27df88880bd96fa05aa4f21`.
- Layanan ML: `gpkpsunitos/oneclick-machine-learning-prediction`, commit `8d3a23e8423c143a99524f1867a1ae65fa18d6a7`.
- Layanan RAG: `gpkpsunitos/gapura--rag`, commit `7f1549b7d1b0ad59c9405ba35ca0ab443e4f0ba3`.

Suite RAG dijalankan pada 12 Juli 2026: 44 dari 44 pengujian lulus. Hasil ini membuktikan perilaku kode pada skenario unit, bukan akurasi substantif seluruh jawaban RAG.

## Ringkasan Masalah Utama

1. Daftar pustaka memuat DOI palsu/tidak terdaftar dan referensi sebelum 2023.
2. RAG telah terintegrasi pada kode, tetapi belum memiliki landasan teori, kebutuhan, API, dan traceability yang memadai.
3. Kebutuhan fungsional menyebut seluruh role, tetapi uraian terperinci hanya tersedia untuk sebagian role.
4. Diagram arsitektur belum menunjukkan jalur RAG dan memadukan fungsi ML/RAG secara ambigu.
5. Daftar simbol memuat simbol XGBoost dan R-squared yang tidak dipakai, tetapi tidak memuat simbol model yang benar-benar digunakan.
6. Beberapa klaim fungsi AI terlalu dekat dengan klaim keputusan/akurasi; batas purwarupa dan human review perlu diperjelas.
7. Terdapat typo pada halaman formal dan ketidakteraturan penamaan tabel/endpoint.

## Inkonsistensi yang Dinormalisasi

- Nama sistem: `Gapura IRRS` digunakan sebagai nama sistem; `Gapura OneClick ML Service` dan `Gapura RAG` digunakan hanya untuk layanan terpisah.
- `system of record`: PostgreSQL pada Supabase.
- `mirror operasional`: Google Sheets; tidak lagi disebut sumber kebenaran utama.
- Analitik prediktif: klasifikasi, forecasting, STL/seasonality, dan risk scoring.
- RAG: fitur pendukung tanya jawab dokumen, bukan model prediktif dan bukan kontribusi utama.
- Role: `STAFF_CABANG`, `MANAGER_CABANG`, `DIVISI_OCS`, `DIVISI_OS`, `DIVISI_OP`, `DIVISI_OT`, `DIVISI_UQ`, `DIVISI_HC`, `DIVISI_HT`, `DIVISI_ESKALASI`, `ANALYST`, dan `SUPER_ADMIN`.
- Penamaan tabel: `report_comments`, `security_sessions`, `ai_audit_logs`, dan `ground_handling_irregularity_report`.

## Teori yang Dihapus atau Dikurangi

- Simbol dan penjelasan XGBoost/gradient boosting yang tidak digunakan pada implementasi akhir.
- R-squared sebagai metrik utama karena implementasi melaporkan MAE/RMSE untuk peramalan.
- Referensi umum yang tidak mendukung klaim spesifik, termasuk artikel asosiasi minimarket untuk definisi sistem/basis data.
- Klaim bahwa skor risiko adalah probabilitas atau standar industri; skor merupakan indeks komposit deterministik.

## Teori yang Ditambahkan

- RAG: ingestion, chunking, embedding, vector store, retrieval, reranking, generation, evidence, dan grounding.
- Evaluasi RAG: relevansi konteks, ketepatan evidence, faithfulness, sitasi, latensi, dan kegagalan tanpa bukti.
- Kalibrasi prediksi dan selective classification/OOD untuk menjelaskan `UNCERTAIN`.
- Batas antara hasil pengujian unit/fungsional dan validasi akurasi substantif.

## Diagram yang Diganti atau Dilengkapi

- `architecture_system`: diganti agar memisahkan aplikasi Next.js, data transaksional, ML FastAPI, dan Gapura RAG FastAPI.
- `usecase_system`: diperbarui dengan generalisasi aktor dan use case Virtual Assistant.
- `sequence_virtual_assistant`: ditambahkan sebagai artefak pendukung traceability RAG.
- Diagram lain dirender ulang dari sumber editable untuk memastikan pasangan source–PNG konsisten.

## Formula dan Simbol yang Diperbaiki

- MAE/RMSE dijelaskan sebagai galat peramalan dan dikaitkan dengan rolling-origin.
- STL dibatasi sebagai dekomposisi tren, musiman, dan residu; bukan bukti kausal.
- Platt scaling diberi landasan kalibrasi terbaru.
- Aturan abstention/OOD diberi landasan selective classification terbaru.
- Skor risiko ditegaskan sebagai `R = Σ(w_i × C_i)` dengan bobot implementasi 0,40/0,35/0,25, bukan probabilitas insiden.
- Daftar simbol diganti dengan simbol yang benar-benar muncul pada MAE, RMSE, Holt-Winters, STL, klasifikasi, ensemble, abstention, dan risk scoring.

## Referensi Lama yang Dihapus

- Ensafi et al. (2022).
- Koutsandreas et al. (2022).
- Prusty et al. (2022).
- Tandel dan Jamadar (2018).

## DOI Tidak Valid yang Dihapus

- `10.1234/jisi.v12i1.2024` — resolver dan Crossref tidak menemukan rekaman.
- `10.1234/jrplsi.v10i2.2023` — resolver dan Crossref tidak menemukan rekaman.
- `10.22441/collabits.v1i2.27252` — resolver tidak tersedia pada audit; sumber diganti, bukan menebak DOI lain.
- `10.31294/jtk.v10i1.17133` — resolver/Crossref tidak menemukan rekaman yang dicantumkan.

Semua DOI pada daftar akhir dicocokkan dengan judul dan tahun melalui Crossref serta resolver DOI. SWEBOK dicantumkan sebagai dokumentasi resmi tanpa DOI.

## Audit Sitasi–Daftar Pustaka

- Kondisi awal: sitasi dalam teks tidak memiliki pasangan daftar pustaka yang dapat diekstrak secara normal; daftar pustaka berada dalam content control dan berisi sumber tidak valid/lama.
- Kondisi akhir: seluruh sitasi nama–tahun memakai sumber 2023–2025 yang tercantum pada daftar pustaka bersih; tidak ada referensi sebelum 2023.
- Data verifikasi: `references/doi_verification.json`.
- Berkas siap Mendeley: `references/references_clean.bib`.

## Masalah Formatting yang Disentuh

- Typos lokal pada identitas formal (`NIM`, nama perguruan tinggi, `orisinal`, dan label tanda tangan).
- Penambahan baris tabel memakai format tabel dominan, tanpa fixed row height.
- Diagram arsitektur dan use case diganti pada media yang sama agar caption, numbering, dan posisi tetap dipertahankan.
- Daftar pustaka dibangun ulang di content control yang sama dengan hanging indent dan Times New Roman 12 pt.
- Field update diaktifkan untuk membantu Word/LibreOffice memperbarui TOC, daftar gambar, daftar tabel, dan page reference.

## Klaim yang Tetap Memerlukan Kehati-hatian

- Angka evaluasi ML 1.146 rekaman dipertahankan sebagai hasil audit runtime yang sudah terdapat pada source of truth; tidak dinaikkan menjadi klaim produksi.
- Lulusnya 44 pengujian RAG tidak membuktikan relevansi atau faithfulness pada seluruh dokumen operasional.
- Target respons dan beban pada kebutuhan non-fungsional adalah sasaran purwarupa sampai tersedia pengukuran performa formal.
