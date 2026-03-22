/**
 * Adapters to convert Recharts data format to Chart.js format
 */

// Use any type since chart.js types are problematic

/**
 * Recharts bar/line chart data format
 */
interface RechartsSeriesData {
  name: string;
  [key: string]: string | number;
}

/**
 * Convert Recharts data to Chart.js format for bar/line charts
 */
export function adaptToChartJSData(
  rechartsData: RechartsSeriesData[],
  xAxisKey: string = 'name',
  dataKeys: string[] = []
): any {
  if (!rechartsData || rechartsData.length === 0) {
    return {
      labels: [],
      datasets: [],
    };
  }

  // Extract labels (x-axis)
  const labels = rechartsData.map((item) => String(item[xAxisKey]));

  // If no dataKeys specified, use all numeric keys except xAxisKey
  const keys = dataKeys.length > 0 
    ? dataKeys 
    : Object.keys(rechartsData[0]).filter((key) => 
        key !== xAxisKey && typeof rechartsData[0][key] === 'number'
      );

  // Create datasets
  const datasets = keys.map((key, index) => ({
    label: key,
    data: rechartsData.map((item) => Number(item[key]) || 0),
    backgroundColor: getChartColor(index, 0.7),
    borderColor: getChartColor(index, 1),
    borderWidth: 2,
    borderRadius: 4,
  }));

  return {
    labels,
    datasets,
  };
}

/**
 * Convert data for pie/donut charts
 */
export function adaptToPieChartData(
  data: { name: string; value: number }[]
): any {
  if (!data || data.length === 0) {
    return {
      labels: [],
      datasets: [],
    };
  }

  const colors = data.map((_, index) => getChartColor(index, 0.8));
  const borderColors = data.map((_, index) => getChartColor(index, 1));

  return {
    labels: data.map((item) => item.name),
    datasets: [
      {
        data: data.map((item) => item.value),
        backgroundColor: colors,
        borderColor: borderColors,
        borderWidth: 2,
      },
    ],
  };
}

/**
 * Chart color palette
 */
const CHART_COLORS = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#06b6d4', // cyan
  '#84cc16', // lime
];

function getChartColor(index: number, alpha: number = 1): string {
  const color = CHART_COLORS[index % CHART_COLORS.length];
  if (alpha === 1) return color;
  
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Simplify labels for mobile display
 * Truncates long labels and limits total count
 */
export function simplifyLabels(
  labels: string[],
  maxLength: number = 10,
  maxCount: number = 8
): string[] {
  // Limit count
  const limited = labels.length > maxCount 
    ? labels.filter((_, i) => i % Math.ceil(labels.length / maxCount) === 0)
    : labels;
  
  // Truncate long labels
  return limited.map((label) => {
    if (label.length <= maxLength) return label;
    return label.substring(0, maxLength - 2) + '..';
  });
}

/**
 * Format large numbers for mobile display
 */
export function formatCompactNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toString();
}