// Debug script to diagnose RLS policy issues with customer imports
// Run this script to understand why the import is failing

import { supabase } from './src/supabase/client.js';

async function debugRLSIssue() {
  console.log('🔍 Debugging RLS Policy Issue for Customer Imports');
  console.log('=' .repeat(60));
  
  try {
    // 1. Check current user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Authentication Error:', authError);
      return;
    }
    
    if (!user) {
      console.error('❌ No authenticated user found');
      console.log('💡 Please log in to your application first, then run this script');
      return;
    }
    
    console.log('✅ Current User:', {
      id: user.id,
      email: user.email,
      created_at: user.created_at
    });
    
    // 2. Check user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error('❌ Profile Error:', profileError);
      return;
    }
    
    console.log('✅ User Profile:', {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      organization_id: profile.organization_id,
      created_at: profile.created_at
    });
    
    // 3. Check organization
    if (profile.organization_id) {
      const { data: organization, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single();
      
      if (orgError) {
        console.error('❌ Organization Error:', orgError);
      } else {
        console.log('✅ Organization:', {
          id: organization.id,
          name: organization.name,
          created_at: organization.created_at
        });
      }
    } else {
      console.error('❌ User has no organization_id assigned');
      console.log('💡 Solution: Use the Fix Organization Link tool at /fix-organization-link');
    }
    
    // 4. Test customer query permissions
    console.log('\n🔍 Testing Customer Query Permissions:');
    
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('CustomerListID, name, organization_id')
      .limit(5);
    
    if (customersError) {
      console.error('❌ Customer Query Error:', customersError);
    } else {
      console.log('✅ Customer Query Success:', customers.length, 'customers found');
      if (customers.length > 0) {
        console.log('Sample customers:', customers.slice(0, 3));
      }
    }
    
    // 5. Test customer creation
    console.log('\n🔍 Testing Customer Creation:');
    
    if (!profile.organization_id) {
      console.error('❌ Cannot test customer creation: No organization_id');
      return;
    }
    
    const testCustomer = {
      CustomerListID: `TEST-${Date.now()}`,
      name: 'Test Customer for RLS Debug',
      organization_id: profile.organization_id,
      barcode: `*%test-${Date.now()}*`,
      customer_barcode: `*%test-${Date.now()}*`
    };
    
    console.log('Attempting to create test customer:', testCustomer);
    
    const { data: createdCustomer, error: createError } = await supabase
      .from('customers')
      .insert([testCustomer])
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Customer Creation Error:', createError);
      console.log('Error details:', {
        message: createError.message,
        code: createError.code,
        hint: createError.hint,
        details: createError.details
      });
      
      // Specific RLS error handling
      if (createError.message.includes('row-level security policy')) {
        console.log('\n🚨 RLS Policy Error Detected!');
        console.log('This means the Row Level Security policy is preventing the insert.');
        console.log('Possible causes:');
        console.log('1. User profile missing organization_id');
        console.log('2. RLS policy is too restrictive');
        console.log('3. Database policy configuration issue');
        console.log('\n💡 Solutions:');
        console.log('1. Run the fix-customers-rls-policies.sql script');
        console.log('2. Check if your user account is properly linked to an organization');
        console.log('3. Contact database administrator to review RLS policies');
      }
    } else {
      console.log('✅ Customer Creation Success:', createdCustomer);
      
      // Clean up test customer
      const { error: deleteError } = await supabase
        .from('customers')
        .delete()
        .eq('CustomerListID', testCustomer.CustomerListID);
      
      if (deleteError) {
        console.error('❌ Test Customer Cleanup Error:', deleteError);
      } else {
        console.log('✅ Test customer cleaned up successfully');
      }
    }
    
    // 6. Summary and recommendations
    console.log('\n📋 Summary and Recommendations:');
    console.log('=' .repeat(60));
    
    if (!profile.organization_id) {
      console.log('🚨 CRITICAL: User has no organization_id');
      console.log('   → Visit /fix-organization-link to fix this');
    }
    
    if (profile.role === 'owner') {
      console.log('✅ User is an owner - should have full access');
    } else {
      console.log('ℹ️  User role:', profile.role);
      console.log('   → Organization-specific access only');
    }
    
    console.log('\n🔧 Next Steps:');
    console.log('1. Run fix-customers-rls-policies.sql in your database');
    console.log('2. Ensure user has proper organization_id assigned');
    console.log('3. Test import again');
    console.log('4. Contact support if issues persist');
    
  } catch (error) {
    console.error('❌ Unexpected Error:', error);
  }
}

// Run the debug script
debugRLSIssue().catch(console.error);

export { debugRLSIssue }; 