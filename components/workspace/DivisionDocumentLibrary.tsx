'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    BookOpen,
    BookText,
    ExternalLink,
    FileDown,
    FileText,
    FileStack,
    GraduationCap,
    Inbox,
    Link2,
    Paperclip,
    Plus,
    RefreshCw,
    ShieldCheck,
    Trash2,
    Upload,
    WifiOff,
    X,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/lib/hooks/use-auth';
import { cn } from '@/lib/utils';
import type {
    DivisionDocument,
    DivisionDocumentCategory,
    DivisionDocumentDivision,
    DivisionDocumentVisibilityScope,
} from '@/types';

interface StationOption {
    id: string;
    code: string;
    name: string;
}

interface CategoryOption {
    value: DivisionDocumentCategory;
    label: string;
    description: string;
}

interface DivisionDocumentLibraryProps {
    division: DivisionDocumentDivision;
    title: string;
    description: string;
    experience?: 'manage' | 'inbox';
    forceManage?: boolean;
    showOfflineTips?: boolean;
}

interface DocumentCardProps {
    document: DivisionDocument;
    categoryLabel: string;
    canManage: boolean;
    experience: 'manage' | 'inbox';
    onEdit: (document: DivisionDocument) => void;
    onRemove: (document: DivisionDocument) => void;
    resolveRoleLabels: (roles: string[]) => string[];
    resolveStationLabels: (stationIds: string[]) => string[];
}

type MinimalInboxFilter = 'all' | DivisionDocumentCategory;

interface MinimalInboxDocumentRowProps {
    document: DivisionDocument;
    offlineSaved: boolean;
    unread: boolean;
    onOpen: (document: DivisionDocument) => void;
}

const ROLE_OPTIONS = [
    { value: 'MANAGER_CABANG', label: 'Manager / GM Cabang' },
    { value: 'STAFF_CABANG', label: 'Staff Cabang' },
    { value: 'DIVISI_HC', label: 'Divisi HC' },
    { value: 'DIVISI_HT', label: 'Divisi HT' },
    { value: 'DIVISI_OS', label: 'Divisi OS' },
    { value: 'ANALYST', label: 'Analyst' },
];

function categoryConfig(division: DivisionDocumentDivision): CategoryOption[] {
    if (division === 'HT') {
        return [
            {
                value: 'TRAINING_MATERIAL',
                label: 'Materi Training',
                description: 'Materi utama training.',
            },
            {
                value: 'SAM_HANDBOOK',
                label: 'SAM / Handbook',
                description: 'Panduan training.',
            },
            {
                value: 'MATERI_SOSIALISASI',
                label: 'Materi Sosialisasi',
                description: 'Hasil meeting.',
            },
        ];
    }

    return [
        {
            value: 'SAM_HANDBOOK',
            label: 'Handbook / SAM / SLA',
            description: 'Panduan resmi HC.',
        },
        {
            value: 'EDARAN_DIREKSI',
            label: 'Edaran HC',
            description: 'Surat edaran dan arahan.',
        },
        {
            value: 'MATERI_SOSIALISASI',
            label: 'Materi Sosialisasi',
            description: 'Materi meeting.',
        },
    ];
}

function visibilityLabel(scope: DivisionDocumentVisibilityScope) {
    if (scope === 'stations') return 'Cabang Tertentu';
    if (scope === 'roles') return 'Role Tertentu';
    if (scope === 'targeted') return 'Cabang + Role';
    return 'Semua User';
}

function createInitialForm(defaultCategory: DivisionDocumentCategory) {
    return {
        category: defaultCategory,
        title: '',
        description: '',
        meeting_title: '',
        meeting_date: '',
        audience_label: '',
        source_type: 'upload' as 'upload' | 'link',
        external_url: '',
        file_url: '',
        file_name: '',
        file_size: 0,
        mime_type: '',
        visibility_scope: 'all' as DivisionDocumentVisibilityScope,
        audience_station_ids: [] as string[],
        audience_roles: [] as string[],
    };
}

function formatMeetingDate(value?: string | null) {
    if (!value) return null;
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(date);
}

function formatCreatedDate(value?: string | null) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date);
}

function getInboxCategoryLabel(category: DivisionDocumentCategory) {
    switch (category) {
        case 'EDARAN_DIREKSI':
            return 'Edaran';
        case 'TRAINING_MATERIAL':
            return 'Training';
        case 'MATERI_SOSIALISASI':
            return 'Meeting';
        default:
            return 'Handbook';
    }
}

function getInboxCategoryIcon(category: DivisionDocumentCategory) {
    switch (category) {
        case 'EDARAN_DIREKSI':
            return <BookOpen className="h-5 w-5" />;
        case 'TRAINING_MATERIAL':
            return <GraduationCap className="h-5 w-5" />;
        case 'MATERI_SOSIALISASI':
            return <FileStack className="h-5 w-5" />;
        default:
            return <BookText className="h-5 w-5" />;
    }
}

