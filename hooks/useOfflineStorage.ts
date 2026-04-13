/**
 * @file useOfflineStorage.ts
 *
 * @deprecated Hook ini menggunakan database IndexedDB terpisah (`gapura-offline`)
 * yang TIDAK diintegrasikan dengan sistem offline queue utama.
 *
 * Gunakan API dari `@/lib/pwa/offline-queue` sebagai pengganti:
 *   - `queueOfflineReport()` — untuk menambahkan laporan ke antrean
 *   - `processOfflineQueueWithEvents()` — untuk memproses antrean
 *   - `refreshOfflineQueueSummary()` — untuk mendapatkan ringkasan antrean
 *
 * File ini akan dihapus di versi mendatang setelah semua konsumen dimigrasi.
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Data offline untuk disimpan di IndexedDB
 * @interface OfflineData
 * @deprecated
 */
interface OfflineData {
  /** ID unik item */
  id: string;
  /** Tipe data offline */
  type: 'report' | 'upload' | 'update';
  /** Data yang disimpan */
  data: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  /** Timestamp pembuatan */
  timestamp: number;
}

/**
 * @deprecated Gunakan `@/lib/pwa/offline-queue` sebagai pengganti.
 *
 * Contoh migrasi:
 * ```ts
 * // ❌ Lama
 * const { saveForLater, pendingCount } = useOfflineStorage();
 *
 * // ✅ Baru
 * import { queueOfflineReport, refreshOfflineQueueSummary } from '@/lib/pwa/offline-queue';
 * await queueOfflineReport({ kind, endpoint, uploadEndpoint, reportPayload, attachments });
 * ```
 */
export function useOfflineStorage() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingItems, setPendingItems] = useState<OfflineData[]>([]);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    loadPendingItems();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const openDatabase = useCallback(() => {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('gapura-offline', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('pending-actions')) {
          db.createObjectStore('pending-actions', { keyPath: 'id' });
        }
      };
    });
  }, []);

  const loadPendingItems = useCallback(async () => {
    try {
      const db = await openDatabase();
      const transaction = db.transaction('pending-actions', 'readonly');
      const store = transaction.objectStore('pending-actions');
      const request = store.getAll();

      request.onsuccess = () => {
        setPendingItems(request.result || []);
      };
    } catch (error) {
      console.error('Failed to load pending items:', error);
    }
  }, [openDatabase]);

  const saveForLater = useCallback(async (type: OfflineData['type'], data: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    try {
      const item: OfflineData = {
        id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        data,
        timestamp: Date.now()
      };

      const db = await openDatabase();
      const transaction = db.transaction('pending-actions', 'readwrite');
      const store = transaction.objectStore('pending-actions');
      
      await new Promise<void>((resolve, reject) => {
        const request = store.add(item);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      await loadPendingItems();

      // Register for background sync
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        // @ts-ignore — SyncManager type not in standard lib
        await registration.sync.register(`sync-${type}s`);
      }

      return item.id;
    } catch (error) {
      console.error('Failed to save for later:', error);
      throw error;
    }
  }, [openDatabase, loadPendingItems]);

  const removePendingItem = useCallback(async (id: string) => {
    try {
      const db = await openDatabase();
      const transaction = db.transaction('pending-actions', 'readwrite');
      const store = transaction.objectStore('pending-actions');
      
      await new Promise<void>((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      await loadPendingItems();
    } catch (error) {
      console.error('Failed to remove pending item:', error);
      throw error;
    }
  }, [openDatabase, loadPendingItems]);

  const clearAllPending = useCallback(async () => {
    try {
      const db = await openDatabase();
      const transaction = db.transaction('pending-actions', 'readwrite');
      const store = transaction.objectStore('pending-actions');
      
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      setPendingItems([]);
    } catch (error) {
      console.error('Failed to clear pending items:', error);
      throw error;
    }
  }, [openDatabase]);

  const syncNow = useCallback(async () => {
    if (!isOnline) {
      throw new Error('Cannot sync while offline');
    }

    for (const item of pendingItems) {
      try {
        let endpoint = '';
        let method = 'POST';
        let body: any = item.data; // eslint-disable-line @typescript-eslint/no-explicit-any

        switch (item.type) {
          case 'report':
            endpoint = '/api/reports';
            break;
          case 'upload':
            endpoint = '/api/uploads/batch';
            // For uploads, data should be FormData
            break;
          case 'update':
            endpoint = `/api/reports/${item.data.id}`;
            method = 'PATCH';
            break;
        }

        const response = await fetch(endpoint, {
          method,
          headers: item.type !== 'upload' ? { 'Content-Type': 'application/json' } : undefined,
          body: item.type === 'upload' ? body : JSON.stringify(body)
        });

        if (response.ok) {
          await removePendingItem(item.id);
          console.log(`Synced ${item.type}:`, item.id);
        } else {
          console.error(`Failed to sync ${item.type}:`, response.statusText);
        }
      } catch (error) {
        console.error(`Error syncing ${item.type}:`, error);
      }
    }
  }, [isOnline, pendingItems, removePendingItem]);

  return {
    isOnline,
    pendingItems,
    pendingCount: pendingItems.length,
    saveForLater,
    removePendingItem,
    clearAllPending,
    syncNow
  };
}
