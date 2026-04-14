'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Eye, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/hooks/use-auth';
import type { DivisionDocument } from '@/types';

interface HCEdaranTableProps {
    mode: 'manage' | 'read';
    title?: string;
    description?: string;
}

interface FormState {
    meeting_date: string;
    title: string;
    meeting_title: string;
    description: string;
    external_url: string;
}

type DocumentPreviewConfig =
    | { kind: 'iframe'; src: string }
    | { kind: 'image'; src: string };

function createInitialForm(): FormState {
    return {
        meeting_date: '',
        title: '',
        meeting_title: '',
        description: '',
        external_url: '',
    };
}

function formatDate(value?: string | null) {
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

function normalizeExternalUrl(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
}

function getDocumentHref(document: DivisionDocument) {
    return normalizeExternalUrl(document.external_url || '');
}

function getDocumentPreviewConfig(document: DivisionDocument): DocumentPreviewConfig | null {
    const href = getDocumentHref(document);
    if (!href) return null;

    const descriptor = `${document.mime_type || ''} ${document.file_name || ''} ${href}`.toLowerCase();
    if (descriptor.includes('pdf')) {
        return { kind: 'iframe', src: href };
    }

    if (/\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(descriptor) || /image\/(png|jpeg|jpg|gif|webp|bmp|svg\+xml)/i.test(descriptor)) {
        return { kind: 'image', src: href };
    }

    if (/\.(doc|docx|xls|xlsx|ppt|pptx)(\?|$)/i.test(descriptor) || /(word|excel|powerpoint|officedocument|msword|ms-excel|ms-powerpoint)/i.test(descriptor)) {
        return {
            kind: 'iframe',
            src: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(href)}`,
        };
    }

    return null;
}

export function HCEdaranTable({
    mode,
    title = 'Edaran HC',
    description = 'Daftar kegiatan dan dokumentasi HC.',
}: HCEdaranTableProps) {
    const { user } = useAuth(false);
    const normalizedRole = String(user?.role || '').trim().toUpperCase();
    const canManage = mode === 'manage' && ['SUPER_ADMIN', 'ANALYST', 'DIVISI_HC', 'PARTNER_HC'].includes(normalizedRole);

    const [documents, setDocuments] = useState<DivisionDocument[]>([]);
    const [busy, setBusy] = useState(false);
    const [composerOpen, setComposerOpen] = useState(false);
    const [editing, setEditing] = useState<DivisionDocument | null>(null);
    const [previewDocument, setPreviewDocument] = useState<DivisionDocument | null>(null);
    const [form, setForm] = useState<FormState>(() => createInitialForm());

    const load = useCallback(async () => {
        setBusy(true);
        try {
            const response = await fetch('/api/division-documents?division=HC&category=EDARAN_DIREKSI', {
                cache: 'no-store',
            });
            if (!response.ok) {
                throw new Error('Gagal memuat edaran HC');
            }
            const data = await response.json();
            setDocuments(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('[HCEdaranTable] Failed to load documents:', error);
        } finally {
            setBusy(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const sortedDocuments = useMemo(() => {
        return [...documents].sort((left, right) => {
            const leftTime = new Date(left.meeting_date || left.created_at).getTime();
            const rightTime = new Date(right.meeting_date || right.created_at).getTime();
            return rightTime - leftTime;
        });
    }, [documents]);

    const resetForm = () => {
        setForm(createInitialForm());
        setEditing(null);
        setComposerOpen(false);
    };

    const startEdit = (document: DivisionDocument) => {
        setEditing(document);
        setForm({
            meeting_date: document.meeting_date || '',
            title: document.title || '',
            meeting_title: document.meeting_title || '',
            description: document.description || '',
            external_url: document.external_url || '',
        });
        setComposerOpen(true);
    };

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        setBusy(true);

        try {
            const payload = {
                division: 'HC',
                category: 'EDARAN_DIREKSI',
                title: form.title.trim(),
                meeting_date: form.meeting_date || null,
                meeting_title: form.meeting_title.trim() || null,
                description: form.description.trim() || null,
                external_url: normalizeExternalUrl(form.external_url),
                source_type: 'link',
                visibility_scope: 'all',
                audience_station_ids: [],
                audience_roles: [],
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
                throw new Error(error.error || 'Gagal menyimpan edaran HC');
            }

            resetForm();
            await load();
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Gagal menyimpan edaran HC');
        } finally {
            setBusy(false);
        }
    };

    const previewConfig = previewDocument ? getDocumentPreviewConfig(previewDocument) : null;
    const previewHref = previewDocument ? getDocumentHref(previewDocument) : '';

    const removeDocument = async (document: DivisionDocument) => {
        if (!confirm(`Hapus edaran "${document.title}"?`)) return;

        setBusy(true);
        try {
            const response = await fetch(`/api/division-documents/${document.id}`, { method: 'DELETE' });
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error || 'Gagal menghapus edaran HC');
            }

            await load();
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Gagal menghapus edaran HC');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="min-h-screen p-4 md:p-6">
            <div className="mx-auto max-w-7xl space-y-6">
                <GlassCard className="overflow-hidden">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)] md:text-3xl">
                                {title}
                            </h1>
                            <p className="mt-2 text-sm text-[var(--text-secondary)] md:text-base">
                                {description}
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <Button variant="outline" onClick={load} disabled={busy}>
                                <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                            {canManage ? (
                                <Button onClick={() => setComposerOpen((current) => !current)}>
                                    <Plus className="h-4 w-4" />
                                    {composerOpen ? 'Tutup Form' : 'Tambah Edaran'}
                                </Button>
                            ) : null}
                        </div>
                    </div>
                </GlassCard>

                {composerOpen && canManage ? (
                    <GlassCard>
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-700">
                                    {editing ? 'Edit Edaran' : 'Edaran Baru'}
                                </p>
                                <h2 className="mt-1 text-xl font-black text-[var(--text-primary)]">
                                    {editing ? editing.title : 'Tambah Edaran HC'}
                                </h2>
                            </div>
                            <Button variant="ghost" onClick={resetForm}>
                                <X className="h-4 w-4" />
                                Tutup
                            </Button>
                        </div>

                        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                            <input
                                type="date"
                                value={form.meeting_date}
                                onChange={(event) => setForm((current) => ({ ...current, meeting_date: event.target.value }))}
                                className="rounded-xl border border-[var(--surface-4)] bg-white px-3 py-3 text-sm"
                                required
                            />
                            <input
                                value={form.title}
                                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                                placeholder="Nama kegiatan"
                                className="rounded-xl border border-[var(--surface-4)] bg-white px-3 py-3 text-sm xl:col-span-2"
                                required
                            />
                            <input
                                value={form.meeting_title}
                                onChange={(event) => setForm((current) => ({ ...current, meeting_title: event.target.value }))}
                                placeholder="PIC"
                                className="rounded-xl border border-[var(--surface-4)] bg-white px-3 py-3 text-sm"
                            />
                            <input
                                value={form.description}
                                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                                placeholder="Lokasi"
                                className="rounded-xl border border-[var(--surface-4)] bg-white px-3 py-3 text-sm"
                            />
                            <input
                                type="url"
                                value={form.external_url}
                                onChange={(event) => setForm((current) => ({ ...current, external_url: event.target.value }))}
                                placeholder="Link dokumentasi PDF / Excel / Word / PPT"
                                className="rounded-xl border border-[var(--surface-4)] bg-white px-3 py-3 text-sm md:col-span-2 xl:col-span-4"
                                required
                            />
                            <div className="flex items-center">
                                <Button type="submit" disabled={busy} className="w-full">
                                    {editing ? 'Simpan Perubahan' : 'Simpan Edaran'}
                                </Button>
                            </div>
                        </form>
                    </GlassCard>
                ) : null}

                <GlassCard className="overflow-hidden p-0">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-[var(--surface-4)] text-sm">
                            <thead className="bg-[var(--surface-2)]">
                                <tr className="text-left text-[var(--text-secondary)]">
                                    <th className="px-4 py-3 font-semibold">Tanggal Kegiatan</th>
                                    <th className="px-4 py-3 font-semibold">Nama Kegiatan</th>
                                    <th className="px-4 py-3 font-semibold">PIC</th>
                                    <th className="px-4 py-3 font-semibold">Lokasi</th>
                                    <th className="px-4 py-3 font-semibold">Dokumentasi</th>
                                    {canManage ? <th className="px-4 py-3 font-semibold">Aksi</th> : null}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--surface-4)] bg-white">
                                {sortedDocuments.length > 0 ? (
                                    sortedDocuments.map((document) => (
                                        <tr key={document.id} className="align-top">
                                            <td className="px-4 py-3 text-[var(--text-primary)]">
                                                {formatDate(document.meeting_date || document.created_at)}
                                            </td>
                                            <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                                                {document.title || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-[var(--text-primary)]">
                                                {document.meeting_title || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-[var(--text-primary)]">
                                                {document.description || '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {document.external_url ? (
                                                    <div className="flex flex-wrap gap-2">
                                                        {getDocumentPreviewConfig(document) ? (
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => setPreviewDocument(document)}
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                                Preview
                                                            </Button>
                                                        ) : null}
                                                        <a
                                                            href={getDocumentHref(document)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-2 text-sky-700 hover:text-sky-800"
                                                        >
                                                            <ExternalLink className="h-4 w-4" />
                                                            Buka Link
                                                        </a>
                                                    </div>
                                                ) : (
                                                    <span className="text-[var(--text-secondary)]">-</span>
                                                )}
                                            </td>
                                            {canManage ? (
                                                <td className="px-4 py-3">
                                                    <div className="flex gap-2">
                                                        <Button type="button" variant="outline" size="sm" onClick={() => startEdit(document)}>
                                                            <Pencil className="h-4 w-4" />
                                                            Edit
                                                        </Button>
                                                        <Button type="button" variant="outline" size="sm" onClick={() => removeDocument(document)}>
                                                            <Trash2 className="h-4 w-4" />
                                                            Hapus
                                                        </Button>
                                                    </div>
                                                </td>
                                            ) : null}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td
                                            colSpan={canManage ? 6 : 5}
                                            className="px-4 py-10 text-center text-[var(--text-secondary)]"
                                        >
                                            Belum ada data edaran HC.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </GlassCard>

                {previewDocument ? (
                    <GlassCard className="overflow-hidden">
                        <div className="flex items-start justify-between gap-4 border-b border-[var(--surface-4)] px-5 py-4">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-700">Preview Dokumentasi</p>
                                <h2 className="mt-1 text-lg font-black text-[var(--text-primary)]">
                                    {previewDocument.title}
                                </h2>
                                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                                    {formatDate(previewDocument.meeting_date || previewDocument.created_at)}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <a
                                    href={previewHref}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex h-10 items-center gap-2 rounded-md bg-[#009688] px-4 text-sm font-medium text-white transition-colors hover:bg-[#00796B]"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                    Buka Link Asli
                                </a>
                                <Button type="button" variant="ghost" onClick={() => setPreviewDocument(null)}>
                                    <X className="h-4 w-4" />
                                    Tutup
                                </Button>
                            </div>
                        </div>

                        <div className="bg-[var(--surface-2)] p-4">
                            {previewConfig ? (
                                previewConfig.kind === 'image' ? (
                                    <div className="flex min-h-[480px] items-center justify-center overflow-auto rounded-xl bg-white p-4">
                                        <img
                                            src={previewConfig.src}
                                            alt={previewDocument.title}
                                            className="h-auto max-h-[70vh] w-auto max-w-full rounded-lg object-contain"
                                        />
                                    </div>
                                ) : (
                                    <iframe
                                        src={previewConfig.src}
                                        title={previewDocument.title}
                                        className="h-[70vh] w-full rounded-xl border border-[var(--surface-4)] bg-white"
                                    />
                                )
                            ) : (
                                <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-[var(--surface-4)] bg-white px-6 text-center">
                                    <div>
                                        <p className="text-base font-semibold text-[var(--text-primary)]">Preview belum tersedia untuk link ini</p>
                                        <p className="mt-2 text-sm text-[var(--text-secondary)]">
                                            Gunakan tombol "Buka Link" untuk membuka dokumentasi secara langsung.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </GlassCard>
                ) : null}
            </div>
        </div>
    );
}
