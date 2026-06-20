'use client';

import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TimePeriod = '7d' | '30d' | '3m' | '6m' | 'custom' | null;

interface TimePeriodFilterProps {
    value: TimePeriod;
    onChange: (period: TimePeriod, from?: string, to?: string) => void;
    className?: string;
}

const PERIOD_OPTIONS: { value: TimePeriod; label: string }[] = [
    { value: '7d', label: '7 Hari' },
    { value: '30d', label: '30 Hari' },
    { value: '3m', label: '3 Bulan' },
    { value: '6m', label: '6 Bulan' },
];

export function TimePeriodFilter({ value, onChange, className }: TimePeriodFilterProps) {
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const handlePeriodClick = (period: TimePeriod) => {
        if (period === value) {
            onChange(null);
        } else {
            setShowDatePicker(false);
            onChange(period);
        }
    };

    const handleCustomApply = () => {
        if (fromDate && toDate) {
            onChange('custom', fromDate, toDate);
            setShowDatePicker(false);
        }
    };

    return (
        <div className={cn('flex items-center gap-2 flex-wrap', className)}>
            {PERIOD_OPTIONS.map((opt) => (
                <button
                    key={opt.value}
                    onClick={() => handlePeriodClick(opt.value)}
                    className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                        value === opt.value
                            ? 'bg-white text-emerald-700 shadow-sm'
                            : 'text-white/80 hover:text-white hover:bg-white/15'
                    )}
                >
                    {opt.label}
                </button>
            ))}

            <div className="relative">
                <button
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
                        value === 'custom'
                            ? 'bg-white text-emerald-700 shadow-sm'
                            : 'text-white/80 hover:text-white hover:bg-white/15'
                    )}
                >
                    <Calendar size={13} />
                    Custom
                </button>

                {showDatePicker && (
                    <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-50 min-w-[280px]">
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 block mb-1">Dari</label>
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 block mb-1">Sampai</label>
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                                />
                            </div>
                            <button
                                onClick={handleCustomApply}
                                disabled={!fromDate || !toDate}
                                className="w-full py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Terapkan
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
