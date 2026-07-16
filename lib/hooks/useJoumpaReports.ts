'use client';

import { useCallback, useMemo } from 'react';
import { useData } from '@/lib/swr';
import { mergeReportUpdate } from '@/lib/report-cache';
import type { Report } from '@/types';

type JoumpaReportsResponse = { reports?: Report[] };

export function useJoumpaReports() {
  const { data, mutate } = useData<JoumpaReportsResponse>('/api/joumpa');
  const reports = useMemo(() => data?.reports ?? [], [data]);

  const refresh = useCallback(() => mutate(), [mutate]);
  const patchReport = useCallback((updatedReport: Report) => mutate(
    (current) => current
      ? { ...current, reports: mergeReportUpdate(current.reports, updatedReport) }
      : current,
    false,
  ), [mutate]);

  return { reports, refresh, patchReport };
}
