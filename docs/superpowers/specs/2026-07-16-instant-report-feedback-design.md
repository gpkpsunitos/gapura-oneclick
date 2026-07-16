# Instant Report Feedback Design

## Problem

`ReportDetailModal` opens from a summary `Report` object, then starts a separate request to `/api/reports/[id]/comments`. That request verifies the session, checks access, resolves legacy and stable report identifiers, and finally queries `report_comments`. The dialog therefore renders before its feedback thread and users wait roughly three to four seconds for comments to appear.

## Goal

The report-detail dialog must continue to open immediately, with the report's existing comments and system feedback present on its first render. Comments must remain correctly scoped to the selected report and refresh after comment or status mutations.

## Design

Report collection responses that feed `ReportDetailModal` will preload comments before the client can select a report. A shared server-side enrichment helper will:

1. collect the stable IDs, sheet IDs, and original IDs for the returned reports;
2. fetch matching `report_comments` rows in one batched query, including author details;
3. group the rows by every valid report identifier; and
4. attach an ordered `comments` array to each report.

The helper will be applied to the collection boundaries that directly feed modal-opening rows: `/api/reports`, `/api/admin/reports`, the `recentReports` section of `/api/admin/stats`, and the synchronized report collection returned by `/api/joumpa`. Server-rendered `initialReports` supplied to division dashboards will use the same helper after role and branch filtering. Drilldown pages inherit the behavior from `/api/admin/reports`. It will not run one query per report. Analytics-only responses that never open report details will remain unchanged.

`ReportDetailModal` will treat `initialReport.comments` as first-render data. The dedicated comments endpoint will remain available for background revalidation and for refreshes after a comment or status update. When revalidation succeeds, it replaces the preloaded snapshot. When it fails, the dialog retains the preloaded thread rather than clearing it.

## Data Flow

1. A report-list request retrieves the authorized report summaries.
2. The server performs one additional batched comments query for those summaries.
3. The client receives each report with its `comments` array, including an empty array when no feedback exists.
4. Selecting a report opens `ReportDetailModal`; `AppleReportDetail` displays the supplied comments in the same render as the dialog.
5. Background revalidation updates the thread if newer comments exist.

## Authorization and Isolation

Comment enrichment runs only after the existing role and station filters have produced the authorized report set. The comments query is restricted to identifiers from that set. Grouping must use exact identifiers and deduplicate comment IDs so legacy references do not duplicate a comment or associate it with another report.

## Error Handling

If batch comment loading fails, the report collection still loads and records the failure server-side. The modal falls back to its existing per-report request. This degraded path may show a loading state, but it avoids making the reports page unavailable because feedback enrichment failed.

If background revalidation fails after the dialog opens, the preloaded comments remain visible.

## Testing

Verification will cover:

- batched enrichment attaches chronologically ordered comments to the correct stable, sheet, or original report identifier;
- duplicate identifiers do not duplicate comments;
- reports without comments receive an empty array;
- the modal's first render includes preloaded feedback and does not briefly show the empty state;
- switching between reports does not display the previous report's comments;
- failed background refreshes preserve preloaded comments;
- lint and TypeScript/build checks pass for the changed files.

## Out of Scope

- visual redesign of the feedback panel;
- changing comment creation, notifications, or realtime behavior;
- delaying dialog opening behind a loading screen;
- prefetching one comments request per visible report.
