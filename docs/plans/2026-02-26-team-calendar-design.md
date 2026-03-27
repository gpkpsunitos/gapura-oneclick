# Team Calendar Feature Design

**Date:** 2026-02-26
**Feature:** Shared Calendar/Timeframe for Analyst & OS Division Roles
**Approach:** react-big-calendar with custom glass morphism styling

---

## Overview

Add a Google Calendar-like timeframe feature accessible to ANALYST and DIVISI_OS roles. The calendar is shared between both roles, allowing collaborative event management including meeting minutes links, notes, and recurring events.

## Requirements

### Functional Requirements
- Shared calendar visible to both ANALYST and DIVISI_OS users
- Collaborative editing: all authorized users can create, edit, delete any event
- Event fields: title, date, time (optional), notes, meeting minutes link
- Recurring events: daily, weekly, monthly patterns with end date
- Quick edit: inline popover for fast corrections (title, date, time, link)
- Full edit modal: detailed editing including notes and recurring settings
- Search: find events by keyword in title/notes
- Filter: view events by specific user
- Month view display

### Non-Functional Requirements
- Match existing glass morphism design aesthetic
- Fast load times (<2s for month view)
- Responsive design
- Access control: only ANALYST and DIVISI_OS roles

---

## Architecture

### Tech Stack
- **Frontend:** React, Next.js App Router, react-big-calendar v1.15.0
- **Backend:** Supabase (PostgreSQL), Next.js API routes
- **UI:** TailwindCSS, Radix UI, existing Prism components
- **Date handling:** date-fns v4.1.0

### Component Structure

```
/dashboard/analyst/calendar/page.tsx
/dashboard/os/calendar/page.tsx
    └── CalendarPage
        ├── CalendarHeader (search, filters, add button)
        ├── Calendar (react-big-calendar)
        ├── QuickEditPopover (inline editing)
        └── EventModal (full create/edit)
```

### Data Flow

```
User Action → Component → API Route → Supabase → Response → UI Update
```

---

## Database Schema

### Table: `calendar_events`

```sql
CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Event details
    title TEXT NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME,
    notes TEXT,
    meeting_minutes_link TEXT,

    -- Recurring
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern TEXT,  -- 'daily', 'weekly', 'monthly'
    recurrence_end_date DATE,
    parent_event_id UUID REFERENCES calendar_events(id),

    -- Metadata
    created_by UUID REFERENCES users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_calendar_events_date ON calendar_events(event_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_calendar_events_created_by ON calendar_events(created_by);
CREATE INDEX idx_calendar_events_parent ON calendar_events(parent_event_id) WHERE parent_event_id IS NOT NULL;
```

### TypeScript Type

```typescript
export interface CalendarEvent {
    id: string;
    title: string;
    event_date: string;
    event_time?: string | null;
    notes?: string | null;
    meeting_minutes_link?: string | null;
    is_recurring: boolean;
    recurrence_pattern?: 'daily' | 'weekly' | 'monthly' | null;
    recurrence_end_date?: string | null;
    parent_event_id?: string | null;
    created_by: string;
    created_by_name?: string;
    created_at: string;
    updated_at: string;
    deleted_at?: string | null;
}
```

---

## API Design

### Endpoints

#### `GET /api/calendar/events`
**Auth:** ANALYST, DIVISI_OS
**Query params:**
- `search`: keyword search in title/notes
- `created_by`: filter by user ID
- `start_date`: filter events >= date
- `end_date`: filter events <= date

**Response:** `CalendarEvent[]`

#### `POST /api/calendar/events`
**Auth:** ANALYST, DIVISI_OS
**Body:** Event data with optional recurring settings
**Logic:** If recurring, generate parent + child events
**Response:** `CalendarEvent` or `CalendarEvent[]`

#### `PATCH /api/calendar/events/[id]`
**Auth:** ANALYST, DIVISI_OS
**Body:** Partial event data + `edit_scope?: 'single' | 'all'`
**Logic:** If scope='all' and has parent, update all siblings
**Response:** `CalendarEvent`

#### `DELETE /api/calendar/events/[id]`
**Auth:** ANALYST, DIVISI_OS
**Query:** `scope=single|all`
**Logic:** Soft delete (set deleted_at)
**Response:** Success message

### Access Control
- Check user role in session
- Only ANALYST and DIVISI_OS can access all endpoints
- Return 403 for unauthorized roles

---

## UI Components

### CalendarPage
Main container with glass card background. Contains header, calendar, and modals.

### CalendarHeader
- Search input (PrismInput)
- User filter dropdown (PrismSelect)
- Month navigation buttons
- "Add Event" button (PrismButton)

