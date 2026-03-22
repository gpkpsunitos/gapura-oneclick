'use client';

import { useState, useEffect } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { CalendarEvent } from '@/types';
import { PrismInput } from '@/components/ui/PrismInput';
import { PrismButton } from '@/components/ui/PrismButton';
import { Check, X, Trash2, MoreHorizontal } from 'lucide-react';

interface QuickEditPopoverProps {
  event: CalendarEvent;
  open: boolean;
  onClose: () => void;
  onSave: (eventId: string, updates: Partial<CalendarEvent>) => Promise<void>;
  onDelete: (eventId: string) => Promise<void>;
  onMoreOptions: () => void;
}

export function QuickEditPopover({
  event,
  open,
  onClose,
  onSave,
  onDelete,
  onMoreOptions,
}: QuickEditPopoverProps) {
  const [title, setTitle] = useState(event.title);
  const [eventDate, setEventDate] = useState(event.event_date);
  const [eventTime, setEventTime] = useState(event.event_time || '');
  const [meetingMinutesLink, setMeetingMinutesLink] = useState(event.meeting_minutes_link || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setTitle(event.title);
    setEventDate(event.event_date);
    setEventTime(event.event_time || '');
    setMeetingMinutesLink(event.meeting_minutes_link || '');
  }, [event]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      const updates: Partial<CalendarEvent> = {};

      if (title !== event.title) updates.title = title;
      if (eventDate !== event.event_date) updates.event_date = eventDate;
      if (eventTime !== (event.event_time || '')) updates.event_time = eventTime || null;
      if (meetingMinutesLink !== (event.meeting_minutes_link || '')) {
        updates.meeting_minutes_link = meetingMinutesLink || null;
      }

      if (Object.keys(updates).length === 0) {
        onClose();
        return;
      }

      await onSave(event.id, updates);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this event?')) return;

    try {
      setSaving(true);
      await onDelete(event.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete event');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Popover.Portal>
        <Popover.Content
          side="right"
          align="start"
          sideOffset={8}
          className="z-50 w-80 rounded-xl border border-[oklch(0.92_0.01_90/0.8)] bg-[oklch(0.99_0.005_90/0.92)] backdrop-blur-[24px] shadow-spatial-lg"
          onKeyDown={handleKeyDown}
        >
          <div className="p-4 space-y-3">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Title</label>
              <PrismInput
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Event title"
                autoFocus
                maxLength={200}
              />
            </div>

            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Date</label>
              <PrismInput
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Time (optional)</label>
              <PrismInput
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                placeholder="HH:MM"
              />
            </div>

            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">
                Meeting Minutes Link (optional)
              </label>
              <PrismInput
                type="url"
                value={meetingMinutesLink}
                onChange={(e) => setMeetingMinutesLink(e.target.value)}
                placeholder="https://..."
              />
            </div>

            {error && (
              <div className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded">
                {error}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <PrismButton
                onClick={handleSave}
                disabled={saving || !title.trim()}
                className="flex-1"
              >
                <Check className="w-4 h-4 mr-1" />
                Save
              </PrismButton>

              <button
                onClick={onClose}
                disabled={saving}
                className="px-3 py-2 rounded-lg border border-[oklch(0.92_0.01_90/0.8)] hover:bg-[var(--surface-3)] transition-all duration-200"
              >
                <X className="w-4 h-4 text-[var(--text-muted)]" />
              </button>

              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-3 py-2 rounded-lg border border-[oklch(0.6_0.22_25/0.2)] hover:bg-[oklch(0.6_0.22_25/0.08)] transition-all duration-200"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>

            <button
              onClick={() => {
                onClose();
                onMoreOptions();
              }}
              className="w-full text-xs text-[var(--brand-primary)] hover:underline flex items-center justify-center gap-1 py-1"
            >
              <MoreHorizontal className="w-3 h-3" />
              More options...
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
