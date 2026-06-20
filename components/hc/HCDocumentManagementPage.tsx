'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    BookOpen,
    Download,
    ExternalLink,
    FileText,
    Link2,
    Loader2,
    MoreHorizontal,
    Plus,
    RefreshCw,
    Search,
    UploadCloud,
    X,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/lib/hooks/use-auth';
import { cn } from '@/lib/utils';
import type {
    DivisionDocument,
    DivisionDocumentCategory,
    DivisionDocumentSourceType,
} from '@/types';

interface StationOption {
    id: string;
    code: string;
    name: string;
}

interface UploadedFileMetadata {
    file_url: string;
    file_name: string;
    file_size: number;
    mime_type: string;
    drive_file_id: string;
    drive_folder_id: string;
    drive_web_url: string;
    drive_content_url: string | null;
}

interface DocumentFormState {
    category: DivisionDocumentCategory;
    title: string;
    description: string;
    meeting_date: string;
    activity_pic: string;
    activity_location: string;
    source_type: DivisionDocumentSourceType;
    external_url: string;
    visibility_scope: 'all' | 'targeted';
    audience_station_ids: string[];
    audience_roles: string[];
}

const CATEGORY_OPTIONS: Array<{
    value: DivisionDocumentCategory;
    label: string;
    shortLabel: string;
}> = [
    { value: 'EDARAN_DIREKSI', label: 'Circular', shortLabel: 'Circulars' },
    { value: 'MATERI_SOSIALISASI', label: 'Socialization Material', shortLabel: 'Socialization' },
    { value: 'NOTULENSI_RAPAT', label: 'Meeting Minutes', shortLabel: 'Minutes' },
    { value: 'TRAINING_MATERIAL', label: 'Training Material', shortLabel: 'Training' },
    { value: 'DOKUMEN_LAIN', label: 'Other Document', shortLabel: 'Other' },
    { value: 'SAM_HANDBOOK', label: 'Internal Handbook', shortLabel: 'Handbook' },
];

const RECIPIENT_ROLES = [
    { value: 'MANAGER_CABANG', label: 'Branch Managers' },
    { value: 'STAFF_CABANG', label: 'Branch Staff' },
] as const;

const ACCEPTED_FILES = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.png,.jpg,.jpeg,.webp';

function initialForm(): DocumentFormState {
    return {
        category: 'EDARAN_DIREKSI',
        title: '',
        description: '',
        meeting_date: '',
        activity_pic: '',
        activity_location: '',
        source_type: 'upload',
        external_url: '',
        visibility_scope: 'all',
        audience_station_ids: [],
        audience_roles: ['MANAGER_CABANG', 'STAFF_CABANG'],
    };
}

function categoryLabel(category: DivisionDocumentCategory) {
    return CATEGORY_OPTIONS.find((option) => option.value === category)?.label || category;
}

function formatDate(value?: string | null) {
    if (!value) return 'No date';
    const normalized = value.includes('T') ? value : `${value}T00:00:00`;
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date);
}

