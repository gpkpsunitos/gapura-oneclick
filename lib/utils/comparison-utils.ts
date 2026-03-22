import { Report, ComparisonData, ComparisonMetric, MonthlyBucket } from '@/types';

/**
 * Calculates Month-over-Month and Year-over-Year comparison data from a list of reports.
 * Used across multiple dashboard components.
 * 
 * Complexity: Time O(n) | Space O(m) where n = reports, m = unique months
 */
export function calculateComparisonData(filteredReports: Report[]): ComparisonData {
    console.log('[calculateComparisonData] Starting with reports:', filteredReports.length);
    const monthMap = new Map<string, { total: number; irregularity: number; complaint: number; compliment: number; branches: Record<string, number>; airlines: Record<string, number>; areas: { terminal: number; apron: number; general: number } }>();

    filteredReports.forEach((r) => {
        // Use a robust date parsing strategy: 
        // 1. Prefer date_of_event (string YYYY-MM-DD usually)
        // 2. Fallback to created_at
        // 3. Ensure YYYY-MM-DD strings are parsed as LOCAL midnight to avoid UTC day-shifts
        const dateStr = r.date_of_event || r.created_at;
        if (!dateStr) return;

        let d: Date;
        if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const [y, m, day] = dateStr.split('-').map(Number);
            d = new Date(y, m - 1, day);
        } else {
            d = new Date(dateStr);
        }

        if (isNaN(d.getTime())) return;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

        if (!monthMap.has(key)) {
            monthMap.set(key, { 
                total: 0, irregularity: 0, complaint: 0, compliment: 0, 
                branches: {}, airlines: {},
                areas: { terminal: 0, apron: 0, general: 0 }
            });
        }
        const entry = monthMap.get(key)!;
        entry.total++;

        if (r.category === 'Irregularity') entry.irregularity++;
        else if (r.category === 'Complaint') entry.complaint++;
        else if (r.category === 'Compliment') entry.compliment++;

        const area = (r.area || '').toString().toLowerCase();
        if (area.includes('terminal')) entry.areas.terminal++;
        else if (area.includes('apron')) entry.areas.apron++;
        else if (area.includes('general')) entry.areas.general++;

        const branch = r.stations?.code || r.branch || 'Unknown';
        entry.branches[branch] = (entry.branches[branch] || 0) + 1;

        const airline = r.airlines || r.airline || 'Unknown';
        entry.airlines[airline] = (entry.airlines[airline] || 0) + 1;
    });

    console.log('[calculateComparisonData] Processed monthMap size:', monthMap.size);

    const sortedKeys = Array.from(monthMap.keys()).sort();

    const monthlyTrend: MonthlyBucket[] = sortedKeys.map((key) => {
        const e = monthMap.get(key)!;
        const [y, m] = key.split('-').map(Number);
        const label = `${y} ${new Date(y, m - 1).toLocaleString('en-US', { month: 'short' })}`;
        return { month: label, total: e.total, irregularity: e.irregularity, complaint: e.complaint, compliment: e.compliment };
    });

    const calcDelta = (curr: number, prev: number): number =>
        prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;

    const latestKey = sortedKeys[sortedKeys.length - 1];
    const prevKey = sortedKeys[sortedKeys.length - 2];
    const latestEntry = latestKey ? monthMap.get(latestKey)! : { total: 0, irregularity: 0, complaint: 0, compliment: 0, branches: {}, airlines: {}, areas: { terminal: 0, apron: 0, general: 0 } };
    const prevEntry = prevKey ? monthMap.get(prevKey)! : { total: 0, irregularity: 0, complaint: 0, compliment: 0, branches: {}, airlines: {}, areas: { terminal: 0, apron: 0, general: 0 } };

    // YoY: same month, previous year — only if prior-year data exists.
    // Additionally, suppress YoY when latest year equals earliest year present in the dataset.
    let yoyKey: string | undefined;
    if (latestKey) {
        const [latestYear, latestMonth] = latestKey.split('-').map(Number);
        const earliestYear = sortedKeys.length ? Number(sortedKeys[0].split('-')[0]) : latestYear;
        if (latestYear > earliestYear) {
            const candidate = `${latestYear - 1}-${String(latestMonth).padStart(2, '0')}`;
            if (monthMap.has(candidate)) yoyKey = candidate;
        }
    }
    const yoyEntry = yoyKey ? monthMap.get(yoyKey)! : undefined;

    const formatLabel = (key: string) => {
        if (!key) return undefined;
        const [y, m] = key.split('-').map(Number);
        // Use Indonesian locale for clarity
        return new Date(y, m - 1).toLocaleString('id-ID', { month: 'short', year: 'numeric' });
    };

    const currentLabel = formatLabel(latestKey);
    const previousLabel = formatLabel(prevKey);

    const buildMetric = (label: string, currVal: number, prevVal: number, yoyCurr?: number, yoyPrev?: number): ComparisonMetric => ({
        label,
        current: currVal,
        previous: prevVal,
        momDelta: calcDelta(currVal, prevVal),
        currentMonth: currentLabel,
        previousMonth: previousLabel,
        ...(yoyCurr !== undefined && yoyPrev !== undefined
            ? { yoyCurrent: yoyCurr, yoyPrevious: yoyPrev, yoyDelta: calcDelta(yoyCurr, yoyPrev) }
            : {}),
    });

    const overallMetrics: ComparisonMetric[] = [
        buildMetric('Total', latestEntry.total, prevEntry.total, yoyEntry ? latestEntry.total : undefined, yoyEntry?.total),
        buildMetric('Irregularity', latestEntry.irregularity, prevEntry.irregularity, yoyEntry ? latestEntry.irregularity : undefined, yoyEntry?.irregularity),
        buildMetric('Complaint', latestEntry.complaint, prevEntry.complaint, yoyEntry ? latestEntry.complaint : undefined, yoyEntry?.complaint),
        buildMetric('Compliment', latestEntry.compliment, prevEntry.compliment, yoyEntry ? latestEntry.compliment : undefined, yoyEntry?.compliment),
    ];

    // Add "Lainnya" (Others) if there are uncategorized reports
    const latestOthers = latestEntry.total - (latestEntry.irregularity + latestEntry.complaint + latestEntry.compliment);
    const prevOthers = prevEntry.total - (prevEntry.irregularity + prevEntry.complaint + prevEntry.compliment);
    if (latestOthers > 0 || prevOthers > 0) {
        overallMetrics.push(buildMetric('Lainnya', latestOthers, prevOthers, 
            yoyKey ? latestOthers : undefined, 
            yoyEntry ? (yoyEntry.total - (yoyEntry.irregularity + yoyEntry.complaint + yoyEntry.compliment)) : undefined));
    }

    // Top 5 branches
    const branchTotals: Record<string, number> = {};
    monthMap.forEach((e) => {
        Object.entries(e.branches).forEach(([b, c]) => {
            branchTotals[b] = (branchTotals[b] || 0) + c;
        });
    });
    const topBranches = Object.entries(branchTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([b]) => b);

    const branchMoM = sortedKeys.slice(-6).map((key) => {
        const e = monthMap.get(key)!;
        const [y, m] = key.split('-').map(Number);
        const label = `${y} ${new Date(y, m - 1).toLocaleString('en-US', { month: 'short' })}`;
        const row: Record<string, string | number> = { month: label };
        topBranches.forEach((b) => { row[b] = e.branches[b] || 0; });
        return row;
    });

    const branchMetrics = topBranches.map((b) =>
        buildMetric(b, latestEntry.branches[b] || 0, prevEntry.branches[b] || 0,
            yoyEntry ? (latestEntry.branches[b] || 0) : undefined,
            yoyEntry ? (yoyEntry.branches[b] || 0) : undefined)
    );

    // Top 5 airlines
    const airlineTotals: Record<string, number> = {};
    monthMap.forEach((e) => {
        Object.entries(e.airlines).forEach(([a, c]) => {
            airlineTotals[a] = (airlineTotals[a] || 0) + c;
        });
    });
    const topAirlines = Object.entries(airlineTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([a]) => a);

    const airlineMoM = sortedKeys.slice(-6).map((key) => {
        const e = monthMap.get(key)!;
        const [y, m] = key.split('-').map(Number);
        const label = `${y} ${new Date(y, m - 1).toLocaleString('en-US', { month: 'short' })}`;
        const row: Record<string, string | number> = { month: label };
        topAirlines.forEach((a) => { row[a] = e.airlines[a] || 0; });
        return row;
    });

    const airlineMetrics = topAirlines.map((a) =>
        buildMetric(a, latestEntry.airlines[a] || 0, prevEntry.airlines[a] || 0,
            yoyEntry ? (latestEntry.airlines[a] || 0) : undefined,
            yoyEntry ? (yoyEntry.airlines[a] || 0) : undefined)
    );

    const areaMetrics: ComparisonMetric[] = [
        buildMetric('Terminal Area', latestEntry.areas.terminal, prevEntry.areas.terminal, yoyEntry ? latestEntry.areas.terminal : undefined, yoyEntry?.areas.terminal),
        buildMetric('Apron Area', latestEntry.areas.apron, prevEntry.areas.apron, yoyEntry ? latestEntry.areas.apron : undefined, yoyEntry?.areas.apron),
        buildMetric('General Area', latestEntry.areas.general, prevEntry.areas.general, yoyEntry ? latestEntry.areas.general : undefined, yoyEntry?.areas.general),
    ];

    const result = {
        monthlyTrend,
        overallMetrics,
        branchMoM,
        branchMetrics,
        airlineMoM,
        airlineMetrics,
        topBranches,
        topAirlines,
        areaMetrics,
    };

    console.log('[calculateComparisonData] Returning data keys:', Object.keys(result));
    return result;
}
