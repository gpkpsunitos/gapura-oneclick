Referensi `skripsi.pdf` digunakan **hanya sebagai pendukung** untuk memperkuat framing akademik, istilah domain, dan tujuan sistem secara umum. Jika terdapat perbedaan antara naskah skripsi dan implementasi kode, maka dokumen ini selalu mengutamakan codebase.


## 1. Ringkasan Eksekutif

Gapura OneClick, adalah platform operasional berbasis web yang menggabungkan fungsi pelaporan irregularity, monitoring multi-divisi, analitik operasional, pengayaan insight berbasis AI, dashboard builder, kalender kerja, manajemen dokumen/divisi, tautan eksternal, dan kontrol keamanan dalam satu ekosistem aplikasi. Dari codebase yang tersedia, sistem ini dibangun menggunakan **Next.js App Router**, **React 19**, **Supabase**, **Google Sheets integration**, dan layanan AI terpisah yang diakses melalui route internal maupun service connector.

Secara konseptual, sistem ini bukan sekadar “aplikasi form laporan”. Sistem ini adalah **operational intelligence platform** untuk lingkungan ground handling bandara, dengan karakteristik berikut:

1. Sumber data utama operasional masih beririsan kuat dengan Google Sheets.
2. Aplikasi web bertindak sebagai lapisan orkestrasi, validasi, visualisasi, distribusi akses, dan pengayaan analitik.
3. Supabase berperan sebagai persistence layer, audit trail, security backbone, dan penyimpan entitas sistem yang tidak layak dikelola langsung di spreadsheet.
4. Terdapat pemisahan yang jelas antara domain pengguna umum, pengguna divisi, analis, admin, dan fungsi eskalasi.
5. Arsitektur UI telah berkembang menjadi multi-workspace dengan reuse komponen cukup tinggi, terutama pada dashboard per divisi.
6. Sistem mengandung pola cloud-native yang kuat: cron, webhook, cache, endpoint publik terkontrol, signed token upload, audit logs, security event pipeline, dan public embed.

Karena itu, design system untuk Gapura ONECLICK tidak boleh diposisikan hanya sebagai panduan visual. Design system harus menjadi **sistem aturan lintas layer** yang mencakup:

- identitas visual,
- bahasa antarmuka,
- komponen,
- layout,
- pola data presentation,
- workflow states,
- permission-aware UI,
- perilaku AI,
- standar keamanan UI,
- aturan integrasi antarworkspace,
- dan governance agar pengembangan fitur baru tetap koheren.

Dokumen ini menyusun kerangka tersebut secara menyeluruh.

## 2. Tujuan Dokumen

Dokumen ini memiliki beberapa tujuan praktis.

Pertama, menjadi acuan tunggal untuk mendefinisikan seperti apa **design system resmi** Gapura ONECLICK seharusnya dibentuk berdasarkan sistem yang telah berjalan. Selama ini codebase menunjukkan adanya banyak pola desain yang sudah baik, tetapi belum dibakukan sebagai sistem desain formal yang terdokumentasi.

Kedua, menjadi spesifikasi teknis dan produk yang menjelaskan **alur sistem end-to-end**. Ini penting karena aplikasi sudah cukup besar dan lintas domain. Tanpa dokumentasi terpadu, tim akan mudah memahami aplikasi secara parsial: sebagian hanya paham dashboard, sebagian hanya paham auth, sebagian hanya paham sync, sebagian hanya paham AI. Dokumen ini merajut semuanya menjadi model mental utuh.

Ketiga, menjadi **prompt basis** untuk AI-assisted design, AI-assisted coding, atau AI-assisted product generation. Dengan kata lain, dokumen ini tidak hanya dibaca manusia; ia juga dirancang supaya dapat dipakai sebagai sumber instruksi terstruktur ketika tim ingin meminta agen AI membuat halaman baru, komponen baru, atau fitur baru yang masih konsisten dengan Gapura ONECLICK.

Keempat, menjadi jembatan antara konteks akademik pada skripsi dan konteks implementasi aktual. Skripsi menyebutkan mikrolayanan, integrasi data, pengurangan data silo, serta analitik prediktif. Codebase menunjukkan bagaimana ide itu diwujudkan secara pragmatis ke dalam bentuk aplikasi produksi atau semi-produksi.

## 3. Cara Membaca Dokumen Ini

Dokumen ini dibagi ke dalam empat klaster besar.

Klaster pertama membahas **konteks sistem**, termasuk domain bisnis, tujuan aplikasi, aktor, role, dan pendekatan arsitektur.

Klaster kedua membahas **design system** secara lengkap: prinsip, token, warna, tipografi, komponen, pola layout, state design, interaksi, data visualization, copywriting, dan behavior untuk berbagai kondisi.

Klaster ketiga membahas **alur sistem**: autentikasi, pelaporan, sinkronisasi Sheets, penyimpanan Supabase, analitik, AI, kalender, upload, keamanan, dan embed.

Klaster keempat membahas **master prompt design system** dan prompt implementasi turunan yang bisa dipakai untuk generative workflow dengan AI.

Dengan demikian, pembaca yang fokus di produk dapat membaca bagian design system dan alur pengguna terlebih dahulu, sedangkan pembaca teknis dapat masuk ke arsitektur, data flow, dan governance.

## 4. Gambaran Domain Bisnis

Berdasarkan tipe data, route, nama halaman, dan konfigurasi divisi, aplikasi ini beroperasi pada domain **ground handling dan pengawasan operasional bandara**. Entitas penting di dalam codebase mencakup:

- laporan irregularity,
- complaint,
- compliment,
- maskapai,
- cabang,
- hub,
- area terminal/apron,
- GSE,
- delay code,
- root cause,
- division escalation,
- kalender rapat dan event,
- materi dan edaran HC,
- laporan AI,
- notifikasi,
- external links,
- dan dashboard khusus per unit kerja.

Skrip dan service juga menunjukkan bahwa aplikasi bukan hanya mengonsumsi data yang lahir dari aplikasi sendiri. Sebagian besar data bersumber dari sistem operasional yang masih ditata melalui **Google Sheets**. Karena itu ada perhatian besar terhadap:

- pemetaan header Sheets,
- sinkronisasi baris,
- fingerprint sumber,
- deduplikasi,
- rekonsiliasi update,
- dan pembersihan record yang sudah hilang dari sumber.

Secara bisnis, masalah yang sedang dipecahkan adalah:

1. Fragmentasi data antar platform.
2. Ketergantungan pada impor manual.
3. Lambatnya visibilitas operasional.
4. Sulitnya pengambilan keputusan lintas divisi.
5. Tidak meratanya kualitas analitik antar stakeholder.
6. Kebutuhan prioritisasi kasus berdasarkan severity, trend, dan AI insight.

## 5. Visi Produk

Visi implisit dari codebase ini dapat dirumuskan sebagai berikut:

**“Menyediakan satu platform operasional terintegrasi untuk pelaporan, pemantauan, analisis, dan pengambilan keputusan irregularity ground handling yang cepat, aman, multi-divisi, dan dapat diperluas.”**

Visi ini ditopang oleh beberapa karakter produk.

Pertama, aplikasi harus mampu menjadi **single operational surface** bagi banyak role. Ini tampak dari banyaknya route dashboard dan konfigurasi navigasi khusus role.

Kedua, aplikasi harus nyaman digunakan sebagai **monitoring console**. Banyak halaman dashboard memiliki pola ringkasan statistik, charts, list laporan, modal detail, filter, export, dan external link handoff.

Ketiga, aplikasi harus menjadi **lapisan integrasi**, bukan semata database entry system. Inilah sebabnya ada webhook Google Sheets, cron sync, public upload token, external links, embed, dan AI route.

Keempat, aplikasi harus menegakkan **keamanan yang eksplisit**. Codebase mengandung dokumentasi keamanan yang matang, termasuk audit logs, security events, session revocation, upload token, validation, rate limit, secret verification, dan access control yang ketat.

Kelima, aplikasi harus bisa berkembang menjadi **platform analitik operasional**. Ini tampak dari adanya custom dashboards, builder, query engine, AI summary, forecast, branch risk, root cause classification, dan insight export.

## 6. Persona dan Role Sistem

Codebase menunjukkan bahwa sistem memiliki banyak role, baik eksplisit di `types/index.ts` maupun implisit di `proxy.ts` dan `lib/nav-config.ts`. Role-role ini harus dipahami bukan sekadar label akses, tetapi sebagai fondasi desain antarmuka.

### 6.1 Super Admin

Super Admin memiliki akses ke dashboard admin, user management, report management, security, dan external links. Dari perspektif design system, UI untuk Super Admin harus:

- bersifat global,
- audit-oriented,
- tidak terlalu “operasional harian”,
- lebih fokus pada kontrol sistem, security posture, dan administrasi.

### 6.2 Analyst

Analyst tampak sebagai pengguna power-user dengan akses sangat luas:

- dashboard command center,
- laporan,
- AI reports,
- builder,
- custom dashboards,
- import data,
- dan pembuatan laporan.

Analyst adalah persona paling penting dalam menentukan kedalaman visualisasi data. Jika UI untuk Analyst dangkal, maka nilai sistem turun drastis. Karena itu halaman Analyst perlu menjadi benchmark kualitas dashboard di seluruh aplikasi.

### 6.3 Divisi Operasional dan Mitra Divisi


- menjaga konteks domain,
- tidak menuntut pengetahuan lintas divisi yang berlebihan,
- menyajikan insight yang relevan bagi unit masing-masing,
- tetapi tetap memakai bahasa desain yang seragam.

### 6.4 Divisi Eskalasi

Divisi Eskalasi memiliki peran sebagai pusat distribusi atau pemantau lintas divisi. Halaman `select`, `laporan-divisi`, dan dashboard eskalasi menunjukkan peran ini sebagai **traffic controller**. UI mereka harus memprioritaskan:

- pemilihan divisi,
- ringkasan komparatif,
- navigasi antar domain,
- dan kemampuan berpindah konteks dengan cepat.

### 6.5 Manager Cabang dan Staff Cabang

Role `MANAGER_CABANG` dan `STAFF_CABANG` lebih dekat ke lapisan entry dan operasional langsung. Mereka membutuhkan:

- pelaporan cepat,
- akses ke laporan sendiri,
- quick access,
- AI report yang relevan namun tidak terlalu berat,
- serta UX yang lebih sederhana dibanding dashboard analis.

### 6.6 HC dan HT

HC dan HT di codebase bukan hanya pelengkap. Ada halaman `hc/library`, `ht/reports`, `ht/ai-reports`. Ini menunjukkan aplikasi juga dipakai untuk konteks dokumen manusia, pembelajaran, dan distribusi materi. Karena itu design system harus mendukung bukan hanya dashboard charts, tetapi juga:

- document surfaces,
- library/listing views,
- reading layouts,
- announcement layouts,
- dan form yang tidak identik dengan laporan irregularity.

## 7. Permasalahan Produk yang Diselesaikan Sistem

Dari codebase dan abstrak skripsi, ada beberapa pain point utama.

### 7.1 Data Silo

Data berada di berbagai permukaan, khususnya spreadsheet. Hal ini menyulitkan konsolidasi dan analitik lintas unit.

### 7.2 Sinkronisasi Manual

Tanpa sinkronisasi otomatis, analis harus melakukan impor berulang yang rentan keterlambatan dan human error.

### 7.3 Keterlambatan Insight

Laporan ada, tetapi insight datang terlambat karena data belum terstruktur, belum terfilter, atau belum divisualisasikan.

### 7.4 Tidak Seragamnya Tampilan Peran

Berbagai stakeholder membutuhkan jenis informasi yang berbeda. Tanpa sistem desain yang konsisten, setiap halaman mudah berkembang sendiri-sendiri dan mengakibatkan fragmentasi UX baru.

### 7.5 Sulitnya Eskalasi dan Prioritisasi

Karena laporan bisa banyak, sistem perlu membantu memisahkan antara:

- laporan aktual,
- trend,
- severity,
- top risk,
- root cause,
- complaint vs irregularity,
- dan sinyal AI.

### 7.6 Risiko Keamanan

Sistem ini memiliki banyak titik sensitif:

- session,
- upload publik,
- webhook,
- cron,
- auth switching,
- dan route publik/embed.

Karena itu keamanan bukan fitur tambahan, melainkan bagian dari desain produk.

## 8. Arsitektur Produk Tingkat Tinggi

Secara praktis, aplikasi ini membentuk arsitektur berlapis:

1. **Presentation Layer**: Next.js App Router, React components, client dashboard, modal, chart, filters, forms.
2. **Application Layer**: route handlers di `app/api`, service modules di `lib/services`, utility domain di `lib/*`.
3. **Persistence & Security Layer**: Supabase PostgreSQL, storage, session records, audit logs, security events, dashboard config.
4. **External Operational Source Layer**: Google Sheets sebagai sumber data operasional yang dominan.
5. **AI / Advanced Analytics Layer**: route AI, HF client wrapper, service external, cache AI, analytics generators.
6. **Automation Layer**: Vercel Cron, webhook Google Sheets, background after hooks, sync scheduler scripts.

