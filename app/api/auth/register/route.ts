import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { hashPassword } from '@/lib/auth-utils';

// Complexity: Time O(1) | Space O(1)
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { 
            email, 
            password, 
            full_name, 
            nik, 
            phone, 
            station_id, 
            unit_id, 
            position_id,
            division // Only for GPS (central office)
        } = body;

        // Resolve station by ID or CODE; derive isGPS by station.code
        let stationRow: { id: string; code: string } | null = null;
        // Try by ID first
        const { data: byId } = await supabase
            .from('stations')
            .select('id, code')
            .eq('id', station_id)
            .single();
        if (byId) {
            stationRow = byId as any;
        } else {
            // Fallback by CODE (accept uppercase/lowercase)
            const { data: byCode } = await supabase
                .from('stations')
                .select('id, code')
                .ilike('code', String(station_id).toUpperCase())
                .single();
            if (byCode) stationRow = byCode as any;
        }

        if (!stationRow) {
            return NextResponse.json(
                { error: 'Station tidak valid' },
                { status: 400 }
            );
        }

        const isGPS = String(stationRow.code || '').toUpperCase() === 'GPS';

        // Basic field validation
        // unit_id is NOT required if isGPS is true
        if (!email || !password || !full_name || !nik || !phone || !station_id || !position_id) {
             return NextResponse.json(
                { error: 'Semua field wajib diisi' },
                { status: 400 }
            );
        }

        if (!isGPS && !unit_id) {
             return NextResponse.json(
                { error: 'Unit kerja wajib disi' },
                { status: 400 }
            );
        }

        // Password validation
        if (password.length < 6) {
            return NextResponse.json(
                { error: 'Password minimal 6 karakter' },
                { status: 400 }
            );
        }

        // NIK validation: alphanumeric, 5-10 characters
        const nikRegex = /^[A-Z0-9]{5,10}$/i;
        if (!nikRegex.test(nik)) {
            return NextResponse.json(
                { error: 'NIK harus 5-10 karakter (huruf/angka)' },
                { status: 400 }
            );
        }

        // Phone validation: starts with 08, 10-13 digits
        const phoneRegex = /^08\d{8,11}$/;
        if (!phoneRegex.test(phone)) {
            return NextResponse.json(
                { error: 'Nomor HP harus dimulai 08 dan 10-13 digit' },
                { status: 400 }
            );
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Format email tidak valid' },
                { status: 400 }
            );
        }

        // Check if email already exists
        const { data: existingEmail } = await supabase
            .from('users')
            .select('id')
            .eq('email', email.toLowerCase())
            .single();

        if (existingEmail) {
            return NextResponse.json(
                { error: 'Email sudah terdaftar' },
                { status: 400 }
            );
        }

        // Check if NIK already exists
        const { data: existingNik } = await supabase
            .from('users')
            .select('id')
            .eq('nik', nik.toUpperCase())
            .single();

        if (existingNik) {
            return NextResponse.json(
                { error: 'NIK sudah terdaftar' },
                { status: 400 }
            );
        }



        // Hash password
        const hashedPassword = await hashPassword(password);

        // Determine role and division based on station and email
        const isGapuraEmail = email.toLowerCase().endsWith('@gapura.id');

        let role: string;
        let userDivision: string;

        if (isGPS) {
            // GPS users: role can be central roles based on position/division
            role = 'ANALYST'; // Default role, admin can upgrade to DIVISI_OS, DIVISI_OT, etc.
            userDivision = body.division || 'GENERAL';
        } else {
            // Branch users: role based on email domain
            if (isGapuraEmail) {
                role = 'MANAGER_CABANG';
            } else {
                role = 'STAFF_CABANG';
            }
            userDivision = 'GENERAL';
        }

        const userData = {
            email: email.toLowerCase(),
            password: hashedPassword,
            full_name: full_name.trim(),
            nik: nik.toUpperCase(),
            phone,
            station_id: stationRow.id,
            unit_id,
            position_id,
            role,
            division: userDivision,
            status: 'pending',
        };

        const { error: insertError } = await supabase
            .from('users')
            .insert(userData);

        if (insertError) {
            console.error('Insert error:', insertError);
            return NextResponse.json(
                { error: 'Gagal mendaftarkan user. Silakan coba lagi.' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Registrasi berhasil. Mohon tunggu persetujuan admin.',
        });
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}
