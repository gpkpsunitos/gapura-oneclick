'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    ArrowDownAZ,
    ArrowUpAZ,
    BookOpen,
    ChevronsUpDown,
    FileSpreadsheet,
    Loader2,
    LogOut,
    RefreshCw,
    Search,
    SlidersHorizontal,
    X,
} from 'lucide-react';
import { logoutWithPwaCleanup } from '@/lib/pwa/logout';
import { exportDivisionDocumentsToExcel } from '@/lib/division-documents-export';
import { getFileKind } from '@/lib/material-file-kind';
import { cn } from '@/lib/utils';
import { AIRLINES } from '@/data/airlines';
import type { DivisionDocument } from '@/types';

type SortKey = 'meeting_date' | 'title' | 'activity_location' | 'activity_pic' | 'station' | 'airline' | 'participants';
type SortDir = 'asc' | 'desc';
interface SortRule { key: SortKey; dir: SortDir }

interface FieldFilters {
    title: string;
    activity_location: string;
    activity_pic: string;
    station: string;
    airline: string;
    participants: string;
    dateFrom: string;
    dateTo: string;
}

function emptyFilters(): FieldFilters {
    return { title: '', activity_location: '', activity_pic: '', station: '', airline: '', participants: '', dateFrom: '', dateTo: '' };
}

const ROW_LIMIT = 50;

function formatDate(value?: string | null) {
    if (!value) return '—';
    const normalized = value.includes('T') ? value : `${value}T00:00:00`;
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function sortValue(doc: DivisionDocument, key: SortKey): string {
    switch (key) {
        case 'meeting_date': return doc.meeting_date || doc.created_at || '';
        case 'title': return doc.title || '';
        case 'activity_location': return doc.activity_location || '';
        case 'station': return doc.station_code || doc.station_name || '';
        case 'airline': return doc.airline || '';
        case 'activity_pic': return doc.activity_pic || '';
        case 'participants': return doc.participants || '';
        default: return '';
    }
}

function MaterialButton({ href, label }: { href?: string | null; label: string }) {
    if (!href) return null;
    const kind = getFileKind(href);
    const Icon = kind.icon;
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition hover:shadow-sm',
                kind.className
            )}
        >
            <Icon className="h-3.5 w-3.5" />
            {label}
        </a>
    );
}

