'use client';

import { useMemo } from 'react';
import { useData } from '@/lib/swr';
import type { Report } from '@/types';

export function useJoumpaReports(): Report[] {
  const { data } = useData<{ reports?: Report[] }>('/api/joumpa');
  return useMemo(() => data?.reports ?? [], [data]);
}
