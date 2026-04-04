/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi API route untuk mengelola event kalender
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { CalendarEvent, CreateCalendarEventInput } from '@/types';
import { isValidUrl } from '@/lib/utils/calendar-utils';

// Complexity: Time O(n) | Space O(n) — linear scan of DB rows

/**
 * Melakukan autentikasi dan autorisasi untuk API event kalender
 * 
 * @returns Promise<any | null> - Payload session jika valid dan role diizinkan, null jika tidak
 */
async function authenticate() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) return null;

  const payload = await verifySession(token);
  if (!payload) return null;

  const role = String(payload.role).trim().toUpperCase();
  if (role !== 'ANALYST' && role !== 'DIVISI_OS') return null;

  return payload;
}

/**
 * GET /api/calendar/events
 * 
 * Mengambil semua event kalender yang dapat diakses oleh pengguna
 * Mendukung filter berdasarkan berbagai parameter
 * Hanya role ANALYST dan DIVISI_OS yang dapat mengakses
 * 
 * @param request - Objek request HTTP dengan query parameters:
 *   - search: Pencarian berdasarkan judul dan catatan
 *   - created_by: Filter berdasarkan pembuat
 *   - start_date: Tanggal mulai (ISO date YYYY-MM-DD)
 *   - end_date: Tanggal akhir (ISO date YYYY-MM-DD)
 *   - calendar_type: Filter tipe kalender
 * @returns Promise<NextResponse> - Response JSON berisi daftar event atau error
 * @throws Mengembalikan 403 jika tidak terautentikasi atau role tidak diizinkan
 * @throws Mengembalikan 500 jika terjadi error server
 */
