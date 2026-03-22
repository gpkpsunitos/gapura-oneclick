'use client';

import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type ReportRow = {
  id: string;
  reporter_name?: string;
  reporter_email?: string;
  category?: string;
  main_category?: string;
  irregularity_complain_category?: string;
  case_classification?: string;
  report?: string;
  description?: string;
  created_at?: string;
  date_of_event?: string;
  source_sheet?: string;
  status?: string;
  severity?: string;
  branch?: string;
  title?: string;
  target_division?: string;
};

function normalizeCategory(report: ReportRow): 'Accidents / Incidents' | 'Irregularity Report' | 'Complaint' | 'Compliment' | 'Other' {
  const fields = [
    report.case_classification,
    report.main_category,
    report.category,
    report.irregularity_complain_category,
    report.description,
    report.report,
  ]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase())
    .join(' | ');

  if (/accident|incident|insiden|kecelakaan/.test(fields)) return 'Accidents / Incidents';
  if (/irregular/i.test(fields)) return 'Irregularity Report';
  if (/compliment|apresiasi|appreciation/.test(fields)) return 'Compliment';
  if (/complain|keluhan|komplain/.test(fields)) return 'Complaint';
  return 'Other';
}

function classifySource(report: ReportRow): 'Customer' | 'Internal' {
  // Use category as primary signal for source since sheets often lack reporter emails
  const cat = normalizeCategory(report);
  if (cat === 'Irregularity Report' || cat === 'Accidents / Incidents') {
    return 'Internal';
  }
  if (cat === 'Complaint' || cat === 'Compliment') {
    return 'Customer';
  }
  // Fallback heuristic: email/domain or explicit org mention
  const email = (report.reporter_email || '').toLowerCase();
  const name = (report.reporter_name || '').toLowerCase();
  if (email.includes('@gapura') || email.includes('@appsdev') || email.includes('@sis') || name.includes('gapura')) {
    return 'Internal';
  }
  return 'Customer';
}

export default function OTComplaintByCategory() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reports, setReports] = useState<ReportRow[]>([]);

  const CATEGORIES = ['Accidents / Incidents', 'Irregularity Report', 'Complaint', 'Compliment', 'Other'] as const;
  const [selectedCategory, setSelectedCategory] = useState<typeof CATEGORIES[number]>('Complaint');

  const fetchReports = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/reports?unfiltered=1&esklasi_regex=OT');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `Gagal memuat data (${res.status})`);
      const onlyOT = Array.isArray(json) ? json.filter((r: any) => String(r?.target_division || '').trim() === 'OT') : [];
      setReports(onlyOT);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const sourceStats = useMemo(() => {
    const base = { Customer: 0, Internal: 0 } as Record<'Customer' | 'Internal', number>;
    for (const r of reports) {
      base[classifySource(r)]++;
    }
    return base;
  }, [reports]);

  const categoryStats = useMemo(() => {
    const cats = ['Accidents / Incidents', 'Irregularity Report', 'Complaint', 'Compliment', 'Other'] as const;
    const base: Record<typeof cats[number], number> = {
      'Accidents / Incidents': 0,
      'Irregularity Report': 0,
      Complaint: 0,
      Compliment: 0,
      Other: 0,
    };
    for (const r of reports) {
      base[normalizeCategory(r)]++;
    }
    return { cats, base };
  }, [reports]);

  const byCategory = useMemo(() => {
    const map: Record<typeof CATEGORIES[number], ReportRow[]> = {
      'Accidents / Incidents': [],
      'Irregularity Report': [],
      'Complaint': [],
      'Compliment': [],
      'Other': [],
    };
    for (const r of reports) {
      const cat = normalizeCategory(r);
      map[cat].push(r);
    }
    return map;
  }, [reports]);

  return (
    <div className="min-h-screen px-4 md:px-6 py-6">
      <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-emerald-600" />
            <h1 className="text-lg font-bold text-gray-800">Complaint per Category · Divisi OT</h1>
          </div>
          <button
            onClick={fetchReports}
            disabled={loading}
            className={cn('inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border', 'border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50')}
            aria-label="Muat ulang data"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Muat Ulang
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">Lihat ringkasan “Sumber Laporan” dan “Kategori Laporan”.</p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Insight: Sumber Laporan */}
        <div className="p-4 rounded-2xl border border-gray-200 bg-white mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-gray-800">Sumber Laporan</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(['Customer', 'Internal'] as const).map((s) => (
              <div key={s} className="p-4 rounded-xl border border-gray-200 bg-[var(--surface-1)]">
                <p className="text-xs text-gray-600">{s}</p>
                <p className="text-2xl font-extrabold text-gray-800">{sourceStats[s]}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Insight: Kategori Laporan */}
        <div className="p-4 rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-gray-800">Kategori Laporan</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {categoryStats.cats.map((c) => (
              <div key={c} className="p-4 rounded-xl border border-gray-200 bg-[var(--surface-1)]">
                <p className="text-xs text-gray-600">{c}</p>
                <p className="text-2xl font-extrabold text-gray-800">{categoryStats.base[c]}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 mt-6 rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-gray-800">Daftar Laporan per Kategori</h2>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-full border',
                  selectedCategory === c
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                )}
                aria-pressed={selectedCategory === c}
              >
                {c} <span className="ml-1 text-[10px] opacity-80">({byCategory[c]?.length || 0})</span>
              </button>
            ))}
          </div>
          <div className="rounded-xl border border-gray-200 bg-[var(--surface-1)] p-2">
            <div className="max-h-96 overflow-auto divide-y divide-gray-200">
              {byCategory[selectedCategory]?.slice(0, 100).map((r) => {
                const title = r.title || r.report || r.description || '(Tanpa Judul)';
                const dateStr = r.date_of_event ? new Date(r.date_of_event).toLocaleDateString() : '';
                return (
                  <div key={r.id} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{title}</p>
                      <p className="text-xs text-gray-500">
                        {selectedCategory} • {r.source_sheet || '-'} {dateStr ? `• ${dateStr}` : ''}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/ot/reports/${r.id}`}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                    >
                      Lihat Detail
                    </Link>
                  </div>
                );
              })}
              {byCategory[selectedCategory]?.length === 0 && (
                <div className="p-6 text-center text-sm text-gray-500">Tidak ada laporan pada kategori ini</div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
