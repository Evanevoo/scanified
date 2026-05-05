import { supabase } from '../supabase/client';
import {
  generateInvoiceNumber,
  getNextBillingDate,
  getPeriodEnd,
  calculateProration,
  getEndOfMonth,
} from '../utils/subscriptionUtils';
import {
  buildAssetPricingMap,
  buildCustomerOverrideMap,
  flattenCustomerPricingRowsToLegacyOverrides,
  resolveEffectiveUnitPrice,
  defaultUnitRatesFromAssetPricingTable,
  normalizePricingKey,
} from './pricingResolution';
import { groupBillableUnitCountsByProductCode } from './billingFromAssets';
import { findActiveLeaseContract, leaseLineCycleAmount } from './leaseBilling';

/** Legacy `rentals` rows and `rental_amount` are not used for subscription invoice math; invoices branch on customers.billing_mode. */

async function loadCustomerRowForSubscription(sub, organizationId) {
  const cid = sub?.customer_id;
  if (!cid || !organizationId) return { id: cid, CustomerListID: cid };
  const { data: byId } = await supabase
    .from('customers')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('id', cid)
    .maybeSingle();
  if (byId) return byId;
  const { data: byList } = await supabase
    .from('customers')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('CustomerListID', cid)
    .maybeSingle();
  return byList || { id: cid, CustomerListID: cid };
}

async function loadPricingMaps(organizationId) {
  const [
    { data: assetRows, error: aErr },
    { data: overrideRows, error: oErr },
    { data: legacyRows, error: lErr },
    { data: customerRows, error: cErr },
  ] =
    await Promise.all([
      supabase
        .from('asset_type_pricing')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true),
      supabase
        .from('customer_pricing_overrides')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true),
      supabase.from('customer_pricing').select('*').eq('organization_id', organizationId),
      supabase.from('customers').select('id, CustomerListID').eq('organization_id', organizationId),
    ]);
  if (aErr) throw aErr;
  if (oErr) throw oErr;
  if (lErr) throw lErr;
  if (cErr) throw cErr;
  const legacyFlat = flattenCustomerPricingRowsToLegacyOverrides(legacyRows || []);
  const customerOverrideMap = buildCustomerOverrideMap({
    legacyPricingOverrides: legacyFlat,
    customerPricingOverrides: overrideRows || [],
    organizationId,
    customers: customerRows || [],
  });
  const assetPricingMap = buildAssetPricingMap(assetRows || []);
  const { monthly: defaultMonthly, yearly: defaultYearly } = defaultUnitRatesFromAssetPricingTable(
    assetRows || []
  );
  return {
    customerOverrideMap,
    assetPricingMap,
    defaultMonthly,
    defaultYearly,
    assetTypePricingRows: assetRows || [],
  };
}

export async function createSubscription(organizationId, customerId, planId, billingPeriod, items = []) {
  const startDate = new Date().toISOString().split('T')[0];
  const periodEnd = getPeriodEnd(startDate, billingPeriod).toISOString().split('T')[0];
  const nextBilling = getNextBillingDate(startDate, billingPeriod).toISOString().split('T')[0];

  const { data: sub, error } = await supabase
    .from('subscriptions')
    .insert({
      organization_id: organizationId,
      customer_id: customerId,
      plan_id: planId || null,
      status: 'active',
      billing_period: billingPeriod,
      start_date: startDate,
      current_period_start: startDate,
      current_period_end: periodEnd,
      next_billing_date: nextBilling,
      auto_renew: true,
    })
    .select()
    .single();

  if (error) throw error;

  if (items.length > 0) {
    const rows = items.map((it) => ({
      subscription_id: sub.id,
      organization_id: organizationId,
      product_code: it.product_code,
      category: it.category || null,
      description: it.description || null,
      quantity: it.quantity || 1,
      unit_price: it.unit_price || 0,
      status: 'active',
    }));
    const { error: itemErr } = await supabase.from('subscription_items').insert(rows);
    if (itemErr) throw itemErr;
  }

  return sub;
}

