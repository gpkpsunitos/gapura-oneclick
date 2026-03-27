import 'server-only';
import { getGoogleSheets } from '@/lib/google-sheets';
import { supabase } from '@/lib/supabase';
import type { Report, ReportStatus, UserRole, Station, Unit, Position, IncidentType } from '@/types';
import { calculateSlaDeadline } from '@/lib/constants/report-status';
import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { buildReportFingerprint, resolveReportCategory } from '@/lib/report-fingerprint';

// Deterministic Namespace for Google Sheets ID Mapping (Fixed UUID)
const IRRS_NAMESPACE_UUID = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // Shared namespace for consistently mapping string IDs

// ─── Inline TTL Cache ──────────────────────────────────────────────────────
// Complexity: Time O(1) per get/set | Space O(entries)
interface CacheEntry { data: unknown; ts: number }
const ttlCache = new Map<string, CacheEntry>();
const MAX_CACHE_ENTRIES = 100;
let cacheHits = 0;
let cacheMisses = 0;

function getCache<T>(key: string, ttl: number): T | null {
  const entry = ttlCache.get(key);
  if (!entry) { cacheMisses++; return null; }
  if (Date.now() - entry.ts > ttl) {
    ttlCache.delete(key);
    cacheMisses++;
    return null;
  }
  cacheHits++;
  return entry.data as T;
}

function setCache(key: string, data: unknown): void {
  if (ttlCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = ttlCache.keys().next().value;
    if (oldest) ttlCache.delete(oldest);
  }
  ttlCache.set(key, { data, ts: Date.now() });
}

function invalidateLocalCache(key: string): void {
  ttlCache.delete(key);
}

export function getCacheStats() {
  const total = cacheHits + cacheMisses;
  return {
    hits: cacheHits,
    misses: cacheMisses,
    keys: ttlCache.size,
    hitRatio: total > 0 ? cacheHits / total : 0,
  };
}

const FS_CACHE_DIR = '/tmp/gapura-irrs-cache';
function fsCachePath(key: string) {
  const hash = crypto.createHash('sha1').update(key).digest('hex');
  return path.join(FS_CACHE_DIR, `${hash}.json`);
}

