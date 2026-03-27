'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

interface DateRangeFilterProps {
  className?: string;
}

export function DateRangeFilter({ className = '' }: DateRangeFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentRange = searchParams.get('range') || '7d';
  
  const handleRangeChange = (range: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('range', range);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };
  
  return (
    <div className={`date-filter-wrap ${className}`}>
      <div className="date-filter-pill">
        <button
          className={`date-filter-item ${currentRange === '7d' ? 'active' : ''}`}
          onClick={() => handleRangeChange('7d')}
        >
          <span>7D</span>
          <small>Past Week</small>
        </button>
        <button
          className={`date-filter-item ${currentRange === '30d' ? 'active' : ''}`}
          onClick={() => handleRangeChange('30d')}
        >
          <span>30D</span>
          <small>Past Month</small>
        </button>
      </div>
    </div>
  );
}
