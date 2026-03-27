# Team Calendar Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a shared collaborative calendar for ANALYST and DIVISI_OS roles with meeting minutes, notes, recurring events, search/filter, and quick edit functionality.

**Architecture:** react-big-calendar for month view UI, Supabase for shared event storage, Next.js API routes with RBAC, recurring events generated as parent+children pattern, quick edit popover for fast corrections alongside full edit modal.

**Tech Stack:** Next.js 16, React 19, react-big-calendar v1.15, Supabase (PostgreSQL), TailwindCSS, Radix UI, date-fns v4

---

## Task 1: Database Schema & Migration

**Files:**
- Create: `supabase/migrations/20260226000001_create_calendar_events.sql`
- Modify: `types/index.ts` (add CalendarEvent type)

**Step 1: Create migration file**

Create file `supabase/migrations/20260226000001_create_calendar_events.sql`:

```sql
-- Create calendar_events table for shared team calendar (ANALYST + DIVISI_OS)
CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Event details
    title TEXT NOT NULL CHECK (char_length(title) <= 200),
    event_date DATE NOT NULL,
    event_time TIME,
    notes TEXT CHECK (char_length(notes) <= 2000),
    meeting_minutes_link TEXT,

    -- Recurring events
    is_recurring BOOLEAN DEFAULT false NOT NULL,
    recurrence_pattern TEXT CHECK (recurrence_pattern IN ('daily', 'weekly', 'monthly')),
    recurrence_end_date DATE,
    parent_event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,

    -- Metadata
    created_by UUID REFERENCES users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    deleted_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT valid_recurrence CHECK (
        (is_recurring = false) OR
        (is_recurring = true AND recurrence_pattern IS NOT NULL AND recurrence_end_date IS NOT NULL)
    ),
    CONSTRAINT valid_end_date CHECK (
        recurrence_end_date IS NULL OR recurrence_end_date > event_date
    )
);

-- Indexes for performance
CREATE INDEX idx_calendar_events_date ON calendar_events(event_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_calendar_events_created_by ON calendar_events(created_by);
CREATE INDEX idx_calendar_events_parent ON calendar_events(parent_event_id) WHERE parent_event_id IS NOT NULL;
CREATE INDEX idx_calendar_events_deleted ON calendar_events(deleted_at) WHERE deleted_at IS NOT NULL;

-- RLS Policies (ANALYST and DIVISI_OS only)
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Allow ANALYST and DIVISI_OS to view all events
CREATE POLICY "calendar_events_select_policy" ON calendar_events
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('ANALYST', 'DIVISI_OS')
        )
    );

-- Allow ANALYST and DIVISI_OS to insert events
CREATE POLICY "calendar_events_insert_policy" ON calendar_events
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('ANALYST', 'DIVISI_OS')
        )
        AND created_by = auth.uid()
    );

-- Allow ANALYST and DIVISI_OS to update any event
CREATE POLICY "calendar_events_update_policy" ON calendar_events
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('ANALYST', 'DIVISI_OS')
        )
    );

-- Allow ANALYST and DIVISI_OS to delete any event
CREATE POLICY "calendar_events_delete_policy" ON calendar_events
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('ANALYST', 'DIVISI_OS')
        )
    );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_calendar_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calendar_events_updated_at_trigger
    BEFORE UPDATE ON calendar_events
    FOR EACH ROW
    EXECUTE FUNCTION update_calendar_events_updated_at();
```

**Step 2: Add TypeScript types**

In `types/index.ts`, add after existing types:

```typescript
// Calendar Event types
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly';

export interface CalendarEvent {
  id: string;
  title: string;
  event_date: string;  // ISO date string YYYY-MM-DD
  event_time?: string | null;  // HH:MM format
  notes?: string | null;
  meeting_minutes_link?: string | null;

  // Recurring
  is_recurring: boolean;
  recurrence_pattern?: RecurrencePattern | null;
  recurrence_end_date?: string | null;  // ISO date string
  parent_event_id?: string | null;

  // Metadata
  created_by: string;
  created_by_name?: string;  // Joined from users table
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface CreateCalendarEventInput {
  title: string;
  event_date: string;
  event_time?: string | null;
  notes?: string | null;
  meeting_minutes_link?: string | null;
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern | null;
  recurrence_end_date?: string | null;
}

export interface UpdateCalendarEventInput extends Partial<CreateCalendarEventInput> {
  edit_scope?: 'single' | 'all';
}

export interface CalendarEventFilters {
  search?: string;
  created_by?: string;
  start_date?: string;
  end_date?: string;
}
```

**Step 3: Apply migration**

Run: `npx supabase db push` or apply via Supabase dashboard

Expected: Migration successful, table created

**Step 4: Commit**

```bash
git add supabase/migrations/20260226000001_create_calendar_events.sql types/index.ts
git commit -m "feat(calendar): add calendar_events table and types"
```

---

## Task 2: Calendar Utilities & Helpers

**Files:**
- Create: `lib/utils/calendar-utils.ts`

**Step 1: Create calendar utilities file**

Create `lib/utils/calendar-utils.ts`:

