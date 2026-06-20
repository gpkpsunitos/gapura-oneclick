/**
 * @file
 * 
 * File ini berisi halaman library dokumen Divisi HC (Human Capital),
 * menampilkan manajemen dan akses dokumen untuk divisi HC.
 */

import { HCLibraryClient } from '@/components/hc/HCLibraryClient';

/**
 * Komponen halaman library dokumen Divisi HC (Human Capital)
 * Menampilkan manajemen dan akses dokumen untuk divisi HC
 * @returns {JSX.Element} Tampilan halaman library dokumen Divisi HC
 */
export default function HCLibraryPage() {
    return <HCLibraryClient />;
}
