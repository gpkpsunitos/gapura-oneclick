import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { hashPassword } from '@/lib/auth-utils';

// GET all users (for admin) with relations
export async function GET(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('session')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const payload = await verifySession(token);
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        // SUPER_ADMIN: global view, MANAGER_CABANG: station-scoped view
        const isSuper = payload.role === 'SUPER_ADMIN';

        // Determine query client and optional station filter
        const client = supabaseAdmin;

        // Fetch manager station when needed
        let stationFilter: string | null = null;
        if (!isSuper && payload.role === 'MANAGER_CABANG') {
            const { data: mgr } = await client
                .from('users')
                .select('station_id')
                .eq('id', payload.id)
                .single();
            stationFilter = mgr?.station_id || null;
            if (!stationFilter) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        } else if (!isSuper) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        let query = client
            .from('users')
            .select(`
        *,
        stations:station_id (code, name),
        units:unit_id (name),
        positions:position_id (name)
      `)
            .order('created_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        if (stationFilter) {
            query = query.eq('station_id', stationFilter);
        }

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ error: 'Gagal memuat users' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('session')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const payload = await verifySession(token);
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            email,
            full_name,
            nik,
            phone,
            unit_id,
            position_id,
            station_id, // SUPER_ADMIN only
            role,       // SUPER_ADMIN only
            division,   // SUPER_ADMIN only
            activate = false,
        } = body || {};

        const isSuper = payload.role === 'SUPER_ADMIN';
        const isManager = payload.role === 'MANAGER_CABANG';
        if (!isSuper && !isManager) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (!email || !full_name || !nik || !phone || !position_id) {
            return NextResponse.json({ error: 'Semua field wajib diisi' }, { status: 400 });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: 'Format email tidak valid' }, { status: 400 });
        }
        const nikRegex = /^[A-Z0-9]{5,15}$/i;
        if (!nikRegex.test(nik)) {
            return NextResponse.json({ error: 'NIK harus 5-15 karakter (huruf/angka)' }, { status: 400 });
        }
        const phoneRegex = /^08\d{8,11}$/;
        if (!phoneRegex.test(phone)) {
            return NextResponse.json({ error: 'Nomor HP harus dimulai 08 dan 10-13 digit' }, { status: 400 });
        }

        let targetStationId: string | null = null;
        if (isSuper) {
            targetStationId = station_id || null;
            if (!targetStationId) {
                return NextResponse.json({ error: 'station_id wajib untuk admin' }, { status: 400 });
            }
        } else if (isManager) {
            const { data: mgr } = await supabaseAdmin
                .from('users')
                .select('station_id')
                .eq('id', payload.id)
                .single();
            targetStationId = mgr?.station_id || null;
            if (!targetStationId) {
                return NextResponse.json({ error: 'Station manager tidak ditemukan' }, { status: 403 });
            }
        }

        const { data: existingEmail } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('email', String(email).toLowerCase())
            .single();
        if (existingEmail) {
            return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 400 });
        }
        const { data: existingNik } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('nik', String(nik).toUpperCase())
            .single();
        if (existingNik) {
            return NextResponse.json({ error: 'NIK sudah terdaftar' }, { status: 400 });
        }

        let newRole: string = 'STAFF_CABANG';
        let newDivision: string = 'GENERAL';
        if (isSuper && role) {
            const validRoles = ['SUPER_ADMIN', 'DIVISI_OS', 'DIVISI_OT', 'DIVISI_OP', 'DIVISI_UQ', 'DIVISI_HC', 'DIVISI_HT', 'ANALYST', 'MANAGER_CABANG', 'STAFF_CABANG'];
            if (!validRoles.includes(role)) {
                return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
            }
            newRole = role;
            if (division) newDivision = division;
        }
        if (isManager) {
            newRole = 'STAFF_CABANG';
            newDivision = 'GENERAL';
        }

        const tempPassword = Math.random().toString(36).slice(-10) + '8A!';
        const hashed = await hashPassword(tempPassword);

        const insertData: Record<string, unknown> = {
            email: String(email).toLowerCase(),
            password: hashed,
            full_name: String(full_name).trim(),
            nik: String(nik).toUpperCase(),
            phone,
            station_id: targetStationId,
            unit_id: unit_id || null,
            position_id,
            role: newRole,
            division: newDivision,
            status: activate ? 'active' : 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        const { error: insertErr } = await supabaseAdmin.from('users').insert(insertData);
        if (insertErr) {
            console.error('Create user error:', insertErr);
            return NextResponse.json({ error: 'Gagal membuat user' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: activate ? 'User dibuat dan diaktifkan' : 'User dibuat, status pending',
            temporaryPassword: tempPassword,
        });
    } catch (error) {
        console.error('Create user error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('session')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const payload = await verifySession(token);
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const body = await request.json();
        const { userId, status, role, division } = body;

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

        if (payload.role === 'SUPER_ADMIN') {
            if (status) {
                if (!['pending', 'active', 'rejected'].includes(status)) {
                    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
                }
                updates.status = status;
            }
    
            if (role) {
            const validRoles = ['SUPER_ADMIN', 'DIVISI_OS', 'DIVISI_OT', 'DIVISI_OP', 'DIVISI_UQ', 'DIVISI_HC', 'DIVISI_HT', 'ANALYST', 'MANAGER_CABANG', 'STAFF_CABANG'];
                if (!validRoles.includes(role)) {
                    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
                }
                updates.role = role;
            }
    
            if (division) {
                 const validDivisions = ['OS', 'OP', 'OT', 'UQ', 'HC', 'HT', 'GENERAL'];
                 if (!validDivisions.includes(division)) {
                     return NextResponse.json({ error: 'Invalid division' }, { status: 400 });
                 }
                 updates.division = division;
            }
    
            const { error } = await supabase
                .from('users')
                .update(updates)
                .eq('id', userId);
    
            if (error) throw error;
        } else if (payload.role === 'MANAGER_CABANG') {
            if (!status) {
                return NextResponse.json({ error: 'Only status updates allowed' }, { status: 400 });
            }
            if (!['active', 'rejected', 'pending'].includes(status)) {
                return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
            }
            // Managers cannot change role/division
            if (role || division) {
                return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
            }
            // Verify target user belongs to same station and is STAFF_CABANG
            const { data: mgr } = await supabaseAdmin
                .from('users')
                .select('station_id')
                .eq('id', payload.id)
                .single();
            const { data: target } = await supabaseAdmin
                .from('users')
                .select('station_id, role')
                .eq('id', userId)
                .single();
            if (!mgr?.station_id || !target) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
            if (mgr.station_id !== target.station_id || target.role !== 'STAFF_CABANG') {
                return NextResponse.json({ error: 'Can only manage STAFF_CABANG in your station' }, { status: 403 });
            }
            const { error } = await supabaseAdmin
                .from('users')
                .update({ status, updated_at: new Date().toISOString() })
                .eq('id', userId);
            if (error) throw error;
        } else {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating user:', error);
        return NextResponse.json({ error: 'Gagal mengubah user' }, { status: 500 });
    }
}
