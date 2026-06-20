/**
 * @file
 * 
 * File ini berisi fungsi-fungsi client-side untuk manajemen queue offline,
 * mencakup event dispatching, registrasi sync, dan wrapper untuk fungsi core.
 */

"use client";

import {
  PWA_QUEUE_EVENT,
  PWA_SYNC_TAG,
} from "@/lib/pwa/constants";
import { getPwaAuthScope } from "@/lib/pwa/client-state";
import {
  EMPTY_OFFLINE_QUEUE_SUMMARY,
  enqueueOfflineReport,
  getOfflineQueueSummary,
  isIndexedDbUnavailableError,
  processOfflineQueue,
  toOfflineAttachments,
  type EnqueueOfflineReportInput,
} from "@/lib/pwa/offline-queue-core";

/**
 * Mengirim event update queue offline
 * @param summary - Ringkasan queue offline
 */
function dispatchQueueUpdate(summary: Awaited<ReturnType<typeof getOfflineQueueSummary>>) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(PWA_QUEUE_EVENT, { detail: summary }));
}

/**
 * Me-refresh ringkasan queue offline dan mengirim event update
 * @returns Ringkasan queue offline
 * @throws Error jika terjadi error selain IndexedDB unavailable
 */
export async function refreshOfflineQueueSummary() {
  try {
    const summary = await getOfflineQueueSummary();
    dispatchQueueUpdate(summary);
    return summary;
  } catch (error) {
    if (isIndexedDbUnavailableError(error)) {
      dispatchQueueUpdate(EMPTY_OFFLINE_QUEUE_SUMMARY);
      return EMPTY_OFFLINE_QUEUE_SUMMARY;
    }

    throw error;
  }
}

/**
 * Menambahkan laporan ke queue offline dengan file attachment
 * @param input - Input laporan offline (tanpa scope dan dengan File[] untuk attachments)
 * @returns Item queue offline yang baru dibuat
 * @throws Error jika IndexedDB tidak tersedia
 */
export async function queueOfflineReport(
  input: Omit<EnqueueOfflineReportInput, "scope" | "attachments"> & { attachments: File[] }
) {
  try {
    const item = await enqueueOfflineReport({
      ...input,
      scope: getPwaAuthScope(),
      attachments: toOfflineAttachments(input.attachments),
    });

    await refreshOfflineQueueSummary();
    await registerOfflineSync();
    return item;
  } catch (error) {
    if (isIndexedDbUnavailableError(error)) {
      throw new Error(
        "Penyimpanan offline tidak tersedia di browser ini. Sambungkan internet untuk mengirim laporan."
      );
    }

    throw error;
  }
}

/**
 * Memproses queue offline dengan event dispatching
 * @returns Hasil proses queue offline
 * @throws Error jika terjadi error selain IndexedDB unavailable
 */
export async function processOfflineQueueWithEvents() {
  try {
    const result = await processOfflineQueue();
    await refreshOfflineQueueSummary();
    return result;
  } catch (error) {
    if (isIndexedDbUnavailableError(error)) {
      dispatchQueueUpdate(EMPTY_OFFLINE_QUEUE_SUMMARY);
      return {
        processed: 0,
        synced: 0,
        failed: 0,
      };
    }

    throw error;
  }
}

/**
 * Meregistrasi Background Sync untuk queue offline
 * Tidak melakukan apa-apa jika browser tidak mendukung Background Sync
 */
export async function registerOfflineSync() {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("SyncManager" in window)
  ) {
    return;
  }

  try {
    const registration = (await navigator.serviceWorker.ready) as ServiceWorkerRegistration & {
      sync?: {
        register: (tag: string) => Promise<void>;
      };
    };
    await registration.sync?.register(PWA_SYNC_TAG);
  } catch {
    // The queue still works without Background Sync.
  }
}
