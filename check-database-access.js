import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://jtfucttzaswmqqhmmhfb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0ZnVjdHR6YXN3bXFxaG1taGZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NDQ4NzMsImV4cCI6MjA2MTUyMDg3M30.6-CAPYefAektlh3dLRVFZbPKYSnhIAzp3knohc3NDEg';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseAccess() {
  console.log('🔍 Checking database access...');
  
  try {
    // 1. Check if we can access the database at all
    console.log('\n📊 Testing basic database access...');
    
    // Try to get table information
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.error('Error accessing information_schema:', tablesError);
    } else {
      console.log('Available tables:', tables?.map(t => t.table_name).join(', '));
    }
    
    // 2. Check organizations table
    console.log('\n🏢 Checking organizations...');
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .limit(5);
    
    if (orgError) {
      console.error('Error fetching organizations:', orgError);
    } else {
      console.log(`Found ${orgs?.length || 0} organizations`);
      if (orgs && orgs.length > 0) {
        console.log('Sample organizations:');
        orgs.forEach(org => {
          console.log(`  - ${org.name} (${org.id})`);
        });
      }
    }
    
    // 3. Check customers without RLS
    console.log('\n👥 Checking customers (raw query)...');
    const { data: customers, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .limit(10);
    
    if (customerError) {
      console.error('Error fetching customers:', customerError);
    } else {
      console.log(`Found ${customers?.length || 0} customers`);
      if (customers && customers.length > 0) {
        console.log('Sample customers:');
        customers.forEach(c => {
          console.log(`  - ${c.name} (${c.CustomerListID}) - Org: ${c.organization_id}`);
        });
      }
    }
    
    // 4. Check bottles without RLS
    console.log('\n🍾 Checking bottles (raw query)...');
    const { data: bottles, error: bottleError } = await supabase
      .from('bottles')
      .select('*')
      .limit(10);
    
    if (bottleError) {
      console.error('Error fetching bottles:', bottleError);
    } else {
      console.log(`Found ${bottles?.length || 0} bottles`);
      if (bottles && bottles.length > 0) {
        console.log('Sample bottles:');
        bottles.forEach(b => {
          console.log(`  - ${b.barcode_number} | Customer: "${b.customer_name}" | Assigned: "${b.assigned_customer}" | Org: ${b.organization_id}`);
        });
      }
    }
    
    // 5. Check if we're authenticated
    console.log('\n🔐 Checking authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Error checking auth:', authError);
    } else {
      console.log('Current user:', user ? user.email : 'Not authenticated');
    }
    
    // 6. Try to get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Error getting session:', sessionError);
    } else {
      console.log('Current session:', session ? 'Active' : 'No session');
    }
    
    // 7. Check RLS policies
    console.log('\n🛡️  Checking RLS policies...');
    const { data: policies, error: policyError } = await supabase
      .from('information_schema.policies')
      .select('*')
      .eq('table_schema', 'public');
    
    if (policyError) {
      console.error('Error checking policies:', policyError);
    } else {
      console.log(`Found ${policies?.length || 0} RLS policies`);
      if (policies && policies.length > 0) {
        console.log('Sample policies:');
        policies.slice(0, 5).forEach(p => {
          console.log(`  - ${p.table_name}: ${p.policy_name} (${p.cmd})`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error during check:', error);
  }
}

// Run the check
checkDatabaseAccess(); 