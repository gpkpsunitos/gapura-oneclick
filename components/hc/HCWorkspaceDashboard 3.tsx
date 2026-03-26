'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, CalendarDays, FileStack, Users } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import type { DivisionDocument, HCLeaveRecord } from '@/types';

export function HCWorkspaceDashboard() {
    const [leaveRecords, setLeaveRecords] = useState<HCLeaveRecord[]>([]);
    const [documents, setDocuments] = useState<DivisionDocument[]>([]);

    useEffect(() => {
        const load = async () => {
            try {
                const [leaveRes, docRes] = await Promise.all([
                    fetch('/api/hc/leave-records', { cache: 'no-store' }),
                    fetch('/api/division-documents?division=HC', { cache: 'no-store' }),
                ]);

                if (leaveRes.ok) {
                    const data = await leaveRes.json();
                    setLeaveRecords(Array.isArray(data) ? data : []);
                }
                if (docRes.ok) {
                    const data = await docRes.json();
                    setDocuments(Array.isArray(data) ? data : []);
                }
            } catch (error) {
                console.error('[HCWorkspaceDashboard] Failed to load dashboard:', error);
            }
        };

        load();
    }, []);

    const thisMonthCount = useMemo(() => {
        const today = new Date();
        const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        return leaveRecords.filter((record) => record.start_date.startsWith(currentMonth) || record.end_date.startsWith(currentMonth)).length;
    }, [leaveRecords]);

    const activeTodayCount = useMemo(() => {
        const today = new Date();
        const currentDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        return leaveRecords.filter((record) => record.start_date <= currentDate && record.end_date >= currentDate).length;
    }, [leaveRecords]);

    const latestMaterials = useMemo(() => {
        return documents
            .filter((document) => document.category === 'MATERI_SOSIALISASI')
            .slice(0, 4);
    }, [documents]);

    return (
        <div className="min-h-screen p-4 md:p-6">
            <div className="mx-auto max-w-7xl space-y-6">
                <GlassCard className="overflow-hidden bg-gradient-to-br from-violet-50 via-white to-fuchsia-50">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="space-y-3">
                            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-violet-700">
                                <Users className="h-4 w-4" />
                                Human Capital
                            </div>
                            <div>
                                <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)] md:text-4xl">
                                    Operasional HC di OneKlik
                                </h1>
                                <p className="mt-3 max-w-3xl text-sm text-[var(--text-secondary)] md:text-base">
                                    Pantau cuti, edaran, dan materi HC.
                                </p>
                            </div>
                        </div>
                    </div>
                </GlassCard>

                <div className="grid gap-4 md:grid-cols-3">
                    <GlassCard className="bg-gradient-to-br from-violet-50 via-white to-white">
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-700">Rekap Cuti</p>
                        <p className="mt-3 text-3xl font-black text-[var(--text-primary)]">{leaveRecords.length}</p>
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">{thisMonthCount} aktif bulan ini</p>
                    </GlassCard>
                    <GlassCard className="bg-gradient-to-br from-sky-50 via-white to-white">
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-700">Sedang Off Hari Ini</p>
                        <p className="mt-3 text-3xl font-black text-[var(--text-primary)]">{activeTodayCount}</p>
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">Lihat PIC / PH</p>
                    </GlassCard>
                    <GlassCard className="bg-gradient-to-br from-emerald-50 via-white to-white">
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">Edaran & Materi</p>
                        <p className="mt-3 text-3xl font-black text-[var(--text-primary)]">{documents.length}</p>
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">{latestMaterials.length} materi terbaru</p>
                    </GlassCard>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    <Link href="/dashboard/hc/leave">
                        <GlassCard className="h-full border-violet-100 bg-white transition hover:border-violet-300">
                            <div className="flex h-full flex-col">
                                <CalendarDays className="h-8 w-8 text-violet-600" />
                                <h2 className="mt-5 text-xl font-black text-[var(--text-primary)]">Monitoring Cuti</h2>
                                <p className="mt-2 flex-1 text-sm text-[var(--text-secondary)]">
                                    Pantau cuti, PIC / PH, dan e-letter.
                                </p>
                                <div className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-violet-700">
                                    Buka
                                    <ArrowRight className="h-4 w-4" />
                                </div>
                            </div>
                        </GlassCard>
                    </Link>

                    <Link href="/dashboard/hc/library">
                        <GlassCard className="h-full border-sky-100 bg-white transition hover:border-sky-300">
                            <div className="flex h-full flex-col">
                                <BookOpen className="h-8 w-8 text-sky-600" />
                                <h2 className="mt-5 text-xl font-black text-[var(--text-primary)]">Edaran HC</h2>
                                <p className="mt-2 flex-1 text-sm text-[var(--text-secondary)]">
                                    Tambah dan sebar edaran HC.
                                </p>
                                <div className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-sky-700">
                                    Buka
                                    <ArrowRight className="h-4 w-4" />
                                </div>
                            </div>
                        </GlassCard>
                    </Link>

                    <Link href="/dashboard/hc/library">
                        <GlassCard className="h-full border-emerald-100 bg-white transition hover:border-emerald-300">
                            <div className="flex h-full flex-col">
                                <FileStack className="h-8 w-8 text-emerald-600" />
                                <h2 className="mt-5 text-xl font-black text-[var(--text-primary)]">Materi Sosialisasi</h2>
                                <p className="mt-2 flex-1 text-sm text-[var(--text-secondary)]">
                                    Upload materi dan atur audience.
                                </p>
                                <div className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-emerald-700">
                                    Buka
                                    <ArrowRight className="h-4 w-4" />
                                </div>
                            </div>
                        </GlassCard>
                    </Link>
                </div>

                <GlassCard>
                    <h2 className="text-xl font-black text-[var(--text-primary)]">Materi Terbaru</h2>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {latestMaterials.map((material) => (
                            <div key={material.id} className="rounded-2xl border border-[var(--surface-4)] bg-white px-4 py-4">
                                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">Materi Sosialisasi</p>
                                <p className="mt-2 text-lg font-black text-[var(--text-primary)]">{material.title}</p>
                                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                                    {material.description || 'Siap dibuka'}
                                </p>
                                {material.meeting_title && (
                                    <p className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                                        {material.meeting_title}
                                    </p>
                                )}
                                {material.audience_label && (
                                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                                        Audience: {material.audience_label}
                                    </p>
                                )}
                            </div>
                        ))}
                        {latestMaterials.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-[var(--surface-4)] px-4 py-8 text-center text-sm text-[var(--text-secondary)] md:col-span-2">
                                Belum ada materi.
                            </div>
                        )}
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}
