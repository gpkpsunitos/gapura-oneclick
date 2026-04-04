'use client';

import dynamic from 'next/dynamic';

const CalendarPage = dynamic(
  () => import('@/components/calendar/CalendarPage').then(m => ({ default: m.CalendarPage })),
  { ssr: false, loading: () => <div className="h-96 animate-pulse bg-gray-100 rounded-xl" /> }
);

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