Ini berarti design system tidak boleh berhenti di warna dan tombol. Ia harus mampu mengakomodasi UI untuk:

- data ingestion,
- dashboard exploration,
- incident drilldown,
- admin control,
- risk view,
- document access,
- alert monitoring,
- dan embedded/public read views.

## 9. Arsitektur Teknis yang Tercermin dari Codebase

### 9.1 Frontend Runtime

`package.json` menunjukkan penggunaan:

- Next.js `^16.1.6`
- React `19.2.1`
- App Router
- SWR
- Recharts
- Framer Motion
- Radix primitives
- Tailwind CSS

Pilihan ini menjelaskan kenapa banyak halaman dashboard bersifat interaktif, data-heavy, dan incremental.

### 9.2 Service Layer

`lib/services/reports-service.ts`, `lib/services/sync-service.ts`, `lib/services/gapura-ai.ts`, `lib/services/query-executor.ts`, `lib/services/reports-service.ts` menunjukkan pola service modular. Ini bukan mikrolayanan murni dalam arti repository terpisah, tetapi **service-oriented modular monolith** pada permukaan web, dengan integrasi ke external AI service.

### 9.3 Persistence dan Metadata

Supabase menyimpan:

- users,
- reports,
- comments,
- custom dashboards,
- dashboard charts,
- ai audit logs,
- ai cache,
- calendar events,
- security sessions,
- security events,
- security alerts,
- audit logs,
- blocked IPs,
- dan config keamanan.

### 9.4 External Integration

Google Sheets menjadi sumber penting. Service sinkronisasi membaca baris, memetakan header, membangun fingerprint, melakukan upsert, menghapus data yang hilang dari sumber, dan mendorong update lokal kembali ke Sheets.

### 9.5 Security Middleware

`proxy.ts` berfungsi sebagai gatekeeper:

- bypass untuk embed publik,
- validasi route auth/public,
- pengecekan session,
- redirect berbasis role,
- proteksi route dashboard,
- dan pengecualian khusus untuk webhook serta sync endpoint pada kondisi tertentu.

## 10. Prinsip Dasar Design System

Design system Gapura OneClick harus tunduk pada prinsip berikut.

### 10.1 Operational First

Tampilan harus dirancang untuk mendukung pekerjaan operasional nyata, bukan sekadar presentasi cantik. Artinya:

- angka penting harus terlihat cepat,
- filter harus mudah dijangkau,
- chart harus bisa diterjemahkan ke tindakan,
- list laporan harus mudah ditelusuri,
- dan status harus jelas.

### 10.2 Role-Aware by Default

Setiap permukaan UI harus sadar role. Ini bukan hanya soal route protection, tetapi juga:

- tone copy,
- tingkat detail,
- kompleksitas komponen,
- default KPI,
- dan jalur navigasi yang ditawarkan.

### 10.3 Shared Skeleton, Specialized Surfaces

Codebase menunjukkan reuse melalui `DivisionAnalystDashboard`. Ini adalah pola yang benar: rangka dashboard yang sama, tetapi konten dan aksen divisinya spesifik. Design system harus memperkuat pendekatan ini.

### 10.4 Explain Before Impress

Sistem ini banyak berisi data, AI, dan visualisasi. Visual yang indah penting, tetapi keterbacaan harus selalu mengalahkan gimmick.

### 10.5 AI is Assistive, Never Obscuring

Insight AI harus memperjelas data, bukan menyamarkan asal data. Beberapa halaman di codebase bahkan secara eksplisit membedakan sinyal real dan sinyal AI. Ini harus dijaga sebagai prinsip desain.

### 10.6 Security is Visible When It Matters

Beberapa sistem menyembunyikan keamanan terlalu dalam. Di Gapura ONECLICK, aspek seperti session, token, upload policy, cron, webhook, dan alert sebaiknya muncul secara terukur dalam UI admin/security.

### 10.7 Dense, but Not Noisy

Karena ini dashboard operasional, densitas informasi boleh tinggi. Namun densitas bukan alasan untuk kekacauan. Sistem desain harus mendukung informasi yang padat tetapi tertata.

## 11. Identitas Produk dan Bahasa Visual

Codebase menunjukkan nama produk `Gapura OneClick` pada metadata, tetapi domain file dan narasi mengarah ke `Gapura ONECLICK`. Maka identitas produk perlu diposisikan dengan struktur berikut:

- **Nama platform internal/arsitektur**: Gapura ONECLICK
- **Nama produk antarmuka**: Gapura OneClick
- **Deskripsi ringkas**: Sistem Pelaporan dan Monitoring Operasional Bandara

Secara visual, sistem saat ini menggunakan nuansa:

- hijau emerald/teal untuk Analyst dan OS,
- cyan untuk OP,
- violet/fuchsia untuk HC,
- sky/blue untuk HT.

Pendekatan ini sangat tepat dan harus dibakukan menjadi **role-coded visual language**. Artinya setiap divisi memiliki identitas warna yang berbeda, tetapi masih hidup di dalam sistem dasar yang sama.

## 12. Design Tokens Inti

Bagian ini mendefinisikan token sistem yang disarankan berdasarkan pola yang sudah tampak pada kode.

### 12.1 Color System Makro

Gunakan tiga lapisan warna:

1. **Core Surface System**
2. **Division Identity System**
3. **Semantic State System**

#### 12.1.1 Core Surface System

Core Surface System dipakai di semua halaman tanpa memandang divisi.

- `--surface-1`: latar kartu utama, panel halus, putih hangat
- `--surface-2`: permukaan elevasi rendah, skeleton, soft container
- `--surface-3`: garis pemisah lembut
- `--surface-4`: border lebih tegas, placeholder
- `--text-primary`: teks utama
- `--text-secondary`: teks penjelas
- `--text-muted`: teks metadata
- `--brand-primary`: warna aksen utama halaman aktif

Penting: `--brand-primary` tidak identik untuk seluruh aplikasi. Nilainya dapat diwariskan dari konteks divisi.

#### 12.1.2 Division Identity System

Mapping yang sudah ada di `lib/constants/divisions.ts` sebaiknya diangkat menjadi token resmi.

- OS: emerald-teal
- OP: cyan-teal
- HC: violet-fuchsia-rose
- HT: sky-blue-indigo
- Analyst: emerald-teal

Setiap divisi minimal memiliki:

- `division.primary`
- `division.primary-soft`
- `division.gradient-start`
- `division.gradient-end`
- `division.border-soft`
- `division.text-strong`

#### 12.1.3 Semantic State System

Status semantik harus stabil lintas halaman:

- success: hijau
- warning: amber
- danger: merah
- info: biru
- neutral: slate/gray

Untuk severity laporan:

- LOW: biru muda atau slate kuat
- MEDIUM: amber lembut
- HIGH: orange/rose
- CRITICAL: merah
- TOP RISK: merah pekat dengan highlight khusus

Untuk status workflow:

- OPEN: danger atau warning kuat tergantung konteks
- ON PROGRESS: amber/biru
- CLOSED: success

### 12.2 Typography

Codebase global memakai `Plus Jakarta Sans` dan `JetBrains Mono`. Ini sudah tepat. Maka sistem tipografi resmi:

- **Primary UI font**: Plus Jakarta Sans
- **Monospace/Data font**: JetBrains Mono

Hierarchy:

- Display: untuk hero dashboard besar
- Heading 1: judul halaman workspace
- Heading 2: judul section
- Heading 3: judul card/kartu insight
- Body: deskripsi utama
- Caption: metadata, timestamp, source tag
- Mono data: angka, kode delay, sheet row, ID, hash singkat

Karakter tipografi yang harus dijaga:

- rapat, modern, bersih,
- cukup formal untuk enterprise,
- tetapi tidak kaku seperti sistem pemerintahan konvensional.

### 12.3 Radius

Dari banyak komponen tampak radius cukup besar, misalnya `24px`, `28px`, `22px`. Ini memberi kesan modern dan ramah. Standarnya:

- small: 12px
- medium: 16px
- large: 24px
- xlarge: 28px
- pill: 999px

### 12.4 Shadows dan Elevation

Gunakan shadow secara hemat. Dashboard operasional tidak membutuhkan shadow berat di semua tempat. Shadow sebaiknya hadir untuk:

- active shortcut cards,
- floating modal,
- cards penting,
- CTA sekunder yang butuh affordance,
- slide/presentation export surfaces.

### 12.5 Motion

Motion harus fungsional:

- skeleton loading,
- chart lazy reveal,
- filter drawer transition,
- modal open/close,
- panel expansion,
- subtle hover state.

Jangan gunakan animasi flamboyan untuk data kritis. Motion pada platform operasional harus membantu orientasi, bukan menarik perhatian berlebihan.

## 13. Struktur Layout Global

### 13.1 Layout Utama Aplikasi

`app/layout.tsx` menunjukkan root app mengandalkan provider global, analytics, speed insights, dan PWA readiness. Dari perspektif desain, layout global harus membagi aplikasi menjadi beberapa mode permukaan:

- public/auth,
- employee workspace,
- division workspace,
- analyst/admin workspace,
- embed/public insight.

### 13.2 Workspace Layout

Setiap workspace dashboard sebaiknya memakai template umum:

1. Header halaman
2. Statistik utama
3. Filter global
4. Konten analitik utama
5. Daftar laporan / drilldown
6. Utility panel seperti export, AI summary, external links

Pola ini terlihat kuat pada `DivisionAnalystDashboard`.

### 13.3 Grid System

Karena aplikasi berisi banyak KPI dan chart, grid harus fleksibel:

- 12 kolom untuk desktop
- 2 atau 4 kolom untuk tablet
- 1 kolom penuh untuk mobile

Card analytics:

- half width
- full width
- narrow aside summary
- tall comparison tile

### 13.4 Mobile Strategy

Aplikasi ini jelas dipakai terutama di desktop, tetapi tetap harus usable di mobile. Artinya:

- filter harus tersedia dalam drawer,
- tabel harus memiliki fallback cards,
- chart harus bisa collapse atau horizontal scroll terkontrol,
- CTA penting tetap reachable,
- dan insight utama muncul sebelum tabel panjang.

## 14. Komponen Dasar Design System

### 14.1 App Header

Header halaman harus menampilkan:

- nama workspace/divisi,
- subtitle operasional,
- tanggal/update state,
- CTA refresh,
- CTA export,
- search bila relevan.

Header tidak boleh hanya dekoratif; ia adalah tempat orientasi konteks.

### 14.2 Stat Cards

Stat card adalah komponen inti sistem. Varian yang dibutuhkan:

- KPI basic
- KPI delta MoM
- KPI AI-assisted
- KPI severity
- KPI workflow status
- KPI source-aware

Setiap stat card idealnya memiliki:

- label,
- value utama,
- caption,
- indikator perubahan,
- optional badge source,
- optional trend sparkline.

### 14.3 Data Cards

Data card dipakai untuk chart, ranking, summary text, dan mini table. Ia harus konsisten dalam:

- title,
- subtitle,
- action slot,
- body,
- footer source,
- state empty/loading/error.

### 14.4 Report Row / Report Card

Karena laporan adalah entitas sentral, komponen report row harus distandarkan. Minimal memuat:

- judul/summary,
- kategori,
- severity,
- status,
- airline,
- branch,
- tanggal kejadian,
- sumber sheet,
- CTA detail.

Untuk mobile, report row berubah menjadi stacked card.

### 14.5 Filter Bar

Filter bar merupakan komponen kritis. Dari codebase, filter global meliputi hub, branch, airlines, categories, date range, severity, list filter, dan search. Design system harus mendefinisikan:

- filter chips,
- dropdown multi-select,
- applied filter summary,
- clear all,
- persistence policy,
- mobile drawer variant.

### 14.6 Chart Wrapper

Recharts dipakai luas. Supaya konsisten, semua chart harus dibungkus komponen dengan API umum:

- title
- subtitle
- description
- legend behavior
- tooltip style
- exportable region
- source tag
- AI badge jika relevan
- empty state

### 14.7 Modal Detail

Report detail modal dan filter modal sudah ada. Standar modal:

- radius besar,
- header sticky bila panjang,
- close action jelas,
- background scroll lock,
- sections bernama,
- actions footer bila ada perubahan,
- source metadata di bagian atas atau akhir.

### 14.8 Notification and Alert Components

Untuk halaman admin/security dan notifikasi, perlu komponen:

- inline alert
- banner alert
- incident toast
- audit event row
- security severity badge

### 14.9 External Link Card

Karena aplikasi menggunakan `external-links`, perlu komponen standar untuk handoff ke sistem lain:

