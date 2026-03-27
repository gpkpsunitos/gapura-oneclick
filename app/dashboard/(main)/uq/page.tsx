'use client';

import { DivisionAnalystDashboard } from '@/components/dashboard/DivisionAnalystDashboard';
import { DIVISIONS } from '@/lib/constants/divisions';

export default function UQDashboard() {
    return <DivisionAnalystDashboard division={DIVISIONS.UQ} enforceDivisionScope={false} />;
}
