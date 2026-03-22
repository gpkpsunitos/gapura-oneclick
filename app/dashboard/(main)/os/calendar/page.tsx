import { Metadata } from 'next';
import { CalendarPage } from '@/components/calendar/CalendarPage';

export const metadata: Metadata = {
  title: 'Event Calendar | OS Dashboard',
  description: 'Shared calendar for team events and coordination',
};

export default function OSCalendarPage() {
  return (
    <CalendarPage 
      calendarType="event" 
      title="Event Calendar" 
      description="Shared schedule for events and coordination"
      canEdit={false}
    />
  );
}
