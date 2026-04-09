/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi definisi tipe data utama untuk aplikasi IRRS (Incident Response Reporting System)
 * mencakup tipe user, laporan, stasiun, unit, dan entitas lainnya yang digunakan di seluruh aplikasi.
 */

/**
 * Peran pengguna dalam sistem IRRS
 */
export type UserRole = 'SUPER_ADMIN' | 'DIVISI_ESKALASI' | 'DIVISI_OS' | 'DIVISI_OT' | 'DIVISI_OP' | 'DIVISI_UQ' | 'DIVISI_HC' | 'DIVISI_HT' | 'ANALYST' | 'MANAGER_CABANG' | 'STAFF_CABANG';

/**
 * Status laporan
 */
export type ReportStatus = 'OPEN' | 'ON PROGRESS' | 'CLOSED';

/**
 * Prioritas laporan
 */
export type ReportPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Tingkat keparahan laporan
 */
export type ReportSeverity = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Tipe divisi dalam sistem
 */
export type DivisionType = 'OS' | 'OP' | 'OT' | 'UQ' | 'HC' | 'HT' | 'GENERAL';

/**
 * Payload sesi pengguna untuk autentikasi
 */
export interface SessionPayload {
    /** ID pengguna */
    id: string;
    /** Email pengguna */
    email: string;
    /** Peran pengguna */
    role: string;
    /** Nama lengkap pengguna */
    full_name?: string;
    /** Divisi pengguna */
    division?: string;
    /** ID stasiun */
    station_id?: string;
    /** ID unit */
    unit_id?: string;
    /** ID posisi */
    position_id?: string;
    /** ID sesi unik untuk tracking dan pencabutan database */
    sid?: string;
}

/**
 * Data pengguna dalam sistem
 */
export interface User {
    /** ID pengguna */
    id: string;
    /** Email pengguna */
    email: string;
    /** Nama lengkap pengguna */
    full_name: string;
    /** Peran pengguna */
    role: UserRole;
    /** Status pengguna */
    status: 'pending' | 'active' | 'rejected';
    /** Nomor Induk Karyawan */
    nik?: string;
    /** Nomor telepon */
    phone?: string;
    /** ID stasiun */
    station_id?: string;
    /** ID unit */
    unit_id?: string;
    /** ID posisi */
    position_id?: string;
    /** Tanggal pembuatan */
    created_at: string;
    /** Tanggal pembaruan */
    updated_at: string;
    /** Divisi pengguna */
    division?: string;
    /** Data stasiun yang terkait */
    station?: {
        id: string;
        code: string;
        name: string;
    } | null;
}

/**
 * Data stasiun
 */
export interface Station {
    /** ID stasiun */
    id: string;
    /** Kode stasiun */
    code: string;
    /** Nama stasiun */
    name: string;
}

/**
 * Data unit
 */
export interface Unit {
    /** ID unit */
    id: string;
    /** Nama unit */
    name: string;
    /** Deskripsi unit */
    description?: string;
}

/**
 * Data posisi
 */
export interface Position {
    /** ID posisi */
    id: string;
    /** Nama posisi */
    name: string;
    /** Level posisi */
    level: number;
}

/**
 * Tipe insiden
 */
export interface IncidentType {
    /** ID tipe insiden */
    id: string;
    /** Nama tipe insiden */
    name: string;
    /** Tingkat keparahan default */
    default_severity: ReportSeverity;
}

/**
 * Data lokasi
 */
export interface Location {
    /** ID lokasi */
    id: string;
    /** ID stasiun */
    station_id: string;
    /** Nama lokasi */
    name: string;
    /** Area */
    area?: string;
}

/**
 * Data laporan insiden
 */
