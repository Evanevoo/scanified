// Quick fix script to reassign bottle 660331669 from "101 Doors and Windows Ltd." to "ZR Signs"
// Run this in the browser console (F12 → Console) on the Import Approvals page

(async () => {
  try {
    // Import supabase client (adjust path if needed)
    const { supabase } = await import('./src/supabase/client.js');
    
    // Get organization ID (you can also hardcode: 'e215231c-326f-4382-93ce-95406ca2e54d')
    const orgId = 'e215231c-326f-4382-93ce-95406ca2e54d';
    
    // Get ZR Signs customer ID
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('CustomerListID, name')
      .eq('name', 'ZR Signs')
      .eq('organization_id', orgId)
      .single();
    
    if (customerError || !customer) {
      console.error('❌ Error finding ZR Signs customer:', customerError);
      return;
    }
    
    console.log('✅ Found customer:', customer);
    
    // Update the bottle
    const { data: updatedBottle, error: updateError } = await supabase
      .from('bottles')
      .update({
        assigned_customer: customer.CustomerListID,
        customer_name: 'ZR Signs',
        status: 'RENTED',
        rental_start_date: new Date().toISOString().split('T')[0]
      })
      .eq('barcode_number', '660331669')
      .eq('organization_id', orgId)
      .select();
    
    if (updateError) {
      console.error('❌ Error updating bottle:', updateError);
    } else {
      console.log('✅ Successfully reassigned bottle to ZR Signs:', updatedBottle);
      alert('Bottle successfully reassigned to ZR Signs!');
      // Refresh the page
      window.location.reload();
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
})();

