# Branch Role Hierarchy Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement three-tier role system for branch offices (Manager/Staff/Public) with email-based role assignment and differentiated permissions.

**Architecture:** Replace `CABANG` role with `MANAGER_CABANG` (@gapura.id) and `STAFF_CABANG` (non-@gapura.id). Email domain validation at registration, station-scoped permissions, manager approval workflow for staff.

**Tech Stack:** Next.js 14, TypeScript, Supabase PostgreSQL, React, Tailwind CSS

---

## Task 1: Update Type System

**Files:**
- Modify: `types/index.ts:1`

**Step 1: Update UserRole type definition**

Replace the UserRole type with new branch roles:

```typescript
export type UserRole = 'SUPER_ADMIN' | 'DIVISI_OS' | 'DIVISI_OT' | 'DIVISI_OP' | 'DIVISI_UQ' | 'DIVISI_HC' | 'DIVISI_HT' | 'ANALYST' | 'MANAGER_CABANG' | 'STAFF_CABANG';
```

**Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 3: Commit type changes**

```bash
git add types/index.ts
git commit -m "feat(types): add MANAGER_CABANG and STAFF_CABANG roles

Replace CABANG role with explicit Manager/Staff roles for branch hierarchy.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Create Database Migration

**Files:**
- Create: `supabase/migrations/20260227000000_branch_role_hierarchy.sql`

**Step 1: Write migration script**

Create migration file with role updates and CABANG → MANAGER_CABANG migration:

```sql
-- Update role constraint to include new branch roles
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN (
    'SUPER_ADMIN',
    'DIVISI_OS', 'DIVISI_OT', 'DIVISI_OP', 'DIVISI_UQ', 'DIVISI_HC', 'DIVISI_HT',
    'ANALYST',
    'MANAGER_CABANG',
    'STAFF_CABANG'
  ));

-- Migrate existing CABANG users to MANAGER_CABANG
UPDATE users
SET role = 'MANAGER_CABANG'
WHERE role = 'CABANG';

-- Add performance index for station-based role queries
CREATE INDEX IF NOT EXISTS idx_users_station_role
  ON users(station_id, role)
  WHERE status = 'active';

-- Add comment for documentation
COMMENT ON CONSTRAINT users_role_check ON users IS
  'Branch roles: MANAGER_CABANG (@gapura.id), STAFF_CABANG (non-@gapura.id)';
```

**Step 2: Commit migration**

```bash
git add supabase/migrations/20260227000000_branch_role_hierarchy.sql
git commit -m "feat(db): add branch role hierarchy migration

Migrate CABANG → MANAGER_CABANG and add STAFF_CABANG role.
Add performance index for station-role queries.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Note:** Run migration manually in Supabase dashboard or via CLI before proceeding.

---

## Task 3: Update Permission Helpers

**Files:**
- Modify: `lib/permissions.ts:10-90`

**Step 1: Update role hierarchy**

Replace the ROLE_HIERARCHY constant to include new branch roles:

```typescript
const ROLE_HIERARCHY: Record<UserRole, number> = {
    STAFF_CABANG: 1,
    MANAGER_CABANG: 2,
    DIVISI_OS: 2,
    DIVISI_OT: 2,
    DIVISI_OP: 2,
    DIVISI_UQ: 2,
    DIVISI_HC: 2,
    DIVISI_HT: 2,
    ANALYST: 3,
    SUPER_ADMIN: 4,
};
```

**Step 2: Add new permission helper functions**

Add after existing permission functions (around line 84):

