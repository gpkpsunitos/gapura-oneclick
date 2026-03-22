'use client';

import GuestNav from '@/components/GuestNav';
import { ClipboardList, ExternalLink } from 'lucide-react';

const LANDSIDE_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdMQgVrgWaPagVy7WEB94iVfC5rJmrxw5-J1Tn6jAJ77cD9Uw/closedform';
const AIRSIDE_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSeTpTECPvbI_mPquwTq2egIbiJ2_pQ3LEowH-1pv2Mo3SVWEA/viewform';

export default function PublicSLAMenuPage() {
  return (
    <div className="min-h-[100dvh] bg-gray-50">
      <GuestNav />
      <div className="max-w-3xl mx-auto px-4 pt-12 pb-24 md:pl-[280px]">
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700">
            <ClipboardList size={24} />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Pengisian Report SLA</h1>
          <p className="text-gray-500">Pilih kategori untuk melanjutkan</p>
        </div>

        <div className="grid gap-4">
          <a
            href={LANDSIDE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-5 rounded-xl border border-gray-200 bg-white hover:border-emerald-300 hover:shadow transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <ClipboardList size={20} />
              </div>
              <div>
                <p className="font-semibold">Pengisian SLA Landside</p>
                <p className="text-sm text-gray-500">Formulir Google</p>
              </div>
            </div>
            <ExternalLink size={18} className="text-gray-400" />
          </a>

          <a
            href={AIRSIDE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-5 rounded-xl border border-gray-200 bg-white hover:border-emerald-300 hover:shadow transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <ClipboardList size={20} />
              </div>
              <div>
                <p className="font-semibold">Pengisian SLA Airside</p>
                <p className="text-sm text-gray-500">Formulir Google</p>
              </div>
            </div>
            <ExternalLink size={18} className="text-gray-400" />
          </a>
        </div>
      </div>
    </div>
  );
}

