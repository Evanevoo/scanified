# History Page Order Grouping Feature

## Overview
Updated the History page to group scanned bottles under the same order number with expandable/collapsible sections for better organization and editing capabilities.

## Changes Made

### 1. **Mobile App** (`gas-cylinder-mobile/screens/HistoryScreen.tsx`)

#### Features Added:
- ✅ **Order Grouping**: Bottles are now grouped by `order_number`
- ✅ **Expandable UI**: Each order can be expanded/collapsed with a tap
- ✅ **Bottle Count Badge**: Shows the number of bottles in each order at a glance
- ✅ **Individual Bottle List**: When expanded, shows all bottles with their barcodes and scan times
- ✅ **Bulk Order Editing**: Edit customer name and order number for all bottles in the order at once
- ✅ **Visual Feedback**: Clear indicators for editable vs expired orders

#### New UI Components:
- **Order Header**: 
  - Collapsible chevron icon
  - Order number
  - Customer name
  - Latest scan date
  - Bottle count badge

- **Expanded View**:
  - List of all bottles with indices
  - Individual scan timestamps
  - Edit button for the entire order

- **Edit Modal**:
  - Order number field (updates all bottles)
  - Customer name field (updates all bottles)
  - List of all bottles in the order
  - Bulk save operation

### 2. **Android App** (`gas-cylinder-android/screens/HistoryScreen.tsx`)

#### Updates:
- ✅ Enhanced the existing grouping with expandable UI
- ✅ Added collapsible sections matching mobile version
- ✅ Maintained existing features like:
  - Customer autocomplete
  - Bottle suggestions
  - Item details display
  - Individual bottle editing
  - Delete functionality

## How It Works

### Grouping Logic:
```typescript
const groupScansByOrder = (scans: any[]): GroupedOrder[] => {
  // Groups scans by order_number
  // Calculates earliest and latest scan times
  // Determines if order is editable (within 24 hours)
  // Sorts by latest scan date (most recent first)
}
```

### Data Structure:
```typescript
interface GroupedOrder {
  order_number: string;
  scans: any[];                 // All bottles in this order
  customer_name: string;
  earliest_date: string;        // First bottle scanned
  latest_date: string;          // Last bottle scanned
  isEditable: boolean;          // Within 24-hour window
}
```

### Editing Workflow:
1. User taps on an order header to expand it
2. Views all bottles in that order
3. Taps "Edit Order" button
4. Updates order number and/or customer name
5. Changes apply to ALL bottles in the order simultaneously

## Benefits

### For Users:
- **Better Organization**: See all bottles grouped by order
- **Faster Editing**: Edit entire orders instead of individual bottles
- **Clear Overview**: Quickly see bottle counts and order status
- **Intuitive Navigation**: Expand only the orders you need to see

### For Workflow:
- **Bulk Updates**: Change customer or order number for all bottles at once
- **Consistency**: Ensures all bottles in an order have matching information
- **Error Prevention**: Reduces chance of editing only some bottles in an order
- **Time Saving**: No need to edit each bottle individually

## Visual Design

### Order Cards:
- Clean, modern card design with shadows
- Color-coded badges (teal for bottle count)
- Disabled styling for expired orders (grayed out)
- Smooth expand/collapse animations

### Typography Hierarchy:
- **Large & Bold**: Order number (primary focus)
- **Medium**: Customer name
- **Small**: Date and metadata
- **Badge**: Bottle count (prominent but distinct)

### Status Indicators:
- 🟢 Editable orders: Full color, "Edit Order" button active
- 🔴 Expired orders: Grayed out, "Edit Expired" disabled state
- ⚠️ "Edit period expired" warning badge

## Database Interaction

### Reading:
- Fetches all scans from `bottle_scans` table
- Groups in-memory (no database schema changes needed)
- Falls back to `cylinder_scans` if needed

### Writing:
```sql
-- Updates all bottles in an order
UPDATE bottle_scans
SET customer_name = ?, order_number = ?
WHERE id IN (scan_id_1, scan_id_2, ...)
AND organization_id = ?
```

## 24-Hour Edit Window

Orders can only be edited within 24 hours of the **earliest scan** in that order:
- ✅ Within 24 hours: Full edit capabilities
- ❌ After 24 hours: View only, edit button disabled
- 📅 Calculated from the first bottle scanned in the order

## Mobile vs Android Differences

### Mobile Version:
- Simpler edit modal (order number + customer name)
- Focused on the most common use cases
- Streamlined for quick edits

### Android Version:
- Extended features retained (customer picker, bottle suggestions)
- Item details display
- Delete order functionality
- Add/remove individual bottles from order

## Testing Checklist

- [ ] Orders group correctly by order_number
- [ ] Expand/collapse animations work smoothly
- [ ] Bottle count displays accurately
- [ ] Edit modal opens with correct data
- [ ] Bulk updates save to all bottles
- [ ] 24-hour edit window enforced correctly
- [ ] Expired orders show disabled state
- [ ] Empty state displays when no scans
- [ ] Works with and without order numbers
- [ ] Refresh updates grouping after edits

## Future Enhancements

Potential improvements:
- Search/filter by order number
- Sort options (date, customer, bottle count)
- Export order as PDF/CSV
- Quick actions (duplicate order, add more bottles)
- Order status indicators (shipped, pending, etc.)
- Swipe actions for quick delete/edit

## Technical Notes

### Performance:
- Grouping happens client-side (no extra database queries)
- Efficient for typical scan volumes (<1000 scans per 24h)
- Consider server-side grouping if volumes increase

### State Management:
- `expandedOrders`: Set of order keys that are currently expanded
- `groupedOrders`: Array of grouped order objects
- `editOrder`: Currently selected order for editing

### Dependencies:
- `@expo/vector-icons` for chevron and edit icons
- No additional packages required

## Summary

This update significantly improves the user experience when managing scanned bottles by providing a logical grouping structure and enabling bulk operations. The expandable interface keeps the initial view clean while allowing users to drill down into details when needed.
