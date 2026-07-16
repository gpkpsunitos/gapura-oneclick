# Advanced Excel Export Design

## Objective

Upgrade every application-generated `.xlsx` workbook to use one polished Gapura Oneclick spreadsheet system while preserving each export's existing data, sheet purpose, and filename behavior. Flat datasets must behave as real spreadsheet tables with named table objects, built-in sort and filter controls, frozen headers, readable widths, and consistent visual styling.

## Scope

The redesign applies to every active Excel exporter in the application:

- All Reports export in `lib/reports-export.ts`
- Analyst analytics export in `lib/analyst-export.ts`
- Manager dashboard export in `lib/manager-dashboard-export.ts`
- Dashboard builder export in `lib/dashboard-export.ts`
- Division documents export in `lib/division-documents-export.ts`
- OCS records export in `components/dashboard/ocs/OCSRecordsTabs.tsx`

The analyst import page reads Excel files but does not generate them, so it is outside this styling change.

## Selected Direction

Use a hybrid shared design system:

- Flat data regions become native named Excel tables with filter buttons, sorting support, banded rows, and unique stable table names.
- Analytical and dashboard summary regions retain their existing section-based layouts but receive the same typography, colors, spacing, number formats, and grid behavior.
- A shared export-style module owns reusable workbook metadata, palette, borders, row treatments, column sizing, hyperlink styling, status/severity styling, and table creation. Exporters continue to own their data mapping and business-specific sheet structure.

This provides the closest reliable equivalent to the supplied table screenshot without flattening KPI or dashboard sheets into inappropriate single tables.

## Named Table and Sort/Filter Behavior

Each flat dataset must be written as a real Excel table object rather than a merely colored cell range. Every table must have:

- A unique workbook-safe name such as `AllReportsTable`, `AnalystReportDetails`, `StationPerformanceTable`, `DivisionDocumentsTable`, or a normalized OCS/dashboard table name.
- A header row with built-in filter dropdowns.
- Sorting support supplied by the spreadsheet application's standard table controls.
- Banded data rows.
- A table range that covers every exported record and column.
- No totals row unless the export already has a meaningful total.

The floating `Table1` label shown in the reference is spreadsheet-application UI, not content painted into a cell. The exported `.xlsx` will contain the underlying named table object. Excel exposes its name and table controls through the Table Design interface; compatible Google Sheets imports may expose their own table chip UI. The export must not fake the chip with merged cells or shapes.

For summary sheets containing multiple independent distributions, each distribution remains a styled section. Where a section is a rectangular dataset with headers, it may use its own uniquely named table if doing so does not disrupt merged section labels or KPI cards.

## Visual System

### Palette

- Primary table header: deep Gapura green `#276B57`
- Primary brand accent: emerald `#0F766E`
- Header text: white `#FFFFFF`
- Alternating row: soft green-gray `#F2F7F5`
- Base row: white `#FFFFFF`
- Main text: slate `#1E293B`
- Secondary text: muted slate `#64748B`
- Border: pale gray-green `#D8E3DF`
- Open status: amber treatment
- Closed status: green treatment
- Top risk / critical severity: red treatment
- High severity: orange treatment
- Medium severity: amber treatment
- Low severity: green treatment

### Typography and Alignment

- Use Aptos when supported, with Calibri-compatible sizing.
- Table headers are bold, white, vertically centered, wrapped, and centered unless a long narrative header is clearer left-aligned.
- Body rows are vertically top-aligned for multiline content and centered for concise identifiers, dates, statuses, and numeric values.
- Long narrative cells wrap without allowing extreme row heights.

### Sheet Presentation

- Hide gridlines on exported sheets.
- Freeze the table header and any title/metadata rows above it.
- Use one restrained branded title treatment where the current sheet already has a title or summary header.
- Preserve existing sheet names and sheet ordering.
- Add worksheet auto-filter only through named tables for table-backed regions; avoid overlapping duplicate filter ranges.
- Set print orientation and repeated header rows where appropriate for wide report sheets.

## Column and Value Handling