export async function modifySubscription(subscriptionId, addItems = [], removeItemIds = [], prorate = false) {
  if (removeItemIds.length > 0) {
    const { error } = await supabase
      .from('subscription_items')
      .update({ status: 'removed', removed_at: new Date().toISOString() })
      .in('id', removeItemIds);
    if (error) throw error;
  }

  if (addItems.length > 0) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('organization_id')
      .eq('id', subscriptionId)
      .single();

    const rows = addItems.map((it) => ({
      subscription_id: subscriptionId,
      organization_id: sub?.organization_id,
      product_code: it.product_code,
      category: it.category || null,
      description: it.description || null,
      quantity: it.quantity || 1,
      unit_price: it.unit_price || 0,
      status: 'active',
    }));
    const { error } = await supabase.from('subscription_items').insert(rows);
    if (error) throw error;
  }

  return { success: true };
}

export async function cancelSubscription(subscriptionId, policy = 'end_of_term') {
  const update = {
    cancelled_at: new Date().toISOString(),
    cancellation_policy: policy,
  };
  if (policy === 'immediate') {
    update.status = 'cancelled';
  }
  const { error } = await supabase
    .from('subscriptions')
    .update(update)
    .eq('id', subscriptionId);
  if (error) throw error;
  return { success: true };
}

export async function renewSubscription(subscriptionId) {
  const { data: sub, error: fetchErr } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('id', subscriptionId)
    .single();
  if (fetchErr) throw fetchErr;

  const newStart = sub.current_period_end;
  const newEnd = getPeriodEnd(newStart, sub.billing_period).toISOString().split('T')[0];
  const nextBilling = getNextBillingDate(newStart, sub.billing_period).toISOString().split('T')[0];

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      current_period_start: newStart,
      current_period_end: newEnd,
      next_billing_date: nextBilling,
      cancelled_at: null,
    })
    .eq('id', subscriptionId);
  if (error) throw error;
  return { success: true };
}

export async function generateInvoice(organizationId, subscriptionId) {
  const { data: sub, error: subErr } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('id', subscriptionId)
    .single();
  if (subErr) throw subErr;

  const customerRow = await loadCustomerRowForSubscription(sub, organizationId);
  const billingMode = customerRow?.billing_mode === 'lease' ? 'lease' : 'rental';

  const {
    customerOverrideMap,
    assetPricingMap,
    defaultMonthly,
    defaultYearly,
    assetTypePricingRows,
  } = await loadPricingMaps(organizationId);

  const { data: orgCustomers, error: custErr } = await supabase
    .from('customers')
    .select('*')
    .eq('organization_id', organizationId);
  if (custErr) throw custErr;

  const rowForPricing = { ...sub, customer: customerRow };
  const assetById = new Map((assetTypePricingRows || []).map((p) => [p.id, p]));

  let lineCalcs = [];

  if (billingMode === 'lease') {
    const { data: leaseContracts, error: lcErr } = await supabase
      .from('lease_contracts')
      .select('*')
      .eq('organization_id', organizationId);
    if (lcErr) throw lcErr;
    const contract = findActiveLeaseContract(leaseContracts || [], sub.customer_id, organizationId);
    if (!contract) {
      throw new Error(
        'No active lease contract for this customer. Add a lease contract (Customer detail → Lease) before generating an invoice.'
      );
    }
    const { data: leaseItems, error: liErr } = await supabase
      .from('lease_contract_items')
      .select('*')
      .eq('contract_id', contract.id);
    if (liErr) throw liErr;
    for (const line of leaseItems || []) {
      const lineCycle = leaseLineCycleAmount(line, sub.billing_period);
      const qtyRaw = parseInt(line.contracted_quantity, 10);
      const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 1;
      const unit = Math.round((lineCycle / qty) * 100) / 100;
      const amount = Math.round(lineCycle * 100) / 100;
      const atp = line.asset_type_id ? assetById.get(line.asset_type_id) : null;
      const productCode = (line.product_code || atp?.product_code || '').trim() || null;
      lineCalcs.push({
        subscription_item_id: null,
        lease_contract_item_id: line.id,
        product_code: productCode,
        description: atp?.description || atp?.category || line.product_code || null,
        quantity: qty,
        unit_price: unit,
        amount,
      });
    }
  } else {
    const { data: bottleRows, error: bErr } = await supabase
      .from('bottles')
      .select('*')
      .eq('organization_id', organizationId);
    if (bErr) throw bErr;
    const { data: rentalRows, error: rRentErr } = await supabase
      .from('rentals')
      .select('*')
      .eq('organization_id', organizationId)
      .is('rental_end_date', null);
    if (rRentErr) throw rRentErr;
    const groups = groupBillableUnitCountsByProductCode(
      bottleRows || [],
      rentalRows || [],
      sub.customer_id,
      customerRow,
      { allCustomers: orgCustomers || [] }
    );
    for (const { productCode, count } of groups) {
      if (count <= 0) continue;
      const unit = resolveEffectiveUnitPrice({
        row: rowForPricing,
        item: { product_code: productCode },
        customerOverrideMap,
        assetPricingMap,
        defaultMonthly,
        defaultYearly,
      });
      const amount = Math.round(unit * count * 100) / 100;
      const pricingRow = assetPricingMap.get(normalizePricingKey(productCode));
      lineCalcs.push({
        subscription_item_id: null,
        lease_contract_item_id: null,
        product_code: pricingRow?.product_code || productCode,
        description: pricingRow?.description || pricingRow?.category || null,
        quantity: count,
        unit_price: unit,
        amount,
      });
    }
  }

  const subtotalRaw = lineCalcs.reduce((s, l) => s + l.amount, 0);
  const subtotal = Math.round(subtotalRaw * 100) / 100;
  const taxRate = 0.11;
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

  const periodStart = sub.current_period_start;
  const periodEnd = sub.current_period_end;
  const dueDate = getEndOfMonth(periodEnd || new Date()).toISOString().split('T')[0];

  const { data: invoice, error: invErr } = await supabase
    .from('subscription_invoices')
    .insert({
      organization_id: organizationId,
      subscription_id: subscriptionId,
      customer_id: sub.customer_id,
      invoice_number: generateInvoiceNumber(),
      status: 'draft',
      period_start: periodStart,
      period_end: periodEnd,
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      due_date: dueDate,
    })
    .select()
    .single();
  if (invErr) throw invErr;

  const lineItems = lineCalcs.map((row) => ({
    invoice_id: invoice.id,
    subscription_item_id: row.subscription_item_id,
    lease_contract_item_id: row.lease_contract_item_id,
    product_code: row.product_code,
    description: row.description,
    quantity: row.quantity,
    unit_price: row.unit_price,
    amount: row.amount,
  }));

  if (lineItems.length > 0) {
    const { error: insertLiErr } = await supabase.from('invoice_line_items').insert(lineItems);
    if (insertLiErr) throw insertLiErr;
  }

  return invoice;
}

