/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi komponen modal password untuk akses cepat (quick access)
 * yang memerlukan verifikasi password sebelum mengakses link tertentu.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { Lock, X, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Props untuk komponen QuickAccessPasswordModal
 * @interface QuickAccessPasswordModalProps
 */
interface QuickAccessPasswordModalProps {
    /** Apakah modal terbuka */
    isOpen: boolean;
    /** Callback saat modal ditutup */
    onClose: () => void;
    /** Judul yang ditampilkan di header modal */
    label: string;
    /** URL tujuan setelah sukses */
    href: string;
    /** Apakah tujuan adalah eksternal (target=_blank) */
    external?: boolean;
}

/**
 * Komponen modal password untuk akses cepat
 * Memerlukan password verification sebelum membuka link tujuan
 * @param QuickAccessPasswordModalProps - Props komponen
 * @returns JSX element modal atau null jika tidak terbuka
 * @example
 * ```tsx
 * <QuickAccessPasswordModal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   label="Handbook SLA"
 *   href="https://example.com"
 *   external={true}
 * />
 * ```
 */
export function QuickAccessPasswordModal({
    isOpen,
    onClose,
    label,
    href,
    external = true,
}: QuickAccessPasswordModalProps) {
    const [value, setValue] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState(false);
    const [shake, setShake] = useState(false);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Reset state whenever modal opens
    useEffect(() => {
        if (isOpen) {
            setValue('');
            setError(false);
            setTimeout(() => inputRef.current?.focus(), 120);
        }
    }, [isOpen]);

    /**
     * Handle submit form password
     * @param e - Form event
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/auth/verify-quick-access', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: value }),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.valid) {
                    onClose();
                    if (external) {
                        window.open(href, '_blank', 'noopener,noreferrer');
                    } else {
                        window.location.href = href;
                    }
                    return;
                }
            }
        } catch {
            // Fall through to error state
        } finally {
            setLoading(false);
        }
        setError(true);
        setShake(true);
        setValue('');
        setTimeout(() => setShake(false), 500);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity:1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998]"
                        onClick={onClose}
                        aria-hidden="true"
                    />

                    {/* Modal */}
                    <motion.div
                        key="modal"
                        initial={{ opacity: 0, scale: 0.92, y: 16 }}
                        animate={{ opacity:1, scale:1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: 16 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="qa-modal-title"
                    >
                        <motion.div
                            animate={shake ? { x: [-8, 8, -6, 6, -4, 4, 0] } : { x: 0 }}
                            transition={{ duration: 0.4 }}
                            className="pointer-events-auto w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between p-5 border-b border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center ring-1 ring-emerald-100">
                                        <Lock size={16} className="text-emerald-600" />
                                    </div>
                                    <div>
                                        <h2
                                            id="qa-modal-title"
                                            className="text-sm font-bold text-gray-900 leading-tight"
                                        >
                                            Akses Dibatasi
                                        </h2>
                                        <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                                            {label}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors active:scale-95"
                                    aria-label="Tutup"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Body */}
                            <form onSubmit={handleSubmit} className="p-5 space-y-4">
                                <div className="flex flex-col gap-1.5">
                                    <label
                                        htmlFor="qa-password-input"
                                        className="text-[11px] font-bold uppercase tracking-widest text-gray-400"
                                    >
                                        Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            ref={inputRef}
                                            id="qa-password-input"
                                            type={showPw ? 'text' : 'password'}
                                            value={value}
                                            onChange={(e) => {
                                                setValue(e.target.value);
                                                setError(false);
                                            }}
                                            placeholder="Masukkan password"
                                            className={`w-full px-4 py-2.5 pr-10 rounded-xl border text-sm transition-colors outline-none focus:ring-2 ${
                                                error
                                                    ? 'border-red-300 bg-red-50 focus:ring-red-200'
                                                    : 'border-gray-200 bg-gray-50 focus:ring-emerald-200 focus:border-emerald-400'
                                            }`}
                                            autoComplete="off"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPw((p) => !p)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                                            aria-label={showPw ? 'Sembunyikan password' : 'Tampilkan password'}
                                        >
                                            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                    {error && (
                                        <p className="text-xs text-red-500 font-medium">
                                            Password salah. Silakan coba lagi.
                                        </p>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={value.length === 0 || loading}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <ExternalLink size={14} />
                                    {loading ? 'Memverifikasi...' : 'Buka Akses'}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
