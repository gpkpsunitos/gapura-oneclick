# Current Session Status

**Last Updated:** 2026-11-13
**Environment:** Windows + XAMPP (`10.4.32-MariaDB` on `127.0.0.1:3306`, database `gapura_oneclick`)
**Dev Server:** `http://localhost:3000` (`npm run dev` in `gapura-oneclick-main/`)

---

## Completed Work (Supabase → Local MySQL / MariaDB)

1. **MySQL 8.0 / MariaDB 10.4 Schema (`mysql/schema.sql`)**
   - Consolidated all **42 tables**, foreign keys, indexes, and sync-aware `BEFORE UPDATE` triggers from `supabase/schema/exported_schema.sql` and 80 `supabase/migrations/*.sql` files.
   - Imported into XAMPP `gapura_oneclick` via `scripts/import-mysql-schema.mjs`.

2. **MySQL Compatibility Layer (`lib/mysql/` & `lib/supabase-admin.ts`)**
   - `mysql2` installed in `package.json`.
   - `lib/mysql/pool.ts`: Singleton `mysql2/promise` pool, transaction helper, and row/value normalization.
   - `lib/mysql/query-builder.ts`: PostgREST-compatible query builder (`.select()`, `.insert()`, `.update()`, `.upsert()`, `.delete()`, filters, `.or()`, `.order()`, `.range()`, `.single()`, `.maybeSingle()`, batched relation hydration).
   - `lib/mysql/rpc.ts`: TypeScript + MySQL implementations of all **9 RPCs** (`acquire_sync_lock`, `complete_sync_state`, `bump_sync_state_version`, `consume_rate_limit`, `get_active_published_dashboard`, `delete_report_cascade`, `relink_report_children_batch`, `upsert_report_document_bundle`, `dashboard_ground_overview`).
   - `lib/mysql/storage.ts` + `app/api/storage/[bucket]/[...path]/route.ts`: Local filesystem storage under `LOCAL_STORAGE_DIR` (`./storage`) with HMAC-SHA256 signed URL verification for private buckets.
   - `lib/supabase-admin.ts` & `lib/supabase.ts`: Export `createMysqlClient()`.

3. **Standalone Scripts (`scripts/`)**
   - `scripts/mysql-client.mjs`: Pure-ESM MySQL client for Node scripts.
   - Updated `sync-scheduler.mjs`, `sync-joumpa-scheduler.mjs`, `verify-dirty-state.mjs`, `verify-no-duplicates.mjs`.
   - Added `scripts/import-mysql-schema.mjs`, `scripts/seed-local-admin.mjs`, `scripts/migrate-from-supabase.mjs`.

4. **Data Populated in Local XAMPP (`gapura_oneclick`)**
   - **Google Sheets Sync:** `1,605` rows in `ground_handling_irregularity_report` (`640` `NON CARGO` + `965` `CGO`), `50` rows in `joumpa_reports_sync`.
   - **Supabase App-Table Migration:** `39` users (plus `admin@gapura.local` = **40 total**), `44` stations, `6` units, `12` positions, `10` custom dashboards, `526` dashboard charts, `5` published dashboards, `53` report comments, `7` report documents, `29` evidence files, `27` evidence upload sessions, `10` division documents, `25` external links, `3` performance links, `5` calendar events, `5` quick-access sections, `12` quick-access tiles.

5. **Verification**
   - `npx tsc --noEmit`: Passed (exit code `0`).
   - Live HTTP checks against XAMPP MariaDB: `/auth/login` (`200`), `POST /api/auth/login` (`200`), `/api/master-data?type=stations` (`200`), `/api/quick-access` (`200`).

---

## Remaining / Future Work (When Deploying to aaPanel)
- Configure production `.env` (`NODE_ENV=production`, `DEMO_MODE=false`, strong `JWT_SECRET`, non-root MySQL credentials, `LOCAL_STORAGE_DIR` outside release dir).
- Set `client_max_body_size 32M;` in aaPanel Nginx config.
- Add aaPanel Cron jobs for `npx tsx scripts/sync-scheduler.mjs` and `npx tsx scripts/sync-joumpa-scheduler.mjs`.
- Remove or rotate `admin@gapura.local` before production go-live.
