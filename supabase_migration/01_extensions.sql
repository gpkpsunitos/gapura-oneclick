-- Supabase Extensions Migration
-- Project: iahgbzjdnfbtlrizottx

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

-- Note: supabase_vault, pg_graphql, and pg_cron are managed by Supabase.
-- If migrating to a new Supabase project, these are often pre-installed or should be enabled via the UI.
-- For a standard Postgres migration, you would use:
-- CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";
-- CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
