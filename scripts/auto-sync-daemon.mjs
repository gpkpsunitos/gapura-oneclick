#!/usr/bin/env node

/**
 * Auto-sync daemon for development mode
 * Syncs reports from Google Sheets every 5 minutes
 * Usage: node scripts/auto-sync-daemon.mjs
 */

import 'dotenv/config';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const SYNC_INTERVAL_MS = 1 * 60 * 1000; // 1 minute

let isSyncing = false;
let syncCount = 0;

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

async function performSync() {
  if (isSyncing) {
    console.log('⏳ Sync already in progress, skipping...');
    return;
  }

  isSyncing = true;
  const startTime = Date.now();

  try {
    console.log(`\n🔄 [${new Date().toLocaleTimeString()}] Starting sync #${++syncCount}...`);
    
    const syncRes = await fetchWithTimeout(
      `${BASE_URL}/api/admin/sync-reports`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      },
      90000 // 90 second timeout
    );

    if (!syncRes.ok) {
      const errorText = await syncRes.text();
      console.error('❌ Sync failed:', syncRes.status, syncRes.statusText);
      console.error('Response:', errorText);
      return;
    }

    const result = await syncRes.json();
    const duration = Date.now() - startTime;
    
    console.log(`✅ Sync completed in ${duration}ms:`);
    console.log(`   - Processed: ${result.totalProcessed}`);
    console.log(`   - Inserted: ${result.inserted}`);
    console.log(`   - Updated: ${result.updated}`);
    if (typeof result.deleted === 'number') {
      console.log(`   - Deleted: ${result.deleted}`);
    }
    console.log(`   - Errors: ${result.errors}`);
    
    if (result.error) {
      console.error('   - Error:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Dev server not running. Start it with: npm run dev');
      console.error('Daemon will retry in 5 minutes...\n');
    }
  } finally {
    isSyncing = false;
  }
}

async function main() {
  console.log('🚀 Auto-sync daemon starting...');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`⏱️  Sync interval: ${SYNC_INTERVAL_MS / 1000 / 60} minutes`);
  console.log('Press Ctrl+C to stop\n');

  // Initial sync
  await performSync();

  // Schedule periodic syncs
  setInterval(performSync, SYNC_INTERVAL_MS);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down auto-sync daemon...');
    console.log(`📊 Total syncs performed: ${syncCount}`);
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n\n👋 Shutting down auto-sync daemon...');
    console.log(`📊 Total syncs performed: ${syncCount}`);
    process.exit(0);
  });
}

main();
