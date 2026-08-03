import { supabase } from '../supabase/client';

/**
 * Single coordinated fetch for billing workspace: rentals, inventory, leases, customers.
 * Available for any page that needs this combined dataset -- pass `skip` to omit tables
 * a particular caller doesn't use instead of always fetching all 8 unbounded queries.
 * (Lease Agreements only ever used leaseAgreements/customersData/allBottles from this,
 * but every load, save, delete, renew, and export was re-running all 8 regardless --
 * a real contributor to that page feeling slow/stuck.)
 */
export async function fetchBillingWorkspaceData(organizationId, options = {}) {
  if (!organizationId) {
    throw new Error('organizationId is required');
  }
  const skip = new Set(options.skip || []);

  const [
    rentalsResult,
    bottlesResult,
    allBottlesResult,
    locationsResult,
    pricingResult,
    leaseResult,
    customersResult,
    orgClassesResult,
  ] = await Promise.all([
    skip.has('rentalsData')
      ? Promise.resolve({ data: [], error: null })
      : supabase
          .from('rentals')
          .select('*')
          .is('rental_end_date', null)
          .eq('organization_id', organizationId),
    skip.has('assignedBottles')
      ? Promise.resolve({ data: [], error: null })
      : supabase
          .from('bottles')
          .select('*, customers!assigned_customer(customer_type)')
          .eq('organization_id', organizationId)
          .not('assigned_customer', 'is', null),
    skip.has('allBottles')
      ? Promise.resolve({ data: [], error: null })
      : supabase.from('bottles').select('*').eq('organization_id', organizationId),
    skip.has('locationsData')
      ? Promise.resolve({ data: [], error: null })
      : supabase
          .from('locations')
          .select('id, name, province, total_tax_rate')
          .eq('organization_id', organizationId),
    skip.has('customerPricing')
      ? Promise.resolve({ data: [], error: null })
      : supabase.from('customer_pricing').select('*').eq('organization_id', organizationId),
    skip.has('leaseAgreements')
      ? Promise.resolve({ data: [], error: null })
      : supabase
          .from('lease_agreements')
          .select('*, bottles:bottle_id(barcode_number)')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false }),
    skip.has('customersData')
      ? Promise.resolve({ data: [], error: null })
      : supabase.from('customers').select('*').eq('organization_id', organizationId).order('name'),
    skip.has('organizationRentalClasses')
      ? Promise.resolve({ data: [], error: null })
      : supabase
          .from('organization_rental_classes')
          .select('*')
          .eq('organization_id', organizationId)
          .order('sort_order', { ascending: true })
          .order('group_name', { ascending: true }),
  ]);

  const { data: rentalsData, error: rentalsError } = rentalsResult;
  const { data: assignedBottles, error: bottlesError } = bottlesResult;
  const { data: allBottles, error: allBottlesError } = allBottlesResult;
  const { data: locationsData, error: locationsError } = locationsResult;
  const { data: customerPricing, error: pricingError } = pricingResult;
  const { data: leaseAgreements, error: leaseError } = leaseResult;
  const { data: customersData, error: customersError } = customersResult;
  const { data: organizationRentalClasses, error: orgClassesError } = orgClassesResult;

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

/** Active leases only � used when mapping yearly billing on Rentals. */
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

