import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://jtfucttzaswmqqhmmhfb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0ZnVjdHR6YXN3bXFxaG1taGZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NDQ4NzMsImV4cCI6MjA2MTUyMDg3M30.6-CAPYefAektlh3dLRVFZbPKYSnhIAzp3knohc3NDEg';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBottlesAndCustomers() {
  console.log('🔍 Checking bottles and customers...');
  
  try {
    // 1. Check customers
    const { data: customers, error: customerError } = await supabase
      .from('customers')
      .select('CustomerListID, name, organization_id')
      .order('name');
    
    if (customerError) {
      console.error('Error fetching customers:', customerError);
      return;
    }
    
    console.log(`\n📊 Customers found: ${customers.length}`);
    if (customers.length > 0) {
      console.log('Sample customers:');
      customers.slice(0, 5).forEach(c => {
        console.log(`  - ${c.name} (${c.CustomerListID}) - Org: ${c.organization_id}`);
      });
    }
    
    // 2. Check bottles
    const { data: bottles, error: bottleError } = await supabase
      .from('bottles')
      .select('id, barcode_number, customer_name, assigned_customer, organization_id')
      .order('barcode_number');
    
    if (bottleError) {
      console.error('Error fetching bottles:', bottleError);
      return;
    }
    
    console.log(`\n📊 Bottles found: ${bottles.length}`);
    
    // 3. Analyze bottle assignments
    const bottlesWithCustomer = bottles.filter(b => b.customer_name);
    const bottlesWithAssignedCustomer = bottles.filter(b => b.assigned_customer);
    
    console.log(`\n📋 Bottle Analysis:`);
    console.log(`  - Total bottles: ${bottles.length}`);
    console.log(`  - Bottles with customer_name: ${bottlesWithCustomer.length}`);
    console.log(`  - Bottles with assigned_customer: ${bottlesWithAssignedCustomer.length}`);
    
    // 4. Show sample bottles
    if (bottles.length > 0) {
      console.log('\nSample bottles:');
      bottles.slice(0, 10).forEach(b => {
        console.log(`  - ${b.barcode_number} | Customer: "${b.customer_name}" | Assigned: "${b.assigned_customer}" | Org: ${b.organization_id}`);
      });
    }
    
    // 5. Check for bottles that should be assigned but aren't
    const unassignedBottles = bottles.filter(b => 
      b.customer_name && !b.assigned_customer && b.customer_name.trim() !== ''
    );
    
    console.log(`\n⚠️  Bottles with customer_name but no assigned_customer: ${unassignedBottles.length}`);
    if (unassignedBottles.length > 0) {
      console.log('Sample unassigned bottles:');
      unassignedBottles.slice(0, 5).forEach(b => {
        console.log(`  - ${b.barcode_number}: "${b.customer_name}"`);
      });
    }
    
    // 6. Check unique customer names in bottles
    const uniqueCustomerNames = [...new Set(bottles.map(b => b.customer_name).filter(Boolean))];
    console.log(`\n👥 Unique customer names in bottles: ${uniqueCustomerNames.length}`);
    if (uniqueCustomerNames.length > 0) {
      console.log('Customer names found in bottles:');
      uniqueCustomerNames.slice(0, 10).forEach(name => {
        console.log(`  - "${name}"`);
      });
    }
    
    // 7. Test a specific customer detail query
    if (customers.length > 0) {
      const testCustomer = customers[0];
      console.log(`\n🧪 Testing customer detail query for: ${testCustomer.name} (${testCustomer.CustomerListID})`);
      
      const { data: customerBottles, error: testError } = await supabase
        .from('bottles')
        .select('*')
        .eq('assigned_customer', testCustomer.CustomerListID);
      
      if (testError) {
        console.error('Error testing customer bottles:', testError);
      } else {
        console.log(`  - Found ${customerBottles.length} bottles assigned to this customer`);
        if (customerBottles.length > 0) {
          console.log('  Sample assigned bottles:');
          customerBottles.slice(0, 3).forEach(b => {
            console.log(`    - ${b.barcode_number} (${b.customer_name})`);
          });
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error during check:', error);
  }
}

// Run the check
checkBottlesAndCustomers(); 