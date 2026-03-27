'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Users, Search, RefreshCw, Check, X, Shield, User,
    Filter, ChevronDown, Mail, Building2,
    Eye, Wrench, Star, Edit2, Save, Plus, Layers
} from 'lucide-react';
import type { UserRole, DivisionType } from '@/types';

interface UserData {
    id: string;
    email: string;
    full_name: string;
    nik: string;
    phone: string;
    role: UserRole;
    division: DivisionType;
    status: 'pending' | 'active' | 'rejected';
    created_at: string;
    stations: { code: string; name: string } | null;
    units: { name: string } | null;
    positions: { name: string } | null;
}

const statusConfig = {
    pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    active: { label: 'Aktif', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-700 border-red-200' },
};

const roleConfig: Record<UserRole, { label: string; color: string; icon: typeof User }> = {
    DIVISI_OS: { label: 'Divisi OS', color: 'bg-blue-100 text-blue-700', icon: Eye },
    DIVISI_OT: { label: 'Divisi OT', color: 'bg-orange-100 text-orange-700', icon: Wrench },
    DIVISI_OP: { label: 'Divisi OP', color: 'bg-teal-100 text-teal-700', icon: User },
    DIVISI_UQ: { label: 'Divisi UQ', color: 'bg-pink-100 text-pink-700', icon: Shield },
    DIVISI_HC: { label: 'Divisi HC', color: 'bg-violet-100 text-violet-700', icon: Building2 },
    DIVISI_HT: { label: 'Divisi HT', color: 'bg-sky-100 text-sky-700', icon: User },
    DIVISI_ESKALASI: { label: 'Divisi Eskalasi', color: 'bg-indigo-100 text-indigo-700', icon: Layers },
    ANALYST: { label: 'Analyst', color: 'bg-indigo-100 text-indigo-700', icon: Star },
    SUPER_ADMIN: { label: 'Super Admin', color: 'bg-purple-100 text-purple-700', icon: Shield },
    MANAGER_CABANG: { label: 'Manager Cabang', color: 'bg-emerald-100 text-emerald-700', icon: Shield },
    STAFF_CABANG: { label: 'Staff Cabang', color: 'bg-gray-100 text-gray-700', icon: User },
};

const divisionConfig: Record<DivisionType, string> = {
    GENERAL: 'Umum',
    OS: 'Operational Services',
    OT: 'Teknik (GSE)',
    OP: 'Operasi',
    UQ: 'Quality',
    HC: 'Human Capital',
    HT: 'Human Training',
};

// --- Edit User Modal Component ---
function EditUserModal({ user, onClose, onSave, isLoading }: { 
    user: UserData, 
    onClose: () => void, 
    onSave: (data: { role: UserRole, division: DivisionType }) => void,
    isLoading: boolean
}) {
    const [role, setRole] = useState<UserRole>(user.role);
    const [division, setDivision] = useState<DivisionType>(user.division || 'GENERAL');

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-scale-in">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Edit User</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Nama Lengkap</label>
                        <p className="font-semibold text-gray-900">{user.full_name}</p>
                    </div>

                    <div>
                         <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Role</label>
                         <select 
                            value={role} 
                            onChange={(e) => setRole(e.target.value as UserRole)}
                            className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 font-medium focus:ring-2 focus:ring-blue-500/20 outline-none"
                        >
                            {Object.entries(roleConfig).map(([key, config]) => (
                                <option key={key} value={key}>{config.label}</option>
                            ))}
                         </select>
                    </div>

                    <div>
                         <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Divisi</label>
                         <select 
                            value={division} 
                            onChange={(e) => setDivision(e.target.value as DivisionType)}
                            className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 font-medium focus:ring-2 focus:ring-blue-500/20 outline-none"
                        >
                            {Object.entries(divisionConfig).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                         </select>
                    </div>
                </div>

                <div className="flex gap-3 mt-8">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50">
                        Batal
                    </button>
                    <button 
                        onClick={() => onSave({ role, division })}
                        disabled={isLoading}
                        className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 flex items-center justify-center gap-2"
                    >
                        {isLoading ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                        Simpan Perubahan
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- Add Staff Modal (Manager & Super Admin) ---
function AddStaffModal({
    onClose,
    onCreated,
    isManager,
}: {
    onClose: () => void;
    onCreated: (pwd: string) => void;
    isManager: boolean;
}) {
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [nik, setNik] = useState('');
    const [phone, setPhone] = useState('');
    const [positionId, setPositionId] = useState('');
    const [unitId, setUnitId] = useState<string | null>(null);
    const [positions, setPositions] = useState<{ id: string; name: string }[]>([]);
    const [units, setUnits] = useState<{ id: string; name: string }[]>([]);
    const [activate, setActivate] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const [pos, un] = await Promise.all([
                    fetch('/api/master-data?type=positions').then(r => r.json()).catch(() => []),
                    fetch('/api/master-data?type=units').then(r => r.json()).catch(() => []),
                ]);
                setPositions(Array.isArray(pos) ? pos : []);
                setUnits(Array.isArray(un) ? un : []);
            } catch {
                // ignore
            }
        };
        load();
    }, []);

    const handleCreate = async () => {
        setError(null);
        if (!email || !fullName || !nik || !phone || !positionId) {
            setError('Lengkapi semua field wajib');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    full_name: fullName,
                    nik,
                    phone,
                    position_id: positionId,
                    unit_id: unitId,
                    activate,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Gagal membuat staff');
            } else {
                onCreated(data.temporaryPassword || '-');
            }
        } catch {
            setError('Kesalahan jaringan');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900">{isManager ? 'Tambah Staff Cabang' : 'Tambah User'}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X size={18} />
                    </button>
                </div>
                {error && (
                    <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm">{error}</div>
                )}
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Nama Lengkap</label>
                        <input className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-blue-500/20 outline-none" value={fullName} onChange={e => setFullName(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Email</label>
                        <input className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-blue-500/20 outline-none" value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">NIK</label>
                            <input className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-blue-500/20 outline-none" value={nik} onChange={e => setNik(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">HP</label>
                            <input className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-blue-500/20 outline-none" value={phone} onChange={e => setPhone(e.target.value)} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Posisi</label>
                            <select className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-blue-500/20 outline-none" value={positionId} onChange={e => setPositionId(e.target.value)}>
                                <option value="">Pilih posisi</option>
                                {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Unit (opsional)</label>
                            <select className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-blue-500/20 outline-none" value={unitId || ''} onChange={e => setUnitId(e.target.value || null)}>
                                <option value="">-</option>
                                {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <label className="inline-flex items-center gap-2 mt-1 select-none">
                        <input type="checkbox" checked={activate} onChange={e => setActivate(e.target.checked)} />
                        <span className="text-sm">Aktifkan langsung</span>
                    </label>
                </div>
                <div className="flex gap-3 mt-6">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50">
                        Batal
                    </button>
                    <button onClick={handleCreate} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 flex items-center justify-center gap-2">
                        {loading ? <RefreshCw className="animate-spin" size={18} /> : <Plus size={18} />}
                        Buat
                    </button>
                </div>
            </div>
        </div>
    );
}


export default function AdminUsersPage() {
    const router = useRouter();
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [editingUser, setEditingUser] = useState<UserData | null>(null);
    const [authorized, setAuthorized] = useState<boolean | null>(null);
    const [userRole, setUserRole] = useState<UserRole | null>(null);
    const [showAdd, setShowAdd] = useState(false);
    const [lastTempPwd, setLastTempPwd] = useState<string | null>(null);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await fetch('/api/auth/session');
                if (!res.ok) {
                    setAuthorized(false);
                    router.replace('/dashboard');
                    return;
                }
                const data = await res.json();
                const role = data?.user?.role as UserRole | undefined;
                setUserRole(role || null);
                // Allow SUPER_ADMIN and MANAGER_CABANG
                if (role === 'SUPER_ADMIN' || role === 'MANAGER_CABANG') {
                    setAuthorized(true);
                } else {
                    setAuthorized(false);
                    router.replace('/dashboard');
                }
            } catch {
                setAuthorized(false);
                router.replace('/dashboard');
            }
        };
        checkAuth();
    }, [router]);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/users?status=${filter === 'all' ? '' : filter}`);
            const data = await res.json();
            setUsers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        if (authorized) fetchUsers();
    }, [authorized, fetchUsers]);

    const updateUserStatus = async (userId: string, status: string) => {
        setActionLoading(userId);
        try {
            await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, status }),
            });
            fetchUsers();
        } catch {
            alert('Gagal mengubah status');
        } finally {
            setActionLoading(null);
        }
    };

    const handleSaveUser = async (data: { role: UserRole, division: DivisionType }) => {
        if (!editingUser) return;
        setActionLoading(editingUser.id);

        try {
            const res = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: editingUser.id,
                    role: data.role,
                    division: data.division
                }),
            });

            if (!res.ok) throw new Error('Failed to update');

            setEditingUser(null);
            fetchUsers();
        } catch {
            alert('Gagal menyimpan perubahan user');
        } finally {
            setActionLoading(null);
        }
    };

    const handleApproveStaff = async (userId: string) => {
        setActionLoading(userId);
        try {
            const res = await fetch('/api/admin/users/approve-staff', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to approve staff');
            }

            fetchUsers();
            alert('Staff berhasil disetujui');
        } catch (error: unknown) {
            console.error('Approve staff error:', error);
            const message = error instanceof Error ? error.message : 'Gagal menyetujui staff';
            alert(message);
        } finally {
            setActionLoading(null);
        }
    };

    const filteredUsers = users.filter(user =>
        user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        user.email?.toLowerCase().includes(search.toLowerCase()) ||
        user.nik?.toLowerCase().includes(search.toLowerCase())
    );

    if (authorized === false) {
        return null;
    }
    return (
        <>
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Kelola User</h1>
                    <p className="text-slate-500 mt-1 text-sm sm:text-base">Kelola semua pengguna dalam sistem</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchUsers}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors text-sm font-medium flex-shrink-0"
                    >
                        <RefreshCw className="w-4 h-4" />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                    {userRole === 'MANAGER_CABANG' && (
                        <button
                            onClick={() => { setShowAdd(true); setLastTempPwd(null); }}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors text-sm font-medium flex-shrink-0"
                        >
                            <Plus className="w-4 h-4" />
                            Tambah Staff
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white rounded-xl border border-slate-100 p-3 sm:p-4">
                    <p className="text-xs sm:text-sm text-slate-500">Total User</p>
                    <p className="text-xl sm:text-2xl font-bold text-slate-900">{users.length}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-3 sm:p-4">
                    <p className="text-xs sm:text-sm text-emerald-600">Aktif</p>
                    <p className="text-xl sm:text-2xl font-bold text-emerald-700">{users.filter(u => u.status === 'active').length}</p>
                </div>
                <div className="bg-amber-50 rounded-xl border border-amber-100 p-3 sm:p-4">
                    <p className="text-xs sm:text-sm text-amber-600">Pending</p>
                    <p className="text-xl sm:text-2xl font-bold text-amber-700">{users.filter(u => u.status === 'pending').length}</p>
                </div>
                <div className="bg-purple-50 rounded-xl border border-purple-100 p-3 sm:p-4">
                    <p className="text-xs sm:text-sm text-purple-600">Super Admin</p>
                    <p className="text-xl sm:text-2xl font-bold text-purple-700">{users.filter(u => u.role === 'SUPER_ADMIN').length}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Cari nama, email, atau NIK..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 bg-white focus:border-blue-500 focus:outline-none transition-colors text-sm"
                    />
                </div>
                <div className="relative w-full sm:w-auto">
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="w-full sm:w-auto appearance-none pl-10 pr-10 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-700 font-medium focus:border-blue-500 focus:outline-none cursor-pointer text-sm"
                    >
                        <option value="all">Semua Status</option>
                        <option value="pending">Pending</option>
                        <option value="active">Aktif</option>
                        <option value="rejected">Ditolak</option>
                    </select>
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="p-12 text-center">
                        <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">Tidak ada user ditemukan</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Station / Unit</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredUsers.map((user) => {
                                    const RoleIcon = roleConfig[user.role]?.icon || User;
                                    return (
                                        <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold ${user.role === 'SUPER_ADMIN' ? 'bg-gradient-to-br from-purple-500 to-violet-600' : user.role === 'ANALYST' ? 'bg-gradient-to-br from-indigo-500 to-purple-500' : 'bg-gradient-to-br from-blue-500 to-cyan-500'}`}>
                                                        {user.full_name?.charAt(0).toUpperCase() || 'U'}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-900">{user.full_name}</p>
                                                        <p className="text-xs text-slate-500 flex items-center gap-1">
                                                            <Mail size={10} />
                                                            {user.email}
                                                        </p>
                                                        {user.nik && (
                                                            <p className="text-xs text-slate-400">NIK: {user.nik}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm">
                                                    {user.stations && (
                                                        <p className="font-medium text-slate-700 flex items-center gap-1">
                                                            <Building2 size={12} className="text-slate-400" />
                                                            {user.stations.code}
                                                        </p>
                                                    )}
                                                    {user.division && (
                                                        <p className="text-xs font-bold text-slate-600 mt-0.5">{divisionConfig[user.division] || user.division}</p>
                                                    )}
                                                    {user.units && (
                                                        <p className="text-xs text-slate-500">{user.units.name}</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${roleConfig[user.role]?.color || 'bg-slate-100 text-slate-700'}`}>
                                                    <RoleIcon size={12} />
                                                    {roleConfig[user.role]?.label || user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${statusConfig[user.status].color}`}>
                                                    {statusConfig[user.status].label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-end gap-2">
                                                    {/* Edit Button for Active Users (SUPER_ADMIN only) */}
                                                    {userRole === 'SUPER_ADMIN' && (
                                                        <button
                                                            onClick={() => setEditingUser(user)}
                                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                                                            title="Edit User"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                    )}

                                                    {/* Approve Staff Button for STAFF_CABANG */}
                                                    {user.role === 'STAFF_CABANG' && user.status === 'pending' && (
                                                        <button
                                                            onClick={() => handleApproveStaff(user.id)}
                                                            disabled={actionLoading === user.id}
                                                            className="px-3 py-1 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                                                            title="Setujui staff cabang"
                                                        >
                                                            Setujui Staff
                                                        </button>
                                                    )}

                                                    {user.status === 'pending' && (
                                                        <>
                                                            <button
                                                                onClick={() => updateUserStatus(user.id, 'rejected')}
                                                                disabled={actionLoading === user.id}
                                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                                                title="Tolak"
                                                            >
                                                                <X size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => updateUserStatus(user.id, 'active')}
                                                                disabled={actionLoading === user.id}
                                                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-white font-medium text-sm hover:bg-emerald-600 transition-colors disabled:opacity-50"
                                                            >
                                                                <Check size={16} />
                                                                Setujui
                                                            </button>
                                                        </>
                                                    )}
                                                    {user.status === 'active' && (
                                                        <button
                                                            onClick={() => updateUserStatus(user.id, 'rejected')}
                                                            disabled={actionLoading === user.id}
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                                            title="Nonaktifkan"
                                                        >
                                                            <Shield size={16} />
                                                        </button>
                                                    )}
                                                    {user.status === 'rejected' && (
                                                        <button
                                                            onClick={() => updateUserStatus(user.id, 'active')}
                                                            disabled={actionLoading === user.id}
                                                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-emerald-200 text-emerald-600 font-medium text-sm hover:bg-emerald-50 transition-colors disabled:opacity-50"
                                                        >
                                                            <Check size={16} />
                                                            Aktifkan
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {editingUser && userRole === 'SUPER_ADMIN' && (
                <EditUserModal 
                    user={editingUser} 
                    onClose={() => setEditingUser(null)} 
                    onSave={handleSaveUser}
                    isLoading={actionLoading === editingUser.id}
                />
            )}
        </div>
        {showAdd && (
            <AddStaffModal
                onClose={() => setShowAdd(false)}
                onCreated={(pwd) => {
                    setShowAdd(false);
                    setLastTempPwd(pwd);
                    fetchUsers();
                }}
                isManager={userRole === 'MANAGER_CABANG'}
            />
        )}
        {lastTempPwd && (
            <div className="fixed bottom-4 right-4 z-40 max-w-md bg-white border border-emerald-200 shadow-lg rounded-2xl p-4">
                <p className="text-sm font-semibold text-emerald-700">User berhasil dibuat.</p>
                <p className="text-xs mt-1">Password sementara:</p>
                <p className="font-mono text-sm mt-1 bg-emerald-50 rounded px-2 py-1 inline-block">{lastTempPwd}</p>
                <p className="text-xs text-slate-500 mt-2">Mohon sampaikan ke user dan sarankan untuk mengganti password setelah login.</p>
                <div className="flex justify-end mt-2">
                    <button onClick={() => setLastTempPwd(null)} className="text-xs px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50">Tutup</button>
                </div>
            </div>
        )}
        </>
    );
}
