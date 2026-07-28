// Run this in browser console (F12) to debug order 66699
(async () => {
  const { supabase } = await import('/src/supabase/client.js');
  
  console.log('=== DEBUGGING ORDER 66699 ===\n');
  
  const orderNumber = '66699';
  const barcode = '660331669';
  
  // 1. Check scans table
  console.log('1. Checking scans table...');
  const { data: scans, error: scansError } = await supabase
    .from('scans')
    .select('*')
    .eq('order_number', orderNumber);
  
  if (scansError) {
    console.error('❌ Error fetching scans:', scansError);
  } else {
    console.log(`✅ Found ${scans?.length || 0} scans for order ${orderNumber}`);
    scans?.forEach(scan => {
      console.log(`  - Barcode: ${scan.barcode_number}, Mode: "${scan.mode}", Action: "${scan.action}", Status: "${scan.status}"`);
    });
  }
  
  // 2. Check bottle_scans table
  console.log('\n2. Checking bottle_scans table...');
  const { data: bottleScans, error: bottleScansError } = await supabase
    .from('bottle_scans')
    .select('*')
    .eq('order_number', orderNumber);
  
  if (bottleScansError) {
    console.error('❌ Error fetching bottle_scans:', bottleScansError);
  } else {
    console.log(`✅ Found ${bottleScans?.length || 0} bottle_scans for order ${orderNumber}`);
    bottleScans?.forEach(scan => {
      console.log(`  - Barcode: ${scan.bottle_barcode}, Mode: "${scan.mode}", Created: ${scan.created_at}`);
    });
  }
  
  // 3. Check bottle status
  console.log('\n3. Checking bottle 660331669 status...');
  const { data: bottles, error: bottleError } = await supabase
    .from('bottles')
    .select('*')
    .eq('barcode_number', barcode)
    .limit(1);
  
  if (bottleError) {
    console.error('❌ Error fetching bottle:', bottleError);
  } else if (bottles && bottles.length > 0) {
    const bottle = bottles[0];
    console.log('✅ Bottle found:');
    console.log(`  - Status: ${bottle.status}`);
    console.log(`  - Assigned Customer: ${bottle.assigned_customer}`);
    console.log(`  - Customer Name: ${bottle.customer_name}`);
    console.log(`  - Days at Location: ${bottle.days_at_location}`);
    console.log(`  - Rental End Date: ${bottle.rental_end_date}`);
  } else {
    console.log('❌ Bottle not found');
  }
  
  // 4. Check if there are RETURN scans
  console.log('\n4. Checking for RETURN scans...');
  const returnScans = scans?.filter(s => 
    (s.mode || '').toString().toUpperCase() === 'RETURN' || 
    (s.action || '').toString().toLowerCase() === 'in'
  ) || [];
  const returnBottleScans = bottleScans?.filter(s => 
    (s.mode || '').toString().toUpperCase() === 'RETURN'
  ) || [];
  
  console.log(`  - RETURN scans in scans table: ${returnScans.length}`);
  console.log(`  - RETURN scans in bottle_scans table: ${returnBottleScans.length}`);
  
  if (returnScans.length === 0 && returnBottleScans.length === 0) {
    console.log('⚠️ WARNING: No RETURN scans found! This is why the bottle wasn\'t unassigned.');
    console.log('   The scan might have a different mode value. Check the mode values above.');
  } else {
    console.log('✅ RETURN scans found - the logic should have worked.');
  }
  
  // 5. Check imported_invoices status
  console.log('\n5. Checking imported_invoices status...');
  const { data: invoices, error: invoiceError } = await supabase
    .from('imported_invoices')
    .select('id, status, data')
    .or(`data->>order_number.eq.${orderNumber},data->>reference_number.eq.${orderNumber},data->>invoice_number.eq.${orderNumber}`)
    .limit(5);
  
  if (invoiceError) {
    console.error('❌ Error fetching invoices:', invoiceError);
  } else {
    console.log(`✅ Found ${invoices?.length || 0} invoices for order ${orderNumber}`);
    invoices?.forEach(inv => {
      console.log(`  - ID: ${inv.id}, Status: ${inv.status}`);
    });
  }
  
  console.log('\n=== END DEBUG ===');
})();

