# Analyst Report Status Fix

## Problem

Analyst OS cannot close some reports from `DrilldownDrawer`. Synced report data defaults a blank Google Sheets status to `OPEN`, but `getReportById` later overlays the blank live-sheet value. Status transition validation then rejects the empty current status.

The drawer also replaces the API response with a generic error, hiding the cause.

## Design

1. When a live Google Sheets row has a blank status, preserve the synced status or fall back to `OPEN`. Non-empty live statuses remain authoritative.
2. Permit status transitions for every defined application role except `STAFF_CABANG` and `MANAGER_CABANG`. Keep transition shape rules: open reports may progress or close, in-progress reports may close, and closed reports may reopen.
3. Return the API error message in `DrilldownDrawer`, with the existing generic message only as fallback.
4. Do not require a `Remarks By` sheet column to exist. Validation still requires the submitted value, while the sheet writer safely skips absent columns such as CGO's missing `Remarks By` header.

## Verification

- Unit-test role authorization and transition behavior.
- Type-check and targeted lint touched files.
- Re-read matching live `CGO!row_585` behavior: blank sheet status must resolve as `OPEN` before transition validation.

## Scope

No data backfill, schema migration, unrelated UI redesign, or changes to branch staff/manager permissions outside status updates.
