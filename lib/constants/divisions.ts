/**
 * @file
 * 
 * File ini berisi konfigurasi divisi dengan warna dan styling untuk UI
 */

/**
 * Konfigurasi divisi untuk styling UI
 * @interface DivisionConfig
 */
export interface DivisionConfig {
    /** Kode divisi */
    code: string;
    /** Nama divisi */
    name: string;
    /** Warna utama dalam format hex */
    color: string;
    /** Kelas gradient Tailwind */
    gradient: string;
    /** Kelas background light */
    bgLight: string;
    /** Kelas warna teks */
    textColor: string;
    /** Kelas border (opsional) */
    borderColor?: string;
}

/**
 * Daftar konfigurasi divisi dengan kode, nama, dan styling
 * @constant DIVISIONS
 */
export const DIVISIONS: Record<string, DivisionConfig> = {
    OP: {
        code: 'OP',
        name: 'Operasi',
        color: '#06b6d4',
        gradient: 'from-cyan-500 via-cyan-600 to-teal-600',
        bgLight: 'bg-cyan-50',
        textColor: 'text-cyan-600',
    },
    OS: {
        code: 'OS',
        name: 'Monitoring',
        color: '#10b981',
        gradient: 'from-emerald-500 via-emerald-600 to-teal-600',
        bgLight: 'bg-emerald-50',
        textColor: 'text-emerald-600',
    },
    HC: {
        code: 'HC',
        name: 'Human Capital',
        color: '#8b5cf6',
        gradient: 'from-violet-500 via-fuchsia-600 to-rose-500',
        bgLight: 'bg-violet-50',
        textColor: 'text-violet-600',
        borderColor: 'border-violet-200',
    },
    HT: {
        code: 'HT',
        name: 'Human Training',
        color: '#0ea5e9',
        gradient: 'from-sky-500 via-blue-600 to-indigo-600',
        bgLight: 'bg-sky-50',
        textColor: 'text-sky-600',
        borderColor: 'border-sky-200',
    },
    ANALYST: {
        code: 'ANALYST',
        name: 'Analyst',
        color: '#10b981',
        gradient: 'from-emerald-500 via-emerald-600 to-teal-600',
        bgLight: 'bg-emerald-50',
        textColor: 'text-emerald-600',
    },
};
