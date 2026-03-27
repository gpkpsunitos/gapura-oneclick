'use client';

import React from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';

interface SeverityData {
  severity: string;
  count: number;
  percentage: number;
}

interface SeverityDistributionChartProps {
  data: SeverityData[];
  title?: string;
  explanation?: string;
}

const SEVERITY_CONFIG: Record<string, { color: string; bgColor: string; icon: any; label: string }> = {
  'CRITICAL': { 
    color: '#dc2626', 
    bgColor: 'bg-red-100', 
    icon: AlertTriangle,
    label: 'Kritis'
  },
  'HIGH': { 
    color: '#ea580c', 
    bgColor: 'bg-orange-100', 
    icon: AlertCircle,
    label: 'Tinggi'
  },
  'MEDIUM': { 
    color: '#ca8a04', 
    bgColor: 'bg-yellow-100', 
    icon: Info,
    label: 'Sedang'
  },
  'LOW': { 
    color: '#16a34a', 
    bgColor: 'bg-green-100', 
    icon: CheckCircle,
    label: 'Rendah'
  },
};

export function SeverityDistributionChart({ 
  data, 
  title = 'Distribusi Severity',
  explanation 
}: SeverityDistributionChartProps) {
  // Handle empty data
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#e0e0e0] flex flex-col overflow-hidden h-full">
        <div className="px-4 py-3 border-b border-[#f0f0f0] flex items-center justify-between">
          <h4 className="text-[11px] font-bold text-[#333] uppercase tracking-tight">
            {title}
          </h4>
          <div className="w-1.5 h-1.5 rounded-full bg-[#6b8e3d]" />
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-[11px] text-gray-500">Tidak ada data severity</p>
            <p className="text-[9px] text-gray-400 mt-1">Data mungkin belum tersedia atau kosong</p>
          </div>
        </div>
        {explanation && (
          <div className="px-4 py-3 bg-[#fcfcfc] border-t border-[#f0f0f0] flex gap-2.5 items-start">
            <Info className="w-3.5 h-3.5 text-[#6b8e3d] mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-[#777] leading-relaxed italic">
              {explanation}
            </p>
          </div>
        )}
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.count, 0);
  
  const sortedData = [...data].sort((a, b) => {
    const order = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    return order.indexOf(a.severity) - order.indexOf(b.severity);
  });

  return (
    <div className="bg-white rounded-xl border border-[#e0e0e0] flex flex-col overflow-hidden transition-all hover:shadow-[0_4px_15px_-4px_rgba(0,0,0,0.1)] hover:border-[#6b8e3d]/30 h-full">
      <div className="px-4 py-3 border-b border-[#f0f0f0] flex items-center justify-between">
        <h4 className="text-[11px] font-bold text-[#333] uppercase tracking-tight">
          {title}
        </h4>
        <div className="w-1.5 h-1.5 rounded-full bg-[#6b8e3d]" />
      </div>
      
      <div className="p-4 pt-10 flex-1 flex flex-col">
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {sortedData.map((item) => {
            const config = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG['MEDIUM'];
            const Icon = config.icon;
            
            return (
              <div key={item.severity} className={`${config.bgColor} rounded-lg p-2 text-center`}>
                <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: config.color }} />
                <div className="text-lg font-bold" style={{ color: config.color }}>
                  {item.count.toLocaleString('id-ID')}
                </div>
                <div className="text-[9px] text-gray-600 uppercase font-medium">
                  {config.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bar Chart */}
        <div className="flex-1 flex items-end gap-2 h-[160px]">
          {sortedData.map((item) => {
            const config = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG['MEDIUM'];
            const height = total > 0 ? (item.count / total) * 100 : 0;
            
            return (
              <div key={item.severity} className="flex-1 flex flex-col items-center">
                <div className="text-[10px] font-bold text-gray-700 mb-1">
                  {item.percentage.toFixed(1)}%
                </div>
                <div 
                  className="w-full rounded-t-lg transition-all duration-500 relative group cursor-pointer"
                  style={{ 
                    height: `${Math.max(height, 5)}%`,
                    backgroundColor: config.color,
                    minHeight: '20px'
                  }}
                >
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity rounded-t-lg" />
                </div>
                <div className="text-[9px] text-gray-500 mt-1 text-center uppercase font-medium truncate w-full">
                  {config.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Total */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
          <span className="text-[10px] text-gray-500">Total Kasus</span>
          <span className="text-sm font-bold text-gray-800">{total.toLocaleString('id-ID')}</span>
        </div>
      </div>

      {explanation && (
        <div className="px-4 py-3 bg-[#fcfcfc] border-t border-[#f0f0f0] flex gap-2.5 items-start">
          <Info className="w-3.5 h-3.5 text-[#6b8e3d] mt-0.5 flex-shrink-0" />
          <p className="text-[10px] text-[#777] leading-relaxed italic">
            {explanation}
          </p>
        </div>
      )}
    </div>
  );
}