```typescript
/**
 * Check if user can view all reports from their station
 * MANAGER_CABANG can see all station reports
 */
export const canViewAllStationReports = (role: UserRole): boolean =>
    role === 'MANAGER_CABANG' || ROLE_HIERARCHY[role] >= 3;

/**
 * Check if user can edit a specific report
 * MANAGER_CABANG can edit all station reports, STAFF_CABANG only own reports
 */
export const canEditReport = (
    role: UserRole,
    userId: string,
    reportUserId: string,
    userStationId?: string,
    reportStationId?: string
): boolean => {
    // ANALYST and SUPER_ADMIN can edit any report
    if (role === 'ANALYST' || role === 'SUPER_ADMIN') return true;

    // Central division roles can edit any report
    if (role.startsWith('DIVISI_')) return true;

    // MANAGER_CABANG can edit reports from their station
    if (role === 'MANAGER_CABANG' && userStationId === reportStationId) return true;

    // STAFF_CABANG can only edit own reports
    if (role === 'STAFF_CABANG' && userId === reportUserId) return true;

    return false;
};

/**
 * Check if user can export branch data (Excel/PDF)
 * MANAGER_CABANG can export, STAFF_CABANG cannot
 */
export const canExportBranchData = (role: UserRole): boolean =>
    role === 'MANAGER_CABANG' || canExportData(role);

/**
 * Check if user can approve staff registration
 * MANAGER_CABANG can approve staff from same station
 */
export const canApproveStaff = (
    role: UserRole,
    userStationId?: string,
    staffStationId?: string
): boolean => {
    if (role === 'SUPER_ADMIN') return true;
    if (role === 'MANAGER_CABANG' && userStationId === staffStationId) return true;
    return false;
};

/**
 * Check if user can only view own reports
 * True for STAFF_CABANG only
 */
export const isRestrictedToOwnReports = (role: UserRole): boolean =>
    role === 'STAFF_CABANG';
```

**Step 3: Update role labels**

Update ROLE_LABELS constant (around line 118):

```typescript
export const ROLE_LABELS: Record<UserRole, string> = {
    MANAGER_CABANG: 'Manager Cabang',
    STAFF_CABANG: 'Staff Cabang',
    DIVISI_OS: 'Divisi OS',
    DIVISI_OT: 'Divisi OT',
    DIVISI_OP: 'Divisi OP',
    DIVISI_UQ: 'Divisi UQ',
    DIVISI_HC: 'Divisi HC',
    DIVISI_HT: 'Divisi HT',
    ANALYST: 'Analyst',
    SUPER_ADMIN: 'Super Admin',
};
```

**Step 4: Update role descriptions**

Update ROLE_DESCRIPTIONS constant (around line 133):

```typescript
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
    MANAGER_CABANG: 'Manager/Supervisor cabang (@gapura.id). Akses penuh station, approve staff, export data.',
    STAFF_CABANG: 'Staff cabang (non-@gapura.id). Hanya lihat laporan sendiri, perlu approval manager.',
    DIVISI_OS: 'Divisi Operational Services. Full superview, export data, monitoring global.',
    DIVISI_OT: 'Divisi Teknik. Eksekutor laporan terkait GSE dan peralatan.',
    DIVISI_OP: 'Divisi Operasi. Eksekutor laporan terkait operasional.',
    DIVISI_UQ: 'Divisi Quality. Eksekutor laporan terkait safety dan quality.',
    DIVISI_HC: 'Divisi Human Capital. Eksekutor laporan terkait kepegawaian.',
    DIVISI_HT: 'Divisi Human Training. Eksekutor laporan terkait pelatihan.',
    ANALYST: 'Kepala divisi. Akses global + export data.',
    SUPER_ADMIN: 'Full access. Kelola user dan master data.',
};
```

**Step 5: Update getLoginRedirectPath function**

Update function (around line 95):

```typescript
export const getLoginRedirectPath = (role: UserRole): string => {
    if (role === 'MANAGER_CABANG' || role === 'STAFF_CABANG') {
        return '/dashboard/employee';
    }
    return '/dashboard/admin';
};
```

**Step 6: Update canCreateReport function**

Update function (around line 82):

```typescript
export const canCreateReport = (role: UserRole): boolean =>
    role === 'MANAGER_CABANG' ||
    role === 'STAFF_CABANG' ||
    role === 'ANALYST' ||
    role === 'SUPER_ADMIN' ||
    role === 'DIVISI_OS';
```

**Step 7: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 8: Commit permission updates**

