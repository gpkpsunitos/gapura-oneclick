'use client';

import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { AREA_LABELS } from '@/lib/constants/incident-areas';
import { FormShell, Section } from '@/components/public-report/apple-form-shell';
import { getEvidencePreviewUrl } from '@/lib/evidence-url';
import type { Report } from '@/types';

interface Props {
  report: Report;
  onClose: () => void;
  onUpdateStatus?: (id: string, status: string) => void | Promise<void>;
}

const detectJoumpa = (r: Report): boolean =>
  !!r.category_case_joumpa ||
  !!r.customer_joumpa ||
  !!r.detail_customer_joumpa ||
  (r.category || '').toUpperCase().includes('JOUMPA') ||
  (r.main_category || '').toUpperCase().includes('JOUMPA') ||
  (r.source_sheet || '').toLowerCase().includes('joumpa');

const fmtDate = (d?: string | null) => {
  if (!d) return null;
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
};

const areaCategoryOf = (r: Report): string | undefined =>
  r.terminal_area_category ||
  r.apron_area_category ||
  r.general_category ||
  r.category_case_gse ||
  r.category_case_cargo ||
  r.irregularity_complain_category ||
  undefined;

const rootCauseIdOf = (r: Report): string | undefined =>
  r.case_classification || r.identification_of_root || undefined;

function KV({ k, v, wide, muted }: { k: string; v?: string | null; wide?: boolean; muted?: boolean }) {
  const value = v && String(v).trim() ? String(v).trim() : '—';
  return (
    <div className={wide ? 'jm-kv__cell jm-kv__cell--wide' : 'jm-kv__cell'}>
      <span className="jm-kv__k">{k}</span>
      <span className={muted || value === '—' ? 'jm-kv__v jm-kv__v--muted' : 'jm-kv__v'}>{value}</span>
    </div>
  );
}

function Paragraph({ text }: { text?: string | null }) {
  const val = text && String(text).trim() ? String(text).trim() : '—';
  if (val === '—') return <span className="jm-kv__v jm-kv__v--muted">Not recorded</span>;
  return <p className="jm-body-para">{val}</p>;
}

function StatusBadge({ status }: { status?: string }) {
  const s = (status || '').toUpperCase();
  const cls =
    s === 'OPEN' ? 'jm-badge jm-badge--open' :
    s === 'ON PROGRESS' || s === 'IN PROGRESS' ? 'jm-badge jm-badge--progress' :
    s === 'CLOSED' ? 'jm-badge jm-badge--closed' :
    'jm-badge';
  return (
    <span className={cls}>
      <span className="jm-badge__dot" aria-hidden />
      {s || 'UNKNOWN'}
    </span>
  );
}

function SeverityBadge({ severity }: { severity?: string }) {
  const s = (severity || '').toUpperCase();
  const cls =
    s === 'TOP RISK' || s === 'URGENT' ? 'jm-badge jm-badge--urgent' :
    s === 'HIGH RISK' ? 'jm-badge jm-badge--high' :
    s === 'MEDIUM' ? 'jm-badge jm-badge--medium' :
    s === 'LOW' ? 'jm-badge jm-badge--low' :
    'jm-badge';
  return <span className={cls}>{s || 'UNSET'}</span>;
}

const toUrlList = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string' && !!x);
  if (typeof v === 'string' && v.trim()) return [v.trim()];
  return [];
};

function EvidenceThumb({ url, index }: { url: string; index: number }) {
  const [failed, setFailed] = useState(false);
  const previewUrl = getEvidencePreviewUrl(url);
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="jm-evidence__item">
      {failed ? (
        <div className="jm-evidence__fallback">
          <ImageOff size={22} strokeWidth={1.5} />
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt={`Evidence ${index + 1}`}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      )}
      <span className="jm-evidence__badge">{String(index + 1).padStart(2, '0')}</span>
    </a>
  );
}

function EvidenceGallery({ urls }: { urls: string[] }) {
  if (!urls.length) return <span className="jm-kv__v jm-kv__v--muted">No evidence attached</span>;
  return (
    <div className="jm-evidence">
      {urls.map((url, i) => (
        <EvidenceThumb key={url + i} url={url} index={i} />
      ))}
    </div>
  );
}

