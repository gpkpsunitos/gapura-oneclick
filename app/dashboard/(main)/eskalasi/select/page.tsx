'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
    Plane, Shield, Wrench, Gauge, GraduationCap, 
    ArrowRight, Layers
} from 'lucide-react';
import { DIVISIONS } from '@/lib/constants/divisions';

const divisionCards = [
    {
        code: 'OP',
        name: 'Operasi',
        description: 'Laporan operasional penerbangan',
        icon: Plane,
        gradient: 'from-cyan-500 via-cyan-600 to-teal-600',
        hoverShadow: 'hover:shadow-cyan-500/25',
    },
    {
        code: 'OS',
        name: 'Monitoring',
        description: 'Laporan layanan & monitoring',
        icon: Shield,
        gradient: 'from-emerald-500 via-emerald-600 to-teal-600',
        hoverShadow: 'hover:shadow-emerald-500/25',
    },
    {
        code: 'OT',
        name: 'Teknik (GSE)',
        description: 'Laporan peralatan & GSE',
        icon: Wrench,
        gradient: 'from-amber-500 via-amber-600 to-orange-600',
        hoverShadow: 'hover:shadow-amber-500/25',
    },
    {
        code: 'UQ',
        name: 'Quality',
        description: 'Laporan kualitas & keselamatan',
        icon: Gauge,
        gradient: 'from-pink-500 via-pink-600 to-rose-600',
        hoverShadow: 'hover:shadow-pink-500/25',
    },
    {
        code: 'HT',
        name: 'Training',
        description: 'Laporan pelatihan & pengembangan',
        icon: GraduationCap,
        gradient: 'from-sky-500 via-blue-600 to-indigo-600',
        hoverShadow: 'hover:shadow-sky-500/25',
    },
];

export default function DivisionSelectPage() {
    const router = useRouter();

    const handleSelectDivision = (code: string) => {
        router.push(`/dashboard/${code.toLowerCase()}`);
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        {divisionCards.map((card, index) => {
                            const Icon = card.icon;
                            return (
                                <motion.button
                                    key={card.code}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    onClick={() => handleSelectDivision(card.code)}
                                    className={`
                                        relative group overflow-hidden
                                        bg-white rounded-2xl md:rounded-3xl
                                        border border-gray-100 shadow-sm
                                        p-6 md:p-8 text-left
                                        transition-all duration-300
                                        hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1
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

                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                            <span className={`
                                                inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold
                                                bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent
                                            `}>
                                                Divisi {card.code}
                                            </span>
                                        </div>
                                    </div>
                                </motion.button>
                            );
                        })}
                        <motion.button
                            key="signout"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: divisionCards.length * 0.1 }}
                            onClick={async () => {
                                const { logoutWithPwaCleanup } = await import('@/lib/pwa/logout');
                                await logoutWithPwaCleanup();
                            }}
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
        </div>
    );
}
