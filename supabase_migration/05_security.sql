-- Supabase Security Migration (RLS Policies)
-- Project: iahgbzjdnfbtlrizottx

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hc_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hc_request_attachments ENABLE ROW LEVEL SECURITY;

-- Audit Logs
CREATE POLICY "Audit logs are viewable by Super Admin only" ON public.audit_logs
FOR SELECT TO public
USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'SUPER_ADMIN'));

CREATE POLICY "System can insert audit logs" ON public.audit_logs
FOR INSERT TO public
WITH CHECK (true);

-- AI Audit Logs
CREATE POLICY "Admins and Analysts can view all AI logs" ON public.ai_audit_logs
FOR SELECT TO public
USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = ANY (ARRAY['SUPER_ADMIN'::text, 'ANALYST'::text])));

CREATE POLICY "Users can view their own AI logs" ON public.ai_audit_logs
FOR SELECT TO public
USING (user_id = auth.uid());

CREATE POLICY "Service role can insert AI logs" ON public.ai_audit_logs
FOR INSERT TO public
WITH CHECK (true);

-- Report Comments
CREATE POLICY "Users can view comments for reports they can access" ON public.report_comments
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can insert their own comments" ON public.report_comments
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Calendar Events
CREATE POLICY "calendar_events_select_policy" ON public.calendar_events
FOR SELECT TO public
USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = ANY (ARRAY['ANALYST'::text, 'DIVISI_OS'::text])));

CREATE POLICY "calendar_events_insert_policy" ON public.calendar_events
FOR INSERT TO public
WITH CHECK ((EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = ANY (ARRAY['ANALYST'::text, 'DIVISI_OS'::text]))) AND (created_by = auth.uid()));

-- Reports Sync
CREATE POLICY "Users can view own reports" ON public.reports_sync
FOR SELECT TO public
USING (auth.uid() = user_id);

CREATE POLICY "Admins and analysts can view all reports" ON public.reports_sync
FOR SELECT TO public
USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = ANY (ARRAY['SUPER_ADMIN'::text, 'ANALYST'::text])));

-- HC Requests
CREATE POLICY "HC can manage all hc_requests" ON public.hc_requests
FOR ALL TO public
USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'DIVISI_HC'::text));

CREATE POLICY "Staff can view own hc_requests" ON public.hc_requests
FOR SELECT TO public
USING (requester_user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'STAFF_CABANG'::text));

CREATE POLICY "Managers can view station hc_requests" ON public.hc_requests
FOR SELECT TO public
USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'MANAGER_CABANG'::text AND users.station_id = hc_requests.station_id));
