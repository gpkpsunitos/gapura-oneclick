/**
 * @file
 * 
 * File ini berisi halaman detail chart publik yang merender ChartDetailPage
 * dengan mode publik aktif
 */
import ChartDetailPage from '@/components/chart-detail/ChartDetailPage';

/**
 * Halaman detail chart publik
 * @returns Komponen ChartDetailPage dengan mode publik
 */
export default function PublicChartDetailRoute() {
  return <ChartDetailPage isPublic={true} />;
}
