'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    CheckCircle2,
    Building2,
    CalendarDays,
    ChevronDown,
    ChevronUp,
    ClipboardList,
    Clock3,
    Download,
    FilePenLine,
    FileText,
    Filter,
    Mail,
    Plus,
    RefreshCw,
    Search,
    ShieldCheck,
    Sparkles,
    Trash2,
    UserRoundCheck,
    Users,
    XCircle,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/hooks/use-auth';
import type { HCLeaveLetterStatus, HCLeaveRecord, HCLeaveSubmissionStatus } from '@/types';

type WorkspaceMode = 'hc' | 'branch';
type LeavePresentation = 'staff' | 'manager' | 'hc';

interface StationOption {
    id: string;
    code: string;
    name: string;
}

interface LeaveFormState {
    employee_name: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    station_id: string;
    division_name: string;
    unit_name: string;
    pic_name: string;
    pic_email: string;
    pic_phone: string;
    e_letter_status: HCLeaveLetterStatus;
    notes: string;
}

interface LeaveFormCardProps {
    busy: boolean;
    editing: HCLeaveRecord | null;
    form: LeaveFormState;
    stations: StationOption[];
    showStationSelect: boolean;
    title: string;
    eyebrow: string;
    description: string;
    submitLabel: string;
    showCloseButton?: boolean;
    onChange: (field: keyof LeaveFormState, value: string) => void;
    onSubmit: (event: React.FormEvent) => void;
    onReset: () => void;
}

interface LeaveFilters {
    month: string;
    station_id: string;
    leave_type: string;
    submission_status: '' | HCLeaveSubmissionStatus;
    search: string;
}

interface LeaveFiltersCardProps {
    filters: LeaveFilters;
    leaveTypes: string[];
    stations: StationOption[];
    showStationFilter: boolean;
    onChange: (field: keyof LeaveFilters, value: string) => void;
}

interface LeaveRecordsTableProps {
    records: HCLeaveRecord[];
    canModifyRecord: (record: HCLeaveRecord) => boolean;
    canReviewRecord: (record: HCLeaveRecord) => boolean;
    onEdit: (record: HCLeaveRecord) => void;
    onRemove: (record: HCLeaveRecord) => void;
    onApprove: (record: HCLeaveRecord) => void;
    onReject: (record: HCLeaveRecord) => void;
    emptyTitle: string;
    emptyDescription: string;
}

interface StaffFormSectionProps {
    title: string;
    description?: string;
    children: React.ReactNode;
    icon: React.ElementType;
    tone: 'violet' | 'sky' | 'emerald' | 'amber';
}

interface LeaveReviewState {
    open: boolean;
    record: HCLeaveRecord | null;
    nextStatus: HCLeaveSubmissionStatus;
    notes: string;
}

interface BulkReviewState {
    open: boolean;
    ids: string[];
    count: number;
    nextStatus: HCLeaveSubmissionStatus;
    notes: string;
}

interface HCFeedbackItem {
    id: string;
    tone: 'success' | 'error';
    title: string;
    message?: string;
}

interface DeleteState {
    open: boolean;
    record: HCLeaveRecord | null;
}

const LETTER_STATUS_OPTIONS: Array<{ value: HCLeaveLetterStatus; label: string }> = [
    { value: 'BELUM_ADA', label: 'Belum Ada' },
    { value: 'PENGAJUAN', label: 'Pengajuan' },
    { value: 'TERBIT', label: 'Terbit' },
];

const SUBMISSION_STATUS_OPTIONS: Array<{ value: HCLeaveSubmissionStatus; label: string }> = [
    { value: 'PENDING', label: 'Menunggu HC' },
    { value: 'APPROVED', label: 'Disetujui HC' },
    { value: 'REJECTED', label: 'Ditolak HC' },
];

function emptyForm(stationId?: string | null): LeaveFormState {
    return {
        employee_name: '',
        leave_type: '',
        start_date: '',
        end_date: '',
        station_id: stationId || '',
        division_name: '',
        unit_name: '',
        pic_name: '',
        pic_email: '',
        pic_phone: '',
        e_letter_status: 'BELUM_ADA',
        notes: '',
    };
}

function getStatusLabel(status: HCLeaveLetterStatus) {
    return LETTER_STATUS_OPTIONS.find((option) => option.value === status)?.label || status;
}

function getSubmissionStatusLabel(status: HCLeaveSubmissionStatus | string | null | undefined) {
    return SUBMISSION_STATUS_OPTIONS.find((option) => option.value === status)?.label || 'Menunggu HC';
}

function getSubmissionStatusClasses(status: HCLeaveSubmissionStatus | string | null | undefined) {
    switch (status) {
        case 'APPROVED':
            return 'bg-emerald-50 text-emerald-700 border-emerald-100';
        case 'REJECTED':
            return 'bg-rose-50 text-rose-700 border-rose-100';
        default:
            return 'bg-amber-50 text-amber-700 border-amber-100';
    }
}

function getSubmissionStatusIcon(status: HCLeaveSubmissionStatus | string | null | undefined) {
    switch (status) {
        case 'APPROVED':
            return CheckCircle2;
        case 'REJECTED':
            return XCircle;
        default:
            return Clock3;
    }
}

function countActiveToday(records: HCLeaveRecord[]) {
    const today = new Date();
    const currentDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return records.filter((record) => record.start_date <= currentDate && record.end_date >= currentDate).length;
}

function formatLeaveDate(date: string) {
    if (!date) return '-';
    const [year, month, day] = date.split('-').map(Number);
    if (!year || !month || !day) return date;

    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(year, month - 1, day));
}

function formatLeavePeriod(startDate: string, endDate: string) {
    return `${formatLeaveDate(startDate)} s.d. ${formatLeaveDate(endDate)}`;
}

function getStaffTone(tone: StaffFormSectionProps['tone']) {
    switch (tone) {
        case 'sky':
            return {
                panelClass: 'bg-gradient-to-br from-sky-50 via-white to-white border-sky-100',
                iconClass: 'bg-sky-100 text-sky-700',
                eyebrowClass: 'text-sky-700',
            };
        case 'emerald':
            return {
                panelClass: 'bg-gradient-to-br from-emerald-50 via-white to-white border-emerald-100',
                iconClass: 'bg-emerald-100 text-emerald-700',
                eyebrowClass: 'text-emerald-700',
            };
        case 'amber':
            return {
                panelClass: 'bg-gradient-to-br from-amber-50 via-white to-white border-amber-100',
                iconClass: 'bg-amber-100 text-amber-700',
                eyebrowClass: 'text-amber-700',
            };
        default:
            return {
                panelClass: 'bg-gradient-to-br from-violet-50 via-white to-white border-violet-100',
                iconClass: 'bg-violet-100 text-violet-700',
                eyebrowClass: 'text-violet-700',
            };
    }
}

const formFieldClass =
    'w-full rounded-2xl border border-[var(--surface-4)] bg-white px-4 py-3.5 text-sm text-[var(--text-primary)] shadow-[inset_0_1px_0_oklch(1_0_0_/_0.32)] transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-[var(--brand-primary)] focus:bg-white focus:outline-none';

function StatCard({
    label,
    value,
    description,
    toneClass,
    icon: Icon,
}: {
    label: string;
    value: number;
    description?: string;
    toneClass: string;
    icon: React.ElementType;
}) {
    return (
        <GlassCard hover={false} className={`overflow-hidden border ${toneClass}`}>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em]">{label}</p>
                    <p className="mt-3 text-3xl font-black text-[var(--text-primary)]">{value}</p>
                    {description ? <p className="mt-2 text-sm text-[var(--text-secondary)]">{description}</p> : null}
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/90 shadow-sm">
                    <Icon className="h-5 w-5" />
                </div>
            </div>
        </GlassCard>
    );
}

