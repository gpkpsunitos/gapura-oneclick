/**
 * SETUP:
 * 1. Extensions -> Apps Script -> Project Settings -> Script Properties, add:
 *      WEBHOOK_URL    = https://<your-vercel-domain>/api/integrations/google-sheets/webhook
 *      WEBHOOK_SECRET = <same value as GOOGLE_SHEETS_WEBHOOK_SECRET in Vercel>
 * 2. Run installIrrsWebhookTriggers() once (also removes any legacy triggers).
 * 3. Edit a row in "NON CARGO" or "CGO" and check Vercel function logs.
 */
const IRRS_TARGET_SHEETS = ['NON CARGO', 'CGO'];
const IRRS_MIN_NON_EMPTY_CELLS = 4;
const IRRS_DEBOUNCE_MS = 15000;
const IRRS_QUEUE_KEY = 'irrs_google_sheets_webhook_queue_v1';
const IRRS_LAST_SENT_PREFIX = 'irrs_google_sheets_last_sent_v1';
const IRRS_FLUSH_HANDLER = 'irrsFlushPendingWebhookQueue';
const IRRS_EDIT_HANDLER = 'irrsOnEditInstalled';
const IRRS_LEGACY_HANDLERS = ['onSheetEdit', 'scheduledSync'];

function installIrrsWebhookTriggers() {
  const spreadsheet = SpreadsheetApp.getActive();
  const triggers = ScriptApp.getProjectTriggers();

  triggers.forEach((trigger) => {
    const handler = trigger.getHandlerFunction();
    if (
      handler === IRRS_EDIT_HANDLER ||
      handler === IRRS_FLUSH_HANDLER ||
      IRRS_LEGACY_HANDLERS.indexOf(handler) !== -1
    ) {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger(IRRS_EDIT_HANDLER)
    .forSpreadsheet(spreadsheet)
    .onEdit()
    .create();

  irrsVerifyWebhookConfig_();
}

function irrsOnEditInstalled(e) {
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(5000)) return;

  try {
    irrsQueueWebhookEvent_(e);
  } finally {
    lock.releaseLock();
  }
}

function irrsFlushPendingWebhookQueue() {
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(5000)) return;

  try {
    const properties = PropertiesService.getDocumentProperties();
    const queue = irrsReadQueue_(properties);
    const pendingKeys = Object.keys(queue);

    if (pendingKeys.length === 0) {
      irrsDeleteFlushTriggers_();
      return;
    }

    const nextQueue = {};

    pendingKeys.forEach((key) => {
      const payload = queue[key];
      if (!payload) return;

      const response = irrsPostWebhook_(payload);
      const statusCode = response.getResponseCode();

      if (statusCode >= 200 && statusCode < 300) {
        properties.setProperty(
          irrsLastSentKey_(payload.sheetId, payload.rowNumber),
          String(payload.rowSignature || '')
        );
        return;
      }

      nextQueue[key] = payload;
      Logger.log('[IRRS_WEBHOOK] Failed to deliver payload: %s %s', statusCode, response.getContentText());
    });

    if (Object.keys(nextQueue).length === 0) {
      properties.deleteProperty(IRRS_QUEUE_KEY);
      irrsDeleteFlushTriggers_();
      return;
    }

    properties.setProperty(IRRS_QUEUE_KEY, JSON.stringify(nextQueue));
    irrsDeleteFlushTriggers_();
    irrsScheduleFlushIfNeeded_();
  } finally {
    lock.releaseLock();
  }
}

function testIrrsWebhookForActiveRow() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const range = sheet.getActiveRange();
  if (!range) {
    throw new Error('Select a row first.');
  }

  irrsQueueWebhookEvent_({ range: range });
  irrsFlushPendingWebhookQueue();
}

