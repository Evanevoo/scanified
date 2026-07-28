# Customer Detail Page Error Fix Guide

## Error: "JSON object requested, multiple (or no) rows returned"

This error occurs when the CustomerDetail page tries to fetch a customer using `.single()` but finds either:
1. **No customers** with the specified ID
2. **Multiple customers** with the same ID (duplicate data)

## Root Cause

The error happens in `src/pages/CustomerDetail.jsx` at line 58:

```javascript
const { data: customerData, error: customerError } = await supabase
  .from('customers')
  .select('*')
  .eq('CustomerListID', id)
  .single(); // ❌ This fails if 0 or >1 rows returned
```

## ✅ Fix Applied

I've updated the CustomerDetail component to handle this error gracefully:

```javascript
// First, check if there are multiple customers with this ID
const { data: allCustomers, error: checkError } = await supabase
  .from('customers')
  .select('*')
  .eq('CustomerListID', id);

if (!allCustomers || allCustomers.length === 0) {
  setError(`Customer with ID "${id}" not found.`);
  return;
}

if (allCustomers.length > 1) {
  setError(`Multiple customers found with ID "${id}". This indicates a data integrity issue. Please contact support.`);
  return;
}

// We have exactly one customer
const customerData = allCustomers[0];
```

## 🔧 Additional Tools Created

### 1. Customer Diagnostic Script
Run this in your browser console on scanified.com:

```javascript
// Copy and paste this into browser console
async function checkCustomer(customerId) {
  console.log(`🔍 Checking customer ID: ${customerId}`);
  
  try {
    const supabase = window.supabase || window.supabaseClient;
    if (!supabase) {
      console.error('❌ Supabase client not found. Make sure you\'re logged in.');
      return;
    }
    
    const { data: customers, error } = await supabase
      .from('customers')
      .select('id, CustomerListID, name, organization_id, created_at')
      .eq('CustomerListID', customerId);
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    if (!customers || customers.length === 0) {
      console.log(`❌ Customer with ID "${customerId}" not found`);
      return;
    }
    
    if (customers.length === 1) {
      console.log(`✅ Customer found: ${customers[0].name}`);
    } else {
      console.log(`⚠️ Multiple customers found with ID "${customerId}":`);
      customers.forEach((customer, index) => {
        console.log(`   ${index + 1}. ${customer.name} (Org: ${customer.organization_id})`);
      });
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Check the specific customer ID from the error
checkCustomer('80000C4F-1746649217A');
```

### 2. Duplicate Customer Fix Script
If you have duplicate customer IDs, run this script:

```bash
# First, check for duplicates
node fix-duplicate-customers.js

# Then fix them
node fix-duplicate-customers.js --fix
```

## 🚨 Immediate Actions

1. **Check the specific customer ID**:
   - Go to https://www.scanified.com/customer/80000C4F-1746649217A
   - Open browser console (F12)
   - Run the diagnostic script above

2. **If customer doesn't exist**:
   - The customer may have been deleted
   - Check if the URL is correct
   - Look for the customer in the customers list

3. **If multiple customers found**:
   - Run the duplicate fix script
   - Or manually resolve duplicates in the database

## 🔍 Database Investigation

To investigate this issue in Supabase:

```sql
-- Check if customer exists
SELECT id, "CustomerListID", name, organization_id, created_at
FROM customers 
WHERE "CustomerListID" = '80000C4F-1746649217A';

-- Check for duplicates
SELECT "CustomerListID", COUNT(*) as count
FROM customers 
GROUP BY "CustomerListID" 
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Check for customers with similar IDs
SELECT "CustomerListID", name, organization_id
FROM customers 
WHERE "CustomerListID" LIKE '%80000C4F%'
ORDER BY "CustomerListID";
```

## 🛡️ Prevention

To prevent this issue in the future:

1. **Add unique constraints** to the database:
```sql
-- Add unique constraint on CustomerListID per organization
ALTER TABLE customers 
ADD CONSTRAINT customers_organization_customerlistid_unique 
UNIQUE (organization_id, "CustomerListID");
```

2. **Use `.maybeSingle()`** instead of `.single()` for optional lookups
3. **Add proper error handling** in all customer queries
4. **Validate customer IDs** before using them in URLs

## 📞 Support

If the issue persists:
1. Check the browser console for detailed error messages
2. Run the diagnostic scripts
3. Contact support with the error details and customer ID
