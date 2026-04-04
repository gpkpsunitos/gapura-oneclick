/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi konfigurasi navigasi untuk dashboard berdasarkan role pengguna
 * Menentukan menu dan link yang tersedia untuk setiap role dalam aplikasi
 */

import { 
    LayoutDashboard, 
    FileText, 
    Plane, 
    ClipboardList, 
    Users, 
    ChevronRight, 
    Hash, 
    FolderOpen, 
    Shield, 
    Brain, 
    Inbox, 
    Calendar,
    Layers,
    BookOpen,
    GraduationCap
} from 'lucide-react';

/**
 * Interface untuk konfigurasi item navigasi
 * Setiap item merepresentasikan satu link dalam menu navigasi
 */
export interface NavItemConfig {
    /** URL path untuk navigasi */
    href: string;
    /** Label tampilan untuk item menu */
    label: string;
    /** Icon komponen untuk ditampilkan di sebelah label */
    icon: any;
    /** Jumlah badge opsional untuk ditampilkan (misalnya jumlah notifikasi) */
    count?: number;
    /** Flag jika link adalah external (membuka di tab baru) */
    external?: boolean;
}

/**
 * Interface untuk konfigurasi grup navigasi
 * Mengelompokkan item navigasi ke dalam kategori/submenu
 */
export interface NavGroupConfig {
    /** Judul grup navigasi */
    title: string;
    /** Array item navigasi dalam grup ini */
    items: NavItemConfig[];
}


/**
 * Konfigurasi lengkap navigasi untuk setiap role
 * Setiap role memiliki set menu yang disesuaikan dengan tanggung jawabnya
 */
