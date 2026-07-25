import type { ChartType } from '@/types/builder';

/**
 * Bento auto-layout engine.
 *
 * Turns an ordered list of charts into a clean 12-column bento mosaic: each
 * chart is sized by its type + data shape, then greedily packed into rows that
 * are stretched to fill the full width (no ragged gaps). Every tile in a row
 * shares the row's tallest height so the grid stays visually aligned.
 *
 * KPI tiles are handled separately (as a stat strip) and should be filtered out
 * before calling this.
 */

interface BentoItem {
  id: string;
  chartType: ChartType;
  /** row count of the underlying result, when known — drives width/height */
  rows?: number;
}

interface BentoSpan {
  id: string;
  /** columns out of 12 */
  colSpan: number;
  rowSpan: number;
}

const BENTO_COLS = 12;

function baseSize(item: BentoItem): { colSpan: number; rowSpan: number } {
  const r = item.rows ?? 6;
  switch (item.chartType) {
    case 'table':
      return { colSpan: r > 10 ? 12 : 8, rowSpan: 3 };
    case 'pivot':
    case 'heatmap':
    case 'branch_area_grid':
      return { colSpan: 12, rowSpan: 3 };
    case 'line':
    case 'area':
    case 'combo':
      return { colSpan: 8, rowSpan: 2 };
    case 'stacked_bar':
    case 'grouped_bar':
      return { colSpan: 6, rowSpan: 2 };
    case 'horizontal_bar':
      return { colSpan: 6, rowSpan: r > 8 ? 3 : 2 };
    case 'bar':
      return { colSpan: r <= 4 ? 4 : 6, rowSpan: 2 };
    case 'scatter':
      return { colSpan: 6, rowSpan: 2 };
    case 'pie':
    case 'donut':
      return { colSpan: 4, rowSpan: 2 };
    case 'kpi':
      return { colSpan: 3, rowSpan: 1 };
    default:
      return { colSpan: 6, rowSpan: 2 };
  }
}

export function computeBento(items: BentoItem[], cols = BENTO_COLS): BentoSpan[] {
  const sized = items.map((it) => {
    const s = baseSize(it);
    return { id: it.id, colSpan: Math.min(s.colSpan, cols), rowSpan: s.rowSpan };
  });

  // greedy pack into rows that never overflow `cols`
  const rows: BentoSpan[][] = [];
  let cur: BentoSpan[] = [];
  let used = 0;
  for (const s of sized) {
    if (used + s.colSpan > cols && cur.length > 0) {
      rows.push(cur);
      cur = [];
      used = 0;
    }
    cur.push({ ...s });
    used += s.colSpan;
  }
  if (cur.length) rows.push(cur);

  // stretch each row to fill full width + align heights
  for (const row of rows) {
    const total = row.reduce((sum, r) => sum + r.colSpan, 0);
    let extra = cols - total;
    let i = 0;
    // hand extra columns to the widest tiles first for a natural look
    const order = row
      .map((_, idx) => idx)
      .sort((a, b) => row[b].colSpan - row[a].colSpan);
    while (extra > 0) {
      row[order[i % row.length]].colSpan += 1;
      extra--;
      i++;
    }
    const maxRow = Math.max(...row.map((r) => r.rowSpan));
    row.forEach((r) => {
      r.rowSpan = maxRow;
    });
  }

  return rows.flat();
}
