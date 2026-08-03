import 'server-only';

import { getMySqlPool } from '@/lib/db/mysql';
import type {
  IncidentType,
  Location,
  Position,
  Station,
  Unit,
} from '@/types';

import type { ReferenceDataRepository } from './reference-data-repository';

export class MySqlReferenceDataRepository
  implements ReferenceDataRepository {
  async listStations(): Promise<Station[]> {
    const [rows] = await getMySqlPool().query(
      'SELECT id, code, name FROM stations ORDER BY code'
    );
    return rows as Station[];
  }

  async listUnits(): Promise<Unit[]> {
    const [rows] = await getMySqlPool().query(
      'SELECT id, name, description FROM units ORDER BY name'
    );
    return rows as Unit[];
  }

  async listPositions(): Promise<Position[]> {
    const [rows] = await getMySqlPool().query(
      'SELECT id, name, level FROM positions ORDER BY level, name'
    );
    return rows as Position[];
  }

  async listIncidentTypes(): Promise<IncidentType[]> {
    const [rows] = await getMySqlPool().query(
      'SELECT id, name, default_severity FROM incident_types ORDER BY name'
    );
    return rows as IncidentType[];
  }

  async listLocations(stationId?: string): Promise<Location[]> {
    if (stationId) {
      const [rows] = await getMySqlPool().query(
        'SELECT id, station_id, name, area FROM locations WHERE station_id = ? ORDER BY name',
        [stationId]
      );
      return rows as Location[];
    }

    const [rows] = await getMySqlPool().query(
      'SELECT id, station_id, name, area FROM locations ORDER BY name'
    );
    return rows as Location[];
  }
}

export const mysqlReferenceDataRepository =
  new MySqlReferenceDataRepository();
