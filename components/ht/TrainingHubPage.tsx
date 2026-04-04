/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi komponen halaman Training Hub untuk manajemen materi training
 */

'use client';

import { DivisionDocumentLibrary } from '@/components/workspace/DivisionDocumentLibrary';

/**
 * Komponen halaman Training Hub
 * Menampilkan library dokumen training dengan konfigurasi berdasarkan audience
 * @param props - Props komponen
 * @param props.audience - Audience ('division' atau 'branch')
 * @returns JSX element halaman Training Hub
 * @example
 * ```tsx
 * <TrainingHubPage audience="division" />
 * ```
 */
export function TrainingHubPage({ audience }: { audience: 'division' | 'branch' }) {
    return (
        <DivisionDocumentLibrary
            division="HT"
            experience={audience === 'division' ? 'manage' : 'inbox'}
            forceManage={audience === 'division'}
            title={audience === 'division' ? 'Training Hub HT' : 'Training Hub'}
            description={audience === 'division' ? 'Kelola materi training dan attachment.' : ''}
            showOfflineTips={audience === 'division'}
        />
    );
}
