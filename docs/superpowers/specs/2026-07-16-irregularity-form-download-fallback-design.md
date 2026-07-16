# Irregularity Form Download Fallback Design

## Goal

Allow authorized users to download a formatted irregularity report even when a report has no edited or finalized document bundle. The generated DOCX and PDF must use the existing Gapura `IRREGULARITY REPORT FORM` / `F-OP-02` design shown in the approved reference screenshots.

## Priority Rules

1. If a finalized document bundle exists, return the saved finalized DOCX or PDF unchanged.
2. If the requested finalized format does not exist, generate that format on demand from the report's stored information.
3. Generated fallback files are downloads only. They do not become edited or finalized documents and are not written to Supabase Storage.

## Form Design

Both fallback formats use the same content structure and visual hierarchy:

- Gapura Airport Services logo and centered `IRREGULARITY REPORT FORM` title.
- Header table: reference number, to, from, CC, subject, and attachment count.
- Section I: flight data.
- Section II: officers on duty.
- Section III: chronology of event.
- Section IV: potential/root causes.
- Section V: corrective actions.
- Section VI: preventive actions.
- Location, prepared date, prepared-by and acknowledged-by signature area.
- `F-OP-02` footer.

The existing application form generator is the source of truth for this layout. The implementation will extract reusable normalization and document-building boundaries so browser finalization and server fallback generation cannot drift unnecessarily.

## Data Mapping

The fallback generator loads the authorized report by report type and ID, then maps the fields already available on the report. The mapping uses the same aliases currently supported by single-report exports, including:

- Reference: `reference_number`, falling back to the report ID prefix.
- Occurrence date: `date_of_event`, `event_date`, `incident_date`, then `created_at`.
- Branch, airline, flight number, route, aircraft registration, gate/stand, delay, passenger and baggage values.
- Classification, severity, subject, description and chronology.
- Root cause, action taken and preventive action aliases.
- Reporter identity as the first officer when available.
- Evidence URL count as the attachment summary.

Unavailable values remain blank where the form is designed for optional input, or use `-` where the existing form expects a visible placeholder.

## Server Flow and Authorization

The existing report-document metadata endpoint will indicate availability per format. A format is downloadable when either a finalized object exists or the report can be converted to the irregularity form.

The existing authenticated download route remains the only entry point:

1. Validate report type, ID and requested format.
2. Reuse the current report-view authorization check.
3. Return the stored finalized object when present.
4. Otherwise load the report record, normalize it, generate the requested DOCX or PDF in memory, and return it with an attachment filename and private no-store headers.

Service-role access remains server-only. The fallback does not add client-side database access or broaden RLS policies.

## UI Behavior

The report detail view keeps both DOCX and PDF buttons enabled for an authorized report even when no finalized bundle exists. The UI may identify generated files as formatted report downloads, but downloading remains a single action. Existing loading and error states are retained.

## Error Handling

- Unauthorized or missing reports retain the current status behavior.
- A stored finalized file download failure is reported as an error; it does not silently replace an expected finalized file with a generated version.
- A fallback generation failure returns a server error and leaves the modal usable for retry.
- Missing individual report fields do not fail generation.

## Testing and Verification

- Unit-test field normalization and finalized-versus-fallback selection.
- Route-test authorization, response MIME types, filenames and cache headers.
- Generate fixture DOCX and PDF fallbacks from the same report and verify that both contain the same mapped values.
- Render both artifacts and visually inspect every page against the approved F-OP-02 form layout, including tables, pagination, signatures and footer.
- Run focused tests, TypeScript checking and a production build.

## Out of Scope

- Persisting generated fallback documents to Supabase Storage.
- Marking fallback files as edited, approved or finalized.
- Backfilling legacy reports with stored document bundles.
- Changing the report creation editor or its finalized-document persistence behavior.
