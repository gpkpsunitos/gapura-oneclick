
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { FileText, FileType, CheckCircle2, X } from 'lucide-react';
import { generatePDF, generateWord } from '@/lib/utils/document-generator';
import { Button } from '@/components/ui/button';

interface ReportDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: any;
  onFinished: () => void;
}

export function ReportDownloadModal({ isOpen, onClose, reportData, onFinished }: ReportDownloadModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
        >
          <div className="p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} className="text-green-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900">Laporan Berhasil Dikirim!</h2>
            <p className="text-gray-500">
              Laporan Anda telah tersimpan di sistem dan database. Anda dapat mengunduh salinan laporan ini.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <button
                onClick={() => generatePDF(reportData)}
                className="flex flex-col items-center justify-center p-4 rounded-xl bg-red-50 hover:bg-red-100 border-2 border-transparent hover:border-red-200 transition-all group"
              >
                <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <FileType size={24} className="text-red-600" />
                </div>
                <span className="font-semibold text-red-900">Download PDF</span>
                <span className="text-xs text-red-600/70 mt-1">Format .pdf</span>
              </button>

              <button
                onClick={() => generateWord(reportData)}
                className="flex flex-col items-center justify-center p-4 rounded-xl bg-blue-50 hover:bg-blue-100 border-2 border-transparent hover:border-blue-200 transition-all group"
              >
                <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <FileText size={24} className="text-blue-600" />
                </div>
                <span className="font-semibold text-blue-900">Download Word</span>
                <span className="text-xs text-blue-600/70 mt-1">Format .docx</span>
              </button>
            </div>
          </div>

          <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-center">
            <Button 
              variant="ghost" 
              onClick={onFinished}
              className="text-gray-500 hover:text-gray-900"
            >
              Tutup dan Kembali ke Dashboard
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
