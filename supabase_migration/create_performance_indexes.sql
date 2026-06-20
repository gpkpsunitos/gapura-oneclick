-- Performance indexes for Gapura IRRS2
-- Only indexes NOT already created in prior migrations

-- reports_sync: new columns not indexed elsewhere
CREATE INDEX IF NOT EXISTS idx_reports_sync_original_id ON public.reports_sync (original_id);
CREATE INDEX IF NOT EXISTS idx_reports_sync_source_sheet ON public.reports_sync (source_sheet);
CREATE INDEX IF NOT EXISTS idx_reports_sync_updated_at_synced_at ON public.reports_sync (updated_at, synced_at);
CREATE INDEX IF NOT EXISTS idx_reports_sync_airlines ON public.reports_sync (airlines);

-- report_comments
CREATE INDEX IF NOT EXISTS idx_report_comments_report_id ON public.report_comments (report_id);
CREATE INDEX IF NOT EXISTS idx_report_comments_sheet_id ON public.report_comments (sheet_id);

-- users
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON public.users (lower(email));
CREATE INDEX IF NOT EXISTS idx_users_nik ON public.users (nik);

-- security_events compound indexes
CREATE INDEX IF NOT EXISTS idx_security_events_type_created ON public.security_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_ip ON public.security_events (ip_address) WHERE ip_address IS NOT NULL;

-- dashboard_cache_entries: composite for cache-key + version lookups
CREATE INDEX IF NOT EXISTS idx_dashboard_cache_key_version ON public.dashboard_cache_entries (cache_key, sync_version);

-- hc_leave_records
CREATE INDEX IF NOT EXISTS idx_hc_leave_start_date ON public.hc_leave_records (start_date DESC);
