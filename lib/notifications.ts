
import 'server-only';

import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { buildReportFingerprint, isNewRecordCategory, resolveReportCategory, resolveReportBranch } from '@/lib/report-fingerprint';
import type { Report } from '@/types';

interface NotificationPayload {

    type: 'NEW_REPORT' | 'STATUS_CHANGE' | 'SLA_BREACH' | 'COMMENT';

    reportId: string;

    targetDivision?: string;

    title: string;

    message: string;

    priority?: string;

    slaDeadline?: string;
}

interface EmailMessage {

    entity: string;

    subject: string;

    text: string;

    html?: string;

    recipients: string[];

    fingerprintBase: string;

    payload?: Record<string, unknown>;
}

export type NewRecordNotificationSource = 'internal' | 'public' | 'batch' | 'sheets-sync';

interface TestEmailOptions {

    to: string;

    subject?: string;

    text?: string;

    requestedBy?: string;
}

let emailTransporter: nodemailer.Transporter | null = null;

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

function notificationFrom() {
    const configuredFrom = process.env.NOTIFICATION_FROM_EMAIL?.trim();
    if (configuredFrom) return configuredFrom;

    const smtpUser = process.env.GMAIL_SMTP_USER || process.env.SMTP_USER || '';
    return smtpUser ? `OneKlik <${smtpUser}>` : 'OneKlik <notifications@localhost>';
}

function hashFingerprint(value: string): string {
    return crypto.createHash('sha1').update(value).digest('hex');
}

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

async function sendEmail(message: EmailMessage) {
    const { host, port, secure, user, pass } = smtpConfig();

    if (!user || !pass) {
        console.warn('[NOTIFICATIONS] SMTP credentials missing (GMAIL_SMTP_USER/GMAIL_SMTP_APP_PASSWORD), email notification logged but cannot be sent.');
    } else if (!emailTransporter) {
        console.log('[NOTIFICATIONS] Initializing SMTP transporter for:', host);
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

    if (fromDb.length > 0) {
        console.log(`[NOTIFICATIONS] Found ${fromDb.length} recipients in database for entity: ${entity}`);
        return fromDb;
    }

    const fallbackEmails = (
        process.env.DEFAULT_NOTIFICATION_EMAIL || 
        process.env.GMAIL_SMTP_USER || 
        ''
    ).split(',').map(e => e.trim()).filter(Boolean);

    if (fallbackEmails.length > 0) {
        console.log(`[NOTIFICATIONS] No DB recipients found for ${entity}, falling back to env: ${fallbackEmails.join(', ')}`);
        return fallbackEmails;
    }

    if (entity === 'OSC') {
        const envRecipients = (process.env.OSC_NOTIFICATION_EMAIL || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
        return envRecipients;
    }

    console.warn(`[NOTIFICATIONS] No recipients configured for ${entity} (DB empty and no fallback env found).`);
    return [];
}

function reportBranch(report: Partial<Report>): string {
    return resolveReportBranch(report) || '-';
}

function sourceLabel(source: NewRecordNotificationSource): string {
    switch (source) {
        case 'public':
            return 'Public form';
        case 'batch':
            return 'Batch import';
        case 'sheets-sync':
            return 'Google Sheets sync';
        case 'internal':
        default:
            return 'System input';
    }
}

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

    const severityPrefix = (report.severity || '').toLowerCase() === 'high' ? ' [URGENT]' : '';
    const subject = `[OneClick]${severityPrefix} New record: ${report.title || report.report || 'Untitled'}`;
    const branchName = reportBranch(report);
    const reporter = report.reporter_name || report.reporter_email || '-';
    const severityLabel = report.severity ? String(report.severity).toUpperCase() : '-';

    console.log(`[NOTIFICATIONS] Preparing new record notification for: ${report.title || report.report} (Source: ${source}, Severity: ${severityLabel})`);

    const text = [
        'A new record has been found on OneClick.',
        '',
        `Title: ${report.title || report.report || '-'}`,
        `Category: ${category || '-'}`,
        `Severity: ${severityLabel}`,
        `Branch: ${branchName}`,
        `Reporter: ${reporter}`,
        `Source: ${sourceLabel(source)}`,
        `Sheet: ${report.source_sheet || '-'}`,
        `Sheet ID: ${report.original_id || report.id || '-'}`,
        '',
        '---',
        'Automatic Notification OneClick IRRS'
    ].join('\n');

    const sourceFingerprint = String(report.source_fingerprint || buildReportFingerprint(report));
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
            branch: branchName,
            source_sheet: report.source_sheet || null,
        },
    });
}

export async function notifyReportClosedEmail(report: Partial<Report>) {
    const recipient = String(report.reporter_email || '').trim();
    if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
        console.info('[NOTIFICATIONS] Report closed notification skipped: reporter_email missing/invalid.');
        return;
    }

    const reportId = String(report.id || report.original_id || report.sheet_id || 'unknown');
    const title = report.title || report.report || report.description || 'OneClick Report';
    const closedAt = new Date().toLocaleString('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Jakarta',
    });
    const resolutionNotes = report.action_taken || report.gapura_kps_action_taken || report.preventive_action || report.remarks_gapura_kps || '-';

    const subject = `[OneClick] Report closed: ${title}`;
    const text = [
        'Your report has been closed in OneClick.',
        '',
        `Report ID: ${reportId}`,
        `Title: ${title}`,
        `Status: CLOSED`,
        `Closure Date: ${closedAt}`,
        `Branch: ${reportBranch(report)}`,
        `Flight: ${report.flight_number || '-'}`,
        '',
        'Resolution Summary:',
        String(resolutionNotes),
        '',
        '---',
        'Automatic Notification OneClick IRRS'
    ].join('\n');

    await sendEmail({
        entity: 'IRRS_REPORT_CLOSED',
        recipients: [recipient],
        subject,
        text,
        fingerprintBase: `irrs-report-closed:${reportId}`,
        payload: {
            report_id: report.id || null,
            sheet_id: report.original_id || report.sheet_id || null,
            title,
            status: 'CLOSED',
            branch: reportBranch(report),
        },
    });
}

export async function sendTestEmail(options: TestEmailOptions) {
    const to = String(options.to || '').trim();
    if (!to) {
        throw new Error('Recipient email is required');
    }

    const subject = options.subject || '[OneClick] SMTP Gmail test';
    const text = options.text || [
        'Test email successfully sent from OneClick.',
        '',
        'Transport: Gmail SMTP',
        `Time: ${new Date().toISOString()}`,
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

export async function sendNotification(payload: NotificationPayload): Promise<void> {
    console.info('[NOTIFICATIONS] Generic notification payload:', payload);
}

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