- judul sistem eksternal,
- deskripsi singkat,
- alasan handoff,
- tombol open external,
- badge origin,
- modal konfirmasi bila diperlukan.

### 14.10 Builder Components

Fitur builder memerlukan komponen teknis:

- source selector
- field sidebar
- chart config editor
- dashboard canvas
- layout tile
- page/folder selector
- preview panel

Komponen builder harus memakai visual language yang lebih “tooling-oriented”, bukan visual dashboard presentasional biasa.

## 15. Pola State UI

Design system tidak lengkap jika tidak mengatur state.

### 15.1 Loading State

Codebase sudah menggunakan skeleton dan lazy loading. Pola ini harus dibakukan:

- KPI skeleton
- chart skeleton
- list skeleton
- modal body skeleton
- builder canvas skeleton

Loading state tidak boleh menipu dengan data palsu; ia harus jelas bahwa data sedang dimuat.

### 15.2 Empty State

Empty state perlu dibedakan:

- belum ada data sama sekali,
- filter terlalu sempit,
- data source belum sinkron,
- user tidak punya akses,
- fitur belum dikonfigurasi.

Jangan gunakan satu empty state generik untuk semua kasus.

### 15.3 Error State

Error state dibagi dua:

- recoverable: misalnya fetch gagal, pengguna bisa refresh
- blocking: misalnya akses ditolak atau konfigurasi rusak

### 15.4 Partial Data State

Karena sistem bergantung pada integrasi eksternal dan AI, sering kali satu bagian data tersedia sementara bagian lain gagal. UI harus mampu menunjukkan:

- data utama tersedia,
- AI unavailable,
- sync stale,
- cache fallback aktif,
- atau external link tidak dikonfigurasi.

Ini sangat penting agar pengguna tidak mengira semua angka setara tingkat keandalannya.

## 16. Copy System dan Tone of Voice

Tone produk harus:

- jelas,
- operasional,
- profesional,
- tidak terlalu birokratis,
- tidak terlalu “marketing”.

Contoh karakter copy:

- “Menyiapkan daftar laporan terbaru”
- “Sinkronisasi terakhir 14 menit lalu”
- “Data AI belum tersedia, menampilkan data aktual”
- “Hanya admin dan analyst yang dapat memicu sinkronisasi”

Hindari:

- jargon teknis berlebih di permukaan end-user,
- kalimat ambigu seperti “Terjadi kesalahan” tanpa konteks,
- label campur-campur yang tidak stabil antara Inggris dan Indonesia.

Bahasa utama antarmuka sebaiknya **Bahasa Indonesia**, dengan istilah teknis Inggris hanya jika memang sudah baku di domain pengguna.

## 17. Sistem Ikonografi

Karena `lucide-react` dipakai luas, ikonografi sistem dapat distandarkan pada keluarga Lucide. Aturannya:

- satu ikon utama per fungsi,
- jangan terlalu banyak variasi ikon untuk konsep yang sama,
- gunakan ikon untuk mempercepat scanning, bukan sebagai hiasan.

Contoh mapping:

- dashboard: layout
- reports: clipboard/file text
- users: users
- security: shield/alert
- AI: brain/sparkles terkontrol
- calendar: calendar
- external link: link/external-link
- builder: hash/layers
- notifications: bell

## 18. Data Visualization System

Aplikasi ini sangat chart-heavy. Karena itu design system harus memiliki aturan visualisasi.

### 18.1 Prinsip Umum

- Setiap chart harus menjawab satu pertanyaan.
- Judul chart harus berbentuk pertanyaan atau pernyataan operasional yang jelas.
- Selalu tampilkan satuan atau konteks angka.
- Tooltip harus informatif tapi singkat.
- Warna tidak boleh menjadi satu-satunya pembeda.

### 18.2 Jenis Chart Utama

Berdasarkan codebase, jenis chart yang dominan:

- line chart untuk trend waktu,
- bar chart untuk ranking/category comparison,
- pie/donut untuk distribution ringkas,
- heatmap untuk intensitas,
- comparison table untuk analisis berdimensi,
- monthly trend chart,
- AI risk visualization.

### 18.3 Warna Chart

Gunakan:

- warna divisi untuk chart utama workspace tersebut,
- warna semantik untuk severity/status,
- palet netral untuk data pembanding,
- warna AI yang konsisten tetapi tidak menipu sebagai “data aktual”.

### 18.4 AI vs Actual Data Distinction

Ini adalah aturan paling penting dalam data visualization Gapura ONECLICK.

Semua chart atau kartu yang menampilkan hasil AI wajib:

- memiliki badge AI,
- menyebut sumber atau proses ringkas,
- tidak memakai warna yang identik dengan angka operasional aktual tanpa pembeda,
- dan bila memungkinkan menampilkan catatan bahwa insight AI adalah lapisan interpretasi, bukan pengganti data sumber.

## 19. Navigasi dan Information Architecture

`lib/nav-config.ts` menunjukkan arsitektur navigasi yang cukup kaya. Secara IA, sistem dapat dipetakan menjadi domain berikut:

### 19.1 Workspace Umum

- employee
- employee/new
- employee/reports
- quick-access

### 19.2 Workspace Divisi

- OS
- OP
- HT
- HC

### 19.3 Workspace Eskalasi

- select divisi
- dashboard eskalasi
- laporan lintas divisi

### 19.4 Workspace Analis

- dashboard
- laporan
- AI reports
- builder
- custom dashboards
- import
- calendar
- meetings
- notifications
- drilldown

### 19.5 Workspace Admin

- dashboard
- security
- users
- reports
- external links
- notifications
- drilldown

Design system harus mempertahankan konsistensi struktur ini:

- overview dulu,
- lalu monitoring/list,
- lalu tool khusus,
- lalu admin/support utilities.

## 20. Alur Sistem Utama: Auth dan Session

Bagian ini membahas alur sistem secara operasional.

### 20.1 Login dan Session Issuance

Ketika pengguna login, sistem membuat JWT session menggunakan `signSession` di `lib/auth-utils.ts`. Session berisi payload penting:

- id,
- email,
- role,
- full_name,
- division,
- station,
- unit,
- position,
- sid.

Token berlaku 24 jam dan ditandatangani dengan `JWT_SECRET`. Ini berarti design system untuk layar login dan session management harus memahami bahwa:

- autentikasi bersifat cookie/token based,
- revocation mungkin terjadi,
- dan user dapat memiliki identitas kerja yang cukup kaya.

### 20.2 Session Verification

Setiap request terproteksi melewati `verifySession`. Sistem tidak hanya memeriksa signature JWT, tetapi juga mengecek `security_sessions` di Supabase untuk memastikan sesi tidak dicabut.

Implikasi desain:

- saat session invalid, sistem harus redirect atau memberi response unauthorized secara tegas,
- layar re-login harus terasa cepat dan tidak membingungkan,
- admin security UI perlu mampu memvisualkan sesi aktif/revoked.

### 20.3 Route Protection

`proxy.ts` mengatur:

- route publik,
- route embed,
- route auth,
- role-based redirect,
- bypass webhook dengan secret,
- pengecualian development mode.

Ini berarti design system perlu membedakan tiga kelas pengalaman:

1. **Public minimal surface**
2. **Authenticated workspace surface**
3. **Restricted administrative surface**

## 21. Alur Sistem: Pelaporan

Walau source data banyak berasal dari Sheets, sistem tetap memiliki permukaan pelaporan sendiri, termasuk `employee/new`, import, dan berbagai route report detail.

### 21.1 Report Entity

Tipe `Report` sangat kaya. Ia mencakup:

- identitas dasar laporan,
- status,
- severity,
- priority,
- info penerbangan,
- info GSE,
- kategori,
- notes,
- bukti,
- metadata sumber,
- timestamp,
- field operasional dari Sheets,
- dan banyak atribut analitik tambahan.

Secara produk, ini berarti satu layar detail laporan harus mendukung struktur sectioned information architecture, bukan flat form panjang.

### 21.2 Report Creation

Role employee/staff kemungkinan membuat laporan melalui `employee/new` dan public upload-related endpoints. UI pembuatan laporan harus memecah input menjadi grup:

- identitas kejadian,
- detail narasi,
- konteks operasional,
- bukti,
- kategori/eskalasi,
- dan metadata tambahan.

### 21.3 Report Consumption

Laporan dikonsumsi dalam beberapa mode:

- list monitoring,
- modal detail,
- detail page,
- aggregate dashboard,
- AI analysis context,
- export context,
- embed/public context terbatas.

Karena satu entitas yang sama dilihat oleh banyak persona, design system perlu mendefinisikan “report object rendering rules” yang stabil.

## 22. Alur Sistem: Sinkronisasi Google Sheets

Inilah salah satu inti sistem.

### 22.1 Sumber dan Mapping

`reports-service.ts` menunjukkan mapping yang sangat luas antara properti `Report` dan variasi header Google Sheets. Ini mengindikasikan bahwa sumber data tidak selalu bersih atau konsisten.

Sistem menyikapinya dengan:

- fallback header names,
- header preference untuk write mapping,
- parsing tanggal,
- normalisasi kategori,
- penentuan fingerprint,
- deterministic ID mapping.

### 22.2 Trigger Sinkronisasi

Sinkronisasi dapat dipicu oleh:

- admin/analyst melalui API,
- cron Vercel,
- webhook Google Sheets,
- script lokal/scheduler.

`vercel.json` menunjukkan cron jam 03:00 dan 03:15. Route webhook menerima `x-irrs-webhook-secret`.

### 22.3 Proses Sinkronisasi

`SyncService` melakukan:

- lock agar sync tidak ganda,
- fetch reports dari Sheets,
- bangun fingerprint bila belum ada,
- cek duplicate fingerprint,
- upsert ke database,
- delete data yang hilang dari source,
- push local updates kembali ke Sheets,
- invalidate cache,
- update sync state,
- kirim email notifikasi new record.

Ini sangat penting secara desain karena UI sync status harus mampu menjelaskan:

- sync sedang berjalan,
- sync terakhir sukses/gagal,
- jumlah inserted/updated/deleted/errors,
- dan apakah trigger digabung ke sync aktif.

### 22.4 Implikasi UX

Halaman admin sync atau notifikasi sinkronisasi perlu menampilkan status yang lebih kaya daripada sekadar “berhasil” atau “gagal”. Karena prosesnya kompleks, pengguna berwenang perlu tahu:

- sumber trigger,
- waktu,
- hasil,
- apakah sync joined,
- apakah data stale,
- dan bila gagal, tahap mana yang kemungkinan bermasalah.

## 23. Alur Sistem: Supabase sebagai Operational Backbone

Supabase tidak hanya menjadi database. Ia merupakan tulang punggung operasional sistem.

### 23.1 Tabel Utama

Berdasarkan schema:

- `users`
- `reports`
- `report_comments`
- `custom_dashboards`
- `dashboard_charts`
- `calendar_events`
- `audit_logs`
- `ai_audit_logs`
- `ai_cache_entries`
- `security_events`
- `security_alerts`
- `security_sessions`
- `blocked_ips`
- `security_configs`

### 23.2 Peran Produk

Secara produk, Supabase menjalankan empat fungsi:

1. persistence aplikasi,
2. audit dan security,
3. dynamic configuration,
4. personalization/dashboard storage.

Design system harus mengantisipasi bahwa beberapa halaman adalah **configuration-backed surfaces**, bukan hanya visualisasi data statis.

## 24. Alur Sistem: Dashboard dan Analytics Workspace

### 24.1 Dashboard Sebagai Experience Utama

Jika melihat route dan komponen, dashboard adalah experience utama aplikasi. Banyak halaman turunan hanyalah bentuk spesifik dari dashboard umum.

### 24.2 DivisionAnalystDashboard sebagai Kernel UI

`components/dashboard/DivisionAnalystDashboard.tsx` memperlihatkan kernel yang menggabungkan:

- SWR data fetching,
- export,
- global filters,
- report list,
- AI summary,
- dynamic charts,
- modal detail,
- external links,
- lazy rendering,
- dan multi-view dashboard/reports.

Dokumen ini merekomendasikan agar komponen ini diposisikan sebagai **reference shell** untuk semua workspace analitik di masa depan.

### 24.3 Pola Data Fetching

Dashboard menggunakan SWR dengan deduping interval, mematikan revalidate on focus pada beberapa resource, dan memisahkan fetch laporan serta analytics. Ini menunjukkan prioritas pada stabilitas dan efisiensi.

### 24.4 Export

Karena ada `analyst-export`, dashboard tidak berhenti pada layar. Ia juga menjadi alat produksi dokumen. Ini membuat design system harus mempertimbangkan:

- print-safe surfaces,
- presentation slide surfaces,
- export-to-PDF friendliness,
- export-to-Excel semantics.

## 25. Alur Sistem: AI dan Analitik Prediktif

### 25.1 Positioning AI di Sistem

Codebase menunjukkan AI digunakan untuk:

