'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { DivisionType, Report } from '@/types';
import { PrismSelect } from '@/components/ui/PrismSelect';
import { PrismButton } from '@/components/ui/PrismButton';
import { cn } from '@/lib/utils';

interface TriageModalProps {
    isOpen: boolean;
    onClose: () => void;
    report: Report | null;
    onSubmit: (data: { 
        primary_tag: string; 
        sub_category_note: string; 
        target_division: DivisionType 
    }) => Promise<void>;
}

export function TriageModal({ isOpen, onClose, report, onSubmit }: TriageModalProps) {
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Form State
    const [primaryTag, setPrimaryTag] = useState<string>('Landside & Airside');
    const [subCategoryNote, setSubCategoryNote] = useState('');
    const [targetDivision, setTargetDivision] = useState<string>('');

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Reset form when report changes
    useEffect(() => {
        if (isOpen && report) {
            setPrimaryTag(report.primary_tag || 'Landside & Airside');
            setSubCategoryNote(report.sub_category_note || '');
            setTargetDivision(report.target_division || '');
        }
    }, [isOpen, report]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetDivision) return;
        
        setLoading(true);
        try {
            await onSubmit({
                primary_tag: primaryTag,
                sub_category_note: subCategoryNote,
                target_division: targetDivision as DivisionType
            });
            // Don't close here, let the parent handle it or close after success
        } catch (error) {
            console.error('Triage failed:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!mounted || !isOpen || !report) return null;

    const divisionOptions = [
        { value: 'OS', label: 'Divisi OS (Operational Services)' },
        { value: 'OP', label: 'Divisi OP (Operational Performance)' },
        { value: 'OT', label: 'Divisi OT (Operational Training)' },
        { value: 'UQ', label: 'Divisi UQ (Unit Quality)' },
        { value: 'HC', label: 'Divisi HC (Human Capital)' },
        { value: 'HT', label: 'Divisi HT (Human Training?)' },
    ];

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div 
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in flex flex-col max-h-[90vh]"
                style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Triage & Dispatch</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Assign report <span className="font-mono font-medium text-gray-700">{report.id.slice(0, 8)}</span> to a division.
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto">
                    <form id="triage-form" onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* Primary Tag Selection */}
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-gray-700 block">
                                Area Category (Primary Tag)
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {['Landside & Airside', 'CGO'].map((tag) => (
                                    <label 
                                        key={tag}
                                        className={cn(
                                            "cursor-pointer relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200",
                                            primaryTag === tag 
                                                ? "border-[var(--brand-primary)] bg-brand-primary/5 text-[var(--brand-primary)]" 
                                                : "border-gray-200 hover:border-gray-300 text-gray-600 hover:bg-gray-50"
                                        )}
                                    >
                                        <input 
                                            type="radio" 
                                            name="primary_tag" 
                                            value={tag}
                                            checked={primaryTag === tag}
                                            onChange={(e) => setPrimaryTag(e.target.value)}
                                            className="sr-only"
                                        />
                                        <span className="text-sm font-bold">{tag}</span>
                                        {primaryTag === tag && (
                                            <div className="absolute top-2 right-2 text-[var(--brand-primary)]">
                                                <CheckCircle2 size={14} fill="currentColor" className="text-white" />
                                            </div>
                                        )}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Division Selection */}
                        <div>
                             <PrismSelect
                                label="Assign to Division"
                                placeholder="Select target division..."
                                options={divisionOptions}
                                value={targetDivision}
                                onChange={setTargetDivision}
                                required
                            />
                        </div>

                        {/* Remarks Gapura KPS */}
                        <div className="space-y-2">
                            <label htmlFor="sub_note" className="text-sm font-semibold text-gray-700 block">
                                Remarks Gapura KPS
                            </label>
                            <textarea
                                id="sub_note"
                                value={subCategoryNote}
                                onChange={(e) => setSubCategoryNote(e.target.value)}
                                placeholder="Tambahkan catatan, konteks, atau instruksi khusus Gapura KPS..."
                                className={cn(
                                    "w-full min-h-[120px] p-4 rounded-xl resize-y",
                                    "bg-gray-50 border-2 border-gray-200",
                                    "focus:outline-none focus:border-[var(--brand-primary)] focus:ring-4 focus:ring-brand-primary/10",
                                    "transition-all duration-200 font-sans text-sm text-gray-900 placeholder:text-gray-400"
                                )}
                            />
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <PrismButton 
                        variant="ghost" 
                        onClick={onClose}
                        type="button"
                        disabled={loading}
                    >
                        Cancel
                    </PrismButton>
                    <PrismButton 
                        type="submit" 
                        form="triage-form"
                        disabled={!targetDivision || loading}
                        isLoading={loading}
                        rightIcon={<ArrowRight size={18} />}
                    >
                        Dispatch Report
                    </PrismButton>
                </div>
            </div>
        </div>,
        document.body
    );
}
