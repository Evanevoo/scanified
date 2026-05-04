import { supabase } from '../supabase/client';

/**
 * Single coordinated fetch for billing workspace: rentals, inventory, leases, customers.
 * Used by Rentals and Lease Agreements so both pages share the same data source.
 */
export async function fetchBillingWorkspaceData(organizationId) {
  if (!organizationId) {
    throw new Error('organizationId is required');
  }

  const [
    { data: rentalsData, error: rentalsError },
    { data: assignedBottles, error: bottlesError },
    { data: allBottles, error: allBottlesError },
    { data: locationsData, error: locationsError },
    { data: customerPricing, error: pricingError },
    { data: leaseAgreements, error: leaseError },
    { data: customersData, error: customersError },
    { data: organizationRentalClasses, error: orgClassesError },
  ] = await Promise.all([
    supabase
      .from('rentals')
      .select('*')
      .is('rental_end_date', null)
      .eq('organization_id', organizationId),
    supabase
      .from('bottles')
      .select('*, customers:assigned_customer(customer_type)')
      .eq('organization_id', organizationId)
      .not('assigned_customer', 'is', null),
    supabase.from('bottles').select('*').eq('organization_id', organizationId),
    supabase
      .from('locations')
      .select('id, name, province, total_tax_rate')
      .eq('organization_id', organizationId),
    supabase.from('customer_pricing').select('*').eq('organization_id', organizationId),
    supabase
      .from('lease_agreements')
      .select('*, bottles:bottle_id(barcode_number)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false }),
    supabase.from('customers').select('*').eq('organization_id', organizationId).order('name'),
    supabase
      .from('organization_rental_classes')
      .select('*')
      .eq('organization_id', organizationId)
      .order('sort_order', { ascending: true })
      .order('group_name', { ascending: true }),
  ]);

  if (rentalsError) throw rentalsError;
  if (bottlesError) throw bottlesError;
  if (allBottlesError) throw allBottlesError;
  if (locationsError) throw locationsError;
  if (pricingError) throw pricingError;
  if (leaseError) throw leaseError;
  if (customersError) throw customersError;
  if (orgClassesError && !/relation|does not exist/i.test(orgClassesError.message || '')) {
    throw orgClassesError;
  }

  return {
    rentalsData: rentalsData || [],
    assignedBottles: assignedBottles || [],
    allBottles: allBottles || [],
    locationsData: locationsData || [],
    customerPricing: customerPricing || [],
    leaseAgreements: leaseAgreements || [],
    customersData: customersData || [],
    organizationRentalClasses: orgClassesError ? [] : organizationRentalClasses || [],
  };
}

/** Active leases only — used when mapping yearly billing on Rentals. */
export function filterActiveLeaseAgreements(agreements) {
  return (agreements || []).filter((a) => a.status === 'active');
}

/** Stats for Lease Agreements header cards (same logic as previous fetchStats). */
export function computeLeaseAgreementStats(agreements) {
  const list = agreements || [];
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    totalAgreements: list.length,
    activeAgreements: list.filter((a) => a.status === 'active').length,
    totalAnnualValue: list.reduce((sum, a) => sum + (parseFloat(a.annual_amount) || 0), 0),
    expiringThisMonth: list.filter(
      (a) =>
        a.status === 'active' &&
        a.end_date &&
        new Date(a.end_date) >= startOfMonth &&
        new Date(a.end_date) <= endOfMonth
    ).length,
  };
}