export const LINKS_CONFIG: Record<string, NavGroupConfig[]> = {
    /** Konfigurasi navigasi untuk role ADMIN */
    'ADMIN': [
        {
            title: 'Overview',
            items: [
                { href: '/dashboard/admin', label: 'Dashboard', icon: LayoutDashboard },
                { href: '/dashboard/admin/security', label: 'Security', icon: Shield },
            ]
        },
        {
            title: 'Management',
            items: [
                { href: '/dashboard/admin/reports', label: 'Reports', icon: ClipboardList },
                { href: '/dashboard/admin/users', label: 'Users', icon: Users },
            ]
        }
    ],
    /** Konfigurasi navigasi untuk role EMPLOYEE (staff biasa) */
    'EMPLOYEE': [
        {
            title: 'Workspace',
            items: [
                { href: '/dashboard/employee', label: 'Laporan Saya', icon: FileText },
                { href: '/dashboard/employee/new', label: 'Buat Laporan', icon: Plane },
                { href: '/dashboard/employee/quick-access', label: 'Quick Access', icon: ChevronRight },
                { href: '/dashboard/employee/hc-leave', label: 'Ajukan Cuti / Izin', icon: Users },
                { href: '/dashboard/employee/hc-documents', label: 'Edaran HC', icon: BookOpen },
                { href: '/dashboard/employee/training-hub', label: 'Training Hub', icon: GraduationCap },
            ]
        }
    ],
    /** Konfigurasi navigasi untuk role MANAGER_CABANG */
    'MANAGER': [
        {
            title: 'Workspace',
            items: [
                { href: '/dashboard/employee', label: 'Laporan Saya', icon: FileText },
                { href: '/dashboard/employee/new', label: 'Buat Laporan', icon: Plane },
                { href: '/dashboard/employee/quick-access', label: 'Quick Access', icon: ChevronRight },
                { href: '/dashboard/employee/hc-leave', label: 'Monitoring Cuti Cabang', icon: Users },
                { href: '/dashboard/employee/hc-documents', label: 'Edaran HC', icon: BookOpen },
                { href: '/dashboard/employee/training-hub', label: 'Training Hub', icon: GraduationCap },
            ]
        },
        {
            title: 'Analysis',
            items: [
                { href: '/dashboard/employee/ai-reports', label: 'AI Reports', icon: Brain },
            ]
        },
        {
            title: 'Management',
            items: [
                { href: '/dashboard/admin/users', label: 'Kelola Staff', icon: Users },
            ]
        }
    ],

    // OS / OCS / Unit Service
    /** Konfigurasi navigasi untuk role OS (Operational Support) */
    'OS': [
        {
            title: 'Monitoring',
            items: [
                { href: '/dashboard/os', label: 'Dashboard', icon: LayoutDashboard },
                { href: '/dashboard/os/dispatched', label: 'Laporan Divisi', icon: Inbox },
                { href: '/dashboard/os/reports', label: 'Semua Laporan', icon: ClipboardList },
            ]
        }
    ],

    // OT – Divisi Teknik (standalone; also included in DIVISI_PELAPORAN)
    /** Konfigurasi navigasi untuk role OT (Operational Technical) */
    'OT': [
        {
            title: 'Divisi Teknik',
            items: [
                { href: '/dashboard/ot', label: 'OT Dashboard', icon: LayoutDashboard },
                { href: '/dashboard/ot/dispatched', label: 'Laporan Divisi', icon: Inbox },
                { href: '/dashboard/ot/reports', label: 'Semua Laporan', icon: ClipboardList },
            ]
        }
    ],

    // OP – Divisi Operasi (standalone; also included in DIVISI_PELAPORAN)
    /** Konfigurasi navigasi untuk role OP (Operations) */
    'OP': [
        {
            title: 'Divisi Operasi',
            items: [
                { href: '/dashboard/op', label: 'OP Dashboard', icon: LayoutDashboard },
                { href: '/dashboard/op/dispatched', label: 'Laporan Divisi', icon: Inbox },
                { href: '/dashboard/op/reports', label: 'Semua Laporan', icon: ClipboardList },
            ]
        }
    ],

    // UQ – Divisi Quality (standalone; also included in DIVISI_PELAPORAN)
    /** Konfigurasi navigasi untuk role UQ (Quality) */
    'UQ': [
        {
            title: 'Divisi Quality',
            items: [
                { href: '/dashboard/uq', label: 'UQ Dashboard', icon: LayoutDashboard },
                { href: '/dashboard/uq/dispatched', label: 'Laporan Divisi', icon: Inbox },
                { href: '/dashboard/uq/reports', label: 'Semua Laporan', icon: ClipboardList },
            ]
        }
    ],

    // HC – Human Capital
    /** Konfigurasi navigasi untuk role HC (Human Capital) */
    'HC': [
        {
            title: 'Human Capital',
            items: [
                { href: '/dashboard/hc', label: 'HC Workspace', icon: LayoutDashboard },
                { href: '/dashboard/hc/leave', label: 'Monitoring Cuti', icon: Users },
                { href: '/dashboard/hc/library', label: 'Edaran & Materi HC', icon: BookOpen },
            ]
        }
    ],

    // HT – Human Training (standalone; also included in DIVISI_PELAPORAN)
    /** Konfigurasi navigasi untuk role HT (Human Training) */
    'HT': [
        {
            title: 'Human Training',
            items: [
                { href: '/dashboard/ht', label: 'HT Dashboard', icon: LayoutDashboard },
                { href: '/dashboard/ht/dispatched', label: 'Laporan Divisi', icon: Inbox },
                { href: '/dashboard/ht/reports', label: 'Semua Laporan', icon: ClipboardList },
            ]
        }
    ],

    // ─── DIVISI PELAPORAN (UQ + OP + O/OT + HT merged sidebar) ────────────────
    /** Konfigurasi navigasi untuk role DIVISI_PELAPORAN */
    'DIVISI_PELAPORAN': [
        {
            title: 'Laporan UQ',
            items: [
                { href: '/dashboard/uq', label: 'UQ Dashboard', icon: LayoutDashboard },
                { href: '/dashboard/uq/dispatched', label: 'Laporan Divisi', icon: Inbox },
                { href: '/dashboard/uq/reports', label: 'Semua Laporan', icon: ClipboardList },
            ]
        },
        {
            title: 'Laporan OP',
            items: [
                { href: '/dashboard/op', label: 'OP Dashboard', icon: LayoutDashboard },
                { href: '/dashboard/op/dispatched', label: 'Laporan Divisi', icon: Inbox },
                { href: '/dashboard/op/reports', label: 'Semua Laporan', icon: ClipboardList },
            ]
        },
        {
            title: 'Laporan OT',
            items: [
                { href: '/dashboard/ot', label: 'OT Dashboard', icon: LayoutDashboard },
                { href: '/dashboard/ot/dispatched', label: 'Laporan Divisi', icon: Inbox },
                { href: '/dashboard/ot/reports', label: 'Semua Laporan', icon: ClipboardList },
            ]
        },
        {
            title: 'Laporan HT',
            items: [
                { href: '/dashboard/ht', label: 'HT Dashboard', icon: LayoutDashboard },
                { href: '/dashboard/ht/dispatched', label: 'Laporan Divisi', icon: Inbox },
                { href: '/dashboard/ht/reports', label: 'Semua Laporan', icon: ClipboardList },
            ]
        }
    ],

    // ─── ESKALASI ──────────────────────────────────────────────────────────────
    /** Konfigurasi navigasi untuk role DIVISI_ESKALASI */
    'DIVISI_ESKALASI': [
        {
            title: 'Pusat Eskalasi',
            items: [
                { href: '/dashboard/eskalasi/select', label: 'Pilih Divisi', icon: Layers },
                { href: '/dashboard/eskalasi', label: 'Dashboard', icon: LayoutDashboard },
                { href: '/dashboard/eskalasi/laporan-divisi', label: 'Semua Laporan', icon: ClipboardList },
            ]
        }
    ],

    // ─── SUPER ADMIN / ANALYST (merged) ───────────────────────────────────────
    /** Konfigurasi navigasi untuk role ANALYST (dan SUPER_ADMIN) */
    'ANALYST': [
        {
            title: 'Command Center',
            items: [
                { href: '/dashboard/analyst', label: 'Dashboard', icon: LayoutDashboard },
                { href: '/dashboard/analyst/reports', label: 'Laporan', icon: ClipboardList },
                { href: '/dashboard/analyst/ai-reports', label: 'AI Reports', icon: Brain },
                { href: '/dashboard/analyst/builder', label: 'Explore & Build', icon: Hash },
                { href: '/dashboard/analyst/dashboards', label: 'Custom Dashboards', icon: FolderOpen },
                { href: '/dashboard/analyst/import', label: 'Import Data', icon: FolderOpen },
                { href: '/dashboard/employee/new', label: 'Buat Laporan', icon: Plane },
            ]
        },
        {
            title: 'Schedule',
            items: [
                { href: '/dashboard/analyst/calendar', label: 'Event Calendar', icon: Calendar },
                { href: '/dashboard/analyst/meeting-calendar', label: 'Meeting Calendar', icon: Calendar },
            ]
        }
    ]
};

