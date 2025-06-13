# 📋 Import Approval Workflow

## 🔄 **Complete Process Overview**

The gas cylinder management system uses a **two-step verification process** to ensure data accuracy:

1. **Import Data** → Creates pending imports in the system
2. **Scan Bottles** → Mobile app captures actual bottle movements
3. **Match & Verify** → Compare imported vs scanned quantities
4. **Approve Only When Matched** → Bottles assigned to customers only after verification

---

## 📱 **Step 1: Import Data**

### Website Import Process:
- Navigate to `/import` page
- Upload invoice or sales receipt files
- System creates pending imports in `imported_invoices` and `imported_sales_receipts` tables
- Status is set to `'pending'`

### Import Data Structure:
```json
{
  "invoice_number": "INV-001",
  "customer_name": "ABC Company",
  "customer_id": "CUST-123",
  "date": "2024-01-15",
  "line_items": [
    {
      "product_code": "AR125",
      "qty_out": 5,
      "qty_in": 2,
      "serial_number": "SN123456"
    }
  ]
}
```

---

## 📱 **Step 2: Scan Bottles (Mobile App)**

### Mobile Scanning Process:
- Use the mobile app's scan screen
- Scan bottles being shipped out (positive quantities)
- Scan bottles being returned (negative quantities)
- Data is stored in `scanned_orders` table

### Scanned Data Structure:
```json
{
  "order_number": "INV-001",
  "ship_cylinders": [
    {"serial_number": "SN123456", "gas_type": "AR125"},
    {"serial_number": "SN123457", "gas_type": "AR125"}
  ],
  "return_cylinders": [
    {"serial_number": "SN123458", "gas_type": "AR125"}
  ]
}
```

---

## 🔍 **Step 3: Match & Verify (Import Approvals)**

### Verification Logic:
The system compares imported quantities with scanned quantities:

- **Shipped Bottles**: `imported_qty_out` must equal `scanned_ship_cylinders.length`
- **Returned Bottles**: `imported_qty_in` must equal `scanned_return_cylinders.length`

### Status Types:
- **✅ Match**: Quantities match, ready for approval
- **❌ Mismatch**: Quantities don't match, approval blocked
- **⚠️ No Scan**: No scanned data found, approval blocked

---

## ✅ **Step 4: Approve & Apply**

### Approval Requirements:
- ✅ Scanned data exists for the order
- ✅ Imported shipped quantity = Scanned shipped quantity
- ✅ Imported returned quantity = Scanned returned quantity

### What Happens on Approval:
1. **Process Invoice/Receipt**: Apply bottle movements to customer accounts
2. **Update Bottle Status**: Mark bottles as rented/returned
3. **Update Customer Balances**: Adjust customer bottle counts
4. **Mark as Approved**: Set status to `'approved'` with timestamp
5. **Audit Log**: Record approval action with verification details

---

## 🚫 **Approval Blocking Conditions**

### No Scanned Data:
```
Error: Cannot approve: No scanned data found for Invoice #INV-001. 
Please ensure bottles have been scanned before approval.
```

### Quantity Mismatch:
```
Error: Cannot approve: Quantities do not match for Invoice #INV-001. 
Imported: 5 shipped, 2 returned. Scanned: 3 shipped, 2 returned.
```

---

## 📊 **Import Approvals Page Features**

### Summary Dashboard:
- **Total Pending**: All imports awaiting approval
- **Ready to Approve**: Imports with matching quantities
- **Need Scanning**: Imports without scanned data
- **Quantity Mismatch**: Imports with quantity discrepancies

### Table Columns:
- **Type**: Invoice or Sales Receipt
- **Order/Receipt #**: Order identifier
- **Customer**: Customer name and ID
- **Date**: Import date
- **SHP (Imp/Scan)**: Shipped quantities comparison
- **RTN (Imp/Scan)**: Returned quantities comparison
- **Status**: Match/Mismatch/No Scan
- **Actions**: Approve (enabled only for matches) / Delete

### Visual Indicators:
- **Green**: Quantities match
- **Red**: Quantities mismatch
- **Yellow**: No scanned data
- **Disabled Button**: Approval blocked

---

## 🔧 **Technical Implementation**

### Database Tables:
- `imported_invoices`: Pending invoice imports
- `imported_sales_receipts`: Pending receipt imports
- `scanned_orders`: Mobile app scanned data
- `audit_logs`: Approval and processing history
- `bottles`: Bottle inventory and status
- `customers`: Customer information and balances

### Key Functions:
- `handleApprove()`: Verifies quantities before approval
- `processInvoice()`: Applies approved invoice to customer accounts
- `processReceipt()`: Applies approved receipt to customer accounts
- `getScannedOrder()`: Retrieves scanned data for comparison

---

## 🎯 **Best Practices**

### For Importers:
1. **Accurate Data**: Ensure imported quantities are correct
2. **Complete Information**: Include all required fields
3. **Consistent Format**: Use standardized import formats

### For Scanners:
1. **Scan All Bottles**: Don't miss any bottles in the order
2. **Correct Order Numbers**: Match scanned data to correct orders
3. **Verify Quantities**: Double-check counts before submission

### For Approvers:
1. **Review Mismatches**: Investigate quantity discrepancies
2. **Check Details**: Use detail view to verify line items
3. **Audit Trail**: Review audit logs for approval history

---

## 🚨 **Troubleshooting**

### Common Issues:
1. **"No bottles found"**: Check if bottles exist in the system
2. **"Customer not found"**: Ensure customer exists before import
3. **"Quantity mismatch"**: Verify scanned vs imported quantities
4. **"Import not showing"**: Check if status is set to 'pending'

### Debug Steps:
1. Check browser console for errors
2. Verify database table contents
3. Review audit logs for processing errors
4. Confirm mobile app data synchronization

---

## 📞 **Support**

For issues with the import approval workflow:
1. Check the audit logs for detailed error information
2. Verify data integrity in all related tables
3. Contact system administrator for technical support 