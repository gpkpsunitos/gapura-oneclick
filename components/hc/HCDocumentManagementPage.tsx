'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    BookOpen,
    BookText,
    ExternalLink,
    FileDown,
    FileStack,
    FileText,
    MoreHorizontal,
    Plus,
    RefreshCw,
    Search,
    Upload,
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
    DivisionDocumentVisibilityScope,
} from '@/types';

interface StationOption {
    id: string;
    code: string;
    name: string;
}

interface HCDocumentFormState {
    category: DivisionDocumentCategory;
    title: string;
    description: string;
    meeting_title: string;
    meeting_date: string;
    source_type: 'upload' | 'link';
    external_url: string;
    file_url: string;
    file_name: string;
    file_size: number;
    mime_type: string;
    visibility_scope: DivisionDocumentVisibilityScope;
    audience_station_ids: string[];
    audience_roles: string[];
    audience_label: string;
}

type HCTab = 'all' | DivisionDocumentCategory;
type HCSortOption = 'newest' | 'oldest' | 'az';

const CATEGORY_OPTIONS: Array<{ value: DivisionDocumentCategory; label: string }> = [
    { value: 'SAM_HANDBOOK', label: 'Handbook / SAM / SLA' },
    { value: 'EDARAN_DIREKSI', label: 'Edaran HC' },
    { value: 'MATERI_SOSIALISASI', label: 'Materi Sosialisasi' },
];

const ROLE_OPTIONS = [
    { value: 'MANAGER_CABANG', label: 'Manager / GM Cabang' },
    { value: 'STAFF_CABANG', label: 'Staff Cabang' },
    { value: 'DIVISI_HC', label: 'Divisi HC' },
    { value: 'DIVISI_HT', label: 'Divisi HT' },
    { value: 'DIVISI_OS', label: 'Divisi OS' },
    { value: 'ANALYST', label: 'Analyst' },
];

function createInitialForm(): HCDocumentFormState {
    return {
        category: 'SAM_HANDBOOK',
        title: '',
        description: '',
        meeting_title: '',
        meeting_date: '',
        source_type: 'upload',
        external_url: '',
        file_url: '',
        file_name: '',
        file_size: 0,
        mime_type: '',
        visibility_scope: 'all',
        audience_station_ids: [],
        audience_roles: [],
        audience_label: '',
    };
}

function getDocumentHref(document: DivisionDocument) {
    return document.source_type === 'upload' ? document.file_url : document.external_url;
}

function formatLongDate(value?: string | null) {
    if (!value) return '-';

    const normalized = value.includes('T') ? value : `${value}T00:00:00`;
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(date);
}

function formatShortDate(value?: string | null) {
    if (!value) return '-';

    const normalized = value.includes('T') ? value : `${value}T00:00:00`;
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date);
}

function getCategoryLabel(category: DivisionDocumentCategory) {
    return CATEGORY_OPTIONS.find((item) => item.value === category)?.label || category;
}

function getCategoryIcon(category: DivisionDocumentCategory) {
    switch (category) {
        case 'EDARAN_DIREKSI':
            return BookOpen;
        case 'MATERI_SOSIALISASI':
            return FileStack;
        default:
            return BookText;
    }
}

function getRoleLabels(roles: string[]) {
    return roles.map((role) => ROLE_OPTIONS.find((item) => item.value === role)?.label || role);
}

function getAudienceSummary(document: DivisionDocument, stations: StationOption[]) {
    if (document.audience_label?.trim()) {
        return document.audience_label.trim();
    }

    const roleLabels = getRoleLabels(document.audience_roles);
    const stationMap = new Map(stations.map((station) => [station.id, `${station.code} - ${station.name}`]));
    const stationLabels = document.audience_station_ids.map((stationId) => stationMap.get(stationId) || stationId);
    const labels = [...roleLabels, ...stationLabels];

    if (labels.length === 0) {
        return 'Semua Role';
    }

    if (labels.length === 1) {
        return labels[0];
    }

    return `${labels[0]} +${labels.length - 1}`;
}

