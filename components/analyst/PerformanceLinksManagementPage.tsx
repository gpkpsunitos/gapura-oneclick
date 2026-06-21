'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, ExternalLink, Loader2, MoreHorizontal, Plus, QrCode, RefreshCw, Search, X } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { QRCodeWithLogo } from '@/components/ui/QRCodeWithLogo';
import { cn } from '@/lib/utils';
import type { PerformanceLink } from '@/types';

interface FormState {
    title: string;
    url: string;
    description: string;
}

function initialForm(): FormState {
    return { title: '', url: '', description: '' };
}

function formatDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export function PerformanceLinksManagementPage() {
    const [links, setLinks] = useState<PerformanceLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [composerOpen, setComposerOpen] = useState(false);
    const [editing, setEditing] = useState<PerformanceLink | null>(null);
    const [form, setForm] = useState<FormState>(initialForm());
    const [qrLink, setQrLink] = useState<PerformanceLink | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/performance-links', { cache: 'no-store' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Unable to load links');
            setLinks(Array.isArray(data) ? data : []);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unable to load links');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const filteredLinks = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return links;
        return links.filter((l) => [l.title, l.url, l.description].filter(Boolean).join(' ').toLowerCase().includes(query));
    }, [links, search]);

    const openCreate = useCallback(() => {
        setEditing(null);
        setForm(initialForm());
        setComposerOpen(true);
    }, []);

    const openEdit = useCallback((link: PerformanceLink) => {
        setEditing(link);
        setForm({ title: link.title, url: link.url, description: link.description || '' });
        setComposerOpen(true);
    }, []);

    const closeComposer = useCallback(() => {
        setComposerOpen(false);
        setEditing(null);
        setForm(initialForm());
    }, []);

    const submit = useCallback(async (event: React.FormEvent) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        try {
            const body = {
                title: form.title.trim(),
                url: form.url.trim(),
                description: form.description.trim() || null,
            };
            const res = await fetch(
                editing ? `/api/performance-links/${editing.id}` : '/api/performance-links',
                { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
            );
            const result = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(result.error || 'Unable to save link');
            closeComposer();
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unable to save link');
        } finally {
            setSaving(false);
        }
    }, [closeComposer, editing, form, load]);

    const removeLink = useCallback(async (link: PerformanceLink) => {
        if (!window.confirm(`Remove "${link.title}"?`)) return;
        setSaving(true);
        setError('');
        try {
            const res = await fetch(`/api/performance-links/${link.id}`, { method: 'DELETE' });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(payload.error || 'Unable to remove link');
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unable to remove link');
        } finally {
            setSaving(false);
        }
    }, [load]);

    const copyLink = useCallback(async (link: PerformanceLink) => {
        await navigator.clipboard.writeText(link.url);
        setCopiedId(link.id);
        setTimeout(() => setCopiedId((cur) => (cur === link.id ? null : cur)), 1500);
    }, []);

    return (
        <div className="min-h-screen bg-[#F7F8FA] px-4 py-5 text-slate-900 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
                <header className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-7">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                                <QrCode className="h-4 w-4" />
                                Performance Evaluation Monitoring
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-950">Manage Links</h1>
                            <p className="mt-1 max-w-2xl text-sm text-slate-500">
                                Add external links. A QR code is generated automatically for each one.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => void load()}
                                disabled={loading}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                                aria-label="Refresh"
                            >
                                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                            </button>
                            <button
                                type="button"
                                onClick={openCreate}
                                className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
                            >
                                <Plus className="h-4 w-4" />
                                Add link
                            </button>
                        </div>
                    </div>
                </header>

                {error ? (
                    <div className="mt-4 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        <span>{error}</span>
                        <button type="button" onClick={() => setError('')} aria-label="Dismiss"><X className="h-4 w-4" /></button>
                    </div>
                ) : null}

                <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-3 border-b border-slate-200 p-4">
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search title or URL"
                                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex min-h-80 items-center justify-center">
                            <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
                        </div>
                    ) : filteredLinks.length === 0 ? (
                        <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
                            <QrCode className="h-10 w-10 text-slate-300" />
                            <h2 className="mt-4 text-base font-semibold text-slate-800">No links found</h2>
                            <p className="mt-1 text-sm text-slate-500">Add the first link or adjust the current search.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filteredLinks.map((link) => (
                                <article key={link.id} className="group flex items-center gap-4 px-4 py-4 transition hover:bg-slate-50 sm:px-6">
                                    <button
                                        type="button"
                                        onClick={() => setQrLink(link)}
                                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"
                                        aria-label="Show QR code"
                                    >
                                        <QrCode className="h-5 w-5" />
                                    </button>
                                    <div className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-semibold text-slate-900">{link.title}</span>
                                        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                                            <span className="truncate">{link.url}</span>
                                            <span aria-hidden="true">•</span>
                                            <span>{formatDate(link.created_at)}</span>
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => void copyLink(link)}
                                        className="hidden h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-white sm:inline-flex"
                                    >
                                        <Copy className="h-4 w-4" />
                                        {copiedId === link.id ? 'Copied' : 'Copy'}
                                    </button>
                                    <a
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hidden h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-white sm:inline-flex"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                        Open
                                    </a>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button
                                                type="button"
                                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white hover:text-slate-900"
                                                aria-label="Link actions"
                                            >
                                                <MoreHorizontal className="h-4 w-4" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => openEdit(link)}>Edit</DropdownMenuItem>
                                            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => void removeLink(link)}>
                                                Remove
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {qrLink ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
                        <div className="flex items-start justify-between">
                            <h2 className="text-left text-lg font-bold text-slate-950">{qrLink.title}</h2>
                            <button type="button" onClick={() => setQrLink(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="mt-4 flex justify-center">
                            <QRCodeWithLogo value={qrLink.url} size={220} />
                        </div>
                        <p className="mt-4 break-all text-xs text-slate-500">{qrLink.url}</p>
                        <div className="mt-4 flex gap-2">
                            <button
                                type="button"
                                onClick={() => void copyLink(qrLink)}
                                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                <Copy className="h-4 w-4" />
                                {copiedId === qrLink.id ? 'Copied' : 'Copy link'}
                            </button>
                            <a
                                href={qrLink.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700"
                            >
                                <ExternalLink className="h-4 w-4" />
                                Open
                            </a>
                        </div>
                    </div>
                </div>
            ) : null}

            {composerOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                            <h2 className="text-lg font-bold text-slate-950">{editing ? 'Edit link' : 'Add link'}</h2>
                            <button type="button" onClick={closeComposer} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={submit}>
                            <div className="space-y-5 p-6">
                                <label className="block space-y-2 text-sm font-semibold text-slate-700">
                                    Title
                                    <input
                                        value={form.title}
                                        onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
                                        className="h-10 w-full rounded-lg border border-slate-200 px-3 font-normal outline-none focus:border-blue-500"
                                        required
                                    />
                                </label>
                                <label className="block space-y-2 text-sm font-semibold text-slate-700">
                                    URL
                                    <input
                                        type="url"
                                        value={form.url}
                                        onChange={(e) => setForm((c) => ({ ...c, url: e.target.value }))}
                                        placeholder="https://..."
                                        className="h-10 w-full rounded-lg border border-slate-200 px-3 font-normal outline-none focus:border-blue-500"
                                        required
                                    />
                                </label>
                                <label className="block space-y-2 text-sm font-semibold text-slate-700">
                                    Description (optional)
                                    <textarea
                                        value={form.description}
                                        onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
                                        rows={3}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 font-normal outline-none focus:border-blue-500"
                                    />
                                </label>
                            </div>
                            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4">
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
                                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                    {saving ? 'Saving...' : 'Save link'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
