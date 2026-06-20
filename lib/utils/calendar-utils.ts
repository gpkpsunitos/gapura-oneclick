/**
 * @file
 * 
 * File ini berisi fungsi utilitas untuk penanganan tanggal, perulangan event, dan format calendar
 */

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

/**
 * Menghasilkan array string tanggal ISO untuk event yang berulang
 * @param {string} startDate - Tanggal mulai dalam format ISO
 * @param {string} endDate - Tanggal akhir dalam format ISO
 * @param {RecurrencePattern} pattern - Pola perulangan (daily, weekly, monthly)
 * @param {number} maxOccurrences - Jumlah maksimum kejadian (default: 365)
 * @returns {string[]} Array tanggal dalam format YYYY-MM-DD
 * @example
 * ```ts
 * const dates = generateRecurringDates('2024-01-01', '2024-01-31', 'weekly');
 * // ['2024-01-01', '2024-01-08', '2024-01-15', '2024-01-22', '2024-01-29']
 * ```
 */
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
          // If pattern is not recognized, break the loop
          return dates;
      }
    }

    return dates;
  } catch {
    return [];
  }
}

/**
 * Menghitung jumlah kejadian total untuk event yang berulang
 * @param {string} startDate - Tanggal mulai dalam format ISO
 * @param {string} endDate - Tanggal akhir dalam format ISO
 * @param {RecurrencePattern} pattern - Pola perulangan
 * @returns {number} Total jumlah kejadian
 * @example
 * ```ts
 * calculateOccurrences('2024-01-01', '2024-01-31', 'daily'); // 31
 * ```
 */
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

    // Include the start date
    return occurrences + 1;
  } catch {
    return 0;
  }
}

/**
 * Memvalidasi format URL
 * @param {string} url - String URL yang akan divalidasi
 * @returns {boolean} true jika valid atau kosong, false jika tidak valid
 * @example
 * ```ts
 * isValidUrl('https://example.com'); // true
 * isValidUrl('invalid-url'); // false
 * isValidUrl(''); // true (kosong)
 * ```
 */
export function isValidUrl(url: string): boolean {
  // Empty or null URLs are valid (optional field)
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

/**
 * Memformat event calendar untuk ditampilkan di komponen calendar
 * @param {CalendarEvent} event - Objek event calendar
 * @returns {object} Objek event yang diformat dengan objek Date
 * @example
 * ```ts
 * const formatted = formatEventForCalendar({
 *   id: '1',
 *   title: 'Meeting',
 *   event_date: '2024-01-01',
 *   event_time: '14:00'
 * });
 * // { id: '1', title: 'Meeting', start: Date, end: Date, allDay: false, resource: {...} }
 * ```
 */
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

  // react-big-calendar uses exclusive end dates for allDay events
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

/**
 * Memvalidasi range tanggal perulangan
 * @param {string} startDate - Tanggal mulai dalam format ISO
 * @param {string} endDate - Tanggal akhir dalam format ISO
 * @param {number} maxDurationDays - Durasi maksimum dalam hari (default: 365)
 * @returns {object} Objek hasil validasi
 * @example
 * ```ts
 * const result = validateRecurringDateRange('2024-01-01', '2024-12-31');
 * // { valid: true }
 * 
 * const result2 = validateRecurringDateRange('2024-12-31', '2024-01-01');
 * // { valid: false, error: 'End date must be after start date' }
 * ```
 */
export function validateRecurringDateRange(
  startDate: string,
  endDate: string,
  maxDurationDays: number = 365
): { valid: boolean; error?: string } {
  try {
    const start = parseISO(startDate);
    const end = parseISO(endDate);

    // Check if end date is after start date
    if (end <= start) {
      return {
        valid: false,
        error: 'End date must be after start date',
      };
    }

    // Check if duration exceeds maximum
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
