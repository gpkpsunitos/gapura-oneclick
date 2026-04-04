/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi layout dashboard yang memeriksa autentikasi user
 */

import { cookies } from 'next/headers';
import { readSessionPayload } from '@/lib/auth-utils';
import { redirect } from 'next/navigation';

/**
 * Komponen layout dashboard
 * Memeriksa autentikasi user dan redirect ke login jika belum login
 * @param children - Child components yang akan dirender
 * @returns JSX element dengan children atau redirect ke login
 */
export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    const session = token ? await readSessionPayload(token) : null;

    if (!session) {
        redirect('/auth/login');
    }

    return (
        <div className="min-h-screen min-h-[100dvh] bg-slate-50 w-full overflow-x-hidden">
            {children}
        </div>
    );
}
