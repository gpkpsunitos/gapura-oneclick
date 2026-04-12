'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { logoutWithPwaCleanup } from '@/lib/pwa/logout';
import { 
    Plane, Shield, GraduationCap, Users,
    ArrowRight, Eye, EyeOff, Layers
} from 'lucide-react';

const divisionCards = [
    {
        code: 'OP',
        name: 'Service Operational Monitoring',
        description: 'Laporan operasional penerbangan',
        icon: Plane,
        gradient: 'from-cyan-500 via-cyan-600 to-teal-600',
        hoverShadow: 'hover:shadow-cyan-500/25',
        divisionLabel: 'Divisi UQ, OP, OT, HT',
    },
    {
        code: 'OS',
        name: 'Service Analytics Monitoring',
        description: 'Laporan layanan & monitoring',
        icon: Shield,
        gradient: 'from-emerald-500 via-emerald-600 to-teal-600',
        hoverShadow: 'hover:shadow-emerald-500/25',
        divisionLabel: 'Divisi OCS & OS',
    },
    {
        code: 'HC',
        name: 'Human Capital',
        description: 'Akses workspace HC dan dokumen internal',
        icon: Users,
        gradient: 'from-violet-500 via-fuchsia-600 to-rose-500',
        hoverShadow: 'hover:shadow-violet-500/25',
        divisionLabel: 'Divisi HC',
    },
    {
        code: 'HT',
        name: 'Performance evaluation',
        description: 'Laporan pelatihan & pengembangan',
        icon: GraduationCap,
        gradient: 'from-sky-500 via-blue-600 to-indigo-600',
        hoverShadow: 'hover:shadow-sky-500/25',
        divisionLabel: '',
    },
];

const DIVISION_PASSWORDS: Partial<Record<string, string>> = {
    OS: 'Unitosnew2026',
    HC: 'Unithcnew2026!',
};

export default function DivisionSelectPage() {
    const [error, setError] = useState<string | null>(null);
    const [switchingCode, setSwitchingCode] = useState<string | null>(null);
    const [passwordPromptCode, setPasswordPromptCode] = useState<string | null>(null);
    const [passwordValue, setPasswordValue] = useState('');
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [comingSoonCode, setComingSoonCode] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        divisionCards.forEach((card) => {
            if (card.code !== 'HT') {
                router.prefetch(`/dashboard/${card.code.toLowerCase()}`);
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
                throw new Error(data?.error || `Gagal switch ke Divisi ${code}`);
            }

            const redirectPath = data?.redirectPath || `/dashboard/${code.toLowerCase()}`;
            router.replace(redirectPath);
            router.refresh();
        } catch (err) {
            console.error('Failed to switch division:', err);
            setError(err instanceof Error ? err.message : 'Gagal switch ke akun divisi');
            setSwitchingCode(null);
        }
    };

    const handleCardClick = (code: string) => {
        if (code === 'HT') {
            setError(null);
            setComingSoonCode(code);
            return;
        }

        if (DIVISION_PASSWORDS[code]) {
            setError(null);
            setPasswordValue('');
            setPasswordError(null);
            setShowPassword(false);
            setPasswordPromptCode(code);
            return;
        }

        void handleSelectDivision(code);
    };

    const handlePasswordSubmit = async () => {
        if (!passwordPromptCode) return;

        const expectedPassword = DIVISION_PASSWORDS[passwordPromptCode];
        if (!expectedPassword) {
            setPasswordPromptCode(null);
            return;
        }

        if (passwordValue !== expectedPassword) {
            setPasswordError('Password salah.');
            return;
        }

        setPasswordError(null);
        setPasswordPromptCode(null);
        setPasswordValue('');
        setShowPassword(false);
        await handleSelectDivision(passwordPromptCode);
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
                        Pusat Eskalasi Divisi
                    </div>
                    <h1 className="text-3xl md:text-5xl font-display font-extrabold text-gray-900 tracking-tight mb-3">
                        Pilih Divisi
                    </h1>
                    <p className="text-gray-500 text-base md:text-lg max-w-md mx-auto">
                        Pilih divisi yang ingin Anda akses untuk melihat laporan dan dashboard
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
                                    disabled={Boolean(switchingCode) || Boolean(passwordPromptCode) || Boolean(comingSoonCode)}
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
                                                    {isSwitching ? 'Membuka...' : card.divisionLabel}
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
                                    Keluar dari sesi akun
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
                    Klik kartu divisi untuk melanjutkan
                </motion.p>
            </div>

            {passwordPromptCode ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
                        <h2 className="text-xl font-bold text-slate-900">Masukkan Password</h2>
                        <p className="mt-2 text-sm text-slate-500">
                            Password diperlukan untuk mengakses{' '}
                            {divisionCards.find((card) => card.code === passwordPromptCode)?.name ?? 'divisi ini'}.
                        </p>

                        <div className="relative mt-5">
                            <label htmlFor="division-password" className="mb-2 block text-sm font-medium text-slate-700">
                                Password
                            </label>
                            <input
                                id="division-password"
                                type={showPassword ? 'text' : 'password'}
                                value={passwordValue}
                                onChange={(event) => {
                                    setPasswordValue(event.target.value);
                                    if (passwordError) setPasswordError(null);
                                }}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        void handlePasswordSubmit();
                                    }
                                }}
                                autoFocus
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70"
                                placeholder="Masukkan password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((current) => !current)}
                                className="absolute right-3 top-[46px] inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                                aria-pressed={showPassword}
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                            {passwordError ? (
                                <p className="mt-2 text-sm font-medium text-rose-600">{passwordError}</p>
                            ) : null}
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setPasswordPromptCode(null);
                                    setPasswordValue('');
                                    setPasswordError(null);
                                    setShowPassword(false);
                                }}
                                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={() => void handlePasswordSubmit()}
                                className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                                Lanjutkan
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {comingSoonCode ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
                        <h2 className="text-xl font-bold text-slate-900">Coming Soon</h2>
                        <p className="mt-2 text-sm text-slate-500">
                            {divisionCards.find((card) => card.code === comingSoonCode)?.name ?? 'Fitur ini'} belum tersedia.
                        </p>

                        <div className="mt-6 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setComingSoonCode(null)}
                                className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
