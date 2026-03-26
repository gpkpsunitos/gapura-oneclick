'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Building2,
    CalendarDays,
    ClipboardList,
    Clock3,
    Download,
    FilePenLine,
    FileText,
    Filter,
    Plus,
    RefreshCw,
    Search,
    Trash2,
    UserRoundCheck,
    Users,
    X,
    XCircle,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/hooks/use-auth';
import { cn } from '@/lib/utils';
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
    leaveTypeOptions?: string[];
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
    activity_scope: '' | 'active_today';
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

interface HCMonitoringFilterToolbarProps {
    filters: LeaveFilters;
    leaveTypes: string[];
    stations: StationOption[];
    activeFilterCount: number;
    onChange: (field: keyof LeaveFilters, value: string) => void;
    onReset: () => void;
}

interface HCMonitoringTableProps {
    busy: boolean;
    records: HCLeaveRecord[];
    canModifyRecord: (record: HCLeaveRecord) => boolean;
    canReviewRecord: (record: HCLeaveRecord) => boolean;
    jumpToMissingLetterToken: number;
    onEdit: (record: HCLeaveRecord) => void;
    onRemove: (record: HCLeaveRecord) => void;
    onApprove: (record: HCLeaveRecord) => Promise<void>;
    onReject: (record: HCLeaveRecord, reason: string) => Promise<void>;
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

type BranchStaffPage = 'form' | 'history';

type LeaveFormErrorMap = Partial<Record<keyof LeaveFormState, string>>;
type HCMonitoringSortKey = 'employee_name' | 'period' | 'station' | 'pic' | 'submission_status' | 'e_letter_status' | 'created_at';
type SortDirection = 'asc' | 'desc';

const BRANCH_FORM_PATH = '/dashboard/employee/hc-leave';
const BRANCH_HISTORY_HREF = `${BRANCH_FORM_PATH}?view=history`;
const BRANCH_FORM_HREF = `${BRANCH_FORM_PATH}?view=form`;

const BRANCH_LEAVE_TYPE_OPTIONS = ['Cuti Tahunan', 'Izin Sakit', 'Cuti Melahirkan', 'Lainnya'] as const;

const LETTER_STATUS_OPTIONS: Array<{ value: HCLeaveLetterStatus; label: string }> = [
    { value: 'BELUM_ADA', label: 'Belum Ada' },
    { value: 'PENGAJUAN', label: 'Pengajuan' },
    { value: 'TERBIT', label: 'Terbit' },
];

const SUBMISSION_STATUS_OPTIONS: Array<{ value: HCLeaveSubmissionStatus; label: string }> = [
    { value: 'PENDING', label: 'Menunggu Approval GM/EGM' },
    { value: 'APPROVED', label: 'Disetujui GM/EGM' },
    { value: 'REJECTED', label: 'Ditolak' },
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
    return SUBMISSION_STATUS_OPTIONS.find((option) => option.value === status)?.label || 'Menunggu Approval GM/EGM';
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

function getSubmissionStatusPillClass(status: HCLeaveSubmissionStatus | string | null | undefined) {
    switch (status) {
        case 'APPROVED':
            return 'border-transparent bg-[#009688] text-white';
        case 'REJECTED':
            return 'border-transparent bg-[#EF4444] text-white';
        default:
            return 'border-transparent bg-[#F59E0B] text-white';
    }
}

function getELetterLabel(status: HCLeaveLetterStatus) {
    switch (status) {
        case 'TERBIT':
            return 'Sudah Ada';
        default:
            return getStatusLabel(status);
    }
}

function getELetterPillClass(status: HCLeaveLetterStatus) {
    switch (status) {
        case 'TERBIT':
            return 'border-transparent bg-[#374151] text-white';
        case 'PENGAJUAN':
            return 'border-transparent bg-[#3B82F6] text-white';
        default:
            return 'border-transparent bg-[#F59E0B] text-white';
    }
}

function countActiveToday(records: HCLeaveRecord[]) {
    return records.filter((record) => isRecordActiveOnDate(record, getCurrentDateKey())).length;
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

function calculateLeaveDuration(startDate: string, endDate: string) {
    if (!startDate || !endDate) return null;
    const start = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T00:00:00Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
        return null;
    }

    const diffInDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    return diffInDays;
}

function getStationLabelById(stations: StationOption[], stationId: string) {
    if (!stationId) return '-';
    const station = stations.find((item) => item.id === stationId);
    return station ? `${station.code} - ${station.name}` : '-';
}

function buildLeaveTypeOptions(values: string[]) {
    return Array.from(new Set([...BRANCH_LEAVE_TYPE_OPTIONS, ...values.filter(Boolean)])).sort((left, right) => left.localeCompare(right, 'id'));
}

function matchesLeaveMonth(record: HCLeaveRecord, month: string) {
    if (!month) return true;
    const monthStart = new Date(`${month}-01T00:00:00Z`);
    if (Number.isNaN(monthStart.getTime())) return true;
    const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0, 23, 59, 59));
    const recordStart = new Date(`${record.start_date}T00:00:00Z`);
    const recordEnd = new Date(`${record.end_date}T23:59:59Z`);
    return recordStart <= monthEnd && recordEnd >= monthStart;
}

function getCurrentDateKey() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function isRecordActiveOnDate(record: HCLeaveRecord, currentDate: string) {
    return record.start_date <= currentDate && record.end_date >= currentDate;
}

function recordMatchesSearch(record: HCLeaveRecord, search: string) {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return true;

    return [
        record.employee_name,
        record.leave_type,
        record.station?.code,
        record.station?.name,
        record.division_name,
        record.unit_name,
        record.pic_name,
        record.pic_email,
        record.pic_phone,
        record.created_by_name,
    ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
}

function filterLeaveRecords(
    records: HCLeaveRecord[],
    filters: LeaveFilters,
    options?: {
        ignoreSubmissionStatus?: boolean;
    }
) {
    return records.filter((record) => {
        if (!matchesLeaveMonth(record, filters.month)) return false;
        if (filters.station_id && record.station_id !== filters.station_id) return false;
        if (filters.leave_type && record.leave_type !== filters.leave_type) return false;
        if (!options?.ignoreSubmissionStatus && filters.submission_status && record.submission_status !== filters.submission_status) return false;
        if (filters.activity_scope === 'active_today' && !isRecordActiveOnDate(record, getCurrentDateKey())) return false;
        if (!recordMatchesSearch(record, filters.search)) return false;
        return true;
    });
}

function getRecordUnitLabel(record: HCLeaveRecord) {
    const values = [record.division_name?.trim(), record.unit_name?.trim()].filter(Boolean);
    return values.length ? values.join(' / ') : '-';
}

function compareText(left: string, right: string, direction: SortDirection) {
    return direction === 'asc' ? left.localeCompare(right, 'id') : right.localeCompare(left, 'id');
}

function compareDate(left: string, right: string, direction: SortDirection) {
    const leftTime = new Date(left || 0).getTime();
    const rightTime = new Date(right || 0).getTime();
    return direction === 'asc' ? leftTime - rightTime : rightTime - leftTime;
}

function compareLeaveRecords(
    left: HCLeaveRecord,
    right: HCLeaveRecord,
    sortKey: HCMonitoringSortKey,
    direction: SortDirection
) {
    switch (sortKey) {
        case 'employee_name':
            return compareText(left.employee_name, right.employee_name, direction);
        case 'period':
            return compareDate(left.start_date, right.start_date, direction) || compareDate(left.end_date, right.end_date, direction);
        case 'station':
            return compareText(
                `${left.station?.code || ''} ${left.station?.name || ''} ${getRecordUnitLabel(left)}`,
                `${right.station?.code || ''} ${right.station?.name || ''} ${getRecordUnitLabel(right)}`,
                direction
            );
        case 'pic':
            return compareText(`${left.pic_name || ''} ${left.pic_email || ''}`, `${right.pic_name || ''} ${right.pic_email || ''}`, direction);
        case 'submission_status': {
            const order = { PENDING: 0, APPROVED: 1, REJECTED: 2 } satisfies Record<HCLeaveSubmissionStatus, number>;
            return direction === 'asc'
                ? order[left.submission_status] - order[right.submission_status]
                : order[right.submission_status] - order[left.submission_status];
        }
        case 'e_letter_status': {
            const order = { BELUM_ADA: 0, PENGAJUAN: 1, TERBIT: 2 } satisfies Record<HCLeaveLetterStatus, number>;
            return direction === 'asc'
                ? order[left.e_letter_status] - order[right.e_letter_status]
                : order[right.e_letter_status] - order[left.e_letter_status];
        }
        default:
            return compareDate(left.created_at || left.start_date, right.created_at || right.start_date, direction);
    }
}

function upsertLeaveRecord(records: HCLeaveRecord[], nextRecord: HCLeaveRecord) {
    const nextRecords = records.some((record) => record.id === nextRecord.id)
        ? records.map((record) => (record.id === nextRecord.id ? nextRecord : record))
        : [nextRecord, ...records];

    return nextRecords;
}

function getBranchStaffPage(view: string | null): BranchStaffPage {
    return view === 'history' ? 'history' : 'form';
}

function getLeaveFormErrors(form: LeaveFormState): LeaveFormErrorMap {
    const errors: LeaveFormErrorMap = {};

    if (!form.employee_name.trim()) {
        errors.employee_name = 'Nama pegawai wajib diisi.';
    }

    if (!form.leave_type.trim()) {
        errors.leave_type = 'Jenis cuti wajib dipilih.';
    }

    if (!form.start_date) {
        errors.start_date = 'Tanggal mulai wajib diisi.';
    }

    if (!form.end_date) {
        errors.end_date = 'Tanggal selesai wajib diisi.';
    } else if (form.start_date && form.end_date < form.start_date) {
        errors.end_date = 'Tanggal selesai tidak boleh lebih awal dari tanggal mulai.';
    }

    if (!form.pic_name.trim()) {
        errors.pic_name = 'Pejabat Harian (PH) / Pengganti wajib diisi.';
    }

    if (form.pic_email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.pic_email.trim())) {
        errors.pic_email = 'Format email PIC tidak valid.';
    }

    return errors;
}

