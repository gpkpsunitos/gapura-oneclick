import { cookies } from 'next/headers';
import { readSessionPayload } from '@/lib/auth-utils';
import { redirect } from 'next/navigation';

export default async function AnalystReportsPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    const session = token ? await readSessionPayload(token) : null;

    if (session?.division === 'OCS') {
        redirect('/dashboard/ocs?view=reports');
    }

    redirect('/dashboard/analyst?view=reports');
}
