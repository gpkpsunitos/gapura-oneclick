'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import GuestNav from '@/components/GuestNav';
import { Bot, Sparkles, Send, Paperclip, Mic } from 'lucide-react';
import Link from 'next/link';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: ReactNode;
  ts: number;
};

const SUGGESTIONS = [
  'Cara buat laporan irregularity',
  'Cek status laporan terakhir',
  'Kontak cabang terdekat',
  'Apa itu kategori Apron/Terminal/Cargo?',
  'Langkah upload bukti foto'
];

export default function AIChatbotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'm0',
      role: 'assistant',
      content: (
        <>
          Halo! Saya "&nbsp;<em>Im in charge</em>&nbsp;" Virtual AI Asisstant untuk Quick Access. Ada yang bisa saya bantu?.
        </>
      ),
      ts: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const canSend = input.trim().length > 0 && !sending;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, sending]);

  const theme = useMemo(
    () => ({
      bg:
        'linear-gradient(135deg, rgba(2,80,60,0.08), rgba(0,0,0,0)),' +
        'radial-gradient(1200px 400px at 70% 0%, rgba(16,185,129,0.12), transparent),' +
        'radial-gradient(800px 300px at 5% 30%, rgba(5,150,105,0.10), transparent)',
      card: 'bg-white/80 backdrop-blur-xl ring-1 ring-black/5'
    }),
    []
  );

  const handleSend = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || sending) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content, ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);
    try {
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content:
          content.toLowerCase().includes('lapor') || content.toLowerCase().includes('buat laporan')
            ? 'Untuk membuat laporan secara cepat, buka Quick Access → Laporkan Irregularity. Isi tanggal kejadian, maskapai, lokasi (station), kategori area, lalu deskripsi singkat dan unggah bukti. Jika butuh, saya bisa jelaskan kategori yang tepat.'
            : content.toLowerCase().includes('status')
            ? 'Status laporan publik dapat dicek melalui dashboard setelah diverifikasi. Untuk akses umum, simpan nomor referensi yang muncul setelah submit dan hubungi cabang terkait untuk konfirmasi.'
            : content.toLowerCase().includes('kontak') || content.toLowerCase().includes('cabang')
            ? 'Kontak cabang terdekat dapat ditemukan berdasarkan kode station. Jika Anda tahu kodenya (misal CGK, DPS, SUB), sebutkan dan saya bantu arahkan. Untuk panduan umum, gunakan form Quick Access lalu pilih station yang sesuai.'
            : content.toLowerCase().includes('kategori') || content.toLowerCase().includes('apron') || content.toLowerCase().includes('terminal') || content.toLowerCase().includes('cargo')
            ? 'Kategori ringkas: Terminal untuk area terminal penumpang, Apron untuk kegiatan ramp dan GSE, Cargo untuk proses acceptance hingga delivery. Jika ragu, pilih General lalu jelaskan pada deskripsi.'
            : 'Saya akan membantu menjawab pertanyaan Anda dengan panduan praktis Quick Access. Coba ketik: “Cara buat laporan irregularity”.',
        ts: Date.now()
      };
      await new Promise((r) => setTimeout(r, 500));
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <GuestNav />
      <main
        className="min-h-[100dvh] md:ml-[240px] relative"
        style={{ background: theme.bg }}
      >
        <header className="px-4 pt-5 pb-3 md:px-8">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Bot size={18} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-[var(--text-primary)]">AI Chatbot</h1>
              <p className="text-sm text-[var(--text-secondary)]">Bantuan cepat untuk Akses Umum</p>
            </div>
          </div>
        </header>

        <section className="px-4 md:px-8">
          <div className="max-w-3xl mx-auto rounded-2xl overflow-hidden" style={{ boxShadow: '0 20px 60px -25px rgba(0,0,0,0.25)' }}>
            <div className="p-3 border-b bg-gradient-to-r from-emerald-50 to-transparent">
              <div className="max-w-3xl mx-auto flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-[11px] font-bold tracking-wide">
                  <Sparkles size={12} />
                  Quick Guide
                </div>
                <div className="flex-1 overflow-x-auto no-scrollbar pl-1">
                  <div className="flex gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSend(s)}
                        className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-white hover:bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 transition-all active:scale-[0.98]"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="relative" style={{ background: 'radial-gradient(1000px 220px at 50% -10%, rgba(16,185,129,0.10), transparent)' }}>
              <div className="p-4 md:p-6 space-y-4">
                {messages.map((m) => (
                  <div key={m.id} className="flex gap-3">
                    {m.role === 'assistant' ? (
                      <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                        <Bot size={16} />
                      </div>
                    ) : (
                      <div className="h-8 w-8 rounded-lg bg-gray-800 text-white flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-bold">YOU</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <div
                        className={
                          m.role === 'assistant'
                            ? 'inline-block max-w-[85%] md:max-w-[70%] rounded-2xl rounded-tl-sm px-4 py-3 bg-white shadow-sm ring-1 ring-black/5'
                            : 'inline-block max-w-[85%] md:max-w-[70%] rounded-2xl rounded-tr-sm px-4 py-3 bg-emerald-600 text-white shadow-sm'
                        }
                        style={m.role === 'assistant' ? undefined : { boxShadow: '0 10px 30px -15px rgba(16,185,129,0.5)' }}
                      >
                        <p className="text-sm leading-relaxed">{m.content}</p>
                      </div>
                      <div className="mt-1 text-[10px] text-[var(--text-muted)]">
                        {new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
            </div>

            <div className="p-3 md:p-4">
              <div className="rounded-xl p-2 md:p-2.5 flex items-end gap-2 md:gap-3"
                   style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(10px)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <button
                  className="h-10 w-10 md:h-11 md:w-11 rounded-lg bg-white ring-1 ring-black/5 text-gray-600 hover:text-emerald-700 active:scale-95 transition-all"
                  aria-label="Lampirkan"
                >
                  <Paperclip size={16} className="mx-auto" />
                </button>
                <div className="flex-1">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Tulis pertanyaan Anda..."
                    className="w-full bg-white rounded-lg px-3 py-3 md:px-4 md:py-3 text-sm ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-emerald-400 transition-all"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && canSend) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                </div>
                <button
                  disabled={!canSend}
                  onClick={() => handleSend()}
                  className="inline-flex items-center justify-center gap-2 h-10 md:h-11 px-4 md:px-5 rounded-lg text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 transition-all"
                >
                  <Send size={16} />
                  Kirim
                </button>
                <button
                  className="h-10 w-10 md:h-11 md:w-11 rounded-lg bg-white ring-1 ring-black/5 text-gray-600 hover:text-emerald-700 active:scale-95 transition-all"
                  aria-label="Voice"
                >
                  <Mic size={16} className="mx-auto" />
                </button>
              </div>
              <div className="h-[env(safe-area-inset-bottom,0)]" />
            </div>
          </div>
        </section>

        <footer className="px-4 md:px-8 pb-[calc(env(safe-area-inset-bottom,0)+5rem)] md:pb-8">
          <div className="max-w-3xl mx-auto mt-4 text-center text-xs text-[var(--text-muted)]">
            <span>Butuh membuat laporan sekarang? </span>
            <Link href="/auth/public-report" className="font-semibold text-emerald-700 hover:underline">Quick Access: Laporkan Irregularity</Link>
          </div>
        </footer>
      </main>
    </>
  );
}
