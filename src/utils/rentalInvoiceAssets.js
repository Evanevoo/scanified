/**
 * Builds serialized-asset rows for rental invoices: merges assigned bottles with open rental rows
 * (same spirit as CustomerDetail / billing) so DNS-only and timing gaps still appear.
 */

function norm(v) {
  return String(v || '').trim().toLowerCase();
}

function normName(v) {
  return String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function bottleRowMatchesInvoiceCustomer(b, row) {
  const idKeys = new Set(
    [norm(row?.customer_id), norm(row?.customer?.id), norm(row?.customer?.CustomerListID)].filter(Boolean)
  );
  const nameKeys = new Set(
    [normName(row?.customer?.name), normName(row?.customer?.Name), normName(row?.customer_name)].filter(Boolean)
  );
  // Check each bottle identifier independently so a stale assigned_customer never
  // blocks a valid customer_id or customer_uuid match (and vice-versa).
  const bottleAssignedKey = norm(b.assigned_customer);
  const bottleCustomerIdKey = norm(b.customer_id);
  const bottleCustomerUuidKey = norm(b.customer_uuid);
  const bottleNameKey = normName(b.customer_name);
  return (
    (bottleAssignedKey && idKeys.has(bottleAssignedKey)) ||
    (bottleCustomerIdKey && idKeys.has(bottleCustomerIdKey)) ||
    (bottleCustomerUuidKey && idKeys.has(bottleCustomerUuidKey)) ||
    (bottleNameKey && nameKeys.has(bottleNameKey))
  );
}

export function rentalRowMatchesInvoiceCustomer(r, row) {
  const idKeys = new Set(
    [norm(row?.customer_id), norm(row?.customer?.id), norm(row?.customer?.CustomerListID)].filter(Boolean)
  );
  const nameKeys = new Set(
    [normName(row?.customer?.name), normName(row?.customer?.Name), normName(row?.customer_name)].filter(Boolean)
  );
  const rid = norm(r.customer_id);
  const rname = normName(r.customer_name);
  if (rid && idKeys.has(rid)) return true;
  if (rname && nameKeys.has(rname)) return true;
  if (rid && nameKeys.has(rid)) return true;
  return false;
}

/**
 * Open / on-hand assets: assigned bottles plus open rental rows not already represented (e.g. DNS).
 * Enriches delivered date from matching open rental when the bottle row lacks it.
 */
export function buildOpenAssetRowsForInvoice(row, bottles, openRentals) {
  const bottlesArr = Array.isArray(bottles) ? bottles : [];
  const rentalsArr = Array.isArray(openRentals) ? openRentals : [];

  const customerBottles = bottlesArr.filter((b) => bottleRowMatchesInvoiceCustomer(b, row));
  const customerRentals = rentalsArr.filter((r) => rentalRowMatchesInvoiceCustomer(r, row));

  const matchedRentalIds = new Set();
  const out = [];

  for (const b of customerBottles) {
    const rental = customerRentals.find(
      (r) => r.bottle_id != null && String(r.bottle_id).trim() === String(b.id).trim()
    );
    if (rental) matchedRentalIds.add(rental.id);

    const delivered =
      rental?.rental_start_date ||
      b.rental_start_date ||
      b.delivery_date ||
      b.purchase_date ||
      null;

    out.push({
      ...b,
      rental_start_date: delivered,
      delivery_date: delivered,
      _invoiceStatus: 'On hand',
    });
  }

  for (const r of customerRentals) {
    if (matchedRentalIds.has(r.id)) continue;

    const bid = r.bottle_id != null ? String(r.bottle_id).trim() : '';
    if (bid && customerBottles.some((b) => String(b.id).trim() === bid)) {
      continue;
    }

    out.push({
      id: r.id || `rental-${r.bottle_barcode || Math.random()}`,
      rental_class: r.asset_type || r.product_type || 'Industrial Cylinders',
      description:
        r.product_code ||
        r.product_type ||
        r.dns_product_code ||
        r.asset_type ||
        '—',
      rental_start_date: r.rental_start_date,
      delivery_date: r.rental_start_date,
      barcode_number: r.bottle_barcode,
      bottle_barcode: r.bottle_barcode,
      serial_number: '—',
      _invoiceSource: 'rental_only',
      _invoiceStatus: 'On hand',
      is_dns: r.is_dns === true,
    });
  }

  return out;
}

/**
 * Closed rentals whose return date falls within [periodStart, periodEnd] (inclusive, date strings YYYY-MM-DD).
 */
export async function fetchReturnsInInvoicePeriod(supabase, organizationId, row, periodStart, periodEnd) {
  const { data, error } = await supabase
    .from('rentals')
    .select('*')
    .eq('organization_id', organizationId)
    .not('rental_end_date', 'is', null)
    .gte('rental_end_date', periodStart)
    .lte('rental_end_date', periodEnd);

  if (error) throw error;
  const rows = (data || []).filter((r) => rentalRowMatchesInvoiceCustomer(r, row));
  return enrichReturnsWithBottleDetails(supabase, organizationId, rows);
}

async function enrichReturnsWithBottleDetails(supabase, organizationId, returnsRows) {
  const ids = [...new Set(returnsRows.map((r) => r.bottle_id).filter(Boolean))];
  if (ids.length === 0) return returnsRows;

  const { data: bottleRows, error } = await supabase
    .from('bottles')
    .select('id, serial_number, cylinder_number, barcode_number, barcode')
    .eq('organization_id', organizationId)
    .in('id', ids);

  if (error) return returnsRows;

  const byId = new Map((bottleRows || []).map((b) => [String(b.id), b]));

  return returnsRows.map((r) => {
    const b = r.bottle_id != null ? byId.get(String(r.bottle_id)) : null;
    return {
      ...r,
      _serial_display: b?.serial_number || b?.cylinder_number || null,
      _barcode_display: r.bottle_barcode || b?.barcode_number || b?.barcode || null,
    };
  });
}
