import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
    canViewAudienceScopedItem,
    canManageDivisionDocuments,
    getWorkspaceUser,
    normalizeRole,
} from '@/lib/server/workspace-auth';
import { deleteDriveFile } from '@/lib/google-drive';
import type {
    DivisionDocument,
    DivisionDocumentCategory,
    DivisionDocumentDivision,
    DivisionDocumentVisibilityScope,
} from '@/types';

const VALID_DIVISIONS = ['HC', 'HT', 'ANALYST'] as const;
const VALID_CATEGORIES = [
    'SAM_HANDBOOK',
    'EDARAN_DIREKSI',
    'MATERI_SOSIALISASI',
    'NOTULENSI_RAPAT',
    'TRAINING_MATERIAL',
    'DOKUMEN_LAIN',
    'NOTICE',
    'MANUAL',
] as const;
const VALID_VISIBILITY = ['all', 'stations', 'roles', 'targeted'] as const;

interface DivisionDocumentRow {
    id: string;
    division: DivisionDocumentDivision;
    category: DivisionDocumentCategory;
    title: string;
    description?: string | null;
    meeting_title?: string | null;
    meeting_date?: string | null;
    activity_pic?: string | null;
    activity_location?: string | null;
    station_id?: string | null;
    airline?: string | null;
    participants?: string | null;
    materi_url?: string | null;
    attendance_url?: string | null;
    recording_url?: string | null;
    audience_label?: string | null;
    meeting_event_id?: string | null;
    source_type: 'upload' | 'link';
    file_url?: string | null;
    file_name?: string | null;
    file_size?: number | null;
    mime_type?: string | null;
    external_url?: string | null;
    drive_file_id?: string | null;
    drive_folder_id?: string | null;
    drive_web_url?: string | null;
    drive_content_url?: string | null;
    uploaded_at?: string | null;
    visibility_scope: DivisionDocumentVisibilityScope;
    audience_station_ids?: string[] | null;
    audience_roles?: string[] | null;
    created_by: string;
    updated_by?: string | null;
    created_at: string;
    updated_at: string;
    created_by_user?: { full_name?: string | null } | Array<{ full_name?: string | null }> | null;
}

function isValidDivision(value: string): value is DivisionDocumentDivision {
    return VALID_DIVISIONS.some((item) => item === value);
}

async function fetchStationMap(stationIds: string[]) {
    const map = new Map<string, { code: string; name: string }>();
    const ids = Array.from(new Set(stationIds.filter(Boolean)));
    if (ids.length === 0) return map;

    const { data } = await supabaseAdmin.from('stations').select('id, code, name').in('id', ids);
    for (const station of data || []) {
        map.set(station.id, { code: station.code, name: station.name });
    }
    return map;
}

function canViewDocument(user: NonNullable<Awaited<ReturnType<typeof getWorkspaceUser>>>, document: DivisionDocument) {
    if (canManageDivisionDocuments(user.role, document.division)) return true;
    if (normalizeRole(user.role) === 'DIVISI_ESKALASI') return true;
    // All other authenticated roles (DIVISI_*, PARTNER_*, branch) pass through to audience check
    const docStation = document.station_code || document.station_id;
    if (docStation) {
        const userStation = user.station_code || user.station_id;
        if (!userStation || userStation !== docStation) return false;
    }
    return canViewAudienceScopedItem(
        user,
        document.visibility_scope,
        document.audience_station_ids,
        document.audience_roles
    );
}

function mapDocument(row: DivisionDocumentRow, stationMap: Map<string, { code: string; name: string }>): DivisionDocument {
    const creator = Array.isArray(row.created_by_user) ? row.created_by_user[0] : row.created_by_user;
    const station = row.station_id ? stationMap.get(row.station_id) : null;
    return {
        id: row.id,
        division: row.division,
        category: row.category,
        title: row.title,
        description: row.description,
        meeting_title: row.meeting_title,
        meeting_date: row.meeting_date,
        activity_pic: row.activity_pic,
        activity_location: row.activity_location,
        station_id: row.station_id,
        station_code: station?.code || row.station_id || null,
        station_name: station?.name || null,
        airline: row.airline,
        participants: row.participants,
        materi_url: row.materi_url,
        attendance_url: row.attendance_url,
        recording_url: row.recording_url,
        audience_label: row.audience_label,
        source_type: row.source_type,
        file_url: row.file_url,
        file_name: row.file_name,
        file_size: row.file_size,
        mime_type: row.mime_type,
        external_url: row.external_url,
        drive_file_id: row.drive_file_id,
        drive_folder_id: row.drive_folder_id,
        drive_web_url: row.drive_web_url,
        drive_content_url: row.drive_content_url,
        uploaded_at: row.uploaded_at,
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

        const stationMap = await fetchStationMap((data || []).map((row) => row.station_id));
        const documents = (data || [])
            .map((row) => mapDocument(row, stationMap))
            .filter((document) => canViewDocument(user, document));
        return NextResponse.json(documents);
    } catch (error) {
        console.error('[Division Documents API] Failed to fetch documents:', error);
        return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    let uploadedDriveFileId: string | null = null;
    try {
        const user = await getWorkspaceUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        uploadedDriveFileId = body.drive_file_id ? String(body.drive_file_id) : null;
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

        if (!VALID_CATEGORIES.some((item) => item === category)) {
            return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
        }
        if (!VALID_VISIBILITY.some((item) => item === visibilityScope)) {
            return NextResponse.json({ error: 'Invalid visibility scope' }, { status: 400 });
        }
        if (!['upload', 'link'].includes(sourceType)) {
            return NextResponse.json({ error: 'Invalid source_type' }, { status: 400 });
        }

        const title = String(body.title || '').trim();
        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        if (sourceType === 'upload' && (!body.file_url || !uploadedDriveFileId)) {
            return NextResponse.json({ error: 'Google Drive file metadata is required for uploaded documents' }, { status: 400 });
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
            activity_pic: body.activity_pic ? String(body.activity_pic).trim() : null,
            activity_location: body.activity_location ? String(body.activity_location).trim() : null,
            station_id: body.station_id ? String(body.station_id) : null,
            airline: body.airline ? String(body.airline).trim() : null,
            participants: body.participants ? String(body.participants).trim() : null,
            materi_url: body.materi_url ? String(body.materi_url).trim() : null,
            attendance_url: body.attendance_url ? String(body.attendance_url).trim() : null,
            recording_url: body.recording_url ? String(body.recording_url).trim() : null,
            audience_label: body.audience_label ? String(body.audience_label).trim() : null,
            source_type: sourceType,
            file_url: body.file_url || null,
            file_name: body.file_name || null,
            file_size: body.file_size || null,
            mime_type: body.mime_type || null,
            external_url: body.external_url || null,
            drive_file_id: uploadedDriveFileId,
            drive_folder_id: body.drive_folder_id || null,
            drive_web_url: body.drive_web_url || null,
            drive_content_url: body.drive_content_url || null,
            uploaded_at: sourceType === 'upload' ? new Date().toISOString() : null,
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

        const stationMap = await fetchStationMap([data.station_id]);
        return NextResponse.json(mapDocument(data, stationMap), { status: 201 });
    } catch (error) {
        if (uploadedDriveFileId) {
            await deleteDriveFile(uploadedDriveFileId).catch((cleanupError) => {
                console.error('[Division Documents API] Failed to roll back Drive upload:', cleanupError);
            });
        }
        console.error('[Division Documents API] Failed to create document:', error);
        return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
    }
}
