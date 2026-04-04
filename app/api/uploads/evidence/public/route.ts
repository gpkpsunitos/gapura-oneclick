import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { randomUUID } from 'crypto';
import { compressToExactSize } from '@/lib/image-compression';
import { validateImageFile } from '@/lib/security/file-validation';

const uploadAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_UPLOADS_PER_WINDOW = 5;
const MAX_CACHE_ENTRIES = 1000;

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    if (uploadAttempts.size > MAX_CACHE_ENTRIES) {
        for (const [key, entry] of uploadAttempts) {
            if (now > entry.resetAt) uploadAttempts.delete(key);
        }
        if (uploadAttempts.size > MAX_CACHE_ENTRIES) {
            const keys = Array.from(uploadAttempts.keys()).slice(0, uploadAttempts.size - MAX_CACHE_ENTRIES + 100);
            keys.forEach(key => uploadAttempts.delete(key));
        }
    }

    const entry = uploadAttempts.get(ip);
    if (!entry || now > entry.resetAt) {
        uploadAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
        return true;
    }
    entry.count++;
    return entry.count <= MAX_UPLOADS_PER_WINDOW;
}

export async function POST(request: Request) {
  try {
    // Rate limiting by IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
        || request.headers.get('x-real-ip') 
        || 'unknown';
    
    if (!checkRateLimit(ip)) {
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
        console.warn(`[PUBLIC UPLOAD] File validation failed: ${validation.error}`);
        return NextResponse.json({ error: 'Invalid image file' }, { status: 400 });
    }

    let compressedBuffer: Buffer;
    let contentType: string;

    try {
      const result = await compressToExactSize(buffer, 5);
      compressedBuffer = result.buffer;
      contentType = 'image/webp';
      console.log(`[PUBLIC UPLOAD] Compressed from ${result.originalSize}B to ${result.size}B`);
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
