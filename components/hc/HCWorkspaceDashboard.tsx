'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ExternalLink, FileText } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { DivisionDocument, HCLeaveRecord } from '@/types';

interface LeaveActionState {
    id: string | null;
    action: 'approve' | 'reject' | null;
}

function getCurrentDateKey() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function getCurrentMonthKey() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
}

function formatShortDate(value?: string | null) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date);
}

function formatLeaveDate(value?: string | null) {
    if (!value) return '-';
    const [year, month, day] = String(value).split('-').map(Number);
    if (!year || !month || !day) return String(value);

    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(year, month - 1, day));
}

function formatLeavePeriod(startDate: string, endDate: string) {
    return `${formatLeaveDate(startDate)} s.d. ${formatLeaveDate(endDate)}`;
}

function isRecordActiveToday(record: HCLeaveRecord, currentDate: string) {
    return record.start_date <= currentDate && record.end_date >= currentDate;
}

function isRecordInMonth(record: HCLeaveRecord, month: string) {
    const monthStart = new Date(`${month}-01T00:00:00Z`);
    if (Number.isNaN(monthStart.getTime())) return false;
    const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0, 23, 59, 59));
    const recordStart = new Date(`${record.start_date}T00:00:00Z`);
    const recordEnd = new Date(`${record.end_date}T23:59:59Z`);
    return recordStart <= monthEnd && recordEnd >= monthStart;
}

function isWithinLastWeek(value?: string | null) {
    if (!value) return false;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;

    const diff = Date.now() - date.getTime();
    return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
}

function getDocumentHref(document: DivisionDocument) {
    return document.source_type === 'upload' ? document.file_url : document.external_url;
}

function canPreviewDocument(document: DivisionDocument) {
    const href = getDocumentHref(document);
    if (!href) return false;

    const descriptor = `${document.mime_type || ''} ${document.file_name || ''} ${href}`.toLowerCase();
    return descriptor.includes('pdf');
}

function getMaterialAudienceLabel(document: DivisionDocument) {
    if (document.audience_label?.trim()) return document.audience_label.trim();
    if (document.visibility_scope === 'all') return 'Semua audience';
    if (document.visibility_scope === 'stations') return 'Cabang tertentu';
    if (document.visibility_scope === 'roles') return 'Role tertentu';
    return 'Audience terarah';
}

function upsertLeaveRecord(records: HCLeaveRecord[], nextRecord: HCLeaveRecord | null) {
    if (!nextRecord) return records;
    return records.map((record) => (record.id === nextRecord.id ? nextRecord : record));
}

