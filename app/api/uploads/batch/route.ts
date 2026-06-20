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
    const reportId = form.get('reportId') as string | null;
    
    // Get all files (can be multiple)
    const files: File[] = [];
    let i = 0;
    while (true) {
      const file = form.get(`file${i}`);
      if (!file || !(file instanceof File)) break;
      files.push(file);
      i++;
    }

    if (files.length === 0) {
      return NextResponse.json({ error: 'At least one file is required' }, { status: 400 });
    }

    // Validate file types
    const validFiles = files.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    
    if (validFiles.length !== files.length) {
      return NextResponse.json(
        { error: 'Only image and video files are allowed' },
        { status: 400 }
      );
    }

    // Validate each file
    for (const file of files) {
      const validation = validateMedia(file, {
        maxImageSizeMB: 10,
        maxVideoSizeMB: 100
      });

      if (!validation.valid) {
        return NextResponse.json(
          { error: `${file.name}: ${validation.error}` },
          { status: 400 }
        );
      }
    }

    console.log(`[BATCH UPLOAD] Processing ${files.length} files`);

    const uploadedFiles: Array<{
      url: string;
      path: string;
      type: 'image' | 'video';
      bucket: string;
      originalName: string;
      originalSize: number;
      compressedSize: number;
    }> = [];

    // Process each file
    for (const file of files) {
      try {
        const isVideo = file.type.startsWith('video/');
        console.log(`[BATCH UPLOAD] Processing ${isVideo ? 'video' : 'image'}: ${file.name} (${(file.size / 1024).toFixed(2)}KB)`);

        // Compress media
        const arrayBuffer = await file.arrayBuffer();
        const result = await compressMedia(Buffer.from(arrayBuffer), file.type, {
          maxSizeKB: 5,
          quality: 70,
          videoMaxSizeMB: 50,
          videoCRF: 28
        });

        const compressedBuffer = result.buffer;
        const contentType = result.mimeType;

        console.log(`[BATCH UPLOAD] Compressed from ${result.originalSize}B to ${result.size}B (${result.compressionRatio.toFixed(1)}% reduction)`);

        // Determine storage bucket and path
        const bucket = isVideo ? 'videos' : 'evidence';
        const ext = contentType.includes('webp') ? 'webp' :
                      contentType.includes('mp4') ? 'mp4' :
                      contentType.includes('png') ? 'png' : 'jpg';
        
        const folder = reportId 
          ? `reports/${reportId}`
          : `uploads/${payload.id || 'anonymous'}/${randomUUID()}`;
        const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}.${ext}`;
        const path = `${folder}/${fileName}`;

        // Upload to appropriate bucket
        const { error: uploadErr } = await supabaseAdmin.storage
          .from(bucket)
          .upload(path, compressedBuffer, { contentType, upsert: false });

        if (uploadErr) {
          console.error(`[BATCH UPLOAD] Storage error for ${file.name}:`, uploadErr);
          return NextResponse.json(
            { error: `Failed to upload ${file.name}: ${uploadErr.message}` },
            { status: 500 }
          );
        }

        // Get public URL
        const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
        const publicUrl = pub?.publicUrl;
        
        if (!publicUrl) {
          return NextResponse.json(
            { error: `Failed to get public URL for ${file.name}` },
            { status: 500 }
          );
        }

        console.log(`[BATCH UPLOAD] Successfully uploaded ${file.name} to ${bucket}`);

        uploadedFiles.push({
          url: publicUrl,
          path,
          type: isVideo ? 'video' : 'image',
          bucket,
          originalName: file.name,
          originalSize: file.size,
          compressedSize: compressedBuffer.length
        });

      } catch (error) {
        console.error(`[BATCH UPLOAD] Error processing ${file.name}:`, error);
        return NextResponse.json(
          { error: `Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}` },
          { status: 500 }
        );
      }
    }

    console.log(`[BATCH UPLOAD] Successfully uploaded ${uploadedFiles.length} files`);

    return NextResponse.json({ 
      success: true, 
      files: uploadedFiles,
      summary: {
        total: uploadedFiles.length,
        images: uploadedFiles.filter(f => f.type === 'image').length,
        videos: uploadedFiles.filter(f => f.type === 'video').length,
        imageUrls: uploadedFiles.filter(f => f.type === 'image').map(f => f.url),
        videoUrls: uploadedFiles.filter(f => f.type === 'video').map(f => f.url)
      }
    });
  } catch (e) {
    console.error('[BATCH_UPLOAD_ERROR]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
