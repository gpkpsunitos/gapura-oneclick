-- Supabase Logic Migration (Functions and Triggers)
-- Project: iahgbzjdnfbtlrizottx

-- 1. Functions
CREATE OR REPLACE FUNCTION public.update_hc_requests_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_reports_sync_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_calendar_events_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

-- 2. Triggers
DROP TRIGGER IF EXISTS trigger_hc_requests_updated_at ON public.hc_requests;
CREATE TRIGGER trigger_hc_requests_updated_at
    BEFORE UPDATE ON public.hc_requests
    FOR EACH ROW EXECUTE FUNCTION public.update_hc_requests_updated_at();

DROP TRIGGER IF EXISTS trigger_reports_sync_updated_at ON public.reports_sync;
CREATE TRIGGER trigger_reports_sync_updated_at
    BEFORE UPDATE ON public.reports_sync
    FOR EACH ROW EXECUTE FUNCTION public.update_reports_sync_updated_at();

DROP TRIGGER IF EXISTS trigger_calendar_events_updated_at ON public.calendar_events;
CREATE TRIGGER trigger_calendar_events_updated_at
    BEFORE UPDATE ON public.calendar_events
    FOR EACH ROW EXECUTE FUNCTION public.update_calendar_events_updated_at();

-- 3. Analytics Functions
CREATE OR REPLACE FUNCTION public.run_analytics_query(query_text text, query_params text[])
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  result jsonb;
  upper_query text;
  final_sql text;
  i integer;
  param_count integer;
BEGIN
  upper_query := upper(regexp_replace(query_text, '^[ \n\r\t]+|[ \n\r\t]+$', '', 'g'));
  IF NOT (upper_query LIKE 'SELECT%' OR upper_query LIKE 'WITH%') THEN
    RAISE EXCEPTION 'Only SELECT or WITH queries are allowed';
  END IF;
  IF upper_query ~ '\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|COPY|EXECUTE)\b' THEN
    RAISE EXCEPTION 'DDL/DML operations are not allowed';
  END IF;
  final_sql := query_text;
  param_count := coalesce(array_length(query_params, 1), 0);
  FOR i IN REVERSE param_count..1 LOOP
    final_sql := replace(final_sql, '$' || i::text, quote_literal(query_params[i]));
  END LOOP;
  EXECUTE 'SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (' || final_sql || ') t' INTO result;
  RETURN result;
END;
$function$;