function formatFileSize(value?: number | null) {
    if (!value) return '';
    if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function audienceSummary(document: DivisionDocument, stations: StationOption[]) {
    if (document.visibility_scope === 'all') return 'All branches';
    const stationMap = new Map(stations.map((station) => [station.id, station.code]));
    const stationLabels = document.audience_station_ids.map((id) => stationMap.get(id) || id);
    const roleLabels = document.audience_roles.map((role) => (
        RECIPIENT_ROLES.find((option) => option.value === role)?.label || role
    ));
    return [...stationLabels, ...roleLabels].join(', ') || 'Selected recipients';
}

function documentHref(document: DivisionDocument) {
    return document.source_type === 'upload'
        ? `/api/division-documents/${document.id}`
        : document.external_url || undefined;
}

export function HCDocumentManagementPage() {
    const { user } = useAuth(false);
    const role = String(user?.role || '').trim().toUpperCase();
    const canManage = ['SUPER_ADMIN', 'ANALYST', 'DIVISI_HC', 'PARTNER_HC'].includes(role);

    const [documents, setDocuments] = useState<DivisionDocument[]>([]);
    const [stations, setStations] = useState<StationOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<'all' | DivisionDocumentCategory>('all');
    const [selected, setSelected] = useState<DivisionDocument | null>(null);
    const [editing, setEditing] = useState<DivisionDocument | null>(null);
    const [composerOpen, setComposerOpen] = useState(false);
    const [form, setForm] = useState<DocumentFormState>(initialForm());
    const [file, setFile] = useState<File | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [documentsResponse, stationsResponse] = await Promise.all([
                fetch('/api/division-documents?division=HC', { cache: 'no-store' }),
                fetch('/api/master-data?type=stations', { cache: 'force-cache' }),
            ]);

            if (!documentsResponse.ok) {
                const payload = await documentsResponse.json().catch(() => ({}));
                throw new Error(payload.error || 'Unable to load HC documents');
            }

            const documentData = await documentsResponse.json();
            const stationData = stationsResponse.ok ? await stationsResponse.json() : [];
            setDocuments(Array.isArray(documentData) ? documentData : []);
            setStations(Array.isArray(stationData) ? stationData : []);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Unable to load HC documents');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const filteredDocuments = useMemo(() => {
        const query = search.trim().toLowerCase();
        return documents.filter((document) => {
            if (categoryFilter !== 'all' && document.category !== categoryFilter) return false;
            if (!query) return true;
            return [
                document.title,
                document.description,
                document.file_name,
                categoryLabel(document.category),
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(query);
        });
    }, [categoryFilter, documents, search]);

    const openCreate = useCallback(() => {
        setEditing(null);
        setForm(initialForm());
        setFile(null);
        setComposerOpen(true);
    }, []);

    const openEdit = useCallback((document: DivisionDocument) => {
        setEditing(document);
        setFile(null);
        setForm({
            category: document.category,
            title: document.title,
            description: document.description || '',
            meeting_date: document.meeting_date?.slice(0, 10) || '',
            activity_pic: document.activity_pic || '',
            activity_location: document.activity_location || '',
            source_type: document.source_type,
            external_url: document.external_url || '',
            visibility_scope: document.visibility_scope === 'all' ? 'all' : 'targeted',
            audience_station_ids: [...document.audience_station_ids],
            audience_roles: document.audience_roles.length
                ? [...document.audience_roles]
                : ['MANAGER_CABANG', 'STAFF_CABANG'],
        });
        setComposerOpen(true);
    }, []);

    const closeComposer = useCallback(() => {
        setComposerOpen(false);
        setEditing(null);
        setFile(null);
        setForm(initialForm());
    }, []);

    const toggleRole = useCallback((recipientRole: string) => {
        setForm((current) => ({
            ...current,
            audience_roles: current.audience_roles.includes(recipientRole)
                ? current.audience_roles.filter((item) => item !== recipientRole)
                : [...current.audience_roles, recipientRole],
        }));
    }, []);

    const toggleStation = useCallback((stationId: string) => {
        setForm((current) => ({
            ...current,
            audience_station_ids: current.audience_station_ids.includes(stationId)
                ? current.audience_station_ids.filter((item) => item !== stationId)
                : [...current.audience_station_ids, stationId],
        }));
    }, []);

    const uploadFile = useCallback(async () => {
        if (!file) return null;
        const payload = new FormData();
        payload.set('file', file);
        payload.set('category', form.category);
        payload.set('title', form.title);

        const response = await fetch('/api/division-documents/upload', {
            method: 'POST',
            body: payload,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.error || 'Unable to upload the document to Google Drive');
        }
        return data as UploadedFileMetadata;
    }, [file, form.category, form.title]);

    const submit = useCallback(async (event: React.FormEvent) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        try {
            if (form.source_type === 'upload' && !file && !editing?.drive_file_id) {
                throw new Error('Select a document to upload');
            }
            if (form.source_type === 'link' && !form.external_url.trim()) {
                throw new Error('Enter a valid external document URL');
            }
            if (form.visibility_scope === 'targeted' && form.audience_station_ids.length === 0) {
                throw new Error('Select at least one recipient branch');
            }
            if (form.audience_roles.length === 0) {
                throw new Error('Select at least one recipient role');
            }

            const uploaded = form.source_type === 'upload' ? await uploadFile() : null;
            const existingUpload = editing && form.source_type === 'upload'
                ? {
                    file_url: editing.file_url,
                    file_name: editing.file_name,
                    file_size: editing.file_size,
                    mime_type: editing.mime_type,
                    drive_file_id: editing.drive_file_id,
                    drive_folder_id: editing.drive_folder_id,
                    drive_web_url: editing.drive_web_url,
                    drive_content_url: editing.drive_content_url,
                }
                : null;
            const fileMetadata = uploaded || existingUpload;

            const body = {
                division: 'HC',
                category: form.category,
                title: form.title.trim(),
                description: form.description.trim() || null,
                meeting_date: form.meeting_date || null,
                activity_pic: form.activity_pic.trim() || null,
                activity_location: form.activity_location.trim() || null,
                source_type: form.source_type,
                external_url: form.source_type === 'link' ? form.external_url.trim() : null,
                file_url: fileMetadata?.file_url || null,
                file_name: fileMetadata?.file_name || null,
                file_size: fileMetadata?.file_size || null,
                mime_type: fileMetadata?.mime_type || null,
                drive_file_id: fileMetadata?.drive_file_id || null,
                drive_folder_id: fileMetadata?.drive_folder_id || null,
                drive_web_url: fileMetadata?.drive_web_url || null,
                drive_content_url: fileMetadata?.drive_content_url || null,
                visibility_scope: form.visibility_scope,
                audience_station_ids: form.visibility_scope === 'targeted'
                    ? form.audience_station_ids
                    : [],
                audience_roles: form.audience_roles,
                audience_label: form.visibility_scope === 'all' ? 'All branches' : null,
            };

            const response = await fetch(
                editing ? `/api/division-documents/${editing.id}` : '/api/division-documents',
                {
                    method: editing ? 'PATCH' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                }
            );
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(result.error || 'Unable to save the HC document');
            }

            closeComposer();
            await load();
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'Unable to save the HC document');
        } finally {
            setSaving(false);
        }
    }, [closeComposer, editing, file, form, load, uploadFile]);

    const removeDocument = useCallback(async (document: DivisionDocument) => {
        if (!window.confirm(`Remove "${document.title}"?`)) return;
        setSaving(true);
        setError('');
        try {
            const response = await fetch(`/api/division-documents/${document.id}`, { method: 'DELETE' });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || 'Unable to remove the document');
            if (selected?.id === document.id) setSelected(null);
            await load();
        } catch (removeError) {
            setError(removeError instanceof Error ? removeError.message : 'Unable to remove the document');
        } finally {
            setSaving(false);
        }
    }, [load, selected]);

    return (
        <div className="min-h-screen bg-[#F7F8FA] px-4 py-5 text-slate-900 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
                <header className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-7">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                                <BookOpen className="h-4 w-4" />
                                Human Capital
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-950">Circulars & Materials</h1>
                            <p className="mt-1 max-w-2xl text-sm text-slate-500">
                                {canManage
                                    ? 'Upload and distribute official HC documents to all branches or selected recipients.'
                                    : 'Official documents shared by the Human Capital division for your branch.'}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => void load()}
                                disabled={loading}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                                aria-label="Refresh documents"
                            >
                                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                            </button>
                            {canManage ? (
                                <button
                                    type="button"
                                    onClick={openCreate}
                                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add document
                                </button>
                            ) : null}
                        </div>
                    </div>
                </header>

                {error ? (
                    <div className="mt-4 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        <span>{error}</span>
                        <button type="button" onClick={() => setError('')} aria-label="Dismiss error">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ) : null}

                <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center">
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search title, category, or file name"
                                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white"
                            />
                        </div>
                        <select
                            value={categoryFilter}
                            onChange={(event) => setCategoryFilter(event.target.value as typeof categoryFilter)}
                            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500"
                        >
                            <option value="all">All categories</option>
                            {CATEGORY_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>

                    {loading ? (
                        <div className="flex min-h-80 items-center justify-center">
                            <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
                        </div>
                    ) : filteredDocuments.length === 0 ? (
                        <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
                            <FileText className="h-10 w-10 text-slate-300" />
                            <h2 className="mt-4 text-base font-semibold text-slate-800">No documents found</h2>
                            <p className="mt-1 text-sm text-slate-500">
                                {canManage ? 'Add the first HC document or adjust the current filters.' : 'No HC documents have been shared with your branch yet.'}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filteredDocuments.map((document) => {
                                const href = documentHref(document);
                                return (
                                    <article key={document.id} className="group flex items-center gap-4 px-4 py-4 transition hover:bg-slate-50 sm:px-6">
                                        <button
                                            type="button"
                                            onClick={() => setSelected(document)}
                                            className="flex min-w-0 flex-1 items-center gap-4 text-left"
                                        >
                                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                                                <FileText className="h-5 w-5" />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-semibold text-slate-900">{document.title}</span>
                                                <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                                                    <span>{categoryLabel(document.category)}</span>
                                                    <span aria-hidden="true">•</span>
                                                    <span>{audienceSummary(document, stations)}</span>
                                                    <span aria-hidden="true">•</span>
                                                    <span>{formatDate(document.meeting_date || document.created_at)}</span>
                                                </span>
                                            </span>
                                        </button>
                                        {href ? (
                                            <a
                                                href={href}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="hidden h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-white sm:inline-flex"
                                            >
                                                {document.source_type === 'upload' ? <Download className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
                                                Open
                                            </a>
                                        ) : null}
                                        {canManage ? (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button
                                                        type="button"
                                                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white hover:text-slate-900"
                                                        aria-label="Document actions"
                                                    >
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => openEdit(document)}>Edit</DropdownMenuItem>
                                                    <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => void removeDocument(document)}>
                                                        Remove
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
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
                    <button
                        type="button"
                        className="absolute inset-0 bg-slate-950/30"
                        onClick={() => setSelected(null)}
                        aria-label="Close document details"
                    />
                    <aside className="absolute inset-y-0 right-0 w-full max-w-lg overflow-y-auto bg-white shadow-2xl">
                        <div className="flex items-start justify-between border-b border-slate-200 p-6">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                                    {categoryLabel(selected.category)}
                                </p>
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
                                <div className="rounded-xl bg-slate-50 p-4">
                                    <dt className="text-xs text-slate-500">Recipients</dt>
                                    <dd className="mt-1 text-sm font-semibold text-slate-900">{audienceSummary(selected, stations)}</dd>
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
                                        className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
                                    >
                                        {selected.source_type === 'upload' ? <Download className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
                                        Open document
                                    </a>
                                ) : null}
                            </div>
                            {canManage ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const current = selected;
                                        setSelected(null);
                                        openEdit(current);
                                    }}
                                    className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    Edit document
                                </button>
                            ) : null}
                        </div>
                    </aside>
                </div>
            ) : null}

            {composerOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                    <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                            <div>
                                <h2 className="text-lg font-bold text-slate-950">{editing ? 'Edit HC document' : 'Add HC document'}</h2>
                                <p className="mt-1 text-sm text-slate-500">Set the source and exact branch audience before publishing.</p>
                            </div>
                            <button type="button" onClick={closeComposer} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <label className="space-y-2 text-sm font-semibold text-slate-700">
                                        Category
                                        <select
                                            value={form.category}
                                            onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as DivisionDocumentCategory }))}
                                            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal outline-none focus:border-emerald-500"
                                        >
                                            {CATEGORY_OPTIONS.map((option) => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="space-y-2 text-sm font-semibold text-slate-700">
                                        Document date
                                        <input
                                            type="date"
                                            value={form.meeting_date}
                                            onChange={(event) => setForm((current) => ({ ...current, meeting_date: event.target.value }))}
                                            className="h-10 w-full rounded-lg border border-slate-200 px-3 font-normal outline-none focus:border-emerald-500"
                                        />
                                    </label>
                                </div>

                                <label className="block space-y-2 text-sm font-semibold text-slate-700">
                                    Title
                                    <input
                                        value={form.title}
                                        onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                                        className="h-10 w-full rounded-lg border border-slate-200 px-3 font-normal outline-none focus:border-emerald-500"
                                        required
                                    />
                                </label>

                                <label className="block space-y-2 text-sm font-semibold text-slate-700">
                                    Description
                                    <textarea
                                        value={form.description}
                                        onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                                        rows={3}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 font-normal outline-none focus:border-emerald-500"
                                    />
                                </label>

                                <div className="grid gap-5 sm:grid-cols-2">
                                    <label className="space-y-2 text-sm font-semibold text-slate-700">
                                        PIC
                                        <input
                                            value={form.activity_pic}
                                            onChange={(event) => setForm((current) => ({ ...current, activity_pic: event.target.value }))}
                                            className="h-10 w-full rounded-lg border border-slate-200 px-3 font-normal outline-none focus:border-emerald-500"
                                        />
                                    </label>
                                    <label className="space-y-2 text-sm font-semibold text-slate-700">
                                        Location
                                        <input
                                            value={form.activity_location}
                                            onChange={(event) => setForm((current) => ({ ...current, activity_location: event.target.value }))}
                                            className="h-10 w-full rounded-lg border border-slate-200 px-3 font-normal outline-none focus:border-emerald-500"
                                        />
                                    </label>
                                </div>

                                <fieldset>
                                    <legend className="text-sm font-semibold text-slate-700">Document source</legend>
                                    <div className="mt-2 grid gap-3 sm:grid-cols-2">
                                        {([
                                            { value: 'upload', label: 'Upload to Google Drive', icon: UploadCloud },
                                            { value: 'link', label: 'External link', icon: Link2 },
                                        ] as const).map((option) => {
                                            const Icon = option.icon;
                                            return (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    onClick={() => setForm((current) => ({ ...current, source_type: option.value }))}
                                                    className={cn(
                                                        'flex items-center gap-3 rounded-xl border p-4 text-left text-sm font-semibold transition',
                                                        form.source_type === option.value
                                                            ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                                                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                                                    )}
                                                >
                                                    <Icon className="h-5 w-5" />
                                                    {option.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </fieldset>

                                {form.source_type === 'upload' ? (
                                    <label className="block cursor-pointer rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center transition hover:border-emerald-500 hover:bg-emerald-50/40">
                                        <UploadCloud className="mx-auto h-7 w-7 text-emerald-600" />
                                        <span className="mt-2 block text-sm font-semibold text-slate-800">
                                            {file?.name || editing?.file_name || 'Choose a file'}
                                        </span>
                                        <span className="mt-1 block text-xs text-slate-500">
                                            PDF, Office documents, CSV, text, or images up to 30 MB
                                        </span>
                                        <input
                                            type="file"
                                            accept={ACCEPTED_FILES}
                                            onChange={(event) => setFile(event.target.files?.[0] || null)}
                                            className="sr-only"
                                        />
                                    </label>
                                ) : (
                                    <label className="block space-y-2 text-sm font-semibold text-slate-700">
                                        External document URL
                                        <input
                                            type="url"
                                            value={form.external_url}
                                            onChange={(event) => setForm((current) => ({ ...current, external_url: event.target.value }))}
                                            placeholder="https://..."
                                            className="h-10 w-full rounded-lg border border-slate-200 px-3 font-normal outline-none focus:border-emerald-500"
                                            required
                                        />
                                    </label>
                                )}

                                <fieldset className="rounded-xl border border-slate-200 p-4">
                                    <legend className="px-2 text-sm font-semibold text-slate-700">Recipients</legend>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <button
                                            type="button"
                                            onClick={() => setForm((current) => ({ ...current, visibility_scope: 'all', audience_station_ids: [] }))}
                                            className={cn(
                                                'rounded-lg border px-4 py-3 text-left text-sm font-semibold',
                                                form.visibility_scope === 'all'
                                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                                                    : 'border-slate-200 text-slate-700'
                                            )}
                                        >
                                            All branches
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setForm((current) => ({ ...current, visibility_scope: 'targeted' }))}
                                            className={cn(
                                                'rounded-lg border px-4 py-3 text-left text-sm font-semibold',
                                                form.visibility_scope === 'targeted'
                                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                                                    : 'border-slate-200 text-slate-700'
                                            )}
                                        >
                                            Selected branches
                                        </button>
                                    </div>

                                    <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Recipient roles</p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {RECIPIENT_ROLES.map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => toggleRole(option.value)}
                                                className={cn(
                                                    'rounded-full border px-3 py-1.5 text-xs font-semibold',
                                                    form.audience_roles.includes(option.value)
                                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                                                        : 'border-slate-200 text-slate-600'
                                                )}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>

                                    {form.visibility_scope === 'targeted' ? (
                                        <>
                                            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Branches</p>
                                            <div className="mt-2 max-h-44 overflow-y-auto rounded-lg bg-slate-50 p-3">
                                                <div className="flex flex-wrap gap-2">
                                                    {stations.map((station) => (
                                                        <button
                                                            key={station.id}
                                                            type="button"
                                                            onClick={() => toggleStation(station.id)}
                                                            title={station.name}
                                                            className={cn(
                                                                'rounded-full border px-3 py-1.5 text-xs font-semibold',
                                                                form.audience_station_ids.includes(station.id)
                                                                    ? 'border-emerald-500 bg-emerald-600 text-white'
                                                                    : 'border-slate-200 bg-white text-slate-600'
                                                            )}
                                                        >
                                                            {station.code}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    ) : null}
                                </fieldset>
                            </div>

                            <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-6 py-4">
                                <button
                                    type="button"
                                    onClick={closeComposer}
                                    disabled={saving}
                                    className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                    {saving ? 'Publishing...' : 'Publish document'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
