# Design: Sub-Category Picker (Button Pills)

**Date:** 2026-02-19
**Status:** Approved

## Problem

The `focusedCategory` state in `AreaSubCategoryDetail` drives the Full Data Table but is invisible to users — it auto-sets to the top category with no UI to change it.

## Goal

Add a pill button row above the Full Data Table so users can pick any sub-category (or "All") and see the table update immediately.

## Scope

**Single file changed:** `components/charts/area-sub-category/AreaSubCategoryDetail.tsx`

Covers all three detail pages: terminal-area-category, apron-area-category, general-category.

## Design

### Pill row placement

Insert a new `<div>` containing the pill buttons between the Airline Contribution chart and the Full Data Table section.

### Pill set

- **"All" pill** — always first; `onClick` sets `focusedCategory('')`; active when `focusedCategory === ''`
- **One pill per entry in `categoryRanking`** — label: `{category} · {count.toLocaleString('id-ID')}`; `onClick` sets `focusedCategory(category)`; active when `focusedCategory === category`

### Active / inactive styles

| State    | Background   | Text       | Border        |
|----------|-------------|------------|---------------|
| Active   | `#6b8e3d`   | white      | none          |
| Inactive | white       | gray-600   | gray-200      |
| Hover    | gray-50     | gray-700   | gray-300      |

### Data flow

`focusedCategory` → `focusedReports` → `queryResult` → `<InvestigativeTable>` — no new state, no new memos, no data fetching.

### Default state

`focusedCategory` auto-initialises to `categoryRanking[0].category` (top category), so the first real category pill is active on load.

### Table heading

Already reads `Full Data Table — {focusedCategory}`. When "All" is selected it renders `Full Data Table` (clean, no trailing dash).
