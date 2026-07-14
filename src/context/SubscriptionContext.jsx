import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import {
  buildAssetPricingMap,
  buildCustomerOverrideMap,
  flattenCustomerPricingRowsToLegacyOverrides,
  computeMRRWithResolution,
  defaultUnitRatesFromAssetPricingTable,
} from '../services/pricingResolution';
import { backfillOpenRentalsForAssignedBottles } from '../services/backfillOpenRentalsForAssignedBottles';
import { closeOrphanOpenRentalsForOrg } from '../services/closeOrphanOpenRentalsForOrg';
import { mergeQueuedFetchOptions } from '../utils/subscriptionFetchQueue';

const SubscriptionContext = createContext(null);

/** PostgREST default max rows — page so large orgs are not silently truncated. */
const PAGE_SIZE = 1000;

/**
 * Columns needed for Rentals billing / backfill / orphan close.
 * Avoid select('*') — full bottle rows are the main payload cost on this page.
 */
const BOTTLE_SELECT_NARROW =
  'id, organization_id, barcode_number, barcode, product_code, product_type, asset_type, cylinder_type, gas_type, sku, display_label, description, name, asset_name, status, asset_status, ownership, assigned_customer, customer_id, customer_uuid, customer_name, classification_node_id, rental_start_date, delivery_date, purchase_date, location, days_at_location, created_at, last_location_update';

function isUndefinedColumnError(err) {
  return !!err && (err.code === '42703' || /column .* does not exist/i.test(String(err.message || '')));
}

