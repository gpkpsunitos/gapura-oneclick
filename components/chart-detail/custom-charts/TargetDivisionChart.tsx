'use client';

import React from 'react';
import { Building2, Briefcase, Info } from 'lucide-react';

interface DivisionData {
  division: string;
  count: number;
  percentage: number;
  avgResolutionTime?: number;
}

interface TargetDivisionChartProps {
  data: DivisionData[];
  title?: string;
  explanation?: string;
}

const DIVISION_CONFIG: Record<string, { 
  color: string; 
  bgColor: string; 
  label: string;
  description: string;
}> = {
  'OS': { 
    color: '#2563eb', 
    bgColor: 'bg-blue-100', 
    label: 'OS',
    description: 'Services'
  },
  'OP': { 
    color: '#7c3aed', 
    bgColor: 'bg-purple-100', 
    label: 'OP',
    description: 'Operasi'
  },
  'OT': { 
    color: '#ea580c', 
    bgColor: 'bg-orange-100', 
    label: 'OT',
    description: 'Teknik'
  },
  'UQ': { 
    color: '#dc2626', 
    bgColor: 'bg-red-100', 
    label: 'UQ',
    description: 'Quality'
  },
  'GA': { 
    color: '#0891b2', 
    bgColor: 'bg-cyan-100', 
    label: 'GA',
    description: 'General Affairs'
  },
  'HR': { 
    color: '#16a34a', 
    bgColor: 'bg-green-100', 
    label: 'HR',
    description: 'Human Resources'
  },
};

export function TargetDivisionChart({ 
  data, 
  title = 'Distribusi per Divisi',
  explanation 
}: TargetDivisionChartProps) {
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
              <Building2 className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-[11px] text-gray-500">Tidak ada data divis</p>
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
  const sortedData = [...data].sort((a, b) => b.count - a.count);
  const maxCount = Math.max(...sortedData.map(d => d.count), 1);

  return (
    <div className="bg-white rounded-xl border border-[#e0e0e0] flex flex-col overflow-hidden transition-all hover:shadow-[0_4px_15px_-4px_rgba(0,0,0,0.1)] hover:border-[#6b8e3d]/30 h-full">
      <div className="px-4 py-3 border-b border-[#f0f0f0] flex items-center justify-between">
        <h4 className="text-[11px] font-bold text-[#333] uppercase tracking-tight">
          {title}
        </h4>
        <div className="w-1.5 h-1.5 rounded-full bg-[#6b8e3d]" />
      </div>
      
      <div className="p-4 flex-1 flex flex-col">
        {/* Division Cards */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {sortedData.slice(0, 4).map((item) => {
            const config = DIVISION_CONFIG[item.division] || { 
              color: '#6b7280', 
              bgColor: 'bg-gray-100', 
              label: item.division,
              description: 'Lainnya'
            };
            
            return (
              <div 
                key={item.division} 
                className={`${config.bgColor} rounded-lg p-2.5 border-l-4`}
                style={{ borderLeftColor: config.color }}
              >
                <div className="flex items-center justify-between">
                  <span 
                    className="text-xl font-black"
                    style={{ color: config.color }}
                  >
                    {config.label}
                  </span>
                  <Briefcase className="w-4 h-4 opacity-50" style={{ color: config.color }} />
                </div>
                <div className="text-lg font-bold text-gray-800 mt-1">
                  {item.count.toLocaleString('id-ID')}
                </div>
                <div className="text-[9px] text-gray-500">
                  {config.description} • {item.percentage.toFixed(1)}%
                </div>
              </div>
            );
          })}
        </div>

        {/* Horizontal Bar Chart */}
        <div className="flex-1 space-y-2">
          {sortedData.map((item) => {
            const config = DIVISION_CONFIG[item.division] || { 
              color: '#6b7280', 
              bgColor: 'bg-gray-100', 
              label: item.division,
              description: 'Lainnya'
            };
            const barWidth = (item.count / maxCount) * 100;
            
            return (
              <div key={item.division} className="group">
                <div className="flex items-center gap-2 mb-1">
                  <div 
                    className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ backgroundColor: config.color }}
                  >
                    {config.label}
                  </div>
                  <span className="text-[10px] text-gray-600 flex-1">{config.description}</span>
                  <span className="text-[10px] font-bold text-gray-800">{item.count}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500 group-hover:opacity-80"
                    style={{ 
                      width: `${barWidth}%`,
                      backgroundColor: config.color
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Stats */}
        <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-2">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-800">{sortedData.length}</div>
            <div className="text-[9px] text-gray-500 uppercase">Divisi</div>
          </div>
          <div className="text-center border-l border-gray-100">
            <div className="text-lg font-bold text-gray-800">
              {Math.round(total / sortedData.length)}
            </div>
            <div className="text-[9px] text-gray-500 uppercase">Rata-rata</div>
          </div>
          <div className="text-center border-l border-gray-100">
            <div className="text-lg font-bold text-[#6b8e3d]">
              {sortedData[0]?.division || '-'}
            </div>
            <div className="text-[9px] text-gray-500 uppercase">Tertinggi</div>
          </div>
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
