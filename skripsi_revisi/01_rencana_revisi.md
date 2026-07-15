# Rencana Revisi

## Prioritas

1. Integritas akademik: hapus DOI palsu, sumber lama, dan klaim tanpa bukti.
2. Keselarasan implementasi: samakan role, API, tabel, layanan ML, dan layanan RAG dengan kode.
3. Traceability: hubungkan kebutuhan ke diagram, endpoint, halaman, dan pengujian.
4. Metodologi: pisahkan pengujian fungsional, evaluasi model, dan keterbatasan.
5. Format: pertahankan template dan lakukan perubahan lokal saja.

## Strategi per Bab

### Bagian Awal dan Abstrak

- Koreksi typo tanpa mengubah data institusi.
- Tambahkan RAG sebagai fitur pendukung dan nyatakan bukti 44/44 pengujian unit secara proporsional.
- Nyatakan batas bahwa akurasi analitik dan kualitas jawaban belum tervalidasi untuk produksi.

### BAB I

- Pertahankan fokus pada fragmentasi pelaporan, mikrolayanan, dan analitik prediktif.
- Tambahkan RAG hanya sebagai akses pengetahuan pendukung.
- Ubah manfaat yang absolut menjadi manfaat yang dapat diuji atau ditinjau pengguna.

### BAB II

- Ganti seluruh sitasi tidak valid/lama dengan sumber 2023–2025 yang terverifikasi.
- Selaraskan teori dengan implementasi: PWA, SSOT, mikrolayanan/API, Agile, peramalan, STL, NLP, kalibrasi, OOD/abstention, UML, ERD/LRS, black-box, dan RAG.
- Hapus simbol/metode yang tidak digunakan.

### BAB III

- Lengkapi kebutuhan semua role.
- Dokumentasikan jalur Virtual Assistant: sesi → kuota → proxy secret → RAG → retrieval/reranking → OpenRouter → evidence.
- Perbarui arsitektur, use case, API, penyimpanan, teknologi, dan pengujian.
- Pertahankan hasil ML yang ada sebagai baseline audit, bukan klaim produksi.

### BAB IV

- Jawab tujuan penelitian secara langsung.
- Pisahkan kelayakan fungsi dari validasi akurasi.
- Tambahkan keterbatasan dan agenda evaluasi RAG yang terukur.

## Traceability Antar Bab

| Fokus | BAB I | BAB II | BAB III | BAB IV |
|---|---|---|---|---|
| Fragmentasi data | Masalah dan dampak | SSOT/data value | Supabase write-first + mirror | Kesimpulan integrasi |
| Mikrolayanan | Solusi arsitektural | Prinsip dan trade-off | Next.js, ML, RAG, data services | Kelayakan dan batas operasi |
| Analitik prediktif | Tujuan pendukung evaluasi | Forecasting, STL, NLP, kalibrasi, OOD, risk | Implementasi dan baseline metrik | Kesimpulan hati-hati + evaluasi lanjut |
| RAG | Fitur pendukung | Pipeline dan evaluasi RAG | API, use case, arsitektur, sequence, unit test | Integrasi fungsional + keterbatasan kualitas |
| RBAC | Aktor dan manfaat | Keamanan/rekayasa perangkat lunak | Kebutuhan semua role + skenario akses | Keterbatasan pengujian keamanan |

## Kebijakan Menjaga Formatting

- Sumber asli tidak ditimpa.
- Margin, ukuran kertas, section, header/footer, font utama, dan template institusi dipertahankan.
- Paragraf baru memakai style dominan `Body Text`, `List Paragraph`, atau `Normal` sesuai konteks.
- Tabel baru/bertambah memakai format tabel yang sama dan row height fleksibel.
- Media diagram diganti pada relationship yang sama agar caption dan field `SEQ` tetap stabil.
- Daftar pustaka tetap berada dalam content control yang sama.
- Setiap batch besar diakhiri render DOCX dan inspeksi halaman.
