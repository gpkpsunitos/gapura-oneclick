/**
 * Google Apps Script - Near Real-Time Sync Trigger
 *
 * Sends change notifications to the Vercel webhook only when a user edits
 * report rows in the target sheets. It intentionally does not install an
 * every-minute scheduled poll because that burns Vercel Fluid CPU.
 *
 * SETUP:
 * 1. Open target Google Sheet -> Extensions -> Apps Script
 * 2. Paste this file into Code.gs
 * 3. Set Script Properties:
 *    - WEBHOOK_URL    = https://<your-vercel-domain>/api/integrations/google-sheets/webhook
 *    - WEBHOOK_SECRET = <same value as GOOGLE_SHEETS_WEBHOOK_SECRET in Vercel>
 * 4. Run setupTriggers() once
 * 5. Edit a row in "NON CARGO" or "CGO", then check Vercel function logs
 */

const TARGET_SHEETS = ['NON CARGO', 'CGO'];
const MIN_NON_EMPTY_CELLS = 4;
const DEBOUNCE_MS = 15000;
const MAX_RETRY_COUNT = 3;

const EDIT_HANDLER = 'onSheetEdit';
const FLUSH_HANDLER = 'flushPendingWebhook';
const LEGACY_SCHEDULED_HANDLER = 'scheduledSync';

const PENDING_EVENT_KEY = 'IRRS_PENDING_WEBHOOK_EVENT';
const LAST_SENT_PREFIX = 'IRRS_LAST_SENT_SIGNATURE';
const TRIGGER_HANDLERS = [EDIT_HANDLER, FLUSH_HANDLER, LEGACY_SCHEDULED_HANDLER];

function setupTriggers() {
  removeTriggers();

  ScriptApp.newTrigger(EDIT_HANDLER)
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit()
    .create();

  console.log('[SETUP] Installed onSheetEdit trigger only. Scheduled polling is disabled.');
  verifyProperties_();
}

function installIrrsWebhookTriggers() {
  setupTriggers();
}

function removeTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function (trigger) {
    if (TRIGGER_HANDLERS.indexOf(trigger.getHandlerFunction()) !== -1) {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  console.log('[CLEANUP] Removed IRRS edit/flush/legacy scheduled triggers.');
}

function onSheetEdit(e) {
  if (!e || !e.range) return;

  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(5000)) return;

  try {
    const payload = buildPayloadFromEdit_(e);
    if (!payload) return;

    const props = PropertiesService.getDocumentProperties();
    const lastSignature = props.getProperty(lastSentKey_(payload.sheetId, payload.rowNumber));
    if (lastSignature === payload.rowSignature) {
      console.log('[SYNC] Skipped duplicate row signature for ' + payload.sheetName + ' row ' + payload.rowNumber);
      return;
    }

    props.setProperty(PENDING_EVENT_KEY, JSON.stringify(payload));
    scheduleFlush_();
  } finally {
    lock.releaseLock();
  }
}

function flushPendingWebhook() {
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(5000)) return;

  try {
    deleteTriggersByHandler_(FLUSH_HANDLER);

    const props = PropertiesService.getDocumentProperties();
    const rawPayload = props.getProperty(PENDING_EVENT_KEY);
    if (!rawPayload) return;

    const payload = JSON.parse(rawPayload);
    const response = postWebhook_(payload);
    const statusCode = response.getResponseCode();

    if (statusCode >= 200 && statusCode < 300) {
      props.deleteProperty(PENDING_EVENT_KEY);
      props.setProperty(lastSentKey_(payload.sheetId, payload.rowNumber), payload.rowSignature);
      console.log('[SYNC] Webhook dispatched - ' + statusCode + ' - ' + payload.sheetName + ' row ' + payload.rowNumber);
      return;
    }

    console.error('[SYNC] Webhook failed - ' + statusCode + ' - ' + response.getContentText().substring(0, 200));
    retryPendingPayload_(props, payload);
  } catch (err) {
    console.error('[SYNC] Flush failed: ' + getErrorMessage_(err));
    const props = PropertiesService.getDocumentProperties();
    const rawPayload = props.getProperty(PENDING_EVENT_KEY);
    if (rawPayload) {
      retryPendingPayload_(props, JSON.parse(rawPayload));
    }
  } finally {
    lock.releaseLock();
  }
}