function irrsQueueWebhookEvent_(e) {
  const range = e && e.range ? e.range : null;
  if (!range) return;

  const sheet = range.getSheet();
  const sheetName = sheet.getName();
  const rowNumber = range.getRow();

  if (IRRS_TARGET_SHEETS.indexOf(sheetName) === -1) return;
  if (rowNumber < 2) return;

  const rowValues = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getDisplayValues()[0] || [];
  if (irrsCountNonEmptyCells_(rowValues) < IRRS_MIN_NON_EMPTY_CELLS) return;

  const rowSignature = irrsBuildRowSignature_(sheet, rowNumber, rowValues);
  const properties = PropertiesService.getDocumentProperties();
  const lastSentSignature = properties.getProperty(irrsLastSentKey_(sheet.getSheetId(), rowNumber));

  if (lastSentSignature === rowSignature) return;

  const queue = irrsReadQueue_(properties);
  const queueKey = irrsQueueRowKey_(sheet.getSheetId(), rowNumber);

  queue[queueKey] = {
    triggerType: 'ON_EDIT',
    sheetId: sheet.getSheetId(),
    sheetName: sheetName,
    rowNumber: rowNumber,
    rowSignature: rowSignature,
    editedRange: range.getA1Notation(),
    editedAt: new Date().toISOString(),
    nonEmptyCellCount: irrsCountNonEmptyCells_(rowValues),
  };

  properties.setProperty(IRRS_QUEUE_KEY, JSON.stringify(queue));
  irrsScheduleFlushIfNeeded_();
}

function irrsScheduleFlushIfNeeded_() {
  const hasTrigger = ScriptApp.getProjectTriggers().some((trigger) => {
    return trigger.getHandlerFunction() === IRRS_FLUSH_HANDLER;
  });

  if (hasTrigger) return;

  ScriptApp.newTrigger(IRRS_FLUSH_HANDLER)
    .timeBased()
    .after(IRRS_DEBOUNCE_MS)
    .create();
}

function irrsDeleteFlushTriggers_() {
  ScriptApp.getProjectTriggers().forEach((trigger) => {
    if (trigger.getHandlerFunction() === IRRS_FLUSH_HANDLER) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function irrsPostWebhook_(payload) {
  const config = irrsGetWebhookConfig_();
  return UrlFetchApp.fetch(config.url, {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    headers: {
      'X-IRRS-Webhook-Secret': config.secret,
    },
    payload: JSON.stringify(payload),
  });
}

function irrsGetWebhookConfig_() {
  const props = PropertiesService.getScriptProperties();
  const url = props.getProperty('WEBHOOK_URL');
  const secret = props.getProperty('WEBHOOK_SECRET');

  if (!url || !secret) {
    throw new Error('Missing WEBHOOK_URL or WEBHOOK_SECRET in Script Properties (Project Settings -> Script Properties).');
  }

  return { url: url, secret: secret };
}

function irrsVerifyWebhookConfig_() {
  const props = PropertiesService.getScriptProperties();
  const url = props.getProperty('WEBHOOK_URL');
  const secret = props.getProperty('WEBHOOK_SECRET');

  if (!url) Logger.log('[IRRS_WEBHOOK] WARNING: WEBHOOK_URL is not set in Script Properties.');
  if (!secret) Logger.log('[IRRS_WEBHOOK] WARNING: WEBHOOK_SECRET is not set in Script Properties.');
  if (url && secret) Logger.log('[IRRS_WEBHOOK] Script Properties configured.');
}

function irrsReadQueue_(properties) {
  const raw = properties.getProperty(IRRS_QUEUE_KEY);
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch (error) {
    Logger.log('[IRRS_WEBHOOK] Failed to parse queue, resetting: %s', error);
    return {};
  }
}

function irrsBuildRowSignature_(sheet, rowNumber, rowValues) {
  return Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      [sheet.getSheetId(), rowNumber, rowValues.join('|')].join(':')
    )
  );
}

function irrsQueueRowKey_(sheetId, rowNumber) {
  return [sheetId, rowNumber].join(':');
}

function irrsLastSentKey_(sheetId, rowNumber) {
  return [IRRS_LAST_SENT_PREFIX, sheetId, rowNumber].join(':');
}

function irrsCountNonEmptyCells_(rowValues) {
  return rowValues.filter((value) => String(value || '').trim() !== '').length;
}
