#!/usr/bin/env node

/**
 * Multi-Tenancy Migration Runner
 * 
 * This script helps you run the complete multi-tenancy migration
 * and verify that everything is set up correctly.
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Gas Cylinder App - Multi-Tenancy Migration Runner');
console.log('==================================================\n');

// Check if migration file exists
const migrationFile = path.join(__dirname, 'supabase', 'migrations', '20240422000004_complete_multi_tenancy.sql');

if (!fs.existsSync(migrationFile)) {
  console.error('❌ Migration file not found:', migrationFile);
  console.log('\nPlease ensure the migration file exists before running this script.');
  process.exit(1);
}

console.log('✅ Migration file found');
console.log('📁 File:', migrationFile);

// Read migration content
const migrationContent = fs.readFileSync(migrationFile, 'utf8');

console.log('\n📋 Migration Summary:');
console.log('====================');

// Count the key operations
const operations = {
  'CREATE TABLE': (migrationContent.match(/CREATE TABLE/g) || []).length,
  'ALTER TABLE': (migrationContent.match(/ALTER TABLE/g) || []).length,
  'CREATE POLICY': (migrationContent.match(/CREATE POLICY/g) || []).length,
  'CREATE OR REPLACE FUNCTION': (migrationContent.match(/CREATE OR REPLACE FUNCTION/g) || []).length,
  'CREATE TRIGGER': (migrationContent.match(/CREATE TRIGGER/g) || []).length,
  'INSERT INTO': (migrationContent.match(/INSERT INTO/g) || []).length,
  'UPDATE': (migrationContent.match(/UPDATE/g) || []).length
};

Object.entries(operations).forEach(([operation, count]) => {
  if (count > 0) {
    console.log(`   ${operation}: ${count}`);
  }
});

console.log('\n📝 Instructions:');
console.log('================');
console.log('1. Open your Supabase dashboard');
console.log('2. Go to the SQL Editor');
console.log('3. Copy and paste the contents of the migration file');
console.log('4. Run the migration');
console.log('5. Verify the setup using the test queries below');

console.log('\n🔍 Verification Queries:');
console.log('========================');

const verificationQueries = [
  {
    name: 'Check Organizations Table',
    query: `SELECT COUNT(*) as org_count FROM organizations;`
  },
  {
    name: 'Check Profiles with Organization',
    query: `SELECT COUNT(*) as profiles_with_org FROM profiles WHERE organization_id IS NOT NULL;`
  },
  {
    name: 'Check Customers with Organization',
    query: `SELECT COUNT(*) as customers_with_org FROM customers WHERE organization_id IS NOT NULL;`
  },
  {
    name: 'Check Bottles with Organization',
    query: `SELECT COUNT(*) as bottles_with_org FROM bottles WHERE organization_id IS NOT NULL;`
  },
  {
    name: 'Check RLS Policies',
    query: `SELECT tablename, COUNT(*) as policy_count FROM pg_policies WHERE schemaname = 'public' GROUP BY tablename ORDER BY tablename;`
  },
  {
    name: 'Check Organization Usage View',
    query: `SELECT * FROM organization_usage LIMIT 5;`
  }
];

verificationQueries.forEach((item, index) => {
  console.log(`\n${index + 1}. ${item.name}:`);
  console.log(`   ${item.query}`);
});

console.log('\n🧪 Test Data Isolation:');
console.log('=======================');
console.log('After running the migration, test with these steps:');
console.log('1. Create a new user account');
console.log('2. Set up an organization');
console.log('3. Add some test data (customers, cylinders, etc.)');
console.log('4. Create another user account with a different organization');
console.log('5. Verify that each user only sees their own organization\'s data');

console.log('\n📱 Mobile App Testing:');
console.log('=====================');
console.log('1. Login to the mobile app with an organization user');
console.log('2. Create some offline data');
console.log('3. Sync the data and verify it appears in the correct organization');
console.log('4. Test all mobile app features with organization isolation');

console.log('\n⚠️  Important Notes:');
console.log('===================');
console.log('• Backup your database before running the migration');
console.log('• Test thoroughly in a development environment first');
console.log('• Monitor the application after deployment');
console.log('• Check for any errors in the browser console and Supabase logs');

console.log('\n🎯 Next Steps:');
console.log('==============');
console.log('1. Run the migration in Supabase SQL Editor');
console.log('2. Test the web application');
console.log('3. Test the mobile application');
console.log('4. Set up Stripe billing (if not already done)');
console.log('5. Configure webhooks for subscription management');

console.log('\n✅ Migration file is ready to run!');
console.log('📄 File location:', migrationFile);
console.log('\nFor detailed instructions, see: MULTI_TENANCY_SETUP.md'); 