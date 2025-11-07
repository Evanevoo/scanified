# Clean Up Old Approved Scans for Order 66666

## Option 1: Browser Console (Quick Fix)

1. Open http://localhost:5174 in your browser
2. Open Developer Tools (F12)
3. Go to Console tab
4. Copy and paste this code:

```javascript
(async () => {
  const { supabase } = await import('/src/supabase/client.js');
  
  console.log('🔍 Looking for approved scans for order 66666...');
  
  // Find approved scans for order 66666
  const { data: approvedScans, error: findError } = await supabase
    .from('scans')
    .select('*')
    .eq('order_number', '66666')
    .in('status', ['approved', 'verified']);
  
  if (findError) {
    console.error('❌ Error finding scans:', findError);
    return;
  }
  
  console.log(`✅ Found ${approvedScans?.length || 0} approved scans for order 66666:`, approvedScans);
  
  if (approvedScans && approvedScans.length > 0) {
    console.log('🗑️ Deleting approved scans...');
    
    const { error: deleteError } = await supabase
      .from('scans')
      .delete()
      .eq('order_number', '66666')
      .in('status', ['approved', 'verified']);
    
    if (deleteError) {
      console.error('❌ Error deleting scans:', deleteError);
      return;
    }
    
    console.log('✅ Deleted approved scans for order 66666!');
    console.log('Now refresh the Import Approvals page and your new scans should appear.');
  } else {
    console.log('ℹ️ No approved scans found - the order might be using a different status or table');
  }
})();
```

5. Press Enter
6. Refresh the Import Approvals page

## Option 2: Use a Different Order Number

Instead of cleaning up, you could just scan with a **different order number** (like 66667 or test-001) and it will show up immediately.

## Option 3: Supabase SQL

Go to Supabase dashboard and run:

```sql
-- Check what scans exist for order 66666
SELECT * FROM scans WHERE order_number = '66666';

-- Delete approved scans
DELETE FROM scans 
WHERE order_number = '66666' 
AND status IN ('approved', 'verified');

-- Also check bottle_scans
SELECT * FROM bottle_scans WHERE order_number = '66666';
```