export interface Report {
    /** ID laporan */
    id: string;
    /** ID pengguna pelapor */
    user_id: string;
    /** Judul laporan */
    title: string;
    /** Deskripsi laporan */
    description: string;
    /** Lokasi kejadian */
    location: string;
    /** Email pelapor */
    reporter_email?: string;
    /** URL bukti */
    evidence_url?: string;
    /** Daftar URL bukti */
    evidence_urls?: string[];
    /** URL video */
    video_url?: string;
    /** Daftar URL video */
    video_urls?: string[];
    /** Status laporan */
    status: ReportStatus;
    /** Tingkat keparahan */
    severity: ReportSeverity;
    /** Prioritas laporan */
    priority?: ReportPriority;

    /** Informasi Penerbangan */
    /** Nomor penerbangan */
    flight_number?: string;
    /** Registrasi pesawat */
    aircraft_reg?: string;
    /** Apakah terkait penerbangan */
    is_flight_related?: boolean;

    /** Informasi GSE */
    /** Nomor GSE */
    gse_number?: string;
    /** Nama GSE */
    gse_name?: string;
    /** Apakah terkait GSE */
    is_gse_related?: boolean;

    /** Kategorisasi */
    /** ID stasiun */
    station_id?: string;
    /** ID unit */
    unit_id?: string;
    /** ID lokasi */
    location_id?: string;
    /** ID tipe insiden */
    incident_type_id?: string;
    /** Kategori */
    category?: string;
    /** Kategori utama untuk kompatibilitas dashboard */
    main_category?: string;

    /** Detail */
    /** Catatan investigator */
    investigator_notes?: string;
    /** Catatan manajer */
    manager_notes?: string;
    /** Catatan respon mitra */
    partner_response_notes?: string;
    /** Catatan validasi */
    validation_notes?: string;
    /** URL bukti mitra */
    partner_evidence_urls?: string[];
    /** Sumber sheet */
    source_sheet?: string;
    /** ID sheet */
    sheet_id?: string;
    /** Fingerprint sumber */
    source_fingerprint?: string;
    /** ID asli dari Sheets (misal: NON CARGO!row_2) */
    original_id?: string;
    /** Nomor baris */
    row_number?: number;

    /** Timestamps */
    /** Tanggal pembuatan */
    created_at: string;
    /** Tanggal pembaruan */
    updated_at: string;
    /** Tanggal penyelesaian */
    resolved_at?: string;
    /** Deadline SLA */
    sla_deadline?: string;
    /** Tanggal kejadian */
    incident_date?: string;

    /** Field tambahan dari Google Sheets / Reports Service */
    /** Cabang pelaporan */
    reporting_branch?: string;
    /** Hub */
    hub?: string;
    /** Rute */
    route?: string;
    /** Cabang */
    branch?: string;
    /** Kode stasiun */
    station_code?: string;
    /** Nama pelapor */
    reporter_name?: string;
    /** Tanggal kejadian */
    date_of_event?: string;
    /** Tanggal kejadian (alias) */
    event_date?: string;
    /** Lokasi spesifik */
    specific_location?: string;
    /** Maskapai */
    airlines?: string;
    /** Maskapai (alias) */
    airline?: string;
    /** Jenis maskapai */
    jenis_maskapai?: string;
    /** Nomor referensi */
    reference_number?: string;
    /** Penyebab utama */
    root_caused?: string;
    /** Penyebab akar (alias untuk kompatibilitas) */
    root_cause?: string;
    /** Tindakan yang diambil */
    action_taken?: string;
    /** Tindakan segera */
    immediate_action?: string;
    /** Catatan KPS */
    kps_remarks?: string;
    /** Tindakan Gapura KPS */
    gapura_kps_action_taken?: string;
    /** Tindakan pencegahan */
    preventive_action?: string;
    /** Catatan Gapura KPS */
    remarks_gapura_kps?: string;
    /** Area */
    area?: string;
    /** Kategori area terminal */
    terminal_area_category?: string;
    /** Kategori area apron */
    apron_area_category?: string;
    /** Kategori umum */
    general_category?: string;
    /** Minggu dalam bulan */
    week_in_month?: string;
    /** Laporan */
    report?: string;
    /** Jenis layanan bisnis */
    service_business_type?: string;
    /** Remarks Case */
    remarks_case?: string;
    /** Kategori keluhan ketidakteraturan */
    irregularity_complain_category?: string;
    /** Kode cabang */
    kode_cabang?: string;
    /** Kode hub */
    kode_hub?: string;
    /** Maskapai lookup */
    maskapai_lookup?: string;
    /** Klasifikasi kasus */
    case_classification?: string;
    /** Identifikasi akar masalah */
    identification_of_root?: string;
    /** Kecelakaan / Insiden */
    accident_incident?: string;
    /** Masalah penyebab */
    issue_caused?: string;
    /** Breakdown penyebab */
    breakdown_caused?: string;
    /** Lokal MPA lookup */
    lokal_mpa_lookup?: string;

