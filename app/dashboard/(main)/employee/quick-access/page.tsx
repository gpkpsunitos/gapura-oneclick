'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QRCodeCanvas } from 'qrcode.react';
import {
  Bot, AlertTriangle, QrCode, ClipboardCheck, BookOpen, ArrowRight, X, ExternalLink, ChevronRight
} from 'lucide-react';

type QRLink = { label: string; url: string };

type Category =
  | { id: string; title: string; description?: string; icon: any; color: string; span: string; qrLinks: QRLink[] }
  | { id: string; title: string; description?: string; icon: any; color: string; span: string; links: { label: string; sublabel?: string; url: string }[] }
  | { id: string; title: string; description?: string; icon: any; color: string; span: string };

const CATEGORIES: Category[] = [
  {
    id: 'AIChatbot',
    title: "I'm in Charge AI Virtual Assistant",
    description: 'Tanya asisten AI untuk bantuan operasional.',
    icon: Bot,
    color: 'oklch(0.60 0.18 260)',
    span: 'col-span-2 row-span-2 md:col-span-2 md:row-span-2',
    links: [
      { label: 'Buka AI Virtual Assistant', sublabel: 'Powered by Gapura RAG', url: 'https://gapura-dev-gapura-rag.hf.space/' }
    ]
  },
  {
    id: 'Irregularity',
    title: 'Irregularity Report',
    description: 'Akses cepat pelaporan internal.',
    icon: AlertTriangle,
    color: 'oklch(0.55 0.22 30)',
    span: 'col-span-2 row-span-2 md:col-span-2 md:row-span-2'
  },
  {
    id: 'JOUMPA',
    title: 'JOUMPA',
    description: 'Hospitality & VIP Service access.',
    icon: QrCode,
    color: 'oklch(0.50 0.15 190)',
    span: 'col-span-1 row-span-1',
    qrLinks: [
      { label: 'Customer JOUMPA', url: 'https://forms.gle/gQpqWn2eSRqSsoJt7' },
      { label: 'Staff JOUMPA', url: 'https://forms.gle/QTP5vvwbmJxDroSB7' }
    ]
  },
  {
    id: 'SLA',
    title: 'Pengisian Report SLA',
    description: 'Akses cepat pengisian laporan SLA.',
    icon: ClipboardCheck,
    color: 'oklch(0.45 0.18 240)',
    span: 'col-span-2 md:col-span-2 row-span-1',
    qrLinks: [
      { label: 'Pengisian SLA Landside', url: 'https://docs.google.com/forms/d/e/1FAIpQLSeu3mRk2R_V-m9lBIn9704Kx6u3_p3d8pT80p3/viewform' },
      { label: 'Pengisian SLA Airside', url: 'https://docs.google.com/forms/d/e/1FAIpQLSeu3mRk2R_V-m9lBIn9704Kx6u3_p3d8pT80p3/viewform' }
    ]
  },
  {
    id: 'Survey',
    title: 'Survey Penumpang',
    description: 'Bantu kami meningkatkan layanan via survey.',
    icon: QrCode,
    color: 'oklch(0.60 0.20 340)',
    span: 'col-span-1 row-span-1',
    qrLinks: [
      { label: 'Survey Penumpang', url: 'https://forms.gle/G5T9yx2MBSWdXtJE7' }
    ]
  },
  {
    id: 'WSN',
    title: 'WSN Dashboard',
    description: 'Monitoring WSN & Weekly Service Notice.',
    icon: QrCode,
    color: 'oklch(0.55 0.18 180)',
    span: 'col-span-2 md:col-span-2 row-span-1',
    qrLinks: [
      { label: 'Monitoring WSN Dashboard', url: 'https://lookerstudio.google.com/reporting/55737b14-c27a-4ed8-b65c-336317790314/page/p_ufv08vzhsd' },
      { label: 'Weekly Service Notice Dashboard', url: 'https://lookerstudio.google.com/reporting/55737b14-c27a-4ed8-b65c-336317790314/page/p_1swzqz7usd' }
    ]
  },
  {
    id: 'Handbook',
    title: 'Handbook SLA',
    description: 'Panduan standar layanan operasional prima.',
    icon: BookOpen,
    color: 'oklch(0.45 0.20 160)',
    span: 'col-span-2 md:col-span-2 row-span-1',
    links: [
      { label: 'Buka Handbook SLA', sublabel: 'SIS Apps Dev', url: 'https://sis.appsdev.my.id/' }
    ]
  }
];

