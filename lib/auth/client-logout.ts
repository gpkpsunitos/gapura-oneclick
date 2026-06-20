"use client";

import { purgePwaClientState } from "@/lib/pwa/client-state";

const LOGOUT_ENDPOINT = "/api/auth/logout";
const LOGOUT_REDIRECT = "/auth/login?logout=1";
const LOGOUT_REQUEST_TIMEOUT_MS = 5000;

let logoutInFlight = false;

function navigateToLoggedOutPage() {
  window.location.replace(LOGOUT_REDIRECT);
}

async function requestLogout() {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), LOGOUT_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(LOGOUT_ENDPOINT, {
      method: "POST",
      cache: "no-store",
      credentials: "same-origin",
      keepalive: true,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
      },
      body: "{}",
    });

    return response.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function performOptimisticLogout() {
  if (logoutInFlight) return;
  logoutInFlight = true;

  try {
    purgePwaClientState();
  } catch {
    // PWA cleanup is best-effort and must not block logout.
  }

  try {
    const ok = await requestLogout();
    if (!ok) {
      window.location.replace(`${LOGOUT_ENDPOINT}?redirect=${encodeURIComponent(LOGOUT_REDIRECT)}`);
      return;
    }

    navigateToLoggedOutPage();
  } finally {
    logoutInFlight = false;
  }
}
