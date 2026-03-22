# Dashboard Foldering Refinement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 3 bugs and add inline folder management (autocomplete, rename, delete, move-to-folder) in the "Dashboard Tersimpan" panel.

**Architecture:** All changes are client-side React state in `page.tsx` and `SaveDashboardModal.tsx`, with minimal API extension in the PATCH handler to support bulk folder rename/delete. No new libraries required.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Supabase (via fetch to `/api/dashboards`)

---

## Task 1: Fix 3 bugs in builder page

**Files:**
- Modify: `app/dashboard/(main)/analyst/builder/page.tsx`

**Step 1: Open file and locate the three bug lines**

The three lines to fix:
- Line 18: `const [savedExpanded, setSavedExpanded] = useState(false);`
- Line 34: `const uniqueFolders = Array.from(new Set(dashboards.map((d: any) => d.folder || 'Uncategorized')));`
- Line 144: `{expandedFolders[folderName] !== false ? <ChevronDown size={10} /> : <ChevronUp size={10} />}`

**Step 2: Fix bug 1 — panel starts collapsed**

Change line 18:
```tsx
// Before
const [savedExpanded, setSavedExpanded] = useState(false);

// After
const [savedExpanded, setSavedExpanded] = useState(true);
```

**Step 3: Fix bug 2 — folder name mismatch in auto-expand**

Change line 34:
```tsx
// Before
const uniqueFolders = Array.from(new Set(dashboards.map((d: any) => d.folder || 'Uncategorized')));

// After
const uniqueFolders = Array.from(new Set(dashboards.map((d: any) => d.folder || 'Lainnya')));
```

**Step 4: Fix bug 3 — inverted chevron icons**

Change line 144:
```tsx
// Before
{expandedFolders[folderName] !== false ? <ChevronDown size={10} /> : <ChevronUp size={10} />}

// After
{expandedFolders[folderName] !== false ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
```

**Step 5: Verify TypeScript compiles**

Run: `cd /Users/nrzngr/Desktop/gapura-irrs && npx tsc --noEmit`
Expected: No errors related to these changes.

**Step 6: Commit**

```bash
git add app/dashboard/\(main\)/analyst/builder/page.tsx
git commit -m "fix: correct folder panel bugs — chevrons inverted, 'Uncategorized' key mismatch, panel collapsed by default"
```

---

## Task 2: Extend PATCH API for bulk folder operations

**Files:**
- Modify: `app/api/dashboards/route.ts`

**Step 1: Open the PATCH handler (line 252)**

Current PATCH body shape: `{ id: string; folder: string | null }`

We need to handle two additional body shapes:
- `{ action: 'rename'; oldFolder: string; newFolder: string }` → bulk update all dashboards in `oldFolder`
- `{ action: 'delete'; folder: string }` → set `folder = null` for all dashboards in that folder

**Step 2: Replace the PATCH handler body**

Replace the entire PATCH function (lines 252–275) with:

