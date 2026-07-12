# Desain Revisi Skripsi Gapura IRRS

Tanggal: 12 Juli 2026  
Status: Disetujui pengguna (opsi 1)

## Tujuan

Merevisi `revisi_skripsi_v5.docx` menjadi naskah yang konsisten, dapat dipertahankan saat sidang, dan selaras dengan implementasi pada tiga repositori: aplikasi Gapura IRRS, layanan machine learning, dan layanan Gapura RAG. Judul dan topik inti tetap berfokus pada sistem pelaporan irregularity, arsitektur mikrolayanan, dan analitik prediktif.

## Keputusan Ruang Lingkup

Gapura RAG diposisikan sebagai fitur pendukung untuk tanya jawab dokumen operasional, bukan sebagai kontribusi utama penelitian dan bukan sebagai alasan mengubah judul. Kontribusi utama tetap berupa integrasi pelaporan irregularity dan analitik prediktif. Naskah tidak boleh mengklaim akurasi, efektivitas operasional, atau kesiapan produksi RAG tanpa hasil evaluasi yang tersedia.

## Pendekatan Revisi

Revisi dilakukan secara surgis pada salinan DOCX dengan mempertahankan template, section, margin, font, heading, caption, field, dan struktur halaman formal. Perubahan substansi diprioritaskan pada BAB I–IV, daftar simbol, daftar gambar/tabel, dan daftar pustaka. Naskah sumber tidak ditimpa.

Artefak akhir terdiri atas audit, rencana revisi, traceability matrix, DOCX revisi, diagram editable dan PNG, referensi bersih, pemetaan referensi, daftar penggantian referensi, serta changelog.

## Keselarasan Antar Bab

### BAB I

- Mempertahankan masalah fragmentasi data, alur pelaporan manual, arsitektur mikrolayanan, dan analitik prediktif sebagai fokus.
- Menyebut asisten virtual berbasis RAG hanya sebagai kapabilitas pendukung akses pengetahuan operasional.
- Membatasi klaim manfaat pada fungsi yang dibuktikan oleh implementasi atau pengujian.

### BAB II

- Menyediakan teori yang benar-benar digunakan di BAB III: sistem informasi web/PWA, SSOT, mikrolayanan dan API, Agile, UML, basis data, pengujian black-box, peramalan, STL, klasifikasi teks, kalibrasi, abstention/OOD, dan RAG.
- Teori RAG mencakup ingestion dokumen, chunking, embedding, vector store, retrieval/reranking, evidence/citation, dan grounded generation.
- Menghapus teori/simbol yang tidak digunakan serta mengganti semua sumber sebelum 2023 atau tidak terverifikasi.

### BAB III

- Memetakan semua aktor dan kebutuhan ke use case, activity, sequence, API, halaman, penyimpanan, dan skenario pengujian.
- Menjelaskan RAG sebagai layanan terpisah yang dipanggil aplikasi Next.js melalui proxy terautentikasi dan pembatasan kuota.
- Menjelaskan pipeline RAG sesuai kode: PDF ingestion, chunking, embedding multilingual, Pinecone, retrieval/reranking, OpenRouter, serta evidence halaman/sumber.
- Memisahkan hasil yang benar-benar diuji dari rancangan, fallback, target, atau agenda lanjutan.
- Angka evaluasi ML hanya dipertahankan bila dapat ditelusuri ke artefak atau log layanan ML.

### BAB IV

- Kesimpulan menjawab tujuan penelitian tanpa melebihkan bukti.
- RAG disebut sebagai fitur pendukung yang telah terintegrasi secara fungsional, bukan sebagai model yang telah tervalidasi kualitas jawabannya.
- Keterbatasan mencakup evaluasi lokal, cakupan data, abstention ML, evaluasi retrieval/generation RAG, beban, keamanan, dan validasi pengguna.

## Arsitektur yang Didokumentasikan

