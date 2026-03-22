#!/usr/bin/env node

/**
 * Debug script to check report counts
 */

import 'dotenv/config';

async function main() {
  console.log('🔍 Debugging report count discrepancy...\n');

  try {
    // 1. Check sync table count
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { count: syncCount, error: syncError } = await supabase
      .from('reports_sync')
      .select('*', { count: 'exact', head: true });

    if (syncError) {
      console.error('❌ Error fetching sync count:', syncError);
    } else {
      console.log('✅ reports_sync count:', syncCount);
    }

    // 2. Check raw Google Sheets count
    const { reportsService } = await import('../lib/services/reports-service.ts');
    const allReports = await reportsService.getReports();
    console.log('✅ reportsService.getReports() count:', allReports.length);

    // 3. Check for duplicates
    const sheetIds = allReports.map(r => r.original_id || r.id);
    const uniqueSheetIds = new Set(sheetIds);
    console.log('   - Unique IDs:', uniqueSheetIds.size);
    console.log('   - Duplicates:', sheetIds.length - uniqueSheetIds.size);

    // 4. Check status distribution
    const statusCounts: Record<string, number> = {};
    allReports.forEach(r => {
      const status = r.status || 'UNKNOWN';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    console.log('\n📊 Status distribution:');
    Object.entries(statusCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });

    // 5. Check category distribution
    const categoryCounts: Record<string, number> = {};
    allReports.forEach(r => {
      const cat = r.main_category || r.category || 'UNKNOWN';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
    console.log('\n📊 Category distribution:');
    Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, count]) => {
        console.log(`   ${cat}: ${count}`);
      });

    // 6. Check for empty/null critical fields
    const missingBranch = allReports.filter(r => !r.branch && !r.reporting_branch).length;
    const missingDate = allReports.filter(r => !r.date_of_event && !r.created_at).length;
    const missingStatus = allReports.filter(r => !r.status).length;

    console.log('\n⚠️  Missing fields:');
    console.log(`   Missing branch: ${missingBranch}`);
    console.log(`   Missing date: ${missingDate}`);
    console.log(`   Missing status: ${missingStatus}`);

    // 7. Compare first few records
    console.log('\n📋 Sample records (first 5):');
    allReports.slice(0, 5).forEach((r, i) => {
      console.log(`   ${i + 1}. ID: ${r.id?.substring(0, 8)}... | Branch: ${r.branch || 'N/A'} | Status: ${r.status || 'N/A'} | Category: ${r.main_category || 'N/A'}`);
    });

    // 8. Summary
    console.log('\n📈 Summary:');
    console.log(`   Sync table: ${syncCount || 'N/A'}`);
    console.log(`   Service fetch: ${allReports.length}`);
    console.log(`   Difference: ${Math.abs((syncCount || 0) - allReports.length)}`);

    if (syncCount && syncCount !== allReports.length) {
      console.log('\n⚠️  COUNT MISMATCH DETECTED!');
      console.log('   Run: npm run sync:reports to update sync table');
    } else {
      console.log('\n✅ Counts match!');
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  }
}

main();
