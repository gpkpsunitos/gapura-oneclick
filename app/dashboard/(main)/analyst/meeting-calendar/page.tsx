import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { CalendarPage } from '@/components/calendar/CalendarPage';

export const metadata: Metadata = {
  title: 'Meeting Calendar | Analyst Dashboard',
  description: 'Schedule and manage team meetings',
};

export default async function AnalystMeetingCalendarPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  const session = token ? await verifySession(token) : null;
  const role = session?.role as string;
  const canEdit = role?.toUpperCase() === 'ANALYST';

  return (
    <CalendarPage 
      calendarType="meeting" 
      title="Meeting Calendar" 
      description="Schedule and manage meetings"
      canEdit={canEdit}
    />
  );
}
