/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi utility functions umum untuk aplikasi
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Menggabungkan class names dengan tailwind-merge dan clsx
 * @param {...ClassValue[]} inputs - Class values yang akan digabungkan
 * @returns {string} String class yang sudah digabungkan dan di-resolve
 * @example
 * ```ts
 * const className = cn('px-4', isActive && 'bg-blue-500', 'py-2');
 * ```
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Mengecek apakah aplikasi dalam mode demo
 * @returns {boolean} true jika mode demo aktif
 * @example
 * ```ts
 * if (isDemoMode()) {
 *   // Gunakan data dummy
 * }
 * ```
 */
export function isDemoMode() {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('demo_mode') === 'true' || 
           new URLSearchParams(window.location.search).get('demo') === '1';
}

/**
 * Fetch dengan header demo jika dalam mode demo
 * @param {string} url - URL endpoint
 * @param {RequestInit} [options] - Opsi fetch (opsional)
 * @returns {Promise<Response>} Response dari fetch
 * @example
 * ```ts
 * const response = await fetchWithDemo('/api/reports');
 * ```
 */
export async function fetchWithDemo(url: string, options: RequestInit = {}) {
    const isDemo = isDemoMode();
    const headers = new Headers(options.headers);
    
    if (isDemo) {
        headers.set('x-demo', 'true');
    }
    
    return fetch(url, {
        ...options,
        headers,
    });
}

/**
 * Memformat tanggal dalam format "DD MM YYYY"
 * Kompleksitas: Waktu O(1) | Ruang O(1)
 * @param {string | Date | number | undefined | null} dateInput - Input tanggal (string, Date, number, atau undefined/null)
 * @returns {string} Tanggal yang diformat atau "N/A" jika input tidak valid
 * @example
 * ```ts
 * formatDate('2024-01-15'); // '15 01 2024'
 * formatDate(new Date()); // 'DD MM YYYY'
 * formatDate(null); // 'N/A'
 * ```
 */
export function formatDate(dateInput: string | Date | number | undefined | null): string {
    if (!dateInput) return "N/A";
    
    try {
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return "N/A";
        
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        
        return `${day} ${month} ${year}`;
    } catch {
        return "N/A";
    }
}
