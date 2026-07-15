# Analyst Reports Sidebar Active State

## Problem

Analyst navigation links to `/dashboard/analyst/reports`. That route redirects to
`/dashboard/analyst?view=reports`. The sidebar only recognizes query-based report
views for OP, OCS, and OS, so the base `/dashboard/analyst` link becomes active
and the Reports item loses its active state.

## Design

Replace the hard-coded report-view route list with structural matching:

- A navigation item ending in `/reports` is active when the current pathname is
  that item's base path and `view=reports` is present.
- A base dashboard navigation item is inactive while its matching report view is
  selected.
- Exact pathname matching remains unchanged for normal routes and for the brief
  `/reports` route before its redirect completes.
- Matching uses route structure, not labels or roles, so it applies to Analysts in
  every division and remains valid for future dashboard sections.

## Scope

Only sidebar active-state calculation changes. Destinations, redirects, page
content, permissions, mobile navigation, and report fetching remain unchanged.

## Verification

- `/dashboard/analyst` activates Dashboard.
- `/dashboard/analyst/reports` activates Reports.
- `/dashboard/analyst?view=reports` activates Reports and deactivates Dashboard.
- TypeScript and targeted ESLint pass.
- Production build or focused route smoke test confirms no navigation regression.
