# Gapura Oneclick Complete Reports PDF Design

## Objective

Replace the overlapping `IRRS All Reports Export` PDF with a professional, Gapura-branded archive that includes every populated user-facing field for each report. The exported document must remain readable regardless of narrative length and must never clip or overlap content.

## Confirmed Visual Direction

The selected direction is Option A: structured detail sections for every report.

- Use the existing Gapura logo from `public/logo.png` in the top-left page header.
- Use `Gapura Oneclick All Reports Export` as the document title.
- Use `Gapura Oneclick - Internal operational document` in the footer.
- Retain the existing A4 landscape format.
- Use a restrained Gapura green accent, white page surface, dark text, light section backgrounds, and semantic status/severity badges.
- Repeat the compact brand header and footer on every generated page.

## Root Cause Being Corrected

The current exporter passes a potentially multi-line narrative to jsPDF but advances the vertical cursor by a fixed amount. It also checks for a page break before the record without calculating the record's rendered height. Long report text therefore overwrites its metadata and subsequent records.

The replacement must calculate wrapped text height before drawing it and paginate at section and line boundaries.

## Document Structure

### Export Header

The first page begins with:

1. Gapura logo at the top-left.
2. `Gapura Oneclick All Reports Export` at the top-right.
3. A compact subtitle identifying it as the complete operational report archive.
4. The applied export-filter summary.
5. The total report count.

Continuation pages repeat the logo and document title in a smaller header.

### Report Header

Every report starts with:

- sequential report number and total count;
- reference number or fallback identifier;
- report title or classification;
- status badge;
- severity badge;
- event date;
- branch and hub;
- airline, flight number, aircraft registration, and route when populated;
- area, specific location, and case classification when populated.

### Complete User-Facing Information

Every populated operational field is included exactly once under the following groups. Empty fields and duplicate aliases are suppressed.

1. **Report narrative:** report, title, description, chronology, accident/incident, and issue/breakdown descriptions.
2. **Classification and operational context:** main/category fields, subcategory, terminal/apron/general categories, business type, GSE/cargo/JOUMPA classification, domestic/international marker, delay code, delay duration, and primary tag.
3. **Root cause and response:** root cause aliases, immediate action, action taken, Gapura/KPS action, preventive action, case remarks, and final remarks.
4. **Flight and GSE details:** flight, aircraft, route, GSE name/number/type/requirements, and related flags.
5. **Customer and service details:** JOUMPA and corporate/non-corporate customer details, customer profile/background, service performance fields, satisfaction score, and satisfaction label.
6. **Investigation and validation:** investigator, manager, partner-response, and validation notes; escalation and target division.
7. **Evidence:** evidence URLs, partner evidence URLs, video URLs, supporting-evidence text, and attachment counts. Valid URLs are rendered as clickable PDF links.
8. **Comments:** commenter, timestamp, content, and attachment links in chronological order.
9. **Reporter and timeline:** reporter name/email, created/updated/resolved timestamps, SLA deadline, priority, source, and relevant source row label when it has user-facing meaning.

Internal-only data is omitted from the designed PDF: database user/station/unit/location IDs, evidence submission/file IDs, spreadsheet IDs, source fingerprints, raw sheet IDs, and sync-only metadata. This matches the approved preview's definition of complete operational information.

## Alias and Duplication Rules

The report schema contains several aliases for the same concept. The exporter resolves each concept to the first meaningful value and prints it once. Examples include:

- branch: `branch`, `reporting_branch`, `station_code`, station lookup, or `kode_cabang`;
- airline: `airlines`, `airline`, or `maskapai_lookup`;
- root cause: `root_cause`, `root_caused`, `identification_of_root`, or `issue_caused`;
- action: `action_taken`, `immediate_action`, or `gapura_kps_action_taken`;
- preventive remarks: `preventive_action`, `remarks_case`, `remarks_gapura_kps`, or `kps_remarks`.

Any remaining approved operational keys that are populated but are not covered by a known group are placed in an `Additional Information` section using a human-readable label. This prevents newly added business fields from disappearing from the export.

## Pagination Rules

- Reserve fixed top and bottom zones for the repeated header and footer.
- Measure every wrapped text block using jsPDF's line splitting and active line height before drawing.
- Keep short headings with at least the first content line.
- Keep compact fact grids together when they fit on a fresh page.
- Split long narratives, notes, comments, and link lists across pages at line boundaries.
- Add a `Report <reference> - Continued` marker when a report spans pages.
- Start a new report on the current page only when its header and minimum first section fit; otherwise add a page first.
- Draw page numbers after content generation so `Page X of Y` is accurate.
- Never truncate populated report content to force it onto a page.

## Logo Loading and Failure Behavior

The client-side exporter loads `/logo.png`, converts it to a data URL, preserves its aspect ratio, and passes it to jsPDF. If the image cannot be loaded, the export still succeeds with a text-only `Gapura Oneclick` brand header. A logo failure must not discard the user's PDF.

## Component Boundaries

Implementation remains in `lib/reports-export.ts` but separates PDF responsibilities into small helpers:

- normalize and group populated report fields;
- load the logo safely;
- measure and draw wrapped text;
- ensure vertical space and create continuation pages;
- draw the repeated page header/footer;
- draw facts, sections, evidence links, and comments;
- finalize page numbering.

No export-modal behavior, filtering logic, Excel export, DOCX export, API route, or report mutation changes.

## Accessibility and Print Quality

- Status and severity use both text and color; color is never the only indicator.
- Body text remains at a readable print size with consistent line height.
- Green and neutral text colors maintain sufficient contrast on white.
- URLs remain visible as text even when link annotations are unavailable.
- Logo dimensions preserve the source image proportions.

## Verification

1. Add focused tests for alias resolution, field grouping, duplicate suppression, unknown operational-field fallback, and internal-field exclusion.
2. Generate a deterministic fixture PDF containing short, multi-paragraph, and extremely long reports; evidence links; comments; and optional field groups.
3. Confirm extracted text contains every populated approved field exactly once.
4. Render the PDF pages to PNG with Poppler and visually inspect every page for overlap, clipping, broken glyphs, distorted logo proportions, and inconsistent spacing.
5. Verify a report can span multiple pages and the next report starts below the previous content.
6. Verify headers, footers, continuation labels, and `Page X of Y` on all pages.
7. Run focused lint and the production build.

## Non-Goals

- Changing report data or filter results.
- Embedding evidence image binaries in the PDF; the export provides labeled clickable links.
- Including private technical IDs or sync diagnostics in the operational document.
- Modifying the Excel or DOCX design in this change.

