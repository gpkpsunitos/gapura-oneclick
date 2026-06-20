/**
 * @file
 * 
 * File ini berisi API route untuk mengambil dan memvalidasi session pengguna saat ini
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';

/**
 * Menangani request GET untuk mengambil informasi session pengguna saat ini
 * Memvalidasi token session dan mengembalikan data user jika valid
 * @returns Response JSON berisi data user atau error jika session invalid
 * @throws {Error} Jika terjadi kesalahan internal server
 * @example
 * ```json
 * {
 *   "user": {
 *     "id": "user-123",
 *     "role": "DIVISI_OS",
 *     "full_name": "John Doe"
 *   }
 * }
 * ```
 */
export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('session')?.value;

        if (!token) {
            return NextResponse.json({ user: null }, { status: 401 });
        }

        const payload = await verifySession(token);

        if (!payload) {
            return NextResponse.json({ user: null }, { status: 401 });
        }

        return NextResponse.json({ 
            user: {
                id: payload.id,
                role: payload.role,
                full_name: payload.full_name
            } 
        }, {
            headers: { 'Cache-Control': 'no-store, max-age=0' },
        });

    } catch (error) {
        console.error('Session retrieval error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
