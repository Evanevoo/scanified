# Rental Invoicing System Documentation

## Overview

The complete invoicing system has been implemented for your gas cylinder tracking app. This system allows you to:

- Generate professional invoices for customer rentals
- Automatically calculate rental charges based on customer pricing
- Customize invoice appearance with company branding
- Download invoices as PDF
- Track invoice status (draft, sent, paid)
- Manage invoice settings and configurations

## Database Tables

### 1. `invoice_settings`
Stores company and invoice configuration per organization:
- Company information (name, address, phone, email)
- Invoice numbering settings (prefix, next number)
- Branding (primary/secondary colors)
- Default tax rate and payment terms
- Invoice footer and notes

### 2. `rental_invoices`
Main invoice records:
- Invoice number (auto-generated)
- Customer information
- Date and period covered
- Amounts (subtotal, tax, total)
- Status (draft, sent, paid, cancelled)
- PDF URL (for future storage)
- Timestamps for sent/paid dates

### 3. `invoice_line_items`
Individual line items per invoice:
- Item description
- Quantity and unit price
- Cylinder/rental details
- Rental period (days)
- Line type (rental, fee, discount, other)

## Key Features

### Automatic Invoice Numbering
- Invoices are auto-numbered using format: `{PREFIX}-{NUMBER}`
- Default: `INV-000001`, `INV-000002`, etc.
- Customizable prefix and starting number

### Dynamic Rental Calculations
- Automatically loads active rentals for selected customer
- Calculates rental days based on invoice period
- Applies customer-specific pricing (discounts, fixed rates)
- Converts monthly rates to daily rates for accurate billing

### Custom Line Items
- Add fees, discounts, or other charges
- Flexible quantity and pricing
- Support for various line item types

### Invoice Preview
- Professional invoice layout
- Company branding with custom colors
- Detailed line items with rental period information
- Subtotal, tax, and total calculations
- Company and customer information display

### PDF Generation
- High-quality PDF invoices using jsPDF
- Custom colors from settings
- Professional formatting
- Automatic download

### Status Tracking
- **Draft**: Invoice is being prepared
- **Sent**: Invoice has been sent to customer
- **Paid**: Payment received
- **Cancelled**: Invoice void

### Invoice Statistics
- Total invoices count
- Count by status (draft, sent, paid)
- Total revenue from paid invoices
- Real-time dashboard

## Pages

### 1. Rental Invoices (`/invoices`)
Main invoicing page with:
- Statistics dashboard
- Invoice list with search and filters
- Create, edit, view, delete actions
- Quick status updates
- PDF download

### 2. Invoice Settings (`/invoice-settings`)
Configuration page for:
- Company information
- Invoice numbering
- Tax rates and payment terms
- Brand colors
- Default notes and footer text
- Live preview of settings

## Usage Guide

### Creating an Invoice

1. **Navigate to Invoices**
   - Go to `/invoices` or `/rental-invoices`

2. **Click "Create Invoice"**

3. **Select Customer**
   - Choose from your customer list
   - System automatically loads active rentals

4. **Set Invoice Period**
   - Select start and end dates
   - Rentals within this period are included
   - Rental days are calculated automatically

5. **Review Line Items**
   - Verify auto-loaded rental charges
   - Add custom fees if needed
   - Remove unwanted items

6. **Add Notes** (optional)
   - Special instructions or terms

7. **Save Invoice**
   - Creates invoice in "draft" status
   - Can be edited before sending

### Viewing an Invoice

1. Click the **eye icon** on any invoice
2. Review full invoice details
3. Download as PDF
4. Mark as sent or paid
5. Print if needed

### Configuring Settings

1. **Navigate to Invoice Settings**
   - Go to `/invoice-settings`

2. **Company Information**
   - Name, address, phone, email
   - Appears on all invoices

3. **Invoice Configuration**
   - Set invoice prefix (e.g., "INV", "INVOICE")
   - Set next invoice number
   - Configure default tax rate
   - Set payment terms

4. **Branding**
   - Choose primary color (headers, accents)
   - Choose secondary color
   - Preview changes in real-time

5. **Notes & Footer**
   - Add default invoice notes
   - Set footer text (e.g., "Thank you for your business!")

6. **Save Settings**

## Integration with Existing System

The invoicing system integrates seamlessly with:

### Customer Pricing
- Respects customer-specific pricing from `customer_pricing` table
- Applies discounts and fixed rate overrides
- Falls back to standard pricing if no custom pricing exists

### Rentals
- Loads from `rentals` table
- Only includes active rentals (no end date)
- Calculates based on rental start date and invoice period

### Lease Agreements
- Can include lease agreement customers
- Respects annual/monthly billing frequencies

## Technical Details

### PDF Generation
- Library: `jsPDF` with `jspdf-autotable`
- Client-side generation (no server required)
- Customizable colors and branding
- Professional table formatting

### Database Triggers
- Auto-generates invoice numbers on insert
- Auto-calculates totals when line items change
- Maintains invoice number sequence

### Row Level Security (RLS)
- All tables protected by RLS policies
- Users can only access their organization's data
- Based on `organization_id` in profiles table

### Invoice Number Format
- Format: `{PREFIX}-{6-digit-number}`
- Example: `INV-000001`
- Padded with zeros for consistent length
- Auto-increments per organization

## Next Steps

### Email Functionality (Not Yet Implemented)
To add email invoices:

1. **Option A: Supabase Edge Function**
   ```typescript
   // Create edge function to send emails
   // Use Resend, SendGrid, or Mailgun
   ```

2. **Option B: Client-side Email**
   ```javascript
   // Use mailto: links
   // Or integrate with email service API
   ```

3. **Attach PDF**
   - Generate PDF
   - Upload to Supabase Storage
   - Send email with PDF link

### Future Enhancements
- Recurring invoices
- Payment tracking with receipts
- Invoice templates
- Multi-currency support
- Batch invoice generation
- Email automation
- Invoice reminders

## File Structure

```
src/
├── pages/
│   ├── RentalInvoices.jsx          # Main invoices page
│   └── InvoiceSettings.jsx         # Settings configuration
├── components/
│   ├── CreateInvoiceDialog.jsx     # Invoice creation form
│   └── InvoicePreview.jsx          # Invoice preview/view
└── utils/
    └── pdfGenerator.js             # PDF generation utility

supabase/migrations/
└── 20250121_create_invoicing_tables.sql  # Database schema
```

## Database Migration

To apply the database schema, run:

```bash
# Using Supabase CLI
supabase db push

# Or manually run the migration file in Supabase Dashboard
# SQL Editor > New Query > Paste migration content > Run
```

## Testing the System

1. **Setup**
   - Configure invoice settings first
   - Add company information
   - Set colors and branding

2. **Create Test Invoice**
   - Select a customer with active rentals
   - Set current month as period
   - Review auto-generated line items
   - Save and view

3. **Download PDF**
   - Verify company branding
   - Check calculations
   - Review formatting

4. **Test Status Changes**
   - Mark as sent
   - Mark as paid
   - Verify timestamps

## Troubleshooting

### No Rentals Found
- Check customer has active rentals
- Verify rental dates overlap with invoice period
- Check `rentals` table data

### Invoice Number Not Generated
- Run database migration
- Check `invoice_settings` table exists
- Verify trigger is created

### PDF Download Issues
- Check browser console for errors
- Verify jsPDF libraries are installed
- Test with simpler invoice first

### Styling Issues
- Clear browser cache
- Check Material-UI theme
- Verify color hex codes in settings

## Support

For issues or questions:
1. Check browser console for errors
2. Review database logs in Supabase
3. Verify RLS policies are enabled
4. Check user permissions

## API Reference

### Invoice Creation
```javascript
const invoiceData = {
  organization_id: 'uuid',
  customer_id: 'customer_id',
  customer_name: 'string',
  invoice_date: 'YYYY-MM-DD',
  invoice_period_start: 'YYYY-MM-DD',
  invoice_period_end: 'YYYY-MM-DD',
  notes: 'string',
  status: 'draft'
};
```

### Line Item Format
```javascript
const lineItem = {
  invoice_id: 'uuid',
  line_type: 'rental|fee|discount|other',
  description: 'string',
  quantity: 1,
  unit_price: 15.00,
  total_price: 15.00,
  rental_days: 30
};
```

## Permissions

- **View Invoices**: All organization users
- **Create/Edit Invoices**: All organization users
- **Delete Invoices**: All organization users
- **Configure Settings**: Admin, Owner, Manager roles

---

**Version**: 1.0.0  
**Last Updated**: January 2025  
**Tech Stack**: React, Material-UI, Supabase, jsPDF