```typescript
// PATCH - Update dashboard (folder move, folder rename, folder delete)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    // Bulk rename: { action: 'rename', oldFolder, newFolder }
    if (body.action === 'rename') {
      const { oldFolder, newFolder } = body as { action: string; oldFolder: string; newFolder: string };
      if (!oldFolder || !newFolder) {
        return NextResponse.json({ error: 'oldFolder and newFolder required' }, { status: 400 });
      }
      const { error } = await supabase
        .from('custom_dashboards')
        .update({ folder: newFolder.trim() || null })
        .eq('folder', oldFolder);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    // Bulk delete folder: { action: 'delete', folder }
    if (body.action === 'delete') {
      const { folder } = body as { action: string; folder: string };
      if (!folder) {
        return NextResponse.json({ error: 'folder required' }, { status: 400 });
      }
      const { error } = await supabase
        .from('custom_dashboards')
        .update({ folder: null })
        .eq('folder', folder);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    // Single dashboard move: { id, folder }
    const { id, folder } = body as { id: string; folder: string | null };
    if (!id) {
      return NextResponse.json({ error: 'Dashboard ID required' }, { status: 400 });
    }
    const { error } = await supabase
      .from('custom_dashboards')
      .update({ folder })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 3: Verify TypeScript compiles**

Run: `cd /Users/nrzngr/Desktop/gapura-irrs && npx tsc --noEmit`
Expected: No errors.

**Step 4: Commit**

```bash
git add app/api/dashboards/route.ts
git commit -m "feat: extend PATCH /api/dashboards to support bulk folder rename and delete"
```

---

## Task 3: Folder autocomplete in SaveDashboardModal and BuilderLayout

**Files:**
- Modify: `components/builder/SaveDashboardModal.tsx`
- Modify: `components/builder/BuilderLayout.tsx`
- Modify: `app/dashboard/(main)/analyst/builder/page.tsx`

### Sub-task 3a: Update SaveDashboardModal

**Step 1: Add `existingFolders` prop to the interface**

In `components/builder/SaveDashboardModal.tsx`, add `existingFolders?: string[]` to `SaveDashboardModalProps`:

```tsx
// Before (line 7-16)
interface SaveDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialName: string;
  initialDescription: string;
  initialFolder?: string;
  onSave: (name: string, description: string, folder: string | null) => Promise<{ embedUrl: string } | null>;
  tileCount?: number;
  pageCount?: number;
}