    /** Informasi Delay */
    /** Kode delay */
    delay_code?: string;
    /** Durasi delay */
    delay_duration?: string;

    /** Field Triage / Pivot */
    /** Tag utama: 'Landside' | 'Airside' */
    primary_tag?: string;
    /** Catatan sub-kategori */
    sub_category_note?: string;
    /** Nilai raw dari kolom Google Sheets ESKLASI DIVISI */
    esklasi_divisi?: string;
    /** Divisi target: 'OS' | 'OP' | 'OT' | 'UQ' | 'HC' | 'HT' */
    target_division?: string;

    /** Field Triage (Analyst -> Division) */
    // primary_tag?: 'Landside' | 'Airside' | string;
    // sub_category_note?: string;
    // target_division?: DivisionType;

    /** Data yang di-join */
    /** Data stasiun */
    stations?: { code: string; name: string };
    /** Data pengguna */
    users?: { full_name: string; email: string; role?: string };
    /** Komentar */
    comments?: {
        id: string;
        content: string;
        created_at: string;
        sheet_id?: string;
        users: { full_name: string; avatar_url?: string };
        attachments?: string[];
        is_system_message?: boolean;
    }[];
}

/**
 * Tipe pola pengulangan untuk kalender
 */
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly';

/**
 * Data event kalender
 */
export interface CalendarEvent {
    /** ID event */
    id: string;
    /** Judul event */
    title: string;
    /** Tanggal event (format ISO YYYY-MM-DD) */
    event_date: string;
    /** Tanggal akhir event (format ISO YYYY-MM-DD untuk multi-day) */
    event_end_date?: string | null;
    /** Waktu event (format HH:MM) */
    event_time?: string | null;
    /** Catatan */
    notes?: string | null;
    /** Link notulensi rapat */
    meeting_minutes_link?: string | null;
    /** Tipe kalender */
    calendar_type: CalendarType;

    /** Pengulangan */
    /** Apakah event berulang */
    is_recurring: boolean;
    /** Pola pengulangan */
    recurrence_pattern?: RecurrencePattern | null;
    /** Tanggal akhir pengulangan (format ISO) */
    recurrence_end_date?: string | null;
    /** ID event induk */
    parent_event_id?: string | null;

    /** Metadata */
    /** ID pembuat */
    created_by: string;
    /** Nama pembuat (di-join dari tabel users) */
    created_by_name?: string;
    /** Tanggal pembuatan */
    created_at: string;
    /** Tanggal pembaruan */
    updated_at: string;
    /** Tanggal penghapusan */
    deleted_at?: string | null;
}

/**
 * Tipe kalender
 */
export type CalendarType = 'event' | 'meeting';

/**
 * Input untuk membuat event kalender
 */
