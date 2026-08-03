import type {
  IncidentType,
  Location,
  Position,
  Station,
  Unit,
} from '@/types';

export interface ReferenceDataRepository {
  listStations(): Promise<Station[]>;
  listUnits(): Promise<Unit[]>;
  listPositions(): Promise<Position[]>;
  listIncidentTypes(): Promise<IncidentType[]>;
  listLocations(stationId?: string): Promise<Location[]>;
}
