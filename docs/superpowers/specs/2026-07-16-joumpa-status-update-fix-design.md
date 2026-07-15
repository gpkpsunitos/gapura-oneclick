# JOUMPA Report Status Update Fix

## Problem

The shared analyst report list combines ground-handling and JOUMPA reports and sends status changes for both sources to `PATCH /api/reports/[id]`. The shared report lookup can read JOUMPA rows from `joumpa_reports_sync`, but `ReportsService.updateReport` resolves only a ground-handling `original_id` and writes through the primary ground-handling spreadsheet. JOUMPA rows have a deterministic UUID and `sheet_id`, but no `original_id`, so the update returns `null` and the route responds with `Report not found or update failed`.

The status modal also submits `remarks_by`, while the JOUMPA sync table and sheet mapping do not currently persist that field.

## Considered Approaches

### 1. Fall back from `original_id` to `sheet_id`

Rejected. This would get past identifier resolution, but the existing writer uses the primary ground-handling spreadsheet ID. A JOUMPA reference such as `Form Responses 1!row_49` belongs to a different spreadsheet, so this approach changes the 404 into a wrong-target or missing-sheet failure.

### 2. Update only `joumpa_reports_sync`

Rejected. The periodic JOUMPA synchronizer pulls Google Sheets into Supabase before pushing local changes. A database-only update can therefore be overwritten by the next pull before it reaches the source sheet.

### 3. Add a source-aware JOUMPA dual-write path

Selected. Detect a JOUMPA row by querying `joumpa_reports_sync`, validate and translate the supported update fields, update the dedicated JOUMPA Google Sheet, and then update the Supabase mirror. This preserves the existing ground-handling path and keeps the two JOUMPA stores aligned immediately.

## Design

### Database

Add a nullable `remarks_by text` column to `public.joumpa_reports_sync` through a versioned Supabase migration. The table already has RLS enabled and the application write uses the existing server-only service-role client, so no new public policy or grant is required.

### JOUMPA mapping

Add `remarks_by` to the shared JOUMPA header candidates using `Remarks By`. Parsing the sheet will populate the Supabase field when the column exists, and building sheet values will write it back. If the live sheet does not contain the header, database persistence still succeeds without modifying unrelated columns.

### Update service

Add a focused `JoumpaSyncService.updateReport(id, updates)` method:

1. Resolve the row by UUID or `sheet_id` from `joumpa_reports_sync`.
2. Whitelist the fields needed by the shared status flow: `status`, `action_taken`, `final_remarks`/`kps_remarks`, and `remarks_by`.
3. Fetch the dedicated JOUMPA header row and update only columns that exist for the target row.
4. Update the Supabase row with the normalized values and a fresh `synced_at` timestamp after the sheet write succeeds.
5. Return the updated row. Return `null` only when the ID is not a JOUMPA row; throw a descriptive error for sheet or database write failures.

Writing the sheet first avoids claiming success in Supabase when the source-of-truth write failed. A database failure after a successful sheet write is surfaced as an error; the next scheduled pull repairs the mirror from the sheet.

### Report API routing

Before invoking the existing ground-handling writer, attempt the JOUMPA update path for records identified as JOUMPA. Ground-handling updates continue through `ReportsService.updateReport` unchanged. The existing authorization, required-field validation, status comments, notifications, and metadata persistence remain in the shared route.

The route should preserve the actual update error message instead of collapsing JOUMPA write failures into a misleading 404.

## Verification

- Unit-test JOUMPA ID resolution by UUID and `sheet_id`.
- Unit-test status field aliasing so both `final_remarks` and `kps_remarks` remain consistent.
- Verify a ground-handling ID still selects the existing writer.
- Run targeted lint and TypeScript checks.
- Apply the migration to the linked Supabase project, run database advisors, and query `information_schema.columns` to confirm `remarks_by` exists.
- Perform a non-destructive read verification of a JOUMPA row after deployment. Do not alter a production report solely for testing.

## Scope

No backfill is required. Existing JOUMPA rows keep `remarks_by = null` until edited. There is no UI redesign, no role-policy change, and no change to the ground-handling spreadsheet format.
