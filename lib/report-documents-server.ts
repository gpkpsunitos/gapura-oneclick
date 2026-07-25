import 'server-only';

import { createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  DOCX_MIME_TYPE,
  PDF_MIME_TYPE,
  REPORT_DOCUMENTS_BUCKET,
  sanitizeDocumentSegment,
  type ReportDocumentFormat,
  type ReportDocumentType,
} from '@/lib/report-document-contract';

interface ReportDocumentBundle {
  id: string;
  report_type: ReportDocumentType;
  report_id: string;
  revision_id: string;
  docx_path: string;
  docx_filename: string;
  docx_mime_type: string;
  docx_size_bytes: number;
  docx_sha256: string;
  pdf_path: string;
  pdf_filename: string;
  pdf_mime_type: string;
  pdf_size_bytes: number;
  pdf_sha256: string;
  edited_snapshot: Record<string, unknown>;
  signature_sha256: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface StoreBundleInput {
  reportType: ReportDocumentType;
  reportId: string;
  revisionId: string;
  editedSnapshot: Record<string, unknown>;
  signatureSha256: string | null;
  createdBy: string | null;
  docx: { buffer: Buffer; filename: string };
  pdf: { buffer: Buffer; filename: string };
}

function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

async function removeObjects(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await supabaseAdmin.storage.from(REPORT_DOCUMENTS_BUCKET).remove(paths);
  if (error) throw new Error(`Failed to remove report documents: ${error.message}`);
}

async function uploadObject(path: string, buffer: Buffer, contentType: string): Promise<void> {
  const { error } = await supabaseAdmin.storage.from(REPORT_DOCUMENTS_BUCKET).upload(path, buffer, {
    contentType,
    upsert: false,
    cacheControl: '0',
  });
  if (error) throw new Error(`Failed to upload report document: ${error.message}`);
}

export async function getReportDocumentBundle(
  reportType: ReportDocumentType,
  reportId: string,
): Promise<ReportDocumentBundle | null> {
  const { data, error } = await supabaseAdmin
    .from('report_documents')
    .select('*')
    .eq('report_type', reportType)
    .eq('report_id', reportId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load report documents: ${error.message}`);
  return (data as ReportDocumentBundle | null) || null;
}

export async function storeReportDocumentBundle(input: StoreBundleInput): Promise<ReportDocumentBundle> {
  const safeType = input.reportType.toLowerCase();
  const safeReportId = sanitizeDocumentSegment(input.reportId, 'report');
  const safeDocxName = sanitizeDocumentSegment(input.docx.filename.replace(/\.docx$/i, ''), 'report') + '.docx';
  const safePdfName = sanitizeDocumentSegment(input.pdf.filename.replace(/\.pdf$/i, ''), 'report') + '.pdf';
  const prefix = `${safeType}/${safeReportId}/${input.revisionId}`;
  const docxPath = `${prefix}/${safeDocxName}`;
  const pdfPath = `${prefix}/${safePdfName}`;

  const previous = await getReportDocumentBundle(input.reportType, input.reportId);
  const uploads = await Promise.allSettled([
    uploadObject(docxPath, input.docx.buffer, DOCX_MIME_TYPE),
    uploadObject(pdfPath, input.pdf.buffer, PDF_MIME_TYPE),
  ]);

  const uploadedPaths = uploads.flatMap((result, index) => (
    result.status === 'fulfilled' ? [index === 0 ? docxPath : pdfPath] : []
  ));
  const failed = uploads.find((result): result is PromiseRejectedResult => result.status === 'rejected');
  if (failed) {
    await removeObjects(uploadedPaths).catch((cleanupError) => {
      console.error('[REPORT_DOCUMENTS] Partial upload cleanup failed:', cleanupError);
    });
    throw failed.reason;
  }

  const now = new Date().toISOString();
  const row = {
    report_type: input.reportType,
    report_id: input.reportId,
    revision_id: input.revisionId,
    docx_path: docxPath,
    docx_filename: safeDocxName,
    docx_mime_type: DOCX_MIME_TYPE,
    docx_size_bytes: input.docx.buffer.length,
    docx_sha256: sha256(input.docx.buffer),
    pdf_path: pdfPath,
    pdf_filename: safePdfName,
    pdf_mime_type: PDF_MIME_TYPE,
    pdf_size_bytes: input.pdf.buffer.length,
    pdf_sha256: sha256(input.pdf.buffer),
    edited_snapshot: input.editedSnapshot,
    signature_sha256: input.signatureSha256,
    created_by: input.createdBy,
    updated_at: now,
  };

  const { data, error } = await supabaseAdmin
    .from('report_documents')
    .upsert(row, { onConflict: 'report_type,report_id', ignoreDuplicates: false })
    .select('*')
    .single();

  if (error || !data) {
    await removeObjects([docxPath, pdfPath]).catch((cleanupError) => {
      console.error('[REPORT_DOCUMENTS] Metadata rollback cleanup failed:', cleanupError);
    });
    throw new Error(`Failed to register report documents: ${error?.message || 'unknown error'}`);
  }

  const supersededPaths = previous
    ? [previous.docx_path, previous.pdf_path].filter((path) => path !== docxPath && path !== pdfPath)
    : [];
  await removeObjects(supersededPaths).catch((cleanupError) => {
    console.warn('[REPORT_DOCUMENTS] Superseded document cleanup failed:', cleanupError);
  });

  return data as ReportDocumentBundle;
}

export async function downloadReportDocument(
  bundle: ReportDocumentBundle,
  format: ReportDocumentFormat,
): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
  const path = format === 'docx' ? bundle.docx_path : bundle.pdf_path;
  const { data, error } = await supabaseAdmin.storage.from(REPORT_DOCUMENTS_BUCKET).download(path);
  if (error || !data) throw new Error(`Stored ${format.toUpperCase()} document not found`);
  return {
    buffer: Buffer.from(await data.arrayBuffer()),
    filename: format === 'docx' ? bundle.docx_filename : bundle.pdf_filename,
    mimeType: format === 'docx' ? bundle.docx_mime_type : bundle.pdf_mime_type,
  };
}
