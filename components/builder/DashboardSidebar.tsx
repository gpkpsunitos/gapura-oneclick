'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Menu, ChevronLeft, LayoutDashboard, FileText, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardSidebarProps {
  activePage: number;
  onPageChange: (index: number) => void;
  yearRange?: string;
}

const GAPURA_GREEN = '#6b8e3d';

export function DashboardSidebar({ activePage, onPageChange, yearRange = '' }: DashboardSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { name: 'Case Category', icon: BarChart3 },
    { name: 'Detail Category', icon: LayoutDashboard },
    { name: 'Detail Report', icon: FileText },
    { name: 'CGO - Case Category', icon: BarChart3 },
    { name: 'CGO - Detail Report', icon: FileText },
  ];

  return (
    <div
      className="fixed left-0 top-0 h-full bg-[#f5f5f5] border-r border-[#e0e0e0] flex flex-col transition-all duration-300 z-50"
      style={{ width: collapsed ? 60 : 240 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#e0e0e0]">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Image 
              src="/logo.png" 
              alt="Gapura" 
              height={24} 
              width={100} 
              style={{ objectFit: 'contain' }} 
            />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-[#e0e0e0] transition-colors"
          style={{ marginLeft: collapsed ? 'auto' : undefined }}
        >
          {collapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Title */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-[#e0e0e0]">
          <p className="text-sm font-semibold text-[#333]">Customer Feedback</p>
          <p className="text-xs text-[#666]">{yearRange}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-2">
        {navItems.map((item, idx) => {
          const Icon = item.icon;
          const isActive = activePage === idx;
          return (
            <button
              key={idx}
              onClick={() => onPageChange(idx)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200 relative",
                isActive 
                  ? "text-[#6b8e3d] bg-[#e8f5e9]" 
                  : "text-[#666] hover:bg-[#eeeeee]"
              )}
              title={collapsed ? item.name : undefined}
            >
              {isActive && !collapsed && (
                <div 
                  className="absolute left-0 top-0 bottom-0 w-[3px]"
                  style={{ backgroundColor: GAPURA_GREEN }}
                />
              )}
              <Icon size={16} />
              {!collapsed && (
                <span className="text-sm font-medium truncate">{item.name}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-[#e0e0e0]">
          <p className="text-[11px] text-[#999]">Data Last Updated: 2/13/2026 1:18:37 PM</p>
          <button className="text-[11px] text-[#6b8e3d] hover:underline mt-1">Privacy Policy</button>
        </div>
      )}
    </div>
  );
}
