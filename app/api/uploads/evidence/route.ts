import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { randomUUID } from 'crypto';
import { compressToExactSize, getOptimalFormat } from '@/lib/image-compression';

export async function POST(request: Request) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Server misconfigured: SUPABASE service role key is missing' },
        { status: 503 }
      );
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifySession(token);
    if (!payload) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    const form = await request.formData();
    const file = form.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }

    // Server guard: max 10MB before compression
    const MAX_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 413 });
    }

    console.log(`[UPLOAD] Original file size: ${(file.size / 1024).toFixed(2)}KB`);

    // Compress image to <5KB
    const arrayBuffer = await file.arrayBuffer();
    let compressedBuffer: Buffer;
    let contentType: string;

    try {
      const result = await compressToExactSize(arrayBuffer, 5);
      compressedBuffer = result.buffer;
      contentType = 'image/webp';
      
      console.log(`[UPLOAD] Compressed from ${result.originalSize}B to ${result.size}B (${result.compressionRatio.toFixed(1)}% reduction)`);
      console.log(`[UPLOAD] Final dimensions: ${result.width}x${result.height}`);
    } catch (error) {
      console.error('[UPLOAD] Compression failed, using original:', error);
      compressedBuffer = Buffer.from(arrayBuffer);
      contentType = file.type;
    }

    // Final size check (should be <5KB after compression)
    if (compressedBuffer.length > 5 * 1024) {
      console.warn(`[UPLOAD] Compressed file still large: ${(compressedBuffer.length / 1024).toFixed(2)}KB`);
    }

    const ext = contentType.includes('webp') ? 'webp' :
                contentType.includes('png') ? 'png' : 'jpg';
    const folder = `drafts/${payload.id || 'anonymous'}/${randomUUID()}`;
    const fileName = `${Date.now()}.${ext}`;
    const path = `${folder}/${fileName}`;

    const { error: uploadErr } = await supabaseAdmin.storage
      .from('evidence')
      .upload(path, compressedBuffer, { contentType, upsert: false });
    if (uploadErr) {
      return NextResponse.json({ error: uploadErr.message }, { status: 500 });
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
    console.error('[UPLOAD_TEMP_EVIDENCE_ERROR]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
