import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { verifySession } from '@/lib/auth-utils';
import { canApproveStaff } from '@/lib/permissions';

export async function POST(request: Request) {
    try {
        // Verify session
        const cookieStore = await cookies();
        const token = cookieStore.get('session')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const session = await verifySession(token);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { userId } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        // Get current user data
        const { data: currentUser, error: currentUserError } = await supabase
            .from('users')
            .select('role, station_id')
            .eq('id', session.id)
            .single();

        if (currentUserError || !currentUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get staff user data
        const { data: staffUser, error: staffUserError } = await supabase
            .from('users')
            .select('role, station_id, status')
            .eq('id', userId)
            .single();

        if (staffUserError || !staffUser) {
            return NextResponse.json({ error: 'Staff user not found' }, { status: 404 });
        }

        // Check if staff is STAFF_CABANG and pending
        if (staffUser.role !== 'STAFF_CABANG') {
            return NextResponse.json(
                { error: 'Can only approve STAFF_CABANG users' },
                { status: 400 }
            );
        }

        if (staffUser.status !== 'pending') {
            return NextResponse.json(
                { error: 'User is not pending approval' },
                { status: 400 }
            );
        }

        // Check permission
        if (!canApproveStaff(currentUser.role as any, currentUser.station_id, staffUser.station_id)) {
            return NextResponse.json(
                { error: 'You can only approve staff from your station' },
                { status: 403 }
            );
        }

        // Approve staff
        const { error: updateError } = await supabase
            .from('users')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('id', userId);

        if (updateError) {
            console.error('Approval error:', updateError);
            return NextResponse.json(
                { error: 'Failed to approve staff' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Staff approved successfully',
        });
    } catch (error) {
        console.error('Staff approval error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
