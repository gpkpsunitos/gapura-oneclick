'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    BookOpen,
    Download,
    ExternalLink,
    FileText,
    Loader2,
    Search,
    X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DivisionDocument, DivisionDocumentCategory } from '@/types';

const CATEGORY_OPTIONS: Array<{ value: DivisionDocumentCategory; label: string }> = [
    { value: 'NOTULENSI_RAPAT', label: 'Meeting Notes' },
    { value: 'SAM_HANDBOOK', label: 'SAM / Handbook' },
    { value: 'MANUAL', label: 'Manual' },
    { value: 'NOTICE', label: 'Notice / Pengumuman' },
    { value: 'MATERI_SOSIALISASI', label: 'Socialization Material' },
    { value: 'TRAINING_MATERIAL', label: 'Training Material' },
    { value: 'DOKUMEN_LAIN', label: 'Other Document' },
];

function categoryLabel(category: DivisionDocumentCategory) {
    return CATEGORY_OPTIONS.find((o) => o.value === category)?.label || category;
}

function formatDate(value?: string | null) {
    if (!value) return 'No date';
    const normalized = value.includes('T') ? value : `${value}T00:00:00`;
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function formatFileSize(value?: number | null) {
    if (!value) return '';
    if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function documentHref(doc: DivisionDocument) {
    return doc.source_type === 'upload'
        ? `/api/division-documents/${doc.id}`
        : doc.external_url || undefined;
}

export function AnalystDocumentViewerPage() {
    const [documents, setDocuments] = useState<DivisionDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<'all' | DivisionDocumentCategory>('all');
    const [selected, setSelected] = useState<DivisionDocument | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/division-documents?division=ANALYST', { cache: 'no-store' });
            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                throw new Error(payload.error || 'Unable to load documents');
            }
            const data = await res.json();
            setDocuments(Array.isArray(data) ? data : []);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unable to load documents');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();
        return documents.filter((doc) => {
            if (categoryFilter !== 'all' && doc.category !== categoryFilter) return false;
            if (!query) return true;
            return [doc.title, doc.description, doc.file_name, categoryLabel(doc.category)]
                .filter(Boolean).join(' ').toLowerCase().includes(query);
        });
    }, [categoryFilter, documents, search]);

    return (
        <div className="min-h-screen bg-[#F7F8FA] px-4 py-5 text-slate-900 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
                <header className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-7">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                        <BookOpen className="h-4 w-4" />
                        Documents
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-950">Documents</h1>
                    <p className="mt-1 max-w-2xl text-sm text-slate-500">
                        Official documents shared with your branch by the analyst team.
                    </p>
                </header>

                {error ? (
                    <div className="mt-4 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        <span>{error}</span>
                        <button type="button" onClick={() => setError('')} aria-label="Dismiss"><X className="h-4 w-4" /></button>
                    </div>
                ) : null}

                <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center">
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search title or category"
                                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                            />
                        </div>
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value as typeof categoryFilter)}
                            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
                        >
                            <option value="all">All categories</option>
                            {CATEGORY_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>

                    {loading ? (
                        <div className="flex min-h-80 items-center justify-center">
                            <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
                            <FileText className="h-10 w-10 text-slate-300" />
                            <h2 className="mt-4 text-base font-semibold text-slate-800">No documents found</h2>
                            <p className="mt-1 text-sm text-slate-500">No documents have been shared with your branch yet.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filtered.map((doc) => {
                                const href = documentHref(doc);
                                return (
                                    <article key={doc.id} className="flex items-center gap-4 px-4 py-4 transition hover:bg-slate-50 sm:px-6">
                                        <button
                                            type="button"
                                            onClick={() => setSelected(doc)}
                                            className="flex min-w-0 flex-1 items-center gap-4 text-left"
                                        >
                                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                                                <FileText className="h-5 w-5" />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-semibold text-slate-900">{doc.title}</span>
                                                <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                                                    <span>{categoryLabel(doc.category)}</span>
                                                    <span aria-hidden="true">•</span>
                                                    <span>{formatDate(doc.meeting_date || doc.created_at)}</span>
                                                </span>
                                            </span>
                                        </button>
                                        {href ? (
                                            <a
                                                href={href}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={cn(
                                                    'hidden h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-white sm:inline-flex'
                                                )}
                                            >
                                                {doc.source_type === 'upload' ? <Download className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
                                                Open
                                            </a>
                                        ) : null}
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>

            {selected ? (
                <div className="fixed inset-0 z-40">
                    <button type="button" className="absolute inset-0 bg-slate-950/30" onClick={() => setSelected(null)} aria-label="Close" />
                    <aside className="absolute inset-y-0 right-0 w-full max-w-lg overflow-y-auto bg-white shadow-2xl">
                        <div className="flex items-start justify-between border-b border-slate-200 p-6">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">{categoryLabel(selected.category)}</p>
                                <h2 className="mt-2 text-xl font-bold text-slate-950">{selected.title}</h2>
                            </div>
                            <button type="button" onClick={() => setSelected(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="space-y-6 p-6">
                            {selected.description ? <p className="text-sm leading-6 text-slate-600">{selected.description}</p> : null}
                            <dl className="grid grid-cols-2 gap-4">
                                <div className="rounded-xl bg-slate-50 p-4">
                                    <dt className="text-xs text-slate-500">Published</dt>
                                    <dd className="mt-1 text-sm font-semibold text-slate-900">{formatDate(selected.meeting_date || selected.created_at)}</dd>
                                </div>
                                {selected.activity_pic ? (
                                    <div className="rounded-xl bg-slate-50 p-4">
                                        <dt className="text-xs text-slate-500">PIC</dt>
                                        <dd className="mt-1 text-sm font-semibold text-slate-900">{selected.activity_pic}</dd>
                                    </div>
                                ) : null}
                                {selected.activity_location ? (
                                    <div className="rounded-xl bg-slate-50 p-4">
                                        <dt className="text-xs text-slate-500">Location</dt>
                                        <dd className="mt-1 text-sm font-semibold text-slate-900">{selected.activity_location}</dd>
                                    </div>
                                ) : null}
                            </dl>
                            <div className="rounded-xl border border-slate-200 p-4">
                                <p className="text-xs font-medium text-slate-500">Document source</p>
                                <p className="mt-1 break-all text-sm font-semibold text-slate-900">
                                    {selected.file_name || selected.external_url || 'Document'}
                                    {selected.file_size ? ` (${formatFileSize(selected.file_size)})` : ''}
                                </p>
                                {documentHref(selected) ? (
                                    <a
                                        href={documentHref(selected)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
                                    >
                                        {selected.source_type === 'upload' ? <Download className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
                                        Open document
                                    </a>
                                ) : null}
                            </div>
                        </div>
                    </aside>
                </div>
            ) : null}
        </div>
    );
}
