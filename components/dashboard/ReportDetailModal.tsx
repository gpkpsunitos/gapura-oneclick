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
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

  useEffect(() => {
    if (!effectiveIsOpen || !initialReport) { setFullReport(null); return; }
    let alive = true;
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

  if (!effectiveIsOpen || !initialReport || !mounted) return null;

  const displayReport = fullReport || initialReport;

  const handleStatus = onUpdateStatus
    ? async (id: string, status: string) => {
        await onUpdateStatus(id, status);
        try {
          const res = await fetch(`/api/reports/${id}`);
          if (res.ok) setFullReport(await res.json());
        } catch { /* ignore */ }
        onRefresh?.();
      }
    : undefined;

  return (
    <AppleReportDetail
      report={displayReport}
      onClose={onClose}
      onUpdateStatus={handleStatus}
    />
  );
}
