# Check Bottle and Order Status

Run this in your browser console (F12) to check what happened:

```javascript
(async () => {
  const { supabase } = await import('/src/supabase/client.js');
  
  console.log('=== Checking Order 66667 Status ===\n');
  
  // Check scans table
  const { data: scans } = await supabase
    .from('scans')
    .select('*')
    .eq('order_number', '66667');
  
  console.log('📋 Scans for order 66667:', scans);
  
  // Check bottle_scans table
  const { data: bottleScans } = await supabase
    .from('bottle_scans')
    .select('*')
    .eq('order_number', '66667');
  
  console.log('📋 Bottle_scans for order 66667:', bottleScans);
  
  // Extract barcodes
  const barcodes = new Set();
  if (scans) scans.forEach(s => s.barcode_number && barcodes.add(s.barcode_number));
  if (bottleScans) bottleScans.forEach(s => s.bottle_barcode && barcodes.add(s.bottle_barcode));
  
  console.log('\n📦 Barcodes found:', Array.from(barcodes));
  
  // Check each bottle
  console.log('\n=== Bottle Details ===\n');
  for (const barcode of barcodes) {
    const { data: bottle } = await supabase
      .from('bottles')
      .select('*')
      .eq('barcode_number', barcode)
      .limit(1)
      .single();
    
    if (bottle) {
      console.log(`Bottle ${barcode}:`);
      console.log('  - Status:', bottle.status);
      console.log('  - Customer Name:', bottle.customer_name);
      console.log('  - Assigned Customer:', bottle.assigned_customer);
      console.log('  - Rental Order:', bottle.rental_order_number);
      console.log('  - Full data:', bottle);
    } else {
      console.log(`❌ Bottle ${barcode} not found in database`);
    }
  }
  
  // Check ZR Signs customer
  console.log('\n=== ZR Signs Customer ===\n');
  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('name', 'ZR Signs')
    .limit(1);
  
  console.log('ZR Signs customer:', customer);
})();
```

This will show:
1. What scans exist for order 66667
2. What bottles were scanned
3. Current status of each bottle
4. ZR Signs customer info

**Please run this and share the output!**