export function SubscriptionProvider({ children }) {
  const { organization } = useAuth();
  const orgId = organization?.id;
  const missingTablesRef = useRef(new Set());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [subscriptions, setSubscriptions] = useState([]);
  const [subscriptionItems, setSubscriptionItems] = useState([]);
  const [assetTypePricing, setAssetTypePricing] = useState([]);
  const [customerPricingRows, setCustomerPricingRows] = useState([]);
  const [customerPricingOverrides, setCustomerPricingOverrides] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [bottles, setBottles] = useState([]);
  const [openRentals, setOpenRentals] = useState([]);
  const [leaseContracts, setLeaseContracts] = useState([]);
  const [leaseContractItems, setLeaseContractItems] = useState([]);
  const [classificationNodes, setClassificationNodes] = useState([]);

  const mountedRef = useRef(true);
  const channelRef = useRef(null);
  /** Tracks the last successful (or attempted) fetch so we can throttle background refetches. */
  const lastFetchAtRef = useRef(0);
  /** True after the first successful workspace paint — Update should not blank the page. */
  const hasHydratedRef = useRef(false);
  /** Set to true while a fetch is in flight to avoid stacking concurrent refetches. */
  const fetchInFlightRef = useRef(false);
  /**
   * Follow-up fetch options when a request arrives mid-flight. Merged so an explicit
   * Update (reconcile) beats a silent realtime/tab refresh queued at the same time.
   */
  const fetchQueuedRef = useRef(null);
  /** Resolves when the in-flight fetch (and any chained queued fetch) finishes. */
  const inflightPromiseRef = useRef(null);

  useEffect(() => {
    if (!orgId) {
      missingTablesRef.current = new Set();
      hasHydratedRef.current = false;
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

  const fetchAll = useCallback(async (options = {}) => {
    const silent = options.silent === true;
    /** Backfill/orphan DB writes are expensive — skip on silent/realtime refreshes; run on full refresh & first load. */
    const reconcileRentals = options.reconcile === true || (options.reconcile !== false && !silent);
    if (!orgId) {
      if (mountedRef.current) setClassificationNodes([]);
      if (mountedRef.current && !silent) setLoading(false);
      return;
    }
    // Avoid stacking concurrent fetches; queue merged follow-up so explicit Update still reconciles.
    if (fetchInFlightRef.current && inflightPromiseRef.current) {
      fetchQueuedRef.current = mergeQueuedFetchOptions(fetchQueuedRef.current, options);
      return inflightPromiseRef.current;
    }

    const runFetch = async (fetchOptions) => {
      const runSilent = fetchOptions.silent === true;
      const runReconcile =
        fetchOptions.reconcile === true
        || (fetchOptions.reconcile !== false && !runSilent);
      fetchInFlightRef.current = true;
      if (!runSilent) {
        setError(null);
        if (!hasHydratedRef.current) setLoading(true);
      }

      try {
      const withTimeout = (promise, label, ms = 20000) =>
        Promise.race([
          promise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`${label} query timed out after ${ms}ms`)), ms)
          ),
        ]);

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

        const res = await withTimeout(queryPromise, tableName);
        if (isMissingTableError(res)) {
          missingTablesRef.current.add(tableName);
          persistMissingTables();
          return { data: fallback, error: null };
        }
        return res;
      };

      /** Page through org tables so we are not capped at PostgREST's default 1000 rows. */
      const safePaged = async (tableName, makeQuery, fallback = []) => {
        if (missingTablesRef.current.has(tableName)) {
          return { data: fallback, error: null };
        }
        const all = [];
        let from = 0;
        for (let page = 0; page < 50; page += 1) {
          const res = await withTimeout(
            makeQuery().range(from, from + PAGE_SIZE - 1),
            `${tableName}[${from}]`,
          );
          if (isMissingTableError(res)) {
            missingTablesRef.current.add(tableName);
            persistMissingTables();
            return { data: fallback, error: null };
          }
          if (res.error) return res;
          const chunk = res.data || [];
          all.push(...chunk);
          if (chunk.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }
        return { data: all, error: null };
      };

      const fetchBottles = async () => {
        let res = await safePaged(
          'bottles',
          () =>
            supabase
              .from('bottles')
              .select(BOTTLE_SELECT_NARROW)
              .eq('organization_id', orgId)
              .order('id', { ascending: true }),
        );
        if (isUndefinedColumnError(res.error)) {
          res = await safePaged(
            'bottles',
            () =>
              supabase
                .from('bottles')
                .select('*')
                .eq('organization_id', orgId)
                .order('id', { ascending: true }),
          );
        }
        return res;
      };

      const fetchOpenRentals = () =>
        safePaged(
          'rentals',
          () =>
            supabase
              .from('rentals')
              .select('*')
              .eq('organization_id', orgId)
              .is('rental_end_date', null)
              .order('id', { ascending: true }),
        );

      const fetchCustomers = () =>
        safePaged(
          'customers',
          () =>
            supabase
              .from('customers')
              .select('*')
              .eq('organization_id', orgId)
              .order('id', { ascending: true }),
        );

      const fetchClassificationNodes = async () => {
        if (missingTablesRef.current.has('asset_classification_nodes')) {
          return [];
        }
        try {
          let cr = await supabase
            .from('asset_classification_nodes')
            .select('id, organization_id, parent_id, name, sort_order, default_monthly_price, default_yearly_price')
            .eq('organization_id', orgId)
            .order('sort_order', { ascending: true })
            .order('name', { ascending: true });
          if (cr.error?.code === '42703') {
            cr = await supabase
              .from('asset_classification_nodes')
              .select('id, organization_id, parent_id, name, sort_order')
              .eq('organization_id', orgId)
              .order('sort_order', { ascending: true })
              .order('name', { ascending: true });
          }
          if (isMissingTableError(cr)) {
            missingTablesRef.current.add('asset_classification_nodes');
            persistMissingTables();
            return [];
          }
          return !cr.error && cr.data ? cr.data : [];
        } catch {
          return [];
        }
      };

      const [
        subsRes,
        itemsRes,
        pricingRes,
        legacyPricingRes,
        overridesRes,
        invoicesRes,
        paymentsRes,
        custRes,
        bottlesRes,
        rentalsRes,
        leaseRes,
        leaseItemsRes,
        classNodesList,
      ] = await Promise.all([
        safe('subscriptions', supabase.from('subscriptions').select('*').eq('organization_id', orgId).order('created_at', { ascending: false })),
        safe('subscription_items', supabase.from('subscription_items').select('*').eq('organization_id', orgId)),
        safe('asset_type_pricing', supabase.from('asset_type_pricing').select('*').eq('organization_id', orgId).order('product_code')),
        safe('customer_pricing', supabase.from('customer_pricing').select('*').eq('organization_id', orgId)),
        safe('customer_pricing_overrides', supabase.from('customer_pricing_overrides').select('*').eq('organization_id', orgId)),
        safe('subscription_invoices', supabase.from('subscription_invoices').select('*').eq('organization_id', orgId).order('created_at', { ascending: false })),
        safe('payments', supabase.from('payments').select('*').eq('organization_id', orgId).order('payment_date', { ascending: false })),
        fetchCustomers(),
        fetchBottles(),
        fetchOpenRentals(),
        safe('lease_contracts', supabase.from('lease_contracts').select('*').eq('organization_id', orgId).order('start_date', { ascending: false })),
        safe('lease_contract_items', supabase.from('lease_contract_items').select('*').eq('organization_id', orgId)),
        fetchClassificationNodes(),
      ]);

      if (!mountedRef.current) return;

      for (const res of [subsRes, itemsRes, pricingRes, legacyPricingRes, overridesRes, invoicesRes, paymentsRes, custRes, bottlesRes, rentalsRes, leaseRes, leaseItemsRes]) {
        if (res.error) throw res.error;
      }

      const bottlesList = (bottlesRes.data || []).map((b) => ({
        ...b,
        customer_id: b.customer_id || b.customer_uuid || b.assigned_customer || null,
      }));
      let openRentalsList = rentalsRes.data || [];

      // Paint the Rentals UI as soon as reads finish — do not block on backfill/orphan writes.
      if (mountedRef.current) {
        setSubscriptions(subsRes.data || []);
        setSubscriptionItems(itemsRes.data || []);
        setAssetTypePricing(pricingRes.data || []);
        setCustomerPricingRows(legacyPricingRes.data || []);
        setCustomerPricingOverrides(overridesRes.data || []);
        setInvoices(invoicesRes.data || []);
        setPayments(paymentsRes.data || []);
        setCustomers(custRes.data || []);
        setBottles(bottlesList);
        setOpenRentals(openRentalsList);
        setLeaseContracts(leaseRes.data || []);
        setLeaseContractItems(leaseItemsRes.data || []);
        setClassificationNodes(classNodesList || []);
        hasHydratedRef.current = true;
        if (!runSilent) setLoading(false);
      }

      if (runReconcile) {
        // Loop until no more inserts so Update can backfill >500 bottles in one click.
        for (let pass = 0; pass < 20; pass += 1) {
          const { inserted: backfillInserted } = await backfillOpenRentalsForAssignedBottles(
            supabase,
            orgId,
            {
              bottles: bottlesList,
              openRentals: openRentalsList,
              customers: custRes.data || [],
            },
          );
          if (backfillInserted <= 0) break;
          const refetchRentals = await fetchOpenRentals();
          if (!refetchRentals.error && refetchRentals.data) {
            openRentalsList = refetchRentals.data;
          }
          if (backfillInserted < 500) break;
        }

        const { closed: orphansClosed, errors: orphanCloseErrors } = await closeOrphanOpenRentalsForOrg(
          supabase,
          orgId,
          {
            openRentals: openRentalsList,
            bottles: bottlesList,
            customers: custRes.data || [],
            maxCloses: 500,
          },
        );
        if (orphanCloseErrors.length) {
          console.warn('closeOrphanOpenRentalsForOrg:', orphanCloseErrors.join('; '));
        }
        if (orphansClosed > 0) {
          const refetchAfterOrphans = await fetchOpenRentals();
          if (!refetchAfterOrphans.error && refetchAfterOrphans.data) {
            openRentalsList = refetchAfterOrphans.data;
          }
        }
        if (mountedRef.current) {
          setOpenRentals(openRentalsList);
        }
      }
      } catch (err) {
        console.error('SubscriptionContext fetch error:', err);
        if (mountedRef.current && !runSilent) setError(err.message);
      } finally {
        lastFetchAtRef.current = Date.now();
        fetchInFlightRef.current = false;
        if (mountedRef.current && !runSilent) setLoading(false);
      }
    };

    const chain = (async () => {
      let pending = { silent, reconcile: reconcileRentals };
      while (mountedRef.current && orgId) {
        await runFetch(pending);
        if (!fetchQueuedRef.current) break;
        pending = fetchQueuedRef.current;
        fetchQueuedRef.current = null;
      }
    })();

    inflightPromiseRef.current = chain;
    try {
      await chain;
    } finally {
      if (inflightPromiseRef.current === chain) {
        inflightPromiseRef.current = null;
      }
    }
  }, [orgId]);

  useEffect(() => {
    mountedRef.current = true;
    fetchAll();
    return () => { mountedRef.current = false; };
  }, [fetchAll]);

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;

    let debounceTimer = null;
    const scheduleSilentRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      // Keep short so Rentals reflects bottle/rental edits without a long wait;
      // silent fetches skip reconcile so this is read-only and cheaper than Update.
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        fetchAll({ silent: true });
      }, 1000);
    };

    const channel = supabase.channel(`subscription-ctx-${orgId}`);
    const subscribeIfPresent = (table) => {
      if (missingTablesRef.current.has(table)) return;
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `organization_id=eq.${orgId}` },
        scheduleSilentRefresh
      );
    };

    subscribeIfPresent('subscriptions');
    subscribeIfPresent('subscription_items');
    subscribeIfPresent('asset_type_pricing');
    subscribeIfPresent('customer_pricing');
    subscribeIfPresent('customer_pricing_overrides');
    subscribeIfPresent('subscription_invoices');
    subscribeIfPresent('payments');
    subscribeIfPresent('customers');
    subscribeIfPresent('bottles');
    subscribeIfPresent('rentals');
    subscribeIfPresent('lease_contracts');
    subscribeIfPresent('lease_contract_items');

    channel.subscribe();

    channelRef.current = channel;
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [orgId, fetchAll]);

  /**
   * Refetch when the user returns to the tab (Realtime can be off or delayed in some environments).
   * Throttled: skip if a fetch already happened recently — Realtime + the explicit refresh event
   * cover almost all updates, so blasting Supabase with 12 queries on every tab focus was the
   * single biggest cause of the "page freezes when I switch back to this tab" perception.
   */
  useEffect(() => {
    if (!orgId) return;
    let debounceTimer = null;
    /** Tab returns after edits elsewhere; 15s balances freshness vs repeating the workspace fetch too often. */
    const VISIBILITY_REFRESH_MIN_INTERVAL_MS = 15_000;
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const sinceLast = Date.now() - lastFetchAtRef.current;
      if (sinceLast < VISIBILITY_REFRESH_MIN_INTERVAL_MS) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        fetchAll({ silent: true });
      }, 400);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [orgId, fetchAll]);

  /** Allow any screen to request a silent sync without importing Supabase (detail: dispatchEvent). */
  useEffect(() => {
    if (!orgId) return;
    const onRequest = () => fetchAll({ silent: true });
    window.addEventListener('gas-cylinder-subscription-refresh', onRequest);
    return () => window.removeEventListener('gas-cylinder-subscription-refresh', onRequest);
  }, [orgId, fetchAll]);

  const activeSubscriptions = useMemo(
    () => subscriptions.filter((s) => s.status === 'active'),
    [subscriptions]
  );

  const legacyPricingOverrides = useMemo(
    () => flattenCustomerPricingRowsToLegacyOverrides(customerPricingRows),
    [customerPricingRows]
  );

  const assetPricingMap = useMemo(() => buildAssetPricingMap(assetTypePricing), [assetTypePricing]);

  const customerOverrideMap = useMemo(
    () =>
      buildCustomerOverrideMap({
        legacyPricingOverrides,
        customerPricingOverrides,
        organizationId: orgId,
        customers,
      }),
    [legacyPricingOverrides, customerPricingOverrides, orgId, customers]
  );

  const defaultRates = useMemo(
    () => defaultUnitRatesFromAssetPricingTable(assetTypePricing),
    [assetTypePricing]
  );

  const mrr = useMemo(
    () =>
      computeMRRWithResolution(
        subscriptions,
        customers,
        {
          customerOverrideMap,
          assetPricingMap,
          defaultMonthly: defaultRates.monthly,
          defaultYearly: defaultRates.yearly,
          classificationNodes,
        },
        {
          bottles,
          rentals: openRentals,
          leaseContracts,
          leaseContractItems,
          customers,
        }
      ),
    [subscriptions, customers, customerOverrideMap, assetPricingMap, defaultRates, classificationNodes, bottles, openRentals, leaseContracts, leaseContractItems]
  );

  const arr = Math.round(mrr * 12 * 100) / 100;

  const outstandingBalance = useMemo(
    () =>
      invoices
        .filter((i) => i.status !== 'paid' && i.status !== 'void')
        .reduce((s, i) => s + (parseFloat(i.total_amount) || 0), 0),
    [invoices]
  );

  const nextBillingDate = useMemo(
    () =>
      activeSubscriptions.reduce((earliest, sub) => {
        if (!sub.next_billing_date) return earliest;
        const d = new Date(sub.next_billing_date);
        return !earliest || d < earliest ? d : earliest;
      }, null),
    [activeSubscriptions]
  );

  const refresh = useCallback(() => fetchAll({ silent: false, reconcile: true }), [fetchAll]);
  const refreshSilent = useCallback(() => fetchAll({ silent: true, reconcile: false }), [fetchAll]);

  const value = useMemo(() => ({
    loading,
    error,
    subscriptions,
    subscriptionItems,
    assetTypePricing,
    customerPricingRows,
    legacyPricingOverrides,
    customerPricingOverrides,
    invoices,
    payments,
    customers,
    bottles,
    classificationNodes,
    rentals: openRentals,
    leaseContracts,
    leaseContractItems,
    activeSubscriptions,
    mrr,
    arr,
    outstandingBalance,
    nextBillingDate,
    refresh,
    refreshSilent,
  }), [
    loading, error, subscriptions, subscriptionItems, assetTypePricing,
    customerPricingRows, legacyPricingOverrides, customerPricingOverrides,
    invoices, payments, customers, bottles, classificationNodes, openRentals,
    leaseContracts, leaseContractItems, activeSubscriptions,
    mrr, arr, outstandingBalance, nextBillingDate, refresh, refreshSilent,
  ]);

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
