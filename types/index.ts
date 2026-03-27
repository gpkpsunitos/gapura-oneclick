export type UserRole = 'SUPER_ADMIN' | 'DIVISI_ESKALASI' | 'DIVISI_OS' | 'DIVISI_OT' | 'DIVISI_OP' | 'DIVISI_UQ' | 'DIVISI_HC' | 'DIVISI_HT' | 'ANALYST' | 'MANAGER_CABANG' | 'STAFF_CABANG';

export type ReportStatus = 'OPEN' | 'ON PROGRESS' | 'CLOSED';

export type ReportPriority = 'low' | 'medium' | 'high' | 'urgent';

export type ReportSeverity = 'low' | 'medium' | 'high' | 'urgent';

export type DivisionType = 'OS' | 'OP' | 'OT' | 'UQ' | 'HC' | 'HT' | 'GENERAL';

export interface SessionPayload {
    id: string;
    email: string;
    role: string;
    full_name?: string;
    division?: string;
    sid?: string; // Unique Session ID for database tracking & revocation
}

export interface User {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
    status: 'pending' | 'active' | 'rejected';
    nik?: string;
    phone?: string;
    station_id?: string;
    unit_id?: string;
    position_id?: string;
    created_at: string;
    updated_at: string;
    division?: string;
    station?: {
        id: string;
        code: string;
        name: string;
    } | null;
}

export interface Station {
    id: string;
    code: string;
    name: string;
}

export interface Unit {
    id: string;
    name: string;
    description?: string;
}

export interface Position {
    id: string;
    name: string;
    level: number;
}

export interface IncidentType {
    id: string;
    name: string;
    default_severity: ReportSeverity;
}

export interface Location {
    id: string;
    station_id: string;
    name: string;
    area?: string;
}

export interface Report {
    id: string;
    user_id: string;
    title: string;
    description: string;
    location: string;
    reporter_email?: string;
    evidence_url?: string;
    evidence_urls?: string[];
    video_url?: string;
    video_urls?: string[];
    status: ReportStatus;
    severity: ReportSeverity;
    priority?: ReportPriority;

    // Flight Info
    flight_number?: string;
    aircraft_reg?: string;
    is_flight_related?: boolean;

    // GSE Info
    gse_number?: string;
    gse_name?: string;
    is_gse_related?: boolean;

    // Categorization
    station_id?: string;
    unit_id?: string;
    location_id?: string;
    incident_type_id?: string;
    category?: string;
    main_category?: string; // Explicit field for dashboard compatibility

    // Details
    investigator_notes?: string;
    manager_notes?: string;
    partner_response_notes?: string;
    validation_notes?: string;
    partner_evidence_urls?: string[];
    source_sheet?: string;
    sheet_id?: string;
    source_fingerprint?: string;
    original_id?: string; // Original Sheets ID (e.g. NON CARGO!row_2)
    row_number?: number;

    // Timestamps
    created_at: string;
    updated_at: string;
    resolved_at?: string;
    sla_deadline?: string;
    incident_date?: string;

    // Additional fields from Google Sheets / Reports Service
    reporting_branch?: string;
    hub?: string;
    route?: string;
    branch?: string;
    station_code?: string;
    reporter_name?: string;
    date_of_event?: string;
    event_date?: string; // Alias
    specific_location?: string;
    airlines?: string;
    airline?: string; // Alias
    jenis_maskapai?: string;
    reference_number?: string;
    root_caused?: string;
    root_cause?: string; // Alias for compatibility
    action_taken?: string;
    immediate_action?: string;
    kps_remarks?: string;
    gapura_kps_action_taken?: string;
    preventive_action?: string;
    remarks_gapura_kps?: string;
    area?: string;
    terminal_area_category?: string;
    apron_area_category?: string;
    general_category?: string;
    week_in_month?: string;
    report?: string;
    irregularity_complain_category?: string;
    kode_cabang?: string;
    kode_hub?: string;
    maskapai_lookup?: string;
    case_classification?: string;
    lokal_mpa_lookup?: string;

    // Delay Info
    delay_code?: string;
    delay_duration?: string;

    // Triage / Pivot Fields
    primary_tag?: string; // 'Landside' | 'Airside'
    sub_category_note?: string;
    target_division?: string; // 'OS' | 'OP' | 'OT' | 'UQ' | 'HC' | 'HT'

    // Triage Fields (Analyst -> Division)
    // primary_tag?: 'Landside' | 'Airside' | string;
    // sub_category_note?: string;
    // target_division?: DivisionType;

    // Joined data
    stations?: { code: string; name: string };
    users?: { full_name: string; email: string; role?: string };
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

// Calendar Event types
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly';

export interface CalendarEvent {
    id: string;
    title: string;
    event_date: string;  // ISO date string YYYY-MM-DD
    event_end_date?: string | null;  // ISO date string YYYY-MM-DD (multi-day)
    event_time?: string | null;  // HH:MM format
    notes?: string | null;
    meeting_minutes_link?: string | null;
    calendar_type: CalendarType;

