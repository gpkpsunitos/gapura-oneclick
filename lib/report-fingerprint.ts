/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi utilitas untuk fingerprinting dan normalisasi data laporan
 */

import crypto from 'crypto';
import type { Report } from '@/types';

/**
 * Menormalisasi nilai teks menjadi format konsisten
 * @param value - Nilai yang akan dinormalisasi
 * @returns String yang sudah dinormalisasi
 */
function normalizeText(value: unknown): string {
    if (value === null || value === undefined) return '';

    const raw = Array.isArray(value)
        ? value.join(' ')
        : typeof value === 'number' || typeof value === 'boolean'
            ? String(value)
            : String(value);

    return raw
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

/**
 * Menormalisasi nilai date ke format ISO date string
 * @param value - Nilai date yang akan dinormalisasi
 * @returns String date dalam format YYYY-MM-DD
 */
function normalizeDate(value: unknown): string {
    if (!value) return '';

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10);
    }

    if (typeof value === 'number') {
        const serialDate = new Date(Math.round((value - 25569) * 86400 * 1000));
        return Number.isNaN(serialDate.getTime()) ? '' : serialDate.toISOString().slice(0, 10);
    }

    const normalized = normalizeText(value);
    if (!normalized) return '';

    const parsed = new Date(String(value));
    if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString().slice(0, 10);
    }

    return normalized;
}

/**
 * Mengonversi string ke format Title Case
 * @param value - String yang akan dikonversi
 * @returns String dalam format Title Case
 */
function toTitleCase(value: string): string {
    return value
        .split(' ')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

/**
 * Menormalisasi kategori laporan ke format standar
 * @param value - Nilai kategori yang akan dinormalisasi
 * @returns String kategori dalam format standar
 * @example
 * ```ts
 * const category = normalizeReportCategory('irregularity');
 * // returns: 'Irregularity'
 * ```
 */
export function normalizeReportCategory(value: unknown): string {
    const normalized = normalizeText(value);
    if (!normalized) return '';
    if (normalized.includes('irregular')) return 'Irregularity';
    if (normalized.includes('complaint') || normalized.includes('complain')) return 'Complaint';
    if (normalized.includes('compliment')) return 'Compliment';
    return toTitleCase(normalized);
}

/**
 * Mendapatkan kategori laporan dengan prioritas field tertentu
 * @param report - Objek laporan parsial
 * @returns String kategori laporan
 * @example
 * ```ts
 * const category = resolveReportCategory(report);
 * ```
 */
export function resolveReportCategory(report: Partial<Report>): string {
    return normalizeReportCategory(
        report.main_category ||
        report.category ||
        report.irregularity_complain_category
    );
}

/**
 * Mendapatkan cabang laporan
 * @param report - Objek laporan parsial
 * @returns String cabang laporan
 * @example
 * ```ts
 * const branch = resolveReportBranch(report);
 * ```
 */
export function resolveReportBranch(report: Partial<Report>): string {
    return normalizeText(
        report.branch ||
        report.reporting_branch ||
        report.station_code ||
        report.station_id
    );
}

/**
 * Mendapatkan airline laporan
 * @param report - Objek laporan parsial
 * @returns String airline laporan
 * @example
 * ```ts
 * const airline = resolveReportAirline(report);
 * ```
 */
export function resolveReportAirline(report: Partial<Report>): string {
    return normalizeText(report.airline || report.airlines);
}

/**
 * Mendapatkan kategori area laporan
 * @param report - Objek laporan parsial
 * @returns String kategori area laporan
 * @example
 * ```ts
 * const areaCategory = resolveAreaCategory(report);
 * ```
 */
export function resolveAreaCategory(report: Partial<Report>): string {
    const normalizedArea = normalizeText(report.area);

    if (normalizedArea.includes('terminal') && report.terminal_area_category) {
        return normalizeText(report.terminal_area_category);
    }

    if (normalizedArea.includes('apron') && report.apron_area_category) {
        return normalizeText(report.apron_area_category);
    }

    if (normalizedArea.includes('general') && report.general_category) {
        return normalizeText(report.general_category);
    }

    return normalizeText(
        report.terminal_area_category ||
        report.apron_area_category ||
        report.general_category
    );
}

/**
 * Mendapatkan narasi laporan
 * @param report - Objek laporan parsial
 * @returns String narasi laporan
 * @example
 * ```ts
 * const narrative = resolveReportNarrative(report);
 * ```
 */
export function resolveReportNarrative(report: Partial<Report>): string {
    return normalizeText(report.report || report.description || report.title);
}

/**
 * Membangun fingerprint unik untuk laporan
 * @param report - Objek laporan parsial
 * @returns String fingerprint SHA256
 * @example
 * ```ts
 * const fingerprint = buildReportFingerprint(report);
 * ```
 */
export function buildReportFingerprint(report: Partial<Report>): string {
    const parts = [
        normalizeText(report.source_sheet),
        normalizeDate(report.date_of_event || report.incident_date || report.created_at),
        resolveReportBranch(report),
        resolveReportAirline(report),
        normalizeText(report.flight_number),
        normalizeText(report.route),
        resolveReportCategory(report),
        normalizeText(report.irregularity_complain_category),
        normalizeText(report.area),
        resolveAreaCategory(report),
        resolveReportNarrative(report),
        normalizeText(report.reporter_name),
    ];

    return crypto.createHash('sha256').update(parts.join('|')).digest('hex');
}

/**
 * Mengecek apakah kategori laporan termasuk kategori record baru
 * @param report - Objek laporan parsial
 * @returns true jika kategori adalah Irregularity, Complaint, atau Compliment
 * @example
 * ```ts
 * if (isNewRecordCategory(report)) {
 *   sendNotification(report);
 * }
 * ```
 */
export function isNewRecordCategory(report: Partial<Report>): boolean {
    return ['Irregularity', 'Complaint', 'Compliment'].includes(resolveReportCategory(report));
}
