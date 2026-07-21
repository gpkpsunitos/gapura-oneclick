# Desain Slide Sidang Skripsi — Irregularity Ground Handling

Tanggal: 22 Juli 2026  
Status: Disetujui secara visual; menunggu review spesifikasi tertulis  
Output: PowerPoint 16:9, 20 slide utama + 6 slide lampiran

## Tujuan

Membuat deck sidang skripsi berdurasi 10–15 menit yang menjelaskan penelitian sebagai argumen utuh: konteks ground handling, fragmentasi pelaporan, alasan desain sistem, proses machine learning, asal angka evaluasi, batas klaim, dan kontribusi. Deck dibawakan oleh Melisa Zahara dan Muhammad Ridzki Nugraha.

## Sumber Konten

- `/Users/nrzngr/Documents/Skripsi_Infinite_Loop_REVISI.docx` sebagai sumber isi utama.
- `/Users/nrzngr/Downloads/ilovepdf_compressed (3)/19259145_Muhammad Ridzki Nugraha.pdf` sebagai pembanding visual dan urutan halaman.
- Diagram, screenshot sistem, angka evaluasi, dan istilah teknis harus berasal dari sumber tersebut.
- Identitas perusahaan tetap dianonimkan.
- Istilah yang diminta pengguna untuk tidak dicantumkan tidak boleh muncul pada slide maupun speaker notes.

## Arah Visual

Nama sistem desain: **Apron Cinematic — Dense Domain-Specific**.

Karakter:

- Latar off-white hangat, bukan putih murni.
- Deep navy sebagai warna struktural dan teks utama.
- Aviation blue untuk data, jalur sekunder, dan pembanding.
- Safety amber sebagai aksen keputusan, perpindahan, risiko, dan sorotan.
- Fotografi apron/ground handling digunakan pada pembuka dan transisi penting; slide teknis memakai kanvas terang.
- Motif visual harus berasal dari domain penelitian: runway line, route line, handoff data, sync, service boundary, evidence trail, confidence threshold, dan human review.
- Hindari kartu UI generik, dekorasi abstrak, serta panel yang tidak menjelaskan argumen.

## Token Desain

- Rasio: 16:9 widescreen.
- Warna latar: `#F7F4ED`.
- Teks utama: `#0C2942`.
- Biru data: `#174D72` dan `#5D86A0`.
- Aksen amber: `#F59E0B`.
- Garis/border: `#CAD8E2`.
- Putih konten: `#FFFFFF`.
- Judul deck: minimal 50 pt.
- Judul slide: 35–40 pt, satu baris jika memungkinkan; tidak boleh berimpit dengan konten.
- Subjudul/callout: minimal 24 pt.
- Isi: 16–20 pt.
- Margin kiri dan kanan setara; target 0,55–0,70 inci.
- Kepadatan efektif: 75–85% kanvas berisi konten bermakna.
- Jarak antarkomponen utama: setara 0,12–0,22 inci; lebih rapat daripada mockup awal.

## Aturan Layout

1. Setiap slide memiliki satu klaim utama yang terlihat dari judul.
2. Hubungan judul, visual utama, dan interpretasi harus terbaca dalam satu lintasan mata.
3. Gunakan komposisi 60/40, 55/45, atau satu visual dominan; hindari ruang kosong luas tanpa fungsi.
4. Judul memiliki zona aman vertikal tersendiri. Konten utama dimulai setelah batas bawah judul dan tidak boleh masuk ke zona tersebut.
5. Konektor dibuat sebelum node dan ditempatkan di belakang node.
6. Konektor tidak boleh melintasi teks, label, node, atau judul. Jika perlu, gunakan jalur siku dengan waypoint.
7. Diagram besar tidak ditempel sebagai screenshot halaman skripsi pada slide utama. Diagram digambar ulang secara ringkas, sedangkan versi asli lengkap ditempatkan di lampiran.
8. Angka evaluasi selalu disertai konteks sumber: ukuran sampel, jumlah kelas, metode evaluasi, atau baseline.
9. Tidak ada paragraf panjang pada slide. Penjelasan rinci berada di speaker notes.
10. Browser mockup captions tidak menjadi bagian dari PowerPoint final.

## Storytelling dan Pembagian Presenter

### Melisa Zahara — slide 1–10

1. Judul penelitian.
2. Apa itu perusahaan ground handling bandara.
3. Alur pelaporan saat ini.
4. Dampak fragmentasi.
5. Gap dan fokus penelitian.
6. Tujuan dan batas penelitian.
7. Aktor dan alur operasional.
8. Metode pengembangan dan desain evaluasi.
9. Arsitektur sistem terintegrasi.
10. Alasan pemilihan Next.js, Supabase, Google Sheets, dan FastAPI.

Handoff Melisa ke Ridzki ditempatkan pada akhir slide 10.

### Muhammad Ridzki Nugraha — slide 11–19

