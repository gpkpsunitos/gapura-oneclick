# Skripsi System-Alignment Revision Design

Date: 18 July 2026  
Status: Approved by user  
Source document: `/Users/nrzngr/Downloads/Skripsi_Infinite_Loop.docx`  
Approach: Strict implementation-aligned revision with Word comments and editable Draw.io diagrams

## Objective

Revise the existing 136-page thesis so that its system descriptions, actors, access model, data flow, APIs, storage model, diagrams, testing claims, limitations, and conclusions match the audited Gapura OneClick, machine-learning, and Gapura RAG implementations. Preserve the university template, signed front matter, chapter structure, citations, and formal layout while adding a review trail through genuine Word comments.

## Source-of-Truth Policy

Implementation claims are resolved against the current repositories and reproducible local evidence. When the implementation supports only a prototype behavior, the thesis must describe that behavior as a prototype and must not promote a planned architecture or target control to an implemented production capability.

The revision uses these rules:

- describe implemented behavior directly;
- distinguish tested local behavior from deployment assumptions;
- remove claims that cannot be traced to code, checked-in schema, live read-only observations, or reproducible tests;
- retain model metrics only when their dataset, procedure, and result remain traceable;
- preserve research intent without inventing functionality;
- explain material corrections through anchored Word comments.

## Actor Model

The research actor model contains:

- `STAFF_CABANG`;
- `MANAGER_CABANG`;
- `DIVISI_OS`;
- `DIVISI_OP`;
- `DIVISI_HT`;
- `DIVISI_UQ`;
- `DIVISI_OT`;
- `DIVISI_OCS`;
- `ANALYST`;
- `SUPER_ADMIN`;
- a public reporter only where the public submission flow is documented.

OS, OP, HT, UQ, and OT remain separately named roles. They receive the same documented features, permissions, and workflow, but the thesis does not introduce an umbrella label such as `DIVISI_OPERASIONAL`.

`DIVISI_OCS` remains a separate workspace and actor. `DIVISI_HC` and `DIVISI_ESKALASI` are removed from the research requirements, access tables, diagrams, narratives, and conclusions. Legacy code constants for excluded roles are not presented as research actors; when necessary for audit accuracy, they are described as legacy or outside the evaluated scope.

## Factual System Architecture

The revised thesis describes the current implementation as follows:

1. Gapura OneClick is a Next.js application that validates credentials against application-managed user records.
2. Passwords are hashed, sessions use signed JWT cookies, and session state/revocation is backed by PostgreSQL tables.
3. A new irregularity report is appended to Google Sheets first.
4. The resulting report identity and metadata are synchronized into `ground_handling_irregularity_report` in Supabase PostgreSQL for application reads, filtering, comments, dashboards, metadata, and related features.
5. Supabase is not described as the report write-first system of record.
6. Report evidence is uploaded to Google Drive, while Supabase stores the evidence ownership and linking ledger.
7. Canonical generated report DOCX/PDF bundles use the separate Supabase Storage/report-document flow.
8. The ML service reads operational report data and provides classification, forecasting, seasonality, risk scoring, similarity, and recommendations according to the endpoints actually present.
9. OneClick authenticates and rate-limits Virtual Assistant requests before proxying them to Gapura RAG.
10. Gapura RAG performs ingestion, chunking, embedding, Pinecone retrieval, reranking, and grounded generation with source/page evidence.
11. The thesis does not claim document-level role/division authorization because that authorization is not encoded in current RAG chunk metadata.

## Access and API Alignment

Role and API tables are rewritten from actual route behavior. The revision must address at least:

- authenticated versus public report submission;
- staff ownership visibility;
- manager station scope;
- the equal documented capabilities of OS, OP, HT, UQ, and OT;
- the distinct OCS workspace;
- analyst and super-admin visibility;
- AI endpoints that use a single narrative versus aggregate overview endpoints;
- the current GET alias behavior of `/api/ai/analyze-all`;
- authenticated Virtual Assistant access and daily quota;
- the absence of implemented admin master-data mutations;
- the actual evidence and document upload paths;
- the implemented session duration rather than the seven-day target;
- audit claims limited to events actually logged.

Unsupported access or security behavior is documented as a limitation instead of being presented as implemented.

## Draw.io Diagram Set

The following existing figures are rebuilt as native editable Draw.io diagrams and re-exported for the DOCX:

1. Entity Relationship Diagram Sistem;
2. Logical Record Structure Sistem;
3. Arsitektur Sistem dan Integrasi Pipeline AI;
4. Use Case Diagram Keseluruhan Sistem;
5. Activity Diagram: Login;
6. Activity Diagram: Pengajuan Laporan;
7. Activity Diagram: Persetujuan Staf;
8. Activity Diagram: Analisis AI;
9. Sequence Diagram: Login;
10. Sequence Diagram: Pengajuan Laporan;
11. Sequence Diagram: Persetujuan Staf;
12. Sequence Diagram: Analisis AI.