export function HCWorkspaceDashboard() {
    const [leaveRecords, setLeaveRecords] = useState<HCLeaveRecord[]>([]);
    const [documents, setDocuments] = useState<DivisionDocument[]>([]);
    const [leaveActionState, setLeaveActionState] = useState<LeaveActionState>({ id: null, action: null });
    const [selectedMaterial, setSelectedMaterial] = useState<DivisionDocument | null>(null);

    const load = useCallback(async () => {
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
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            load();
        }, 60000);

        return () => window.clearInterval(intervalId);
    }, [load]);

    const thisMonthCount = useMemo(() => {
        const currentMonth = getCurrentMonthKey();
        return leaveRecords.filter((record) => isRecordInMonth(record, currentMonth)).length;
    }, [leaveRecords]);

    const pendingApprovals = useMemo(() => {
        return [...leaveRecords]
            .filter((record) => record.submission_status === 'PENDING')
            .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
    }, [leaveRecords]);

    const activeTodayRecords = useMemo(() => {
        const currentDate = getCurrentDateKey();
        return leaveRecords.filter((record) => isRecordActiveToday(record, currentDate));
    }, [leaveRecords]);

    const activeTodayMissingPicCount = useMemo(() => {
        return activeTodayRecords.filter((record) => !record.pic_name?.trim()).length;
    }, [activeTodayRecords]);

    const materialDocuments = useMemo(() => {
        return documents.filter((document) => document.category === 'MATERI_SOSIALISASI');
    }, [documents]);

    const recentMaterialCount = useMemo(() => {
        return materialDocuments.filter((document) => isWithinLastWeek(document.created_at)).length;
    }, [materialDocuments]);

    const latestMaterials = useMemo(() => {
        return materialDocuments.slice(0, 5);
    }, [materialDocuments]);

    const selectedMaterialHref = selectedMaterial ? getDocumentHref(selectedMaterial) : null;
    const selectedMaterialCanPreview = selectedMaterial ? canPreviewDocument(selectedMaterial) : false;

    const handleReview = useCallback(
        async (record: HCLeaveRecord, nextStatus: 'APPROVED' | 'REJECTED', reviewNotes?: string | null) => {
            setLeaveActionState({
                id: record.id,
                action: nextStatus === 'APPROVED' ? 'approve' : 'reject',
            });

            try {
                const response = await fetch(`/api/hc/leave-records/${record.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        submission_status: nextStatus,
                        review_notes: reviewNotes || null,
                    }),
                });

                if (!response.ok) {
                    const error = await response.json().catch(() => ({}));
                    throw new Error(error.error || 'Gagal memperbarui pengajuan cuti');
                }

                const updatedRecord = await response.json().catch(() => null);
                setLeaveRecords((current) => upsertLeaveRecord(current, updatedRecord));
            } catch (error) {
                window.alert(error instanceof Error ? error.message : 'Gagal memperbarui pengajuan cuti');
            } finally {
                setLeaveActionState({ id: null, action: null });
            }
        },
        []
    );

    return (
        <Sheet open={Boolean(selectedMaterial)} onOpenChange={(open) => !open && setSelectedMaterial(null)}>
            <div className="min-h-screen bg-white px-6 py-6 text-[14px]" style={{ fontFamily: 'Inter, var(--font-body), sans-serif' }}>
                <div className="mx-auto max-w-[1100px] space-y-6">
                    <header className="flex items-center justify-between">
                        <h1 className="text-[24px] font-bold tracking-[-0.02em] text-[#111111]">HC Workspace</h1>
                    </header>

                    {pendingApprovals.length > 0 ? (
                        <div
                            className="flex items-center gap-3 rounded-xl border border-[#FDE68A] bg-[#FEF3C7] px-4 py-3"
                            style={{ borderLeftWidth: 4, borderLeftColor: '#F59E0B' }}
                        >
                            <AlertTriangle className="h-4 w-4 shrink-0 text-[#F59E0B]" />
                            <p className="text-[14px] text-[#92400E]">
                                {pendingApprovals.length} pengajuan cuti menunggu persetujuan HC{' '}
                                <Link href="/dashboard/hc/leave?submission_status=PENDING" className="font-medium text-[#009688] hover:underline">
                                    → Lihat sekarang
                                </Link>
                            </p>
                        </div>
                    ) : null}

                    <div className="grid gap-4 lg:grid-cols-3">
                        <Link
                            href={`/dashboard/hc/leave?month=${getCurrentMonthKey()}`}
                            className="rounded-xl border border-[#E5E7EB] bg-white p-5 transition hover:border-[#009688]/40 hover:shadow-sm"
                        >
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">Cuti Aktif Bulan Ini</p>
                            <p className="mt-3 text-[32px] font-bold leading-none text-[#111111]">{thisMonthCount}</p>
                            <p className={`mt-3 text-[12px] ${pendingApprovals.length > 0 ? 'text-[#F59E0B]' : 'text-[#6B7280]'}`}>
                                {pendingApprovals.length} menunggu approval
                            </p>
                        </Link>

                        <Link
                            href="/dashboard/hc/leave?activity_scope=active_today"
                            className="rounded-xl border border-[#E5E7EB] bg-white p-5 transition hover:border-[#009688]/40 hover:shadow-sm"
                        >
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">Sedang Off Hari Ini</p>
                            <p className="mt-3 text-[32px] font-bold leading-none text-[#111111]">{activeTodayRecords.length}</p>
                            <p className={`mt-3 text-[12px] ${activeTodayMissingPicCount > 0 ? 'text-[#F59E0B]' : 'text-[#6B7280]'}`}>
                                {activeTodayMissingPicCount > 0 ? `${activeTodayMissingPicCount} tanpa PIC tercatat` : 'Semua ada PIC'}
                            </p>
                        </Link>

                        <Link
                            href="/dashboard/hc/library"
                            className="rounded-xl border border-[#E5E7EB] bg-white p-5 transition hover:border-[#009688]/40 hover:shadow-sm"
                        >
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">Edaran & Materi</p>
                            <p className="mt-3 text-[32px] font-bold leading-none text-[#111111]">{documents.length}</p>
                            <p className={`mt-3 text-[12px] ${recentMaterialCount > 0 ? 'text-[#009688]' : 'text-[#6B7280]'}`}>
                                {recentMaterialCount > 0 ? `${recentMaterialCount} materi terbaru minggu ini` : 'Tidak ada yang baru'}
                            </p>
                        </Link>
                    </div>

                    <section className="space-y-3">
                        <h2 className="text-[16px] font-semibold text-[#111111]">Perlu Disetujui</h2>
                        <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
                            {pendingApprovals.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full table-fixed">
                                        <thead className="bg-[#F9FAFB]">
                                            <tr>
                                                <th className="w-[260px] px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Pegawai</th>
                                                <th className="w-[220px] px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Periode</th>
                                                <th className="w-[220px] px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Cabang</th>
                                                <th className="w-[220px] px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">PIC / PH</th>
                                                <th className="w-[200px] px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pendingApprovals.map((record) => {
                                                const isProcessing = leaveActionState.id === record.id;

                                                return (
                                                    <tr key={record.id} className="border-t border-[#E5E7EB]">
                                                        <td className="px-5 py-4 align-top">
                                                            <p className="text-[14px] font-medium text-[#111111]">{record.employee_name}</p>
                                                            <p className="mt-1 text-[12px] text-[#6B7280]">{record.leave_type}</p>
                                                        </td>
                                                        <td className="px-5 py-4 align-top text-[14px] text-[#111111]">
                                                            {formatLeavePeriod(record.start_date, record.end_date)}
                                                        </td>
                                                        <td className="px-5 py-4 align-top text-[14px] text-[#111111]">
                                                            {record.station?.name || '-'}
                                                        </td>
                                                        <td className="px-5 py-4 align-top text-[14px] text-[#111111]">
                                                            {record.pic_name?.trim() || 'Belum tercatat'}
                                                        </td>
                                                        <td className="px-5 py-4 align-top">
                                                            <div className="flex flex-wrap gap-2">
                                                                <button
                                                                    type="button"
                                                                    disabled={isProcessing}
                                                                    onClick={() => {
                                                                        if (!window.confirm(`Setujui pengajuan cuti ${record.employee_name}?`)) return;
                                                                        void handleReview(record, 'APPROVED');
                                                                    }}
                                                                    className="inline-flex h-8 items-center rounded-md bg-[#009688] px-3 text-[12px] font-medium text-white transition hover:bg-[#00796B] disabled:opacity-60"
                                                                >
                                                                    {isProcessing && leaveActionState.action === 'approve' ? 'Memproses...' : 'Setujui'}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    disabled={isProcessing}
                                                                    onClick={() => {
                                                                        const reviewNotes = window.prompt('Catatan penolakan (opsional):', '');
                                                                        if (reviewNotes === null) return;
                                                                        void handleReview(record, 'REJECTED', reviewNotes);
                                                                    }}
                                                                    className="inline-flex h-8 items-center rounded-md border border-[#FECACA] bg-white px-3 text-[12px] font-medium text-[#DC2626] transition hover:bg-[#FEF2F2] disabled:opacity-60"
                                                                >
                                                                    {isProcessing && leaveActionState.action === 'reject' ? 'Memproses...' : 'Tolak'}
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="px-6 py-10 text-center text-[14px] text-[#6B7280]">
                                    ✓ Tidak ada pengajuan yang menunggu persetujuan.
                                </div>
                            )}
                        </div>
                    </section>

                    {latestMaterials.length > 0 ? (
                        <section className="space-y-3">
                            <div className="flex items-center justify-between gap-4">
                                <h2 className="text-[16px] font-semibold text-[#111111]">Materi Terbaru</h2>
                                {materialDocuments.length > 5 ? (
                                    <Link href="/dashboard/hc/library" className="text-[14px] font-medium text-[#009688] hover:underline">
                                        Lihat semua →
                                    </Link>
                                ) : null}
                            </div>

                            <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
                                <div className="divide-y divide-[#E5E7EB]">
                                    {latestMaterials.map((material) => (
                                        <button
                                            key={material.id}
                                            type="button"
                                            onClick={() => setSelectedMaterial(material)}
                                            className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-[#F9FAFB]"
                                        >
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F9FAFB] text-[#6B7280]">
                                                <FileText className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-[14px] font-medium text-[#111111]">{material.title}</p>
                                                <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-[#6B7280]">
                                                    <span>{formatShortDate(material.created_at)}</span>
                                                    <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2 py-0.5">
                                                        {getMaterialAudienceLabel(material)}
                                                    </span>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </section>
                    ) : null}
                </div>
            </div>

            <SheetContent
                side="right"
                className="w-full max-w-[720px] overflow-y-auto border-l border-[#E5E7EB] bg-white p-0 sm:max-w-[720px]"
                style={{ fontFamily: 'Inter, var(--font-body), sans-serif' }}
            >
                {selectedMaterial ? (
                    <div className="flex min-h-full flex-col">
                        <SheetHeader className="border-b border-[#E5E7EB] px-6 py-6 pr-16">
                            <SheetTitle className="text-left text-[20px] font-semibold leading-7 text-[#111827]">
                                {selectedMaterial.title}
                            </SheetTitle>
                            <div className="mt-4 flex flex-wrap gap-2 text-[12px] text-[#6B7280]">
                                <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1">
                                    Dibagikan {formatShortDate(selectedMaterial.created_at)}
                                </span>
                                <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1">
                                    {getMaterialAudienceLabel(selectedMaterial)}
                                </span>
                            </div>
                            {selectedMaterialHref ? (
                                <div className="mt-5">
                                    <a
                                        href={selectedMaterialHref}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex h-10 items-center gap-2 rounded-md bg-[#009688] px-4 text-[14px] font-medium text-white transition-colors hover:bg-[#00796B]"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                        Buka file
                                    </a>
                                </div>
                            ) : null}
                        </SheetHeader>

                        <div className="flex-1 bg-[#F9FAFB] p-6">
                            {selectedMaterial.description ? (
                                <p className="mb-4 text-[14px] leading-6 text-[#4B5563]">{selectedMaterial.description}</p>
                            ) : null}

                            {selectedMaterialHref && selectedMaterialCanPreview ? (
                                <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
                                    <iframe
                                        src={selectedMaterialHref}
                                        title={selectedMaterial.title}
                                        className="h-[72vh] w-full"
                                    />
                                </div>
                            ) : (
                                <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-[#E5E7EB] bg-white px-6 text-center">
                                    <div>
                                        <FileText className="mx-auto h-10 w-10 text-[#9CA3AF]" />
                                        <p className="mt-4 text-[16px] font-medium text-[#374151]">Preview belum tersedia</p>
                                        <p className="mt-2 text-[14px] text-[#6B7280]">
                                            {selectedMaterialHref
                                                ? 'Buka file asli untuk melihat dokumen lengkap.'
                                                : 'Dokumen ini belum memiliki file atau tautan yang dapat dibuka.'}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : null}
            </SheetContent>
        </Sheet>
    );
}
