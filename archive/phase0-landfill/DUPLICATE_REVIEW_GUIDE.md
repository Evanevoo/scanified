# Duplicate Record Review Guide

## Overview
When you run a data cleanup operation and see the message "Would fix X duplicate emails using manual_review strategy", this means the system has found duplicate records that require human review before they can be resolved.

## What to Do When You See This Message

### Step 1: Access the Review Interface
1. Go to **Organization Tools** in your navigation sidebar
2. Click **"Run Cleanup"** 
3. Make sure **"Dry Run (Preview Only)"** is checked
4. Click **"Preview Changes"**

### Step 2: Review the Duplicates
The system will open a **"Review Duplicate Records"** dialog showing:

- **Duplicate Email Addresses**: Multiple customer records with the same email
- **Duplicate Customer Names**: Multiple records with the same customer name
- **Duplicate Cylinders**: Multiple records with the same serial number

### Step 3: Make Your Decisions
For each duplicate group, you'll see a table with all the duplicate records. For each record, choose one of these actions:

#### **Keep This Record**
- Use this for the **primary** or **most complete** record
- This record will remain unchanged
- Choose this for the record with the most up-to-date information

#### **Merge Into Primary**
- Use this for records that should be **combined** with the primary record
- The data from this record will be merged into the "Keep" record
- Useful when records have complementary information

#### **Delete This Record**
- Use this for **obsolete** or **incomplete** records
- This record will be permanently removed
- Only use this when you're certain the record is not needed

### Step 4: Apply Your Changes
1. Review all your selections carefully
2. Click **"Apply Selected Actions"**
3. The system will process your decisions and update the database

## Best Practices

### For Email Duplicates
- **Keep** the record with the most recent activity
- **Merge** records that represent the same person but have different information
- **Delete** only if you're certain it's a completely separate person

### For Customer Name Duplicates
- **Keep** the record with the most complete address and contact information
- **Merge** records that are clearly the same customer with slight name variations
- **Delete** only if they're definitely different customers

### For Cylinder Duplicates
- **Keep** the record with the most accurate location and status
- **Merge** records that represent the same physical cylinder
- **Delete** only if it's a data entry error

## Safety Tips

### Before Making Changes
1. **Export your data** first using the Export Data tool
2. **Review carefully** - there's no undo for delete operations
3. **Start small** - process a few duplicates at a time if you're unsure

### When in Doubt
- **Keep** rather than delete if you're uncertain
- **Merge** instead of delete when records have complementary information
- **Cancel** and review again if you need more time to decide

## Example Scenario

**Situation**: You have 3 customer records with the email "john.doe@example.com"

**Record 1**: John Doe, 555-0101, created 2024-01-15
**Record 2**: John Doe, 555-0102, created 2024-01-20  
**Record 3**: John Doe, 555-0103, created 2024-02-01

**Recommended Action**:
- **Keep** Record 3 (most recent)
- **Merge** Record 1 and 2 into Record 3 (combine phone numbers)
- This creates one complete record with all contact information

## What Happens After Resolution

1. **Database Updated**: Your selected actions are applied to the database
2. **Validation Results Updated**: The data health overview will reflect the improvements
3. **Audit Trail**: All changes are logged for compliance purposes

## Getting Help

If you're unsure about how to handle specific duplicates:
1. **Contact Support** through the Support Center
2. **Export the data** for manual review offline
3. **Cancel the operation** and consult with your team

## Technical Notes

- All duplicate resolution operations are logged for audit purposes
- The system prevents deletion of records that have active relationships
- Merged records preserve all unique information from the source records
- The process is atomic - either all changes succeed or none do 