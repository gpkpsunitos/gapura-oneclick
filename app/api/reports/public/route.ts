import { NextResponse } from 'next/server';
import { reportsService } from '@/lib/services/reports-service';
import { notifyNewRecordEmail } from '@/lib/notifications';
import { persistReportMetadata } from '@/lib/report-persistence';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.reporter_email || '').trim();
    const title = String(body.title || '').trim();
    const description = String(body.description || '').trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email tidak valid' }, { status: 400 });
    }
    if (!title || !description) {
      return NextResponse.json({ error: 'Judul dan deskripsi wajib diisi' }, { status: 400 });
    }

    const {
      station_id,
      station_code,
      hub,
      jenis_maskapai,
      route,
      delay_code,
      delay_duration,
      area,
      incident_type_id,
      terminal_area_category,
      apron_area_category,
      general_category,
      week_in_month,
      form_submitted_at,
      form_completed_at,
      evidence_url,
      evidence_urls,
      severity,
    } = body;

    const reportData: any = {
      reporter_email: email,
      reporter_name: body.reporter_name || email,
      title,
      description,
      location: body.location || '',
      airlines: body.airline || body.airlines || '',
      flight_number: body.flight_number || '',
      date_of_event: body.date_of_event || body.incident_date || '',
      area: area || '',
      category: body.main_category || 'Irregularity',
      irregularity_complain_category: incident_type_id || body.main_category || 'Irregularity',
      evidence_url: evidence_url || (Array.isArray(evidence_urls) && evidence_urls[0]) || '',
      evidence_urls: Array.isArray(evidence_urls) ? evidence_urls : (evidence_url ? [evidence_url] : []),
      severity: severity || 'low',
      status: 'OPEN',
      created_at: new Date().toISOString(),
      // CSV-aligned / derived fields
      station_id: station_id || null,
      station_code: station_code || station_id || null,
      hub: hub || null,
      jenis_maskapai: jenis_maskapai || null,
      route: route || null,
      delay_code: delay_code || null,
      delay_duration: delay_duration || null,
      incident_type_id: incident_type_id || null,
      terminal_area_category: terminal_area_category || null,
      apron_area_category: apron_area_category || null,
      general_category: general_category || null,
      week_in_month: week_in_month || null,
      report: body.report || description,
      reporting_branch: body.reporting_branch || station_code || station_id || null,
      form_submitted_at: form_submitted_at || new Date().toISOString(),
      form_completed_at: form_completed_at || new Date().toISOString(),
    };

    const newReport = await reportsService.createReport(reportData);

    await persistReportMetadata(newReport).catch((persistError) => {
      console.warn('[Public Report] Metadata persistence failed (non-blocking):', persistError);
    });

    await notifyNewRecordEmail(newReport, 'public').catch((notificationError) => {
      console.warn('[Public Report] New-record notification failed:', notificationError);
    });

    return NextResponse.json({ success: true, message: 'Laporan berhasil dikirim', data: newReport }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal mengirim laporan' }, { status: 500 });
  }
}