    // Recurring
    is_recurring: boolean;
    recurrence_pattern?: RecurrencePattern | null;
    recurrence_end_date?: string | null;  // ISO date string
    parent_event_id?: string | null;

    // Metadata
    created_by: string;
    created_by_name?: string;  // Joined from users table
    created_at: string;
    updated_at: string;
    deleted_at?: string | null;
}

// Calendar types
export type CalendarType = 'event' | 'meeting';

export interface CreateCalendarEventInput {
    title: string;
    event_date: string;
    event_end_date?: string | null;
    event_time?: string | null;
    notes?: string | null;
    meeting_minutes_link?: string | null;
    is_recurring?: boolean;
    recurrence_pattern?: RecurrencePattern | null;
    recurrence_end_date?: string | null;
    calendar_type?: CalendarType;
}

export type HCLeaveLetterStatus = 'BELUM_ADA' | 'PENGAJUAN' | 'TERBIT';
export type HCLeaveSubmissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface HCLeaveRecord {
    id: string;
    employee_name: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    submission_status: HCLeaveSubmissionStatus;
    station_id?: string | null;
    division_name?: string | null;
    unit_name?: string | null;
    pic_name?: string | null;
    pic_email?: string | null;
    pic_phone?: string | null;
    e_letter_status: HCLeaveLetterStatus;
    notes?: string | null;
    created_by: string;
    updated_by?: string | null;
    reviewed_by?: string | null;
    reviewed_by_name?: string | null;
    reviewed_at?: string | null;
    review_notes?: string | null;
    is_deleted?: boolean;
    deleted_at?: string | null;
    deleted_by?: string | null;
    created_at: string;
    updated_at: string;
    created_by_name?: string | null;
    station?: {
        id: string;
        code: string;
        name: string;
    } | null;
}

export type DivisionDocumentDivision = 'HC' | 'HT';
export type DivisionDocumentCategory = 'SAM_HANDBOOK' | 'EDARAN_DIREKSI' | 'MATERI_SOSIALISASI' | 'TRAINING_MATERIAL';
export type DivisionDocumentSourceType = 'upload' | 'link';
export type DivisionDocumentVisibilityScope = 'all' | 'stations' | 'roles' | 'targeted';

export interface DivisionDocument {
    id: string;
    division: DivisionDocumentDivision;
    category: DivisionDocumentCategory;
    title: string;
    description?: string | null;
    meeting_title?: string | null;
    meeting_date?: string | null;
    audience_label?: string | null;
    source_type: DivisionDocumentSourceType;
    file_url?: string | null;
    file_name?: string | null;
    file_size?: number | null;
    mime_type?: string | null;
    external_url?: string | null;
    visibility_scope: DivisionDocumentVisibilityScope;
    audience_station_ids: string[];
    audience_roles: string[];
    created_by: string;
    updated_by?: string | null;
    created_at: string;
    updated_at: string;
    created_by_name?: string | null;
}

export interface UpdateCalendarEventInput {
    title?: string;
    event_date?: string;
    event_end_date?: string | null;
    event_time?: string | null;
    notes?: string | null;
    meeting_minutes_link?: string | null;
    is_recurring?: boolean;
    recurrence_pattern?: RecurrencePattern | null;
    recurrence_end_date?: string | null;
    edit_scope?: 'single' | 'all';  // For recurring events
}

export interface CalendarEventFilters {
    search?: string;
    created_by?: string;
    start_date?: string;
    end_date?: string;
}

export interface AnalyticsData {
    summary: {
        totalReports: number;
        resolvedReports: number;
        pendingReports: number;
        highSeverity: number;
        avgResolutionRate: number;
        slaBreachCount?: number;
    };
    stationData: Array<{ station: string; total: number; resolved: number }>;
    statusData: Array<{ name: string; value: number; color: string }>;
    trendData: Array<{ month: string; total: number; resolved: number }>;
    divisionData?: Array<{ division: string; count: number }>;
    categoryData?: Array<{ category: string; count: number }>;
}

export interface ComparisonMetric {
    label: string;
    current: number;
    previous: number;
    momDelta: number;
    currentMonth?: string;
    previousMonth?: string;
    yoyCurrent?: number;
    yoyPrevious?: number;
    yoyDelta?: number;
}

export interface MonthlyBucket {
    month: string;
    total: number;
    irregularity: number;
    complaint: number;
    compliment: number;
    [key: string]: string | number;
}

export interface ComparisonData {
    monthlyTrend: MonthlyBucket[];
    overallMetrics: ComparisonMetric[];
    branchMoM: Record<string, string | number>[];
    branchMetrics: ComparisonMetric[];
    airlineMoM: Record<string, string | number>[];
    airlineMetrics: ComparisonMetric[];
    topBranches: string[];
    topAirlines: string[];
    areaMetrics: ComparisonMetric[];
}
