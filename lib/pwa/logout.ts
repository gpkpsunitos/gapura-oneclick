"use client";

import { purgePwaClientState } from "@/lib/pwa/client-state";

export async function logoutWithPwaCleanup() {
  try {
    // Start PWA cleanup (synchronous parts run immediately, asynchronous parts in background)
    purgePwaClientState();
  } finally {
    // Redirect immediately to server-side logout to flush cookies and trigger Clear-Site-Data
    window.location.href = "/api/auth/logout";
  }
}
