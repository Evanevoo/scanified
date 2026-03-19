# Customer Rental Settings (Scanified)

Customer-level rental settings are available on the **Customer Detail** page under the **Rental** tab, similar to TrackAbout’s customer Rental section.

## Where these settings already appear

| Page / Component | What’s there | How it uses customer rental settings |
|-----------------|-------------|-------------------------------------|
| **Customer Detail → Rental tab** | Payment terms, Purchase order (required), Tax region, links to rates/flat fees | Source of truth: edit and save to `customers` table. |
| **Rentals** (Edit Rental Settings dialog) | Per-asset rate, rental type (monthly/yearly), Tax code, **Location** | When opened from Customer Detail, **Location** is pre-filled from `customer.location` (tax region). |
| **Invoice Generator** (from Rentals or Customer Detail) | Payment terms, Purchase order (if template shows it) | When opened for a customer, **payment_terms** and **purchase_order** are pre-filled from that customer (Customer Detail → Rental settings). |
| **Settings → Invoice Template** | Org-level template: show Purchase order, Payment terms options | Default for invoices when customer has no saved payment_terms/purchase_order. |
| **Lease Agreements** | `payment_terms` on agreement (e.g. Net 30) | New leases created from Rentals use hardcoded Net 30; could later use `customer.payment_terms` if passed. |
| **Flat Fees** (`/rental/flat-fees`) | Org-level flat fee config | Linked from Customer Detail Rental tab as “Default — Edit”. |
| **Rental Classes** (`/rental/classes`) | Standard rate brackets | Linked from Customer Detail Rental tab as “Standard Rates — View”. |

## Where to find it

1. Go to **Customers** and open a customer (or go to `/customer/:id`).
2. Click the **Rental** tab next to **Customer Info**.
3. Use **Edit rental settings** to change Payment terms, Purchase order, and Tax region.

## What’s on the Rental tab

- **Rental rates**  
  - Rental rate bracket → link to Standard Rates (Rental Classes).  
  - Customer-specific rates → link to Rentals page (edit for this customer).  
  - Daily calculation method and Minimum billable amount (shown in UI; full persistence can be added via DB columns).

- **Other billing methods**  
  - Flat fees → link to org Flat Fees.  
  - Asset agreements → placeholder (None set / Add).

- **Other settings**  
  - Payment terms (persisted on customer).  
  - Purchase order (Required) (persisted on customer).  
  - Tax region (uses customer `location`, e.g. SASKATOON, REGINA).  
  - Rental bill format / Tax status → Default (display only for now).

## Database (optional)

Saving rental settings updates the **customers** table with:

- `payment_terms` (e.g. Net 30, Credit card)
- `purchase_order` (e.g. P000021880)
- `location` (used as tax region: SASKATOON, REGINA, etc.)

If your `customers` table does not have `payment_terms` or `purchase_order`, add them in the Supabase SQL editor:

```sql
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS payment_terms text,
  ADD COLUMN IF NOT EXISTS purchase_order text;
```

After that, **Edit rental settings** will persist and display these values correctly.