// After
interface SaveDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialName: string;
  initialDescription: string;
  initialFolder?: string;
  existingFolders?: string[];
  onSave: (name: string, description: string, folder: string | null) => Promise<{ embedUrl: string } | null>;
  tileCount?: number;
  pageCount?: number;
}
```

**Step 2: Destructure the new prop**

In the function signature (line 18-27), add `existingFolders = []`:

```tsx
export function SaveDashboardModal({
  isOpen,
  onClose,
  initialName,
  initialDescription,
  initialFolder = '',
  existingFolders = [],
  onSave,
  tileCount = 0,
  pageCount = 0,
}: SaveDashboardModalProps) {
```

**Step 3: Add datalist to folder input**

Replace the folder input block (lines 97-108) with:

```tsx
<div>
  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1 block">
    Folder (Opsional)
  </label>
  <input
    type="text"
    value={folder}
    onChange={e => setFolder(e.target.value)}
    placeholder="Contoh: Laporan Bulanan"
    list="folder-suggestions"
    className="w-full px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--surface-4)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
  />
  {existingFolders.length > 0 && (
    <datalist id="folder-suggestions">
      {existingFolders.map(f => (
        <option key={f} value={f} />
      ))}
    </datalist>
  )}
</div>
```

### Sub-task 3b: Update BuilderLayout to forward existingFolders

**Step 1: Add `existingFolders` to `BuilderLayoutProps`**

In `components/builder/BuilderLayout.tsx`, update the interface (line 44-46):

```tsx
// Before
interface BuilderLayoutProps {
  onSaveDashboard: (name: string, description: string, tiles: SaveTile[], config?: SaveConfig, folder?: string | null) => Promise<{ embedUrl: string } | null>;
}

// After
interface BuilderLayoutProps {
  onSaveDashboard: (name: string, description: string, tiles: SaveTile[], config?: SaveConfig, folder?: string | null) => Promise<{ embedUrl: string } | null>;
  existingFolders?: string[];
}
```

**Step 2: Destructure the new prop**

In the `BuilderLayout` function signature (line 75):

```tsx
// Before
export function BuilderLayout({ onSaveDashboard }: BuilderLayoutProps) {

// After
export function BuilderLayout({ onSaveDashboard, existingFolders = [] }: BuilderLayoutProps) {
```

**Step 3: Pass existingFolders to SaveDashboardModal**

In the `<SaveDashboardModal>` JSX (line 693-702), add the prop:

```tsx
<SaveDashboardModal
  isOpen={showSaveModal}
  onClose={() => setShowSaveModal(false)}
  initialName={dash.name}
  initialDescription={dash.description}
  initialFolder={dash.folder}
  existingFolders={existingFolders}
  onSave={handleSave}
  tileCount={dash.tiles.length}
  pageCount={dash.pages.length}
/>
```

### Sub-task 3c: Derive existingFolders in page.tsx and pass to BuilderLayout

**Step 1: Derive unique folder names in `page.tsx`**

In the `return` JSX of `DashboardBuilderPage`, derive the list before rendering `BuilderLayout`:

Replace:
```tsx
<BuilderLayout onSaveDashboard={handleSave} />
```

With:
```tsx
<BuilderLayout
  onSaveDashboard={handleSave}
  existingFolders={
    Array.from(new Set(
      savedDashboards
        .map(d => d.folder)
        .filter((f): f is string => !!f)
    ))
  }
/>
```

**Step 4: Verify TypeScript compiles**

Run: `cd /Users/nrzngr/Desktop/gapura-irrs && npx tsc --noEmit`
Expected: No errors.

**Step 5: Commit**

```bash
git add components/builder/SaveDashboardModal.tsx components/builder/BuilderLayout.tsx app/dashboard/\(main\)/analyst/builder/page.tsx
git commit -m "feat: add folder autocomplete datalist in SaveDashboardModal with existing folder suggestions"
```

---

## Task 4: Inline folder rename & delete on folder headers

**Files:**
- Modify: `app/dashboard/(main)/analyst/builder/page.tsx`

This task adds two new state variables and rewrites the folder header JSX.

**Step 1: Add new state variables**

After the existing `expandedFolders` state (line 19), add:

```tsx
const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
const [renameValue, setRenameValue] = useState('');
const [deletingFolder, setDeletingFolder] = useState<string | null>(null);
```

**Step 2: Add Pencil import to lucide-react**

Update the import at line 5:

```tsx
// Before
import { Trash2, ExternalLink, Clock, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';

// After
import { Trash2, ExternalLink, Clock, ChevronDown, ChevronUp, BarChart3, Pencil, FolderInput, Check, X } from 'lucide-react';
```

**Step 3: Add helper functions for folder rename and delete**

Add these functions after `handleDelete` (after line 89):

```tsx
const handleRenameFolder = async (oldFolder: string, newFolder: string) => {
  const trimmed = newFolder.trim();
  if (!trimmed || trimmed === oldFolder) {
    setRenamingFolder(null);
    return;
  }
  // Optimistic update
  setSavedDashboards(prev =>
    prev.map(d => d.folder === oldFolder ? { ...d, folder: trimmed } : d)
  );
  setExpandedFolders(prev => {
    const next = { ...prev };
    next[trimmed] = next[oldFolder] ?? true;
    delete next[oldFolder];
    return next;
  });
  setRenamingFolder(null);
  // API call
  await fetch('/api/dashboards', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'rename', oldFolder, newFolder: trimmed }),
  });
};

const handleDeleteFolder = async (folder: string) => {
  // Optimistic update — move all to 'Lainnya' (null)
  setSavedDashboards(prev =>
    prev.map(d => d.folder === folder ? { ...d, folder: null } : d)
  );
  setDeletingFolder(null);
  setExpandedFolders(prev => {
    const next = { ...prev };
    delete next[folder];
    return next;
  });
  // API call
  await fetch('/api/dashboards', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', folder }),
  });
};
```

**Step 4: Replace folder header button JSX**

Find the folder header `<button>` (lines 135–147) and replace the entire block with:

```tsx
<div className="flex items-center gap-2 group/folder w-full">
  {/* Left line */}
  <div className="flex-1 h-px bg-[var(--surface-4)] group-hover/folder:bg-[var(--brand-primary)]/30 transition-colors" />

  {/* Folder label — rename mode or display mode */}
  {renamingFolder === folderName ? (
    <div className="flex items-center gap-1">
      <input
        autoFocus
        value={renameValue}
        onChange={e => setRenameValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') handleRenameFolder(folderName, renameValue);
          if (e.key === 'Escape') setRenamingFolder(null);
        }}
        onBlur={() => handleRenameFolder(folderName, renameValue)}
        className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-[var(--surface-1)] border border-[var(--brand-primary)] rounded text-[var(--text-primary)] focus:outline-none w-32"
      />
    </div>
  ) : deletingFolder === folderName ? (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 border border-red-200 rounded-full text-[10px]">
      <span className="text-red-600 font-medium">Hapus folder ini? Dashboard dipindah ke Lainnya</span>
      <button
        onClick={() => handleDeleteFolder(folderName)}
        className="font-bold text-red-600 hover:text-red-700 underline"
      >
        Hapus
      </button>
      <button
        onClick={() => setDeletingFolder(null)}
        className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        Batal
      </button>
    </div>
  ) : (
    <div className="flex items-center gap-1">
      <button
        onClick={() => setExpandedFolders(prev => ({ ...prev, [folderName]: !prev[folderName] }))}
        className="flex items-center gap-1.5 px-3 py-1 bg-[var(--surface-2)] border border-[var(--surface-4)] rounded-full text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors"
      >
        <BarChart3 size={10} />
        {folderName}
        <span className="opacity-50">({dashboards.length})</span>
        {expandedFolders[folderName] !== false ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
      </button>
      {/* Rename & Delete icons — hidden for 'Lainnya' */}
      {folderName !== 'Lainnya' && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover/folder:opacity-100 transition-opacity">
          <button
            onClick={() => { setRenamingFolder(folderName); setRenameValue(folderName); }}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 rounded transition-colors"
            title="Ganti nama folder"
          >
            <Pencil size={10} />
          </button>
          <button
            onClick={() => setDeletingFolder(folderName)}
            className="p-1 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 rounded transition-colors"
            title="Hapus folder"
          >
            <Trash2 size={10} />
          </button>
        </div>
      )}
    </div>
  )}

  {/* Right line */}
  <div className="flex-1 h-px bg-[var(--surface-4)] group-hover/folder:bg-[var(--brand-primary)]/30 transition-colors" />
