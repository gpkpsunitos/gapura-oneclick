# OP Dashboard Tables and Charts Redesign

Date: 2026-06-15
Status: Approved design, pending implementation

## Objective

Redesign every table and chart in these OP dashboard tabs:

- Summary Report
- Service Quality Improvement
- GSE Performance
- Joumpa Service
- CGO Cargo Report
- Delay Code Report

The redesign must improve visual quality, readability, consistency, and interaction clarity without changing each tab's existing layout grid.

## Locked Constraints

1. Preserve every existing grid declaration, column ratio, panel order, breakpoint, and responsive stacking behavior.
2. Preserve existing data calculations, filters, drilldowns, pagination, expandable rows, AI analysis actions, QR actions, and external links.
3. Do not change chart meaning or replace chart types unless required to fix a readability defect.
4. Keep current panel heights unless content clipping requires a narrowly scoped correction.
5. Work with existing uncommitted changes. Do not revert unrelated user changes.

## Visual Direction

Use an "Aviation Console" visual language with balanced density:

- Operational, precise, and premium rather than decorative.
- White and soft slate surfaces.
- Deep teal as primary brand and data color.
- Amber as a restrained navigational or emphasis accent.
- Blue, cyan, and green for secondary data series.
- Rose only for negative or risk states.
- Rounded 16px panel frames with subtle borders and low elevation.
- Manrope for interface text and JetBrains Mono or tabular figures for dense numeric data.

## Shared Panel System

All chart and table panels should use one shared visual contract:

- `rounded-2xl` white surface.
- Subtle slate border or ring.
- Low, consistent shadow.
- Header height around 44px.
- Panel title uses compact semibold typography.
- Amber accent is limited to a small marker, not a heavy decorative stripe.
- Header actions remain right-aligned and keyboard accessible.
- Empty, loading, and error states use the same spacing and typography.

Existing grid containers remain unchanged. Shared panel styling may replace duplicated local class strings.

## Table System

### Density

Use balanced density:

- Body text: 13-14px.
- Header text: 11-12px, uppercase only where useful.
- Row padding: approximately 10px vertical and 12px horizontal.
- Detail tables may stay slightly denser when many columns are required.

### Structure

- Sticky headers remain.
- Header background uses deep teal or a muted teal-tinted surface with accessible contrast.
- Avoid heavy borders around every cell. Prefer subtle horizontal separators and selective vertical separation.
- Use soft zebra striping only on wide or dense tables.
- Hover state uses a pale teal surface without layout movement.
- Numeric cells use tabular figures and consistent alignment.
- Total columns receive stronger weight and a subtle tinted surface.
- Grouped labels retain row span behavior and use a quiet group background.
- Heatmap cells use a restrained single-hue teal scale with readable foreground text.
- Grand total rows use a distinct footer surface and top border.

### Interaction

- Clickable rows show pointer cursor and visible hover/focus states.
- Expand/collapse actions use consistent pill buttons with chevron and text.
- Pagination controls use 32-36px square buttons with disabled states.
- Status and trend meaning must include text or icon, not color alone.
- Horizontal scrolling remains available for wide tables.

## Chart System

### Palette

Primary chart sequence:

1. Deep teal
2. Cyan-blue
3. Emerald
4. Amber
5. Sky blue
6. Slate
7. Rose for negative states only

Charts must not use arbitrary per-tab palettes when the same semantic series appears elsewhere.

### Cartesian Charts

- Use subtle dashed horizontal gridlines.
- Remove unnecessary axis lines.
- Keep tick labels at readable size and weight.
- Use modest corner radius on bars.
- Show value labels where they do not collide.
- Long category labels should wrap, truncate with a tooltip, or use enough axis width.
- Hover cursor uses a low-opacity teal tint.

### Pie and Donut Charts

- Prefer donut presentation when it improves label clarity.
- Show aggregate total in the center where practical.
- Use external legend cards or a compact legend list.
- Legend entries include marker, label, value, and percentage.
- Slice labels should not overlap; hide low-value labels and preserve exact values in tooltip/legend.

### Tooltips

- One consistent rounded tooltip style.
- White surface, slate ring, restrained shadow.
- Clear label/value hierarchy.
- Colored marker plus text.
- Values use tabular figures.

### Accessibility

- Preserve or add chart `aria-label` and Recharts accessibility layers.
- Interactive chart elements remain keyboard discoverable where supported.
- Do not rely on red/green alone for meaning.
- Respect reduced-motion settings.

## Tab-Specific Scope

### Summary Report

- Redesign annual month tables, full-year comparison, category pivots, station/airline pivots, heatmaps, trend badges, and monthly trend chart.
- Preserve all asymmetric and two-column grids exactly.

### Service Quality Improvement

- Redesign horizontal bars, distribution charts, metric tables, detail Landside table, expanded detail surfaces, and Looker cards.
- Preserve current four-column and two-column section grids.

### GSE Performance

- Redesign monthly bar chart, category distribution, metric tables, detailed root-cause table, detail blocks, and pagination.
- Preserve current three-column and two-column grids.

### Joumpa Service

- Redesign horizontal bars, stacked bars, distribution charts, bar tables, matrix tables, voice summary, detail tables, and QR cards.
- Preserve all current four-column, two-column, and asymmetric grids.

### CGO Cargo Report

- Redesign bar charts, distribution charts, ranked tables, branch/airline heatmaps, area tables, root-cause tables, and detail report table.
- Preserve all existing two-column grids.

### Delay Code Report

- Redesign metric cards, bar charts, distribution charts, ranked tables, category pivots, severity heatmaps, and detail report table.
- Preserve existing three-column and two-column grids.

## Implementation Architecture

Create or extend shared dashboard primitives for:

- Panel frame and panel header.
- Chart tooltip.
- Chart palette and common axis/grid configuration.
- Table frame.
- Table header, row, numeric cell, total cell, and footer.
- Heatmap color resolver.
- Pagination controls.
- Expand action and detail block.
- Legend item or legend card.

Migrate each tab incrementally to these primitives while keeping tab-specific data assembly and grid markup in place. Avoid a single oversized abstraction that must understand every table shape.

## Verification

1. Run targeted ESLint on all changed tab and shared component files.
2. Run TypeScript/build verification.
3. Start local application and inspect all six tabs in the in-app browser.
4. Verify desktop widths near 1440px and 1920px.
5. Verify responsive stacking near 1024px, 768px, and 375px.
6. Confirm grid declarations and panel order match the pre-change implementation.
7. Exercise chart clicks, table row clicks, expand/collapse, pagination, AI buttons, QR modal, and external links.
8. Check sticky headers, horizontal scroll, tooltip readability, empty states, and no clipped labels.

## Out of Scope

- Dashboard navigation redesign.
- Filter behavior changes.
- Data-source or API changes.
- New analytics calculations.
- New dashboard sections.
- Reordering, resizing, or restructuring tab grids.
- Dark mode redesign beyond avoiding regressions in existing theme behavior.
