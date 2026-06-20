

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

