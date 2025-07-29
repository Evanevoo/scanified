import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://jtfucttzaswmqqhmmhfb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0ZnVjdHR6YXN3bXFxaG1taGZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NDQ4NzMsImV4cCI6MjA2MTUyMDg3M30.6-CAPYefAektlh3dLRVFZbPKYSnhIAzp3knohc3NDEg';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixBottleAssignments() {
  console.log('🔧 Starting bottle assignment fix...');
  
  try {
    // 1. Get all customers
    const { data: customers, error: customerError } = await supabase
      .from('customers')
      .select('CustomerListID, name')
      .order('name');
    
    if (customerError) {
      console.error('Error fetching customers:', customerError);
      return;
    }
    
    console.log(`Found ${customers.length} customers`);
    
    // 2. Create customer name to ID mapping
    const customerNameToId = {};
    for (const customer of customers) {
      customerNameToId[customer.name.toLowerCase()] = customer.CustomerListID;
    }
    
    console.log('Customer name to ID mapping:', customerNameToId);
    
    // 3. Get all bottles that have customer_name but no assigned_customer
    const { data: bottles, error: bottleError } = await supabase
      .from('bottles')
      .select('id, barcode_number, customer_name, assigned_customer')
      .not('customer_name', 'is', null)
      .neq('customer_name', '');
    
    if (bottleError) {
      console.error('Error fetching bottles:', bottleError);
      return;
    }
    
    console.log(`Found ${bottles.length} bottles with customer_name`);
    
    // 4. Update bottles that need fixing
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const bottle of bottles) {
      if (bottle.customer_name && !bottle.assigned_customer) {
        const customerId = customerNameToId[bottle.customer_name.toLowerCase()];
        
        if (customerId) {
          // Update the bottle with the correct assigned_customer
          const { error: updateError } = await supabase
            .from('bottles')
            .update({ assigned_customer: customerId })
            .eq('id', bottle.id);
          
          if (updateError) {
            console.error(`Error updating bottle ${bottle.barcode_number}:`, updateError);
          } else {
            console.log(`✅ Updated bottle ${bottle.barcode_number} -> customer ${customerId}`);
            updatedCount++;
          }
        } else {
          console.log(`⚠️  No customer found for "${bottle.customer_name}" (bottle ${bottle.barcode_number})`);
          skippedCount++;
        }
      } else if (bottle.assigned_customer) {
        console.log(`ℹ️  Bottle ${bottle.barcode_number} already has assigned_customer: ${bottle.assigned_customer}`);
        skippedCount++;
      }
    }
    
    console.log(`\n🎉 Fix completed!`);
    console.log(`✅ Updated: ${updatedCount} bottles`);
    console.log(`⏭️  Skipped: ${skippedCount} bottles`);
    
    // 5. Verify the fix by checking a specific customer
    // Remove hardcoded test customer ID - this should be looked up from actual data
    // const testCustomerId = '1370000-1751921174831';
    
    // Instead, let's find an actual customer ID from the database
    const { data: customers, error: customerError } = await supabase
      .from('customers')
      .select('CustomerListID')
      .limit(1);
    
    if (customerError) {
      console.error('Error fetching customers:', customerError);
      return;
    }
    
    const testCustomerId = customers?.[0]?.CustomerListID;
    if (!testCustomerId) {
      console.log('No customers found in database to test with');
      return;
    }

    const { data: testBottles, error: testError } = await supabase
      .from('bottles')
      .select('barcode_number, customer_name, assigned_customer')
      .eq('assigned_customer', testCustomerId);
    
    if (testError) {
      console.error('Error testing customer bottles:', testError);
    } else {
      console.log(`\n🧪 Test: Customer ${testCustomerId} now has ${testBottles.length} assigned bottles:`);
      testBottles.forEach(bottle => {
        console.log(`  - ${bottle.barcode_number} (${bottle.customer_name})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error during fix:', error);
  }
}

// Run the fix
fixBottleAssignments(); 