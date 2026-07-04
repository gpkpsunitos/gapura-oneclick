'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/hooks/use-auth';
import PublicIrregularityForm from '@/components/public-report/PublicIrregularityForm';
import PublicJoumpaForm from '@/components/public-report/PublicJoumpaForm';

type CreateReportTab = 'irregularity' | 'joumpa';

export default function NewReportPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState<CreateReportTab>('irregularity');

  const onSubmitted = () => {
    setTimeout(() => router.push('/dashboard/employee'), 1500);
  };

  return (
    <div className="w-full">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .cr-page { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; -webkit-font-smoothing: antialiased; color: #101013; }
        .cr-tabs {
          display: inline-flex; gap: 4px;
          padding: 4px;
          background: rgba(0,0,0,0.05);
          border-radius: 999px;
          border: 1px solid rgba(0,0,0,0.05);
        }
        .cr-tab {
          padding: 10px 22px;
          border-radius: 999px;
          border: none;
          background: transparent;
          font-family: inherit;
          font-size: 13.5px;
          font-weight: 600;
          letter-spacing: -0.005em;
          color: #6b6b73;
          cursor: pointer;
          transition: background .2s ease, color .2s ease, transform .1s ease;
        }
        .cr-tab:hover { color: #101013; }
        .cr-tab:active { transform: scale(0.97); }
        .cr-tab--active {
          background: #101013;
          color: #ffffff;
          box-shadow: 0 4px 12px -4px rgba(0,0,0,0.3);
        }
        .cr-tab--active:hover { color: #ffffff; }
      ` }} />

      <div className="cr-page mx-auto w-full max-w-3xl px-4 sm:px-6 pt-8 pb-16">
        <div className="flex justify-center mb-8">
          <div className="cr-tabs" role="tablist" aria-label="Report type">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'irregularity'}
              onClick={() => setTab('irregularity')}
              className={cn('cr-tab', tab === 'irregularity' && 'cr-tab--active')}
            >
              Ground Handling Irregularity
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'joumpa'}
              onClick={() => setTab('joumpa')}
              className={cn('cr-tab', tab === 'joumpa' && 'cr-tab--active')}
            >
              JOUMPA Report
            </button>
          </div>
        </div>

        {tab === 'irregularity' ? (
          <PublicIrregularityForm
            inline
            mode="internal"
            defaultReporterName={user?.full_name || ''}
            defaultReporterEmail={user?.email || ''}
            onSubmitted={onSubmitted}
          />
        ) : (
          <PublicJoumpaForm
            inline
            mode="internal"
            defaultReporterName={user?.full_name || ''}
            defaultReporterEmail={user?.email || ''}
            onSubmitted={onSubmitted}
          />
        )}
      </div>
    </div>
  );
}
