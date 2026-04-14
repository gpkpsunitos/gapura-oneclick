import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { randomUUID } from 'crypto';
import { compressToExactSize } from '@/lib/image-compression';
import { validateImageFile } from '@/lib/security/file-validation';
import { checkRateLimit, checkDbRateLimit, getClientIpFromRequest, verifyUploadToken } from '@/lib/security/rate-limit';

const MAX_UPLOADS_PER_WINDOW = 5;
const RATE_LIMIT_WINDOW = 60 * 1000;

export async function POST(request: Request) {
  try {
    // 1. Verify signed upload token
    const uploadToken = request.headers.get('x-upload-token');
    if (!uploadToken || !verifyUploadToken(uploadToken)) {
        return NextResponse.json(
            { error: 'Invalid or expired upload token. Request a new token from /api/uploads/evidence/token' },
            { status: 403 }
        );
    }

    // 2. In-memory rate limit (fast, first layer)
    const ip = getClientIpFromRequest(request);
    const memRl = checkRateLimit(`upload:${ip}`, MAX_UPLOADS_PER_WINDOW, RATE_LIMIT_WINDOW);
    if (!memRl.success) {
        return NextResponse.json(
            { error: 'Too many uploads. Please try again later.' },
            { status: 429 }
        );
    }

    // 3. Database-backed rate limit (persistent across serverless instances)
    const dbRl = await checkDbRateLimit(`upload:${ip}`, MAX_UPLOADS_PER_WINDOW, RATE_LIMIT_WINDOW);
    if (!dbRl.success) {
        return NextResponse.json(
            { error: 'Too many uploads. Please try again later.' },
            { status: 429 }
        );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Server misconfigured' },
        { status: 503 }
      );
    }

    const form = await request.formData();
    const file = form.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }

    // Max 10MB before compression
    const MAX_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 413 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Server-side magic byte validation
    const validation = validateImageFile(buffer, file.type);
    if (!validation.valid) {
        return NextResponse.json({ error: 'Invalid image file' }, { status: 400 });
    }

    let compressedBuffer: Buffer;
    let contentType: string;

    try {
      const result = await compressToExactSize(buffer, 5);
      compressedBuffer = result.buffer;
      contentType = 'image/webp';
    } catch (error) {
      console.error('[PUBLIC UPLOAD] Compression failed:', error);
      return NextResponse.json({ error: 'Image processing failed' }, { status: 400 });
    }

    const ext = 'webp';
    const folder = `public/${randomUUID()}`;
    const fileName = `${Date.now()}.${ext}`;
    const path = `${folder}/${fileName}`;

    const { error: uploadErr } = await supabaseAdmin.storage
      .from('evidence')
      .upload(path, compressedBuffer, { contentType, upsert: false });
    if (uploadErr) {
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    const { data: pub } = supabaseAdmin.storage.from('evidence').getPublicUrl(path);
    const publicUrl = pub?.publicUrl;
    if (!publicUrl) {
      return NextResponse.json({ error: 'Failed to get public URL' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path,
      originalSize: file.size,
      compressedSize: compressedBuffer.length
    });
  } catch (e) {
    console.error('[UPLOAD_PUBLIC_EVIDENCE_ERROR]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
