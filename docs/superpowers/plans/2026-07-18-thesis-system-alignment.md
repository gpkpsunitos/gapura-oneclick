# Skripsi System-Alignment Revision Implementation Plan

Date: 18 July 2026  
Design: `docs/superpowers/specs/2026-07-18-thesis-system-alignment-design.md`  
Source: `/Users/nrzngr/Downloads/Skripsi_Infinite_Loop.docx`  
Output root: `output/skripsi-system-alignment/`

## Execution Rules

- Never overwrite the source DOCX.
- Do not modify application, ML, RAG, or live Supabase data/schema.
- Use the live Supabase project only for read-only schema metadata.
- Keep OS, OP, HT, UQ, and OT separately named but document identical behavior.
- Keep OCS separate.
- Remove HC and Eskalasi from the research actor model.
- Preserve signed front matter, institutional formatting, and unrelated academic content.
- Add genuine Word comments for material factual corrections.
- Author every replacement diagram as native Draw.io and verify its export visually.
- Do not ship a DOCX until every rendered page has been inspected.

## Task 1: Establish the revision workspace and source baseline

Inputs:

- `/Users/nrzngr/Downloads/Skripsi_Infinite_Loop.docx`
- current Gapura OneClick workspace;
- audited ML and RAG repositories;
- live Supabase project `iahgbzjdnfbtlrizottx`.

Actions:

1. Create the output, extraction, diagram-source, diagram-export, render, and QA directories.
2. Copy the source DOCX to a revision working copy without modifying the original.
3. Record source hash, size, section count, paragraph count, table count, image count, comments, tracked changes, fields, and rendered page count.
4. Extract a structured paragraph/table/image inventory with stable indexes.
5. Map chapter headings, captions, and the 12 diagram locations.
6. Render the untouched source and retain contact sheets as an internal baseline.

Verification:

- source and working-copy hashes match before editing;
- all 136 baseline pages render;
- signed front-matter pages are recorded for later visual comparison.

## Task 2: Build the implementation traceability matrix

Actions:

1. Map every material system claim in the abstract, BAB I-IV, tables, captions, and conclusions to current code or reproducible test evidence.
2. Classify each claim as accurate, inaccurate, unsupported, outdated, or scope-dependent.
3. Record the exact replacement text and the Word comment rationale.
4. Cover at minimum:
   - actor/access model;
   - Google-Sheets-first report submission;
   - Supabase synchronized application database/read model;
   - Google Drive evidence ledger;
   - Supabase Storage final report documents;
   - application-managed bcrypt/JWT/database sessions;
   - report/public submission behavior;
   - ML endpoint contracts and metrics;
   - RAG session, quota, retrieval, and source/page evidence;
   - limitations in document-level RAG authorization;
   - actual build, lint, unit, ML, and RAG test evidence.
5. Identify claims that should be removed instead of rewritten.

Verification:

- no material replacement lacks a code/test/source reference;
- no thesis claim is upgraded beyond verified evidence.

## Task 3: Read the live Supabase schema for ERD and LRS

Actions:

1. Use the Supabase plugin to query public-schema tables read-only.
2. Retrieve table names, descriptions, columns, data types, nullability, primary keys, unique constraints, foreign keys, and referenced columns.
3. Select the thesis-relevant core subset, expected to include users, stations, ground-handling reports, report comments, evidence sessions/files, security sessions, audit logs, AI audit/cache records, report documents, division documents, and supporting lookup tables where an actual relationship exists.
4. Exclude tables that do not contribute to the thesis data model or would make the A4 diagram unreadable.
5. Save a sanitized schema inventory without credentials, API keys, or row contents.

Verification:

- every ERD/LRS relationship exists in live constraint metadata or is explicitly labeled as a logical application association;
- primary keys, foreign keys, nullability, and cardinalities agree with the live schema;
- no database mutation tool is called.

## Task 4: Build the Chen-notation ERD in Draw.io

Files:

- `diagrams/source/01-erd-chen.drawio`
- `diagrams/export/01-erd-chen.png`

Actions:

1. Create rectangles for the selected entities.
2. Create diamonds with relationship verbs for actual relationships.
3. Create ovals for selected thesis-relevant attributes.
4. Underline primary-key attributes.
5. Apply Chen multivalued/derived notation only when justified by the schema.
6. Label cardinality and participation from FK, uniqueness, and nullability metadata.
7. Use a landscape canvas and group related domains to minimize connector crossings.
8. Export at sufficient resolution for A4 insertion.

Verification:

- native Draw.io source opens successfully;
- all Chen notation rules are satisfied;
- no connector crosses a label or entity;
- no text overflows;
- the exported figure remains legible at final DOCX width.

## Task 5: Build the LRS in Draw.io

Files:

- `diagrams/source/02-lrs.drawio`
- `diagrams/export/02-lrs.png`

Actions:

1. Create relational-table boxes from the same Supabase schema snapshot.
2. Show primary keys, selected columns, foreign keys, and referenced targets.
3. Use consistent table widths, row heights, and key markers.
4. Route FK connectors outside table interiors and labels.
5. Keep the LRS semantically equivalent to the ERD while using relational notation.