```typescript
import { addDays, addWeeks, addMonths, parseISO, format, differenceInDays, differenceInWeeks, differenceInMonths } from 'date-fns';
import { CalendarEvent, RecurrencePattern } from '@/types';

/**
 * Generate recurring event dates based on pattern
 * @param startDate ISO date string (YYYY-MM-DD)
 * @param endDate ISO date string (YYYY-MM-DD)
 * @param pattern Recurrence pattern (daily, weekly, monthly)
 * @param maxOccurrences Maximum number of events to generate (default 365)
 * @returns Array of ISO date strings
 */
export function generateRecurringDates(
  startDate: string,
  endDate: string,
  pattern: RecurrencePattern,
  maxOccurrences: number = 365
): string[] {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const dates: string[] = [];

  let currentDate = start;
  let occurrenceCount = 0;

  while (currentDate <= end && occurrenceCount < maxOccurrences) {
    dates.push(format(currentDate, 'yyyy-MM-dd'));
    occurrenceCount++;

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
    }
  }

  return dates;
}

/**
 * Calculate total occurrences for recurring event
 */
export function calculateOccurrences(
  startDate: string,
  endDate: string,
  pattern: RecurrencePattern
): number {
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  switch (pattern) {
    case 'daily':
      return differenceInDays(end, start) + 1;
    case 'weekly':
      return differenceInWeeks(end, start) + 1;
    case 'monthly':
      return differenceInMonths(end, start) + 1;
    default:
      return 0;
  }
}

/**
 * Validate URL format for meeting minutes link
 */
export function isValidUrl(url: string): boolean {
  if (!url) return true; // Empty is valid (optional field)

  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

/**
 * Format event for react-big-calendar
 */
export function formatEventForCalendar(event: CalendarEvent) {
  const startDate = parseISO(event.event_date);

  if (event.event_time) {
    const [hours, minutes] = event.event_time.split(':');
    startDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
  }

  return {
    id: event.id,
    title: event.title,
    start: startDate,
    end: startDate, // Same day events
    allDay: !event.event_time,
    resource: event, // Store full event data
  };
}

/**
 * Validate event date range for recurring events
 */
export function validateRecurringDateRange(
  startDate: string,
  endDate: string,
  maxDurationDays: number = 365
): { valid: boolean; error?: string } {
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  if (end <= start) {
    return { valid: false, error: 'End date must be after start date' };
  }

  const daysDiff = differenceInDays(end, start);
  if (daysDiff > maxDurationDays) {
    return { valid: false, error: `Recurring events cannot exceed ${maxDurationDays} days` };
  }

  return { valid: true };
}
```

**Step 2: Commit**

```bash
git add lib/utils/calendar-utils.ts
git commit -m "feat(calendar): add calendar utility functions"
```

---

## Task 3: API Route - GET Events

**Files:**
- Create: `app/api/calendar/events/route.ts`

**Step 1: Create GET endpoint**

Create `app/api/calendar/events/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';
import { createClient } from '@/lib/supabase-admin';
import { CalendarEvent } from '@/types';

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifySession(token);

    // Role check - only ANALYST and DIVISI_OS
    if (!['ANALYST', 'DIVISI_OS'].includes(payload.role)) {
      return NextResponse.json(
        { error: 'Access denied - ANALYST or DIVISI_OS role required' },
        { status: 403 }
      );
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const created_by = searchParams.get('created_by');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');

    const supabase = createClient();

    // Build query
    let query = supabase
      .from('calendar_events')
      .select(`
        *,
        created_by_user:users!calendar_events_created_by_fkey(full_name)
      `)
      .is('deleted_at', null)
      .order('event_date', { ascending: true });

    // Apply filters
    if (search) {
      query = query.or(`title.ilike.%${search}%,notes.ilike.%${search}%`);
    }

    if (created_by) {
      query = query.eq('created_by', created_by);
    }

    if (start_date) {
      query = query.gte('event_date', start_date);
    }

    if (end_date) {
      query = query.lte('event_date', end_date);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching calendar events:', error);
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500 }
      );
    }

    // Format response
    const events: CalendarEvent[] = data.map((row: any) => ({
      id: row.id,
      title: row.title,
      event_date: row.event_date,
      event_time: row.event_time,
      notes: row.notes,
      meeting_minutes_link: row.meeting_minutes_link,
      is_recurring: row.is_recurring,
      recurrence_pattern: row.recurrence_pattern,
      recurrence_end_date: row.recurrence_end_date,
      parent_event_id: row.parent_event_id,
      created_by: row.created_by,
      created_by_name: row.created_by_user?.full_name,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at,
    }));

    return NextResponse.json(events);

  } catch (error) {
    console.error('Error in GET /api/calendar/events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Step 2: Test the endpoint manually**

Run dev server: `npm run dev`

Test: `curl http://localhost:3000/api/calendar/events -H "Cookie: session=YOUR_TOKEN"`

Expected: 401 if not logged in, 403 if wrong role, 200 with [] if no events

**Step 3: Commit**

```bash
git add app/api/calendar/events/route.ts
git commit -m "feat(calendar): add GET /api/calendar/events endpoint"
```

---

## Task 4: API Route - POST Events (Create)

**Files:**
- Modify: `app/api/calendar/events/route.ts` (add POST handler)

**Step 1: Add POST handler**

In `app/api/calendar/events/route.ts`, add after GET function:

