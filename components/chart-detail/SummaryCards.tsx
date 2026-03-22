import { ArrowUpRight, TrendingUp, BarChart3, Activity, ArrowUp } from 'lucide-react';
import type { QueryResult } from '@/types/builder';

interface SummaryCardsProps {
  data: QueryResult;
}

export function SummaryCards({ data }: SummaryCardsProps) {
  // Calculate statistics
  const columns = data.columns;
  const rows = data.rows as Record<string, unknown>[];
  
  // Find numeric columns (measures)
  const sampleRow = rows[0] || {};
  const measureCols = columns.filter((col: string) => typeof sampleRow[col] === 'number');
  const measureCol = measureCols[measureCols.length - 1] || columns[columns.length - 1];
  
  const values = rows.map(row => Number(row[measureCol]) || 0);
  const total = values.reduce((a, b) => a + b, 0);
  const avg = values.length > 0 ? total / values.length : 0;
  const max = values.length > 0 ? Math.max(...values) : 0;
  
  // Primary KPI (Total)
  const primaryMetric = {
    label: 'Total Cases',
    value: total.toLocaleString('id-ID'),
    subtext: `${rows.length} Records Analyzed`
  };

  // Secondary KPIs
  const secondaryMetrics = [
    {
      label: 'Average per Category',
      value: Math.round(avg).toLocaleString('id-ID'),
      icon: Activity,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    {
      label: 'Highest Single Record',
      value: max.toLocaleString('id-ID'),
      icon: ArrowUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50'
    },
    {
      label: 'Active Categories',
      value: rows.length.toLocaleString('id-ID'),
      icon: BarChart3,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50'
    }
  ];

  return (
    <section className="mb-8">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Primary Hero Card */}
        <div className="flex-[2] bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 text-white shadow-lg flex flex-col justify-between min-h-[140px] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp size={100} />
          </div>
          
          <div className="relative z-10">
            <h3 className="text-gray-300 text-xs font-semibold uppercase tracking-widest mb-1">
              {primaryMetric.label}
            </h3>
            <div className="text-5xl font-bold tracking-tight text-white mt-2">
              {primaryMetric.value}
            </div>
          </div>
          
          <div className="relative z-10 mt-4 flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-gray-200">{primaryMetric.subtext}</span>
            </div>
          </div>
        </div>

        {/* Secondary Metrics Grid */}
        <div className="flex-[3] grid grid-cols-1 sm:grid-cols-3 gap-4">
          {secondaryMetrics.map((metric, idx) => (
            <div 
              key={idx} 
              className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-gray-200 transition-all group"
            >
              <div className="flex justify-between items-start">
                <div className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                  {metric.label}
                </div>
                <div className={`p-1.5 rounded-lg ${metric.bg} ${metric.color} group-hover:scale-110 transition-transform`}>
                  <metric.icon size={14} />
                </div>
              </div>
              
              <div className="mt-4">
                <div className="text-2xl font-bold text-gray-900 tracking-tight">
                  {metric.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
