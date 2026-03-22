import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { canManageDivisionDocuments, getWorkspaceUser, normalizeRole } from '@/lib/server/workspace-auth';

async function getDocument(id: string) {
    const { data, error } = await supabaseAdmin
        .from('division_documents')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const user = await getWorkspaceUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await context.params;
        const existing = await getDocument(id);
        if (!canManageDivisionDocuments(user.role, existing.division)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const updates: Record<string, unknown> = {
            updated_by: user.id,
            updated_at: new Date().toISOString(),
        };

        const fields = [
            'category',
            'title',
            'description',
            'meeting_title',
            'meeting_date',
            'audience_label',
            'source_type',
            'file_url',
            'file_name',
            'file_size',
            'mime_type',
            'external_url',
            'visibility_scope',
        ];

        for (const field of fields) {
            if (field in body) {
                updates[field] = body[field] === '' ? null : body[field];
            }
        }

        if ('audience_station_ids' in body) {
            updates.audience_station_ids = Array.isArray(body.audience_station_ids) ? body.audience_station_ids : [];
        }
        if ('audience_roles' in body) {
            updates.audience_roles = Array.isArray(body.audience_roles)
                ? body.audience_roles.map((role: string) => normalizeRole(role)).filter(Boolean)
                : [];
        }

        const nextVisibilityScope = String(
            ('visibility_scope' in updates ? updates.visibility_scope : existing.visibility_scope) || 'all'
        ).toLowerCase();
        const nextSourceType = String(
            ('source_type' in updates ? updates.source_type : existing.source_type) || ''
        ).toLowerCase();
        const nextTitle = String(
            ('title' in updates ? updates.title : existing.title) || ''
        ).trim();
        const nextFileUrl = String(
            ('file_url' in updates ? updates.file_url : existing.file_url) || ''
        ).trim();
        const nextExternalUrl = String(
            ('external_url' in updates ? updates.external_url : existing.external_url) || ''
        ).trim();
        const nextAudienceStations = Array.isArray(updates.audience_station_ids)
            ? updates.audience_station_ids
            : (Array.isArray(existing.audience_station_ids) ? existing.audience_station_ids : []);
        const nextAudienceRoles = Array.isArray(updates.audience_roles)
            ? updates.audience_roles
            : (Array.isArray(existing.audience_roles) ? existing.audience_roles : []);

        if (!nextTitle) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }
        if (!['upload', 'link'].includes(nextSourceType)) {
            return NextResponse.json({ error: 'Invalid source_type' }, { status: 400 });
        }
        if (!['all', 'stations', 'roles', 'targeted'].includes(nextVisibilityScope)) {
            return NextResponse.json({ error: 'Invalid visibility scope' }, { status: 400 });
        }
        if (nextSourceType === 'upload' && !nextFileUrl) {
            return NextResponse.json({ error: 'file_url is required for uploaded documents' }, { status: 400 });
        }
        if (nextSourceType === 'link' && !nextExternalUrl) {
            return NextResponse.json({ error: 'external_url is required for linked documents' }, { status: 400 });
        }
        if (nextVisibilityScope === 'stations' && nextAudienceStations.length === 0) {
            return NextResponse.json({ error: 'Select at least one station for station-based visibility' }, { status: 400 });
        }
        if (nextVisibilityScope === 'roles' && nextAudienceRoles.length === 0) {
            return NextResponse.json({ error: 'Select at least one role for role-based visibility' }, { status: 400 });
        }
        if (nextVisibilityScope === 'targeted' && nextAudienceStations.length === 0 && nextAudienceRoles.length === 0) {
            return NextResponse.json({ error: 'Targeted visibility requires at least one station or role' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('division_documents')
            .update(updates)
            .eq('id', id);

        if (error) throw error;

        const refreshed = await getDocument(id);
        return NextResponse.json(refreshed);
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
