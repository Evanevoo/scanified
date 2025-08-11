# Temp Customer Management Troubleshooting Guide

## ❌ **"Failed to create temp customer account" Error**

If you're getting this error, here's how to debug and fix it:

### **Step 1: Check Browser Console** 🔍
1. **Open browser Developer Tools** (F12)
2. **Go to Console tab**  
3. **Visit**: `http://localhost:5174/temp-customer-management`
4. **Look for error messages** starting with:
   - "Getting temp customer account for organization:"
   - "Creating temp customer account for organization:" 
   - "Error creating temp customer account:"

### **Step 2: Common Issues & Fixes** 🛠️

#### **Issue 1: Database Migration Not Applied**
**Error**: `column "customer_type" does not exist`

**Fix**: Run this SQL in **Supabase Dashboard → SQL Editor**:
```sql
-- Add customer_type column
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS customer_type VARCHAR(20) DEFAULT 'CUSTOMER' 
CHECK (customer_type IN ('CUSTOMER', 'VENDOR', 'TEMPORARY'));

-- Update existing customers
UPDATE customers SET customer_type = 'CUSTOMER' WHERE customer_type IS NULL;
```

#### **Issue 2: Organization ID Missing**
**Error**: `Organization ID is required`

**Cause**: You're not logged in or organization data isn't loading
**Fix**:
1. **Refresh the page**
2. **Log out and log back in**  
3. **Check that your user profile has an organization assigned**

#### **Issue 3: Duplicate Customer ID**
**Error**: `duplicate key value violates unique constraint "customers_organization_customerlistid_unique"`

**Cause**: Temp customer already exists but the system is trying to create it again
**Fix**: Run this quick fix SQL:

```sql
-- Check existing temp customers
SELECT "CustomerListID", name, organization_id, customer_type
FROM customers 
WHERE name = 'Temp Customer';

-- Add customer_type column if missing
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS customer_type VARCHAR(20) DEFAULT 'CUSTOMER' 
CHECK (customer_type IN ('CUSTOMER', 'VENDOR', 'TEMPORARY'));

-- Update existing temp customers to have correct type
UPDATE customers 
SET customer_type = 'TEMPORARY'
WHERE name = 'Temp Customer' 
AND (customer_type IS NULL OR customer_type = '');

-- Update other customers to be CUSTOMER type
UPDATE customers 
SET customer_type = 'CUSTOMER' 
WHERE customer_type IS NULL AND name != 'Temp Customer';
```

**Alternative**: Use the provided `fix-temp-customer.sql` file.

#### **Issue 4: ON CONFLICT Error** 
**Error**: `there is no unique or exclusion constraint matching the ON CONFLICT specification`

**Cause**: Database migration SQL used wrong constraint name
**Fix**: Use the updated migration (already fixed in the code) or run `fix-temp-customer.sql`

#### **Issue 5: Row Level Security (RLS)**
**Error**: `new row violates row-level security policy`

**Fix**: Check RLS policies on `customers` table allow INSERT for your user.

### **Step 3: Manual Temp Customer Creation** ⚒️

If automation fails, create manually:

```sql
INSERT INTO customers (
    "CustomerListID",
    name,
    contact_details,
    phone,
    customer_type,
    organization_id,
    barcode,
    customer_barcode
) VALUES (
    'TEMP-CUSTOMER-YOUR_ORG_ID',
    'Temp Customer',
    'Universal temporary customer account for walk-in assignments',
    'N/A',
    'TEMPORARY',
    'YOUR_ORG_ID',
    'TEMP-CUSTOMER-YOUR_ORG_ID',
    'TEMP-CUSTOMER-YOUR_ORG_ID'
);
```

**Replace `YOUR_ORG_ID`** with your actual organization ID.

### **Step 4: Test After Fix** ✅

1. **Refresh** `http://localhost:5174/temp-customer-management`
2. **Page should load** without errors
3. **Should show** "No items assigned to temp customer" message
4. **Console should show** "Temp customer account found" or "created successfully"

### **Step 5: Still Having Issues?** 🆘

**Check these in browser console:**
```javascript
// Run in browser console to check your organization
console.log('Current user:', await supabase.auth.getUser());

// Check if customers table has customer_type column
const { data, error } = await supabase.from('customers').select('customer_type').limit(1);
console.log('customer_type column check:', { data, error });
```

---

## ✅ **Success Indicators**

When working properly, you should see:

1. **No errors** in browser console
2. **Page loads** with temp customer statistics  
3. **Console shows**: "Temp customer account found" or "created successfully"
4. **Can search and reassign items** without errors

---

## 🔧 **Prevention**

To avoid this issue in the future:

1. **Always run database migrations** before using new features
2. **Check browser console** when testing new functionality  
3. **Test with a small dataset** first

**The enhanced error handling should now provide much better debugging information!** 🚀