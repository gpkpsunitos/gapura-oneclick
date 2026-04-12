import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { canManageDivisionDocuments, getWorkspaceUser, normalizeRole } from '@/lib/server/workspace-auth';
import type { DivisionDocumentCategory, DivisionDocumentVisibilityScope } from '@/types';

const VALID_CATEGORIES = ['SAM_HANDBOOK', 'EDARAN_DIREKSI', 'MATERI_SOSIALISASI', 'TRAINING_MATERIAL'] as const;
const VALID_VISIBILITY = ['all', 'stations', 'roles', 'targeted'] as const;

interface StoredDivisionDocument {
    id: string;
    division: 'HC' | 'HT';
    category: DivisionDocumentCategory;
    title: string;
    description?: string | null;
    meeting_title?: string | null;
    meeting_date?: string | null;
    audience_label?: string | null;
    meeting_event_id?: string | null;
    source_type: 'upload' | 'link';
    file_url?: string | null;
    file_name?: string | null;
    file_size?: number | null;
    mime_type?: string | null;
    external_url?: string | null;
    visibility_scope: DivisionDocumentVisibilityScope;
    audience_station_ids?: string[] | null;
    audience_roles?: string[] | null;
    is_active: boolean;
}

async function getDocument(id: string) {
    const { data, error } = await supabaseAdmin
        .from('division_documents')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data as StoredDivisionDocument;
}

function canReadDivisionDocument(userRole: string | null | undefined, division: 'HC' | 'HT') {
    return canManageDivisionDocuments(userRole, division) || normalizeRole(userRole) === 'STAFF_CABANG';
}

function slugifyFilenamePart(value: string) {
    return value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-+/g, '-');
}

