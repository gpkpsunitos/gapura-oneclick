/**
 * @file
 * 
 * File ini berisi konstanta-konstanta yang digunakan untuk fitur PWA (Progressive Web App),
 * mencakup nama database, storage key, event, dan konfigurasi cache.
 */

/**
 * Versi PWA
 */
export const PWA_VERSION = "2026-04-cachefix";

/**
 * Prefix untuk storage PWA
 */
export const PWA_STORAGE_PREFIX = "gapura-pwa";

/**
 * Nama database IndexedDB untuk PWA
 */
export const PWA_DB_NAME = `${PWA_STORAGE_PREFIX}-${PWA_VERSION}`;

/**
 * Versi database IndexedDB
 */
export const PWA_DB_VERSION = 1;

/**
 * Nama store untuk queue offline
 */
export const PWA_QUEUE_STORE = "report-queue";

/**
 * Key untuk scope autentikasi PWA di localStorage
 */
export const PWA_AUTH_SCOPE_KEY = `${PWA_STORAGE_PREFIX}:auth-scope`;

/**
 * Event untuk update queue offline
 */
export const PWA_QUEUE_EVENT = "gapura:pwa-queue-updated";

/**
 * Tag untuk Background Sync API
 */
export const PWA_SYNC_TAG = "gapura-report-queue";

/**
 * Rute halaman yang dapat di-cache oleh PWA
 */
export const PWA_CACHEABLE_PAGE_ROUTES = [
  "/",
  "/auth/login",
  "/auth/public-report",
  "/dashboard/employee/new",
];

/**
 * Path API readonly yang dapat di-cache
 */
export const PWA_READONLY_API_PATHS = [
  "/api/master-data",
  "/api/dashboards/filter-options",
];

/**
 * Matcher untuk path dokumen yang di-cache
 */
export const PWA_DOCUMENT_PATH_MATCHERS = [
  "/storage/v1/object/",
];

/**
 * Prefix untuk cache dinamis
 */
export const PWA_DYNAMIC_CACHE_PREFIXES = [
  "gapura-pages",
  "gapura-images",
  "gapura-documents",
  "gapura-readonly-apis",
  "gapura-rsc",
  "gapura-next-image",
];