- report summaries,
- branch risk,
- root cause classification,
- seasonality forecast,
- dashboard summary,
- risk detail,
- category summaries.

### 25.2 AI Service Boundary

`lib/services/gapura-ai.ts` menunjukkan bahwa AI diakses melalui base URL service, dengan fallback local host. Ini menegaskan pemisahan antara web application dan AI processing service.

### 25.3 AI Cache dan Audit

Tersedia `ai_cache_entries` dan `ai_audit_logs`. Ini sangat penting: sistem sudah memahami bahwa AI harus dapat:

- dicache,
- diaudit,
- diinspeksi,
- dan diperlakukan sebagai lapisan yang perlu governance.

### 25.4 Implikasi Design System untuk AI

Setiap fitur AI wajib punya:

- state loading,
- state unavailable,
- state stale cache,
- source disclosure ringkas,
- confidence framing bila tersedia,
- dan pemisahan visual dari data aktual.

AI cards tidak boleh memaksa pengguna mempercayai model secara buta.

## 26. Alur Sistem: Builder dan Custom Dashboards

Ini adalah capability penting dan sering diabaikan dalam dokumentasi sistem.

### 26.1 Builder sebagai Produk Internal

Fitur `Explore & Build` dan `Custom Dashboards` menunjukkan aplikasi berkembang menjadi internal BI environment. Pengguna tertentu dapat:

- menyusun dashboard,
- memilih sumber data,
- menentukan chart,
- menyimpan konfigurasi,
- mengelompokkan dalam folder,
- dan membuka kembali hasilnya.

### 26.2 Entitas Builder

Schema menunjukkan:

- `custom_dashboards`
- `dashboard_charts`

Ini berarti design system perlu memperlakukan builder sebagai sub-produk dengan UI yang berbeda dari dashboard konsumsi.

### 26.3 Prinsip UX Builder

Builder harus:

- eksplisit,
- tidak ambigu,
- dapat di-preview,
- memberi feedback jelas atas field/source/query,
- dan tidak menyamakan editing mode dengan viewing mode.

## 27. Alur Sistem: Calendar, Meetings, dan Library

### 27.1 Kalender

`calendar_events` mendukung:

- event_date,
- event_time,
- notes,
- meeting minutes link,
- recurrence,
- parent_event,
- calendar_type,
- deleted_at.

Ini menunjukkan kalender bukan fitur tempelan. Ia sudah mendukung siklus event yang cukup matang.

### 27.2 Meetings

Halaman meetings pada beberapa workspace berarti aplikasi juga dipakai sebagai coordination surface. Design system perlu mendukung tampilan:

- calendar grid,
- agenda list,
- event detail,
- recurrence explanation,
- link ke minutes.

### 27.3 HC Library

Halaman HC library mengindikasikan kebutuhan document-first layout. Maka design system harus memiliki template khusus untuk:

- library listing,
- document card,
- category tabs,
- metadata dokumen,
- quick preview,
- download/open action.

## 28. Alur Sistem: Security Monitoring

### 28.1 Security Sebagai Fitur Produk

Berbeda dari banyak aplikasi internal yang menaruh keamanan hanya di backend, Gapura ONECLICK memiliki dashboard security tersendiri. Hal ini dipertegas oleh:

- `security_events`
- `security_alerts`
- `security_sessions`
- `blocked_ips`
- `security_configs`
- dokumentasi keamanan yang lengkap.

### 28.2 Security UI Requirements

UI security harus mendukung:

- live feed event,
- alert severity chips,
- status open/resolved,
- assignee,
- detail payload inspection,
- session revoke controls,
- IP block controls,
- dan audit trail browsing.

### 28.3 Design Principle for Security Surfaces

Security UI sebaiknya:

- lebih padat,
- lebih netral,
- tidak terlalu banyak dekorasi,
- mengutamakan keterbacaan log,
- dan menonjolkan severity dengan jelas.

## 29. Alur Sistem: Upload Publik dan Evidence Handling

Ada serangkaian route untuk evidence upload, termasuk token issuance, public upload, batch upload, document upload, media upload. Design system harus menganggap upload sebagai alur kritis.

### 29.1 Tahapan Upload

1. Klien meminta signed upload token.
2. Server menerapkan rate limit.
3. File divalidasi dengan magic bytes.
4. Upload diproses sesuai route.
5. URL bukti dikaitkan ke laporan.

### 29.2 Kebutuhan UX

Upload UI harus menampilkan:

- jenis file yang diterima,
- ukuran file,
- progress,
- hasil validasi,
- kegagalan spesifik,
- preview bila aman,
- dan daftar lampiran.

### 29.3 Security Messaging

Pesan error upload jangan generik. Jika file ditolak karena signature salah, beri pesan yang membantu tetapi tidak membocorkan detail keamanan secara berlebihan.

## 30. Alur Sistem: External Links dan Handoff

Terdapat mekanisme external links dan halaman admin untuk mengelolanya. Ini berarti aplikasi terkadang tidak ingin “menampung semua fitur di dalam dirinya”, tetapi menjadi orchestrator lintas sistem.

Design system harus menyediakan pola handoff:

- open external dashboard,
- preview destination,
- rationale,
- trust cue bahwa link berasal dari konfigurasi resmi,
- dan fallback ketika link tidak tersedia.

## 31. Alur Sistem: Public Embed

`proxy.ts` secara eksplisit membypass `/embed` dan `/api/embed`. Ini menandakan ada permukaan publik atau semi-publik yang sengaja dikecualikan dari auth normal.

### 31.1 Embed Surface Rules

Embed view harus:

- lebih ringan,
- bebas clutter navigasi internal,
- fokus pada data tertentu,
- punya branding yang cukup,
- dan tidak membocorkan kontrol internal.

### 31.2 Design Distinction

Embed bukan sekadar iframe version dari dashboard internal. Ia adalah produk presentasi yang lebih terbatas, lebih aman, dan lebih self-contained.

## 32. Permukaan Produk per Divisi

Bagian ini menurunkan identitas dan orientasi tiap divisi.

### 32.1 OS

OS terkait monitoring, calendar, meetings, handbook, WSN, SLA, reports, drilldown, Joumpa. Workspace OS harus terasa sebagai pusat pengawasan operasional harian.

Karakter UI:

- hijau-emerald,
- monitoring-centric,
- update real dan disiplin,
- shortcut ke scheduling dan handbook.

### 32.2 OP

OP memuat complaint analytics, irregularity vs complaint ranking, root cause dominant, Joumpa, reports, AI reports.

Karakter UI:

- cyan/teal,
- fokus pada pelayanan dan kualitas operasi,
- banyak komparasi kategori dan trend kasus.



Karakter UI:

- amber/orange,
- teknis dan asset-centric,
- menonjolkan breakdown, severity, issue category, serviceability.



Karakter UI:

- pink/rose,
- lebih fokus pada severity, quality guardrail, dan risk pattern.

### 32.5 HC

HC lebih document-centric. Tidak semua workspace perlu dashboard superpadat. HC dapat mengutamakan clarity, edaran, dan library.

### 32.6 HT

HT adalah training workspace. Fokusnya bisa menggabungkan laporan, AI insight, dan materi peningkatan kompetensi.

### 32.7 Analyst

Analyst adalah “meta workspace” yang paling kaya. Semua pola terbaik harus lahir di sini dulu sebelum diturunkan ke workspace lain.

### 32.8 Admin

Admin bukan dashboard biasa. Ia harus memusatkan:

- kontrol sistem,
- governance,
- security,
- users,
- external config,
- dan laporan global.

### 32.9 Eskalasi

Eskalasi harus terasa seperti pusat transit antar divisi, bukan domain analitik detail satu divisi.

## 33. Spesifikasi Komponen Domain Khusus

### 33.1 Severity Badge

Harus mendukung:

- LOW
- MEDIUM
- HIGH
- CRITICAL
- TOP RISK

Varian:

- filled
- soft
- outline
- table compact

### 33.2 Status Badge

Harus mendukung:

- OPEN
- ON PROGRESS
- CLOSED

### 33.3 Source Badge

Karena sistem banyak sumber data, badge sumber penting:

- Google Sheets
- Supabase
- AI Summary
- Forecast
- Cached
- External

### 33.4 Sync Status Indicator

Indikator khusus yang menampilkan:

- fresh,
- stale,
- syncing,
- failed,
- joined/in-progress.

### 33.5 AI Insight Block

Komponen ringkasan AI hanya dipakai untuk ringkasan section/dashboard atau workflow AI eksplisit. AI insight per chart tidak ditampilkan lagi.

Komponen ringkasan AI yang masih aktif harus memuat:

- title,
- insight bullets,
- recommendation,
- timestamp,
- source note,
- optional confidence/meta.

### 33.6 Audit Row

Untuk admin/security:

- actor
- action
- entity
- timestamp
- IP
- diff preview

### 33.7 Session Card

Untuk security session:

- user
- device/user agent
- IP
- last active
- expires
- revoked state
- revoke CTA

## 34. Aksesibilitas

Walaupun ini aplikasi internal, aksesibilitas tidak boleh diabaikan.

Aturan minimum:

- kontras warna cukup,
- badge severity tidak hanya dibedakan warna,
- tooltip tidak menjadi satu-satunya penyampai informasi,
- tabel dapat dibaca dengan keyboard,
- modal memiliki focus trap,
- tombol ikon punya label aria,
- chart utama punya fallback summary text.

Karena dashboard padat, aksesibilitas juga berarti **reduksi kebingungan visual**, bukan hanya kepatuhan teknis.

## 35. Internationalization dan Bahasa

Saat ini bahasa UI dominan Indonesia dengan istilah teknis campuran Inggris. Rekomendasi:

- pertahankan Bahasa Indonesia sebagai bahasa primer,
- gunakan istilah Inggris hanya untuk istilah yang sudah mapan di domain teknis,
- konsisten pada label navigasi dan badge.

Contoh:

- pakai “Semua Laporan” secara konsisten,
- jangan berganti-ganti antara “Reports”, “Laporan”, dan “Data Reports” di konteks yang sama tanpa alasan.

## 36. Performance dan Resilience dari Perspektif UX

Codebase memperlihatkan dynamic import, lazy loading, SWR, skeleton, dan caching. Design system perlu menginternalisasi bahwa performa adalah bagian dari pengalaman desain.

### 36.1 Dashboard Performance Rules

- chart berat boleh lazy render,
- list panjang perlu progressive rendering,
- filter tidak boleh membuat freeze UI,
- modal detail harus memuat cepat,
- AI request harus punya timeout-aware feedback.

### 36.2 Resilience Rules

- jika analytics gagal, laporan utama tetap bisa dibuka,
- jika AI gagal, tampilkan fallback actual data,
- jika external link tidak tersedia, jelaskan,
- jika sync stale, tampilkan warning tetapi jangan lumpuhkan seluruh workspace.

## 37. Governance Design System

Tanpa governance, design system akan cepat rusak. Rekomendasi governance:

### 37.1 Layering

Pisahkan:

- foundation tokens,
- generic primitives,
- domain components,
- workspace templates,
- page compositions.

### 37.2 Naming

Nama komponen harus jelas dan domain-aware:

- `StatCard`
- `SeverityBadge`
- `SyncStatusPill`
- `ReportMetaStrip`
- `DivisionWorkspaceHeader`
- `AiInsightPanel`

### 37.3 Review Rule

Fitur baru harus lolos empat pemeriksaan:

1. konsistensi visual,
2. konsistensi copy,
3. role-awareness,
4. source transparency untuk data dan AI.

### 37.4 Documentation Rule

Setiap komponen besar baru harus punya:

- tujuan,
- props utama,
- states,
- contoh penggunaan,
- dan larangan penggunaan.

## 38. Peta Data Flow End-to-End

Berikut narasi alur data utama.

### 38.1 Jalur Operasional Utama

1. Data lahir di sumber operasional, banyak di antaranya Google Sheets.
2. Webhook atau cron atau trigger manual memicu sinkronisasi.
3. `reports-service` membaca source dan memetakan row menjadi `Report`.
4. `sync-service` melakukan deduplikasi, upsert, delete missing, reconcile update.
5. Supabase menyimpan hasil dan metadata keamanan/audit terkait.
6. Dashboard mengambil data dari route API internal.
7. Pengguna melihat agregasi, chart, list, detail, dan AI summary.
8. Beberapa fitur mengirim data ke export document atau external systems.

### 38.2 Jalur AI

1. Dashboard atau route AI memicu pemanggilan service AI.
2. Client/service wrapper mengakses endpoint AI melalui `gapura-ai`.
3. Hasil bisa dicache dan diaudit.
4. UI menampilkan insight dengan badge AI dan state yang sesuai.

### 38.3 Jalur Keamanan

