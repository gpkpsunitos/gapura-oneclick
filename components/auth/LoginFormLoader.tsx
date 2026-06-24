'use client';

import dynamic from 'next/dynamic';

const LoginForm = dynamic(() => import('@/components/auth/LoginForm'), {
    ssr: false,
    loading: () => (
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 sm:p-8 animate-pulse">
            <div className="h-8 bg-slate-100 rounded-lg w-1/3 mb-6" />
            <div className="space-y-4">
                <div className="h-12 bg-slate-50 rounded-xl w-full" />
                <div className="h-12 bg-slate-50 rounded-xl w-full" />
                <div className="h-12 bg-emerald-100/50 rounded-xl w-full" />
            </div>
        </div>
    ),
});

export default function LoginFormLoader() {
    return <LoginForm />;
}
