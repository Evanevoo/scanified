// Customer Diagnostic Script
// Run this in your browser console on the scanified.com website

async function checkCustomer(customerId) {
  console.log(`🔍 Checking customer ID: ${customerId}`);
  
  try {
    // Get the Supabase client from the window object
    const supabase = window.supabase || window.supabaseClient;
    
    if (!supabase) {
      console.error('❌ Supabase client not found. Make sure you\'re logged in.');
      return;
    }
    
    // Check if customer exists
    const { data: customers, error } = await supabase
      .from('customers')
      .select('id, CustomerListID, name, organization_id, created_at')
      .eq('CustomerListID', customerId);
    
    if (error) {
      console.error('Error fetching customer:', error);
      return;
    }
    
    if (!customers || customers.length === 0) {
      console.log(`❌ Customer with ID "${customerId}" not found`);
      return;
    }
    
    if (customers.length === 1) {
      console.log(`✅ Customer found:`);
      console.log(`   Name: ${customers[0].name}`);
      console.log(`   Organization: ${customers[0].organization_id}`);
      console.log(`   Created: ${customers[0].created_at}`);
      console.log(`   Database ID: ${customers[0].id}`);
    } else {
      console.log(`⚠️ Multiple customers found with ID "${customerId}":`);
      customers.forEach((customer, index) => {
        console.log(`   ${index + 1}. ${customer.name} (Org: ${customer.organization_id}, Created: ${customer.created_at})`);
      });
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Check the specific customer ID from the error
checkCustomer('80000C4F-1746649217A');
