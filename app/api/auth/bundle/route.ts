import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const bundleStr = cookieStore.get('auth_bundle')?.value;
        if (!bundleStr) return NextResponse.json({ active: null, accounts: [] });

        const bundle = JSON.parse(bundleStr);
        const uids = Object.keys(bundle.sessions);

        if (uids.length === 0) return NextResponse.json({ active: null, accounts: [] });

        const { data: users, error } = await supabase
            .from('users')
            .select('id, email, full_name, role')
            .in('id', uids);

        if (error) throw error;

        return NextResponse.json({
            active: bundle.active_uid,
            accounts: users.map(u => ({
                id: u.id,
                email: u.email,
                name: u.full_name,
                role: u.role,
                isCurrent: u.id === bundle.active_uid
            }))
        });
    } catch {
        return NextResponse.json({ error: 'Failed to fetch bundle' }, { status: 500 });
    }
}
