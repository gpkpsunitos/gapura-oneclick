'use client';

import { useState, useEffect } from 'react';
import { View } from 'react-big-calendar';
import { GlassCard } from '@/components/ui/GlassCard';
import { CalendarHeader } from './CalendarHeader';
import { Calendar } from './Calendar';
import { QuickEditPopover } from './QuickEditPopover';
import { EventModal } from './EventModal';
import { EventDetailModal } from './EventDetailModal';
import { CalendarEvent, CalendarType } from '@/types';

interface CalendarPageProps {
  calendarType?: CalendarType;
  title?: string;
  description?: string;
  canEdit?: boolean;
}

export function CalendarPage({ calendarType = 'event', title, description, canEdit = false }: CalendarPageProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>('month');
  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Array<{ value: string; label: string }>>([]);
  
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [quickEditOpen, setQuickEditOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [eventModalMode, setEventModalMode] = useState<'create' | 'edit'>('create');
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);

  useEffect(() => {
    fetchEvents();
  }, [searchQuery, userFilter, currentDate, currentView]);

  const fetchEvents = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.set('calendar_type', calendarType);
      if (searchQuery) params.set('search', searchQuery);
      if (userFilter) params.set('created_by', userFilter);

      let startDate: Date;
      let endDate: Date;

      if (currentView === 'month') {
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0);
      } else {
        const day = currentDate.getDay();
        startDate = new Date(currentDate);
        startDate.setDate(startDate.getDate() - day - 7);
        endDate = new Date(currentDate);
        endDate.setDate(endDate.getDate() + (6 - day) + 7);
      }
      
      params.set('start_date', startDate.toISOString().split('T')[0]);
      params.set('end_date', endDate.toISOString().split('T')[0]);

      const response = await fetch(`/api/calendar/events?${params}`);

      if (response.ok) {
        const data = await response.json();
        setEvents(data);

        const userMap = new Map<string, { value: string; label: string }>();
        data.forEach((event: CalendarEvent) => {
          if (!userMap.has(event.created_by)) {
            userMap.set(event.created_by, {
              value: event.created_by,
              label: event.created_by_name || 'Unknown',
            });
          }
        });
        setUsers(Array.from(userMap.values()));
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setDetailModalOpen(true);
  };

  const handleDetailEdit = () => {
    setDetailModalOpen(false);
    setEventModalMode('edit');
    setEventModalOpen(true);
  };

  const handleDetailQuickEdit = () => {
    setDetailModalOpen(false);
    setQuickEditOpen(true);
  };

  const handleSelectSlot = (slotInfo: { start: Date; end: Date }) => {
    setSelectedSlot(slotInfo);
    setSelectedEvent(null);
    setEventModalMode('create');
    setEventModalOpen(true);
  };

  const handleAddEvent = () => {
    setSelectedSlot(null);
    setSelectedEvent(null);
    setEventModalMode('create');
    setEventModalOpen(true);
  };

  const handleEventDrop = async (eventId: string, newDate: string) => {
    try {
      const response = await fetch(`/api/calendar/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_date: newDate, edit_scope: 'single' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update event');
      }

      await fetchEvents();
    } catch (error: any) {
      console.error('Error moving event:', error);
      throw error;
    }
  };

  const handleQuickSave = async (eventId: string, updates: Partial<CalendarEvent>) => {
    try {
      const response = await fetch(`/api/calendar/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updates, edit_scope: 'single' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save');
      }

      await fetchEvents();
    } catch (error: any) {
      throw error;
    }
  };

  const handleQuickDelete = async (eventId: string) => {
    try {
      const response = await fetch(`/api/calendar/events/${eventId}?scope=single`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete');
      }

      await fetchEvents();
    } catch (error: any) {
      throw error;
    }
  };

  const handleMoreOptions = () => {
    if (selectedEvent) {
      setQuickEditOpen(false);
      setEventModalMode('edit');
      setEventModalOpen(true);
    }
  };

  const handleModalSave = async () => {
    await fetchEvents();
    setEventModalOpen(false);
  };

  const handleModalDelete = async (eventId: string) => {
    await fetchEvents();
    setEventModalOpen(false);
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6 stagger-children">
        <div className="animate-fade-in-up">
          <h1 className="text-3xl font-bold font-display tracking-tight text-[var(--text-primary)]">
            {title || (calendarType === 'meeting' ? 'Meeting Calendar' : 'Event Calendar')}
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">
            {description || (calendarType === 'meeting' 
              ? 'Schedule and manage meetings' 
              : 'Shared schedule for events and coordination')}
          </p>
        </div>

        <GlassCard className="p-6 animate-fade-in-up" hover={false}>
          <CalendarHeader
            currentDate={currentDate}
            currentView={currentView}
            onDateChange={setCurrentDate}
            onViewChange={setCurrentView}
            onSearchChange={setSearchQuery}
            onUserFilterChange={setUserFilter}
            onAddEvent={canEdit ? handleAddEvent : () => {}}
            users={users}
            canEdit={canEdit}
          />

          <div className="mt-6">
            <Calendar
              events={events}
              currentDate={currentDate}
              currentView={currentView}
              onDateChange={setCurrentDate}
              onViewChange={setCurrentView}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={canEdit ? handleSelectSlot : undefined}
              onEventDrop={canEdit ? handleEventDrop : undefined}
              loading={loading}
            />
          </div>
        </GlassCard>
      </div>

      {selectedEvent && (
        <QuickEditPopover
          event={selectedEvent}
          open={quickEditOpen}
          onClose={() => setQuickEditOpen(false)}
          onSave={handleQuickSave}
          onDelete={handleQuickDelete}
          onMoreOptions={handleMoreOptions}
        />
      )}

      <EventDetailModal
        event={selectedEvent}
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        onEdit={canEdit ? handleDetailEdit : undefined}
        onQuickEdit={canEdit ? handleDetailQuickEdit : undefined}
      />

      <EventModal
        open={eventModalOpen}
        onClose={() => setEventModalOpen(false)}
        onSave={handleModalSave}
        onDelete={handleModalDelete}
        event={eventModalMode === 'edit' ? selectedEvent : null}
        defaultDate={selectedSlot?.start}
        calendarType={calendarType}
      />
    </div>
  );
}
