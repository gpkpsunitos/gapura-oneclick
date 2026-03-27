-- Supabase Schema Migration (Tables, Constraints, Indices)
-- Project: iahgbzjdnfbtlrizottx

-- 1. Stations (Core lookup table)
CREATE TABLE IF NOT EXISTS public.stations (
    id text PRIMARY KEY,
    code text UNIQUE NOT NULL,
    name text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Users
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text UNIQUE NOT NULL,
    password text,
    full_name text NOT NULL,
    role text CHECK (role = ANY (ARRAY['SUPER_ADMIN'::text, 'DIVISI_OS'::text, 'DIVISI_OT'::text, 'DIVISI_OP'::text, 'DIVISI_UQ'::text, 'DIVISI_HC'::text, 'DIVISI_HT'::text, 'DIVISI_ESKALASI'::text, 'ANALYST'::text, 'MANAGER_CABANG'::text, 'STAFF_CABANG'::text])),
    status text CHECK (status = ANY (ARRAY['pending'::text, 'active'::text, 'rejected'::text, 'suspended'::text])),
    nik text,
    phone text,
    station_id text REFERENCES public.stations(id),
    unit_id text,
    position_id text,
    department text,
    division text DEFAULT 'GENERAL'::text CHECK (division = ANY (ARRAY['GENERAL'::text, 'OS'::text, 'OT'::text, 'OP'::text, 'UQ'::text])),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 3. Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id uuid REFERENCES public.users(id),
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    old_value jsonb,
    new_value jsonb,
    ip_address text,
    user_agent text,
    created_at timestamptz DEFAULT now()
);

-- 4. Custom Dashboards
CREATE TABLE IF NOT EXISTS public.custom_dashboards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    created_by uuid REFERENCES public.users(id),
    is_public boolean DEFAULT true,
    slug text UNIQUE NOT NULL,
    config jsonb DEFAULT '{}'::jsonb,
    folder text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 5. Dashboard Charts
CREATE TABLE IF NOT EXISTS public.dashboard_charts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id uuid REFERENCES public.custom_dashboards(id),
    title text NOT NULL,
    chart_type text NOT NULL,
    data_field text,
    position integer DEFAULT 0,
    width text DEFAULT 'half'::text CHECK (width = ANY (ARRAY['full'::text, 'half'::text, 'third'::text])),
    config jsonb DEFAULT '{}'::jsonb,
    query_config jsonb,
    visualization_config jsonb,
    layout jsonb,
    page_name text DEFAULT 'Ringkasan Umum'::text,
    created_at timestamptz DEFAULT now()
);

-- 6. Reports (Mirrored/Cached)
CREATE TABLE IF NOT EXISTS public.reports_sync (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sheet_id text UNIQUE NOT NULL,
    user_id uuid REFERENCES public.users(id),
    title text,
    description text,
    location text,
    reporter_email text,
    evidence_url text,
    evidence_urls text[],
    status text DEFAULT 'BARU'::text,
    severity text DEFAULT 'medium'::text,
    priority text DEFAULT 'medium'::text,
    flight_number text,
    aircraft_reg text,
    is_flight_related boolean DEFAULT false,
    gse_number text,
    gse_name text,
    is_gse_related boolean DEFAULT false,
    station_id text,
    unit_id text,
    location_id text,
    incident_type_id text,
    category text,
    main_category text,
    investigator_notes text,
    manager_notes text,
    partner_response_notes text,
    validation_notes text,
    partner_evidence_urls text[],
    source_sheet text,
    original_id text,
    row_number integer,
    incident_date date,
    date_of_event date,
    reporting_branch text,
    hub text,
    route text,
    branch text,
    station_code text,
    reporter_name text,
    specific_location text,
    airlines text,
    airline text,
    jenis_maskapai text,
    reference_number text,
    root_caused text,
    root_cause text,
    action_taken text,
    immediate_action text,
    kps_remarks text,
    gapura_kps_action_taken text,
    preventive_action text,
    remarks_gapura_kps text,
    area text,
    terminal_area_category text,
    apron_area_category text,
    general_category text,
    week_in_month text,
    report text,
    irregularity_complain_category text,
    kode_cabang text,
    kode_hub text,
    maskapai_lookup text,
    case_classification text,
    lokal_mpa_lookup text,
    delay_code text,
    delay_duration text,
    primary_tag text,
    sub_category_note text,
    target_division text,
    source_fingerprint text,
    synced_at timestamptz DEFAULT now(),
    sync_version integer DEFAULT 1,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    resolved_at timestamptz,
    sla_deadline timestamptz
);

-- 7. Report Comments
CREATE TABLE IF NOT EXISTS public.report_comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id text NOT NULL,
    user_id uuid REFERENCES public.users(id),
    content text,
    attachments jsonb DEFAULT '[]'::jsonb,
    is_system_message boolean DEFAULT false,
    sheet_id text,
    created_at timestamptz DEFAULT now()
);

-- 8. Calendar Events
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL CHECK (char_length(title) <= 200),
    event_date date NOT NULL,
    event_time time,
    notes text CHECK (char_length(notes) <= 2000),
    meeting_minutes_link text CHECK (meeting_minutes_link IS NULL OR meeting_minutes_link ~ '^https?://'::text),
    is_recurring boolean DEFAULT false,
    recurrence_pattern text CHECK (recurrence_pattern = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text])),
    recurrence_end_date date,
    parent_event_id uuid REFERENCES public.calendar_events(id),
    created_by uuid REFERENCES public.users(id),
    calendar_type text,
    event_end_date date,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz
);