1. User login dan menerima JWT session.
2. Session dicatat di `security_sessions`.
3. Middleware dan route memverifikasi token plus revoke status.
4. Event sensitif dicatat pada audit/security tables.
5. Detection engine menganalisis event dan memproduksi alert.
6. Admin/security dashboard membaca alert dan session data.

## 39. Non-Functional Requirements

### 39.1 Reliability

Sistem harus tetap usable walau:

- AI service down,
- Sheets terlambat sinkron,
- salah satu route analytics gagal,
- external link belum dikonfigurasi.

### 39.2 Security

Keamanan adalah requirement inti, bukan opsional.

### 39.3 Traceability

Semua tindakan penting harus dapat diaudit, minimal pada level admin/security dan AI actions.

### 39.4 Extensibility

Sistem harus memungkinkan penambahan workspace/divisi baru tanpa menulis ulang keseluruhan shell UI.

### 39.5 Explainability

Angka, badge, dan insight harus dapat dijelaskan sumbernya.

## 40. Risiko Desain yang Harus Dihindari

1. Menyatukan semua workspace dalam satu visual identik tanpa identitas divisi.
2. Menggabungkan data aktual dan AI tanpa penanda.
3. Menggunakan warna severity yang inkonsisten antar halaman.
4. Membiarkan halaman builder meniru halaman konsumsi dashboard.
5. Menyajikan tabel padat tanpa fallback mobile.
6. Mengubur status sinkronisasi padahal itu sentral.
7. Memperlakukan security pages sebagai halaman admin biasa.
8. Menghadirkan visual cantik yang mengurangi keterbacaan log dan data.

## 41. Rekomendasi Struktur Implementasi Design System di Codebase

Disarankan membentuk struktur seperti berikut di masa depan:

- `components/ui/foundation/`
- `components/ui/feedback/`
- `components/ui/data-display/`
- `components/ui/navigation/`
- `components/ui/domain/report/`
- `components/ui/domain/security/`
- `components/ui/domain/analytics/`
- `components/ui/domain/builder/`
- `lib/design-tokens/`
- `docs/design-system/`

Meski dokumen ini tidak mengubah kode, arahan ini penting agar ekspansi berikutnya tidak terus menambah komponen ad hoc.

## 42. Master Design System Prompt

Bagian berikut adalah prompt utama yang dapat dipakai untuk AI ketika tim ingin menghasilkan antarmuka, komponen, halaman, atau spesifikasi UI baru yang tetap konsisten dengan Gapura ONECLICK.

### 42.1 Master Prompt Versi Lengkap

Gunakan prompt berikut apa adanya, lalu tambahkan konteks fitur yang ingin dibangun.

```text
Anda sedang merancang antarmuka untuk Gapura ONECLICK / Gapura OneClick, sebuah platform operasional ground handling berbasis web yang menggabungkan pelaporan irregularity, complaint, monitoring multi-divisi, dashboard analitik, AI insight, sinkronisasi Google Sheets, persistence Supabase, keamanan tingkat enterprise, dan workflow eskalasi.

Tujuan Anda adalah menghasilkan desain antarmuka, spesifikasi visual, struktur komponen, dan perilaku UX yang konsisten dengan karakter sistem berikut:

1. Produk ini adalah operational intelligence platform, bukan landing page marketing.
3. UI harus role-aware, data-dense namun tetap jelas, modern namun profesional, dan kuat untuk aktivitas monitoring harian.
4. Sistem memiliki identitas divisi yang dibedakan melalui warna:
   - OS: emerald-teal
   - OP: cyan-teal
   - HC: violet-fuchsia
   - HT: sky-blue-indigo
   - Analyst: emerald-teal
5. Gunakan visual language yang terasa modern enterprise: rounded cards besar, spacing terkontrol, tipografi Plus Jakarta Sans, dan monospace JetBrains Mono untuk data teknis.
6. AI insight adalah lapisan pendukung, bukan pengganti data aktual. Semua elemen AI harus dibedakan secara visual dan tekstual dari data real.
7. Setiap halaman harus punya states lengkap: loading, empty, partial data, error, stale sync, dan success.
8. Dashboard wajib mengutamakan keterbacaan KPI, trend, ranking, drilldown, filter, serta status sinkronisasi dan sumber data.
9. Security, audit trail, session management, signed upload, webhook verification, dan access control adalah fitur inti sistem. UI yang terkait keamanan harus tegas, jelas, dan tidak dekoratif berlebihan.
10. Hindari desain generik SaaS yang terasa template. Desain harus terasa seperti console operasional bandara yang cerdas, cepat, dan serius.

Aturan desain:

- Pakai layout workspace yang terdiri dari header konteks, KPI utama, filter bar, panel insight utama, dan list/detail laporan.
- Gunakan badges yang konsisten untuk severity, status, source, sync state, dan AI state.
- Untuk data visualization, prioritaskan line chart, bar chart, donut, ranking table, dan comparison blocks yang mudah dipahami.
- Pisahkan visual antara data aktual, data cache, prediksi, dan insight AI.
- Gunakan copy berbahasa Indonesia yang ringkas, profesional, dan operasional.
- Jaga aksesibilitas: kontras warna cukup, keyboard-friendly, modal focus-safe, dan chart punya fallback summary.
- Buat semua interaksi terasa cepat dan pragmatis. Animasi hanya untuk orientasi, bukan pamer.

Saat merancang fitur baru:

1. Tentukan dulu role utama dan role sekunder.
2. Tentukan apakah halaman ini termasuk monitoring, admin, builder, document, security, atau public embed.
3. Definisikan data source utama: Google Sheets, Supabase, AI service, atau kombinasi.
4. Tampilkan dengan jelas status freshness data dan batasan interpretasi.
5. Gunakan shared design system, tetapi beri identitas visual yang sesuai dengan divisi/workspace.

Output yang Anda hasilkan harus selalu mencakup:

- tujuan halaman/fitur,
- persona dan use case,
- hierarchy informasi,
- layout desktop dan mobile,
- daftar komponen,
- state UI,
- source badges dan AI disclosure bila relevan,
- aturan copy,
- dan alasan desain singkat.
```

## 43. Prompt Turunan untuk Jenis Halaman

### 43.1 Prompt Dashboard Divisi

```text
Rancang halaman dashboard divisi untuk Gapura ONECLICK. Halaman ini harus memakai shell dashboard operasional yang sama dengan workspace divisi lain, tetapi tetap punya identitas visual dan fokus insight sesuai divisi. Prioritaskan KPI, filter, trend, top issues, severity/status distribution, dan daftar laporan terbaru. Pastikan ada penanda jelas untuk data aktual vs AI insight, serta tampilkan status sinkronisasi data.
```

### 43.2 Prompt Security Page

```text
Rancang halaman security monitoring untuk Gapura ONECLICK. Fokus pada audit trail, security events, alerts, session monitoring, dan tindakan administratif seperti revoke session atau block IP. Tampilan harus padat, sangat terbaca, minim dekorasi, dan menggunakan severity color system yang tegas. Pastikan setiap baris event mudah dipindai dan bisa diperluas ke detail payload.
```

### 43.3 Prompt Builder Page

```text
Rancang halaman dashboard builder internal untuk Gapura ONECLICK. Halaman ini adalah tool produktivitas untuk analyst/power user, bukan dashboard konsumsi. Tampilkan source selector, field browser, chart config, layout canvas, dan preview panel. UX harus eksplisit, aman dari kebingungan, dan membedakan jelas mode edit dengan mode preview.
```

### 43.4 Prompt Report Detail

```text
Rancang tampilan detail laporan Gapura ONECLICK untuk konteks operasional bandara. Strukturkan informasi ke dalam section yang jelas: identitas laporan, konteks kejadian, kategori/severity/status, detail narasi, evidence, metadata sumber, history komentar, dan AI/analytical context bila ada. Fokus pada keterbacaan cepat dan keputusan operasional, bukan estetika dekoratif.
```

### 43.5 Prompt Public Embed

```text
Rancang halaman embed publik untuk Gapura ONECLICK. Halaman harus ringan, fokus, minim navigasi internal, aman untuk dibagikan, dan hanya menampilkan subset insight yang memang layak dipublikasikan. Gunakan branding secukupnya dan tampilkan sumber serta timestamp data dengan jelas.
```

## 44. Aturan Implementasi untuk Agen AI atau Developer

Jika dokumen ini dipakai sebagai acuan implementasi, maka setiap perubahan UI baru sebaiknya menjawab daftar cek berikut.

1. Halaman ini untuk role siapa?
2. Workspace-nya termasuk jenis apa?
3. Data utamanya berasal dari mana?
4. Apa user decision yang dibantu halaman ini?
5. Bagaimana membedakan data aktual dan AI?
6. Apa empty state-nya?
7. Apa stale state-nya?
8. Apa error state-nya?
9. Apa versi mobile-nya?
10. Komponen reusable apa yang seharusnya dipakai atau dibuat?

## 45. Hubungan dengan Skripsi

Skripsi menyebutkan fokus pada:

- integrasi pelaporan irregularity,
- arsitektur mikrolayanan,
- pengurangan data silo,
- analitik prediktif,
- penggunaan Next.js, Supabase, Google Sheets API, dan layanan AI.

Codebase mendukung narasi besar tersebut, meskipun implementasinya berkembang lebih luas daripada framing awal skripsi. Perlu dicatat:

1. Sistem aktual sudah mencakup lebih banyak workspace dan fitur daripada deskripsi abstrak inti.
2. Pendekatan “mikrolayanan” di implementasi tampak sebagai kombinasi antara modular service layer di aplikasi web dan external AI service boundary.
3. Fokus integrasi data tetap sangat nyata melalui mekanisme sync, webhook, reconciliation, dan cache invalidation.
4. Nilai utama sistem tetap konsisten: mempercepat visibilitas operasional dan menyediakan insight yang dapat ditindaklanjuti.

Karena itu, skripsi cocok dipakai sebagai legitimasi konseptual, tetapi design system dan alur sistem harus tetap dikunci ke realitas codebase.

## 46. Kesimpulan Strategis

Gapura ONECLICK bukan aplikasi tunggal dengan satu persona sederhana. Ia adalah platform kerja multi-role yang menggabungkan operational reporting, data consolidation, analytics, AI assistance, security governance, dan dashboard composition. Design system untuk platform seperti ini harus bergerak melampaui library komponen visual.

Design system yang tepat untuk Gapura ONECLICK adalah **operational design system** dengan ciri:

- role-aware,
- source-aware,
- AI-aware,
- security-aware,
- export-aware,
- dan extensible untuk workspace baru.

Dengan mengadopsi spesifikasi ini, tim akan mendapatkan beberapa manfaat langsung:

1. Pengembangan halaman baru menjadi lebih cepat karena shell dan aturan visual sudah jelas.
2. Konsistensi antar divisi meningkat tanpa menghilangkan identitas masing-masing.
3. UI AI menjadi lebih jujur dan dapat dipertanggungjawabkan.
4. Halaman admin dan security menjadi lebih kuat sebagai console operasional.
5. Builder dan custom dashboards mendapat landasan UX yang lebih tepat.
6. Sistem dapat terus bertumbuh tanpa kehilangan koherensi desain.

## 47. Penutup

Dokumen ini dimaksudkan sebagai acuan dasar yang cukup dalam untuk dipakai oleh:

- product designer,
- frontend engineer,
- backend engineer yang merancang output UI,
- analyst yang membentuk dashboard,
- admin sistem,
- dan AI agent yang diminta menghasilkan desain atau implementasi baru.

Jika tahap berikutnya diperlukan, dokumen ini paling cocok diturunkan menjadi:

1. blueprint folder design system di codebase,
2. inventory komponen aktual vs target,
3. migration plan dari komponen ad hoc ke komponen baku,
4. spec per workspace/divisi,
5. dan checklist review UI untuk PR.

Sampai titik ini, acuan utama tetap sama: **realitas sistem yang berjalan di codebase ini**. Itulah sebabnya spesifikasi ini dibuat bukan untuk membayangkan platform baru, tetapi untuk menertibkan, menyatukan, dan memperkuat platform yang sudah hidup.

## 48. Lampiran Spesifikasi Model Data Inti

Bagian ini menurunkan model data penting ke dalam perspektif desain produk. Tujuannya bukan menggantikan schema SQL atau TypeScript types, melainkan menerjemahkan struktur data menjadi konsekuensi antarmuka.

### 48.1 User

Entitas `User` membawa informasi:

- identitas dasar,
- role,
- status akun,
- nik,
- phone,
- station,
- unit,
- position,
- division.

Konsekuensi desain:

1. Layar user management harus mendukung tampilan profil singkat sekaligus atribut organisasi.
2. Filter pengguna sebaiknya mendukung role, status, divisi, dan station.
3. Form user tidak cukup hanya name-email-password; perlu mempertimbangkan konteks organisasi.
4. UI session dan audit idealnya mampu menghubungkan aktivitas dengan user profile secara ringkas.

### 48.2 Report

