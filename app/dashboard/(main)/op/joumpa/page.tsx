'use client';

import { JoumpaDashboard } from '../../../../../components/dashboard/JoumpaDashboard';
import { AnalyticsSection, AnalyticsSourceStrip, AnalyticsUnavailable } from '@/components/dashboard/analytics-source-strip';
import { getShortcutSourceConfig } from '@/lib/op-shortcut-source-matrix';

const SOURCE_CONFIG = getShortcutSourceConfig('joumpa');

export default function OPJoumpa() {
  return (
    <div className="space-y-6 px-4 py-6 md:px-6">
      <AnalyticsSourceStrip
        title="Joumpa Handling"
        description="Halaman Joumpa tetap memakai dataset khusus `JOUMPA_SHEET_ID`. Dashboard real dibiarkan utuh, lalu status AI ditegaskan sebagai tidak tersedia."
        realSource={SOURCE_CONFIG.realSource}
      />

      <AnalyticsSection
        title="Data Real Joumpa"
        description="Dashboard berikut tetap berasal dari route `/api/joumpa` dan sheet `Form Responses 1`."
        variant="real"
      >
        <div className="-mx-5 -mb-5 mt-[-0.5rem] md:-mx-6 md:-mb-6">
          <JoumpaDashboard backPath="/dashboard/op" />
        </div>
      </AnalyticsSection>

      <AnalyticsSection
        title="Analitik AI"
        description="Saat ini belum ada endpoint AI yang spesifik untuk dataset Joumpa, sehingga halaman ini tetap real-data only."
        variant="ai"
      >
        <AnalyticsUnavailable
          title="AI insight belum tersedia"
          description="Tidak ada endpoint AI yang khusus membaca sheet Joumpa, jadi halaman ini tetap menggunakan dashboard real tanpa layer AI."
        />
      </AnalyticsSection>
    </div>
  );
}
