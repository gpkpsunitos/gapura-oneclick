import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { randomUUID } from 'crypto';
import { compressToExactSize } from '@/lib/image-compression';

export async function POST(request: Request) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Server misconfigured: SUPABASE service role key is missing' },
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

    // Stricter server guard for public uploads: max 10MB before compression
    const MAX_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 413 });
    }

    console.log(`[PUBLIC UPLOAD] Original file size: ${(file.size / 1024).toFixed(2)}KB`);

    // Compress image to <5KB
    const arrayBuffer = await file.arrayBuffer();
    let compressedBuffer: Buffer;
    let contentType: string;

    try {
      const result = await compressToExactSize(arrayBuffer, 5);
      compressedBuffer = result.buffer;
      contentType = 'image/webp';
      
      console.log(`[PUBLIC UPLOAD] Compressed from ${result.originalSize}B to ${result.size}B (${result.compressionRatio.toFixed(1)}% reduction)`);
      console.log(`[PUBLIC UPLOAD] Final dimensions: ${result.width}x${result.height}`);
    } catch (error) {
      console.error('[PUBLIC UPLOAD] Compression failed, using original:', error);
      compressedBuffer = Buffer.from(arrayBuffer);
      contentType = file.type;
    }

    // Final size check (should be <5KB after compression)
    if (compressedBuffer.length > 5 * 1024) {
      console.warn(`[PUBLIC UPLOAD] Compressed file still large: ${(compressedBuffer.length / 1024).toFixed(2)}KB`);
    }

    const ext = 'webp';
    const folder = `public/${randomUUID()}`;
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
    console.error('[UPLOAD_PUBLIC_EVIDENCE_ERROR]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