export async function recordPayment(invoiceId, organizationId, amount, method, reference, notes) {
  const { data: payment, error: payErr } = await supabase
    .from('payments')
    .insert({
      invoice_id: invoiceId,
      organization_id: organizationId,
      amount,
      payment_method: method || null,
      payment_date: new Date().toISOString().split('T')[0],
      reference_number: reference || null,
      notes: notes || null,
    })
    .select()
    .single();
  if (payErr) throw payErr;

  const { data: inv } = await supabase
    .from('subscription_invoices')
    .select('total_amount')
    .eq('id', invoiceId)
    .single();

  const { data: allPayments } = await supabase
    .from('payments')
    .select('amount')
    .eq('invoice_id', invoiceId);

  const totalPaid = (allPayments || []).reduce((s, p) => s + parseFloat(p.amount), 0);
  if (totalPaid >= parseFloat(inv?.total_amount || 0)) {
    await supabase
      .from('subscription_invoices')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', invoiceId);
  }

  return payment;
}

export async function getEffectivePrice(organizationId, customerId, productCode, billingPeriod) {
  const { customerOverrideMap, assetPricingMap, defaultMonthly, defaultYearly } =
    await loadPricingMaps(organizationId);
  const customer = { CustomerListID: customerId, id: customerId };
  const row = { billing_period: billingPeriod, customer_id: customerId, customer };
  const item = { product_code: productCode };
  return resolveEffectiveUnitPrice({
    row,
    item,
    customerOverrideMap,
    assetPricingMap,
    defaultMonthly,
    defaultYearly,
  });
}

// Compatibility shim for existing pages that rely on the legacy service shape.
export function clearPlansCache() {
  // No-op in the subscription rebuild; plans are fetched live.
}

export const subscriptionService = {
  async getOrganizationUsage(organizationId) {
    const [{ count: usersCount }, { count: customersCount }, { count: bottlesCount }] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
      supabase.from('bottles').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
    ]);

    return {
      users: { current: usersCount || 0 },
      customers: { current: customersCount || 0 },
      assets: { current: bottlesCount || 0 },
    };
  },
};
