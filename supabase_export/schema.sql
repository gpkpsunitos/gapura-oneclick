-- ============================================
-- GAPURA IRRS - DATABASE SCHEMA EXPORT
-- ============================================
-- Tanggal Ekspor: $(date)
-- Database: Supabase PostgreSQL
-- ============================================

-- Table: users
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    full_name TEXT,
    role TEXT CHECK (role IN ('SUPER_ADMIN', 'DIVISI_OS', 'DIVISI_OT', 'DIVISI_OP', 'DIVISI_UQ', 'DIVISI_HC', 'DIVISI_HT', 'DIVISI_ESKALASI', 'ANALYST', 'MANAGER_CABANG', 'STAFF_CABANG')),
    status TEXT CHECK (status IN ('pending', 'active', 'rejected', 'suspended')),
    nik TEXT,
    phone TEXT,
    station_id TEXT REFERENCES public.stations(id),
    unit_id TEXT,
    position_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    department TEXT,
    division TEXT DEFAULT 'GENERAL' CHECK (division IN ('GENERAL', 'OS', 'OT', 'OP', 'UQ', 'HT'))
);

-- Table: stations
CREATE TABLE IF NOT EXISTS public.stations (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    actor_id UUID REFERENCES public.users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: custom_dashboards
CREATE TABLE IF NOT EXISTS public.custom_dashboards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES public.users(id),
    is_public BOOLEAN DEFAULT true,
    slug TEXT UNIQUE NOT NULL,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    folder TEXT
);

-- Table: dashboard_charts
CREATE TABLE IF NOT EXISTS public.dashboard_charts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dashboard_id UUID REFERENCES public.custom_dashboards(id),
    title TEXT NOT NULL,
    chart_type TEXT NOT NULL,
    data_field TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    width TEXT DEFAULT 'half' CHECK (width IN ('full', 'half', 'third')),
    config JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    query_config JSONB,
    visualization_config JSONB,
    layout JSONB,
    page_name TEXT DEFAULT 'Ringkasan Umum'
);

-- Table: security_configs
CREATE TABLE IF NOT EXISTS public.security_configs (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: security_events
CREATE TABLE IF NOT EXISTS public.security_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source TEXT NOT NULL,
    event_type TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    payload JSONB NOT NULL,
    ip_address TEXT,
    actor_id UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: security_alerts
CREATE TABLE IF NOT EXISTS public.security_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT NOT NULL,
    status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'INVESTIGATING', 'CONTAINED', 'RESOLVED')),
    source_events UUID[],
    metadata JSONB,
    assigned_to UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: blocked_ips
CREATE TABLE IF NOT EXISTS public.blocked_ips (
    ip_address TEXT PRIMARY KEY,
    reason TEXT,
    blocked_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    metadata JSONB
);

-- Table: security_sessions
CREATE TABLE IF NOT EXISTS public.security_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id),
    session_id TEXT UNIQUE NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    device_name TEXT,
    is_revoked BOOLEAN DEFAULT false,
    last_active TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: ai_cache_entries
CREATE TABLE IF NOT EXISTS public.ai_cache_entries (
    cache_key TEXT PRIMARY KEY,
    insights JSONB NOT NULL,
    supporting_charts JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: ai_audit_logs
CREATE TABLE IF NOT EXISTS public.ai_audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id),
    feature TEXT NOT NULL,
    prompt TEXT NOT NULL,
    raw_response TEXT,
    parsed_response JSONB,
    model TEXT,
    execution_time_ms INTEGER,
    status TEXT NOT NULL,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: reports
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id),
    title TEXT,
    description TEXT,
    status TEXT DEFAULT 'OPEN',
    severity TEXT DEFAULT 'low',
    location TEXT,
    flight_number TEXT,
    aircraft_reg TEXT,
    date_of_event TIMESTAMPTZ,
    station_id TEXT,
    incident_type_id TEXT,
    sheet_id TEXT,
    reporter_name TEXT,
    action_taken TEXT,
    root_caused TEXT,
    delay_code TEXT,
    delay_duration TEXT,
    evidence_urls TEXT[],
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    primary_tag TEXT,
    target_division TEXT,
    remarks_gapura_kps TEXT,
    category TEXT,
    priority TEXT,
    source_fingerprint TEXT
);

-- Table: reports_sync
CREATE TABLE IF NOT EXISTS public.reports_sync (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sheet_id TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES public.users(id),
    title TEXT,
    description TEXT,
    location TEXT,
    reporter_email TEXT,
    evidence_url TEXT,
    evidence_urls TEXT[],
    status TEXT DEFAULT 'BARU',
    severity TEXT DEFAULT 'medium',
    priority TEXT DEFAULT 'medium',
    flight_number TEXT,
    aircraft_reg TEXT,
    is_flight_related BOOLEAN DEFAULT false,
    gse_number TEXT,
    gse_name TEXT,
    is_gse_related BOOLEAN DEFAULT false,
    station_id TEXT,
    unit_id TEXT,
    location_id TEXT,
    incident_type_id TEXT,
    category TEXT,
    main_category TEXT,
    investigator_notes TEXT,
    manager_notes TEXT,
    partner_response_notes TEXT,
    validation_notes TEXT,
    partner_evidence_urls TEXT[],
    source_sheet TEXT,
    original_id TEXT,
    row_number INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    sla_deadline TIMESTAMPTZ,
    incident_date DATE,
    date_of_event DATE,
    reporting_branch TEXT,
    hub TEXT,
    route TEXT,
    branch TEXT,
    station_code TEXT,
    reporter_name TEXT,
    specific_location TEXT,
    airlines TEXT,
    airline TEXT,
    jenis_maskapai TEXT,
    reference_number TEXT,
    root_caused TEXT,
    root_cause TEXT,
    action_taken TEXT,
    immediate_action TEXT,
    kps_remarks TEXT,
    gapura_kps_action_taken TEXT,
    preventive_action TEXT,
    remarks_gapura_kps TEXT,
    area TEXT,
    terminal_area_category TEXT,
    apron_area_category TEXT,
    general_category TEXT,
    week_in_month TEXT,
    report TEXT,
    irregularity_complain_category TEXT,
    kode_cabang TEXT,
    kode_hub TEXT,
    maskapai_lookup TEXT,
    case_classification TEXT,
    lokal_mpa_lookup TEXT,
    delay_code TEXT,
    delay_duration TEXT,
    primary_tag TEXT,
    sub_category_note TEXT,
    target_division TEXT,
    synced_at TIMESTAMPTZ DEFAULT now(),
    sync_version INTEGER DEFAULT 1,
    source_fingerprint TEXT
);

