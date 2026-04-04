/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi utilitas untuk manajemen notifikasi email dan in-app
 */

import 'server-only';

import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { buildReportFingerprint, isNewRecordCategory, resolveReportCategory, resolveReportBranch } from '@/lib/report-fingerprint';
import type { Report } from '@/types';

/**
 * Payload notifikasi generik
 * @interface NotificationPayload
 */
interface NotificationPayload {
    /** Tipe notifikasi */
    type: 'NEW_REPORT' | 'STATUS_CHANGE' | 'SLA_BREACH' | 'COMMENT';
    /** ID laporan */
    reportId: string;
    /** Divisi tujuan (opsional) */
    targetDivision?: string;
    /** Judul notifikasi */
    title: string;
    /** Pesan notifikasi */
    message: string;
    /** Prioritas (opsional) */
    priority?: string;
    /** Deadline SLA (opsional) */
    slaDeadline?: string;
}

/**
 * Pesan email untuk dikirim
 * @interface EmailMessage
 */
interface EmailMessage {
    /** Entity notifikasi */
    entity: string;
    /** Subject email */
    subject: string;
    /** Teks email */
    text: string;
    /** HTML email (opsional) */
    html?: string;
    /** Daftar penerima */
    recipients: string[];
    /** Base fingerprint untuk deduplikasi */
    fingerprintBase: string;
    /** Payload tambahan (opsional) */
    payload?: Record<string, unknown>;
}

/**
 * Sumber notifikasi record baru
 * @typedef NewRecordNotificationSource
 */
export type NewRecordNotificationSource = 'internal' | 'public' | 'batch' | 'sheets-sync';

/**
 * Opsi untuk email test
 * @interface TestEmailOptions
 */
interface TestEmailOptions {
    /** Email penerima */
    to: string;
    /** Subject email (opsional) */
    subject?: string;
    /** Teks email (opsional) */
    text?: string;
    /** User yang meminta (opsional) */
    requestedBy?: string;
}

/** Transporter nodemailer untuk pengiriman email */
let emailTransporter: nodemailer.Transporter | null = null;

/**
 * Mendapatkan konfigurasi SMTP dari environment variables
 * @returns Object konfigurasi SMTP
 */
function smtpConfig() {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT || '465');
    const secure = process.env.SMTP_SECURE
        ? String(process.env.SMTP_SECURE).toLowerCase() === 'true'
        : port === 465;
    const user = process.env.GMAIL_SMTP_USER || process.env.SMTP_USER || '';
    const pass = process.env.GMAIL_SMTP_APP_PASSWORD || process.env.SMTP_PASS || '';

    return { host, port, secure, user, pass };
}

/**
 * Mendapatkan email pengirim notifikasi
 * @returns Email pengirim dari konfigurasi atau default
 */
function notificationFrom() {
    const configuredFrom = process.env.NOTIFICATION_FROM_EMAIL?.trim();
    if (configuredFrom) return configuredFrom;

    const smtpUser = process.env.GMAIL_SMTP_USER || process.env.SMTP_USER || '';
    return smtpUser ? `OneKlik <${smtpUser}>` : 'OneKlik <notifications@localhost>';
}

/**
 * Membuat hash dari fingerprint untuk deduplikasi
 * @param value - Nilai untuk di-hash
 * @returns Hash SHA1 dalam bentuk hex string
 */
function hashFingerprint(value: string): string {
    return crypto.createHash('sha1').update(value).digest('hex');
}

/**
 * Mencadangkan slot pengiriman notifikasi untuk mencegah duplikasi
 * @param fingerprint - Fingerprint unik
 * @param entity - Entity notifikasi
 * @param recipientEmail - Email penerima
 * @param subject - Subject email
 * @param payload - Payload tambahan
 * @returns true jika slot berhasil dicadangkan, false jika sudah ada
 * @throws Error jika terjadi error database
 */
async function reserveDelivery(
    fingerprint: string,
    entity: string,
    recipientEmail: string,
    subject: string,
    payload: Record<string, unknown>
) {
    const { error } = await supabaseAdmin
        .from('notification_delivery_log')
        .insert({
            fingerprint,
            entity,
            channel: 'EMAIL',
            recipient_email: recipientEmail,
            subject,
            payload,
            status: 'pending',
        });

    if (!error) return true;
    if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === '23505'
    ) {
        return false;
    }

    console.warn('[NOTIFICATIONS] Failed to reserve delivery fingerprint, continuing without strict dedupe:', error);
    return true;
}

/**
 * Finalisasi status pengiriman notifikasi
 * @param fingerprint - Fingerprint notifikasi
 * @param status - Status pengiriman ('sent', 'skipped', atau 'failed')
 * @param errorMessage - Pesan error (opsional)
 * @returns Promise yang resolve setelah update berhasil
 */
