/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi halaman library dokumen Divisi HC (Human Capital),
 * menampilkan manajemen dan akses dokumen untuk divisi HC.
 */

import { HCEdaranTable } from '@/components/hc/HCEdaranTable';

/**
 * Komponen halaman library dokumen Divisi HC (Human Capital)
 * Menampilkan manajemen dan akses dokumen untuk divisi HC
 * @returns {JSX.Element} Tampilan halaman library dokumen Divisi HC
 */
export default function HCLibraryPage() {
    return (
        <HCEdaranTable
            mode="manage"
            title="Edaran HC"
            description="Kelola daftar kegiatan HC dan tautan dokumentasinya."
        />
    );
}
