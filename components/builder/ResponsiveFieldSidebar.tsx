'use client';

import { useState, useRef, useEffect } from 'react';
import { X, GripVertical, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FieldDef } from '@/types/builder';

interface ResponsiveFieldSidebarProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  onFieldSelect?: (table: string, field: FieldDef) => void;
  className?: string;
}

export function ResponsiveFieldSidebar({
  children,
  isOpen,
  onClose,
  onFieldSelect,
  className,
}: ResponsiveFieldSidebarProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [sheetHeight, setSheetHeight] = useState(50); // percentage
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Touch handlers for mobile bottom sheet
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setDragStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const deltaY = dragStartY - e.touches[0].clientY;
    const newHeight = Math.max(30, Math.min(85, sheetHeight + (deltaY / window.innerHeight) * 100));
    setSheetHeight(newHeight);
    setDragStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    // Snap to nearest position
    if (sheetHeight < 40) {
      onClose();
    } else if (sheetHeight < 65) {
      setSheetHeight(50);
    } else {
      setSheetHeight(85);
    }
  };

  // Desktop: Fixed sidebar
  if (!isMobile) {
    return (
      <div className={cn("h-full flex flex-col", className)}>
        {children}
      </div>
    );
  }

  // Mobile: Bottom sheet drawer
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 touch-none"
        onClick={onClose}
        style={{ backdropFilter: 'blur(2px)' }}
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          "fixed left-0 right-0 bottom-0 z-50 bg-[var(--surface-1)] rounded-t-2xl shadow-2xl",
          "transition-transform duration-300 ease-out",
          "flex flex-col",
          className
        )}
        style={{ 
          height: `${sheetHeight}vh`,
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
        }}
      >
        {/* Drag Handle */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="flex items-center justify-center py-3 touch-none cursor-grab active:cursor-grabbing"
        >
          <div className="w-12 h-1.5 bg-[var(--surface-4)] rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-[var(--surface-4)]">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-[var(--brand-primary)]" />
            <span className="text-sm font-bold text-[var(--text-primary)]">Fields</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-full hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)] transition-colors"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <X size={20} className="text-[var(--text-muted)]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </>
  );
}

// Touch-friendly field item for mobile
interface TouchFieldItemProps {
  table: string;
  field: FieldDef;
  onSelect: (table: string, field: FieldDef) => void;
  icon: React.ReactNode;
  colorClass: string;
  label: string;
}

export function TouchFieldItem({
  table,
  field,
  onSelect,
  icon,
  colorClass,
  label,
}: TouchFieldItemProps) {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <button
      onClick={() => onSelect(table, field)}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
        "active:scale-[0.98]",
        isPressed ? "bg-[var(--surface-3)]" : "bg-transparent hover:bg-[var(--surface-2)]"
      )}
      style={{ minHeight: '48px' }}
    >
      <div className={cn("shrink-0", colorClass)}>
        {icon}
      </div>
      <div className="flex-1 text-left">
        <span className="text-sm font-medium text-[var(--text-primary)] block truncate">
          {field.label}
        </span>
        <span className="text-xs text-[var(--text-muted)] block">
          {label}
        </span>
      </div>
      <GripVertical size={16} className="text-[var(--text-muted)] opacity-50" />
    </button>
  );
}

// Collapsible section for mobile
interface TouchCollapsibleSectionProps {
  title: string;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export function TouchCollapsibleSection({
  title,
  count,
  isExpanded,
  onToggle,
  children,
  icon,
}: TouchCollapsibleSectionProps) {
  return (
    <div className="border-b border-[var(--surface-4)] last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 active:bg-[var(--surface-2)] transition-colors"
        style={{ minHeight: '48px' }}
      >
        <div className="flex items-center gap-3">
          {icon && <span className="text-[var(--text-muted)]">{icon}</span>}
          <span className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)]">{count}</span>
          <svg
            className={cn(
              "w-4 h-4 text-[var(--text-muted)] transition-transform duration-200",
              isExpanded ? "rotate-180" : ""
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      
      <div
        className={cn(
          "overflow-hidden transition-all duration-200 ease-out",
          isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="pb-2">
          {children}
        </div>
      </div>
    </div>
  );
}
