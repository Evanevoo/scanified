# Quantity Discrepancy Detection Feature

## Overview

The **Quantity Discrepancy Detector** is a powerful business intelligence feature that automatically identifies discrepancies between invoiced quantities and actual scanned quantities when shipped quantities equal returned quantities.

## 🎯 Business Logic

### When It Triggers
- **Condition:** Ship Quantity = Return Quantity
- **Analysis:** Compares invoiced vs scanned quantities
- **Purpose:** Identify scanning vs billing discrepancies

### Example Scenario
```
Invoice shows: Ship 5, Return 5
Scanned: Ship 4, Return 3
Result: 🚨 DISCREPANCY DETECTED
- Ship: Missing 1 scan
- Return: Missing 2 scans
```

## 🚀 Features

### 1. Automatic Detection
- **Real-time Analysis:** Detects discrepancies during import verification
- **Smart Filtering:** Only analyzes relevant orders (ship = return)
- **Performance Optimized:** Efficient database queries with proper indexing

### 2. Visual Indicators
- **Color-coded Status:** Green (match), Yellow (missing), Red (extra)
- **Expandable Details:** Click to see full discrepancy breakdown
- **Icon System:** Intuitive visual representation of issues

### 3. Integration Points
- **Import Approvals Workflow:** New verification step
- **Dashboard Statistics:** Real-time discrepancy count
- **Grid View Access:** Quick "Check Quantities" button
- **Standalone Component:** Reusable across the application

## 📊 Data Structure

### Input Data
```javascript
{
  orderNumber: "ORD-001",
  customerId: "cust-123",
  organizationId: "org-456"
}
```

### Output Analysis
```javascript
{
  productCode: "BCS68-300",
  productName: "MIXGAS",
  shippedQty: 2,
  returnedQty: 2,
  scannedShip: 1,
  scannedReturn: 2,
  shipDiscrepancy: 1,    // Missing 1 scan
  returnDiscrepancy: 0,  // Perfect match
  hasDiscrepancy: true
}
```

## 🔧 Technical Implementation

### Component: `QuantityDiscrepancyDetector`
- **Location:** `src/components/QuantityDiscrepancyDetector.jsx`
- **Props:** `orderNumber`, `customerId`, `organizationId`
- **Dependencies:** Material-UI, Supabase client

### Database Queries
```sql
-- Fetch invoice data
SELECT id, order_number, customer_id, data 
FROM invoices 
WHERE order_number = $1 AND customer_id = $2 AND organization_id = $3

-- Fetch scanned quantities
SELECT bottle_barcode, mode, timestamp 
FROM bottle_scans 
WHERE order_number = $1 AND organization_id = $2
```

### State Management
- **Loading States:** Proper loading indicators
- **Error Handling:** Graceful error recovery
- **Data Caching:** Efficient re-renders

## 📱 User Interface

### 1. Verification Workflow
- **New Step:** "Quantity Analysis" in verification process
- **Automatic:** Runs during import approval workflow
- **Required:** Must complete before final approval

### 2. Dashboard Integration
- **Statistics Card:** Shows total discrepancy count
- **Real-time Updates:** Refreshes with verification stats
- **Quick Access:** One-click discrepancy overview

### 3. Grid View Enhancement
- **Check Quantities Button:** Available on each invoice card
- **Modal Dialog:** Full-screen discrepancy analysis
- **Non-blocking:** Doesn't interfere with card navigation

## 🎨 UI Components

### Status Indicators
```jsx
// Success - No discrepancy
<CheckCircleIcon color="success" />
<Chip label="Match" color="success" />

// Warning - Missing scans
<WarningIcon color="warning" />
<Chip label="Missing 2" color="warning" />

// Error - Extra scans
<ErrorIcon color="error" />
<Chip label="Extra 1" color="error" />
```

### Data Table
- **Product Information:** Code, name, category
- **Quantity Columns:** Shipped, Scanned, Difference
- **Status Column:** Overall discrepancy status
- **Expandable Rows:** Detailed breakdown

## 📈 Business Value

