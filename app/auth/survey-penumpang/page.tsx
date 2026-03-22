'use client';

import GuestNav from '@/components/GuestNav';
import Image from 'next/image';

export default function SurveyPenumpangPage() {
  return (
    <div className="min-h-[100dvh] bg-gray-50">
      <GuestNav />
      <div className="max-w-3xl mx-auto px-4 pt-12 pb-24 md:pl-[280px]">
        <div className="text-center space-y-2 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Survey Penumpang</h1>
          <p className="text-gray-500">Pindai QR berikut untuk mengisi survey</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-6 flex items-center justify-center">
          <Image
            src="/qr-code-survey-penumpang.png"
            alt="QR Code Survey Penumpang"
            width={360}
            height={360}
            className="w-full max-w-xs h-auto"
            priority
          />
        </div>
      </div>
    </div>
  );
}

