-- Supabase Storage Migration (Buckets and Policies)
-- Project: iahgbzjdnfbtlrizottx

-- 1. Create Buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('evidence', 'evidence', true, null, null),
    ('videos', 'videos', true, null, null),
    ('hc-request-attachments', 'hc-request-attachments', false, null, null)
ON CONFLICT (id) DO UPDATE SET 
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage Policies (Standard implementation for public/private access)
-- Note: These are standard PG policies applied to storage.objects.

-- Public Read for public-marked buckets
CREATE POLICY "Public Access" ON storage.objects FOR SELECT TO public
USING ( bucket_id IN ('evidence', 'videos') );

-- Authenticated Upload for evidence
CREATE POLICY "Authenticated users can upload evidence" ON storage.objects FOR INSERT TO authenticated
WITH CHECK ( bucket_id = 'evidence' );

-- HC Attachments restricted to HC users and requester
CREATE POLICY "HC and Requester access to attachments" ON storage.objects FOR SELECT TO authenticated
USING ( 
    bucket_id = 'hc-request-attachments' AND (
        (SELECT role FROM public.users WHERE id = auth.uid()) = 'DIVISI_HC'
        OR (storage.foldername(name))[1] = auth.uid()::text
    )
);
