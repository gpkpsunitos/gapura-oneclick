import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { CalendarEvent, UpdateCalendarEventInput } from '@/types';
import { isValidUrl } from '@/lib/utils/calendar-utils';

/**
 * GET /api/calendar/events/[id]
 * Fetch a single calendar event by ID
 * Auth: ANALYST or DIVISI_OS roles only
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authentication
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifySession(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // 2. Authorization - Check role
    const role = String(payload.role).trim().toUpperCase();
    if (role !== 'ANALYST' && role !== 'DIVISI_OS') {
      return NextResponse.json(
        { error: 'Forbidden: Access limited to ANALYST and DIVISI_OS roles' },
        { status: 403 }
      );
    }

    // 3. Get event ID from params (Next.js 15+ requires await)
    const { id } = await params;

    // 4. Fetch event with user join
    const { data, error } = await supabaseAdmin
      .from('calendar_events')
      .select(`
        *,
        users:created_by (
          full_name
        )
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      console.error('[CALENDAR_API] Error fetching event:', error);
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // 5. Map response to CalendarEvent format
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

    console.log(`[CALENDAR_API] Fetched event: ${id}`);
    return NextResponse.json(event);
  } catch (error) {
    console.error('[CALENDAR_API] Error in GET /api/calendar/events/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar event' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/calendar/events/[id]
 * Update a calendar event (single or all recurring)
 * Auth: ANALYST or DIVISI_OS roles only
 *
 * Request body:
 * {
 *   title?: string (max 200 chars)
 *   event_date?: string (ISO date YYYY-MM-DD)
 *   event_time?: string (HH:MM format)
 *   notes?: string (max 2000 chars)
 *   meeting_minutes_link?: string (valid HTTP(S) URL)
 *   edit_scope?: 'single' | 'all' (for recurring events)
 * }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authentication
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifySession(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // 2. Authorization - Only ANALYST can update events
    const role = String(payload.role).trim().toUpperCase();
    if (role !== 'ANALYST') {
      return NextResponse.json(
        { error: 'Forbidden: Only ANALYST role can update events' },
        { status: 403 }
      );
    }

    // 3. Get event ID from params
    const { id } = await params;

    // 4. Parse request body
    const body: UpdateCalendarEventInput = await request.json();
    const edit_scope = body.edit_scope || 'single';

    // 5. Validate field constraints
    if (body.title && body.title.length > 200) {
      return NextResponse.json(
        { error: 'Title must not exceed 200 characters' },
        { status: 400 }
      );
    }

    if (body.notes && body.notes.length > 2000) {
      return NextResponse.json(
        { error: 'Notes must not exceed 2000 characters' },
        { status: 400 }
      );
    }

    if (body.meeting_minutes_link && !isValidUrl(body.meeting_minutes_link)) {
      return NextResponse.json(
        { error: 'Invalid URL format for meeting_minutes_link' },
        { status: 400 }
      );
    }

    // 6. Get current event to check if it's part of a recurring series
    const { data: currentEvent, error: fetchError } = await supabaseAdmin
      .from('calendar_events')
      .select('id, is_recurring, parent_event_id')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !currentEvent) {
      console.error('[CALENDAR_API] Error fetching current event:', fetchError);
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // 7. Prepare update payload
    const updatePayload: any = {};
    if (body.title !== undefined) updatePayload.title = body.title;
    if (body.event_date !== undefined) updatePayload.event_date = body.event_date;
    if (body.event_end_date !== undefined) updatePayload.event_end_date = body.event_end_date;
    if (body.event_time !== undefined) updatePayload.event_time = body.event_time;
    if (body.notes !== undefined) updatePayload.notes = body.notes;
    if (body.meeting_minutes_link !== undefined) updatePayload.meeting_minutes_link = body.meeting_minutes_link;

    if (updatePayload.event_end_date && updatePayload.event_date && updatePayload.event_end_date < updatePayload.event_date) {
      return NextResponse.json({ error: 'End date must be on or after start date' }, { status: 400 });
    }

    updatePayload.updated_at = new Date().toISOString();

    // 8. Handle edit scope logic
    if (edit_scope === 'all') {
      // Case 1: This is a child event, update parent + all siblings
      if (currentEvent.parent_event_id) {
        // Update parent event
        const { error: parentError } = await supabaseAdmin
          .from('calendar_events')
          .update(updatePayload)
          .eq('id', currentEvent.parent_event_id)
          .is('deleted_at', null);

        if (parentError) {
          console.error('[CALENDAR_API] Error updating parent event:', parentError);
          return NextResponse.json(
            { error: 'Failed to update parent event' },
            { status: 500 }
          );
        }

        // Update all sibling events (including current)
        const { error: siblingsError } = await supabaseAdmin
          .from('calendar_events')
          .update(updatePayload)
          .eq('parent_event_id', currentEvent.parent_event_id)
          .is('deleted_at', null);

        if (siblingsError) {
          console.error('[CALENDAR_API] Error updating sibling events:', siblingsError);
          return NextResponse.json(
            { error: 'Failed to update all recurring events' },
            { status: 500 }
          );
        }

        console.log(`[CALENDAR_API] Updated parent and all children of event: ${id}`);
        return NextResponse.json({ success: true, updated: 'all' });
      }

      // Case 2: This is a parent event, update self + all children
      if (currentEvent.is_recurring) {
        // Update parent event
        const { error: parentError } = await supabaseAdmin
          .from('calendar_events')
          .update(updatePayload)
          .eq('id', id)
          .is('deleted_at', null);

        if (parentError) {
          console.error('[CALENDAR_API] Error updating parent event:', parentError);
          return NextResponse.json(
            { error: 'Failed to update parent event' },
            { status: 500 }
          );
        }

        // Update all child events
        const { error: childrenError } = await supabaseAdmin
          .from('calendar_events')
          .update(updatePayload)
          .eq('parent_event_id', id)
          .is('deleted_at', null);

        if (childrenError) {
          console.error('[CALENDAR_API] Error updating child events:', childrenError);
          return NextResponse.json(
            { error: 'Failed to update all recurring events' },
            { status: 500 }
          );
        }

        console.log(`[CALENDAR_API] Updated parent and all children of event: ${id}`);
        return NextResponse.json({ success: true, updated: 'all' });
      }
    }

    // Case 3: Single event update (or edit_scope='single')
    const { data, error } = await supabaseAdmin
      .from('calendar_events')
      .update(updatePayload)
      .eq('id', id)
      .is('deleted_at', null)
      .select(`
        *,
        users:created_by (
          full_name
        )
      `)
      .single();

    if (error || !data) {
      console.error('[CALENDAR_API] Error updating event:', error);
      return NextResponse.json(
        { error: 'Failed to update calendar event' },
        { status: 500 }
      );
    }

    // Map response to CalendarEvent format
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

    console.log(`[CALENDAR_API] Updated single event: ${id}`);
    return NextResponse.json(event);
  } catch (error) {
    console.error('[CALENDAR_API] Error in PATCH /api/calendar/events/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to update calendar event' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/calendar/events/[id]
 * Soft delete a calendar event (single or all recurring)
 * Auth: ANALYST or DIVISI_OS roles only
 *
 * Query params:
 * - scope: 'single' | 'all' (default: 'single')
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authentication
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifySession(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // 2. Authorization - Only ANALYST can delete events
    const role = String(payload.role).trim().toUpperCase();
    if (role !== 'ANALYST') {
      return NextResponse.json(
        { error: 'Forbidden: Only ANALYST role can delete events' },
        { status: 403 }
      );
    }

    // 3. Get event ID from params and scope from query
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') || 'single';

    // 4. Get current event to check if it's part of a recurring series
    const { data: currentEvent, error: fetchError } = await supabaseAdmin
      .from('calendar_events')
      .select('id, is_recurring, parent_event_id')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !currentEvent) {
      console.error('[CALENDAR_API] Error fetching current event:', fetchError);
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // 5. Prepare soft delete payload
    const deletePayload = {
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 6. Handle delete scope logic
    if (scope === 'all') {
      // Case 1: This is a child event, delete parent + all siblings
      if (currentEvent.parent_event_id) {
        // Soft delete parent event
        const { error: parentError } = await supabaseAdmin
          .from('calendar_events')
          .update(deletePayload)
          .eq('id', currentEvent.parent_event_id)
          .is('deleted_at', null);

        if (parentError) {
          console.error('[CALENDAR_API] Error deleting parent event:', parentError);
          return NextResponse.json(
            { error: 'Failed to delete parent event' },
            { status: 500 }
          );
        }

        // Soft delete all sibling events (including current)
        const { error: siblingsError } = await supabaseAdmin
          .from('calendar_events')
          .update(deletePayload)
          .eq('parent_event_id', currentEvent.parent_event_id)
          .is('deleted_at', null);

        if (siblingsError) {
          console.error('[CALENDAR_API] Error deleting sibling events:', siblingsError);
          return NextResponse.json(
            { error: 'Failed to delete all recurring events' },
            { status: 500 }
          );
        }

        console.log(`[CALENDAR_API] Soft deleted parent and all children of event: ${id}`);
        return NextResponse.json({ success: true, deleted: 'all' });
      }

      // Case 2: This is a parent event, delete self + all children
      if (currentEvent.is_recurring) {
        // Soft delete parent event
        const { error: parentError } = await supabaseAdmin
          .from('calendar_events')
          .update(deletePayload)
          .eq('id', id)
          .is('deleted_at', null);

        if (parentError) {
          console.error('[CALENDAR_API] Error deleting parent event:', parentError);
          return NextResponse.json(
            { error: 'Failed to delete parent event' },
            { status: 500 }
          );
        }

        // Soft delete all child events
        const { error: childrenError } = await supabaseAdmin
          .from('calendar_events')
          .update(deletePayload)
          .eq('parent_event_id', id)
          .is('deleted_at', null);

        if (childrenError) {
          console.error('[CALENDAR_API] Error deleting child events:', childrenError);
          return NextResponse.json(
            { error: 'Failed to delete all recurring events' },
            { status: 500 }
          );
        }

        console.log(`[CALENDAR_API] Soft deleted parent and all children of event: ${id}`);
        return NextResponse.json({ success: true, deleted: 'all' });
      }
    }

    // Case 3: Single event deletion (or scope='single')
    const { error } = await supabaseAdmin
      .from('calendar_events')
      .update(deletePayload)
      .eq('id', id)
      .is('deleted_at', null);

    if (error) {
      console.error('[CALENDAR_API] Error deleting event:', error);
      return NextResponse.json(
        { error: 'Failed to delete calendar event' },
        { status: 500 }
      );
    }

    console.log(`[CALENDAR_API] Soft deleted single event: ${id}`);
    return NextResponse.json({ success: true, deleted: 'single' });
  } catch (error) {
    console.error('[CALENDAR_API] Error in DELETE /api/calendar/events/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to delete calendar event' },
      { status: 500 }
    );
  }
}
