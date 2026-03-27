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

  // CRITICAL: Clear localStorage synchronously to ensure immediate UI state reset
  Object.keys(localStorage)
    .filter((key) => isPwaStorageKey(key))
    .forEach((key) => localStorage.removeItem(key));

  localStorage.removeItem(PWA_AUTH_SCOPE_KEY);
  sessionStorage.clear();

  // NON-BLOCKING: ServiceWorker, IndexedDB and Cache deletions
  // These are heavy and potentially slow, especially on Safari or if other tabs are open.
  // We don't await them to ensure the logout redirection happens instantly.
  
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: "PURGE_RUNTIME_CACHE" });
  }

  if ("indexedDB" in window) {
    // Fire-and-forget IndexedDB deletion
    try {
      indexedDB.deleteDatabase(PWA_DB_NAME);
    } catch {
      // Ignore background errors
    }
  }

  if ("caches" in window) {
    // Fire-and-forget cache deletions
    caches.keys().then((cacheKeys) => {
      Promise.all(
        cacheKeys
          .filter((key) => PWA_DYNAMIC_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)))
          .map((key) => caches.delete(key))
      ).catch(() => {
        // Ignore background errors
      });
    }).catch(() => {
      // Ignore background errors
    });
  }
}
