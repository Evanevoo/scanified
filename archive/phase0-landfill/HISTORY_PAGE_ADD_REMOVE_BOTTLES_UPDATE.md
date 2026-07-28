# History Page: Add/Remove Bottles & Bottle Type Display

## Overview
Enhanced the History page to allow adding/removing bottles from orders and display detailed bottle type information (product code, description, gas type, size).

## Changes Made

### 1. **Mobile App** (`gas-cylinder-mobile/screens/HistoryScreen.tsx`)

#### New Features:
- ✅ **Display Bottle Type**: Shows product code, description, gas type, and size for each bottle
- ✅ **Add Bottles to Order**: Add new bottles to an existing order
- ✅ **Remove Bottles from Order**: Remove bottles from an order
- ✅ **Bottle Information Fetching**: Automatically fetches bottle details from database
- ✅ **Smart Updates**: Creates/deletes scans when bottles are added/removed

#### New State Management:
```typescript
interface BottleInfo {
  barcode: string;
  product_code?: string;
  description?: string;
  gas_type?: string;
  size?: string;
  status?: string;
}

const [editBottles, setEditBottles] = useState<string[]>([]);
const [bottleInfo, setBottleInfo] = useState<Map<string, BottleInfo>>(new Map());
const [newBottleBarcode, setNewBottleBarcode] = useState('');
```

#### New Functions:

**fetchBottleInfo()**
```typescript
// Fetches bottle details from the bottles table
// Stores in a Map for quick lookup
```

**addBottleToOrder()**
```typescript
// Validates new bottle barcode
// Fetches bottle information
// Adds to edit list
```

**removeBottleFromOrder()**
```typescript
// Shows confirmation dialog
// Removes bottle from edit list
```

**Enhanced saveEditOrder()**
```typescript
// Detects added/removed bottles
// Deletes scans for removed bottles
// Creates new scans for added bottles
// Updates existing scans
// Shows summary of changes
```

#### UI Updates:

**Expanded Bottle List:**
```
1. 123456789
   Oxygen Bottle • 50 cu ft • Oxygen
   Scanned: Jan 8, 2025, 10:30 AM

2. 987654321
   Argon Tank • 20 L • Argon
   Scanned: Jan 8, 2025, 10:32 AM
```

**Edit Modal:**
- Order Number field
- Customer Name field
- **Scrollable bottle list** with:
  - Bottle barcode
  - Product type/description
  - Remove button (red X icon) for each bottle
- **Add Bottle section** with:
  - Text input for new barcode
  - Add button (green + icon)
- Save/Cancel buttons

### 2. **Android App** (`gas-cylinder-android/screens/HistoryScreen.tsx`)

#### Features Added:
- ✅ **Display Bottle Type** in expanded list
- ✅ **Auto-fetch bottle details** when order is expanded
- ✅ Integrated with existing item details system
- ✅ Maintains all existing features (customer picker, suggestions, delete, etc.)

#### Enhanced Functions:

**toggleOrderExpansion()**
```typescript
// Now fetches bottle details when expanding an order
// Caches details to avoid repeated fetches
```

**Updated UI:**
- Bottle list now shows:
  - Barcode
  - Description/Product Code
  - Scan timestamp

## How It Works

### Adding a Bottle:
1. User opens edit modal for an order
2. Scrolls to "Add Bottle" section
3. Enters bottle barcode
4. Taps the + icon
5. Bottle is added to the list with details
6. On save:
   - New `bottle_scan` record is created
   - Has same order_number and customer_name
   - Uses same mode as other bottles in order
   - Timestamp is set to current time

### Removing a Bottle:
1. User opens edit modal for an order
2. Sees list of bottles in the order
3. Taps red X icon next to a bottle
4. Confirms removal in dialog
5. Bottle is removed from list
6. On save:
   - Corresponding `bottle_scan` record(s) are deleted
   - Other bottles in order remain unchanged

### Displaying Bottle Types:

**Data Flow:**
1. Scans are loaded from `bottle_scans` table
2. Bottle barcodes are extracted
3. Bottle details fetched from `bottles` table:
   ```sql
   SELECT barcode_number, product_code, description, 
          gas_type, size, status
   FROM bottles
   WHERE organization_id = ? AND barcode_number IN (?)
   ```
4. Details stored in Map/object for quick lookup
5. UI displays formatted bottle information

**Display Format:**
```
[Barcode]
[Description or Product Code] • [Size] • [Gas Type]
```

Examples:
- "Oxygen Bottle • 50 cu ft • Oxygen"
- "BAR300 • 300 Bar • Argon"
- "Medical Grade Oxygen • 50L"

## Database Operations

### When Adding Bottles:
```typescript
INSERT INTO bottle_scans (
  organization_id,
  bottle_barcode,
  order_number,
  customer_name,
  mode,
  user_id,
  created_at,
  timestamp
) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
```

### When Removing Bottles:
```typescript
DELETE FROM bottle_scans
WHERE id IN (scan_ids_for_removed_bottles)
AND organization_id = ?
```

### When Fetching Bottle Info:
```typescript
SELECT barcode_number, product_code, description, 
       gas_type, size, status
FROM bottles
WHERE organization_id = ?
AND barcode_number IN (barcodes_array)
```

## UI Components