```typescript
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifySession(token);

    // Role check
    if (!['ANALYST', 'DIVISI_OS'].includes(payload.role)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Parse body
    const body = await request.json();
    const {
      title,
      event_date,
      event_time,
      notes,
      meeting_minutes_link,
      is_recurring = false,
      recurrence_pattern,
      recurrence_end_date,
    } = body;

    // Validation
    if (!title || !event_date) {
      return NextResponse.json(
        { error: 'Title and event_date are required' },
        { status: 400 }
      );
    }

    if (title.length > 200) {
      return NextResponse.json(
        { error: 'Title must be 200 characters or less' },
        { status: 400 }
      );
    }

    if (notes && notes.length > 2000) {
      return NextResponse.json(
        { error: 'Notes must be 2000 characters or less' },
        { status: 400 }
      );
    }

    if (meeting_minutes_link) {
      const { isValidUrl } = await import('@/lib/utils/calendar-utils');
      if (!isValidUrl(meeting_minutes_link)) {
        return NextResponse.json(
          { error: 'Invalid URL format for meeting minutes link' },
          { status: 400 }
        );
      }
    }

    const supabase = createClient();

    // Handle recurring events
    if (is_recurring) {
      if (!recurrence_pattern || !recurrence_end_date) {
        return NextResponse.json(
          { error: 'Recurrence pattern and end date required for recurring events' },
          { status: 400 }
        );
      }

      const { validateRecurringDateRange, generateRecurringDates } = await import('@/lib/utils/calendar-utils');

      const validation = validateRecurringDateRange(event_date, recurrence_end_date);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      // Create parent event
      const { data: parentEvent, error: parentError } = await supabase
        .from('calendar_events')
        .insert({
          title,
          event_date,
          event_time,
          notes,
          meeting_minutes_link,
          is_recurring: true,
          recurrence_pattern,
          recurrence_end_date,
          created_by: payload.userId,
        })
        .select()
        .single();

      if (parentError) {
        console.error('Error creating parent event:', parentError);
        return NextResponse.json(
          { error: 'Failed to create event' },
          { status: 500 }
        );
      }

      // Generate child events
      const recurringDates = generateRecurringDates(
        event_date,
        recurrence_end_date,
        recurrence_pattern
      );

      // Skip first date (already created as parent)
      const childDates = recurringDates.slice(1);

      if (childDates.length > 0) {
        const childEvents = childDates.map(date => ({
          title,
          event_date: date,
          event_time,
          notes,
          meeting_minutes_link,
          is_recurring: false,
          parent_event_id: parentEvent.id,
          created_by: payload.userId,
        }));

        const { error: childError } = await supabase
          .from('calendar_events')
          .insert(childEvents);

        if (childError) {
          console.error('Error creating child events:', childError);
          // Don't fail entirely, parent was created
        }
      }

      return NextResponse.json(parentEvent, { status: 201 });

    } else {
      // Create single event
      const { data, error } = await supabase
        .from('calendar_events')
        .insert({
          title,
          event_date,
          event_time,
          notes,
          meeting_minutes_link,
          is_recurring: false,
          created_by: payload.userId,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating event:', error);
        return NextResponse.json(
          { error: 'Failed to create event' },
          { status: 500 }
        );
      }

      return NextResponse.json(data, { status: 201 });
    }

  } catch (error) {
    console.error('Error in POST /api/calendar/events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Step 2: Test POST endpoint**

Test single event:
```bash
curl -X POST http://localhost:3000/api/calendar/events \
  -H "Cookie: session=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Meeting","event_date":"2026-03-01","event_time":"10:00"}'
```

Expected: 201 with event data

Test recurring event:
```bash
curl -X POST http://localhost:3000/api/calendar/events \
  -H "Cookie: session=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Weekly Standup","event_date":"2026-03-01","event_time":"09:00","is_recurring":true,"recurrence_pattern":"weekly","recurrence_end_date":"2026-03-31"}'