function IrregularityBody({ report }: { report: Report }) {
  const areaLabel = report.area ? (AREA_LABELS[report.area as keyof typeof AREA_LABELS] || report.area) : '';
  const isGse = report.area === 'GSE' || !!report.gse_available_requirement;
  const airline = report.airlines || report.airline;

  return (
    <>
      <Section title="Reporter">
        <div className="jm-kv">
          <KV k="Reporter" v={report.reporter_name} />
          <KV k="Email" v={report.reporter_email} />
          <KV k="Date of Event" v={fmtDate(report.date_of_event || report.incident_date)} />
          <KV k="Filed" v={fmtDate(report.created_at)} />
        </div>
      </Section>

      <Section title="Flight">
        <div className="jm-kv">
          <KV k="Airline" v={airline} />
          <KV k="Flight" v={report.flight_number} />
          <KV k="Route" v={report.route} />
          <KV k="Station" v={report.station_code || report.branch} />
          <KV k="Hub" v={report.hub} />
          <KV k="Airline Type" v={report.jenis_maskapai} />
          {report.delay_code && <KV k="Delay Code" v={report.delay_code} wide />}
        </div>
      </Section>

      <Section title="Location">
        <div className="jm-kv">
          <KV k="Area" v={areaLabel} />
          <KV k="Category" v={areaCategoryOf(report)} />
        </div>
      </Section>

      {isGse && (
        <Section title="GSE Availability & Requirement">
          <div className="jm-kv">
            <KV k="GSE Available & Requirement" v={report.gse_available_requirement} />
            <KV k="Motorized" v={report.gse_motorized} />
            <KV k="Non-Motorized" v={report.gse_non_motorized} />
            <KV k="GSE Case Category" v={report.category_case_gse} />
          </div>
        </Section>
      )}

      <Section title="Case Narrative">
        <div className="jm-kv">
          <div className="jm-kv__cell jm-kv__cell--wide">
            <span className="jm-kv__k">Description</span>
            <Paragraph text={report.description || report.report} />
          </div>
          <div className="jm-kv__cell jm-kv__cell--wide">
            <span className="jm-kv__k">Root Cause</span>
            <Paragraph text={report.root_cause || report.root_caused} />
          </div>
          <KV k="Case Classification" v={rootCauseIdOf(report)} wide />
          <div className="jm-kv__cell jm-kv__cell--wide">
            <span className="jm-kv__k">Action Taken</span>
            <Paragraph text={report.action_taken} />
          </div>
          <div className="jm-kv__cell jm-kv__cell--wide">
            <span className="jm-kv__k">Preventive Action</span>
            <Paragraph text={report.preventive_action} />
          </div>
        </div>
      </Section>

      <Section title="Evidence">
        <EvidenceGallery urls={toUrlList(report.evidence_urls)} />
      </Section>
    </>
  );
}