```bash
git add lib/permissions.ts
git commit -m "feat(permissions): add branch role hierarchy permissions

Add permission helpers for Manager/Staff branch roles:
- canViewAllStationReports
- canEditReport
- canExportBranchData
- canApproveStaff
- isRestrictedToOwnReports

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Update Registration API

**Files:**
- Modify: `app/api/auth/register/route.ts:115-130`

**Step 1: Add email domain detection logic**

Replace role assignment logic (lines 115-130) with email-based logic:

```typescript
        // Determine role and division based on station and email
        const email = body.email.toLowerCase();
        const isGapuraEmail = email.endsWith('@gapura.id');

        let role: string;
        let division: string;

        if (isGPS) {
            // GPS users: role can be central roles based on position/division
            role = 'CABANG'; // Default role, admin can upgrade to ANALYST, DIVISI_*, etc.
            division = body.division || 'GENERAL';
        } else {
            // Branch users: role based on email domain
            if (isGapuraEmail) {
                role = 'MANAGER_CABANG';
            } else {
                role = 'STAFF_CABANG';
            }
            division = 'GENERAL';
        }

        const userData = {
            email: email,
            password: hashedPassword,
            full_name: full_name.trim(),
            nik: nik.toUpperCase(),
            phone,
            station_id: station_id,
            unit_id,
            position_id,
            role,
            division,
            status: 'pending',
        };
```

**Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 3: Commit registration API update**

```bash
git add app/api/auth/register/route.ts
git commit -m "feat(auth): add email-based role assignment for branch users

Branch registration now assigns roles based on email domain:
- @gapura.id → MANAGER_CABANG
- Other → STAFF_CABANG

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Update Registration Page UI

**Files:**
- Modify: `app/auth/register/page.tsx:36-40,165-227`

**Step 1: Add email domain hint state**

Add new state after existing state declarations (around line 40):

```typescript
    const [emailHint, setEmailHint] = useState('');
```

**Step 2: Update handleChange function for email**

Update the handleChange function (around line 149) to detect email domain:

```typescript
    const handleChange = (name: string, value: string) => {
        // Transform NIK to uppercase
        if (name === 'nik') value = value.toUpperCase();

        // Email domain hint
        if (name === 'email') {
            const isGPS = stations.find(s => s.id === formData.station_id)?.code === 'GPS';
            if (!isGPS) {
                if (value.toLowerCase().endsWith('@gapura.id')) {
                    setEmailHint('✓ Anda akan terdaftar sebagai Manager/Supervisor');
                } else if (value.includes('@')) {
                    setEmailHint('ℹ Anda akan terdaftar sebagai Staff (perlu approval Manager)');
                } else {
                    setEmailHint('');
                }
            } else {
                setEmailHint('');
            }
        }

        setFormData(prev => ({ ...prev, [name]: value }));

        // Validate on change
        const error = validateField(name, value);
        setFieldErrors(prev => ({ ...prev, [name]: error }));

        // Reset position when station changes
        if (name === 'station_id') {
            setFormData(prev => ({ ...prev, station_id: value, position_id: '', division: 'GENERAL' }));
            setEmailHint(''); // Reset hint when station changes
        }
    };
```

**Step 3: Add email hint display in registration form**

Update the email field section (around line 365-377) to show hint:

```typescript
                                    <div>
                                        <label className={labelStyle}>Email</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input
                                                type="email"
                                                required
                                                className={fieldErrors.email ? inputErrorStyle : inputStyle}
                                                placeholder="email@gapura.co.id"
                                                value={formData.email}
                                                onChange={(e) => handleChange('email', e.target.value)}
                                            />
                                        </div>
                                        {fieldErrors.email && <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
                                        {!fieldErrors.email && emailHint && !isGPS && (
                                            <p className={`text-xs mt-1 ${emailHint.startsWith('✓') ? 'text-emerald-600' : 'text-blue-600'}`}>
                                                {emailHint}
                                            </p>
                                        )}
                                    </div>
```

**Step 4: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 5: Test registration page locally**

Run: `npm run dev`
Navigate to: `http://localhost:3000/auth/register`
Test:
1. Select a branch station (not GPS)
2. Type email ending with @gapura.id → Should show Manager hint
3. Type email with other domain → Should show Staff hint

**Step 6: Commit registration page update**

