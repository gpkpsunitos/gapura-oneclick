'use client';

import dynamic from 'next/dynamic';

// JoumpaDashboard pulls in recharts (~370 kB). Loading it as a lazy chunk keeps
// recharts out of this route's initial JS so the shell paints first.
const JoumpaDashboard = dynamic(
    () => import('../../../../../components/dashboard/JoumpaDashboard').then((m) => m.JoumpaDashboard),
    {
        ssr: false,
        loading: () => (
            <div className="p-6 md:p-8 space-y-6">
                <div className="skeleton h-8 w-64" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-72" />)}
                </div>
            </div>
        ),
    }
);

export default function JoumpaPage() {
    return <JoumpaDashboard backPath="/dashboard/os" />;
}
