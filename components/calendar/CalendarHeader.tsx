'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { addMonths } from 'date-fns/addMonths';
import { subMonths } from 'date-fns/subMonths';
import { addWeeks } from 'date-fns/addWeeks';
import { subWeeks } from 'date-fns/subWeeks';
import { addDays } from 'date-fns/addDays';
import { subDays } from 'date-fns/subDays';
import { ChevronLeft, ChevronRight, Search, Plus, Calendar, List, Clock } from 'lucide-react';
import { PrismButton } from '@/components/ui/PrismButton';
import { PrismInput } from '@/components/ui/PrismInput';
import { PrismSelect } from '@/components/ui/PrismSelect';
import { View } from 'react-big-calendar';

interface CalendarHeaderProps {
  currentDate: Date;
  currentView: View;
  onDateChange: (date: Date) => void;
  onViewChange: (view: View) => void;
  onSearchChange: (search: string) => void;
  onUserFilterChange: (userId: string) => void;
  onAddEvent: () => void;
  users: Array<{ value: string; label: string }>;
  canEdit?: boolean;
}

export function CalendarHeader({
  currentDate,
  currentView,
  onDateChange,
  onViewChange,
  onSearchChange,
  onUserFilterChange,
  onAddEvent,
  users,
  canEdit = false,
}: CalendarHeaderProps) {
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(searchValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue, onSearchChange]);

  const handlePrev = () => {
    switch (currentView) {
      case 'month':
        onDateChange(subMonths(currentDate, 1));
        break;
      case 'week':
        onDateChange(subWeeks(currentDate, 1));
        break;
      case 'day':
        onDateChange(subDays(currentDate, 1));
        break;
      default:
        onDateChange(subMonths(currentDate, 1));
    }
  };

  const handleNext = () => {
    switch (currentView) {
      case 'month':
        onDateChange(addMonths(currentDate, 1));
        break;
      case 'week':
        onDateChange(addWeeks(currentDate, 1));
        break;
      case 'day':
        onDateChange(addDays(currentDate, 1));
        break;
      default:
        onDateChange(addMonths(currentDate, 1));
    }
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  const formatDateLabel = () => {
    switch (currentView) {
      case 'month':
        return format(currentDate, 'MMMM yyyy');
      case 'week':
        return format(currentDate, "'Week of' MMM d, yyyy");
      case 'day':
        return format(currentDate, 'EEEE, MMMM d, yyyy');
      case 'agenda':
        return format(currentDate, 'MMMM yyyy');
      default:
        return format(currentDate, 'MMMM yyyy');
    }
  };

  const viewButtons = [
    { view: 'month' as View, label: 'Month', icon: Calendar },
    { view: 'week' as View, label: 'Week', icon: List },
    { view: 'day' as View, label: 'Day', icon: Clock },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px] max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <PrismInput
            type="text"
            placeholder="Cari kegiatan..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-10"
          />
        </div>

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

        {canEdit && (
        <PrismButton
          onClick={onAddEvent}
          className="ml-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Event
        </PrismButton>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-[var(--surface-2)] rounded-xl p-1 shadow-inner-rim">
          {viewButtons.map(({ view, label, icon: Icon }) => (
            <button
              key={view}
              onClick={() => onViewChange(view)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                currentView === view
                  ? 'bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-[var(--text-on-brand)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToday}
            className="px-3 py-1.5 text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--brand-primary)] hover:bg-[var(--surface-3)] rounded-lg transition-all duration-200"
          >
            Today
          </button>
          
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="p-2 rounded-lg hover:bg-[var(--surface-3)] transition-all duration-200"
              aria-label="Previous"
            >
              <ChevronLeft className="w-5 h-5 text-[var(--text-primary)]" />
            </button>

            <div className="min-w-[12.5rem] text-center">
              <h2 className="text-lg font-bold font-display tracking-tight text-[var(--text-primary)]">
                {formatDateLabel()}
              </h2>
            </div>

            <button
              onClick={handleNext}
              className="p-2 rounded-lg hover:bg-[var(--surface-3)] transition-all duration-200"
              aria-label="Next"
            >
              <ChevronRight className="w-5 h-5 text-[var(--text-primary)]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