function QuickAccessModal({
  category,
  onClose
}: {
  category: Category | null;
  onClose: () => void;
}) {
  const router = useRouter();
  if (!category) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-white rounded-t-3xl md:rounded-3xl border border-black/10 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-black/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: (category as any).color + '20' }}>
              {/* @ts-ignore */}
              <category.icon className="w-5 h-5" style={{ color: (category as any).color }} />
            </div>
            <h3 className="text-lg font-extrabold">{category.title}</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-black/5">
            <X className="w-5 h-5 text-black/60" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {'qrLinks' in category ? (
            <div className="grid gap-8 grid-cols-1 md:grid-cols-2 place-items-center">
              {category.qrLinks.map((item, idx) => (
                <div key={idx} className="space-y-4 w-full max-w-sm">
                  <div className="aspect-square rounded-3xl overflow-hidden bg-white border border-black/10 p-6 shadow">
                    <QRCodeCanvas value={item.url} size={256} />
                  </div>
                  <div className="text-center">
                    <h4 className="text-lg font-extrabold">{item.label}</h4>
                  </div>
                  <div className="flex gap-2">
                    <input readOnly value={item.url} className="flex-1 px-3 py-2 rounded-lg border border-black/10 bg-white text-sm" />
                    <button
                      onClick={() => navigator.clipboard.writeText(item.url)}
                      className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold active:scale-95"
                    >
                      Copy
                    </button>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-lg bg-black/90 text-white text-sm font-bold active:scale-95"
                    >
                      Buka
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : 'links' in category ? (
            <div className="flex flex-col gap-4 w-full max-w-2xl">
              {category.links.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-4 p-5 rounded-2xl bg-white border border-black/10 hover:border-emerald-500/40 transition"
                >
                  {/* @ts-ignore */}
                  <category.icon className="w-6 h-6 text-emerald-600" />
                  <div className="flex-1">
                    <div className="text-base font-extrabold">{link.label}</div>
                    {link.sublabel ? <div className="text-xs text-black/60 font-bold">{link.sublabel}</div> : null}
                  </div>
                  <ExternalLink className="w-5 h-5 text-black/20 group-hover:text-emerald-600" />
                </a>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-black/70 font-bold">
                Gunakan akses cepat untuk pelaporan internal.
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link href="/dashboard/employee/new" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 text-white font-black">
                  Buat Laporan Internal
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/dashboard/employee" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl border border-black/10 font-black">
                  Laporan Saya
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function QuickAccessPage() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeCategory = CATEGORIES.find(c => c.id === activeId) || null;

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Quick Access</h1>
        <p className="text-sm text-black/60 font-bold">Akses cepat ke tool dan formulir operasional.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 auto-rows-[140px] md:auto-rows-[200px]">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon as any;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveId(cat.id)}
              className={`${cat.span} group relative rounded-2xl border border-black/10 bg-white hover:shadow transition overflow-hidden p-4 md:p-6 text-left`}
            >
              <div className="flex h-full flex-col justify-between">
                <div className="space-y-2">
                  <div className="p-2 rounded-xl bg-white border border-black/10 shadow-inner-rim w-fit">
                    <Icon className="w-5 h-5" style={{ color: (cat as any).color }} />
                  </div>
                  <div>
                    <div className="text-base md:text-xl font-extrabold leading-tight">{cat.title}</div>
                    {cat.description ? <div className="hidden md:block text-xs text-black/60 font-bold">{cat.description}</div> : null}
                  </div>
                </div>
                <div className="flex items-center justify-between text-black/30 group-hover:text-emerald-600">
                  <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">{'qrLinks' in cat ? 'Quick Access' : 'Luncurkan'}</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <QuickAccessModal category={activeCategory || null} onClose={() => setActiveId(null)} />
    </div>
  );
}
