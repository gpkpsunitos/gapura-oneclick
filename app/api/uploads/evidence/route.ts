/**
 * @file
 * 
 * File ini berisi API route untuk upload file evidence/bukti
 * Melakukan validasi file, kompresi otomatis, dan upload ke Supabase Storage
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { compressToExactSize } from '@/lib/image-compression';
import { validateImageFile } from '@/lib/security/file-validation';
import { enforceBotProtection } from '@/lib/security/botid';
import { normalizeEvidenceSubmissionId, recordEvidenceUpload } from '@/lib/evidence-files';
import { deleteDriveFile, sha256Hex, uploadEvidenceToDrive } from '@/lib/google-drive';

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
  let uploadedDriveFileId: string | null = null;

  try {
    const botProtectionResponse = await enforceBotProtection();
    if (botProtectionResponse) {
      return botProtectionResponse;
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
    const submissionId = normalizeEvidenceSubmissionId(form.get('evidence_submission_id'));
    const originalBaseName = file.name.replace(/\.[^.]+$/, '') || 'evidence';
    const driveFileName = `${Date.now()}-${originalBaseName}.${ext}`;
    const driveFile = await uploadEvidenceToDrive({
      buffer: compressedBuffer,
      mimeType: contentType,
      originalName: driveFileName,
      submissionId,
      stationCode: String(form.get('station_code') || form.get('station_id') || payload.station_id || 'INTERNAL'),
      reporterEmail: payload.email || null,
      userId: payload.id || null,
      kind: 'evidence',
      appProperties: {
        upload_mode: 'internal',
      },
    });
    uploadedDriveFileId = driveFile.fileId;

    const evidence = await recordEvidenceUpload({
      mode: 'internal',
      submissionId,
      userId: payload.id || null,
      reporterEmail: payload.email || null,
      reporterName: String(form.get('reporter_name') || payload.full_name || ''),
      googleDriveFileId: driveFile.fileId,
      googleDriveFolderId: driveFile.folderId,
      webViewLink: driveFile.webViewLink,
      webContentLink: driveFile.webContentLink,
      originalName: driveFile.name,
      mimeType: contentType,
      sizeBytes: compressedBuffer.length,
      sha256: sha256Hex(compressedBuffer),
      kind: 'evidence',
    });
    uploadedDriveFileId = null;

    return NextResponse.json({ 
      success: true, 
      url: evidence.url,
      evidence_file_id: evidence.id,
      evidenceFileId: evidence.id,
      evidence_submission_id: evidence.submissionId,
      path: `drive://${driveFile.fileId}`,
      originalSize: file.size,
      compressedSize: compressedBuffer.length
    });
  } catch (e) {
    if (uploadedDriveFileId) {
      await deleteDriveFile(uploadedDriveFileId).catch((rollbackError) => {
        console.error('[UPLOAD_TEMP_EVIDENCE_ROLLBACK_ERROR]', rollbackError);
      });
    }
    console.error('[UPLOAD_TEMP_EVIDENCE_ERROR]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
