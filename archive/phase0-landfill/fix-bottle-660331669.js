// Run this in browser console (F12) to manually fix bottle 660331669
// This will unassign it from ZR Signs and reset days_at_location

(async () => {
  const { supabase } = await import('/src/supabase/client.js');
  const { resetDaysAtLocation } = await import('/src/utils/daysAtLocationUpdater.js');
  
  console.log('🔧 Fixing bottle 660331669...\n');
  
  const barcode = '660331669';
  const orgId = 'e215231c-326f-4382-93ce-95406ca2e54d'; // WeldCor Supplies SK
  
  // 1. Find the bottle
  console.log('1. Finding bottle...');
  const { data: bottles, error: bottleError } = await supabase
    .from('bottles')
    .select('*')
    .eq('barcode_number', barcode)
    .eq('organization_id', orgId)
    .limit(1);
  
  if (bottleError) {
    console.error('❌ Error finding bottle:', bottleError);
    return;
  }
  
  if (!bottles || bottles.length === 0) {
    console.error('❌ Bottle not found');
    return;
  }
  
  const bottle = bottles[0];
  console.log('✅ Found bottle:', {
    id: bottle.id,
    barcode: bottle.barcode_number,
    currentCustomer: bottle.assigned_customer || bottle.customer_name,
    status: bottle.status,
    daysAtLocation: bottle.days_at_location
  });
  
  // 2. Unassign from customer
  console.log('\n2. Unassigning from customer...');
  const updateData = {
    assigned_customer: null,
    customer_name: null,
    status: 'empty',  // Mark as empty when returned - user will mark as filled via mobile app
    days_at_location: 0
  };
  
  const { error: updateError } = await supabase
    .from('bottles')
    .update(updateData)
    .eq('id', bottle.id)
    .eq('organization_id', orgId);
  
  if (updateError) {
    console.error('❌ Error updating bottle:', updateError);
    return;
  }
  
  console.log('✅ Bottle unassigned from customer');
  
  // 3. Reset days_at_location
  console.log('\n3. Resetting days_at_location...');
  const resetResult = await resetDaysAtLocation(bottle.id);
  if (resetResult.success) {
    console.log('✅ days_at_location reset to 0');
  } else {
    console.warn('⚠️ Could not reset days_at_location:', resetResult.error);
  }
  
  // 4. End rental record
  console.log('\n4. Ending rental record...');
  const { data: activeRentals } = await supabase
    .from('rentals')
    .select('id')
    .eq('bottle_barcode', barcode)
    .eq('organization_id', orgId)
    .is('rental_end_date', null)
    .limit(1);
  
  if (activeRentals && activeRentals.length > 0) {
    const { error: rentalError } = await supabase
      .from('rentals')
      .update({ rental_end_date: new Date().toISOString().split('T')[0] })
      .eq('id', activeRentals[0].id);
    
    if (rentalError) {
      console.warn('⚠️ Error ending rental:', rentalError);
    } else {
      console.log('✅ Rental record ended');
    }
  } else {
    console.log('ℹ️ No active rental record found');
  }
  
  // 5. Verify the fix
  console.log('\n5. Verifying fix...');
  const { data: updatedBottle } = await supabase
    .from('bottles')
    .select('*')
    .eq('barcode_number', barcode)
    .eq('organization_id', orgId)
    .limit(1)
    .single();
  
  if (updatedBottle) {
    console.log('✅ Bottle updated successfully:');
    console.log('  - Assigned Customer:', updatedBottle.assigned_customer || 'null (unassigned)');
    console.log('  - Customer Name:', updatedBottle.customer_name || 'null');
    console.log('  - Status:', updatedBottle.status);
    console.log('  - Days at Location:', updatedBottle.days_at_location);
    console.log('  - Rental End Date:', updatedBottle.rental_end_date);
  }
  
  console.log('\n✅ Fix complete! Refresh the page to see the changes.');
})();

