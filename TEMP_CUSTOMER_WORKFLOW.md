# Temp Customer Workflow Guide

## 🎯 Overview

The Temp Customer system allows you to handle walk-in customers who need immediate item assignment before their account is properly set up in the system.

## 🔧 How It Works

### 1. **Universal "Temp Customer" Account**
- Each organization automatically gets one "Temp Customer" account
- This account is used for all walk-in customers temporarily
- Items assigned to this account show as "Needs Reassignment"

### 2. **Mobile App Workflow**
When a new customer walks in:
1. **Scan their customer barcode** in the mobile app
2. **Search for "Temp Customer"** in the customer selection
3. **Assign items to "Temp Customer"** for temporary holding
4. Items are now tracked in the system but marked for reassignment

### 3. **Office Reassignment Workflow**
Later, from your computer:
1. Go to **"Temp Customer Management"** in the sidebar
2. **View all items** assigned to temp customers
3. **Select items** to reassign
4. **Search and select** the real customer account
5. **Reassign items** to the proper customer

## 📋 Step-by-Step Instructions

### **For Mobile App Users**
1. When a walk-in customer needs items:
   - Scan item barcodes as normal
   - For customer assignment, search for "Temp Customer"
   - Assign all items to "Temp Customer"
   - Continue with normal scanning workflow

2. Items are now tracked but need proper customer assignment

### **For Office Staff**
1. Navigate to **"Temp Customer Management"** page
2. Review all items needing reassignment
3. Select items for the same customer
4. Click **"Reassign Selected"**
5. Search for the real customer (or create new customer first)
6. Complete the reassignment

## ✅ Benefits

- **No lost items**: Walk-in customers can get items immediately
- **Proper tracking**: All items are tracked in the system
- **Clean data**: Items eventually get assigned to real customers  
- **Simple workflow**: Minimal training needed for mobile users
- **Flexible**: Can reassign items later when convenient

## 🗂️ Database Structure

### **Customer Types**
- `CUSTOMER`: Regular paying customers (billable)
- `VENDOR`: Business partners (in-house, not billable)  
- `TEMPORARY`: The universal "Temp Customer" account (billable when reassigned)

### **Asset Status Logic**
- Items with **Vendors**: `IN-HOUSE` (no rental charges)
- Items with **Customers**: `RENTED` (billable)
- Items with **Temp Customer**: `RENTED` (needs reassignment)

## 🔍 Features

### **Temp Customer Management Page**
- **Statistics dashboard**: Shows items needing reassignment
- **Bulk selection**: Select multiple items at once
- **Customer search**: Find customers by name or ID
- **Real-time updates**: Refreshes data automatically
- **Assignment tracking**: See when items were first assigned

### **Mobile App Integration**
- **Easy search**: "Temp Customer" appears in customer search
- **Normal workflow**: No special training needed
- **Immediate assignment**: Items are tracked right away

## ⚠️ Important Notes

1. **Create real customers first**: Always create the customer account before reassigning
2. **Batch reassignments**: Group items by customer for efficiency
3. **Regular maintenance**: Check temp customer items regularly
4. **Ownership tracking**: Items maintain ownership information during reassignment
5. **Billing implications**: Items become billable when reassigned to customers

## 🚀 Getting Started

1. **Run the database migration** to set up temp customer accounts
2. **Train mobile app users** to search for "Temp Customer"
3. **Train office staff** to use the reassignment page
4. **Establish routine** for processing temp customer items

**That's it! Your walk-in customer workflow is now streamlined and trackable.** 🎉