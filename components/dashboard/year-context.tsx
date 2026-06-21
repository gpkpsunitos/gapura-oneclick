'use client';

import { useMemo, useState, type ReactNode } from 'react';
import type { Report } from '@/types';

function yearOf(r: Report): number | null {
  const raw = r.date_of_event || r.event_date || r.incident_date || r.created_at;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.getUTCFullYear();
}

/**
 * Per-card year scope. Each card calls this with the raw reports it wants
 * to consider; the hook owns a LOCAL year state so toggling one card does
 * not affect any other card. Returns the filtered subset plus a small
 * <toggle/> ReactNode ready to drop into the card's header.
 */
export function useCardYear(reports: Report[]) {
  const availableYears = useMemo(() => {
    const set = new Set<number>();
    reports.forEach((r) => { const y = yearOf(r); if (y) set.add(y); });
    return Array.from(set).sort((a, b) => a - b);
  }, [reports]);
  const latest = availableYears[availableYears.length - 1] ?? new Date().getFullYear();
  const [selected, setSelected] = useState<number | null>(null);
  const year = selected ?? latest;
  const filtered = useMemo(
    () => reports.filter((r) => yearOf(r) === year),
    [reports, year]
  );
  const toggle = <YearToggle availableYears={availableYears} year={year} onChange={setSelected} />;
  return { filtered, year, toggle, availableYears };
}

/** Render-prop wrapper: gives any card local year state + a toggle node. */
export function YearCard({
  reports, children,
}: {
  reports: Report[];
  children: (args: { filtered: Report[]; toggle: ReactNode; year: number }) => ReactNode;
}) {
  const { filtered, toggle, year } = useCardYear(reports);
  return <>{children({ filtered, toggle, year })}</>;
}

function YearToggle({
  availableYears, year, onChange,
}: { availableYears: number[]; year: number; onChange: (y: number) => void }) {
  if (availableYears.length < 2) return null;
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-[color:var(--sr-border)] bg-white p-0.5">
      {availableYears.map((y) => {
        const active = y === year;
        return (
          <button
            key={y}
            type="button"
            onClick={() => onChange(y)}
            aria-pressed={active}
            className={`rounded-full px-2 py-0.5 text-[10px] font-black tabular-nums leading-none transition ${
              active
                ? 'bg-gradient-to-b from-emerald-500 to-emerald-700 text-white shadow-[0_2px_0_#064e3b]'
                : 'text-[color:var(--sr-text-3)] hover:text-[color:var(--sr-text)]'
            }`}
          >
            {y}
          </button>
        );
      })}
    </div>
  );
}