### Bottle Type Display (Expanded View):
```
┌─────────────────────────────────────┐
│ 1. 123456789                        │
│    Oxygen Bottle • 50 cu ft         │
│    Jan 8, 2025, 10:30 AM            │
├─────────────────────────────────────┤
│ 2. 987654321                        │
│    Argon Tank • 20 L • Argon        │
│    Jan 8, 2025, 10:32 AM            │
└─────────────────────────────────────┘
```

### Edit Modal Bottle List:
```
┌──────────────────────────────────────┐
│ Bottles in this order (3):          │
│ ┌────────────────────────────────┐  │
│ │ 1. 123456789              [X]  │  │
│ │    Oxygen Bottle • 50 cu ft    │  │
│ ├────────────────────────────────┤  │
│ │ 2. 987654321              [X]  │  │
│ │    Argon Tank • 20 L           │  │
│ └────────────────────────────────┘  │
│                                      │
│ Add Bottle:                          │
│ [Enter barcode...........]  [+]     │
└──────────────────────────────────────┘
```

## Validation & Error Handling

### Adding Bottles:
- ✅ Validates barcode is not empty
- ✅ Checks if bottle already in order
- ✅ Fetches bottle details (shows if not found)
- ✅ Handles database errors gracefully

### Removing Bottles:
- ✅ Confirmation dialog before removal
- ✅ Prevents removing all bottles (need at least one)
- ✅ Shows which bottles will be affected

### Saving Changes:
- ✅ Transaction-like behavior (all or nothing)
- ✅ Shows detailed success message:
  ```
  Order ORD12345 updated
  +2 bottles added
  -1 bottles removed
  ```
- ✅ Refreshes list with updated data
- ✅ Re-fetches bottle information for new bottles

## Styling

### New Styles (Mobile):
```typescript
bottleType: {
  fontSize: 12,
  color: '#666',
  marginBottom: 2,
  fontStyle: 'italic',
}

modalBottleRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  // ... with remove button
}

addBottleContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  // ... with input and add button
}
```

### Icons Used:
- **Remove**: `close-circle` (Ionicons) - Red
- **Add**: `add-circle` (Ionicons) - Teal (#40B5AD)
- **Edit**: `create-outline` (Ionicons) - White

## Benefits

### For Users:
- **Better Visibility**: See exactly what type of bottle is in each order
- **Flexibility**: Add/remove bottles from orders as needed
- **Error Prevention**: See bottle details before adding to avoid mistakes
- **Audit Trail**: All changes create proper database records

### For Operations:
- **Order Correction**: Fix mistakes by adding/removing bottles
- **Consolidation**: Combine separate scans into one order
- **Splitting**: Remove bottles to create separate orders
- **Data Quality**: Ensure orders have correct bottles

## Use Cases

### 1. **Correcting Mistakes**
Scenario: Scanned wrong bottle into order
- Open order in History
- Remove incorrect bottle
- Add correct bottle
- Save changes

### 2. **Combining Orders**
Scenario: Accidentally created two orders that should be one
- Open first order
- Add bottles from second order
- Update order number if needed
- Delete second order separately

### 3. **Last-Minute Changes**
Scenario: Customer requests different bottle
- Open order within 24 hours
- Remove original bottle
- Add replacement bottle
- Save to update

### 4. **Quality Control**
Scenario: Reviewing scanned orders
- Expand order to see all bottles
- Verify bottle types match order
- Correct any discrepancies
- Update customer name if needed

## Technical Notes

### Performance:
- Bottle info fetched once per barcode
- Cached in state (Map/object)
- Only fetches when expanding or editing
- Bulk fetch for multiple bottles

### Data Consistency:
- All scans in an order have same:
  - `order_number`
  - `customer_name`
  - `mode` (for new additions)
- Individual scans maintain:
  - Unique `created_at` timestamps
  - Original `user_id`

### 24-Hour Edit Window:
- Applies to entire order
- Based on earliest scan
- Prevents edits after verification
- Still visible but read-only after expiration

## Future Enhancements

Potential improvements:
- **Barcode Scanner**: Use camera to scan new bottles
- **Batch Add**: Add multiple bottles at once
- **Duplicate Detection**: Warn if bottle already in another order
- **Bottle Availability**: Show if bottle is available or already assigned
- **Product Search**: Browse available products to add
- **Transfer Bottles**: Move bottles between orders
- **Split Order**: Create new order with selected bottles
- **Bottle History**: Show scan history for each bottle

## Testing Checklist

- [ ] Bottle type displays correctly in expanded view
- [ ] Can add new bottle to order
- [ ] Can remove bottle from order
- [ ] Confirmation dialog shows before removal
- [ ] Duplicate bottle prevention works
- [ ] Empty barcode validation works
- [ ] Save creates new scans for added bottles
- [ ] Save deletes scans for removed bottles
- [ ] Save updates existing scans
- [ ] Success message shows correct counts
- [ ] List refreshes after save
- [ ] Bottle info fetches correctly
- [ ] Works with missing bottle information
- [ ] Android version maintains existing features
- [ ] Item details in Android show correctly

## Summary

This update adds essential functionality for managing order composition directly from the History page. Users can now see detailed bottle information at a glance and make corrections to orders by adding or removing bottles as needed. The changes are properly tracked in the database with appropriate scan creation/deletion, ensuring data integrity and audit capability.
