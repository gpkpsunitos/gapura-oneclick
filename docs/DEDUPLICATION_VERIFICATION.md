# Deduplication Verification

## How Deduplication Works

The sync system prevents duplicates using:

1. **Database Constraint:** `UNIQUE` constraint on `sheet_id` column
2. **Upsert Logic:** Uses PostgreSQL `ON CONFLICT` to update existing records
3. **Tracking:** Distinguishes between new inserts and updates

## Verify No Duplicates

Run this query in Supabase SQL Editor:

```sql
-- Check for duplicates
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT sheet_id) as unique_sheet_ids,
  COUNT(DISTINCT id) as unique_ids,
  COUNT(*) - COUNT(DISTINCT sheet_id) as duplicate_sheet_ids,
  COUNT(*) - COUNT(DISTINCT id) as duplicate_ids
FROM reports_sync;
```

**Expected Result:**
```
total_records | unique_sheet_ids | unique_ids | duplicate_sheet_ids | duplicate_ids
--------------+------------------+------------+---------------------+---------------
        1021 |             1021 |       1021 |                   0 |             0
```

If `duplicate_sheet_ids` or `duplicate_ids` is > 0, there are duplicates.

## Find Duplicates

If duplicates exist, find them:

```sql
-- Find duplicate sheet_ids
SELECT sheet_id, COUNT(*) as count
FROM reports_sync
GROUP BY sheet_id
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Find duplicate ids
SELECT id, COUNT(*) as count
FROM reports_sync
GROUP BY id
HAVING COUNT(*) > 1
ORDER BY count DESC;
```

## Remove Duplicates

If duplicates exist (shouldn't happen with proper upsert):

```sql
-- Remove duplicates, keep newest
DELETE FROM reports_sync a
USING reports_sync b
WHERE a.id < b.id
  AND a.sheet_id = b.sheet_id;
```

## Sync Behavior

### First Sync
```
Inserted: 1021
Updated: 0
```

### Subsequent Syncs
```
Inserted: 0
Updated: 1021
```

### Mixed Sync (some new, some existing)
```
Inserted: 50
Updated: 971
```

## Monitoring

Add this to your monitoring:

```sql
-- Check sync health
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE synced_at > NOW() - INTERVAL '10 minutes') as recent_syncs,
  COUNT(*) - COUNT(DISTINCT sheet_id) as duplicates
FROM reports_sync;
```

Should show `duplicates = 0` always.
