
import { DivisionDashboardClientLoader } from '@/components/dashboard/DivisionDashboardClientLoader';
import { DIVISIONS } from '@/lib/constants/divisions';

export default function HTDashboard() {
    return <DivisionDashboardClientLoader division={DIVISIONS.HT} />;
}
