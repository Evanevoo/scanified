# Customer Barcode Fix Guide

This guide explains how to fix missing customer barcodes in your system.

## Understanding Customer Barcodes

Customer barcodes are used for mobile scanning and follow this pattern:
```
%{lowercase_customer_id_without_spaces}
```

**Example:**
- Customer ID: `800005BE-1578330321A`
- Generated Barcode: `%800005be-1578330321a`

## Why Customers Might Not Have Barcodes

1. Created manually without setting a barcode
2. Created through a code path that doesn't auto-generate barcodes
3. Barcode was cleared/removed
4. Created before auto-generation was implemented

## Fix Methods

### Method 1: HTML Utility (Easiest - No Installation Required)

1. Open `fix-customer-barcodes.html` in your browser
2. Enter your Supabase URL and Anon Key
3. Optionally enter a specific Customer ID (e.g., `800005BE-1578330321A`)
   - Leave empty to fix ALL customers without barcodes
4. Click "Check Status" to preview what will be fixed
5. Click "Fix Barcodes" to apply the fixes

**Features:**
- Visual interface with real-time progress
- Shows summary of fixes
- Can fix one customer or all customers
- Saves Supabase credentials in browser

### Method 2: Node.js Script

**Prerequisites:**
- Node.js installed
- Environment variables set (see `.env` file)

**Setup:**
```bash
# Install dependencies (if not already installed)
npm install @supabase/supabase-js dotenv

# Make sure your .env file has:
# VITE_SUPABASE_URL=your_supabase_url
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key (or VITE_SUPABASE_ANON_KEY)
```

**Usage:**

Fix all customers without barcodes:
```bash
node fix-customer-barcodes.js
```

Fix a specific customer:
```bash
node fix-customer-barcodes.js 800005BE-1578330321A
```

### Method 3: SQL Script (Direct Database Access)

1. Open your Supabase SQL Editor
2. Copy and paste the contents of `fix-customer-barcodes.sql`
3. For a specific customer, uncomment and modify the second UPDATE statement
4. Run the script
5. Verify results using the SELECT queries at the bottom

**Quick Fix for Specific Customer:**
```sql
UPDATE customers
SET 
  barcode = '%' || LOWER(REPLACE("CustomerListID", ' ', '')),
  customer_barcode = '%' || LOWER(REPLACE("CustomerListID", ' ', ''))
WHERE "CustomerListID" = '800005BE-1578330321A';
```

## Barcode Generation Logic

The barcode is generated using this JavaScript function:
```javascript
function generateBarcode(customerId) {
  if (!customerId) return null;
  const normalized = customerId.toLowerCase().replace(/\s+/g, '');
  return `%${normalized}`;
}
```

**SQL equivalent:**
```sql
'%' || LOWER(REPLACE("CustomerListID", ' ', ''))
```

## Verification

After running any fix method, verify the results:

```sql
SELECT 
  "CustomerListID",
  name,
  barcode,
  customer_barcode
FROM customers
WHERE "CustomerListID" = '800005BE-1578330321A';
```

Expected result:
- Customer ID: `800005BE-1578330321A`
- Barcode: `%800005be-1578330321a`
- Customer Barcode: `%800005be-1578330321a`

## Manual Fix via UI

You can also manually set barcodes through the web interface:

1. Navigate to `/customer/800005BE-1578330321A`
2. Click "Edit Customer"
3. Enter barcode: `%800005be-1578330321a`
4. Save changes

## Notes

- Barcodes are stored in both `barcode` and `customer_barcode` fields
- The `%` prefix is used for scanning compatibility
- Barcodes are optional but recommended for mobile app functionality
- The system will not overwrite existing barcodes (unless they're empty strings)

## Troubleshooting

**Issue: Script can't connect to Supabase**
- Verify your Supabase URL and keys are correct
- Check that your `.env` file is in the project root
- For HTML utility, ensure credentials are saved

**Issue: Some customers still don't have barcodes**
- Check if CustomerListID is NULL or empty
- Verify the customer exists in the database
- Check for any database constraints or triggers

**Issue: Barcode format looks wrong**
- Ensure the pattern `%{id}` is being used
- Check that CustomerListID doesn't contain unexpected characters
- Verify the SQL/JavaScript is using LOWER() and REPLACE() correctly

## Related Files

- `src/pages/CustomerDetail.jsx` - Customer detail page with barcode editing
- `src/pages/Import.jsx` - Auto-generates barcodes during import
- `src/pages/ImportApprovals.jsx` - Auto-generates barcodes for new customers
- `src/services/temporaryCustomerService.js` - Creates temp customers with barcodes