### Calendar (react-big-calendar)
- Month view only
- Custom event cells showing: title, time, icons (recurring, meeting minutes)
- Click event → QuickEditPopover
- Double-click event → EventModal (full edit)
- Click empty date → EventModal (create)

### QuickEditPopover
**Trigger:** Single click on event
**Fields:**
- Title (inline input)
- Date (date picker)
- Time (time picker)
- Meeting minutes link (URL input)

**Actions:**
- Save (Enter key or button)
- Cancel (Esc or button)
- "More options..." → open EventModal
- Delete button

### EventModal
**Trigger:** Double-click event, "Add Event" button, or "More options"
**Fields:**
- All QuickEdit fields
- Notes (textarea)
- Recurring options (checkbox, pattern, end date)

**Actions:**
- Create mode: "Save" button
- Edit mode: "Save" + "Delete" buttons
  - If recurring: "Edit this" vs "Edit all" radio buttons

---

## User Flows

### Quick Edit (5 seconds)
1. Click event → QuickEditPopover opens
2. Edit title/date/time/link
3. Press Enter or click Save
4. Popover closes, calendar refreshes

### Full Edit (15-30 seconds)
1. Double-click event → EventModal opens
2. Edit all fields including notes and recurring
3. Click Save
4. Modal closes, calendar refreshes

### Create Recurring Event
1. Click "Add Event" or empty date
2. Fill event details
3. Check "Recurring" checkbox
4. Select pattern (daily/weekly/monthly) and end date
5. Click Save
6. System generates parent + child events
7. All events appear on calendar

### Search & Filter
1. Type keyword in search bar
2. Calendar filters to matching events
3. Select user from dropdown
4. Calendar shows only that user's events

---

## Recurring Events Logic

### Creation
- User creates event with recurring settings
- Backend creates 1 parent event (`is_recurring = true`)
- Backend generates child events for each occurrence (`parent_event_id` set)
- Max duration: 1 year

### Editing
- **Edit single:** Update only that event instance
- **Edit all:** Update parent + all children (where `deleted_at IS NULL`)

### Deletion
- **Delete single:** Soft delete that instance only
- **Delete all:** Soft delete parent + all children

---

## Validation & Error Handling

### Validations
- Title: required, max 200 chars
- Event date: required
- Meeting minutes link: valid URL format if provided
- Notes: max 2000 chars
- Recurrence end date: must be after event date
- Recurring duration: max 1 year

### Error Messages
- "Title is required"
- "Invalid URL format"
- "End date must be after event date"
- "Access denied - ANALYST or OS role required"
- "Failed to create event - please try again"

### Edge Cases
- Past dates: allowed (for documenting past meetings)
- Overlapping events: allowed
- Same-day multiple events: allowed
- Empty calendar: show "No events this month" message
- Network errors: show retry button

---

## Styling

### Design System Integration
- Glass morphism cards (`GlassCard` component)
- Prism UI components (buttons, inputs, selects)
- Color scheme: neutral/purple (shared between analyst & OS)
- Aurora background effects
- Consistent spacing and typography

### react-big-calendar Customization
- Override default CSS with Tailwind classes
- Custom event cell rendering
- Hover effects with glass morphism
- Responsive month grid
- Dark mode compatible

---

## Performance Considerations

- Index on `event_date` for fast month queries
- Soft delete to preserve history without affecting performance
- Pagination if events exceed 100 per month
- Debounce search input (300ms)
- Optimistic UI updates for quick edit
- SWR caching for event data

---

## Testing Strategy

### Unit Tests
- Event CRUD operations
- Recurring event generation logic
- Search and filter functions
- URL validation

### Integration Tests
- API routes with auth
- Database queries and indexes
- Recurring event updates (single vs all)

### Manual Testing
- All user flows (quick edit, full edit, create, delete)
- Recurring events (create, edit single, edit all, delete)
- Search and filter combinations
- Responsive design on mobile/tablet
- Error states and validations

---

## Future Enhancements (Out of Scope)

- Email notifications for upcoming events
- Export calendar to PDF/Excel
- Event categories/tags
- Event attachments
- Team member availability view
- Integration with external calendars (Google, Outlook)
- Drag-and-drop event rescheduling
- Week/day views

---

## Timeline

**Estimated: 27 hours (3-4 days)**

1. Database & Types: 4 hours
2. API Routes: 4 hours
3. Dependencies: 30 mins
4. Core Components: 8 hours
5. Features: 6 hours
6. Navigation: 2 hours
7. Testing & Polish: 3 hours