`Report` adalah entitas paling kompleks dalam sistem. Ia mengandung gabungan:

- identitas laporan,
- narasi kejadian,
- konteks penerbangan,
- konteks GSE,
- kategori,
- severity dan priority,
- metadata lokasi,
- metadata sumber,
- notes tindak lanjut,
- evidence,
- timestamps,
- enrichment dari Google Sheets,
- kemungkinan field tambahan dinamis.

Konsekuensi desain:

1. Satu report detail view harus dipecah menjadi beberapa blok, bukan daftar field panjang.
2. Tabel ringkas laporan harus menampilkan field prioritas saja.
3. Modal detail dan halaman detail sebaiknya punya susunan tetap agar user mudah scanning:
   - headline,
   - severity/status strip,
   - event context,
   - narrative,
   - action and root cause,
   - source metadata,
   - evidence and attachments,
   - comments/history.
4. Karena report dapat berasal dari Sheets dan memiliki field dinamis, UI harus siap menampilkan sebagian atribut sebagai metadata tambahan tanpa merusak tata letak utama.

### 48.3 Calendar Event

`calendar_events` menunjukkan event bisa recurring, punya parent-child, minutes link, dan soft delete. Konsekuensinya:

- kalender harus mampu membedakan event utama dan instansi berulang,
- event detail harus bisa menunjukkan recurrence rule secara ramah manusia,
- deleted event sebaiknya tidak benar-benar hilang dari audit/admin context,
- meeting link dan minutes link harus dianggap first-class action.

### 48.4 Custom Dashboard dan Dashboard Chart

Karena dashboard bisa disimpan dan di-compose, maka desain builder harus sadar bahwa:

- dashboard adalah entitas dengan nama, folder, slug, visibility, dan config,
- chart adalah entitas anak dengan page, title, type, source field, layout, dan visualization config.

Konsekuensinya:

1. Halaman daftar custom dashboard harus punya mode library, bukan sekadar tabel.
2. Chart editor perlu menampilkan hubungan antara chart config dan layout placement.
3. Ada perbedaan penting antara published/public dashboard dan draft work-in-progress, meskipun codebase saat ini mungkin belum mengekspos semuanya secara eksplisit.

### 48.5 Security Entities

Entitas keamanan terdiri dari:

- `security_sessions`,
- `security_events`,
- `security_alerts`,
- `blocked_ips`,
- `audit_logs`,
- `security_configs`.

Konsekuensi desain:

1. Security workspace harus dibangun dari beberapa “lensa” terpisah: sessions, events, alerts, config.
2. Jangan paksa semua data security masuk ke satu tabel raksasa.
3. Alert adalah objek kerja yang berbeda dari event. Event adalah sinyal mentah; alert adalah hasil interpretasi yang dapat ditindaklanjuti.

### 48.6 AI Entities

`ai_audit_logs` dan `ai_cache_entries` menunjukkan AI dalam sistem punya dua kebutuhan:

- observabilitas,
- efisiensi.

Konsekuensi desain:

1. AI admin panel atau debug panel harus dapat membedakan log eksekusi dan cache artifact.
2. Insight AI di halaman user-facing tidak perlu menampilkan log mentah, tetapi harus memiliki provenance yang ringkas.

## 49. Skenario Alur Pengguna Per Role

### 49.1 Staff Cabang Membuat Laporan Baru

Alur ideal:

1. Staff masuk ke workspace personal.
2. Staff memilih “Buat Laporan”.
3. Sistem memandu pengisian data inti lebih dulu.
4. Staff menambahkan narasi, lokasi, kategori, dan lampiran.
5. Jika bukti diunggah, sistem memverifikasi token dan file.
6. Setelah submit, laporan masuk ke jalur data yang relevan.
7. Staff dapat melihat laporan sendiri, statusnya, dan pembaruan berikutnya.

Kebutuhan desain:

- form harus cepat,
- validasi harus jelas,
- upload tidak membingungkan,
- setelah submit harus ada confirmation state yang kuat,
- user perlu tahu apa yang terjadi berikutnya.

### 49.2 Analyst Memantau Dashboard Harian

Alur ideal:

1. Analyst masuk ke dashboard command center.
2. Analyst melihat KPI utama.
3. Analyst menerapkan filter global.
4. Analyst meninjau trend dan top issue.
5. Analyst membuka report detail dari list.
6. Analyst memeriksa AI summary.
7. Analyst mengekspor insight ke PDF/Excel bila diperlukan.

Kebutuhan desain:

- layout harus efisien untuk scanning cepat,
- filter jangan tersembunyi terlalu jauh,
- akses dari chart ke detail harus singkat,
- AI summary harus menambah konteks, bukan menghalangi flow.

### 49.3 Admin Menangani Keamanan

Alur ideal:

1. Admin membuka security dashboard.
2. Admin melihat feed event dan alert severity.
3. Admin membuka detail session mencurigakan.
4. Admin mencabut session atau memblokir IP.
5. Admin memeriksa audit logs untuk korelasi.

Kebutuhan desain:

- informasi log harus padat,
- severity harus sangat terlihat,
- action button perlu aman dan tidak mudah salah klik,
- detail payload harus bisa di-expand tanpa mengacaukan list utama.

### 49.4 Divisi Eskalasi Memindahkan Fokus Antar Divisi

Alur ideal:

1. User masuk ke pusat eskalasi.
2. User memilih divisi target.
3. User membandingkan kondisi umum antar divisi.
4. User membuka laporan atau dashboard detail divisi tertentu.
5. User kembali ke pusat eskalasi untuk berpindah konteks.

Kebutuhan desain:

- navigation memory harus jelas,
- context switch tidak boleh terasa seperti keluar dari aplikasi,
- badge divisi harus sangat mudah dikenali.

### 49.5 HC atau HT Mengakses Materi dan Dokumen

Alur ideal:

1. User masuk ke workspace HC/HT.
2. User melihat koleksi edaran, library, atau laporan pelatihan.
3. User membuka dokumen atau materi terkait.
4. User dapat mencari atau memfilter berdasarkan topik, tanggal, atau kategori.

Kebutuhan desain:

- library pages harus lebih editorial,
- metadata dokumen harus jelas,
- CTA open/download harus stabil,
- tetap konsisten dengan shell aplikasi.

## 50. Blueprint Halaman Standar

Bagian ini memberi pola halaman yang bisa direplikasi.

### 50.1 Standard Dashboard Blueprint

Urutan ideal:

1. Workspace header
2. Last update and source strip
3. KPI grid
4. Filter bar
5. Main insight row
6. Secondary charts
7. AI summary or recommendations
8. Reports table/list
9. Footer metadata or export actions

### 50.2 Standard Detail Page Blueprint

Urutan ideal:

1. Back navigation
2. Title and identity block
3. Status/severity/source strip
4. Core facts section
5. Narrative section
6. Evidence section
7. Action/root cause section
8. Related timeline/comments
9. AI or analytics companion

### 50.3 Standard Admin Table Blueprint

Urutan ideal:

1. Header and summary
2. Filters and search
3. Bulk or row actions
4. Dense table
5. Drawer/modal detail
6. Audit metadata

### 50.4 Standard Builder Blueprint

Urutan ideal:

1. Builder header
2. Source and page selection
3. Field sidebar
4. Config form
5. Live preview canvas
6. Save/publish actions

## 51. Guardrail Implementasi UI

Bagian ini berisi aturan yang sebaiknya dianggap wajib.

### 51.1 Guardrail Visual

- Jangan membuat halaman baru dengan warna aksen acak yang tidak sesuai division map.
- Jangan memakai komponen card dengan radius kecil tajam jika konteks halaman lain memakai radius besar lembut.
- Jangan menampilkan AI insight menggunakan warna utama yang sama dengan angka aktual tanpa pembeda.
- Jangan menggunakan badge berbeda-beda untuk status yang sama.

### 51.2 Guardrail Data

- Selalu tampilkan timestamp atau freshness marker bila data berasal dari sync/analytics.
- Jika suatu kartu menggunakan cache atau fallback, beri penanda.
- Jangan gabungkan dua sumber data berbeda ke dalam satu angka ringkas tanpa disclosure.

### 51.3 Guardrail Interaction

- Action berisiko seperti revoke session, delete, atau clear sync data harus memakai konfirmasi.
- Search dan filter harus dapat di-reset.
- Modal yang panjang harus punya struktur section dan titik keluar yang jelas.

### 51.4 Guardrail Copy

- Hindari campuran istilah Indonesia-Inggris yang tidak konsisten.
- Gunakan label action yang eksplisit: “Sinkronkan Data”, “Cabut Sesi”, “Buka Dashboard Eksternal”.
- Jangan menggunakan copy hiperbolik atau emosional pada halaman operasional.

## 52. Checklist Penerimaan untuk Fitur Baru

Sebelum fitur UI baru dianggap selesai, cek hal berikut.

### 52.1 Checklist Produk

- Apakah peran utama user jelas?
- Apakah keputusan yang dibantu halaman ini jelas?
- Apakah hierarchy informasi mudah dipindai dalam 5-10 detik?
- Apakah ada jalur lanjut ke detail atau tindakan?

### 52.2 Checklist Data

- Apakah sumber data dinyatakan?
- Apakah freshness data dinyatakan?
- Apakah AI disclosure sudah jelas?
- Apakah error dan empty state sudah dibedakan?

### 52.3 Checklist Desain

- Apakah warna sesuai workspace?
- Apakah typography mengikuti sistem?
- Apakah komponen reusable dipakai dengan benar?
- Apakah mobile state telah dipikirkan?

### 52.4 Checklist Keamanan

- Apakah halaman ini memunculkan data sensitif?
- Apakah role guard sudah sesuai?
- Apakah tindakan berisiko diberi friction yang cukup?
- Apakah log/audit atau provenance perlu ditampilkan?

## 53. Rekomendasi Tahap Lanjutan Setelah Dokumen Ini

Dokumen ini baru fondasi. Agar benar-benar operasional, tahapan berikut disarankan.

### 53.1 Audit Komponen Aktual

Buat daftar:

- komponen yang sudah ada,
- komponen duplikat secara fungsi,
- komponen yang perlu distandarkan,
- komponen yang perlu dipindahkan ke layer foundation/domain.

### 53.2 Tokenisasi CSS

Pindahkan nilai warna, radius, spacing, shadow, dan semantic badge ke token yang benar-benar sentral agar semua workspace memakai kamus visual yang sama.

### 53.3 Dokumentasi per Workspace

Turunkan spesifikasi ini menjadi dokumen kecil untuk:

- Analyst,
- Admin,
- OS,
- OP,
- HC,
- HT,
- Eskalasi,
- Employee/Public.

### 53.4 Pattern Library Interaktif

Jika tim sudah siap, buat showcase internal untuk:

- stat cards,
- badges,
- tables,
- charts,
- filter bars,
- modals,
- detail layouts,
- builder pieces.

### 53.5 Review Design-Engineering Cadence

Tetapkan aturan bahwa semua halaman baru direview terhadap:

- design system doc,
- role model,
- data source model,
- AI/source disclosure rules.

## 54. Penegasan Akhir

Spesifikasi ini sengaja menempatkan codebase sebagai sumber acuan utama karena sistem yang sesungguhnya tidak lagi berhenti pada narasi “aplikasi pelaporan irregularity”. Implementasinya sudah berkembang menjadi platform operasional yang lebih luas, dengan kebutuhan desain yang lebih serius dan lebih berlapis.

Dengan demikian, bila di kemudian hari ada pengembangan:

- halaman baru,
- refactor besar,
- redesign dashboard,
- standardisasi komponen,
- atau penggunaan AI agent untuk menghasilkan UI,

maka dokumen ini dapat dipakai sebagai “konstitusi desain” awal. Ia cukup rinci untuk mengarahkan implementasi, cukup teknis untuk mengikat arsitektur antarmuka pada realitas sistem, dan cukup luas untuk menjadi jembatan antara produk, engineering, dan operasi.

## 55. Prinsip Penggunaan Dokumen di Tim

Supaya dokumen ini benar-benar berguna, ada tiga aturan kerja yang disarankan.

Pertama, jangan gunakan dokumen ini hanya sebagai bahan baca awal proyek lalu ditinggalkan. Setiap perubahan besar pada shell dashboard, warna divisi, pola AI disclosure, builder UX, atau struktur report detail sebaiknya diperiksa ulang terhadap dokumen ini.

Kedua, ketika ada konflik antara preferensi visual sesaat dengan kebutuhan operasional pengguna, utamakan kebutuhan operasional. Platform ini hidup di lingkungan kerja nyata dengan tekanan waktu, kebutuhan monitoring, dan tuntutan akurasi. Desain yang baik di sini adalah desain yang membantu keputusan, bukan hanya terlihat modern.

