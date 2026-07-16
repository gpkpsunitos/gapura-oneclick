# Final Report Documents in Supabase Design

## Objective

Persist the exact document users finish editing in the last step of report creation. Every finalized Ground Handling Irregularity and JOUMPA report must have one canonical DOCX/PDF pair stored in private Supabase Storage. Authenticated users who can view the report can download either stored file from the active report detail dialog.

The stored files must contain the final editor values and signature. They must not be regenerated later from the original report submission or from dashboard-normalized fields.

## Current State and Gap

`DocumentEditorStep` owns the editable document state for the newer Ground Handling Irregularity and JOUMPA flows. The legacy public wizard has an equivalent inline final editor. The current behavior has four gaps:

- PDF export only downloads a browser-generated file and never persists it.
- DOCX persistence occurs only when an eligible user clicks Download Word.
- The existing document upload route stores files through the Google Drive evidence workflow rather than Supabase Storage.
- The active detail surface, `AppleReportDetail`, has no canonical DOCX/PDF download actions.

Consequently, clicking Finish can discard the final document edits, and report details cannot reliably retrieve the document users actually completed.

## Confirmed Product Decisions

- Clicking Finish is the canonical save boundary.
- Finish must store both DOCX and PDF before the wizard closes or resets.
- The two files are generated from the same frozen final edit snapshot and signature.
- Immediate Download DOCX and Download PDF actions remain available in the editor.
- The feature applies to Ground Handling Irregularity and JOUMPA report creation in public and internal modes.
- Stored files are private and are downloadable later only by authenticated users authorized to view the report.
- Legacy reports without a stored document bundle show a safe unavailable state.

## Chosen Approach

Generate both files in the final-step browser from the current editor state, then upload the pair through a secured application API. This reuses the existing client-side DOCX and PDF renderers and preserves exactly what the user sees and signs.

Server-side regeneration was rejected because it would require a larger renderer rewrite and introduces a second interpretation of the final editor state. Regenerating files only when they are downloaded was rejected because template changes could alter old reports and would not preserve the original finalized artifacts.

## Canonical Snapshot and Generation

Finish captures one immutable snapshot before any asynchronous work begins:

- a deep copy of the current `docEdits` value;
- the current signature data URL;
- the report ID and report type;
- a client-generated revision ID.

The DOCX and PDF generators both receive that same snapshot and signature. Neither generator may re-read React state after capture. This prevents an edit, render, or state update from producing mismatched formats.

`generateWord` continues to return a `Blob` and gains no new download behavior. `generatePDF` is extended to support the same return-blob and optional-download contract. Shared finalization code requests both blobs without triggering downloads, validates their MIME types and nonzero sizes, and sends them as one logical bundle.

The immediate download buttons generate local copies from the editor's current state. They do not determine which revision is canonical; only a successful Finish does that.

## Storage and Metadata Model

Create a private Supabase Storage bucket named `report-documents`. Files use immutable revision paths:

`<report-type>/<safe-report-id>/<revision-id>/<filename>`

Uploads never overwrite an existing object path. This prevents stale CDN results and makes replacement safe.

Add a `public.report_documents` table with one canonical row per report:

- `id uuid primary key`
- `report_type text` constrained to `IRREGULARITY` or `JOUMPA`
- `report_id text`
- `revision_id uuid`
- `docx_path text`, `docx_filename text`, `docx_mime_type text`, `docx_size_bytes bigint`, `docx_sha256 text`
- `pdf_path text`, `pdf_filename text`, `pdf_mime_type text`, `pdf_size_bytes bigint`, `pdf_sha256 text`
- `edited_snapshot jsonb`
- `signature_sha256 text null`
- `created_by uuid null` referencing `public.users(id)` with `ON DELETE SET NULL`
- `created_at timestamptz` and `updated_at timestamptz`
- a unique constraint on `(report_type, report_id)`

`edited_snapshot` stores the structured fields used for both files. The raw signature data URL is not duplicated into Postgres; only its hash is stored because the signature is already embedded in both artifacts.

The table has RLS enabled. Direct privileges for `anon` and `authenticated` are revoked. Storage and metadata access occurs only through server routes using the service role after application-level authorization.

## Finalization API

Add a multipart finalization endpoint that receives:

- report type and report ID;
- revision ID;
- serialized edited snapshot and signature hash;
- one DOCX file;
- one PDF file;
- either the normal authenticated session or a public-creation finalization token.

Before writing, the endpoint validates:

- the caller is allowed to finalize the named report;
- the report exists and the report type matches;
- both required files are present;
- extensions and MIME types match DOCX and PDF;
- each file is nonzero and no larger than 20 MB, and the serialized edited snapshot is no larger than 256 KB;
- the supplied revision and snapshot are well formed.

The server computes file hashes rather than trusting client-provided hashes.

The endpoint uploads both objects to new immutable paths. Only after both uploads succeed does it upsert the canonical `report_documents` row. If either upload or the metadata write fails, it deletes any newly uploaded object and leaves the previous canonical row unchanged. After a successful pointer switch, prior revision objects are deleted on a best-effort basis. Cleanup failure is logged but does not invalidate the new canonical pair.

The response returns success and non-sensitive metadata. It never returns service credentials or a permanent public object URL.

## Public Creation Authorization