export interface CreateCalendarEventInput {
    /** Judul event */
    title: string;
    /** Tanggal event */
    event_date: string;
    /** Tanggal akhir event */
    event_end_date?: string | null;
    /** Waktu event */
    event_time?: string | null;
    /** Catatan */
    notes?: string | null;
    /** Link notulensi rapat */
    meeting_minutes_link?: string | null;
    /** Apakah berulang */
    is_recurring?: boolean;
    /** Pola pengulangan */
    recurrence_pattern?: RecurrencePattern | null;
    /** Tanggal akhir pengulangan */
    recurrence_end_date?: string | null;
    /** Tipe kalender */
    calendar_type?: CalendarType;
}

/**
 * Status pengajuan cuti HC
 */
export type HCLeaveSubmissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/**
 * Data cuti HC
 */
export interface HCLeaveRecord {
    /** ID cuti */
    id: string;
    /** Nama karyawan */
    employee_name: string;
    /** Tipe cuti */
    leave_type: string;
    /** Tanggal mulai */
    start_date: string;
    /** Tanggal akhir */
    end_date: string;
    /** Status pengajuan */
    submission_status: HCLeaveSubmissionStatus;
    /** ID stasiun */
    station_id?: string | null;
    /** Nama divisi */
    division_name?: string | null;
    /** Nama unit */
    unit_name?: string | null;
    /** Nama PIC */
    pic_name?: string | null;
    /** Email PIC */
    pic_email?: string | null;
    /** Telepon PIC */
    pic_phone?: string | null;
    /** Catatan */
    notes?: string | null;
    /** Dibuat oleh */
    created_by: string;
    /** Diperbarui oleh */
    updated_by?: string | null;
    /** Ditinjau oleh */
    reviewed_by?: string | null;
    /** Nama peninjau */
    reviewed_by_name?: string | null;
    /** Tanggal peninjauan */
    reviewed_at?: string | null;
    /** Catatan peninjauan */
    review_notes?: string | null;
    /** Apakah dihapus */
    is_deleted?: boolean;
    /** Tanggal penghapusan */
    deleted_at?: string | null;
    /** Dihapus oleh */
    deleted_by?: string | null;
    /** Tanggal pembuatan */
    created_at: string;
    /** Tanggal pembaruan */
    updated_at: string;
    /** Nama pembuat */
    created_by_name?: string | null;
    /** Data stasiun */
    station?: {
        id: string;
        code: string;
        name: string;
    } | null;
}

/**
 * Divisi untuk dokumen
 */
export type DivisionDocumentDivision = 'HC' | 'HT';

/**
 * Kategori dokumen divisi
 */
export type DivisionDocumentCategory = 'SAM_HANDBOOK' | 'EDARAN_DIREKSI' | 'MATERI_SOSIALISASI' | 'TRAINING_MATERIAL';

/**
 * Tipe sumber dokumen */
export type DivisionDocumentSourceType = 'upload' | 'link';

/**
 * Ruang lingkup visibilitas dokumen
 */
export type DivisionDocumentVisibilityScope = 'all' | 'stations' | 'roles' | 'targeted';

/**
 * Data dokumen divisi
 */
export interface DivisionDocument {
    /** ID dokumen */
    id: string;
    /** Divisi */
    division: DivisionDocumentDivision;
    /** Kategori */
    category: DivisionDocumentCategory;
    /** Judul */
    title: string;
    /** Deskripsi */
    description?: string | null;
    /** Judul rapat */
    meeting_title?: string | null;
    /** Tanggal rapat */
    meeting_date?: string | null;
    /** Label audiens */
    audience_label?: string | null;
    /** Tipe sumber */
    source_type: DivisionDocumentSourceType;
    /** URL file */
    file_url?: string | null;
    /** Nama file */
    file_name?: string | null;
    /** Ukuran file */
    file_size?: number | null;
    /** Tipe MIME */
    mime_type?: string | null;
    /** URL eksternal */
    external_url?: string | null;
    /** Ruang lingkup visibilitas */
    visibility_scope: DivisionDocumentVisibilityScope;
    /** ID stasiun audiens */
    audience_station_ids: string[];
    /** Role audiens */
    audience_roles: string[];
    /** Dibuat oleh */
    created_by: string;
    /** Diperbarui oleh */
    updated_by?: string | null;
    /** Tanggal pembuatan */
    created_at: string;
    /** Tanggal pembaruan */
    updated_at: string;
    /** Nama pembuat */
    created_by_name?: string | null;
}

