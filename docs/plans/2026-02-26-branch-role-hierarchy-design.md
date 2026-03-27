# Branch Role Hierarchy Design

**Date:** 2026-02-26
**Status:** Approved
**Author:** Claude + Client

## Overview

Implement a three-tier role system for branch offices to distinguish between:
1. **Manager/Supervisor** (@gapura.id email) - Full branch access
2. **Staff** (non-@gapura.id email) - Limited to own reports
3. **Public/Unauthenticated** - Report submission only

## Background

Currently, all branch users have the `CABANG` role with identical permissions. The client requires differentiation based on organizational hierarchy, where managers have oversight capabilities and staff have restricted access.

## Requirements

### Manager/Supervisor (@gapura.id)
- Create reports for their station
- View all reports from their station
- Edit any station report (including staff reports)
- Export station data (Excel/PDF)
- Approve/reject staff registration from their station
- Upload evidence/attachments

### Staff (non-@gapura.id)
- Create reports for their station
- View only their own reports
- Edit only their own reports
- Upload evidence for their reports
- Cannot export data
- Requires manager approval before activation

### Public Access
- No login required
- Access to `/auth/public-report` form only
- Can submit reports anonymously
- No dashboard access

## Design Decision

**Approach: Replace CABANG with Explicit Manager/Staff Roles**

We chose this approach over alternatives (keeping CABANG as manager, or position-based permissions) because it:
- Provides clear, explicit role naming
- Makes permissions easy to understand and maintain
- Scales well for future role additions
- Enforces email domain validation at the type level

## Architecture

### 1. Type System

```typescript
// types/index.ts
export type UserRole =
  | 'SUPER_ADMIN'
  | 'DIVISI_OS' | 'DIVISI_OT' | 'DIVISI_OP' | 'DIVISI_UQ' | 'DIVISI_HC' | 'DIVISI_HT'
  | 'ANALYST'
  | 'MANAGER_CABANG'  // Branch Manager/Supervisor (@gapura.id)
  | 'STAFF_CABANG';   // Branch Staff (non-@gapura.id)
```

**Role Hierarchy:**
- STAFF_CABANG: Level 1 (lowest)
- MANAGER_CABANG: Level 2
- Central office roles: Level 2-4 (unchanged)

### 2. Authentication & Registration

**Email-Based Role Assignment:**

```typescript
const email = formData.email.toLowerCase();
const isGapuraEmail = email.endsWith('@gapura.id');
const isGPS = station_code === 'GPS';

if (isGPS) {
  // Central office - existing logic
  role = determineGPSRole(position, division);
} else {
  // Branch office - new logic
  if (isGapuraEmail) {
    role = 'MANAGER_CABANG';
    status = 'pending'; // Admin approval
  } else {
    role = 'STAFF_CABANG';
    status = 'pending'; // Manager approval
  }
}
```

**Approval Workflow:**
- **MANAGER_CABANG**: Approved by SUPER_ADMIN
- **STAFF_CABANG**: Approved by MANAGER_CABANG (same station) OR SUPER_ADMIN

### 3. Permissions

**Permission Matrix:**

| Permission | MANAGER_CABANG | STAFF_CABANG | Public |
|------------|----------------|--------------|--------|
| Create reports | ✅ Station-scoped | ✅ Station-scoped | ✅ Anonymous |
| View own reports | ✅ | ✅ | ❌ |
| View all station reports | ✅ | ❌ | ❌ |
| Edit own reports | ✅ | ✅ | ❌ |
| Edit station reports | ✅ | ❌ | ❌ |
| Export data | ✅ | ❌ | ❌ |
| Approve staff | ✅ Same station | ❌ | ❌ |
| Upload evidence | ✅ | ✅ | ❌ |
| Access dashboard | ✅ | ✅ | ❌ |