function getAudienceTags(document: DivisionDocument, stations: StationOption[]) {
    const stationMap = new Map(stations.map((station) => [station.id, `${station.code} - ${station.name}`]));
    const roleLabels = getRoleLabels(document.audience_roles);
    const stationLabels = document.audience_station_ids.map((stationId) => stationMap.get(stationId) || stationId);

    if (document.audience_label?.trim()) {
        return [document.audience_label.trim(), ...roleLabels, ...stationLabels];
    }

    if (roleLabels.length === 0 && stationLabels.length === 0) {
        return ['Semua'];
    }

    return [...roleLabels, ...stationLabels];
}

function getDocumentDate(document: DivisionDocument) {
    return document.meeting_date || document.created_at;
}

function getDocumentDateLabel(document: DivisionDocument) {
    return formatShortDate(getDocumentDate(document));
}

export function HCDocumentManagementPage() {
    const { user } = useAuth(false);
    const normalizedRole = String(user?.role || '').trim().toUpperCase();
    const canManage = ['SUPER_ADMIN', 'ANALYST', 'DIVISI_HC', 'PARTNER_HC'].includes(normalizedRole);

    const [documents, setDocuments] = useState<DivisionDocument[]>([]);
    const [stations, setStations] = useState<StationOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [editing, setEditing] = useState<DivisionDocument | null>(null);
    const [selectedDocument, setSelectedDocument] = useState<DivisionDocument | null>(null);
    const [activeTab, setActiveTab] = useState<HCTab>('all');
    const [search, setSearch] = useState('');
    const [audienceFilter, setAudienceFilter] = useState('all');
    const [sort, setSort] = useState<HCSortOption>('newest');
    const [showMeetingInfo, setShowMeetingInfo] = useState(false);
    const [isDragActive, setIsDragActive] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [form, setForm] = useState<HCDocumentFormState>(createInitialForm());

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [documentsRes, stationsRes] = await Promise.all([
                fetch('/api/division-documents?division=HC', { cache: 'no-store' }),
                fetch('/api/master-data?type=stations', { cache: 'force-cache' }),
            ]);

            if (documentsRes.ok) {
                const data = await documentsRes.json();
                setDocuments(Array.isArray(data) ? data : []);
            }

            if (stationsRes.ok) {
                const data = await stationsRes.json();
                setStations(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('[HCDocumentManagementPage] Failed to load documents:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (!selectedDocument) return;
        const nextSelected = documents.find((document) => document.id === selectedDocument.id) || null;
        setSelectedDocument(nextSelected);
    }, [documents, selectedDocument]);

    const tabCounts = useMemo(() => {
        return {
            all: documents.length,
            SAM_HANDBOOK: documents.filter((document) => document.category === 'SAM_HANDBOOK').length,
            EDARAN_DIREKSI: documents.filter((document) => document.category === 'EDARAN_DIREKSI').length,
            MATERI_SOSIALISASI: documents.filter((document) => document.category === 'MATERI_SOSIALISASI').length,
        };
    }, [documents]);

    const filteredDocuments = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        return documents
            .filter((document) => (activeTab === 'all' ? true : document.category === activeTab))
            .filter((document) => {
                if (audienceFilter === 'all') return true;
                return document.audience_roles.includes(audienceFilter);
            })
            .filter((document) => {
                if (!normalizedSearch) return true;

                const haystack = [
                    document.title,
                    document.description,
                    document.file_name,
                    document.audience_label,
                    document.meeting_title,
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();

                return haystack.includes(normalizedSearch);
            })
            .sort((left, right) => {
                if (sort === 'az') {
                    return left.title.localeCompare(right.title, 'id-ID');
                }

                const leftTime = new Date(getDocumentDate(left)).getTime();
                const rightTime = new Date(getDocumentDate(right)).getTime();

                return sort === 'oldest' ? leftTime - rightTime : rightTime - leftTime;
            });
    }, [activeTab, audienceFilter, documents, search, sort]);

    const currentTabLabel = useMemo(() => {
        if (activeTab === 'all') return 'dokumen';
        return getCategoryLabel(activeTab).toLowerCase();
    }, [activeTab]);

    const resetComposer = useCallback(() => {
        setEditing(null);
        setFile(null);
        setForm(createInitialForm());
        setShowMeetingInfo(false);
        setIsDragActive(false);
        setIsUploadOpen(false);
    }, []);

    const startCreate = useCallback(() => {
        setEditing(null);
        setFile(null);
        setForm(createInitialForm());
        setShowMeetingInfo(false);
        setIsUploadOpen(true);
    }, []);

    const startEdit = useCallback((document: DivisionDocument) => {
        setEditing(document);
        setFile(null);
        setForm({
            category: document.category,
            title: document.title,
            description: document.description || '',
            meeting_title: document.meeting_title || '',
            meeting_date: document.meeting_date || '',
            source_type: document.source_type,
            external_url: document.external_url || '',
            file_url: document.file_url || '',
            file_name: document.file_name || '',
            file_size: document.file_size || 0,
            mime_type: document.mime_type || '',
            visibility_scope: document.visibility_scope,
            audience_station_ids: [...document.audience_station_ids],
            audience_roles: [...document.audience_roles],
            audience_label: document.audience_label || '',
        });
        setShowMeetingInfo(Boolean(document.meeting_title));
        setIsUploadOpen(true);
    }, []);

    const handleRoleToggle = useCallback((role: string) => {
        setForm((current) => {
            const hasRole = current.audience_roles.includes(role);
            const nextRoles = hasRole
                ? current.audience_roles.filter((item) => item !== role)
                : [...current.audience_roles, role];

            const nextVisibilityScope: DivisionDocumentVisibilityScope = nextRoles.length === 0
                ? (current.audience_station_ids.length > 0 ? 'stations' : 'all')
                : (current.audience_station_ids.length > 0 ? 'targeted' : 'roles');

            return {
                ...current,
                audience_roles: nextRoles,
                visibility_scope: nextVisibilityScope,
            };
        });
    }, []);

    const handleAllAudience = useCallback(() => {
        setForm((current) => ({
            ...current,
            visibility_scope: 'all',
            audience_roles: [],
            audience_station_ids: [],
            audience_label: '',
        }));
    }, []);

    const handleFileSelection = useCallback((nextFile: File | null) => {
        if (!nextFile) return;
        setFile(nextFile);
        setForm((current) => ({
            ...current,
            source_type: 'upload',
            file_name: nextFile.name,
            file_size: nextFile.size,
            mime_type: nextFile.type,
        }));
    }, []);

    const submit = useCallback(async (event: React.FormEvent) => {
        event.preventDefault();
        setSaving(true);

        try {
            if (form.source_type === 'upload' && !file && !form.file_url) {
                throw new Error('File dokumen wajib dipilih');
            }

            if (form.source_type === 'link' && !form.external_url.trim()) {
                throw new Error('Link dokumen wajib diisi');
            }

            let uploadedPayload = {
                file_url: form.file_url,
                file_name: form.file_name,
                file_size: form.file_size,
                mime_type: form.mime_type,
            };

            if (form.source_type === 'upload' && file) {
                const uploadForm = new FormData();
                uploadForm.append('file', file);

                const uploadResponse = await fetch('/api/uploads/document', {
                    method: 'POST',
                    body: uploadForm,
                });

                if (!uploadResponse.ok) {
                    const error = await uploadResponse.json().catch(() => ({}));
                    throw new Error(error.error || 'Gagal mengupload dokumen');
                }

                const uploaded = await uploadResponse.json();
                uploadedPayload = {
                    file_url: uploaded.url,
                    file_name: uploaded.name,
                    file_size: uploaded.size,
                    mime_type: file.type,
                };
            }

            const payload = {
                division: 'HC',
                category: form.category,
                title: form.title,
                description: form.description || null,
                meeting_title: form.meeting_title || null,
                meeting_date: form.meeting_date || null,
                audience_label: form.audience_label || null,
                source_type: form.source_type,
                external_url: form.source_type === 'link' ? form.external_url : null,
                file_url: form.source_type === 'upload' ? uploadedPayload.file_url : null,
                file_name: form.source_type === 'upload' ? uploadedPayload.file_name : null,
                file_size: form.source_type === 'upload' ? uploadedPayload.file_size : null,
                mime_type: form.source_type === 'upload' ? uploadedPayload.mime_type : null,
                visibility_scope: form.visibility_scope,
                audience_station_ids: ['stations', 'targeted'].includes(form.visibility_scope)
                    ? form.audience_station_ids
                    : [],
                audience_roles: ['roles', 'targeted'].includes(form.visibility_scope)
                    ? form.audience_roles
                    : [],
            };

            const response = await fetch(
                editing ? `/api/division-documents/${editing.id}` : '/api/division-documents',
                {
                    method: editing ? 'PATCH' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                }
            );

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error || 'Gagal menyimpan dokumen');
            }

            resetComposer();
            await load();
        } catch (error) {
            window.alert(error instanceof Error ? error.message : 'Gagal menyimpan dokumen');
        } finally {
            setSaving(false);
        }
    }, [editing, file, form, load, resetComposer]);

    const removeDocument = useCallback(async (document: DivisionDocument) => {
        const confirmed = window.confirm(`Hapus dokumen "${document.title}"?`);
        if (!confirmed) return;

        setSaving(true);
        try {
            const response = await fetch(`/api/division-documents/${document.id}`, { method: 'DELETE' });
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error || 'Gagal menghapus dokumen');
            }

            if (selectedDocument?.id === document.id) {
                setSelectedDocument(null);
            }

            await load();
        } catch (error) {
            window.alert(error instanceof Error ? error.message : 'Gagal menghapus dokumen');
        } finally {
            setSaving(false);
        }
    }, [load, selectedDocument]);

    const tabs = [
        { value: 'all' as const, label: 'Semua', count: tabCounts.all },
        { value: 'SAM_HANDBOOK' as const, label: 'Handbook / SAM / SLA', count: tabCounts.SAM_HANDBOOK },
        { value: 'EDARAN_DIREKSI' as const, label: 'Edaran HC', count: tabCounts.EDARAN_DIREKSI },
        { value: 'MATERI_SOSIALISASI' as const, label: 'Materi Sosialisasi', count: tabCounts.MATERI_SOSIALISASI },
    ];

    return (
        <>
            <div className="min-h-screen bg-white px-6 py-6 text-[14px]" style={{ fontFamily: 'Inter, var(--font-body), sans-serif' }}>
                <div className="mx-auto max-w-[1100px]">
                    <header className="flex items-center justify-between gap-4">
                        <h1 className="text-[24px] font-bold tracking-[-0.02em] text-[#111111]">Edaran &amp; Materi HC</h1>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={load}
                                disabled={loading}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E5E7EB] bg-white text-[#6B7280] transition hover:bg-[#F9FAFB] hover:text-[#111111] disabled:opacity-50"
                                aria-label="Segarkan dokumen"
                            >
                                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                            </button>
                            {canManage ? (
                                <button
                                    type="button"
                                    onClick={startCreate}
                                    className="inline-flex h-9 items-center gap-2 rounded-md bg-[#009688] px-4 text-[14px] font-medium text-white transition hover:bg-[#00796B]"
                                >
                                    <Plus className="h-4 w-4" />
                                    Tambah Dokumen
                                </button>
                            ) : null}
                        </div>
                    </header>

                    <div className="mt-6 border-b border-[#E5E7EB]">
                        <nav className="flex items-end gap-6 overflow-x-auto">
                            {tabs.map((tab) => {
                                const isActive = activeTab === tab.value;
                                const showInactiveCount = !isActive && tab.count > 0;

                                return (
                                    <button
                                        key={tab.value}
                                        type="button"
                                        onClick={() => setActiveTab(tab.value)}
                                        className={cn(
                                            'inline-flex items-center gap-2 border-b-2 px-0 pb-3 pt-1 text-[14px] font-medium transition-colors',
                                            isActive
                                                ? 'border-[#009688] text-[#111111]'
                                                : 'border-transparent text-[#6B7280] hover:text-[#111111]'
                                        )}
                                    >
                                        <span>{tab.label}</span>
                                        {isActive ? (
                                            <span className="rounded-full bg-[#E0F2F1] px-2 py-0.5 text-[12px] font-semibold text-[#009688]">
                                                {tab.count}
                                            </span>
                                        ) : showInactiveCount ? (
                                            <span className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[12px] font-semibold text-[#6B7280]">
                                                {tab.count}
                                            </span>
                                        ) : null}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    <div className="mt-4 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                        <div className="flex flex-wrap items-center gap-3 xl:flex-nowrap">
                            <div className="relative min-w-[280px] flex-1">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                                <input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Cari judul dokumen..."
                                    className="h-10 w-full rounded-md border border-[#E5E7EB] bg-white pl-9 pr-3 text-[14px] text-[#111111] outline-none transition focus:border-[#009688]"
                                />
                            </div>

                            <select
                                value={audienceFilter}
                                onChange={(event) => setAudienceFilter(event.target.value)}
                                className="h-10 min-w-[180px] rounded-md border border-[#E5E7EB] bg-white px-3 text-[14px] text-[#374151] outline-none transition focus:border-[#009688]"
                            >
                                <option value="all">Semua Role</option>
                                {ROLE_OPTIONS.map((role) => (
                                    <option key={role.value} value={role.value}>
                                        {role.label}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={sort}
                                onChange={(event) => setSort(event.target.value as HCSortOption)}
                                className="h-10 min-w-[140px] rounded-md border border-[#E5E7EB] bg-white px-3 text-[14px] text-[#374151] outline-none transition focus:border-[#009688]"
                            >
                                <option value="newest">Terbaru</option>
                                <option value="oldest">Terlama</option>
                                <option value="az">A-Z</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-4 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
                        {filteredDocuments.length > 0 ? (
                            <div className="divide-y divide-[#E5E7EB]">
                                {filteredDocuments.map((document) => {
                                    const Icon = getCategoryIcon(document.category);
                                    const href = getDocumentHref(document);
                                    const audienceSummary = getAudienceSummary(document, stations);
                                    const isSelected = selectedDocument?.id === document.id;

                                    return (
                                        <div
                                            key={document.id}
                                            className={cn(
                                                'group flex min-h-[52px] items-center gap-3 px-4 py-2 transition',
                                                isSelected ? 'bg-[#F3F4F6]' : 'hover:bg-[#F3F4F6]'
                                            )}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => setSelectedDocument(document)}
                                                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                            >
                                                <Icon className="h-4 w-4 shrink-0 text-[#6B7280]" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-[14px] font-semibold leading-5 text-[#111111]">
                                                        {document.title}
                                                    </p>
                                                    <div className="mt-0.5 flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap text-[12px] text-[#6B7280]">
                                                        <span className="truncate rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2 py-0.5">
                                                            {getCategoryLabel(document.category)}
                                                        </span>
                                                        <span>·</span>
                                                        <span className="truncate rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2 py-0.5">
                                                            {audienceSummary}
                                                        </span>
                                                        <span>·</span>
                                                        <span className="shrink-0">{getDocumentDateLabel(document)}</span>
                                                    </div>
                                                </div>
                                            </button>

                                            <div className="flex shrink-0 items-center gap-1">
                                                {href ? (
                                                    <a
                                                        href={href}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(event) => event.stopPropagation()}
                                                        className="inline-flex h-8 items-center rounded-md px-3 text-[12px] font-medium text-[#374151] transition hover:bg-[#F3F4F6] hover:text-[#111111]"
                                                    >
                                                        Buka File
                                                    </a>
                                                ) : null}

                                                {canManage ? (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <button
                                                                type="button"
                                                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#6B7280] opacity-0 transition hover:bg-[#F3F4F6] hover:text-[#111111] focus:opacity-100 group-hover:opacity-100"
                                                                onClick={(event) => event.stopPropagation()}
                                                                aria-label="Aksi dokumen"
                                                            >
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-36 border-[#E5E7EB]">
                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    setSelectedDocument(null);
                                                                    startEdit(document);
                                                                }}
                                                            >
                                                                Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className="text-[#DC2626] focus:text-[#DC2626]"
                                                                onClick={() => removeDocument(document)}
                                                            >
                                                                Hapus
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                ) : null}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex min-h-[360px] items-center justify-center px-6">
                                <div className="text-center">
                                    <FileText className="mx-auto h-9 w-9 text-[#9CA3AF]" />
                                    <p className="mt-4 text-[16px] font-medium text-[#374151]">
                                        {search || audienceFilter !== 'all'
                                            ? 'Tidak ada dokumen yang cocok'
                                            : `Belum ada ${currentTabLabel}`}
                                    </p>
                                    <p className="mt-2 text-[14px] text-[#6B7280]">
                                        {search || audienceFilter !== 'all'
                                            ? 'Coba ubah kata kunci atau filter yang dipilih.'
                                            : 'Klik \'+ Tambah Dokumen\' untuk menambahkan.'}
                                    </p>
                                    {canManage && !search && audienceFilter === 'all' ? (
                                        <button
                                            type="button"
                                            onClick={startCreate}
                                            className="mt-5 inline-flex h-9 items-center gap-2 rounded-md bg-[#009688] px-4 text-[14px] font-medium text-white transition hover:bg-[#00796B]"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Tambah Dokumen
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {selectedDocument ? (
                <div className="fixed inset-0 z-40">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/20"
                        onClick={() => setSelectedDocument(null)}
                        aria-label="Tutup panel detail"
                    />
                    <aside className="absolute inset-y-0 right-0 w-full max-w-[460px] overflow-y-auto border-l border-[#E5E7EB] bg-white shadow-xl">
                        <div className="flex items-start justify-between gap-4 border-b border-[#E5E7EB] px-6 py-5">
                            <div className="min-w-0">
                                <h2 className="text-[20px] font-semibold leading-7 text-[#111111]">
                                    {selectedDocument.title}
                                </h2>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 text-[12px] text-[#6B7280]">
                                        {getCategoryLabel(selectedDocument.category)}
                                    </span>
                                    <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 text-[12px] text-[#6B7280]">
                                        {getAudienceSummary(selectedDocument, stations)}
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedDocument(null)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#6B7280] transition hover:bg-[#F3F4F6] hover:text-[#111111]"
                                aria-label="Tutup"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="space-y-6 px-6 py-6">
                            {selectedDocument.description ? (
                                <p className="text-[14px] leading-6 text-[#4B5563]">{selectedDocument.description}</p>
                            ) : null}

                            <section className="space-y-3">
                                <div>
                                    <p className="text-[13px] font-medium text-[#374151]">File</p>
                                    <div className="mt-1 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                                        <p className="break-all text-[14px] text-[#111111]">
                                            {selectedDocument.file_name || selectedDocument.external_url || '-'}
                                        </p>
                                        {getDocumentHref(selectedDocument) ? (
                                            <a
                                                href={getDocumentHref(selectedDocument)!}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-2 inline-flex items-center gap-2 text-[13px] font-medium text-[#009688] hover:underline"
                                            >
                                                {selectedDocument.source_type === 'upload' ? (
                                                    <FileDown className="h-4 w-4" />
                                                ) : (
                                                    <ExternalLink className="h-4 w-4" />
                                                )}
                                                Download / buka file
                                            </a>
                                        ) : null}
                                    </div>
                                </div>

                                <div>
                                    <p className="text-[13px] font-medium text-[#374151]">Tanggal dokumen</p>
                                    <p className="mt-1 text-[14px] text-[#111111]">
                                        {formatLongDate(selectedDocument.meeting_date)}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-[13px] font-medium text-[#374151]">Dibuat oleh</p>
                                    <p className="mt-1 text-[14px] text-[#111111]">
                                        {selectedDocument.created_by_name || '-'}
                                        {selectedDocument.created_at ? ` • ${formatLongDate(selectedDocument.created_at)}` : ''}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-[13px] font-medium text-[#374151]">Audience</p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {getAudienceTags(selectedDocument, stations).map((tag) => (
                                            <span
                                                key={tag}
                                                className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 text-[12px] text-[#6B7280]"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {selectedDocument.meeting_title ? (
                                    <div>
                                        <p className="text-[13px] font-medium text-[#374151]">Meeting / Sosialisasi</p>
                                        <p className="mt-1 text-[14px] text-[#111111]">{selectedDocument.meeting_title}</p>
                                    </div>
                                ) : null}
                            </section>

                            {canManage ? (
                                <div className="flex items-center gap-2 border-t border-[#E5E7EB] pt-5">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const nextDocument = selectedDocument;
                                            setSelectedDocument(null);
                                            startEdit(nextDocument);
                                        }}
                                        className="inline-flex h-9 items-center rounded-md border border-[#E5E7EB] bg-white px-4 text-[14px] font-medium text-[#374151] transition hover:bg-[#F9FAFB] hover:text-[#111111]"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => removeDocument(selectedDocument)}
                                        className="inline-flex h-9 items-center rounded-md border border-[#FCA5A5] bg-white px-4 text-[14px] font-medium text-[#DC2626] transition hover:bg-[#FEF2F2]"
                                    >
                                        Hapus
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    </aside>
                </div>
            ) : null}

            {isUploadOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
                    <div className="w-full max-w-[520px] rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl">
                        <div className="flex items-start justify-between gap-4 border-b border-[#E5E7EB] px-6 py-5">
                            <div>
                                <h2 className="text-[18px] font-semibold text-[#111111]">
                                    {editing ? 'Edit Dokumen' : 'Tambah Dokumen'}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={resetComposer}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#6B7280] transition hover:bg-[#F3F4F6] hover:text-[#111111]"
                                aria-label="Tutup modal"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={submit} className="space-y-5 px-6 py-5">
                            <div>
                                <label className="mb-2 block text-[13px] font-medium text-[#374151]">Kategori*</label>
                                <select
                                    value={form.category}
                                    onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as DivisionDocumentCategory }))}
                                    className="h-10 w-full rounded-md border border-[#E5E7EB] bg-white px-3 text-[14px] text-[#111111] outline-none transition focus:border-[#009688]"
                                    required
                                >
                                    {CATEGORY_OPTIONS.map((category) => (
                                        <option key={category.value} value={category.value}>
                                            {category.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-[13px] font-medium text-[#374151]">Judul*</label>
                                <input
                                    value={form.title}
                                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                                    className="h-10 w-full rounded-md border border-[#E5E7EB] bg-white px-3 text-[14px] text-[#111111] outline-none transition focus:border-[#009688]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-[13px] font-medium text-[#374151]">Deskripsi</label>
                                <textarea
                                    value={form.description}
                                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                                    rows={3}
                                    className="w-full rounded-md border border-[#E5E7EB] bg-white px-3 py-2.5 text-[14px] text-[#111111] outline-none transition focus:border-[#009688]"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-[13px] font-medium text-[#374151]">File*</label>
                                {form.source_type === 'link' ? (
                                    <div className="space-y-3 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                                        <p className="text-[13px] text-[#6B7280]">
                                            Dokumen ini memakai tautan eksternal. Anda bisa mempertahankan link lama atau menggantinya dengan upload file baru.
                                        </p>
                                        <input
                                            type="url"
                                            value={form.external_url}
                                            onChange={(event) => setForm((current) => ({ ...current, external_url: event.target.value }))}
                                            placeholder="https://..."
                                            className="h-10 w-full rounded-md border border-[#E5E7EB] bg-white px-3 text-[14px] text-[#111111] outline-none transition focus:border-[#009688]"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setForm((current) => ({ ...current, source_type: 'upload', external_url: '' }))}
                                            className="text-[13px] font-medium text-[#009688] hover:underline"
                                        >
                                            Ganti menjadi upload file
                                        </button>
                                    </div>
                                ) : (
                                    <label
                                        onDragOver={(event) => {
                                            event.preventDefault();
                                            setIsDragActive(true);
                                        }}
                                        onDragLeave={() => setIsDragActive(false)}
                                        onDrop={(event) => {
                                            event.preventDefault();
                                            setIsDragActive(false);
                                            handleFileSelection(event.dataTransfer.files?.[0] || null);
                                        }}
                                        className={cn(
                                            'block rounded-xl border border-dashed bg-[#F9FAFB] p-4 text-center transition',
                                            isDragActive ? 'border-[#009688] bg-[#E0F2F1]' : 'border-[#D1D5DB]'
                                        )}
                                    >
                                        <input
                                            type="file"
                                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                                            onChange={(event) => handleFileSelection(event.target.files?.[0] || null)}
                                            className="hidden"
                                        />
                                        <Upload className="mx-auto h-5 w-5 text-[#6B7280]" />
                                        <p className="mt-2 text-[14px] font-medium text-[#374151]">
                                            Drag &amp; drop file atau klik untuk upload
                                        </p>
                                        <p className="mt-1 text-[12px] text-[#6B7280]">
                                            PDF, Word, Excel, atau PowerPoint
                                        </p>
                                        <p className="mt-3 text-[13px] text-[#111111]">
                                            {file?.name || form.file_name || 'Belum ada file dipilih'}
                                        </p>
                                    </label>
                                )}
                            </div>

                            <div>
                                <label className="mb-2 block text-[13px] font-medium text-[#374151]">Tanggal Dokumen*</label>
                                <input
                                    type="date"
                                    value={form.meeting_date}
                                    onChange={(event) => setForm((current) => ({ ...current, meeting_date: event.target.value }))}
                                    className="h-10 w-full rounded-md border border-[#E5E7EB] bg-white px-3 text-[14px] text-[#111111] outline-none transition focus:border-[#009688]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-[13px] font-medium text-[#374151]">Audience / Role Target*</label>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={handleAllAudience}
                                        className={cn(
                                            'rounded-full border px-3 py-1.5 text-[13px] font-medium transition',
                                            form.visibility_scope === 'all' && form.audience_station_ids.length === 0
                                                ? 'border-[#009688] bg-[#E0F2F1] text-[#00796B]'
                                                : 'border-[#E5E7EB] bg-white text-[#4B5563] hover:bg-[#F9FAFB]'
                                        )}
                                    >
                                        Semua
                                    </button>
                                    {ROLE_OPTIONS.map((role) => {
                                        const active = form.audience_roles.includes(role.value);
                                        return (
                                            <button
                                                key={role.value}
                                                type="button"
                                                onClick={() => handleRoleToggle(role.value)}
                                                className={cn(
                                                    'rounded-full border px-3 py-1.5 text-[13px] font-medium transition',
                                                    active
                                                        ? 'border-[#009688] bg-[#E0F2F1] text-[#00796B]'
                                                        : 'border-[#E5E7EB] bg-white text-[#4B5563] hover:bg-[#F9FAFB]'
                                                )}
                                            >
                                                {role.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                {form.audience_station_ids.length > 0 ? (
                                    <p className="mt-2 text-[12px] text-[#6B7280]">
                                        Target cabang yang sudah tersimpan akan tetap dipertahankan.
                                    </p>
                                ) : null}
                            </div>

                            <div>
                                {showMeetingInfo ? (
                                    <div>
                                        <label className="mb-2 block text-[13px] font-medium text-[#374151]">
                                            Meeting / Sosialisasi
                                        </label>
                                        <input
                                            value={form.meeting_title}
                                            onChange={(event) => setForm((current) => ({ ...current, meeting_title: event.target.value }))}
                                            className="h-10 w-full rounded-md border border-[#E5E7EB] bg-white px-3 text-[14px] text-[#111111] outline-none transition focus:border-[#009688]"
                                            placeholder="Nama meeting atau sosialisasi"
                                        />
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setShowMeetingInfo(true)}
                                        className="text-[13px] font-medium text-[#009688] hover:underline"
                                    >
                                        + Tambah info meeting
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-2 border-t border-[#E5E7EB] pt-4">
                                <button
                                    type="button"
                                    onClick={resetComposer}
                                    className="inline-flex h-9 items-center rounded-md border border-[#E5E7EB] bg-white px-4 text-[14px] font-medium text-[#374151] transition hover:bg-[#F9FAFB] hover:text-[#111111]"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="inline-flex h-9 items-center gap-2 rounded-md bg-[#009688] px-4 text-[14px] font-medium text-white transition hover:bg-[#00796B] disabled:opacity-50"
                                >
                                    {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
                                    Simpan Dokumen
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
        </>
    );
}
