import type { Report } from '@/types';

const DB_NAME = 'gapura-reports-cache';
const STORE_NAME = 'reports';
const DB_VERSION = 1;
const CACHE_KEY = 'current';
const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 min
const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

interface CachedPayload {
  key: string;
  data: Report[];
  cacheVersion: number;
  integrity: string;
  userId: string;
  timestamp: number;
}

// Complexity: Time O(1) | Space O(1)
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

// Complexity: Time O(1) | Space O(N) where N = report count
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

    // Session-scoped: reject if userId mismatches (prevents cross-user data leak)
    if (result.userId !== userId) {
      await clearReportsCache();
      return null;
    }

    return result;
  } catch {
    return null;
  }
}

// Complexity: Time O(N) | Space O(N)
export async function setReportsCache(
  data: Report[],
  cacheVersion: number,
  integrity: string,
  userId: string
): Promise<boolean> {
  try {
    // Guard against oversized payloads
    const estimatedSize = JSON.stringify(data).length * 2; // rough UTF-16 estimate
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

// Complexity: Time O(1) | Space O(1)
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
    // Ignore — cache clear is best-effort
  }
}

// Complexity: Time O(1) | Space O(1)
export function isCacheStale(timestamp: number): boolean {
  return Date.now() - timestamp > STALE_THRESHOLD_MS;
}

// Complexity: Time O(N) | Space O(1)
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