**Permission Helper Functions** (lib/permissions.ts):
```typescript
canViewAllStationReports(role: UserRole, userStationId: string, reportStationId: string): boolean
canEditReport(role: UserRole, userId: string, report: Report): boolean
canExportBranchData(role: UserRole): boolean
canApproveStaff(role: UserRole, userStationId: string, staffStationId: string): boolean
```

### 4. Database Schema

**Migration Required:**

```sql
-- Update role constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('SUPER_ADMIN', 'DIVISI_OS', 'DIVISI_OT', 'DIVISI_OP',
                  'DIVISI_UQ', 'DIVISI_HC', 'DIVISI_HT', 'ANALYST',
                  'MANAGER_CABANG', 'STAFF_CABANG'));

-- Migrate existing CABANG users to MANAGER_CABANG
UPDATE users
SET role = 'MANAGER_CABANG'
WHERE role = 'CABANG';

-- Add performance index
CREATE INDEX IF NOT EXISTS idx_users_station_role
  ON users(station_id, role) WHERE status = 'active';
```

**No Schema Changes:** Existing `users` table structure supports new roles.

### 5. UI/UX Changes

**Registration Page** (`app/auth/register/page.tsx`):
- Real-time email domain validation
- Helpful hints:
  - "@gapura.id → Anda akan terdaftar sebagai Manager/Supervisor"
  - "Lainnya → Anda akan terdaftar sebagai Staff (perlu approval Manager)"

**Employee Dashboard** (`/dashboard/employee`):

For MANAGER_CABANG:
- Tabs: "Semua Laporan" | "Laporan Saya"
- Filter: "Dibuat oleh: [dropdown]"
- Export button visible
- Edit button on all reports

For STAFF_CABANG:
- Shows only their own reports
- No export button
- Edit button only on own reports
- Simplified view

**Admin User Management** (`/dashboard/admin/users`):
- MANAGER_CABANG can access but see only their station
- New "Approve Staff" action for managers
- Pending badges:
  - STAFF_CABANG: "Pending Manager Approval"
  - MANAGER_CABANG: "Pending Admin Approval"

**Sidebar Navigation** (`components/Sidebar.tsx`):
- MANAGER_CABANG: Add "Kelola Staff" menu item
- STAFF_CABANG: Standard employee menu

## Implementation Order

1. Update type definitions (`types/index.ts`)
2. Run database migration script
3. Update permission helpers (`lib/permissions.ts`)
4. Update registration API (`app/api/auth/register/route.ts`)
5. Update registration page with email validation
6. Update user management API for manager approvals
7. Update admin users page with approval workflow
8. Update employee dashboard with role-based filtering
9. Update sidebar navigation
10. Test all three access tiers

## Testing Strategy

**Test Cases:**
- ✅ Manager registration with @gapura.id email → MANAGER_CABANG role
- ✅ Staff registration with non-@gapura.id email → STAFF_CABANG role
- ✅ Manager can approve Staff from same station
- ✅ Manager cannot approve Staff from different station
- ✅ Staff can only see own reports
- ✅ Manager can see all station reports
- ✅ Manager can export data (Excel/PDF)
- ✅ Staff cannot export data
- ✅ Staff can edit only own reports
- ✅ Manager can edit all station reports
- ✅ Public can submit report without login
- ✅ Existing CABANG users migrated to MANAGER_CABANG

## Migration Plan

**Existing Users:**
All current `CABANG` users will be automatically migrated to `MANAGER_CABANG` role, as they are assumed to have @gapura.id emails and managerial responsibilities.

**Rollback Plan:**
If issues arise, revert migration:
```sql
UPDATE users
SET role = 'CABANG'
WHERE role = 'MANAGER_CABANG';
```

## Security Considerations

- Email domain validation enforced at both frontend and backend
- Station-scoped data access enforced via RLS policies
- Manager approval limited to same station only
- Export functionality restricted by role
- Public report submission rate-limited (existing implementation)

## Future Enhancements

- Add "Officer" or "Coordinator" roles between Staff and Manager
- Email notification when staff registration requires approval
- Dashboard for managers showing pending staff approvals
- Audit log for staff approval actions
