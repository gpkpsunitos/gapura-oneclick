'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Download, FilePenLine, Plus, RefreshCw, Trash2, Users } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/hooks/use-auth';
import type { HCLeaveLetterStatus, HCLeaveRecord } from '@/types';

type WorkspaceMode = 'hc' | 'branch';

interface StationOption {
    id: string;
    code: string;
    name: string;
}

const LETTER_STATUS_OPTIONS: Array<{ value: HCLeaveLetterStatus; label: string }> = [
    { value: 'BELUM_ADA', label: 'Belum Ada' },
    { value: 'PENGAJUAN', label: 'Pengajuan' },
    { value: 'TERBIT', label: 'Terbit' },
];

function emptyForm(stationId?: string | null) {
    return {
        employee_name: '',
        leave_type: '',
        start_date: '',
        end_date: '',
        station_id: stationId || '',
        division_name: '',
        unit_name: '',
        pic_name: '',
        pic_email: '',
        pic_phone: '',
        e_letter_status: 'BELUM_ADA' as HCLeaveLetterStatus,
        notes: '',
    };
}

export function HCLeaveWorkspace({ mode }: { mode: WorkspaceMode }) {
    const { user, loading } = useAuth(false);
    const [records, setRecords] = useState<HCLeaveRecord[]>([]);
    const [stations, setStations] = useState<StationOption[]>([]);
    const [busy, setBusy] = useState(false);
    const [formOpen, setFormOpen] = useState(mode === 'branch');
    const [editing, setEditing] = useState<HCLeaveRecord | null>(null);
    const [form, setForm] = useState(emptyForm());
    const [filters, setFilters] = useState({
        month: '',
        station_id: '',
        leave_type: '',
        search: '',
    });

    const isHCManager = ['SUPER_ADMIN', 'ANALYST', 'DIVISI_HC'].includes(user?.role || '');
    const isBranchManager = user?.role === 'MANAGER_CABANG';
    const heading = mode === 'hc'
        ? 'Data Cuti / Izin HC'
        : (isBranchManager ? 'Monitoring Cuti Cabang' : 'Ajukan Cuti / Izin');
    const subheading = mode === 'hc'
        ? 'Pantau data cuti cabang secara real time, filter per bulan, dan cek PIC atau PH pengganti tanpa menunggu e-letter resmi.'
        : (isBranchManager
            ? 'Pantau pengajuan cuti atau izin dari cabang Anda. Data yang masuk langsung diteruskan ke HC untuk monitoring.'
            : 'Ajukan cuti atau izin cabang agar langsung diteruskan ke HC dan bisa dimonitor manager, meskipun e-letter resmi belum keluar.');

    const load = useCallback(async () => {
        setBusy(true);
        try {
            const params = new URLSearchParams();
            if (filters.month) params.set('month', filters.month);
            if (filters.station_id) params.set('station_id', filters.station_id);
            if (filters.leave_type) params.set('leave_type', filters.leave_type);
            if (filters.search) params.set('search', filters.search);

            const [recordsRes, stationsRes] = await Promise.all([
                fetch(`/api/hc/leave-records?${params.toString()}`, { cache: 'no-store' }),
                fetch('/api/master-data?type=stations', { cache: 'force-cache' }),
            ]);

            if (recordsRes.ok) {
                const data = await recordsRes.json();
                setRecords(Array.isArray(data) ? data : []);
            }
            if (stationsRes.ok) {
                const data = await stationsRes.json();
                setStations(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('[HCLeaveWorkspace] Failed to load data:', error);
        } finally {
            setBusy(false);
        }
    }, [filters.leave_type, filters.month, filters.search, filters.station_id]);

    useEffect(() => {
        if (user && mode === 'branch' && user.station_id) {
            setForm((current) => ({ ...current, station_id: user.station_id || '' }));
        }
    }, [user, mode]);

    useEffect(() => {
        if (!loading) {
            load();
        }
    }, [loading, load]);

    useEffect(() => {
        if (loading) return;
        const interval = window.setInterval(() => {
            load();
        }, 30000);
        return () => window.clearInterval(interval);
    }, [loading, load]);

    const leaveTypes = useMemo(() => {
        return Array.from(new Set(records.map((record) => record.leave_type))).sort();
    }, [records]);

    const activeTodayCount = useMemo(() => {
        const today = new Date();
        const currentDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        return records.filter((record) => record.start_date <= currentDate && record.end_date >= currentDate).length;
    }, [records]);

    const picCoverageCount = useMemo(() => {
        return records.filter((record) => Boolean(record.pic_name?.trim())).length;
    }, [records]);

    const canModifyRecord = (record: HCLeaveRecord) => {
        if (isHCManager) return true;
        if (user?.role === 'MANAGER_CABANG') return user.station_id === record.station_id;
        return record.created_by === user?.id;
    };

    const startCreate = () => {
        setEditing(null);
        setForm(emptyForm(mode === 'branch' ? user?.station_id : null));
        setFormOpen(true);
    };

    const startEdit = (record: HCLeaveRecord) => {
        setEditing(record);
        setForm({
            employee_name: record.employee_name,
            leave_type: record.leave_type,
            start_date: record.start_date,
            end_date: record.end_date,
            station_id: record.station_id || '',
            division_name: record.division_name || '',
            unit_name: record.unit_name || '',
            pic_name: record.pic_name || '',
            pic_email: record.pic_email || '',
            pic_phone: record.pic_phone || '',
            e_letter_status: record.e_letter_status,
            notes: record.notes || '',
        });
        setFormOpen(true);
    };

    const resetForm = () => {
        setEditing(null);
        setForm(emptyForm(mode === 'branch' ? user?.station_id : null));
        if (mode === 'hc') {
            setFormOpen(false);
        }
    };

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        setBusy(true);
        try {
            const payload = {
                ...form,
                station_id: mode === 'branch' ? user?.station_id || null : (form.station_id || null),
            };

            const response = await fetch(
                editing ? `/api/hc/leave-records/${editing.id}` : '/api/hc/leave-records',
                {
                    method: editing ? 'PATCH' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                }
            );

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error || 'Gagal menyimpan data');
            }

            resetForm();
            await load();
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Gagal menyimpan data leave');
        } finally {
            setBusy(false);
        }
    };

    const removeRecord = async (record: HCLeaveRecord) => {
        if (!confirm(`Hapus data cuti untuk ${record.employee_name}?`)) return;

        setBusy(true);
        try {
            const response = await fetch(`/api/hc/leave-records/${record.id}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error || 'Gagal menghapus data');
            }

            await load();
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Gagal menghapus data');
        } finally {
            setBusy(false);
        }
    };

    const exportExcel = () => {
        const params = new URLSearchParams();
        if (filters.month) params.set('month', filters.month);
        if (filters.station_id) params.set('station_id', filters.station_id);
        if (filters.leave_type) params.set('leave_type', filters.leave_type);
        window.open(`/api/hc/leave-records/export?${params.toString()}`, '_blank');
    };

    return (
        <div className="min-h-screen p-4 md:p-6">
            <div className="mx-auto max-w-7xl space-y-6">
                <GlassCard className="overflow-hidden">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="space-y-3">
                            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-violet-700">
                                <CalendarDays className="h-4 w-4" />
                                Human Capital
                            </div>
                            <div>
                                <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)] md:text-3xl">
                                    {heading}
                                </h1>
                                <p className="mt-2 max-w-3xl text-sm text-[var(--text-secondary)] md:text-base">
                                    {subheading}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Button variant="outline" onClick={load} disabled={busy}>
                                <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                            {isHCManager && (
                                <Button variant="outline" onClick={exportExcel}>
                                    <Download className="h-4 w-4" />
                                    Export Excel
                                </Button>
                            )}
                            <Button onClick={startCreate}>
                                <Plus className="h-4 w-4" />
                                {editing ? 'Tambah Baru' : (mode === 'branch' && !isBranchManager ? 'Ajukan Cuti / Izin' : 'Tambah Data')}
                            </Button>
                        </div>
                    </div>
                </GlassCard>

                <div className="grid gap-4 md:grid-cols-4">
                    <GlassCard className="bg-gradient-to-br from-violet-50 via-white to-fuchsia-50">
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-600">Total Data</p>
                        <p className="mt-3 text-3xl font-black text-[var(--text-primary)]">{records.length}</p>
                    </GlassCard>
                    <GlassCard className="bg-gradient-to-br from-emerald-50 via-white to-white">
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-600">Sedang Berjalan Hari Ini</p>
                        <p className="mt-3 text-3xl font-black text-[var(--text-primary)]">
                            {activeTodayCount}
                        </p>
                    </GlassCard>
                    <GlassCard className="bg-gradient-to-br from-amber-50 via-white to-white">
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-600">Belum Ada E-Letter</p>
                        <p className="mt-3 text-3xl font-black text-[var(--text-primary)]">
                            {records.filter((record) => record.e_letter_status === 'BELUM_ADA').length}
                        </p>
                    </GlassCard>
                    <GlassCard className="bg-gradient-to-br from-sky-50 via-white to-white">
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-600">PIC / PH Terisi</p>
                        <p className="mt-3 text-3xl font-black text-[var(--text-primary)]">
                            {picCoverageCount}
                        </p>
                    </GlassCard>
                </div>

                {mode === 'branch' && (
                    <GlassCard className="bg-gradient-to-br from-amber-50 via-white to-white">
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-700">Flow HC</p>
                        <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">Staff ajukan, HC terima, manager monitor</h2>
                        <p className="mt-2 max-w-3xl text-sm text-[var(--text-secondary)]">
                            Data ini hanya untuk user login internal. Staff cabang bisa ajukan cuti atau izin lebih dulu, data langsung diteruskan ke HC, manager cabang bisa memonitor, lalu HC dapat menindaklanjuti dan menyebarkan edaran yang relevan.
                        </p>
                    </GlassCard>
                )}

                <GlassCard>
                    <div className="grid gap-4 md:grid-cols-4">
                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Bulan</label>
                            <input
                                type="month"
                                value={filters.month}
                                onChange={(event) => setFilters((current) => ({ ...current, month: event.target.value }))}
                                className="w-full rounded-xl border border-[var(--surface-4)] bg-white px-3 py-2 text-sm"
                            />
                        </div>
                        {mode === 'hc' && (
                            <div>
                                <label className="mb-1 block text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Cabang</label>
                                <select
                                    value={filters.station_id}
                                    onChange={(event) => setFilters((current) => ({ ...current, station_id: event.target.value }))}
                                    className="w-full rounded-xl border border-[var(--surface-4)] bg-white px-3 py-2 text-sm"
                                >
                                    <option value="">Semua Cabang</option>
                                    {stations.map((station) => (
                                        <option key={station.id} value={station.id}>
                                            {station.code} - {station.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Jenis Cuti / Izin</label>
                            <select
                                value={filters.leave_type}
                                onChange={(event) => setFilters((current) => ({ ...current, leave_type: event.target.value }))}
                                className="w-full rounded-xl border border-[var(--surface-4)] bg-white px-3 py-2 text-sm"
                            >
                                <option value="">Semua Jenis</option>
                                {leaveTypes.map((leaveType) => (
                                    <option key={leaveType} value={leaveType}>
                                        {leaveType}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Cari</label>
                            <input
                                type="search"
                                value={filters.search}
                                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                                placeholder="Nama, cabang, PIC..."
                                className="w-full rounded-xl border border-[var(--surface-4)] bg-white px-3 py-2 text-sm"
                            />
                        </div>
                    </div>
                </GlassCard>

                {formOpen && (
                    <GlassCard className="bg-gradient-to-br from-white via-violet-50/50 to-white">
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600">
                                    {editing ? 'Edit Record' : 'Input Baru'}
                                </p>
                                <h2 className="mt-1 text-xl font-black text-[var(--text-primary)]">
                                    {editing ? `Perbarui ${editing.employee_name}` : 'Input Data Cuti / Izin'}
                                </h2>
                            </div>
                            {mode === 'hc' && (
                                <Button variant="ghost" onClick={resetForm}>
                                    Tutup
                                </Button>
                            )}
                        </div>

                        <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" onSubmit={submit}>
                            <input
                                value={form.employee_name}
                                onChange={(event) => setForm((current) => ({ ...current, employee_name: event.target.value }))}
                                placeholder="Nama pegawai"
                                className="rounded-xl border border-[var(--surface-4)] bg-white px-3 py-3 text-sm"
                                required
                            />
                            <input
                                value={form.leave_type}
                                onChange={(event) => setForm((current) => ({ ...current, leave_type: event.target.value }))}
                                placeholder="Jenis cuti / izin"
                                className="rounded-xl border border-[var(--surface-4)] bg-white px-3 py-3 text-sm"
                                required
                            />
                            {mode === 'hc' && (
                                <select
                                    value={form.station_id}
                                    onChange={(event) => setForm((current) => ({ ...current, station_id: event.target.value }))}
                                    className="rounded-xl border border-[var(--surface-4)] bg-white px-3 py-3 text-sm"
                                >
                                    <option value="">Pilih cabang</option>
                                    {stations.map((station) => (
                                        <option key={station.id} value={station.id}>
                                            {station.code} - {station.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                            <input
                                type="date"
                                value={form.start_date}
                                onChange={(event) => setForm((current) => ({ ...current, start_date: event.target.value }))}
                                className="rounded-xl border border-[var(--surface-4)] bg-white px-3 py-3 text-sm"
                                required
                            />
                            <input
                                type="date"
                                value={form.end_date}
                                onChange={(event) => setForm((current) => ({ ...current, end_date: event.target.value }))}
                                className="rounded-xl border border-[var(--surface-4)] bg-white px-3 py-3 text-sm"
                                required
                            />
                            <input
                                value={form.division_name}
                                onChange={(event) => setForm((current) => ({ ...current, division_name: event.target.value }))}
                                placeholder="Divisi"
                                className="rounded-xl border border-[var(--surface-4)] bg-white px-3 py-3 text-sm"
                            />
                            <input
                                value={form.unit_name}
                                onChange={(event) => setForm((current) => ({ ...current, unit_name: event.target.value }))}
                                placeholder="Unit"
                                className="rounded-xl border border-[var(--surface-4)] bg-white px-3 py-3 text-sm"
                            />
                            <input
                                value={form.pic_name}
                                onChange={(event) => setForm((current) => ({ ...current, pic_name: event.target.value }))}
                                placeholder="PIC / PH"
                                className="rounded-xl border border-[var(--surface-4)] bg-white px-3 py-3 text-sm"
                                required
                            />
                            <input
                                type="email"
                                value={form.pic_email}
                                onChange={(event) => setForm((current) => ({ ...current, pic_email: event.target.value }))}
                                placeholder="Email PIC / PH"
                                className="rounded-xl border border-[var(--surface-4)] bg-white px-3 py-3 text-sm"
                            />
                            <input
                                value={form.pic_phone}
                                onChange={(event) => setForm((current) => ({ ...current, pic_phone: event.target.value }))}
                                placeholder="Nomor HP PIC / PH"
                                className="rounded-xl border border-[var(--surface-4)] bg-white px-3 py-3 text-sm"
                            />
                            <select
                                value={form.e_letter_status}
                                onChange={(event) => setForm((current) => ({ ...current, e_letter_status: event.target.value as HCLeaveLetterStatus }))}
                                className="rounded-xl border border-[var(--surface-4)] bg-white px-3 py-3 text-sm"
                            >
                                {LETTER_STATUS_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <textarea
                                value={form.notes}
                                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                                placeholder="Catatan tambahan, mis. e-letter masih proses atau arahan operasional"
                                rows={3}
                                className="rounded-xl border border-[var(--surface-4)] bg-white px-3 py-3 text-sm md:col-span-2 xl:col-span-3"
                            />
                            <div className="flex flex-wrap gap-3 md:col-span-2 xl:col-span-3">
                                <Button type="submit" disabled={busy}>
                                    {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FilePenLine className="h-4 w-4" />}
                                    {editing ? 'Simpan Perubahan' : 'Simpan Data'}
                                </Button>
                                <Button type="button" variant="outline" onClick={resetForm} disabled={busy}>
                                    Reset
                                </Button>
                            </div>
                        </form>
                    </GlassCard>
                )}

                <div className="space-y-4">
                    <div className="hidden overflow-x-auto md:block">
                        <table className="min-w-full overflow-hidden rounded-2xl border border-[var(--surface-4)] bg-white text-sm">
                            <thead className="bg-[var(--surface-1)] text-left text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                                <tr>
                                    <th className="px-4 py-3">Pegawai</th>
                                    <th className="px-4 py-3">Periode</th>
                                    <th className="px-4 py-3">Cabang</th>
                                    <th className="px-4 py-3">Divisi / Unit</th>
                                    <th className="px-4 py-3">PIC / PH</th>
                                    <th className="px-4 py-3">E-Letter</th>
                                    <th className="px-4 py-3">Catatan</th>
                                    <th className="px-4 py-3">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map((record) => (
                                    <tr key={record.id} className="border-t border-[var(--surface-3)] align-top">
                                        <td className="px-4 py-4">
                                            <p className="font-bold text-[var(--text-primary)]">{record.employee_name}</p>
                                            <p className="mt-1 text-xs text-[var(--text-muted)]">{record.leave_type}</p>
                                        </td>
                                        <td className="px-4 py-4 text-[var(--text-secondary)]">
                                            <p>{record.start_date}</p>
                                            <p className="mt-1">s.d. {record.end_date}</p>
                                        </td>
                                        <td className="px-4 py-4 text-[var(--text-secondary)]">
                                            {record.station ? `${record.station.code} - ${record.station.name}` : '-'}
                                        </td>
                                        <td className="px-4 py-4 text-[var(--text-secondary)]">
                                            <p>{record.division_name || '-'}</p>
                                            <p className="mt-1 text-xs text-[var(--text-muted)]">{record.unit_name || 'Unit belum diisi'}</p>
                                        </td>
                                        <td className="px-4 py-4 text-[var(--text-secondary)]">
                                            <p>{record.pic_name || '-'}</p>
                                            <p className="mt-1 text-xs text-[var(--text-muted)]">{record.pic_email || '-'}</p>
                                            <p className="mt-1 text-xs text-[var(--text-muted)]">{record.pic_phone || '-'}</p>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                                                {LETTER_STATUS_OPTIONS.find((option) => option.value === record.e_letter_status)?.label || record.e_letter_status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-[var(--text-secondary)]">
                                            {record.notes || '-'}
                                        </td>
                                        <td className="px-4 py-4">
                                            {canModifyRecord(record) ? (
                                                <div className="flex gap-2">
                                                    <Button size="sm" variant="outline" onClick={() => startEdit(record)}>
                                                        <FilePenLine className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="sm" variant="outline" onClick={() => removeRecord(record)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-[var(--text-muted)]">Read only</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="grid gap-4 md:hidden">
                        {records.map((record) => (
                            <GlassCard key={record.id}>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-lg font-black text-[var(--text-primary)]">{record.employee_name}</p>
                                        <p className="mt-1 text-sm text-[var(--text-secondary)]">{record.leave_type}</p>
                                    </div>
                                    <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                                        {LETTER_STATUS_OPTIONS.find((option) => option.value === record.e_letter_status)?.label || record.e_letter_status}
                                    </span>
                                </div>
                                <div className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
                                    <p><strong>Periode:</strong> {record.start_date} s.d. {record.end_date}</p>
                                    <p><strong>Cabang:</strong> {record.station ? `${record.station.code} - ${record.station.name}` : '-'}</p>
                                    <p><strong>Divisi / Unit:</strong> {record.division_name || '-'} / {record.unit_name || '-'}</p>
                                    <p><strong>PIC / PH:</strong> {record.pic_name || '-'} / {record.pic_phone || '-'}</p>
                                    <p><strong>Catatan:</strong> {record.notes || '-'}</p>
                                </div>
                                {canModifyRecord(record) && (
                                    <div className="mt-4 flex gap-3">
                                        <Button size="sm" variant="outline" onClick={() => startEdit(record)}>
                                            <FilePenLine className="h-4 w-4" />
                                            Edit
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => removeRecord(record)}>
                                            <Trash2 className="h-4 w-4" />
                                            Hapus
                                        </Button>
                                    </div>
                                )}
                            </GlassCard>
                        ))}
                    </div>

                    {records.length === 0 && (
                        <GlassCard className="text-center">
                            <Users className="mx-auto h-10 w-10 text-violet-400" />
                            <p className="mt-4 text-lg font-bold text-[var(--text-primary)]">Belum ada data cuti / izin</p>
                            <p className="mt-2 text-sm text-[var(--text-secondary)]">
                                Input pertama dari cabang akan langsung muncul di sini dan ikut masuk ke backup spreadsheet HC.
                            </p>
                        </GlassCard>
                    )}
                </div>
            </div>
        </div>
    );
}
