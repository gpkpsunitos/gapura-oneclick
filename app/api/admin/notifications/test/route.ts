import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { sendTestEmail } from '@/lib/notifications';

async function getSession() {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
            },
        }
    );
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}

async function checkAuth() {
    const session = await getSession();
    if (!session?.user) return null;

    const { data: user } = await supabaseAdmin
        .from('users')
        .select('role, full_name')
        .eq('id', session.user.id)
        .single();

    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ANALYST')) {
        return null;
    }

    return { ...session.user, full_name: user.full_name, role: user.role };
}

export async function POST(req: Request) {
    const user = await checkAuth();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { email } = await req.json();
        if (!email || !email.includes('@')) {
            return NextResponse.json({ error: 'Email tidak valid' }, { status: 400 });
        }

        console.log(`[NOTIFICATIONS] Triggering test email to: ${email} (Requested by: ${user.full_name})`);

        await sendTestEmail({
            to: email,
            requestedBy: `${user.full_name} (${user.role})`,
            subject: '[OneClick] Test Konfigurasi Email Notifikasi'
        });

        return NextResponse.json({ success: true, message: `Email test berhasil dikirim ke ${email}.` });
    } catch (err) {
        console.error('[NOTIFICATIONS] Test email failed:', err);
        return NextResponse.json({ 
            error: err instanceof Error ? err.message : 'Gagal mengirim email test' 
        }, { status: 500 });
    }
}