/**
 * Input untuk memperbarui event kalender
 */
export interface UpdateCalendarEventInput {
    /** Judul event */
    title?: string;
    /** Tanggal event */
    event_date?: string;
    /** Tanggal akhir event */
    event_end_date?: string | null;
    /** Waktu event */
    event_time?: string | null;
    /** Catatan */
    notes?: string | null;
    /** Link notulensi rapat */
    meeting_minutes_link?: string | null;
    /** Apakah berulang */
    is_recurring?: boolean;
    /** Pola pengulangan */
    recurrence_pattern?: RecurrencePattern | null;
    /** Tanggal akhir pengulangan */
    recurrence_end_date?: string | null;
    /** Ruang lingkup edit untuk event berulang */
    edit_scope?: 'single' | 'all';
}

/**
 * Filter untuk event kalender
 */
export interface CalendarEventFilters {
    /** Pencarian */
    search?: string;
    /** Dibuat oleh */
    created_by?: string;
    /** Tanggal mulai */
    start_date?: string;
    /** Tanggal akhir */
    end_date?: string;
}

/**
 * Data analitik
 */
export interface AnalyticsData {
    /** Ringkasan */
    summary: {
        totalReports: number;
        resolvedReports: number;
        pendingReports: number;
        highSeverity: number;
        avgResolutionRate: number;
        slaBreachCount?: number;
    };
    /** Data stasiun */
    stationData: Array<{ station: string; total: number; resolved: number }>;
    /** Data status */
    statusData: Array<{ name: string; value: number; color: string }>;
    /** Data tren */
    trendData: Array<{ month: string; total: number; resolved: number }>;
    /** Data divisi */
    divisionData?: Array<{ division: string; count: number }>;
    /** Data kategori */
    categoryData?: Array<{ category: string; count: number }>;
}

/**
 * Metrik perbandingan
 */
export interface ComparisonMetric {
    /** Label */
    label: string;
    /** Nilai saat ini */
    current: number;
    /** Nilai sebelumnya */
    previous: number;
    /** Delta bulan-ke-bulan */
    momDelta: number;
    /** Bulan saat ini */
    currentMonth?: string;
    /** Bulan sebelumnya */
    previousMonth?: string;
    /** Nilai year-over-year saat ini */
    yoyCurrent?: number;
    /** Nilai year-over-year sebelumnya */
    yoyPrevious?: number;
    /** Delta year-over-year */
    yoyDelta?: number;
}

/**
 * Bucket bulanan
 */
export interface MonthlyBucket {
    /** Bulan */
    month: string;
    /** Total */
    total: number;
    /** Ketidakteraturan */
    irregularity: number;
    /** Keluhan */
    complaint: number;
    /** Pujian */
    compliment: number;
    /** Data tambahan */
    [key: string]: string | number;
}

/**
 * Data perbandingan
 */
export interface ComparisonData {
    /** Tren bulanan */
    monthlyTrend: MonthlyBucket[];
    /** Metrik keseluruhan */
    overallMetrics: ComparisonMetric[];
    /** MoM cabang */
    branchMoM: Record<string, string | number>[];
    /** Metrik cabang */
    branchMetrics: ComparisonMetric[];
    /** MoM maskapai */
    airlineMoM: Record<string, string | number>[];
    /** Metrik maskapai */
    airlineMetrics: ComparisonMetric[];
    /** Top cabang */
    topBranches: string[];
    /** Top maskapai */
    topAirlines: string[];
    /** Metrik area */
    areaMetrics: ComparisonMetric[];
}
