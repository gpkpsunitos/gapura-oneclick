"use client";

import { purgePwaClientState } from "@/lib/pwa/client-state";

// Performs a full logout: synchronously purges local PWA state then hard-redirects
// to the server-side logout endpoint which revokes the DB session and clears httpOnly cookies.
// Complexity: Time O(1) | Space O(1)
export function logoutWithPwaCleanup() {
    try {
        purgePwaClientState();
    } catch {
        // PWA cleanup is best-effort — never block logout
    }
    window.location.href = "/api/auth/logout";
}
