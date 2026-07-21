import type { DashboardSourceKey, DashboardTabKey } from './contracts';

export interface DashboardSourceDefinition {
  readonly source: DashboardSourceKey;
  readonly label: string;
  readonly eligibility: string;
}

export const DASHBOARD_SOURCE_REGISTRY: Readonly<Record<DashboardTabKey, DashboardSourceDefinition>> = {
  summary: {
    source: 'ground_handling',
    label: 'Summary Report',
    eligibility: 'Every authorized Ground Handling report',
  },
  sqi: {
    source: 'ground_handling',
    label: 'Landside & Airside Detail Report',
    eligibility: 'Every authorized Ground Handling report',
  },
  joumpa: {
    source: 'joumpa',
    label: 'Joumpa Service',
    eligibility: 'Every authorized joumpa_reports_sync report',
  },
  gse: {
    source: 'ground_handling',
    label: 'GSE Performance Detail Report',
    eligibility: 'Every authorized Ground Handling report matching the canonical GSE rule',
  },
  cgo_cargo: {
    source: 'ground_handling',
    label: 'CGO Cargo Report',
    eligibility: 'Every authorized Ground Handling report whose canonical source is CGO',
  },
  delay: {
    source: 'ground_handling',
    label: 'Delay Code Report',
    eligibility: 'Every authorized applicable Ground Handling report, including blank delay codes in denominators',
  },
  status_details: {
    source: 'ground_handling',
    label: 'Reports Status Details',
    eligibility: 'Every authorized Ground Handling report',
  },
};

export function dashboardSourceForTab(tab: DashboardTabKey): DashboardSourceDefinition {
  return DASHBOARD_SOURCE_REGISTRY[tab];
}