Ketiga, setiap kali fitur baru ditambahkan, tanyakan empat hal: apakah role-nya jelas, apakah sumber datanya jelas, apakah state kosong/error/stale sudah jelas, dan apakah hubungan antara data aktual dengan AI sudah jelas. Jika empat pertanyaan ini belum terjawab, maka implementasi belum benar-benar selaras dengan design system Gapura ONECLICK.

## 56. Inventarisasi Fitur Berdasarkan Struktur Source Code

Bagian ini merangkum aplikasi berdasarkan apa yang benar-benar ada di kode, bukan berdasarkan asumsi produk.

### 56.1 Permukaan Frontend Utama

Dari struktur `app/dashboard/(main)`, aplikasi saat ini memiliki workspace dan sub-workspace berikut:

- `analyst`
- `admin`
- `os`
- `op`
- `ot`
- `uq`
- `ht`
- `hc`
- `eskalasi`
- `employee`
- `lookers`

Subhalaman yang sudah tampak di kode mencakup:

- reports list
- report detail
- ai-reports
- drilldown
- calendar
- meetings
- dashboards
- builder
- import
- notifications
- external-links
- security
- users
- joumpa
- handbook
- wsn
- sla
- case-status
- complaint-by-category
- root-cause-dominant
- irregularity-complaint-top-cases
- risk-severity
- library

Kesimpulan penting dari struktur ini adalah bahwa aplikasi bukan satu dashboard tunggal, tetapi **sekumpulan bounded workspace** yang berbagi fondasi UI dan service layer.

### 56.2 Permukaan API

Inventaris `app/api` menunjukkan **94 route**. Distribusi top-level:

- `ai`: 26 route
- `admin`: 12 route
- `auth`: 11 route
- `reports`: 11 route
- `dashboards`: 9 route
- `uploads`: 6 route
- `security`: 5 route
- sisanya tersebar pada calendar, embed, external-links, integrations, joumpa, master-data, wsn, sla, division-documents, dan investigative-ai.

Fakta ini penting karena memperlihatkan bahwa codebase sudah punya permukaan API yang luas dan relatif modular. Dengan kata lain, logic sistem tidak terkonsentrasi di satu dua file, melainkan tersebar dalam domain yang cukup jelas.

### 56.3 Domain Fitur Utama yang Nyata di Kode

Berdasarkan route dan service yang tersedia, domain fitur inti aplikasi saat ini adalah:

1. autentikasi dan session management,
2. role-based routing dan division switching,
3. ingestion laporan melalui Google Sheets,
4. sinkronisasi dua arah Sheets <-> database,
5. report management dan status transition,
6. analytics agregat,
7. AI analytics dan predictive/risk endpoints,
8. custom dashboards dan query layer,
9. upload evidence/media/document,
10. security monitoring dan control,
11. calendar dan event management,
12. external link registry,
13. embed/public read surfaces,
14. division-specific operational workspaces.

## 57. Pemetaan Layer Aplikasi Berdasarkan Kode

### 57.1 Layer Presentasi

Layer presentasi terutama berada di:

- `app/`
- `components/`
- `hooks/`

Karakter layer ini:

- App Router berbasis segment route,
- dashboard-heavy,
- dynamic import untuk komponen berat,
- SWR untuk client-side cache/fetching,
- penggunaan modal, chart, cards, responsive layout.

### 57.2 Layer Aplikasi / Orkestrasi

Layer ini hidup di:

- `app/api/*`
- `lib/services/*`
- `lib/utils/*`
- `lib/hooks/*`

Karakter layer ini:

- route handler sebagai boundary HTTP,
- service sebagai pusat business logic reusable,
- utilitas normalisasi dan validasi,
- cache lokal,
- integrasi external service.

### 57.3 Layer Persistence dan Metadata

Layer ini terutama berada di:

- Supabase
- `supabase/schema/exported_schema.sql`
- `supabase/migrations/*`

Karakter layer ini:

- menyimpan entity sistem,
- menyediakan audit/security records,
- menyimpan custom dashboard config,
- menjadi state backend yang lebih formal dibanding Sheets.

### 57.4 Layer Sumber Operasional Eksternal

Layer ini didominasi Google Sheets. Dari kode terlihat bahwa Google Sheets bukan sekadar import source sesekali, melainkan bagian inti lifecycle data. Karena itu sebagian besar logic report ingestion justru berputar di sekitar pemetaan dan sinkronisasi spreadsheet.

### 57.5 Layer AI

Layer AI tampak sebagai boundary eksternal melalui `lib/services/gapura-ai.ts`, `lib/hf-client.ts`, serta berbagai route `/api/ai/*`. Artinya AI diperlakukan sebagai subsistem yang dipanggil, dimonitor, dan dicache, bukan sebagai logika yang seluruhnya berada di client.

## 58. Logic Aplikasi: Auth, Login, Session, dan Bundle Switching

### 58.1 Login Flow Aktual

`app/api/auth/login/route.ts` memperlihatkan flow login yang cukup lengkap:

1. route melakukan bot protection lebih dulu,
2. rate limit diterapkan per IP,
3. rate limit kedua diterapkan per email,
4. body dibaca dan email dinormalisasi ke lowercase,
5. user dicari di tabel `users` melalui `supabaseAdmin`,
6. password diverifikasi dengan bcrypt,
7. status akun diverifikasi (`active`, `pending`, `rejected`),
8. role akhir dapat dikoreksi otomatis berdasarkan division/position/email,
9. JWT session ditandatangani dengan `sid` unik,
10. session diregistrasi ke `security_sessions`,
11. cookie `session` di-set,
12. untuk `DIVISI_ESKALASI`, cookie `auth_bundle` ikut dibuat,
13. security event login dicatat.

Ini berarti login system di aplikasi ini bukan login minimal. Ia adalah kombinasi antara:

- auth,
- security monitoring,
- session observability,
- dan role normalization.

### 58.2 Role Auto-Correction

Salah satu logic yang penting tetapi mudah terlewat adalah auto-correction role. Route login tidak hanya percaya mentah pada role dari DB. Jika role terlihat seperti `CABANG` atau `PARTNER`, maka sistem mencoba menurunkan role yang lebih spesifik seperti:

- `PARTNER_OS`
- `PARTNER_OP`
- `PARTNER_HC`
- `PARTNER_HT`

Berdasarkan:

- division,
- position id/name,
- pola email.

Ini menunjukkan bahwa aplikasi berusaha menyembuhkan kualitas data user yang mungkin belum sepenuhnya rapi di storage.

### 58.3 Session Verification

`lib/auth-utils.ts` menunjukkan bahwa session verification memiliki dua tahap:

1. verifikasi JWT signature dan expiry,
2. verifikasi sid terhadap `security_sessions` di database.

Ada cache in-memory 15 menit untuk mengurangi query panas, tetapi revoke tetap dihormati karena setiap sid harus ada di tabel. Jadi session di sini benar-benar “tracked session”, bukan JWT stateless murni.

### 58.4 Auth Bundle Switching

`app/api/auth/switch/route.ts` memperlihatkan fitur yang tidak lazim pada aplikasi biasa: **multi-session bundle switching**.

Flow-nya:

1. user harus sudah punya current session valid,
2. `auth_bundle` dibaca dan diverifikasi,
3. current active session harus sesuai active pointer bundle,
4. target `userId` harus tersedia di bundle sessions,
5. target token diverifikasi ulang,
6. active pointer bundle diubah,
7. cookie `session` diganti dengan target token,
8. cookie `auth_bundle` diperbarui,
9. response mengirim `Clear-Site-Data` untuk cache/storage reset.

Fitur ini memperlihatkan bahwa aplikasi mendukung pola identitas ganda atau delegation context, setidaknya untuk role eskalasi tertentu.

### 58.5 Middleware Logic

`proxy.ts` adalah layer penjaga utama. Logic kuncinya:

- bypass untuk `/embed` dan `/api/embed`,
- pendefinisian route publik,
- pengakuan terhadap webhook secret,
- pengakuan dev mode untuk beberapa endpoint,
- pengambilan session cookie,
- redirect ke login bila route terlindungi tanpa session,
- redirect berbeda sesuai role,
- proteksi dashboard per domain role.

Dengan kata lain, sebagian access control dilakukan di middleware sebelum route handler dijalankan, dan sisanya diperkuat lagi di masing-masing API.

## 59. Logic Aplikasi: ReportsService sebagai Jantung Data Laporan

### 59.1 Fungsi Utama ReportsService

`lib/services/reports-service.ts` adalah salah satu file paling sentral di aplikasi. Ia bertanggung jawab atas:

- koneksi ke Google Sheets,
- pemetaan row menjadi `Report`,
- parsing tanggal,
- normalisasi severity/status,
- penentuan division escalation,
- identifikasi GSE-related reports,
- pembangkitan UUID stabil untuk row Sheets,
- pengelolaan cache lokal,
- update balik ke Sheets,
- dan query report berdasarkan filter.

### 59.2 Stable UUID dari Row Sheets

Sistem membuat UUID stabil dari source ID seperti `NON CARGO!row_2` menggunakan `uuidv5`. Ini sangat penting karena:

- Google Sheets tidak memiliki UUID native seperti database,
- comment relation dan entity relation butuh ID stabil,
- perubahan fetch berikutnya harus memetakan row yang sama ke identitas yang sama.

Ini adalah salah satu keputusan arsitektural paling penting di codebase.

### 59.3 Header Mapping dan Toleransi Variasi Kolom

`PROP_TO_HEADER` menunjukkan bahwa satu properti `Report` dapat dipetakan ke banyak kemungkinan nama kolom spreadsheet. Misalnya kategori, status, severity, lokasi, evidence, dan sebagainya.

Artinya service ini didesain untuk menghadapi kenyataan bahwa spreadsheet operasional mungkin:

- berubah nama kolom,
- campur Bahasa Indonesia dan Inggris,
- punya variasi penulisan,
- atau membawa legacy naming.

### 59.4 Parsing dan Normalisasi Tanggal

`parseDate` menangani:

- ISO-like patterns,
- format `DD Mon YYYY`,
- format `Mon YYYY`,
- format `DD/MM/YYYY`,
- dan fallback ke parser native.

Ini menandakan bahwa sistem tidak berasumsi data sumber selalu konsisten. Design implication-nya adalah report timestamps di UI sebaiknya dipercaya sebagai hasil normalisasi, bukan cerminan literal input.

### 59.5 Normalisasi Status dan Severity

Saat row dipetakan:

- berbagai bentuk `Open`, `closed`, `Selesai`, `Menunggu`, `On Progress` dinormalisasi ke tiga status utama,
- berbagai bentuk severity seperti `urgent`, `top risk`, `critical` dinormalisasi ke severity yang lebih terkendali.

Dengan kata lain, kategori bisnis inti pada aplikasi sebenarnya dibersihkan di service layer, bukan dibiarkan mentah sampai UI.

### 59.6 Logic Eskalasi Divisi

Ada fungsi:

- `normalizeDivisionCode`
- `resolveReportEscalationDivision`
- `syncEscalationDivisionAliases`
- `matchesEsklasiRegex`

Ini menunjukkan bahwa eskalasi bukan sekadar field statis, tetapi bagian dari logic query dan display. Sistem berusaha menjaga alias raw `esklasi_divisi` sekaligus bentuk ternormalisasi `target_division`.

### 59.7 Deteksi GSE-Related Reports

`isGseRelatedReport` tidak hanya mengecek field boolean, tetapi juga:

- nomor GSE,
- nama GSE,
- teks kategori,
- notes,
- root cause,
- title,
- location,
- dan berbagai keyword terkait GSE.


## 60. Logic Aplikasi: SyncService sebagai Orkestrator Sinkronisasi

### 60.1 Tujuan SyncService

`lib/services/sync-service.ts` mengorkestrasi sinkronisasi antara hasil pembacaan Sheets dan persistence Supabase. Ia bukan sekadar “fetch and save”, tetapi menyelesaikan problem yang jauh lebih kompleks:

- concurrency,
- duplicate detection,
- upsert,
- relink fingerprint,
- delete orphaned data,
- push local dirty changes ke Sheets,
- cache invalidation,
- sync status persistence.

### 60.2 Single Active Sync Promise

Service menjaga `activeSyncPromise` agar trigger ganda dapat “join” ke sync yang sedang berjalan. Ini penting karena sinkronisasi bisa dipicu oleh:

- webhook,
- cron,
- admin trigger.

Tanpa mekanisme ini, sinkronisasi paralel mudah menghasilkan duplikasi atau race condition.

### 60.3 Locking

Selain active promise, service juga memakai lock melalui `acquireSyncLock`. Jadi ada dua lapis proteksi:

- level proses Node,
- level sync-state persistence.

### 60.4 Relink by Fingerprint

Ketika exact `sheet_id` tidak ditemukan, service mencoba relink berdasarkan `source_fingerprint`, selama:

- fingerprint tidak ambigu,
- hanya ada satu match existing,
- dan fingerprint fetched tidak duplikat.

