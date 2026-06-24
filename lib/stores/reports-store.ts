import type { Report } from '@/types';

const DB_NAME = 'gapura-reports-cache';
const STORE_NAME = 'reports';
const DB_VERSION = 1;
const CACHE_KEY = 'current';
const STALE_THRESHOLD_MS = 30 * 60 * 1000;
const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024;

interface CachedPayload {
  key: string;
  data: Report[];
  cacheVersion: number;
  integrity: string;
  userId: string;
  timestamp: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getReportsCache(userId: string): Promise<CachedPayload | null> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    const result = await new Promise<CachedPayload | null>((resolve, reject) => {
      const req = store.get(CACHE_KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });

    db.close();

    if (!result) return null;

    if (result.userId !== userId) {
      await clearReportsCache();
      return null;
    }

    return result;
  } catch {
    return null;
  }
}

export async function setReportsCache(
  data: Report[],
  cacheVersion: number,
  integrity: string,
  userId: string
): Promise<boolean> {
  try {

    const estimatedSize = JSON.stringify(data).length * 2;
    if (estimatedSize > MAX_PAYLOAD_BYTES) {
      console.warn(`[ReportsStore] Payload too large (${(estimatedSize / 1024 / 1024).toFixed(1)}MB), skipping IndexedDB cache`);
      return false;
    }

    const db = await openDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const payload: CachedPayload = {
      key: CACHE_KEY,
      data,
      cacheVersion,
      integrity,
      userId,
      timestamp: Date.now(),
    };

    await new Promise<void>((resolve, reject) => {
      const req = store.put(payload);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    db.close();
    return true;
  } catch (err) {
    console.warn('[ReportsStore] Failed to write IndexedDB cache:', err);
    return false;
  }
}

export async function clearReportsCache(): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    db.close();
  } catch {

  }
}

export function isCacheStale(timestamp: number): boolean {
  return Date.now() - timestamp > STALE_THRESHOLD_MS;
}

export async function verifyCacheIntegrity(data: Report[], expectedHash: string): Promise<boolean> {
  try {
    const serialized = JSON.stringify(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(serialized));
    const computed = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return computed === expectedHash;
  } catch {
    return false;
  }
}
