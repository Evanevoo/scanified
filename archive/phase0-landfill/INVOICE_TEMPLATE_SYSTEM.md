# Invoice Template System - Implementation Guide

## Overview

A comprehensive invoice template system that allows users to create, edit, save, select, and apply different invoice templates when generating rental invoices - similar to QuickBooks functionality.

## Features Implemented

### 1. Database Schema
- **`invoice_templates` table**: Stores template configurations with JSONB layout data
- **`invoice_settings` table**: Updated with `default_template_id` field
- **`rental_invoices` table**: Updated with `template_id` field
- Automatic default template creation for existing organizations
- RLS policies for secure access

### 2. Template Designer Page
- **Location**: `/invoice-templates/designer` or `/invoice-templates/designer/:templateId`
- **Features**:
  - Upload/change company logo
  - Choose primary and secondary colors
  - Select fonts (heading and body)
  - Edit header and footer text
  - Toggle visibility of fields (quantity, serial number, barcode, start date, rental days, rate, total)
  - Drag-and-drop column reordering
  - Live preview (requires FastAPI backend)
  - Save as new template or update existing
  - Set template as default

### 3. Template List/Management Page
- **Location**: `/invoice-templates`
- **Features**:
  - View all templates
  - Create new template
  - Edit existing template
  - Duplicate template
  - Delete template (with usage check)
  - Set default template
  - See which template is default

### 4. Invoice Creation with Template Selection
- **Updated**: `CreateInvoiceDialog` component
- **Features**:
  - Template dropdown selector
  - Default template auto-selected
  - Template ID saved with invoice

### 5. FastAPI Backend
- **Location**: `backend/` directory
- **Endpoints**:
  - `POST /api/invoices/generate-pdf`: Generate PDF using template
  - `POST /api/email/send-invoice`: Send invoice email with PDF
  - `GET /api/invoices/preview/{template_id}`: Preview template with sample data
- **Services**:
  - PDF generation using WeasyPrint and Jinja2
  - Email sending via SMTP
  - Supabase integration for data and storage

### 6. Jinja Template System
- **Location**: `backend/templates/invoice.html`
- **Features**:
  - Dynamic column rendering based on template configuration
  - Customizable colors and fonts
  - Conditional field visibility
  - Header/footer support
  - Logo support

## Setup Instructions

### 1. Database Migration
Run the migration file:
```sql
-- Run in Supabase SQL Editor
\i supabase/migrations/20250121_create_invoice_templates.sql
```

### 2. FastAPI Backend Setup
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your credentials
uvicorn main:app --reload --port 8000
```

### 3. Frontend Configuration
The frontend is already integrated. Just ensure:
- Supabase client is configured
- Routes are accessible (already added to App.jsx)
- Navigation menu includes "Invoice Templates" (already added to Sidebar)

## Usage

### Creating a Template
1. Navigate to **Administration > Invoice Templates**
2. Click **Create Template**
3. Fill in template name and description
4. Configure:
   - Logo (upload)
   - Colors (primary/secondary)
   - Fonts (heading/body)
   - Header text and visibility
   - Footer text and visibility
   - Field visibility toggles
   - Column order (drag and drop)
5. Click **Save**

### Using Templates in Invoices
1. When creating an invoice, select a template from the dropdown
2. If no template is selected, the default template is used
3. The template is saved with the invoice for future reference

### Generating PDFs
1. Create or edit an invoice
2. The FastAPI backend will use the selected template to generate the PDF
3. PDFs are stored in Supabase Storage under `invoices/{organization_id}/`

### Sending Emails
1. Use the email endpoint with invoice ID and template ID
2. The backend generates the PDF using the template
3. Email is sent with PDF attachment

## File Structure

```
backend/
├── main.py                 # FastAPI app
├── config.py              # Configuration
├── auth.py                # Authentication
├── requirements.txt       # Python dependencies
├── routers/
│   ├── invoices.py       # PDF generation endpoints
│   └── email.py          # Email endpoints
├── services/
│   ├── pdf_service.py    # PDF generation logic
│   ├── email_service.py  # Email sending logic
│   └── supabase_service.py # Database operations
└── templates/
    └── invoice.html      # Jinja2 template

src/
├── pages/
│   ├── InvoiceTemplates.jsx          # Template list page
│   └── InvoiceTemplateDesigner.jsx   # Template designer
└── components/
    └── CreateInvoiceDialog.jsx       # Updated with template selection

supabase/migrations/
└── 20250121_create_invoice_templates.sql
```

## Template JSON Structure

```json
{
  "logo_url": "https://...",
  "colors": {
    "primary": "#1976d2",
    "secondary": "#424242"
  },
  "fonts": {
    "heading": "Helvetica",
    "body": "Helvetica"
  },
  "header": {
    "text": "Custom header text",
    "show": true
  },
  "footer": {
    "text": "Custom footer text",
    "show": true
  },
  "fields": {
    "show_quantity": true,
    "show_serial_number": true,
    "show_barcode": true,
    "show_start_date": true,
    "show_rental_days": true,
    "show_rate": true,
    "show_total": true
  },
  "columns": [
    {
      "id": "description",
      "label": "Description",
      "visible": true,
      "order": 0
    },
    // ... more columns
  ]
}
```

## Next Steps

1. **Connect Frontend to Backend**: Update the frontend to call FastAPI endpoints for PDF generation
2. **Add Preview Functionality**: Implement live preview in the template designer
3. **Email Integration**: Configure SMTP settings and test email sending
4. **Storage Setup**: Ensure Supabase Storage bucket `invoices` exists and has proper permissions
5. **Testing**: Test template creation, PDF generation, and email sending

## Notes

- The system automatically creates a default template for each organization
- Only one template can be set as default per organization
- Templates cannot be deleted if they're in use by invoices
- PDF generation requires WeasyPrint (installed via requirements.txt)
- Email requires SMTP configuration in `.env`