-- 9. HC Requests
CREATE TABLE IF NOT EXISTS public.hc_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_type text NOT NULL CHECK (request_type = ANY (ARRAY['CUTI'::text, 'IZIN'::text, 'LAINNYA'::text])),
    title text NOT NULL,
    description text,
    requester_user_id uuid REFERENCES public.users(id),
    requester_name text NOT NULL,
    requester_role text NOT NULL,
    station_id text,
    unit_id text,
    division text DEFAULT 'GENERAL'::text,
    start_date date,
    end_date date,
    handover_person_name text,
    handover_person_email text,
    handover_person_phone text,
    status text DEFAULT 'DRAFT'::text CHECK (status = ANY (ARRAY['DRAFT'::text, 'SUBMITTED_TO_GM'::text, 'UNDER_REVIEW_GM'::text, 'NEEDS_REVISION'::text, 'APPROVED'::text, 'REJECTED'::text, 'CANCELLED'::text])),
    hc_notes text,
    manager_visibility_notes text,
    submitted_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 10. HC Request Attachments
CREATE TABLE IF NOT EXISTS public.hc_request_attachments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    hc_request_id uuid REFERENCES public.hc_requests(id),
    file_name text NOT NULL,
    file_type text NOT NULL,
    file_size bigint DEFAULT 0,
    storage_bucket text NOT NULL,
    storage_path text NOT NULL,
    uploaded_by uuid REFERENCES public.users(id),
    created_at timestamptz DEFAULT now()
);

-- 11. HC Leave Records
CREATE TABLE IF NOT EXISTS public.hc_leave_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_name text NOT NULL,
    leave_type text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    station_id text REFERENCES public.stations(id),
    division_name text,
    unit_name text,
    pic_name text,
    pic_email text,
    pic_phone text,
    e_letter_status text DEFAULT 'BELUM_ADA'::text CHECK (e_letter_status = ANY (ARRAY['BELUM_ADA'::text, 'PENGAJUAN'::text, 'TERBIT'::text])),
    notes text,
    submission_status text DEFAULT 'PENDING'::text CHECK (submission_status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'REJECTED'::text])),
    created_by uuid REFERENCES public.users(id),
    updated_by uuid REFERENCES public.users(id),
    reviewed_by uuid REFERENCES public.users(id),
    reviewed_at timestamptz,
    review_notes text,
    is_deleted boolean DEFAULT false,
    deleted_at timestamptz,
    deleted_by uuid REFERENCES public.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 12. Division Documents
CREATE TABLE IF NOT EXISTS public.division_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    division text NOT NULL CHECK (division = ANY (ARRAY['HC'::text, 'HT'::text])),
    category text NOT NULL CHECK (category = ANY (ARRAY['SAM_HANDBOOK'::text, 'EDARAN_DIREKSI'::text, 'MATERI_SOSIALISASI'::text, 'TRAINING_MATERIAL'::text])),
    title text NOT NULL,
    description text,
    source_type text NOT NULL CHECK (source_type = ANY (ARRAY['upload'::text, 'link'::text])),
    file_url text,
    file_name text,
    file_size bigint,
    mime_type text,
    external_url text,
    visibility_scope text DEFAULT 'all'::text CHECK (visibility_scope = ANY (ARRAY['all'::text, 'stations'::text, 'roles'::text, 'targeted'::text])),
    audience_station_ids text[] DEFAULT '{}'::text[],
    audience_roles text[] DEFAULT '{}'::text[],
    audience_label text,
    meeting_title text,
    meeting_date date,
    is_active boolean DEFAULT true,
    created_by uuid REFERENCES public.users(id),
    updated_by uuid REFERENCES public.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 13. Notification Recipients
CREATE TABLE IF NOT EXISTS public.notification_recipients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity text NOT NULL,
    channel text NOT NULL CHECK (channel = 'EMAIL'::text),
    recipient_email text NOT NULL,
    enabled boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 14. Notification Delivery Log
CREATE TABLE IF NOT EXISTS public.notification_delivery_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fingerprint text UNIQUE NOT NULL,
    entity text NOT NULL,
    channel text NOT NULL CHECK (channel = 'EMAIL'::text),
    recipient_email text NOT NULL,
    subject text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb,
    status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'sent'::text, 'skipped'::text, 'failed'::text])),
    error_message text,
    sent_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- 15. Security Configs
CREATE TABLE IF NOT EXISTS public.security_configs (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    updated_at timestamptz DEFAULT now()
);

-- 16. Security Events
CREATE TABLE IF NOT EXISTS public.security_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source text NOT NULL,
    event_type text NOT NULL,
    severity text CHECK (severity = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text, 'CRITICAL'::text])),
    payload jsonb NOT NULL,
    ip_address text,
    actor_id uuid REFERENCES public.users(id),
    created_at timestamptz DEFAULT now()
);

-- 17. AI Cache Entries
CREATE TABLE IF NOT EXISTS public.ai_cache_entries (
    cache_key text PRIMARY KEY,
    insights jsonb NOT NULL,
    supporting_charts jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- 18. AI Audit Logs
CREATE TABLE IF NOT EXISTS public.ai_audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id),
    feature text NOT NULL,
    prompt text NOT NULL,
    raw_response text,
    parsed_response jsonb,
    model text,
    execution_time_ms integer,
    status text NOT NULL,
    error_message text,
    metadata jsonb,
    created_at timestamptz DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_reports_sync_sheet_id ON public.reports_sync (sheet_id);
CREATE INDEX IF NOT EXISTS idx_reports_sync_station_id ON public.reports_sync (station_id);
CREATE INDEX IF NOT EXISTS idx_users_station_id ON public.users (station_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_date ON public.calendar_events (event_date);
