import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { randomUUID } from 'crypto';
import { compressMedia, validateMedia } from '@/lib/media-compression';

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

    // Validate file type and size
    const validation = validateMedia(file, {
      maxImageSizeMB: 10,
      maxVideoSizeMB: 100
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    console.log(`[UPLOAD] Processing ${isVideo ? 'video' : 'image'}: ${(file.size / 1024).toFixed(2)}KB`);

    // Compress media
    const arrayBuffer = await file.arrayBuffer();
    let compressedBuffer: Buffer;
    let contentType: string;
    let metadata: any = {};

    try {
      const result = await compressMedia(Buffer.from(arrayBuffer), file.type, {
        maxSizeKB: 5,
        quality: 70,
        videoMaxSizeMB: 50,
        videoCRF: 28
      });

      compressedBuffer = result.buffer;
      contentType = result.mimeType;
      metadata = {
        width: result.width,
        height: result.height,
        duration: result.duration,
        compressionRatio: result.compressionRatio
      };

      console.log(`[UPLOAD] Compressed from ${result.originalSize}B to ${result.size}B (${result.compressionRatio.toFixed(1)}% reduction)`);
      if (result.width) {
        console.log(`[UPLOAD] Dimensions: ${result.width}x${result.height}`);
      }
      if (result.duration) {
        console.log(`[UPLOAD] Duration: ${result.duration}s`);
      }
    } catch (error) {
      console.error('[UPLOAD] Compression failed:', error);
      return NextResponse.json(
        { error: `Compression failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

    // Determine storage bucket and path
    const bucket = isVideo ? 'videos' : 'evidence';
    const ext = contentType.includes('webp') ? 'webp' :
                contentType.includes('mp4') ? 'mp4' :
                contentType.includes('png') ? 'png' : 'jpg';
    
    const folder = `uploads/${payload.id || 'anonymous'}/${randomUUID()}`;
    const fileName = `${Date.now()}.${ext}`;
    const path = `${folder}/${fileName}`;

    // Upload to appropriate bucket
    const { error: uploadErr } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, compressedBuffer, { contentType, upsert: false });

    if (uploadErr) {
      console.error('[UPLOAD] Storage error:', uploadErr);
      return NextResponse.json({ error: uploadErr.message }, { status: 500 });
    }

    // Get public URL
    const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
    const publicUrl = pub?.publicUrl;
    
    if (!publicUrl) {
      return NextResponse.json({ error: 'Failed to get public URL' }, { status: 500 });
    }

    console.log(`[UPLOAD] Successfully uploaded to ${bucket}: ${publicUrl}`);

    return NextResponse.json({ 
      success: true, 
      url: publicUrl, 
      path,
      type: isVideo ? 'video' : 'image',
      bucket,
      originalSize: file.size,
      compressedSize: compressedBuffer.length,
      metadata
    });
  } catch (e) {
    console.error('[UPLOAD_MEDIA_ERROR]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
