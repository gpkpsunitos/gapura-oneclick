import { DivisionDashboardClientLoader } from '@/components/dashboard/DivisionDashboardClientLoader';
import { DIVISIONS } from '@/lib/constants/divisions';

export default function AnalystPage() {
    return <DivisionDashboardClientLoader division={DIVISIONS.ANALYST} />;
}