</div>
```

**Step 5: Verify TypeScript compiles**

Run: `cd /Users/nrzngr/Desktop/gapura-irrs && npx tsc --noEmit`
Expected: No errors.

**Step 6: Commit**

```bash
git add app/dashboard/\(main\)/analyst/builder/page.tsx
git commit -m "feat: add inline folder rename and delete on folder headers in Dashboard Tersimpan"
```

---

## Task 5: Move-to-folder popover on dashboard cards

**Files:**
- Modify: `app/dashboard/(main)/analyst/builder/page.tsx`

**Step 1: Add openMovePopover state**

After `deletingFolder` state, add:

```tsx
const [openMovePopover, setOpenMovePopover] = useState<string | null>(null);
```

**Step 2: Add handleMoveToFolder helper**

After `handleDeleteFolder`, add:

```tsx
const handleMoveToFolder = async (dashboardId: string, targetFolder: string | null) => {
  // Optimistic update
  setSavedDashboards(prev =>
    prev.map(d => d.id === dashboardId ? { ...d, folder: targetFolder } : d)
  );
  setOpenMovePopover(null);
  // API call
  await fetch('/api/dashboards', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: dashboardId, folder: targetFolder }),
  });
};
```

**Step 3: Derive allFolders from savedDashboards**

This is the list of actual folder names (excluding 'Lainnya') used for the popover.
Add this derived variable just before the `return` statement:

```tsx
const allFolders = Array.from(new Set(
  savedDashboards.map(d => d.folder).filter((f): f is string => !!f)
)).sort();
```

**Step 4: Add FolderInput button and popover to each dashboard card**

In the card's hover actions `div` (lines 171-188), add a third button between the existing ExternalLink and Trash2 buttons. Also wrap the entire card `div` in a `relative` positioned container to anchor the popover.

Replace the dashboard card `div` (lines 152–190) with:

```tsx
<div
  key={d.id}
  className="relative group flex items-center justify-between p-3 bg-[var(--surface-2)] border border-[var(--surface-4)] rounded-xl hover:shadow-md hover:border-[var(--brand-primary)]/40 hover:-translate-y-px transition-all duration-200"
