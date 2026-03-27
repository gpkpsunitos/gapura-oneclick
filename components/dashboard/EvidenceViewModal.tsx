'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface EvidenceViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  evidenceUrls: string[];
}

export function EvidenceViewModal({ isOpen, onClose, evidenceUrls }: EvidenceViewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!isOpen) return null;

  const validUrls = evidenceUrls.filter((url) => url && typeof url === 'string');
  const hasMultiple = validUrls.length > 1;

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % validUrls.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + validUrls.length) % validUrls.length);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Evidence Photos</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-gray-50 relative min-h-[400px]">
            {validUrls.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <ImageIcon className="w-16 h-16 mb-4 text-gray-300" />
                <p>No evidence photos available.</p>
              </div>
            ) : (
              <div className="relative w-full h-full flex flex-col items-center justify-center group">
                {/* Main Image */}
                <div className="relative w-full h-[60vh] flex items-center justify-center bg-black/5 rounded-2xl overflow-hidden">
                  <img
                    src={validUrls[currentIndex]}
                    alt={`Evidence ${currentIndex + 1}`}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>

                {/* Controls */}
                {hasMultiple && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/80 hover:bg-white backdrop-blur-md rounded-full shadow-lg text-gray-800 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/80 hover:bg-white backdrop-blur-md rounded-full shadow-lg text-gray-800 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>

                    {/* Indicators */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-2 bg-black/20 backdrop-blur-md px-4 py-2 rounded-full">
                      {validUrls.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentIndex(idx)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            idx === currentIndex ? 'bg-white w-4' : 'bg-white/50 hover:bg-white/80'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="p-4 bg-white border-t border-gray-100 flex justify-end">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