// ─── Role → Config Key mapping ────────────────────────────────────────────────
// Complexity: Time O(1) | Space O(1) — constant lookup via string matching
/**
 * Mengambil kunci konfigurasi navigasi yang sesuai dengan role pengguna
 * Mapping ini mengonversi role string ke kunci yang digunakan di LINKS_CONFIG
 * 
 * @param role - Role pengguna (case insensitive)
 * @param pathname - Current pathname (optional, untuk penggunaan masa depan)
 * @returns Kunci konfigurasi navigasi yang sesuai
 * 
 * @example
 * ```typescript
 * const configKey = GET_LINKS_KEY('DIVISI_OS');
 * // 'OS'
 * const links = LINKS_CONFIG[configKey];
 * ```
 */
export const GET_LINKS_KEY = (role: string, pathname?: string): string => {
    const r = (role || '').toUpperCase();

    if (r.includes('SUPER') || r === 'ADMIN') return 'ANALYST';  // merged with Analyst
    if (r === 'ANALYST') return 'ANALYST';
    if (r === 'MANAGER_CABANG') return 'MANAGER';

    if (r === 'DIVISI_ESKALASI') {
        return 'DIVISI_ESKALASI';
    }

    if (r === 'DIVISI_OS' || r === 'PARTNER_OS') return 'OS';
    if (r === 'DIVISI_HC' || r === 'PARTNER_HC') return 'HC';

    if (r === 'DIVISI_UQ' || r === 'PARTNER_UQ') return 'UQ';
    if (r === 'DIVISI_OP' || r === 'PARTNER_OP') return 'OP';
    if (r === 'DIVISI_OT' || r === 'PARTNER_OT') return 'OT';
    if (r === 'DIVISI_HT' || r === 'PARTNER_HT') return 'HT';

    return 'EMPLOYEE';
};
