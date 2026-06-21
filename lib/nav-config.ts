/**
 * @file
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
    Calendar,
    Layers,
    Link2,
    Bell,
    BookOpen,
    type LucideIcon,
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
    icon: LucideIcon;
    /** Jumlah badge opsional untuk ditampilkan (misalnya jumlah notifikasi) */
    count?: number;
    /** Flag jika link adalah external (membuka di tab baru) */
    external?: boolean;
    /** Flag jika fitur belum tersedia — sidebar akan menampilkan alert "feature in development". */
    comingSoon?: boolean;
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
                { href: '/dashboard/admin/external-links', label: 'External Links', icon: Link2 },
            ]
        }
    ],
    /** Konfigurasi navigasi untuk role EMPLOYEE (staff biasa) */
    'EMPLOYEE': [
        {
            title: 'Workspace',
            items: [
                { href: '/dashboard/employee', label: 'My Reports', icon: FileText },
                { href: '/dashboard/employee/new', label: 'Create Report', icon: Plane },
                { href: '/dashboard/employee/quick-access', label: 'Quick Access', icon: ChevronRight },
                { href: '/dashboard/employee/documents', label: 'Documents', icon: BookOpen },
            ]
        }
    ],
    /** Konfigurasi navigasi untuk role STAFF_CABANG (tanpa Quick Access) */
    'STAFF_CABANG': [
        {
            title: 'Workspace',
            items: [
                { href: '/dashboard/employee', label: 'My Reports', icon: FileText },
                { href: '/dashboard/employee/new', label: 'Create Report', icon: Plane },
                { href: '/dashboard/employee/documents', label: 'Documents', icon: BookOpen },
            ]
        }
    ],
    /** Konfigurasi navigasi untuk role MANAGER_CABANG */
    'MANAGER': [
        {
            title: 'Overview',
            items: [
                { href: '/dashboard/manager', label: 'Dashboard', icon: LayoutDashboard },
            ]
        },
        {
            title: 'Workspace',
            items: [
                { href: '/dashboard/employee/reports', label: 'All Reports', icon: ClipboardList },
                { href: '/dashboard/employee/new', label: 'Create Report', icon: Plane },
                { href: '/dashboard/manager/documents', label: 'Documents', icon: BookOpen },
            ]
        },
        {
            title: 'Analysis',
            items: [
                { href: '#', label: 'AI Reports', icon: Brain, comingSoon: true },
            ]
        },
        {
            title: 'Management',
            items: [
                { href: '/dashboard/admin/users', label: 'Manage Staff', icon: Users },
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
                { href: '/dashboard/os/reports', label: 'All Reports', icon: ClipboardList },
            ]
        },
        {
            title: 'Schedule',
            items: [
                { href: '/dashboard/os/calendar', label: 'Event Calendar', icon: Calendar },
                { href: '/dashboard/os/meetings', label: 'Meeting Calendar', icon: Calendar },
            ]
        }
    ],

    // OP – Divisi Operasi
    /** Konfigurasi navigasi untuk role OP (Operations) */
    'OP': [
        {
            title: 'Operational Dashboard',
            items: [
                { href: '/dashboard/op', label: 'Dashboard', icon: LayoutDashboard },
                { href: '/dashboard/op/reports', label: 'All Reports', icon: ClipboardList },
            ]
        }
    ],

    'HC': [
        {
            title: 'HC Home',
            items: [
                { href: '/dashboard/hc', label: 'Circulars & Socialization Materials', icon: LayoutDashboard },
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
                { href: '/dashboard/ht/reports', label: 'All Reports', icon: ClipboardList },
            ]
        }
    ],

    // ─── DIVISI PELAPORAN ────────────────────────────────────────────────────
    /** Konfigurasi navigasi untuk role DIVISI_PELAPORAN */
    'DIVISI_PELAPORAN': [
        {
            title: 'OP Reports',
            items: [
                { href: '/dashboard/op', label: 'OP Dashboard', icon: LayoutDashboard },
                { href: '/dashboard/op/reports', label: 'All Reports', icon: ClipboardList },
            ]
        },
        {
            title: 'HT Reports',
            items: [
                { href: '/dashboard/ht', label: 'HT Dashboard', icon: LayoutDashboard },
                { href: '/dashboard/ht/reports', label: 'All Reports', icon: ClipboardList },
            ]
        }
    ],

    // ─── ESKALASI ──────────────────────────────────────────────────────────────
    /** Konfigurasi navigasi untuk role DIVISI_ESKALASI */
    'DIVISI_ESKALASI': [
        {
            title: 'Escalation Center',
            items: [
                { href: '/dashboard/eskalasi/select', label: 'Select Division', icon: Layers },
            ]
        }
    ],

    // ─── SUPER ADMIN ─────────────────────────────────────────────────────────
    'SUPER_ADMIN': [
        {
            title: 'Command Center',
            items: [
                { href: '/dashboard/analyst', label: 'Dashboard', icon: LayoutDashboard },
                { href: '/dashboard/analyst/import', label: 'Import Data', icon: FolderOpen },
                { href: '/dashboard/employee/new', label: 'Create Report', icon: Plane },
            ]
        },
        {
            title: 'Super Admin',
            items: [
                { href: '/dashboard/admin/users', label: 'User Management', icon: Users },
                { href: '/dashboard/admin/security', label: 'Security', icon: Shield },
                { href: '/dashboard/admin/external-links', label: 'External Links', icon: Link2 },
            ]
        },
        {
            title: 'Schedule',
            items: [
                { href: '/dashboard/analyst/notifications', label: 'Notifications', icon: Bell },
            ]
        }
    ],

    // ─── ANALYST ──────────────────────────────────────────────────────────────
    /** Konfigurasi navigasi untuk role ANALYST (dan SUPER_ADMIN) */
    'ANALYST': [
        {
            title: 'Command Center',
            items: [
                { href: '/dashboard/analyst', label: 'Dashboard', icon: LayoutDashboard },
                { href: '/dashboard/analyst/reports', label: 'Reports', icon: ClipboardList },
                { href: '/dashboard/analyst/ai-reports', label: 'AI Reports', icon: Brain },
                { href: '/dashboard/analyst/builder', label: 'Explore & Build', icon: Hash },
                { href: '/dashboard/analyst/dashboards', label: 'Custom Dashboards', icon: FolderOpen },
                { href: '/dashboard/analyst/import', label: 'Import Data', icon: FolderOpen },
                { href: '/dashboard/analyst/documents', label: 'Documents', icon: BookOpen },
                { href: '/dashboard/employee/new', label: 'Create Report', icon: Plane },
            ]
        },
        {
            title: 'Schedule',
            items: [
                { href: '/dashboard/analyst/calendar', label: 'Event Calendar', icon: Calendar },
                { href: '/dashboard/analyst/meetings', label: 'Meeting Calendar', icon: Calendar },
                { href: '/dashboard/analyst/notifications', label: 'Notifications', icon: Bell },
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
export const GET_LINKS_KEY = (role: string): string => {
    const r = (role || '').toUpperCase();

    if (r.includes('SUPER') || r === 'ADMIN') return 'SUPER_ADMIN';
    if (r === 'ANALYST') return 'ANALYST';
    if (r === 'MANAGER_CABANG') return 'MANAGER';
    if (r === 'STAFF_CABANG') return 'STAFF_CABANG';

    if (r === 'DIVISI_ESKALASI') {
        return 'DIVISI_ESKALASI';
    }

    if (r === 'DIVISI_OS' || r === 'PARTNER_OS') return 'OS';
    if (r === 'DIVISI_HC' || r === 'PARTNER_HC') return 'HC';
    if (r === 'DIVISI_OP' || r === 'PARTNER_OP') return 'OP';
    if (r === 'DIVISI_HT' || r === 'PARTNER_HT') return 'HT';

    return 'EMPLOYEE';
};
