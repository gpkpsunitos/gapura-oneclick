'use client';

import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/hooks/use-auth';
import { Search, Plus, Trash2, Pencil, ExternalLink, X, Loader2, ArrowUpDown, FileSpreadsheet, Download } from 'lucide-react';

type Tab = 'reminder' | 'joumpa' | 'joumpa_uplifting' | 'rca';
type FieldType = 'date' | 'text' | 'multiline' | 'url' | 'select';

interface Col {
  key: string;
  label: string;
  type: FieldType;
}

interface OcsRecord {
  id: string;
  tab: Tab;
  [key: string]: string | null | undefined;
}

const TABS: { id: Tab; label: string; display?: React.ReactNode; cols: Col[] }[] = [
  {
    id: 'reminder',
    label: 'Reminder Series',
    cols: [
      { key: 'event_date', label: 'Date', type: 'date' },
      { key: 'agenda', label: 'Agenda', type: 'multiline' },
      { key: 'series', label: 'Series', type: 'text' },
      { key: 'location', label: 'Location', type: 'text' },
      { key: 'pic', label: 'PIC / Division', type: 'text' },
      { key: 'branch', label: 'Branch', type: 'select' },
      { key: 'participants', label: 'Participants', type: 'multiline' },
      { key: 'case_report', label: 'Case Report', type: 'multiline' },
      { key: 'report_url', label: 'Report', type: 'url' },
      { key: 'materi_url', label: 'Materials', type: 'url' },
      { key: 'attendance_url', label: 'Attendance', type: 'url' },
      { key: 'record_url', label: 'Recording', type: 'url' },
    ],
  },
  {
    id: 'joumpa',
    label: 'Joumpa Evaluation',
    display: (<><span className="block">Joumpa Evaluation</span><span className="block">Performance Assessment Monitoring</span></>),
    cols: [
      { key: 'event_date', label: 'Assessment Date', type: 'date' },
      { key: 'agenda', label: 'Agenda', type: 'multiline' },
      { key: 'series', label: 'Session', type: 'text' },
      { key: 'location', label: 'Location', type: 'text' },
      { key: 'pic', label: 'PIC / Division', type: 'text' },
      { key: 'branch', label: 'Branch', type: 'select' },
      { key: 'participants', label: 'Participants', type: 'multiline' },
      { key: 'report_url', label: 'Report', type: 'url' },
      { key: 'materi_url', label: 'Materials', type: 'url' },
      { key: 'attendance_url', label: 'Attendance', type: 'url' },
      { key: 'record_url', label: 'Recording', type: 'url' },
    ],
  },
  {
    id: 'joumpa_uplifting',
    label: 'Joumpa Service Uplifting',
    cols: [
      { key: 'event_date', label: 'Training Date', type: 'date' },
      { key: 'agenda', label: 'Agenda', type: 'multiline' },
      { key: 'series', label: 'Session', type: 'text' },
      { key: 'location', label: 'Location', type: 'text' },
      { key: 'pic', label: 'PIC / Division', type: 'text' },
      { key: 'branch', label: 'Branch', type: 'select' },
      { key: 'participants', label: 'Participants', type: 'multiline' },
      { key: 'report_url', label: 'Report', type: 'url' },
      { key: 'materi_url', label: 'Materials', type: 'url' },
      { key: 'attendance_url', label: 'Attendance', type: 'url' },
      { key: 'record_url', label: 'Recording', type: 'url' },
    ],
  },
  {
    id: 'rca',
    label: 'Root Cause Analysis (RCA)',
    cols: [
      { key: 'event_date', label: 'Date', type: 'date' },
      { key: 'case_report', label: 'RCA Case Report', type: 'multiline' },
      { key: 'pic', label: 'PIC / Division', type: 'text' },
      { key: 'branch', label: 'Branch', type: 'select' },
      { key: 'airline', label: 'Airlines', type: 'text' },
      { key: 'remarks', label: 'Remarks', type: 'multiline' },
      { key: 'report_url', label: 'Report', type: 'url' },
      { key: 'record_url', label: 'Detail Doc', type: 'url' },
    ],
  },
];

const fetcher = (url: string) => fetch(url).then((r) => r.json());

