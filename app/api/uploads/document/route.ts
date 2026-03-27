import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { randomUUID } from 'crypto';

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

    // Accept PDF, Word, Excel, and PowerPoint files for manuals and meeting materials.
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];
    const validExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
    const extension = (file.name.split('.').pop() || '').toLowerCase();
    if (!validTypes.includes(file.type) && !validExtensions.includes(extension)) {
      return NextResponse.json({ error: 'Only PDF, Word, Excel, and PowerPoint files are allowed' }, { status: 400 });
    }

    // Server guard: max 20MB for documents
    const MAX_BYTES = 20 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large (max 20MB)' }, { status: 413 });
    }

    console.log(`[UPLOAD_DOC] Original file size: ${(file.size / 1024).toFixed(2)}KB`);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = extension || 'tmp';
    const folder = `documents/${payload.id || 'anonymous'}/${randomUUID()}`;
    const fileName = `${Date.now()}.${ext}`;
    const path = `${folder}/${fileName}`;

    // Upload directly to 'evidence' bucket (as general storage for reports)
    const { error: uploadErr } = await supabaseAdmin.storage
      .from('evidence')
      .upload(path, buffer, { contentType: file.type || 'application/octet-stream', upsert: false });
    
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
      name: file.name,
      size: file.size
    });
  } catch (e) {
    console.error('[UPLOAD_DOCUMENT_ERROR]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