-- Table: report_comments
CREATE TABLE IF NOT EXISTS public.report_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_id TEXT NOT NULL,
    user_id UUID REFERENCES public.users(id),
    content TEXT,
    attachments JSONB DEFAULT '[]',
    is_system_message BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    sheet_id TEXT
);

-- Table: calendar_events
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL CHECK (char_length(title) <= 200),
    event_date DATE NOT NULL,
    event_time TIME,
    notes TEXT CHECK (char_length(notes) <= 2000),
    meeting_minutes_link TEXT CHECK (meeting_minutes_link IS NULL OR meeting_minutes_link ~ '^https?://'),
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern TEXT CHECK (recurrence_pattern IN ('daily', 'weekly', 'monthly')),
    recurrence_end_date DATE,
    parent_event_id UUID REFERENCES public.calendar_events(id),
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    calendar_type TEXT,
    event_end_date DATE
);

-- Table: hc_leave_records
CREATE TABLE IF NOT EXISTS public.hc_leave_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_name TEXT NOT NULL,
    leave_type TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    station_id TEXT REFERENCES public.stations(id),
    division_name TEXT,
    unit_name TEXT,
    pic_name TEXT,
    pic_email TEXT,
    pic_phone TEXT,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES public.users(id),
    updated_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    submission_status TEXT DEFAULT 'PENDING' CHECK (submission_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    reviewed_by UUID REFERENCES public.users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.users(id),
    employee_email TEXT,
    employee_phone TEXT
);

-- Table: division_documents
CREATE TABLE IF NOT EXISTS public.division_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    division TEXT NOT NULL CHECK (division IN ('HC', 'HT')),
    category TEXT NOT NULL CHECK (category IN ('SAM_HANDBOOK', 'EDARAN_DIREKSI', 'MATERI_SOSIALISASI', 'TRAINING_MATERIAL')),
    title TEXT NOT NULL,
    description TEXT,
    source_type TEXT NOT NULL CHECK (source_type IN ('upload', 'link')),
    file_url TEXT,
    file_name TEXT,
    file_size BIGINT,
    mime_type TEXT,
    external_url TEXT,
    visibility_scope TEXT DEFAULT 'all' CHECK (visibility_scope IN ('all', 'stations', 'roles', 'targeted')),
    audience_station_ids TEXT[] DEFAULT '{}',
    audience_roles TEXT[] DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES public.users(id),
    updated_by UUID NOT NULL REFERENCES public.users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    meeting_title TEXT,
    meeting_date DATE,
    audience_label TEXT,
    meeting_event_id UUID REFERENCES public.calendar_events(id),
    activity_pic TEXT,
    activity_location TEXT
);

-- Table: notification_recipients
CREATE TABLE IF NOT EXISTS public.notification_recipients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entity TEXT NOT NULL,
    channel TEXT NOT NULL CHECK (channel = 'EMAIL'),
    recipient_email TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: notification_delivery_log
CREATE TABLE IF NOT EXISTS public.notification_delivery_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fingerprint TEXT UNIQUE NOT NULL,
    entity TEXT NOT NULL,
    channel TEXT NOT NULL CHECK (channel = 'EMAIL'),
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    payload JSONB DEFAULT '{}',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'skipped', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    sent_at TIMESTAMPTZ
);

-- Table: sync_state
CREATE TABLE IF NOT EXISTS public.sync_state (
    source TEXT PRIMARY KEY,
    last_sync_at TIMESTAMPTZ,
    sync_version BIGINT DEFAULT 0,
    status TEXT DEFAULT 'idle',
    locked_until TIMESTAMPTZ,
    last_error TEXT,
    row_count INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: dashboard_cache_entries
CREATE TABLE IF NOT EXISTS public.dashboard_cache_entries (
    cache_key TEXT PRIMARY KEY,
    scope_key TEXT NOT NULL,
    dashboard_slug TEXT NOT NULL,
    tile_id UUID,
    payload JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    sync_version BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: rate_limits
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id BIGSERIAL PRIMARY KEY,
    key TEXT NOT NULL,
    count INTEGER DEFAULT 1,
    reset_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: external_links
CREATE TABLE IF NOT EXISTS public.external_links (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    url TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('google_forms', 'looker_studio', 'other')),
    description TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: query_performance_stats
CREATE TABLE IF NOT EXISTS public.query_performance_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    query_type TEXT NOT NULL,
    execution_time_ms INTEGER NOT NULL,
    record_count INTEGER,
    timestamp TIMESTAMPTZ DEFAULT now(),
    metadata JSONB
);

-- Additional tables with no data
CREATE TABLE IF NOT EXISTS public.units (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.positions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    level INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.incident_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    default_severity TEXT DEFAULT 'low',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    area TEXT,
    station_id TEXT REFERENCES public.stations(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

