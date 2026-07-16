import { mkdir, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import {
  buildReportsPdf,
  DEFAULT_REPORT_EXPORT_FILTERS,
} from '../lib/reports-export.ts';

const longNarrative = [
  'B. RINGKASAN KEJADIAN',
  'Terjadi misroute satu bagasi seberat 12 kg yang seharusnya dikirim ke Kualanamu namun secara tidak sengaja terinput ke Pontianak.',
  '',
  'C. KRONOLOGIS KEJADIAN',
  ...Array.from({ length: 75 }, (_, index) => (
    `${String(index + 1).padStart(2, '0')}. Petugas melakukan verifikasi proses, koordinasi dengan unit terkait, pencatatan tindak lanjut, dan konfirmasi hasil penanganan.`
  )),
].join('\n');

const base = {
  user_id: 'fixture-user',
  description: '',
  location: 'Make-up Area',
  created_at: '2026-07-12T03:04:00.000Z',
  updated_at: '2026-07-14T01:20:00.000Z',
  date_of_event: '2026-07-12',
  branch: 'CGK',
  airlines: 'Pelita Air',
  route: 'CGK-KNO',
  area: 'Terminal',
  specific_location: 'Check-in Counter E4',
  reporter_name: 'Operations Staff',
  reporter_email: 'operations@example.com',
};

const reports = [
  {
    ...base,
    id: 'fixture-short',
    title: 'Short operational report',
    reference_number: 'GA152',
    flight_number: 'GA152',
    status: 'OPEN',
    severity: 'LOW',
    case_classification: 'Other',
    report: 'A concise report used to verify normal single-page spacing.',
  },
  {
    ...base,
    id: 'fixture-long',
    title: 'Baggage handling irregularity',
    reference_number: 'IP302',
    flight_number: 'IP302',
    aircraft_reg: 'PK-PXX',
    status: 'CLOSED',
    severity: 'HIGH RISK',
    priority: 'high',
    case_classification: 'Baggage',
    terminal_area_category: 'Baggage Handling',
    report: longNarrative,
    root_cause: 'The baggage destination was entered against the incorrect booking record.',
    immediate_action: 'The baggage was traced, intercepted, and redirected to the correct destination.',
    preventive_action: 'Re-brief personnel and verify destination before baggage-tag confirmation.',
    investigator_notes: 'The booking record and handling sequence were reviewed against the chronology.',
    manager_notes: 'Close after preventive-action evidence has been verified.',
    validation_notes: 'Evidence was verified on 14 Jul 2026.',
    target_division: 'Operational Services',
    evidence_urls: ['https://example.com/baggage-tag.jpg', 'https://example.com/partner-confirmation.pdf'],
    video_urls: ['https://example.com/handling-video.mp4'],
    comments: [
      {
        id: 'fixture-comment-1',
        content: 'Please confirm the preventive briefing and attach supporting evidence.',
        created_at: '2026-07-13T03:42:00.000Z',
        users: { full_name: 'Andi Pratama' },
        attachments: ['https://example.com/briefing.pdf'],
      },
      {
        id: 'fixture-comment-2',
        content: 'Briefing evidence uploaded. Case is ready for final validation.',
        created_at: '2026-07-14T01:15:00.000Z',
        users: { full_name: 'Siti Rahma' },
      },
    ],
  },
  {
    ...base,
    id: 'fixture-customer',
    title: 'JOUMPA customer service report',
    reference_number: 'JMP-2407',
    status: 'ON PROGRESS',
    severity: 'MEDIUM',
    case_classification: 'JOUMPA',
    report: 'Customer assistance and service follow-up report.',
    customer_joumpa: 'Corporate passenger',
    detail_customer_joumpa: 'Assistance requested for arrival handling and baggage delivery.',
    customer_satisfaction_score: '4',
    customer_satisfaction_label: 'Satisfied',
    final_remarks: 'Follow-up is scheduled with the responsible service team.',
    custom_operational_note: 'Fixture verifies fallback rendering for a newly introduced business field.',
  },
];

const logo = await readFile(new URL('../public/logo.png', import.meta.url));
const flattenedLogo = await sharp(logo)
  .resize({ width: 320, withoutEnlargement: true })
  .flatten({ background: '#ffffff' })
  .jpeg({ quality: 92 })
  .toBuffer();
const logoDataUrl = `data:image/jpeg;base64,${flattenedLogo.toString('base64')}`;
const doc = await buildReportsPdf(reports, {
  ...DEFAULT_REPORT_EXPORT_FILTERS,
  startDate: '2026-07-01',
  endDate: '2026-07-16',
}, { logoDataUrl });

await mkdir(new URL('../output/pdf/', import.meta.url), { recursive: true });
const output = new URL('../output/pdf/gapura-oneclick-all-reports-fixture.pdf', import.meta.url);
await writeFile(output, Buffer.from(doc.output('arraybuffer')));
console.log(output.pathname);
