'use client';

import { useEffect, useState } from 'react';
import { type Report } from '@/types';
import { AppleReportDetail } from './AppleReportDetail';
import type { StatusUpdateDetails } from './ReportDetailView';

export type { StatusUpdateDetails } from './ReportDetailView';

interface ReportDetailModalProps {
  isOpen?: boolean;
  onClose: () => void;
  report: Report | null;
  onUpdateStatus?: (reportId: string, status: string, notes?: string, evidenceUrl?: string, details?: StatusUpdateDetails) => Promise<void>;
  onRefresh?: () => Promise<void> | void;
  userRole?: string;
}

export function ReportDetailModal({
  isOpen,
  onClose,
  report: initialReport,
  onUpdateStatus,
  onRefresh,
}: ReportDetailModalProps) {
  const effectiveIsOpen = isOpen ?? !!initialReport;
  const [fullReport, setFullReport] = useState<Report | null>(null);
  const [fastComments, setFastComments] = useState<Report['comments'] | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

  const reportId = initialReport?.id;

  // Comments come from a DB-only endpoint that never waits on Google Sheets,
  // so they render instantly even while the full report fetch is still in flight.
  const refetchComments = async () => {
    if (!reportId) return;
    try {
      const res = await fetch(`/api/reports/${reportId}/comments`);
      if (res.ok) setFastComments(await res.json());
    } catch { /* ignore */ }
  };

  const refetchReport = async () => {
    await Promise.all([refetchComments(), (async () => {
      if (!reportId) return;
      try {
        const res = await fetch(`/api/reports/${reportId}`);
        if (res.ok) setFullReport(await res.json());
      } catch { /* ignore */ }
    })()]);
  };

  useEffect(() => {
    if (!effectiveIsOpen || !initialReport) { setFullReport(null); setFastComments(null); return; }
    let alive = true;
    // Fast comments first (instant), full report in parallel (may wait on Sheets).
    (async () => {
      try {
        const res = await fetch(`/api/reports/${initialReport.id}/comments`);
        if (alive && res.ok) setFastComments(await res.json());
      } catch { /* ignore */ }
    })();
    (async () => {
      try {
        const res = await fetch(`/api/reports/${initialReport.id}`);
        if (!alive) return;
        if (res.ok) setFullReport(await res.json());
        else setFullReport(initialReport);
      } catch {
        if (alive) setFullReport(initialReport);
      }
    })();
    return () => { alive = false; };
  }, [effectiveIsOpen, initialReport]);

  // Opening a report clears this user's unread comment notifications for it.
  useEffect(() => {
    if (!effectiveIsOpen || !reportId) return;
    fetch('/api/notifications/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId }),
    }).catch(() => {});
  }, [effectiveIsOpen, reportId]);

  if (!effectiveIsOpen || !initialReport || !mounted) return null;

  const base = fullReport || initialReport;
  // Prefer the fast comments; fall back to whatever the full report carried.
  const displayReport: Report = fastComments
    ? { ...base, comments: fastComments }
    : base;

  const handleStatus = onUpdateStatus
    ? async (id: string, status: string) => {
        await onUpdateStatus(id, status);
        await refetchReport();
        onRefresh?.();
      }
    : undefined;

  return (
    <AppleReportDetail
      report={displayReport}
      onClose={onClose}
      onUpdateStatus={handleStatus}
      onRefresh={refetchReport}
    />
  );
}
