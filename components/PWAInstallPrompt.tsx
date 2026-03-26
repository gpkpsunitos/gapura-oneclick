'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function getInitialInstalledState() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia('(display-mode: standalone)').matches;
}

function getInitialPlatform(): 'ios' | 'android' | 'desktop' | null {
  if (typeof navigator === 'undefined') {
    return null;
  }

  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
    return 'ios';
  }

  if (userAgent.includes('android')) {
    return 'android';
  }

  return 'desktop';
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(getInitialInstalledState);
  const [platform] = useState<'ios' | 'android' | 'desktop' | null>(getInitialPlatform);

  useEffect(() => {
    if (getInitialInstalledState() || getInitialPlatform() === 'desktop') {
      return;
    }

    // Check if prompt was dismissed before
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    const dismissedTime = dismissed ? parseInt(dismissed) : 0;
    const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

    // Show again after 7 days
    if (daysSinceDismissed < 7) {
      return;
    }

    const showTimer = window.setTimeout(() => {
      setShowPrompt(true);
    }, 10000);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.clearTimeout(showTimer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      if (platform === 'ios') {
        setShowPrompt(true);
      }
      return;
    }

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (isInstalled) return null;

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-emerald-100 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 backdrop-blur p-2 rounded-lg">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold">Install OneClick</h3>
                    <p className="text-sm text-white/90">Akses lebih cepat & offline</p>
                  </div>
                </div>
                <button
                  onClick={handleDismiss}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                  aria-label="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4">
              {platform === 'ios' ? (
                <div className="space-y-3 text-sm text-gray-700">
                  <p>Untuk menginstall aplikasi OneClick di iPhone/iPad:</p>
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Tap tombol <Share className="w-4 h-4 inline mx-1" /> Share di bawah</li>
                    <li>Scroll ke bawah, tap <strong>&quot;Add to Home Screen&quot;</strong></li>
                    <li>Tap <strong>&quot;Add&quot;</strong> di pojok kanan atas</li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-3 text-sm text-gray-700">
                  <p className="font-medium">Fitur yang didapat:</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 mt-1">✓</span>
                      <span>Akses cepat dari home screen</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 mt-1">✓</span>
                      <span>Bekerja offline</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 mt-1">✓</span>
                      <span>Tampilan full-screen seperti aplikasi</span>
                    </li>
                  </ul>
                </div>
              )}

              {platform !== 'ios' && deferredPrompt && (
                <button
                  onClick={handleInstallClick}
                  className="w-full mt-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold py-3 px-4 rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Install Sekarang
                </button>
              )}

              {platform !== 'ios' && !deferredPrompt && (
                <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Jika browser Anda mendukung instalasi, gunakan menu browser lalu pilih opsi install aplikasi.
                </p>
              )}

              <button
                onClick={handleDismiss}
                className="w-full mt-2 text-gray-500 hover:text-gray-700 text-sm py-2 transition-colors"
              >
                Nanti saja
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
