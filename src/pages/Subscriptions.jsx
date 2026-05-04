import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSubscriptions } from '../context/SubscriptionContext';
import { useTheme } from '../context/ThemeContext';
import { createSubscription, generateInvoice } from '../services/subscriptionService';
import { supabase } from '../supabase/client';
import jsPDF from 'jspdf';
import { formatCurrency, formatDate, STATUS_COLORS } from '../utils/subscriptionUtils';
import {
  buildAssetPricingMap,
  buildCustomerOverrideMap,
  collectNormalizedCustomerKeysForPricingRow,
  findAllProductsOverrideMultiKey,
  findBestSpecificOverrideMultiKey,
  resolveDisplayUnitFromMaps,
  defaultUnitRatesFromAssetPricingTable,
  computeSubscriptionBillingCycleTotal,
} from '../utils/rentalDisplayPricing';
import { groupAssignedBottleCountsByProductCode } from '../services/billingFromAssets';
import { findActiveLeaseContract } from '../services/leaseBilling';
import {
  Box, Typography, Card, CardContent, Grid, Tabs, Tab, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, Chip, IconButton,
  Button, TextField, InputAdornment, Tooltip, LinearProgress, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel,
  Select, MenuItem, Alert,
} from '@mui/material';
import {
  Search as SearchIcon, Add as AddIcon, Refresh as RefreshIcon,
  Visibility as ViewIcon, Edit as EditIcon, Cancel as CancelIcon, Email as EmailIcon,
  Receipt as InvoiceIcon, TrendingUp, People, Schedule, AccountBalance, Download as DownloadIcon,
} from '@mui/icons-material';

