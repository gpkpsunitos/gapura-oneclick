/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi API route untuk upload file evidence/bukti
 * Melakukan validasi file, kompresi otomatis, dan upload ke Supabase Storage
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { randomUUID } from 'crypto';
import { compressToExactSize, getOptimalFormat } from '@/lib/image-compression';
import { validateImageFile } from '@/lib/security/file-validation';

/**
 * Menangani request POST untuk upload file evidence/bukti
 * Melakukan validasi file (tipe, ukuran, magic bytes), kompresi otomatis
 * ke ukuran kurang dari 5KB, dan upload ke Supabase Storage
 * @param request - Request object berisi file di formData
 * @returns Response JSON dengan URL publik file yang diupload
 * @throws {Error} Jika terjadi kesalahan upload atau kompresi
 * @example
 * ```http
 * POST /api/uploads/evidence
 * Content-Type: multipart/form-data
 * 
 * file: [binary]
 * ```
 */
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

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Server-side magic byte validation
    const validation = validateImageFile(buffer, file.type);
    if (!validation.valid) {
        console.warn(`[UPLOAD] File validation failed: ${validation.error}`);
        return NextResponse.json({ error: 'Invalid image file' }, { status: 400 });
    }

    // Compress image to <5KB
    let compressedBuffer: Buffer;
    let contentType: string;

    try {
      const result = await compressToExactSize(buffer, 5);
      compressedBuffer = result.buffer;
      contentType = 'image/webp';
      
      console.log(`[UPLOAD] Compressed from ${result.originalSize}B to ${result.size}B (${result.compressionRatio.toFixed(1)}% reduction)`);
      console.log(`[UPLOAD] Final dimensions: ${result.width}x${result.height}`);
    } catch (error) {
      console.error('[UPLOAD] Compression failed, using original:', error);
      compressedBuffer = buffer;
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
