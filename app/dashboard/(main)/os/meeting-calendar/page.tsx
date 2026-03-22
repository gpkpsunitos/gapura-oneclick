import { Metadata } from 'next';
import { CalendarPage } from '@/components/calendar/CalendarPage';

export const metadata: Metadata = {
  title: 'Meeting Calendar | OS Dashboard',
  description: 'Schedule and manage team meetings',
};

export default function OSMeetingCalendarPage() {
  return (
    <CalendarPage 
      calendarType="meeting" 
      title="Meeting Calendar" 
      description="Schedule and manage meetings"
      canEdit={false}
    />
  );
}
