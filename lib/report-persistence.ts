import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { buildReportFingerprint, resolveReportCategory } from '@/lib/report-fingerprint';
import type { Report } from '@/types';

function toIsoOrNow(value: unknown): string {
    if (typeof value === 'string' && value.trim()) {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
    }

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString();
    }

    return new Date().toISOString();
}

export function resolveReportSheetId(report: Partial<Report>): string | null {
    const sheetId = report.sheet_id || report.original_id || report.id;
    if (!sheetId) return null;

    const trimmed = String(sheetId).trim();
    return trimmed || null;
}

export function resolveReportSourceFingerprint(report: Partial<Report>): string {
    return String(report.source_fingerprint || buildReportFingerprint(report));
}

export function buildReportsSyncRow(report: Partial<Report>): Record<string, any> {
    const sheetId = resolveReportSheetId(report);
    if (!sheetId) {
        throw new Error('Cannot build reports_sync row without sheet_id/original_id');
    }

    const createdAt = toIsoOrNow(report.created_at);
    const updatedAt = toIsoOrNow(report.updated_at);
    const normalizedCategory = resolveReportCategory(report);

    return {
        sheet_id: sheetId,
        user_id: report.user_id || null,
        title: report.title || report.report || '(Tanpa Judul)',
        description: report.description || report.report || null,
        location: report.location || null,
        reporter_email: report.reporter_email || null,
        evidence_url: report.evidence_url || null,
        evidence_urls: report.evidence_urls || (report.evidence_url ? [report.evidence_url] : null),
        status: report.status || 'OPEN',
        severity: report.severity || 'low',
        priority: report.priority || 'medium',

        flight_number: report.flight_number || null,
        aircraft_reg: report.aircraft_reg || null,
        is_flight_related: report.is_flight_related || false,

        gse_number: report.gse_number || null,
        gse_name: report.gse_name || null,
        is_gse_related: report.is_gse_related || false,

        station_id: report.station_id || null,
        unit_id: report.unit_id || null,
        location_id: report.location_id || null,
        incident_type_id: report.incident_type_id || null,
        category: report.category || normalizedCategory || null,
        main_category: report.main_category || normalizedCategory || null,

        investigator_notes: report.investigator_notes || null,
        manager_notes: report.manager_notes || null,
        partner_response_notes: report.partner_response_notes || null,
        validation_notes: report.validation_notes || null,
        partner_evidence_urls: report.partner_evidence_urls || null,

        source_sheet: report.source_sheet || null,
        source_fingerprint: resolveReportSourceFingerprint(report),
        original_id: report.original_id || sheetId,
        row_number: report.row_number || null,

        created_at: createdAt,
        updated_at: updatedAt,
        resolved_at: report.resolved_at || null,
        sla_deadline: report.sla_deadline || null,
        incident_date: report.incident_date || report.date_of_event || null,
        date_of_event: report.date_of_event || report.incident_date || null,

        reporting_branch: report.reporting_branch || null,
        hub: report.hub || null,
        route: report.route || null,
        branch: report.branch || report.reporting_branch || report.station_code || null,
        station_code: report.station_code || null,
        reporter_name: report.reporter_name || null,

        specific_location: report.specific_location || null,
        airlines: report.airlines || report.airline || null,
        airline: report.airline || report.airlines || null,
        jenis_maskapai: report.jenis_maskapai || null,
        reference_number: report.reference_number || null,
        root_caused: report.root_caused || report.root_cause || null,
        root_cause: report.root_cause || report.root_caused || null,
        action_taken: report.action_taken || null,
        immediate_action: report.immediate_action || null,
        kps_remarks: report.kps_remarks || null,
        gapura_kps_action_taken: report.gapura_kps_action_taken || null,
        preventive_action: report.preventive_action || null,
        remarks_gapura_kps: report.remarks_gapura_kps || null,
        area: report.area || null,
        terminal_area_category: report.terminal_area_category || null,
        apron_area_category: report.apron_area_category || null,
        general_category: report.general_category || null,
        week_in_month: report.week_in_month || null,
        report: report.report || report.description || null,
        irregularity_complain_category: report.irregularity_complain_category || null,
        kode_cabang: report.kode_cabang || null,
        kode_hub: report.kode_hub || null,
        maskapai_lookup: report.maskapai_lookup || null,
        case_classification: report.case_classification || null,
        lokal_mpa_lookup: report.lokal_mpa_lookup || null,

        delay_code: report.delay_code || null,
        delay_duration: report.delay_duration || null,

        primary_tag: report.primary_tag || null,
        sub_category_note: report.sub_category_note || null,
        target_division: report.target_division || null,

        synced_at: new Date().toISOString(),
        sync_version: 1,
    };
}

