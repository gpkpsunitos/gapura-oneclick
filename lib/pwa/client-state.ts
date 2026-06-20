/**
 * @file
 * 
 * File ini berisi fungsi-fungsi utilitas untuk manajemen state client PWA, termasuk auth scope dan storage
 */

"use client";

import {
  PWA_AUTH_SCOPE_KEY,
  PWA_DB_NAME,
  PWA_DYNAMIC_CACHE_PREFIXES,
  PWA_STORAGE_PREFIX,
  PWA_VERSION,
} from "@/lib/pwa/constants";

/**
 * Mendapatkan scope autentikasi PWA saat ini
 * @returns Scope auth saat ini atau "guest" jika tidak ada
 */
export function getPwaAuthScope() {
  if (typeof window === "undefined") {
    return "guest";
  }

  return localStorage.getItem(PWA_AUTH_SCOPE_KEY) || "guest";
}

/**
 * Mengatur scope autentikasi PWA
 * @param scope - Scope auth yang akan disimpan (default: "guest")
 */
export function setPwaAuthScope(scope: string) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(PWA_AUTH_SCOPE_KEY, scope || "guest");
}

/**
 * Membuat storage key dengan scope PWA
 * @param base - Base key untuk storage
 * @returns Storage key yang sudah di-scope dengan version dan auth scope
 */
export function buildPwaScopedStorageKey(base: string) {
  return `${PWA_STORAGE_PREFIX}:${PWA_VERSION}:${getPwaAuthScope()}:${base}`;
}

/**
 * Memeriksa apakah storage key adalah key PWA
 * @param key - Storage key yang akan dicek
 * @returns true jika key adalah key PWA
 */
export function isPwaStorageKey(key: string) {
  return key.startsWith(`${PWA_STORAGE_PREFIX}:`);
}

export function purgePwaClientState() {
  if (typeof window === "undefined") {
    return;
  }

  const lsKeys = Object.keys(localStorage).filter((key) => isPwaStorageKey(key) || key === PWA_AUTH_SCOPE_KEY);
  const ssKeys = Object.keys(sessionStorage).filter(
    (key) => key.startsWith(PWA_STORAGE_PREFIX) || key.startsWith("gapura:pwa-")
  );

  if (lsKeys.length || ssKeys.length) {
    queueMicrotask(() => {
      lsKeys.forEach((key) => localStorage.removeItem(key));
      ssKeys.forEach((key) => sessionStorage.removeItem(key));
    });
  }

  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: "PURGE_RUNTIME_CACHE" });
  }

  if ("indexedDB" in window) {
    try {
      indexedDB.deleteDatabase(PWA_DB_NAME);
    } catch {
      // Ignore
    }
  }

  if ("caches" in window) {
    caches.keys().then((cacheKeys) => {
      Promise.all(
        cacheKeys
          .filter((key) => PWA_DYNAMIC_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)))
          .map((key) => caches.delete(key))
      ).catch(() => {
        // Ignore
      });
    }).catch(() => {
      // Ignore
    });
  }
}
