import type { Report, SessionPayload } from '@/types';

function normalized(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

export function canViewReport(payload: SessionPayload, report: Report): boolean {
  if (payload.role === 'STAFF_CABANG') {
    const payloadEmail = normalized(payload.email);
    const payloadName = normalized(payload.full_name);
    return Boolean(
      report.user_id === payload.id ||
      (payload.station_id && report.station_id === payload.station_id) ||
      (payloadEmail && normalized(report.reporter_email) === payloadEmail) ||
      (payloadName && normalized(report.reporter_name) === payloadName)
    );
  }

  if (payload.role === 'MANAGER_CABANG') {
    return Boolean(payload.station_id && report.station_id === payload.station_id);
  }

  return true;
}
