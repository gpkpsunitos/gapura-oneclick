# Close Report Dialog Design

## Problem

The `Mark as CLOSED` actions in `AppleReportDetail` and `AppleReportPage` submit only the report ID and the `CLOSED` status. The report APIs require Final Remarks and Remarks By when closing a report, so these actions fail instead of completing the workflow.

## Design

Create one shared close-report dialog used by both report-detail surfaces. Clicking `Mark as CLOSED` opens the dialog instead of sending an update immediately.

The dialog collects these required values:

- Final Remarks
- Remarks By division
- Remarks By name

Division and name are combined into the existing `"<division> - <name>"` Remarks By format. Submission passes the status, Final Remarks, and Remarks By through the existing status-update callbacks and API payloads.

## Component Boundaries

The shared dialog owns its form state, required-field validation, cancel behavior, loading state, and submission-error display. Its caller owns the actual update request and report refresh.

Both `AppleReportDetail` and `AppleReportPage` open the same dialog and provide an async close handler. This keeps the two UI surfaces consistent without duplicating form behavior.

## User Flow

1. The user clicks `Mark as CLOSED`.
2. The Close Report dialog appears.
3. The user enters Final Remarks, selects a division, and enters a name.
4. The confirm button remains disabled until all required fields are present.
5. On confirmation, the existing close-report request includes `finalRemarks` and `remarksBy`.
6. On success, the dialog closes and the report refreshes with status `CLOSED`.
7. On failure, the dialog stays open and displays the returned error so the user can retry.

## API Compatibility

No API schema change is required. The full-page action sends the existing admin PATCH fields, while the modal action forwards the existing `notes` and `StatusUpdateDetails` callback arguments expected by its parent dashboard.

## Verification

- Confirm both `Mark as CLOSED` buttons open the shared dialog.
- Confirm submission is blocked when any required field is missing.
- Confirm both update paths send Final Remarks and Remarks By.
- Confirm a successful request refreshes the report and closes the dialog.
- Confirm a failed request leaves the dialog open and shows an actionable error.
- Run focused ESLint and TypeScript checks for the touched components.