function scheduledSync() {
  deleteTriggersByHandler_(LEGACY_SCHEDULED_HANDLER);
  console.log('[SYNC] Legacy scheduledSync trigger removed. Scheduled polling is disabled.');
}

function testWebhook() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const range = sheet.getActiveRange();

  if (!range) {
    throw new Error('Select a report row first.');
  }

  const payload = buildPayloadFromEdit_({ range: range });
  if (!payload) {
    throw new Error('Selected row is not eligible for sync.');
  }

  payload.triggerType = 'manual_test';
  payload.editedAt = new Date().toISOString();

  const response = postWebhook_(payload);

  console.log('[TEST] Webhook response - ' + response.getResponseCode() + ' - ' + response.getContentText().substring(0, 200));
}

function buildPayloadFromEdit_(e) {
  const range = e.range;
  const sheet = range.getSheet();
  const sheetName = sheet.getName();
  const rowNumber = range.getRow();

  if (TARGET_SHEETS.indexOf(sheetName) === -1) return null;
  if (rowNumber < 2) return null;

  const rowValues = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getDisplayValues()[0] || [];
  if (countNonEmptyCells_(rowValues) < MIN_NON_EMPTY_CELLS) return null;

  return {
    triggerType: 'onEdit',
    sheetId: sheet.getSheetId(),
    sheetName: sheetName,
    rowNumber: rowNumber,
    rowSignature: buildRowSignature_(sheet, rowNumber, rowValues),
    editedRange: range.getA1Notation(),
    editedAt: new Date().toISOString(),
    nonEmptyCellCount: countNonEmptyCells_(rowValues),
    spreadsheetId: SpreadsheetApp.getActiveSpreadsheet().getId(),
  };
}

function postWebhook_(payload) {
  const props = PropertiesService.getScriptProperties();
  const url = props.getProperty('WEBHOOK_URL');
  const secret = props.getProperty('WEBHOOK_SECRET');

  if (!url || !secret) {
    throw new Error('Missing WEBHOOK_URL or WEBHOOK_SECRET in Script Properties');
  }

  return UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    followRedirects: true,
    headers: {
      'x-irrs-webhook-secret': secret,
    },
    payload: JSON.stringify(payload),
  });
}

function scheduleFlush_() {
  const hasFlushTrigger = ScriptApp.getProjectTriggers().some(function (trigger) {
    return trigger.getHandlerFunction() === FLUSH_HANDLER;
  });

  if (hasFlushTrigger) return;

  ScriptApp.newTrigger(FLUSH_HANDLER)
    .timeBased()
    .after(DEBOUNCE_MS)
    .create();

  console.log('[SYNC] Webhook flush scheduled in ' + Math.round(DEBOUNCE_MS / 1000) + 's.');
}

function retryPendingPayload_(props, payload) {
  const retryCount = Number(payload.retryCount || 0) + 1;

  if (retryCount >= MAX_RETRY_COUNT) {
    props.deleteProperty(PENDING_EVENT_KEY);
    console.error('[SYNC] Webhook delivery abandoned after ' + retryCount + ' attempts.');
    return;
  }

  payload.retryCount = retryCount;
  props.setProperty(PENDING_EVENT_KEY, JSON.stringify(payload));
  console.log('[SYNC] Retrying webhook delivery, attempt ' + (retryCount + 1) + ' of ' + MAX_RETRY_COUNT + '.');
  scheduleFlush_();
}

function deleteTriggersByHandler_(handlerName) {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === handlerName) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function verifyProperties_() {
  const props = PropertiesService.getScriptProperties();
  const url = props.getProperty('WEBHOOK_URL');
  const secret = props.getProperty('WEBHOOK_SECRET');

  if (!url) console.warn('[SETUP] WEBHOOK_URL is not set in Script Properties.');
  if (!secret) console.warn('[SETUP] WEBHOOK_SECRET is not set in Script Properties.');
  if (url && secret) console.log('[SETUP] Script Properties configured.');
}

function buildRowSignature_(sheet, rowNumber, rowValues) {
  return Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      [sheet.getSheetId(), rowNumber, rowValues.join('|')].join(':')
    )
  );
}

function lastSentKey_(sheetId, rowNumber) {
  return [LAST_SENT_PREFIX, sheetId, rowNumber].join(':');
}

function countNonEmptyCells_(rowValues) {
  return rowValues.filter(function (value) {
    return String(value || '').trim() !== '';
  }).length;
}

function getErrorMessage_(err) {
  return err && err.message ? err.message : String(err);
}
