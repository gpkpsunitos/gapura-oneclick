import { Link2, LayoutDashboard, Layers, Sparkles } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

const LOOKER_PLACEHOLDERS = [
    {
        title: 'Executive Lookers',
        description: 'Placeholder untuk dashboard lintas entitas. Hubungkan ke Looker Studio saat link final sudah tersedia.',
        href: 'https://lookerstudio.google.com/',
    },
    {
        title: 'Operational Lookers',
        description: 'Gunakan slot ini untuk dashboard operasional per divisi atau per cabang.',
        href: 'https://lookerstudio.google.com/',
    },
    {
        title: 'Custom Lookers',
        description: 'Cadangan untuk dashboard custom yang nanti dibangun user per kebutuhan.',
        href: 'https://lookerstudio.google.com/',
    },
];

export function LookersVersionPage() {
    return (
        <div className="min-h-screen p-4 md:p-6">
            <div className="mx-auto max-w-7xl space-y-6">
                <GlassCard className="bg-gradient-to-br from-slate-50 via-white to-cyan-50">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-cyan-700">
                            <Sparkles className="h-4 w-4" />
                            Lookers Version
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)] md:text-4xl">
                                Hub Koneksi ke Looker Studio
                            </h1>
                            <p className="mt-3 max-w-3xl text-sm text-[var(--text-secondary)] md:text-base">
                                Ini adalah menu dummy untuk semua user non-cabang. Saat link Looker final sudah disiapkan, kartu di bawah bisa diganti per entitas, per role, atau per kebutuhan dashboard.
                            </p>
                        </div>
                    </div>
                </GlassCard>

                <div className="grid gap-4 md:grid-cols-3">
                    <GlassCard>
                        <LayoutDashboard className="h-8 w-8 text-cyan-600" />
                        <h2 className="mt-5 text-xl font-black text-[var(--text-primary)]">Akses Terpusat</h2>
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">
                            Satu pintu ke semua dashboard Looker supaya user non-cabang tidak perlu menyimpan banyak link terpisah.
                        </p>
                    </GlassCard>
                    <GlassCard>
                        <Layers className="h-8 w-8 text-emerald-600" />
                        <h2 className="mt-5 text-xl font-black text-[var(--text-primary)]">Siap Dibagi per Role</h2>
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">
                            Halaman ini bisa diperluas menjadi daftar link berbeda untuk Analyst, HC, HT, atau divisi lain tanpa mengubah pola navigasi.
                        </p>
                    </GlassCard>
                    <GlassCard>
                        <Link2 className="h-8 w-8 text-violet-600" />
                        <h2 className="mt-5 text-xl font-black text-[var(--text-primary)]">Placeholder Aktif</h2>
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">
                            Sampai URL final tersedia, kartu tetap mengarah ke landing Looker Studio agar integrasi menu sudah siap dipakai.
                        </p>
                    </GlassCard>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    {LOOKER_PLACEHOLDERS.map((item) => (
                        <GlassCard key={item.title} className="h-full">
                            <div className="flex h-full flex-col">
                                <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">Lookers Slot</p>
                                <h2 className="mt-3 text-xl font-black text-[var(--text-primary)]">{item.title}</h2>
                                <p className="mt-3 flex-1 text-sm text-[var(--text-secondary)]">{item.description}</p>
                                <a
                                    href={item.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-5 inline-flex items-center justify-center rounded-xl bg-[var(--brand-primary)] px-4 py-3 text-sm font-bold text-white"
                                >
                                    Buka Looker Studio
                                </a>
                            </div>
                        </GlassCard>
                    ))}
                </div>
            </div>
        </div>
    );
}
