"use client";

import { purgePwaClientState } from "@/lib/pwa/client-state";

export async function logoutWithPwaCleanup() {
  try {
    await purgePwaClientState();
  } finally {
    window.location.href = "/api/auth/logout";
  }
}
