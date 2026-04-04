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