export async function GET(request: Request) {
  try {
    const payload = await authenticate();
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized or forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const created_by = searchParams.get('created_by');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');
    const calendar_type = searchParams.get('calendar_type');

    let query = supabaseAdmin
      .from('calendar_events')
      .select(`
        *,
        users:created_by (
          full_name
        )
      `)
      .is('deleted_at', null)
      .order('event_date', { ascending: true });

    if (search) {
      query = query.or(`title.ilike.%${search}%,notes.ilike.%${search}%`);
    }

    if (created_by) {
      query = query.eq('created_by', created_by);
    }

    if (calendar_type) {
      query = query.eq('calendar_type', calendar_type);
    }

    // Multi-day overlap filter:
    // Show event if event_date <= view_end AND (event_end_date >= view_start OR event_date >= view_start)
    if (start_date && end_date) {
      query = query.lte('event_date', end_date);
      query = query.or(`event_end_date.gte.${start_date},event_end_date.is.null`);
      query = query.gte('event_date', start_date).or(`event_end_date.gte.${start_date}`);
    } else if (start_date) {
      query = query.or(`event_date.gte.${start_date},event_end_date.gte.${start_date}`);
    } else if (end_date) {
      query = query.lte('event_date', end_date);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[CALENDAR_API] Error fetching events:', error);
      throw error;
    }

    const events: CalendarEvent[] = (data || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      event_date: row.event_date,
      event_end_date: row.event_end_date || null,
      event_time: row.event_time,
      notes: row.notes,
      meeting_minutes_link: row.meeting_minutes_link,
      calendar_type: row.calendar_type || 'event',
      is_recurring: row.is_recurring,
      recurrence_pattern: row.recurrence_pattern,
      recurrence_end_date: row.recurrence_end_date,
      parent_event_id: row.parent_event_id,
      created_by: row.created_by,
      created_by_name: row.users?.full_name || null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at,
    }));

    return NextResponse.json(events, {
        headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
    });
  } catch (error) {
    console.error('[CALENDAR_API] Error in GET /api/calendar/events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar events' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calendar/events
 * 
 * Membuat event kalender baru
 * Hanya role ANALYST yang dapat membuat event
 * 
 * @param request - Objek request HTTP dengan body berisi data event:
 *   - title: Judul event (required, max 200 karakter)
 *   - event_date: Tanggal event (required, ISO date YYYY-MM-DD)
 *   - event_end_date: Tanggal akhir event (optional, harus >= event_date)
 *   - event_time: Waktu event (optional, HH:MM format)
 *   - notes: Catatan (optional, max 2000 karakter)
 *   - meeting_minutes_link: Link notulen rapat (optional, valid HTTP(S) URL)
 *   - calendar_type: Tipe kalender (optional)
 *   - is_recurring: Apakah event berulang (optional)
 *   - recurrence_pattern: Pola pengulangan (optional jika is_recurring true)
 *   - recurrence_end_date: Tanggal akhir pengulangan (optional jika is_recurring true)
 * @returns Promise<NextResponse> - Response JSON berisi event yang dibuat atau error
 * @throws Mengembalikan 403 jika tidak terautentikasi atau role tidak diizinkan
 * @throws Mengembalikan 400 jika data tidak valid
 * @throws Mengembalikan 500 jika terjadi error server
 */
export async function POST(request: Request) {
  try {
    const payload = await authenticate();
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized or forbidden' }, { status: 403 });
    }

    const role = String(payload.role).trim().toUpperCase();
    if (role !== 'ANALYST') {
      return NextResponse.json(
        { error: 'Forbidden: Only ANALYST can create events' },
        { status: 403 }
      );
    }

    const body: CreateCalendarEventInput = await request.json();

    if (!body.title?.trim() || !body.event_date) {
      return NextResponse.json({ error: 'Title and event_date are required' }, { status: 400 });
    }

    if (body.title.trim().length > 200) {
      return NextResponse.json({ error: 'Title must be 200 characters or less' }, { status: 400 });
    }

    if (body.meeting_minutes_link && !isValidUrl(body.meeting_minutes_link)) {
      return NextResponse.json({ error: 'Invalid meeting minutes URL' }, { status: 400 });
    }

    if (body.event_end_date && body.event_end_date < body.event_date) {
      return NextResponse.json({ error: 'End date must be on or after start date' }, { status: 400 });
    }

    const insertData: Record<string, unknown> = {
      title: body.title.trim(),
      event_date: body.event_date,
      event_end_date: body.event_end_date || null,
      event_time: body.event_time || null,
      notes: body.notes || null,
      meeting_minutes_link: body.meeting_minutes_link || null,
      calendar_type: body.calendar_type || 'event',
      is_recurring: body.is_recurring || false,
      recurrence_pattern: body.is_recurring ? body.recurrence_pattern : null,
      recurrence_end_date: body.is_recurring ? body.recurrence_end_date : null,
      created_by: payload.id,
    };

    const { data, error } = await supabaseAdmin
      .from('calendar_events')
      .insert(insertData)
      .select(`*, users:created_by ( full_name )`)
      .single();

    if (error) {
      console.error('[CALENDAR_API] Error creating event:', error);
      throw error;
    }

    const event: CalendarEvent = {
      id: data.id,
      title: data.title,
      event_date: data.event_date,
      event_end_date: data.event_end_date || null,
      event_time: data.event_time,
      notes: data.notes,
      meeting_minutes_link: data.meeting_minutes_link,
      calendar_type: data.calendar_type || 'event',
      is_recurring: data.is_recurring,
      recurrence_pattern: data.recurrence_pattern,
      recurrence_end_date: data.recurrence_end_date,
      parent_event_id: data.parent_event_id,
      created_by: data.created_by,
      created_by_name: data.users?.full_name || null,
      created_at: data.created_at,
      updated_at: data.updated_at,
      deleted_at: data.deleted_at,
    };

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error('[CALENDAR_API] Error in POST /api/calendar/events:', error);
    return NextResponse.json(
      { error: 'Failed to create calendar event' },
      { status: 500 }
    );
  }
}
