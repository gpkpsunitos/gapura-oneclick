# GSE Endpoint Documentation

Base URL: https://gapura-dev-gapura-ai.hf.space

## Ikhtisar
- Sumber data: Google Sheets (NON CARGO & CGO), rentang A1:AZ5000.
- Deteksi GSE:
  - Label AI issue_type mengandung "gse" atau "ground support".
  - Kolom ESKLASI_DIVISI mengandung "GSE".
  - Kata kunci alat pada teks: forklift, belt loader, GPU, tow tractor, air start, conveyor, loader, belt, dll.
  - Fallback subkategori: "The Availability of GSE" dan "Cleanliness of GSE".
- Filter esklasi: default "OT|OP|UQ|HT". Contoh di bawah menggunakan esklasi_regex=OT.

## Shared Parameters
- bypass_cache: boolean
- esklasi_regex: string
- confidence_threshold: number
- sample_n: integer

---

## 1) Ringkasan Risiko GSE
- Method: GET
- Path: /api/ai/gse
- Deskripsi: Ringkas risiko kategori "GSE" dan rekomendasi.
- Referensi kode: [gse_risk](file:///Users/nrzngr/Desktop/ai-model/hf-space/api/main.py#L2322-L2339)

Contoh Request:
```
GET https://gapura-dev-gapura-ai.hf.space/api/ai/gse?esklasi_regex=OT
```

Real Response:
```json
{"detail":"Category 'GSE' not found"}
```

Catatan: Ringkasan risiko bergantung pada RiskService yang mengagregasi kategori eksplisit; bila dataset tidak memuat kategori "GSE" secara eksplisit, layanan mengembalikan 404.

---

## 2) Top Issue Categories (SDA/SDM/Maintenance)
- Method: GET
- Path: /api/ai/gse/issues/top
- Deskripsi: Distribusi SDA/SDM/Maintenance, subkategori, dan root cause untuk kasus GSE.
- Referensi kode: [gse_top_issue](file:///Users/nrzngr/Desktop/ai-model/hf-space/api/main.py#L2350-L2551)

Contoh Request:
```
GET https://gapura-dev-gapura-ai.hf.space/api/ai/gse/issues/top?esklasi_regex=OT
```

Real Response:
```json
{"status":"success","filters":{"esklasi_regex":"OT"},"total_gse_records":1,"top":{"category":"Maintenance","count":1,"percentage":100.0},"distribution":{"SDA":{"count":0,"percentage":0.0},"SDM":{"count":0,"percentage":0.0},"Maintenance":{"count":1,"percentage":100.0}},"top_subcategory":{"subcategory":"Passenger, Baggage & Document Profilling","count":1,"percentage":100.0},"distribution_subcategory":{"Passenger, Baggage & Document Profilling":{"count":1,"percentage":100.0}},"top_root_cause":{"category":"Equipment Failure","count":1,"percentage":100.0},"distribution_root_cause":{"Equipment Failure":{"count":1,"percentage":100.0}},"top_samples":{"SDA":[],"SDM":[],"Maintenance":[]}}
```

---

## 3) Ranking Kasus GSE per Entitas
- Method: GET
- Path: /api/ai/gse/ranking
- Deskripsi: Ranking kasus GSE per branch/airline/area (default: branch).
- Referensi kode: [gse_ranking](file:///Users/nrzngr/Desktop/ai-model/hf-space/api/main.py#L1006-L1120)

Contoh Request:
```
GET https://gapura-dev-gapura-ai.hf.space/api/ai/gse/ranking?esklasi_regex=OT
```

Real Response:
```json
{"status":"success","entity":"branch","filters":{"esklasi_regex":"OT","confidence_threshold":0.0},"total_gse_records":1,"top":[{"name":"CGK","count":1,"percentage":100.0}],"distribution_high_level":{"SDA":{"count":0,"percentage":0.0},"SDM":{"count":0,"percentage":0.0},"Maintenance":{"count":1,"percentage":100.0}}}
```

---

## 4) Serviceability Status Alat GSE
- Method: GET
- Path: /api/ai/gse/serviceability
- Deskripsi: Status alat (Serviceable, Unserviceable, Needs Maintenance, Unavailable, Unknown) dan daftar alat dengan hitungan per status.
- Referensi kode: [gse_serviceability](file:///Users/nrzngr/Desktop/ai-model/hf-space/api/main.py#L1139-L1314)

Contoh Request:
```
GET https://gapura-dev-gapura-ai.hf.space/api/ai/gse/serviceability?esklasi_regex=OT
```

Real Response:
```json
{"status":"success","filters":{"esklasi_regex":"OT","confidence_threshold":0.0},"total_gse_records":1,"serviceability_distribution":{"Serviceable":{"count":0,"percentage":0.0},"Unserviceable":{"count":1,"percentage":100.0},"Needs Maintenance":{"count":0,"percentage":0.0},"Unavailable":{"count":0,"percentage":0.0},"Unknown":{"count":0,"percentage":0.0}},"equipment_status":[{"equipment":"Unknown","counts":{"Serviceable":0,"Unserviceable":1,"Needs Maintenance":0,"Unavailable":0,"Unknown":0},"total":1}],"top_samples":{"Serviceable":[],"Unserviceable":[],"Needs Maintenance":[],"Unavailable":[],"Unknown":[]}}
```

---

## 5) Kasus Irregularity Terkait GSE
- Method: GET
- Path: /api/ai/gse/irregularities
- Deskripsi: Daftar kasus Irregularity terkait GSE dengan tagging otomatis (SDM delay, SDA manual, macet perlu perbaikan).
- Referensi kode: [gse_irregularities](file:///Users/nrzngr/Desktop/ai-model/hf-space/api/main.py#L1315-L1419)

Contoh Request:
```
GET https://gapura-dev-gapura-ai.hf.space/api/ai/gse/irregularities?esklasi_regex=OT
```

Real Response:
```json
{"status":"success","filters":{"esklasi_regex":"OT","confidence_threshold":0.0},"total_gse_irregularity_cases":1,"distribution_by_tag":{"GSE Case":{"count":1,"percentage":100.0}},"cases":[{"sheet":"NON CARGO","branch":"CGK","airline":"Thai Airways","area":"Terminal Area","rc_category":"Equipment Failure","tag":"GSE Case","report_preview":"Komplain Penanganan Bagasi berdasarkan laporan CHS T3 (Apindo)","root_cause_preview":"Penumpang komplain mengenai kerusakan bagasi yang dialami dan menuntun dibuatkan laporan resmi tertulis, namun setelah dicek masih dalam kategori minor dan tidak dapat dibuatkan la"}]}
```

---

## Catatan Implementasi
- Normalisasi header: spasi dan "/" → "_" saat pengambilan dari Sheets.
- AI:
  - Multi-task Transformer untuk issue_type dan root_cause; confidence dapat difilter.
  - Fallback hybrid RC classifier ketika confidence di bawah ambang atau model tidak tersedia.
- Jika filter esklasi menyaring semua baris, deteksi GSE tetap mempertimbangkan ESKLASI_DIVISI dan kata kunci alat.
