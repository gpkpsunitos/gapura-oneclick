-- Supabase Enums Migration
-- Project: iahgbzjdnfbtlrizottx

DO $$ BEGIN
    CREATE TYPE public.division_type AS ENUM ('GENERAL', 'OS', 'OT', 'OP', 'UQ');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
