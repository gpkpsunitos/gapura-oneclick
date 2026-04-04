/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi fungsi logout dengan cleanup PWA untuk membersihkan state lokal saat logout.
 */

"use client";

import { purgePwaClientState } from "@/lib/pwa/client-state";

/**
 * Melakukan logout dengan cleanup PWA
 * Membersihkan state PWA secara sinkron dan redirect ke server-side logout
 * @throws Tidak melempar error, error ditangani secara internal
 */
export async function logoutWithPwaCleanup() {
  try {
    // Start PWA cleanup (synchronous parts run immediately, asynchronous parts in background)
    purgePwaClientState();
  } finally {
    // Redirect immediately to server-side logout to flush cookies and trigger Clear-Site-Data
    window.location.href = "/api/auth/logout";
  }
}