async function exportToExcel(tab: (typeof TABS)[number], rows: OcsRecord[]) {
  const ExcelJS = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(tab.label);

  ws.columns = tab.cols.map((c) => ({
    header: c.label,
    key: c.key,
    width: c.type === 'multiline' ? 36 : c.type === 'url' ? 20 : 18,
  }));

  // header style
  ws.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  rows.forEach((r) => {
    const row: Record<string, string> = {};
    tab.cols.forEach((c) => { row[c.key] = String(r[c.key] ?? ''); });
    ws.addRow(row);
  });

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${tab.label.replace(/\s+/g, '_')}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function OCSRecordsTabs() {
  const { user } = useAuth(false);
  const canManage = user?.role === 'SUPER_ADMIN' || (user?.role === 'ANALYST' && user?.division === 'OCS');

  const [active, setActive] = useState<Tab>('reminder');
  const tab = TABS.find((t) => t.id === active)!;

  const { data, mutate, isLoading } = useSWR<OcsRecord[]>(`/api/ocs-records?tab=${active}`, fetcher, {
    revalidateOnFocus: false,
  });
  const records = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('event_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<OcsRecord | null>(null);
  const [exporting, setExporting] = useState(false);

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    const filtered = s
      ? records.filter((r) => tab.cols.some((c) => String(r[c.key] ?? '').toLowerCase().includes(s)))
      : records;
    return [...filtered].sort((a, b) => {
      const cmp = String(a[sortKey] ?? '').localeCompare(String(b[sortKey] ?? ''));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [records, search, sortKey, sortDir, tab.cols]);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    await fetch(`/api/ocs-records?id=${id}`, { method: 'DELETE' });
    mutate();
  };

  const handleExport = async () => {
    setExporting(true);
    try { await exportToExcel(tab, rows); }
    finally { setExporting(false); }
  };

  return (
    <div className="space-y-4">
      {/* Tab bar — exact OP style: frosted glass pill + framer-motion 3D active */}
      <div className="flex justify-center sticky top-0 z-40 py-1 sm:py-2">
        <div className="flex p-1 sm:p-1.5 rounded-2xl bg-[oklch(1_0_0_/_0.4)] backdrop-blur-2xl border border-[oklch(1_0_0_/_0.1)] shadow-inner-rim max-w-full overflow-x-auto no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => { setActive(t.id); setSearch(''); setSortKey('event_date'); setSortDir('desc'); }}
              className={cn(
                'px-3 sm:px-6 py-2 sm:py-2.5 rounded-xl text-[9px] sm:text-[11px] font-black uppercase tracking-wider sm:tracking-widest transition-all duration-300 whitespace-nowrap relative flex items-center gap-1 sm:gap-2',
                active === t.id
                  ? 'text-white translate-y-[-1px]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[oklch(1_0_0_/_0.1)]'
              )}
            >
              {active === t.id && (
                <motion.div
                  layoutId="ocsActiveTab"
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: 'linear-gradient(to bottom, #10b981, #047857)',
                    boxShadow: '0 4px 0 #064e3b, 0 6px 16px rgba(4,120,87,0.40), inset 0 1px 0 rgba(255,255,255,0.18)',
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 whitespace-normal text-center leading-tight">{t.display ?? t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Unified table card — toolbar + table in one container */}
      <div className="rounded-2xl border border-[var(--surface-3)] bg-white shadow-sm overflow-hidden">

        {/* Caption bar */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[var(--surface-2)] bg-[var(--surface-0)]/60">
          {/* Export */}
          <button
            onClick={handleExport}
            disabled={exporting || rows.length === 0}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--surface-3)] bg-white text-xs font-semibold text-[var(--text-secondary)] shadow-sm hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 active:scale-[0.97] disabled:opacity-35 disabled:cursor-not-allowed transition-all"
          >
            {exporting ? <Loader2 size={12} className="animate-spin" /> : <FileSpreadsheet size={12} className="text-emerald-600" />}
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Divider */}
          <div className="h-5 w-px bg-[var(--surface-3)]" />

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full h-8 pl-8 pr-3 rounded-lg border border-[var(--surface-3)] bg-white text-xs placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-400 transition-shadow"
            />
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Count */}
          <span className="text-xs tabular-nums text-[var(--text-muted)] font-medium">
            {rows.length} {rows.length === 1 ? 'record' : 'records'}
          </span>

          {/* Add */}
          {canManage && (
            <>
              <div className="h-5 w-px bg-[var(--surface-3)]" />
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 active:scale-[0.97] transition-all shadow-sm"
              >
                <Plus size={13} /> Add
              </button>
            </>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-emerald-100/80" style={{ background: 'linear-gradient(180deg, #f0fdf4 0%, #f7fef9 100%)' }}>
              {tab.cols.map((c) => (
                <th key={c.key} className="px-4 py-3 text-left whitespace-nowrap">
                  <button
                    onClick={() => toggleSort(c.key)}
                    className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700 hover:text-emerald-900 transition-colors"
                  >
                    {c.label}
                    <ArrowUpDown size={10} className={cn('transition-colors', sortKey === c.key ? 'text-emerald-500' : 'text-emerald-300')} />
                  </button>
                </th>
              ))}
              {canManage && <th className="px-4 py-3 w-16" />}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={tab.cols.length + 1} className="px-4 py-16 text-center">
                  <Loader2 className="inline animate-spin text-emerald-500" size={20} />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={tab.cols.length + 1} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-[var(--text-muted)]">
                    <div className="w-10 h-10 rounded-2xl bg-[var(--surface-2)] flex items-center justify-center">
                      <FileSpreadsheet size={18} className="opacity-40" />
                    </div>
                    <p className="text-sm font-medium">No data yet</p>
                    <p className="text-xs opacity-60">Add your first entry for {tab.label}</p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr
                  key={r.id}
                  className={cn(
                    'border-b border-[var(--surface-2)] last:border-0 align-top transition-colors hover:bg-emerald-50/30',
                    i % 2 === 1 && 'bg-[var(--surface-0)]/40'
                  )}
                >
                  {tab.cols.map((c) => (
                    <td key={c.key} className="px-4 py-3 max-w-[240px]">
                      {c.type === 'url' ? (
                        r[c.key] ? (
                          <a
                            href={String(r[c.key])}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                          >
                            Open <ExternalLink size={9} />
                          </a>
                        ) : (
                          <span className="text-[var(--text-muted)] text-xs">—</span>
                        )
                      ) : (
                        <span className="whitespace-pre-wrap break-words text-[var(--text-primary)] text-[13px] leading-relaxed">
                          {r[c.key] || <span className="text-[var(--text-muted)]">—</span>}
                        </span>
                      )}
                    </td>
                  ))}
                  {canManage && (
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => setEditing(r)} className="text-[var(--text-muted)] hover:text-emerald-600 mr-2.5 transition-colors" aria-label="Edit">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(r.id)} className="text-[var(--text-muted)] hover:text-red-500 transition-colors" aria-label="Delete">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>{/* /overflow-x-auto */}
      </div>{/* /unified card */}

      {(showForm || editing) && (
        <RecordForm
          cols={tab.cols}
          record={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); mutate(); }}
          tab={active}
        />
      )}
    </div>
  );
}

function RecordForm({
  cols, tab, record, onClose, onSaved,
}: {
  cols: Col[];
  tab: Tab;
  record?: OcsRecord | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!record;
  const [form, setForm] = useState<Record<string, string>>(() =>
    record ? Object.fromEntries(cols.map((c) => [c.key, String(record[c.key] ?? '')])) : {}
  );
  const [saving, setSaving] = useState(false);
  const { data: stations } = useSWR<{ code: string; name: string }[]>(
    '/api/master-data?type=stations', fetcher, { revalidateOnFocus: false }
  );

  const submit = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/ocs-records', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { id: record!.id, ...form } : { tab, ...form }),
      });
      if (!res.ok) throw new Error('save failed');
      onSaved();
    } catch {
      alert('Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  const textCols = cols.filter((c) => c.type !== 'url');
  const urlCols  = cols.filter((c) => c.type === 'url');

  const inputCls = 'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow';

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{isEdit ? 'Edit Entry' : 'New Entry'}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{cols.filter(c => c.type !== 'url').length} fields · {urlCols.length} links</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Fields */}
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {textCols.map((c) => (
              <div key={c.key} className={c.type === 'multiline' ? 'sm:col-span-2' : ''}>
                <label className="mb-1 block text-[11px] font-medium text-gray-500">{c.label}</label>
                {c.type === 'multiline' ? (
                  <textarea rows={2} value={form[c.key] ?? ''} onChange={(e) => setForm((f) => ({ ...f, [c.key]: e.target.value }))} className={`${inputCls} resize-none`} />
                ) : c.type === 'select' ? (
                  <select
                    value={form[c.key] ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, [c.key]: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="">— Pilih Branch —</option>
                    {stations?.map((s) => (
                      <option key={s.code} value={s.code}>{s.code} — {s.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={c.type === 'date' ? 'date' : 'text'}
                    value={form[c.key] ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, [c.key]: e.target.value }))}
                    className={inputCls}
                  />
                )}
              </div>
            ))}
          </div>

          {urlCols.length > 0 && (
            <>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Links</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {urlCols.map((c) => (
                  <div key={c.key}>
                    <label className="mb-1 block text-[11px] font-medium text-gray-500">
                      {c.label} <span className="text-gray-400 font-normal">(opsional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={form[c.key] ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, [c.key]: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/60 rounded-b-2xl">
          <button onClick={onClose} className="h-9 px-4 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="h-9 inline-flex items-center gap-2 px-5 rounded-lg bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 active:scale-[0.98] transition-all shadow-sm"
          >
            {saving && <Loader2 size={13} className="animate-spin" />}
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
