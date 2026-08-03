import { NextResponse } from 'next/server';

import { GAPURA_STATIONS, HEAD_OFFICE_CODE } from '@/data/stations';
import { getReferenceDataRepository } from '@/lib/repositories/reference-data-repository-router';

function mergeStationsWithCanonical(
  dbStations: Array<{ id: string; code: string; name: string }>
) {
  const byCode = new Map<string, { id: string; code: string; name: string }>();
  for (const station of dbStations) {
    byCode.set(station.code.toUpperCase(), station);
  }
  for (const station of GAPURA_STATIONS) {
    const code = station.code.toUpperCase();
    if (!byCode.has(code)) {
      byCode.set(code, { id: code, code, name: station.name });
    }
  }

  return Array.from(byCode.values()).sort((a, b) => {
    if (a.code === HEAD_OFFICE_CODE) return -1;
    if (b.code === HEAD_OFFICE_CODE) return 1;
    return a.code.localeCompare(b.code);
  });
}

async function safeReferenceRead<T>(
  label: string,
  loader: () => Promise<T[]>
): Promise<T[]> {
  try {
    return await loader();
  } catch (error) {
    console.warn(`[MasterData] ${label} query failed:`, error);
    return [];
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const repository = await getReferenceDataRepository();

    switch (type) {
      case 'stations': {
        const stations = await safeReferenceRead(
          'stations',
          () => repository.listStations()
        );
        return NextResponse.json(mergeStationsWithCanonical(stations), {
          headers: cacheHeaders(),
        });
      }
      case 'units': {
        const units = await safeReferenceRead(
          'units',
          () => repository.listUnits()
        );
        const data = units.length > 0
          ? units
          : [
              { id: '00000000-0000-0000-0000-000000000101', name: 'Ramp' },
              { id: '00000000-0000-0000-0000-000000000102', name: 'Passenger Service' },
              { id: '00000000-0000-0000-0000-000000000103', name: 'Cargo' },
              { id: '00000000-0000-0000-0000-000000000104', name: 'GSE' },
              { id: '00000000-0000-0000-0000-000000000105', name: 'Security' },
              { id: '00000000-0000-0000-0000-000000000106', name: 'Administrasi' },
            ];
        return NextResponse.json(data, { headers: cacheHeaders() });
      }
      case 'positions': {
        const positions = await safeReferenceRead(
          'positions',
          () => repository.listPositions()
        );
        const data = positions.length > 0
          ? positions
          : [
              { id: '00000000-0000-0000-0000-000000000201', name: 'Super Admin', level: 1 },
              { id: '00000000-0000-0000-0000-000000000202', name: 'Analyst', level: 2 },
              { id: '00000000-0000-0000-0000-000000000203', name: 'DIVISI OP', level: 3 },
              { id: '00000000-0000-0000-0000-000000000204', name: 'DIVISI OP', level: 3 },
              { id: '00000000-0000-0000-0000-000000000205', name: 'DIVISI OP', level: 3 },
              { id: '00000000-0000-0000-0000-000000000206', name: 'OS', level: 3 },
              { id: '00000000-0000-0000-0000-000000000207', name: 'OSF', level: 3 },
              { id: '00000000-0000-0000-0000-000000000208', name: 'OSL', level: 3 },
              { id: '00000000-0000-0000-0000-000000000209', name: 'Staff', level: 10 },
              { id: '00000000-0000-0000-0000-00000000020A', name: 'Officer', level: 9 },
              { id: '00000000-0000-0000-0000-00000000020B', name: 'Supervisor', level: 8 },
              { id: '00000000-0000-0000-0000-00000000020C', name: 'Manager', level: 7 },
            ];
        return NextResponse.json(data, { headers: cacheHeaders() });
      }
      case 'incident_types': {
        const data = await safeReferenceRead(
          'incident types',
          () => repository.listIncidentTypes()
        );
        return NextResponse.json(data, { headers: cacheHeaders() });
      }
      case 'locations': {
        const stationId = searchParams.get('station_id') || undefined;
        const data = await safeReferenceRead(
          'locations',
          () => repository.listLocations(stationId)
        );
        return NextResponse.json(data, { headers: cacheHeaders() });
      }
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error fetching master data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}

function cacheHeaders() {
  return {
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    'CDN-Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
  };
}
