'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { MobileBuilderTabs, BuilderTab } from './MobileBuilderTabs';
import { ResponsiveFieldSidebar } from './ResponsiveFieldSidebar';

interface ResponsiveBuilderLayoutProps {
  children: {
    fieldSidebar: React.ReactNode;
    queryPanel: React.ReactNode;
    resultsPanel: React.ReactNode;
    dashboardComposer: React.ReactNode;
  };
  className?: string;
}

export function ResponsiveBuilderLayout({
  children,
  className,
}: ResponsiveBuilderLayoutProps) {
  const [activeTab, setActiveTab] = useState<BuilderTab>('fields');
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [composerCollapsed, setComposerCollapsed] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Mobile layout: Single panel with tabs
  if (isMobile) {
    return (
      <div className={cn("flex flex-col h-screen bg-[var(--surface-1)]", className)}>
        <div className="flex-1 overflow-hidden">
          {activeTab === 'fields' && (
            <div className="h-full overflow-auto">
              {children.fieldSidebar}
            </div>
          )}
          {activeTab === 'query' && (
            <div className="h-full overflow-auto">
              {children.queryPanel}
            </div>
          )}
          {activeTab === 'preview' && (
            <div className="h-full">
              {children.resultsPanel}
            </div>
          )}
          {activeTab === 'dashboard' && (
            <div className="h-full overflow-auto">
              {children.dashboardComposer}
            </div>
          )}
        </div>
        <MobileBuilderTabs activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    );
  }

  // Tablet layout: Collapsible panels
  if (isTablet) {
    return (
      <div className={cn("flex h-screen bg-[var(--surface-1)]", className)}>
        {/* Collapsible Sidebar */}
        <div
          className={cn(
            "transition-all duration-300 ease-in-out border-r border-[var(--surface-4)] bg-[var(--surface-1)]",
            sidebarCollapsed ? "w-12" : "w-64"
          )}
        >
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full h-10 flex items-center justify-center border-b border-[var(--surface-4)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <svg
              className={cn(
                "w-4 h-4 text-[var(--text-muted)] transition-transform",
                sidebarCollapsed ? "rotate-180" : ""
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          {!sidebarCollapsed && (
            <div className="h-[calc(100vh-2.5rem)] overflow-auto">
              {children.fieldSidebar}
            </div>
          )}
        </div>

        {/* Center: Query + Results */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-auto">
            {children.queryPanel}
          </div>
          <div className="h-1/2 border-t border-[var(--surface-4)]">
            {children.resultsPanel}
          </div>
        </div>

        {/* Collapsible Composer */}
        <div
          className={cn(
            "transition-all duration-300 ease-in-out border-l border-[var(--surface-4)] bg-[var(--surface-1)]",
            composerCollapsed ? "w-12" : "w-64"
          )}
        >
          <button
            onClick={() => setComposerCollapsed(!composerCollapsed)}
            className="w-full h-10 flex items-center justify-center border-b border-[var(--surface-4)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <svg
              className={cn(
                "w-4 h-4 text-[var(--text-muted)] transition-transform",
                composerCollapsed ? "" : "rotate-180"
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          {!composerCollapsed && (
            <div className="h-[calc(100vh-2.5rem)] overflow-auto">
              {children.dashboardComposer}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop layout: Full 3-column layout
  return (
    <div className={cn("flex h-screen bg-[var(--surface-1)]", className)}>
      {/* Left Sidebar - Fields */}
      <div className="w-64 shrink-0 border-r border-[var(--surface-4)] bg-[var(--surface-1)] overflow-hidden">
        {children.fieldSidebar}
      </div>

      {/* Center - Query Builder + Results */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Query Builder */}
        <div className="shrink-0 max-h-[45vh] overflow-auto border-b border-[var(--surface-4)]">
          {children.queryPanel}
        </div>
        
        {/* Results Panel */}
        <div className="flex-1 overflow-hidden">
          {children.resultsPanel}
        </div>
      </div>

      {/* Right Sidebar - Dashboard Composer */}
      <div className="w-80 shrink-0 border-l border-[var(--surface-4)] bg-[var(--surface-1)] overflow-hidden">
        {children.dashboardComposer}
      </div>
    </div>
  );
}
