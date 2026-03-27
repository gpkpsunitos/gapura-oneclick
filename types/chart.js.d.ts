declare module 'chart.js' {
  export const Chart: any;
  export const CategoryScale: any;
  export const LinearScale: any;
  export const BarElement: any;
  export const LineElement: any;
  export const PointElement: any;
  export const Title: any;
  export const Tooltip: any;
  export const Legend: any;
  export const Filler: any;
  export const ArcElement: any;
  export const RadialLinearScale: any;
  export const Scale: any;
  export const ChartData: any;
  export const ChartOptions: any;
}

declare module 'chart.js/auto' {
  const Chart: any;
  export default Chart;
}

declare module 'file-saver' {
  export function saveAs(data: Blob | string, filename?: string): void;
}

declare module 'date-fns' {
  export function format(date: Date | string | number, formatString: string, options?: any): string;
  export function parseISO(dateString: string): Date;
  export function addDays(date: Date | string | number, amount: number): Date;
  export function subDays(date: Date | string | number, amount: number): Date;
  export function startOfMonth(date: Date | string | number): Date;
  export function endOfMonth(date: Date | string | number): Date;
  export function isValid(date: any): boolean;
}

declare module 'date-fns/locale' {
  export const id: any;
}

declare module 'jspdf' {
  const jsPDF: any;
  export default jsPDF;
}

declare module 'jspdf-autotable' {
  const autoTable: any;
  export default autoTable;
}
