'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { CAPTION, Section } from './primitives';

type PresentedClassification = {
  label: string | null;
  confidence: number | null;
  levelLabel: string;
  uncertain: boolean;
};

type AnalyzeResponse = {
  classifications: {
    category: PresentedClassification;
    subcategory: PresentedClassification;
    root_cause: PresentedClassification;
  };
  forecast: { totalNext14: number } | null;
};

const EXAMPLES = [
  { label: 'Contoh: Bagasi tertinggal', text: 'Bagasi penumpang tertinggal di CGK pada penerbangan China Southern, tidak ikut terbang bersama penumpang.' },
  { label: 'Contoh: Keterlambatan boarding', text: 'Proses boarding terlambat 45 menit di gate karena antrian panjang dan kurangnya petugas check-in.' },
];

function ConfidenceTile({ title, result }: { title: string; result: PresentedClassification }) {
  const pct = result.confidence != null ? Math.round(result.confidence * 100) : 0;
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-[12px] font-bold text-slate-900">
        {title}: {result.uncertain ? 'Belum yakin' : result.label}
      </p>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-emerald-600" style={{ width: `${pct}%` }} />
      </div>
      <p className={cn(CAPTION, 'mt-1 text-[11px]')}>{result.levelLabel}</p>
    </div>
  );
}

export function AnalyzePlayground() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  const submit = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || `Analisis gagal (${res.status})`);
      setResult(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analisis gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Section title="Analisis Teks AI">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Tempel narasi laporan di sini…"
        className="min-h-[64px] w-full rounded-lg border border-slate-300 p-2.5 text-[12.5px] text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.label}
            type="button"
            onClick={() => setText(ex.text)}
            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[10.5px] font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-900"
          >
            {ex.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => submit(text)}
        disabled={loading || !text.trim()}
        className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-[12px] font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? 'Menganalisis…' : 'Analisis →'}
      </button>

      {error && <p className="mt-3 text-[12px] font-medium text-rose-600">{error}</p>}

      {result && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <ConfidenceTile title="Kategori" result={result.classifications.category} />
            <ConfidenceTile title="Subkategori" result={result.classifications.subcategory} />
            <ConfidenceTile title="Akar masalah" result={result.classifications.root_cause} />
          </div>
          {result.forecast && (
            <p className={CAPTION}>
              Konteks jaringan: sekitar <b className="text-slate-900">{result.forecast.totalNext14}</b> laporan sejenis diperkirakan dalam 14 hari ke depan di seluruh stasiun.
            </p>
          )}
        </div>
      )}
    </Section>
  );
}
