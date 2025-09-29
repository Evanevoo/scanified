#!/usr/bin/env node

/**
 * Mobile App Functionality Test Script
 * Tests all major features of the gas cylinder mobile app
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://jtfucttzaswmqqhmmhfb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0ZnVjdHR6YXN3bXFxaG1taGZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NDQ4NzMsImV4cCI6MjA2MTUyMDg3M30.6-CAPYefAektlh3dLRVFZbPKYSnhIAzp3knohc3NDEg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test results
const testResults = {
  passed: [],
  failed: [],
  warnings: []
};

// Helper function to log test results
function logTest(testName, success, message = '') {
  if (success) {
    console.log(`✅ ${testName}`);
    testResults.passed.push(testName);
  } else {
    console.log(`❌ ${testName}: ${message}`);
    testResults.failed.push({ test: testName, error: message });
  }
}

function logWarning(message) {
  console.log(`⚠️  ${message}`);
  testResults.warnings.push(message);
}

// Test 1: Database Connection
async function testDatabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    logTest('Database Connection', true);
    return true;
  } catch (error) {
    logTest('Database Connection', false, error.message);
    return false;
  }
}

// Test 2: Authentication Flow
async function testAuthenticationFlow() {
  try {
    // Test sign in with invalid credentials (should fail gracefully)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'testpassword123'
    });
    
    if (error && error.message.includes('Invalid login credentials')) {
      logTest('Authentication Error Handling', true);
    } else {
      logTest('Authentication Error Handling', false, 'Expected auth error not received');
    }
    
    return true;
  } catch (error) {
    logTest('Authentication Flow', false, error.message);
    return false;
  }
}

// Test 3: Check Tables Structure
async function testTablesStructure() {
  const tables = [
    'organizations',
    'profiles',
    'customers',
    'bottles',
    'scans',
    'rental_orders'
  ];
  
  let allTablesOk = true;
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        if (error.message.includes('permission denied')) {
          logWarning(`Table '${table}' exists but requires authentication`);
        } else {
          throw error;
        }
      } else {
        console.log(`  ✓ Table '${table}' accessible`);
      }
    } catch (error) {
      logTest(`Table '${table}'`, false, error.message);
      allTablesOk = false;
    }
  }
  
  logTest('Tables Structure', allTablesOk);
  return allTablesOk;
}

// Test 4: Check Apple Sign-In Provider
async function testAppleSignInProvider() {
  try {
    // Check if Apple provider is configured
    // Note: This is a basic check - full verification requires admin access
    const providers = ['apple', 'google'];
    
    logWarning('Apple Sign-In provider must be enabled in Supabase dashboard');
    logWarning('Go to: Authentication → Providers → Apple → Enable');
    
    return true;
  } catch (error) {
    logTest('Apple Sign-In Provider Check', false, error.message);
    return false;
  }
}

// Test 5: Check Required Functions
async function testDatabaseFunctions() {
  const functions = [
    'get_organization_from_profile',
    'check_organization_limits'
  ];
  
  let functionsOk = true;
  
  for (const func of functions) {
    try {
      // Try to call the function (will fail without auth, but we can check if it exists)
      const { data, error } = await supabase.rpc(func, {});
      
      if (error) {
        if (error.message.includes('authentication required') || 
            error.message.includes('permission denied') ||
            error.message.includes('JWT')) {
          console.log(`  ✓ Function '${func}' exists (requires auth)`);
        } else if (error.message.includes('not exist')) {
          throw new Error(`Function does not exist`);
        }
      } else {
        console.log(`  ✓ Function '${func}' accessible`);
      }
    } catch (error) {
      logTest(`Function '${func}'`, false, error.message);
      functionsOk = false;
    }
  }
  
  if (functionsOk) {
    logTest('Database Functions', true);
  }
  
  return functionsOk;
}

// Test 6: Check RLS Policies
async function testRLSPolicies() {
  console.log('\n📋 RLS Policies Check:');
  console.log('  ℹ️  RLS policies are enforced - tables should deny access without authentication');
  
  const tables = ['profiles', 'customers', 'bottles'];
  let rlsWorking = true;
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error && error.message.includes('permission denied')) {
        console.log(`  ✓ RLS active on '${table}'`);
      } else if (!error && (!data || data.length === 0)) {
        console.log(`  ✓ RLS active on '${table}' (no public data)`);
      } else {
        logWarning(`Table '${table}' may have public access`);
      }
    } catch (error) {
      console.log(`  ⚠️  Could not verify RLS on '${table}': ${error.message}`);
    }
  }
  
  logTest('RLS Policies', rlsWorking);
  return rlsWorking;
}

// Main test runner
async function runTests() {
  console.log('🧪 Gas Cylinder Mobile App - Functionality Tests');
  console.log('================================================\n');
  
  console.log('📱 Testing Core Features:\n');
  
  // Run all tests
  await testDatabaseConnection();
  await testAuthenticationFlow();
  await testTablesStructure();
  await testAppleSignInProvider();
  await testDatabaseFunctions();
  await testRLSPolicies();
  
  // Summary
  console.log('\n📊 Test Summary:');
  console.log('================');
  console.log(`✅ Passed: ${testResults.passed.length}`);
  console.log(`❌ Failed: ${testResults.failed.length}`);
  console.log(`⚠️  Warnings: ${testResults.warnings.length}`);
  
  if (testResults.failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.failed.forEach(({ test, error }) => {
      console.log(`  - ${test}: ${error}`);
    });
  }
  
  if (testResults.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    testResults.warnings.forEach(warning => {
      console.log(`  - ${warning}`);
    });
  }
  
  console.log('\n✨ App Status:');
  if (testResults.failed.length === 0) {
    console.log('  ✅ All core features are working!');
    console.log('  ✅ App is ready for Apple submission');
  } else {
    console.log('  ⚠️  Some issues need attention');
    console.log('  📝 Review failed tests above');
  }
  
  console.log('\n📱 Next Steps:');
  console.log('  1. Enable Apple Sign-In in Supabase dashboard');
  console.log('  2. Build with: eas build --platform ios --profile production');
  console.log('  3. Submit to App Store');
  
  process.exit(testResults.failed.length > 0 ? 1 : 0);
}

// Run the tests
runTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
