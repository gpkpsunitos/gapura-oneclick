# Supabase Database Export

## Overview
This directory contains the complete schema and seed data export for the Gapura IRRS2 Supabase database.

## Files

### schema.sql (V4)
- Complete database schema definitions
- Includes all tables, functions, enums, and RLS policies
- Version: V4 (updated 2026-04-17)

### seed_data.sql (V4)
- Initial seed data for development/testing
- Includes users, auth records, storage buckets, and sample data
- Version: V4 (updated 2026-04-17)

## Recent Changes (V4)
- Removed unused HC workspace tables:
  - `hc_meeting_events`
  - `hc_request_attachments`
  - `hc_requests`
- Removed `update_hc_requests_updated_at()` function (no longer needed)
- Removed `hc-request-attachments` storage bucket reference from seed data

## Current Database Schema

### Public Tables (28 tables)
1. `users` - User accounts and profiles
2. `stations` - Airport stations/cabang locations
3. `reports` - Main incident reports table
4. `reports_sync` - Synced reports from Google Sheets
5. `report_comments` - Comments on reports
6. `custom_dashboards` - Custom dashboard configurations
7. `dashboard_charts` - Chart tiles within dashboards
8. `dashboard_cache_entries` - Cached dashboard snapshots
9. `calendar_events` - Team calendar events
10. `units` - Organizational units
11. `positions` - Job positions/roles
12. `incident_types` - Types of incidents
13. `locations` - Physical locations within stations
14. `hc_leave_records` - Employee leave records
15. `division_documents` - Documents managed by divisions
16. `notification_recipients` - Email notification recipients
17. `notification_delivery_log` - Log of sent notifications
18. `security_sessions` - User session management
19. `security_events` - Security event logs
20. `security_alerts` - Security alerts
21. `security_configs` - Security configuration
22. `blocked_ips` - Blocked IP addresses
23. `audit_logs` - General audit logs
24. `ai_cache_entries` - Cached AI insights
25. `ai_audit_logs` - AI feature usage logs
26. `rate_limits` - Persistent rate limiting
27. `sync_state` - Shared sync state coordination
28. `external_links` - External URLs for forms, dashboards, etc.

### Storage Buckets
- `evidence` - Evidence files for reports
- `videos` - Video files

## Usage

### Apply Schema
```bash
psql -h <your-host> -U <your-user> -d <your-database> -f schema.sql
```

### Apply Seed Data
```bash
psql -h <your-host> -U <your-user> -d <your-database> -f seed_data.sql
```

## Notes
- The schema includes Row Level Security (RLS) policies for sensitive tables
- Storage buckets are configured with appropriate access policies
- All tables use UUID primary keys for security and performance
- Timestamps are stored as `timestamptz` for timezone awareness

## Migration History
- V1: Initial schema
- V2: Added dashboard and security features
- V3: Added HC workspace tables
- V4: Removed unused HC workspace tables (2026-04-17)