function formatDateForFilename(value?: string | null) {
    if (!value) return '';

    const trimmed = String(value).trim();
    if (!trimmed) return '';

    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
        return trimmed.slice(0, 10);
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return '';

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getFileExtension(document: StoredDivisionDocument) {
    const rawName = document.file_name || document.file_url || '';
    const cleanName = rawName.split('?')[0];
    const match = cleanName.match(/\.([a-zA-Z0-9]+)$/);
    return match ? `.${match[1].toLowerCase()}` : '';
}

function buildDownloadFilename(document: StoredDivisionDocument) {
    const eventName = slugifyFilenamePart(document.meeting_title || document.title || 'document');
    const eventDate = formatDateForFilename(document.meeting_date);
    const extension = getFileExtension(document) || '.bin';
    const baseName = [eventName || 'document', eventDate].filter(Boolean).join('_');
    return `${baseName}${extension}`;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const user = await getWorkspaceUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await context.params;
        const document = await getDocument(id);
        if (!document?.is_active) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }
        if (!canReadDivisionDocument(user.role, document.division)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        if (document.source_type !== 'upload' || !document.file_url) {
            return NextResponse.json({ error: 'Download not available for this document' }, { status: 400 });
        }

        const fileResponse = await fetch(document.file_url);
        if (!fileResponse.ok) {
            return NextResponse.json({ error: 'Failed to fetch document file' }, { status: 502 });
        }

        const fileBuffer = await fileResponse.arrayBuffer();
        const filename = buildDownloadFilename(document);

        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                'Content-Type': document.mime_type || fileResponse.headers.get('content-type') || 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'private, no-store, max-age=0',
            },
        });
    } catch (error) {
        console.error('[Division Documents API] Failed to download document:', error);
        return NextResponse.json({ error: 'Failed to download document' }, { status: 500 });
    }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const user = await getWorkspaceUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await context.params;
        const existing = await getDocument(id);
        if (!existing?.is_active) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }
        if (!canManageDivisionDocuments(user.role, existing.division)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const category = String(body.category || existing.category).toUpperCase() as DivisionDocumentCategory;
        const visibilityScope = String(body.visibility_scope || existing.visibility_scope).toLowerCase() as DivisionDocumentVisibilityScope;
        const sourceType = String(body.source_type || existing.source_type).toLowerCase();
        const audienceStationIds = Array.isArray(body.audience_station_ids)
            ? body.audience_station_ids
            : existing.audience_station_ids || [];
        const audienceRoles = Array.isArray(body.audience_roles)
            ? body.audience_roles.map((role: string) => normalizeRole(role)).filter(Boolean)
            : existing.audience_roles || [];

        if (!VALID_CATEGORIES.some((item) => item === category)) {
            return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
        }
        if (!VALID_VISIBILITY.some((item) => item === visibilityScope)) {
            return NextResponse.json({ error: 'Invalid visibility scope' }, { status: 400 });
        }
        if (!['upload', 'link'].includes(sourceType)) {
            return NextResponse.json({ error: 'Invalid source_type' }, { status: 400 });
        }

        const title = String(body.title ?? existing.title ?? '').trim();
        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        const fileUrl = sourceType === 'upload' ? (body.file_url ?? existing.file_url) : null;
        const externalUrl = sourceType === 'link' ? (body.external_url ?? existing.external_url) : null;
        if (sourceType === 'upload' && !fileUrl) {
            return NextResponse.json({ error: 'file_url is required for uploaded documents' }, { status: 400 });
        }
        if (sourceType === 'link' && !externalUrl) {
            return NextResponse.json({ error: 'external_url is required for linked documents' }, { status: 400 });
        }
        if (visibilityScope === 'stations' && audienceStationIds.length === 0) {
            return NextResponse.json({ error: 'Select at least one station for station-based visibility' }, { status: 400 });
        }
        if (visibilityScope === 'roles' && audienceRoles.length === 0) {
            return NextResponse.json({ error: 'Select at least one role for role-based visibility' }, { status: 400 });
        }
        if (visibilityScope === 'targeted' && audienceStationIds.length === 0 && audienceRoles.length === 0) {
            return NextResponse.json({ error: 'Targeted visibility requires at least one station or role' }, { status: 400 });
        }

        const updates = {
            category,
            title,
            description: body.description !== undefined ? (body.description ? String(body.description).trim() : null) : existing.description,
            meeting_title: body.meeting_title !== undefined ? (body.meeting_title ? String(body.meeting_title).trim() : null) : existing.meeting_title,
            meeting_date: body.meeting_date !== undefined ? (body.meeting_date ? String(body.meeting_date).trim() : null) : existing.meeting_date,
            audience_label: body.audience_label !== undefined ? (body.audience_label ? String(body.audience_label).trim() : null) : existing.audience_label,
            meeting_event_id: body.meeting_event_id !== undefined ? (body.meeting_event_id || null) : existing.meeting_event_id,
            source_type: sourceType,
            file_url: fileUrl,
            file_name: sourceType === 'upload' ? (body.file_name ?? existing.file_name ?? null) : null,
            file_size: sourceType === 'upload' ? (body.file_size ?? existing.file_size ?? null) : null,
            mime_type: sourceType === 'upload' ? (body.mime_type ?? existing.mime_type ?? null) : null,
            external_url: externalUrl,
            visibility_scope: visibilityScope,
            audience_station_ids: ['stations', 'targeted'].includes(visibilityScope) ? audienceStationIds : [],
            audience_roles: ['roles', 'targeted'].includes(visibilityScope) ? audienceRoles : [],
            updated_by: user.id,
            updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabaseAdmin
            .from('division_documents')
            .update(updates)
            .eq('id', id)
            .select(`
                *,
                created_by_user:created_by (
                    full_name
                )
            `)
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error) {
        console.error('[Division Documents API] Failed to update document:', error);
        return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
    }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const user = await getWorkspaceUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await context.params;
        const existing = await getDocument(id);
        if (!existing?.is_active) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }
        if (!canManageDivisionDocuments(user.role, existing.division)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { error } = await supabaseAdmin
            .from('division_documents')
            .update({
                is_active: false,
                updated_by: user.id,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Division Documents API] Failed to delete document:', error);
        return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
    }
}
