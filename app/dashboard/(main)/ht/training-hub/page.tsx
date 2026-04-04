/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi halaman Training Hub untuk Divisi HT,
 * menampilkan berbagai materi pelatihan dan sumber daya pembelajaran.
 */

import { TrainingHubPage } from '@/components/ht/TrainingHubPage';

/**
 * Komponen halaman Training Hub untuk Divisi HT
 * Menampilkan materi pelatihan dan sumber daya pembelajaran untuk audience divisi
 * @returns {JSX.Element} Tampilan halaman Training Hub
 */
export default function HTTrainingHubPage() {
    return <TrainingHubPage audience="division" />;
}