```bash
git add app/auth/register/page.tsx
git commit -m "feat(ui): add email domain hints in registration form

Show real-time hints based on email domain:
- @gapura.id → Manager/Supervisor role
- Other → Staff role (needs manager approval)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: Create Manager Approval API

**Files:**
- Create: `app/api/admin/users/approve-staff/route.ts`

**Step 1: Create staff approval endpoint**

Create new API route for manager approval:

```typescript
import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { verifySession } from '@/lib/auth-utils';
import { canApproveStaff } from '@/lib/permissions';

export async function POST(request: Request) {
    try {
        // Verify session
        const session = await verifySession(request);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { userId } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        // Get current user data
        const { data: currentUser, error: currentUserError } = await supabase
            .from('users')
            .select('role, station_id')
            .eq('id', session.id)
            .single();

        if (currentUserError || !currentUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get staff user data
        const { data: staffUser, error: staffUserError } = await supabase
            .from('users')
            .select('role, station_id, status')
            .eq('id', userId)
            .single();

        if (staffUserError || !staffUser) {
            return NextResponse.json({ error: 'Staff user not found' }, { status: 404 });
        }

        // Check if staff is STAFF_CABANG and pending
        if (staffUser.role !== 'STAFF_CABANG') {
            return NextResponse.json(
                { error: 'Can only approve STAFF_CABANG users' },
                { status: 400 }
            );
        }

        if (staffUser.status !== 'pending') {
            return NextResponse.json(
                { error: 'User is not pending approval' },
                { status: 400 }
            );
        }

        // Check permission
        if (!canApproveStaff(currentUser.role as any, currentUser.station_id, staffUser.station_id)) {
            return NextResponse.json(
                { error: 'You can only approve staff from your station' },
                { status: 403 }
            );
        }

        // Approve staff
        const { error: updateError } = await supabase
            .from('users')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('id', userId);

        if (updateError) {
            console.error('Approval error:', updateError);
            return NextResponse.json(
                { error: 'Failed to approve staff' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Staff approved successfully',
        });
    } catch (error) {
        console.error('Staff approval error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
```

**Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 3: Commit staff approval API**

```bash
git add app/api/admin/users/approve-staff/route.ts
git commit -m "feat(api): add manager staff approval endpoint

MANAGER_CABANG can approve STAFF_CABANG from same station.
SUPER_ADMIN can approve any staff.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: Update Admin Users Page

**Files:**
- Modify: `app/dashboard/(main)/admin/users/page.tsx`

**Step 1: Read current users page implementation**

Read the file to understand current structure before modifying.

**Step 2: Add staff approval handler**

Add approval handler function in the component (find appropriate location after state declarations):

```typescript
    const handleApproveStaff = async (userId: string) => {
        try {
            const res = await fetch('/api/admin/users/approve-staff', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to approve staff');
            }

            // Refresh user list
            fetchUsers();

            // Show success message (if you have toast/notification system)
            alert('Staff berhasil disetujui');
        } catch (error: any) {
            console.error('Approve staff error:', error);
            alert(error.message || 'Gagal menyetujui staff');
        }
    };
```

**Step 3: Update user list rendering to show approval button**

Find the user list rendering section and add conditional approval button for STAFF_CABANG pending users:

```typescript
{user.role === 'STAFF_CABANG' && user.status === 'pending' && (
    <button
        onClick={() => handleApproveStaff(user.id)}
        className="px-3 py-1 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors"
    >
        Approve Staff
    </button>
)}
```

**Step 4: Add role badge styling**

Update role badge rendering to include new roles (find badge rendering section):

```typescript
const getRoleBadgeColor = (role: string) => {
    switch (role) {
        case 'SUPER_ADMIN':
            return 'bg-purple-100 text-purple-700';
        case 'ANALYST':
            return 'bg-blue-100 text-blue-700';
        case 'MANAGER_CABANG':
            return 'bg-emerald-100 text-emerald-700';
        case 'STAFF_CABANG':
            return 'bg-gray-100 text-gray-700';
        default:
            return 'bg-orange-100 text-orange-700';
    }
};
```

**Step 5: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 6: Commit admin users page update**

```bash
git add app/dashboard/(main)/admin/users/page.tsx
git commit -m "feat(ui): add staff approval in admin users page

MANAGER_CABANG can approve pending STAFF_CABANG from their station.
Add role badges for new branch roles.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: Update Employee Dashboard - Reports Filtering

**Files:**
- Modify: `app/dashboard/(main)/employee/reports/page.tsx`

**Step 1: Read current employee reports page**

Read the file to understand current implementation.

**Step 2: Add user-based report filtering**

Update the reports fetch logic to filter based on role. Find the fetch function and modify:

```typescript
    const fetchReports = async () => {
        setLoading(true);
        try {
            // Fetch current user session
            const sessionRes = await fetch('/api/auth/me');
            const sessionData = await sessionRes.json();

            if (!sessionData.user) {
                router.push('/auth/login');
                return;
            }

            const currentUser = sessionData.user;

            // Fetch reports
            const res = await fetch('/api/reports');
            if (!res.ok) throw new Error('Failed to fetch reports');

            const data = await res.json();
            let filteredReports = data;

            // Filter based on role
            if (currentUser.role === 'STAFF_CABANG') {
                // Staff can only see their own reports
                filteredReports = data.filter((r: any) => r.user_id === currentUser.id);
            } else if (currentUser.role === 'MANAGER_CABANG') {
                // Manager can see all reports from their station
                filteredReports = data.filter((r: any) => r.stations?.code === currentUser.station_id);
            }
            // Other roles see all reports (existing behavior)

            setReports(filteredReports);
            setFilteredReports(filteredReports);
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };
```

**Step 3: Add conditional export button**

Find the export button and wrap with permission check:

```typescript
import { canExportBranchData } from '@/lib/permissions';

// In component, add user role state
const [userRole, setUserRole] = useState<string>('');

// In fetchReports, set user role
setUserRole(currentUser.role);

// Wrap export button with condition
{canExportBranchData(userRole as any) && (
    <button
        onClick={handleExport}
        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
    >
        Export Data
    </button>
)}
```

**Step 4: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 5: Commit employee reports filtering**

```bash
git add app/dashboard/(main)/employee/reports/page.tsx
git commit -m "feat(ui): add role-based report filtering in employee dashboard

STAFF_CABANG sees only own reports.
MANAGER_CABANG sees all station reports.
Export button only visible for authorized roles.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 9: Update Sidebar Navigation

**Files:**
- Modify: `components/Sidebar.tsx`

**Step 1: Read current sidebar implementation**

Read the file to understand navigation structure.

**Step 2: Add "Kelola Staff" menu for MANAGER_CABANG**

Find the navigation items section and add conditional menu item:

```typescript
{user.role === 'MANAGER_CABANG' && (
    <Link
        href="/dashboard/admin/users?filter=staff"
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            pathname.includes('/admin/users')
                ? 'bg-emerald-100 text-emerald-700'
                : 'text-gray-700 hover:bg-gray-100'
        }`}
    >
        <Users className="w-5 h-5" />
        <span>Kelola Staff</span>
    </Link>
)}
```

**Step 3: Update role-based navigation visibility**

Update navigation items to show appropriate sections for each role:

```typescript
// STAFF_CABANG: Only show basic menu items
const showBasicMenuOnly = user.role === 'STAFF_CABANG';
const showManagerMenu = user.role === 'MANAGER_CABANG';
const showAdminMenu = ['SUPER_ADMIN', 'ANALYST', 'DIVISI_OS', 'DIVISI_OT', 'DIVISI_OP', 'DIVISI_UQ'].includes(user.role);
```

**Step 4: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 5: Commit sidebar navigation update**

```bash
git add components/Sidebar.tsx
git commit -m "feat(ui): add role-based navigation in sidebar

Add 'Kelola Staff' menu for MANAGER_CABANG.
Show appropriate menu items based on role hierarchy.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 10: Update Report Edit Permissions

**Files:**
- Modify: `app/dashboard/(main)/employee/reports/[id]/page.tsx`

**Step 1: Read current report detail page**

Read the file to understand edit permission logic.

**Step 2: Add role-based edit permission check**

Import and use canEditReport helper:

```typescript
import { canEditReport } from '@/lib/permissions';

// In component, check edit permission
const canEdit = canEditReport(
    user.role as any,
    user.id,
    report.user_id,
    user.station_id,
    report.station_id
);

// Use canEdit to show/hide edit button
{canEdit && (
    <button
        onClick={handleEdit}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
    >
        Edit Laporan
    </button>
)}
```

**Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 4: Commit report edit permissions**

```bash
git add app/dashboard/(main)/employee/reports/[id]/page.tsx
git commit -m "feat(permissions): add role-based report edit permissions

MANAGER_CABANG can edit all station reports.
STAFF_CABANG can only edit own reports.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 11: Integration Testing

**Files:**
- Test existing pages manually

**Step 1: Test Manager Registration Flow**

1. Navigate to `/auth/register`
2. Select a branch station (e.g., CGK)
3. Enter email: `manager@gapura.id`
4. Verify hint shows "Manager/Supervisor"
5. Complete registration
6. Check database: role should be `MANAGER_CABANG`, status `pending`

**Step 2: Test Staff Registration Flow**

1. Navigate to `/auth/register`
2. Select a branch station
3. Enter email: `staff@example.com`
4. Verify hint shows "Staff (perlu approval Manager)"
5. Complete registration
6. Check database: role should be `STAFF_CABANG`, status `pending`

**Step 3: Test Manager Approval Workflow**

1. Login as SUPER_ADMIN
2. Approve the MANAGER_CABANG user
3. Logout and login as MANAGER_CABANG
4. Navigate to "Kelola Staff"
5. Approve the STAFF_CABANG user from same station
6. Verify staff status changes to `active`

**Step 4: Test Staff Report Access**

1. Login as STAFF_CABANG
2. Navigate to reports page
3. Create a new report
4. Verify only own reports are visible
5. Verify export button is NOT visible
6. Verify can edit own report

**Step 5: Test Manager Report Access**

1. Login as MANAGER_CABANG
2. Navigate to reports page
3. Verify all station reports are visible (including staff reports)
4. Verify export button IS visible
5. Verify can edit any station report

**Step 6: Test Public Report Submission**

1. Logout (or open incognito)
2. Navigate to `/auth/public-report`
3. Submit a report without logging in
4. Verify submission succeeds

**Step 7: Document test results**

Create: `docs/testing/branch-role-hierarchy-tests.md`

Document results of all test scenarios above.

**Step 8: Commit test documentation**

```bash
git add docs/testing/branch-role-hierarchy-tests.md
git commit -m "docs: add integration test results for branch role hierarchy

Document manual testing of Manager/Staff/Public access tiers.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 12: Final Verification & Cleanup

**Step 1: Run full TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 2: Check for any remaining CABANG references**

Run: `grep -r "CABANG" --include="*.ts" --include="*.tsx" . | grep -v "MANAGER_CABANG" | grep -v "STAFF_CABANG" | grep -v node_modules`

Expected: Only should find migration file and design docs

**Step 3: Build production**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 4: Create summary commit**

If no issues found:

```bash
git add .
git commit -m "feat: complete branch role hierarchy implementation

Implement three-tier branch role system:
- MANAGER_CABANG: @gapura.id, full station access, approve staff
- STAFF_CABANG: non-@gapura.id, own reports only, needs approval
- Public: unauthenticated report submission

All existing CABANG users migrated to MANAGER_CABANG.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Notes

- **DRY:** Reuse permission helpers across all components
- **YAGNI:** No additional role features beyond requirements
- **TDD:** Test permission logic at each integration point
- **Frequent commits:** Commit after each task completion

## Rollback Plan

If issues arise, revert database migration:

```sql
UPDATE users SET role = 'CABANG' WHERE role = 'MANAGER_CABANG';
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('SUPER_ADMIN', 'DIVISI_OS', 'DIVISI_OT', 'DIVISI_OP',
                  'DIVISI_UQ', 'DIVISI_HC', 'DIVISI_HT', 'ANALYST', 'CABANG'));
```

Then revert code commits:
```bash
git revert HEAD~12..HEAD
```
