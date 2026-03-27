'use client';

import { DivisionAnalystDashboard } from '@/components/dashboard/DivisionAnalystDashboard';
import { DIVISIONS } from '@/lib/constants/divisions';

export default function OTDashboard() {
    return <DivisionAnalystDashboard division={DIVISIONS.OT} enforceDivisionScope={false} />;
}
