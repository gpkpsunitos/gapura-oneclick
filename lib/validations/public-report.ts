import { AIRLINES } from '@/lib/constants/airlines';

export type PublicReportStation = {
  id: string;
  code: string;
  name: string;
};

export type PublicReportValidationInput = {
  airline: string;
  flight_number: string;
  station_id: string;
  route?: string;
};

export type PublicReportValidationErrors = Partial<Record<keyof PublicReportValidationInput, string>>;

const AIRLINE_NAMES = new Set(AIRLINES.map((airline) => airline.name.toLowerCase()));
const AIRLINE_CODES = new Set(AIRLINES.map((airline) => airline.code.toLowerCase()));

export function normalizeFlightNumber(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '').replace(/^([A-Z0-9]{2,3})-?(\d{1,4}[A-Z]?)$/, '$1-$2');
}

export function validateFlightNumber(value: string): string | null {
  if (!value.trim()) return 'Nomor penerbangan wajib diisi.';
  return null;
}

export function validateAirline(value: string): string | null {
  if (!value.trim()) return 'Maskapai wajib dipilih.';
  return null;
}

export function validateStation(value: string, stations: PublicReportStation[]): string | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return 'Branch/station wajib dipilih.';
  if (stations.length === 0) return null;

  const exists = stations.some((station) => (
    station.id.toLowerCase() === normalized ||
    station.code.toLowerCase() === normalized
  ));

  return exists ? null : 'Branch/station tidak ada di data master.';
}

export function validateRoute(_value?: string): string | null {
  return null;
}

export function validatePublicReportFlightStation(
  input: PublicReportValidationInput,
  stations: PublicReportStation[]
): PublicReportValidationErrors {
  const errors: PublicReportValidationErrors = {};
  const airlineError = validateAirline(input.airline);
  const flightError = validateFlightNumber(input.flight_number);
  const stationError = validateStation(input.station_id, stations);
  const routeError = validateRoute(input.route);

  if (airlineError) errors.airline = airlineError;
  if (flightError) errors.flight_number = flightError;
  if (stationError) errors.station_id = stationError;
  if (routeError) errors.route = routeError;

  return errors;
}
