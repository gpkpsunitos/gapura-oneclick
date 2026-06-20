/**
 * @file
 * 
 * File ini berisi halaman home yang mengalihkan ke halaman login
 */

import { redirect } from 'next/navigation';

/**
 * Komponen halaman home
 * Mengalihkan otomatis ke halaman login
 * @returns Tidak pernah dikarenakan redirect
 * @example
 * ```tsx
 * // Route: /
 * <Home />
 * ```
 */
export default function Home() {
    redirect('/auth/login');
}
