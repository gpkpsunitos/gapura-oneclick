
import { addDays } from 'date-fns/addDays';
import { addWeeks } from 'date-fns/addWeeks';
import { addMonths } from 'date-fns/addMonths';
import { parseISO } from 'date-fns/parseISO';
import { format } from 'date-fns/format';
import { differenceInDays } from 'date-fns/differenceInDays';
import { differenceInWeeks } from 'date-fns/differenceInWeeks';
import { differenceInMonths } from 'date-fns/differenceInMonths';
import { set } from 'date-fns/set';
import { CalendarEvent, RecurrencePattern } from '@/types';

export function generateRecurringDates(
  startDate: string,
  endDate: string,
  pattern: RecurrencePattern,
  maxOccurrences: number = 365
): string[] {
  const dates: string[] = [];

  try {
    const start = parseISO(startDate);
    const end = parseISO(endDate);

    let currentDate = start;
    let count = 0;

    while (currentDate <= end && count < maxOccurrences) {
      dates.push(format(currentDate, 'yyyy-MM-dd'));
      count++;

      switch (pattern) {
        case 'daily':
          currentDate = addDays(currentDate, 1);
          break;
        case 'weekly':
          currentDate = addWeeks(currentDate, 1);
          break;
        case 'monthly':
          currentDate = addMonths(currentDate, 1);
          break;
        default:

          return dates;
      }
    }

    return dates;
  } catch {
    return [];
  }
}

export function calculateOccurrences(
  startDate: string,
  endDate: string,
  pattern: RecurrencePattern
): number {
  try {
    const start = parseISO(startDate);
    const end = parseISO(endDate);

    let occurrences = 0;

    switch (pattern) {
      case 'daily':
        occurrences = differenceInDays(end, start);
        break;
      case 'weekly':
        occurrences = differenceInWeeks(end, start);
        break;
      case 'monthly':
        occurrences = differenceInMonths(end, start);
        break;
      default:
        return 0;
    }

    return occurrences + 1;
  } catch {
    return 0;
  }
}

export function isValidUrl(url: string): boolean {

  if (!url || url.trim() === '') {
    return true;
  }

  try {
    const urlObject = new URL(url);
    return urlObject.protocol === 'http:' || urlObject.protocol === 'https:';
  } catch {
    return false;
  }
}

export function formatEventForCalendar(event: CalendarEvent): {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: CalendarEvent;
} {
  let startDate = parseISO(event.event_date);
  const isMultiDay = !!event.event_end_date && event.event_end_date !== event.event_date;

  if (event.event_time && !isMultiDay) {
    const [hours, minutes] = event.event_time.split(':').map(Number);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      startDate = set(startDate, { hours, minutes, seconds: 0, milliseconds: 0 });
    }
  }

  let endDate = startDate;
  if (isMultiDay) {
    endDate = addDays(parseISO(event.event_end_date!), 1);
  }

  return {
    id: event.id,
    title: event.title,
    start: startDate,
    end: endDate,
    allDay: isMultiDay || !event.event_time,
    resource: event,
  };
}

export function validateRecurringDateRange(
  startDate: string,
  endDate: string,
  maxDurationDays: number = 365
): { valid: boolean; error?: string } {
  try {
    const start = parseISO(startDate);
    const end = parseISO(endDate);

    if (end <= start) {
      return {
        valid: false,
        error: 'End date must be after start date',
      };
    }

    const duration = differenceInDays(end, start);
    if (duration > maxDurationDays) {
      return {
        valid: false,
        error: `Date range cannot exceed ${maxDurationDays} days`,
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid date format',
    };
  }
}
