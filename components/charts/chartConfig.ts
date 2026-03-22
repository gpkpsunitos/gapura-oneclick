import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * Default Chart.js options optimized for mobile
 */
export const defaultMobileChartOptions: any = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'bottom',
      labels: {
        boxWidth: 12,
        padding: 10,
        font: {
          size: 11,
        },
        usePointStyle: true,
        pointStyle: 'circle',
      },
    },
    tooltip: {
      enabled: true,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: 10,
      titleFont: {
        size: 12,
      },
      bodyFont: {
        size: 11,
      },
      cornerRadius: 6,
      displayColors: true,
    },
  },
  scales: {
    x: {
      display: true,
      grid: {
        display: false,
      },
      ticks: {
        font: {
          size: 10,
        },
        maxRotation: 45,
        minRotation: 0,
      },
    },
    y: {
      display: true,
      grid: {
        color: 'rgba(0, 0, 0, 0.05)',
      },
      ticks: {
        font: {
          size: 10,
        },
      },
    },
  },
  interaction: {
    intersect: false,
    mode: 'index',
  },
};

/**
 * Chart.js options for desktop (more detailed)
 */
export const defaultDesktopChartOptions: any = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'right',
      labels: {
        boxWidth: 14,
        padding: 15,
        font: {
          size: 12,
        },
        usePointStyle: true,
        pointStyle: 'circle',
      },
    },
    tooltip: {
      enabled: true,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: 12,
      titleFont: {
        size: 13,
      },
      bodyFont: {
        size: 12,
      },
      cornerRadius: 8,
      displayColors: true,
    },
  },
  scales: {
    x: {
      display: true,
      grid: {
        display: false,
      },
      ticks: {
        font: {
          size: 11,
        },
        maxRotation: 30,
        minRotation: 0,
      },
    },
    y: {
      display: true,
      grid: {
        color: 'rgba(0, 0, 0, 0.05)',
      },
      ticks: {
        font: {
          size: 11,
        },
      },
    },
  },
  interaction: {
    intersect: false,
    mode: 'index',
  },
};

/**
 * Color palette for charts - Prism V3 oklch-inspired
 */
export const chartColors = {
  primary: [
    '#059669', // Emerald 600
    '#0284c7', // Sky 600
    '#d97706', // Amber 600
    '#e11d48', // Rose 600
    '#7c3aed', // Violet 600
    '#db2777', // Pink 600
    '#0d9488', // Teal 600
    '#ea580c', // Orange 600
  ],
  surface: {
    grid: 'rgba(0, 0, 0, 0.04)',
    tooltip: 'rgba(15, 23, 42, 0.9)',
  },
  text: {
    primary: 'var(--surface-900)',
    secondary: 'var(--surface-600)',
    muted: 'var(--surface-400)',
  },
};

/**
 * Generate chart colors with opacity
 */
export function generateChartColors(count: number, alpha: number = 1): string[] {
  const baseColors = chartColors.primary;
  const colors: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const color = baseColors[i % baseColors.length];
    if (alpha < 1) {
      // Convert hex to rgba
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      colors.push(`rgba(${r}, ${g}, ${b}, ${alpha})`);
    } else {
      colors.push(color);
    }
  }
  
  return colors;
}

/**
 * Custom Chart.js plugin to draw data labels on bars
 */
export const barLabelsPlugin = {
  id: 'barLabels',
  afterDatasetsDraw(chart: any) {
    const { ctx, chartArea: { top, bottom, left, right } } = chart;
    const isHorizontal = chart.config.options.indexAxis === 'y';

    ctx.save();
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.textBaseline = 'middle';

    chart.data.datasets.forEach((dataset: any, i: number) => {
      const meta = chart.getDatasetMeta(i);
      if (meta.hidden) return;

      meta.data.forEach((bar: any, index: number) => {
        const value = dataset.data[index];
        if (value === 0 || value === null || value === undefined) return;

        // Use custom color if provided, else fallback to dataset border or default
        ctx.fillStyle = dataset.borderColor?.[index] || dataset.borderColor || '#1f2937';
        
        let labelX, labelY;
        if (isHorizontal) {
          labelX = bar.x + 15;
          labelY = bar.y;
          ctx.textAlign = 'left';
        } else {
          labelX = bar.x;
          labelY = bar.y - 12;
          ctx.textAlign = 'center';
        }

        // Clip prevention & Visibility logic
        if (isHorizontal) {
          if (labelX > right - 30) {
            labelX = bar.x - 5;
            ctx.textAlign = 'right';
            ctx.fillStyle = '#fff'; // White on dark bars
          }
        } else {
          if (labelY < top + 20) {
            labelY = bar.y + 15;
            ctx.fillStyle = '#fff';
          }
        }

        ctx.fillText(value.toLocaleString('id-ID'), labelX, labelY);
      });
    });
    ctx.restore();
  },
};