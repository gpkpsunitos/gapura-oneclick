'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Report } from '@/types';
import { ReportDetailView, type StatusUpdateDetails } from './ReportDetailView';

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
    userRole = 'PARTNER_ADMIN' 
}: ReportDetailModalProps) {
    const effectiveIsOpen = isOpen ?? !!initialReport;
    const [fullReport, setFullReport] = useState<Report | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Reset when modal closes or report changes
    useEffect(() => {
        if (!effectiveIsOpen || !initialReport) {
            setFullReport(null);
            return;
        }

        const fetchFullDetail = async () => {
            setLoadingDetail(true);
            try {
                const res = await fetch(`/api/reports/${initialReport.id}`);
                if (res.ok) {
                    const data = await res.json();
                    setFullReport(data);
                } else {
                     setFullReport(initialReport);
                }
            } catch (error) {
                console.error("Failed to fetch full report detail", error);
                setFullReport(initialReport);
            } finally {
                setLoadingDetail(false);
            }
        };

        fetchFullDetail();
    }, [effectiveIsOpen, initialReport]);

    if (!effectiveIsOpen || !initialReport || !mounted) return null;

    const displayReport = fullReport || initialReport;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex md:items-center justify-center p-0 md:p-4 overflow-hidden" style={{ width: '100vw', height: '100vh', maxWidth: '100vw', maxHeight: '100vh' }}>
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300 animate-fade-in"
                onClick={onClose}
                style={{ width: '100%', height: '100%' }}
            />

            {/* Modal Content - Bottom Sheet on Mobile, Centered on Desktop */}
            <div 
                className={cn(
                    "relative z-10 bg-white shadow-2xl flex flex-col w-full",
                    "max-h-[95vh] md:max-h-[90vh] md:max-w-4xl md:rounded-2xl",
                    "bottom-0 fixed md:relative",
                    "rounded-t-[2.5rem] md:rounded-2xl",
                    "pb-[env(safe-area-inset-bottom)] md:pb-0",
                    "transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
                    "animate-in slide-in-from-bottom md:zoom-in-95"
                )}
            >
                {/* Mobile Drag Indicator */}
                <div className="md:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 shrink-0" />
                <div className="relative flex-1 overflow-hidden flex flex-col rounded-t-[2.5rem] md:rounded-2xl">
                     <button 
                        onClick={onClose} 
                        className="absolute top-5 right-6 md:top-6 md:right-8 z-50 p-2 md:p-3 bg-slate-100/80 backdrop-blur-sm hover:bg-slate-200 rounded-full transition-all duration-200 border border-slate-200/50"
                    >
                        <X size={18} className="text-slate-600" />
                    </button>
                    
                    <div className="flex-1 overflow-y-auto bg-slate-50/20 relative scrollbar-hide">
                        {loadingDetail && (
                            <div className="sticky top-0 left-0 w-full h-1 bg-white/50 overflow-hidden z-[60]">
                                <div className="h-full bg-emerald-500 animate-progress-indeterminate origin-left" />
                            </div>
                        )}
                        <ReportDetailView 
                            report={displayReport} 
                            onUpdateStatus={onUpdateStatus}
                            userRole={userRole}
                            isModal={true}
                             onRefresh={(updatedReport?: Report) => {
                                 if (updatedReport) {
                                     setFullReport(updatedReport);
                                     if (onRefresh) onRefresh();
                                 } else {
                                     if (onRefresh) onRefresh();
                                 }
                                 
                                 // Handle Report Transfer (ID Change)
                                 if (updatedReport && updatedReport.id && initialReport?.id && updatedReport.id !== initialReport.id) {
                                     // ID changed (moved to another sheet), so current ID is now invalid (404)
                                     // Best UX: Close modal as "context" is lost/changed
                                     onClose();
                                     return;
                                 }

                                 if (initialReport?.id) {
                                     fetch(`/api/reports/${initialReport.id}`)
                                        .then(res => {
                                            if (!res.ok) {
                                                if (res.status === 404) onClose(); // Auto-close if not found
                                                throw new Error('Failed to fetch');
                                            }
                                            return res.json();
                                        })
                                        .then(data => setFullReport(data))
                                        .catch(err => console.error("Error refreshing detail:", err));
                                 }
                             }}
                        />
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
