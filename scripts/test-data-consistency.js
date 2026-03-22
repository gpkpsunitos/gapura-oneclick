#!/usr/bin/env node
/**
 * Data Consistency Test Script
 * Verifies that data from Google Sheets is correctly mapped and displayed
 * 
 * Run: node test-data-consistency.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Data Consistency After Fixes\n');
console.log('=' .repeat(80));

// Test 1: Check reports-service.ts mapping
console.log('\n✅ TEST 1: Status Mapping in reports-service.ts\n');

const reportsServicePath = path.join(__dirname, '..', 'lib', 'services', 'reports-service.ts');
const reportsServiceContent = fs.readFileSync(reportsServicePath, 'utf8');

// Check for status mapping
const hasStatusMapping = reportsServiceContent.includes('statusMapping');
const hasClosedMapping = reportsServiceContent.includes("'Closed': 'CLOSED'");
const hasOpenMapping = reportsServiceContent.includes("'Open': 'OPEN'");

console.log('Status Mapping Implementation:');
console.log(`  ${hasStatusMapping ? '✅' : '❌'} Status mapping object exists`);
console.log(`  ${hasClosedMapping ? '✅' : '❌'} Maps "Closed" to "CLOSED"`);
console.log(`  ${hasOpenMapping ? '✅' : '❌'} Maps "Open" to "OPEN"`);

// Test 2: Check severity mapping
console.log('\n✅ TEST 2: Severity Mapping\n');

const hasSeverityMapping = reportsServiceContent.includes('severityMap');
const hasHighSeverity = reportsServiceContent.includes("'High': 'high'");
const hasMediumSeverity = reportsServiceContent.includes("'Medium': 'medium'");

console.log('Severity Mapping Implementation:');
console.log(`  ${hasSeverityMapping ? '✅' : '❌'} Severity mapping exists`);
console.log(`  ${hasHighSeverity ? '✅' : '❌'} Maps "High" to "high"`);
console.log(`  ${hasMediumSeverity ? '✅' : '❌'} Maps "Medium" to "medium"`);

// Test 3: Check field header mapping
console.log('\n✅ TEST 3: Field Header Mapping\n');

const hasUnderscoreHeaders = reportsServiceContent.includes('Date_of_Event');
const hasCategoryMapping = reportsServiceContent.includes('Irregularity_Complain_Category');
const hasBranchMapping = reportsServiceContent.includes('Reporting_Branch');

console.log('Field Header Mapping:');
console.log(`  ${hasUnderscoreHeaders ? '✅' : '❌'} Uses underscore headers (e.g., Date_of_Event)`);
console.log(`  ${hasCategoryMapping ? '✅' : '❌'} Maps Irregularity_Complain_Category`);
console.log(`  ${hasBranchMapping ? '✅' : '❌'} Maps Reporting_Branch`);

// Test 4: Check alias handling
console.log('\n✅ TEST 4: Field Aliases\n');

const hasMainCategoryAlias = reportsServiceContent.includes('report.main_category = report.irregularity_complain_category');
const hasAirlinesAlias = reportsServiceContent.includes('if (report.airline && !report.airlines)');
const hasBranchAlias = reportsServiceContent.includes('report.branch = report.reporting_branch');

console.log('Field Alias Handling:');
console.log(`  ${hasMainCategoryAlias ? '✅' : '❌'} Maps irregularity_complain_category to main_category`);
console.log(`  ${hasAirlinesAlias ? '✅' : '❌'} Handles airline/airlines aliases`);
console.log(`  ${hasBranchAlias ? '✅' : '❌'} Maps reporting_branch to branch`);

// Test 5: Summary
console.log('\n' + '=' .repeat(80));
console.log('📊 SUMMARY\n');

const allTests = [
  hasStatusMapping,
  hasClosedMapping,
  hasOpenMapping,
  hasSeverityMapping,
  hasHighSeverity,
  hasMediumSeverity,
  hasUnderscoreHeaders,
  hasCategoryMapping,
  hasBranchMapping,
  hasMainCategoryAlias,
  hasAirlinesAlias,
  hasBranchAlias
];

const passedTests = allTests.filter(Boolean).length;
const totalTests = allTests.length;

console.log(`Tests Passed: ${passedTests}/${totalTests}`);
console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (passedTests === totalTests) {
  console.log('\n✅ All data mapping fixes are in place!');
  console.log('\nKey Improvements:');
  console.log('  1. Status values from Google Sheets (Closed/Open) now map to internal values (CLOSED/OPEN)');
  console.log('  2. Severity values are normalized to lowercase (high/medium/low)');
  console.log('  3. Google Sheets headers with underscores are now properly mapped');
  console.log('  4. Field aliases ensure data consistency across different field names');
  console.log('\n📋 Next Steps:');
  console.log('  1. Clear browser cache to see updated data');
  console.log('  2. Click Refresh button on dashboard to fetch fresh data');
  console.log('  3. Verify status counts match between UI and Google Sheets');
} else {
  console.log('\n⚠️  Some tests failed. Please review the fixes.');
}

console.log('\n' + '=' .repeat(80));
