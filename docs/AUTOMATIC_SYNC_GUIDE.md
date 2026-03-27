# Automatic Sync Setup Guide

## Overview

The reports sync system automatically keeps your Supabase `reports_sync` table up-to-date with Google Sheets data, eliminating the need for manual syncs.

## Architecture

```
┌─────────────────────┐
│   Google Sheets     │
│   (Primary Source)  │
└──────────┬──────────┘
           │
           │ Sync Job
           │ (Every 5 min)
           ▼
┌─────────────────────┐
│  reports_sync table │
│   (Fast Reads)      │
└──────────┬──────────┘
           │
           │ Query
           ▼
┌─────────────────────┐
│   Application       │
│   (100-300ms)       │
└─────────────────────┘
```

## Setup

### Production (Vercel) - Automatic

**No setup required!** 

The sync is automatically configured via `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/admin/sync-reports",
    "schedule": "*/5 * * * *"
  }]
}
```

Just deploy and it works:
```bash
git add .
git commit -m "Enable automatic sync"
git push
```

### Development - Choose Your Method

#### Option 1: Auto-sync Daemon (Recommended)

**Best for:** Active development, always-on sync

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Start auto-sync daemon
npm run sync:auto
```

**Output:**
```
🚀 Auto-sync daemon starting...
📍 Base URL: http://localhost:3000
⏱️  Sync interval: 5 minutes
Press Ctrl+C to stop

🔄 [10:30:15 AM] Starting sync #1...
✅ Sync completed in 7823ms:
   - Processed: 1021
   - Inserted: 1021
   - Updated: 0
   - Errors: 0
```

**Features:**
- ✅ Syncs immediately on start
- ✅ Auto-syncs every 5 minutes
- ✅ Shows real-time logs
- ✅ Graceful shutdown (Ctrl+C)
- ✅ Auto-retries on failure
- ✅ Shows sync statistics

#### Option 2: Manual Sync

**Best for:** Occasional development, testing

```bash
# Run once when needed
npm run sync:reports
```

## Configuration

### Change Sync Interval

**Production (Vercel):**

Edit `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/admin/sync-reports",
    "schedule": "*/10 * * * *"  // Every 10 minutes
  }]
}
```

Common schedules:
- `*/5 * * * *` - Every 5 minutes
- `*/10 * * * *` - Every 10 minutes
- `*/30 * * * *` - Every 30 minutes
- `0 * * * *` - Every hour

**Development (Daemon):**

Edit `scripts/auto-sync-daemon.mjs`:
```javascript
const SYNC_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
```

### Environment Variables

Add to `.env` for production:

```env
# Optional: Secure cron endpoint
CRON_SECRET=your-random-secret-here

# Already set:
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Monitoring

### Check Sync Status

**Method 1: API Endpoint**
```bash
curl https://your-app.vercel.app/api/admin/sync-reports
```

Response:
```json
{
  "lastSyncAt": "2026-03-04T12:00:00.000Z",
  "totalReports": 1021,
  "syncVersion": 1
}
```

**Method 2: Supabase SQL**
```sql
-- Last sync time
SELECT MAX(synced_at) as last_sync FROM reports_sync;

-- Total records
SELECT COUNT(*) as total FROM reports_sync;

-- Sync health (should be recent)
SELECT 
  COUNT(*) FILTER (WHERE synced_at > NOW() - INTERVAL '10 minutes') as recent,
  COUNT(*) FILTER (WHERE synced_at < NOW() - INTERVAL '10 minutes') as stale
FROM reports_sync;
```

**Method 3: Vercel Dashboard**

1. Go to your project on Vercel
2. Click "Crons" tab
3. View sync history and logs

### Alert on Sync Failures

**Option 1: Vercel Notifications**

In Vercel dashboard:
1. Settings → Notifications
2. Enable "Cron Job Failures"

**Option 2: Custom Monitoring**

