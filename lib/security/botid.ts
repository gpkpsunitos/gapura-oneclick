import { NextResponse } from 'next/server';
import { checkBotId } from 'botid/server';

export const BOTID_PROTECTED_ROUTES = [
    {
        path: '/api/auth/login',
        method: 'POST',
        advancedOptions: {
            checkLevel: 'basic',
        },
    },
    {
        path: '/api/auth/register',
        method: 'POST',
        advancedOptions: {
            checkLevel: 'basic',
        },
    },
    {
        path: '/api/reports',
        method: 'POST',
        advancedOptions: {
            checkLevel: 'basic',
        },
    },
    {
        path: '/api/uploads/evidence',
        method: 'POST',
        advancedOptions: {
            checkLevel: 'basic',
        },
    },
    {
        path: '/api/investigative-ai',
        method: 'POST',
        advancedOptions: {
            checkLevel: 'deepAnalysis',
        },
    },
    {
        path: '/api/ai/analyze',
        method: 'POST',
        advancedOptions: {
            checkLevel: 'deepAnalysis',
        },
    },
] as const;

export async function enforceBotProtection() {
    const verification = await checkBotId();

    if (verification.isBot) {
        return NextResponse.json(
            { error: 'Permintaan ditolak oleh proteksi bot' },
            { status: 403 }
        );
    }

    return null;
}