### 1. **Accuracy Improvement**
- **Catch Scanning Errors:** Identify missed bottle scans
- **Billing Validation:** Verify invoice accuracy
- **Data Integrity:** Ensure system consistency

### 2. **Operational Efficiency**
- **Automated Detection:** No manual checking required
- **Quick Resolution:** Immediate issue identification
- **Process Integration:** Part of existing workflow

### 3. **Customer Satisfaction**
- **Accurate Billing:** Prevent over/under-charging
- **Transparent Tracking:** Clear discrepancy reporting
- **Professional Service:** Quality control automation

## 🔍 Use Cases

### 1. **Delivery Verification**
```
Scenario: Driver delivers 5 bottles, scans 4
Result: Discrepancy detected - missing 1 scan
Action: Driver can re-scan or note missing bottle
```

### 2. **Return Processing**
```
Scenario: Customer returns 3 bottles, invoice shows 3
Result: Verify all returns properly scanned
Action: Ensure accurate credit processing
```

### 3. **Inventory Reconciliation**
```
Scenario: Ship 10, Return 10, but scans don't match
Result: Identify inventory discrepancies
Action: Investigate missing or extra bottles
```

## 🚀 Future Enhancements

### 1. **Automated Alerts**
- **Email Notifications:** Alert managers of discrepancies
- **SMS Alerts:** Real-time driver notifications
- **Dashboard Warnings:** Prominent discrepancy display

### 2. **Advanced Analytics**
- **Trend Analysis:** Historical discrepancy patterns
- **Root Cause Analysis:** Common discrepancy reasons
- **Performance Metrics:** Driver/route accuracy rates

### 3. **Mobile Integration**
- **App Notifications:** Push alerts for discrepancies
- **Offline Detection:** Local discrepancy checking
- **Photo Evidence:** Attach photos to discrepancy reports

## 📋 Configuration

### Environment Variables
```bash
# Required for database access
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
```

### Database Setup
```sql
-- Ensure proper indexes for performance
CREATE INDEX idx_bottle_scans_order_number ON bottle_scans(order_number);
CREATE INDEX idx_bottle_scans_organization ON bottle_scans(organization_id);
CREATE INDEX idx_invoices_order_customer ON invoices(order_number, customer_id);
```

## 🧪 Testing

### Demo Page
- **Location:** `/quantity-discrepancy-demo`
- **Purpose:** Test functionality with sample data
- **Features:** Configurable test parameters

### Test Data Requirements
```javascript
// Minimum test data needed
{
  invoices: [
    {
      order_number: "TEST-001",
      customer_id: "test-customer",
      data: {
        rows: [
          {
            product_code: "TEST-001",
            shipped: 2,
            returned: 2
          }
        ]
      }
    }
  ],
  bottle_scans: [
    {
      order_number: "TEST-001",
      bottle_barcode: "TEST-001",
      mode: "SHIP"
    }
  ]
}
```

## 🔒 Security & Permissions

### Row Level Security (RLS)
- **Organization Isolation:** Users only see their organization's data
- **Customer Access:** Respects customer-specific permissions
- **Audit Logging:** Tracks all discrepancy checks

### Access Control
```javascript
// Required permissions
- Read access to invoices table
- Read access to bottle_scans table
- Organization context awareness
```

## 📞 Support & Troubleshooting

### Common Issues
1. **No Data Found:** Check order number and customer ID
2. **Permission Errors:** Verify organization access
3. **Performance Issues:** Check database indexes

### Debug Mode
```javascript
// Enable console logging
console.log('Discrepancy Analysis:', {
  orderNumber,
  customerId,
  organizationId,
  discrepancies
});
```

## 🎯 Success Metrics

### Key Performance Indicators
- **Detection Rate:** % of discrepancies caught
- **Resolution Time:** Average time to resolve issues
- **Accuracy Improvement:** Reduction in billing errors
- **User Adoption:** % of users utilizing the feature

---

**Last Updated:** December 2024  
**Version:** 1.0.0  
**Status:** Production Ready ✅
