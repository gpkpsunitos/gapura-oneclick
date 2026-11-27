import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { resolveSafeStoragePath, verifyStorageUrlToken } from '@/lib/mysql/storage';

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
};

const PUBLIC_BUCKETS = new Set(['uploads', 'evidence']);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ bucket: string; path: string[] }> },
) {
  try {
    const { bucket, path: pathSegments } = await context.params;
    const objectPath = (pathSegments || []).join('/');
    if (!bucket || !objectPath) {
      return NextResponse.json({ error: 'Missing storage path' }, { status: 400 });
    }

    if (!PUBLIC_BUCKETS.has(bucket)) {
      const exp = request.nextUrl.searchParams.get('exp');
      const sig = request.nextUrl.searchParams.get('sig');
      if (!verifyStorageUrlToken(bucket, objectPath, exp, sig)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const filePath = resolveSafeStoragePath(bucket, objectPath);
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_BY_EXT[ext] || 'application/octet-stream';

    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': PUBLIC_BUCKETS.has(bucket)
          ? 'public, max-age=86400'
          : 'private, no-store',
      },
    });
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
  }
}