export function buildLegacyReportRow(
    report: Partial<Report>,
    options?: { userId?: string | null }
): Record<string, any> {
    const sheetId = resolveReportSheetId(report);
    const normalizedCategory = resolveReportCategory(report);
    const userId = report.user_id || options?.userId || null;

    return {
        ...(userId ? { user_id: userId } : {}),
        sheet_id: sheetId,
        source_fingerprint: resolveReportSourceFingerprint(report),
        title: report.title || report.report || null,
        description: report.description || report.report || null,
        reporter_name: report.reporter_name || null,
        status: report.status || 'OPEN',
        severity: report.severity || 'low',
        priority: report.priority || null,
        location: report.location || null,
        flight_number: report.flight_number || null,
        aircraft_reg: report.aircraft_reg || null,
        date_of_event: report.date_of_event || report.incident_date || null,
        station_id: report.station_id || report.station_code || report.reporting_branch || report.branch || null,
        incident_type_id: report.incident_type_id || null,
        category: report.category || normalizedCategory || null,
        action_taken: report.action_taken || null,
        root_caused: report.root_caused || report.root_cause || null,
        delay_code: report.delay_code || null,
        delay_duration: report.delay_duration || null,
        evidence_urls: report.evidence_urls || (report.evidence_url ? [report.evidence_url] : null),
        primary_tag: report.primary_tag || null,
        target_division: report.target_division || null,
        remarks_gapura_kps: report.remarks_gapura_kps || null,
        created_at: toIsoOrNow(report.created_at),
        updated_at: toIsoOrNow(report.updated_at),
    };
}

async function upsertLegacyReportRow(payload: Record<string, any>) {
    const sheetId = payload.sheet_id;
    if (!sheetId) return;

    const updatePayload = {
        ...payload,
        updated_at: new Date().toISOString(),
    };

    try {
        const { data: updatedRows, error: updateError } = await supabaseAdmin
            .from('reports')
            .update(updatePayload)
            .eq('sheet_id', sheetId)
            .select('id');

        if (updateError) {
            throw updateError;
        }

        if (updatedRows && updatedRows.length > 0) {
            return;
        }

        const { error: insertError } = await supabaseAdmin
            .from('reports')
            .insert(payload);

        if (insertError) {
            throw insertError;
        }
    } catch (error) {
        console.warn('[ReportPersistence] Legacy reports upsert failed (non-blocking):', error);
    }
}

async function upsertReportsSyncRow(payload: Record<string, any>) {
    try {
        const { error } = await supabaseAdmin
            .from('reports_sync')
            .upsert(payload, {
                onConflict: 'sheet_id',
                ignoreDuplicates: false,
            });

        if (error) {
            throw error;
        }
    } catch (error) {
        console.warn('[ReportPersistence] reports_sync upsert failed (non-blocking):', error);
    }
}

export async function persistReportMetadata(
    report: Partial<Report>,
    options?: { userId?: string | null }
) {
    const legacyRow = buildLegacyReportRow(report, options);
    const syncRow = buildReportsSyncRow(report);

    await Promise.all([
        upsertLegacyReportRow(legacyRow),
        upsertReportsSyncRow(syncRow),
    ]);
}