Public report creators do not have an authenticated application session, so successful public Ground Handling Irregularity and JOUMPA creation responses also return a short-lived signed finalization token. The token is restricted to:

- one report type;
- one report ID;
- the final-document write operation;
- a 30-minute expiration window.

The token can be retried during its validity window so transient upload failures do not destroy the user's work. It cannot read documents, update report fields, finalize another report, or authorize a later detail download.

Internal creation uses the existing session cookie and verifies that the user may access the created report. Both public and internal creation responses must expose the stable report identifier needed by the final editor. JOUMPA flows currently missing that identifier must retain it before entering the last step.

## Editor User Flow

1. The user edits fields and signature on the last step.
2. The user may download local DOCX or PDF copies without finishing.
3. The user clicks Finish.
4. Finish changes to `Saving final documents...`; document actions are disabled to prevent concurrent revisions.
5. The client freezes the current snapshot and signature and generates both blobs.
6. The client submits the bundle to the finalization API.
7. On success, the existing finish callback closes, resets, or advances the parent flow.
8. On failure, the editor remains open with all edits and signature intact and displays an actionable retry message.

Finish never silently falls back to closing without persistence. A repeated click is guarded synchronously as well as through the disabled state.

The existing offline queued path does not reach a server-backed final document editor because it has no persisted report ID. This feature does not change offline queue behavior; the storage guarantee applies to online creation flows that reach the final editor with a stable report ID.

## Report Detail Downloads

Add a compact DOCX button and PDF button near the report heading in `AppleReportDetail`. The buttons are driven by canonical document metadata, not by evidence URLs.

The detail surface requests metadata for the report type and ID. When a canonical pair exists, both buttons are enabled. While a file is downloading, its button shows a loading state and prevents duplicate requests. Failures display an accessible error without closing the report dialog.

For a legacy report with no canonical bundle, both controls remain visible but disabled and show `Documents not available` through supporting text or an accessible tooltip.

Download endpoints accept the report type, report ID, and requested format. They:

1. verify the normal authenticated session;
2. apply the same report-view authorization used by report details;
3. load the canonical storage path from `report_documents`;
4. download the object server-side from the private bucket;
5. return it with the stored MIME type and `Content-Disposition: attachment` filename.

The endpoints never regenerate a document from report data and never expose a stable public Storage URL.

## Component Boundaries

- `DocumentEditorStep` owns editor controls and Finish state but delegates generation/upload orchestration to a shared finalization helper.
- The legacy inline final editor uses the same helper so it cannot diverge from the newer component.
- The document generators only render blobs or optionally download them; they do not know about authentication, Supabase, or report APIs.
- The finalization route owns validation, hashing, private uploads, canonical pointer replacement, and cleanup.
- A server-side report-document service owns Supabase metadata and Storage operations.
- A shared authorization function is used by document metadata/download routes and existing report-detail access so permissions cannot drift.
- `AppleReportDetail` owns button presentation and download feedback; it does not construct Storage URLs.

## Error Handling and Consistency

- Generation failure: no upload starts; preserve the editor and allow retry.
- One file missing or invalid: reject before Storage writes.
- First upload succeeds and second fails: delete the first new object.
- Both uploads succeed and database upsert fails: delete both new objects and retain the prior canonical row.
- Canonical switch succeeds and old cleanup fails: serve the new pair and log cleanup for maintenance.
- Metadata exists but an object is missing: return a not-found error, keep the modal open, and do not regenerate a substitute.
- Session expires during download: return `401`; insufficient report access returns `403`; no canonical bundle returns `404`.

## Verification

### Generator tests

- PDF generation can return a nonempty PDF blob without initiating a browser download.
- DOCX and PDF filenames are stable and safe.
- The same frozen snapshot is passed to both renderers.

### Finalization API tests

- Accept a valid authenticated bundle and a valid report-scoped public token.
- Reject missing files, swapped formats, invalid MIME types, oversized files, expired tokens, and tokens scoped to another report.
- Compute and store server-side hashes.
- Preserve an existing canonical row when either upload or the database write fails.
- Replace both canonical paths together on a successful later revision.
- Clean up partial and superseded objects as designed.

### Document fidelity tests

- Put distinctive marker text into edited header fields, officers, chronology, root cause, corrective action, preventive action, and reporter identity.
- Add a signature.
- Finalize the report, download both stored objects, and extract their text to confirm every marker appears in DOCX and PDF.
- Render the saved DOCX and PDF and visually confirm the signature and layout in both.
- Confirm neither download changes when the underlying report row is subsequently edited.

### Authorization and UI tests

- Cover public and internal Ground Handling Irregularity and JOUMPA finalization.
- Confirm Finish remains on the editor after failure and succeeds only after both files are canonical.
- Confirm authorized report viewers can download both files from `AppleReportDetail`.
- Confirm unauthorized viewers cannot read metadata or either object.
- Confirm legacy reports show disabled document controls.
- Run focused lint, TypeScript checks, relevant unit tests, and a production build.

## Non-Goals

- Editing stored documents from the report detail dialog.
- Publishing permanent public document URLs.
- Treating DOCX/PDF files as evidence attachments.
- Backfilling historical reports by regenerating files from old report data.
- Retaining a user-visible document revision history; only the current canonical pair is exposed.
- Redesigning the report document template beyond changes required to return blobs reliably.
