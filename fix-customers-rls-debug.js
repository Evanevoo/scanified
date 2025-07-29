// Debug and fix RLS issues for customers table
// Run this script to identify and resolve the RLS policy problems

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugRLSIssue() {
  console.log('🔍 Debugging RLS issue for customers table...\n');

  try {
    // 1. Check current user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('❌ Auth error:', authError.message);
      return;
    }

    if (!user) {
      console.error('❌ No authenticated user found');
      return;
    }

    console.log('✅ Authenticated user:', user.id);

    // 2. Check user profile and organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, organization_id, role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('❌ Profile error:', profileError.message);
      return;
    }

    if (!profile.organization_id) {
      console.error('❌ User has no organization_id in profile');
      return;
    }

    console.log('✅ User profile:', {
      id: profile.id,
      organization_id: profile.organization_id,
      role: profile.role
    });

    // 3. Test basic customer query
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, CustomerListID, name, organization_id')
      .limit(5);

    if (customersError) {
      console.error('❌ Customer query error:', customersError.message);
    } else {
      console.log('✅ Customer query successful. Sample customers:', customers.length);
    }

    // 4. Test customer creation with explicit organization_id
    const testCustomer = {
      CustomerListID: `TEST_${Date.now()}`,
      name: 'Test Customer for RLS',
      organization_id: profile.organization_id,
      barcode: `*%test${Date.now()}*`,
      customer_barcode: `*%test${Date.now()}*`
    };

    console.log('\n🧪 Testing customer creation with data:', testCustomer);

    const { data: newCustomer, error: insertError } = await supabase
      .from('customers')
      .insert([testCustomer])
      .select()
      .single();

    if (insertError) {
      console.error('❌ Customer insert error:', insertError.message);
      console.error('Error details:', insertError);
      
      // Try to provide specific solutions
      if (insertError.message.includes('row-level security policy')) {
        console.log('\n💡 RLS Policy Issue Solutions:');
        console.log('1. Check that the user has a valid organization_id in their profile');
        console.log('2. Verify RLS policies allow INSERT for authenticated users');
        console.log('3. Ensure organization_id is explicitly set in the INSERT data');
        console.log('4. Run the fix-customers-rls-policies.sql script');
      }
    } else {
      console.log('✅ Customer created successfully:', newCustomer.CustomerListID);
      
      // Clean up test customer
      await supabase
        .from('customers')
        .delete()
        .eq('id', newCustomer.id);
      console.log('✅ Test customer cleaned up');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

async function fixRLSPolicies() {
  console.log('\n🔧 Attempting to fix RLS policies...');
  
  try {
    // This requires admin privileges, so it might not work from client
    const { error } = await supabase.rpc('fix_customers_rls_policies');
    
    if (error) {
      console.error('❌ Could not fix RLS policies automatically:', error.message);
      console.log('💡 Please run the fix-customers-rls-policies.sql script manually in your Supabase dashboard');
    } else {
      console.log('✅ RLS policies fixed successfully');
    }
  } catch (error) {
    console.log('💡 Run the fix-customers-rls-policies.sql script manually in your Supabase dashboard');
  }
}

// Run the debug function
debugRLSIssue()
  .then(() => fixRLSPolicies())
  .then(() => {
    console.log('\n🎉 RLS debugging complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }); 