async function finalizeDelivery(
    fingerprint: string,
    status: 'sent' | 'skipped' | 'failed',
    errorMessage?: string
) {
    const updates: Record<string, unknown> = {
        status,
        sent_at: new Date().toISOString(),
    };
    if (errorMessage) updates.error_message = errorMessage;

    const { error } = await supabaseAdmin
        .from('notification_delivery_log')
        .update(updates)
        .eq('fingerprint', fingerprint);

    if (error) {
        console.warn('[NOTIFICATIONS] Failed to finalize delivery log:', error);
    }
}

/**
 * Mengirim email dengan deduplikasi dan logging
 * @param message - Pesan email yang akan dikirim
 * @returns Promise yang resolve setelah email diproses
 * @throws Error jika terjadi error pengiriman
 */
async function sendEmail(message: EmailMessage) {
    const { host, port, secure, user, pass } = smtpConfig();

    if (!user || !pass) {
        console.info('[NOTIFICATIONS] SMTP credentials missing, email notification logged but not sent.');
    } else if (!emailTransporter) {
        emailTransporter = nodemailer.createTransport({
            host,
            port,
            secure,
            auth: {
                user,
                pass,
            },
        });
    }

    for (const recipient of message.recipients) {
        const fingerprint = hashFingerprint(`${message.fingerprintBase}:${recipient}`);
        const reserved = await reserveDelivery(
            fingerprint,
            message.entity,
            recipient,
            message.subject,
            message.payload || {}
        );

        if (!reserved) continue;

        try {
            if (!user || !pass || !emailTransporter) {
                await finalizeDelivery(fingerprint, 'skipped', 'SMTP credentials are missing');
                continue;
            }

            await emailTransporter.sendMail({
                from: notificationFrom(),
                to: recipient,
                subject: message.subject,
                text: message.text,
                html: message.html,
            });

            await finalizeDelivery(fingerprint, 'sent');
        } catch (error) {
            console.error('[NOTIFICATIONS] Email send failed:', error);
            await finalizeDelivery(
                fingerprint,
                'failed',
                error instanceof Error ? error.message : 'Unknown send error'
            );
        }
    }
}

/**
 * Mendapatkan daftar penerima notifikasi untuk entity tertentu
 * @param entity - Entity notifikasi
 * @returns Promise yang berisi array email penerima
 */
