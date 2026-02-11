# Customer Departments

Some customers have different departments (locations, cost centers, or divisions). The app supports this in two ways.

## 1. Single department per customer (built-in)

- **`customers.department`**  
  Optional text field. Use it when each customer has one department or when you only need to record a single department name.

- **Where it appears**
  - Customers list: "Department" column
  - Add/Edit customer: "Department (optional)" field
  - Customer detail: "Department" section (view and edit)

- **Examples:** `Warehouse`, `Lab`, `Shipping`, `Building A`, `Cost Center 123`.

## 2. Multiple departments per customer (optional)

When one customer has many departments, use the **`customer_departments`** table:

| Column            | Type    | Description                          |
|-------------------|---------|--------------------------------------|
| id                | uuid    | Primary key                          |
| organization_id   | uuid    | FK to organizations                  |
| customer_id       | uuid    | FK to customers.id                   |
| name              | text    | Department name                      |
| code              | text    | Optional short code                  |
| address           | text    | Optional address for this department |
| is_default        | boolean | Default department for this customer |
| created_at        | timestamptz | |
| updated_at        | timestamptz | |

- **When to use:** One company (customer) with several departments/locations you need to track or select when assigning assets or creating deliveries.
- **UI:** Not yet implemented. You can manage rows in `customer_departments` via SQL or by adding a “Departments” section on the customer detail page that lists/creates/edits departments for that customer.
- **Assignments:** To track “which department” for bottles or deliveries, add an optional `customer_department_id` on `bottles` and/or `deliveries` in a future migration, then update assignment/delivery flows to allow picking a department when the customer has more than one.

## Running the migration

Apply the department-related schema with:

```bash
supabase db push
```

Or run the migration file manually in the **Supabase Dashboard → SQL Editor**:  
`supabase/migrations/20250127_add_customer_departments.sql`

This adds:

1. `customers.department` (nullable text)
2. `customer_departments` table and indexes
3. A `NOTIFY pgrst, 'reload schema'` so PostgREST’s schema cache picks up the new column

If you still see **"Could not find the 'department' column of 'customers' in the schema cache"** after applying the migration, run this once in the SQL Editor:

```sql
NOTIFY pgrst, 'reload schema';
```

After that, use the **Department** field on customers as needed; use **customer_departments** when you need multiple departments per customer.
