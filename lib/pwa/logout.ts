"use client";

import { performOptimisticLogout } from "@/lib/auth/client-logout";

// Performs a full logout with optimistic navigation to login while the server
// revokes the DB session and clears httpOnly cookies in the background.
// Complexity: Time O(1) | Space O(1)
export function logoutWithPwaCleanup() {
    performOptimisticLogout();
}
