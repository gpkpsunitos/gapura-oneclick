import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { randomUUID } from 'crypto';
import { compressToExactSize } from '@/lib/image-compression';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const isImage = file.type.startsWith('image/');
    const isDoc = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ].includes(file.type);

    if (!isImage && !isDoc) {
      return NextResponse.json({ error: 'Only images and documents (PDF/Word) are allowed' }, { status: 400 });
    }

    // Basic server-side guardrail (client compresses first)
    const MAX_BYTES = 20 * 1024 * 1024; // 20MB for documents, images should be smaller
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large (max 20MB)' }, { status: 413 });
    }

    console.log(`[EVIDENCE UPLOAD] Original file: ${file.name}, type: ${file.type}, size: ${(file.size / 1024).toFixed(2)}KB`);

    const arrayBuffer = await file.arrayBuffer();
    let uploadBuffer: Buffer;
    let contentType = file.type;

    if (isImage) {
      try {
        // Compress image to <5KB if possible
        const result = await compressToExactSize(arrayBuffer, 5);
        uploadBuffer = result.buffer;
        contentType = 'image/webp';
        console.log(`[EVIDENCE UPLOAD] Image compressed from ${result.originalSize}B to ${result.size}B`);
      } catch (error) {
        console.error('[EVIDENCE UPLOAD] Compression failed, using original:', error);
        uploadBuffer = Buffer.from(arrayBuffer);
      }
    } else {
      // Documents uploaded as-is
      uploadBuffer = Buffer.from(arrayBuffer);
    }

    // Filename: preserve tags TYPE__UPLOADER if present, but add randomness for uniqueness
    const ext = isImage ? 'webp' : (file.name.split('.').pop() || 'tmp');
    let fileName = file.name.replace(/\.[^.]+$/, ""); // strip extension
    fileName = `${fileName}_${randomUUID().slice(0, 8)}.${ext}`; // add short suffix + extension
    
    // Clean up filename: strictly alphanumeric, dots, dashes, underscores
    fileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    
    const path = `reports/${id}/${fileName}`;
    console.log(`[EVIDENCE UPLOAD] Uploading to path: ${path}, contentType: ${contentType}`);

    const { error: uploadErr } = await supabaseAdmin.storage
      .from('evidence')
      .upload(path, uploadBuffer, { contentType, upsert: false });
    
    if (uploadErr) {
      console.error('[EVIDENCE UPLOAD] Supabase storage error:', uploadErr);
      return NextResponse.json({ error: uploadErr.message, details: uploadErr }, { status: 500 });
    }

    console.log('[EVIDENCE UPLOAD] Upload successful, getting public URL...');
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
      uploadSize: uploadBuffer.length
    });
  } catch (e: any) {
    console.error('[UPLOAD_EVIDENCE_ERROR]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

