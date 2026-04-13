/**
 * @file
 * Server-side verification of division passwords.
 * Replaces hardcoded client-side passwords to prevent credential exposure.
 */

import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

/**
 * Division passwords loaded from environment variables.
 * Falls back to empty (no password required) if not configured.
 */
const DIVISION_PASSWORDS: Record<string, string> = {
    OS: process.env.DIVISION_PASSWORD_OS || '',
    HC: process.env.DIVISION_PASSWORD_HC || '',
};

export async function POST(request: Request) {
    try {
        const body = await request.json() as { divisionCode?: string; password?: string };
        const { divisionCode, password } = body;

        if (!divisionCode || typeof divisionCode !== 'string') {
            return NextResponse.json({ error: 'Division code required' }, { status: 400 });
        }

        const expectedPassword = DIVISION_PASSWORDS[divisionCode.toUpperCase()];

        // If no password configured for this division, allow access
        if (!expectedPassword) {
            return NextResponse.json({ valid: true });
        }

        if (!password || typeof password !== 'string') {
            return NextResponse.json({ valid: false, error: 'Password required' }, { status: 401 });
        }

        // Timing-safe comparison to prevent timing attacks
        const a = Buffer.from(password, 'utf-8');
        const b = Buffer.from(expectedPassword, 'utf-8');

        if (a.length !== b.length) {
            return NextResponse.json({ valid: false, error: 'Password salah.' }, { status: 401 });
        }

        const isValid = timingSafeEqual(a, b);

        if (!isValid) {
            return NextResponse.json({ valid: false, error: 'Password salah.' }, { status: 401 });
        }

        return NextResponse.json({ valid: true });
    } catch {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}
