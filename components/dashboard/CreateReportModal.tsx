'use client';

import { useRouter } from 'next/navigation';
import { PrismButton } from '@/components/ui/PrismButton';
import { Plus, X } from 'lucide-react';

interface CreateReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function CreateReportModal({ isOpen, onClose }: CreateReportModalProps) {
    const router = useRouter();

    if (!isOpen) return null;

    const handleCreate = () => {
        onClose();
        router.push('/dashboard/employee/new');
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="bg-[var(--surface-1)] rounded-2xl shadow-2xl max-w-md w-full p-6 relative z-10 animate-scale-in border border-[var(--border-subtle)]">
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 p-2 hover:bg-[var(--surface-2)] rounded-full transition-colors"
                >
                    <X size={20} className="text-[var(--text-secondary)]" />
                </button>

                <div className="text-center space-y-4 pt-4">
                    <div className="w-16 h-16 bg-[var(--brand-primary)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Plus size={32} className="text-[var(--brand-primary)]" />
                    </div>
                    
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">Buat Laporan Baru</h2>
                    <p className="text-[var(--text-secondary)]">
                        Anda akan diarahkan ke formulir pembuatan laporan irregularity. Pastikan Anda memiliki bukti foto yang siap diunggah.
                    </p>

                    <div className="flex gap-3 pt-4">
                        <PrismButton 
                            variant="ghost" 
                            onClick={onClose}
                            className="flex-1"
                        >
                            Batal
                        </PrismButton>
                        <PrismButton 
                            variant="primary" 
                            onClick={handleCreate}
                            className="flex-1"
                        >
                            Lanjut ke Formulir
                        </PrismButton>
                    </div>
                </div>
            </div>
        </div>
    );
}
