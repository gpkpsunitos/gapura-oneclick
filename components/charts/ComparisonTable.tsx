'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ComparisonMetric } from '@/types';
import { cn } from '@/lib/utils';

interface ComparisonTableProps {
    metrics: ComparisonMetric[];
    title?: string;
    className?: string;
}

const DeltaBadge = ({ value, diff, label, isNA, metricName }: { value: number; diff: number; label: string; isNA?: boolean, metricName?: string }) => {
    const isPositive = value > 0;
    const isZero = value === 0;
    const isCompliment = metricName?.toLowerCase().includes('compliment');
    
    // For compliments, positive is good (Emerald). For others (complaints, irregularities, total), negative is good (Emerald).
    const isGood = isCompliment ? isPositive : (!isPositive && !isZero);

    return (
        <div className="flex flex-col items-end gap-0.5">
            <span className="text-[9px] text-[var(--text-muted)] uppercase font-bold tracking-tight">{label}</span>
            <div className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-all",
                isNA ? "bg-[var(--surface-3)] text-[var(--text-muted)]" :
                isZero ? "bg-[var(--surface-3)] text-[var(--text-muted)]" :
                isGood ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
            )}>
                {isNA ? <Minus size={10} /> : isZero ? <Minus size={10} /> : isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {isNA ? 'N/A' : `${Math.abs(value).toFixed(1)}% (${diff > 0 ? '+' : ''}${diff})`}
            </div>
        </div>
    );
};

export const ComparisonTable: React.FC<ComparisonTableProps> = ({ metrics, title, className }) => {
    if (!metrics || metrics.length === 0) return null;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("bg-[var(--surface-1)] rounded-2xl border border-[var(--surface-3)] overflow-hidden shadow-sm", className)}
        >
            {title && (
                <div className="px-4 py-3 border-b border-[var(--surface-3)] bg-[var(--surface-2)]/50">
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-secondary)]">{title}</h4>
                </div>
            )}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-[var(--surface-2)]/30">
                            <th className="px-4 py-2.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Item / Kategori</th>
                            <th className="px-4 py-2.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">
                                Kini {metrics[0]?.currentMonth ? `(${metrics[0].currentMonth})` : ''}
                            </th>
                            <th className="px-4 py-2.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">
                                Lalu {metrics[0]?.previousMonth ? `(${metrics[0].previousMonth})` : ''}
                            </th>
                            <th className="px-4 py-2.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">
                                MoM Δ / YoY Δ
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--surface-3)]">
                        {metrics.map((metric, idx) => (
                            <tr key={metric.label + idx} className="hover:bg-[var(--surface-2)]/50 transition-colors group">
                                <td className="px-4 py-3">
                                    <span className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors">
                                        {metric.label}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <span className="text-sm font-mono font-bold text-[var(--text-primary)]">
                                        {metric.current.toLocaleString()}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex flex-col items-end">
                                        <span className="text-xs font-mono font-medium text-[var(--text-secondary)]">
                                            {metric.previous.toLocaleString()}
                                        </span>
                                        {metric.yoyPrevious !== undefined && (
                                            <span className="text-[9px] text-[var(--text-muted)] font-bold">
                                                LY: {metric.yoyPrevious.toLocaleString()}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center justify-end gap-3">
                                        <DeltaBadge value={metric.momDelta} diff={metric.current - metric.previous} label="MoM" isNA={metric.previous === 0} metricName={metric.label} />
                                        <DeltaBadge value={metric.yoyDelta ?? 0} diff={metric.current - (metric.yoyPrevious ?? 0)} label="YoY" isNA={metric.yoyPrevious === 0 || metric.yoyPrevious === undefined} metricName={metric.label} />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="px-4 py-3 bg-[var(--surface-2)]/50 text-[10px] text-[var(--text-secondary)] border-t border-[var(--surface-3)]">
                    <div className="flex flex-col gap-1">
                        <p><strong>Panduan Analisis:</strong></p>
                        <p>• <strong>{metrics[0]?.currentMonth || 'Kini'}</strong>: Periode data yang sedang aktif dilihat.</p>
                        <p>• <strong>{metrics[0]?.previousMonth || 'Lalu'}</strong>: Periode pembanding langsung (1 bulan sebelumnya).</p>
                        <p>• <strong>MoM Δ</strong>: Perubahan persentase dibandingkan bulan lalu. <span className="text-emerald-500 font-bold">Naik</span> atau <span className="text-rose-500 font-bold">Turun</span>.</p>
                        <p>• <strong>YoY Δ</strong>: Perubahan persentase dibandingkan bulan yang sama di tahun sebelumnya.</p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