export default function Subscriptions() {
  const { organization, user, profile } = useAuth();
  const ctx = useSubscriptions();
  const { organizationColors } = useTheme();
  const primaryColor = organizationColors?.primary || '#40B5AD';
  const navigate = useNavigate();

  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newSub, setNewSub] = useState({ customer_id: '', billing_period: 'monthly' });
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [legacyRows, setLegacyRows] = useState([]);
  const [fallbackResolverCustomers, setFallbackResolverCustomers] = useState([]);
  const [invoiceTemplate, setInvoiceTemplate] = useState(null);
  const [localRatesVersion, setLocalRatesVersion] = useState(0);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [senderOptions, setSenderOptions] = useState([]);
  const [emailRow, setEmailRow] = useState(null);
  const [emailForm, setEmailForm] = useState({ to: '', from: '', subject: '', message: '' });

  const tabFilters = ['all', 'monthly', 'yearly', 'cancelled'];
  const normalize = (v) => String(v || '').trim().toLowerCase();
  const normalizeName = (v) => String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();
  const isActiveCustomer = (customer) => {
    if (!customer) return false;
    if (customer.deleted_at) return false;
    if (customer.is_deleted === true) return false;
    if (customer.is_active === false) return false;
    if (customer.archived === true) return false;
    return true;
  };

  const customerResolvers = useMemo(() => {
    const byId = new Map();
    const byName = new Map();

    const addCandidate = (candidate) => {
      if (!candidate) return;
      if (!isActiveCustomer(candidate)) return;
      const ids = [candidate.id, candidate.CustomerListID, candidate.customer_id]
        .map(normalize)
        .filter(Boolean);
      ids.forEach((id) => byId.set(id, candidate));
      const n = normalizeName(candidate.name || candidate.Name || candidate.customer_name);
      if (n) byName.set(n, candidate);
    };

    for (const c of (ctx.customers || [])) {
      addCandidate(c);
    }
    for (const c of (fallbackResolverCustomers || [])) {
      addCandidate(c);
    }

    // Fallback names from bottle assignments when customer table is incomplete.
    for (const b of (ctx.bottles || [])) {
      const id = b.assigned_customer || b.customer_id;
      const name = b.customer_name;
      if (!id && !name) continue;
      addCandidate({
        id: id || name,
        CustomerListID: id || name,
        name: name || id,
        Name: name || id,
      });
    }

    return { byId, byName };
  }, [ctx.customers, fallbackResolverCustomers, ctx.bottles]);

  const resolveCustomer = (idOrName, fallbackName = '') => {
    const idKey = normalize(idOrName);
    const nameKey = normalizeName(idOrName) || normalizeName(fallbackName);
    return customerResolvers.byId.get(idKey) || customerResolvers.byName.get(nameKey) || null;
  };

  useEffect(() => {
    let active = true;
    const loadFallbackResolverCustomers = async () => {
      if (!organization?.id) return;
      try {
        // Broad fallback query so customer names still resolve when org-scoped rows are incomplete.
        const { data } = await supabase
          .from('customers')
          .select('id, CustomerListID, name, Name, email, deleted_at, is_deleted, is_active, archived')
          .eq('organization_id', organization.id)
          .order('name');
        if (!active) return;
        setFallbackResolverCustomers((data || []).filter(isActiveCustomer));
      } catch {
        if (active) setFallbackResolverCustomers([]);
      }
    };
    loadFallbackResolverCustomers();
    return () => { active = false; };
  }, [organization?.id]);

  useEffect(() => {
    if (!organization?.id) {
      setInvoiceTemplate(null);
      return;
    }
    try {
      const savedTemplate = localStorage.getItem(`invoiceTemplate_${organization.id}`);
      setInvoiceTemplate(savedTemplate ? JSON.parse(savedTemplate) : null);
    } catch {
      setInvoiceTemplate(null);
    }
  }, [organization?.id]);

  useEffect(() => {
    const bump = () => setLocalRatesVersion((v) => v + 1);
    const onStorage = (e) => {
      if (!e?.key) return;
      if (e.key.startsWith(`customer_sku_rates:${organization?.id || ''}:`)) bump();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('rental-pricing-local-updated', bump);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('rental-pricing-local-updated', bump);
    };
  }, [organization?.id]);

  const assetPricingMap = useMemo(
    () => buildAssetPricingMap(ctx.assetTypePricing),
    [ctx.assetTypePricing]
  );

  const defaultUnitRateByPeriod = useMemo(
    () => defaultUnitRatesFromAssetPricingTable(ctx.assetTypePricing),
    [ctx.assetTypePricing]
  );

  const customerOverrideMap = useMemo(
    () =>
      buildCustomerOverrideMap({
        legacyPricingOverrides: ctx.legacyPricingOverrides,
        customerPricingOverrides: ctx.customerPricingOverrides,
        organizationId: organization?.id,
      }),
    [ctx.customerPricingOverrides, ctx.legacyPricingOverrides, organization?.id, localRatesVersion]
  );

  const resolveDisplayUnitPrice = (pricingRow, item) =>
    resolveDisplayUnitFromMaps({
      row: pricingRow,
      item,
      customerOverrideMap,
      assetPricingMap,
      defaultMonthly: defaultUnitRateByPeriod.monthly,
      defaultYearly: defaultUnitRateByPeriod.yearly,
    });

  const enriched = useMemo(() => {
    const billingData = {
      bottles: ctx.bottles || [],
      leaseContracts: ctx.leaseContracts || [],
      leaseContractItems: ctx.leaseContractItems || [],
    };
    const pricingCtx = {
      customerOverrideMap,
      assetPricingMap,
      defaultMonthly: defaultUnitRateByPeriod.monthly,
      defaultYearly: defaultUnitRateByPeriod.yearly,
    };
    return ctx.subscriptions.map((sub) => {
      const items = ctx.subscriptionItems.filter((i) => i.subscription_id === sub.id && i.status === 'active');
      const customer = resolveCustomer(sub.customer_id) || resolveCustomer(sub.customer_name || '');
      const totalPerCycle = computeSubscriptionBillingCycleTotal(sub, customer, pricingCtx, billingData);
      let itemCount = 0;
      if (customer?.billing_mode === 'lease') {
        const contract = findActiveLeaseContract(
          ctx.leaseContracts || [],
          sub.customer_id,
          organization?.id
        );
        const leaseLines = contract
          ? (ctx.leaseContractItems || []).filter((i) => i.contract_id === contract.id)
          : [];
        itemCount = leaseLines.reduce((s, i) => s + (parseInt(i.contracted_quantity, 10) || 0), 0);
      } else {
        const groups = groupAssignedBottleCountsByProductCode(ctx.bottles || [], sub.customer_id, customer);
        itemCount = groups.reduce((s, g) => s + g.count, 0);
      }
      return { ...sub, items, customer, totalPerCycle, itemCount };
    });
  }, [
    ctx.subscriptions,
    ctx.subscriptionItems,
    ctx.bottles,
    ctx.leaseContracts,
    ctx.leaseContractItems,
    customerResolvers,
    customerOverrideMap,
    assetPricingMap,
    defaultUnitRateByPeriod,
    organization?.id,
  ]);

  const customersWithBottlesNoSubscription = useMemo(() => {
    const norm = (v) => String(v || '').trim().toLowerCase();
    const normName = (v) => String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();

    const customerById = new Map();
    const customerByName = new Map();
    for (const customer of (ctx.customers || [])) {
      if (!isActiveCustomer(customer)) continue;
      const ids = [customer.id, customer.CustomerListID].map(norm).filter(Boolean);
      ids.forEach((id) => customerById.set(id, customer));
      const n = normName(customer.name || customer.Name);
      if (n) customerByName.set(n, customer);
    }
    const existingCustomerIdKeys = new Set(customerById.keys());
    const existingCustomerNameKeys = new Set(customerByName.keys());

    const groups = new Map();
    for (const bottle of (ctx.bottles || [])) {
      const assignedId = norm(bottle.assigned_customer || bottle.customer_id);
      const assignedName = normName(bottle.customer_name);
      const matchedCustomer =
        (assignedId && customerById.get(assignedId)) ||
        (assignedName && customerByName.get(assignedName)) ||
        null;

      const groupKey = matchedCustomer
        ? `customer:${matchedCustomer.id || matchedCustomer.CustomerListID || matchedCustomer.name || matchedCustomer.Name}`
        : `unmatched:${assignedId || assignedName || bottle.id}`;

      const existing = groups.get(groupKey) || {
        matchedCustomer,
        assignedId: bottle.assigned_customer || bottle.customer_id || '',
        assignedName: bottle.customer_name || '',
        bottleCount: 0,
        productCounts: {},
      };
      existing.bottleCount += 1;
      const rawProductCode = String(
        bottle.product_code
        || bottle.product_type
        || bottle.asset_type
        || bottle.cylinder_type
        || bottle.gas_type
        || bottle.sku
        || ''
      ).trim();
      if (rawProductCode) {
        existing.productCounts[rawProductCode] = (existing.productCounts[rawProductCode] || 0) + 1;
      }
      groups.set(groupKey, existing);
    }

    const subscribedCustomerKeys = new Set(
      (ctx.subscriptions || []).map((s) => norm(s.customer_id))
    );

    return Array.from(groups.entries())
      .map(([groupKey, group]) => {
        const customer = group.matchedCustomer || resolveCustomer(group.assignedId, group.assignedName);
        const assignedIdKey = norm(group.assignedId);
        const assignedNameKey = normName(group.assignedName);
        const existsInCurrentCustomers =
          (assignedIdKey && existingCustomerIdKeys.has(assignedIdKey)) ||
          (assignedNameKey && existingCustomerNameKeys.has(assignedNameKey)) ||
          !!customer;
        if (!existsInCurrentCustomers) return null;
        const customerKeys = customer
          ? [customer.id, customer.CustomerListID, customer.name, customer.Name].map(norm).filter(Boolean)
          : [norm(group.assignedId), norm(group.assignedName)].filter(Boolean);

        const alreadySubscribed = customerKeys.some((k) => subscribedCustomerKeys.has(k));
        if (alreadySubscribed) return null;

        const displayName =
          customer?.name ||
          customer?.Name ||
          group.assignedName ||
          group.assignedId ||
          'Assigned customer';
        const customerIdValue =
          customer?.CustomerListID ||
          customer?.id ||
          group.assignedId ||
          '';

        return {
          id: `virtual-${groupKey}`,
          customer: customer || { name: displayName, Name: displayName },
          customer_id: customerIdValue,
          billing_period: 'monthly',
          itemCount: group.bottleCount,
          productCounts: group.productCounts || {},
          totalPerCycle: 0,
          next_billing_date: null,
          status: 'active',
          isVirtual: true,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b.itemCount || 0) - (a.itemCount || 0));
  }, [ctx.bottles, ctx.subscriptions, ctx.customers, customerResolvers]);

  useEffect(() => {
    let active = true;
    const loadLegacyActiveRentals = async () => {
      if (!organization?.id) return;
      try {
        const { data, error } = await supabase
          .from('rentals')
          .select('id, customer_id, customer_name, bottle_id, bottle_barcode, product_code, product_type, asset_type, rental_type, rental_amount, rental_end_date, is_dns')
          .eq('organization_id', organization.id)
          .is('rental_end_date', null);
        if (error) throw error;
        if (!active) return;

        const grouped = (data || [])
          .filter((r) => !r.is_dns)
          .reduce((acc, row) => {
            const key = String(row.customer_id || row.customer_name || 'unassigned').trim();
            if (!key) return acc;
            const resolvedCustomer = resolveCustomer(row.customer_id || row.customer_name, row.customer_name);
            if (!resolvedCustomer) return acc; // hide orphaned rentals for deleted customers
            const cur = acc.get(key) || {
              key,
              customer_id: resolvedCustomer?.CustomerListID || resolvedCustomer?.id || row.customer_id || '',
              customer_name: resolvedCustomer?.name || resolvedCustomer?.Name || row.customer_name || row.customer_id || 'Assigned customer',
              customer: resolvedCustomer || null,
              itemCount: 0,
              billing_period: row.rental_type === 'yearly' ? 'yearly' : 'monthly',
              totalPerCycle: 0,
              bottleIdentifiers: [],
              bottleIds: [],
              productCounts: {},
            };
            cur.itemCount += 1;
            cur.totalPerCycle += parseFloat(row.rental_amount) || 0;
            const bottleLabel = String(row.bottle_barcode || row.bottle_id || '').trim();
            if (bottleLabel) cur.bottleIdentifiers.push(bottleLabel);
            const bottleId = String(row.bottle_id || '').trim();
            if (bottleId) cur.bottleIds.push(bottleId);
            const rentalProductCode = String(
              row.product_code
              || row.product_type
              || row.asset_type
              || ''
            ).trim();
            if (rentalProductCode) {
              cur.productCounts[rentalProductCode] = (cur.productCounts[rentalProductCode] || 0) + 1;
            }
            acc.set(key, cur);
            return acc;
          }, new Map());

        const rows = Array.from(grouped.values()).map((g) => ({
          id: `legacy-${g.key}`,
          customer: g.customer || { name: g.customer_name, Name: g.customer_name },
          customer_id: g.customer_id || g.customer_name,
          billing_period: g.billing_period,
          itemCount: g.itemCount,
          totalPerCycle: g.totalPerCycle,
          bottleIdentifiers: g.bottleIdentifiers || [],
          bottleIds: g.bottleIds || [],
          productCounts: g.productCounts || {},
          next_billing_date: null,
          status: 'active',
          isVirtual: true,
        }));

        // Also surface active lease_agreements as fallback virtual rows so imported
        // agreements are visible even before full subscriptions backfill completes.
        let leaseRows = [];
        try {
          const { data: leaseData, error: leaseErr } = await supabase
            .from('lease_agreements')
            .select('id, customer_id, customer_name, agreement_number, assets_on_agreement, max_asset_count, annual_amount, next_billing_date, end_date, status')
            .eq('organization_id', organization.id)
            .eq('status', 'active');
          if (leaseErr) throw leaseErr;

          leaseRows = (leaseData || []).map((a) => {
            const resolvedCustomer = resolveCustomer(a.customer_id || a.customer_name, a.customer_name);
            const displayName =
              resolvedCustomer?.name ||
              resolvedCustomer?.Name ||
              a.customer_name ||
              a.customer_id ||
              'Assigned customer';
            const itemCount = Number.parseInt(String(a.max_asset_count ?? ''), 10);
            const agreementCode = String(a.agreement_number || '').trim();
            const productCode = String(a.assets_on_agreement || '').trim();
            const productCounts = {};
            if (productCode) productCounts[productCode] = Number.isFinite(itemCount) && itemCount > 0 ? itemCount : 1;

            return {
              id: `lease-${a.id}`,
              customer: resolvedCustomer || { name: displayName, Name: displayName },
              customer_id: resolvedCustomer?.CustomerListID || resolvedCustomer?.id || a.customer_id || a.customer_name,
              billing_period: 'yearly',
              itemCount: Number.isFinite(itemCount) && itemCount > 0 ? itemCount : 1,
              totalPerCycle: parseFloat(a.annual_amount) || 0,
              bottleIdentifiers: [],
              bottleIds: [],
              productCounts,
              next_billing_date: a.next_billing_date || a.end_date || null,
              status: 'active',
              isVirtual: true,
              legacySource: 'lease_agreements',
              notes: agreementCode ? `Agreement ${agreementCode}` : undefined,
            };
          });
        } catch {
          leaseRows = [];
        }

        setLegacyRows([...rows, ...leaseRows]);
      } catch {
        if (active) setLegacyRows([]);
      }
    };
    loadLegacyActiveRentals();
    return () => { active = false; };
  }, [organization?.id, customerResolvers]);

  const allRows = useMemo(() => {
    const activeCustomerIdKeys = new Set(
      (ctx.customers || [])
        .filter(isActiveCustomer)
        .flatMap((c) => [c.id, c.CustomerListID])
        .map(normalize)
        .filter(Boolean)
    );
    const activeCustomerNameKeys = new Set(
      (ctx.customers || [])
        .filter(isActiveCustomer)
        .map((c) => c.name || c.Name)
        .map(normalizeName)
        .filter(Boolean)
    );

    const merged = [...enriched, ...customersWithBottlesNoSubscription];
    const existingKeys = new Set(
      merged.map((r) => String(r.customer_id || r.customer?.name || '').trim().toLowerCase()).filter(Boolean)
    );
    // Legacy rentals table: only add when this customer is not already in subscriptions/bottle rows.
    const extraLegacy = (legacyRows || []).filter((r) => {
      if (r.legacySource === 'lease_agreements') return false;
      const k = String(r.customer_id || r.customer?.name || '').trim().toLowerCase();
      return k && !existingKeys.has(k);
    });
    // Imported lease_agreements must always appear (yearly), even if the same customer already has
    // a monthly subscription or bottle-only row — otherwise the Yearly tab stays empty.
    const leaseAgreementRows = (legacyRows || []).filter((r) => r.legacySource === 'lease_agreements');
    const combined = [...merged, ...extraLegacy, ...leaseAgreementRows].filter((row) => {
      const itemCount = parseFloat(row.itemCount) || 0;
      const rawTotal = parseFloat(row.totalPerCycle) || 0;
      // Drop only rows with no quantity signal AND no cycle total (avoids empty shells).
      if (itemCount <= 0 && rawTotal <= 0) return false;

      const idKey = normalize(row.customer_id);
      const nameKey = normalizeName(row.customer?.name || row.customer?.Name || '');
      const inCustomerDirectory =
        activeCustomerIdKeys.has(idKey) || activeCustomerNameKeys.has(nameKey);

      // Lease agreements from import often reference CustomerListID; keep them visible even when
      // the ID string does not exactly match `customers` yet, as long as we have a customer key.
      const leaseImported =
        row.legacySource === 'lease_agreements' &&
        (Boolean(String(row.customer_id || '').trim()) || Boolean(nameKey));

      // Live subscription rows with a priced cycle still show if customer directory matching fails
      // (timing, ID format drift) — avoids an empty Rentals table when subscriptions exist.
      const pricedLiveSubscription =
        rawTotal > 0 &&
        !row.isVirtual &&
        Boolean(String(row.customer_id || '').trim());

      // Only render rows linked to active customers in directory — except imported leases / priced subs.
      if (!inCustomerDirectory && !leaseImported && !pricedLiveSubscription) return false;

      return true;
    });
    const legacyTotalsByCustomer = new Map(
      (legacyRows || []).map((r) => [normalize(r.customer_id || r.customer?.name), parseFloat(r.totalPerCycle) || 0])
    );
    return combined.map((row) => {
      const customerKey = normalize(row.customer_id);
      const allProductsOverride = findAllProductsOverrideMultiKey(customerOverrideMap, row);
      const period = String(row.billing_period || 'monthly').toLowerCase();
      let total = parseFloat(row.totalPerCycle) || 0;
      let effectiveProductCounts = row.productCounts && typeof row.productCounts === 'object'
        ? row.productCounts
        : null;

      // For legacy virtual rows, derive product mix from linked bottle ids first.
      if (row.isVirtual && !effectiveProductCounts) {
        const byBottleId = new Map(
          (ctx.bottles || []).map((b) => [String(b.id || '').trim(), b])
        );
        const derivedById = {};
        for (const bottleId of (row.bottleIds || [])) {
          const bottle = byBottleId.get(String(bottleId || '').trim());
          if (!bottle) continue;
          const code = String(
            bottle.product_code
            || bottle.product_type
            || bottle.asset_type
            || bottle.cylinder_type
            || bottle.gas_type
            || bottle.sku
            || ''
          ).trim();
          if (!code) continue;
          derivedById[code] = (derivedById[code] || 0) + 1;
        }
        if (Object.keys(derivedById).length > 0) {
          effectiveProductCounts = derivedById;
        }
      }

      // Secondary fallback: derive by assigned customer matching when ids are unavailable.
      if (row.isVirtual && !effectiveProductCounts) {
        const idKeys = new Set(
          [row.customer_id, row.customer?.id, row.customer?.CustomerListID]
            .map(normalize)
            .filter(Boolean)
        );
        const nameKeys = new Set(
          [row.customer?.name, row.customer?.Name]
            .map(normalizeName)
            .filter(Boolean)
        );
        const derived = {};
        for (const bottle of (ctx.bottles || [])) {
          const bottleIdKey = normalize(bottle.assigned_customer || bottle.customer_id);
          const bottleNameKey = normalizeName(bottle.customer_name);
          const matchesCustomer = (bottleIdKey && idKeys.has(bottleIdKey))
            || (bottleNameKey && nameKeys.has(bottleNameKey));
          if (!matchesCustomer) continue;
          const code = String(
            bottle.product_code
            || bottle.product_type
            || bottle.asset_type
            || bottle.cylinder_type
            || bottle.gas_type
            || bottle.sku
            || ''
          ).trim();
          if (!code) continue;
          derived[code] = (derived[code] || 0) + 1;
        }
        if (Object.keys(derived).length > 0) effectiveProductCounts = derived;
      }

      // For bottle-derived rows, compute total from product mix + customer/base pricing.
      let usedSpecificProductOverride = false;
      if (row.isVirtual && effectiveProductCounts && typeof effectiveProductCounts === 'object') {
        const rowForPricing = { ...row, billing_period: period };
        const recalculated = Object.entries(effectiveProductCounts).reduce((sum, [productCode, qtyRaw]) => {
          const qty = parseFloat(qtyRaw) || 0;
          if (qty <= 0) return sum;
          const specificOverride = findBestSpecificOverrideMultiKey(
            customerOverrideMap,
            rowForPricing,
            productCode
          );
          if (specificOverride) usedSpecificProductOverride = true;
          const unit = resolveDisplayUnitFromMaps({
            row: rowForPricing,
            item: { product_code: productCode },
            customerOverrideMap,
            assetPricingMap,
            defaultMonthly: defaultUnitRateByPeriod.monthly,
            defaultYearly: defaultUnitRateByPeriod.yearly,
          });
          return sum + unit * qty;
        }, 0);
        if (recalculated > 0) total = recalculated;
      }

      if (allProductsOverride && !usedSpecificProductOverride) {
        const unitOverride =
          allProductsOverride.fixed_rate_override != null
            ? parseFloat(allProductsOverride.fixed_rate_override)
            : period === 'yearly' && allProductsOverride.custom_yearly_price != null
              ? parseFloat(allProductsOverride.custom_yearly_price)
              : period === 'monthly' && allProductsOverride.custom_monthly_price != null
                ? parseFloat(allProductsOverride.custom_monthly_price)
                : null;

        const qty = parseFloat(row.itemCount) || 0;
        if (unitOverride != null) {
          total = (unitOverride || 0) * qty;
        } else if ((parseFloat(allProductsOverride.discount_percent) || 0) > 0 && total > 0) {
          const discount = parseFloat(allProductsOverride.discount_percent) || 0;
          total = Math.max(0, Math.round(total * (1 - discount / 100) * 100) / 100);
        }
      }

      // Final fallback: when bottle-based math cannot price a customer,
      // use grouped legacy rentals total if available.
      if ((parseFloat(total) || 0) <= 0) {
        const legacyKeys = [
          customerKey,
          ...collectNormalizedCustomerKeysForPricingRow(row),
          normalize(row.customer?.name || row.customer?.Name || ''),
        ].filter(Boolean);
        let legacyTotal = 0;
        for (const k of [...new Set(legacyKeys)]) {
          const v = legacyTotalsByCustomer.get(k) || 0;
          if (v > legacyTotal) legacyTotal = v;
        }
        if (legacyTotal > 0) total = legacyTotal;
      }

      // Absolute fallback: never leave active rows with items at $0 when no
      // resolvable pricing source exists.
      if ((parseFloat(total) || 0) <= 0) {
        const qty = parseFloat(row.itemCount) || 0;
        if (qty > 0) {
          const period = String(row.billing_period || 'monthly').toLowerCase();
          const unit = period === 'yearly' ? defaultUnitRateByPeriod.yearly : defaultUnitRateByPeriod.monthly;
          total = (Number.isFinite(unit) ? unit : 0) * qty;
        }
      }

      return { ...row, totalPerCycle: total };
    });
  }, [enriched, customersWithBottlesNoSubscription, legacyRows, customerOverrideMap, ctx.customers, ctx.bottles, assetPricingMap, defaultUnitRateByPeriod]);

  const derivedMrr = useMemo(() => {
    return allRows
      .filter((r) => r.status === 'active')
      .reduce((sum, row) => {
        const total = parseFloat(row.totalPerCycle) || 0;
        const period = String(row.billing_period || 'monthly').toLowerCase();
        if (period === 'yearly') return sum + (total / 12);
        return sum + total;
      }, 0);
  }, [allRows]);

  const derivedArr = useMemo(() => {
    return allRows
      .filter((r) => r.status === 'active')
      .reduce((sum, row) => {
        const total = parseFloat(row.totalPerCycle) || 0;
        const period = String(row.billing_period || 'monthly').toLowerCase();
        if (period === 'yearly') return sum + total;
        return sum + (total * 12);
      }, 0);
  }, [allRows]);

  const derivedNextBilling = useMemo(() => {
    const now = new Date();
    const candidateDates = allRows
      .filter((r) => r.status === 'active')
      .map((r) => {
        if (r.next_billing_date) {
          const d = new Date(r.next_billing_date);
          return Number.isNaN(d.getTime()) ? null : d;
        }
        // Fallback: if no explicit cycle date, use end-of-current-month.
        return new Date(now.getFullYear(), now.getMonth() + 1, 0);
      })
      .filter(Boolean)
      .sort((a, b) => a.getTime() - b.getTime());
    return candidateDates[0] || null;
  }, [allRows]);
  const activeRentalCount = useMemo(() => {
    return allRows.filter((r) => r.status === 'active').length;
  }, [allRows]);
  const activeRentalAssetCount = useMemo(() => {
    return allRows
      .filter((r) => r.status === 'active')
      .reduce((sum, r) => sum + (parseFloat(r.itemCount) || 0), 0);
  }, [allRows]);

  const filtered = useMemo(() => {
    let list = allRows;
    const filter = tabFilters[tab];
    if (filter === 'monthly') list = list.filter((s) => String(s.billing_period || '').toLowerCase() === 'monthly' && s.status === 'active');
    else if (filter === 'yearly') list = list.filter((s) => String(s.billing_period || '').toLowerCase() === 'yearly' && s.status === 'active');
    else if (filter === 'cancelled') list = list.filter((s) => s.status === 'cancelled');

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) => {
        const name = s.customer?.name || s.customer?.Name || s.customer_id || '';
        return name.toLowerCase().includes(q) || String(s.billing_period || '').includes(q);
      });
    }
    return list;
  }, [allRows, tab, search]);

  const handleCreate = async () => {
    if (!newSub.customer_id) return;
    setSaving(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await createSubscription(organization.id, newSub.customer_id, null, newSub.billing_period, []);
      setCreateOpen(false);
      setNewSub({ customer_id: '', billing_period: 'monthly' });
      setActionSuccess('Rental created.');
      ctx.refresh();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateAllInvoices = async () => {
    setSaving(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const activeSubs = ctx.activeSubscriptions || [];
      let subscriptionCreated = 0;
      for (const sub of activeSubs) {
        await generateInvoice(organization.id, sub.id);
        subscriptionCreated += 1;
      }

      const subscriptionCustomerIds = new Set(
        (activeSubs || []).map((s) => String(s.customer_id || '').trim()).filter(Boolean)
      );

      // Legacy `invoices` rows for virtual rentals / lease_agreements (not subscription_invoices).
      const invoiceableVirtualRows = (allRows || []).filter((row) => (
        row.status === 'active' &&
        row.isVirtual &&
        (parseFloat(row.totalPerCycle) || 0) > 0 &&
        String(row.customer_id || '').trim()
      ));

      const legacyCandidates = invoiceableVirtualRows.filter((row) => {
        const cid = String(row.customer_id || '').trim();
        return !subscriptionCustomerIds.has(cid);
      });

      const bestByCustomer = new Map();
      for (const row of legacyCandidates) {
        const cid = String(row.customer_id || '').trim();
        const prev = bestByCustomer.get(cid);
        const total = parseFloat(row.totalPerCycle) || 0;
        if (!prev || total > (parseFloat(prev.totalPerCycle) || 0)) {
          bestByCustomer.set(cid, row);
        }
      }
      const dedupedInvoiceableRows = [...bestByCustomer.values()];

      let legacyCreated = 0;
      if (dedupedInvoiceableRows.length > 0) {
        const { data: existingInvs } = await supabase
          .from('invoices')
          .select('invoice_number')
          .eq('organization_id', organization.id);
        let maxNum = 0;
        for (const inv of existingInvs || []) {
          const n = String(inv.invoice_number || '').match(/(\d+)/)?.[1];
          if (!n) continue;
          maxNum = Math.max(maxNum, parseInt(n, 10) || 0);
        }

        const today = new Date();
        const invoiceDate = today.toISOString().split('T')[0];
        const dueDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
        const periodStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const periodEnd = dueDate;

        const customerIds = [...new Set(dedupedInvoiceableRows.map((r) => String(r.customer_id || '').trim()).filter(Boolean))];
        const { data: existingSamePeriod } = await supabase
          .from('invoices')
          .select('customer_id')
          .eq('organization_id', organization.id)
          .eq('period_start', periodStart)
          .eq('period_end', periodEnd)
          .in('customer_id', customerIds);
        const alreadyInvoicedIds = new Set((existingSamePeriod || []).map((r) => String(r.customer_id || '').trim()));
        const filteredInvoiceableRows = dedupedInvoiceableRows.filter(
          (row) => !alreadyInvoicedIds.has(String(row.customer_id || '').trim())
        );

        if (filteredInvoiceableRows.length > 0) {
          const rowsToInsert = filteredInvoiceableRows.map((row, idx) => ({
            organization_id: organization.id,
            invoice_number: formatLegacyInvoiceNumber(maxNum + idx + 1),
            customer_id: row.customer_id,
            customer_name: row.customer?.name || row.customer?.Name || row.customer_id,
            period_start: periodStart,
            period_end: periodEnd,
            invoice_date: invoiceDate,
            due_date: dueDate,
            subtotal: parseFloat(row.totalPerCycle) || 0,
            tax_amount: 0,
            total_amount: parseFloat(row.totalPerCycle) || 0,
            status: 'pending',
          }));

          const { error: insErr } = await supabase.from('invoices').insert(rowsToInsert);
          if (insErr) throw insErr;
          legacyCreated = rowsToInsert.length;
        }
      }

      const exported = downloadInvoiceCsv((allRows || []).filter((r) => r.status === 'active' && (parseFloat(r.itemCount) || 0) > 0));

      if (subscriptionCreated === 0 && legacyCreated === 0) {
        setActionSuccess('No active rentals to invoice right now.');
        ctx.refresh();
        return;
      }

      const parts = [];
      if (subscriptionCreated > 0) {
        parts.push(`Generated ${subscriptionCreated} subscription invoice${subscriptionCreated === 1 ? '' : 's'}`);
      }
      if (legacyCreated > 0) {
        parts.push(`created ${legacyCreated} invoice${legacyCreated === 1 ? '' : 's'} from rentals and lease agreements`);
      }
      if (exported > 0) {
        parts.push(`downloaded ${exported} CSV row${exported === 1 ? '' : 's'}`);
      }
      setActionSuccess(`${parts.join('; ')}.`);
      ctx.refresh();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const downloadInvoiceCsv = (activeRows, options = {}) => {
    const filePrefix = options.filePrefix || 'quickbooks_invoices';
    if (!activeRows || activeRows.length === 0) return 0;
    const state = JSON.parse(localStorage.getItem('invoice_state') || '{}');
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const startNumber = (state.lastMonth === currentMonth && state.lastNumber)
      ? state.lastNumber + 1
      : 10000;

    const invoiceDate = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 10);
    const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

    const rows = activeRows.map((row, idx) => {
      const subtotal = parseFloat(row.totalPerCycle) || 0;
      const tax = +(subtotal * 0.11).toFixed(2);
      const total = +(subtotal + tax).toFixed(2);
      return {
        'Invoice#': `W${String(startNumber + idx).padStart(5, '0')}`,
        'Customer Number': row.customer_id || '',
        'Total': total,
        'Date': invoiceDate,
        'TX': tax,
        'TX code': 'G',
        'Due date': dueDate,
        'Rate': subtotal,
        'Name': row.customer?.name || row.customer?.Name || row.customer_id || '',
        '# of Bottles': parseFloat(row.itemCount) || 0,
      };
    });

    localStorage.setItem('invoice_state', JSON.stringify({
      lastNumber: startNumber + rows.length - 1,
      lastMonth: currentMonth,
    }));

    const header = Object.keys(rows[0]).join(',');
    const csv = [header, ...rows.map((r) => Object.values(r).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filePrefix}_${invoiceDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    return rows.length;
  };

  const getActiveExportRows = () => (allRows || []).filter((row) => (
    row.status === 'active' &&
    (parseFloat(row.itemCount) || 0) > 0
  ));

  const handleExportQbInvoiceCsv = (period) => {
    setActionError(null);
    setActionSuccess(null);
    const base = getActiveExportRows();
    const rows = base.filter((r) => String(r.billing_period || 'monthly').toLowerCase() === period);
    if (rows.length === 0) {
      setActionError(`No active ${period} rentals to export to QuickBooks CSV.`);
      return;
    }
    const exported = downloadInvoiceCsv(rows, { filePrefix: `quickbooks_invoices_${period}` });
    setActionSuccess(`Exported ${exported} QuickBooks CSV row${exported === 1 ? '' : 's'} (${period}).`);
  };

  const getNextLegacyInvoiceNumber = async () => {
    const { data: existingInvs } = await supabase
      .from('invoices')
      .select('invoice_number')
      .eq('organization_id', organization.id);
    let maxNum = 0;
    for (const inv of existingInvs || []) {
      const n = String(inv.invoice_number || '').match(/(\d{1,})/)?.[1];
      if (!n) continue;
      maxNum = Math.max(maxNum, (parseInt(n, 10) || 0) % 100000);
    }
    return (maxNum + 1) % 100000;
  };

  const formatLegacyInvoiceNumber = (n) => `W${String((n || 0) % 100000).padStart(5, '0')}`;

  const handleGenerateInvoiceForRow = async (sub) => {
    setSaving(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const total = parseFloat(sub.totalPerCycle) || 0;
      if (total <= 0) {
        setActionError('Cannot generate invoice for a $0.00 rental.');
        return;
      }
      if (!sub.customer_id) {
        setActionError('No customer ID available for this rental.');
        return;
      }

      if (!sub.isVirtual) {
        await generateInvoice(organization.id, sub.id);
      } else {
        const nextNum = await getNextLegacyInvoiceNumber();
        const today = new Date();
        const invoiceDate = today.toISOString().split('T')[0];
        const dueDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
        const periodStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const periodEnd = dueDate;
        const { data: existingSamePeriod } = await supabase
          .from('invoices')
          .select('id')
          .eq('organization_id', organization.id)
          .eq('customer_id', sub.customer_id)
          .eq('period_start', periodStart)
          .eq('period_end', periodEnd)
          .limit(1);
        if ((existingSamePeriod || []).length > 0) {
          setActionError('An invoice for this customer and period already exists.');
          return;
        }
        const payload = {
          organization_id: organization.id,
          invoice_number: formatLegacyInvoiceNumber(nextNum),
          customer_id: sub.customer_id,
          customer_name: sub.customer?.name || sub.customer?.Name || sub.customer_id,
          period_start: periodStart,
          period_end: periodEnd,
          invoice_date: invoiceDate,
          due_date: dueDate,
          subtotal: total,
          tax_amount: 0,
          total_amount: total,
          status: 'pending',
        };
        const { error } = await supabase.from('invoices').insert(payload);
        if (error) throw error;
      }
      const exported = downloadInvoiceCsv([sub]);
      setActionSuccess(`Invoice generated for ${sub.customer?.name || sub.customer?.Name || sub.customer_id}${exported > 0 ? ' and CSV downloaded' : ''}.`);
      ctx.refresh();
    } catch (err) {
      setActionError(err.message || 'Failed to generate invoice.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadInvoicePdfForRow = (sub) => {
    const norm = (v) => String(v || '').trim().toLowerCase();
    const normName = (v) => String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();
    const getCustomerDisplayName = (row) => (
      row?.customer?.name
      || row?.customer?.Name
      || row?.customer_name
      || row?.customer_id
      || 'Customer'
    );
    const getCustomerEmail = (row) => (
      row?.customer?.email
      || row?.customer?.Email
      || row?.customer?.email_address
      || row?.customer?.emailAddress
      || row?.customer?.primary_email
      || ''
    );
    const getCustomerBottlesForRow = (row) => {
      if (Array.isArray(row?.bottleIdentifiers) && row.bottleIdentifiers.length > 0) {
        return row.bottleIdentifiers.map((label, idx) => ({ id: `legacy-${idx}`, display_label: label }));
      }
      const idKeys = new Set([
        norm(row?.customer_id),
        norm(row?.customer?.id),
        norm(row?.customer?.CustomerListID),
      ].filter(Boolean));
      const nameKeys = new Set([
        normName(row?.customer?.name),
        normName(row?.customer?.Name),
        normName(row?.customer_name),
      ].filter(Boolean));
      return (ctx.bottles || []).filter((b) => {
        const bottleIdKey = norm(b.assigned_customer || b.customer_id);
        const bottleNameKey = normName(b.customer_name);
        if (bottleIdKey && idKeys.has(bottleIdKey)) return true;
        if (bottleNameKey && nameKeys.has(bottleNameKey)) return true;
        return false;
      });
    };
    const getLineItemsForRow = (row) => {
      if (Array.isArray(row?.items) && row.items.length > 0) {
        return row.items.map((item) => {
          const qty = parseFloat(item.quantity) || 1;
          const unit = resolveDisplayUnitPrice(row, item);
          return {
            description: item.description || item.product_code || 'Rental item',
            qty,
            unit,
            amount: unit * qty,
          };
        });
      }
      if (row?.productCounts && Object.keys(row.productCounts).length > 0) {
        const periodFallback = row.billing_period === 'yearly'
          ? defaultUnitRateByPeriod.yearly
          : defaultUnitRateByPeriod.monthly;
        return Object.entries(row.productCounts).map(([code, qtyRaw]) => {
          const qty = parseFloat(qtyRaw) || 0;
          const unitRaw = resolveDisplayUnitPrice(row, {
            product_code: code,
            description: code || 'Asset',
          });
          const unit =
            Number.isFinite(unitRaw) && unitRaw > 0 ? unitRaw : periodFallback;
          return {
            description: code || 'Asset',
            qty,
            unit,
            amount: unit * qty,
          };
        });
      }
      const qty = parseFloat(row?.itemCount) || 1;
      const amount = parseFloat(row?.totalPerCycle) || 0;
      return [{
        description: `Rental charges (${String(row?.billing_period || 'monthly')})`,
        qty,
        unit: qty > 0 ? amount / qty : amount,
        amount,
      }];
    };
    const rgbFromHex = (hex, fallback) => {
      const raw = String(hex || '').trim().replace('#', '');
      const full = raw.length === 3 ? raw.split('').map((c) => `${c}${c}`).join('') : raw;
      if (!/^[0-9a-fA-F]{6}$/.test(full)) return fallback;
      return [
        parseInt(full.slice(0, 2), 16),
        parseInt(full.slice(2, 4), 16),
        parseInt(full.slice(4, 6), 16),
      ];
    };
    const wrapText = (doc, text, x, y, maxWidth, lineHeight = 5) => {
      const lines = doc.splitTextToSize(String(text || ''), maxWidth);
      lines.forEach((line, idx) => doc.text(line, x, y + (idx * lineHeight)));
      return y + (lines.length * lineHeight);
    };
    const fetchImageAsDataUrl = async (url) => {
      if (!url) return null;
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const blob = await res.blob();
        return await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
      } catch {
        return null;
      }
    };
    const createInvoicePdfDocForRow = async (row) => {
      const lineItems = getLineItemsForRow(row);
      const hasDetail =
        (Array.isArray(row?.items) && row.items.length > 0) ||
        (row?.productCounts && Object.keys(row.productCounts || {}).length > 0);
      const lineSum = lineItems.reduce((s, li) => s + (Number(li.amount) || 0), 0);
      const total =
        hasDetail && lineSum > 0 ? lineSum : (parseFloat(row.totalPerCycle) || 0);
      const today = new Date();
      const invoiceDate = today.toISOString().split('T')[0];
      const dueDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
      const periodStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const periodEnd = dueDate;
      const customerName = getCustomerDisplayName(row);
      const customerEmail = getCustomerEmail(row);
      const itemCount = parseFloat(row.itemCount) || 0;
      const tax = +(total * 0.11).toFixed(2);
      const grandTotal = +(total + tax).toFixed(2);
      const template = invoiceTemplate || {};
      const templateName = String(template.name || 'Standard');
      const primary = template.primary_color || primaryColor || '#40B5AD';
      const secondary = template.secondary_color || '#64748B';
      const fontFamily = template.font_family || 'helvetica';
      const primaryRgb = rgbFromHex(primary, [64, 181, 173]);
      const secondaryRgb = rgbFromHex(secondary, [100, 116, 139]);
      const bottles = getCustomerBottlesForRow(row);
      const logoUrl = template.logo_url || organization?.logo_url || organization?.app_icon_url || '';
      const logoDataUrl = await fetchImageAsDataUrl(logoUrl);

      const doc = new jsPDF();
      doc.setFont(fontFamily, 'normal');
      doc.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
      doc.rect(0, 0, 210, 30, 'F');

      if (logoDataUrl) {
        try {
          doc.addImage(logoDataUrl, 'PNG', 14, 6, 16, 16);
        } catch {
          // Ignore bad image formats and continue rendering.
        }
      }
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(20);
      doc.text('INVOICE', logoDataUrl ? 34 : 14, 18);
      doc.setFontSize(10);
      doc.text(organization?.name || '', logoDataUrl ? 34 : 14, 24);

      doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
      doc.setFontSize(11);
      doc.text(`Invoice Date: ${invoiceDate}`, 196, 14, { align: 'right' });
      doc.text(`Due Date: ${dueDate}`, 196, 20, { align: 'right' });
      doc.text(`Billing: ${String(row.billing_period || 'monthly')}`, 196, 26, { align: 'right' });

      doc.setTextColor(40, 40, 40);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(11);
      doc.text('Bill To', 14, 40);
      doc.setFont(undefined, 'normal');
      doc.text(customerName, 14, 46);
      if (row.customer_id) doc.text(`Customer ID: ${row.customer_id}`, 14, 52);
      if (customerEmail) doc.text(`Email: ${customerEmail}`, 14, 58);

      doc.setDrawColor(220, 220, 220);
      doc.rect(124, 36, 72, 22);
      doc.setTextColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);
      doc.setFontSize(9);
      doc.text('Service Period', 128, 42);
      doc.setTextColor(40, 40, 40);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(10);
      doc.text(`${periodStart} to ${periodEnd}`, 128, 48);
      doc.setFont(undefined, 'normal');
      doc.text(`Assets: ${itemCount}`, 128, 54);
      doc.setTextColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);
      doc.setFontSize(8);
      doc.text(`Template: ${templateName}`, 128, 56.5);

      let y = 68;
      doc.setTextColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);
      doc.setFontSize(10);
      doc.text('Description', 14, y);
      doc.text('Qty', 128, y);
      doc.text('Unit', 156, y);
      doc.text('Amount', 196, y, { align: 'right' });
      doc.setDrawColor(230, 230, 230);
      doc.line(14, y + 2, 196, y + 2);
      y += 8;

      doc.setTextColor(40, 40, 40);
      doc.setFontSize(9);
      lineItems.forEach((line) => {
        doc.text(String(line.description || ''), 14, y);
        doc.text(String(line.qty || 0), 128, y);
        doc.text(formatCurrency(line.unit || 0), 156, y);
        doc.text(formatCurrency(line.amount || 0), 196, y, { align: 'right' });
        y += 6;
      });

      y += 2;
      doc.setDrawColor(220, 220, 220);
      doc.line(120, y, 196, y);
      y += 7;
      doc.text('Subtotal', 146, y);
      doc.text(formatCurrency(total), 196, y, { align: 'right' });
      y += 6;
      doc.text('Tax (11%)', 146, y);
      doc.text(formatCurrency(tax), 196, y, { align: 'right' });
      y += 6;
      doc.setDrawColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
      doc.line(140, y, 196, y);
      y += 7;
      doc.setFont(undefined, 'bold');
      doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
      doc.text('Total', 146, y);
      doc.text(formatCurrency(grandTotal), 196, y, { align: 'right' });
      doc.setFont(undefined, 'normal');

      y += 12;
      if (bottles.length > 0) {
        const labels = bottles.slice(0, 120).map((b) => {
          if (b.display_label) return String(b.display_label);
          const readable = (
            b.barcode_number
            || b.barcode
            || b.bottle_barcode
            || b.asset_tag
            || b.serial_number
            || b.cylinder_number
            || b.tag
            || ''
          );
          return readable ? String(readable) : null;
        }).filter(Boolean);
        if (labels.length === 0) return;
        doc.setTextColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);
        doc.setFontSize(10);
        doc.text(`Bottle List (${labels.length})`, 14, y);
        y += 6;
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(8);
        const bottleText = labels.join(', ');
        y = wrapText(doc, bottleText || 'No bottle identifiers available.', 14, y, 182, 4);
        if (bottles.length > 120) {
          y += 3;
          doc.setTextColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);
          doc.text(`+ ${bottles.length - 120} more`, 14, y);
        }
      }

      const safeName = String(customerName).replace(/[^\w\-]+/g, '_');
      const fileName = `Invoice_${safeName}_${invoiceDate}.pdf`;
      return { doc, fileName, customerName, customerEmail };
    };
    try {
      const total = parseFloat(sub.totalPerCycle) || 0;
      if (total <= 0) {
        setActionError('Cannot download a $0.00 invoice PDF.');
        return;
      }
      createInvoicePdfDocForRow(sub).then(({ doc, fileName, customerName }) => {
        doc.save(fileName);
        setActionSuccess(`Invoice PDF downloaded for ${customerName}.`);
      }).catch((err) => {
        setActionError(err.message || 'Failed to generate invoice PDF.');
      });
    } catch (err) {
      setActionError(err.message || 'Failed to generate invoice PDF.');
    }
  };

  const openEmailDialogForRow = async (sub) => {
    setActionError(null);
    setActionSuccess(null);
    try {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('invoice_emails, default_invoice_email, email')
        .eq('id', organization.id)
        .single();

      const emails = new Set();
      (orgData?.invoice_emails || []).forEach((e) => e && emails.add(e));
      if (orgData?.email) emails.add(orgData.email);
      if (user?.email) emails.add(user.email);
      if (profile?.email) emails.add(profile.email);

      const options = Array.from(emails);
      const defaultFrom = orgData?.default_invoice_email || options[0] || '';
      let customerEmail = (
        sub?.customer?.email
        || sub?.customer?.Email
        || sub?.customer?.email_address
        || sub?.customer?.emailAddress
        || sub?.customer?.primary_email
        || ''
      );
      const cid = String(sub?.customer_id || '').trim();
      if (!customerEmail && cid && organization?.id) {
        const { data: byList } = await supabase
          .from('customers')
          .select('email')
          .eq('organization_id', organization.id)
          .eq('CustomerListID', cid)
          .maybeSingle();
        customerEmail = (byList?.email && String(byList.email).trim()) || customerEmail;
        if (!customerEmail) {
          const { data: byId } = await supabase
            .from('customers')
            .select('email')
            .eq('organization_id', organization.id)
            .eq('id', cid)
            .maybeSingle();
          customerEmail = (byId?.email && String(byId.email).trim()) || customerEmail;
        }
      }
      const customerName = sub?.customer?.name || sub?.customer?.Name || sub?.customer_id || 'Customer';

      setSenderOptions(options);
      setEmailRow(sub);
      setEmailForm({
        to: customerEmail,
        from: defaultFrom,
        subject: `Invoice for ${customerName} from ${organization?.name || 'your organization'}`,
        message: `Hello ${customerName},\n\nPlease find your invoice attached.\n\nThank you.`,
      });
      setEmailOpen(true);
    } catch (err) {
      setActionError(err.message || 'Unable to open email dialog.');
    }
  };

  const handleSendInvoiceEmail = async () => {
    if (!emailRow) return;
    if (!emailForm.to || !emailForm.from) {
      setActionError('Recipient and sender email are required.');
      return;
    }
    const total = parseFloat(emailRow.totalPerCycle) || 0;
    if (total <= 0) {
      setActionError('Cannot email a $0.00 invoice.');
      return;
    }
    setEmailing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const norm = (v) => String(v || '').trim().toLowerCase();
      const normName = (v) => String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();
      const getCustomerDisplayName = (row) => (
        row?.customer?.name
        || row?.customer?.Name
        || row?.customer_name
        || row?.customer_id
        || 'Customer'
      );
      const rgbFromHex = (hex, fallback) => {
        const raw = String(hex || '').trim().replace('#', '');
        const full = raw.length === 3 ? raw.split('').map((c) => `${c}${c}`).join('') : raw;
        if (!/^[0-9a-fA-F]{6}$/.test(full)) return fallback;
        return [
          parseInt(full.slice(0, 2), 16),
          parseInt(full.slice(2, 4), 16),
          parseInt(full.slice(4, 6), 16),
        ];
      };
      const wrapText = (doc, text, x, y, maxWidth, lineHeight = 5) => {
        const lines = doc.splitTextToSize(String(text || ''), maxWidth);
        lines.forEach((line, idx) => doc.text(line, x, y + (idx * lineHeight)));
        return y + (lines.length * lineHeight);
      };
      const fetchImageAsDataUrl = async (url) => {
        if (!url) return null;
        try {
          const res = await fetch(url);
          if (!res.ok) return null;
          const blob = await res.blob();
          return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
        } catch {
          return null;
        }
      };
      const getCustomerBottlesForRow = (row) => {
        if (Array.isArray(row?.bottleIdentifiers) && row.bottleIdentifiers.length > 0) {
          return row.bottleIdentifiers.map((label, idx) => ({ id: `legacy-${idx}`, display_label: label }));
        }
        const idKeys = new Set([
          norm(row?.customer_id),
          norm(row?.customer?.id),
          norm(row?.customer?.CustomerListID),
        ].filter(Boolean));
        const nameKeys = new Set([
          normName(row?.customer?.name),
          normName(row?.customer?.Name),
          normName(row?.customer_name),
        ].filter(Boolean));
        return (ctx.bottles || []).filter((b) => {
          const bottleIdKey = norm(b.assigned_customer || b.customer_id);
          const bottleNameKey = normName(b.customer_name);
          if (bottleIdKey && idKeys.has(bottleIdKey)) return true;
          if (bottleNameKey && nameKeys.has(bottleNameKey)) return true;
          return false;
        });
      };
      const getLineItemsForRow = (row) => {
        if (Array.isArray(row?.items) && row.items.length > 0) {
          return row.items.map((item) => {
            const qty = parseFloat(item.quantity) || 1;
            const unit = resolveDisplayUnitPrice(row, item);
            return { description: item.description || item.product_code || 'Rental item', qty, unit, amount: unit * qty };
          });
        }
        if (row?.productCounts && Object.keys(row.productCounts).length > 0) {
          const periodFallback = row.billing_period === 'yearly'
            ? defaultUnitRateByPeriod.yearly
            : defaultUnitRateByPeriod.monthly;
          return Object.entries(row.productCounts).map(([code, qtyRaw]) => {
            const qty = parseFloat(qtyRaw) || 0;
            const unitRaw = resolveDisplayUnitPrice(row, {
              product_code: code,
              description: code || 'Asset',
            });
            const unit =
              Number.isFinite(unitRaw) && unitRaw > 0 ? unitRaw : periodFallback;
            return { description: code || 'Asset', qty, unit, amount: unit * qty };
          });
        }
        const qty = parseFloat(row?.itemCount) || 1;
        const amount = parseFloat(row?.totalPerCycle) || 0;
        return [{ description: `Rental charges (${String(row?.billing_period || 'monthly')})`, qty, unit: qty > 0 ? amount / qty : amount, amount }];
      };
      const createInvoicePdfDocForRow = async (row) => {
        const lineItems = getLineItemsForRow(row);
        const hasDetail =
          (Array.isArray(row?.items) && row.items.length > 0) ||
          (row?.productCounts && Object.keys(row.productCounts || {}).length > 0);
        const lineSum = lineItems.reduce((s, li) => s + (Number(li.amount) || 0), 0);
        const total =
          hasDetail && lineSum > 0 ? lineSum : (parseFloat(row.totalPerCycle) || 0);
        const today = new Date();
        const invoiceDate = today.toISOString().split('T')[0];
        const dueDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
        const periodStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const periodEnd = dueDate;
        const customerName = getCustomerDisplayName(row);
        const customerEmail = (
          row?.customer?.email
          || row?.customer?.Email
          || row?.customer?.email_address
          || row?.customer?.emailAddress
          || row?.customer?.primary_email
          || ''
        );
        const itemCount = parseFloat(row.itemCount) || 0;
        const tax = +(total * 0.11).toFixed(2);
        const grandTotal = +(total + tax).toFixed(2);
        const template = invoiceTemplate || {};
        const templateName = String(template.name || 'Standard');
        const primary = template.primary_color || primaryColor || '#40B5AD';
        const secondary = template.secondary_color || '#64748B';
        const fontFamily = template.font_family || 'helvetica';
        const primaryRgb = rgbFromHex(primary, [64, 181, 173]);
        const secondaryRgb = rgbFromHex(secondary, [100, 116, 139]);
        const bottles = getCustomerBottlesForRow(row);
        const logoUrl = template.logo_url || organization?.logo_url || organization?.app_icon_url || '';
        const logoDataUrl = await fetchImageAsDataUrl(logoUrl);

        const doc = new jsPDF();
        doc.setFont(fontFamily, 'normal');
        doc.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
        doc.rect(0, 0, 210, 30, 'F');

        if (logoDataUrl) {
          try {
            doc.addImage(logoDataUrl, 'PNG', 14, 6, 16, 16);
          } catch {
            // Ignore bad image formats and continue rendering.
          }
        }
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(20);
        doc.text('INVOICE', logoDataUrl ? 34 : 14, 18);
        doc.setFontSize(10);
        doc.text(organization?.name || '', logoDataUrl ? 34 : 14, 24);

        doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
        doc.setFontSize(11);
        doc.text(`Invoice Date: ${invoiceDate}`, 196, 14, { align: 'right' });
        doc.text(`Due Date: ${dueDate}`, 196, 20, { align: 'right' });
        doc.text(`Billing: ${String(row.billing_period || 'monthly')}`, 196, 26, { align: 'right' });

        doc.setTextColor(40, 40, 40);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(11);
        doc.text('Bill To', 14, 40);
        doc.setFont(undefined, 'normal');
        doc.text(customerName, 14, 46);
        if (row.customer_id) doc.text(`Customer ID: ${row.customer_id}`, 14, 52);
        if (customerEmail) doc.text(`Email: ${customerEmail}`, 14, 58);

        doc.setDrawColor(220, 220, 220);
        doc.rect(124, 36, 72, 22);
        doc.setTextColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);
        doc.setFontSize(9);
        doc.text('Service Period', 128, 42);
        doc.setTextColor(40, 40, 40);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(10);
        doc.text(`${periodStart} to ${periodEnd}`, 128, 48);
        doc.setFont(undefined, 'normal');
        doc.text(`Assets: ${itemCount}`, 128, 54);
        doc.setTextColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);
        doc.setFontSize(8);
        doc.text(`Template: ${templateName}`, 128, 56.5);

        let y = 68;
        doc.setTextColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);
        doc.setFontSize(10);
        doc.text('Description', 14, y);
        doc.text('Qty', 128, y);
        doc.text('Unit', 156, y);
        doc.text('Amount', 196, y, { align: 'right' });
        doc.setDrawColor(230, 230, 230);
        doc.line(14, y + 2, 196, y + 2);
        y += 8;

        doc.setTextColor(40, 40, 40);
        doc.setFontSize(9);
        lineItems.forEach((line) => {
          doc.text(String(line.description || ''), 14, y);
          doc.text(String(line.qty || 0), 128, y);
          doc.text(formatCurrency(line.unit || 0), 156, y);
          doc.text(formatCurrency(line.amount || 0), 196, y, { align: 'right' });
          y += 6;
        });

        y += 2;
        doc.setDrawColor(220, 220, 220);
        doc.line(120, y, 196, y);
        y += 7;
        doc.text('Subtotal', 146, y);
        doc.text(formatCurrency(total), 196, y, { align: 'right' });
        y += 6;
        doc.text('Tax (11%)', 146, y);
        doc.text(formatCurrency(tax), 196, y, { align: 'right' });
        y += 6;
        doc.setDrawColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
        doc.line(140, y, 196, y);
        y += 7;
        doc.setFont(undefined, 'bold');
        doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
        doc.text('Total', 146, y);
        doc.text(formatCurrency(grandTotal), 196, y, { align: 'right' });
        doc.setFont(undefined, 'normal');

        y += 12;
        if (bottles.length > 0) {
          const labels = bottles.slice(0, 120).map((b) => {
            if (b.display_label) return String(b.display_label);
            const readable = (
              b.barcode_number
              || b.barcode
              || b.bottle_barcode
              || b.asset_tag
              || b.serial_number
              || b.cylinder_number
              || b.tag
              || ''
            );
            return readable ? String(readable) : null;
          }).filter(Boolean);
          if (labels.length === 0) return;
          doc.setTextColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);
          doc.setFontSize(10);
          doc.text(`Bottle List (${labels.length})`, 14, y);
          y += 6;
          doc.setTextColor(60, 60, 60);
          doc.setFontSize(8);
          const bottleText = labels.join(', ');
          y = wrapText(doc, bottleText || 'No bottle identifiers available.', 14, y, 182, 4);
          if (bottles.length > 120) {
            y += 3;
            doc.setTextColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);
            doc.text(`+ ${bottles.length - 120} more`, 14, y);
          }
        }

        const safeName = String(customerName).replace(/[^\w\-]+/g, '_');
        const fileName = `Invoice_${safeName}_${invoiceDate}.pdf`;
        return { doc, fileName, customerName };
      };

      const { doc, customerName } = await createInvoicePdfDocForRow(emailRow);
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      const pdfFileName = `Invoice_${String(customerName).replace(/[^\w\-]+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      const bodyHtml = (emailForm.message || '').replace(/\n/g, '<br/>');
      const response = await fetch('/.netlify/functions/send-invoice-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailForm.to,
          from: emailForm.from,
          subject: emailForm.subject,
          body: bodyHtml,
          pdfBase64,
          pdfFileName,
          invoiceNumber: emailRow?.id || '',
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || payload?.details || `Email failed (${response.status})`);
      }
      setActionSuccess(`Invoice emailed to ${emailForm.to}.`);
      setEmailOpen(false);
      setEmailRow(null);
    } catch (err) {
      setActionError(err.message || 'Failed to send invoice email.');
    } finally {
      setEmailing(false);
    }
  };

  if (ctx.loading) {
    return (
      <Box sx={{ p: 4 }}>
        <LinearProgress sx={{ borderRadius: 1 }} />
        <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>Loading rentals...</Typography>
      </Box>
    );
  }

  const headerCards = [
    { label: 'Active Rentals', value: activeRentalCount, icon: <People />, color: '#10B981' },
    { label: 'Active Assets', value: activeRentalAssetCount, icon: <People />, color: '#0EA5E9' },
    { label: 'Outstanding', value: formatCurrency(ctx.outstandingBalance), icon: <AccountBalance />, color: ctx.outstandingBalance > 0 ? '#EF4444' : '#10B981' },
    { label: 'Next Billing', value: derivedNextBilling ? formatDate(derivedNextBilling) : '—', icon: <Schedule />, color: '#F59E0B' },
  ];

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, minHeight: '100%' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>Rentals</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Manage customer rentals, lease agreements, and billing
          </Typography>
        </Box>
        <Stack
          direction="row"
          flexWrap="wrap"
          justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
          sx={{ maxWidth: { sm: '70%', md: '62%' }, gap: 0.5 }}
        >
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={ctx.refresh} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 0.5 }}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Button
            size="small"
            variant="outlined"
            onClick={() => navigate('/settings?tab=invoice-template')}
            sx={{ borderRadius: 1.5, textTransform: 'none', fontSize: '0.75rem', px: 1, py: 0.25, minWidth: 0 }}
          >
            Invoice template
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => handleExportQbInvoiceCsv('monthly')}
            startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
            sx={{ borderRadius: 1.5, textTransform: 'none', fontSize: '0.75rem', px: 1, py: 0.25, minWidth: 0 }}
          >
            QB monthly CSV
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => handleExportQbInvoiceCsv('yearly')}
            startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
            sx={{ borderRadius: 1.5, textTransform: 'none', fontSize: '0.75rem', px: 1, py: 0.25, minWidth: 0 }}
          >
            QB yearly CSV
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={handleGenerateAllInvoices}
            disabled={saving}
            startIcon={<InvoiceIcon sx={{ fontSize: 16 }} />}
            sx={{ borderRadius: 1.5, textTransform: 'none', fontSize: '0.75rem', px: 1, py: 0.25, minWidth: 0 }}
          >
            Generate invoices
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
            onClick={() => setCreateOpen(true)}
            sx={{
              borderRadius: 1.5,
              textTransform: 'none',
              fontSize: '0.75rem',
              px: 1.25,
              py: 0.25,
              minWidth: 0,
              bgcolor: primaryColor,
              '&:hover': { bgcolor: primaryColor, opacity: 0.9 },
            }}
          >
            New rental
          </Button>
        </Stack>
      </Stack>

      {actionError && <Alert severity="error" onClose={() => setActionError(null)} sx={{ mb: 2 }}>{actionError}</Alert>}
      {actionSuccess && <Alert severity="success" onClose={() => setActionSuccess(null)} sx={{ mb: 2 }}>{actionSuccess}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {headerCards.map((c, i) => (
          <Grid item xs={6} sm={4} md key={i}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.label}</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5, fontSize: '1.4rem' }}>{c.value}</Typography>
                  </Box>
                  <Box sx={{ bgcolor: `${c.color}18`, color: c.color, p: 1, borderRadius: 2, display: 'flex' }}>{c.icon}</Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ px: 2, pt: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.875rem' } }}>
            <Tab label={`All (${allRows.length})`} />
            <Tab label="Monthly" />
            <Tab label="Yearly" />
            <Tab label="Cancelled" />
          </Tabs>
          <TextField
            size="small"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ ml: 'auto', minWidth: 240, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: 'text.secondary', letterSpacing: '0.05em' } }}>
                <TableCell>Customer</TableCell>
                <TableCell>Period</TableCell>
                <TableCell align="center">Items</TableCell>
                <TableCell align="right">Total / Cycle</TableCell>
                <TableCell>Next Billing</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    {allRows.length === 0 ? 'No rentals found yet.' : 'No matching rentals.'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((sub) => (
                  <TableRow
                    key={sub.id}
                    hover
                    sx={{ cursor: sub.isVirtual ? 'default' : 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    onClick={() => { if (!sub.isVirtual) navigate(`/subscriptions/${sub.id}`); }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{sub.customer?.name || sub.customer?.Name || sub.customer_id}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={sub.billing_period} size="small" variant="outlined" sx={{ textTransform: 'capitalize', fontWeight: 600 }} />
                    </TableCell>
                    <TableCell align="center">{sub.itemCount}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>{formatCurrency(sub.totalPerCycle)}</TableCell>
                    <TableCell>{formatDate(sub.next_billing_date)}</TableCell>
                    <TableCell>
                      <Chip
                        label={sub.status}
                        size="small"
                        color={STATUS_COLORS[sub.status] || 'default'}
                        sx={{ fontWeight: 600, textTransform: 'capitalize' }}
                      />
                    </TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleGenerateInvoiceForRow(sub)}
                          disabled={saving || (parseFloat(sub.totalPerCycle) || 0) <= 0}
                          sx={{
                            textTransform: 'none',
                            minWidth: 'auto',
                            px: 0.75,
                            py: 0.25,
                            fontSize: '0.7rem',
                            lineHeight: 1.2,
                            borderRadius: 1.5,
                          }}
                        >
                          Invoice
                        </Button>
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => handleDownloadInvoicePdfForRow(sub)}
                          disabled={(parseFloat(sub.totalPerCycle) || 0) <= 0}
                          sx={{
                            textTransform: 'none',
                            minWidth: 'auto',
                            px: 1,
                            py: 0.25,
                            fontSize: '0.72rem',
                            lineHeight: 1.2,
                          }}
                        >
                          PDF
                        </Button>
                        <Button
                          size="small"
                          variant="text"
                          startIcon={<EmailIcon fontSize="small" />}
                          onClick={() => openEmailDialogForRow(sub)}
                          disabled={saving || (parseFloat(sub.totalPerCycle) || 0) <= 0}
                          sx={{
                            textTransform: 'none',
                            minWidth: 'auto',
                            px: 1,
                            py: 0.25,
                            fontSize: '0.72rem',
                            lineHeight: 1.2,
                          }}
                        >
                          Email
                        </Button>
                        {sub.customer_id && (
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => {
                              const id = String(sub.customer_id || '').trim();
                              if (!id) {
                                setActionError('No customer identifier available for this row.');
                                return;
                              }
                              navigate(`/customer/${encodeURIComponent(id)}`);
                            }}
                            sx={{ textTransform: 'none' }}
                          >
                            Customer
                          </Button>
                        )}
                        {sub.isVirtual ? (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              navigate('/pricing/customers', {
                                state: {
                                  prefillCustomerId: sub.customer_id,
                                  prefillCustomerName: sub.customer?.name || sub.customer?.Name || sub.customer_id,
                                },
                              });
                            }}
                            sx={{ textTransform: 'none' }}
                          >
                            Edit Rates
                          </Button>
                        ) : (
                          <>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => {
                                navigate('/pricing/customers', {
                                  state: {
                                    prefillCustomerId: sub.customer_id,
                                    prefillCustomerName: sub.customer?.name || sub.customer?.Name || sub.customer_id,
                                  },
                                });
                              }}
                              sx={{ textTransform: 'none' }}
                            >
                              Edit Rates
                            </Button>
                            <Tooltip title="View details">
                              <IconButton size="small" onClick={() => navigate(`/subscriptions/${sub.id}`)}>
                                <ViewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>New Rental</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Customer</InputLabel>
              <Select
                value={newSub.customer_id}
                label="Customer"
                onChange={(e) => setNewSub((p) => ({ ...p, customer_id: e.target.value }))}
              >
                {ctx.customers.map((c) => (
                  <MenuItem key={c.id || c.CustomerListID} value={c.id || c.CustomerListID}>
                    {c.name || c.Name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Billing Period</InputLabel>
              <Select
                value={newSub.billing_period}
                label="Billing Period"
                onChange={(e) => setNewSub((p) => ({ ...p, billing_period: e.target.value }))}
              >
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="yearly">Yearly</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving || !newSub.customer_id} sx={{ textTransform: 'none', bgcolor: primaryColor, '&:hover': { bgcolor: primaryColor, opacity: 0.9 } }}>
            {saving ? 'Creating...' : 'Create Rental'}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={emailOpen} onClose={() => setEmailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Email Invoice</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Customer: {emailRow?.customer?.name || emailRow?.customer?.Name || emailRow?.customer_id || '—'}
            </Typography>
            <TextField
              size="small"
              label="Recipient (To)"
              type="email"
              value={emailForm.to}
              onChange={(e) => setEmailForm((p) => ({ ...p, to: e.target.value }))}
              required
            />
            <FormControl size="small" fullWidth>
              <InputLabel>Sender (From)</InputLabel>
              <Select
                value={emailForm.from}
                label="Sender (From)"
                onChange={(e) => setEmailForm((p) => ({ ...p, from: e.target.value }))}
              >
                {senderOptions.map((email) => (
                  <MenuItem key={email} value={email}>{email}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              size="small"
              label="Subject"
              value={emailForm.subject}
              onChange={(e) => setEmailForm((p) => ({ ...p, subject: e.target.value }))}
            />
            <TextField
              size="small"
              label="Message"
              value={emailForm.message}
              onChange={(e) => setEmailForm((p) => ({ ...p, message: e.target.value }))}
              multiline
              rows={4}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEmailOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSendInvoiceEmail}
            disabled={emailing || !emailForm.to || !emailForm.from}
            sx={{ textTransform: 'none', bgcolor: primaryColor, '&:hover': { bgcolor: primaryColor, opacity: 0.9 } }}
          >
            {emailing ? 'Sending...' : 'Send Invoice'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
