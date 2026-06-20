/**
 * @file
 * 
 * File ini berisi API route untuk mengambil data master (reference data)
 * Menyediakan data referensi seperti stasiun, unit, posisi, tipe insiden, dan lokasi
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { reportsService } from '@/lib/services/reports-service';
import { Report } from '@/types';
import { INDONESIAN_AIRPORTS } from '@/data/airports';

// ponytail: head-office "branch" not in airport list; keep here so form has it
const EXTRA_BRANCHES: Array<{ code: string; name: string }> = [
  { code: 'GPS', name: 'Gapura Pusat' },
];

function mergeStationsWithAirports(dbStations: Array<{ id: string; code: string; name: string }>) {
  const byCode = new Map<string, { id: string; code: string; name: string }>();
  for (const s of dbStations) byCode.set(s.code.toUpperCase(), s);
  for (const extra of EXTRA_BRANCHES) {
    const code = extra.code.toUpperCase();
    if (!byCode.has(code)) byCode.set(code, { id: code, code, name: extra.name });
  }
  for (const a of INDONESIAN_AIRPORTS) {
    const code = a.code.toUpperCase();
    if (!byCode.has(code)) byCode.set(code, { id: code, code, name: a.name });
  }
  return Array.from(byCode.values()).sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * Menangani request GET untuk mengambil data master
 * Menerima query parameter 'type' untuk menentukan jenis data yang diambil
 * Mendukung caching dan memiliki fallback data
 * @param request - Request object dengan query parameter type
 * @returns Response JSON berisi data master yang diminta
 * @throws {Error} Jika terjadi kesalahan saat mengambil data
 * @example
 * GET /api/master-data?type=stations
 * GET /api/master-data?type=units
 * GET /api/master-data?type=positions
 * GET /api/master-data?type=incident_types
 * GET /api/master-data?type=locations&station_id=xxx
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');

        let data: any[] = [];
        switch (type) {
            case 'stations':
                {
                    const { data: stations, error } = await supabaseAdmin
                        .from('stations')
                        .select('id, code, name')
                        .order('code');
                    const base = (!error && Array.isArray(stations) && stations.length > 0)
                        ? stations
                        : await reportsService.getStations();
                    data = mergeStationsWithAirports(base);
                }
                break;
            case 'units':
                {
                    const { data: units, error } = await supabaseAdmin
                        .from('units')
                        .select('id, name')
                        .order('name');
                    const fromDb = (!error && Array.isArray(units)) ? units : await reportsService.getUnits();
                    if (Array.isArray(fromDb) && fromDb.length > 0) {
                        data = fromDb;
                    } else {
                        // Final fallback: minimal units untuk registrasi UX
                        data = [
                            { id: '00000000-0000-0000-0000-000000000101', name: 'Ramp' },
                            { id: '00000000-0000-0000-0000-000000000102', name: 'Passenger Service' },
                            { id: '00000000-0000-0000-0000-000000000103', name: 'Cargo' },
                            { id: '00000000-0000-0000-0000-000000000104', name: 'GSE' },
                            { id: '00000000-0000-0000-0000-000000000105', name: 'Security' },
                            { id: '00000000-0000-0000-0000-000000000106', name: 'Administrasi' },
                        ];
                    }
                }
                break;
            case 'positions':
                {
                    const { data: positions, error } = await supabaseAdmin
                        .from('positions')
                        .select('id, name, level')
                        .order('level');
                    const fromDb = (!error && Array.isArray(positions)) ? positions : await reportsService.getPositions();
                    if (Array.isArray(fromDb) && fromDb.length > 0) {
                        data = fromDb;
                    } else {
                        // Final fallback: include both central and branch roles
                        data = [
                            // Central / GPS
                            { id: '00000000-0000-0000-0000-000000000201', name: 'Super Admin', level: 1 },
                            { id: '00000000-0000-0000-0000-000000000202', name: 'Analyst', level: 2 },
                            { id: '00000000-0000-0000-0000-000000000203', name: 'DIVISI OP', level: 3 },
                            { id: '00000000-0000-0000-0000-000000000204', name: 'DIVISI OP', level: 3 },
                            { id: '00000000-0000-0000-0000-000000000205', name: 'DIVISI OP', level: 3 },
                            { id: '00000000-0000-0000-0000-000000000206', name: 'OS', level: 3 },
                            { id: '00000000-0000-0000-0000-000000000207', name: 'OSF', level: 3 },
                            { id: '00000000-0000-0000-0000-000000000208', name: 'OSL', level: 3 },
                            // Branch
                            { id: '00000000-0000-0000-0000-000000000209', name: 'Staff', level: 10 },
                            { id: '00000000-0000-0000-0000-00000000020A', name: 'Officer', level: 9 },
                            { id: '00000000-0000-0000-0000-00000000020B', name: 'Supervisor', level: 8 },
                            { id: '00000000-0000-0000-0000-00000000020C', name: 'Manager', level: 7 },
                        ];
                    }
                }
                break;
            case 'incident_types':
                data = await reportsService.getIncidentTypes();
                break;
            case 'locations':
                const stationId = searchParams.get('station_id');
                data = await reportsService.getLocations(stationId || undefined);
                break;
            default:
                return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
        }

        return NextResponse.json(data, {
            headers: {
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
                'CDN-Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
            },
        });
    } catch (error) {
        console.error('Error fetching master data:', error);
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
}
