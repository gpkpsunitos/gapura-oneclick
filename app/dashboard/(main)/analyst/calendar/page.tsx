import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { CalendarPage } from '@/components/calendar/CalendarPage';

export const metadata: Metadata = {
  title: 'Event Calendar | Analyst Dashboard',
  description: 'Shared calendar for team events and coordination',
};

export default async function AnalystEventCalendarPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  const session = token ? await verifySession(token) : null;
  const role = session?.role as string;
  const canEdit = role?.toUpperCase() === 'ANALYST';

  return (
    <CalendarPage 
      calendarType="event" 
      title="Event Calendar" 
      description="Shared schedule for events and coordination"
      canEdit={canEdit}
    />
  );
}