function getCategoryTone(category: DivisionDocumentCategory) {
    switch (category) {
        case 'EDARAN_DIREKSI':
            return {
                sectionClass: 'bg-gradient-to-br from-sky-50 via-white to-white',
                labelClass: 'text-sky-700',
                badgeClass: 'bg-sky-50 text-sky-700',
                borderClass: 'border-sky-100',
            };
        case 'MATERI_SOSIALISASI':
            return {
                sectionClass: 'bg-gradient-to-br from-emerald-50 via-white to-white',
                labelClass: 'text-emerald-700',
                badgeClass: 'bg-emerald-50 text-emerald-700',
                borderClass: 'border-emerald-100',
            };
        case 'TRAINING_MATERIAL':
            return {
                sectionClass: 'bg-gradient-to-br from-violet-50 via-white to-white',
                labelClass: 'text-violet-700',
                badgeClass: 'bg-violet-50 text-violet-700',
                borderClass: 'border-violet-100',
            };
        default:
            return {
                sectionClass: 'bg-gradient-to-br from-amber-50 via-white to-white',
                labelClass: 'text-amber-700',
                badgeClass: 'bg-amber-50 text-amber-700',
                borderClass: 'border-amber-100',
            };
    }
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

function isStandaloneDisplayMode() {
    if (typeof window === 'undefined') return true;
    if ('standalone' in window.navigator && window.navigator.standalone) return true;
    return window.matchMedia('(display-mode: standalone)').matches;
}

function MinimalInboxDocumentRow({ document, offlineSaved, unread, onOpen }: MinimalInboxDocumentRowProps) {
    const distributedDate = formatCreatedDate(document.created_at);
    const hasAttachment = document.source_type === 'upload' && Boolean(document.file_url || document.file_name);

    return (
        <button
            type="button"
            onClick={() => onOpen(document)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#F3F4F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009688]/30"
        >
            <div className="shrink-0 text-[#6B7280]">
                {getInboxCategoryIcon(document.category)}
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold leading-5 text-[#111827]">{document.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[#6B7280]">
                    <span className="rounded-full border border-[#E5E7EB] bg-white px-2 py-0.5">
                        {getInboxCategoryLabel(document.category)}
                    </span>
                    {distributedDate ? <span>{distributedDate}</span> : null}
                    {offlineSaved ? <span>● Tersimpan offline</span> : null}
                </div>
            </div>
            <div className="flex shrink-0 items-center gap-3 text-[#6B7280]">
                {hasAttachment ? <Paperclip className="h-4 w-4" aria-label="Memiliki lampiran" /> : null}
                {unread ? <span className="h-2.5 w-2.5 rounded-full bg-[#009688]" aria-label="Belum dibaca" /> : null}
            </div>
        </button>
    );
}

function DocumentCard({
    document,
    categoryLabel,
    canManage,
    experience,
    onEdit,
    onRemove,
    resolveRoleLabels,
    resolveStationLabels,
}: DocumentCardProps) {
    const tone = getCategoryTone(document.category);
    const link = getDocumentHref(document);
    const stationLabels = resolveStationLabels(document.audience_station_ids);
    const roleLabels = resolveRoleLabels(document.audience_roles);
    const createdDate = formatCreatedDate(document.created_at);

    return (
        <GlassCard className={`h-full border ${tone.borderClass} bg-white`}>
            <div className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className={`text-xs font-bold uppercase tracking-[0.18em] ${tone.labelClass}`}>
                            {categoryLabel}
                        </p>
                        <h3 className="mt-2 text-xl font-black text-[var(--text-primary)]">{document.title}</h3>
                    </div>
                    {experience === 'manage' && (
                        <span className="rounded-full bg-[var(--surface-1)] px-3 py-1 text-[11px] font-bold text-[var(--text-secondary)]">
                            {visibilityLabel(document.visibility_scope)}
                        </span>
                    )}
                </div>

                <p className="mt-3 flex-1 text-sm text-[var(--text-secondary)]">
                    {document.description || 'Dokumen internal siap dibuka sesuai visibilitas yang telah ditentukan.'}
                </p>

                <div className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
                    {document.meeting_title && <p>Meeting / Sosialisasi: {document.meeting_title}</p>}
                    {document.meeting_date && <p>Tanggal: {formatMeetingDate(document.meeting_date)}</p>}
                    {document.audience_label && <p>Audience: {document.audience_label}</p>}
                    {document.file_name && <p>File: {document.file_name}</p>}
                    {experience === 'manage' && createdDate && <p>Dibuat: {createdDate}</p>}
                    {experience === 'manage' && document.created_by_name && <p>Uploader: {document.created_by_name}</p>}
                    {experience === 'manage' && stationLabels.length > 0 && (
                        <p>Cabang target: {stationLabels.join(', ')}</p>
                    )}
                    {experience === 'manage' && roleLabels.length > 0 && (
                        <p>Role target: {roleLabels.join(', ')}</p>
                    )}
                </div>

                {(stationLabels.length > 0 || roleLabels.length > 0) && (
                    <div className="mt-4 flex flex-wrap gap-2">
                        {stationLabels.slice(0, experience === 'manage' ? 3 : 2).map((label) => (
                            <span key={label} className={`rounded-full px-3 py-1 text-[11px] font-bold ${tone.badgeClass}`}>
                                {label}
                            </span>
                        ))}
                        {roleLabels.slice(0, experience === 'manage' ? 3 : 2).map((label) => (
                            <span key={label} className="rounded-full bg-[var(--surface-1)] px-3 py-1 text-[11px] font-bold text-[var(--text-secondary)]">
                                {label}
                            </span>
                        ))}
                    </div>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                    {link && (
                        <Button asChild>
                            <a href={link} target="_blank" rel="noopener noreferrer">
                                {document.source_type === 'upload' ? <FileDown className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
                                {document.source_type === 'upload' ? 'Buka File' : 'Buka Link'}
                            </a>
                        </Button>
                    )}
                    {canManage && experience === 'manage' && (
                        <>
                            <Button variant="outline" onClick={() => onEdit(document)}>
                                Edit
                            </Button>
                            <Button variant="outline" onClick={() => onRemove(document)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </GlassCard>
    );
}

export function DivisionDocumentLibrary({
    division,
    title,
    description,
    experience = 'manage',
    forceManage = false,
    showOfflineTips = false,
}: DivisionDocumentLibraryProps) {
    const { user } = useAuth(false);
    const categories = useMemo(() => categoryConfig(division), [division]);
    const [documents, setDocuments] = useState<DivisionDocument[]>([]);
    const [stations, setStations] = useState<StationOption[]>([]);
    const [busy, setBusy] = useState(false);
    const [composerOpen, setComposerOpen] = useState(false);
    const [editing, setEditing] = useState<DivisionDocument | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [form, setForm] = useState(() => createInitialForm(categories[0]?.value || 'SAM_HANDBOOK'));
    const [minimalInboxFilter, setMinimalInboxFilter] = useState<MinimalInboxFilter>('all');
    const [minimalInboxSort, setMinimalInboxSort] = useState<'newest' | 'oldest'>('newest');
    const [selectedDocument, setSelectedDocument] = useState<DivisionDocument | null>(null);
    const [readDocumentMap, setReadDocumentMap] = useState<Record<string, string>>({});
    const [offlineSavedDocumentMap, setOfflineSavedDocumentMap] = useState<Record<string, string>>({});
    const [isOnline, setIsOnline] = useState(true);
    const [showInstallToast, setShowInstallToast] = useState(false);

    const normalizedRole = String(user?.role || '').trim().toUpperCase();
    const canManage = forceManage || ['SUPER_ADMIN', 'ANALYST', `DIVISI_${division}`, `PARTNER_${division}`].includes(normalizedRole);
    const isManageExperience = experience === 'manage';
    const isMinimalInboxExperience = !isManageExperience && ['HC', 'HT'].includes(division);
    const isTrainingInboxExperience = division === 'HT' && isMinimalInboxExperience;
    const createLabel = division === 'HC' ? 'Tambah Edaran / Materi' : 'Tambah Materi Training';
    const createTitle = division === 'HC' ? 'Tambah Edaran atau Materi HC' : 'Tambah Materi HT';
    const readStorageKey = useMemo(
        () => `division-document-read:${division}:${user?.id || 'anonymous'}`,
        [division, user?.id]
    );
    const offlineSavedStorageKey = useMemo(
        () => `division-document-offline:${division}:${user?.id || 'anonymous'}`,
        [division, user?.id]
    );
    const stationNameMap = useMemo(
        () => new Map(stations.map((station) => [station.id, `${station.code} - ${station.name}`])),
        [stations]
    );

    const load = useCallback(async () => {
        setBusy(true);
        try {
            const [documentsRes, stationsRes] = await Promise.all([
                fetch(`/api/division-documents?division=${division}`, { cache: 'no-store' }),
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
            console.error('[DivisionDocumentLibrary] Failed to load library:', error);
        } finally {
            setBusy(false);
        }
    }, [division]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        try {
            const stored = window.localStorage.getItem(readStorageKey);
            setReadDocumentMap(stored ? JSON.parse(stored) : {});
        } catch {
            setReadDocumentMap({});
        }
    }, [readStorageKey]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        try {
            const stored = window.localStorage.getItem(offlineSavedStorageKey);
            setOfflineSavedDocumentMap(stored ? JSON.parse(stored) : {});
        } catch {
            setOfflineSavedDocumentMap({});
        }
    }, [offlineSavedStorageKey]);

    useEffect(() => {
        if (!isMinimalInboxExperience || typeof window === 'undefined') return;

        setIsOnline(window.navigator.onLine);

        const handleOnlineStatusChange = () => {
            setIsOnline(window.navigator.onLine);
        };

        window.addEventListener('online', handleOnlineStatusChange);
        window.addEventListener('offline', handleOnlineStatusChange);

        return () => {
            window.removeEventListener('online', handleOnlineStatusChange);
            window.removeEventListener('offline', handleOnlineStatusChange);
        };
    }, [isMinimalInboxExperience]);

    useEffect(() => {
        if (!isTrainingInboxExperience || typeof window === 'undefined') return;

        const dismissed = window.localStorage.getItem('training-hub-install-toast-dismissed') === '1';
        setShowInstallToast(!dismissed && !isStandaloneDisplayMode());

        const handleInstalled = () => {
            setShowInstallToast(false);
        };

        window.addEventListener('appinstalled', handleInstalled);
        return () => window.removeEventListener('appinstalled', handleInstalled);
    }, [isTrainingInboxExperience]);

    useEffect(() => {
        setForm((current) => ({
            ...current,
            category: categories[0]?.value || current.category,
        }));
    }, [categories]);

    useEffect(() => {
        if (!isMinimalInboxExperience) return;

        const intervalId = window.setInterval(() => {
            load();
        }, 60000);

        return () => window.clearInterval(intervalId);
    }, [isMinimalInboxExperience, load]);

    useEffect(() => {
        if (!selectedDocument) return;

        const updatedSelectedDocument = documents.find((document) => document.id === selectedDocument.id) || null;
        setSelectedDocument(updatedSelectedDocument);
    }, [documents, selectedDocument]);

    const documentsByCategory = useMemo(() => {
        return categories.map((category) => ({
            ...category,
            documents: documents.filter((document) => document.category === category.value),
        }));
    }, [categories, documents]);

    const featuredDocuments = useMemo(() => documents.slice(0, 3), [documents]);

    const relevantMaterialsCount = useMemo(() => {
        return documents.filter((document) => document.category === 'MATERI_SOSIALISASI').length;
    }, [documents]);

    const visibleSections = useMemo(() => {
        if (isManageExperience) return documentsByCategory;
        return documentsByCategory.filter((section) => section.documents.length > 0);
    }, [documentsByCategory, isManageExperience]);

    const minimalInboxFilters = useMemo(
        () => [
            { value: 'all' as const, label: 'Semua' },
            { value: 'TRAINING_MATERIAL' as const, label: 'Training' },
            { value: 'SAM_HANDBOOK' as const, label: 'Handbook' },
            { value: 'EDARAN_DIREKSI' as const, label: 'Edaran' },
            { value: 'MATERI_SOSIALISASI' as const, label: 'Meeting' },
        ],
        []
    );

    const minimalInboxDocuments = useMemo(() => {
        const filtered = minimalInboxFilter === 'all'
            ? documents
            : documents.filter((document) => document.category === minimalInboxFilter);

        return [...filtered].sort((left, right) => {
            const leftTime = new Date(left.created_at).getTime();
            const rightTime = new Date(right.created_at).getTime();

            return minimalInboxSort === 'newest' ? rightTime - leftTime : leftTime - rightTime;
        });
    }, [documents, minimalInboxFilter, minimalInboxSort]);

    const resetForm = () => {
        setEditing(null);
        setFile(null);
        setForm(createInitialForm(categories[0]?.value || 'SAM_HANDBOOK'));
        setComposerOpen(false);
    };

    const startEdit = (document: DivisionDocument) => {
        setEditing(document);
        setFile(null);
        setForm({
            category: document.category,
            title: document.title,
            description: document.description || '',
            meeting_title: document.meeting_title || '',
            meeting_date: document.meeting_date || '',
            audience_label: document.audience_label || '',
            source_type: document.source_type,
            external_url: document.external_url || '',
            file_url: document.file_url || '',
            file_name: document.file_name || '',
            file_size: document.file_size || 0,
            mime_type: document.mime_type || '',
            visibility_scope: document.visibility_scope,
            audience_station_ids: [...document.audience_station_ids],
            audience_roles: [...document.audience_roles],
        });
        setComposerOpen(true);
    };

    const markDocumentAsRead = useCallback(
        (documentId: string) => {
            setReadDocumentMap((current) => {
                if (current[documentId]) return current;

                const next = {
                    ...current,
                    [documentId]: new Date().toISOString(),
                };

                if (typeof window !== 'undefined') {
                    window.localStorage.setItem(readStorageKey, JSON.stringify(next));
                }

                return next;
            });
        },
        [readStorageKey]
    );

    const markDocumentAsOfflineSaved = useCallback(
        (documentId: string) => {
            if (typeof window === 'undefined' || !window.navigator.onLine) return;

            setOfflineSavedDocumentMap((current) => {
                if (current[documentId]) return current;

                const next = {
                    ...current,
                    [documentId]: new Date().toISOString(),
                };

                window.localStorage.setItem(offlineSavedStorageKey, JSON.stringify(next));
                return next;
            });
        },
        [offlineSavedStorageKey]
    );

    const openDocumentDetail = useCallback(
        (document: DivisionDocument) => {
            setSelectedDocument(document);
            markDocumentAsRead(document.id);
            if (isTrainingInboxExperience) {
                markDocumentAsOfflineSaved(document.id);
            }
        },
        [isTrainingInboxExperience, markDocumentAsOfflineSaved, markDocumentAsRead]
    );

    const toggleStation = (stationId: string) => {
        setForm((current) => ({
            ...current,
            audience_station_ids: current.audience_station_ids.includes(stationId)
                ? current.audience_station_ids.filter((item) => item !== stationId)
                : [...current.audience_station_ids, stationId],
        }));
    };

    const toggleRole = (role: string) => {
        setForm((current) => ({
            ...current,
            audience_roles: current.audience_roles.includes(role)
                ? current.audience_roles.filter((item) => item !== role)
                : [...current.audience_roles, role],
        }));
    };

    const resolveRoleLabels = (roles: string[]) => {
        return roles.map((role) => ROLE_OPTIONS.find((item) => item.value === role)?.label || role);
    };

    const resolveStationLabels = (stationIds: string[]) => {
        return stationIds.map((stationId) => stationNameMap.get(stationId) || stationId);
    };

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        setBusy(true);

        try {
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
                division,
                category: form.category,
                title: form.title,
                description: form.description,
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

            resetForm();
            await load();
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Gagal menyimpan dokumen');
        } finally {
            setBusy(false);
        }
    };

    const removeDocument = async (document: DivisionDocument) => {
        if (!confirm(`Arsipkan dokumen "${document.title}"?`)) return;
        setBusy(true);
        try {
            const response = await fetch(`/api/division-documents/${document.id}`, { method: 'DELETE' });
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error || 'Gagal menghapus dokumen');
            }
            await load();
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Gagal menghapus dokumen');
        } finally {
            setBusy(false);
        }
    };

    const heroIcon = division === 'HT' ? GraduationCap : BookOpen;
    const HeroIcon = heroIcon;
    const selectedDocumentHref = selectedDocument ? getDocumentHref(selectedDocument) : null;
    const selectedDocumentDate = selectedDocument ? formatCreatedDate(selectedDocument.created_at) : null;
    const selectedDocumentCanPreview = selectedDocument ? canPreviewDocument(selectedDocument) : false;
    const selectedDocumentOfflineSaved = selectedDocument ? Boolean(offlineSavedDocumentMap[selectedDocument.id]) : false;
    const minimalEmptyStateHeading = isTrainingInboxExperience ? 'Belum ada materi training' : 'Belum ada dokumen';
    const minimalEmptyStateSubtext = isTrainingInboxExperience ? 'Materi dari HC akan tampil di sini.' : 'Dokumen dari HC akan tampil di sini.';
    const MinimalEmptyIcon = isTrainingInboxExperience ? GraduationCap : Inbox;
    const dismissInstallToast = () => {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('training-hub-install-toast-dismissed', '1');
        }
        setShowInstallToast(false);
    };

    if (isMinimalInboxExperience) {
        return (
            <Sheet
                open={Boolean(selectedDocument)}
                onOpenChange={(open) => {
                    if (!open) setSelectedDocument(null);
                }}
            >
                <div className="min-h-screen bg-white px-8 py-8 text-[14px]" style={{ fontFamily: 'Inter, var(--font-body)' }}>
                    <div className="mx-auto max-w-[960px]">
                        <div className="flex items-start justify-between gap-6">
                            <div>
                                <h1 className="text-[24px] font-bold tracking-[-0.02em] text-[#111827]">{title}</h1>
                            </div>
                            <div className="flex items-center gap-3">
                                {!isOnline ? <span className="text-[12px] font-normal text-[#6B7280]">● Offline aktif</span> : null}
                                <button
                                    type="button"
                                    onClick={load}
                                    disabled={busy}
                                    className="flex h-8 w-8 items-center justify-center rounded-md text-[#6B7280] transition-colors hover:bg-[#F9FAFB] hover:text-[#111827] disabled:opacity-50"
                                    aria-label="Segarkan dokumen"
                                    title="Segarkan dokumen"
                                >
                                    <RefreshCw className={cn('h-4 w-4', busy && 'animate-spin')} />
                                </button>
                            </div>
                        </div>

                        {documents.length > 0 ? (
                            <>
                                <div className="mt-8 flex items-center justify-between gap-4 border-b border-[#E5E7EB] pb-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {minimalInboxFilters.map((filter) => (
                                            <button
                                                key={filter.value}
                                                type="button"
                                                onClick={() => setMinimalInboxFilter(filter.value)}
                                                className={cn(
                                                    'border-b-2 px-0 py-2 text-[13px] font-medium transition-colors',
                                                    minimalInboxFilter === filter.value
                                                        ? 'border-[#111827] text-[#111827]'
                                                        : 'border-transparent text-[#6B7280] hover:text-[#111827]'
                                                )}
                                            >
                                                {filter.label}
                                            </button>
                                        ))}
                                    </div>
                                    <select
                                        value={minimalInboxSort}
                                        onChange={(event) => setMinimalInboxSort(event.target.value as 'newest' | 'oldest')}
                                        className="h-9 rounded-md border border-[#E5E7EB] bg-white px-3 text-[13px] text-[#374151] focus:border-[#009688] focus:outline-none"
                                        aria-label="Urutkan dokumen"
                                    >
                                        <option value="newest">Terbaru</option>
                                        <option value="oldest">Terlama</option>
                                    </select>
                                </div>

                                {minimalInboxDocuments.length > 0 ? (
                                    <div className="mt-4 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB]">
                                        <div className="divide-y divide-[#E5E7EB]">
                                            {minimalInboxDocuments.map((document) => (
                                                <MinimalInboxDocumentRow
                                                    key={document.id}
                                                    document={document}
                                                    offlineSaved={Boolean(offlineSavedDocumentMap[document.id])}
                                                    unread={!readDocumentMap[document.id]}
                                                    onOpen={openDocumentDetail}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex min-h-[360px] items-center justify-center">
                                        <div className="text-center">
                                            <MinimalEmptyIcon className="mx-auto h-10 w-10 text-[#9CA3AF]" />
                                            <p className="mt-4 text-[16px] font-medium text-[#374151]">{minimalEmptyStateHeading}</p>
                                            <p className="mt-2 text-[14px] text-[#6B7280]">{minimalEmptyStateSubtext}</p>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex min-h-[520px] items-center justify-center">
                                <div className="text-center">
                                    <MinimalEmptyIcon className="mx-auto h-10 w-10 text-[#9CA3AF]" />
                                    <p className="mt-4 text-[16px] font-medium text-[#374151]">{minimalEmptyStateHeading}</p>
                                    <p className="mt-2 text-[14px] text-[#6B7280]">{minimalEmptyStateSubtext}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {isTrainingInboxExperience && showInstallToast ? (
                        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 px-4">
                            <div className="mx-auto flex max-w-[960px] justify-center">
                                <div className="pointer-events-auto flex w-full max-w-md items-center justify-between rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 shadow-lg shadow-black/5">
                                    <p className="pr-4 text-[14px] text-[#374151]">
                                        Tambahkan ke home screen untuk akses offline
                                    </p>
                                    <button
                                        type="button"
                                        onClick={dismissInstallToast}
                                        className="shrink-0 text-[#6B7280] transition-colors hover:text-[#111827]"
                                        aria-label="Tutup notifikasi"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>

                <SheetContent
                    side="right"
                    className="w-full max-w-[720px] overflow-y-auto border-l border-[#E5E7EB] bg-white p-0 sm:max-w-[720px]"
                    style={{ fontFamily: 'Inter, var(--font-body)' }}
                >
                    {selectedDocument ? (
                        <div className="flex min-h-full flex-col">
                            <SheetHeader className="border-b border-[#E5E7EB] px-6 py-6 pr-16">
                                <SheetTitle className="text-left text-[20px] font-semibold leading-7 text-[#111827]">
                                    {selectedDocument.title}
                                </SheetTitle>
                                <div className="mt-4 flex flex-wrap gap-2 text-[12px] text-[#6B7280]">
                                    <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1">
                                        {getInboxCategoryLabel(selectedDocument.category)}
                                    </span>
                                    {selectedDocumentDate ? (
                                        <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1">
                                            Dibagikan {selectedDocumentDate}
                                        </span>
                                    ) : null}
                                    {selectedDocument.created_by_name ? (
                                        <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1">
                                            Oleh {selectedDocument.created_by_name}
                                        </span>
                                    ) : null}
                                    {selectedDocumentOfflineSaved ? <span>● Tersimpan offline</span> : null}
                                </div>
                                {selectedDocumentHref ? (
                                    <div className="mt-5">
                                        <a
                                            href={selectedDocumentHref}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex h-10 items-center gap-2 rounded-md bg-[#009688] px-4 text-[14px] font-medium text-white transition-colors hover:bg-[#00796B]"
                                        >
                                            {selectedDocument.source_type === 'upload' ? <FileDown className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
                                            {selectedDocument.source_type === 'upload' ? 'Buka file' : 'Buka link'}
                                        </a>
                                    </div>
                                ) : null}
                            </SheetHeader>

                            <div className="flex-1 bg-[#F9FAFB] p-6">
                                {selectedDocument.description ? (
                                    <p className="mb-4 text-[14px] leading-6 text-[#4B5563]">{selectedDocument.description}</p>
                                ) : null}

                                {selectedDocumentHref && selectedDocumentCanPreview ? (
                                    <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
                                        <iframe
                                            src={selectedDocumentHref}
                                            title={selectedDocument.title}
                                            className="h-[72vh] w-full"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-[#E5E7EB] bg-white px-6 text-center">
                                        <div>
                                            <FileText className="mx-auto h-10 w-10 text-[#9CA3AF]" />
                                            <p className="mt-4 text-[16px] font-medium text-[#374151]">Preview belum tersedia</p>
                                            <p className="mt-2 text-[14px] text-[#6B7280]">
                                                {selectedDocumentHref
                                                    ? 'Buka file atau link asli untuk melihat dokumen lengkap.'
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

    return (
        <div className="min-h-screen p-4 md:p-6">
            <div className="mx-auto max-w-7xl space-y-6">
                <GlassCard className="overflow-hidden">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="space-y-3">
                            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-sky-700">
                                <HeroIcon className="h-4 w-4" />
                                {isManageExperience ? (division === 'HT' ? 'Training Hub HT' : 'Edaran & Materi HC') : 'Kotak Masuk Internal'}
                            </div>
                            <div>
                                <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)] md:text-3xl">
                                    {title}
                                </h1>
                                <p className="mt-2 max-w-3xl text-sm text-[var(--text-secondary)] md:text-base">
                                    {description}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <Button variant="outline" onClick={load} disabled={busy}>
                                <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                            {canManage && isManageExperience && (
                                <Button onClick={() => setComposerOpen((current) => !current)}>
                                    <Plus className="h-4 w-4" />
                                    {composerOpen ? 'Tutup Form' : createLabel}
                                </Button>
                            )}
                        </div>
                    </div>
                </GlassCard>

                {showOfflineTips && (
                    <GlassCard className="bg-gradient-to-br from-sky-50 via-white to-emerald-50">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div className="space-y-2">
                                <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-700">Offline Ready</p>
                                <h2 className="text-xl font-black text-[var(--text-primary)]">Pakai seperti aplikasi HP</h2>
                                <p className="max-w-3xl text-sm text-[var(--text-secondary)]">
                                    OneKlik sudah punya PWA dan service worker. Buka materi yang diperlukan saat online, lalu file dan halaman yang sudah pernah dibuka akan lebih mudah diakses kembali saat koneksi putus.
                                </p>
                            </div>
                            <div className="rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm text-[var(--text-secondary)]">
                                <div className="flex items-center gap-2 font-bold text-sky-700">
                                    <WifiOff className="h-4 w-4" />
                                    Offline dasar aktif
                                </div>
                                <p className="mt-2 max-w-sm">
                                    Simpan shortcut ke home screen dan buka training atau dokumen penting minimal sekali sebelum bepergian.
                                </p>
                            </div>
                        </div>
                    </GlassCard>
                )}

                {isManageExperience ? (
                    <div className="grid gap-4 md:grid-cols-3">
                        {documentsByCategory.map((section) => {
                            const tone = getCategoryTone(section.value);

                            return (
                                <GlassCard key={section.value} className={tone.sectionClass}>
                                    <p className={`text-xs font-bold uppercase tracking-[0.22em] ${tone.labelClass}`}>
                                        {section.label}
                                    </p>
                                    <p className="mt-3 text-3xl font-black text-[var(--text-primary)]">{section.documents.length}</p>
                                </GlassCard>
                            );
                        })}
                    </div>
                ) : (
                    <GlassCard className="bg-gradient-to-br from-emerald-50 via-white to-white">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-2">
                                <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">Dokumen Relevan</p>
                                <h2 className="text-xl font-black text-[var(--text-primary)]">Yang paling penting untuk Anda tampil lebih dulu</h2>
                                <p className="max-w-3xl text-sm text-[var(--text-secondary)]">
                                    Edaran, handbook, materi training, dan materi meeting yang ditujukan ke cabang atau role Anda akan muncul di halaman ini setelah login.
                                </p>
                            </div>
                            <div className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm text-[var(--text-secondary)]">
                                <p className="font-bold text-emerald-700">{documents.length} dokumen tersedia</p>
                                <p className="mt-1">{relevantMaterialsCount} materi sosialisasi atau meeting siap dibuka.</p>
                            </div>
                        </div>
                    </GlassCard>
                )}

                {!isManageExperience && (
                    <GlassCard>
                        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-600">Terbaru</p>
                                <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">Dokumen terbaru untuk Anda</h2>
                                <p className="mt-2 max-w-3xl text-sm text-[var(--text-secondary)]">
                                    Fokus utama ada di dokumen yang baru dibagikan dan paling relevan untuk role atau cabang Anda.
                                </p>
                            </div>
                            <div className="rounded-2xl border border-[var(--surface-4)] bg-white px-4 py-3 text-sm text-[var(--text-secondary)]">
                                Akses tetap internal dan hanya tersedia setelah login.
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {featuredDocuments.map((document) => {
                                const category = categories.find((item) => item.value === document.category);

                                return (
                                    <DocumentCard
                                        key={document.id}
                                        document={document}
                                        categoryLabel={category?.label || document.category}
                                        canManage={canManage}
                                        experience={experience}
                                        onEdit={startEdit}
                                        onRemove={removeDocument}
                                        resolveRoleLabels={resolveRoleLabels}
                                        resolveStationLabels={resolveStationLabels}
                                    />
                                );
                            })}
                            {featuredDocuments.length === 0 && (
                                <div className="rounded-2xl border border-dashed border-[var(--surface-4)] px-4 py-8 text-center text-sm text-[var(--text-secondary)] md:col-span-2 xl:col-span-3">
                                    Belum ada dokumen yang dibagikan ke audience Anda.
                                </div>
                            )}
                        </div>
                    </GlassCard>
                )}

                {composerOpen && canManage && isManageExperience && (
                    <GlassCard className="bg-gradient-to-br from-white via-sky-50/40 to-white">
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-700">{editing ? 'Edit Dokumen' : 'Dokumen Baru'}</p>
                                <h2 className="mt-1 text-xl font-black text-[var(--text-primary)]">
                                    {editing ? editing.title : createTitle}
                                </h2>
                            </div>
                            <Button variant="ghost" onClick={resetForm}>
                                Reset
                            </Button>
                        </div>

                        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <select
                                value={form.category}
                                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as DivisionDocumentCategory }))}
                                className="rounded-xl border border-[var(--surface-4)] bg-white px-3 py-3 text-sm"
                            >
                                {categories.map((category) => (
                                    <option key={category.value} value={category.value}>
                                        {category.label}
                                    </option>
                                ))}
                            </select>
                            <input
                                value={form.title}
                                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                                placeholder="Judul dokumen"
                                className="rounded-xl border border-[var(--surface-4)] bg-white px-3 py-3 text-sm md:col-span-1 xl:col-span-2"
                                required
                            />
                            <textarea
                                value={form.description}
                                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                                placeholder="Deskripsi singkat"
                                rows={3}
                                className="rounded-xl border border-[var(--surface-4)] bg-white px-3 py-3 text-sm md:col-span-2 xl:col-span-3"
                            />
                            <input
                                value={form.meeting_title}
                                onChange={(event) => setForm((current) => ({ ...current, meeting_title: event.target.value }))}
                                placeholder="Judul meeting / sosialisasi (opsional)"
                                className="rounded-xl border border-[var(--surface-4)] bg-white px-3 py-3 text-sm"
                            />
                            <input
                                type="date"
                                value={form.meeting_date}
                                onChange={(event) => setForm((current) => ({ ...current, meeting_date: event.target.value }))}
                                className="rounded-xl border border-[var(--surface-4)] bg-white px-3 py-3 text-sm"
                            />
                            <input
                                value={form.audience_label}
                                onChange={(event) => setForm((current) => ({ ...current, audience_label: event.target.value }))}
                                placeholder="Label audience, mis. GM Cengkareng + peserta rapat"
                                className="rounded-xl border border-[var(--surface-4)] bg-white px-3 py-3 text-sm"
                            />

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Sumber</label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant={form.source_type === 'upload' ? 'default' : 'outline'}
                                        onClick={() => setForm((current) => ({ ...current, source_type: 'upload' }))}
                                    >
                                        <Upload className="h-4 w-4" />
                                        Upload
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={form.source_type === 'link' ? 'default' : 'outline'}
                                        onClick={() => setForm((current) => ({ ...current, source_type: 'link' }))}
                                    >
                                        <Link2 className="h-4 w-4" />
                                        Link
                                    </Button>
                                </div>
                            </div>

                            {form.source_type === 'upload' ? (
                                <div className="rounded-xl border border-dashed border-[var(--surface-4)] bg-white px-3 py-3 md:col-span-2 xl:col-span-2">
                                    <input
                                        type="file"
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                                        onChange={(event) => setFile(event.target.files?.[0] || null)}
                                        className="w-full text-sm"
                                    />
                                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                                        PDF, Word, Excel, atau PowerPoint. Bila tidak memilih file baru saat edit, file lama tetap dipakai.
                                    </p>
                                </div>
                            ) : (
                                <input
                                    type="url"
                                    value={form.external_url}
                                    onChange={(event) => setForm((current) => ({ ...current, external_url: event.target.value }))}
                                    placeholder="https://..."
                                    className="rounded-xl border border-[var(--surface-4)] bg-white px-3 py-3 text-sm md:col-span-2 xl:col-span-2"
                                />
                            )}

                            <div>
                                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Visibilitas</label>
                                <select
                                    value={form.visibility_scope}
                                    onChange={(event) => setForm((current) => ({ ...current, visibility_scope: event.target.value as DivisionDocumentVisibilityScope }))}
                                    className="w-full rounded-xl border border-[var(--surface-4)] bg-white px-3 py-3 text-sm"
                                >
                                    <option value="all">Semua user yang punya akses halaman ini</option>
                                    <option value="stations">Cabang tertentu</option>
                                    <option value="roles">Role tertentu</option>
                                    <option value="targeted">Cabang + role / peserta tertentu</option>
                                </select>
                                <p className="mt-2 text-xs text-[var(--text-muted)]">
                                    Gunakan mode terakhir bila materi hanya boleh tampil ke role tertentu di cabang tertentu.
                                </p>
                            </div>

                            {['stations', 'targeted'].includes(form.visibility_scope) && (
                                <div className="rounded-xl border border-[var(--surface-4)] bg-white p-4 md:col-span-2 xl:col-span-3">
                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Target Cabang</p>
                                    <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                                        {stations.map((station) => (
                                            <label key={station.id} className="flex items-center gap-2 rounded-xl border border-[var(--surface-4)] px-3 py-2 text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={form.audience_station_ids.includes(station.id)}
                                                    onChange={() => toggleStation(station.id)}
                                                />
                                                <span>{station.code} - {station.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {['roles', 'targeted'].includes(form.visibility_scope) && (
                                <div className="rounded-xl border border-[var(--surface-4)] bg-white p-4 md:col-span-2 xl:col-span-3">
                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Target Role</p>
                                    <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                                        {ROLE_OPTIONS.map((role) => (
                                            <label key={role.value} className="flex items-center gap-2 rounded-xl border border-[var(--surface-4)] px-3 py-2 text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={form.audience_roles.includes(role.value)}
                                                    onChange={() => toggleRole(role.value)}
                                                />
                                                <span>{role.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-3 md:col-span-2 xl:col-span-3">
                                <Button type="submit" disabled={busy}>
                                    {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                                    {editing ? 'Simpan Perubahan' : 'Simpan Dokumen'}
                                </Button>
                                <Button type="button" variant="outline" onClick={resetForm}>
                                    Batal
                                </Button>
                            </div>
                        </form>
                    </GlassCard>
                )}

                {visibleSections.map((section) => {
                    const tone = getCategoryTone(section.value);

                    return (
                        <GlassCard key={section.value} className={isManageExperience ? tone.sectionClass : 'bg-white'}>
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                <div>
                                    {!isManageExperience && (
                                        <p className={`text-xs font-bold uppercase tracking-[0.22em] ${tone.labelClass}`}>
                                            Inbox Dokumen
                                        </p>
                                    )}
                                    <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">{section.label}</h2>
                                    {section.description ? (
                                        <p className="mt-2 max-w-3xl text-sm text-[var(--text-secondary)]">{section.description}</p>
                                    ) : null}
                                </div>
                                <div className={`rounded-2xl border bg-white px-4 py-3 text-sm ${tone.borderClass} text-[var(--text-secondary)]`}>
                                    <div className={`flex items-center gap-2 font-bold ${tone.labelClass}`}>
                                        {section.value === 'MATERI_SOSIALISASI' ? (
                                            <FileStack className="h-4 w-4" />
                                        ) : section.value === 'TRAINING_MATERIAL' ? (
                                            <GraduationCap className="h-4 w-4" />
                                        ) : (
                                            <BookOpen className="h-4 w-4" />
                                        )}
                                        {section.documents.length} dokumen
                                    </div>
                                </div>
                            </div>

                            {section.documents.length > 0 ? (
                                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    {section.documents.map((document) => (
                                        <DocumentCard
                                            key={document.id}
                                            document={document}
                                            categoryLabel={section.label}
                                            canManage={canManage}
                                            experience={experience}
                                            onEdit={startEdit}
                                            onRemove={removeDocument}
                                            resolveRoleLabels={resolveRoleLabels}
                                            resolveStationLabels={resolveStationLabels}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="mt-5 rounded-2xl border border-dashed border-[var(--surface-4)] px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
                                    {isManageExperience ? 'Belum ada dokumen.' : 'Belum ada dokumen.'}
                                </div>
                            )}
                        </GlassCard>
                    );
                })}

                {visibleSections.length === 0 && (
                    <GlassCard className="text-center">
                        <BookOpen className="mx-auto h-10 w-10 text-sky-400" />
                        <p className="mt-4 text-lg font-bold text-[var(--text-primary)]">Belum ada dokumen</p>
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">
                            Dokumen handbook, edaran, materi training, dan materi sosialisasi yang sesuai role atau cabang akan tampil di sini.
                        </p>
                    </GlassCard>
                )}
            </div>
        </div>
    );
}
