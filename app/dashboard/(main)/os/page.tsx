'use client';

import { DivisionAnalystDashboard } from '@/components/dashboard/DivisionAnalystDashboard';
import { DIVISIONS } from '@/lib/constants/divisions';

export default function OSDashboard() {
    return <DivisionAnalystDashboard division={DIVISIONS.OS} />;
}
