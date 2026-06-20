/**
 * Auth module exports
 *
 * Centralized authentication utilities for the IRRS application.
 *
 * Key exports:
 * - authGuard: Main middleware function for protecting API routes
 * - withAuth: Higher-order function for wrapping API handlers
 * - requireAuth: Simplified auth check for protected routes
 * - isProtectedRole/isProtectedDivision: Helper functions for checking auth requirements
 * - skipAuth: Helper for identifying public paths
 */

// Main guard functionality
export {
    authGuard,
    withAuth,
    requireAuth,
    isProtectedRole,
    isPublicDivisionRole,
    isProtectedDivision,
    skipAuth,
    getSessionFromRequest,
    unauthorizedResponse,
    forbiddenResponse,
    verifySession,
} from './guard';