11. Implementasi pada sisi pengguna.
12. Asal dan proses pembersihan 1.146 rekaman aktif.
13. Alasan desain ensemble klasifikasi.
14. Alasan pemilihan Holt-Winters dan STL.
15. Formula, asal bobot, dan interpretasi skor risiko.
16. Asal angka akurasi klasifikasi.
17. Hasil forecasting, musiman, dan sensitivitas risk scoring.
18. Confidence threshold, coverage, precision, dan `UNCERTAIN`.
19. Black-box testing, kontribusi, serta batas klaim.

Handoff Ridzki ke Melisa ditempatkan pada akhir slide 19.

### Melisa Zahara — slide 20

20. Kesimpulan dan penutup.

## Kerangka Penjelasan Sistem

Penjelasan sistem harus secara alami menjawab:

- konteks organisasi dan lokasi penggunaan;
- aktor dan kewenangannya;
- masalah yang diselesaikan;
- alasan pemisahan transaksi dan analitik;
- waktu terjadinya penulisan, sinkronisasi, analisis, serta fallback;
- cara kerja write-first, salinan operasional, kontrak API, cache, dan last-good result;
- alasan setiap teknologi dipilih serta trade-off-nya.

Label kerangka berpikir tidak ditampilkan pada slide.

## Kerangka Penjelasan Machine Learning

Bagian machine learning harus secara alami mencakup:

- sumber 1.146 rekaman aktif dan tahapan pembersihan;
- alasan jumlah efektif klasifikasi menjadi 807, 761, dan 525;
- normalisasi entitas, enrichment label, deduplikasi, dan pencegahan target leakage;
- alasan TF-IDF kata/karakter, model linear, Complement Naive Bayes, multilingual embedding, dan kNN digunakan;
- fungsi ensemble dan batas bukti kontribusi embedding;
- alasan Holt-Winters dipilih untuk forecasting dan STL untuk dekomposisi;
- rolling-origin backtest, stratified 5-fold cross-validation, MAE, RMSE, WAPE, F1-weighted, F1-macro, dan baseline;
- asal ambang `tau = 0,35` dari uji sensitivitas coverage–precision;
- rumus skor risiko `100 × (0,40V + 0,35O + 0,25R)` setelah normalisasi;
- bobot sebagai konfigurasi awal berbasis prioritas, bukan bobot hasil pembelajaran atau validasi outcome;
- uji sensitivitas Jaccard terhadap perubahan bobot;
- posisi model sebagai dukungan informasi dengan human review.

Label kerangka berpikir tidak ditampilkan pada slide.

## Slide Lampiran

21. ERD dan LRS — Gambar III.1–III.2.
22. Arsitektur asli dan Use Case — Gambar III.3–III.4.
23. Activity Diagram — Gambar III.5–III.8.
24. Sequence Diagram — Gambar III.9–III.12.
25. Class Diagram — Gambar III.13.
26. Tampilan sistem — Gambar III.14–III.17.

Lampiran harus menjaga seluruh diagram tetap tersedia tanpa membebani durasi utama. Diagram kompleks dapat diberi nomor referensi dan caption singkat, tetapi tidak diperkecil hingga tidak terbaca.

## Speaker Notes

- Setiap slide utama memiliki notes untuk presenter terkait.
- Notes menggunakan bahasa Indonesia natural, argumentatif, dan tidak terdengar seperti hafalan.
- Notes memuat transisi menuju slide berikutnya.
- Klaim yang belum diuji disampaikan sebagai potensi atau keterbatasan.
- Slide 10 dan 19 memiliki kalimat handoff presenter.
- Slide 20 ditutup dengan kesiapan menerima pertanyaan.

## QA dan Kriteria Penerimaan

Deck tidak boleh diserahkan sebelum seluruh poin berikut lulus:

1. Render seluruh 26 slide ke PNG.
2. Jalankan pemeriksaan overflow menggunakan `slides_test.py`.
3. Periksa setiap slide pada ukuran penuh, bukan hanya montage.
4. Tidak ada overlap yang tidak disengaja.
5. Tidak ada judul yang berimpit dengan diagram, garis, atau node.
6. Tidak ada konektor yang melintasi teks atau berhenti di tengah node.
7. Tidak ada teks terpotong, meluber, terlalu kecil, atau terbungkus secara janggal.
8. Tidak ada visual raster buram pada ukuran presentasi.
9. Semua angka konsisten dengan skripsi dan memiliki konteks evaluasi yang tepat.
10. Seluruh 17 diagram tersedia pada slide utama atau lampiran.
11. Pembagian presenter dan handoff konsisten.
12. Lakukan minimal satu putaran perbaikan setelah render pertama, walaupun pemeriksaan otomatis tidak menemukan overflow.

## Deliverable

- File final: `/Users/nrzngr/Desktop/gapura-irrs2/outputs/Presentasi_Sidang_Skripsi_Irregularity_Ground_Handling.pptx`.
- Scratch dan hasil QA disimpan di workspace eksternal presentasi, bukan di folder output.
- Hanya file PowerPoint final yang diserahkan kepada pengguna.

