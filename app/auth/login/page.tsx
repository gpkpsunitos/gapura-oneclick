/**
 * @file
 * Halaman login utama dengan shell server ringan untuk mempercepat render awal.
 * Server Component — delegates all interactivity to LoginForm via dynamic().
 * LoginForm is split off the critical-path bundle via dynamic() to improve FCP.
 */

import Image from 'next/image';
import LoginFormLoader from '@/components/auth/LoginFormLoader';

export default function LoginPage() {
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
                            backgroundImage: 'radial-gradient(circle at 25% 25%, white 2px, transparent 2px)',
                            backgroundSize: '50px 50px',
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
                        style={{ width: 'auto', height: 'auto' }}
                        priority
                    />
                </div>

                <div className="relative z-10 mt-6">
                    <div className="grid grid-cols-2 grid-rows-2 gap-3 w-full h-56 xl:h-72">
                        <div className="relative col-span-1 row-span-2 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/20">
                            <Image
                                src="/front-page-image2.jpg"
                                alt="Aktivitas operasional Gapura"
                                fill
                                sizes="(max-width: 1023px) 0px, 28vw"
                                className="object-cover"
                                quality={80}
                                priority
                                loading="eager"
                            />
                        </div>

                        <div className="relative rounded-2xl overflow-hidden shadow-xl ring-1 ring-white/20">
                            <Image
                                src="/front-image-2.svg"
                                alt="Visual operasional Gapura"
                                fill
                                sizes="(max-width: 1023px) 0px, 18vw"
                                className="object-cover"
                            />
                        </div>

                        <div className="relative rounded-2xl overflow-hidden shadow-xl ring-1 ring-white/20">
                            <Image
                                src="/front-image-3.svg"
                                alt="Visual layanan Gapura"
                                fill
                                sizes="(max-width: 1023px) 0px, 18vw"
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
                        Integrated system for reporting, tracking, and resolving aviation operational irregularities.
                    </p>
                </div>

                <div className="relative z-10 text-white/60 text-xs xl:text-sm">
                    © 2025 Gapura Angkasa. All rights reserved.
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center px-4 py-5 sm:p-6 md:p-8">
                <div className="w-full max-w-md">
                    <div className="mb-5 rounded-[28px] border border-emerald-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(236,253,245,0.96))] px-4 sm:px-5 py-6 shadow-[0_10px_30px_rgba(16,185,129,0.08)] lg:hidden">
                        <Image
                            src="/logo.png"
                            alt="Gapura"
                            width={200}
                            height={75}
                            className="object-contain w-[132px] h-auto"
                        />
                        <div className="mt-5">
                            <h1 className="text-[1.9rem] font-bold tracking-[-0.04em] text-slate-900">Welcome Back</h1>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                Sign in to OneClick for irregularity reporting and follow-up actions.
                            </p>
                        </div>
                    </div>

                    <div className="mb-6 hidden lg:block sm:mb-8">
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Welcome Back</h1>
                        <p className="text-gray-500 mt-1.5 sm:mt-2 text-sm sm:text-base">Sign in to your OneClick platform</p>
                    </div>

                    <LoginFormLoader />
                </div>
            </div>
        </div>
    );
}
