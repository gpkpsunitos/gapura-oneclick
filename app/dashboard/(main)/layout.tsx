
import { Suspense } from 'react';
import { DashboardFrame } from '@/components/layout/DashboardFrame';
import { DashboardWorkspaceSkeleton } from '@/components/dashboard/DashboardWorkspaceSkeleton';
import { ReportsStoreProvider } from '@/components/providers/ReportsStoreProvider';
import { cookies } from 'next/headers';
import { readSessionPayload, verifySession } from '@/lib/auth-utils';
import { redirect } from 'next/navigation';

function DashboardSkeleton() {
    return <DashboardWorkspaceSkeleton title="Opening workspace" subtitle="Staging the dashboard shell before interactive modules hydrate." />;
}

async function SessionGuard({ token }: { token: string }) {
    const session = await verifySession(token);
    if (!session) {
        redirect('/auth/login');
    }
    return null;
}

export default async function MainDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;

    const payload = token ? await readSessionPayload(token) : null;

    if (!payload) {
        redirect('/auth/login');
    }

    return (
        <DashboardFrame role={payload.role as string}>
            <ReportsStoreProvider userId={payload.id as string}>
                <Suspense fallback={<DashboardSkeleton />}>
                    {token && <SessionGuard token={token} />}
                    {children}
                </Suspense>
            </ReportsStoreProvider>
        </DashboardFrame>
    );
}
