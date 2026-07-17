'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  fmtNumber, momentumLabel, momentumTone, riskEntityName, severityLabel,
} from '@/components/ai/ml-overview-sections';
import type { RiskScoreResult } from '@/lib/ml-client';
import { CAPTION, EmptyNote, InlineNote, Section, SegmentedControl, SeverityChip } from './primitives';

const RISK_TABS = [
  { key: 'airline', label: 'Maskapai' },
  { key: 'branch', label: 'Stasiun' },
  { key: 'area', label: 'Area' },
  { key: 'category', label: 'Kategori' },
  { key: 'subcategory', label: 'Kategori Area' },
  { key: 'case_classification', label: 'Klasifikasi Kasus' },
] as const;
type RiskTabKey = (typeof RISK_TABS)[number]['key'];

export function RiskLeaderboardCard({ risk }: { risk: RiskScoreResult }) {
  const tabs = useMemo(() => RISK_TABS.filter((t) => (risk.rankings?.[t.key]?.length ?? 0) > 0), [risk]);
  const [tab, setTab] = useState<RiskTabKey>('airline');
  const active: RiskTabKey = tabs.some((t) => t.key === tab) ? tab : (tabs[0]?.key ?? 'airline');
  const entries = (risk.rankings?.[active] ?? []).slice(0, 8);
  const showSeverity = entries.some((e) => typeof e.severity === 'number');

  return (
    <Section
      title="Papan Prioritas · Risk Leaderboard"
      right={tabs.length > 0 ? <SegmentedControl<RiskTabKey> options={tabs} active={active} onChange={setTab} /> : undefined}
    >
      {entries.length === 0 ? (
        <EmptyNote>Belum ada data peringkat.</EmptyNote>
      ) : (
        <ul className="divide-y divide-slate-100">
          {entries.map((entry, idx) => {
            const sev = typeof entry.severity === 'number' ? entry.severity : null;
            const mom = typeof entry.momentum === 'number' ? entry.momentum : null;
            return (
              <li key={riskEntityName(entry)} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums',
                      idx === 0 ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-700',
                    )}
                  >
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold text-slate-900">{riskEntityName(entry)}</p>
                    <p className={cn(CAPTION, 'mt-0.5')}>
                      {fmtNumber(entry.incident_count)} laporan
                      {typeof entry.recent_30d === 'number' ? ` · ${entry.recent_30d} dalam 30 hari` : ''}
                      {mom != null ? ` · ${momentumLabel(mom)}` : ''}
                    </p>
                  </div>
                </div>
                {showSeverity && sev != null && <SeverityChip label={severityLabel(sev)} score={sev} />}
                {mom != null && !showSeverity && (
                  <span className={cn('shrink-0 text-[11.5px] font-bold', momentumTone(mom))}>{momentumLabel(mom)}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <InlineNote>
        Total laporan menghitung seluruh laporan sejak awal pencatatan; &quot;30 hari terakhir&quot; adalah aktivitas terkini.
      </InlineNote>
    </Section>
  );
}
