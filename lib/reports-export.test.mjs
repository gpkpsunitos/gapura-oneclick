import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPdfReportContent,
  buildReportsPdf,
  DEFAULT_REPORT_EXPORT_FILTERS,
} from './reports-export.ts';

function baseReport(overrides = {}) {
  return {
    id: 'report-001',
    user_id: 'internal-user-id',
    title: 'Baggage handling irregularity',
    description: '',
    location: 'Make-up Area',
    status: 'OPEN',
    severity: 'HIGH RISK',
    created_at: '2026-07-12T03:04:00.000Z',
    updated_at: '2026-07-14T01:20:00.000Z',
    reference_number: 'IP302',
    date_of_event: '2026-07-12',
    branch: 'CGK',
    airlines: 'Pelita Air',
    flight_number: 'IP302',
    case_classification: 'Baggage',
    ...overrides,
  };
}

test('groups complete operational fields, deduplicates aliases, and excludes internal metadata', () => {
  const content = buildPdfReportContent(baseReport({
    report: 'Full operational narrative',
    root_cause: 'Incorrect booking destination was selected.',
    root_caused: 'Incorrect booking destination was selected.',
    action_taken: 'The baggage was traced and redirected.',
    evidence_urls: ['https://example.com/evidence-1', 'https://example.com/evidence-1'],
    evidence_url: 'https://example.com/evidence-2',
    source_fingerprint: 'must-not-be-exported',
    sheet_id: 'private-sheet-id',
    custom_operational_note: 'New business field remains visible.',
  }));

  const allFields = content.sections.flatMap((section) => section.fields);
  assert.equal(allFields.filter((field) => field.label === 'Root cause').length, 1);
  assert.equal(allFields.some((field) => field.value === 'must-not-be-exported'), false);
  assert.equal(allFields.some((field) => field.value === 'private-sheet-id'), false);
  assert.equal(allFields.some((field) => field.label === 'Custom Operational Note' && field.value === 'New business field remains visible.'), true);
  assert.deepEqual(content.evidence, ['https://example.com/evidence-1', 'https://example.com/evidence-2']);
});

test('retains comments and their attachments in chronological display order', () => {
  const content = buildPdfReportContent(baseReport({
    comments: [
      {
        id: 'comment-1',
        content: 'Please attach the briefing evidence.',
        created_at: '2026-07-13T03:42:00.000Z',
        users: { full_name: 'Andi Pratama' },
        attachments: ['https://example.com/briefing.pdf'],
      },
      {
        id: 'comment-2',
        content: 'Evidence uploaded and verified.',
        created_at: '2026-07-14T01:15:00.000Z',
        users: { full_name: 'Siti Rahma' },
      },
    ],
  }));

  assert.equal(content.comments.length, 2);
  assert.match(content.comments[0].label, /Andi Pratama/);
  assert.match(content.comments[0].value, /briefing\.pdf/);
  assert.match(content.comments[1].label, /Siti Rahma/);
});

test('paginates a very long report instead of rendering it in a fixed-height slot', async () => {
  const longNarrative = Array.from({ length: 90 }, (_, index) => (
    `${index + 1}. Detailed chronology line describing baggage handling, verification, coordination, and corrective action.`
  )).join('\n');
  const doc = await buildReportsPdf(
    [baseReport({ report: longNarrative })],
    DEFAULT_REPORT_EXPORT_FILTERS,
    { logoDataUrl: null },
  );

  assert.ok(doc.getNumberOfPages() >= 3);
  assert.ok(doc.output('arraybuffer').byteLength > 10_000);
});
