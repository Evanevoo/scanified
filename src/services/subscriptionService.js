import { supabase } from '../supabase/client';
import {
  generateInvoiceNumber,
  getNextBillingDate,
  getPeriodEnd,
  calculateProration,
  getEndOfMonth,
} from '../utils/subscriptionUtils';

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
    .select('*, subscription_items(*)')
    .eq('id', subscriptionId)
    .single();
  if (subErr) throw subErr;

  const activeItems = (sub.subscription_items || []).filter((i) => i.status === 'active');
  const subtotal = activeItems.reduce((s, i) => s + (parseFloat(i.unit_price) || 0) * (i.quantity || 1), 0);
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

  const lineItems = activeItems.map((item) => ({
    invoice_id: invoice.id,
    subscription_item_id: item.id,
    product_code: item.product_code,
    description: item.description,
    quantity: item.quantity,
    unit_price: parseFloat(item.unit_price) || 0,
    amount: (parseFloat(item.unit_price) || 0) * (item.quantity || 1),
  }));

  if (lineItems.length > 0) {
    const { error: liErr } = await supabase.from('invoice_line_items').insert(lineItems);
    if (liErr) throw liErr;
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
  const { data: override } = await supabase
    .from('customer_pricing_overrides')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('customer_id', customerId)
    .eq('product_code', productCode)
    .eq('is_active', true)
    .maybeSingle();

  if (override) {
    if (override.fixed_rate_override != null) return parseFloat(override.fixed_rate_override);
    const baseField = billingPeriod === 'yearly' ? 'custom_yearly_price' : 'custom_monthly_price';
    if (override[baseField] != null) return parseFloat(override[baseField]);
  }

  const { data: assetPrice } = await supabase
    .from('asset_type_pricing')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('product_code', productCode)
    .eq('is_active', true)
    .maybeSingle();

  if (assetPrice) {
    const price = billingPeriod === 'yearly'
      ? parseFloat(assetPrice.yearly_price)
      : parseFloat(assetPrice.monthly_price);

    if (override?.discount_percent > 0) {
      return Math.round(price * (1 - override.discount_percent / 100) * 100) / 100;
    }
    return price;
  }

  return 0;
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