async function readFsCache<T>(key: string, ttlMs: number): Promise<T | null> {
  try {
    const p = fsCachePath(key);
    const stat = await fs.stat(p).catch(() => null as any);
    if (!stat) return null;
    if (Date.now() - stat.mtimeMs > ttlMs) return null;
    const text = await fs.readFile(p, 'utf-8');
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function writeFsCache(key: string, data: unknown): Promise<void> {
  try {
    await fs.mkdir(FS_CACHE_DIR, { recursive: true });
    const p = fsCachePath(key);
    await fs.writeFile(p, JSON.stringify(data));
  } catch {
    // ignore
  }
}

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || '1TFPZOAWAKubPl7iaUk8BXt2BabY1N-AcLgi-_zBQGzk';
const REPORT_SHEETS = ['NON CARGO', 'CGO'];
const SHEET_IDS: Record<string, number> = {}; // Empty to force dynamic lookup for new sheet

// Mapping from Report properties to likely Header names (for writing/reading)
// Note: Google Sheets headers use underscores (e.g., "Date_of_Event") not spaces
const PROP_TO_HEADER: Partial<Record<keyof Report, string[]>> = {
  // Key: Report Property, Value: Possible Header Names
  date_of_event: ['Date_of_Event', 'Date of Event', 'Date', 'Tanggal', 'Tanggal Kejadian', 'Incident Date'],
  jenis_maskapai: ['Jenis_Maskapai', 'Jenis Maskapai'],
  airline: ['Airlines', 'Airline', 'Maskapai'],
  airlines: ['Airlines', 'Airline', 'Maskapai'], // Dual mapping
  flight_number: ['Flight_Number', 'Flight Number', 'No Penerbangan'],
  reporting_branch: ['Reporting_Branch', 'Reporting Branch'],
  branch: ['Branch', 'Cabang', 'Reporting_Branch'],
  route: ['Route', 'Rute'],
  main_category: ['Report_Category', 'Report Category', 'Kategori Laporan', 'Main Category', 'Irregularity_Complain_Category'],
  category: ['Report_Category', 'Report Category', 'Kategori Laporan', 'Main Category', 'Irregularity_Complain_Category'],
  irregularity_complain_category: ['Irregularity_Complain_Category', 'Irregularity/Complain Category', 'Report_Category'],
  description: ['Report', 'Laporan', 'Description', 'Deskripsi'],
  root_caused: ['Root_Caused', 'Root Caused', 'Akar Masalah', 'Root Cause'],
  action_taken: ['Action_Taken', 'Action Taken', 'Tindakan'],
  kps_remarks: ['Gapura_KPS_Remarks', 'Gapura KPS Remarks', 'KPS Remarks', 'Remarks Gapura KPS', 'Remarks_Gapura_KPS'],
  gapura_kps_action_taken: ['Gapura_KPS_Action_Taken', 'Gapura KPS Action Taken'],
  preventive_action: ['Preventive Action', 'Preventive_Action'],
  reporter_name: ['Report_By', 'Report By', 'Pelapor', 'Reporter'],
  reporter_email: ['Reporter Email', 'Email'],
  evidence_url: ['Upload_Irregularity_Photo', 'Upload Irregularity Photo', 'Evidence', 'Bukti'],
  evidence_urls: ['Upload_Irregularity_Photo', 'Upload Irregularity Photo', 'Evidence', 'Bukti', 'Lampiran'],
  video_url: ['Upload_Irregularity_Photo', 'Upload Irregularity Photo', 'Evidence', 'Bukti'],
  video_urls: ['Upload_Irregularity_Photo', 'Upload Irregularity Photo', 'Evidence', 'Bukti'],
  area: ['Area', 'Wilayah'],
  terminal_area_category: ['Terminal_Area_Category', 'Terminal Area Category'],
  apron_area_category: ['Apron_Area_Category', 'Apron Area Category'],
  general_category: ['General_Category', 'General Category'],
  status: ['Status'],
  week_in_month: ['Per_Week_in_Month', 'Per Week in Month'],
  kode_cabang: ['KODE_CABANG_VLOOKUP', 'KODE CABANG (VLOOKUP)'],
  maskapai_lookup: ['MASKAPAI_VLOOKUP', 'MASKAPAI (VLOOKUP)'],
  lokal_mpa_lookup: ['Lokal_MPA_VLOOKUP', 'Lokal / MPA (VLOOKUP)'],
  case_classification: ['Case Classification', 'Case_Classification', 'case_classification'],
  hub: ['Hub', 'HUB'],
  kode_hub: ['KODE_HUB_VLOOKUP', 'KODE HUB (VLOOKUP)', 'Kode Hub'],
  delay_code: ['Delay Code', 'Delay_Code', 'Kode Delay'],
  delay_duration: ['Delay Duration', 'Delay_Duration', 'Durasi Delay'],
  
  // Triage Columns
  primary_tag: ['Primary Tag', 'Primary_Tag', 'Area Category', 'Area_Category'],
  sub_category_note: ['Sub Category Note', 'Sub_Category_Note', 'Sub Category', 'Additional Note'],
  target_division: ['ESKLASI DIVISI', 'ESKLASI_DIVISI', 'Target Division'],
  
  // Standard fields
  id: ['ID'],
  user_id: ['User ID'],
  title: ['Title', 'Judul'],
  location: ['Location', 'Lokasi'],
  severity: ['Severity', 'Tingkat Keparahan'],
  priority: ['Priority', 'Prioritas'],
  created_at: ['Created_At', 'Created At'],
  updated_at: ['Updated_At', 'Updated At'],
  report: ['Report', 'Judul Laporan'],
  // Add other fields as needed
};

// Inverse mapping for writing (Property -> Preferred Header)
const WRITE_MAPPING: Record<string, string> = {
  date_of_event: 'Date of Event',
  jenis_maskapai: 'Jenis Maskapai',
  airline: 'Airlines',
  flight_number: 'Flight Number',
  branch: 'Branch',
  reporting_branch: 'Reporting Branch',
  route: 'Route',
  main_category: 'Report Category',
  irregularity_complain_category: 'Irregularity/Complain Category',
  description: 'Report',
  root_caused: 'Root Caused',
  action_taken: 'Action Taken',
  kps_remarks: 'Gapura KPS Remarks',
  gapura_kps_action_taken: 'Gapura KPS Action Taken',
  preventive_action: 'Preventive Action',
  reporter_name: 'Report By',
  reporter_email: 'Reporter Email',
  // Prefer writing the concatenated evidence_urls over single evidence_url
  evidence_urls: 'Upload Irregularity Photo',
  evidence_url: 'Upload Irregularity Photo',
  video_urls: 'Upload Irregularity Photo', // Same column for videos
  video_url: 'Upload Irregularity Photo', // Same column for videos
  area: 'Area',
  terminal_area_category: 'Terminal Area Category',
  apron_area_category: 'Apron Area Category',
  general_category: 'General Category',
  status: 'Status',
  hub: 'Hub',
  week_in_month: 'Per Week in Month',
  delay_code: 'Delay Code',
  delay_duration: 'Delay Duration',

  // Triage Write Mappings
  primary_tag: 'Primary Tag',
  sub_category_note: 'Sub Category Note',
  target_division: 'ESKLASI DIVISI',

  // System Fields
  user_id: 'User ID',
  created_at: 'Created At',
  updated_at: 'Updated At',
  severity: 'Severity',
  priority: 'Priority',
};

const CACHE_KEY_ALL_REPORTS = 'reports:all:v3';
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

const MonthMap: Record<string, number> = {
  januari: 0, jan: 0,
  februari: 1, feb: 1,
  maret: 2, mar: 2,
  april: 3, apr: 3,
  mei: 4,
  juni: 5, jun: 5,
  juli: 6, jul: 6,
  agustus: 7, ags: 7, agt: 7,
  september: 8, sep: 8,
  oktober: 9, okt: 9, 
  november: 10, nov: 10,
  desember: 11, des: 11
};

// Helper to parse dates robustly
function parseDate(dateStr: string | number | Date): Date | null {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;
  
  if (typeof dateStr === 'number') {
    return new Date(Math.round((dateStr - 25569) * 86400 * 1000));
  }

  const str = String(dateStr).trim();
  if (!str) return null;

  // 1. ISO Patterns (YYYY-MM-DD, YYYY-MM)
  // Match common ISO-like strings from spreadsheets
  const isoMatch = str.match(/^(\d{4})[\-\/](\d{1,2})[\-\/](\d{1,2})/);
  if (isoMatch) {
    const d = new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
    if (!isNaN(d.getTime())) return d;
  }

  // 2. DD Mon YYYY or Mon YYYY (Indonesian/English)
  const parts = str.toLowerCase().split(/[\s,/-]+/);
  if (parts.length >= 2) {
    let day = 1;
    let month = -1;
    let year = -1;

    const yearIdx = parts.findIndex(p => /^\d{4}$/.test(p));
    if (yearIdx !== -1) {
      year = parseInt(parts[yearIdx]);
      for (let i = 0; i < parts.length; i++) {
        if (i === yearIdx) continue;
        if (MonthMap[parts[i]] !== undefined) {
          month = MonthMap[parts[i]];
          const dayCandidates = [parts[i-1], parts[i+1]].filter(p => p && /^\d{1,2}$/.test(p));
          if (dayCandidates.length > 0) {
            day = parseInt(dayCandidates[0]);
          }
          break;
        }
      }
    }

    if (year !== -1 && month !== -1) {
      return new Date(year, month, day);
    }
  }

  // 3. DD/MM/YYYY
  const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10) - 1; 
    const year = parseInt(ddmmyyyy[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  // Fallback to native Date
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}


export class ReportsService {
  
  private hubMap: Record<string, string> = {};
  private hubMapTs = 0;
  
  private async getSheets() {
    return await getGoogleSheets();
  }

  /**
   * Generates a stable UUID from a source string ID (e.g. "NON CARGO!row_2")
   * This is critical for mapping Google Sheets "IDs" to Supabase UUID fields
   * so that comments and other relational data remain stable.
   */
  private getReportUuid(sourceId: string): string {
      return uuidv5(sourceId, IRRS_NAMESPACE_UUID);
  }

  private async getHubMappingFromSheet(): Promise<Record<string, string>> {
    const now = Date.now();
    if (Object.keys(this.hubMap).length && now - this.hubMapTs < 1000 * 60 * 60) {
      return this.hubMap;
    }
    const sheets = await this.getSheets();
    if (!SPREADSHEET_ID) throw new Error('GOOGLE_SHEET_ID is not defined');
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'HUB',
    });
    const rows = res.data.values || [];
    if (!rows.length) return {};
    let dataStart = 1;
    let headers = (rows[0] || []).map((h: any) => String(h).trim().toLowerCase());
    let codeIdx = headers.findIndex(h => /kode|code|station|branch/.test(h));
    let hubIdx = headers.findIndex(h => /hub/.test(h));
    // If first row doesn't contain headers, try to detect header row and column positions
    if (codeIdx === -1 && hubIdx === -1) {
      // Find a row that contains 'hub' or 'branch'
      for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const r = (rows[i] || []).map((h: any) => String(h).trim().toLowerCase());
        const bIdx = r.findIndex(h => /^branch$|^station$|^kode/.test(h));
        const hIdx = r.findIndex(h => /^hub$/.test(h));
        if (bIdx !== -1 || hIdx !== -1) {
          codeIdx = bIdx !== -1 ? bIdx : codeIdx;
          hubIdx = hIdx !== -1 ? hIdx : hubIdx;
          dataStart = i + 1;
          headers = r;
          break;
        }
      }
    }
    // Heuristic fallback: many HUB sheets place data in columns B (code) and C (hub)
    if (codeIdx === -1 && hubIdx === -1) {
      codeIdx = 1;
      hubIdx = 2;
      dataStart = 1;
    } else {
      if (codeIdx === -1) codeIdx = 0;
      if (hubIdx === -1) hubIdx = Math.max(1, codeIdx + 1);
    }
    const map: Record<string, string> = {};
    for (let i = dataStart; i < rows.length; i++) {
      const row = rows[i] || [];
      const code = String(row[codeIdx] || '').trim().toUpperCase();
      const hub = String(row[hubIdx] || '').trim();
      if (code) map[code] = hub || '';
    }
    this.hubMap = map;
    this.hubMapTs = now;
    return map;
  }

  public async resolveHubForStation(stationCode?: string | null): Promise<string | null> {
    if (!stationCode) return null;
    try {
      const map = await this.getHubMappingFromSheet();
      const code = String(stationCode).trim().toUpperCase();
      return map[code] || null;
    } catch {
      return null;
    }
  }

  private mapRowToReport(row: any[], headers: string[], sheetName: string, rowIndex: number): Report {
    const report: any = {
      _source: 'SHEETS',
      _sheet: sheetName,
      row_number: rowIndex + 2 // +2 because 0-indexed array, +1 for header, +1 for 1-based row number
    };

    // Pre-calculate mapping for this sheet
    const columnMapping: Record<string, number> = {};
    (Object.keys(PROP_TO_HEADER) as Array<keyof Report>).forEach((prop) => {
        const headerNames = PROP_TO_HEADER[prop];
        if (headerNames) {
            const colIdx = headers.findIndex(h => 
                headerNames.some(name => h.trim().toLowerCase() === name.trim().toLowerCase())
            );
            if (colIdx !== -1) {
                columnMapping[prop as string] = colIdx;
            }
        }
    });

    // Fast mapping using pre-calculated indices
    Object.entries(columnMapping).forEach(([prop, colIdx]) => {
        if (row[colIdx] !== undefined) {
            let val = row[colIdx];
            
            // Clean up text if any
            if (typeof val === 'string') {
                val = val.trim();
                
                // Specific validation for area category fields to filter out garbage data
                const areaProps = ['terminal_area_category', 'apron_area_category', 'general_category'];
                if (areaProps.includes(prop)) {
                    const lowVal = val.toLowerCase();
                    // Filter out URLs or obviously non-category data
                    if (lowVal.startsWith('http') || 
                        lowVal.includes('www.') || 
                        val.length > 100 ||
                        lowVal === 'null' ||
                        lowVal === 'undefined') {
                        val = ''; // Clear garbage data
                    }
                }
            }
            
            report[prop] = val;
        }
    });

    // Post-parse evidence & video URLs into arrays and primary values for compatibility
    const parseUrlField = (pluralKey: keyof Report, singularKey: keyof Report) => {
      const val = report[pluralKey] || report[singularKey];
      if (val && typeof val === 'string') {
        const parts = val.split(/\s*\|\s*|\n+/).map(s => s.trim()).filter(Boolean);
        if (parts.length) {
          report[pluralKey] = parts as any;
          report[singularKey] = parts[0] as any;
        }
      } else if (report[singularKey] && typeof report[singularKey] === 'string' && !report[pluralKey]) {
        report[pluralKey] = [report[singularKey]] as any;
      }
    };

    parseUrlField('evidence_urls', 'evidence_url');
    parseUrlField('video_urls', 'video_url');

    // Handle internal IDs
    if (report.row_number) {
        const sourceId = `${sheetName}!row_${report.row_number}`;
        report.original_id = sourceId;
        report.id = this.getReportUuid(sourceId); // Generate stable UUID for Supabase persistence
    }
    report.source_sheet = sheetName;

    // Ensure title is never undefined or empty
    if (report.report && report.report.trim()) {
        report.title = report.report.trim();
    }
    if (!report.title) report.title = '(Tanpa Judul)';

    // Post-processing & Defaults
    const parsedEventDate = parseDate(report.date_of_event as string);
    if (parsedEventDate) {
      report.date_of_event = parsedEventDate.toISOString();
      if (!report.created_at) report.created_at = report.date_of_event;
    } else if (report.created_at) {
      const parsedCreated = parseDate(report.created_at as string);
      if (parsedCreated) {
        report.created_at = parsedCreated.toISOString();
      } else {
        report.created_at = new Date().toISOString();
      }
    } else {
      report.created_at = new Date().toISOString();
    }

    if (report.resolved_at) {
      const parsedResolved = parseDate(report.resolved_at as string);
      if (parsedResolved) {
        report.resolved_at = parsedResolved.toISOString();
      }
    }

    // Status Normalization
    const statusMapping: Record<string, string> = {
      'Closed': 'CLOSED', 'Open': 'OPEN', 'OPEN': 'OPEN',
      'CLOSED': 'CLOSED', 'closed': 'CLOSED', 'open': 'OPEN',
      'Selesai': 'CLOSED', 'selesai': 'CLOSED', 'Menunggu': 'OPEN',
      'menunggu': 'OPEN', 'On Progress': 'ON PROGRESS', 'ON PROGRESS': 'ON PROGRESS'
    };
    
    if (report.status) {
      let normalizedStatus = report.status.toString().trim().toUpperCase();
      normalizedStatus = statusMapping[normalizedStatus] || normalizedStatus;
      
      if (normalizedStatus === 'SELESAI' || normalizedStatus === 'CLOSED') {
          normalizedStatus = 'CLOSED';
      } else if (normalizedStatus === 'OPEN' || normalizedStatus === 'MENUNGGU' || normalizedStatus === 'ACTIVE' || normalizedStatus === 'MENUNGGU_FEEDBACK' || normalizedStatus === 'MENUNGGU FEEDBACK') {
          normalizedStatus = 'OPEN';
      } else if (normalizedStatus === 'ON PROGRESS' || normalizedStatus === 'ON_PROGRESS' || normalizedStatus === 'SUDAH_DIVERIFIKASI' || normalizedStatus === 'SUDAH DIVERIFIKASI') {
          normalizedStatus = 'ON PROGRESS';
      }
      report.status = normalizedStatus;
    } else {
      report.status = 'OPEN';
    }
    
    // Severity Normalization
    if (report.severity) {
      const severityMap: Record<string, string> = {
        'High': 'high', 'high': 'high', 'HIGH': 'high',
        'Medium': 'medium', 'medium': 'medium', 'MEDIUM': 'medium',
        'Low': 'low', 'low': 'low', 'LOW': 'low',
        'Urgent': 'urgent', 'urgent': 'urgent', 'URGENT': 'urgent',
      };
      report.severity = severityMap[report.severity.toString().trim()] || 'low';
    } else {
      report.severity = 'low';
    }
    
    if (!report.priority) report.priority = 'low';
    
    // Critical aliases and field mapping
    if (!report.main_category && report.irregularity_complain_category) report.main_category = report.irregularity_complain_category;
    if (report.main_category && !report.category) report.category = report.main_category;
    if (report.category && !report.main_category) report.main_category = report.category;
    
    if (report.main_category) {
      const cat = String(report.main_category).toLowerCase();
      if (cat.includes('irregular')) report.main_category = 'Irregularity';
      else if (cat.includes('complain')) report.main_category = 'Complaint';
      else if (cat.includes('compliment')) report.main_category = 'Compliment';
      report.category = report.main_category;
    }

    if (report.airline && !report.airlines) report.airlines = report.airline;
    if (report.airlines && !report.airline) report.airline = report.airlines;
    
    if (!report.branch && report.reporting_branch) report.branch = report.reporting_branch;
    if (!report.branch && report.station_code) report.branch = report.station_code;

    if (report.branch) {
        report.station_id = report.branch;
        report.stations = { code: report.branch as string, name: report.branch as string };
        if (!report.location) report.location = report.branch;
    }

    if (!report.sla_deadline && report.created_at) {
      try {
        report.sla_deadline = calculateSlaDeadline(report.created_at as string, report.priority as any).toISOString();
      } catch (_) {}
    }
    
    if (sheetName === 'CGO' && !report.area) report.area = 'CARGO';
    else if (sheetName === 'NON CARGO' && !report.area) {
         if (report.terminal_area_category) report.area = 'TERMINAL';
         else if (report.apron_area_category) report.area = 'APRON';
    }

    if (report.status === 'CLOSED' && !report.resolved_at) {
        report.resolved_at = report.date_of_event || report.created_at || new Date().toISOString();
    }

    // Normalize Target Division to match application constants (DIVISIONS) using strict regex extraction
    if (report.target_division) {
        const divRaw = String(report.target_division).trim();
        // Strictly Match case: OT, OP, UQ, HT, OS, HC
        const match = divRaw.match(/(OT|OP|UQ|HT|OS|HC)/);
        if (match) {
            report.target_division = match[1];
        } else {
            // No matches found for strict regex, clear to avoid false categorization
            report.target_division = null;
        }
    }

    report.source_fingerprint = buildReportFingerprint(report);

    return report as Report;
  }

  private getTargetSheet(reportData: Partial<Report>): string {
    let targetSheet = 'NON CARGO';
    const category = String(reportData.category || reportData.main_category || '').toLowerCase();
    const area = String(reportData.area || '').toLowerCase();
    const primaryTag = String(reportData.primary_tag || '').toUpperCase();

    if (
      area === 'cargo' ||
      category.includes('cargo') ||
      reportData.is_gse_related ||
      primaryTag === 'CGO' ||
      primaryTag === 'CARGO'
    ) {
      targetSheet = 'CGO';
    }

    return targetSheet;
  }

  private buildWritableReport(reportData: Partial<Report>, targetSheet: string): Report {
    const newReport: Report = {
      ...reportData,
      created_at: reportData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: reportData.status || 'OPEN',
      severity: reportData.severity || 'low',
      priority: reportData.priority || 'medium',
      title: reportData.title || reportData.report || 'Untitled',
      description: reportData.description || reportData.report || '',
      location: reportData.location || '',
      source_sheet: targetSheet,
    } as Report;

    if (!(newReport as any).root_caused && (newReport as any).root_cause) {
      (newReport as any).root_caused = (newReport as any).root_cause;
    }
    if (!(newReport as any).action_taken && (newReport as any).immediate_action) {
      (newReport as any).action_taken = (newReport as any).immediate_action;
    }
    if (!(newReport as any).airline && (newReport as any).airlines) {
      (newReport as any).airline = (newReport as any).airlines;
    }
    if (!(newReport as any).airlines && (newReport as any).airline) {
      (newReport as any).airlines = (newReport as any).airline;
    }

    const normalizedCategory = resolveReportCategory(newReport);
    if (normalizedCategory) {
      newReport.main_category = normalizedCategory;
      newReport.category = normalizedCategory;
    }

    return newReport;
  }

  private assignSheetIdentity(report: Report, targetSheet: string, rowNumber: number | null): Report {
    if (rowNumber) {
      const originalId = `${targetSheet}!row_${rowNumber}`;
      report.original_id = originalId;
      report.sheet_id = originalId as any;
      report.id = this.getReportUuid(originalId);
      report.row_number = rowNumber;
    } else {
      const fallbackId = `${targetSheet}!row_pending_${Date.now()}`;
      report.original_id = fallbackId;
      report.sheet_id = fallbackId as any;
      report.id = this.getReportUuid(fallbackId);
      report.row_number = undefined;
    }

    report.source_sheet = targetSheet;
    report.source_fingerprint = buildReportFingerprint(report);
    return report;
  }

  private buildSheetRow(headers: string[], report: Report): any[] {
    return headers.map((header: string) => {
      const normalizedHeader = header.trim().toLowerCase();

      const propEntry = Object.entries(PROP_TO_HEADER).find(([_, names]) =>
        (names as string[]).some(name => name.toLowerCase() === normalizedHeader)
      );

      if (propEntry) {
        const prop = propEntry[0] as keyof Report;

        if (prop === 'evidence_url' || prop === 'evidence_urls') {
          const urls = Array.isArray((report as any).evidence_urls)
            ? (report as any).evidence_urls
            : ((report as any).evidence_url ? [(report as any).evidence_url] : []);

          const videoUrls = Array.isArray((report as any).video_urls)
            ? (report as any).video_urls
            : [];

          const allUrls = [...urls, ...videoUrls].filter(Boolean);
          return allUrls.length ? allUrls.join(' | ') : '';
        }

        const val = report[prop];
        if (Array.isArray(val)) return val.join(' | ');
        if (val && typeof val === 'object') return JSON.stringify(val);
        return val !== undefined ? val : '';
      }

      if ((report as any)[header]) {
        const v = (report as any)[header];
        if (Array.isArray(v)) return v.join(' | ');
        if (v && typeof v === 'object') return JSON.stringify(v);
        return v;
      }
      return '';
    });
  }

  private async getSheetIdByName(sheetName: string): Promise<number | null> {
    if (SHEET_IDS[sheetName] !== undefined) {
        return SHEET_IDS[sheetName];
    }
    const sheets = await this.getSheets();
    if (!SPREADSHEET_ID) throw new Error('GOOGLE_SHEET_ID is not defined');
    const response = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheet = response.data.sheets?.find(s => s.properties?.title === sheetName);
    return sheet?.properties?.sheetId ?? null;
  }

  private async getHeaderRow(sheetName: string): Promise<string[]> {
    const cacheKey = `headers:${sheetName}`;
    const cached = getCache<string[]>(cacheKey, 1000 * 60 * 60); // 1 hour cache for headers
    if (cached) return cached;

    const sheets = await this.getSheets();
    if (!SPREADSHEET_ID) throw new Error('GOOGLE_SHEET_ID is not defined');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!1:1`,
    });
    const headers = (response.data.values?.[0] || []).map((h: any) => String(h).trim());
    setCache(cacheKey, headers);
    return headers;
  }

  private async fetchSheetWithRetry(sheetName: string, retries = 3, delay = 1000): Promise<any[][]> {
      const sheets = await this.getSheets();
      if (!SPREADSHEET_ID) throw new Error('GOOGLE_SHEET_ID is not defined');
      for (let i = 0; i < retries; i++) {
          try {
              const response = await sheets.spreadsheets.values.get({
                  spreadsheetId: SPREADSHEET_ID,
                  range: sheetName,
              });
              return response.data.values || [];
          } catch (error) {
              if (i === retries - 1) throw error;
              console.warn(`Retry ${i + 1}/${retries} fetching sheet ${sheetName}:`, error);
              await new Promise(res => setTimeout(res, delay * Math.pow(2, i)));
          }
      }
      return [];
  }

  public invalidateCache() {
    // Clear memory cache
    const keys = Array.from(ttlCache.keys());
    keys.forEach((k) => {
      if (k.startsWith(CACHE_KEY_ALL_REPORTS)) ttlCache.delete(k);
    });
    
    // Clear file system cache
    try {
        const fs = require('fs');
        if (fs.existsSync(FS_CACHE_DIR)) {
            fs.rmSync(FS_CACHE_DIR, { recursive: true, force: true });
        }
    } catch (err) {
        console.warn('[ReportsService] Failed to clear FS cache:', err);
    }
    
    console.log('[ReportsService] All caches invalidated');
  }

  public getLastUpdated(): number {
    const entry = ttlCache.get(CACHE_KEY_ALL_REPORTS);
    return entry ? entry.ts : Date.now();
  }

  async getReports(options?: { 
    refresh?: boolean; 
    filters?: {
      dateFrom?: string;
      dateTo?: string;
      hub?: string;
      branch?: string;
      area?: string;
      airlines?: string;
      sourceSheet?: string;
    },
    fields?: string[];
    source?: 'auto' | 'sheets' | 'sync';
  }): Promise<Report[]> {
    const { refresh, filters, fields, source = 'auto' } = options || {};
    
    // Create a cache key that includes filters and fields
    const filterKey = filters ? JSON.stringify(filters) : 'none';
    const fieldsKey = fields ? fields.sort().join(',') : 'all';
    const sourceKey = source || 'auto';
    const cacheKey = `${CACHE_KEY_ALL_REPORTS}:${filterKey}:${fieldsKey}:${sourceKey}`;

    if (!refresh) {
      const cached = getCache<Report[]>(cacheKey, CACHE_TTL);
      if (cached) return cached;
      const fsCached = await readFsCache<Report[]>(cacheKey, CACHE_TTL);
      if (fsCached) {
        setCache(cacheKey, fsCached);
        return fsCached;
      }
    }

    // --- DATA SOURCE SELECTION ---
    let sheetReports: Report[] = [];
    let dbReports: Report[] = [];
    
    if (source === 'sheets') {
      // Force direct Google Sheets
      try {
        sheetReports = await this.fetchGoogleSheetsReports();
        console.log(`[ReportsService] Using ${sheetReports.length} reports directly from Google Sheets (forced)`);
      } catch (err) {
        console.error('[ReportsService] Google Sheets fetch failed (forced):', err);
        sheetReports = [];
      }
    } else if (source === 'sync') {
      // Force reports_sync only
      const syncReports = await this.fetchReportsFromSync();
      sheetReports = syncReports;
      console.log(`[ReportsService] Using ${sheetReports.length} reports from reports_sync (forced)`);
    } else {
      // AUTO: Try reports_sync first then fallback to Sheets
      const syncReports = await this.fetchReportsFromSync();
      if (syncReports.length > 0) {
        sheetReports = syncReports;
        console.log(`[ReportsService] Using ${syncReports.length} reports from reports_sync (fast path)`);
      } else {
        const sheetsPromise = this.fetchGoogleSheetsReports();
        const [sheetsResult] = await Promise.all([
          sheetsPromise.catch(err => {
            console.error('[ReportsService] Google Sheets fetch failed:', err);
            return [] as Report[];
          })
        ]);
        sheetReports = sheetsResult;
      }
    }
    
    // Fetch from legacy reports table (for reports created directly in DB)
    const supabasePromise = this.fetchSupabaseReports();
    const [dbResult] = await Promise.all([
      supabasePromise.catch(err => {
        console.error('[ReportsService] Supabase fetch failed:', err);
        return [] as Report[];
      })
    ]);
    dbReports = dbResult;

    console.log(`[ReportsService] Fetched ${sheetReports.length} from Sheets/Sync, ${dbReports.length} from Supabase`);

    // --- MERGE STRATEGY ---
    // 1. Create a map of Sheet reports by ID for O(1) lookup
    // 2. Iterate DB reports
    //    - If DB report matches a Sheet report (via sheet_id or id):
    //      * ENRICH the Sheet report with critical fields from DB (user_id, status, etc.) if missing in Sheet
    //    - If no match found in Sheet reports, add DB report to the list
    
    const combinedReports: Report[] = [...sheetReports];
    const sheetReportMap = new Map<string, Report>();
    sheetReports.forEach(r => sheetReportMap.set(r.id, r));
    
    // Add DB reports that are NOT in Sheets (based on sheet_id reference)
    dbReports.forEach(dbReport => {
      // Attempt to link a Supabase report to its Sheet counterpart using canonical UUID of sheet_id
      let linkedSheetUuid: string | null = null;
      const sheetIdRef = (dbReport as any).sheet_id as string | undefined;
      if (sheetIdRef) {
        try {
          linkedSheetUuid = this.getReportUuid(sheetIdRef);
        } catch {
          linkedSheetUuid = null;
        }
      }

      let matchFound = false;
      let existingReport: Report | undefined;

      if (linkedSheetUuid && sheetReportMap.has(linkedSheetUuid)) {
        matchFound = true;
        existingReport = sheetReportMap.get(linkedSheetUuid);
      } else if (sheetReportMap.has(dbReport.id)) {
        matchFound = true;
        existingReport = sheetReportMap.get(dbReport.id);
      }

      if (matchFound && existingReport) {
        // ENRICHMENT: Copy critical fields from DB if missing in Sheet
        // This fixes the issue where user_id might be missing in Sheet but present in DB
        if (!existingReport.user_id && dbReport.user_id) {
            existingReport.user_id = dbReport.user_id;
        }
        if (!existingReport.created_at && dbReport.created_at) {
            existingReport.created_at = dbReport.created_at;
        }
        if (!existingReport.target_division && dbReport.target_division) {
            existingReport.target_division = dbReport.target_division;
        }
        // Sync status if DB is more recent (optional, but good for tracking)
        // For now, trust Sheet as primary, but if Sheet status is 'Pending' and DB is 'Done', maybe update?
        // Let's stick to Sheet as primary for status to avoid confusion.
      } else {
        // No match found in Sheets, so this is a Supabase-only report
        combinedReports.push(dbReport);
      }
    });

    // --- FILTERING ---
    const filteredReports = combinedReports.filter(report => {
        // ... (existing filtering logic)
        if (filters) {
          // Date filtering
          if (filters.dateFrom || filters.dateTo) {
            const reportDate = parseDate(report.date_of_event || report.created_at);
            if (!reportDate) return false;
            
            if (filters.dateFrom) {
              const fromDate = new Date(filters.dateFrom);
              if (reportDate < fromDate) return false;
            }
            
            if (filters.dateTo) {
              const toDate = new Date(filters.dateTo);
              toDate.setHours(23, 59, 59, 999);
              if (reportDate > toDate) return false;
            }
          }

          // Hub filtering
          if (filters.hub && filters.hub !== 'all' && (report.hub !== filters.hub)) return false;

          // Branch filtering
          if (filters.branch && filters.branch !== 'all') {
            const reportBranch = report.branch || report.reporting_branch || report.station_code;
            if (reportBranch !== filters.branch) return false;
          }

          // Area filtering
          if (filters.area && filters.area !== 'all') {
            const reportArea = report.area || report.terminal_area_category || report.apron_area_category || report.general_category || '';
            if (reportArea !== filters.area) return false;
          }

          // Airlines filtering
          if (filters.airlines && filters.airlines !== 'all' && report.airlines !== filters.airlines) return false;
          
          // Source Sheet filtering
          if (filters.sourceSheet && report.source_sheet !== filters.sourceSheet) return false;
        }
        return true;
    });

    // --- SORTING ---
    filteredReports.sort((a, b) => {
      const dateA = a.date_of_event ? new Date(a.date_of_event).getTime() : 0;
      const dateB = b.date_of_event ? new Date(b.date_of_event).getTime() : 0;
      return dateB - dateA;
    });

    // --- FIELD PROJECTION ---
    const finalReports = fields && fields.length > 0 
      ? filteredReports.map(r => {
          const projected: any = {};
          fields.forEach(f => {
            // @ts-ignore
            if (r[f] !== undefined) projected[f] = r[f];
          });
          projected.id = r.id; // Always keep ID
          return projected as Report;
        })
      : filteredReports;

    setCache(cacheKey, finalReports);
    writeFsCache(cacheKey, finalReports).catch(() => {});
    return finalReports;
  }

  // Extracted Google Sheets Fetch Logic
  private async fetchGoogleSheetsReports(): Promise<Report[]> {
    if (!SPREADSHEET_ID) throw new Error('GOOGLE_SHEET_ID is not defined');
    const sheets = await this.getSheets();
    
    // Batch fetch for performance consolidation (O(1) HTTP requests)
    const ranges = REPORT_SHEETS.map(name => `${name}`);
    const batchRes = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: SPREADSHEET_ID,
      ranges,
    });

    const allReports: Report[] = [];
    const valueRanges = batchRes.data.valueRanges || [];

    for (let i = 0; i < REPORT_SHEETS.length; i++) {
      const sheetName = REPORT_SHEETS[i];
      const data = valueRanges[i]?.values || [];
      if (data.length === 0) continue;

      const headers = (data[0] || []).map((h: any) => String(h).trim());
      const rows = data.slice(1);

      for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        const report = this.mapRowToReport(row, headers, sheetName, index);
        allReports.push(report);
      }
    }
    return allReports;
  }

  // Fetch from reports_sync table (fast path - synced from Google Sheets)
  private async fetchReportsFromSync(): Promise<Report[]> {
    try {
      // Fetch all records using pagination (Supabase has 1000 row limit by default)
      const allReports: any[] = [];
      const batchSize = 1000;
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('reports_sync')
          .select('*')
          .order('date_of_event', { ascending: false })
          .range(offset, offset + batchSize - 1);

        if (error) {
          console.warn('[ReportsService] reports_sync fetch error:', error);
          break;
        }

        if (!data || data.length === 0) {
          hasMore = false;
        } else {
          allReports.push(...data);
          hasMore = data.length === batchSize;
          offset += batchSize;
        }
      }

      if (allReports.length === 0) {
        console.log('[ReportsService] reports_sync table is empty, falling back to Sheets');
        return [];
      }

      console.log(`[ReportsService] Fetched ${allReports.length} reports from reports_sync`);

      return allReports.map((row: any) => ({
        ...row,
        id: row.id,
        sheet_id: row.sheet_id,
        source_fingerprint: row.source_fingerprint || buildReportFingerprint(row),
        evidence_urls: row.evidence_urls || (row.evidence_url ? [row.evidence_url] : []),
        status: row.status || 'OPEN',
        severity: row.severity || 'low',
        priority: row.priority || 'low',
        date_of_event: row.date_of_event || row.incident_date || row.created_at,
        created_at: row.created_at || new Date().toISOString(),
        stations: row.station_id ? { code: row.station_id, name: row.station_id } : undefined,
      })) as Report[];
    } catch (error) {
      console.error('[ReportsService] reports_sync fetch exception:', error);
      return [];
    }
  }

  // Supabase Fetch Logic (legacy reports table)
  private async fetchSupabaseReports(): Promise<Report[]> {
    // Fetch using pagination to avoid 1000 row limit
    const allReports: any[] = [];
    const batchSize = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.warn('[ReportsService] Supabase fetch error:', error);
        break;
      }

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allReports.push(...data);
        hasMore = data.length === batchSize;
        offset += batchSize;
      }
    }

    if (allReports.length === 0) return [];

    return allReports.map((row: any) => ({
      ...row,
      // Map DB fields to Report interface if needed
      // Most fields should match due to direct mapping in POST
      id: row.id, // UUID
      sheet_id: row.sheet_id, // Reference to Google Sheet ID
      source_fingerprint: row.source_fingerprint || buildReportFingerprint(row),
      
      // Ensure specific fields are present
      evidence_urls: row.evidence_urls || (row.evidence_url ? [row.evidence_url] : []),
      
      // Fallbacks
      status: row.status || 'OPEN',
      severity: row.severity || 'low',
      priority: row.priority || 'low',
      
      // Date Normalization
      date_of_event: row.date_of_event || row.event_date || row.created_at,
      created_at: row.created_at || new Date().toISOString(),

      // Re-construct nested objects if needed
      stations: row.station_id ? { code: row.station_id, name: row.station_id } : undefined,
    })) as Report[];
  }

  async getStations(): Promise<Station[]> {
    const cacheKey = 'stations:all:v1';
    const cached = getCache<Station[]>(cacheKey, CACHE_TTL);
    if (cached) return cached;

    try {
      const { data, error } = await supabase.from('stations').select('id, code, name').order('code');
      if (!error && Array.isArray(data) && data.length > 0) {
        const stationsDb: Station[] = data.map((row: any) => ({
          id: row.id,
          code: row.code,
          name: row.name,
        }));
        setCache(cacheKey, stationsDb);
        return stationsDb;
      }
    } catch {}

    const reports = await this.getReports();
    const branchNames = Array.from(new Set(reports.map(r => r.branch).filter(Boolean)));
    let stations: Station[] = branchNames.map((name) => ({
      id: String(name),
      code: String(name),
      name: String(name),
    }));

    if (stations.length === 0) {
      const fallbackCodes = ['GPS', 'CGK', 'DPS', 'SUB', 'UPG', 'KNO', 'BPN', 'MDC', 'PDG', 'PKU', 'BTH', 'PLM'];
      stations = fallbackCodes.map(code => ({ id: code, code, name: code }));
    }

    setCache(cacheKey, stations);
    return stations;
  }

  // Helper metadata fetchers to consolidate logic
  async getUnits(): Promise<Unit[]> {
    const { data } = await supabase.from('units').select('*').order('name');
    return data || [];
  }

  async getPositions(): Promise<Position[]> {
    const { data } = await supabase.from('positions').select('*').order('level');
    return data || [];
  }

  async getIncidentTypes(): Promise<IncidentType[]> {
    const { data } = await supabase.from('incident_types').select('*').order('name');
    return data || [];
  }

  async getLocations(stationCode?: string): Promise<any[]> {
    let query = supabase.from('locations').select('*').order('name');
    if (stationCode) {
      query = query.eq('station_id', stationCode);
    }
    const { data } = await query;
    return data || [];
  }

  // NOTE: Create/Update implementation below assumes headers match WRITE_MAPPING.
  // We prefer writing to 'NON CARGO' or 'CGO' based on Logic, using preferred headers.

  async createReport(reportData: Partial<Report>): Promise<Report> {
    const sheets = await this.getSheets();
    if (!SPREADSHEET_ID) throw new Error('GOOGLE_SHEET_ID is not defined');

    const targetSheet = this.getTargetSheet(reportData);
    const headers = await this.getHeaderRow(targetSheet);
    const newReport = this.buildWritableReport(reportData, targetSheet);
    const row = this.buildSheetRow(headers, newReport);

    const appendRes = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${targetSheet}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });
    
    // Invalidate cache
    this.invalidateCache();
    
    // Attempt to set ID (with fallback when updatedRange is missing)
    let updatedRowNumber: string | null = null;
    const updatedRange = appendRes.data.updates?.updatedRange || null;
    if (updatedRange) {
        const match = updatedRange.match(/!A(\d+)/);
        if (match && match[1]) {
            updatedRowNumber = match[1];
        }
    }
    if (!updatedRowNumber) {
        try {
            // Fallback: read first column to infer last non-empty row (includes header)
            const colA = await sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: `${targetSheet}!A:A`,
            });
            const totalRows = (colA.data.values || []).length;
            if (totalRows && totalRows > 1) {
                updatedRowNumber = String(totalRows);
            }
        } catch {}
    }
    return this.assignSheetIdentity(newReport, targetSheet, updatedRowNumber ? parseInt(updatedRowNumber, 10) : null);
  }

  async getReportById(id: string): Promise<Report | null> {
    const reports = await this.getReports();
    return reports.find(r => r.id === id || r.original_id === id) || null;
  }

  private parseId(id: string): { sheetName: string, rowIndex: number } | null {
    if (!id.includes('!row_')) return null;
    const [sheetName, rowPart] = id.split('!row_');
    const index = parseInt(rowPart, 10);
    if (isNaN(index)) return null;
    return { sheetName, rowIndex: index };
  }

  private async resolveIdToOriginal(id: string): Promise<string | null> {
    if (id.includes('!row_')) return id;
    const report = await this.getReportById(id);
    return report?.original_id || null;
  }

  async updateReport(id: string, updates: Partial<Report>): Promise<Report | null> {
    const originalId = await this.resolveIdToOriginal(id);
    if (!originalId) {
        console.error('Invalid ID format for update:', id);
        return null; 
    }
    
    const parsed = this.parseId(originalId);
    if (!parsed) return null;

    const sheets = await this.getSheets();
    if (!SPREADSHEET_ID) throw new Error('GOOGLE_SHEET_ID is not defined');
    const { sheetName, rowIndex } = parsed;

    // Check for Report Transfer Trigger (NON CARGO -> CGO)
    if (updates.primary_tag === 'CGO' && sheetName !== 'CGO') {
        const currentReport = await this.getReportById(id);
        if (currentReport) {
            const newReportPayload: any = {
                ...currentReport,
                ...updates,
            };
            delete newReportPayload.id;
            newReportPayload.primary_tag = 'CGO';

            const newReport = await this.createReport(newReportPayload);
            if (newReport) {
                await this.deleteReport(originalId);
                return newReport;
            }
        }
    }

    const headers = await this.getHeaderRow(sheetName);
    // Handles columns beyond Z (AA, AB, ..., AZ, BA, ...)
    // Complexity: Time O(log26(n)) | Space O(log26(n))
    const getColLetter = (index: number): string => {
        let col = '';
        let n = index;
        while (n >= 0) {
            col = String.fromCharCode(65 + (n % 26)) + col;
            n = Math.floor(n / 26) - 1;
        }
        return col;
    };

    // Update individual cells based on headers mapping
    for (const [key, value] of Object.entries(updates)) {
        if (value === undefined) continue;

        let currentUpdateValue = value;

        // Special handling for evidence_urls and video_urls - merge with existing
        if (key === 'evidence_urls' || key === 'evidence_url' || key === 'video_urls' || key === 'video_url') {
            const currentReport = await this.getReportById(id);
            if (currentReport) {
                const existingUrls = [
                    ...(Array.isArray(currentReport.evidence_urls) ? currentReport.evidence_urls : []),
                    ...(currentReport.evidence_url && !Array.isArray(currentReport.evidence_urls) ? [currentReport.evidence_url] : []),
                    ...(Array.isArray(currentReport.video_urls) ? currentReport.video_urls : []),
                    ...(currentReport.video_url && !Array.isArray(currentReport.video_urls) ? [currentReport.video_url] : [])
                ];
                
                const newUrls = [
                    ...(Array.isArray(updates.evidence_urls) ? updates.evidence_urls : []),
                    ...(updates.evidence_url ? [updates.evidence_url] : []),
                    ...(Array.isArray(updates.video_urls) ? updates.video_urls : []),
                    ...(updates.video_url ? [updates.video_url] : [])
                ];
                
                // Merge and deduplicate
                const allUrls = [...new Set([...existingUrls, ...newUrls])].filter(Boolean);
                
                // Update both evidence_urls and video_urls to ensure all URLs are saved
                updates.evidence_urls = allUrls;
                currentUpdateValue = allUrls;
            }
        }

        // Find column index for this property
        let colIndex = -1;
        const propHeaders = PROP_TO_HEADER[key as keyof Report];
        
        if (propHeaders) {
            colIndex = headers.findIndex(h => 
                propHeaders.some(name => h.trim().toLowerCase() === name.trim().toLowerCase())
            );
        }

        if (colIndex === -1) {
            colIndex = headers.findIndex((h: string) => {
                const trimmedH = h.trim().toLowerCase();
                return trimmedH === key.toLowerCase() || trimmedH === key.replace(/_/g, ' ').toLowerCase();
            });
        }

        if (colIndex === -1) continue;

        const colLetter = getColLetter(colIndex);
        const cellRange = `${sheetName}!${colLetter}${rowIndex}`;
        
        let stringValue: any = currentUpdateValue;
        if (currentUpdateValue === null || currentUpdateValue === undefined) stringValue = '';
        else if (Array.isArray(currentUpdateValue)) stringValue = currentUpdateValue.join('\n');
        else if (typeof currentUpdateValue === 'object') stringValue = JSON.stringify(currentUpdateValue);
        else stringValue = String(currentUpdateValue);

        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: cellRange,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [[stringValue]] }
        });
    }

    this.invalidateCache();
    const existing = await this.getReportById(id);
    return existing ? { ...existing, ...updates } : null;
  }

  async deleteReport(id: string): Promise<boolean> {
    const sheets = await this.getSheets();
    if (!SPREADSHEET_ID) throw new Error('GOOGLE_SHEET_ID is not defined');

    const parsed = this.parseId(id);
    if (!parsed) return false;
    const { sheetName, rowIndex } = parsed;

    const sheetId = await this.getSheetIdByName(sheetName);
    if (sheetId === null) return false;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex - 1,
                endIndex: rowIndex,
              },
            },
          },
        ],
      },
    });

    this.invalidateCache();
    return true;
  }

  async batchCreateReports(reports: Partial<Report>[]): Promise<Report[]> {
    if (!reports.length) return [];
    const sheets = await this.getSheets();
    if (!SPREADSHEET_ID) throw new Error('GOOGLE_SHEET_ID is not defined');

    // Group by target sheet to minimize API calls
    const grouped: Record<string, Array<{ index: number; report: Report }>> = {
      'NON CARGO': [],
      'CGO': []
    };

    reports.forEach((reportData, index) => {
      const targetSheet = this.getTargetSheet(reportData);
      grouped[targetSheet].push({
        index,
        report: this.buildWritableReport(reportData, targetSheet),
      });
    });

    const createdReports = new Array<Report>(reports.length);

    for (const [targetSheet, reportsInSheet] of Object.entries(grouped)) {
      if (!reportsInSheet.length) continue;

      const headers = await this.getHeaderRow(targetSheet);
      const existingColumn = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${targetSheet}!A:A`,
      });
      const previousRowCount = (existingColumn.data.values || []).length;

      const rows = reportsInSheet.map(({ report }) => this.buildSheetRow(headers, report));

      const appendRes = await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${targetSheet}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rows },
      });

      let startRow = previousRowCount + 1;
      const updatedRange = appendRes.data.updates?.updatedRange || '';
      const match = updatedRange.match(/![A-Z]+(\d+):[A-Z]+(\d+)/);
      if (match && match[1]) {
        startRow = parseInt(match[1], 10);
      }

      reportsInSheet.forEach(({ index, report }, offset) => {
        createdReports[index] = this.assignSheetIdentity(report, targetSheet, startRow + offset);
      });
    }

    this.invalidateCache();
    return createdReports.filter((report): report is Report => Boolean(report));
  }

  // New: severity distribution helper for analytics
  async getSeverityDistribution(filters: {
    hub?: string;
    branch?: string;
    airlines?: string;
    area?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}): Promise<{ severity: string; count: number }[]> {
    const all = await this.getReports();
    // Apply runtime filtering consistent with existing filter logic
    const filtered = all.filter(r => {
      const sheet = (filters as any).source_sheet || r.source_sheet || 'NON CARGO';
      if (r.source_sheet && r.source_sheet !== sheet) return false;
      if (filters.hub && filters.hub !== 'all' && (r.hub ?? '') !== filters.hub) return false;
      if (filters.branch && filters.branch !== 'all' && (r.branch ?? r.stations?.code ?? '') !== filters.branch) return false;
      if (filters.airlines && filters.airlines !== 'all' && (r.airlines ?? r.airline ?? '') !== filters.airlines) return false;
      if (filters.area && filters.area !== 'all' && (r.area ?? '') !== filters.area) return false;
      const fqFrom = filters.dateFrom;
      const fqTo = filters.dateTo;
      if (fqFrom || fqTo) {
        const dt = r.date_of_event ?? r.created_at;
        if (dt) {
          const d = new Date(dt as string);
          if (fqFrom) {
            const from = new Date(fqFrom);
            if (d < from) return false;
          }
          if (fqTo) {
            const to = new Date(fqTo);
            to.setHours(23, 59, 59, 999);
            if (d > to) return false;
          }
        }
      }
      return true;
    });

    const map = new Map<string, number>();
    filtered.forEach((r) => {
      const sev = (r.severity || 'low').toString();
      map.set(sev, (map.get(sev) ?? 0) + 1);
    });

    const order = ['low', 'medium', 'high', 'urgent'];
    const result = order
      .map((s) => ({ severity: s, count: map.get(s) ?? 0 }))
      .filter((x) => true);

    // Return as array sorted by count desc (non-zero first)
    return result
      .sort((a, b) => b.count - a.count)
      .map(r => ({ severity: r.severity, count: r.count }));
  }
}

export const reportsService = new ReportsService();
