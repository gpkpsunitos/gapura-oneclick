"use client";

import {
  PWA_QUEUE_EVENT,
  PWA_SYNC_TAG,
} from "@/lib/pwa/constants";
import { getPwaAuthScope } from "@/lib/pwa/client-state";
import {
  enqueueOfflineReport,
  getOfflineQueueSummary,
  processOfflineQueue,
  toOfflineAttachments,
  type EnqueueOfflineReportInput,
} from "@/lib/pwa/offline-queue-core";

function dispatchQueueUpdate(summary: Awaited<ReturnType<typeof getOfflineQueueSummary>>) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(PWA_QUEUE_EVENT, { detail: summary }));
}

export async function refreshOfflineQueueSummary() {
  const summary = await getOfflineQueueSummary();
  dispatchQueueUpdate(summary);
  return summary;
}

export async function queueOfflineReport(
  input: Omit<EnqueueOfflineReportInput, "scope" | "attachments"> & { attachments: File[] }
) {
  const item = await enqueueOfflineReport({
    ...input,
    scope: getPwaAuthScope(),
    attachments: toOfflineAttachments(input.attachments),
  });

  await refreshOfflineQueueSummary();
  await registerOfflineSync();
  return item;
}

export async function processOfflineQueueWithEvents() {
  const result = await processOfflineQueue();
  await refreshOfflineQueueSummary();
  return result;
}

export async function registerOfflineSync() {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("SyncManager" in window)
  ) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync?.register(PWA_SYNC_TAG);
  } catch {
    // The queue still works without Background Sync.
  }
}
