#!/usr/bin/env node

/**
 * Manual sync script to populate reports_sync table from Google Sheets
 * Usage: node scripts/sync-reports-node.mjs
 * 
 * This script directly calls the API endpoint to trigger sync
 */

import 'dotenv/config';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function fetchWithTimeout(url, options = {}, timeout = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function main() {
  console.log('🔄 Starting manual sync...\n');
  
  try {
    console.log('📍 Base URL:', BASE_URL);
    console.log('');

    // Check current status
    console.log('📊 Checking current sync status...');
    const statusRes = await fetchWithTimeout(`${BASE_URL}/api/admin/sync-reports`);
    
    if (!statusRes.ok) {
      console.warn('⚠️  Failed to fetch status:', statusRes.status, statusRes.statusText);
    } else {
      const status = await statusRes.json();
      console.log('Current status:', JSON.stringify(status, null, 2));
    }
    console.log('');

    // Run sync
    console.log('🚀 Triggering sync...');
    const syncRes = await fetchWithTimeout(
      `${BASE_URL}/api/admin/sync-reports`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      },
      60000 // 60 second timeout for sync
    );

    if (!syncRes.ok) {
      const errorText = await syncRes.text();
      console.error('❌ Sync request failed:', syncRes.status, syncRes.statusText);
      console.error('Response:', errorText);
      process.exit(1);
    }

    const result = await syncRes.json();
    
    console.log('\n=== SYNC RESULT ===');
    console.log('Success:', result.success);
    console.log('Total processed:', result.totalProcessed);
    console.log('Inserted:', result.inserted);
    console.log('Updated:', result.updated);
    if (typeof result.deleted === 'number') {
      console.log('Deleted:', result.deleted);
    }
    console.log('Errors:', result.errors);
    console.log('Duration:', result.duration, 'ms');
    
    if (result.error) {
      console.error('Error:', result.error);
      process.exit(1);
    }

    // Check updated status
    console.log('\n📊 Checking updated sync status...');
    const updatedStatusRes = await fetchWithTimeout(`${BASE_URL}/api/admin/sync-reports`);
    if (updatedStatusRes.ok) {
      const updatedStatus = await updatedStatusRes.json();
      console.log('Updated status:', JSON.stringify(updatedStatus, null, 2));
    }
    
    console.log('\n✅ Sync completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Tip: Make sure your Next.js server is running:');
      console.error('   npm run dev');
    }
    
    process.exit(1);
  }
}

main();
