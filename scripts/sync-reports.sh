#!/bin/bash

# Manual sync script to populate reports_sync table
# Usage: ./scripts/sync-reports.sh

set -e

echo "🔄 Starting manual sync..."
echo ""

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Check if NEXT_PUBLIC_APP_URL is set
if [ -z "$NEXT_PUBLIC_APP_URL" ]; then
  echo "⚠️  NEXT_PUBLIC_APP_URL not set, using localhost"
  BASE_URL="http://localhost:3000"
else
  BASE_URL="$NEXT_PUBLIC_APP_URL"
fi

echo "📍 Base URL: $BASE_URL"
echo ""

# Check sync status
echo "📊 Checking current sync status..."
curl -s "$BASE_URL/api/admin/sync-reports" \
  -H "Content-Type: application/json" \
  | jq '.' 2>/dev/null || echo "Failed to parse status"
echo ""

# Run sync
echo "🚀 Triggering sync..."
SYNC_RESPONSE=$(curl -s -X POST "$BASE_URL/api/admin/sync-reports" \
  -H "Content-Type: application/json")

echo "$SYNC_RESPONSE" | jq '.' 2>/dev/null || echo "$SYNC_RESPONSE"
echo ""

# Check if sync was successful
if echo "$SYNC_RESPONSE" | grep -q '"success":true'; then
  echo "✅ Sync completed successfully!"
  
  # Show updated status
  echo ""
  echo "📊 Updated sync status..."
  curl -s "$BASE_URL/api/admin/sync-reports" \
    -H "Content-Type: application/json" \
    | jq '.' 2>/dev/null || echo "Failed to parse status"
else
  echo "❌ Sync failed!"
  exit 1
fi
