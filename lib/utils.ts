import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function isDemoMode() {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('demo_mode') === 'true' || 
           new URLSearchParams(window.location.search).get('demo') === '1';
}

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
 * Formats a date string, object, or number into "DD MM YYYY"
 * Complexity: Time O(1) | Space O(1)
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