Ini memperlihatkan desain yang matang untuk menghadapi perubahan row identity di spreadsheet tanpa kehilangan keterkaitan historis.

### 60.5 Legacy Reference Relinking

Saat relink terjadi, service juga memperbarui referensi legacy pada:

- tabel `reports`,
- tabel `report_comments`.

Jadi sistem sadar bahwa sinkronisasi tidak hanya menyentuh satu tabel utama.

### 60.6 Dirty Push ke Sheets

Flow sync tidak satu arah. `pushLocalUpdatesToSheets()` mencari record Supabase yang `updated_at > synced_at`, lalu mendorong perubahan itu balik ke Google Sheets melalui `reportsService.updateReport`.

Ini penting secara arsitektur: source of truth operasional masih dekat ke Sheets, tetapi aplikasi juga dapat menjadi origin perubahan tertentu.

### 60.7 Delete Missing Records

Sync service menghapus record yang tidak lagi ada di source Sheets dari:

- `reports_sync`,
- dan legacy `reports` table.

Namun penghapusan dibatasi dengan:

- set fetched ids,
- set fetched fingerprints,
- scope source sheet,
- dan skip mass delete jika basis perbandingan kosong.

Ini adalah guardrail penting untuk mencegah bencana sinkronisasi.

## 61. Logic Aplikasi: Route Laporan dan Status Transition

### 61.1 GET /api/admin/reports

Route ini:

1. memverifikasi session,
2. membaca filter query params,
3. memilih sumber data `sheets` atau `sync`,
4. memanggil `reportsService.getReports`,
5. menyaring hasil berdasarkan status, station, search, tanggal,
6. mengembalikan array laporan.

Hal penting: route ini **tidak langsung query DB legacy** sebagai default. Ia bergantung pada shared reports service dengan source control. Ini menunjukkan niat untuk menjaga satu jalur pembacaan data yang seragam.

### 61.2 PATCH /api/admin/reports

Status update report berjalan melalui validasi transition:

1. session diverifikasi,
2. body dibaca (`reportId`, `action`, `notes`, `resolution_evidence_url`),
3. report diambil melalui service,
4. role user dibaca,
5. `validateStatusTransition` dipanggil,
6. status target ditentukan,
7. timestamp field dan user field ditentukan otomatis,
8. notes dipetakan ke field yang sesuai berdasarkan aksi,
9. reopen membersihkan resolved timestamp,
10. update dikirim melalui `reportsService.updateReport`.

Ini berarti logic workflow laporan terletak di kombinasi:

- route handler,
- utilitas transition,
- reports service.

### 61.3 Implikasi Workflow

Status laporan bukan sekadar editable field bebas. Ia adalah state machine terbatas yang:

- sadar peran,
- sadar aksi,
- sadar timestamp,
- dan sadar actor field.

## 62. Logic Aplikasi: Analytics Route

### 62.1 GET /api/admin/analytics

Route analytics admin:

1. memverifikasi session dan role (`SUPER_ADMIN` atau `ANALYST`),
2. mengambil semua laporan dari source `sheets`,
3. menerapkan filter periode atau rentang tanggal,
4. membentuk station stats,
5. membentuk division stats,
6. menghitung summary,
7. menghitung trend 6 bulan dari seluruh report set,
8. membentuk status distribution,
9. mengembalikan payload analytics.

Perhatikan bahwa trend 6 bulan dihitung dari `allReports`, bukan semata `filteredReports`. Ini keputusan implementasi yang berarti trend dimaksudkan memberi konteks global terakhir, bukan sekadar pantulan filter aktif.

### 62.2 Karakter Analytics di Kode

Analytics layer saat ini banyak dibangun sebagai:

- agregasi in-memory dari kumpulan report,
- bukan semata SQL materialized analytics.

Ini memiliki konsekuensi:

- fleksibel untuk perubahan logic,
- mudah dibaca di TypeScript,
- tetapi perlu perhatian performa jika data tumbuh besar.

## 63. Logic Aplikasi: AI Layer Berdasarkan Route Inventory

Walaupun tidak semua route AI dibaca detail satu per satu dalam revisi ini, struktur endpoint yang ada sudah mengungkap cukup banyak tentang cakupan AI:

- `analyze`
- `analyze-all`
- `summarize`
- `similar`
- `insights`
- `action-summary`
- `model-info`
- `train`
- `dashboard/summary`
- `branch/summary`
- `risk/*`
- `root-cause/*`
- `gse/*`
- `forecast/seasonal`
- `seasonality/forecast`
- `cache/invalidate`
- `health`

Secara arsitektur, ini menunjukkan bahwa AI di aplikasi ini bukan satu fitur monolitik, melainkan kumpulan kapabilitas yang melayani:

- narasi otomatis,
- klasifikasi,
- risk scoring,
- forecasting,
- GSE analysis,
- root cause analysis,
- dashboard synthesis.

### 63.1 gapura-ai Service Wrapper

`lib/services/gapura-ai.ts` memperlihatkan bahwa layer client/consumer AI:

- menggunakan base URL terpisah,
- memakai helper fetch dengan timeout,
- berinteraksi lewat typed response,
- dan membungkus domain seperti branch risk, seasonality, root cause, report summary.

Jadi route AI internal kemungkinan bertindak sebagai façade atau orchestrator atas kapabilitas ini.

## 64. Logic Aplikasi: Upload Layer

Inventory route upload menunjukkan beberapa jalur berbeda:

- `uploads/evidence`
- `uploads/evidence/public`
- `uploads/evidence/token`
- `uploads/media`
- `uploads/document`
- `uploads/batch`

Meski tidak semua file dibaca rinci di revisi ini, kombinasi route dan dokumentasi keamanan menunjukkan arsitektur upload berikut:

1. tokenized public evidence upload,
2. private/internal upload untuk media atau dokumen,
3. batch upload untuk keperluan tertentu,
4. validasi signature file,
5. rate limit dan trust boundary yang ketat.

Artinya upload subsystem cukup serius dan tidak boleh diperlakukan sebagai fitur form sederhana.

## 65. Logic Aplikasi: Security Domain

### 65.1 Route Security

Inventory menunjukkan route security khusus:

- `security/dashboard-data`
- `security/sessions`
- `security/ingest`
- `security/actions/ip-control`
- `security/actions/alert-control`

Ini menandakan security domain memiliki operasi read, ingest, dan action.

### 65.2 Security Event and Alert Model

Dari schema dan dokumentasi keamanan:

- event adalah catatan granular,
- alert adalah hasil evaluasi atau aksi yang siap ditangani,
- session adalah actor-presence object,
- blocked IP adalah control object,
- config adalah tuning object.

### 65.3 Security Logic as First-Class Concern

Security di aplikasi ini muncul lintas layer:

- login route mencatat event,
- session diverifikasi ke database,
- middleware membatasi akses,
- uploads menggunakan token dan validation,
- sync/webhook memakai secret,
- cron route memakai header/secret khusus.

Jadi security bukan modul terisolasi, melainkan sifat sistem secara keseluruhan.

## 66. Logic Aplikasi: Dashboard Workspace Reuse

`DivisionAnalystDashboard` penting dibahas sebagai logic aplikasi, bukan hanya presentasi.

Komponen ini menggabungkan:

- penentuan mode view (`dashboard` vs `reports`),
- fetching report data,
- fetching analytics data,
- global filters,
- export state,
- selected report state,
- lazy chart render,
- AI summary loading,
- modal orchestration,
- dan external link orchestration.

Artinya komponen ini berfungsi sebagai **client-side workspace engine** untuk banyak dashboard divisi. Reuse di sini bukan kosmetik; ia mempengaruhi cara seluruh aplikasi memusatkan perilaku dashboard.

## 67. Daftar Fitur Aktual Berdasarkan Kode, Bukan Asumsi

Berikut daftar fitur yang secara eksplisit tampak di source code.

### 67.1 Auth dan User

- login
- logout
- register
- me/session
- inspect session
- switch account
- switch division
- verify quick access
- verify division password
- auth bundle management

### 67.2 Report Core

- create public report
- batch import report
- get report list
- get report detail
- refresh reports
- sync reports
- update status
- comments
- evidence attachment
- report analytics

### 67.3 Admin

- users management
- approve staff
- reports admin
- analytics admin
- stats admin
- cache stats
- external links admin
- sync trigger
- sync cron
- notification recipients
- notification test email

### 67.4 AI

- analyze single/all
- summarize
- similar report
- insights
- action summary
- model info
- train
- dashboard summary
- risk summary/branches/hubs/airlines/calculate
- root-cause classify/stats/categories
- GSE ranking/serviceability/issues/irregularities
- forecast seasonal / seasonality forecast
- cache invalidation
- health check

### 67.5 Dashboards

- dashboards CRUD-ish surface
- query
- batch query
- filter options
- export insights
- AI generate
- customer feedback generate
- summary severity
- insights endpoint

### 67.6 Security

- ingest event
- dashboard data
- sessions
- alert control
- IP control

### 67.7 Supporting Domains

- calendar events
- division documents
- embed reports/stats
- external links public access
- joumpa
- master data
- WSN
- SLA

## 68. Detail Alur Sistem End-to-End yang Paling Penting

### 68.1 Alur Login Sampai Dashboard

1. User submit email/password.
2. Bot protection dan rate limit diperiksa.
3. User record dibaca dari Supabase.
4. Password diverifikasi.
5. Status akun diverifikasi.
6. Role akhir bisa dinormalisasi.
7. JWT session dibuat dengan `sid`.
8. Session dicatat ke `security_sessions`.
9. Cookie diset.
10. Middleware membaca cookie pada request berikutnya.
11. Middleware memutuskan redirect dashboard sesuai role.
12. Frontend workspace memuat data sesuai domain route.

### 68.2 Alur Data Reports dari Sheets ke Dashboard

1. Google Sheets menyimpan row operasional.
2. Webhook/cron/manual trigger memicu sync.
3. `reportsService.fetchGoogleSheetsReports` membaca row.
4. `mapRowToReport` mengubah row mentah menjadi entitas `Report`.
5. Fingerprint dan stable UUID dibangun.
6. `SyncService` membandingkan hasil fetch dengan `reports_sync`.
7. Insert/update/relink/delete dijalankan.
8. Dirty local updates didorong balik ke Sheets bila ada.
9. Cache report diinvalidasi.
10. API report dan analytics membaca hasil terbaru.
11. Dashboard SWR menarik data dan merender tampilan.

### 68.3 Alur Update Status Laporan

1. User yang berwenang melakukan aksi di UI.
2. PATCH admin reports dipanggil.
3. Route memverifikasi session dan role.
4. Report existing dibaca.
5. Transition divalidasi.
6. Status baru dan timestamp/user fields disusun.
7. Optional notes dan resolution evidence ditambahkan.
8. Update diproses via reports service.
9. Perubahan kemudian bisa tersinkron ke source atau terbaca pada fetch berikutnya.

### 68.4 Alur Security Monitoring

1. Event keamanan dicatat dari subsistem seperti auth.
2. Event masuk ke persistence/event service.
3. Detection engine atau downstream logic membentuk alert.
4. Admin membuka security dashboard.
5. Admin melihat event, alert, sessions.
6. Admin menjalankan action control seperti block IP atau alert handling.

### 68.5 Alur AI Insight

1. Dashboard section, chat analyst, export, atau route UI non-chart tertentu membutuhkan insight.
2. Endpoint AI internal dipanggil.
3. Service AI wrapper menghubungi AI service eksternal.
4. Response diterima, dinormalisasi, mungkin dicache.
5. Hasil dipresentasikan di UI sebagai AI layer terpisah.

AI insight per chart sudah dinonaktifkan: tombol chart-level tidak merender UI, panel AI di halaman detail chart dihapus, dan route `/api/dashboards/insights` tidak tersedia.

## 69. Kesimpulan Revisi Berbasis Kode

Setelah meninjau source code, gambaran sistem yang paling akurat adalah ini:

Gapura ONECLICK adalah **aplikasi web operasional modular** yang:

- memakai Next.js sebagai permukaan produk dan API façade,
- memakai Supabase sebagai persistence, audit, security, dan metadata backbone,
- memakai Google Sheets sebagai sumber data operasional yang masih dominan,
- memakai service layer TypeScript untuk normalisasi dan sinkronisasi,
- memakai AI service terpisah untuk insight lanjutan,
- dan membagi pengalaman pengguna ke banyak workspace berbasis role serta divisi.

Dalam revisi ini, design system tetap penting, tetapi ia harus ditempatkan sebagai lapisan di atas realitas logic aplikasi. Jika ingin memahami sistem ini dengan benar, urutannya harus:

1. baca struktur route,
2. pahami service layer,
3. pahami flow auth/sync/report/analytics/security,
4. baru bentuk abstraksi UI/design system yang sesuai.

Itulah fokus yang sekarang dijadikan dasar dokumen ini.
