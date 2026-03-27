'use client';

import { useMemo, useCallback } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format } from 'date-fns';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { getDay } from 'date-fns/getDay';
import { enUS } from 'date-fns/locale/en-US';
import { CalendarEvent } from '@/types';
import { formatEventForCalendar } from '@/lib/utils/calendar-utils';
import { FileText, Repeat } from 'lucide-react';
import './calendar-styles.css';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarProps {
  events: CalendarEvent[];
  currentDate: Date;
  currentView: View;
  onDateChange: (date: Date) => void;
  onViewChange: (view: View) => void;
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectSlot?: (slotInfo: { start: Date; end: Date }) => void;
  onEventDrop?: (eventId: string, newDate: string) => Promise<void>;
  loading?: boolean;
}

export function Calendar({
  events,
  currentDate,
  currentView,
  onDateChange,
  onViewChange,
  onSelectEvent,
  onSelectSlot,
  onEventDrop,
  loading,
}: CalendarProps) {
  const calendarEvents = useMemo(() => {
    return events.map(formatEventForCalendar);
  }, [events]);

  const EventComponent = ({ event }: { event: { title: string; resource: CalendarEvent } }) => {
    const calEvent = event.resource;

    return (
      <div className="flex items-center gap-1 overflow-hidden">
        <span className="truncate flex-1">{event.title}</span>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {calEvent.is_recurring && (
            <Repeat className="w-3 h-3 text-[oklch(0.90_0.05_280)]" />
          )}
          {calEvent.meeting_minutes_link && (
            <FileText className="w-3 h-3 text-[oklch(0.90_0.05_200)]" />
          )}
        </div>
      </div>
    );
  };

  const handleEventDrop = useCallback(async (event: any) => {
    const newDate = format(event.start, 'yyyy-MM-dd');
    await onEventDrop(event.resource.id, newDate);
  }, [onEventDrop]);

  const handleSelectEvent = (event: any) => {
    onSelectEvent(event.resource);
  };

  if (loading) {
    return (
      <div className="h-[37.5rem] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-[var(--surface-4)] border-t-[var(--brand-primary)] animate-spin" />
          <span className="text-[var(--text-muted)] text-sm font-medium">Loading calendar...</span>
        </div>
      </div>
    );
  }

  const getHeight = () => {
    switch (currentView) {
      case 'day':
        return 600;
      case 'week':
        return 500;
      case 'agenda':
        return 400;
      default:
        return 600;
    }
  };

  const calendarProps: any = {
    localizer,
    events: calendarEvents,
    startAccessor: (event: any) => new Date(event.start),
    endAccessor: (event: any) => new Date(event.end),
    views: ['month', 'week', 'day', 'agenda'],
    view: currentView,
    date: currentDate,
    onNavigate: onDateChange,
    onView: onViewChange,
    onSelectEvent: handleSelectEvent,
    onSelectSlot: onSelectSlot ?? undefined,
    onEventDrop: onEventDrop ? handleEventDrop : undefined,
    onEventResize: onEventDrop ? handleEventDrop : undefined,
    selectable: !!onSelectSlot,
    popup: true,
    draggableAccessor: () => !!onEventDrop,
    resizable: !!onEventDrop,
    components: {
      event: EventComponent,
    },
    style: { height: getHeight() },
    step: 30,
    timeslots: 2,
    min: new Date(0, 0, 0, 0, 0, 0),
    max: new Date(0, 0, 0, 23, 59, 59),
  };

  return (
    <div className="calendar-container">
      <BigCalendar {...calendarProps} />
    </div>
  );
}
