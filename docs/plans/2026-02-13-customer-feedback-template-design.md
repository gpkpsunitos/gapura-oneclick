# Customer Feedback Dashboard Template Design

## Goal
Replace the AI-generated layout for Customer Feedback dashboards with a hardcoded template that matches the screenshots exactly. Keep existing AI generate for other dashboard types.

## Approach: Hardcoded Template
- New API endpoint generates a fixed DashboardDefinition (no AI call needed)
- User provides prompt + date range → system returns exact 5-page template
- All queries use real DB schema, filtered by date range
- Landside pages (1-3) exclude UQ division; CGO pages (4-5) only show UQ

## 5-Page Structure
1. Case Category (Landside) - KPIs, donuts, horizontal bars, heatmaps
2. Detail Category (Landside) - Area breakdown tables, HUB report, detail table
3. Detail Report (Landside) - Full detail table
4. CGO - Case Category - Same as page 1 but UQ only
5. CGO - Detail Report - Same as page 2 but UQ only

## Changes Required
1. New template file: `lib/builder/customer-feedback-template.ts`
2. New API route: `POST /api/dashboards/customer-feedback-generate`
3. Update `useAIDashboard` hook to support customer feedback mode
4. Update `BuilderLayout` UI to offer Customer Feedback option
5. Ensure `CustomDashboardContent` renders all tile types correctly
