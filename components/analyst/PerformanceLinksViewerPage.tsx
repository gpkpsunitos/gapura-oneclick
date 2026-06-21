'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, ExternalLink, Loader2, QrCode, RefreshCw, Search } from 'lucide-react';
import { QRCodeWithLogo } from '@/components/ui/QRCodeWithLogo';
import type { PerformanceLink } from '@/types';

function formatDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export function PerformanceLinksViewerPage() {
    const [links, setLinks] = useState<PerformanceLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
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
                            <h1 className="text-2xl font-bold tracking-tight text-slate-950">Links</h1>
                            <p className="mt-1 max-w-2xl text-sm text-slate-500">
                                Scan a QR code, copy, or open any link managed by the analyst team.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => void load()}
                            disabled={loading}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                            aria-label="Refresh"
                        >
                            <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
                        </button>
                    </div>
                </header>

                {error ? (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
                ) : null}

                <div className="mt-5 relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search title or URL"
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-blue-500"
                    />
                </div>

                {loading ? (
                    <div className="mt-5 flex min-h-80 items-center justify-center rounded-2xl border border-slate-200 bg-white">
                        <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
                    </div>
                ) : filteredLinks.length === 0 ? (
                    <div className="mt-5 flex min-h-80 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-center">
                        <QrCode className="h-10 w-10 text-slate-300" />
                        <h2 className="mt-4 text-base font-semibold text-slate-800">No links found</h2>
                        <p className="mt-1 text-sm text-slate-500">The analyst team hasn&apos;t published any links yet.</p>
                    </div>
                ) : (
                    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredLinks.map((link) => (
                            <article key={link.id} className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
                                <QRCodeWithLogo value={link.url} size={160} />
                                <h2 className="mt-4 text-sm font-semibold text-slate-900">{link.title}</h2>
                                {link.description ? <p className="mt-1 text-xs text-slate-500">{link.description}</p> : null}
                                <p className="mt-2 break-all text-xs text-slate-400">{link.url}</p>
                                <p className="mt-1 text-[11px] text-slate-400">Added {formatDate(link.created_at)}</p>
                                <div className="mt-4 flex w-full gap-2">
                                    <button
                                        type="button"
                                        onClick={() => void copyLink(link)}
                                        className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                        <Copy className="h-3.5 w-3.5" />
                                        {copiedId === link.id ? 'Copied' : 'Copy'}
                                    </button>
                                    <a
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        Open
                                    </a>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
