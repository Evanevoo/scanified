# Gas Cylinder Management System API Documentation

## Overview

The Gas Cylinder Management System provides a comprehensive REST API for managing gas cylinders, customers, rentals, deliveries, and maintenance workflows. The API is built on Supabase and follows RESTful principles.

## Base URL

```
https://your-project.supabase.co/rest/v1/
```

## Authentication

All API requests require authentication using Supabase JWT tokens.

### Headers

```http
Authorization: Bearer <your-jwt-token>
apikey: <your-supabase-anon-key>
Content-Type: application/json
```

## Rate Limiting

- **Rate Limit**: 1000 requests per hour per user
- **Burst Limit**: 100 requests per minute
- **Headers**: Rate limit information is included in response headers

## Error Handling

All errors follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": "Additional error details"
  }
}
```

### Common Error Codes

- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `429` - Rate Limited
- `500` - Internal Server Error

## Endpoints

### Authentication

#### POST /auth/v1/signup
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "user_metadata": {
    "full_name": "John Doe"
  }
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "email_confirmed_at": null
  },
  "session": null
}
```

#### POST /auth/v1/token
Authenticate user and get session token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "access_token": "jwt-token",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "refresh-token",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

### Organizations

#### GET /organizations
Get all organizations for the authenticated user.

**Query Parameters:**
- `select` - Fields to select (default: *)
- `order` - Sort order (e.g., `name.asc`)
- `limit` - Number of records to return
- `offset` - Number of records to skip

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Acme Gas Company",
    "slug": "acme-gas",
    "description": "Leading gas cylinder supplier",
    "logo_url": "https://example.com/logo.png",
    "subscription_status": "active",
    "max_users": 50,
    "max_cylinders": 1000,
    "max_customers": 500,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

#### POST /organizations
Create a new organization.

**Request Body:**
```json
{
  "name": "New Gas Company",
  "description": "New gas cylinder supplier",
  "industry": "Industrial",
  "size": "medium"
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "New Gas Company",
  "slug": "new-gas-company",
  "created_at": "2024-01-01T00:00:00Z"
}
```

#### GET /organizations/{id}
Get a specific organization.

**Response:**
```json
{
  "id": "uuid",
  "name": "Acme Gas Company",
  "slug": "acme-gas",
  "description": "Leading gas cylinder supplier",
  "subscription_status": "active",
  "settings": {
    "timezone": "UTC",
    "currency": "USD",
    "date_format": "MM/DD/YYYY"
  }
}
```

### Bottles (Assets)

#### GET /bottles
Get all bottles for the organization.

**Query Parameters:**
- `status` - Filter by status (available, rented, maintenance, retired)
- `location` - Filter by location
- `customer_id` - Filter by assigned customer
- `search` - Search by serial number or description

