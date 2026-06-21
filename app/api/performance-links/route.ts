import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { canManagePerformanceLinks, canViewPerformanceLinks, getWorkspaceUser } from '@/lib/server/workspace-auth';
import type { PerformanceLink } from '@/types';

interface PerformanceLinkRow {
    id: string;
    title: string;
    url: string;
    description: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
    created_by_user?: { full_name?: string | null } | Array<{ full_name?: string | null }> | null;
}

function mapLink(row: PerformanceLinkRow): PerformanceLink {
    const creator = Array.isArray(row.created_by_user) ? row.created_by_user[0] : row.created_by_user;
    return {
        id: row.id,
        title: row.title,
        url: row.url,
        description: row.description,
        created_by: row.created_by,
        created_by_name: creator?.full_name || null,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

export async function GET() {
    try {
        const user = await getWorkspaceUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (!canViewPerformanceLinks(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { data, error } = await supabaseAdmin
            .from('performance_links')
            .select(`*, created_by_user:created_by ( full_name )`)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json((data || []).map(mapLink));
    } catch (error) {
        console.error('[Performance Links API] Failed to fetch links:', error);
        return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const user = await getWorkspaceUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (!canManagePerformanceLinks(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const title = String(body.title || '').trim();
        const url = String(body.url || '').trim();
        const description = body.description ? String(body.description).trim() : null;

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }
        if (!url || !/^https?:\/\//i.test(url)) {
            return NextResponse.json({ error: 'A valid URL (starting with http:// or https://) is required' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('performance_links')
            .insert({ title, url, description, created_by: user.id })
            .select(`*, created_by_user:created_by ( full_name )`)
            .single();

        if (error) throw error;
        return NextResponse.json(mapLink(data), { status: 201 });
    } catch (error) {
        console.error('[Performance Links API] Failed to create link:', error);
        return NextResponse.json({ error: 'Failed to create link' }, { status: 500 });
    }
}