Verification:

- ERD entities and LRS tables have a documented mapping;
- key/relationship parity matches Supabase metadata;
- no clipping, line overlap, or unreadably dense table box occurs.

## Task 6: Rebuild the remaining ten diagrams in Draw.io

Files:

- `03-architecture.drawio`;
- `04-use-case.drawio`;
- `05-activity-login.drawio`;
- `06-activity-report-submission.drawio`;
- `07-activity-staff-approval.drawio`;
- `08-activity-ai-analysis.drawio`;
- `09-sequence-login.drawio`;
- `10-sequence-report-submission.drawio`;
- `11-sequence-staff-approval.drawio`;
- `12-sequence-ai-analysis.drawio`;
- corresponding high-resolution PNG exports.

Actions:

1. Use OS, OP, HT, UQ, and OT as separately named actors with equal connections.
2. Keep OCS separate.
3. Omit HC and Eskalasi.
4. Show Google Sheets first and Supabase synchronization second in report submission.
5. Show Google Drive evidence and the distinct Supabase Storage final-document path.
6. Show actual application-managed login/session flow.
7. Show current AI/RAG orchestration without unsupported authorization claims.
8. Use restrained colors, consistent typography, proportional shapes, and orthogonal routing.

Verification for every diagram:

- validate native `.drawio` structure;
- export through Draw.io Desktop CLI;
- inspect full-resolution output;
- reject line/shape overlap, text overflow, clipped labels, uneven spacing, ambiguous arrows, and poor A4 readability.

## Task 7: Apply the factual prose and table revisions

Target:

- a working copy under the output root.

Actions:

1. Revise the Indonesian and English abstracts consistently.
2. Revise BAB I problem, solution, objectives, scope, and limitations.
3. Revise BAB II terminology only where it is tied to an inaccurate implementation claim.
4. Revise BAB III requirements, actor access, non-functional values, API specifications, database/storage design, implementation narrative, test methodology, and maintenance guidance.
5. Revise BAB IV conclusions and limitations so they match verified results.
6. Update all affected tables without changing unrelated formatting.
7. Remove HC and Eskalasi references from the research actor model.
8. Preserve separate OS, OP, HT, UQ, and OT names with identical documented behavior.
9. Insert comments at each material correction anchor.

Verification:

- paired Indonesian/English statements remain equivalent;
- no excluded role remains in actor/access claims;
- no umbrella `DIVISI_OPERASIONAL` label is introduced;
- every material correction has one concise, non-duplicative comment.

## Task 8: Replace figures and synchronize document navigation

Actions:

1. Replace the 12 original system diagrams with verified Draw.io exports.
2. Preserve caption numbering and caption styles.
3. Keep each caption paired with its figure.
4. Update figure-list entries, table-list entries, page references, and internal cross-references.
5. Update fields or materialize display text only where necessary for deterministic rendering.
6. Keep the existing application screenshots unless a caption/text claim around them is inaccurate.

Verification:

- all 12 replacement figures are embedded exactly once;
- all captions and references resolve to the correct figure;
- no stale figure title or page number remains.

## Task 9: Validate comments and DOCX structure

Actions:

1. Confirm `comments.xml`, relationships, content types, comment IDs, ranges, and references are valid.
2. Extract a comment report containing anchor snippets and comment text.
3. Confirm there are no orphan comment markers.
4. Audit headings, sections, images, tables, fields, footnotes, and document relationships.
5. Scan for placeholders, tool tokens, accidental paths, secrets, and internal notes.

Verification:

- all comments are structurally valid and anchored;
- Word/LibreOffice can open the file without repair warnings;
- the original signed front matter remains unchanged.

## Task 10: Full render-and-inspect loop

Actions:

1. Render the revised DOCX to PNGs using the bundled document renderer.
2. Generate four-page contact sheets for navigation.
3. Inspect every page at full size, including front matter, tables, figures, references, and final pages.
4. Inspect every diagram page again at the size used in the thesis.
5. Correct and rerender any overflow, overlap, clipping, blank-page anomaly, broken table, caption separation, font substitution, or page-number issue.
6. Repeat until the complete document passes.

Verification:

- rendered page count is plausible relative to source and explained by revised content;
- every page has been visually inspected;
- no diagram violates the proportionality/overlap/overflow requirements;
- no layout regression exists in signed front matter.

## Task 11: Final factual and artifact verification

Actions:

1. Re-run repository tests needed to substantiate retained test claims.
2. Re-query live Supabase metadata for ERD/LRS parity without changing data.
3. Compare source and final DOCX hashes and front-matter image/page baselines.
4. Verify all 12 Draw.io sources open and all exports exist.
5. Produce the final DOCX and diagram-source deliverables only.

Completion output:

- `Skripsi_Infinite_Loop_Selaraskan_Sistem.docx`;
- `Gapura_System_Diagrams.drawio` or an equivalent clearly named native Draw.io source set;
- no QA intermediates unless requested.