function HCSubmissionQuickFilters({
    current,
    counts,
    onChange,
}: {
    current: '' | HCLeaveSubmissionStatus;
    counts: Record<HCLeaveSubmissionStatus, number>;
    onChange: (value: '' | HCLeaveSubmissionStatus) => void;
}) {
    const items: Array<{
        value: '' | HCLeaveSubmissionStatus;
        label: string;
        count: number;
        className: string;
    }> = [
        {
            value: '',
            label: 'Semua',
            count: counts.PENDING + counts.APPROVED + counts.REJECTED,
            className: 'border-[var(--surface-4)] text-[var(--text-secondary)] hover:border-violet-200 hover:text-violet-700',
        },
        {
            value: 'PENDING',
            label: 'Menunggu HC',
            count: counts.PENDING,
            className: 'border-amber-100 text-amber-700 hover:border-amber-200',
        },
        {
            value: 'APPROVED',
            label: 'Disetujui',
            count: counts.APPROVED,
            className: 'border-emerald-100 text-emerald-700 hover:border-emerald-200',
        },
        {
            value: 'REJECTED',
            label: 'Ditolak',
            count: counts.REJECTED,
            className: 'border-rose-100 text-rose-700 hover:border-rose-200',
        },
    ];

    return (
        <GlassCard hover={false} className="border border-[var(--surface-4)] bg-white">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Filter Status HC</p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">Fokuskan monitoring ke status pengajuan yang ingin direview.</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-1)] px-3 py-1.5 text-[11px] font-bold text-[var(--text-secondary)]">
                    <Clock3 className="h-3.5 w-3.5" />
                    {current ? getSubmissionStatusLabel(current) : 'Semua status'}
                </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {items.map((item) => {
                    const isActive = current === item.value;
                    return (
                        <button
                            key={item.label}
                            type="button"
                            onClick={() => onChange(item.value)}
                            className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                                isActive
                                    ? 'border-[var(--brand-primary)] bg-violet-50 shadow-sm shadow-violet-100/60'
                                    : `bg-white ${item.className}`
                            }`}
                        >
                            <p className={`text-xs font-bold uppercase tracking-[0.18em] ${isActive ? 'text-violet-700' : 'text-[var(--text-muted)]'}`}>
                                {item.label}
                            </p>
                            <p className={`mt-2 text-2xl font-black ${isActive ? 'text-violet-700' : 'text-[var(--text-primary)]'}`}>{item.count}</p>
                        </button>
                    );
                })}
            </div>
        </GlassCard>
    );
}

function HCLeaveReviewModal({
    open,
    busy,
    record,
    nextStatus,
    notes,
    onClose,
    onNotesChange,
    onSubmit,
}: {
    open: boolean;
    busy: boolean;
    record: HCLeaveRecord | null;
    nextStatus: HCLeaveSubmissionStatus;
    notes: string;
    onClose: () => void;
    onNotesChange: (value: string) => void;
    onSubmit: () => void;
}) {
    if (!open || !record) return null;

    const isReject = nextStatus === 'REJECTED';
    const toneClass = isReject
        ? 'border-rose-100 bg-gradient-to-br from-rose-50 via-white to-white'
        : 'border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white';
    const iconClass = isReject
        ? 'bg-rose-100 text-rose-700'
        : 'bg-emerald-100 text-emerald-700';
    const Icon = isReject ? XCircle : CheckCircle2;

    return (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm md:items-center md:p-4">
            <div className="absolute inset-0" onClick={busy ? undefined : onClose} />
            <GlassCard
                hover={false}
                className={`relative z-10 flex max-h-[92dvh] w-full max-w-2xl flex-col rounded-t-[32px] border shadow-2xl md:max-h-[88vh] md:rounded-[32px] ${toneClass}`}
            >
                <div className="border-b border-white/70 px-5 pb-4 pt-5 md:px-6 md:pb-5 md:pt-6">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <div className={`mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconClass}`}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Review HC</p>
                                <h2 className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                                    {isReject ? 'Tolak Pengajuan' : 'Setujui Pengajuan'}
                                </h2>
                                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                                    {record.employee_name} · {record.leave_type} · {formatLeavePeriod(record.start_date, record.end_date)}
                                </p>
                            </div>
                        </div>
                        <Button type="button" variant="outline" className="hidden rounded-2xl bg-white/90 md:inline-flex" onClick={onClose} disabled={busy}>
                            Tutup
                        </Button>
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-5 md:px-6">
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-2xl border border-[var(--surface-4)] bg-white/80 p-4">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Cabang</p>
                            <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                                {record.station ? `${record.station.code} - ${record.station.name}` : '-'}
                            </p>
                        </div>
                        <div className="rounded-2xl border border-[var(--surface-4)] bg-white/80 p-4">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">PIC / PH</p>
                            <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{record.pic_name || '-'}</p>
                        </div>
                        <div className="rounded-2xl border border-[var(--surface-4)] bg-white/80 p-4">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">E-Letter</p>
                            <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{getStatusLabel(record.e_letter_status)}</p>
                        </div>
                    </div>

                    <div className="mt-6">
                        <FieldLabel
                            label={isReject ? 'Alasan Penolakan' : 'Catatan HC'}
                            required={isReject}
                            hint={isReject ? 'Wajib diisi' : 'Opsional'}
                        />
                        <textarea
                            value={notes}
                            onChange={(event) => onNotesChange(event.target.value)}
                            placeholder={isReject ? 'Jelaskan alasan pengajuan ditolak.' : 'Tambahkan catatan approval bila perlu.'}
                            rows={6}
                            className={formFieldClass}
                        />
                    </div>

                    <div className="mt-4 rounded-2xl border border-[var(--surface-4)] bg-white/80 px-4 py-3">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Status Tujuan</p>
                        <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                            {isReject ? 'Pengajuan akan ditandai Ditolak HC.' : 'Pengajuan akan ditandai Disetujui HC.'}
                        </p>
                    </div>
                </div>

                <div className="sticky bottom-0 border-t border-white/70 bg-white/90 px-5 py-4 backdrop-blur md:px-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                        <Button type="button" variant="outline" className="h-11 rounded-2xl px-5" onClick={onClose} disabled={busy}>
                            Batal
                        </Button>
                        <Button
                            type="button"
                            className={`h-11 rounded-2xl px-5 font-bold text-white ${
                                isReject ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                            }`}
                            onClick={onSubmit}
                            disabled={busy || (isReject && !notes.trim())}
                        >
                            {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                            {isReject ? 'Tolak Pengajuan' : 'Setujui Pengajuan'}
                        </Button>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
}

function HCBulkReviewModal({
    open,
    busy,
    count,
    nextStatus,
    notes,
    onClose,
    onNotesChange,
    onSubmit,
}: {
    open: boolean;
    busy: boolean;
    count: number;
    nextStatus: HCLeaveSubmissionStatus;
    notes: string;
    onClose: () => void;
    onNotesChange: (value: string) => void;
    onSubmit: () => void;
}) {
    if (!open || count <= 0) return null;
    const isReject = nextStatus === 'REJECTED';

    return (
        <div className="fixed inset-0 z-[72] flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm md:items-center md:p-4">
            <div className="absolute inset-0" onClick={busy ? undefined : onClose} />
            <GlassCard
                hover={false}
                className={`relative z-10 flex max-h-[92dvh] w-full max-w-xl flex-col rounded-t-[32px] border shadow-2xl md:max-h-[88vh] md:rounded-[32px] ${
                    isReject
                        ? 'border-rose-100 bg-gradient-to-br from-rose-50 via-white to-white'
                        : 'border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white'
                }`}
            >
                <div className="border-b border-white/70 px-5 pb-4 pt-5 md:px-6 md:pb-5 md:pt-6">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <div className={`mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                                isReject ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                                {isReject ? <XCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Bulk Review HC</p>
                                <h2 className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                                    {isReject ? 'Tolak Pengajuan Terfilter' : 'Setujui Pengajuan Terfilter'}
                                </h2>
                                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                                    {count} pengajuan pending yang sedang terfilter akan ditandai{' '}
                                    <strong>{isReject ? 'Ditolak HC' : 'Disetujui HC'}</strong>.
                                </p>
                            </div>
                        </div>
                        <Button type="button" variant="outline" className="hidden rounded-2xl bg-white/90 md:inline-flex" onClick={onClose} disabled={busy}>
                            Tutup
                        </Button>
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-5 md:px-6">
                    <div className="rounded-2xl border border-[var(--surface-4)] bg-white/80 px-4 py-3">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                            {isReject ? 'Alasan Penolakan Massal' : 'Catatan HC'}
                        </p>
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">
                            {isReject
                                ? 'Wajib. Alasan ini akan ditempel ke semua pengajuan pending yang sedang ditolak massal.'
                                : 'Opsional. Catatan ini akan ditempel ke semua pengajuan pending yang sedang diproses massal.'}
                        </p>
                    </div>

                    <div className="mt-4">
                        <FieldLabel
                            label={isReject ? 'Alasan Penolakan' : 'Catatan Approval'}
                            required={isReject}
                            hint={isReject ? 'Wajib' : 'Opsional'}
                        />
                        <textarea
                            value={notes}
                            onChange={(event) => onNotesChange(event.target.value)}
                            placeholder={isReject ? 'Jelaskan alasan penolakan massal.' : 'Tambahkan catatan approval massal bila perlu.'}
                            rows={5}
                            className={formFieldClass}
                        />
                    </div>
                </div>

                <div className="sticky bottom-0 border-t border-white/70 bg-white/90 px-5 py-4 backdrop-blur md:px-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                        <Button type="button" variant="outline" className="h-11 rounded-2xl px-5" onClick={onClose} disabled={busy}>
                            Batal
                        </Button>
                        <Button
                            type="button"
                            className={`h-11 rounded-2xl px-5 font-bold text-white ${
                                isReject ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                            }`}
                            onClick={onSubmit}
                            disabled={busy || (isReject && !notes.trim())}
                        >
                            {busy ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : isReject ? (
                                <XCircle className="h-4 w-4" />
                            ) : (
                                <CheckCircle2 className="h-4 w-4" />
                            )}
                            {isReject ? `Tolak ${count} Pengajuan` : `Setujui ${count} Pengajuan`}
                        </Button>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
}

function HCFeedbackStack({
    items,
    onDismiss,
}: {
    items: HCFeedbackItem[];
    onDismiss: (id: string) => void;
}) {
    if (!items.length) return null;

    return (
        <div className="pointer-events-none fixed bottom-4 right-4 z-[80] flex w-[min(92vw,420px)] flex-col gap-3">
            {items.map((item) => {
                const isError = item.tone === 'error';
                const Icon = isError ? XCircle : CheckCircle2;

                return (
                    <div
                        key={item.id}
                        className={`pointer-events-auto rounded-[24px] border shadow-xl ${
                            isError
                                ? 'border-rose-100 bg-gradient-to-br from-rose-50 via-white to-white'
                                : 'border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white'
                        }`}
                    >
                        <div className="flex items-start gap-3 p-4">
                            <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                                isError ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                                <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-black text-[var(--text-primary)]">{item.title}</p>
                                {item.message ? (
                                    <p className="mt-1 text-sm text-[var(--text-secondary)]">{item.message}</p>
                                ) : null}
                            </div>
                            <button
                                type="button"
                                onClick={() => onDismiss(item.id)}
                                className="rounded-xl px-2 py-1 text-xs font-bold text-[var(--text-muted)] transition hover:bg-white/80 hover:text-[var(--text-primary)]"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function HCDeleteConfirmModal({
    open,
    busy,
    record,
    onClose,
    onConfirm,
}: {
    open: boolean;
    busy: boolean;
    record: HCLeaveRecord | null;
    onClose: () => void;
    onConfirm: () => void;
}) {
    if (!open || !record) return null;

    return (
        <div className="fixed inset-0 z-[71] flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm md:items-center md:p-4">
            <div className="absolute inset-0" onClick={busy ? undefined : onClose} />
            <GlassCard
                hover={false}
                className="relative z-10 flex w-full max-w-xl flex-col rounded-t-[32px] border border-rose-100 bg-gradient-to-br from-rose-50 via-white to-white shadow-2xl md:rounded-[32px]"
            >
                <div className="border-b border-white/70 px-5 pb-4 pt-5 md:px-6 md:pb-5 md:pt-6">
                    <div className="flex items-start gap-4">
                        <div className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
                            <Trash2 className="h-5 w-5" />
                        </div>
                            <div>
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Arsipkan Data</p>
                            <h2 className="mt-2 text-2xl font-black text-[var(--text-primary)]">Konfirmasi Arsip</h2>
                            <p className="mt-2 text-sm text-[var(--text-secondary)]">
                                Data cuti ini akan keluar dari monitoring aktif HC dan backup aktif, tanpa dihapus permanen dari database.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="px-5 pb-5 pt-5 md:px-6">
                    <div className="rounded-2xl border border-[var(--surface-4)] bg-white/80 p-4">
                        <p className="text-lg font-black text-[var(--text-primary)]">{record.employee_name}</p>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">{record.leave_type}</p>
                        <div className="mt-3 space-y-1 text-sm text-[var(--text-secondary)]">
                            <p><strong>Periode:</strong> {formatLeavePeriod(record.start_date, record.end_date)}</p>
                            <p><strong>Cabang:</strong> {record.station ? `${record.station.code} - ${record.station.name}` : '-'}</p>
                            <p><strong>Status HC:</strong> {getSubmissionStatusLabel(record.submission_status)}</p>
                        </div>
                    </div>
                </div>

                <div className="border-t border-white/70 bg-white/90 px-5 py-4 backdrop-blur md:px-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                        <Button type="button" variant="outline" className="h-11 rounded-2xl px-5" onClick={onClose} disabled={busy}>
                            Batal
                        </Button>
                        <Button
                            type="button"
                            className="h-11 rounded-2xl bg-rose-600 px-5 font-bold text-white hover:bg-rose-700"
                            onClick={onConfirm}
                            disabled={busy}
                        >
                            {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            Arsipkan Data
                        </Button>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
}

function StaffFormSection({ title, description, children, icon: Icon, tone }: StaffFormSectionProps) {
    const styles = getStaffTone(tone);

    return (
        <div className={`rounded-[28px] border p-4 md:p-5 ${styles.panelClass}`}>
            <div className="flex items-start gap-4">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${styles.iconClass}`}>
                    <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                    <p className={`text-xs font-bold uppercase tracking-[0.18em] ${styles.eyebrowClass}`}>{title}</p>
                    {description ? <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p> : null}
                </div>
            </div>
            <div className="mt-5">
                <h3 className="sr-only">{title}</h3>
                {children}
            </div>
        </div>
    );
}

function FieldLabel({
    label,
    required = false,
    hint,
}: {
    label: string;
    required?: boolean;
    hint?: string;
}) {
    return (
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <span>{label}</span>
            {required ? <span className="text-violet-600">*</span> : null}
            {hint ? <span className="text-xs font-medium text-[var(--text-muted)]">{hint}</span> : null}
        </div>
    );
}

function StaffLeaveFormCard({
    busy,
    editing,
    form,
    onChange,
    onSubmit,
    onReset,
}: {
    busy: boolean;
    editing: HCLeaveRecord | null;
    form: LeaveFormState;
    onChange: (field: keyof LeaveFormState, value: string) => void;
    onSubmit: (event: React.FormEvent) => void;
    onReset: () => void;
}) {
    const [detailsOpen, setDetailsOpen] = useState(false);
    const hasDetailsValue = Boolean(
        editing || form.pic_email || form.pic_phone || form.notes || form.e_letter_status !== 'BELUM_ADA'
    );
    const isDetailsOpen = detailsOpen || hasDetailsValue;

    return (
        <GlassCard hover={false} className="overflow-hidden border border-[var(--surface-4)] bg-gradient-to-br from-white via-violet-50/20 to-sky-50/30">
            <div className="pointer-events-none absolute -right-16 top-0 h-44 w-44 rounded-full bg-[var(--brand-primary)]/10 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 left-0 h-36 w-36 rounded-full bg-[oklch(0.7_0.16_160_/_0.12)] blur-3xl" />

            <div className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-600">
                        {editing ? 'Edit Pengajuan' : 'Form Pengajuan'}
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-[var(--text-primary)] md:text-3xl">
                        {editing ? `Perbarui ${editing.employee_name}` : 'Kirim Pengajuan ke HC'}
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm text-[var(--text-secondary)] md:text-base">
                        Isi data inti lebih dulu. HC dan manager cabang akan langsung melihat siapa yang cuti dan siapa PIC / PH penggantinya.
                    </p>
                </div>

                <div className="rounded-[28px] border border-sky-100 bg-white/85 p-4 shadow-sm shadow-sky-100/40">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Yang Dicek HC</p>
                    <div className="mt-4 space-y-3">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                                <ShieldCheck className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-[var(--text-primary)]">Masuk real-time</p>
                                <p className="text-xs text-[var(--text-secondary)]">Pengajuan tampil langsung di monitoring HC.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                                <UserRoundCheck className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-[var(--text-primary)]">PIC / PH wajib</p>
                                <p className="text-xs text-[var(--text-secondary)]">Isi nama pengganti agar monitoring operasional tetap jelas.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                                <Sparkles className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-[var(--text-primary)]">E-letter bisa menyusul</p>
                                <p className="text-xs text-[var(--text-secondary)]">Tetap kirim sekarang walau e-letter belum terbit.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <form className="space-y-5" onSubmit={onSubmit}>
                <StaffFormSection
                    icon={CalendarDays}
                    tone="violet"
                    title="Data Cuti"
                    description="Isi siapa yang cuti, jenis cuti, dan periode cutinya."
                >
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <FieldLabel label="Nama Pegawai" required />
                            <input
                                value={form.employee_name}
                                onChange={(event) => onChange('employee_name', event.target.value)}
                                placeholder="Masukkan nama pegawai"
                                className={formFieldClass}
                                required
                            />
                        </div>
                        <div>
                            <FieldLabel label="Jenis Cuti / Izin" required />
                            <input
                                value={form.leave_type}
                                onChange={(event) => onChange('leave_type', event.target.value)}
                                placeholder="Contoh: cuti tahunan, izin sakit"
                                className={formFieldClass}
                                required
                            />
                        </div>
                        <div>
                            <FieldLabel label="Tanggal Mulai" required />
                            <input
                                type="date"
                                value={form.start_date}
                                onChange={(event) => onChange('start_date', event.target.value)}
                                className={formFieldClass}
                                required
                            />
                        </div>
                        <div>
                            <FieldLabel label="Tanggal Selesai" required />
                            <input
                                type="date"
                                value={form.end_date}
                                onChange={(event) => onChange('end_date', event.target.value)}
                                className={formFieldClass}
                                required
                            />
                        </div>
                    </div>
                </StaffFormSection>

                <StaffFormSection
                    icon={Building2}
                    tone="sky"
                    title="Divisi & Unit"
                    description="Tambahkan unit kerja agar HC lebih cepat mengidentifikasi kebutuhan pengganti."
                >
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <FieldLabel label="Divisi" />
                            <input
                                value={form.division_name}
                                onChange={(event) => onChange('division_name', event.target.value)}
                                placeholder="Contoh: Operasional"
                                className={formFieldClass}
                            />
                        </div>
                        <div>
                            <FieldLabel label="Unit" />
                            <input
                                value={form.unit_name}
                                onChange={(event) => onChange('unit_name', event.target.value)}
                                placeholder="Contoh: Passenger Service"
                                className={formFieldClass}
                            />
                        </div>
                    </div>
                </StaffFormSection>

                <StaffFormSection
                    icon={UserRoundCheck}
                    tone="emerald"
                    title="PIC / PH Pengganti"
                    description="HC dan manager cabang memakai data ini untuk memonitor siapa yang menggantikan."
                >
                    <div className="space-y-4">
                        <div>
                            <FieldLabel label="PIC / PH" required />
                            <input
                                value={form.pic_name}
                                onChange={(event) => onChange('pic_name', event.target.value)}
                                placeholder="Nama PIC / PH pengganti"
                                className={formFieldClass}
                                required
                            />
                        </div>

                        <div className="rounded-2xl border border-dashed border-emerald-200 bg-white/75 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold text-[var(--text-primary)]">Kontak PIC / PH</p>
                                    <p className="text-xs text-[var(--text-secondary)]">Opsional, tetapi membantu HC saat perlu follow-up cepat.</p>
                                </div>
                                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
                                    Opsional
                                </span>
                            </div>
                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <div>
                                    <FieldLabel label="Email PIC / PH" />
                                    <div className="relative">
                                        <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                                        <input
                                            type="email"
                                            value={form.pic_email}
                                            onChange={(event) => onChange('pic_email', event.target.value)}
                                            placeholder="nama@email.com"
                                            className={`${formFieldClass} pl-11`}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <FieldLabel label="Nomor HP PIC / PH" />
                                    <input
                                        value={form.pic_phone}
                                        onChange={(event) => onChange('pic_phone', event.target.value)}
                                        placeholder="08xxxxxxxxxx"
                                        className={formFieldClass}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </StaffFormSection>

                <div className="rounded-[28px] border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-white p-4 md:p-5">
                    <button
                        type="button"
                        className="flex w-full items-start justify-between gap-4 text-left"
                        onClick={() => setDetailsOpen((current) => !current)}
                    >
                        <div className="flex items-start gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                                <FileText className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Detail Tambahan</p>
                                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                                    Isi bila e-letter belum terbit atau ada catatan operasional tambahan.
                                </p>
                            </div>
                        </div>
                        <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-white text-amber-700">
                            {isDetailsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                    </button>

                    {isDetailsOpen ? (
                        <div className="mt-5 space-y-4 border-t border-amber-100 pt-5">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <FieldLabel label="Status E-Letter" />
                                    <select
                                        value={form.e_letter_status}
                                        onChange={(event) => onChange('e_letter_status', event.target.value)}
                                        className={formFieldClass}
                                    >
                                        {LETTER_STATUS_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <FieldLabel label="Catatan" hint="Opsional" />
                                <textarea
                                    value={form.notes}
                                    onChange={(event) => onChange('notes', event.target.value)}
                                    placeholder="Contoh: e-letter masih proses atau arahan operasional singkat"
                                    rows={3}
                                    className={formFieldClass}
                                />
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className="rounded-[28px] border border-[var(--surface-4)] bg-white/85 p-4 md:p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-semibold text-[var(--text-primary)]">Siap kirim ke HC</p>
                            <p className="mt-1 text-sm text-[var(--text-secondary)]">
                                Setelah dikirim, pengajuan langsung muncul di monitoring HC dan manager cabang.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <Button
                                type="submit"
                                disabled={busy}
                                className="h-11 rounded-2xl bg-[var(--brand-primary)] px-5 font-bold text-white hover:bg-[var(--brand-primary)]/90"
                            >
                                {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FilePenLine className="h-4 w-4" />}
                                {editing ? 'Simpan Perubahan' : 'Kirim ke HC'}
                            </Button>
                            <Button type="button" variant="outline" onClick={onReset} disabled={busy} className="h-11 rounded-2xl px-4">
                                {editing ? 'Batalkan Edit' : 'Reset Form'}
                            </Button>
                        </div>
                    </div>
                </div>
            </form>
        </GlassCard>
    );
}

function LeaveFormCard({
    busy,
    editing,
    form,
    stations,
    showStationSelect,
    title,
    eyebrow,
    description,
    submitLabel,
    showCloseButton = false,
    onChange,
    onSubmit,
    onReset,
}: LeaveFormCardProps) {
    return (
        <GlassCard hover={false} className="overflow-hidden border border-[var(--surface-4)] bg-gradient-to-br from-white via-violet-50/20 to-sky-50/20">
            <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-[var(--brand-primary)]/8 blur-3xl" />

            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600">{eyebrow}</p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-[var(--text-primary)]">
                        {editing ? `Perbarui ${editing.employee_name}` : title}
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm text-[var(--text-secondary)]">{description}</p>
                </div>
                {showCloseButton && (
                    <Button variant="outline" className="rounded-2xl bg-white/90" onClick={onReset}>
                        Tutup
                    </Button>
                )}
            </div>

            <form className="space-y-5" onSubmit={onSubmit}>
                <StaffFormSection
                    icon={CalendarDays}
                    tone="violet"
                    title="Data Utama"
                    description="Isi data pegawai, jenis cuti, dan periode."
                >
                    <div className={`grid gap-4 ${showStationSelect ? 'md:grid-cols-2 xl:grid-cols-3' : 'md:grid-cols-2'}`}>
                        <div>
                            <FieldLabel label="Nama Pegawai" required />
                            <input
                                value={form.employee_name}
                                onChange={(event) => onChange('employee_name', event.target.value)}
                                placeholder="Nama pegawai"
                                className={formFieldClass}
                                required
                            />
                        </div>
                        <div>
                            <FieldLabel label="Jenis Cuti / Izin" required />
                            <input
                                value={form.leave_type}
                                onChange={(event) => onChange('leave_type', event.target.value)}
                                placeholder="Jenis cuti / izin"
                                className={formFieldClass}
                                required
                            />
                        </div>
                        {showStationSelect && (
                            <div>
                                <FieldLabel label="Cabang" />
                                <select
                                    value={form.station_id}
                                    onChange={(event) => onChange('station_id', event.target.value)}
                                    className={formFieldClass}
                                >
                                    <option value="">Pilih cabang</option>
                                    {stations.map((station) => (
                                        <option key={station.id} value={station.id}>
                                            {station.code} - {station.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div>
                            <FieldLabel label="Tanggal Mulai" required />
                            <input
                                type="date"
                                value={form.start_date}
                                onChange={(event) => onChange('start_date', event.target.value)}
                                className={formFieldClass}
                                required
                            />
                        </div>
                        <div>
                            <FieldLabel label="Tanggal Selesai" required />
                            <input
                                type="date"
                                value={form.end_date}
                                onChange={(event) => onChange('end_date', event.target.value)}
                                className={formFieldClass}
                                required
                            />
                        </div>
                    </div>
                </StaffFormSection>

                <StaffFormSection
                    icon={UserRoundCheck}
                    tone="sky"
                    title="Struktur Tim"
                    description="Lengkapi divisi, unit, dan PIC / PH pengganti."
                >
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <div>
                            <FieldLabel label="Divisi" />
                            <input
                                value={form.division_name}
                                onChange={(event) => onChange('division_name', event.target.value)}
                                placeholder="Divisi"
                                className={formFieldClass}
                            />
                        </div>
                        <div>
                            <FieldLabel label="Unit" />
                            <input
                                value={form.unit_name}
                                onChange={(event) => onChange('unit_name', event.target.value)}
                                placeholder="Unit"
                                className={formFieldClass}
                            />
                        </div>
                        <div>
                            <FieldLabel label="PIC / PH" required />
                            <input
                                value={form.pic_name}
                                onChange={(event) => onChange('pic_name', event.target.value)}
                                placeholder="PIC / PH"
                                className={formFieldClass}
                                required
                            />
                        </div>
                        <div>
                            <FieldLabel label="Email PIC / PH" />
                            <input
                                type="email"
                                value={form.pic_email}
                                onChange={(event) => onChange('pic_email', event.target.value)}
                                placeholder="Email PIC / PH"
                                className={formFieldClass}
                            />
                        </div>
                        <div>
                            <FieldLabel label="Nomor HP PIC / PH" />
                            <input
                                value={form.pic_phone}
                                onChange={(event) => onChange('pic_phone', event.target.value)}
                                placeholder="Nomor HP PIC / PH"
                                className={formFieldClass}
                            />
                        </div>
                    </div>
                </StaffFormSection>

                <StaffFormSection
                    icon={FileText}
                    tone="amber"
                    title="Detail Tambahan"
                    description="Status e-letter dan catatan operasional."
                >
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <FieldLabel label="Status E-Letter" />
                            <select
                                value={form.e_letter_status}
                                onChange={(event) => onChange('e_letter_status', event.target.value)}
                                className={formFieldClass}
                            >
                                {LETTER_STATUS_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="mt-4">
                        <FieldLabel label="Catatan" />
                        <textarea
                            value={form.notes}
                            onChange={(event) => onChange('notes', event.target.value)}
                            placeholder="Catatan singkat"
                            rows={3}
                            className={formFieldClass}
                        />
                    </div>
                </StaffFormSection>

                <div className="rounded-[24px] border border-[var(--surface-4)] bg-white/90 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-[var(--text-secondary)]">
                            {editing ? 'Perubahan akan langsung memperbarui monitoring.' : 'Simpan data agar langsung masuk ke monitoring.'}
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <Button type="submit" disabled={busy} className="h-11 rounded-2xl bg-[var(--brand-primary)] px-5 font-bold text-white hover:bg-[var(--brand-primary)]/90">
                                {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FilePenLine className="h-4 w-4" />}
                                {editing ? 'Simpan Perubahan' : submitLabel}
                            </Button>
                            <Button type="button" variant="outline" onClick={onReset} disabled={busy} className="h-11 rounded-2xl px-4">
                                Reset
                            </Button>
                        </div>
                    </div>
                </div>
            </form>
        </GlassCard>
    );
}

function LeaveFiltersCard({
    filters,
    leaveTypes,
    stations,
    showStationFilter,
    onChange,
}: LeaveFiltersCardProps) {
    const activeFilterCount = [filters.month, filters.station_id, filters.leave_type, filters.submission_status, filters.search].filter(Boolean).length;

    return (
        <GlassCard hover={false} className="border border-[var(--surface-4)] bg-white">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Filter Monitoring</p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">Persempit data berdasarkan periode, cabang, jenis cuti, atau kata kunci.</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-1)] px-3 py-1.5 text-[11px] font-bold text-[var(--text-secondary)]">
                    <Filter className="h-3.5 w-3.5" />
                    {activeFilterCount} filter aktif
                </div>
            </div>

            <div className={`grid gap-4 ${showStationFilter ? 'sm:grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-2 xl:grid-cols-3'}`}>
                <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Bulan</label>
                    <input
                        type="month"
                        value={filters.month}
                        onChange={(event) => onChange('month', event.target.value)}
                        className={formFieldClass}
                    />
                </div>
                {showStationFilter && (
                    <div>
                        <label className="mb-1 block text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Cabang</label>
                        <select
                            value={filters.station_id}
                            onChange={(event) => onChange('station_id', event.target.value)}
                            className={formFieldClass}
                        >
                            <option value="">Semua Cabang</option>
                            {stations.map((station) => (
                                <option key={station.id} value={station.id}>
                                    {station.code} - {station.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Jenis Cuti / Izin</label>
                    <select
                        value={filters.leave_type}
                        onChange={(event) => onChange('leave_type', event.target.value)}
                        className={formFieldClass}
                    >
                        <option value="">Semua Jenis</option>
                        {leaveTypes.map((leaveType) => (
                            <option key={leaveType} value={leaveType}>
                                {leaveType}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Cari</label>
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                        <input
                            type="search"
                            value={filters.search}
                            onChange={(event) => onChange('search', event.target.value)}
                            placeholder="Nama, cabang, PIC..."
                            className={`${formFieldClass} pl-11`}
                        />
                    </div>
                </div>
            </div>
        </GlassCard>
    );
}

function LeaveRecordsTable({
    records,
    canModifyRecord,
    canReviewRecord,
    onEdit,
    onRemove,
    onApprove,
    onReject,
    emptyTitle,
    emptyDescription,
}: LeaveRecordsTableProps) {
    if (records.length === 0) {
        return (
            <GlassCard hover={false} className="border border-[var(--surface-4)] bg-white text-center">
                <Users className="mx-auto h-10 w-10 text-violet-400" />
                <p className="mt-4 text-lg font-bold text-[var(--text-primary)]">{emptyTitle}</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{emptyDescription}</p>
            </GlassCard>
        );
    }

    return (
        <div className="space-y-4">
            <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full overflow-hidden rounded-[28px] border border-[var(--surface-4)] bg-white text-sm">
                    <thead className="bg-[var(--surface-1)] text-left text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        <tr>
                            <th className="px-4 py-3">Pegawai</th>
                            <th className="px-4 py-3">Periode</th>
                            <th className="px-4 py-3">Cabang</th>
                            <th className="px-4 py-3">Divisi / Unit</th>
                            <th className="px-4 py-3">PIC / PH</th>
                            <th className="px-4 py-3">Status HC</th>
                            <th className="px-4 py-3">E-Letter</th>
                            <th className="px-4 py-3">Catatan</th>
                            <th className="px-4 py-3">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {records.map((record) => {
                            const SubmissionIcon = getSubmissionStatusIcon(record.submission_status);
                            const canEditRecord = canModifyRecord(record);
                            const canReview = canReviewRecord(record);

                            return (
                                <tr key={record.id} className="border-t border-[var(--surface-3)] align-top transition-colors hover:bg-[var(--surface-1)]/70">
                                    <td className="px-4 py-4">
                                        <p className="font-bold text-[var(--text-primary)]">{record.employee_name}</p>
                                        <p className="mt-1 text-xs text-[var(--text-muted)]">{record.leave_type}</p>
                                    </td>
                                    <td className="px-4 py-4 text-[var(--text-secondary)]">
                                        <p>{formatLeavePeriod(record.start_date, record.end_date)}</p>
                                    </td>
                                    <td className="px-4 py-4 text-[var(--text-secondary)]">
                                        {record.station ? `${record.station.code} - ${record.station.name}` : '-'}
                                    </td>
                                    <td className="px-4 py-4 text-[var(--text-secondary)]">
                                        <p>{record.division_name || '-'}</p>
                                        <p className="mt-1 text-xs text-[var(--text-muted)]">{record.unit_name || 'Unit belum diisi'}</p>
                                    </td>
                                    <td className="px-4 py-4 text-[var(--text-secondary)]">
                                        <p>{record.pic_name || '-'}</p>
                                        <p className="mt-1 text-xs text-[var(--text-muted)]">{record.pic_email || '-'}</p>
                                        <p className="mt-1 text-xs text-[var(--text-muted)]">{record.pic_phone || '-'}</p>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="space-y-2">
                                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${getSubmissionStatusClasses(record.submission_status)}`}>
                                                <SubmissionIcon className="h-3.5 w-3.5" />
                                                {getSubmissionStatusLabel(record.submission_status)}
                                            </span>
                                            {record.reviewed_by_name || record.reviewed_at ? (
                                                <p className="text-xs text-[var(--text-muted)]">
                                                    {record.reviewed_by_name ? `Oleh ${record.reviewed_by_name}` : 'Sudah direview'}
                                                    {record.reviewed_at ? ` • ${formatLeaveDate(record.reviewed_at.slice(0, 10))}` : ''}
                                                </p>
                                            ) : null}
                                            {record.review_notes ? (
                                                <p className="text-xs text-[var(--text-secondary)]">{record.review_notes}</p>
                                            ) : null}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                                            {getStatusLabel(record.e_letter_status)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-[var(--text-secondary)]">{record.notes || '-'}</td>
                                    <td className="px-4 py-4">
                                        {canReview || canEditRecord ? (
                                            <div className="flex min-w-[180px] flex-col gap-2">
                                                {canReview ? (
                                                    <div className="flex flex-wrap gap-2">
                                                        <Button size="sm" className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => onApprove(record)}>
                                                            <CheckCircle2 className="h-4 w-4" />
                                                            Approve
                                                        </Button>
                                                        <Button size="sm" variant="outline" className="rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-700" onClick={() => onReject(record)}>
                                                            <XCircle className="h-4 w-4" />
                                                            Reject
                                                        </Button>
                                                    </div>
                                                ) : null}
                                                {canEditRecord ? (
                                                    <div className="flex flex-wrap gap-2">
                                                        <Button size="sm" variant="outline" className="rounded-xl" onClick={() => onEdit(record)}>
                                                            <FilePenLine className="h-4 w-4" />
                                                            Edit
                                                        </Button>
                                                        <Button size="sm" variant="outline" className="rounded-xl" onClick={() => onRemove(record)}>
                                                            <Trash2 className="h-4 w-4" />
                                                            Hapus
                                                        </Button>
                                                    </div>
                                                ) : null}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-[var(--text-muted)]">Terkunci</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="grid gap-4 md:hidden">
                {records.map((record) => {
                    const SubmissionIcon = getSubmissionStatusIcon(record.submission_status);
                    const canEditRecord = canModifyRecord(record);
                    const canReview = canReviewRecord(record);

                    return (
                        <GlassCard key={record.id} hover={false} className="border border-[var(--surface-4)] bg-white">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-lg font-black text-[var(--text-primary)]">{record.employee_name}</p>
                                    <p className="mt-1 text-sm text-[var(--text-secondary)]">{record.leave_type}</p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${getSubmissionStatusClasses(record.submission_status)}`}>
                                        <SubmissionIcon className="h-3.5 w-3.5" />
                                        {getSubmissionStatusLabel(record.submission_status)}
                                    </span>
                                    <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                                        {getStatusLabel(record.e_letter_status)}
                                    </span>
                                </div>
                            </div>
                            <div className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
                                <p><strong>Periode:</strong> {formatLeavePeriod(record.start_date, record.end_date)}</p>
                                <p><strong>Cabang:</strong> {record.station ? `${record.station.code} - ${record.station.name}` : '-'}</p>
                                <p><strong>Divisi / Unit:</strong> {record.division_name || '-'} / {record.unit_name || '-'}</p>
                                <p><strong>PIC / PH:</strong> {record.pic_name || '-'} / {record.pic_phone || '-'}</p>
                                {record.reviewed_by_name || record.reviewed_at ? (
                                    <p><strong>Review HC:</strong> {record.reviewed_by_name || 'HC'}{record.reviewed_at ? ` • ${formatLeaveDate(record.reviewed_at.slice(0, 10))}` : ''}</p>
                                ) : null}
                                {record.review_notes ? <p><strong>Catatan HC:</strong> {record.review_notes}</p> : null}
                                <p><strong>Catatan:</strong> {record.notes || '-'}</p>
                            </div>
                            {(canReview || canEditRecord) && (
                                <div className="mt-4 grid gap-3">
                                    {canReview ? (
                                        <div className="grid grid-cols-2 gap-3">
                                            <Button size="sm" className="h-10 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => onApprove(record)}>
                                                <CheckCircle2 className="h-4 w-4" />
                                                Approve
                                            </Button>
                                            <Button size="sm" variant="outline" className="h-10 rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-700" onClick={() => onReject(record)}>
                                                <XCircle className="h-4 w-4" />
                                                Reject
                                            </Button>
                                        </div>
                                    ) : null}
                                    {canEditRecord ? (
                                        <div className="grid grid-cols-2 gap-3">
                                            <Button size="sm" variant="outline" className="h-10 rounded-xl" onClick={() => onEdit(record)}>
                                                <FilePenLine className="h-4 w-4" />
                                                Edit
                                            </Button>
                                            <Button size="sm" variant="outline" className="h-10 rounded-xl" onClick={() => onRemove(record)}>
                                                <Trash2 className="h-4 w-4" />
                                                Hapus
                                            </Button>
                                        </div>
                                    ) : null}
                                </div>
                            )}
                        </GlassCard>
                    );
                })}
            </div>
        </div>
    );
}

function RecentSubmissionCards({
    records,
    canModifyRecord,
    onEdit,
    onRemove,
}: {
    records: HCLeaveRecord[];
    canModifyRecord: (record: HCLeaveRecord) => boolean;
    onEdit: (record: HCLeaveRecord) => void;
    onRemove: (record: HCLeaveRecord) => void;
}) {
    const [showAll, setShowAll] = useState(false);
    const sortedRecords = useMemo(() => {
        return [...records].sort((left, right) => {
            const rightTime = new Date(right.created_at || right.start_date).getTime();
            const leftTime = new Date(left.created_at || left.start_date).getTime();
            return rightTime - leftTime;
        });
    }, [records]);
    const visibleRecords = showAll ? sortedRecords : sortedRecords.slice(0, 5);

    if (records.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-[var(--surface-4)] bg-[var(--surface-1)]/60 px-4 py-8 text-center">
                <Users className="mx-auto h-8 w-8 text-violet-400" />
                <p className="mt-3 text-base font-bold text-[var(--text-primary)]">Belum ada pengajuan.</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">Riwayat pengajuan Anda akan tampil di sini.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {visibleRecords.map((record) => (
                <div
                    key={record.id}
                    className="rounded-[24px] border border-[var(--surface-4)] bg-gradient-to-br from-white via-[var(--surface-1)] to-white p-4 shadow-sm shadow-slate-100/40"
                >
                    <div className="flex gap-4">
                        <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 sm:flex">
                            <ClipboardList className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                    <h3 className="text-lg font-black text-[var(--text-primary)]">{record.employee_name}</h3>
                                    <p className="mt-1 text-sm text-[var(--text-secondary)]">{record.leave_type}</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${getSubmissionStatusClasses(record.submission_status)}`}>
                                        {(() => {
                                            const SubmissionIcon = getSubmissionStatusIcon(record.submission_status);
                                            return <SubmissionIcon className="h-3.5 w-3.5" />;
                                        })()}
                                        {getSubmissionStatusLabel(record.submission_status)}
                                    </span>
                                    <span className="inline-flex w-fit rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                                        {getStatusLabel(record.e_letter_status)}
                                    </span>
                                </div>
                            </div>

                            <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">
                                {formatLeavePeriod(record.start_date, record.end_date)}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">
                                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
                                    PIC / PH: {record.pic_name || '-'}
                                </span>
                                {record.division_name ? (
                                    <span className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-bold text-sky-700">
                                        {record.division_name}
                                    </span>
                                ) : null}
                                {record.unit_name ? (
                                    <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-[11px] font-bold text-[var(--text-secondary)]">
                                        {record.unit_name}
                                    </span>
                                ) : null}
                            </div>

                            {record.notes ? (
                                <div className="mt-4 rounded-2xl border border-[var(--surface-4)] bg-white/80 px-4 py-3">
                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Catatan</p>
                                    <p className="mt-2 text-sm text-[var(--text-secondary)]">{record.notes}</p>
                                </div>
                            ) : null}
                            {record.review_notes ? (
                                <div className="mt-3 rounded-2xl border border-[var(--surface-4)] bg-white/80 px-4 py-3">
                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Catatan HC</p>
                                    <p className="mt-2 text-sm text-[var(--text-secondary)]">{record.review_notes}</p>
                                </div>
                            ) : null}
                            {canModifyRecord(record) && (
                                <div className="mt-4 flex flex-wrap gap-3">
                                    <Button size="sm" variant="outline" className="rounded-xl" onClick={() => onEdit(record)}>
                                        <FilePenLine className="h-4 w-4" />
                                        Edit
                                    </Button>
                                    <Button size="sm" variant="outline" className="rounded-xl" onClick={() => onRemove(record)}>
                                        <Trash2 className="h-4 w-4" />
                                        Hapus
                                    </Button>
                                </div>
                            )}
                            {!canModifyRecord(record) ? (
                                <p className="mt-4 text-xs font-medium text-[var(--text-muted)]">
                                    Pengajuan sudah diputuskan HC dan tidak bisa diubah dari cabang.
                                </p>
                            ) : null}
                        </div>
                    </div>
                </div>
            ))}

            {sortedRecords.length > 5 ? (
                <Button type="button" variant="ghost" className="px-0 text-violet-700 hover:bg-transparent" onClick={() => setShowAll((current) => !current)}>
                    {showAll ? 'Tampilkan Lebih Sedikit' : `Lihat Semua (${sortedRecords.length})`}
                </Button>
            ) : null}
        </div>
    );
}

function BranchStaffLeaveSubmissionView({
    busy,
    records,
    editing,
    form,
    onFormChange,
    onSubmit,
    onReset,
    onRefresh,
    canModifyRecord,
    onEdit,
    onRemove,
}: {
    busy: boolean;
    records: HCLeaveRecord[];
    editing: HCLeaveRecord | null;
    form: LeaveFormState;
    onFormChange: (field: keyof LeaveFormState, value: string) => void;
    onSubmit: (event: React.FormEvent) => void;
    onReset: () => void;
    onRefresh: () => void;
    canModifyRecord: (record: HCLeaveRecord) => boolean;
    onEdit: (record: HCLeaveRecord) => void;
    onRemove: (record: HCLeaveRecord) => void;
}) {
    return (
        <div className="mx-auto max-w-6xl space-y-5">
            <GlassCard hover={false} className="overflow-hidden border border-[var(--surface-4)] bg-gradient-to-br from-violet-50 via-white to-sky-50">
                <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-[var(--brand-primary)]/10 blur-3xl" />
                <div className="pointer-events-none absolute bottom-0 left-10 h-24 w-24 rounded-full bg-[oklch(0.55_0.18_280_/_0.12)] blur-2xl" />

                <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-violet-700">
                            <CalendarDays className="h-4 w-4" />
                            Human Capital
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)] md:text-4xl">
                                Ajukan Cuti / Izin
                            </h1>
                            <p className="mt-3 max-w-3xl text-sm text-[var(--text-secondary)] md:text-base">
                                Kirim pengajuan cabang ke HC agar langsung bisa dipantau.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-sky-700 shadow-sm shadow-sky-100/40">
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    Internal cabang
                                </span>
                                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-emerald-700 shadow-sm shadow-emerald-100/40">
                                    <UserRoundCheck className="h-3.5 w-3.5" />
                                    PIC / PH wajib
                                </span>
                                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-violet-700 shadow-sm shadow-violet-100/40">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Real-time ke HC
                                </span>
                            </div>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" className="self-start rounded-2xl bg-white/90 px-4" onClick={onRefresh} disabled={busy}>
                        <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </GlassCard>

            <StaffLeaveFormCard
                busy={busy}
                editing={editing}
                form={form}
                onChange={onFormChange}
                onSubmit={onSubmit}
                onReset={onReset}
            />

            <GlassCard hover={false} className="border border-[var(--surface-4)] bg-white">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-600">Riwayat</p>
                        <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">Pengajuan Saya</h2>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-1)] px-3 py-1.5 text-[11px] font-bold text-[var(--text-secondary)]">
                        <ClipboardList className="h-3.5 w-3.5" />
                        {records.length} pengajuan
                    </div>
                </div>
                <RecentSubmissionCards
                    records={records}
                    canModifyRecord={canModifyRecord}
                    onEdit={onEdit}
                    onRemove={onRemove}
                />
            </GlassCard>
        </div>
    );
}

function BranchManagerLeaveMonitoringView({
    busy,
    records,
    editing,
    formOpen,
    form,
    filters,
    leaveTypes,
    onFormChange,
    onFilterChange,
    onSubmit,
    onReset,
    onRefresh,
    onCreate,
    canModifyRecord,
    canReviewRecord,
    onEdit,
    onRemove,
    onApprove,
    onReject,
}: {
    busy: boolean;
    records: HCLeaveRecord[];
    editing: HCLeaveRecord | null;
    formOpen: boolean;
    form: LeaveFormState;
    filters: LeaveFilters;
    leaveTypes: string[];
    onFormChange: (field: keyof LeaveFormState, value: string) => void;
    onFilterChange: (field: keyof LeaveFilters, value: string) => void;
    onSubmit: (event: React.FormEvent) => void;
    onReset: () => void;
    onRefresh: () => void;
    onCreate: () => void;
    canModifyRecord: (record: HCLeaveRecord) => boolean;
    canReviewRecord: (record: HCLeaveRecord) => boolean;
    onEdit: (record: HCLeaveRecord) => void;
    onRemove: (record: HCLeaveRecord) => void;
    onApprove: (record: HCLeaveRecord) => void;
    onReject: (record: HCLeaveRecord) => void;
}) {
    const activeTodayCount = useMemo(() => countActiveToday(records), [records]);
    const pendingCount = useMemo(
        () => records.filter((record) => record.submission_status === 'PENDING').length,
        [records]
    );
    const noLetterCount = useMemo(
        () => records.filter((record) => record.e_letter_status === 'BELUM_ADA').length,
        [records]
    );

    return (
        <>
            <GlassCard hover={false} className="overflow-hidden border border-[var(--surface-4)] bg-gradient-to-br from-violet-50 via-white to-sky-50">
                <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-[var(--brand-primary)]/10 blur-3xl" />
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-violet-700">
                            <CalendarDays className="h-4 w-4" />
                            Human Capital
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)] md:text-4xl">
                                Monitoring Cuti Cabang
                            </h1>
                            <p className="mt-3 max-w-3xl text-sm text-[var(--text-secondary)] md:text-base">
                                Pantau data cuti cabang dan PIC / PH.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-sky-700 shadow-sm shadow-sky-100/40">
                                    <Building2 className="h-3.5 w-3.5" />
                                    Cabang sendiri
                                </span>
                                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-emerald-700 shadow-sm shadow-emerald-100/40">
                                    <UserRoundCheck className="h-3.5 w-3.5" />
                                    PIC / PH monitor
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Button variant="outline" className="rounded-2xl bg-white/90" onClick={onRefresh} disabled={busy}>
                            <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <Button className="rounded-2xl bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary)]/90" onClick={onCreate}>
                            <Plus className="h-4 w-4" />
                            {editing ? 'Tambah Baru' : 'Tambah Data'}
                        </Button>
                    </div>
                </div>
            </GlassCard>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    label="Total Pengajuan"
                    value={records.length}
                    description="Semua data cabang."
                    toneClass="bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 text-violet-600"
                    icon={ClipboardList}
                />
                <StatCard
                    label="Menunggu HC"
                    value={pendingCount}
                    description="Belum diputuskan HC."
                    toneClass="bg-gradient-to-br from-amber-50 via-white to-white text-amber-600"
                    icon={Clock3}
                />
                <StatCard
                    label="Sedang Berjalan"
                    value={activeTodayCount}
                    description="Aktif hari ini."
                    toneClass="bg-gradient-to-br from-emerald-50 via-white to-white text-emerald-600"
                    icon={CalendarDays}
                />
                <StatCard
                    label="Belum Ada E-Letter"
                    value={noLetterCount}
                    description="Masih proses."
                    toneClass="bg-gradient-to-br from-sky-50 via-white to-white text-sky-600"
                    icon={FileText}
                />
            </div>

            <LeaveFiltersCard
                filters={filters}
                leaveTypes={leaveTypes}
                stations={[]}
                showStationFilter={false}
                onChange={onFilterChange}
            />

            {formOpen && (
                <LeaveFormCard
                    busy={busy}
                    editing={editing}
                    form={form}
                    stations={[]}
                    showStationSelect={false}
                    title="Input Data Cabang"
                    eyebrow={editing ? 'Edit Data' : 'Input Data'}
                    description="Tambah atau perbarui data cuti."
                    submitLabel="Simpan Data"
                    showCloseButton
                    onChange={onFormChange}
                    onSubmit={onSubmit}
                    onReset={onReset}
                />
            )}

            <LeaveRecordsTable
                records={records}
                canModifyRecord={canModifyRecord}
                canReviewRecord={canReviewRecord}
                onEdit={onEdit}
                onRemove={onRemove}
                onApprove={onApprove}
                onReject={onReject}
                emptyTitle="Belum ada pengajuan cuti dari cabang ini"
                emptyDescription="Data cabang akan tampil di sini."
            />
        </>
    );
}

function HCLeaveMonitoringView({
    busy,
    records,
    stations,
    editing,
    formOpen,
    form,
    filters,
    leaveTypes,
    onFormChange,
    onFilterChange,
    onSubmit,
    onReset,
    onRefresh,
    onCreate,
    onExport,
    onOpenBulkReview,
    canModifyRecord,
    canReviewRecord,
    onEdit,
    onRemove,
    onApprove,
    onReject,
}: {
    busy: boolean;
    records: HCLeaveRecord[];
    stations: StationOption[];
    editing: HCLeaveRecord | null;
    formOpen: boolean;
    form: LeaveFormState;
    filters: LeaveFilters;
    leaveTypes: string[];
    onFormChange: (field: keyof LeaveFormState, value: string) => void;
    onFilterChange: (field: keyof LeaveFilters, value: string) => void;
    onSubmit: (event: React.FormEvent) => void;
    onReset: () => void;
    onRefresh: () => void;
    onCreate: () => void;
    onExport: () => void;
    onOpenBulkReview: (records: HCLeaveRecord[], nextStatus: HCLeaveSubmissionStatus) => void;
    canModifyRecord: (record: HCLeaveRecord) => boolean;
    canReviewRecord: (record: HCLeaveRecord) => boolean;
    onEdit: (record: HCLeaveRecord) => void;
    onRemove: (record: HCLeaveRecord) => void;
    onApprove: (record: HCLeaveRecord) => void;
    onReject: (record: HCLeaveRecord) => void;
}) {
    const activeTodayCount = useMemo(() => countActiveToday(records), [records]);
    const pendingCount = useMemo(
        () => records.filter((record) => record.submission_status === 'PENDING').length,
        [records]
    );
    const noLetterCount = useMemo(
        () => records.filter((record) => record.e_letter_status === 'BELUM_ADA').length,
        [records]
    );
    const approvedCount = useMemo(
        () => records.filter((record) => record.submission_status === 'APPROVED').length,
        [records]
    );
    const rejectedCount = useMemo(
        () => records.filter((record) => record.submission_status === 'REJECTED').length,
        [records]
    );
    const pendingRecords = useMemo(
        () => records.filter((record) => record.submission_status === 'PENDING'),
        [records]
    );

    return (
        <>
            <GlassCard hover={false} className="overflow-hidden border border-[var(--surface-4)] bg-gradient-to-br from-violet-50 via-white to-sky-50">
                <div className="pointer-events-none absolute right-0 top-0 h-44 w-44 rounded-full bg-[var(--brand-primary)]/10 blur-3xl" />
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-violet-700">
                            <CalendarDays className="h-4 w-4" />
                            Human Capital
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)] md:text-4xl">
                                Monitoring Cuti
                            </h1>
                            <p className="mt-3 max-w-3xl text-sm text-[var(--text-secondary)] md:text-base">
                                Pantau data cuti semua cabang.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-sky-700 shadow-sm shadow-sky-100/40">
                                    <Building2 className="h-3.5 w-3.5" />
                                    Semua cabang
                                </span>
                                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-emerald-700 shadow-sm shadow-emerald-100/40">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Real-time
                                </span>
                                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-violet-700 shadow-sm shadow-violet-100/40">
                                    <Download className="h-3.5 w-3.5" />
                                    Export siap
                                </span>
                                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-amber-700 shadow-sm shadow-amber-100/40">
                                    <Clock3 className="h-3.5 w-3.5" />
                                    {noLetterCount} belum e-letter
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Button variant="outline" className="rounded-2xl bg-white/90" onClick={onRefresh} disabled={busy}>
                            <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <Button variant="outline" className="rounded-2xl bg-white/90" onClick={onExport}>
                            <Download className="h-4 w-4" />
                            Export Excel
                        </Button>
                        <Button className="rounded-2xl bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary)]/90" onClick={onCreate}>
                            <Plus className="h-4 w-4" />
                            {editing ? 'Tambah Baru' : 'Tambah Data'}
                        </Button>
                    </div>
                </div>
            </GlassCard>

            <div className="grid gap-4 md:grid-cols-4">
                <StatCard
                    label="Total Pengajuan"
                    value={records.length}
                    description="Semua data masuk."
                    toneClass="bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 text-violet-600"
                    icon={ClipboardList}
                />
                <StatCard
                    label="Menunggu HC"
                    value={pendingCount}
                    description="Perlu approve / reject."
                    toneClass="bg-gradient-to-br from-amber-50 via-white to-white text-amber-600"
                    icon={Clock3}
                />
                <StatCard
                    label="Sedang Berjalan"
                    value={activeTodayCount}
                    description="Aktif hari ini."
                    toneClass="bg-gradient-to-br from-emerald-50 via-white to-white text-emerald-600"
                    icon={CalendarDays}
                />
                <StatCard
                    label="Disetujui HC"
                    value={approvedCount}
                    description="Sudah diputuskan."
                    toneClass="bg-gradient-to-br from-sky-50 via-white to-white text-sky-600"
                    icon={CheckCircle2}
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <GlassCard hover={false} className="border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-white">
                    <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                            <Clock3 className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Approval HC</p>
                            <h3 className="mt-2 text-lg font-black text-[var(--text-primary)]">Approve / reject langsung dari monitoring</h3>
                            <p className="mt-2 text-sm text-[var(--text-secondary)]">
                                Status pengajuan cabang sekarang dipisah dari status e-letter agar keputusan HC lebih jelas.
                            </p>
                        </div>
                    </div>
                </GlassCard>
                <GlassCard hover={false} className="border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-white">
                    <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                            <FileText className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">E-Letter</p>
                            <h3 className="mt-2 text-lg font-black text-[var(--text-primary)]">Tetap dicatat terpisah</h3>
                            <p className="mt-2 text-sm text-[var(--text-secondary)]">
                                Approval HC tidak otomatis mengubah status e-letter, jadi monitoring operasional tetap akurat.
                            </p>
                        </div>
                    </div>
                </GlassCard>
            </div>

            <HCSubmissionQuickFilters
                current={filters.submission_status}
                counts={{
                    PENDING: pendingCount,
                    APPROVED: approvedCount,
                    REJECTED: rejectedCount,
                }}
                onChange={(value) => onFilterChange('submission_status', value)}
            />

            {pendingRecords.length > 0 ? (
                <GlassCard hover={false} className="border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-start gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Aksi Cepat HC</p>
                                <h3 className="mt-2 text-lg font-black text-[var(--text-primary)]">Setujui semua pending yang sedang terfilter</h3>
                                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                                    Gunakan setelah filter cabang, bulan, atau status sudah sesuai.
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-emerald-700 shadow-sm shadow-emerald-100/50">
                                <Clock3 className="h-3.5 w-3.5" />
                                {pendingRecords.length} pending terfilter
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <Button
                                    className="rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700"
                                    onClick={() => onOpenBulkReview(pendingRecords, 'APPROVED')}
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    Approve Semua
                                </Button>
                                <Button
                                    variant="outline"
                                    className="rounded-2xl border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-700"
                                    onClick={() => onOpenBulkReview(pendingRecords, 'REJECTED')}
                                >
                                    <XCircle className="h-4 w-4" />
                                    Reject Semua
                                </Button>
                            </div>
                        </div>
                    </div>
                </GlassCard>
            ) : null}

            <LeaveFiltersCard
                filters={filters}
                leaveTypes={leaveTypes}
                stations={stations}
                showStationFilter
                onChange={onFilterChange}
            />

            {formOpen && (
                <LeaveFormCard
                    busy={busy}
                    editing={editing}
                    form={form}
                    stations={stations}
                    showStationSelect
                    title="Input Manual HC"
                    eyebrow={editing ? 'Edit Data HC' : 'Input HC'}
                    description="Input atau koreksi data cuti."
                    submitLabel="Simpan Data"
                    showCloseButton
                    onChange={onFormChange}
                    onSubmit={onSubmit}
                    onReset={onReset}
                />
            )}

            <LeaveRecordsTable
                records={records}
                canModifyRecord={canModifyRecord}
                canReviewRecord={canReviewRecord}
                onEdit={onEdit}
                onRemove={onRemove}
                onApprove={onApprove}
                onReject={onReject}
                emptyTitle="Belum ada data cuti / izin"
                emptyDescription="Data cabang akan tampil di sini."
            />
        </>
    );
}

export function HCLeaveWorkspace({ mode }: { mode: WorkspaceMode }) {
    const { user, loading } = useAuth(false);
    const [records, setRecords] = useState<HCLeaveRecord[]>([]);
    const [stations, setStations] = useState<StationOption[]>([]);
    const [busy, setBusy] = useState(false);
    const [editing, setEditing] = useState<HCLeaveRecord | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [form, setForm] = useState<LeaveFormState>(emptyForm());
    const [reviewState, setReviewState] = useState<LeaveReviewState>({
        open: false,
        record: null,
        nextStatus: 'APPROVED',
        notes: '',
    });
    const [bulkReviewState, setBulkReviewState] = useState<BulkReviewState>({
        open: false,
        ids: [],
        count: 0,
        nextStatus: 'APPROVED',
        notes: '',
    });
    const [deleteState, setDeleteState] = useState<DeleteState>({
        open: false,
        record: null,
    });
    const [feedbackItems, setFeedbackItems] = useState<HCFeedbackItem[]>([]);
    const [filters, setFilters] = useState<LeaveFilters>({
        month: '',
        station_id: '',
        leave_type: '',
        submission_status: '',
        search: '',
    });

    const isHCManager = ['SUPER_ADMIN', 'ANALYST', 'DIVISI_HC', 'PARTNER_HC'].includes(user?.role || '');
    const isBranchManager = user?.role === 'MANAGER_CABANG';
    const presentation: LeavePresentation = mode === 'hc' ? 'hc' : (isBranchManager ? 'manager' : 'staff');

    const load = useCallback(async () => {
        setBusy(true);
        try {
            const params = new URLSearchParams();
            if (filters.month) params.set('month', filters.month);
            if (filters.station_id) params.set('station_id', filters.station_id);
            if (filters.leave_type) params.set('leave_type', filters.leave_type);
            if (filters.submission_status) params.set('submission_status', filters.submission_status);
            if (filters.search) params.set('search', filters.search);

            const requests = [
                fetch(`/api/hc/leave-records?${params.toString()}`, { cache: 'no-store' }),
                fetch('/api/master-data?type=stations', { cache: 'force-cache' }),
            ] as const;

            const [recordsRes, stationsRes] = await Promise.all(requests);

            if (recordsRes.ok) {
                const data = await recordsRes.json();
                setRecords(Array.isArray(data) ? data : []);
            }
            if (stationsRes.ok) {
                const data = await stationsRes.json();
                setStations(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('[HCLeaveWorkspace] Failed to load data:', error);
        } finally {
            setBusy(false);
        }
    }, [filters.leave_type, filters.month, filters.search, filters.station_id, filters.submission_status]);

    useEffect(() => {
        if (user?.station_id && mode === 'branch') {
            setForm((current) => ({ ...current, station_id: user.station_id || '' }));
        }
    }, [mode, user?.station_id]);

    useEffect(() => {
        if (!loading) {
            load();
        }
    }, [loading, load]);

    useEffect(() => {
        if (loading) return;
        const interval = window.setInterval(() => {
            load();
        }, 30000);
        return () => window.clearInterval(interval);
    }, [loading, load]);

    useEffect(() => {
        if (presentation === 'staff') {
            setFormOpen(true);
        }
    }, [presentation]);

    const pushFeedback = useCallback((tone: HCFeedbackItem['tone'], title: string, message?: string) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        setFeedbackItems((current) => [...current, { id, tone, title, message }]);

        const timeout = window.setTimeout(() => {
            setFeedbackItems((current) => current.filter((item) => item.id !== id));
        }, tone === 'error' ? 6000 : 3200);

        return () => window.clearTimeout(timeout);
    }, []);

    const dismissFeedback = useCallback((id: string) => {
        setFeedbackItems((current) => current.filter((item) => item.id !== id));
    }, []);

    const leaveTypes = useMemo(() => {
        return Array.from(new Set(records.map((record) => record.leave_type))).sort();
    }, [records]);

    const canModifyRecord = useCallback((record: HCLeaveRecord) => {
        if (isHCManager) return true;
        if (record.submission_status && record.submission_status !== 'PENDING') return false;
        if (user?.role === 'MANAGER_CABANG') return user.station_id === record.station_id;
        return record.created_by === user?.id;
    }, [isHCManager, user?.id, user?.role, user?.station_id]);

    const canReviewRecord = useCallback((record: HCLeaveRecord) => {
        return isHCManager && record.submission_status === 'PENDING';
    }, [isHCManager]);

    const startCreate = useCallback(() => {
        setEditing(null);
        setForm(emptyForm(mode === 'branch' ? user?.station_id : null));
        setFormOpen(true);
    }, [mode, user?.station_id]);

    const startEdit = useCallback((record: HCLeaveRecord) => {
        setEditing(record);
        setForm({
            employee_name: record.employee_name,
            leave_type: record.leave_type,
            start_date: record.start_date,
            end_date: record.end_date,
            station_id: record.station_id || '',
            division_name: record.division_name || '',
            unit_name: record.unit_name || '',
            pic_name: record.pic_name || '',
            pic_email: record.pic_email || '',
            pic_phone: record.pic_phone || '',
            e_letter_status: record.e_letter_status,
            notes: record.notes || '',
        });
        setFormOpen(true);
    }, []);

    const resetForm = useCallback(() => {
        setEditing(null);
        setForm(emptyForm(mode === 'branch' ? user?.station_id : null));
        setFormOpen(presentation === 'staff');
    }, [mode, presentation, user?.station_id]);

    const closeReviewModal = useCallback(() => {
        if (busy) return;
        setReviewState({
            open: false,
            record: null,
            nextStatus: 'APPROVED',
            notes: '',
        });
    }, [busy]);

    const closeBulkReviewModal = useCallback(() => {
        if (busy) return;
        setBulkReviewState({
            open: false,
            ids: [],
            count: 0,
            nextStatus: 'APPROVED',
            notes: '',
        });
    }, [busy]);

    const closeDeleteModal = useCallback(() => {
        if (busy) return;
        setDeleteState({
            open: false,
            record: null,
        });
    }, [busy]);

    const handleFormChange = useCallback((field: keyof LeaveFormState, value: string) => {
        setForm((current) => ({
            ...current,
            [field]: field === 'e_letter_status' ? (value as HCLeaveLetterStatus) : value,
        }));
    }, []);

    const handleFilterChange = useCallback((field: keyof LeaveFilters, value: string) => {
        setFilters((current) => ({
            ...current,
            [field]: value,
        }));
    }, []);

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        setBusy(true);
        try {
            const payload = {
                ...form,
                station_id: mode === 'branch' ? user?.station_id || null : (form.station_id || null),
            };

            const response = await fetch(
                editing ? `/api/hc/leave-records/${editing.id}` : '/api/hc/leave-records',
                {
                    method: editing ? 'PATCH' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                }
            );

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error || 'Gagal menyimpan data');
            }

            resetForm();
            await load();
            pushFeedback(
                'success',
                editing ? 'Perubahan tersimpan' : 'Pengajuan terkirim',
                editing ? 'Data cuti berhasil diperbarui.' : 'Pengajuan cuti langsung masuk ke monitoring HC.'
            );
        } catch (error) {
            pushFeedback('error', 'Gagal menyimpan data', error instanceof Error ? error.message : 'Gagal menyimpan data leave');
        } finally {
            setBusy(false);
        }
    };

    const requestDeleteRecord = useCallback((record: HCLeaveRecord) => {
        setDeleteState({
            open: true,
            record,
        });
    }, []);

    const removeRecord = async () => {
        const record = deleteState.record;
        if (!record) return;
        setBusy(true);
        try {
            const response = await fetch(`/api/hc/leave-records/${record.id}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error || 'Gagal menghapus data');
            }

            await load();
            closeDeleteModal();
            pushFeedback('success', 'Data diarsipkan', `Pengajuan ${record.employee_name} berhasil diarsipkan dari monitoring aktif.`);
        } catch (error) {
            pushFeedback('error', 'Gagal mengarsipkan data', error instanceof Error ? error.message : 'Gagal mengarsipkan data');
        } finally {
            setBusy(false);
        }
    };

    const openReviewModal = useCallback((record: HCLeaveRecord, nextStatus: HCLeaveSubmissionStatus) => {
        setReviewState({
            open: true,
            record,
            nextStatus,
            notes: nextStatus === 'REJECTED' ? (record.review_notes || '') : '',
        });
    }, []);

    const openBulkReviewModal = useCallback((targetRecords: HCLeaveRecord[], nextStatus: HCLeaveSubmissionStatus) => {
        const ids = targetRecords
            .filter((record) => record.submission_status === 'PENDING')
            .map((record) => record.id);
        if (!ids.length) return;

        setBulkReviewState({
            open: true,
            ids,
            count: ids.length,
            nextStatus,
            notes: nextStatus === 'REJECTED' ? '' : '',
        });
    }, []);

    const submitReview = useCallback(async () => {
        const record = reviewState.record;
        if (!record) return;

        const nextStatus = reviewState.nextStatus;
        const reviewNotes = reviewState.notes.trim();
        if (nextStatus === 'REJECTED' && !reviewNotes) {
            pushFeedback('error', 'Alasan wajib diisi', 'Isi alasan penolakan sebelum mengirim review HC.');
            return;
        }

        setBusy(true);
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
                throw new Error(error.error || 'Gagal memperbarui status HC');
            }

            if (editing?.id === record.id) {
                resetForm();
            }
            setReviewState({
                open: false,
                record: null,
                nextStatus: 'APPROVED',
                notes: '',
            });
            await load();
            pushFeedback(
                'success',
                nextStatus === 'REJECTED' ? 'Pengajuan ditolak' : 'Pengajuan disetujui',
                `${record.employee_name} berhasil diproses oleh HC.`
            );
        } catch (error) {
            pushFeedback('error', 'Gagal memperbarui status HC', error instanceof Error ? error.message : 'Gagal memperbarui status HC');
        } finally {
            setBusy(false);
        }
    }, [editing?.id, load, pushFeedback, resetForm, reviewState.nextStatus, reviewState.notes, reviewState.record]);

    const submitBulkReview = useCallback(async () => {
        if (!bulkReviewState.ids.length) return;
        if (bulkReviewState.nextStatus === 'REJECTED' && !bulkReviewState.notes.trim()) {
            pushFeedback('error', 'Alasan wajib diisi', 'Isi alasan penolakan massal sebelum mengirim bulk review.');
            return;
        }

        setBusy(true);
        try {
            const response = await fetch('/api/hc/leave-records/bulk-review', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ids: bulkReviewState.ids,
                    submission_status: bulkReviewState.nextStatus,
                    review_notes: bulkReviewState.notes.trim() || null,
                }),
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(result.error || 'Gagal memproses bulk review');
            }

            if (editing?.id && bulkReviewState.ids.includes(editing.id)) {
                resetForm();
            }
            closeBulkReviewModal();
            await load();
            pushFeedback(
                'success',
                bulkReviewState.nextStatus === 'REJECTED' ? 'Bulk reject selesai' : 'Bulk approve selesai',
                `${bulkReviewState.count} pengajuan pending berhasil diproses.`
            );
        } catch (error) {
            pushFeedback('error', 'Gagal memproses bulk review', error instanceof Error ? error.message : 'Gagal memproses bulk review');
        } finally {
            setBusy(false);
        }
    }, [bulkReviewState.count, bulkReviewState.ids, bulkReviewState.nextStatus, bulkReviewState.notes, closeBulkReviewModal, editing?.id, load, pushFeedback, resetForm]);

    const exportExcel = useCallback(() => {
        const params = new URLSearchParams();
        if (filters.month) params.set('month', filters.month);
        if (filters.station_id) params.set('station_id', filters.station_id);
        if (filters.leave_type) params.set('leave_type', filters.leave_type);
        if (filters.submission_status) params.set('submission_status', filters.submission_status);
        window.open(`/api/hc/leave-records/export?${params.toString()}`, '_blank');
    }, [filters.leave_type, filters.month, filters.station_id, filters.submission_status]);

    return (
        <div className="min-h-screen p-4 md:p-6">
            <div className="mx-auto max-w-7xl space-y-6">
                {presentation === 'staff' && (
                    <BranchStaffLeaveSubmissionView
                        busy={busy}
                        records={records}
                        editing={editing}
                        form={form}
                        onFormChange={handleFormChange}
                        onSubmit={submit}
                        onReset={resetForm}
                        onRefresh={load}
                        canModifyRecord={canModifyRecord}
                        onEdit={startEdit}
                        onRemove={requestDeleteRecord}
                    />
                )}

                {presentation === 'manager' && (
                    <BranchManagerLeaveMonitoringView
                        busy={busy}
                        records={records}
                        editing={editing}
                        formOpen={formOpen}
                        form={form}
                        filters={filters}
                        leaveTypes={leaveTypes}
                        onFormChange={handleFormChange}
                        onFilterChange={handleFilterChange}
                        onSubmit={submit}
                        onReset={resetForm}
                        onRefresh={load}
                        onCreate={startCreate}
                        canModifyRecord={canModifyRecord}
                        canReviewRecord={canReviewRecord}
                        onEdit={startEdit}
                        onRemove={requestDeleteRecord}
                        onApprove={(record) => openReviewModal(record, 'APPROVED')}
                        onReject={(record) => openReviewModal(record, 'REJECTED')}
                    />
                )}

                {presentation === 'hc' && (
                    <HCLeaveMonitoringView
                        busy={busy}
                        records={records}
                        stations={stations}
                        editing={editing}
                        formOpen={formOpen}
                        form={form}
                        filters={filters}
                        leaveTypes={leaveTypes}
                        onFormChange={handleFormChange}
                        onFilterChange={handleFilterChange}
                        onSubmit={submit}
                        onReset={resetForm}
                        onRefresh={load}
                        onCreate={startCreate}
                        onExport={exportExcel}
                        onOpenBulkReview={openBulkReviewModal}
                        canModifyRecord={canModifyRecord}
                        canReviewRecord={canReviewRecord}
                        onEdit={startEdit}
                        onRemove={requestDeleteRecord}
                        onApprove={(record) => openReviewModal(record, 'APPROVED')}
                        onReject={(record) => openReviewModal(record, 'REJECTED')}
                    />
                )}
            </div>

            <HCLeaveReviewModal
                open={reviewState.open}
                busy={busy}
                record={reviewState.record}
                nextStatus={reviewState.nextStatus}
                notes={reviewState.notes}
                onClose={closeReviewModal}
                onNotesChange={(value) => setReviewState((current) => ({ ...current, notes: value }))}
                onSubmit={submitReview}
            />

            <HCBulkReviewModal
                open={bulkReviewState.open}
                busy={busy}
                count={bulkReviewState.count}
                nextStatus={bulkReviewState.nextStatus}
                notes={bulkReviewState.notes}
                onClose={closeBulkReviewModal}
                onNotesChange={(value) => setBulkReviewState((current) => ({ ...current, notes: value }))}
                onSubmit={submitBulkReview}
            />

            <HCDeleteConfirmModal
                open={deleteState.open}
                busy={busy}
                record={deleteState.record}
                onClose={closeDeleteModal}
                onConfirm={removeRecord}
            />

            <HCFeedbackStack items={feedbackItems} onDismiss={dismissFeedback} />
        </div>
    );
}
