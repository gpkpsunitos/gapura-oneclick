/// <reference lib="webworker" />

import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  Serwist,
  StaleWhileRevalidate,
} from "serwist";
import {
  PWA_CACHEABLE_PAGE_ROUTES,
  PWA_DOCUMENT_PATH_MATCHERS,
  PWA_DYNAMIC_CACHE_PREFIXES,
  PWA_QUEUE_EVENT,
  PWA_READONLY_API_PATHS,
  PWA_SYNC_TAG,
} from "@/lib/pwa/constants";
import {
  getOfflineQueueSummary,
  processOfflineQueue,
} from "@/lib/pwa/offline-queue-core";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  precacheOptions: {
    cleanupOutdatedCaches: true,
    navigateFallback: "/offline",
    navigateFallbackDenylist: [/^\/api\//, /^\/_next\//],
  },
  runtimeCaching: [
    {
      matcher: ({ sameOrigin, request, url }) =>
        sameOrigin &&
        request.mode === "navigate" &&
        PWA_CACHEABLE_PAGE_ROUTES.includes(url.pathname),
      handler: new NetworkFirst({
        cacheName: "gapura-pages",
        networkTimeoutSeconds: 3,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 16,
            maxAgeSeconds: 7 * 24 * 60 * 60,
          }),
        ],
      }),
    },
    {
      matcher: /\/_next\/static\/.+\.(?:js|css)$/i,
      handler: new CacheFirst({
        cacheName: "gapura-next-static",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 128,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          }),
        ],
      }),
    },
    {
      matcher: /\/_next\/image\?url=.+$/i,
      handler: new StaleWhileRevalidate({
        cacheName: "gapura-next-image",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 64,
            maxAgeSeconds: 7 * 24 * 60 * 60,
          }),
        ],
      }),
    },
    {
      matcher: ({ sameOrigin, url }) =>
        sameOrigin && PWA_READONLY_API_PATHS.includes(url.pathname),
      handler: new NetworkFirst({
        cacheName: "gapura-readonly-apis",
        networkTimeoutSeconds: 4,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 8,
            maxAgeSeconds: 24 * 60 * 60,
          }),
        ],
      }),
    },
    {
      matcher: ({ request, sameOrigin, url }) => {
        if (request.method !== "GET") {
          return false;
        }

        return (
          request.destination === "image" ||
          (sameOrigin && /\.(?:png|jpg|jpeg|svg|webp|gif|ico)$/i.test(url.pathname))
        );
      },
      handler: new StaleWhileRevalidate({
        cacheName: "gapura-images",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 96,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          }),
        ],
      }),
    },
    {
      matcher: ({ request, url }) => {
        if (request.method !== "GET") {
          return false;
        }

        return (
          request.destination === "document" ||
          /\.(?:pdf|doc|docx|xls|xlsx|ppt|pptx)$/i.test(url.pathname) ||
          PWA_DOCUMENT_PATH_MATCHERS.some((matcher) => url.pathname.includes(matcher))
        );
      },
      handler: new CacheFirst({
        cacheName: "gapura-documents",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 64,
            maxAgeSeconds: 14 * 24 * 60 * 60,
          }),
        ],
      }),
    },
  ],
});

serwist.addEventListeners();

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    void self.skipWaiting();
  }

  if (event.data?.type === "PURGE_RUNTIME_CACHE") {
    event.waitUntil(
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => PWA_DYNAMIC_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)))
            .map((key) => caches.delete(key))
        )
      )
    );
  }

  if (event.data?.type === "SYNC_REPORT_QUEUE") {
    event.waitUntil(syncOfflineQueue());
  }
});

self.addEventListener("sync", (event) => {
  if (event.tag === PWA_SYNC_TAG) {
    event.waitUntil(syncOfflineQueue());
  }
});

async function syncOfflineQueue() {
  await processOfflineQueue();
  const summary = await getOfflineQueueSummary();
  const clients = await self.clients.matchAll({ type: "window" });

  clients.forEach((client) => {
    client.postMessage({
      type: PWA_QUEUE_EVENT,
      summary,
    });
  });
}