async function getNotificationRecipients(entity: string): Promise<string[]> {
    const { data, error } = await supabaseAdmin
        .from('notification_recipients')
        .select('recipient_email')
        .eq('entity', entity)
        .eq('channel', 'EMAIL')
        .eq('enabled', true);

    if (error) {
        console.warn('[NOTIFICATIONS] Failed to read notification recipients:', error);
    }

    const fromDb = ((data || []) as Array<{ recipient_email?: string | null }>)
        .map((item) => String(item.recipient_email || '').trim())
        .filter(Boolean);

    if (fromDb.length > 0) return fromDb;

    if (entity === 'OSC') {
        const envRecipients = (process.env.OSC_NOTIFICATION_EMAIL || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
        return envRecipients;
    }

    return [];
}

/**
 * Mendapatkan nama cabang dari laporan
 * @param report - Objek laporan parsial
 * @returns Nama cabang atau '-'
 */
function reportBranch(report: Partial<Report>): string {
    return resolveReportBranch(report) || '-';
}

/**
 * Mendapatkan label sumber notifikasi
 * @param source - Sumber notifikasi
 * @returns Label sumber dalam Bahasa Indonesia
 */
function sourceLabel(source: NewRecordNotificationSource): string {
    switch (source) {
        case 'public':
            return 'Form public';
        case 'batch':
            return 'Batch import';
        case 'sheets-sync':
            return 'Sync Google Sheets';
        case 'internal':
        default:
            return 'Input sistem';
    }
}

/**
 * Mengirim notifikasi email untuk record baru
 * @param report - Data laporan parsial
 * @param source - Sumber notifikasi
 * @returns Promise yang resolve setelah notifikasi diproses
 * @example
 * ```ts
 * await notifyNewRecordEmail(report, 'public');
 * ```
 */
export async function notifyNewRecordEmail(
    report: Partial<Report>,
    source: NewRecordNotificationSource
) {
    const category = resolveReportCategory(report);
    if (!isNewRecordCategory(report)) {
        return;
    }

    const recipients = await getNotificationRecipients('IRRS_NEW_RECORD');
    if (recipients.length === 0) {
        console.info('[NOTIFICATIONS] IRRS_NEW_RECORD notification skipped because no recipients are configured.');
        return;
    }

    const sourceFingerprint = String(report.source_fingerprint || buildReportFingerprint(report));
    const subject = `[OneClick] Record baru: ${report.title || report.report || 'Tanpa Judul'}`;
    const text = [
        'Terdapat record baru pada OneClick.',
        '',
        `Judul: ${report.title || report.report || '-'}`,
        `Kategori: ${category || '-'}`,
        `Cabang: ${reportBranch(report)}`,
        `Pelapor: ${report.reporter_name || report.reporter_email || '-'}`,
        `Sumber: ${sourceLabel(source)}`,
        `Sheet: ${report.source_sheet || '-'}`,
        `Sheet ID: ${report.original_id || report.id || '-'}`,
    ].join('\n');

    await sendEmail({
        entity: 'IRRS_NEW_RECORD',
        recipients,
        subject,
        text,
        fingerprintBase: `irrs-new-record:${sourceFingerprint}`,
        payload: {
            source,
            report_id: report.id || report.original_id || null,
            sheet_id: report.original_id || report.id || null,
            source_fingerprint: sourceFingerprint,
            title: report.title || report.report || null,
            category,
            branch: reportBranch(report),
            source_sheet: report.source_sheet || null,
        },
    });
}

/**
 * Mengirim email test untuk verifikasi konfigurasi SMTP
 * @param options - Opsi email test
 * @param options.to - Email penerima
 * @param options.subject - Subject email (opsional)
 * @param options.text - Teks email (opsional)
 * @param options.requestedBy - User yang meminta (opsional)
 * @returns Promise yang resolve setelah email dikirim
 * @throws Error jika email penerima tidak valid
 * @example
 * ```ts
 * await sendTestEmail({ to: 'test@example.com', subject: 'Test Email' });
 * ```
 */
export async function sendTestEmail(options: TestEmailOptions) {
    const to = String(options.to || '').trim();
    if (!to) {
        throw new Error('Recipient email is required');
    }

    const subject = options.subject || '[OneClick] SMTP Gmail test';
    const text = options.text || [
        'Email test berhasil dikirim dari OneClick.',
        '',
        'Transport: Gmail SMTP',
        `Waktu: ${new Date().toISOString()}`,
        `Requested By: ${options.requestedBy || '-'}`,
    ].join('\n');

    await sendEmail({
        entity: 'IRRS_TEST_EMAIL',
        recipients: [to],
        subject,
        text,
        fingerprintBase: `irrs-test-email:${to}:${Date.now()}`,
        payload: {
            type: 'smtp-test',
            requested_by: options.requestedBy || null,
        },
    });
}

/**
 * Backward-compatible placeholder for generic in-app notifications.
 */
/**
 * Placeholder untuk notifikasi in-app generik
 * @param payload - Payload notifikasi
 * @returns Promise yang resolve setelah notifikasi diproses
 * @example
 * ```ts
 * await sendNotification({
 *   type: 'NEW_REPORT',
 *   reportId: '123',
 *   title: 'Laporan Baru',
 *   message: 'Laporan baru telah dibuat'
 * });
 * ```
 */
export async function sendNotification(payload: NotificationPayload): Promise<void> {
    console.info('[NOTIFICATIONS] Generic notification payload:', payload);
}

/**
 * Mengirim notifikasi untuk laporan baru
 * @param reportId - ID laporan
 * @param targetDivision - Divisi tujuan
 * @param title - Judul laporan
 * @param priority - Prioritas laporan
 * @param slaDeadline - Deadline SLA
 * @returns Promise yang resolve setelah notifikasi diproses
 * @example
 * ```ts
 * await notifyNewReport('123', 'OS', 'Report Title', 'high', '2024-12-31');
 * ```
 */
export async function notifyNewReport(
    reportId: string,
    targetDivision: string,
    title: string,
    priority: string,
    slaDeadline: string
): Promise<void> {
    await sendNotification({
        type: 'NEW_REPORT',
        reportId,
        targetDivision,
        title,
        message: `Laporan baru masuk untuk divisi ${targetDivision}`,
        priority,
        slaDeadline,
    });
}

/**
 * Mengirim notifikasi untuk pelanggaran SLA
 * @param reportId - ID laporan
 * @param title - Judul laporan
 * @param hoursOverdue - Jumlah jam keterlambatan
 * @returns Promise yang resolve setelah notifikasi diproses
 * @example
 * ```ts
 * await notifySLABreach('123', 'Report Title', 24);
 * ```
 */
export async function notifySLABreach(
    reportId: string,
    title: string,
    hoursOverdue: number
): Promise<void> {
    await sendNotification({
        type: 'SLA_BREACH',
        reportId,
        title,
        message: `SLA terlewati ${hoursOverdue} jam untuk laporan: ${title}`,
    });
}

/**
 * Mengirim notifikasi untuk perubahan status laporan
 * @param reportId - ID laporan
 * @param title - Judul laporan
 * @param oldStatus - Status lama
 * @param newStatus - Status baru
 * @returns Promise yang resolve setelah notifikasi diproses
 * @example
 * ```ts
 * await notifyStatusChange('123', 'Report Title', 'OPEN', 'IN_PROGRESS');
 * ```
 */
export async function notifyStatusChange(
    reportId: string,
    title: string,
    oldStatus: string,
    newStatus: string
): Promise<void> {
    await sendNotification({
        type: 'STATUS_CHANGE',
        reportId,
        title,
        message: `Status berubah dari ${oldStatus} ke ${newStatus}`,
    });
}
