# Dashboard Foldering Refinement Design

**Date:** 2026-02-18
**Feature:** Refine and fix the foldering system on "Dashboard Tersimpan"
**Approach:** A — Bug fixes + inline folder actions

---

## Overview

The current foldering system has 3 bugs and 3 missing UX features. This design covers fixing all bugs and adding inline folder management within the existing bottom panel — no new modals or drag-and-drop libraries required.

---

## Section 1: Bug Fixes

### 1a. Inverted Chevron Icons
**File:** `app/dashboard/(main)/analyst/builder/page.tsx:144`
**Problem:** When a folder is expanded, `ChevronDown` is shown; when collapsed, `ChevronUp` is shown. This is backwards.
**Fix:** When expanded → show `ChevronUp` (click to collapse). When collapsed → show `ChevronDown` (click to expand).

### 1b. Folder Name Mismatch in Auto-Expand Logic
**File:** `app/dashboard/(main)/analyst/builder/page.tsx:34`
**Problem:** Auto-expand init loop uses key `'Uncategorized'`, but the grouping and toggle logic uses key `'Lainnya'`. Dashboards without a folder are never auto-expanded.
**Fix:** Change `'Uncategorized'` → `'Lainnya'` in the auto-expand initialization.

### 1c. Panel Starts Collapsed by Default
**File:** `app/dashboard/(main)/analyst/builder/page.tsx:18`
**Problem:** `savedExpanded` is initialized as `false`, so the entire "Dashboard Tersimpan" panel is hidden on load even when dashboards exist.
**Fix:** Change `useState(false)` → `useState(true)`.

---

## Section 2: Folder Autocomplete in SaveDashboardModal

**Files:** `components/builder/SaveDashboardModal.tsx`, `app/dashboard/(main)/analyst/builder/page.tsx`

- Add `existingFolders: string[]` prop to `SaveDashboardModal`
- Attach a `<datalist>` element to the folder `<input>` populated with `existingFolders`
- Native browser autocomplete — no library needed, still allows typing new folder names
- `page.tsx` derives unique folder names from `savedDashboards` and passes them down through `BuilderLayout` → `SaveDashboardModal`
- `BuilderLayout` also needs to accept and forward the `existingFolders` prop

---

## Section 3: Folder Rename & Delete (Inline on Folder Header)

**Files:** `app/dashboard/(main)/analyst/builder/page.tsx`, `app/api/dashboards/route.ts`

### Rename
- On folder header hover, a `Pencil` icon appears to the right of the folder name
- Clicking enters inline edit mode: folder name text becomes a focused `<input>` pre-filled with current name
- `Enter` or blur → calls PATCH API with `{ action: 'rename', oldFolder, newFolder }` to bulk-update all dashboards
- `Escape` → cancels, restores original name
- Updates local `savedDashboards` state optimistically

### Delete
- On folder header hover, a `Trash2` icon appears next to the pencil
- Clicking shows inline confirmation: `"Hapus folder ini? Dashboard akan dipindah ke Lainnya"` with `Hapus` / `Batal` buttons
- Confirm → calls PATCH API with `{ action: 'delete', folder }` which sets `folder = null` for all dashboards in that group
- `'Lainnya'` folder has no rename/delete icons (catch-all, not a real folder)

### API Extension (route.ts PATCH handler)
Extend PATCH to handle three body shapes:
1. `{ id, folder }` → existing: move single dashboard to folder
2. `{ action: 'rename', oldFolder: string, newFolder: string }` → bulk rename all dashboards in `oldFolder`
3. `{ action: 'delete', folder: string }` → set `folder = null` for all dashboards in that folder

---

## Section 4: Move Dashboard to Folder

**File:** `app/dashboard/(main)/analyst/builder/page.tsx`

- Add a `FolderInput` icon button to each dashboard card's hover action area (alongside `ExternalLink` and `Trash2`)
- Clicking toggles a small inline popover dropdown anchored to the card
- Popover lists all existing folders + `"Tanpa Folder"` at the bottom
- Current folder is indicated with a checkmark
- Clicking a folder option → calls PATCH API with `{ id, folder }`, updates local state optimistically
- Clicking outside closes the popover
- State: `openMovePopover: string | null` in `page.tsx` tracks which dashboard card (by id) has its popover open

---

## Files to Change

| File | Changes |
|------|---------|
| `app/api/dashboards/route.ts` | Extend PATCH to support `action: 'rename'` and `action: 'delete'` bulk operations |
| `app/dashboard/(main)/analyst/builder/page.tsx` | Fix 3 bugs; add rename/delete folder UI; add move-to-folder popover; derive and pass `existingFolders` |
| `components/builder/SaveDashboardModal.tsx` | Add `existingFolders` prop + `<datalist>` on folder input |
| `components/builder/BuilderLayout.tsx` | Pass `existingFolders` prop through to `SaveDashboardModal` |

---

## Out of Scope

- Nested/sub-folders
- Drag-and-drop between folders
- Folder metadata (color, icon, description)
- Folder-level permissions or sharing
- Folder search/filter at API level
