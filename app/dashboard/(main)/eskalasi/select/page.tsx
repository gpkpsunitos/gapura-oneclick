'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { logoutWithPwaCleanup } from '@/lib/pwa/logout';
import {
    Plane, BookOpen, GraduationCap, Shield,
    ArrowRight, Layers
} from 'lucide-react';

const divisionCards = [
    {
        code: 'OP',
        name: 'Operational Monitoring',
        description: 'Reports of Ground Handling, JOUMPA Services, GSE Performance and CGO Cargo',
        icon: Plane,
        gradient: 'from-cyan-500 via-cyan-600 to-teal-600',
        hoverShadow: 'hover:shadow-cyan-500/25',
        divisionLabel: 'UQ, HT, OP, OT & OS Division',
    },
    {
        code: 'OS',
        name: 'Service Analytics Monitoring',
        description: 'Services Reports',
        icon: Shield,
        gradient: 'from-emerald-500 via-emerald-600 to-teal-600',
        hoverShadow: 'hover:shadow-emerald-500/25',
        divisionLabel: 'OCS Division',
    },
    {
        code: 'HT',
        name: 'Performance Evaluation Monitoring',
        description: 'Quality Assessment Monitoring and Service Recovery',
        icon: GraduationCap,
        gradient: 'from-sky-500 via-blue-600 to-indigo-600',
        hoverShadow: 'hover:shadow-sky-500/25',
        divisionLabel: '',
    },
    {
        code: 'DOCUMENTS',
        name: 'Circulars & Materials',
        description: 'All documents uploaded by the analyst team, across every branch',
        icon: BookOpen,
        gradient: 'from-violet-500 via-purple-600 to-fuchsia-600',
        hoverShadow: 'hover:shadow-violet-500/25',
        divisionLabel: 'All Branches',
        href: '/dashboard/eskalasi/documents',
    },
];

const COMING_SOON_DIVISIONS = new Set(['OS', 'HT', 'DOCUMENTS']);

export default function DivisionSelectPage() {
    const [error, setError] = useState<string | null>(null);
    const [switchingCode, setSwitchingCode] = useState<string | null>(null);
    const [comingSoonCode, setComingSoonCode] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        divisionCards.forEach((card) => {
            if (!COMING_SOON_DIVISIONS.has(card.code)) {
                router.prefetch(card.href ?? `/dashboard/${card.code.toLowerCase()}`);
            }
        });
    }, [router]);

    const handleSelectDivision = async (code: string) => {
        try {
            setError(null);
            setSwitchingCode(code);

            const res = await fetch('/api/auth/switch-division', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ divisionCode: code }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data?.error || `Failed to switch to Division ${code}`);
            }

            const redirectPath = data?.redirectPath || `/dashboard/${code.toLowerCase()}`;
            router.replace(redirectPath);
            router.refresh();
        } catch (err) {
            console.error('Failed to switch division:', err);
            setError(err instanceof Error ? err.message : 'Failed to switch division account');
            setSwitchingCode(null);
        }
    };

    const handleCardClick = (code: string) => {
        if (COMING_SOON_DIVISIONS.has(code)) {
            setError(null);
            setComingSoonCode(code);
            return;
        }

        const card = divisionCards.find((item) => item.code === code);
        if (card?.href) {
            router.push(card.href);
            return;
        }

        void handleSelectDivision(code);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex flex-col">
            <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-10 md:mb-14"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-600 text-sm font-medium mb-4">
                        <Layers className="w-4 h-4" />
                        Division Escalation Center
                    </div>
                    <h1 className="text-3xl md:text-5xl font-display font-extrabold text-gray-900 tracking-tight mb-3">
                        Select Division
                    </h1>
                    <p className="text-gray-500 text-base md:text-lg max-w-md mx-auto">
                        Select the division you want to access to view reports and dashboards
                    </p>
                </motion.div>

                <div className="w-full max-w-4xl">
                    {error && (
                        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        {divisionCards.map((card, index) => {
                            const Icon = card.icon;
                            const isSwitching = switchingCode === card.code;
                            return (
                                <motion.button
                                    key={card.code}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    onClick={() => handleCardClick(card.code)}
                                    disabled={Boolean(switchingCode) || Boolean(comingSoonCode)}
                                    className={`
                                        relative group overflow-hidden
                                        bg-white rounded-2xl md:rounded-3xl
                                        border border-gray-100 shadow-sm
                                        p-6 md:p-8 text-left
                                        transition-all duration-300
                                        hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1
                                        disabled:opacity-60 disabled:hover:scale-100 disabled:hover:translate-y-0
                                        ${card.hoverShadow}
                                    `}
                                >
                                    <div className={`
                                        absolute inset-0 opacity-0 group-hover:opacity-5
                                        bg-gradient-to-br ${card.gradient}
                                        transition-opacity duration-300
                                    `} />

                                    <div className="relative z-10">
                                        <div className={`
                                            inline-flex items-center justify-center
                                            w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl mb-4
                                            bg-gradient-to-br ${card.gradient}
                                            shadow-lg
                                        `}>
                                            <Icon className="w-6 h-6 md:w-7 md:h-7 text-white" />
                                        </div>

                                        <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                                            {card.name}
                                            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all" />
                                        </h3>

                                        <p className="text-sm text-gray-500">
                                            {card.description}
                                        </p>

                                        {card.divisionLabel ? (
                                            <div className="mt-4 pt-4 border-t border-gray-100">
                                                <span className={`
                                                    inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold
                                                    bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent
                                                `}>
                                                    {isSwitching ? 'Opening...' : card.divisionLabel}
                                                </span>
                                            </div>
                                        ) : null}
                                    </div>
                                </motion.button>
                            );
                        })}
                        <motion.button
                            key="signout"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: divisionCards.length * 0.1 }}
                            onClick={logoutWithPwaCleanup}
                            className={`
                                relative group overflow-hidden
                                bg-white rounded-2xl md:rounded-3xl
                                border border-gray-100 shadow-sm
                                p-6 md:p-8 text-left
                                transition-all duration-300
                                hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1
                                hover:shadow-rose-500/25
                            `}
                        >
                            <div className={`
                                absolute inset-0 opacity-0 group-hover:opacity-5
                                bg-gradient-to-br from-rose-500 via-red-600 to-orange-600
                                transition-opacity duration-300
                            `} />
                            <div className="relative z-10">
                                <div className={`
                                    inline-flex items-center justify-center
                                    w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl mb-4
                                    bg-gradient-to-br from-rose-500 via-red-600 to-orange-600
                                    shadow-lg
                                `}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 md:w-7 md:h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                                </div>
                                <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                                    Sign Out
                                </h3>
                                <p className="text-sm text-gray-500">
                                    Sign out of your account
                                </p>
                            </div>
                        </motion.button>
                    </div>
                </div>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="mt-10 text-sm text-gray-400"
                >
                    Click a division card to continue
                </motion.p>
            </div>

            {comingSoonCode ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
                        <h2 className="text-xl font-bold text-slate-900">Coming Soon</h2>
                        <p className="mt-2 text-sm text-slate-500">
                            {divisionCards.find((card) => card.code === comingSoonCode)?.name ?? 'This feature'} is not yet available.
                        </p>

                        <div className="mt-6 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setComingSoonCode(null)}
                                className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
