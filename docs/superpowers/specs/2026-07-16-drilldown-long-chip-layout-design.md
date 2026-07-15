# Drilldown Long Chip Layout Design

## Goal

Prevent case-category and area/classification chips in `DrilldownDrawer` from being clipped or wrapping when their values are long. Preserve the existing visual language while giving each chip the maximum available horizontal space.

## Approved Layout

Use a dedicated full-width chip section below the Airline, Route, and Flight metadata.

- Keep Airline, Route, and Flight in the existing proportional metadata grid.
- Move the report category and each populated area-category chip out of that grid.
- Render every chip on its own full-width row.
- Keep each chip value on one line with `white-space: nowrap`.
- Let the chip occupy the record content width so values such as `Accuracy & Completeness of Service (Apron)` remain visible without colliding with the drawer edge.
- Preserve the existing category and area color tones, padding, rounded shape, label/value hierarchy, and source order.

## Responsive Behavior

The stacked layout applies at all drawer widths so behavior is predictable and does not depend on a breakpoint. Each chip is a block-width flex row with a fixed label segment and a flexible value segment.

The expected production labels fit within the drawer's content width. On narrower viewports, the chip value uses a restrained responsive font size between 10 and 12 pixels so the entire row scales proportionally without wrapping. No scrollbar, ellipsis, or hidden overflow is introduced.

## Component Scope

Only `components/chart-detail/DrilldownDrawer.tsx` changes.

- The metadata grid changes from six logical columns with a three-column chip group to three equal metadata columns.
- A new stacked chip container follows the metadata grid.
- The existing category chip and `areaCategoryItems` mapping are reused; data selection and tone helpers remain unchanged.
- Case Classification and Identification of Root detail cards remain unchanged because the requested issue concerns the chips above them.

No service, schema, API, or report-normalization changes are required.

## Data and Empty States

The report category chip continues to render with its resolved fallback value. Area-category chips render only when their current value is not `-`, matching existing behavior. If there are no populated area categories, only the report category row is shown.

## Accessibility

Chip text remains real selectable text. The single-line presentation does not truncate values or depend on a tooltip. The responsive lower font bound remains legible while the full-width row supplies most of the needed space.

## Verification

1. Run lint against the changed drawer component.
2. Verify a record with the long Apron value from the reference image.
3. Confirm every chip occupies its own row, remains single-line, and stays inside the card at the standard drawer width.
4. Confirm short category values and multiple area-category values preserve their colors and order.
5. Check a narrow viewport to ensure content remains single-line and the responsive type stays legible.
6. Confirm Airline, Route, Flight, detail cards, status form, evidence links, and row expansion are unaffected.
