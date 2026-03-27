'use client';

import { DivisionAnalystDashboard } from '@/components/dashboard/DivisionAnalystDashboard';
import type { DivisionConfig } from '@/components/dashboard/AnalyticsDashboard';

const divisionConfig: DivisionConfig = {
  code: 'ANALYST',
  name: 'Analyst Dashboard Cabang',
  color: '#0ea5e9',
  gradient: 'from-sky-500/15 via-sky-400/10 to-sky-300/5',
  bgLight: 'bg-sky-500/5',
  textColor: 'text-sky-600',
};

export default function EmployeeAnalystDashboardPage() {
  return <DivisionAnalystDashboard division={divisionConfig} />;
}
