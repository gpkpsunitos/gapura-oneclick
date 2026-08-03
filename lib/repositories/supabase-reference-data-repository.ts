import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';
import type {
  IncidentType,
  Location,
  Position,
  Station,
  Unit,
} from '@/types';

import type { ReferenceDataRepository } from './reference-data-repository';

function throwIfError(error: { message?: string } | null) {
  if (error) {
    throw new Error(error.message || 'Supabase reference-data query failed');
  }
}

export class SupabaseReferenceDataRepository
  implements ReferenceDataRepository {
  async listStations(): Promise<Station[]> {
    const { data, error } = await supabaseAdmin
      .from('stations')
      .select('id, code, name')
      .order('code');
    throwIfError(error);
    return (data || []) as Station[];
  }

  async listUnits(): Promise<Unit[]> {
    const { data, error } = await supabaseAdmin
      .from('units')
      .select('id, name, description')
      .order('name');
    throwIfError(error);
    return (data || []) as Unit[];
  }

  async listPositions(): Promise<Position[]> {
    const { data, error } = await supabaseAdmin
      .from('positions')
      .select('id, name, level')
      .order('level')
      .order('name');
    throwIfError(error);
    return (data || []) as Position[];
  }

  async listIncidentTypes(): Promise<IncidentType[]> {
    const { data, error } = await supabaseAdmin
      .from('incident_types')
      .select('id, name, default_severity')
      .order('name');
    throwIfError(error);
    return (data || []) as IncidentType[];
  }

  async listLocations(stationId?: string): Promise<Location[]> {
    let query = supabaseAdmin
      .from('locations')
      .select('id, station_id, name, area')
      .order('name');
    if (stationId) query = query.eq('station_id', stationId);

    const { data, error } = await query;
    throwIfError(error);
    return (data || []) as Location[];
  }
}

export const supabaseReferenceDataRepository =
  new SupabaseReferenceDataRepository();
