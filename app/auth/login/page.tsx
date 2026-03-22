'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            let data: any = null;
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('application/json')) {
                data = await res.json();
            } else {
                const text = await res.text();
                data = { error: text?.slice(0, 200) || 'Kesalahan tak diketahui' };
            }

            if (!res.ok) {
                throw new Error(data.error || 'Login gagal');
            }

            const roleRedirects: Record<string, string> = {
                SUPER_ADMIN: '/dashboard/admin',
                DIVISI_ESKALASI: '/dashboard/eskalasi/select',
                DIVISI_OS: '/dashboard/os',
                DIVISI_OT: '/dashboard/ot',
                DIVISI_OP: '/dashboard/op',
                DIVISI_UQ: '/dashboard/uq',
                DIVISI_HC: '/dashboard/hc',
                DIVISI_HT: '/dashboard/ht',
                ANALYST: '/dashboard/analyst',
                MANAGER_CABANG: '/dashboard/employee',
                STAFF_CABANG: '/dashboard/employee',
                CABANG: '/dashboard/employee',
                PARTNER_OS: '/dashboard/os',
                PARTNER_OT: '/dashboard/ot',
                PARTNER_OP: '/dashboard/op',
                PARTNER_UQ: '/dashboard/uq',
                PARTNER_HC: '/dashboard/hc',
                PARTNER_HT: '/dashboard/ht',
            };
            
            const normalizedRole = data.role ? String(data.role).trim().toUpperCase() : '';
            const targetPath = roleRedirects[normalizedRole] || '/dashboard/employee';
            
            router.push(targetPath);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Login gagal');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] flex flex-col lg:flex-row relative overflow-hidden bg-slate-50">
            <div 
                className="hidden lg:flex lg:w-1/2 flex-col justify-between p-8 xl:p-12 relative"
                style={{ background: 'linear-gradient(145deg, #059669, #10b981, #34d399)' }}
            >
                <div className="absolute inset-0 opacity-10">
                    <div 
                        className="absolute inset-0"
                        style={{
                            backgroundImage: `radial-gradient(circle at 25% 25%, white 2px, transparent 2px)`,
                            backgroundSize: '50px 50px'
                        }}
                    />
                </div>

                <div className="relative z-10">
                    <Image
                        src="/logo.png"
                        alt="Gapura"
                        width={240}
                        height={90}
                        className="object-contain brightness-0 invert"
                        priority
                    />
                </div>

                <div className="relative z-10 mt-6">
                    <div className="grid grid-cols-2 grid-rows-2 gap-3 w-full h-56 xl:h-72">
                        <div className="relative col-span-1 row-span-2 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/20">
                            <Image
                                src="/front-page-image2.jpg"
                                alt="Gapura"
                                fill
                                sizes="(max-width: 1024px) 100vw, 50vw"
                                className="object-cover"
                                priority
                            />
                        </div>
                        <div className="relative rounded-2xl overflow-hidden shadow-xl ring-1 ring-white/20">
                            <Image
                                src="/front-image-2.svg"
                                alt="Gapura"
                                fill
                                sizes="(max-width: 1024px) 100vw, 25vw"
                                className="object-cover"
                            />
                        </div>
                        <div className="relative rounded-2xl overflow-hidden shadow-xl ring-1 ring-white/20">
                            <Image
                                src="/front-image-3.svg"
                                alt="Gapura"
                                fill
                                sizes="(max-width: 1024px) 100vw, 25vw"
                                className="object-cover"
                            />
                        </div>
                    </div>
                </div>

                <div className="relative z-10 space-y-4 xl:space-y-6">
                    <h1 className="text-2xl xl:text-4xl font-bold text-white leading-tight">
                        <em>&quot;One Click&quot;</em> Irregularity Report
                    </h1>
                    <p className="text-white/80 text-base xl:text-lg max-w-md">
                        Sistem Pelaporan Terintegrasi adalah Platform digital untuk pelaporan, pelacakan, dan penyelesaian masalah operasional penerbangan.
                    </p>
                </div>

                <div className="relative z-10 text-white/60 text-xs xl:text-sm">
                    © 2025 Gapura Angkasa. All rights reserved.
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
                <div className="w-full max-w-md">
                    <div className="lg:hidden text-center mb-6 sm:mb-8">
                        <Image
                            src="/logo.png"
                            alt="Gapura"
                            width={200}
                            height={75}
                            className="mx-auto object-contain w-[140px] sm:w-[180px] md:w-[200px] h-auto"
                            priority
                        />
                    </div>

                    <div className="mb-6 sm:mb-8">
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Selamat Datang</h1>
                        <p className="text-gray-500 mt-1.5 sm:mt-2 text-sm sm:text-base">Masuk ke dashboard operasional Anda</p>
                    </div>

                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-5 sm:p-6 md:p-8">
                        {error && (
                            <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-red-50 border border-red-100 flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                                <p className="text-xs sm:text-sm font-medium text-red-600">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                                    <input
                                        type="email"
                                        required
                                        className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 text-sm transition-all focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white"
                                        placeholder="email@perusahaan.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                                    <input
                                        type="password"
                                        required
                                        className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 text-sm transition-all focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 sm:py-4 rounded-lg sm:rounded-xl font-semibold text-white text-sm transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2"
                                style={{
                                    background: loading ? '#9ca3af' : 'linear-gradient(135deg, #059669, #10b981)',
                                    boxShadow: loading ? 'none' : '0 4px 14px -2px rgba(16, 185, 129, 0.4)',
                                }}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                                        Memproses...
                                    </>
                                ) : (
                                    <>
                                        Masuk
                                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-3 sm:mt-4">
                            <Link
                                href="/auth/public-report"
                                className="w-full inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-emerald-200 text-emerald-700 text-xs sm:text-sm font-semibold hover:bg-emerald-50 active:bg-emerald-100 transition-colors"
                            >
                                Quick Access: Laporkan Irregularity
                            </Link>
                        </div>

                        <div className="mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-gray-100 text-center">
                            <p className="text-xs sm:text-sm text-gray-500">
                                Belum punya akun?{' '}
                                <Link href="/auth/register" className="font-semibold text-emerald-600 hover:text-emerald-700 active:text-emerald-800 transition-colors">
                                    Daftar Sekarang
                                </Link>
                            </p>
                        </div>
                    </div>

                    <p className="lg:hidden text-center text-[10px] sm:text-xs text-gray-400 mt-6 sm:mt-8">
                        © 2025 Gapura Angkasa. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}
