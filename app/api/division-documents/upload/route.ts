import { NextResponse } from 'next/server';
import { canManageDivisionDocuments, getWorkspaceUser } from '@/lib/server/workspace-auth';
import { uploadDivisionDocumentToDrive } from '@/lib/google-drive';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 30 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'csv', 'txt', 'png', 'jpg', 'jpeg', 'webp',
]);

function getExtension(name: string) {
    return name.split('.').pop()?.toLowerCase() || '';
}

export async function POST(request: Request) {
    try {
        const user = await getWorkspaceUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (!canManageDivisionDocuments(user.role, 'HC')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const formData = await request.formData();
        const file = formData.get('file');
        const category = String(formData.get('category') || 'DOKUMEN_LAIN').trim().toUpperCase();
        const title = String(formData.get('title') || '').trim();

        if (!(file instanceof File)) {
            return NextResponse.json({ error: 'Select a file to upload' }, { status: 400 });
        }
        if (!title) {
            return NextResponse.json({ error: 'Document title is required' }, { status: 400 });
        }
        if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'File size must be between 1 byte and 30 MB' }, { status: 400 });
        }
        if (!ALLOWED_EXTENSIONS.has(getExtension(file.name))) {
            return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
        }

        const uploaded = await uploadDivisionDocumentToDrive({
            buffer: Buffer.from(await file.arrayBuffer()),
            mimeType: file.type || 'application/octet-stream',
            originalName: file.name,
            division: 'HC',
            category,
            title,
            userId: user.id,
        });

        return NextResponse.json({
            file_url: uploaded.webViewLink,
            file_name: uploaded.name,
            file_size: file.size,
            mime_type: file.type || 'application/octet-stream',
            drive_file_id: uploaded.fileId,
            drive_folder_id: uploaded.folderId,
            drive_web_url: uploaded.webViewLink,
            drive_content_url: uploaded.webContentLink,
        }, { status: 201 });
    } catch (error) {
        console.error('[Division Documents Upload API] Failed to upload document:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to upload document' },
            { status: 500 }
        );
    }
}