```

Expected: 201, check DB for multiple events created

**Step 3: Commit**

```bash
git add app/api/calendar/events/route.ts
git commit -m "feat(calendar): add POST /api/calendar/events for creating events"
```

---

## Task 5: API Route - PATCH and DELETE Individual Event

**Files:**
- Create: `app/api/calendar/events/[id]/route.ts`

**Step 1: Create individual event routes**

Create `app/api/calendar/events/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';
import { createClient } from '@/lib/supabase-admin';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    // Auth check
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifySession(token);

    if (!['ANALYST', 'DIVISI_OS'].includes(payload.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const supabase = createClient();

    const { data, error } = await supabase
      .from('calendar_events')
      .select(`
        *,
        created_by_user:users!calendar_events_created_by_fkey(full_name)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const event = {
      ...data,
      created_by_name: data.created_by_user?.full_name,
    };

    return NextResponse.json(event);

  } catch (error) {
    console.error('Error in GET /api/calendar/events/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    // Auth check
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifySession(token);

    if (!['ANALYST', 'DIVISI_OS'].includes(payload.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { edit_scope = 'single', ...updates } = body;

    // Validation
    if (updates.title && updates.title.length > 200) {
      return NextResponse.json(
        { error: 'Title must be 200 characters or less' },
        { status: 400 }
      );
    }

    if (updates.notes && updates.notes.length > 2000) {
      return NextResponse.json(
        { error: 'Notes must be 2000 characters or less' },
        { status: 400 }
      );
    }

    if (updates.meeting_minutes_link) {
      const { isValidUrl } = await import('@/lib/utils/calendar-utils');
      if (!isValidUrl(updates.meeting_minutes_link)) {
        return NextResponse.json(
          { error: 'Invalid URL format' },
          { status: 400 }
        );
      }
    }

    const supabase = createClient();

    // Get current event
    const { data: currentEvent } = await supabase
      .from('calendar_events')
      .select('parent_event_id, is_recurring')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (!currentEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Handle edit scope
    if (edit_scope === 'all' && currentEvent.parent_event_id) {
      // Update all sibling events (including parent)
      const parentId = currentEvent.parent_event_id;

      // Update parent
      await supabase
        .from('calendar_events')
        .update(updates)
        .eq('id', parentId);

      // Update all children
      await supabase
        .from('calendar_events')
        .update(updates)
        .eq('parent_event_id', parentId)
        .is('deleted_at', null);

      return NextResponse.json({ success: true, updated: 'all' });

    } else if (edit_scope === 'all' && currentEvent.is_recurring) {
      // This is a parent event, update it and all children
      await supabase
        .from('calendar_events')
        .update(updates)
        .eq('id', id);

      await supabase
        .from('calendar_events')
        .update(updates)
        .eq('parent_event_id', id)
        .is('deleted_at', null);

      return NextResponse.json({ success: true, updated: 'all' });

    } else {
      // Update single event only
      const { data, error } = await supabase
        .from('calendar_events')
        .update(updates)
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) {
        console.error('Error updating event:', error);
        return NextResponse.json(
          { error: 'Failed to update event' },
          { status: 500 }
        );
      }

      return NextResponse.json(data);
    }

  } catch (error) {
    console.error('Error in PATCH /api/calendar/events/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    // Auth check
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifySession(token);

    if (!['ANALYST', 'DIVISI_OS'].includes(payload.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const scope = searchParams.get('scope') || 'single';

    const supabase = createClient();

    // Get current event
    const { data: currentEvent } = await supabase
      .from('calendar_events')
      .select('parent_event_id, is_recurring')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (!currentEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const now = new Date().toISOString();

    // Handle delete scope
    if (scope === 'all' && currentEvent.parent_event_id) {
      // Soft delete parent and all siblings
      const parentId = currentEvent.parent_event_id;

      await supabase
        .from('calendar_events')
        .update({ deleted_at: now })
        .eq('id', parentId);

      await supabase
        .from('calendar_events')
        .update({ deleted_at: now })
        .eq('parent_event_id', parentId)
        .is('deleted_at', null);

      return NextResponse.json({ success: true, deleted: 'all' });

    } else if (scope === 'all' && currentEvent.is_recurring) {
      // This is parent, delete it and all children
      await supabase
        .from('calendar_events')
        .update({ deleted_at: now })
        .eq('id', id);

      await supabase
        .from('calendar_events')
        .update({ deleted_at: now })
        .eq('parent_event_id', id)
        .is('deleted_at', null);

      return NextResponse.json({ success: true, deleted: 'all' });

    } else {
      // Soft delete single event
      const { error } = await supabase
        .from('calendar_events')
        .update({ deleted_at: now })
        .eq('id', id);

      if (error) {
        console.error('Error deleting event:', error);
        return NextResponse.json(
          { error: 'Failed to delete event' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, deleted: 'single' });
    }

  } catch (error) {
    console.error('Error in DELETE /api/calendar/events/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Step 2: Test endpoints**

Test GET: `curl http://localhost:3000/api/calendar/events/EVENT_ID -H "Cookie: session=TOKEN"`

Test PATCH:
```bash
curl -X PATCH http://localhost:3000/api/calendar/events/EVENT_ID \
  -H "Cookie: session=TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated Title","edit_scope":"single"}'
```

Test DELETE: `curl -X DELETE "http://localhost:3000/api/calendar/events/EVENT_ID?scope=single" -H "Cookie: session=TOKEN"`

**Step 3: Commit**

```bash
git add app/api/calendar/events/[id]/route.ts
git commit -m "feat(calendar): add PATCH and DELETE endpoints for individual events"
```

---

## Task 6: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install react-big-calendar**

Run:
```bash
npm install react-big-calendar@1.15.0
npm install --save-dev @types/react-big-calendar
```

**Step 2: Verify installation**

Check `package.json` has:
- `react-big-calendar`: `^1.15.0`
- `@types/react-big-calendar`: in devDependencies

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(calendar): install react-big-calendar dependencies"
```

---

## Task 7: Calendar Page Component Structure

**Files:**
- Create: `app/dashboard/analyst/calendar/page.tsx`
- Create: `app/dashboard/os/calendar/page.tsx`
- Create: `components/calendar/CalendarPage.tsx`

**Step 1: Create analyst calendar page**

Create `app/dashboard/analyst/calendar/page.tsx`:

```typescript
import { Metadata } from 'next';
import { CalendarPage } from '@/components/calendar/CalendarPage';

export const metadata: Metadata = {
  title: 'Team Calendar | Analyst Dashboard',
  description: 'Shared calendar for team coordination and meeting management',
};

export default function AnalystCalendarPage() {
  return <CalendarPage />;
}
```

**Step 2: Create OS calendar page**

Create `app/dashboard/os/calendar/page.tsx`:

```typescript
import { Metadata } from 'next';
import { CalendarPage } from '@/components/calendar/CalendarPage';

export const metadata: Metadata = {
  title: 'Team Calendar | OS Dashboard',
  description: 'Shared calendar for team coordination and meeting management',
};

export default function OSCalendarPage() {
  return <CalendarPage />;
}
```

**Step 3: Create main calendar component scaffold**

Create `components/calendar/CalendarPage.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';

export function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Team Calendar</h1>
            <p className="text-gray-400 mt-1">
              Shared schedule for meetings, events, and coordination
            </p>
          </div>
        </div>

        {/* Calendar Container */}
        <GlassCard className="p-6">
          <p className="text-white">Calendar will be rendered here</p>
          {/* Components will be added in next tasks */}
        </GlassCard>
      </div>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add app/dashboard/analyst/calendar/page.tsx app/dashboard/os/calendar/page.tsx components/calendar/CalendarPage.tsx
git commit -m "feat(calendar): add calendar page structure for analyst and OS"
```

---

## Task 8: Calendar Header with Controls

**Files:**
- Create: `components/calendar/CalendarHeader.tsx`
- Modify: `components/calendar/CalendarPage.tsx`

**Step 1: Create CalendarHeader component**

Create `components/calendar/CalendarHeader.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Search, Plus } from 'lucide-react';
import { PrismButton } from '@/components/ui/PrismButton';
import { PrismInput } from '@/components/ui/PrismInput';
import { PrismSelect } from '@/components/ui/PrismSelect';

interface CalendarHeaderProps {
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onSearchChange: (search: string) => void;
  onUserFilterChange: (userId: string) => void;
  onAddEvent: () => void;
  users: Array<{ value: string; label: string }>;
}

export function CalendarHeader({
  currentMonth,
  onMonthChange,
  onSearchChange,
  onUserFilterChange,
  onAddEvent,
  users,
}: CalendarHeaderProps) {
  const [searchValue, setSearchValue] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(searchValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue, onSearchChange]);

  return (
    <div className="space-y-4">
      {/* Top Row: Search, Filter, Add Button */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Search */}
        <div className="flex-1 min-w-[200px] max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <PrismInput
            type="text"
            placeholder="Search events..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* User Filter */}
        <div className="w-48">
          <PrismSelect
            options={[
              { value: '', label: 'All Users' },
              ...users,
            ]}
            value=""
            onChange={(value) => onUserFilterChange(value)}
            placeholder="Filter by user"
          />
        </div>

        {/* Add Event Button */}
        <PrismButton
          onClick={onAddEvent}
          className="ml-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Event
        </PrismButton>
      </div>

      {/* Bottom Row: Month Navigation */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => onMonthChange(subMonths(currentMonth, 1))}
          className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>

        <div className="min-w-[200px] text-center">
          <h2 className="text-xl font-semibold text-white">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
        </div>

        <button
          onClick={() => onMonthChange(addMonths(currentMonth, 1))}
          className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Update CalendarPage to use header**

In `components/calendar/CalendarPage.tsx`, update:

```typescript
'use client';

import { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { CalendarHeader } from './CalendarHeader';

export function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState('');

  // Mock users - will be replaced with real data
  const users = [
    { value: 'user1', label: 'John Doe' },
    { value: 'user2', label: 'Jane Smith' },
  ];

  const handleAddEvent = () => {
    console.log('Add event clicked');
    // Will open modal in later task
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Team Calendar</h1>
          <p className="text-gray-400 mt-1">
            Shared schedule for meetings, events, and coordination
          </p>
        </div>

        {/* Calendar Container */}
        <GlassCard className="p-6">
          <CalendarHeader
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            onSearchChange={setSearchQuery}
            onUserFilterChange={setUserFilter}
            onAddEvent={handleAddEvent}
            users={users}
          />

          {/* Calendar will be added next */}
          <div className="mt-6">
            <p className="text-gray-400 text-center py-12">
              Calendar view coming next...
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
```

**Step 3: Test the header**

Run: `npm run dev`

Navigate to: `http://localhost:3000/dashboard/analyst/calendar`

Expected: See header with search, filter, add button, and month navigation

**Step 4: Commit**

```bash
git add components/calendar/CalendarHeader.tsx components/calendar/CalendarPage.tsx
git commit -m "feat(calendar): add calendar header with search, filter, and navigation"
```

---

## Task 9: React Big Calendar Integration

**Files:**
- Create: `components/calendar/Calendar.tsx`
- Create: `components/calendar/calendar-styles.css`
- Modify: `components/calendar/CalendarPage.tsx`

**Step 1: Create calendar styles**

Create `components/calendar/calendar-styles.css`:

```css
/* Import react-big-calendar base styles */
@import 'react-big-calendar/lib/css/react-big-calendar.css';

/* Custom glass morphism styling */
.rbc-calendar {
  @apply text-white;
  min-height: 600px;
}

/* Month view grid */
.rbc-month-view {
  @apply bg-transparent border-white/10;
}

.rbc-header {
  @apply bg-white/5 border-white/10 py-3 text-sm font-semibold text-gray-300;
}

.rbc-month-row {
  @apply border-white/10;
}

/* Date cells */
.rbc-day-bg {
  @apply bg-transparent border-white/5 hover:bg-white/5 transition-colors;
}

.rbc-off-range-bg {
  @apply bg-black/20;
}

.rbc-today {
  @apply bg-indigo-500/10;
}

.rbc-date-cell {
  @apply p-2;
}

.rbc-button-link {
  @apply text-gray-400 hover:text-white text-sm;
}

.rbc-off-range .rbc-button-link {
  @apply text-gray-600;
}

.rbc-today .rbc-button-link {
  @apply text-indigo-400 font-bold;
}

/* Events */
.rbc-event {
  @apply bg-indigo-500/80 border-indigo-400/50 rounded px-2 py-1 text-xs;
  @apply hover:bg-indigo-500/90 transition-colors cursor-pointer;
  backdrop-filter: blur(8px);
}

.rbc-event-label {
  @apply text-gray-300 text-xs;
}

.rbc-event-content {
  @apply text-white font-medium;
}

/* Selected event */
.rbc-selected {
  @apply bg-indigo-600/90;
}

/* Event wrapper */
.rbc-event-allday {
  @apply bg-purple-500/70;
}

/* Toolbar (we'll hide this since we have custom header) */
.rbc-toolbar {
  @apply hidden;
}

/* Overflow indicator */
.rbc-show-more {
  @apply text-indigo-400 hover:text-indigo-300 text-xs bg-white/5 rounded px-2 py-1;
}

/* Popup for overflow events */
.rbc-overlay {
  @apply bg-gray-900/95 border border-white/10 rounded-lg shadow-xl backdrop-blur-sm;
}

.rbc-overlay-header {
  @apply bg-white/5 border-b border-white/10 px-3 py-2 text-white font-semibold;
}
```

**Step 2: Create Calendar component**

Create `components/calendar/Calendar.tsx`:

```typescript
'use client';

import { useMemo } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
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
  currentMonth: Date;
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectSlot: (slotInfo: { start: Date; end: Date }) => void;
  loading?: boolean;
}

export function Calendar({
  events,
  currentMonth,
  onSelectEvent,
  onSelectSlot,
  loading,
}: CalendarProps) {
  // Format events for react-big-calendar
  const calendarEvents = useMemo(() => {
    return events.map(formatEventForCalendar);
  }, [events]);

  // Custom event component to show icons
  const EventComponent = ({ event }: any) => {
    const calEvent = event.resource as CalendarEvent;

    return (
      <div className="flex items-center gap-1 overflow-hidden">
        <span className="truncate flex-1">{event.title}</span>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {calEvent.is_recurring && (
            <Repeat className="w-3 h-3 text-purple-300" />
          )}
          {calEvent.meeting_minutes_link && (
            <FileText className="w-3 h-3 text-blue-300" />
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="h-[600px] flex items-center justify-center">
        <div className="text-gray-400">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="calendar-container">
      <BigCalendar
        localizer={localizer}
        events={calendarEvents}
        startAccessor="start"
        endAccessor="end"
        views={['month']}
        view="month"
        date={currentMonth}
        onNavigate={() => {}} // Navigation handled by our custom header
        onSelectEvent={(event) => onSelectEvent(event.resource)}
        onSelectSlot={onSelectSlot}
        selectable
        popup
        components={{
          event: EventComponent,
        }}
        style={{ height: 600 }}
      />
    </div>
  );
}
```

**Step 3: Update CalendarPage to use Calendar**

In `components/calendar/CalendarPage.tsx`, add Calendar:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { CalendarHeader } from './CalendarHeader';
import { Calendar } from './Calendar';
import { CalendarEvent } from '@/types';

export function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Array<{ value: string; label: string }>>([]);

  // Fetch events
  useEffect(() => {
    fetchEvents();
  }, [searchQuery, userFilter, currentMonth]);

  const fetchEvents = async () => {
    try {
      setLoading(true);

      // Build query params
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (userFilter) params.set('created_by', userFilter);

      // Fetch current month's events (add some buffer for month view)
      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 2, 0);
      params.set('start_date', startDate.toISOString().split('T')[0]);
      params.set('end_date', endDate.toISOString().split('T')[0]);

      const response = await fetch(`/api/calendar/events?${params}`);

      if (response.ok) {
        const data = await response.json();
        setEvents(data);

        // Extract unique users for filter
        const uniqueUsers = Array.from(
          new Map(
            data.map((event: CalendarEvent) => [
              event.created_by,
              { value: event.created_by, label: event.created_by_name || 'Unknown' },
            ])
          ).values()
        );
        setUsers(uniqueUsers);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    console.log('Event selected:', event);
    // Will open QuickEditPopover in next task
  };

  const handleSelectSlot = (slotInfo: { start: Date; end: Date }) => {
    console.log('Slot selected:', slotInfo);
    // Will open EventModal in create mode
  };

  const handleAddEvent = () => {
    console.log('Add event clicked');
    // Will open EventModal
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Team Calendar</h1>
          <p className="text-gray-400 mt-1">
            Shared schedule for meetings, events, and coordination
          </p>
        </div>

        {/* Calendar Container */}
        <GlassCard className="p-6">
          <CalendarHeader
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            onSearchChange={setSearchQuery}
            onUserFilterChange={setUserFilter}
            onAddEvent={handleAddEvent}
            users={users}
          />

          <div className="mt-6">
            <Calendar
              events={events}
              currentMonth={currentMonth}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              loading={loading}
            />
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
```

**Step 4: Test the calendar**

Run: `npm run dev`

Navigate to calendar page

Expected: See month view calendar with any events in database

**Step 5: Commit**

```bash
git add components/calendar/Calendar.tsx components/calendar/calendar-styles.css components/calendar/CalendarPage.tsx
git commit -m "feat(calendar): integrate react-big-calendar with custom styling"
```

---

## Task 10: Quick Edit Popover Component

**Files:**
- Create: `components/calendar/QuickEditPopover.tsx`
- Modify: `components/calendar/CalendarPage.tsx`

**Step 1: Create QuickEditPopover**

Create `components/calendar/QuickEditPopover.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { format } from 'date-fns';
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

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      const updates: Partial<CalendarEvent> = {};

      if (title !== event.title) updates.title = title;
      if (eventDate !== event.event_date) updates.event_date = eventDate;
      if (eventTime !== event.event_time) updates.event_time = eventTime || null;
      if (meetingMinutesLink !== event.meeting_minutes_link) {
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
    <Popover.Root open={open} onOpenChange={(open) => !open && onClose()}>
      <Popover.Portal>
        <Popover.Content
          side="right"
          align="start"
          sideOffset={8}
          className="z-50 w-80 rounded-lg border border-white/10 bg-gray-900/95 backdrop-blur-sm shadow-xl"
          onKeyDown={handleKeyDown}
        >
          <div className="p-4 space-y-3">
            {/* Title */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Title</label>
              <PrismInput
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Event title"
                autoFocus
                maxLength={200}
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Date</label>
              <PrismInput
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>

            {/* Time */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Time (optional)</label>
              <PrismInput
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                placeholder="HH:MM"
              />
            </div>

            {/* Meeting Minutes Link */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Meeting Minutes Link (optional)
              </label>
              <PrismInput
                type="url"
                value={meetingMinutesLink}
                onChange={(e) => setMeetingMinutesLink(e.target.value)}
                placeholder="https://..."
              />
            </div>

            {/* Error */}
            {error && (
              <div className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded">
                {error}
              </div>
            )}

            {/* Actions */}
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
                className="px-3 py-2 rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>

              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-3 py-2 rounded-lg border border-red-500/20 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>

            {/* More Options Link */}
            <button
              onClick={() => {
                onClose();
                onMoreOptions();
              }}
              className="w-full text-xs text-indigo-400 hover:text-indigo-300 flex items-center justify-center gap-1 py-1"
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
```

**Step 2: Integrate QuickEditPopover into CalendarPage**

In `components/calendar/CalendarPage.tsx`, add state and handlers:

```typescript
// Add at top of component
const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
const [quickEditOpen, setQuickEditOpen] = useState(false);

// Update handleSelectEvent
const handleSelectEvent = (event: CalendarEvent) => {
  setSelectedEvent(event);
  setQuickEditOpen(true);
};

// Add handlers for quick edit
const handleQuickSave = async (eventId: string, updates: Partial<CalendarEvent>) => {
  try {
    const response = await fetch(`/api/calendar/events/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updates, edit_scope: 'single' }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update event');
    }

    // Refresh events
    await fetchEvents();
  } catch (error) {
    throw error;
  }
};

const handleQuickDelete = async (eventId: string) => {
  try {
    const response = await fetch(`/api/calendar/events/${eventId}?scope=single`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete event');
    }

    // Refresh events
    await fetchEvents();
  } catch (error) {
    throw error;
  }
};

const handleMoreOptions = () => {
  // Will open full EventModal
  console.log('Open full modal for:', selectedEvent);
};

// Add in JSX after Calendar component
{selectedEvent && (
  <QuickEditPopover
    event={selectedEvent}
    open={quickEditOpen}
    onClose={() => {
      setQuickEditOpen(false);
      setSelectedEvent(null);
    }}
    onSave={handleQuickSave}
    onDelete={handleQuickDelete}
    onMoreOptions={handleMoreOptions}
  />
)}
```

**Step 3: Add import**

At top of `CalendarPage.tsx`:
```typescript
import { QuickEditPopover } from './QuickEditPopover';
```

**Step 4: Test quick edit**

Run dev server, click an event

Expected: Popover appears with editable fields, can save/delete

**Step 5: Commit**

```bash
git add components/calendar/QuickEditPopover.tsx components/calendar/CalendarPage.tsx
git commit -m "feat(calendar): add quick edit popover for fast event editing"
```

---

## Task 11: Event Modal Component (Full Create/Edit)

**Files:**
- Create: `components/calendar/EventModal.tsx`
- Modify: `components/calendar/CalendarPage.tsx`

**Step 1: Create EventModal component**

Create `components/calendar/EventModal.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import * as Dialog from '@radix-ui/react-dialog';
import { CalendarEvent, RecurrencePattern } from '@/types';
import { PrismInput } from '@/components/ui/PrismInput';
import { PrismButton } from '@/components/ui/PrismButton';
import { PrismSelect } from '@/components/ui/PrismSelect';
import { X } from 'lucide-react';

interface EventModalProps {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  event?: CalendarEvent | null;
  prefilledDate?: string;
  onCreate: (data: any) => Promise<void>;
  onUpdate: (eventId: string, data: any) => Promise<void>;
  onDelete: (eventId: string, scope: 'single' | 'all') => Promise<void>;
}

export function EventModal({
  open,
  onClose,
  mode,
  event,
  prefilledDate,
  onCreate,
  onUpdate,
  onDelete,
}: EventModalProps) {
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

  // Initialize form when event or prefilled date changes
  useEffect(() => {
    if (mode === 'edit' && event) {
      setTitle(event.title);
      setEventDate(event.event_date);
      setEventTime(event.event_time || '');
      setNotes(event.notes || '');
      setMeetingMinutesLink(event.meeting_minutes_link || '');
      setIsRecurring(event.is_recurring);
      setRecurrencePattern(event.recurrence_pattern || 'weekly');
      setRecurrenceEndDate(event.recurrence_end_date || '');
    } else if (mode === 'create') {
      setTitle('');
      setEventDate(prefilledDate || format(new Date(), 'yyyy-MM-dd'));
      setEventTime('');
      setNotes('');
      setMeetingMinutesLink('');
      setIsRecurring(false);
      setRecurrencePattern('weekly');
      setRecurrenceEndDate('');
    }
  }, [mode, event, prefilledDate, open]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      if (!title.trim()) {
        setError('Title is required');
        return;
      }

      if (!eventDate) {
        setError('Date is required');
        return;
      }

      if (isRecurring && (!recurrencePattern || !recurrenceEndDate)) {
        setError('Recurrence pattern and end date are required for recurring events');
        return;
      }

      const data = {
        title: title.trim(),
        event_date: eventDate,
        event_time: eventTime || null,
        notes: notes || null,
        meeting_minutes_link: meetingMinutesLink || null,
        is_recurring: isRecurring,
        recurrence_pattern: isRecurring ? recurrencePattern : null,
        recurrence_end_date: isRecurring ? recurrenceEndDate : null,
      };

      if (mode === 'create') {
        await onCreate(data);
      } else if (event) {
        await onUpdate(event.id, { ...data, edit_scope: editScope });
      }

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (scope: 'single' | 'all') => {
    if (!event) return;

    const confirmMessage = scope === 'all'
      ? 'Delete all occurrences of this recurring event?'
      : 'Delete this event?';

    if (!confirm(confirmMessage)) return;

    try {
      setSaving(true);
      await onDelete(event.id, scope);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete event');
    } finally {
      setSaving(false);
    }
  };

  const isRecurringEvent = mode === 'edit' && event && (event.is_recurring || event.parent_event_id);

  return (
    <Dialog.Root open={open} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg border border-white/10 bg-gray-900/95 backdrop-blur-sm shadow-xl p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-xl font-semibold text-white">
              {mode === 'create' ? 'Create Event' : 'Edit Event'}
            </Dialog.Title>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm text-gray-300 mb-2">
                Title <span className="text-red-400">*</span>
              </label>
              <PrismInput
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Event title"
                maxLength={200}
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm text-gray-300 mb-2">
                Date <span className="text-red-400">*</span>
              </label>
              <PrismInput
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>

            {/* Time */}
            <div>
              <label className="block text-sm text-gray-300 mb-2">
                Time (optional)
              </label>
              <PrismInput
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm text-gray-300 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this event..."
                maxLength={2000}
                rows={4}
                className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                {notes.length}/2000 characters
              </p>
            </div>

            {/* Meeting Minutes Link */}
            <div>
              <label className="block text-sm text-gray-300 mb-2">
                Meeting Minutes Link (optional)
              </label>
              <PrismInput
                type="url"
                value={meetingMinutesLink}
                onChange={(e) => setMeetingMinutesLink(e.target.value)}
                placeholder="https://..."
              />
            </div>

            {/* Recurring Options (only for create mode) */}
            {mode === 'create' && (
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="recurring"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="w-4 h-4 rounded border-white/10 bg-white/5 text-indigo-500 focus:ring-indigo-500"
                  />
                  <label htmlFor="recurring" className="text-sm text-gray-300">
                    Recurring event
                  </label>
                </div>

                {isRecurring && (
                  <>
                    <div>
                      <label className="block text-sm text-gray-300 mb-2">
                        Recurrence Pattern <span className="text-red-400">*</span>
                      </label>
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
                      <label className="block text-sm text-gray-300 mb-2">
                        End Date <span className="text-red-400">*</span>
                      </label>
                      <PrismInput
                        type="date"
                        value={recurrenceEndDate}
                        onChange={(e) => setRecurrenceEndDate(e.target.value)}
                        min={eventDate}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Edit Scope (only for edit mode with recurring events) */}
            {mode === 'edit' && isRecurringEvent && (
              <div className="space-y-2 pt-4 border-t border-white/10">
                <label className="block text-sm text-gray-300 mb-2">
                  Edit Scope
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="editScope"
                      value="single"
                      checked={editScope === 'single'}
                      onChange={(e) => setEditScope('single')}
                      className="w-4 h-4 border-white/10 bg-white/5 text-indigo-500 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-300">Only this event</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="editScope"
                      value="all"
                      checked={editScope === 'all'}
                      onChange={(e) => setEditScope('all')}
                      className="w-4 h-4 border-white/10 bg-white/5 text-indigo-500 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-300">All occurrences</span>
                  </label>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded">
                {error}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-6 pt-6 border-t border-white/10">
            {mode === 'edit' && (
              <div className="flex gap-2 mr-auto">
                <button
                  onClick={() => handleDelete('single')}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors text-sm"
                >
                  Delete{isRecurringEvent && ' This'}
                </button>
                {isRecurringEvent && (
                  <button
                    onClick={() => handleDelete('all')}
                    disabled={saving}
                    className="px-4 py-2 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors text-sm"
                  >
                    Delete All
                  </button>
                )}
              </div>
            )}

            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>

            <PrismButton
              onClick={handleSave}
              disabled={saving || !title.trim() || !eventDate}
            >
              {saving ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}
            </PrismButton>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

**Step 2: Integrate EventModal into CalendarPage**

In `components/calendar/CalendarPage.tsx`, add EventModal state and handlers:

```typescript
// Add state
const [eventModalOpen, setEventModalOpen] = useState(false);
const [eventModalMode, setEventModalMode] = useState<'create' | 'edit'>('create');
const [eventForModal, setEventForModal] = useState<CalendarEvent | null>(null);
const [prefilledDate, setPrefilledDate] = useState<string>('');

// Update handlers
const handleAddEvent = () => {
  setEventModalMode('create');
  setEventForModal(null);
  setPrefilledDate('');
  setEventModalOpen(true);
};

const handleSelectSlot = (slotInfo: { start: Date; end: Date }) => {
  setEventModalMode('create');
  setEventForModal(null);
  setPrefilledDate(format(slotInfo.start, 'yyyy-MM-dd'));
  setEventModalOpen(true);
};

const handleMoreOptions = () => {
  if (selectedEvent) {
    setEventModalMode('edit');
    setEventForModal(selectedEvent);
    setEventModalOpen(true);
  }
};

// Add CRUD handlers for EventModal
const handleCreate = async (data: any) => {
  try {
    const response = await fetch('/api/calendar/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create event');
    }

    await fetchEvents();
  } catch (error) {
    throw error;
  }
};

const handleUpdate = async (eventId: string, data: any) => {
  try {
    const response = await fetch(`/api/calendar/events/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update event');
    }

    await fetchEvents();
  } catch (error) {
    throw error;
  }
};

const handleDeleteFromModal = async (eventId: string, scope: 'single' | 'all') => {
  try {
    const response = await fetch(`/api/calendar/events/${eventId}?scope=${scope}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete event');
    }

    await fetchEvents();
  } catch (error) {
    throw error;
  }
};

// Add EventModal to JSX after QuickEditPopover
<EventModal
  open={eventModalOpen}
  onClose={() => setEventModalOpen(false)}
  mode={eventModalMode}
  event={eventForModal}
  prefilledDate={prefilledDate}
  onCreate={handleCreate}
  onUpdate={handleUpdate}
  onDelete={handleDeleteFromModal}
/>
```

**Step 3: Add import**

```typescript
import { EventModal } from './EventModal';
```

**Step 4: Test the modal**

Run dev server, test create and edit flows

Expected: Can create events, edit with full options, handle recurring

**Step 5: Commit**

```bash
git add components/calendar/EventModal.tsx components/calendar/CalendarPage.tsx
git commit -m "feat(calendar): add full event modal with recurring options"
```

---

## Task 12: Add Navigation Links

**Files:**
- Modify: `app/dashboard/(main)/analyst/page.tsx`
- Modify: `app/dashboard/(main)/os/page.tsx`

**Step 1: Check current dashboard structure**

Read the analyst and OS dashboard files to see where to add calendar navigation

**Step 2: Add calendar link to analyst dashboard**

In `app/dashboard/(main)/analyst/page.tsx`, add a link/button to navigate to `/dashboard/analyst/calendar`. Look for existing navigation patterns and follow them.

**Step 3: Add calendar link to OS dashboard**

In `app/dashboard/(main)/os/page.tsx`, add a link/button to navigate to `/dashboard/os/calendar`.

**Step 4: Test navigation**

Navigate to both dashboards and click calendar links

Expected: Navigate to calendar pages successfully

**Step 5: Commit**

```bash
git add app/dashboard/(main)/analyst/page.tsx app/dashboard/(main)/os/page.tsx
git commit -m "feat(calendar): add navigation links to analyst and OS dashboards"
```

---

## Task 13: Final Testing and Polish

**Files:**
- Various (fixes as needed)

**Step 1: End-to-end testing**

Test complete user flows:
1. Create single event
2. Create recurring event (weekly for 1 month)
3. Edit single event via quick edit
4. Edit recurring event via modal (single and all)
5. Delete event (single and all for recurring)
6. Search events by keyword
7. Filter events by user
8. Navigate between months

**Step 2: Test error cases**

- Invalid URL in meeting minutes link
- Title too long (>200 chars)
- Notes too long (>2000 chars)
- Recurring end date before start date
- Create event without authentication
- Access calendar with non-ANALYST/OS role

**Step 3: Visual polish**

- Verify glass morphism styling matches dashboard
- Check responsive design on mobile
- Verify icons display correctly
- Check loading states
- Verify error messages are clear

**Step 4: Fix any issues found**

Make necessary fixes and commit them

**Step 5: Final commit**

```bash
git add .
git commit -m "feat(calendar): final testing and polish"
```

---

## Summary

Implementation complete! The calendar feature includes:

✅ Database schema with RLS policies
✅ API routes with RBAC (ANALYST + DIVISI_OS only)
✅ Calendar utilities for recurring events
✅ react-big-calendar integration with custom styling
✅ Quick edit popover for fast corrections
✅ Full event modal with recurring options
✅ Search and filter functionality
✅ Navigation links from dashboards
✅ Collaborative editing (all users can edit any event)
✅ Shared calendar between ANALYST and OS roles

**Total Tasks: 13**
**Estimated Time: ~30 hours (4-5 days)**