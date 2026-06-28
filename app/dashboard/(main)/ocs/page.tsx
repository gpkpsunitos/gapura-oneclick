import { DivisionDashboardClientLoader } from '@/components/dashboard/DivisionDashboardClientLoader';
import { DIVISIONS } from '@/lib/constants/divisions';
export default function OSDashboard() {
    return <DivisionDashboardClientLoader division={DIVISIONS.OS} />;
}
