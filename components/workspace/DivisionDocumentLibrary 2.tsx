'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    BookOpen,
    ExternalLink,
    FileDown,
    FileStack,
    GraduationCap,
    Link2,
    Plus,
    RefreshCw,
    ShieldCheck,
    Trash2,
    Upload,
    WifiOff,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/hooks/use-auth';
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

    const normalizedRole = String(user?.role || '').trim().toUpperCase();
    const canManage = forceManage || ['SUPER_ADMIN', 'ANALYST', `DIVISI_${division}`, `PARTNER_${division}`].includes(normalizedRole);
    const isManageExperience = experience === 'manage';
    const createLabel = division === 'HC' ? 'Tambah Edaran / Materi' : 'Tambah Materi Training';
    const createTitle = division === 'HC' ? 'Tambah Edaran atau Materi HC' : 'Tambah Materi HT';
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
        setForm((current) => ({
            ...current,
            category: categories[0]?.value || current.category,
        }));
    }, [categories]);

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
