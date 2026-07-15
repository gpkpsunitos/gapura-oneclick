# Report Status UI Synchronization and Success Dialog

## Problem

The Analyst, OS, and OCS “All Reports” lists merge ground-handling reports from `/api/admin/reports` with JOUMPA reports from `/api/joumpa`. After a successful status update, their refresh function revalidates only the ground-handling cache. A JOUMPA row therefore keeps its previous status in the combined list until the page is fully reloaded.

The two status entry points also close silently after success:

- `Change Status` in `ReportsDetailTable`
- `Mark as Closed` in the report detail view

Users need immediate visible state synchronization and explicit confirmation that the update succeeded.

## Considered Approaches

### Revalidate only

Revalidate both SWR sources after every successful update. This is simple and correct, but the visible state waits for both network requests before it changes.

### Optimistic cache update only

Patch the current cache from the API response without revalidation. This is instant, but can preserve stale server-derived fields or drift if another writer changes the record.

### Optimistic update followed by parallel revalidation

Selected. Apply the successful API response to the relevant cache immediately, then revalidate the ground-handling and JOUMPA sources in parallel. The list updates without a full reload and is subsequently reconciled with server state.

## Design

### JOUMPA cache API

Change `useJoumpaReports` to expose both its memoized report list and its SWR mutation function. The Analyst, OS, and OCS dashboards will include this mutation in their shared refresh operation. Manual refreshes and post-status refreshes will therefore cover both sources.

### Post-save state flow

Each dashboard status handler will parse the existing `PATCH /api/reports/[id]` success response. The returned report will replace the matching row in any currently populated report cache. Both report sources and dashboard analytics will then revalidate in parallel. Errors continue to leave the existing row unchanged and use the current error display.

### Success dialog

Create a reusable `StatusUpdateSuccessDialog` rendered through a portal. It will use the existing report-dialog visual language: white surface, emerald confirmation mark, dark backdrop, restrained shadow, and compact typography.

The dialog will include:

- `Status Updated` heading
- the resulting status, such as `Closed` or `Open`
- a short confirmation that the report was updated successfully
- a `Done` button
- Escape, backdrop-click, focusable controls, `role="dialog"`, and `aria-modal="true"`

It will not auto-dismiss, so users have time to read the result.

### Entry points

`ReportsDetailTable` will open the success dialog after `onStatusUpdate` resolves, then close the editor.

`CloseReportDialog` will transition from its form state to the shared success dialog after its `onSubmit` promise resolves. This covers `Mark as Closed` from both modal and full-page report details without duplicating success state in every parent.

The success dialog must never appear when the API request, Google Sheets write, or Supabase write fails.

## Verification

- Unit-test cache row replacement for matching and non-matching report IDs.
- Verify both SWR sources are revalidated after a status update.
- Verify success confirmation appears after `Change Status` succeeds.
- Verify success confirmation appears after `Mark as Closed` succeeds.
- Verify failures keep the editing dialog open and show the existing error instead of success.
- Run targeted ESLint, TypeScript, and the production build.

## Scope

No backend schema or authorization changes are required. Existing status forms and validation remain unchanged. The work is limited to client cache synchronization and success confirmation behavior.
