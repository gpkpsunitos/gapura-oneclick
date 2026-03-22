'use client';

import { DivisionDocumentLibrary } from '@/components/workspace/DivisionDocumentLibrary';

export function TrainingHubPage({ audience }: { audience: 'division' | 'branch' }) {
    return (
        <DivisionDocumentLibrary
            division="HT"
            experience={audience === 'division' ? 'manage' : 'inbox'}
            forceManage={audience === 'division'}
            title={audience === 'division' ? 'Training Hub HT' : 'Training Hub'}
            description={
                audience === 'division'
                    ? 'Kelola materi training dan attachment.'
                    : 'Buka materi training yang relevan untuk Anda.'
            }
            showOfflineTips
        />
    );
}
