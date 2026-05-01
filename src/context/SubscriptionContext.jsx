import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import { computeMRR, computeSubscriptionTotal } from '../utils/subscriptionUtils';

const SubscriptionContext = createContext(null);

const REALTIME_TABLES = [
  'subscriptions',
  'subscription_items',
  'asset_type_pricing',
  'customer_pricing_overrides',
  'subscription_invoices',
  'payments',
];

export function SubscriptionProvider({ children }) {
  const { organization } = useAuth();
  const orgId = organization?.id;
  const missingTablesRef = useRef(new Set());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [subscriptions, setSubscriptions] = useState([]);
  const [subscriptionItems, setSubscriptionItems] = useState([]);
  const [assetTypePricing, setAssetTypePricing] = useState([]);
  const [customerPricingOverrides, setCustomerPricingOverrides] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [bottles, setBottles] = useState([]);

  const mountedRef = useRef(true);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!orgId) {
      missingTablesRef.current = new Set();
      return;
    }
    const key = `subscription-missing-tables:${orgId}`;
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      missingTablesRef.current = new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      missingTablesRef.current = new Set();
    }
  }, [orgId]);

  const fetchAll = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);

    try {
      const isMissingTableError = (res) => (
        !!res?.error && (
          res.error.code === '42P01' || // Postgres undefined_table
          res.error.code === 'PGRST205' || // PostgREST "table not found"
          res.status === 404
        )
      );

      const persistMissingTables = () => {
        try {
          localStorage.setItem(
            `subscription-missing-tables:${orgId}`,
            JSON.stringify([...missingTablesRef.current])
          );
        } catch {
          // Ignore localStorage write failures.
        }
      };

      const safe = async (tableName, queryPromise, fallback = []) => {
        if (missingTablesRef.current.has(tableName)) {
          return { data: fallback, error: null };
        }

        const res = await queryPromise;
        if (isMissingTableError(res)) {
          missingTablesRef.current.add(tableName);
          persistMissingTables();
          return { data: fallback, error: null };
        }
        return res;
      };

      const [
        subsRes,
        itemsRes,
        pricingRes,
        overridesRes,
        invoicesRes,
        paymentsRes,
        custRes,
        bottlesRes,
      ] = await Promise.all([
        safe('subscriptions', supabase.from('subscriptions').select('*').eq('organization_id', orgId).order('created_at', { ascending: false })),
        safe('subscription_items', supabase.from('subscription_items').select('*').eq('organization_id', orgId)),
        safe('asset_type_pricing', supabase.from('asset_type_pricing').select('*').eq('organization_id', orgId).order('product_code')),
        safe('customer_pricing_overrides', supabase.from('customer_pricing_overrides').select('*').eq('organization_id', orgId)),
        safe('subscription_invoices', supabase.from('subscription_invoices').select('*').eq('organization_id', orgId).order('created_at', { ascending: false })),
        safe('payments', supabase.from('payments').select('*').eq('organization_id', orgId).order('payment_date', { ascending: false })),
        safe('customers', supabase.from('customers').select('*').eq('organization_id', orgId).order('name')),
        safe('bottles',
          supabase
            .from('bottles')
            // Use broad select to tolerate schema differences across org databases.
            .select('*')
            .eq('organization_id', orgId)
        ),
      ]);

      if (!mountedRef.current) return;

      for (const res of [subsRes, itemsRes, pricingRes, overridesRes, invoicesRes, paymentsRes, custRes, bottlesRes]) {
        if (res.error) throw res.error;
      }

      setSubscriptions(subsRes.data || []);
      setSubscriptionItems(itemsRes.data || []);
      setAssetTypePricing(pricingRes.data || []);
      setCustomerPricingOverrides(overridesRes.data || []);
      setInvoices(invoicesRes.data || []);
      setPayments(paymentsRes.data || []);
      setCustomers(custRes.data || []);
      setBottles((bottlesRes.data || []).map((b) => ({
        ...b,
        customer_id: b.customer_id || b.customer_uuid || b.assigned_customer || null,
      })));
    } catch (err) {
      console.error('SubscriptionContext fetch error:', err);
      if (mountedRef.current) setError(err.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    mountedRef.current = true;
    fetchAll();
    return () => { mountedRef.current = false; };
  }, [fetchAll]);

  useEffect(() => {
    if (!orgId) return;

    const channel = supabase.channel(`subscription-ctx-${orgId}`);
    const subscribeIfPresent = (table) => {
      if (missingTablesRef.current.has(table)) return;
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `organization_id=eq.${orgId}` },
        () => fetchAll()
      );
    };

    subscribeIfPresent('subscriptions');
    subscribeIfPresent('subscription_items');
    subscribeIfPresent('asset_type_pricing');
    subscribeIfPresent('customer_pricing_overrides');
    subscribeIfPresent('subscription_invoices');
    subscribeIfPresent('payments');
    subscribeIfPresent('bottles');

    channel.subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, fetchAll]);

  const activeSubscriptions = subscriptions.filter((s) => s.status === 'active');
  const mrr = computeMRR(subscriptions, subscriptionItems);
  const arr = Math.round(mrr * 12 * 100) / 100;

  const outstandingBalance = invoices
    .filter((i) => i.status !== 'paid' && i.status !== 'void')
    .reduce((s, i) => s + (parseFloat(i.total_amount) || 0), 0);

  const nextBillingDate = activeSubscriptions.reduce((earliest, sub) => {
    if (!sub.next_billing_date) return earliest;
    const d = new Date(sub.next_billing_date);
    return !earliest || d < earliest ? d : earliest;
  }, null);

  const value = {
    loading,
    error,
    subscriptions,
    subscriptionItems,
    assetTypePricing,
    customerPricingOverrides,
    invoices,
    payments,
    customers,
    bottles,
    activeSubscriptions,
    mrr,
    arr,
    outstandingBalance,
    nextBillingDate,
    refresh: fetchAll,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptions() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscriptions must be used inside SubscriptionProvider');
  return ctx;
}
