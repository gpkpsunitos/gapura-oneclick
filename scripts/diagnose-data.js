#!/usr/bin/env node
/**
 * Data Diagnostic Script
 * Compares data between Google Sheets and what's shown in the UI
 * 
 * Usage: node diagnose-data.js
 */

const { reportsService } = require('./lib/services/reports-service');

async function diagnoseData() {
  console.log('🔍 Starting Data Discrepancy Diagnosis\n');
  console.log('=' .repeat(80));

  try {
    // Fetch reports from Google Sheets (bypass cache)
    console.log('\n📥 Fetching fresh data from Google Sheets...\n');
    const reports = await reportsService.getReports({ refresh: true });
    
    console.log(`✅ Total reports fetched: ${reports.length}`);
    console.log(`✅ Source sheets: NON CARGO and CGO`);
    console.log('=' .repeat(80));

    // 1. Check Data Completeness
    console.log('\n📊 DATA COMPLETENESS CHECK\n');
    
    const requiredFields = [
      'id', 'date_of_event', 'airlines', 'flight_number', 
      'branch', 'hub', 'main_category', 'description', 
      'status', 'severity', 'created_at'
    ];
    
    const completeness = {};
    requiredFields.forEach(field => {
      const hasValue = reports.filter(r => {
        const val = r[field];
        return val !== null && val !== undefined && val !== '';
      }).length;
      completeness[field] = {
        count: hasValue,
        percentage: ((hasValue / reports.length) * 100).toFixed(1)
      };
    });

    console.log('Field Completeness:');
    Object.entries(completeness).forEach(([field, stats]) => {
      const status = parseFloat(stats.percentage) > 90 ? '✅' : 
                    parseFloat(stats.percentage) > 50 ? '⚠️' : '❌';
      console.log(`  ${status} ${field}: ${stats.count}/${reports.length} (${stats.percentage}%)`);
    });

    // 2. Check Category Distribution
    console.log('\n📈 CATEGORY DISTRIBUTION\n');
    const categoryCount = {};
    reports.forEach(r => {
      const cat = r.main_category || r.category || 'Unknown';
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });
    
    console.log('Top 10 Categories:');
    Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([cat, count]) => {
        console.log(`  • ${cat}: ${count}`);
      });

    // 3. Check Status Distribution
    console.log('\n📋 STATUS DISTRIBUTION\n');
    const statusCount = {};
    reports.forEach(r => {
      const status = r.status || 'Unknown';
      statusCount[status] = (statusCount[status] || 0) + 1;
    });
    
    console.log('Status Counts:');
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`  • ${status}: ${count}`);
    });

    // 4. Check Airline Distribution
    console.log('\n✈️  AIRLINE DISTRIBUTION\n');
    const airlineCount = {};
    reports.forEach(r => {
      const airline = r.airlines || r.airline || 'Unknown';
      airlineCount[airline] = (airlineCount[airline] || 0) + 1;
    });
    
    console.log('Top 10 Airlines:');
    Object.entries(airlineCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([airline, count]) => {
        console.log(`  • ${airline}: ${count}`);
      });

    // 5. Check Branch Distribution
    console.log('\n🏢 BRANCH DISTRIBUTION\n');
    const branchCount = {};
    reports.forEach(r => {
      const branch = r.branch || r.station_code || 'Unknown';
      branchCount[branch] = (branchCount[branch] || 0) + 1;
    });
    
    console.log('Top 10 Branches:');
    Object.entries(branchCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([branch, count]) => {
        console.log(`  • ${branch}: ${count}`);
      });

    // 6. Check Hub Distribution
    console.log('\n📍 HUB DISTRIBUTION\n');
    const hubCount = {};
    reports.forEach(r => {
      const hub = r.hub || 'Unknown';
      hubCount[hub] = (hubCount[hub] || 0) + 1;
    });
    
    console.log('Hub Counts:');
    Object.entries(hubCount).forEach(([hub, count]) => {
      console.log(`  • ${hub}: ${count}`);
    });

    // 7. Sample Data Inspection
    console.log('\n🔍 SAMPLE DATA INSPECTION\n');
    console.log('First 3 Reports:');
    reports.slice(0, 3).forEach((r, idx) => {
      console.log(`\n  Report ${idx + 1}:`);
      console.log(`    ID: ${r.id}`);
      console.log(`    Date: ${r.date_of_event}`);
      console.log(`    Airline: ${r.airlines || r.airline}`);
      console.log(`    Category: ${r.main_category || r.category}`);
      console.log(`    Status: ${r.status}`);
      console.log(`    Branch: ${r.branch}`);
      console.log(`    Hub: ${r.hub}`);
      console.log(`    Description: ${(r.description || '').substring(0, 80)}...`);
    });

    // 8. Check Date Range
    console.log('\n📅 DATE RANGE\n');
    const dates = reports
      .map(r => r.date_of_event ? new Date(r.date_of_event) : null)
      .filter(d => d && !isNaN(d.getTime()))
      .sort((a, b) => a - b);
    
    if (dates.length > 0) {
      console.log(`  • Oldest: ${dates[0].toISOString()}`);
      console.log(`  • Newest: ${dates[dates.length - 1].toISOString()}`);
      console.log(`  • Total unique dates: ${dates.length}`);
    }

    // 9. Identify Potential Issues
    console.log('\n⚠️  POTENTIAL ISSUES\n');
    
    const issues = [];
    
    // Check for empty main_category
    const emptyCategory = reports.filter(r => !r.main_category && !r.category).length;
    if (emptyCategory > 0) {
      issues.push(`• ${emptyCategory} reports have empty category`);
    }
    
    // Check for empty airlines
    const emptyAirlines = reports.filter(r => !r.airlines && !r.airline).length;
    if (emptyAirlines > 0) {
      issues.push(`• ${emptyAirlines} reports have empty airline`);
    }
    
    // Check for empty branch
    const emptyBranch = reports.filter(r => !r.branch && !r.station_code).length;
    if (emptyBranch > 0) {
      issues.push(`• ${emptyBranch} reports have empty branch`);
    }
    
    // Check for invalid dates
    const invalidDates = reports.filter(r => {
      if (!r.date_of_event) return true;
      const d = new Date(r.date_of_event);
      return isNaN(d.getTime());
    }).length;
    if (invalidDates > 0) {
      issues.push(`• ${invalidDates} reports have invalid dates`);
    }
    
    if (issues.length === 0) {
      console.log('  ✅ No major issues detected');
    } else {
      issues.forEach(issue => console.log(`  ${issue}`));
    }

    console.log('\n' + '=' .repeat(80));
    console.log('✅ Diagnosis Complete');
    console.log('=' .repeat(80));

  } catch (error) {
    console.error('\n❌ Error during diagnosis:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  diagnoseData();
}

module.exports = { diagnoseData };
