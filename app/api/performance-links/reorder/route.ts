import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { canManagePerformanceLinks, getWorkspaceUser } from '@/lib/server/workspace-auth';

export async function PATCH(request: Request) {
    try {
        const user = await getWorkspaceUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (!canManagePerformanceLinks(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const order = Array.isArray(body.order) ? body.order.map(String) : [];
        if (order.length === 0) {
            return NextResponse.json({ error: 'order is required' }, { status: 400 });
        }

        const results = await Promise.all(
            order.map((id: string, index: number) =>
                supabaseAdmin.from('performance_links').update({ sort_order: index }).eq('id', id)
            )
        );
        const failed = results.find((r) => r.error);
        if (failed?.error) throw failed.error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Performance Links API] Failed to reorder links:', error);
        return NextResponse.json({ error: 'Failed to reorder links' }, { status: 500 });
    }
}