OS, OP, HT, UQ, and OT appear as separately named actors where actor-level detail is required and share identical connections. OCS appears separately. HC and Eskalasi do not appear.

The architecture and report-submission diagrams show Google Sheets first, Supabase synchronization second, Google Drive evidence, and the separate Supabase Storage final-document flow. The ERD and LRS use the current application tables and omit invented relationships.

## Diagram Quality Gate

Every diagram must satisfy all of these conditions before insertion:

- native `.drawio` source opens successfully in Draw.io;
- exported image contains the complete canvas;
- node sizes and spacing are proportional;
- alignments and margins are consistent;
- connectors use deliberate orthogonal routing where appropriate;
- no line crosses a node label or passes through a shape;
- connector labels have clear space;
- arrowheads do not collide with node borders or text;
- no text is clipped, truncated, or overflowing;
- font sizes and line weights remain readable at the final A4 document width;
- dense diagrams are reorganized rather than shrunk into illegibility;
- the rendered DOCX page has no overlap, clipping, or unexpected page break around the figure and caption.

Draw.io Desktop CLI is used to export high-resolution images from the validated native sources. The editable Draw.io source is retained as a final companion artifact.

## DOCX Editing Policy

The source file is never overwritten. A revised copy is created in the workspace output area.

Edits are localized and preserve:

- signed and stamped front matter;
- title and institutional template;
- authorship and identity fields;
- section geometry, margins, headers, footers, and page-number conventions;
- heading hierarchy and chapter organization;
- references that remain valid;
- existing screenshots that accurately show the current application.

The revision covers the abstract, BAB I-IV, requirements, roles, non-functional targets, API specifications, database/storage tables, implementation narrative, test results, maintenance guidance, limitations, conclusions, figure captions, table captions, lists, and cross-references wherever the factual model changes.

Visible prose is clean rather than redlined. Genuine Word comments are anchored beside every material factual correction. Each comment briefly states the prior mismatch, the verified implementation behavior, and the reason for the revision. Minor grammar or pagination corrections do not require repetitive comments.

## Testing and Evidence Policy

The testing section distinguishes between:

- successful production build/type generation;
- focused OneClick unit tests;
- OneClick lint failures or warnings that remain at the audited commit;
- focused ML tests;
- ML standalone component execution and its environment qualifiers;
- full ML pytest-discovery errors caused by the standalone script naming/fixture mismatch;
- the reproducible Gapura RAG `44/44` test result;
- manual black-box scenarios, which must not be described as automated proof unless an equivalent suite exists.

Model metrics remain only when the document records the relevant dataset snapshot, evaluation procedure, and limitations. Results from a synthetic sample run are not substituted for thesis dataset metrics.

## Document QA

Verification occurs in this order:

1. Extract and inventory all paragraphs, tables, images, fields, captions, comments, and sections.
2. Build a claim-to-code traceability list for every corrected section.
3. Generate and validate all Draw.io sources.
4. Export and visually inspect every diagram before DOCX insertion.
5. Apply prose, table, caption, cross-reference, and diagram replacements to a copy.
6. Add and structurally validate genuine Word comments and anchors.
7. Update or materialize document fields as needed for deterministic rendering.
8. Render the complete revised DOCX to page PNGs.
9. Inspect every rendered page at full size for overflow, overlap, broken tables, misplaced figures, font substitution, and header/footer drift.
10. Iterate until all pages pass visual review.
11. Run structural checks for comments, images, headings, sections, tables, and internal placeholders.
12. Compare the final document against the source to confirm that signed front matter and unrelated content were preserved.

## Deliverables

- a revised `.docx` with genuine Word comments;
- editable native Draw.io source covering all rebuilt diagrams;
- diagram exports embedded in the DOCX;
- no code or live-database changes.

Internal render PNGs, temporary PDFs, extraction files, and builder scripts are QA artifacts and are not delivered unless requested.

## Completion Criteria

The work is complete only when:

- no system claim conflicts with the audited implementation without an explicit limitation or legacy qualifier;
- OS, OP, HT, UQ, and OT remain separately named with equal documented behavior;
- OCS remains separate;
- HC and Eskalasi are absent from the research actor model;
- all 12 rebuilt figures pass the diagram quality gate;
- material changes have anchored Word comments;
- all tables, captions, lists, and cross-references are synchronized;
- every rendered page has been visually inspected and contains no layout defect;
- the original source document remains unchanged.
