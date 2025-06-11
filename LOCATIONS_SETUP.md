# Location Management Setup

This document explains how to set up the location management system for the gas cylinder app.

## Overview

The system now supports four locations with configurable tax rates:
- **Saskatoon, Saskatchewan** - GST 5% + PST 6% = 11% total
- **Regina, Saskatchewan** - GST 5% + PST 6% = 11% total  
- **Chilliwack, British Columbia** - GST 5% + PST 7% = 12% total
- **Prince George, British Columbia** - GST 5% + PST 7% = 12% total

## Database Setup

Run the following SQL commands in your Supabase SQL editor:

```sql
-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    gst_rate DECIMAL(5,2) NOT NULL DEFAULT 5.0,
    pst_rate DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    total_tax_rate DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add province column if it doesn't exist
ALTER TABLE locations ADD COLUMN IF NOT EXISTS province TEXT;

-- Insert initial locations with current tax rates (as of 2024)
INSERT INTO locations (id, name, province, gst_rate, pst_rate, total_tax_rate) VALUES
    ('saskatoon', 'Saskatoon', 'Saskatchewan', 5.0, 6.0, 11.0),
    ('regina', 'Regina', 'Saskatchewan', 5.0, 6.0, 11.0),
    ('chilliwack', 'Chilliwack', 'British Columbia', 5.0, 7.0, 12.0),
    ('prince-george', 'Prince George', 'British Columbia', 5.0, 7.0, 12.0)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    province = EXCLUDED.province,
    gst_rate = EXCLUDED.gst_rate,
    pst_rate = EXCLUDED.pst_rate,
    total_tax_rate = EXCLUDED.total_tax_rate,
    updated_at = NOW();

-- Add location column to cylinders table if it doesn't exist
ALTER TABLE cylinders ADD COLUMN IF NOT EXISTS location TEXT;

-- Add location column to rentals table if it doesn't exist
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS location TEXT;

-- Add status column to rentals table if it doesn't exist
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Create index on location for better performance
CREATE INDEX IF NOT EXISTS idx_cylinders_location ON cylinders(location);
CREATE INDEX IF NOT EXISTS idx_rentals_location ON rentals(location);
CREATE INDEX IF NOT EXISTS idx_rentals_status ON rentals(status);
```

## How It Works

### Location Assignment Rules
1. **Bottles assigned to locations** are considered "at home" and not rented
2. **When a bottle is scanned to a customer order**, it gets assigned to that customer
3. **Tax rates are automatically applied** based on the location when billing
4. **Locations can be selected** when bulk importing bottles or assigning individual bottles

### Bulk Import Format
When bulk importing bottles, use this CSV/Excel format:

```csv
bottle_id,customer_id,location,rental_start_date
BOTTLE001,CUST123,SASKATOON,2024-01-15
BOTTLE002,,CHILLIWACK,
```

- `bottle_id` - Required: The ID of the bottle to assign
- `customer_id` - Optional: Leave empty for location-only assignment
- `location` - Required: One of SASKATOON, REGINA, CHILLIWACK, PRINCE_GEORGE
- `rental_start_date` - Optional: Defaults to today

### Pages Updated

1. **Locations Page** (`/locations`)
   - View and edit tax rates for each location
   - Shows location assignment rules
   - Real-time tax rate calculations

2. **Rentals Page** (`/rentals`)
   - Shows bottles "at home" (assigned to locations)
   - Shows customer rentals separately
   - Updated location dropdowns with all four locations

3. **Bottle Management Page** (`/bottle-management`)
   - Updated bulk import to handle location assignment
   - New location dropdowns
   - Enhanced validation for locations

4. **Customer Detail Page** (`/customer/{id}`)
   - Shows currently rented bottles
   - Shows rental history
   - Displays location information

## Tax Rates (Current as of 2024)

| Location | Province | GST | PST | Total |
|----------|----------|-----|-----|-------|
| Saskatoon | Saskatchewan | 5% | 6% | 11% |
| Regina | Saskatchewan | 5% | 6% | 11% |
| Chilliwack | British Columbia | 5% | 7% | 12% |
| Prince George | British Columbia | 5% | 7% | 12% |

## Features

- ✅ **Editable tax rates** - Update rates directly in the Locations page
- ✅ **Location assignment** - Assign bottles to locations via bulk import
- ✅ **At home tracking** - Bottles assigned to locations are tracked but not rented
- ✅ **Customer assignment** - When scanned to orders, bottles get assigned to customers
- ✅ **Tax calculation** - Automatic tax calculation based on location
- ✅ **Bulk operations** - Import multiple bottles with location assignments
- ✅ **Real-time updates** - Changes reflect immediately across all pages

## Usage Examples

### Assign bottles to locations only:
```csv
BOTTLE001,,SASKATOON,
BOTTLE002,,REGINA,
BOTTLE003,,CHILLIWACK,
```

### Assign bottles to customers with location:
```csv
BOTTLE001,CUST123,SASKATOON,2024-01-15
BOTTLE002,CUST456,PRINCE_GEORGE,2024-01-16
```

### Mixed assignment:
```csv
BOTTLE001,CUST123,SASKATOON,2024-01-15
BOTTLE002,,CHILLIWACK,
BOTTLE003,CUST789,REGINA,2024-01-17
``` 