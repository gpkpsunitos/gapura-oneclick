import { NextResponse } from 'next/server';
import { canViewPerformanceLinks, getWorkspaceUser } from '@/lib/server/workspace-auth';
import { downloadDriveFile, getGoogleDrive } from '@/lib/google-drive';

export const runtime = 'nodejs';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ fileId: string }> }
) {
    try {
        const { fileId } = await params;
        if (!/^[a-zA-Z0-9_-]{10,200}$/.test(fileId)) {
            return NextResponse.json({ error: 'Invalid file ID' }, { status: 400 });
        }

        const user = await getWorkspaceUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (!canViewPerformanceLinks(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const meta = await getGoogleDrive().files.get({
            fileId,
            fields: 'mimeType',
            supportsAllDrives: true,
        });
        const file = await downloadDriveFile(fileId);

        return new Response(new Uint8Array(file), {
            status: 200,
            headers: {
                'Cache-Control': 'private, max-age=3600',
                'Content-Type': meta.data.mimeType || 'image/jpeg',
                'X-Content-Type-Options': 'nosniff',
            },
        });
    } catch (error) {
        console.error('[Performance Link Thumbnail Proxy] Failed:', error);
        return NextResponse.json({ error: 'Unable to load thumbnail' }, { status: 500 });
    }
}