function getStaffTone(tone: StaffFormSectionProps['tone']) {
    switch (tone) {
        case 'sky':
            return {
                panelClass: 'border-[var(--surface-4)] bg-[var(--surface-0)]',
                iconClass: 'bg-sky-50 text-sky-700',
                eyebrowClass: 'text-sky-700',
            };
        case 'emerald':
            return {
                panelClass: 'border-[var(--surface-4)] bg-[var(--surface-0)]',
                iconClass: 'bg-emerald-50 text-emerald-700',
                eyebrowClass: 'text-emerald-700',
            };
        case 'amber':
            return {
                panelClass: 'border-[var(--surface-4)] bg-[var(--surface-0)]',
                iconClass: 'bg-amber-50 text-amber-700',
                eyebrowClass: 'text-amber-700',
            };
        default:
            return {
                panelClass: 'border-[var(--surface-4)] bg-[var(--surface-0)]',
                iconClass: 'bg-[var(--brand-primary)]/8 text-[var(--brand-primary)]',
                eyebrowClass: 'text-[var(--brand-primary)]',
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
        <div className={`rounded-[24px] border p-4 ${toneClass}`}>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
                    <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">{value}</p>
                    {description ? <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p> : null}
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-1)]">
                    <Icon className="h-5 w-5" />
                </div>
            </div>
        </div>
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
            className: '',
        },
        {
            value: 'PENDING',
            label: 'Menunggu Approval GM/EGM',
            count: counts.PENDING,
            className: '',
        },
        {
            value: 'APPROVED',
            label: 'Disetujui',
            count: counts.APPROVED,
            className: '',
        },
        {
            value: 'REJECTED',
            label: 'Ditolak',
            count: counts.REJECTED,
            className: '',
        },
    ];

    return (
        <div className="flex flex-wrap gap-2">
            {items.map((item) => {
                const isActive = current === item.value;
                return (
                    <button
                        key={item.label}
                        type="button"
                        onClick={() => onChange(item.value)}
                        className={cn(
                            'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors',
                            isActive
                                ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/6 text-[var(--text-primary)]'
                                : 'border-[var(--surface-4)] bg-white text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                            item.className
                        )}
                    >
                        <span>{item.label}</span>
                        <span
                            className={cn(
                                'inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-[12px] font-semibold',
                                isActive ? 'bg-[var(--brand-primary)] text-white' : 'bg-[var(--surface-2)] text-[var(--text-secondary)]'
                            )}
                        >
                            {item.count}
                        </span>
                    </button>
                );
            })}
        </div>
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
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Review GM/EGM</p>
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
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Pejabat Harian (PH)</p>
                            <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{record.pic_name || '-'}</p>
                        </div>
                        <div className="rounded-2xl border border-[var(--surface-4)] bg-white/80 p-4">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">E-Letter</p>
                            <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{getStatusLabel(record.e_letter_status)}</p>
                        </div>
                    </div>

                    <div className="mt-6">
                        <FieldLabel
                            label={isReject ? 'Alasan Penolakan' : 'Catatan GM/EGM'}
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
                            {isReject ? 'Pengajuan akan ditandai Ditolak.' : 'Pengajuan akan ditandai Disetujui GM/EGM.'}
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
                                Data cuti ini akan keluar dari monitoring aktif GM/EGM dan backup aktif, tanpa dihapus permanen dari database.
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
                            <p><strong>Status Approval:</strong> {getSubmissionStatusLabel(record.submission_status)}</p>
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
        <section className={`rounded-[28px] border p-5 md:p-6 ${styles.panelClass}`}>
            <div className="flex items-start gap-4">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${styles.iconClass}`}>
                    <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                    <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
                    {description ? <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p> : null}
                </div>
            </div>
            <div className="mt-5">
                {children}
            </div>
        </section>
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
        <div className="mb-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <label>{label}</label>
            {required ? <span className="text-violet-600">*</span> : null}
            {hint ? <span className="text-xs font-medium text-[var(--text-muted)]">{hint}</span> : null}
        </div>
    );
}

function LeaveFormCard({
    busy,
    editing,
    form,
    stations,
    leaveTypeOptions = [],
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
    const [touched, setTouched] = useState<Partial<Record<keyof LeaveFormState, boolean>>>({});
    const [supportingOpen, setSupportingOpen] = useState(false);
    const errors = useMemo(() => getLeaveFormErrors(form), [form]);
    const duration = useMemo(() => calculateLeaveDuration(form.start_date, form.end_date), [form.end_date, form.start_date]);
    const selectedStationLabel = useMemo(() => getStationLabelById(stations, form.station_id), [form.station_id, stations]);
    const hasSupportingValues = Boolean(
        form.division_name.trim() ||
            form.unit_name.trim() ||
            form.pic_email.trim() ||
            form.pic_phone.trim() ||
            form.notes.trim() ||
            form.e_letter_status !== 'BELUM_ADA'
    );
    const statusLabel = editing ? getSubmissionStatusLabel(editing.submission_status) : 'Draft';
    const canSubmit =
        form.employee_name.trim() &&
        form.leave_type.trim() &&
        form.start_date &&
        form.end_date &&
        form.pic_name.trim() &&
        Object.keys(errors).length === 0;

    const markTouched = useCallback((field: keyof LeaveFormState) => {
        setTouched((current) => (current[field] ? current : { ...current, [field]: true }));
    }, []);

    const showError = useCallback((field: keyof LeaveFormState) => touched[field] && errors[field], [errors, touched]);

    const touchInvalidFields = useCallback(() => {
        const nextTouched: Partial<Record<keyof LeaveFormState, boolean>> = {};
        (Object.keys(errors) as Array<keyof LeaveFormState>).forEach((field) => {
            nextTouched[field] = true;
        });
        setTouched((current) => ({ ...current, ...nextTouched }));
    }, [errors]);

    const handleSubmit = useCallback((event: React.FormEvent) => {
        if (!canSubmit) {
            event.preventDefault();
            touchInvalidFields();
            return;
        }

        onSubmit(event);
    }, [canSubmit, onSubmit, touchInvalidFields]);

    const summaryItems = [
        { label: 'Pegawai', value: form.employee_name.trim() || '-' },
        { label: 'Jenis cuti', value: form.leave_type.trim() || '-' },
        { label: 'Periode', value: form.start_date && form.end_date ? formatLeavePeriod(form.start_date, form.end_date) : '-' },
        { label: 'Durasi', value: duration ? `${duration} hari` : '-' },
        { label: 'Status', value: statusLabel },
        ...(showStationSelect ? [{ label: 'Cabang', value: selectedStationLabel }] : []),
        { label: 'PH / Pengganti', value: form.pic_name.trim() || '-' },
    ];
    const canToggleSupporting = !editing && !hasSupportingValues;
    const supportingVisible = supportingOpen || editing !== null || hasSupportingValues;

    return (
        <div className="rounded-[32px] border border-[var(--surface-4)] bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="border-b border-[var(--surface-3)] px-5 py-5 md:px-7">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">{eyebrow}</p> : null}
                        <h2 className="mt-2 text-2xl font-black tracking-tight text-[var(--text-primary)]">
                            {editing ? `Edit ${editing.employee_name}` : title}
                        </h2>
                        {description ? <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">{description}</p> : null}
                    </div>
                    {showCloseButton ? (
                        <Button variant="outline" className="rounded-2xl border-[var(--surface-4)] bg-white" onClick={onReset}>
                            Tutup
                        </Button>
                    ) : null}
                </div>
            </div>

            <form className="grid gap-6 px-5 py-5 md:px-7 md:py-7 xl:grid-cols-[minmax(0,1fr)_320px]" onSubmit={handleSubmit} noValidate>
                <div className="space-y-5">
                <StaffFormSection
                    icon={CalendarDays}
                    tone="violet"
                    title="Data cuti"
                    description="Field inti yang wajib diisi."
                >
                    <div className={`grid gap-4 ${showStationSelect ? 'md:grid-cols-2 xl:grid-cols-3' : 'md:grid-cols-2'}`}>
                        <div>
                            <FieldLabel label="Nama pegawai" required />
                            <input
                                value={form.employee_name}
                                onBlur={() => markTouched('employee_name')}
                                onChange={(event) => onChange('employee_name', event.target.value)}
                                placeholder="Nama pegawai"
                                className={cn(formFieldClass, showError('employee_name') ? 'border-rose-300 focus:border-rose-500' : '')}
                                required
                            />
                            {showError('employee_name') ? <p className="mt-2 text-xs text-rose-600">{errors.employee_name}</p> : null}
                        </div>
                        <div>
                            <FieldLabel label="Jenis cuti / izin" required />
                            {leaveTypeOptions.length > 0 ? (
                                <select
                                    value={form.leave_type}
                                    onBlur={() => markTouched('leave_type')}
                                    onChange={(event) => onChange('leave_type', event.target.value)}
                                    className={cn(formFieldClass, showError('leave_type') ? 'border-rose-300 focus:border-rose-500' : '')}
                                    required
                                >
                                    <option value="">Pilih jenis cuti</option>
                                    {leaveTypeOptions.map((option) => (
                                        <option key={option} value={option}>
                                            {option}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    value={form.leave_type}
                                    onBlur={() => markTouched('leave_type')}
                                    onChange={(event) => onChange('leave_type', event.target.value)}
                                    placeholder="Contoh: Cuti tahunan"
                                    className={cn(formFieldClass, showError('leave_type') ? 'border-rose-300 focus:border-rose-500' : '')}
                                    required
                                />
                            )}
                            {showError('leave_type') ? <p className="mt-2 text-xs text-rose-600">{errors.leave_type}</p> : null}
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
                            <FieldLabel label="Tanggal mulai" required />
                            <input
                                type="date"
                                value={form.start_date}
                                onBlur={() => markTouched('start_date')}
                                onChange={(event) => onChange('start_date', event.target.value)}
                                className={cn(formFieldClass, showError('start_date') ? 'border-rose-300 focus:border-rose-500' : '')}
                                required
                            />
                            {showError('start_date') ? <p className="mt-2 text-xs text-rose-600">{errors.start_date}</p> : null}
                        </div>
                        <div>
                            <FieldLabel label="Tanggal selesai" required hint={duration ? `${duration} hari` : undefined} />
                            <input
                                type="date"
                                value={form.end_date}
                                min={form.start_date || undefined}
                                onBlur={() => markTouched('end_date')}
                                onChange={(event) => onChange('end_date', event.target.value)}
                                className={cn(formFieldClass, showError('end_date') ? 'border-rose-300 focus:border-rose-500' : '')}
                                required
                            />
                            {showError('end_date') ? <p className="mt-2 text-xs text-rose-600">{errors.end_date}</p> : null}
                        </div>
                    </div>
                </StaffFormSection>

                <StaffFormSection
                    icon={UserRoundCheck}
                    tone="sky"
                    title="Pengganti"
                    description="Divisi, unit, dan PIC / PH selama cuti."
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
                                onBlur={() => markTouched('pic_name')}
                                onChange={(event) => onChange('pic_name', event.target.value)}
                                placeholder="PIC / PH"
                                className={cn(formFieldClass, showError('pic_name') ? 'border-rose-300 focus:border-rose-500' : '')}
                                required
                            />
                            {showError('pic_name') ? <p className="mt-2 text-xs text-rose-600">{errors.pic_name}</p> : null}
                        </div>
                        <div>
                            <FieldLabel label="Email PIC / PH" />
                            <input
                                type="email"
                                value={form.pic_email}
                                onBlur={() => markTouched('pic_email')}
                                onChange={(event) => onChange('pic_email', event.target.value)}
                                placeholder="Email PIC / PH"
                                className={cn(formFieldClass, showError('pic_email') ? 'border-rose-300 focus:border-rose-500' : '')}
                            />
                            {showError('pic_email') ? <p className="mt-2 text-xs text-rose-600">{errors.pic_email}</p> : null}
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
                    title="Catatan & status"
                    description="Tambahkan hanya jika memang diperlukan."
                >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-[var(--text-secondary)]">Status e-letter dan catatan tambahan.</p>
                        <button
                            type="button"
                            disabled={!canToggleSupporting}
                            onClick={() => setSupportingOpen((current) => !current)}
                            className="inline-flex items-center gap-2 rounded-full border border-[var(--surface-4)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] disabled:cursor-default disabled:opacity-70"
                        >
                            {canToggleSupporting ? (supportingVisible ? 'Sembunyikan detail' : 'Tampilkan detail') : 'Detail aktif'}
                        </button>
                    </div>
                    {supportingVisible ? (
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <div>
                                <FieldLabel label="Status e-letter" />
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
                            <div className="md:col-span-2">
                                <FieldLabel label="Catatan" hint="Opsional" />
                                <textarea
                                    value={form.notes}
                                    onChange={(event) => onChange('notes', event.target.value)}
                                    placeholder="Informasi tambahan bila perlu"
                                    rows={4}
                                    className={formFieldClass}
                                />
                            </div>
                        </div>
                    ) : null}
                </StaffFormSection>
                </div>

                <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
                    <div className="rounded-[28px] border border-[var(--surface-4)] bg-[var(--surface-0)] p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Ringkasan</p>
                        <div className="mt-4 space-y-3">
                            {summaryItems.map((item) => (
                                <div key={item.label} className="flex items-start justify-between gap-4 border-b border-[var(--surface-3)] pb-3 last:border-b-0 last:pb-0">
                                    <span className="text-sm text-[var(--text-secondary)]">{item.label}</span>
                                    <span className="text-right text-sm font-semibold text-[var(--text-primary)]">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-[28px] border border-[var(--surface-4)] bg-[var(--surface-0)] p-5">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">Aksi</p>
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">
                            {editing ? 'Perubahan akan langsung memperbarui data monitoring.' : 'Simpan agar pengajuan langsung masuk ke monitoring.'}
                        </p>
                        <div className="mt-5 flex flex-col gap-3">
                            <Button type="submit" disabled={busy || !canSubmit} className="h-11 rounded-2xl bg-[var(--brand-primary)] px-5 font-bold text-white hover:bg-[var(--brand-primary)]/90">
                                {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FilePenLine className="h-4 w-4" />}
                                {editing ? 'Simpan Perubahan' : submitLabel}
                            </Button>
                            <Button type="button" variant="outline" onClick={onReset} disabled={busy} className="h-11 rounded-2xl px-4">
                                Reset
                            </Button>
                        </div>
                    </div>
                </aside>
            </form>
        </div>
    );
}

function LeaveFiltersCard({
    filters,
    leaveTypes,
    stations,
    showStationFilter,
    onChange,
}: LeaveFiltersCardProps) {
    const activeFilterCount = [filters.month, filters.station_id, filters.leave_type, filters.submission_status, filters.activity_scope, filters.search].filter(Boolean).length;

    return (
        <div className="rounded-[28px] border border-[var(--surface-4)] bg-white p-5">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-base font-semibold text-[var(--text-primary)]">Filter</h2>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">Periode, jenis cuti, dan pencarian cepat.</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--surface-4)] bg-[var(--surface-0)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)]">
                    <Filter className="h-3.5 w-3.5" />
                    {activeFilterCount} filter aktif
                </div>
            </div>

            <div className={`grid gap-4 ${showStationFilter ? 'sm:grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-2 xl:grid-cols-3'}`}>
                <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">Bulan</label>
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
                    <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">Jenis cuti</label>
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
                    <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">Cari</label>
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
        </div>
    );
}

function HCMonitoringFilterToolbar({
    filters,
    leaveTypes,
    stations,
    activeFilterCount,
    onChange,
    onReset,
}: HCMonitoringFilterToolbarProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[180px_220px_220px_minmax(280px,1fr)_auto] xl:items-end">
            <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">Bulan</label>
                <input
                    type="month"
                    value={filters.month}
                    onChange={(event) => onChange('month', event.target.value)}
                    className={formFieldClass}
                />
            </div>

            <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">Cabang</label>
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

            <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">Jenis cuti</label>
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
                <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">Cari</label>
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

            {activeFilterCount > 0 ? (
                <div className="xl:justify-self-end">
                    <button
                        type="button"
                        onClick={onReset}
                        className="inline-flex h-12 items-center gap-2 rounded-full border border-[var(--surface-4)] bg-white px-4 text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                    >
                        <span>{activeFilterCount} filter aktif</span>
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            ) : (
                <div />
            )}
        </div>
    );
}

function HCMonitoringTable({
    busy,
    records,
    canModifyRecord,
    canReviewRecord,
    jumpToMissingLetterToken,
    onEdit,
    onRemove,
    onApprove,
    onReject,
}: HCMonitoringTableProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [sortKey, setSortKey] = useState<HCMonitoringSortKey>('created_at');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [approveConfirmId, setApproveConfirmId] = useState<string | null>(null);
    const [rejectState, setRejectState] = useState<{ id: string | null; reason: string }>({ id: null, reason: '' });
    const [highlightedId, setHighlightedId] = useState<string | null>(null);
    const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

    const sortedRecords = useMemo(() => {
        return [...records].sort((left, right) => compareLeaveRecords(left, right, sortKey, sortDirection));
    }, [records, sortDirection, sortKey]);

    const totalPages = Math.max(1, Math.ceil(sortedRecords.length / rowsPerPage));
    const currentPage = Math.min(page, totalPages);
    const pageStart = (currentPage - 1) * rowsPerPage;
    const paginatedRecords = sortedRecords.slice(pageStart, pageStart + rowsPerPage);

    useEffect(() => {
        if (!jumpToMissingLetterToken) return;
        const targetIndex = sortedRecords.findIndex((record) => record.e_letter_status === 'BELUM_ADA');
        if (targetIndex < 0) return;

        const targetRecord = sortedRecords[targetIndex];
        const nextPage = Math.floor(targetIndex / rowsPerPage) + 1;
        const applyTimeout = window.setTimeout(() => {
            setPage(nextPage);
            setExpandedId(targetRecord.id);
            setHighlightedId(targetRecord.id);
        }, 0);
        const scrollTimeout = window.setTimeout(() => {
            rowRefs.current[targetRecord.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 80);
        const clearTimeoutId = window.setTimeout(() => {
            setHighlightedId((current) => (current === targetRecord.id ? null : current));
        }, 2200);

        return () => {
            window.clearTimeout(applyTimeout);
            window.clearTimeout(scrollTimeout);
            window.clearTimeout(clearTimeoutId);
        };
    }, [jumpToMissingLetterToken, rowsPerPage, sortedRecords]);

    const visiblePages = useMemo(() => {
        if (totalPages <= 5) {
            return Array.from({ length: totalPages }, (_, index) => index + 1);
        }

        const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
        return Array.from({ length: 5 }, (_, index) => start + index);
    }, [currentPage, totalPages]);

    const handleSort = useCallback((key: HCMonitoringSortKey) => {
        setSortKey((currentKey) => {
            if (currentKey === key) {
                setSortDirection((currentDirection) => (currentDirection === 'asc' ? 'desc' : 'asc'));
                return currentKey;
            }

            setSortDirection(key === 'employee_name' || key === 'station' || key === 'pic' ? 'asc' : 'desc');
            return key;
        });
    }, []);

    const handleApprove = useCallback(async (record: HCLeaveRecord) => {
        try {
            await onApprove(record);
            setApproveConfirmId((current) => (current === record.id ? null : current));
        } catch {
            return;
        }
    }, [onApprove]);

    const handleReject = useCallback(async (record: HCLeaveRecord) => {
        const reason = rejectState.reason.trim();
        if (!reason) return;
        try {
            await onReject(record, reason);
            setRejectState((current) => (current.id === record.id ? { id: null, reason: '' } : current));
        } catch {
            return;
        }
    }, [onReject, rejectState.reason]);

    if (records.length === 0) {
        return (
            <div className="rounded-[28px] border border-[var(--surface-4)] bg-white px-6 py-14 text-center">
                <Users className="mx-auto h-10 w-10 text-[var(--text-muted)]" />
                <p className="mt-4 text-base font-semibold text-[var(--text-primary)]">Belum ada data cuti</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">Pengajuan akan muncul setelah data tersedia.</p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-[28px] border border-[var(--surface-4)] bg-white">
            <div className="overflow-x-auto">
                <table className="min-w-full table-fixed">
                    <thead className="bg-[var(--surface-0)]">
                        <tr>
                            {[
                                { key: 'employee_name', label: 'Pegawai', className: 'w-[220px]' },
                                { key: 'period', label: 'Periode', className: 'w-[190px]' },
                                { key: 'station', label: 'Cabang / unit', className: 'w-[220px]' },
                                { key: 'pic', label: 'PIC / PH', className: 'w-[220px]' },
                                { key: 'submission_status', label: 'Status HC', className: 'w-[180px]' },
                                { key: 'e_letter_status', label: 'E-LETTER', className: 'w-[140px]' },
                                { key: 'created_at', label: 'Aksi', className: 'w-[210px]' },
                            ].map((column) => {
                                const isAction = column.key === 'created_at';
                                const isActive = sortKey === column.key;

                                return (
                                    <th
                                        key={column.label}
                                        className={cn(
                                            'px-5 py-3 text-left text-[12px] font-semibold text-[var(--text-secondary)]',
                                            column.className
                                        )}
                                    >
                                        {isAction ? (
                                            column.label
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => handleSort(column.key as HCMonitoringSortKey)}
                                                className="inline-flex items-center gap-2 transition hover:text-[var(--text-primary)]"
                                            >
                                                <span>{column.label}</span>
                                                <span className={cn('text-[10px]', isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]')}>
                                                    {isActive ? (sortDirection === 'asc' ? '▲' : '▼') : '▲▼'}
                                                </span>
                                            </button>
                                        )}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedRecords.map((record) => {
                            const isExpanded = expandedId === record.id;
                            const canReview = canReviewRecord(record);
                            const canEdit = canModifyRecord(record);
                            const showApproveConfirm = approveConfirmId === record.id;
                            const showRejectEditor = rejectState.id === record.id;
                            const reviewerMeta = record.reviewed_by_name || record.reviewed_at
                                ? `${record.reviewed_by_name ? `Oleh ${record.reviewed_by_name}` : 'Sudah direview'}${record.reviewed_at ? ` · ${formatLeaveDate(record.reviewed_at.slice(0, 10))}` : ''}`
                                : 'Belum direview';

                            return (
                                <Fragment key={record.id}>
                                    <tr
                                        ref={(node) => {
                                            rowRefs.current[record.id] = node;
                                        }}
                                        className={cn(
                                            'cursor-pointer border-t border-[var(--surface-3)] align-top transition-colors hover:bg-[var(--surface-0)]',
                                            highlightedId === record.id && 'bg-amber-50'
                                        )}
                                        onClick={() => setExpandedId((current) => (current === record.id ? null : record.id))}
                                    >
                                        <td className="px-5 py-4">
                                            <p className="text-[14px] font-semibold text-[var(--text-primary)]">{record.employee_name}</p>
                                            <p className="mt-1 text-[12px] text-[var(--text-secondary)]">{record.leave_type}</p>
                                        </td>
                                        <td className="px-5 py-4 text-[12px] text-[var(--text-secondary)]">
                                            <p>{formatLeavePeriod(record.start_date, record.end_date)}</p>
                                            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                                                {calculateLeaveDuration(record.start_date, record.end_date) || 0} hari
                                            </p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <p className="text-[14px] text-[var(--text-primary)]">{record.station ? `${record.station.code} - ${record.station.name}` : '-'}</p>
                                            <p className="mt-1 text-[12px] text-[var(--text-secondary)]">{getRecordUnitLabel(record)}</p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <p className="text-[14px] text-[var(--text-primary)]">{record.pic_name || '-'}</p>
                                            <p className="mt-1 text-[12px] text-[var(--text-secondary)]">{record.pic_email || '-'}</p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={cn('inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold', getSubmissionStatusPillClass(record.submission_status))}>
                                                {getSubmissionStatusLabel(record.submission_status)}
                                            </span>
                                            <p className="mt-2 text-[11px] text-[var(--text-muted)]">{reviewerMeta}</p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={cn('inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold', getELetterPillClass(record.e_letter_status))}>
                                                {getELetterLabel(record.e_letter_status)}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4" onClick={(event) => event.stopPropagation()}>
                                            <div className="relative min-h-9">
                                                {showApproveConfirm ? (
                                                    <div className="flex flex-col gap-2">
                                                        <p className="text-[12px] font-medium text-[var(--text-secondary)]">Konfirmasi setujui?</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            <button
                                                                type="button"
                                                                disabled={busy}
                                                                onClick={() => handleApprove(record)}
                                                                className="inline-flex h-8 items-center rounded-lg bg-[#009688] px-3 text-[12px] font-medium text-white transition hover:bg-[#00796B] disabled:opacity-60"
                                                            >
                                                                Ya, Setujui
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={busy}
                                                                onClick={() => setApproveConfirmId(null)}
                                                                className="inline-flex h-8 items-center rounded-lg border border-[#E5E7EB] bg-white px-3 text-[12px] font-medium text-[#6B7280] transition hover:text-[#111827] disabled:opacity-60"
                                                            >
                                                                Batal
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : showRejectEditor ? (
                                                    <div className="absolute right-0 top-0 z-10 w-[280px] rounded-2xl border border-[var(--surface-4)] bg-white p-3 shadow-lg">
                                                        <p className="text-[12px] font-medium text-[var(--text-primary)]">Alasan penolakan</p>
                                                        <textarea
                                                            value={rejectState.reason}
                                                            onChange={(event) => setRejectState({ id: record.id, reason: event.target.value })}
                                                            rows={3}
                                                            className="mt-2 w-full rounded-xl border border-[var(--surface-4)] px-3 py-2 text-[12px] text-[var(--text-primary)] outline-none transition focus:border-[#EF4444]"
                                                            placeholder="Wajib diisi"
                                                        />
                                                        <div className="mt-3 flex justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                disabled={busy}
                                                                onClick={() => setRejectState({ id: null, reason: '' })}
                                                                className="inline-flex h-8 items-center rounded-lg border border-[#E5E7EB] bg-white px-3 text-[12px] font-medium text-[#6B7280] transition hover:text-[#111827] disabled:opacity-60"
                                                            >
                                                                Batal
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={busy || !rejectState.reason.trim()}
                                                                onClick={() => handleReject(record)}
                                                                className="inline-flex h-8 items-center rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-3 text-[12px] font-medium text-[#B91C1C] transition hover:bg-[#FEE2E2] disabled:opacity-60"
                                                            >
                                                                Tolak
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : canReview ? (
                                                    <div className="flex flex-wrap gap-2">
                                                        <button
                                                            type="button"
                                                            disabled={busy}
                                                            onClick={() => {
                                                                setRejectState({ id: null, reason: '' });
                                                                setApproveConfirmId(record.id);
                                                            }}
                                                            className="inline-flex h-8 items-center rounded-lg bg-[#009688] px-3 text-[12px] font-medium text-white transition hover:bg-[#00796B] disabled:opacity-60"
                                                        >
                                                            Setujui
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={busy}
                                                            onClick={() => {
                                                                setApproveConfirmId(null);
                                                                setRejectState({ id: record.id, reason: '' });
                                                            }}
                                                            className="inline-flex h-8 items-center rounded-lg border border-[#FCA5A5] bg-white px-3 text-[12px] font-medium text-[#DC2626] transition hover:bg-[#FEF2F2] disabled:opacity-60"
                                                        >
                                                            Tolak
                                                        </button>
                                                    </div>
                                                ) : canEdit ? (
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            type="button"
                                                            disabled={busy}
                                                            onClick={() => onEdit(record)}
                                                            className="text-[12px] font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] disabled:opacity-60"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={busy}
                                                            onClick={() => onRemove(record)}
                                                            className="text-[12px] font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] disabled:opacity-60"
                                                        >
                                                            Hapus
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-[12px] text-[var(--text-muted)]">-</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>

                                    {isExpanded ? (
                                        <tr className="border-t border-[var(--surface-3)] bg-[var(--surface-0)]">
                                            <td colSpan={7} className="px-5 py-4">
                                                <div className="space-y-3">
                                                    <div>
                                                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Catatan</p>
                                                        <p className="mt-1 text-[13px] leading-6 text-[var(--text-secondary)]">{record.notes || '-'}</p>
                                                    </div>
                                                    {record.review_notes ? (
                                                        <div>
                                                            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Catatan HC</p>
                                                            <p className="mt-1 text-[13px] leading-6 text-[var(--text-secondary)]">{record.review_notes}</p>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </td>
                                        </tr>
                                    ) : null}
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-[var(--surface-3)] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <p className="text-[12px] text-[var(--text-secondary)]">Menampilkan {paginatedRecords.length} dari {records.length} pengajuan</p>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <label className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
                        <span>Rows</span>
                        <select
                            value={rowsPerPage}
                            onChange={(event) => {
                                setRowsPerPage(Number(event.target.value));
                                setPage(1);
                            }}
                            className="h-8 rounded-lg border border-[var(--surface-4)] bg-white px-2 text-[12px] text-[var(--text-primary)] outline-none transition focus:border-[#009688]"
                        >
                            {[20, 50, 100].map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    </label>

                    {records.length > 20 ? (
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => setPage((current) => Math.max(1, current - 1))}
                                disabled={currentPage === 1}
                                className="inline-flex h-8 items-center gap-1 rounded-lg border border-[var(--surface-4)] bg-white px-3 text-[12px] text-[var(--text-secondary)] transition hover:bg-[var(--surface-0)] disabled:opacity-50"
                            >
                                <ChevronLeft className="h-3.5 w-3.5" />
                                Previous
                            </button>

                            {visiblePages.map((pageNumber) => (
                                <button
                                    key={pageNumber}
                                    type="button"
                                    onClick={() => setPage(pageNumber)}
                                    className={cn(
                                        'inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-[12px] font-medium transition',
                                        pageNumber === currentPage
                                            ? 'border-[#009688] bg-[#009688] text-white'
                                            : 'border-[var(--surface-4)] bg-white text-[var(--text-secondary)] hover:bg-[var(--surface-0)]'
                                    )}
                                >
                                    {pageNumber}
                                </button>
                            ))}

                            <button
                                type="button"
                                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                                disabled={currentPage === totalPages}
                                className="inline-flex h-8 items-center gap-1 rounded-lg border border-[var(--surface-4)] bg-white px-3 text-[12px] text-[var(--text-secondary)] transition hover:bg-[var(--surface-0)] disabled:opacity-50"
                            >
                                Next
                                <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
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
            <div className="rounded-[28px] border border-[var(--surface-4)] bg-white px-6 py-14 text-center">
                <Users className="mx-auto h-10 w-10 text-[var(--text-muted)]" />
                <p className="mt-4 text-lg font-semibold text-[var(--text-primary)]">{emptyTitle}</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{emptyDescription}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full overflow-hidden rounded-[28px] border border-[var(--surface-4)] bg-white text-sm">
                    <thead className="bg-[var(--surface-0)] text-left text-xs font-semibold text-[var(--text-secondary)]">
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
                                <tr key={record.id} className="border-t border-[var(--surface-3)] align-top transition-colors hover:bg-[var(--surface-0)]">
                                    <td className="px-4 py-4">
                                        <p className="font-bold text-[var(--text-primary)]">{record.employee_name}</p>
                                        <p className="mt-1 text-xs text-[var(--text-muted)]">{record.leave_type}</p>
                                    </td>
                                    <td className="px-4 py-4 text-[var(--text-secondary)]">
                                        <p>{formatLeavePeriod(record.start_date, record.end_date)}</p>
                                        <p className="mt-1 text-xs text-[var(--text-muted)]">{calculateLeaveDuration(record.start_date, record.end_date) || 0} hari</p>
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
                                        <span className={cn('rounded-full px-3 py-1 text-xs font-bold', getELetterPillClass(record.e_letter_status))}>
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
                        <div key={record.id} className="rounded-[24px] border border-[var(--surface-4)] bg-white p-5">
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
                                    <span className={cn('rounded-full px-3 py-1 text-xs font-bold', getELetterPillClass(record.e_letter_status))}>
                                        {getStatusLabel(record.e_letter_status)}
                                    </span>
                                </div>
                            </div>
                            <div className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
                                <p><strong>Periode:</strong> {formatLeavePeriod(record.start_date, record.end_date)}</p>
                                <p><strong>Cabang:</strong> {record.station ? `${record.station.code} - ${record.station.name}` : '-'}</p>
                                <p><strong>Divisi / Unit:</strong> {record.division_name || '-'} / {record.unit_name || '-'}</p>
                                <p><strong>PH / Pengganti:</strong> {record.pic_name || '-'} / {record.pic_phone || '-'}</p>
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
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function BranchStaffTabs({ current }: { current: BranchStaffPage }) {
    return (
        <div className="mb-6 inline-flex rounded-full border border-[var(--surface-4)] bg-white p-1">
            <Link
                href={BRANCH_FORM_HREF}
                className={`rounded-full px-4 py-2 text-[14px] font-medium transition-colors ${
                    current === 'form'
                        ? 'bg-[var(--brand-primary)] text-white'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
            >
                Buat pengajuan
            </Link>
            <Link
                href={BRANCH_HISTORY_HREF}
                className={`rounded-full px-4 py-2 text-[14px] font-medium transition-colors ${
                    current === 'history'
                        ? 'bg-[var(--brand-primary)] text-white'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
            >
                Riwayat saya
            </Link>
        </div>
    );
}

function BranchStaffLeaveHistoryView({
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
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const sortedRecords = useMemo(() => {
        return [...records].sort((left, right) => {
            const rightTime = new Date(right.created_at || right.start_date).getTime();
            const leftTime = new Date(left.created_at || left.start_date).getTime();
            return rightTime - leftTime;
        });
    }, [records]);

    return (
        <div className="mx-auto max-w-[920px]" style={{ fontFamily: 'Inter, var(--font-body), sans-serif' }}>
            <BranchStaffTabs current="history" />
            <div className="rounded-[32px] border border-[var(--surface-4)] bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] md:p-8">
                <div className="mb-8 flex flex-col gap-2">
                    <h1 className="text-[28px] font-black leading-8 text-[var(--text-primary)]">Riwayat pengajuan</h1>
                    <p className="text-sm text-[var(--text-secondary)]">Pantau status, catatan HC, dan aksi yang masih bisa diubah.</p>
                </div>

                {sortedRecords.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[var(--surface-4)] bg-[var(--surface-0)] px-4 py-10 text-center">
                        <p className="text-[14px] font-medium text-[var(--text-primary)]">Belum ada pengajuan.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {sortedRecords.map((record) => {
                            const isExpanded = expandedId === record.id;
                            const hasNotes = Boolean(record.notes || record.review_notes);

                            return (
                                <div key={record.id} className="rounded-[24px] border border-[var(--surface-4)] bg-[var(--surface-0)] p-5">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0">
                                            <p className="text-[15px] font-semibold text-[var(--text-primary)]">
                                                {record.employee_name} · {record.leave_type}
                                            </p>
                                            <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
                                                {formatLeavePeriod(record.start_date, record.end_date)}
                                            </p>
                                        </div>
                                        <span
                                            className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[12px] font-medium ${
                                                record.submission_status === 'APPROVED'
                                                    ? 'bg-[#DCFCE7] text-[#166534]'
                                                    : record.submission_status === 'REJECTED'
                                                      ? 'bg-[#FEE2E2] text-[#991B1B]'
                                                      : 'bg-[#FEF3C7] text-[#92400E]'
                                            }`}
                                        >
                                            {record.submission_status === 'APPROVED'
                                                ? 'Disetujui HC'
                                                : record.submission_status === 'REJECTED'
                                                  ? 'Ditolak'
                                                  : 'Pending'}
                                        </span>
                                    </div>

                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                        <span className="rounded-full border border-[var(--surface-4)] bg-white px-2.5 py-1 text-[12px] font-medium text-[var(--text-secondary)]">
                                            PIC: {record.pic_name || '-'}
                                        </span>
                                        {canModifyRecord(record) ? (
                                            <>
                                                <button
                                                    type="button"
                                                    className="text-[12px] font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                                                    onClick={() => onEdit(record)}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    className="text-[12px] font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                                                    onClick={() => onRemove(record)}
                                                >
                                                    Hapus
                                                </button>
                                            </>
                                        ) : null}
                                        {hasNotes ? (
                                            <button
                                                type="button"
                                                className="text-[12px] font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                                                onClick={() => setExpandedId((current) => (current === record.id ? null : record.id))}
                                            >
                                                {isExpanded ? 'Sembunyikan catatan' : 'Lihat catatan'}
                                            </button>
                                        ) : null}
                                    </div>

                                    <div
                                        className={`overflow-hidden transition-all duration-300 ${
                                            isExpanded ? 'mt-4 max-h-48 opacity-100' : 'max-h-0 opacity-0'
                                        }`}
                                    >
                                        <div className="space-y-3 border-t border-[var(--surface-3)] pt-4">
                                            {record.notes ? (
                                                <div>
                                                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                                                        Catatan
                                                    </p>
                                                    <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">{record.notes}</p>
                                                </div>
                                            ) : null}
                                            {record.review_notes ? (
                                                <div>
                                                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                                                        Catatan HC
                                                    </p>
                                                    <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">{record.review_notes}</p>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

function BranchStaffLeaveSubmissionView({
    busy,
    editing,
    form,
    successVisible,
    onFormChange,
    onSubmit,
    onReset,
}: {
    busy: boolean;
    editing: HCLeaveRecord | null;
    form: LeaveFormState;
    successVisible: boolean;
    onFormChange: (field: keyof LeaveFormState, value: string) => void;
    onSubmit: (event: React.FormEvent) => void;
    onReset: () => void;
}) {
    return (
        <div className="mx-auto max-w-[1240px]" style={{ fontFamily: 'Inter, var(--font-body), sans-serif' }}>
            <BranchStaffTabs current="form" />
            <div className="space-y-5">
                <div className="max-w-2xl">
                    <h1 className="text-[32px] font-black leading-tight text-[var(--text-primary)]">Ajukan cuti</h1>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        Isi data inti terlebih dulu. Detail tambahan hanya ditampilkan bila diperlukan.
                    </p>
                </div>

                {successVisible ? (
                    <div className="flex items-start gap-3 rounded-[24px] border border-emerald-200 bg-emerald-50 px-4 py-4">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                        <div>
                            <p className="text-sm font-semibold text-[var(--text-primary)]">Pengajuan terkirim</p>
                            <Link href={BRANCH_HISTORY_HREF} className="mt-1 inline-flex text-sm font-medium text-emerald-700 hover:text-emerald-800">
                                Lihat riwayat
                            </Link>
                        </div>
                    </div>
                ) : null}

                <LeaveFormCard
                    busy={busy}
                    editing={editing}
                    form={form}
                    stations={[]}
                    leaveTypeOptions={[...BRANCH_LEAVE_TYPE_OPTIONS]}
                    showStationSelect={false}
                    title={editing ? 'Perbarui pengajuan' : 'Buat pengajuan'}
                    eyebrow="Pengajuan cuti"
                    description="Form ringkas dengan fokus pada data inti dan PIC pengganti."
                    submitLabel={editing ? 'Simpan perubahan' : 'Kirim pengajuan'}
                    onChange={onFormChange}
                    onSubmit={onSubmit}
                    onReset={onReset}
                />
            </div>
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

    if (formOpen) {
        return (
            <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-medium text-[var(--text-secondary)]">Monitoring cuti</p>
                        <h1 className="text-[30px] font-black text-[var(--text-primary)]">{editing ? 'Edit pengajuan' : 'Buat pengajuan'}</h1>
                    </div>
                    <Button variant="outline" className="rounded-2xl border-[var(--surface-4)] bg-white" onClick={onReset}>
                        Kembali ke monitoring
                    </Button>
                </div>

                <LeaveFormCard
                    busy={busy}
                    editing={editing}
                    form={form}
                    stations={[]}
                    leaveTypeOptions={buildLeaveTypeOptions(leaveTypes)}
                    showStationSelect={false}
                    title={editing ? 'Perbarui pengajuan' : 'Buat pengajuan'}
                    eyebrow="Cuti cabang"
                    description="Form fokus untuk input atau update data cuti cabang."
                    submitLabel="Simpan data"
                    showCloseButton={false}
                    onChange={onFormChange}
                    onSubmit={onSubmit}
                    onReset={onReset}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="space-y-2">
                    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--surface-4)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]">
                        <Building2 className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
                        Cuti cabang
                    </div>
                    <div>
                        <h1 className="text-[32px] font-black tracking-tight text-[var(--text-primary)]">Monitoring cuti cabang</h1>
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">Filter cepat, lihat status, lalu buat pengajuan baru saat diperlukan.</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Button variant="outline" className="rounded-2xl border-[var(--surface-4)] bg-white" onClick={onRefresh} disabled={busy}>
                        <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button className="rounded-2xl bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary)]/90" onClick={onCreate}>
                        <Plus className="h-4 w-4" />
                        Buat pengajuan
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <StatCard
                    label="Total"
                    value={records.length}
                    description="Semua pengajuan terlihat."
                    toneClass="border-[var(--surface-4)] bg-white text-[var(--brand-primary)]"
                    icon={ClipboardList}
                />
                <StatCard
                    label="Pending"
                    value={pendingCount}
                    description="Menunggu keputusan HC."
                    toneClass="border-[var(--surface-4)] bg-white text-amber-600"
                    icon={Clock3}
                />
                <StatCard
                    label="Active"
                    value={activeTodayCount}
                    description="Berjalan hari ini."
                    toneClass="border-[var(--surface-4)] bg-white text-emerald-600"
                    icon={CalendarDays}
                />
            </div>

            <LeaveFiltersCard
                filters={filters}
                leaveTypes={leaveTypes}
                stations={[]}
                showStationFilter={false}
                onChange={onFilterChange}
            />

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
            {noLetterCount > 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">{noLetterCount} pengajuan masih belum memiliki e-letter.</p>
            ) : null}
        </div>
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
    activeFilterCount,
    statusCounts,
    missingLetterCount,
    jumpToMissingLetterToken,
    onFormChange,
    onFilterChange,
    onResetFilters,
    onSubmit,
    onReset,
    onRefresh,
    onCreate,
    onExport,
    onJumpToMissingLetter,
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
    activeFilterCount: number;
    statusCounts: Record<HCLeaveSubmissionStatus, number>;
    missingLetterCount: number;
    jumpToMissingLetterToken: number;
    onFormChange: (field: keyof LeaveFormState, value: string) => void;
    onFilterChange: (field: keyof LeaveFilters, value: string) => void;
    onResetFilters: () => void;
    onSubmit: (event: React.FormEvent) => void;
    onReset: () => void;
    onRefresh: () => void;
    onCreate: () => void;
    onExport: () => void;
    onJumpToMissingLetter: () => void;
    canModifyRecord: (record: HCLeaveRecord) => boolean;
    canReviewRecord: (record: HCLeaveRecord) => boolean;
    onEdit: (record: HCLeaveRecord) => void;
    onRemove: (record: HCLeaveRecord) => void;
    onApprove: (record: HCLeaveRecord) => Promise<void>;
    onReject: (record: HCLeaveRecord, reason: string) => Promise<void>;
}) {
    if (formOpen) {
        return (
            <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-medium text-[var(--text-secondary)]">Monitoring HC</p>
                        <h1 className="text-[30px] font-black text-[var(--text-primary)]">{editing ? 'Edit pengajuan' : 'Buat pengajuan'}</h1>
                    </div>
                    <Button variant="outline" className="rounded-2xl border-[var(--surface-4)] bg-white" onClick={onReset}>
                        Kembali ke monitoring
                    </Button>
                </div>

                <LeaveFormCard
                    busy={busy}
                    editing={editing}
                    form={form}
                    stations={stations}
                    leaveTypeOptions={buildLeaveTypeOptions(leaveTypes)}
                    showStationSelect
                    title={editing ? 'Perbarui pengajuan' : 'Buat pengajuan'}
                    eyebrow="Human capital"
                    description="Workspace fokus untuk input manual atau koreksi data cuti."
                    submitLabel="Simpan data"
                    showCloseButton={false}
                    onChange={onFormChange}
                    onSubmit={onSubmit}
                    onReset={onReset}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--surface-4)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]">
                        <CalendarDays className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
                        Human capital
                    </div>
                    <h1 className="mt-3 text-[32px] font-black leading-tight text-[var(--text-primary)]">Monitoring cuti</h1>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">Ringkas, cepat dipindai, dan fokus pada status serta aksi berikutnya.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={onRefresh}
                        disabled={busy}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#6B7280] transition hover:text-[#111827] disabled:opacity-60"
                    >
                        <RefreshCw className={cn('h-4 w-4', busy && 'animate-spin')} />
                    </button>

                    <button
                        type="button"
                        onClick={onExport}
                        className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[var(--surface-4)] bg-white px-4 text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                    >
                        <Download className="h-4 w-4" />
                        Export Excel
                    </button>

                    {missingLetterCount > 0 ? (
                        <button
                            type="button"
                            onClick={onJumpToMissingLetter}
                            className="inline-flex h-11 items-center rounded-full border border-amber-200 bg-amber-50 px-4 text-sm font-medium text-amber-700 transition hover:bg-amber-100"
                        >
                            {missingLetterCount} belum e-letter
                        </button>
                    ) : null}

                    <button
                        type="button"
                        onClick={onCreate}
                        className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#009688] px-4 text-sm font-medium text-white transition hover:bg-[#00796B]"
                    >
                        <Plus className="h-4 w-4" />
                        Buat pengajuan
                    </button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <StatCard
                    label="Total"
                    value={records.length}
                    description="Seluruh hasil filter saat ini."
                    toneClass="border-[var(--surface-4)] bg-white text-[var(--brand-primary)]"
                    icon={ClipboardList}
                />
                <StatCard
                    label="Pending"
                    value={statusCounts.PENDING}
                    description="Perlu review HC."
                    toneClass="border-[var(--surface-4)] bg-white text-amber-600"
                    icon={Clock3}
                />
                <StatCard
                    label="Approved"
                    value={statusCounts.APPROVED}
                    description="Sudah diputuskan."
                    toneClass="border-[var(--surface-4)] bg-white text-emerald-600"
                    icon={CheckCircle2}
                />
                <StatCard
                    label="Missing e-letter"
                    value={missingLetterCount}
                    description="Perlu tindak lanjut."
                    toneClass="border-[var(--surface-4)] bg-white text-sky-600"
                    icon={FileText}
                />
            </div>

            <div className="rounded-[28px] border border-[var(--surface-4)] bg-white p-5">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="text-base font-semibold text-[var(--text-primary)]">Status & filter</h2>
                            <p className="mt-1 text-sm text-[var(--text-secondary)]">Persempit data tanpa kehilangan fokus pada tabel.</p>
                        </div>
                        <HCSubmissionQuickFilters
                            current={filters.submission_status}
                            counts={statusCounts}
                            onChange={(value) => onFilterChange('submission_status', value)}
                        />
                    </div>
                    <HCMonitoringFilterToolbar
                        filters={filters}
                        leaveTypes={leaveTypes}
                        stations={stations}
                        activeFilterCount={activeFilterCount}
                        onChange={onFilterChange}
                        onReset={onResetFilters}
                    />
                </div>
            </div>

            <HCMonitoringTable
                busy={busy}
                records={records}
                canModifyRecord={canModifyRecord}
                canReviewRecord={canReviewRecord}
                jumpToMissingLetterToken={jumpToMissingLetterToken}
                onEdit={onEdit}
                onRemove={onRemove}
                onApprove={onApprove}
                onReject={onReject}
            />
        </div>
    );
}

export function HCLeaveWorkspace({ mode }: { mode: WorkspaceMode }) {
    const router = useRouter();
    const searchParams = useSearchParams();
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
    const [deleteState, setDeleteState] = useState<DeleteState>({
        open: false,
        record: null,
    });
    const [feedbackItems, setFeedbackItems] = useState<HCFeedbackItem[]>([]);
    const [branchSuccessVisible, setBranchSuccessVisible] = useState(false);
    const [jumpToMissingLetterToken, setJumpToMissingLetterToken] = useState(0);
    const [filters, setFilters] = useState<LeaveFilters>({
        month: '',
        station_id: '',
        leave_type: '',
        submission_status: '',
        activity_scope: '',
        search: '',
    });

    const isHCManager = ['SUPER_ADMIN', 'ANALYST', 'DIVISI_HC', 'PARTNER_HC'].includes(user?.role || '');
    const isBranchManager = user?.role === 'MANAGER_CABANG';
    const presentation: LeavePresentation = mode === 'hc' ? 'hc' : (isBranchManager ? 'manager' : 'staff');
    const branchPage = getBranchStaffPage(searchParams.get('view'));

    const load = useCallback(async () => {
        setBusy(true);
        try {
            const requests = [
                fetch('/api/hc/leave-records', { cache: 'no-store' }),
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
    }, []);

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

    useEffect(() => {
        const submissionStatus = searchParams.get('submission_status');
        const activityScope = searchParams.get('activity_scope');

        setFilters({
            month: searchParams.get('month') || '',
            station_id: searchParams.get('station_id') || '',
            leave_type: searchParams.get('leave_type') || '',
            submission_status: SUBMISSION_STATUS_OPTIONS.some((option) => option.value === submissionStatus)
                ? (submissionStatus as HCLeaveSubmissionStatus)
                : '',
            activity_scope: activityScope === 'active_today' ? 'active_today' : '',
            search: searchParams.get('search') || '',
        });
    }, [searchParams]);

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

    const filteredRecordsWithoutStatus = useMemo(() => {
        return filterLeaveRecords(records, filters, { ignoreSubmissionStatus: true });
    }, [records, filters]);

    const filteredRecords = useMemo(() => {
        return filterLeaveRecords(records, filters);
    }, [records, filters]);

    const hcStatusCounts = useMemo(() => {
        return {
            PENDING: filteredRecordsWithoutStatus.filter((record) => record.submission_status === 'PENDING').length,
            APPROVED: filteredRecordsWithoutStatus.filter((record) => record.submission_status === 'APPROVED').length,
            REJECTED: filteredRecordsWithoutStatus.filter((record) => record.submission_status === 'REJECTED').length,
        } satisfies Record<HCLeaveSubmissionStatus, number>;
    }, [filteredRecordsWithoutStatus]);

    const activeFilterCount = useMemo(() => {
        return [filters.month, filters.station_id, filters.leave_type, filters.submission_status, filters.activity_scope, filters.search].filter(Boolean).length;
    }, [filters]);

    const canModifyRecord = useCallback((record: HCLeaveRecord) => {
        if (isHCManager) return true;
        if (record.submission_status && record.submission_status !== 'PENDING') return false;
        if (user?.role === 'MANAGER_CABANG') return user.station_id === record.station_id;
        return record.created_by === user?.id;
    }, [isHCManager, user?.id, user?.role, user?.station_id]);

    const canReviewRecord = useCallback((record: HCLeaveRecord) => {
        if (isHCManager) return record.submission_status === 'PENDING';
        if (user?.role === 'MANAGER_CABANG') {
            return user.station_id === record.station_id && record.submission_status === 'PENDING';
        }
        return false;
    }, [isHCManager, user?.role, user?.station_id]);

    const startCreate = useCallback(() => {
        setBranchSuccessVisible(false);
        setEditing(null);
        setForm(emptyForm(mode === 'branch' ? user?.station_id : null));
        setFormOpen(true);
    }, [mode, user?.station_id]);

    const startEdit = useCallback((record: HCLeaveRecord) => {
        setBranchSuccessVisible(false);
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
        setBranchSuccessVisible(false);
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

    const closeDeleteModal = useCallback(() => {
        if (busy) return;
        setDeleteState({
            open: false,
            record: null,
        });
    }, [busy]);

    const handleFormChange = useCallback((field: keyof LeaveFormState, value: string) => {
        setBranchSuccessVisible(false);
        setForm((current) => {
            const nextValue = field === 'e_letter_status' ? (value as HCLeaveLetterStatus) : value;
            const nextState = {
                ...current,
                [field]: nextValue,
            };

            if (field === 'start_date' && nextState.end_date && nextState.end_date < value) {
                nextState.end_date = '';
            }

            return nextState;
        });
    }, []);

    const handleFilterChange = useCallback((field: keyof LeaveFilters, value: string) => {
        setFilters((current) => ({
            ...current,
            [field]: value,
        }));
    }, []);

    const resetFilters = useCallback(() => {
        setFilters({
            month: '',
            station_id: '',
            leave_type: '',
            submission_status: '',
            activity_scope: '',
            search: '',
        });
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

            const savedRecord = await response.json().catch(() => null);
            if (savedRecord) {
                setRecords((current) => upsertLeaveRecord(current, savedRecord));
            }
            resetForm();
            if (!editing && presentation === 'staff') {
                setBranchSuccessVisible(true);
            } else {
                pushFeedback(
                    'success',
                    editing ? 'Perubahan tersimpan' : 'Pengajuan terkirim',
                    editing ? 'Data cuti berhasil diperbarui.' : 'Pengajuan cuti langsung masuk ke monitoring GM/EGM.'
                );
            }
        } catch (error) {
            pushFeedback('error', 'Gagal menyimpan data', error instanceof Error ? error.message : 'Gagal menyimpan data leave');
        } finally {
            setBusy(false);
        }
    };

    const openBranchHistoryEdit = useCallback((record: HCLeaveRecord) => {
        startEdit(record);
        router.push(BRANCH_FORM_HREF);
    }, [router, startEdit]);

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
                throw new Error(error.error || 'Gagal mengarsipkan data');
            }

            setRecords((current) => current.filter((item) => item.id !== record.id));
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

    const submitReview = useCallback(async () => {
        const record = reviewState.record;
        if (!record) return;

        const nextStatus = reviewState.nextStatus;
        const reviewNotes = reviewState.notes.trim();
        if (nextStatus === 'REJECTED' && !reviewNotes) {
            pushFeedback('error', 'Alasan wajib diisi', 'Isi alasan penolakan sebelum mengirim review.');
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

            const updatedRecord = await response.json().catch(() => null);
            if (updatedRecord) {
                setRecords((current) => upsertLeaveRecord(current, updatedRecord));
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
            pushFeedback(
                'success',
                nextStatus === 'REJECTED' ? 'Pengajuan ditolak' : 'Pengajuan disetujui',
                `${record.employee_name} berhasil diproses oleh GM/EGM.`
            );
        } catch (error) {
            pushFeedback('error', 'Gagal memperbarui status', error instanceof Error ? error.message : 'Gagal memperbarui status');
        } finally {
            setBusy(false);
        }
    }, [editing?.id, pushFeedback, resetForm, reviewState.nextStatus, reviewState.notes, reviewState.record]);

    const approveInline = useCallback(async (record: HCLeaveRecord) => {
        setBusy(true);
        try {
            const response = await fetch(`/api/hc/leave-records/${record.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    submission_status: 'APPROVED',
                    review_notes: null,
                }),
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error || 'Gagal memperbarui status');
            }

            const updatedRecord = await response.json().catch(() => null);
            if (updatedRecord) {
                setRecords((current) => upsertLeaveRecord(current, updatedRecord));
            }
            pushFeedback('success', 'Pengajuan disetujui', `${record.employee_name} berhasil diproses oleh GM/EGM.`);
        } catch (error) {
            pushFeedback('error', 'Gagal memperbarui status', error instanceof Error ? error.message : 'Gagal memperbarui status');
            throw error;
        } finally {
            setBusy(false);
        }
    }, [pushFeedback]);

    const rejectInline = useCallback(async (record: HCLeaveRecord, reason: string) => {
        setBusy(true);
        try {
            const response = await fetch(`/api/hc/leave-records/${record.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    submission_status: 'REJECTED',
                    review_notes: reason.trim(),
                }),
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error || 'Gagal memperbarui status HC');
            }

            const updatedRecord = await response.json().catch(() => null);
            if (updatedRecord) {
                setRecords((current) => upsertLeaveRecord(current, updatedRecord));
            }
            pushFeedback('success', 'Pengajuan ditolak', `${record.employee_name} berhasil diproses.`);
        } catch (error) {
            pushFeedback('error', 'Gagal memperbarui status HC', error instanceof Error ? error.message : 'Gagal memperbarui status HC');
            throw error;
        } finally {
            setBusy(false);
        }
    }, [pushFeedback]);

    const exportExcel = useCallback(() => {
        const params = new URLSearchParams();
        if (filters.month) params.set('month', filters.month);
        if (filters.station_id) params.set('station_id', filters.station_id);
        if (filters.leave_type) params.set('leave_type', filters.leave_type);
        if (filters.submission_status) params.set('submission_status', filters.submission_status);
        if (filters.activity_scope) params.set('activity_scope', filters.activity_scope);
        window.open(`/api/hc/leave-records/export?${params.toString()}`, '_blank');
    }, [filters.activity_scope, filters.leave_type, filters.month, filters.station_id, filters.submission_status]);

    return (
        <div className="min-h-screen p-4 md:p-6" style={{ fontFamily: 'Inter, var(--font-body), sans-serif' }}>
            <div className="mx-auto max-w-[1440px] space-y-6">
                {presentation === 'staff' && (
                    branchPage === 'history' ? (
                        <BranchStaffLeaveHistoryView
                            records={records}
                            canModifyRecord={canModifyRecord}
                            onEdit={openBranchHistoryEdit}
                            onRemove={requestDeleteRecord}
                        />
                    ) : (
                        <BranchStaffLeaveSubmissionView
                            busy={busy}
                            editing={editing}
                            form={form}
                            successVisible={branchSuccessVisible}
                            onFormChange={handleFormChange}
                            onSubmit={submit}
                            onReset={resetForm}
                        />
                    )
                )}

                {presentation === 'manager' && (
                    <BranchManagerLeaveMonitoringView
                        busy={busy}
                        records={filteredRecords}
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
                        records={filteredRecords}
                        stations={stations}
                        editing={editing}
                        formOpen={formOpen}
                        form={form}
                        filters={filters}
                        leaveTypes={leaveTypes}
                        activeFilterCount={activeFilterCount}
                        statusCounts={hcStatusCounts}
                        missingLetterCount={filteredRecords.filter((record) => record.e_letter_status === 'BELUM_ADA').length}
                        jumpToMissingLetterToken={jumpToMissingLetterToken}
                        onFormChange={handleFormChange}
                        onFilterChange={handleFilterChange}
                        onResetFilters={resetFilters}
                        onSubmit={submit}
                        onReset={resetForm}
                        onRefresh={load}
                        onCreate={startCreate}
                        onExport={exportExcel}
                        onJumpToMissingLetter={() => setJumpToMissingLetterToken((current) => current + 1)}
                        canModifyRecord={canModifyRecord}
                        canReviewRecord={canReviewRecord}
                        onEdit={startEdit}
                        onRemove={requestDeleteRecord}
                        onApprove={approveInline}
                        onReject={rejectInline}
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