export function EskalasiDocumentsViewerPage({ hideNav = false }: { hideNav?: boolean } = {}) {
    const [documents, setDocuments] = useState<DivisionDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [sortRules, setSortRules] = useState<SortRule[]>([{ key: 'meeting_date', dir: 'desc' }]);
    const [filters, setFilters] = useState<FieldFilters>(emptyFilters());
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [visibleCount, setVisibleCount] = useState(ROW_LIMIT);
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/division-documents?division=ANALYST', { cache: 'no-store' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Unable to load documents');
            setDocuments(Array.isArray(data) ? data : []);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unable to load documents');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const visibleDocuments = useMemo(() => {
        const query = search.trim().toLowerCase();
        const filtered = documents.filter((doc) => {
            if (query) {
                const haystack = [doc.title, doc.activity_location, doc.activity_pic, doc.station_code, doc.station_name, doc.airline, doc.participants]
                    .filter(Boolean).join(' ').toLowerCase();
                if (!haystack.includes(query)) return false;
            }
            if (filters.title && !(doc.title || '').toLowerCase().includes(filters.title.toLowerCase())) return false;
            if (filters.activity_location && !(doc.activity_location || '').toLowerCase().includes(filters.activity_location.toLowerCase())) return false;
            if (filters.activity_pic && !(doc.activity_pic || '').toLowerCase().includes(filters.activity_pic.toLowerCase())) return false;
            if (filters.station) {
                const stationHay = `${doc.station_code || ''} ${doc.station_name || ''}`.toLowerCase();
                if (!stationHay.includes(filters.station.toLowerCase())) return false;
            }
            if (filters.airline && !(doc.airline || '').toLowerCase().includes(filters.airline.toLowerCase())) return false;
            if (filters.participants && !(doc.participants || '').toLowerCase().includes(filters.participants.toLowerCase())) return false;
            const docDate = (doc.meeting_date || doc.created_at || '').slice(0, 10);
            if (filters.dateFrom && (!docDate || docDate < filters.dateFrom)) return false;
            if (filters.dateTo && (!docDate || docDate > filters.dateTo)) return false;
            return true;
        });
        const sorted = [...filtered].sort((a, b) => {
            for (const rule of sortRules) {
                const cmp = sortValue(a, rule.key).localeCompare(sortValue(b, rule.key));
                if (cmp !== 0) return rule.dir === 'asc' ? cmp : -cmp;
            }
            return 0;
        });
        return sorted;
    }, [documents, search, filters, sortRules]);

    const displayedDocuments = useMemo(
        () => visibleDocuments.slice(0, visibleCount),
        [visibleDocuments, visibleCount]
    );

    useEffect(() => { setVisibleCount(ROW_LIMIT); }, [search, filters, sortRules]);

    useEffect(() => {
        const node = sentinelRef.current;
        if (!node) return;
        const observer = new IntersectionObserver((entries) => {
            if (entries[0]?.isIntersecting) {
                setVisibleCount((c) => Math.min(c + ROW_LIMIT, visibleDocuments.length));
            }
        }, { rootMargin: '300px' });
        observer.observe(node);
        return () => observer.disconnect();
    }, [visibleDocuments.length]);

    const toggleSort = useCallback((key: SortKey, additive: boolean) => {
        setSortRules((current) => {
            const idx = current.findIndex((r) => r.key === key);
            if (additive) {
                if (idx === -1) return [...current, { key, dir: 'asc' }];
                const next = [...current];
                next[idx] = { ...next[idx], dir: next[idx].dir === 'asc' ? 'desc' : 'asc' };
                return next;
            }
            if (current.length === 1 && current[0].key === key) {
                return [{ key, dir: current[0].dir === 'asc' ? 'desc' : 'asc' }];
            }
            return [{ key, dir: 'asc' }];
        });
    }, []);

    const hasActiveFilters = useMemo(() => Object.values(filters).some(Boolean), [filters]);

    const removeSortRule = useCallback((key: SortKey) => {
        setSortRules((current) => {
            const next = current.filter((r) => r.key !== key);
            return next.length > 0 ? next : [{ key: 'meeting_date', dir: 'desc' }];
        });
    }, []);

    const SORT_LABELS: Record<SortKey, string> = {
        meeting_date: 'Date',
        title: 'Agenda',
        activity_location: 'Venue',
        activity_pic: 'PIC / Division',
        station: 'Branch',
        airline: 'Airlines',
        participants: 'Participants',
    };

    const exportExcel = useCallback(async () => {
        setExporting(true);
        try {
            await exportDivisionDocumentsToExcel(visibleDocuments);
        } finally {
            setExporting(false);
        }
    }, [visibleDocuments]);

    const SortHeader = ({ label, sortKeyValue }: { label: string; sortKeyValue: SortKey }) => {
        const ruleIndex = sortRules.findIndex((r) => r.key === sortKeyValue);
        const rule = ruleIndex !== -1 ? sortRules[ruleIndex] : null;
        return (
            <button
                type="button"
                onClick={(e) => toggleSort(sortKeyValue, e.shiftKey)}
                title="Klik untuk sort · Shift+klik untuk multi-sort"
                className={cn(
                    'inline-flex items-center gap-1 text-left text-xs font-bold uppercase tracking-wide transition-colors',
                    rule
                        ? 'text-emerald-700'
                        : 'text-emerald-900/60 hover:text-emerald-900'
                )}
            >
                {label}
                {rule ? (
                    <span className="inline-flex items-center gap-0.5">
                        {rule.dir === 'asc' ? <ArrowUpAZ className="h-3.5 w-3.5" /> : <ArrowDownAZ className="h-3.5 w-3.5" />}
                        {sortRules.length > 1 && (
                            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-600 text-[9px] font-bold text-white">
                                {ruleIndex + 1}
                            </span>
                        )}
                    </span>
                ) : (
                    <ChevronsUpDown className="h-3 w-3 opacity-25" />
                )}
            </button>
        );
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#F3F6F1]">
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute inset-0 bg-gradient-to-br from-[#F6F8F4] via-[#EEF4EE] to-[#E4EFE6]" />
                <div className="absolute -top-40 left-[-10%] h-[560px] w-[560px] rounded-full bg-emerald-300/30 blur-[140px]" />
                <div className="absolute top-1/4 right-[-10%] h-[520px] w-[520px] rounded-full bg-teal-200/35 blur-[140px]" />
                <div className="absolute bottom-[-15%] left-1/3 h-[480px] w-[480px] rounded-full bg-lime-200/25 blur-[140px]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.04)_1px,transparent_0)] [background-size:26px_26px]" />
            </div>

            {!hideNav && (
                <>
                    <Link
                        href="/dashboard/eskalasi/select"
                        className="fixed left-4 top-4 z-40 inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-white/80 px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm backdrop-blur-md transition hover:bg-white active:scale-95 sm:left-6 sm:top-6"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Link>
                    <button
                        type="button"
                        onClick={() => logoutWithPwaCleanup()}
                        className="fixed bottom-4 left-4 z-40 inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-white/80 px-4 py-2.5 text-sm font-bold text-rose-600 shadow-sm backdrop-blur-md transition hover:bg-white active:scale-95 sm:bottom-6 sm:left-6"
                    >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                    </button>
                </>
            )}

            <div className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10" style={hideNav ? undefined : { paddingTop: '5rem' }}>
                <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                            Circulars & Materials
                        </h1>
                        <p className="mt-2 max-w-lg text-sm font-medium text-slate-500">
                            Meeting records, materials, and attendance shared by the analyst team.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => void exportExcel()}
                            disabled={exporting || visibleDocuments.length === 0}
                            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-emerald-900/10 bg-white/70 px-4 text-sm font-bold text-slate-700 backdrop-blur-md transition hover:bg-white disabled:opacity-50"
                        >
                            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                            Export Excel
                        </button>
                        <button
                            type="button"
                            onClick={() => void load()}
                            disabled={loading}
                            aria-label="Refresh"
                            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-900/10 bg-white/70 text-slate-700 backdrop-blur-md transition hover:bg-white active:scale-95 disabled:opacity-50"
                        >
                            <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
                        </button>
                    </div>
                </div>

                <div className="mb-6 flex flex-wrap items-center gap-3">
                    <div className="relative max-w-md flex-1 min-w-[220px]">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search agenda, branch, airline, or PIC"
                            className="h-11 w-full rounded-2xl border border-emerald-900/10 bg-white/70 pl-10 pr-4 text-sm font-medium text-slate-700 outline-none backdrop-blur-md transition focus:border-emerald-500 focus:bg-white"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => setFiltersOpen((v) => !v)}
                        className={cn(
                            'inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-bold backdrop-blur-md transition',
                            filtersOpen || hasActiveFilters
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                : 'border-emerald-900/10 bg-white/70 text-slate-700 hover:bg-white'
                        )}
                    >
                        <SlidersHorizontal className="h-4 w-4" />
                        Filters
                        {hasActiveFilters && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                    </button>
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={() => setFilters(emptyFilters())}
                            className="inline-flex h-11 items-center gap-1.5 rounded-2xl px-3 text-sm font-bold text-slate-500 transition hover:text-rose-600"
                        >
                            <X className="h-4 w-4" />
                            Clear filters
                        </button>
                    )}
                </div>

                {filtersOpen && (
                    <div className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-emerald-900/10 bg-white/70 p-4 backdrop-blur-md sm:grid-cols-2 lg:grid-cols-4">
                        <label className="space-y-1 text-xs font-bold text-emerald-900/60">
                            Agenda
                            <input value={filters.title} onChange={(e) => setFilters((f) => ({ ...f, title: e.target.value }))} className="h-9 w-full rounded-lg border border-emerald-900/10 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-emerald-500" />
                        </label>
                        <label className="space-y-1 text-xs font-bold text-emerald-900/60">
                            Venue
                            <input value={filters.activity_location} onChange={(e) => setFilters((f) => ({ ...f, activity_location: e.target.value }))} className="h-9 w-full rounded-lg border border-emerald-900/10 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-emerald-500" />
                        </label>
                        <label className="space-y-1 text-xs font-bold text-emerald-900/60">
                            PIC / Division
                            <input value={filters.activity_pic} onChange={(e) => setFilters((f) => ({ ...f, activity_pic: e.target.value }))} className="h-9 w-full rounded-lg border border-emerald-900/10 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-emerald-500" />
                        </label>
                        <label className="space-y-1 text-xs font-bold text-emerald-900/60">
                            Branch
                            <input value={filters.station} onChange={(e) => setFilters((f) => ({ ...f, station: e.target.value }))} className="h-9 w-full rounded-lg border border-emerald-900/10 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-emerald-500" />
                        </label>
                        <label className="space-y-1 text-xs font-bold text-emerald-900/60">
                            Airlines
                            <select value={filters.airline} onChange={(e) => setFilters((f) => ({ ...f, airline: e.target.value }))} className="h-9 w-full rounded-lg border border-emerald-900/10 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-emerald-500">
                                <option value="">All Airlines</option>
                                {AIRLINES.map((a) => (
                                    <option key={a.code} value={a.name}>{a.code} — {a.name}</option>
                                ))}
                            </select>
                        </label>
                        <label className="space-y-1 text-xs font-bold text-emerald-900/60">
                            Participants
                            <input value={filters.participants} onChange={(e) => setFilters((f) => ({ ...f, participants: e.target.value }))} className="h-9 w-full rounded-lg border border-emerald-900/10 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-emerald-500" />
                        </label>
                        <label className="space-y-1 text-xs font-bold text-emerald-900/60">
                            Date from
                            <input type="date" value={filters.dateFrom} onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))} className="h-9 w-full rounded-lg border border-emerald-900/10 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-emerald-500" />
                        </label>
                        <label className="space-y-1 text-xs font-bold text-emerald-900/60">
                            Date to
                            <input type="date" value={filters.dateTo} onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))} className="h-9 w-full rounded-lg border border-emerald-900/10 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-emerald-500" />
                        </label>
                    </div>
                )}

                <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-emerald-900/40">Sort by</span>
                    {sortRules.map((rule, i) => (
                        <span
                            key={rule.key}
                            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700"
                        >
                            {sortRules.length > 1 && (
                                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-600 text-[9px] font-bold text-white">
                                    {i + 1}
                                </span>
                            )}
                            {SORT_LABELS[rule.key]}
                            {rule.dir === 'asc' ? <ArrowUpAZ className="h-3 w-3" /> : <ArrowDownAZ className="h-3 w-3" />}
                            <button
                                type="button"
                                onClick={() => removeSortRule(rule.key)}
                                aria-label={`Remove sort by ${SORT_LABELS[rule.key]}`}
                                className="ml-0.5 rounded-full p-0.5 transition hover:bg-emerald-200"
                            >
                                <X className="h-2.5 w-2.5" />
                            </button>
                        </span>
                    ))}
                    {sortRules.length > 1 && (
                        <button
                            type="button"
                            onClick={() => setSortRules([{ key: 'meeting_date', dir: 'desc' }])}
                            className="text-xs font-semibold text-slate-400 transition hover:text-rose-500"
                        >
                            Reset
                        </button>
                    )}
                    <span className="ml-auto hidden text-[11px] font-medium text-slate-400 sm:block">
                        Shift+klik header kolom untuk multi-sort
                    </span>
                </div>

                {error && (
                    <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 backdrop-blur-md">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="grid min-h-[320px] place-items-center rounded-3xl border border-emerald-900/10 bg-white/60 backdrop-blur-md">
                        <Loader2 className="h-6 w-6 animate-spin text-emerald-600/70" />
                    </div>
                ) : visibleDocuments.length === 0 ? (
                    <div className="grid min-h-[320px] place-items-center rounded-3xl border border-dashed border-emerald-900/15 bg-white/60 backdrop-blur-md">
                        <div className="text-center px-6">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-900/5 text-slate-500">
                                <BookOpen className="h-5 w-5" />
                            </div>
                            <h2 className="mt-4 text-lg font-extrabold tracking-tight text-slate-950">No entries yet</h2>
                            <p className="mt-1 max-w-xs text-sm font-medium text-slate-500">
                                Once the analyst team publishes a record, it will appear here.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-[28px] border border-emerald-900/8 bg-white shadow-[0_24px_60px_-30px_rgba(15,23,42,0.25)]">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1000px] border-collapse text-sm">
                                <thead>
                                    <tr className="border-b border-emerald-900/8 bg-emerald-900/[0.03]">
                                        <th className="px-5 py-4 text-left"><SortHeader label="Date" sortKeyValue="meeting_date" /></th>
                                        <th className="px-5 py-4 text-left"><SortHeader label="Agenda" sortKeyValue="title" /></th>
                                        <th className="px-5 py-4 text-left"><SortHeader label="Venue" sortKeyValue="activity_location" /></th>
                                        <th className="px-5 py-4 text-left"><SortHeader label="PIC / Division" sortKeyValue="activity_pic" /></th>
                                        <th className="px-5 py-4 text-left"><SortHeader label="Branch" sortKeyValue="station" /></th>
                                        <th className="px-5 py-4 text-left"><SortHeader label="Airlines" sortKeyValue="airline" /></th>
                                        <th className="px-5 py-4 text-left"><SortHeader label="Participants" sortKeyValue="participants" /></th>
                                        <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-emerald-900/60">Materials</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-emerald-900/5">
                                    {displayedDocuments.map((doc) => (
                                        <tr key={doc.id} className="transition hover:bg-emerald-900/[0.02]">
                                            <td className="px-5 py-4 whitespace-nowrap text-slate-600">{formatDate(doc.meeting_date || doc.created_at)}</td>
                                            <td className="px-5 py-4 max-w-[260px] whitespace-normal break-words font-bold text-slate-950">{doc.title}</td>
                                            <td className="px-5 py-4 max-w-[180px] whitespace-normal break-words text-slate-600">{doc.activity_location || '—'}</td>
                                            <td className="px-5 py-4 text-slate-600">{doc.activity_pic || '—'}</td>
                                            <td className="px-5 py-4 text-slate-600">{doc.station_code || doc.station_name || '—'}</td>
                                            <td className="px-5 py-4 text-slate-600">{doc.airline || '—'}</td>
                                            <td className="px-5 py-4 max-w-[220px] whitespace-normal break-words text-slate-600">{doc.participants || '—'}</td>
                                            <td className="px-5 py-4">
                                                <div className="flex flex-wrap gap-1.5">
                                                    <MaterialButton href={doc.external_url} label="Minutes" />
                                                    <MaterialButton href={doc.materi_url} label="Materials" />
                                                    <MaterialButton href={doc.attendance_url} label="Attendance" />
                                                    <MaterialButton href={doc.recording_url} label="Recording" />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {visibleCount < visibleDocuments.length && (
                            <div ref={sentinelRef} className="flex items-center justify-center py-5">
                                <Loader2 className="h-4 w-4 animate-spin text-emerald-600/60" />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
