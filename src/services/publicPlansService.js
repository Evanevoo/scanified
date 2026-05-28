import { supabase } from '../supabase/client';

function formatLimit(value, singular, plural) {
  if (value === -1 || value === null || value === undefined) return `Unlimited ${plural}`;
  return `Up to ${value} ${value === 1 ? singular : plural}`;
}

/**
 * Map a subscription_plans row (owner portal / PlanManagement) to landing card shape.
 */
export function mapSubscriptionPlanToTier(plan) {
  const features = Array.isArray(plan.features) ? [...plan.features] : [];
  const limits = [];

  if (plan.max_users != null) limits.push(formatLimit(plan.max_users, 'user', 'users'));
  if (plan.max_customers != null) limits.push(formatLimit(plan.max_customers, 'customer', 'customers'));
  if (plan.max_cylinders != null) limits.push(formatLimit(plan.max_cylinders, 'asset', 'assets'));

  return {
    id: plan.id,
    name: plan.name,
    description: plan.description || '',
    price: Number(plan.price) || 0,
    priceInterval: plan.price_interval || 'month',
    features: limits.length > 0 ? [...limits, ...features] : features,
    highlighted: Boolean(plan.is_most_popular),
  };
}

/**
 * Active SaaS catalog plans for the marketing site (/landing#pricing).
 * Source of truth: Owner portal → Plans (`subscription_plans`).
 */
export async function fetchPublicSubscriptionPlans() {
  const select =
    'id, name, description, price, price_interval, features, is_most_popular, max_users, max_cylinders, max_customers, organization_id';

  let { data, error } = await supabase
    .from('subscription_plans')
    .select(select)
    .eq('is_active', true)
    .is('organization_id', null)
    .order('price', { ascending: true });

  if (error?.message?.includes('organization_id')) {
    ({ data, error } = await supabase
      .from('subscription_plans')
      .select(select.replace(', organization_id', ''))
      .eq('is_active', true)
      .order('price', { ascending: true }));
  }

  if (!error && (!data || data.length === 0)) {
    const fallback = await supabase
      .from('subscription_plans')
      .select(select.replace(', organization_id', ''))
      .eq('is_active', true)
      .order('price', { ascending: true });
    if (!fallback.error && fallback.data?.length) {
      data = fallback.data;
      error = null;
    }
  }

  if (error) {
    return { tiers: [], error };
  }

  return {
    tiers: (data || []).map(mapSubscriptionPlanToTier),
    error: null,
  };
}