- Dates must be real JavaScript `Date` values with an Excel number format such as `dd mmm yyyy`, not locale-formatted strings.
- Percentages must be numeric fractions with percentage number formats when they represent ratios.
- Counts and numeric metrics remain numeric.
- Identifiers such as report references, flight numbers, station codes, and document IDs remain text.
- Evidence, material, report, recording, and document URLs must be clickable hyperlinks with readable labels where practical.
- Narrative, remarks, report, root-cause, action, participant, and link columns receive capped widths and wrapping.
- Concise categorical columns receive smaller fixed ranges.
- Column sizing is content-aware within explicit minimum and maximum widths; no unbounded sheet-wide autofit.

## Exporter-Specific Treatment

### All Reports

Keep the current single `All Reports` sheet and its filter metadata. Replace the plain data range with `AllReportsTable`. Use the complete existing exported column set, freeze the metadata plus table header, apply status/severity fills, preserve multiline evidence, and rename workbook branding from IRRS to Gapura Oneclick.

### Analyst Analytics

Preserve the summary, report-detail, and station-performance sheets. Restyle summary KPI/distribution sections consistently. Convert report detail and station performance datasets into named tables. Preserve numeric resolution metrics as numeric values with formats rather than strings.

### Manager Dashboard

Preserve the existing structured summary sheet and report-detail sheet. Normalize its current blue theme to the Gapura Oneclick green system. Keep summary sections intact and convert report detail into a named table with status/severity formatting.

### Dashboard Builder

Preserve one sheet per dashboard page and the existing tile order. Each tile's rectangular dataset receives a unique table name when the sheet layout permits non-overlapping table objects. Tile titles remain section bars above their tables. Freeze the page title area and apply consistent widths and typed values.

### Division Documents

Convert the full dataset into `DivisionDocumentsTable`, freeze the header, wrap descriptive fields, and make material links clickable. Use real dates.

### OCS Records

Convert each exported active-tab dataset into a uniquely named OCS table. Apply column behavior based on existing field type metadata: real dates, hyperlinks for URL fields, wrapped multiline text, and concise categorical widths.

## Shared Module Boundary

Create a focused Excel styling module under `lib/` that contains only spreadsheet presentation and workbook helpers. It must not know report-fetching rules or dashboard business logic. Expected responsibilities include:

- workbook metadata setup
- shared color and style constants
- worksheet grid/freeze/print setup
- safe worksheet and table name normalization
- named table construction
- header, body, hyperlink, status, and severity styling
- bounded column-width calculation
- typed date and percentage conversion helpers where shared behavior is safe

Each exporter remains responsible for selecting fields, mapping source objects to rows, and triggering the browser download.

## Error Handling

- Empty datasets still produce a valid styled workbook with a header-only named table when supported; otherwise they produce a clear empty-state row outside the table without throwing.
- Duplicate or invalid table names are normalized and made unique within the workbook.
- Invalid dates fall back to the original text value rather than becoming `Invalid Date`.
- Invalid or empty URLs remain plain text and never cause the export to fail.
- Styling failures must not silently omit business data.

## Verification

Implementation must include representative workbook fixtures covering:

- a long All Reports dataset with multiline narratives and links
- analyst summary/detail/performance sheets
- manager summary and report detail
- multi-tile dashboard pages
- division documents with multiple material links
- OCS date, multiline, and URL columns
- empty datasets

Verification must confirm:

- every flat dataset has a uniquely named native table
- filter controls and table ranges cover all records
- frozen panes start below the correct header row
- dates, percentages, and counts have typed values and correct number formats
- hyperlinks have valid targets
- no overlapping tables or duplicate names exist
- no `#REF!`, `#DIV/0!`, `#VALUE!`, `#NAME?`, or unintended `#N/A` values appear
- every generated sheet is rendered and visually inspected for clipped headers, excessive widths, unreadable fills, broken wrapping, or blank default sheets
- lint, TypeScript checks, focused tests, and the production build pass

## Non-Goals

- Changing exported business data or report filtering behavior
- Adding an Overview sheet to every workbook
- Replacing dashboard summary sections with one flattened table
- Reproducing a spreadsheet application's floating table-name chip as fake worksheet content
- Changing PDF or DOCX export behavior
- Adding charts where an export currently contains no chart