Create `/app/api/admin/sync-health/route.ts`:
```typescript
import { SyncService } from '@/lib/services/sync-service';

export async function GET() {
  const status = await SyncService.getSyncStatus();
  const isHealthy = status.lastSyncAt && 
    new Date(status.lastSyncAt) > new Date(Date.now() - 10 * 60 * 1000);
  
  return Response.json({
    healthy: isHealthy,
    ...status
  });
}
```

Then use a monitoring service like:
- Uptime Robot
- Pingdom
- Better Uptime

## Troubleshooting

### Sync Not Running (Production)

**Check 1: Verify Cron Configuration**
```bash
# View Vercel crons
vercel crons ls
```

**Check 2: Check Vercel Logs**
1. Vercel Dashboard → Logs
2. Filter by `/api/admin/sync-reports`

**Check 3: Verify Deployment**
```bash
# Ensure latest code is deployed
vercel --prod
```

### Sync Not Running (Development)

**Issue:** Daemon not starting

**Solution:**
```bash
# Ensure dev server is running
npm run dev

# In separate terminal
npm run sync:auto
```

### Slow Sync Performance

**Issue:** Sync taking > 30 seconds

**Solutions:**
1. Check Google Sheets API quotas
2. Reduce batch size in `sync-service.ts`:
```typescript
private static BATCH_SIZE = 50; // Reduce from 100
```

3. Check Supabase performance:
```sql
-- Check for locks
SELECT * FROM pg_locks WHERE relation = 'reports_sync'::regclass;

-- Check table size
SELECT pg_size_pretty(pg_total_relation_size('reports_sync'));
```

### Data Not Updating

**Check 1: Verify Last Sync**
```bash
curl http://localhost:3000/api/admin/sync-reports
```

**Check 2: Force Resync**
```bash
# Clear and resync
curl -X POST http://localhost:3000/api/admin/sync-reports \
  -H "Content-Type: application/json" \
  -d '{"action":"clear"}'

npm run sync:reports
```

**Check 3: Check Google Sheets**
```bash
# Debug sheets connection
npm run debug:sheets
```

## Best Practices

### 1. Monitor Regularly

Check sync status daily:
```bash
# Add to your daily routine
npm run sync:reports
# Check output for errors
```

### 2. Set Up Alerts

Use Vercel notifications or external monitoring to alert on:
- Sync failures
- Sync delays > 10 minutes
- Empty sync results

### 3. Performance Tuning

For large datasets (> 5000 reports):
- Increase batch size: `BATCH_SIZE = 200`
- Add database indexes
- Consider incremental sync

### 4. Backup Strategy

Periodically backup `reports_sync` table:
```sql
-- Create backup
CREATE TABLE reports_sync_backup AS 
SELECT * FROM reports_sync;

-- Export to CSV
COPY reports_sync TO '/tmp/reports_backup.csv' CSV HEADER;
```

## Security

### Production Security

The sync endpoint is secured by:

1. **Vercel Cron Header** - Only Vercel can trigger
2. **Service Role Key** - Optional Bearer token
3. **Environment Check** - Development mode allowed

To add extra security:

```typescript
// In app/api/admin/sync-reports/route.ts
const cronSecret = request.headers.get('x-cron-secret');
if (cronSecret !== process.env.CRON_SECRET) {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
```

Then set in Vercel:
```bash
vercel env add CRON_SECRET
```

## Cost Analysis

### Vercel Cron Jobs

- **Free Tier:** Included with Pro plan ($20/month)
- **Execution:** ~8 seconds per sync
- **Frequency:** Every 5 minutes
- **Monthly executions:** ~8,640
- **Cost:** $0 (included)

### Supabase Database

- **Storage:** ~5MB for 1000 reports
- **Bandwidth:** Minimal (local reads)
- **Cost:** $0 (within free tier)

### Google Sheets API

- **Quota:** 100 requests/100 seconds
- **Usage:** 1 request per sync
- **Cost:** $0 (within quota)

**Total Additional Cost: $0/month** ✅

## Next Steps

1. ✅ Automatic sync is configured
2. Deploy to production
3. Monitor sync status
4. Set up alerts (optional)
5. Enjoy fast dashboards! 🚀