>
  <div className="min-w-0 flex-1">
    <p className="text-[13px] font-bold text-[var(--text-primary)] truncate leading-tight mb-0.5">{d.name}</p>
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
        <Clock size={10} />
        {new Date(d.created_at).toLocaleDateString('id-ID')}
      </span>
      {d.description && <span className="w-1 h-1 rounded-full bg-[var(--surface-4)]" />}
      {d.description && <p className="text-[10px] text-[var(--text-muted)] truncate">{d.description}</p>}
    </div>
  </div>
  <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-all">
    {/* Move to folder */}
    <div className="relative">
      <button
        onClick={() => setOpenMovePopover(openMovePopover === d.id ? null : d.id)}
        className="p-1.5 text-[var(--text-muted)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 rounded-lg transition-all"
        title="Pindah ke folder"
      >
        <FolderInput size={14} />
      </button>
      {openMovePopover === d.id && (
        <div
          className="absolute right-0 bottom-full mb-1 z-50 min-w-[160px] bg-[var(--surface-1)] border border-[var(--surface-4)] rounded-xl shadow-xl py-1 animate-fade-in"
          onMouseLeave={() => setOpenMovePopover(null)}
        >
          <p className="px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Pindah ke folder</p>
          {allFolders.map(f => (
            <button
              key={f}
              onClick={() => handleMoveToFolder(d.id, f === 'Lainnya' ? null : f)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
            >
              {f}
              {d.folder === f && <Check size={10} className="text-[var(--brand-primary)]" />}
            </button>
          ))}
          <div className="h-px bg-[var(--surface-4)] my-1" />
          <button
            onClick={() => handleMoveToFolder(d.id, null)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-[var(--text-muted)] hover:bg-[var(--surface-2)] transition-colors"
          >
            Tanpa Folder
            {!d.folder && <Check size={10} className="text-[var(--brand-primary)]" />}
          </button>
        </div>
      )}
    </div>
    <a
      href={`/embed/custom/${d.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className="p-1.5 text-[var(--text-muted)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 rounded-lg transition-all"
      title="Preview"
    >
      <ExternalLink size={14} />
    </a>
    <button
      onClick={() => handleDelete(d.id)}
      className="p-1.5 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
      title="Hapus"
    >
      <Trash2 size={14} />
    </button>
  </div>
</div>
```

**Step 5: Close popover on outside click**

Add a `useEffect` to close the popover when clicking anywhere outside. Add after the existing `useEffect` for `fetchDashboards`:

```tsx
useEffect(() => {
  const handleClickOutside = () => setOpenMovePopover(null);
  if (openMovePopover) {
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }
}, [openMovePopover]);
```

**Step 6: Verify TypeScript compiles**

Run: `cd /Users/nrzngr/Desktop/gapura-irrs && npx tsc --noEmit`
Expected: No errors.

**Step 7: Commit**

```bash
git add app/dashboard/\(main\)/analyst/builder/page.tsx
git commit -m "feat: add move-to-folder popover on dashboard cards in Dashboard Tersimpan"
```

---

## Final Manual QA Checklist

1. **Panel expanded on load** — open the builder page, the "Dashboard Tersimpan" section should be visible immediately (not collapsed)
2. **Chevrons correct** — expanded folders show `ChevronUp`, collapsed show `ChevronDown`
3. **Uncategorized dashboards auto-expand** — dashboards with no folder should appear in "Lainnya" and be expanded on load
4. **Folder autocomplete** — open the Save modal, type in the Folder field, existing folder names should appear as suggestions
5. **Rename folder** — hover over a named folder header, click pencil icon, type new name, press Enter → all dashboards in that folder move to the new folder name
6. **Escape cancels rename** — pressing Escape during rename restores original name without changes
7. **Delete folder** — hover over folder header, click trash, click "Hapus" → dashboards move to "Lainnya"
8. **'Lainnya' has no rename/delete icons** — the catch-all group should not show management icons
9. **Move to folder** — hover a dashboard card, click folder-arrow icon, pick a different folder → card moves to that folder immediately
10. **Move to 'Tanpa Folder'** — moving to "Tanpa Folder" option should move dashboard to "Lainnya"
11. **Checkmark on current folder** — the current folder is marked with a checkmark in the move popover