1. Pengguna mengakses PWA Next.js sesuai RBAC.
2. Transaksi laporan divalidasi dan ditulis ke Supabase/PostgreSQL sebagai system of record; bukti disimpan di Supabase Storage; Google Sheets berfungsi sebagai mirror operasional.
3. AI Orchestrator pada Next.js memanggil layanan ML FastAPI untuk klasifikasi, forecasting, STL, dan risk scoring dengan cache/fallback terkontrol.
4. Endpoint Virtual Assistant pada Next.js memvalidasi sesi dan kuota, lalu memanggil Gapura RAG melalui proxy secret.
5. Gapura RAG memproses dokumen menjadi chunk dan embedding, menyimpannya pada Pinecone, mengambil evidence yang relevan, melakukan reranking, lalu meminta LLM menghasilkan jawaban yang menyertakan sumber/halaman.

## Kebijakan Diagram

- PlantUML hanya digunakan untuk sequence diagram.
- Use case, activity, ERD, LRS, dan arsitektur dibuat dalam Graphviz DOT atau format editable setara.
- Diagram mengutamakan keterbacaan satu halaman A4, konsistensi nama aktor/API, dan hubungan yang dapat dibuktikan dari kode.
- Arsitektur wajib menampilkan aplikasi utama, Supabase, Google Sheets, ML service, dan RAG service tanpa menyamakan fungsi ML prediktif dengan RAG.
- Sequence RAG ditambahkan hanya bila diperlukan untuk melengkapi traceability; berkas minimum yang diminta pengguna tetap dipenuhi.

## Kebijakan Referensi dan DOI

- Hanya referensi 2023–2026 yang dipertahankan.
- DOI harus berhasil dicocokkan dengan metadata penerbit/Crossref dan judul, penulis, serta tahun yang sama.
- DOI yang tidak valid tidak diperbaiki dengan tebakan; sumber diganti atau dicantumkan sebagai URL resmi tanpa DOI bila memang tidak memiliki DOI.
- Referensi perangkat lunak dapat memakai dokumentasi resmi terbaru apabila lebih tepat daripada artikel sekunder.
- Semua sitasi dalam teks harus memiliki pasangan daftar pustaka dan sebaliknya.

## Penanganan Ketidakpastian dan Error

- Klaim yang tidak dapat diverifikasi dihapus, dilunakkan, atau ditandai sebagai keterbatasan.
- Ketidaktersediaan layanan ML/RAG dijelaskan sebagai respons error atau fallback yang benar-benar ada di kode, bukan sebagai keberhasilan analitik.
- Hasil `UNCERTAIN` dipertahankan sebagai mekanisme abstention yang memerlukan peninjauan manusia.
- Ketidaksesuaian antara kode, diagram, dan naskah diselesaikan dengan mengutamakan kode pada commit yang diaudit dan dicatat dalam changelog.

## Verifikasi

- Audit pasangan sitasi–daftar pustaka, tahun, DOI/URL, formula, simbol, caption, field, tabel, dan istilah.
- Verifikasi endpoint, role, tabel, dan alur terhadap ketiga repositori pada commit yang dicatat.
- Render seluruh DOCX menjadi PNG dan inspeksi setiap halaman pada 100% zoom.
- Bandingkan baseline dan hasil akhir untuk memastikan format institusi tetap menyerupai naskah asli.
- Jalankan pengecekan struktural DOCX serta validasi bahwa seluruh artefak wajib tersedia.

## Kriteria Selesai

- Tidak ada DOI palsu, referensi di luar 2023–2026, atau sitasi tanpa pasangan.
- Judul dan topik inti tidak berubah.
- RAG terjelaskan sebagai fitur pendukung yang dapat ditelusuri ke kode.
- Semua role, kebutuhan, API, halaman, diagram, dan pengujian memiliki traceability.
- Klaim hasil sesuai bukti; tidak ada data atau hasil uji yang dikarang.
- DOCX lolos pemeriksaan struktur dan inspeksi visual seluruh halaman.