function JoumpaBody({ report }: { report: Report }) {
  const isCorporate = (report.customer_joumpa || '').toLowerCase().includes('corporate') && !(report.customer_joumpa || '').toLowerCase().includes('non');
  const isNonCorporate = (report.customer_joumpa || '').toLowerCase().includes('non');

  return (
    <>
      <Section title="Reporter">
        <div className="jm-kv">
          <KV k="Report by" v={report.reporter_name} />
          <KV k="Email" v={report.reporter_email} />
          <KV k="Date of Event" v={fmtDate(report.date_of_event || report.incident_date)} />
          <KV k="Filed" v={fmtDate(report.created_at)} />
        </div>
      </Section>

      <Section title="Flight">
        <div className="jm-kv">
          <KV k="Airlines" v={report.airlines || report.airline} />
          <KV k="Flight" v={report.flight_number} />
          <KV k="Route" v={report.route} />
          <KV k="Station" v={report.station_code || report.branch} />
        </div>
      </Section>

      <Section title="Customer">
        <div className="jm-kv">
          <KV k="Customer Type" v={report.customer_joumpa} />
          {isCorporate && <>
            <KV k="Corporate Segment" v={report.corporate} />
            <KV k="Company Profile" v={report.customer_company_profile_corporate} wide />
            <KV k="Detail Customer" v={report.detail_customer_corporate} wide />
          </>}
          {isNonCorporate && <>
            <KV k="Non-Corporate Type" v={report.non_corporate} />
            <KV k="Customer Background" v={report.customer_background_non_corporate} />
            <KV k="Detail Customer" v={report.detail_customer_non_corporate} wide />
          </>}
          {!isCorporate && !isNonCorporate && report.detail_customer_joumpa && (
            <KV k="Detail Customer" v={report.detail_customer_joumpa} wide />
          )}
        </div>
      </Section>

      <Section title="Case Narrative">
        <div className="jm-kv">
          <KV k="Category Case" v={report.category_case_joumpa} wide />
          <div className="jm-kv__cell jm-kv__cell--wide">
            <span className="jm-kv__k">Report</span>
            <Paragraph text={report.report || report.description} />
          </div>
          <div className="jm-kv__cell jm-kv__cell--wide">
            <span className="jm-kv__k">Root Caused</span>
            <Paragraph text={report.root_caused || report.root_cause} />
          </div>
          <div className="jm-kv__cell jm-kv__cell--wide">
            <span className="jm-kv__k">Action Taken</span>
            <Paragraph text={report.action_taken} />
          </div>
          <div className="jm-kv__cell jm-kv__cell--wide">
            <span className="jm-kv__k">Preventive Action</span>
            <Paragraph text={report.preventive_action} />
          </div>
        </div>
      </Section>

      <Section title="Evidence">
        <EvidenceGallery urls={toUrlList(report.evidence_urls)} />
      </Section>
    </>
  );
}

export function AppleReportDetail({ report, onClose, onUpdateStatus }: Props) {
  const isJoumpa = detectJoumpa(report);
  const [updating, setUpdating] = useState(false);
  const nextStatus = report.status === 'CLOSED' ? null : 'CLOSED';

  const handleAdvance = async () => {
    if (!onUpdateStatus || !nextStatus || updating) return;
    setUpdating(true);
    try { await onUpdateStatus(report.id, nextStatus); } finally { setUpdating(false); }
  };

  const airline = report.airlines || report.airline || '';
  const flight = report.flight_number || '';
  const areaLabel = report.area ? (AREA_LABELS[report.area as keyof typeof AREA_LABELS] || report.area) : '';
  const title = isJoumpa
    ? [airline, flight].filter(Boolean).join(' · ') || (report.title || 'JOUMPA Report')
    : [airline, flight, areaLabel].filter(Boolean).join(' · ') || (report.title || 'Irregularity Report');

  return (
    <FormShell onClose={onClose} ariaLabel={isJoumpa ? 'JOUMPA Report Detail' : 'Irregularity Report Detail'}>
      <div className="jm-form">
        <div className="jm-scroll">
          <div className="jm-detail__hero">
            <span className={isJoumpa ? 'jm-detail__eyebrow jm-detail__eyebrow--joumpa' : 'jm-detail__eyebrow'}>
              {isJoumpa ? 'JOUMPA · Field Report' : 'Ground Handling · Irregularity'}
            </span>
            <h2 className="jm-detail__title">{title}</h2>
            <div className="jm-detail__meta">
              <StatusBadge status={report.status} />
              <SeverityBadge severity={report.severity} />
              {report.reference_number && (
                <span className="jm-badge">Ref · {report.reference_number}</span>
              )}
            </div>
          </div>

          {isJoumpa ? <JoumpaBody report={report} /> : <IrregularityBody report={report} />}
        </div>

        {onUpdateStatus && nextStatus && (
          <div className="jm-footer">
            <button
              type="button"
              onClick={handleAdvance}
              disabled={updating}
              className={updating ? 'jm-submit jm-submit--close jm-submit--disabled' : 'jm-submit jm-submit--close'}
            >
              {updating ? 'Updating…' : `Mark as ${nextStatus}`}
            </button>
          </div>
        )}
      </div>
    </FormShell>
  );
}

export default AppleReportDetail;
