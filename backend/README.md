# Invoice Template System - FastAPI Backend

This backend provides PDF generation and email functionality for the invoice template system.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Copy `.env.example` to `.env` and fill in your configuration:
```bash
cp .env.example .env
```

3. Update `.env` with your Supabase credentials and SMTP settings.

4. Start the server:
```bash
uvicorn main:app --reload --port 8000
```

## API Endpoints

### Generate PDF Invoice
```
POST /api/invoices/generate-pdf
```

Request body:
```json
{
  "customer_id": "CUST001",
  "invoice_period_start": "2025-01-01",
  "invoice_period_end": "2025-01-31",
  "template_id": "uuid-here",
  "organization_id": "org-uuid"
}
```

### Send Invoice Email
```
POST /api/email/send-invoice
```

Request body:
```json
{
  "invoice_id": "invoice-uuid",
  "customer_id": "CUST001",
  "template_id": "uuid-here",
  "organization_id": "org-uuid",
  "to_email": "customer@example.com",
  "subject": "Your Invoice",
  "message": "Custom message"
}
```

### Preview Template
```
GET /api/invoices/preview/{template_id}?organization_id={org_id}
```

## Environment Variables

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_KEY`: Supabase anon key
- `SUPABASE_SERVICE_KEY`: Supabase service role key
- `SMTP_HOST`: SMTP server hostname
- `SMTP_PORT`: SMTP port (usually 587)
- `SMTP_USER`: SMTP username
- `SMTP_PASSWORD`: SMTP password
- `SMTP_FROM_EMAIL`: From email address
- `CORS_ORIGINS`: Comma-separated list of allowed origins

