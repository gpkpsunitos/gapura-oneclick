# Changelog Revisi

## Substansi

- Menetapkan RAG sebagai fitur pendukung tanpa mengubah judul atau kontribusi utama.
- Menambahkan teori RAG, kalibrasi, selective classification/OOD, serta batas evaluasi.
- Melengkapi kebutuhan fungsional seluruh role dan peran sistem.
- Menambahkan endpoint Virtual Assistant, Pinecone index, dan teknologi RAG pada tabel desain/implementasi.
- Menambahkan hasil 44/44 pengujian unit RAG secara terbatas dan dapat ditelusuri.
- Memperketat kesimpulan dan keterbatasan ML/RAG.

## Referensi

- Menghapus seluruh sumber sebelum 2023.
- Menghapus empat DOI palsu/tidak terdaftar.
- Membangun ulang daftar pustaka dari 19 DOI yang diverifikasi melalui Crossref/doi.org dan satu dokumentasi resmi SWEBOK tanpa DOI.
- Menghasilkan BibTeX dan JSON verifikasi.

## Diagram

- Memperbarui use case dengan generalisasi aktor dan Virtual Assistant.
- Memperbarui arsitektur agar jalur transaksi, ML, dan RAG terpisah.
- Menambahkan sequence Virtual Assistant sebagai diagram pendukung.
- Merender ulang seluruh DOT/PlantUML menjadi PNG.

## Formula dan Simbol

- Menghapus simbol XGBoost/R-squared yang tidak digunakan.
- Menambahkan simbol MAE, RMSE, Holt-Winters, STL, probabilitas klasifikasi, ensemble, OOD, dan risk scoring.
- Membatasi interpretasi skor risiko sebagai indeks komposit deterministik.

## Format

- Tidak mengubah margin, ukuran kertas, header/footer, atau struktur section.
- Mengganti media arsitektur dan use case melalui relationship yang sama; caption dan numbering dipertahankan.
- Menambah baris tabel dengan row height fleksibel.
- Membangun daftar pustaka pada content control asli dengan hanging indent dan Times New Roman 12 pt.
- Mengaktifkan pembaruan field dokumen.

## Koreksi Halaman Formal

- Menambahkan tanda titik dua pada NIM.
- Memperbaiki `Universitas Bina Sarana Informatika`, `orisinal`, dan label nama/tanda tangan.
- Membetulkan label Dosen Pembimbing II pada lembar konsultasi terkait.

## Bukti Teknis

- Aplikasi: commit `09e49f87eb9e7e85b27df88880bd96fa05aa4f21`.
- ML: commit `8d3a23e8423c143a99524f1867a1ae65fa18d6a7`.
- RAG: commit `7f1549b7d1b0ad59c9405ba35ca0ab443e4f0ba3`.
- RAG unit tests: `44 passed`, 12 Juli 2026.
