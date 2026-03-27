'use client';

import { DivisionAnalystDashboard } from '@/components/dashboard/DivisionAnalystDashboard';
import { DIVISIONS } from '@/lib/constants/divisions';

export default function HTDashboard() {
    return <DivisionAnalystDashboard division={DIVISIONS.HT} enforceDivisionScope={false} />;
}
