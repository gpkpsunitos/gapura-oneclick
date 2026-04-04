/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi halaman dashboard karyawan untuk operasional cabang (OP),
 * menampilkan laporan-laporan divisi OP dan monitoring station.
 */

'use client';

import { useEffect, useState } from 'react';
import { Plane } from 'lucide-react';
import { DivisionReportsPage } from '@/components/dashboard/DivisionReportsPage';

/**
 * Antarmuka respons dari API autentikasi pengguna
 * @interface MeResponse
 * @property {string} id - ID pengguna
 * @property {string} role - Peran pengguna (CABANG atau EMPLOYEE)
 * @property {{ code: string } | null} [station] - Informasi station pengguna
 */
interface MeResponse {
  id: string;
  role: string;
  station?: { code: string } | null;
}

/**
 * Komponen dashboard karyawan untuk operasional cabang (OP)
 * Menampilkan laporan-laporan divisi OP dan monitoring station.
 * Hanya dapat diakses oleh pengguna dengan peran CABANG atau EMPLOYEE.
 * @returns {JSX.Element | null} Tampilan dashboard OP atau null jika tidak diizinkan
 */
export default function EmployeeOPDashboard() {
  const [station, setStation] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  /**
   * Menginisialisasi dashboard dengan memeriksa autentikasi dan izin pengguna
   * Mengambil data pengguna dari API /api/auth/me
   */
  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!res.ok) {
          setAuthorized(false);
          return;
        }
        const data: MeResponse = await res.json();
        if (data.role !== 'CABANG' && data.role !== 'EMPLOYEE') {
          setAuthorized(false);
          return;
        }
        setAuthorized(true);
        const code = data.station?.code || null;
        setStation(code);
      } catch {
        setAuthorized(false);
      }
    };
    init();
  }, []);

  if (authorized === false) return null;
  if (!station) return null;

  return (
    <DivisionReportsPage
      config={{
        code: 'OP',
        name: 'Laporan Operasi Cabang',
        color: '#06b6d4',
        subtitle: `Monitoring laporan station ${station}`,
        icon: Plane,
        userRole: 'CABANG',
        basePath: '/dashboard/employee/op',
        apiEndpoint: `/api/admin/reports?station=${encodeURIComponent(station)}`,
        enforceDivisionScope: false,
      }}
    />
  );
}
