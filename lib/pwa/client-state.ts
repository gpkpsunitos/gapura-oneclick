"use client";

import {
  PWA_AUTH_SCOPE_KEY,
  PWA_DB_NAME,
  PWA_DYNAMIC_CACHE_PREFIXES,
  PWA_STORAGE_PREFIX,
  PWA_VERSION,
} from "@/lib/pwa/constants";

export function getPwaAuthScope() {
  if (typeof window === "undefined") {
    return "guest";
  }

  return localStorage.getItem(PWA_AUTH_SCOPE_KEY) || "guest";
}

export function setPwaAuthScope(scope: string) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(PWA_AUTH_SCOPE_KEY, scope || "guest");
}

export function buildPwaScopedStorageKey(base: string) {
  return `${PWA_STORAGE_PREFIX}:${PWA_VERSION}:${getPwaAuthScope()}:${base}`;
}

export function isPwaStorageKey(key: string) {
  return key.startsWith(`${PWA_STORAGE_PREFIX}:`);
}

export async function purgePwaClientState() {
  if (typeof window === "undefined") {
    return;
  }

  Object.keys(localStorage)
    .filter((key) => isPwaStorageKey(key))
    .forEach((key) => localStorage.removeItem(key));

  localStorage.removeItem(PWA_AUTH_SCOPE_KEY);

  if ("indexedDB" in window) {
    try {
      await new Promise<void>((resolve) => {
        const request = indexedDB.deleteDatabase(PWA_DB_NAME);
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
        request.onblocked = () => resolve();
      });
    } catch {
      // Ignore browsers that expose IndexedDB but cannot open its backing store.
    }
  }

  if ("caches" in window) {
    const cacheKeys = await caches.keys();
    await Promise.all(
      cacheKeys
        .filter((key) => PWA_DYNAMIC_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)))
        .map((key) => caches.delete(key))
    );
  }

  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: "PURGE_RUNTIME_CACHE" });
  }
}