**Response:**
```json
[
  {
    "id": "uuid",
    "serial_number": "ABC123",
    "barcode_number": "1234567890",
    "product_code": "O2-40",
    "description": "Oxygen Cylinder 40L",
    "size": "40L",
    "type": "cylinder",
    "gas_type": "oxygen",
    "status": "available",
    "location": "Warehouse A",
    "customer_name": null,
    "rental_start_date": null,
    "rental_end_date": null,
    "last_inspection_date": "2024-01-01",
    "next_inspection_date": "2024-07-01",
    "purchase_date": "2023-01-01",
    "purchase_price": 500.00,
    "current_value": 450.00,
    "condition": "good",
    "notes": "Regular maintenance required",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

#### POST /bottles
Create a new bottle.

**Request Body:**
```json
{
  "serial_number": "ABC124",
  "barcode_number": "1234567891",
  "product_code": "O2-40",
  "description": "Oxygen Cylinder 40L",
  "size": "40L",
  "type": "cylinder",
  "gas_type": "oxygen",
  "status": "available",
  "location": "Warehouse A",
  "purchase_date": "2024-01-01",
  "purchase_price": 500.00,
  "condition": "excellent"
}
```

#### PUT /bottles/{id}
Update a bottle.

**Request Body:**
```json
{
  "status": "rented",
  "customer_name": "Customer ABC",
  "rental_start_date": "2024-01-15",
  "notes": "Rented to customer ABC"
}
```

#### DELETE /bottles/{id}
Delete a bottle (soft delete).

### Customers

#### GET /customers
Get all customers for the organization.

**Query Parameters:**
- `status` - Filter by status (active, inactive, suspended)
- `customer_type` - Filter by type (individual, business, government)
- `search` - Search by name or email

**Response:**
```json
[
  {
    "id": "uuid",
    "CustomerListID": "CUST001",
    "name": "ABC Manufacturing",
    "email": "contact@abcmanufacturing.com",
    "phone": "+1-555-0123",
    "address": "123 Industrial Blvd",
    "city": "Chicago",
    "state": "IL",
    "postal_code": "60601",
    "country": "USA",
    "contact_person": "John Smith",
    "customer_type": "business",
    "status": "active",
    "credit_limit": 10000.00,
    "payment_terms": "Net 30",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

#### POST /customers
Create a new customer.

**Request Body:**
```json
{
  "CustomerListID": "CUST002",
  "name": "XYZ Corporation",
  "email": "contact@xyzcorp.com",
  "phone": "+1-555-0456",
  "address": "456 Business Ave",
  "city": "New York",
  "state": "NY",
  "postal_code": "10001",
  "country": "USA",
  "contact_person": "Jane Doe",
  "customer_type": "business",
  "status": "active",
  "credit_limit": 15000.00,
  "payment_terms": "Net 15"
}
```

### Rentals

#### GET /rentals
Get all rental records.

**Query Parameters:**
- `status` - Filter by status (active, completed, cancelled)
- `customer_id` - Filter by customer
- `bottle_id` - Filter by bottle
- `date_from` - Filter by start date
- `date_to` - Filter by end date

**Response:**
```json
[
  {
    "id": "uuid",
    "customer_id": "uuid",
    "bottle_id": "uuid",
    "rental_start_date": "2024-01-15",
    "rental_end_date": null,
    "daily_rate": 5.00,
    "total_amount": null,
    "status": "active",
    "payment_status": "pending",
    "payment_due_date": "2024-02-15",
    "late_fees": 0.00,
    "notes": "Monthly rental",
    "customer": {
      "name": "ABC Manufacturing"
    },
    "bottle": {
      "serial_number": "ABC123",
      "description": "Oxygen Cylinder 40L"
    },
    "created_at": "2024-01-15T00:00:00Z"
  }
]
```

#### POST /rentals
Create a new rental record.

**Request Body:**
```json
{
  "customer_id": "uuid",
  "bottle_id": "uuid",
  "rental_start_date": "2024-01-15",
  "daily_rate": 5.00,
  "notes": "Monthly rental for ABC Manufacturing"
}
```

### Deliveries

#### GET /deliveries
Get all delivery records.

**Query Parameters:**
- `status` - Filter by status (scheduled, in_transit, delivered, failed, cancelled)
- `customer_id` - Filter by customer
- `driver_id` - Filter by driver
- `date_from` - Filter by delivery date
- `date_to` - Filter by delivery date

**Response:**
```json
[
  {
    "id": "uuid",
    "customer_id": "uuid",
    "delivery_date": "2024-01-20",
    "delivery_address": "123 Industrial Blvd, Chicago, IL 60601",
    "contact_person": "John Smith",
    "contact_phone": "+1-555-0123",
    "status": "scheduled",
    "driver_id": "uuid",
    "vehicle_id": "uuid",
    "delivery_notes": "Morning delivery preferred",
    "customer": {
      "name": "ABC Manufacturing"
    },
    "driver": {
      "full_name": "Mike Johnson"
    },
    "vehicle": {
      "name": "Truck 001",
      "license_plate": "ABC123"
    },
    "items": [
      {
        "bottle_id": "uuid",
        "quantity": 2,
        "action": "deliver",
        "bottle": {
          "serial_number": "ABC123",
          "description": "Oxygen Cylinder 40L"
        }
      }
    ],
    "created_at": "2024-01-15T00:00:00Z"
  }
]
```

### Maintenance

#### GET /maintenance-records
Get all maintenance records.

**Query Parameters:**
- `bottle_id` - Filter by bottle
- `maintenance_type` - Filter by type (inspection, repair, cleaning, calibration, replacement)
- `status` - Filter by status (scheduled, in_progress, completed, cancelled)
- `date_from` - Filter by date
- `date_to` - Filter by date

**Response:**
```json
[
  {
    "id": "uuid",
    "bottle_id": "uuid",
    "maintenance_type": "inspection",
    "description": "Annual safety inspection",
    "performed_by": "uuid",
    "performed_date": "2024-01-15",
    "next_maintenance_date": "2025-01-15",
    "cost": 150.00,
    "status": "completed",
    "notes": "All safety checks passed",
    "bottle": {
      "serial_number": "ABC123",
      "description": "Oxygen Cylinder 40L"
    },
    "technician": {
      "full_name": "Sarah Wilson"
    },
    "created_at": "2024-01-15T00:00:00Z"
  }
]
```

### Analytics

#### GET /analytics/dashboard
Get dashboard analytics data.

**Query Parameters:**
- `period` - Time period (day, week, month, quarter, year)
- `start_date` - Start date (ISO format)
- `end_date` - End date (ISO format)

**Response:**
```json
{
  "period": "month",
  "start_date": "2024-01-01",
  "end_date": "2024-01-31",
  "metrics": {
    "total_bottles": 1500,
    "active_rentals": 850,
    "total_revenue": 45000.00,
    "new_customers": 25,
    "maintenance_alerts": 12,
    "delivery_completions": 180
  },
  "trends": {
    "revenue_growth": 15.5,
    "customer_growth": 8.2,
    "rental_utilization": 85.3,
    "maintenance_costs": 2500.00
  },
  "charts": {
    "revenue_chart": [
      {
        "label": "Week 1",
        "value": 11250.00,
        "date": "2024-01-01"
      }
    ],
    "rental_chart": [
      {
        "label": "Week 1",
        "value": 200,
        "date": "2024-01-01"
      }
    ]
  }
}
```

## Webhooks

### Event Types

- `bottle.created` - New bottle created
- `bottle.updated` - Bottle updated
- `bottle.deleted` - Bottle deleted
- `rental.created` - New rental created
- `rental.updated` - Rental updated
- `rental.completed` - Rental completed
- `delivery.scheduled` - Delivery scheduled
- `delivery.completed` - Delivery completed
- `maintenance.scheduled` - Maintenance scheduled
- `maintenance.completed` - Maintenance completed

### Webhook Payload

```json
{
  "event": "bottle.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "id": "uuid",
    "serial_number": "ABC123",
    "status": "available"
  },
  "organization_id": "uuid"
}
```

## SDK Examples

### JavaScript/TypeScript

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://your-project.supabase.co',
  'your-anon-key'
)

// Get all bottles
const { data: bottles, error } = await supabase
  .from('bottles')
  .select('*')
  .eq('status', 'available')

// Create a new rental
const { data: rental, error } = await supabase
  .from('rentals')
  .insert({
    customer_id: 'customer-uuid',
    bottle_id: 'bottle-uuid',
    rental_start_date: '2024-01-15',
    daily_rate: 5.00
  })
```

### Python

```python
from supabase import create_client, Client

url = "https://your-project.supabase.co"
key = "your-anon-key"
supabase: Client = create_client(url, key)

# Get all bottles
response = supabase.table("bottles").select("*").eq("status", "available").execute()
bottles = response.data

# Create a new rental
rental_data = {
    "customer_id": "customer-uuid",
    "bottle_id": "bottle-uuid",
    "rental_start_date": "2024-01-15",
    "daily_rate": 5.00
}
response = supabase.table("rentals").insert(rental_data).execute()
```

## Best Practices

1. **Use Pagination**: Always use `limit` and `offset` for large datasets
2. **Filter Early**: Use query parameters to filter data at the database level
3. **Handle Errors**: Implement proper error handling for all API calls
4. **Cache Responses**: Cache frequently accessed data to improve performance
5. **Use Webhooks**: Subscribe to relevant events for real-time updates
6. **Validate Input**: Always validate input data before sending requests
7. **Monitor Usage**: Keep track of API usage to stay within rate limits

## Support

For API support and questions:
- Email: api-support@gascylinderapp.com
- Documentation: https://docs.gascylinderapp.com
- Status Page: https://status.gascylinderapp.com
