# Fix Bottle 660331669 Assignment to ZR Signs

## Option 1: Run in Browser Console (Easiest)

1. Open your app in the browser (http://localhost:5174)
2. Open Developer Tools (F12)
3. Go to the Console tab
4. Copy and paste this code:

```javascript
(async () => {
  // Import supabase client
  const { supabase } = await import('/src/supabase/client.js');
  
  console.log('🔍 Looking for bottle 660331669...');
  
  // Find the bottle
  const { data: bottles, error: bottleError } = await supabase
    .from('bottles')
    .select('*')
    .eq('barcode_number', '660331669')
    .limit(1);
  
  if (bottleError) {
    console.error('❌ Error finding bottle:', bottleError);
    return;
  }
  
  if (!bottles || bottles.length === 0) {
    console.error('❌ Bottle 660331669 not found in database');
    return;
  }
  
  const bottle = bottles[0];
  console.log('✅ Found bottle:', bottle);
  console.log('Current assigned_customer:', bottle.assigned_customer);
  console.log('Current customer_name:', bottle.customer_name);
  console.log('Current status:', bottle.status);
  
  // Find ZR Signs customer
  console.log('\n🔍 Looking for ZR Signs customer...');
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('CustomerListID, id, name')
    .eq('name', 'ZR Signs')
    .eq('organization_id', bottle.organization_id)
    .limit(1)
    .single();
  
  if (customerError) {
    console.error('❌ Error finding customer:', customerError);
    return;
  }
  
  if (!customer) {
    console.error('❌ ZR Signs customer not found');
    return;
  }
  
  console.log('✅ Found customer:', customer);
  console.log('CustomerListID:', customer.CustomerListID);
  
  // Assign bottle to ZR Signs
  console.log('\n🔄 Assigning bottle to ZR Signs...');
  const { data: updated, error: updateError } = await supabase
    .from('bottles')
    .update({
      assigned_customer: customer.CustomerListID,
      customer_name: 'ZR Signs',
      status: 'RENTED',
      rental_start_date: new Date().toISOString().split('T')[0],
      rental_order_number: '66666',
      updated_at: new Date().toISOString()
    })
    .eq('id', bottle.id)
    .select();
  
  if (updateError) {
    console.error('❌ Error updating bottle:', updateError);
    return;
  }
  
  console.log('✅ Bottle assigned successfully to ZR Signs!');
  console.log('Updated bottle:', updated[0]);
})();
```

5. Press Enter to run
6. Check the console output to confirm the bottle was assigned
7. Navigate to ZR Signs customer detail page to verify the bottle shows up

## Option 2: Supabase SQL Editor

Go to your Supabase dashboard and run this SQL:

```sql
-- First, find the bottle
SELECT * FROM bottles WHERE barcode_number = '660331669';

-- Find ZR Signs customer
SELECT * FROM customers WHERE name = 'ZR Signs' LIMIT 1;

-- Update the bottle (replace 'CUSTOMER_LIST_ID_HERE' with the CustomerListID from the query above)
UPDATE bottles
SET 
  assigned_customer = 'CUSTOMER_LIST_ID_HERE',
  customer_name = 'ZR Signs',
  status = 'RENTED',
  rental_start_date = CURRENT_DATE,
  rental_order_number = '66666',
  updated_at = NOW()
WHERE barcode_number = '660331669';
```

---

**After this one-time fix, all future approvals will work correctly!** The code has been fixed to assign bottles BEFORE deleting scan records.

