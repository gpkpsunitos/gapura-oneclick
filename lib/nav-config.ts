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
    GraduationCap,
    ExternalLink
} from 'lucide-react';

export interface NavItemConfig {
    href: string;
    label: string;
    icon: any;
    count?: number;
    external?: boolean;
}

export interface NavGroupConfig {
    title: string;
    items: NavItemConfig[];
}

const LOOKER_JOUMPA = 'https://lookerstudio.google.com/reporting/6a7aba44-6bd1-439f-a5d2-8bed4af56448';
const LOOKER_SLA    = 'https://lookerstudio.google.com/reporting/6a7aba44-6bd1-439f-a5d2-8bed4af56448';

export const LINKS_CONFIG: Record<string, NavGroupConfig[]> = {
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
    'OS': [
        {
            title: 'Monitoring',
            items: [
                { href: '/dashboard/os', label: 'Dashboard', icon: LayoutDashboard },
                // Joumpa & SLA redirect to Looker until internal dashboards are stable
                { href: LOOKER_JOUMPA, label: 'Dashboard Joumpa', icon: ExternalLink, external: true },
                { href: LOOKER_SLA, label: 'Dashboard SLA', icon: ExternalLink, external: true },
            ]
        },
        {
            title: 'Analysis',
            items: [
                { href: '/dashboard/os/ai-reports', label: 'AI Reports', icon: Brain },
            ]
        },
        {
            title: 'Schedule',
            items: [
                { href: '/dashboard/os/calendar', label: 'Event Calendar', icon: Calendar },
                { href: '/dashboard/os/meeting-calendar', label: 'Meeting Calendar', icon: Calendar },
            ]
        }
    ],

    // OT – Divisi Teknik (standalone; also included in DIVISI_PELAPORAN)
    'OT': [
        {
            title: 'Divisi Teknik',
            items: [
                { href: '/dashboard/ot', label: 'OT Dashboard', icon: LayoutDashboard },
                { href: '/dashboard/ot/dispatched', label: 'Laporan Divisi', icon: Inbox },
            ]
        },
        {
            title: 'Analysis',
            items: [
                { href: '/dashboard/ot/ai-reports', label: 'AI Reports', icon: Brain },
            ]
        }
    ],

    // OP – Divisi Operasi (standalone; also included in DIVISI_PELAPORAN)
    'OP': [
        {
            title: 'Divisi Operasi',
            items: [
                { href: '/dashboard/op', label: 'OP Dashboard', icon: LayoutDashboard },
                { href: '/dashboard/op/dispatched', label: 'Laporan Divisi', icon: Inbox },
            ]
        },
        {
            title: 'Analysis',
            items: [
                { href: '/dashboard/op/ai-reports', label: 'AI Reports', icon: Brain },
            ]
        }
    ],

    // UQ – Divisi Quality (standalone; also included in DIVISI_PELAPORAN)
    'UQ': [
        {
            title: 'Divisi Quality',
            items: [
                { href: '/dashboard/uq', label: 'UQ Dashboard', icon: LayoutDashboard },
                { href: '/dashboard/uq/dispatched', label: 'Laporan Divisi', icon: Inbox },
            ]
        },
        {
            title: 'Analysis',
            items: [
                { href: '/dashboard/uq/ai-reports', label: 'AI Reports', icon: Brain },
            ]
        }
    ],

    // HC – Human Capital
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
    'HT': [
        {
            title: 'Human Training',
            items: [
                { href: '/dashboard/ht', label: 'HT Dashboard', icon: LayoutDashboard },
                { href: '/dashboard/ht/dispatched', label: 'Laporan Divisi', icon: Inbox },
                { href: '/dashboard/ht/training-hub', label: 'Training Hub', icon: GraduationCap },
            ]
        }
    ],

    // ─── DIVISI PELAPORAN (UQ + OP + O/OT + HT merged sidebar) ────────────────
    'DIVISI_PELAPORAN': [
        {
            title: 'Laporan UQ',
            items: [
                { href: '/dashboard/uq', label: 'UQ Dashboard', icon: LayoutDashboard },
                { href: '/dashboard/uq/dispatched', label: 'Laporan Masuk UQ', icon: Inbox },
                { href: '/dashboard/uq/ai-reports', label: 'AI Reports UQ', icon: Brain },
            ]
        },
        {
            title: 'Laporan OP',
            items: [
                { href: '/dashboard/op', label: 'OP Dashboard', icon: LayoutDashboard },
                { href: '/dashboard/op/dispatched', label: 'Laporan Masuk OP', icon: Inbox },
                { href: '/dashboard/op/ai-reports', label: 'AI Reports OP', icon: Brain },
            ]
        },
        {
            title: 'Laporan OT',
            items: [
                { href: '/dashboard/ot', label: 'OT Dashboard', icon: LayoutDashboard },
                { href: '/dashboard/ot/dispatched', label: 'Laporan Masuk OT', icon: Inbox },
                { href: '/dashboard/ot/ai-reports', label: 'AI Reports OT', icon: Brain },
            ]
        },
        {
            title: 'Laporan HT',
            items: [
                { href: '/dashboard/ht', label: 'HT Dashboard', icon: LayoutDashboard },
                { href: '/dashboard/ht/dispatched', label: 'Laporan Masuk HT', icon: Inbox },
                { href: '/dashboard/ht/training-hub', label: 'Training Hub HT', icon: GraduationCap },
            ]
        }
    ],

    // ─── ESKALASI ──────────────────────────────────────────────────────────────
    'DIVISI_ESKALASI': [
        {
            title: 'Pusat Eskalasi',
            items: [
                { href: '/dashboard/eskalasi', label: 'Dashboard', icon: LayoutDashboard },
                { href: '/dashboard/eskalasi/laporan-divisi', label: 'Semua Laporan', icon: Layers },
            ]
        },
        {
            title: 'Laporan Per Divisi',
            items: [
                { href: '/dashboard/eskalasi/op', label: 'Divisi OP', icon: FolderOpen },
                { href: '/dashboard/eskalasi/os', label: 'Divisi OS', icon: FolderOpen },
                { href: '/dashboard/eskalasi/uq', label: 'Divisi UQ', icon: FolderOpen },
                { href: '/dashboard/eskalasi/ot', label: 'Divisi OT', icon: FolderOpen },
                { href: '/dashboard/eskalasi/ht', label: 'Divisi HT', icon: FolderOpen },
            ]
        }
    ],

    // ─── SUPER ADMIN / ANALYST (merged) ───────────────────────────────────────
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
export const GET_LINKS_KEY = (role: string, pathname?: string): string => {
    const r = (role || '').toUpperCase();

    if (r.includes('SUPER') || r === 'ADMIN') return 'ANALYST';  // merged with Analyst
    if (r === 'ANALYST') return 'ANALYST';
    if (r === 'MANAGER_CABANG') return 'MANAGER';

    // Eskalasi retains context-switching behaviour
    if (r === 'DIVISI_ESKALASI') {
        if (pathname?.startsWith('/dashboard/op')) return 'OP';
        if (pathname?.startsWith('/dashboard/os')) return 'OS';
        if (pathname?.startsWith('/dashboard/ot')) return 'OT';
        if (pathname?.startsWith('/dashboard/uq')) return 'UQ';
        if (pathname?.startsWith('/dashboard/hc')) return 'HC';
        if (pathname?.startsWith('/dashboard/ht')) return 'HT';
        return 'DIVISI_ESKALASI';
    }

    if (r === 'DIVISI_OS' || r === 'PARTNER_OS') return 'OS';
    if (r === 'DIVISI_HC' || r === 'PARTNER_HC') return 'HC';

    // UQ / OP / OT / HT → all use shared DIVISI_PELAPORAN sidebar
    if (r === 'DIVISI_UQ' || r === 'PARTNER_UQ') return 'DIVISI_PELAPORAN';
    if (r === 'DIVISI_OP' || r === 'PARTNER_OP') return 'DIVISI_PELAPORAN';
    if (r === 'DIVISI_OT' || r === 'PARTNER_OT') return 'DIVISI_PELAPORAN';
    if (r === 'DIVISI_HT' || r === 'PARTNER_HT') return 'DIVISI_PELAPORAN';

    return 'EMPLOYEE';
};
