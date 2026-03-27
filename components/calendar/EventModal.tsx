'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, FileText, Repeat, CalendarRange } from 'lucide-react';
import { CalendarEvent, CreateCalendarEventInput, RecurrencePattern, CalendarType } from '@/types';
import { PrismInput } from '@/components/ui/PrismInput';
import { PrismButton } from '@/components/ui/PrismButton';
import { PrismSelect } from '@/components/ui/PrismSelect';

interface EventModalProps {
  open: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
  onDelete: (eventId: string) => Promise<void>;
  event: CalendarEvent | null;
  defaultDate?: Date;
  calendarType?: CalendarType;
}

export function EventModal({
  open,
  onClose,
  onSave,
  onDelete,
  event,
  defaultDate,
  calendarType = 'event',
}: EventModalProps) {
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [notes, setNotes] = useState('');
  const [meetingMinutesLink, setMeetingMinutesLink] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>('weekly');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [editScope, setEditScope] = useState<'single' | 'all'>('single');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [eventEndDate, setEventEndDate] = useState('');

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (open) {
      if (event) {
        setTitle(event.title);
        setEventDate(event.event_date);
        setEventTime(event.event_time || '');
        setNotes(event.notes || '');
        setMeetingMinutesLink(event.meeting_minutes_link || '');
        setIsRecurring(event.is_recurring);
        setRecurrencePattern(event.recurrence_pattern || 'weekly');
        setRecurrenceEndDate(event.recurrence_end_date || '');
        setIsMultiDay(!!event.event_end_date && event.event_end_date !== event.event_date);
        setEventEndDate(event.event_end_date || '');
      } else {
        setTitle('');
        setEventDate(defaultDate ? defaultDate.toISOString().split('T')[0] : '');
        setEventTime('');
        setNotes('');
        setMeetingMinutesLink('');
        setIsRecurring(false);
        setRecurrencePattern('weekly');
        setRecurrenceEndDate('');
        setIsMultiDay(false);
        setEventEndDate('');
      }
      setError('');
      setEditScope('single');
    }
  }, [open, event, defaultDate]);

  const handleSave = async () => {
    if (!title.trim() || !eventDate) {
      setError('Title and date are required');
      return;
    }

    if (isMultiDay && eventEndDate && eventEndDate < eventDate) {
      setError('End date must be on or after start date');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const payload: CreateCalendarEventInput = {
        title: title.trim(),
        event_date: eventDate,
        event_end_date: isMultiDay && eventEndDate ? eventEndDate : null,
        event_time: eventTime || null,
        notes: notes || null,
        meeting_minutes_link: meetingMinutesLink || null,
        calendar_type: calendarType,
        is_recurring: isRecurring,
        recurrence_pattern: isRecurring ? recurrencePattern : null,
        recurrence_end_date: isRecurring ? recurrenceEndDate : null,
      };

      let response: Response;

      if (event) {
        response = await fetch(`/api/calendar/events/${event.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, edit_scope: editScope }),
        });
      } else {
        response = await fetch('/api/calendar/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to save event');
      }

      await onSave();
    } catch (err: any) {
      setError(err.message || 'Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    if (!confirm('Delete this event?')) return;

    try {
      setSaving(true);
      await onDelete(event.id);
    } catch (err: any) {
      setError(err.message || 'Failed to delete event');
    } finally {
      setSaving(false);
    }
  };

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg bg-[var(--surface-1)] border border-[oklch(0.92_0.01_90/0.8)] rounded-2xl shadow-spatial-lg max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between p-4 border-b border-[oklch(0.94_0.01_90/0.6)]">
          <h2 className="text-lg font-bold font-display tracking-tight text-[var(--text-primary)]">
            {event ? 'Edit Event' : 'Create Event'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[var(--surface-3)] transition-all duration-200"
          >
            <X className="w-5 h-5 text-[var(--text-muted)]" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Title *</label>
            <PrismInput
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              maxLength={200}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">{isMultiDay ? 'Start Date *' : 'Date *'}</label>
              <PrismInput
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>
            {isMultiDay ? (
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1">End Date *</label>
                <PrismInput
                  type="date"
                  value={eventEndDate}
                  onChange={(e) => setEventEndDate(e.target.value)}
                  min={eventDate}
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1">Time</label>
                <PrismInput
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  placeholder="HH:MM"
                />
              </div>
            )}
          </div>

          <div className="pt-1">
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
              <input
                type="checkbox"
                checked={isMultiDay}
                onChange={(e) => {
                  setIsMultiDay(e.target.checked);
                  if (!e.target.checked) setEventEndDate('');
                }}
                className="w-4 h-4 rounded border-[oklch(0.85_0.02_90)] bg-[var(--surface-3)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
              />
              <CalendarRange className="w-4 h-4" />
              Multi-day Event
            </label>
          </div>

          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Meeting Minutes Link</label>
            <PrismInput
              type="url"
              value={meetingMinutesLink}
              onChange={(e) => setMeetingMinutesLink(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={3}
              maxLength={2000}
              className="w-full px-3 py-2 bg-[var(--surface-3)] border border-[oklch(0.92_0.01_90/0.8)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)] resize-none transition-all duration-200"
            />
          </div>

          <div className="space-y-3 pt-2 border-t border-[oklch(0.94_0.01_90/0.6)]">
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-4 h-4 rounded border-[oklch(0.85_0.02_90)] bg-[var(--surface-3)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
              />
              <Repeat className="w-4 h-4" />
              Recurring Event
            </label>

            {isRecurring && (
              <div className="grid grid-cols-2 gap-4 pl-6">
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Pattern</label>
                  <PrismSelect
                    options={[
                      { value: 'daily', label: 'Daily' },
                      { value: 'weekly', label: 'Weekly' },
                      { value: 'monthly', label: 'Monthly' },
                    ]}
                    value={recurrencePattern}
                    onChange={(value) => setRecurrencePattern(value as RecurrencePattern)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">End Date</label>
                  <PrismInput
                    type="date"
                    value={recurrenceEndDate}
                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {event && (event.is_recurring || event.parent_event_id) && (
            <div className="space-y-2 pt-2 border-t border-[oklch(0.94_0.01_90/0.6)]">
              <label className="text-sm text-[var(--text-secondary)]">Edit Scope</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
                  <input
                    type="radio"
                    name="editScope"
                    value="single"
                    checked={editScope === 'single'}
                    onChange={() => setEditScope('single')}
                    className="w-4 h-4 border-[oklch(0.85_0.02_90)] bg-[var(--surface-3)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                  />
                  This event only
                </label>
                <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
                  <input
                    type="radio"
                    name="editScope"
                    value="all"
                    checked={editScope === 'all'}
                    onChange={() => setEditScope('all')}
                    className="w-4 h-4 border-[oklch(0.85_0.02_90)] bg-[var(--surface-3)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                  />
                  All events
                </label>
              </div>
            </div>
          )}

          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-4 border-t border-[oklch(0.94_0.01_90/0.6)]">
          {event ? (
            <button
              onClick={handleDelete}
              disabled={saving}
              className="px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4 inline mr-1" />
              Delete
            </button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <PrismButton variant="secondary" onClick={onClose}>
              Cancel
            </PrismButton>
            <PrismButton
              onClick={handleSave}
              disabled={saving || !title.trim() || !eventDate}
            >
              {saving ? 'Saving...' : event ? 'Save Changes' : 'Create Event'}
            </PrismButton>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
