
import { useState, useMemo } from 'react';
import { useDrilldown } from '@/components/chart-detail/useDrilldown';

const HEATMAP_GREEN = '#6b8e3d';

const HEATMAP_BANNER = '#5a7a3a';

const HEATMAP_LIGHT = '#e8f5e9';

interface HeatmapChartProps {

    title?: string;

    data: Record<string, unknown>[];

    xAxis: string;

    yAxis: string | string[];

    metric: string;

    onViewDetail?: () => void;

    onCellClick?: (xValue: string, yValues: string[]) => void;

    showTitle?: boolean;

    enableDrilldown?: boolean;
}

export function HeatmapChart({
    title,
    data,
    xAxis,
    yAxis,
    metric,
    onViewDetail,
    onCellClick,
    showTitle = true,
    enableDrilldown = true
}: HeatmapChartProps) {

    const { openDrilldown, DrilldownRenderer } = useDrilldown();

    const yFields = useMemo(() => Array.isArray(yAxis) ? yAxis : [yAxis], [yAxis]);
    const isMultiY = yFields.length > 1;

    const xValues = useMemo(() => 
        Array.from(new Set(data.map(d => d[xAxis] as string))).filter(Boolean).sort(),
    [data, xAxis]);

    const SEPARATOR = '|||';
    const parseRowKey = (key: string) => key.split(SEPARATOR);

    const { pivotMap, rowKeys, rowTotals, colTotals, grandTotal } = useMemo(() => {
        const getRowKeyInternal = (row: Record<string, unknown>) => yFields.map(f => String(row[f] ?? '')).join(SEPARATOR);

        const pMap = new Map<string, Map<string, number>>();
        const rTotals: Record<string, number> = {};
        const cTotals: Record<string, number> = {};
        let gTotal = 0;

        const seenKeys = new Set<string>();
        const rKeys: string[] = [];

        data.forEach(row => {
            const rk = getRowKeyInternal(row);
            const x = String(row[xAxis] ?? '');
            const val = Number(row[metric]) || 0;

            if (!seenKeys.has(rk)) { seenKeys.add(rk); rKeys.push(rk); }

            if (!pMap.has(rk)) pMap.set(rk, new Map());
            const existing = pMap.get(rk)!.get(x) || 0;
            pMap.get(rk)!.set(x, existing + val);
        });

        rKeys.forEach(rk => {
            let rTotal = 0;
            xValues.forEach(x => {
                const val = pMap.get(rk)?.get(x) || 0;
                rTotal += val;
                cTotals[x] = (cTotals[x] || 0) + val;
            });
            rTotals[rk] = rTotal;
            gTotal += rTotal;
        });

        rKeys.sort((a, b) => rTotals[b] - rTotals[a]);

        return { pivotMap: pMap, rowKeys: rKeys, rowTotals: rTotals, colTotals: cTotals, grandTotal: gTotal };
    }, [data, xAxis, metric, xValues, yFields]);

    const allVals = rowKeys.flatMap(rk => xValues.map(x => pivotMap.get(rk)?.get(x) || 0));
    const maxVal = Math.max(...allVals, 1);

    const handleCellClick = (xValue: string, yValues: string[]) => {

        if (onCellClick) {
            onCellClick(xValue, yValues);
        }

        if (enableDrilldown) {

            const filteredData = data.filter(row => {
                const xMatch = String(row[xAxis]) === xValue;
                const yMatch = yFields.every((field, idx) =>
                    String(row[field] || '') === yValues[idx]
                );
                return xMatch && yMatch;
            });

            if (filteredData.length > 0) {
                const cellTitle = `${title || 'Heatmap'}: ${yValues.join(' / ')} × ${xValue}`;
                openDrilldown(filteredData, cellTitle);
            }
        }
    };

    const getCellStyle = (val: number): React.CSSProperties => {
        if (!val) return { textAlign: 'center', padding: '6px 8px', fontSize: 13, color: '#999' };

        const alpha = Math.max(0.1, Math.min(0.6, val / maxVal));
        return {
            textAlign: 'center',
            padding: '6px 8px',
            fontSize: 13,
            fontWeight: 600,
            background: `rgba(107, 142, 61, ${alpha})`,
            color: alpha > 0.4 ? '#fff' : '#333',
            cursor: onCellClick && val > 0 ? 'pointer' : 'default',
        };
    };

    const currentRowKeys = rowKeys;

    return (
        <>
        <div style={{
            background: '#fff',
            borderRadius: 8,
            border: '1px solid #e0e0e0',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            fontFamily: 'var(--font-body)'
        }}>
            {}
            {showTitle && title && (
                <div style={{
                    padding: '16px 20px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0,
                    borderBottom: '1px solid #f0f0f0'
                }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{title}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                         <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, fontFamily: 'var(--font-body)' }}>Report Category / Record Count</span>
                        {onViewDetail && (
                            <button
                                onClick={onViewDetail}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: '#fff',
                                    backgroundColor: HEATMAP_GREEN,
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 4px rgba(107, 142, 61, 0.25)',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = HEATMAP_BANNER;
                                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(107, 142, 61, 0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = HEATMAP_GREEN;
                                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(107, 142, 61, 0.25)';
                                }}
                                title="Lihat Detail"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                    <circle cx="12" cy="12" r="3"/>
                                </svg>
                                <span>Detail</span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {}
            <div style={{ flex: 1, overflow: 'auto', maxHeight: '320px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                        <tr>
                            {yFields.map(f => (
                                <th key={f} style={{
                                    padding: '10px 12px',
                                    textAlign: 'left',
                                    fontWeight: 600,
                                    background: HEATMAP_BANNER,
                                    color: '#fff',
                                    fontSize: 12,
                                    whiteSpace: 'nowrap',
                                    textTransform: 'capitalize',
                                    borderRight: '1px solid rgba(255,255,255,0.1)'
                                }}>{f.replace(/_/g, ' ')}</th>
                            ))}
                            {xValues.map(x => (
                                <th key={x} style={{
                                    padding: '10px 12px',
                                    textAlign: 'center',
                                    fontWeight: 600,
                                    background: HEATMAP_BANNER,
                                    color: '#fff',
                                    fontSize: 12,
                                    whiteSpace: 'nowrap',
                                    borderRight: '1px solid rgba(255,255,255,0.1)'
                                }}>{x}</th>
                            ))}
                             {}
                            <th style={{
                                padding: '10px 12px',
                                textAlign: 'center',
                                fontWeight: 700,
                                background: HEATMAP_BANNER,
                                color: '#fff',
                                fontSize: 12,
                                whiteSpace: 'nowrap',
                            }}>Grand total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentRowKeys.map((rk, idx) => {
                            const parts = parseRowKey(rk);

                            const showFirstField = !isMultiY || (idx === 0 || parts[0] !== parseRowKey(currentRowKeys[idx - 1])[0]);
                            const isOdd = idx % 2 !== 0;

                            return (
                                <tr key={rk} style={{ borderBottom: '1px solid #f0f0f0', background: isOdd ? '#fafafa' : '#fff' }}>
                                    {yFields.map((_, fi) => (
                                        <td key={fi} style={{
                                            padding: '8px 12px',
                                            fontSize: 13,
                                            fontWeight: 600,
                                            color: '#334155',
                                            whiteSpace: 'nowrap',
                                            borderRight: '1px solid #f0f0f0'
                                        }}>
                                            {fi === 0 && isMultiY ? (showFirstField ? parts[fi] : '') : parts[fi]}
                                        </td>
                                    ))}
                                    {xValues.map(x => {
                                        const val = pivotMap.get(rk)?.get(x) || 0;
                                        return (
                                            <td
                                                key={x}
                                                style={{ ...getCellStyle(val), borderRight: '1px solid #f0f0f0' }}
                                                onClick={() => {
                                                    if (val > 0 && (onCellClick || enableDrilldown)) {
                                                        handleCellClick(x, parts);
                                                    }
                                                }}
                                            >
                                                {val || '-'}
                                            </td>
                                        );
                                    })}
                                    {}
                                    <td style={{
                                        padding: '8px 12px',
                                        textAlign: 'center',
                                        fontSize: 13,
                                        fontWeight: 700,
                                        color: '#333',
                                        background: isOdd ? '#f5f9f5' : '#fff'
                                    }}>{rowTotals[rk]}</td>
                                </tr>
                            );
                        })}
                        {}
                        {currentRowKeys.length === 0 && (
                            <tr><td colSpan={yFields.length + xValues.length + 1} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>No data available</td></tr>
                        )}
                    </tbody>
                    <tfoot style={{ position: 'sticky', bottom: 0, zIndex: 10 }}>
                        <tr style={{ background: HEATMAP_LIGHT, borderTop: `2px solid ${HEATMAP_GREEN}` }}>
                            <td colSpan={yFields.length} style={{
                                padding: '10px 12px',
                                fontSize: 13,
                                fontWeight: 700,
                                color: HEATMAP_GREEN,
                            }}>Grand total (All Pages)</td>
                            {xValues.map(x => (
                                <td key={x} style={{
                                    padding: '10px 12px',
                                    textAlign: 'center',
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: HEATMAP_GREEN,
                                }}>{colTotals[x] || 0}</td>
                            ))}
                            <td style={{
                                padding: '10px 12px',
                                textAlign: 'center',
                                fontSize: 14,
                                fontWeight: 800,
                                color: HEATMAP_GREEN,
                            }}>{grandTotal}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

             {}
        </div>

        {}
        {enableDrilldown && <DrilldownRenderer />}
        </>
    );
}
