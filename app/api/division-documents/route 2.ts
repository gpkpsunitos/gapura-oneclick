import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
    canManageDivisionDocuments,
    getWorkspaceUser,
    normalizeRole,
} from '@/lib/server/workspace-auth';
import type {
    DivisionDocument,
    DivisionDocumentCategory,
    DivisionDocumentDivision,
    DivisionDocumentVisibilityScope,
} from '@/types';

const VALID_DIVISIONS = ['HC', 'HT'] as const;
const VALID_CATEGORIES = ['SAM_HANDBOOK', 'EDARAN_DIREKSI', 'MATERI_SOSIALISASI', 'TRAINING_MATERIAL'] as const;
const VALID_VISIBILITY = ['all', 'stations', 'roles', 'targeted'] as const;

function isValidDivision(value: string): value is DivisionDocumentDivision {
    return VALID_DIVISIONS.includes(value as any);
}

function matchesAudienceByStation(
    user: NonNullable<Awaited<ReturnType<typeof getWorkspaceUser>>>,
    document: DivisionDocument
) {
    if (!document.audience_station_ids.length) return false;
    return Boolean(user.station_id) && document.audience_station_ids.includes(String(user.station_id));
}

function matchesAudienceByRole(
    user: NonNullable<Awaited<ReturnType<typeof getWorkspaceUser>>>,
    document: DivisionDocument
) {
    if (!document.audience_roles.length) return false;
    return document.audience_roles.includes(normalizeRole(user.role));
}

function canViewDocument(user: NonNullable<Awaited<ReturnType<typeof getWorkspaceUser>>>, document: DivisionDocument) {
    if (canManageDivisionDocuments(user.role, document.division)) return true;

    if (document.visibility_scope === 'all') return true;
    if (document.visibility_scope === 'stations') {
        return matchesAudienceByStation(user, document);
    }
    if (document.visibility_scope === 'roles') {
        return matchesAudienceByRole(user, document);
    }
    if (document.visibility_scope === 'targeted') {
        const matchesStation = document.audience_station_ids.length
            ? matchesAudienceByStation(user, document)
            : true;
        const matchesRole = document.audience_roles.length
            ? matchesAudienceByRole(user, document)
            : true;
        return matchesStation && matchesRole;
    }
    return false;
}

function mapDocument(row: any): DivisionDocument {
    const creator = Array.isArray(row.created_by_user) ? row.created_by_user[0] : row.created_by_user;
    return {
        id: row.id,
        division: row.division,
        category: row.category,
        title: row.title,
        description: row.description,
        meeting_title: row.meeting_title,
        meeting_date: row.meeting_date,
        audience_label: row.audience_label,
        source_type: row.source_type,
        file_url: row.file_url,
        file_name: row.file_name,
        file_size: row.file_size,
        mime_type: row.mime_type,
        external_url: row.external_url,
        visibility_scope: row.visibility_scope,
        audience_station_ids: Array.isArray(row.audience_station_ids) ? row.audience_station_ids : [],
        audience_roles: Array.isArray(row.audience_roles) ? row.audience_roles : [],
        created_by: row.created_by,
        updated_by: row.updated_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
        created_by_name: creator?.full_name || null,
    };
}

export async function GET(request: Request) {
    try {
        const user = await getWorkspaceUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const url = new URL(request.url);
        const division = String(url.searchParams.get('division') || 'HC').toUpperCase();
        const category = url.searchParams.get('category');

        if (!isValidDivision(division)) {
            return NextResponse.json({ error: 'Invalid division' }, { status: 400 });
        }

        let query = supabaseAdmin
            .from('division_documents')
            .select(`
                *,
                created_by_user:created_by (
                    full_name
                )
            `)
            .eq('division', division)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (category) {
            query = query.eq('category', category);
        }

        const { data, error } = await query;
        if (error) throw error;

        const documents = (data || []).map(mapDocument).filter((document) => canViewDocument(user, document));
        return NextResponse.json(documents);
    } catch (error) {
        console.error('[Division Documents API] Failed to fetch documents:', error);
        return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const user = await getWorkspaceUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const division = String(body.division || '').toUpperCase();
        if (!isValidDivision(division)) {
            return NextResponse.json({ error: 'Invalid division' }, { status: 400 });
        }
        if (!canManageDivisionDocuments(user.role, division)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const category = String(body.category || '').toUpperCase() as DivisionDocumentCategory;
        const visibilityScope = String(body.visibility_scope || 'all').toLowerCase() as DivisionDocumentVisibilityScope;
        const sourceType = String(body.source_type || '').toLowerCase();
        const audienceStationIds = Array.isArray(body.audience_station_ids) ? body.audience_station_ids : [];
        const audienceRoles = Array.isArray(body.audience_roles)
            ? body.audience_roles.map((role: string) => normalizeRole(role)).filter(Boolean)
            : [];

        if (!VALID_CATEGORIES.includes(category as any)) {
            return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
        }
        if (!VALID_VISIBILITY.includes(visibilityScope as any)) {
            return NextResponse.json({ error: 'Invalid visibility scope' }, { status: 400 });
        }
        if (!['upload', 'link'].includes(sourceType)) {
            return NextResponse.json({ error: 'Invalid source_type' }, { status: 400 });
        }

        const title = String(body.title || '').trim();
        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        if (sourceType === 'upload' && !body.file_url) {
            return NextResponse.json({ error: 'file_url is required for uploaded documents' }, { status: 400 });
        }
        if (sourceType === 'link' && !body.external_url) {
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

        const insertPayload = {
            division,
            category,
            title,
            description: body.description ? String(body.description).trim() : null,
            meeting_title: body.meeting_title ? String(body.meeting_title).trim() : null,
            meeting_date: body.meeting_date ? String(body.meeting_date).trim() : null,
            audience_label: body.audience_label ? String(body.audience_label).trim() : null,
            source_type: sourceType,
            file_url: body.file_url || null,
            file_name: body.file_name || null,
            file_size: body.file_size || null,
            mime_type: body.mime_type || null,
            external_url: body.external_url || null,
            visibility_scope: visibilityScope,
            audience_station_ids: audienceStationIds,
            audience_roles: audienceRoles,
            created_by: user.id,
            updated_by: user.id,
        };

        const { data, error } = await supabaseAdmin
            .from('division_documents')
            .insert(insertPayload)
            .select(`
                *,
                created_by_user:created_by (
                    full_name
                )
            `)
            .single();

        if (error) throw error;

        return NextResponse.json(mapDocument(data), { status: 201 });
    } catch (error) {
        console.error('[Division Documents API] Failed to create document:', error);
        return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
    }
}
