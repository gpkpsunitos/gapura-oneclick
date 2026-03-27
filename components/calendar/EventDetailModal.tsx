'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Clock, FileText, Repeat, User, ExternalLink } from 'lucide-react';
import { CalendarEvent } from '@/types';
import { PrismButton } from '@/components/ui/PrismButton';

interface EventDetailModalProps {
  event: CalendarEvent | null;
  open: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onQuickEdit?: () => void;
}

export function EventDetailModal({
  event,
  open,
  onClose,
  onEdit,
  onQuickEdit,
}: EventDetailModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted || !open || !event) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeStr: string | null | undefined) => {
    if (!timeStr) return '-';
    const [hours, minutes] = timeStr.split(':');
    return `${hours}:${minutes}`;
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md bg-[var(--surface-1)] border border-[oklch(0.92_0.01_90/0.8)] rounded-2xl shadow-spatial-lg animate-scale-in">
        <div className="flex items-center justify-between p-4 border-b border-[oklch(0.94_0.01_90/0.6)]">
          <h2 className="text-lg font-bold font-display tracking-tight text-[var(--text-primary)]">Event Details</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[var(--surface-3)] transition-all duration-200"
          >
            <X className="w-5 h-5 text-[var(--text-muted)]" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <h3 className="text-xl font-bold font-display tracking-tight text-[var(--text-primary)]">{event.title}</h3>
            {event.is_recurring && (
              <div className="flex items-center gap-1 mt-2 text-[var(--accent-purple)] text-sm">
                <Repeat className="w-4 h-4" />
                <span>Recurring ({event.recurrence_pattern})</span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-[var(--text-muted)] mt-0.5" />
              <div>
                <p className="text-sm text-[var(--text-muted)]">
                  {event.event_end_date && event.event_end_date !== event.event_date ? 'Date Range' : 'Date'}
                </p>
                <p className="text-[var(--text-primary)]">
                  {formatDate(event.event_date)}
                  {event.event_end_date && event.event_end_date !== event.event_date && (
                    <> – {formatDate(event.event_end_date)}</>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-[var(--text-muted)] mt-0.5" />
              <div>
                <p className="text-sm text-[var(--text-muted)]">Time</p>
                <p className="text-[var(--text-primary)]">{formatTime(event.event_time)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-[var(--text-muted)] mt-0.5" />
              <div>
                <p className="text-sm text-[var(--text-muted)]">Created by</p>
                <p className="text-[var(--text-primary)]">{event.created_by_name || 'Unknown'}</p>
              </div>
            </div>

            {event.meeting_minutes_link && (
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-[var(--text-muted)] mt-0.5" />
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Meeting Minutes</p>
                  <a
                    href={event.meeting_minutes_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--brand-primary)] hover:underline flex items-center gap-1"
                  >
                    Open Link
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

            {event.notes && (
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-[var(--text-muted)] mt-0.5" />
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Notes</p>
                  <p className="text-[var(--text-primary)] whitespace-pre-wrap">{event.notes}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {(onEdit || onQuickEdit) && (
          <div className="flex justify-end gap-2 p-4 border-t border-[oklch(0.94_0.01_90/0.6)]">
            {onQuickEdit && (
              <PrismButton variant="secondary" onClick={onQuickEdit}>
                Quick Edit
              </PrismButton>
            )}
            {onEdit && (
              <PrismButton onClick={onEdit}>
                Edit Event
              </PrismButton>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
