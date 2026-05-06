import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSubscriptions } from '../context/SubscriptionContext';
import { useTheme } from '../context/ThemeContext';
import { createSubscription, generateInvoice } from '../services/subscriptionService';
import { supabase } from '../supabase/client';
import { formatCurrency, formatDate, STATUS_COLORS } from '../utils/subscriptionUtils';
import { createRentalInvoicePdfDoc, defaultInvoiceNumber } from '../utils/rentalInvoicePdf';
import { getNextInvoiceNumbers, resolveInvoiceNumberForRentalPdf } from '../utils/invoiceUtils';
import { buildOpenAssetRowsForInvoice, fetchReturnsInInvoicePeriod } from '../utils/rentalInvoiceAssets';
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
import {
  bottleProductCode,
  buildBottleLookupMaps,
  groupBillableUnitCountsByProductCode,
  resolvedRentalProductCode,
} from '../services/billingFromAssets';
import { useDebounce } from '../utils/performance';
import EmailInvoiceDialog from '../components/EmailInvoiceDialog';
import { findActiveLeaseContract } from '../services/leaseBilling';
import {
  Box, Typography, Card, CardContent, Grid, Tabs, Tab, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, Chip, IconButton,
  Button, TextField, InputAdornment, Tooltip, LinearProgress, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel,
  Select, MenuItem, Alert, TablePagination,
} from '@mui/material';
import {
  Search as SearchIcon, Add as AddIcon, Refresh as RefreshIcon,
  Visibility as ViewIcon, Edit as EditIcon, Cancel as CancelIcon, Email as EmailIcon,
  Receipt as InvoiceIcon, TrendingUp, People, Schedule, AccountBalance, Download as DownloadIcon,
} from '@mui/icons-material';

/**
 * Classifies customer payment_terms for QuickBooks monthly export cohorts.
 * Returns net30 | credit_card | other | unknown (empty terms).
 */
function isCodPaymentTerm(t) {
  return t === 'cod' || t === 'cash on delivery' || t === 'c.o.d.';
}

function isCreditCardPaymentTerm(t) {
  return isCodPaymentTerm(t) || /\bvisa\b|\bmastercard\b|\bmc\b|\bamex\b|american express|\bdiscover\b|credit\s*card|card\s*payment|\bdebit\s*card\b/.test(t);
}

function classifyInvoiceTermsForExport(paymentTermsRaw) {
  const t = String(paymentTermsRaw || '').trim().toLowerCase();
  if (!t) return 'unknown';
  if (t.includes('net') && t.includes('30')) return 'net30';
  if (isCreditCardPaymentTerm(t)) return 'credit_card';
  return 'other';
}

function rowMatchesMonthlyQbCohort(row, cohort) {
  if (cohort === 'all') return true;
  const cat = classifyInvoiceTermsForExport(row.customer?.payment_terms);
  if (cohort === 'net30') return cat === 'net30';
  if (cohort === 'credit_card') return cat === 'credit_card';
  return true;
}

/** Maps DB/UI aliases so period tabs stay consistent (e.g. annual → yearly). */
function canonicalBillingPeriod(raw) {
  const p = String(raw || '').trim().toLowerCase();
  if (p === 'yearly' || p === 'annual' || p === 'year') return 'yearly';
  if (p === 'monthly' || p === 'month') return 'monthly';
  return p || 'monthly';
}

/** Short label for lease agreement end date (matches common Jan 1 renewal wording). */
function formatLeaseAgreementExpiry(endDateStr) {
  if (!endDateStr) return '';
  const s = String(endDateStr).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
  const [, m, d] = s.split('-').map((x) => parseInt(x, 10));
  if (m === 1 && d === 1) return 'Yearly lease · renews Jan 1';
  try {
    const shown = new Date(`${s}T12:00:00`).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return shown ? `Lease ends ${shown}` : '';
  } catch {
    return '';
  }
}

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

export default function Subscriptions() {
  const { organization, user, profile } = useAuth();
  const ctx = useSubscriptions();
  const { organizationColors } = useTheme();
  const primaryColor = organizationColors?.primary || '#40B5AD';
  const navigate = useNavigate();

  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');
  const [tablePage, setTablePage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  /** Avoid re-filtering / full table work on every keystroke */
  const debouncedSearch = useDebounce(search, 280);
  const [createOpen, setCreateOpen] = useState(false);
  const [newSub, setNewSub] = useState({ customer_id: '', billing_period: 'monthly' });
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [legacyRows, setLegacyRows] = useState([]);
  const [fallbackResolverCustomers, setFallbackResolverCustomers] = useState([]);
  const [invoiceTemplate, setInvoiceTemplate] = useState(null);
  const [remitAddress, setRemitAddress] = useState(null);
  const [localRatesVersion, setLocalRatesVersion] = useState(0);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [senderOptions, setSenderOptions] = useState([]);
  const [emailRow, setEmailRow] = useState(null);
  const [emailInitialForm, setEmailInitialForm] = useState({ to: '', from: '', subject: '', message: '' });
  const [termsFilter, setTermsFilter] = useState('all');
  /** Monthly QuickBooks CSV: all | net30 | credit_card */
  const [monthlyQbCohort, setMonthlyQbCohort] = useState('all');
  const [bulkEmailing, setBulkEmailing] = useState(false);
  const [bulkEmailProgress, setBulkEmailProgress] = useState({ sent: 0, total: 0, failed: 0 });
  const [cycleInvoiceByCustomer, setCycleInvoiceByCustomer] = useState({});
  const tabFilters = ['all', 'monthly', 'lease', 'cancelled'];
  const defaultTemplateBody = 'Your invoice {invoice_number} for {amount} is attached.\n\nFor any billing or invoice inquiries, please reply to this email.\nThank you very much for your business.';
  const defaultTemplateSignature = 'Sincerely,\n{organization_name}';
  const loadEmailTemplateSettings = useCallback(() => {
    try {
      const raw = localStorage.getItem(`invoiceEmailTemplate_${organization?.id}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [organization?.id]);
  const withGlobalSignature = useCallback((message, signature) => {
    const msg = String(message || '').trim();
    const sig = String(signature || '').trim();
    if (!sig) return msg;
    if (!msg) return sig;
    if (msg.includes(sig)) return msg;
    return `${msg}\n\n${sig}`;
  }, []);
  const ensureInvoiceContext = useCallback((message, invoiceNumber, formattedAmount) => {
    const msg = String(message || '').trim();
    const invNo = String(invoiceNumber || '').trim();
    const amount = String(formattedAmount || '').trim();
    if (!invNo && !amount) return msg;
    const hasInvoiceNumber = invNo ? msg.toLowerCase().includes(invNo.toLowerCase()) : true;
    const hasAmount = amount ? msg.includes(`$${amount}`) : true;
    if (hasInvoiceNumber && hasAmount) return msg;
    const header = `Invoice ${invNo}${amount ? ` for $${amount}` : ''}`;
    if (!msg) return header;
    return `${header}\n\n${msg}`;
  }, []);
  const getCurrentCycleRange = useCallback(() => {
    const now = new Date();
    const toLocalYmd = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const periodStart = toLocalYmd(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const periodEnd = toLocalYmd(new Date(now.getFullYear(), now.getMonth(), 0));
    const dueDate = toLocalYmd(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    return { periodStart, periodEnd, dueDate };
  }, []);

  /** Same period boundaries as rental PDF / line items (yearly subs use Stripe period when present). */
  const getPdfBillingPeriodForSub = useCallback((sub) => {
    const normPeriodDay = (v) => {
      const s = String(v || '').trim().slice(0, 10);
      return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
    };
    const subStart = normPeriodDay(sub?.current_period_start);
    const subEnd = normPeriodDay(sub?.current_period_end);
    const fallback = getCurrentCycleRange();
    const isYearly = String(sub?.billing_period || '').toLowerCase() === 'yearly';
    const periodStart =
      isYearly && subStart && subEnd && subStart <= subEnd ? subStart : fallback.periodStart;
    const periodEnd =
      isYearly && subStart && subEnd && subStart <= subEnd ? subEnd : fallback.periodEnd;
    return { periodStart, periodEnd };
  }, [getCurrentCycleRange]);

  // Stable extraction of bottle-derived customer candidates; only recomputes
  // when the actual set of unique (id, name) pairs changes, not on every
  // bottles array reference change from realtime updates.
  const bottleDerivedCandidatesRef = useRef([]);
  const bottleDerivedCandidates = useMemo(() => {
    const seen = new Map();
    for (const b of (ctx.bottles || [])) {
      const id = b.assigned_customer || b.customer_id;
      const name = b.customer_name;
      if (!id && !name) continue;
      const key = `${normalize(id)}||${normalizeName(name)}`;
      if (seen.has(key)) continue;
      seen.set(key, { id: id || name, CustomerListID: id || name, name: name || id, Name: name || id });
    }
    const next = [...seen.values()];
    // Structural equality check: skip update if content is identical
    const prev = bottleDerivedCandidatesRef.current;
    if (prev.length === next.length && prev.every((p, i) => p.id === next[i].id && p.name === next[i].name)) {
      return prev;
    }
    bottleDerivedCandidatesRef.current = next;
    return next;
  }, [ctx.bottles]);

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

    for (const c of bottleDerivedCandidates) {
      addCandidate(c);
    }

    return { byId, byName };
  }, [ctx.customers, fallbackResolverCustomers, bottleDerivedCandidates]);

  const resolveCustomer = useCallback((idOrName, fallbackName = '') => {
    const idKey = normalize(idOrName);
    const nameKey = normalizeName(idOrName) || normalizeName(fallbackName);
    return customerResolvers.byId.get(idKey) || customerResolvers.byName.get(nameKey) || null;
  }, [customerResolvers]);

  const resolveCustomerRef = useRef(resolveCustomer);
  useEffect(() => { resolveCustomerRef.current = resolveCustomer; });

  const matchCustomerRecordBySubscriptionId = useCallback((customerId) => {
    if (!customerId || !(ctx.customers || []).length) return null;
    const key = normalize(customerId);
    for (const c of ctx.customers) {
      const ids = [c.id, c.CustomerListID].map(normalize).filter(Boolean);
      if (ids.includes(key)) return c;
    }
    return null;
  }, [ctx.customers]);

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
      setRemitAddress(null);
      return;
    }
    try {
      const savedTemplate = localStorage.getItem(`invoiceTemplate_${organization.id}`);
      setInvoiceTemplate(savedTemplate ? JSON.parse(savedTemplate) : null);
    } catch {
      setInvoiceTemplate(null);
    }
    (async () => {
      try {
        const { data } = await supabase
          .from('invoice_settings')
          .select('remit_name, remit_address_line1, remit_address_line2, remit_address_line3, gst_number')
          .eq('organization_id', organization.id)
          .maybeSingle();
        if (data) setRemitAddress(data);
      } catch { /* columns may not exist yet */ }
    })();
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
        customers: ctx.customers,
      }),
    [ctx.customerPricingOverrides, ctx.legacyPricingOverrides, organization?.id, ctx.customers, localRatesVersion]
  );

  const resolveDisplayUnitPrice = useCallback((pricingRow, item) =>
    resolveDisplayUnitFromMaps({
      row: pricingRow,
      item,
      customerOverrideMap,
      assetPricingMap,
      defaultMonthly: defaultUnitRateByPeriod.monthly,
      defaultYearly: defaultUnitRateByPeriod.yearly,
    }), [customerOverrideMap, assetPricingMap, defaultUnitRateByPeriod]);

  const enriched = useMemo(() => {
    const billingData = {
      bottles: ctx.bottles || [],
      rentals: ctx.rentals || [],
      leaseContracts: ctx.leaseContracts || [],
      leaseContractItems: ctx.leaseContractItems || [],
      customers: ctx.customers || [],
    };
    const pricingCtx = {
      customerOverrideMap,
      assetPricingMap,
      defaultMonthly: defaultUnitRateByPeriod.monthly,
      defaultYearly: defaultUnitRateByPeriod.yearly,
    };

    /**
     * Performance: pre-bucket bottles + open rentals by customer-link keys ONCE.
     * Avoids O(subscriptions × (bottles + rentals)) inside the per-subscription map.
     * Each bucket: { byProduct: Map<productCode, count>, businessKeys: Set<string> } (DNS dedupe).
     */
    const bottlesByCustomerKey = new Map();
    const rentalsByCustomerKey = new Map();
    /** One product class per billable rental row — avoids double-count when the same row is indexed under id + name keys. */
    const rentalProductByBusinessKey = new Map();
    const ensureBottleBucket = (key) => {
      if (!key) return null;
      let b = bottlesByCustomerKey.get(key);
      if (!b) { b = new Map(); bottlesByCustomerKey.set(key, b); }
      return b;
    };
    const ensureRentalBucket = (key) => {
      if (!key) return null;
      let r = rentalsByCustomerKey.get(key);
      if (!r) { r = { byProduct: new Map(), businessKeys: new Set() }; rentalsByCustomerKey.set(key, r); }
      return r;
    };

    const { byId: invBottleById, byBarcode: invBottleByBarcode } = buildBottleLookupMaps(ctx.bottles || []);

    for (const bottle of (ctx.bottles || [])) {
      const productRaw = bottleProductCode(bottle);
      const productKey = productRaw ? normalize(productRaw) : '__unclassified__';
      const linkKeys = new Set();
      const addId = (v) => { const n = normalize(v); if (n) linkKeys.add(n); };
      addId(bottle.assigned_customer);
      addId(bottle.customer_id);
      for (const k of linkKeys) {
        const bucket = ensureBottleBucket(k);
        if (!bucket) continue;
        bucket.set(productKey, (bucket.get(productKey) || 0) + 1);
      }
    }

    for (const rental of (ctx.rentals || [])) {
      const productRaw = resolvedRentalProductCode(rental, invBottleById, invBottleByBarcode);
      const productKey = productRaw ? normalize(productRaw) : '__unclassified__';
      let businessKey;
      if (rental?.is_dns === true) {
        businessKey = `dns:${String(rental?.dns_product_code || rental?.product_code || '').trim()}:${String(rental?.bottle_barcode || '').trim().toUpperCase()}:${String(rental?.customer_id || '').trim()}`;
      } else if (rental?.bottle_id != null && String(rental.bottle_id).trim() !== '') {
        businessKey = `bottle_id:${String(rental.bottle_id).trim()}`;
      } else if (rental?.bottle_barcode != null && String(rental.bottle_barcode).trim() !== '') {
        businessKey = `barcode:${String(rental.bottle_barcode).trim().toUpperCase()}`;
      } else {
        businessKey = `row:${String(rental?.id || '').trim()}`;
      }
      const linkKeys = new Set();
      const addId = (v) => { const n = normalize(v); if (n) linkKeys.add(n); };
      const addName = (v) => { const n = normalizeName(v); if (n) linkKeys.add(n); };
      addId(rental.customer_id);
      addName(rental.customer_name);
      rentalProductByBusinessKey.set(businessKey, productKey);
      for (const k of linkKeys) {
        const bucket = ensureRentalBucket(k);
        if (!bucket) continue;
        if (bucket.businessKeys.has(businessKey)) continue;
        bucket.businessKeys.add(businessKey);
        bucket.byProduct.set(productKey, (bucket.byProduct.get(productKey) || 0) + 1);
      }
    }

    const customerKeysForSubscription = (sub, customer) => {
      const keys = new Set();
      const addId = (v) => { const n = normalize(v); if (n) keys.add(n); };
      const addName = (v) => { const n = normalizeName(v); if (n) keys.add(n); };
      addId(sub?.customer_id);
      addName(sub?.customer_name);
      if (customer) {
        addId(customer.id);
        addId(customer.CustomerListID);
        addId(customer.customer_id);
        addName(customer.name);
        addName(customer.Name);
      }
      return keys;
    };

    const lookupBillableGroups = (sub, customer) => {
      const keys = customerKeysForSubscription(sub, customer);
      const matchedBusinessKeys = new Set();
      for (const k of keys) {
        const rb = rentalsByCustomerKey.get(k);
        if (!rb) continue;
        for (const bk of rb.businessKeys) matchedBusinessKeys.add(bk);
      }
      const rentalProducts = new Map();
      for (const bk of matchedBusinessKeys) {
        const pc = rentalProductByBusinessKey.get(bk) || '__unclassified__';
        rentalProducts.set(pc, (rentalProducts.get(pc) || 0) + 1);
      }
      const haveAnyRental = rentalProducts.size > 0;
      if (haveAnyRental) {
        const out = [];
        for (const [productCode, count] of rentalProducts.entries()) {
          out.push({ productCode, count });
        }
        return out;
      }
      const bottleProducts = new Map();
      for (const k of keys) {
        const bb = bottlesByCustomerKey.get(k);
        if (!bb) continue;
        for (const [pc, count] of bb.entries()) {
          bottleProducts.set(pc, (bottleProducts.get(pc) || 0) + count);
        }
      }
      const out = [];
      for (const [productCode, count] of bottleProducts.entries()) {
        out.push({ productCode, count });
      }
      return out;
    };

    return ctx.subscriptions.map((sub) => {
      const items = ctx.subscriptionItems.filter((i) => i.subscription_id === sub.id && i.status === 'active');
      const customer =
        resolveCustomer(sub.customer_id) ||
        resolveCustomer(sub.customer_name || '') ||
        matchCustomerRecordBySubscriptionId(sub.customer_id) ||
        {
          CustomerListID: sub.customer_id,
          id: sub.customer_id,
          name: sub.customer_name || sub.customer_id,
          Name: sub.customer_name,
        };
      const totalPerCycle = computeSubscriptionBillingCycleTotal(sub, customer, pricingCtx, billingData);
      const activeLease = findActiveLeaseContract(
        ctx.leaseContracts || [],
        sub.customer_id,
        organization?.id
      );
      let itemCount = 0;
      /** Per SKU / rental-class counts — drives invoice PDF/email lines with correct resolveDisplayUnitPrice per asset type. */
      let productCounts = null;
      if (customer?.billing_mode === 'lease') {
        const leaseLines = activeLease
          ? (ctx.leaseContractItems || []).filter((i) => i.contract_id === activeLease.id)
          : [];
        itemCount = leaseLines.reduce((s, i) => s + (parseInt(i.contracted_quantity, 10) || 0), 0);
        if (leaseLines.length > 0) {
          productCounts = {};
          for (const line of leaseLines) {
            const qty = parseInt(line.contracted_quantity, 10) || 0;
            if (qty <= 0) continue;
            const code = String(line.product_code || line.description || 'Lease asset').trim() || 'Lease asset';
            productCounts[code] = (productCounts[code] || 0) + qty;
          }
        }
      } else {
        const groups = lookupBillableGroups(sub, customer);
        itemCount = groups.reduce((s, g) => s + g.count, 0);
        productCounts = {};
        for (const g of groups) {
          if (g.count <= 0) continue;
          const key = g.productCode || '__unclassified__';
          productCounts[key] = (productCounts[key] || 0) + g.count;
        }
        if (Object.keys(productCounts).length === 0) productCounts = null;
      }
      const forceYearlyPeriod =
        customer?.billing_mode === 'lease' ||
        (!!activeLease && customer?.billing_mode !== 'rental');
      const billingPeriod = forceYearlyPeriod ? 'yearly' : canonicalBillingPeriod(sub.billing_period);
      return {
        ...sub,
        items,
        customer,
        totalPerCycle,
        itemCount,
        billing_period: billingPeriod,
        ...(productCounts && Object.keys(productCounts).length > 0 ? { productCounts } : {}),
      };
    });
  }, [
    ctx.subscriptions,
    ctx.subscriptionItems,
    ctx.bottles,
    ctx.rentals,
    ctx.leaseContracts,
    ctx.leaseContractItems,
    ctx.customers,
    customerResolvers,
    matchCustomerRecordBySubscriptionId,
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
          billing_period: (() => {
            const activeLeaseForPeriod = findActiveLeaseContract(
              ctx.leaseContracts || [],
              customerIdValue,
              organization?.id
            );
            const forceYearly =
              customer?.billing_mode === 'lease' ||
              (!!activeLeaseForPeriod && customer?.billing_mode !== 'rental');
            return forceYearly ? 'yearly' : 'monthly';
          })(),
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
  }, [ctx.bottles, ctx.subscriptions, ctx.customers, ctx.leaseContracts, customerResolvers, organization?.id]);

  useEffect(() => {
    let active = true;
    const loadLegacyActiveRentals = async () => {
      if (!organization?.id) return;
      let rows = [];
      try {
        const { data, error } = await supabase
          .from('rentals')
          .select('id, customer_id, customer_name, bottle_id, bottle_barcode, product_code, product_type, asset_type, rental_type, rental_amount, rental_end_date, is_dns')
          .eq('organization_id', organization.id)
          .is('rental_end_date', null);
        if (error) throw error;
        if (!active) return;

        // Same spirit as pre-consolidation Rentals.jsx + billingWorkspace: keep rows even when
        // customer directory lookup misses (QuickBooks ID drift, timing). Fall back to rental row IDs/names.
        const legacyBottleMaps = buildBottleLookupMaps(ctx.bottles || []);
        const grouped = (data || [])
          .filter((r) => !r.is_dns)
          .reduce((acc, row) => {
            const key = String(row.customer_id || row.customer_name || 'unassigned').trim();
            if (!key) return acc;
            const resolvedCustomer = resolveCustomerRef.current(row.customer_id || row.customer_name, row.customer_name);
            const fallbackId = String(row.customer_id || row.customer_name || key).trim();
            const fallbackName =
              row.customer_name ||
              row.customer_id ||
              'Unknown customer';
            const displayCustomer =
              resolvedCustomer ||
              {
                id: fallbackId,
                CustomerListID: fallbackId,
                name: fallbackName,
                Name: fallbackName,
              };
            const cur = acc.get(key) || {
              key,
              customer_id: resolvedCustomer?.CustomerListID || resolvedCustomer?.id || fallbackId,
              customer_name: resolvedCustomer?.name || resolvedCustomer?.Name || fallbackName,
              customer: displayCustomer,
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
            const codeRaw = resolvedRentalProductCode(row, legacyBottleMaps.byId, legacyBottleMaps.byBarcode);
            const productKey = codeRaw ? normalize(codeRaw) : '__unclassified__';
            cur.productCounts[productKey] = (cur.productCounts[productKey] || 0) + 1;
            acc.set(key, cur);
            return acc;
          }, new Map());

        rows = Array.from(grouped.values()).map((g) => ({
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
          legacySource: 'rentals_table',
        }));
      } catch {
        rows = [];
      }

      // Imported / TrackAbout lease_agreements: yearly-only billing (no monthly cylinder rental).
      // Shown on Rentals under Yearly / All; omitted from extraLegacy dedupe so they still appear
      // when the same customer also has a monthly subscription row.
      let leaseRows = [];
      try {
        if (!active) return;
        const { data: leaseData, error: leaseErr } = await supabase
          .from('lease_agreements')
          .select(
            'id, customer_id, customer_name, agreement_number, bottle_id, max_asset_count, annual_amount, billing_frequency, next_billing_date, start_date, end_date, status'
          )
          .eq('organization_id', organization.id)
          .not('status', 'in', '("cancelled","expired","renewed")');
        if (leaseErr) throw leaseErr;
        if (!active) return;

        leaseRows = (leaseData || []).map((a) => {
          const resolvedCustomer = resolveCustomerRef.current(a.customer_id || a.customer_name, a.customer_name);
          const displayName =
            resolvedCustomer?.name ||
            resolvedCustomer?.Name ||
            a.customer_name ||
            a.customer_id ||
            'Assigned customer';
          const itemCount = Number.parseInt(String(a.max_asset_count ?? ''), 10);
          const agreementCode = String(a.agreement_number || '').trim();
          const productCounts = {};

          const baseAnnual = parseFloat(a.annual_amount) || 0;
          return {
            id: `lease-agreement-${a.id}`,
            customer: resolvedCustomer || { name: displayName, Name: displayName },
            customer_id: resolvedCustomer?.CustomerListID || resolvedCustomer?.id || a.customer_id || a.customer_name,
            billing_period: 'yearly',
            itemCount: Number.isFinite(itemCount) && itemCount > 0 ? itemCount : 1,
            totalPerCycle: baseAnnual,
            lease_agreement_annual: baseAnnual,
            lease_bottle_id: a.bottle_id || null,
            lease_end_date: a.end_date || null,
            bottleIdentifiers: [],
            bottleIds: [],
            productCounts,
            next_billing_date: a.next_billing_date || a.end_date || null,
            status: String(a.status || 'active').toLowerCase(),
            isVirtual: true,
            legacySource: 'lease_agreements',
            notes: agreementCode ? `Agreement ${agreementCode}` : undefined,
          };
        });
      } catch (err) {
        console.warn('Error loading lease agreements for rentals page:', err);
        leaseRows = [];
      }

      if (active) setLegacyRows([...rows, ...leaseRows]);
    };
    loadLegacyActiveRentals();
    return () => { active = false; };
  }, [organization?.id, ctx.bottles]);

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

    const subscriptionIds = new Set((ctx.subscriptions || []).map((s) => s.id).filter(Boolean));
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
    // lease_agreements imports are yearly lease fees (not monthly cylinder rental); always merge so
    // lease-only customers appear, and Yearly tab stays populated when they share a customer with other rows.
    const leaseAgreementRows = (legacyRows || []).filter((r) => r.legacySource === 'lease_agreements');
    const combined = [...merged, ...extraLegacy, ...leaseAgreementRows].filter((row) => {
      const itemCount = parseFloat(row.itemCount) || 0;
      const rawTotal = parseFloat(row.totalPerCycle) || 0;
      const fromLegacyRentals = row.legacySource === 'rentals_table';
      const fromLeaseAgreements = row.legacySource === 'lease_agreements';
      const isPersistedSubscriptionRow = row.id != null && subscriptionIds.has(row.id);

      // Drop rows with no quantity and no cycle total, unless they're from the
      // legacy rentals / lease_agreements tables or are real subscription records.
      if (!fromLegacyRentals && !fromLeaseAgreements && !isPersistedSubscriptionRow && itemCount <= 0 && rawTotal <= 0) {
        return false;
      }

      const idKey = normalize(row.customer_id);
      const nameKey = normalizeName(row.customer?.name || row.customer?.Name || '');
      const inCustomerDirectory =
        activeCustomerIdKeys.has(idKey) || activeCustomerNameKeys.has(nameKey);

      const pricedLiveSubscription =
        rawTotal > 0 &&
        !row.isVirtual &&
        Boolean(String(row.customer_id || '').trim());

      if (!inCustomerDirectory && !fromLegacyRentals && !fromLeaseAgreements && !pricedLiveSubscription && !isPersistedSubscriptionRow) {
        return false;
      }

      return true;
    });
    const legacyTotalsByCustomer = new Map(
      (legacyRows || []).map((r) => [normalize(r.customer_id || r.customer?.name), parseFloat(r.totalPerCycle) || 0])
    );

    // Pre-build lookup maps ONCE (outside the per-row loop) for O(1) access.
    const byBottleId = new Map(
      (ctx.bottles || []).map((b) => [String(b.id || '').trim(), b])
    );
    const bottleProductsByCustomerIdKey = new Map();
    const bottleProductsByCustomerNameKey = new Map();
    for (const bottle of (ctx.bottles || [])) {
      const code = bottleProductCode(bottle);
      if (!code) continue;
      const idKey = normalize(bottle.assigned_customer || bottle.customer_id);
      const nk = normalize(code);
      if (idKey) {
        const m = bottleProductsByCustomerIdKey.get(idKey) || {};
        m[nk] = (m[nk] || 0) + 1;
        bottleProductsByCustomerIdKey.set(idKey, m);
      }
      const nameKey = normalizeName(bottle.customer_name);
      if (nameKey) {
        const m = bottleProductsByCustomerNameKey.get(nameKey) || {};
        m[nk] = (m[nk] || 0) + 1;
        bottleProductsByCustomerNameKey.set(nameKey, m);
      }
    }

    return combined.map((row) => {
      if (row.legacySource === 'lease_agreements') {
        const baseAnnual = parseFloat(row.lease_agreement_annual);
        const safeBase = Number.isFinite(baseAnnual) ? baseAnnual : (parseFloat(row.totalPerCycle) || 0);
        let displayedAnnual = safeBase;
        let displayItems = parseFloat(row.itemCount) || 1;
        if (!row.lease_bottle_id) {
          const cid = normalize(row.customer_id);
          let n = 0;
          for (const b of ctx.bottles || []) {
            const bk = normalize(b.assigned_customer || b.customer_id);
            if (bk && bk === cid) n += 1;
          }
          const effective = n > 0 ? n : 1;
          displayedAnnual = safeBase * effective;
          displayItems = effective;
        } else {
          displayItems = 1;
        }
        const rounded = Math.round(displayedAnnual * 100) / 100;
        const expiryLabel = formatLeaseAgreementExpiry(row.lease_end_date);
        return {
          ...row,
          totalPerCycle: rounded,
          itemCount: displayItems,
          lease_expiry_label: expiryLabel || undefined,
        };
      }

      const customerKey = normalize(row.customer_id);
      const allProductsOverride = findAllProductsOverrideMultiKey(customerOverrideMap, row);
      const period = String(row.billing_period || 'monthly').toLowerCase();
      let total = parseFloat(row.totalPerCycle) || 0;
      let computedItemCount = parseFloat(row.itemCount) || 0;
      let effectiveProductCounts = row.productCounts && typeof row.productCounts === 'object'
        ? row.productCounts
        : null;

      // For legacy virtual rows, derive product mix from linked bottle ids first.
      if (row.isVirtual && !effectiveProductCounts) {
        const derivedById = {};
        for (const bottleId of (row.bottleIds || [])) {
          const bottle = byBottleId.get(String(bottleId || '').trim());
          if (!bottle) continue;
          const code = bottleProductCode(bottle);
          if (!code) continue;
          const nk = normalize(code);
          derivedById[nk] = (derivedById[nk] || 0) + 1;
        }
        if (Object.keys(derivedById).length > 0) {
          effectiveProductCounts = derivedById;
        }
      }

      // Secondary fallback: use pre-built customer-to-product maps for O(1) lookup.
      if (row.isVirtual && !effectiveProductCounts) {
        const idKeys = [row.customer_id, row.customer?.id, row.customer?.CustomerListID]
          .map(normalize).filter(Boolean);
        const nameKeys = [row.customer?.name, row.customer?.Name]
          .map(normalizeName).filter(Boolean);
        let derived = null;
        for (const k of idKeys) {
          const m = bottleProductsByCustomerIdKey.get(k);
          if (m) { derived = { ...m }; break; }
        }
        if (!derived) {
          for (const k of nameKeys) {
            const m = bottleProductsByCustomerNameKey.get(k);
            if (m) { derived = { ...m }; break; }
          }
        }
        if (derived && Object.keys(derived).length > 0) effectiveProductCounts = derived;
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

        const qty = computedItemCount;
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
        const qty = computedItemCount;
        if (qty > 0) {
          const period = String(row.billing_period || 'monthly').toLowerCase();
          const unit = period === 'yearly' ? defaultUnitRateByPeriod.yearly : defaultUnitRateByPeriod.monthly;
          total = (Number.isFinite(unit) ? unit : 0) * qty;
        }
      }

      return { ...row, itemCount: computedItemCount, ...(effectiveProductCounts ? { productCounts: effectiveProductCounts } : {}), totalPerCycle: total };
    });
  }, [
    enriched,
    customersWithBottlesNoSubscription,
    legacyRows,
    customerOverrideMap,
    ctx.customers,
    ctx.subscriptions,
    ctx.bottles,
    assetPricingMap,
    defaultUnitRateByPeriod,
    organization?.id,
    customerResolvers,
  ]);

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

  const leaseCustomerIds = useMemo(() => {
    const ids = new Set();
    for (const r of (legacyRows || [])) {
      if (r.legacySource === 'lease_agreements') {
        const k = normalize(r.customer_id);
        if (k) ids.add(k);
      }
    }
    for (const c of (ctx.leaseContracts || [])) {
      const k = normalize(c.customer_id);
      if (k) ids.add(k);
    }
    for (const row of enriched) {
      if (row.customer?.billing_mode === 'lease') {
        const k = normalize(row.customer_id);
        if (k) ids.add(k);
      }
    }
    return ids;
  }, [legacyRows, ctx.leaseContracts, enriched]);

  const isLeaseRow = useCallback((row) => {
    if (row.legacySource === 'lease_agreements') return true;
    if (row.customer?.billing_mode === 'lease') return true;
    const k = normalize(row.customer_id);
    if (k && leaseCustomerIds.has(k)) return true;
    return false;
  }, [leaseCustomerIds]);

  const tabRowCounts = useMemo(() => {
    const isNotTerminalRow = (s) => {
      const st = String(s.status || '').toLowerCase();
      return st !== 'cancelled' && st !== 'expired';
    };
    return {
      monthly: allRows.filter(
        (s) => !isLeaseRow(s) && isNotTerminalRow(s)
      ).length,
      lease: allRows.filter(
        (s) => s.legacySource === 'lease_agreements' && isNotTerminalRow(s)
      ).length,
      cancelled: allRows.filter((s) => s.status === 'cancelled').length,
    };
  }, [allRows, isLeaseRow]);

  const termsCounts = useMemo(() => {
    const counts = { net30: 0, credit_card: 0, other: 0 };
    for (const row of allRows) {
      const t = String(row.customer?.payment_terms || '').trim().toLowerCase();
      if (t.includes('net') && t.includes('30')) counts.net30 += 1;
      else if (isCreditCardPaymentTerm(t)) counts.credit_card += 1;
      else counts.other += 1;
    }
    return counts;
  }, [allRows]);

  const filtered = useMemo(() => {
    let list = allRows;
    const filter = tabFilters[tab];
    const isNotTerminal = (s) => {
      const st = String(s.status || '').toLowerCase();
      return st !== 'cancelled' && st !== 'expired';
    };
    if (filter === 'monthly') {
      list = list.filter(
        (s) => !isLeaseRow(s) && isNotTerminal(s)
      );
    } else if (filter === 'lease') {
      list = list.filter(
        (s) => s.legacySource === 'lease_agreements' && isNotTerminal(s)
      );
    } else if (filter === 'cancelled') list = list.filter((s) => s.status === 'cancelled');

    if (termsFilter !== 'all') {
      list = list.filter((s) => {
        const terms = String(s.customer?.payment_terms || '').trim().toLowerCase();
        if (termsFilter === 'net30') return terms.includes('net') && terms.includes('30');
        if (termsFilter === 'credit_card') return isCreditCardPaymentTerm(terms);
        if (termsFilter === 'other') {
          if (!terms) return true;
          const isNet30 = terms.includes('net') && terms.includes('30');
          const isCreditCard = isCreditCardPaymentTerm(terms);
          return !isNet30 && !isCreditCard;
        }
        return true;
      });
    }

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter((s) => {
        const name = s.customer?.name || s.customer?.Name || s.customer_id || '';
        const haystack = [name, String(s.customer_id || ''), String(s.notes || ''), String(s.customer?.payment_terms || '')].join(' ').toLowerCase();
        return haystack.includes(q) || String(s.billing_period || '').toLowerCase().includes(q);
      });
    }
    return list;
  }, [allRows, tab, debouncedSearch, termsFilter, isLeaseRow]);

  const pagedFiltered = useMemo(() => {
    const start = tablePage * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, tablePage, rowsPerPage]);

  useEffect(() => {
    setTablePage(0);
  }, [tab, termsFilter, debouncedSearch]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filtered.length / rowsPerPage) - 1);
    if (tablePage > maxPage) setTablePage(maxPage);
  }, [filtered.length, rowsPerPage, tablePage]);

  useEffect(() => {
    let active = true;
    const loadCycleInvoiceStatus = async () => {
      if (!organization?.id) {
        if (active) setCycleInvoiceByCustomer({});
        return;
      }
      const customerIds = [...new Set(
        (allRows || [])
          .map((r) => String(r.customer_id || '').trim())
          .filter(Boolean)
      )];
      if (customerIds.length === 0) {
        if (active) setCycleInvoiceByCustomer({});
        return;
      }
      const { periodStart, periodEnd } = getCurrentCycleRange();
      const { data } = await supabase
        .from('invoices')
        .select('customer_id, invoice_number, status, updated_at')
        .eq('organization_id', organization.id)
        .eq('period_start', periodStart)
        .eq('period_end', periodEnd)
        .in('customer_id', customerIds);
      if (!active) return;
      const map = {};
      for (const row of (data || [])) {
        const key = String(row.customer_id || '').trim();
        if (!key) continue;
        map[key] = {
          invoice_number: row.invoice_number,
          status: String(row.status || '').toLowerCase(),
          updated_at: row.updated_at || null,
        };
      }

      const mergeCycleEntry = (prev, incoming) => {
        if (!prev) return incoming;
        const pSent = prev.status === 'sent';
        const iSent = incoming.status === 'sent';
        if (iSent) return incoming;
        if (pSent) return prev;
        const pt = new Date(prev.updated_at || 0).getTime();
        const it = new Date(incoming.updated_at || 0).getTime();
        return it >= pt ? incoming : prev;
      };

      const subscriptionIds = [
        ...new Set(
          (allRows || [])
            .filter((r) => !r.isVirtual && r.id && !String(r.id).startsWith('legacy-') && !String(r.id).startsWith('virtual-'))
            .map((r) => r.id)
            .filter(Boolean)
        ),
      ];
      if (subscriptionIds.length > 0) {
        const { data: subInvRows } = await supabase
          .from('subscription_invoices')
          .select('customer_id, invoice_number, status, updated_at, period_start, period_end')
          .eq('organization_id', organization.id)
          .in('subscription_id', subscriptionIds)
          .eq('period_start', periodStart)
          .eq('period_end', periodEnd);
        if (!active) return;
        for (const row of (subInvRows || [])) {
          const key = String(row.customer_id || '').trim();
          if (!key) continue;
          const incoming = {
            invoice_number: row.invoice_number,
            status: String(row.status || '').toLowerCase(),
            updated_at: row.updated_at || null,
          };
          map[key] = mergeCycleEntry(map[key], incoming);
        }
      }

      setCycleInvoiceByCustomer(map);
    };
    loadCycleInvoiceStatus().catch(() => {
      if (active) setCycleInvoiceByCustomer({});
    });
    return () => { active = false; };
  }, [organization?.id, allRows, getCurrentCycleRange]);

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

      // Legacy `invoices` rows for virtual rentals (not subscription_invoices).
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
        const { periodStart, periodEnd, dueDate } = getCurrentCycleRange();
        const today = new Date();
        const invoiceDate = today.toISOString().split('T')[0];

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
          for (const row of filteredInvoiceableRows) {
            const basePayload = {
              organization_id: organization.id,
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
            };
            let inserted = false;
            let lastErr = null;
            for (let i = 0; i < 3; i++) {
              const reserved = await getNextInvoiceNumbers(organization.id, 1);
              const invoiceNumber = reserved?.[0];
              if (!invoiceNumber) {
                throw new Error('Failed to reserve a unique invoice number. Please retry.');
              }
              const payload = { ...basePayload, invoice_number: invoiceNumber };
              const { error: insErr } = await supabase.from('invoices').insert(payload);
              if (!insErr) {
                inserted = true;
                break;
              }
              lastErr = insErr;
              const isDuplicateInvoiceNumber =
                String(insErr?.code || '') === '23505'
                && String(insErr?.message || '').includes('invoices_org_invoice_number_unique');
              if (!isDuplicateInvoiceNumber) throw insErr;
            }
            if (!inserted && lastErr) throw lastErr;
            legacyCreated += 1;
          }
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
        parts.push(`Generated ${subscriptionCreated} rental invoice${subscriptionCreated === 1 ? '' : 's'}`);
      }
      if (legacyCreated > 0) {
        parts.push(`created ${legacyCreated} invoice${legacyCreated === 1 ? '' : 's'} from rentals`);
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
      const gst = +(subtotal * 0.05).toFixed(2);
      const pst = +(subtotal * 0.06).toFixed(2);
      const tax = +(gst + pst).toFixed(2);
      const total = +(subtotal + tax).toFixed(2);
      return {
        'Invoice#': `W${String(startNumber + idx).padStart(5, '0')}`,
        'Customer Number': row.customer_id || '',
        'Total': total,
        'Date': invoiceDate,
        'GST': gst,
        'PST': pst,
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

  const handleExportQbInvoiceCsv = (period, cohort = 'all') => {
    setActionError(null);
    setActionSuccess(null);
    const base = getActiveExportRows();
    let rows = base.filter((r) => String(r.billing_period || 'monthly').toLowerCase() === period);
    if (period === 'monthly' && cohort !== 'all') {
      rows = rows.filter((r) => rowMatchesMonthlyQbCohort(r, cohort));
    }
    if (rows.length === 0) {
      const cohortHint =
        period === 'monthly' && cohort === 'net30'
          ? ' (NET 30 terms only — check customer payment terms on import)'
          : period === 'monthly' && cohort === 'credit_card'
            ? ' (credit card terms, including COD aliases)'
            : '';
      setActionError(`No active ${period} rentals match this export${cohortHint}.`);
      return;
    }
    const cohortSuffix =
      period === 'monthly' && cohort === 'net30'
        ? '_net30'
        : period === 'monthly' && cohort === 'credit_card'
          ? '_creditcard'
          : '';
    const exported = downloadInvoiceCsv(rows, { filePrefix: `quickbooks_invoices_${period}${cohortSuffix}` });
    const cohortLabel =
      period === 'monthly' && cohort === 'net30'
        ? ', NET 30 customers only'
        : period === 'monthly' && cohort === 'credit_card'
          ? ', credit card customers only (includes COD)'
          : '';
    setActionSuccess(`Exported ${exported} QuickBooks CSV row${exported === 1 ? '' : 's'} (${period}${cohortLabel}).`);
  };

  const ensureVirtualInvoiceNumber = useCallback(async (row) => {
    const { periodStart, periodEnd, dueDate } = getCurrentCycleRange();
    const today = new Date();
    const invoiceDate = today.toISOString().split('T')[0];
    const total = parseFloat(row?.totalPerCycle) || 0;
    const gstAmt = +(total * 0.05).toFixed(2);
    const pstAmt = +(total * 0.06).toFixed(2);
    const taxAmount = +(gstAmt + pstAmt).toFixed(2);
    const totalAmount = +(total + taxAmount).toFixed(2);

    const { data: existing } = await supabase
      .from('invoices')
      .select('id, invoice_number')
      .eq('organization_id', organization.id)
      .eq('customer_id', row.customer_id)
      .eq('period_start', periodStart)
      .eq('period_end', periodEnd)
      .limit(1)
      .maybeSingle();
    if (existing?.invoice_number) return existing.invoice_number;

    const basePayload = {
      organization_id: organization.id,
      customer_id: row.customer_id,
      customer_name: row.customer?.name || row.customer?.Name || row.customer_id,
      period_start: periodStart,
      period_end: periodEnd,
      invoice_date: invoiceDate,
      due_date: dueDate,
      subtotal: total,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      status: 'pending',
    };
    let invoiceNumber = null;
    let lastErr = null;
    for (let i = 0; i < 3; i++) {
      const reserved = await getNextInvoiceNumbers(organization.id, 1);
      invoiceNumber = reserved?.[0];
      if (!invoiceNumber) {
        throw new Error('Failed to reserve a unique invoice number. Please retry.');
      }
      const payload = { ...basePayload, invoice_number: invoiceNumber };
      const { error } = await supabase.from('invoices').insert(payload);
      if (!error) {
        lastErr = null;
        break;
      }
      lastErr = error;
      const isDuplicateInvoiceNumber =
        String(error?.code || '') === '23505'
        && String(error?.message || '').includes('invoices_org_invoice_number_unique');
      if (!isDuplicateInvoiceNumber) throw error;
    }
    if (lastErr) throw lastErr;
    return invoiceNumber;
  }, [organization?.id, getCurrentCycleRange]);

  /** Same invoice # for PDF download, email, and bulk email (virtual rows use persisted `invoices` via ensureVirtual). */
  const resolveRentalInvoiceNumberForActions = useCallback(
    async (sub) => {
      if (sub?.isVirtual) {
        return ensureVirtualInvoiceNumber(sub);
      }
      const { periodStart, periodEnd } = getPdfBillingPeriodForSub(sub);
      let invNo = String(sub?.invoice_number || '').trim();
      if (invNo) return invNo;
      invNo = await resolveInvoiceNumberForRentalPdf(
        supabase,
        organization.id,
        sub,
        periodStart,
        periodEnd
      );
      if (invNo) return invNo;
      return defaultInvoiceNumber(sub);
    },
    [ensureVirtualInvoiceNumber, getPdfBillingPeriodForSub, organization?.id]
  );

  const getLineItemsForRow = useCallback((row) => {
    if (row?.productCounts && Object.keys(row.productCounts).length > 0) {
      const periodFallback = row.billing_period === 'yearly'
        ? defaultUnitRateByPeriod.yearly
        : defaultUnitRateByPeriod.monthly;
      return Object.entries(row.productCounts).map(([code, qtyRaw]) => {
        const qty = parseFloat(qtyRaw) || 0;
        const displayLabel = code === '__unclassified__' ? 'Unclassified' : (code || 'Asset');
        const unitRaw = resolveDisplayUnitPrice(row, { product_code: code, description: displayLabel });
        const unit = Number.isFinite(unitRaw) && unitRaw > 0 ? unitRaw : periodFallback;
        return { description: displayLabel, qty, unit, amount: unit * qty };
      });
    }
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
    const qty = parseFloat(row?.itemCount) || 1;
    const amount = parseFloat(row?.totalPerCycle) || 0;
    return [{
      description: `Rental charges (${String(row?.billing_period || 'monthly')})`,
      qty,
      unit: qty > 0 ? amount / qty : amount,
      amount,
    }];
  }, [defaultUnitRateByPeriod, resolveDisplayUnitPrice]);

  const buildInvoicePdfForRow = useCallback(async (row, invoiceNumberOverride = null) => {
    const normPeriodDay = (v) => {
      const s = String(v || '').trim().slice(0, 10);
      return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
    };
    const subStart = normPeriodDay(row?.current_period_start);
    const subEnd = normPeriodDay(row?.current_period_end);
    const fallback = getCurrentCycleRange();
    const isYearly = String(row?.billing_period || '').toLowerCase() === 'yearly';
    const periodStart =
      isYearly && subStart && subEnd && subStart <= subEnd ? subStart : fallback.periodStart;
    const periodEnd =
      isYearly && subStart && subEnd && subStart <= subEnd ? subEnd : fallback.periodEnd;
    const invoiceDate = periodEnd;
    const dueDate = fallback.dueDate;

    const customerRecord =
      matchCustomerRecordBySubscriptionId(row.customer_id) ||
      row?.customer ||
      {
        CustomerListID: row.customer_id,
        id: row.customer_id,
        name: row.customer_name || row.customer_id,
        Name: row.customer_name,
      };

    let lineItems = getLineItemsForRow(row);
    let hasDetail =
      (Array.isArray(row?.items) && row.items.length > 0) ||
      (row?.productCounts && Object.keys(row.productCounts || {}).length > 0);

    let rentalsForSnapshot = ctx.rentals || [];
    const billingMode = String(customerRecord?.billing_mode || '').toLowerCase();
    if (billingMode !== 'lease') {
      try {
        const { data: orgRentals, error: rErr } = await supabase
          .from('rentals')
          .select('*')
          .eq('organization_id', organization.id);
        if (!rErr && orgRentals?.length) {
          rentalsForSnapshot = orgRentals;
          const subscriptionMatchKey =
            String(
              row.customer_id ||
                customerRecord?.CustomerListID ||
                customerRecord?.id ||
                customerRecord?.name ||
                customerRecord?.Name ||
                ''
            ).trim() || row.customer_id;
          const groups = groupBillableUnitCountsByProductCode(
            ctx.bottles || [],
            orgRentals,
            subscriptionMatchKey,
            customerRecord,
            {
              allCustomers: ctx.customers || [],
              asOfPeriodEnd: periodEnd,
              allowAssignedBottleRecovery: true,
            }
          );
          if (groups.length > 0) {
            const periodFallback =
              row.billing_period === 'yearly'
                ? defaultUnitRateByPeriod.yearly
                : defaultUnitRateByPeriod.monthly;
            lineItems = groups
              .filter((g) => g.count > 0)
              .map(({ productCode, count }) => {
                const code = productCode || '__unclassified__';
                const displayLabel = code === '__unclassified__' ? 'Unclassified' : code;
                const qty = count;
                const unitRaw = resolveDisplayUnitPrice(row, { product_code: code, description: displayLabel });
                const unit = Number.isFinite(unitRaw) && unitRaw > 0 ? unitRaw : periodFallback;
                return {
                  description: displayLabel,
                  product_code: code,
                  qty,
                  unit,
                  amount: unit * qty,
                };
              });
            hasDetail = lineItems.length > 0;
          }
        }
      } catch (e) {
        console.warn('Invoice PDF: could not load rentals for period snapshot', e);
      }
    }

    const lineSum = lineItems.reduce((s, li) => s + (Number(li.amount) || 0), 0);
    const total = hasDetail && lineSum > 0 ? lineSum : (parseFloat(row.totalPerCycle) || 0);
    const gstRate = 0.05;
    const pstRate = 0.06;
    const gst = +(total * gstRate).toFixed(2);
    const pst = +(total * pstRate).toFixed(2);
    const tax = +(gst + pst).toFixed(2);
    const taxRate = +(gstRate + pstRate).toFixed(2);
    const grandTotal = +(total + tax).toFixed(2);
    let openAssets = buildOpenAssetRowsForInvoice(row, ctx.bottles, rentalsForSnapshot, {
      asOfPeriodEnd: periodEnd,
    });
    if (Array.isArray(row?.bottleIdentifiers) && row.bottleIdentifiers.length > 0) {
      const legacyExtras = row.bottleIdentifiers.map((label, idx) => ({
        id: `legacy-${idx}`,
        display_label: label,
        description: label,
        rental_class: 'Industrial Cylinders',
        rental_start_date: null,
        delivery_date: null,
        barcode_number: label,
        _invoiceStatus: 'On hand',
      }));
      openAssets = [...legacyExtras, ...openAssets];
    }
    let returnsInPeriod = [];
    try {
      returnsInPeriod = await fetchReturnsInInvoicePeriod(supabase, organization.id, row, periodStart, periodEnd);
    } catch (e) {
      console.warn('Invoice PDF: could not load returns in period', e);
    }
    const bottlesForPdf = openAssets.map((b) => (b.display_label ? { ...b, description: b.display_label } : b));
    const mergedTemplate = { ...invoiceTemplate };
    if (remitAddress?.remit_name) mergedTemplate.remit_name = remitAddress.remit_name;
    if (remitAddress?.remit_address_line1) mergedTemplate.remit_address_line1 = remitAddress.remit_address_line1;
    if (remitAddress?.remit_address_line2) mergedTemplate.remit_address_line2 = remitAddress.remit_address_line2;
    if (remitAddress?.remit_address_line3) mergedTemplate.remit_address_line3 = remitAddress.remit_address_line3;
    if (remitAddress?.gst_number) mergedTemplate.gst_number = remitAddress.gst_number;
    return createRentalInvoicePdfDoc({
      organization,
      invoiceTemplate: mergedTemplate,
      primaryColorFallback: primaryColor,
      row,
      customerRecord,
      lineItems,
      invoiceNumber: invoiceNumberOverride || row?.invoice_number || 'W00000',
      totals: { subtotal: total, gst, pst, tax, amountDue: grandTotal, gstRate, pstRate, taxRate },
      period: { start: periodStart, end: periodEnd },
      dates: { invoice: invoiceDate, due: dueDate },
      terms: customerRecord?.payment_terms || 'NET 30',
      bottles: bottlesForPdf,
      returnsInPeriod,
      formatCurrency,
    });
  }, [
    getLineItemsForRow,
    getCurrentCycleRange,
    matchCustomerRecordBySubscriptionId,
    ctx.bottles,
    ctx.rentals,
    ctx.customers,
    organization,
    invoiceTemplate,
    primaryColor,
    defaultUnitRateByPeriod,
    resolveDisplayUnitPrice,
  ]);

  const handleDownloadInvoicePdfForRow = useCallback(async (sub) => {
    const total = parseFloat(sub.totalPerCycle) || 0;
    if (total <= 0) {
      setActionError('Cannot download a $0.00 invoice PDF.');
      return;
    }
    try {
      const invNo = await resolveRentalInvoiceNumberForActions(sub);
      const { doc, fileName, customerName } = await buildInvoicePdfForRow(sub, invNo);
      doc.save(fileName);
      setActionSuccess(`Invoice PDF downloaded for ${customerName}.`);
    } catch (err) {
      setActionError(err.message || 'Failed to generate invoice PDF.');
    }
  }, [buildInvoicePdfForRow, organization?.id, resolveRentalInvoiceNumberForActions]);

  const openEmailDialogForRow = async (sub) => {
    setActionError(null);
    setActionSuccess(null);
    try {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('invoice_emails, default_invoice_email, email')
        .eq('id', organization.id)
        .single();

      const { data: sessionData } = await supabase.auth.getSession();
      const sessionEmail = sessionData?.session?.user?.email?.trim() || '';
      const profileEmail = profile?.email?.trim() || '';
      const loggedInEmail =
        sessionEmail || profileEmail || user?.email?.trim() || '';

      const emails = new Set();
      if (loggedInEmail) emails.add(loggedInEmail);
      (orgData?.invoice_emails || []).forEach((e) => e && emails.add(e));
      if (orgData?.email) emails.add(orgData.email);

      const unique = Array.from(emails);
      const options = loggedInEmail
        ? [loggedInEmail, ...unique.filter((e) => e && e !== loggedInEmail)]
        : unique;
      const defaultFrom =
        loggedInEmail || orgData?.default_invoice_email || options[0] || '';
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
      const orgName = organization?.name || 'your organization';
      const orgWebsite = organization?.website || '';

      const total = parseFloat(sub.totalPerCycle) || 0;
      const gst = +(total * 0.05).toFixed(2);
      const pst = +(total * 0.06).toFixed(2);
      const amountDue = +(total + gst + pst).toFixed(2);
      const invNo = await resolveRentalInvoiceNumberForActions(sub);
      const formattedAmount = amountDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const savedEmailTemplate = loadEmailTemplateSettings();
      const renderedSignature = String(savedEmailTemplate?.signature || defaultTemplateSignature)
        .replace(/\{organization_name\}/gi, orgName)
        .replace(/\{organization_website\}/gi, orgWebsite);

      let defaultMessage = savedEmailTemplate?.body
        ? savedEmailTemplate.body
            .replace(/\{invoice_number\}/gi, invNo)
            .replace(/\{amount\}/gi, `$${formattedAmount}`)
            .replace(/\{customer_name\}/gi, customerName)
            .replace(/\{organization_name\}/gi, orgName)
            .replace(/\{organization_website\}/gi, orgWebsite)
        : `Your invoice ${invNo} for $${formattedAmount} is attached.\n\n${orgName} accepts the following payment methods: Cheque, EFT transfers, Interac E-Transfer, MasterCard, & VISA. E-transfers can be sent to ${defaultFrom}.\n\nCredit Card payments will be charged a 2.4% service fee.\n\nFor any billing or invoice inquiries, please reply to this email.\nThank you very much for your business.\n\n\nSincerely,\n${orgName}${orgWebsite ? `\n\n${orgWebsite}` : ''}`;
      if (savedEmailTemplate?.body && !defaultMessage.includes(invNo)) {
        defaultMessage = `Invoice ${invNo}\n\n${defaultMessage}`;
      }
      defaultMessage = ensureInvoiceContext(defaultMessage, invNo, formattedAmount);
      defaultMessage = withGlobalSignature(defaultMessage, renderedSignature);

      const defaultSubject = savedEmailTemplate?.subject
        ? savedEmailTemplate.subject
            .replace(/\{invoice_number\}/gi, invNo)
            .replace(/\{amount\}/gi, `$${formattedAmount}`)
            .replace(/\{customer_name\}/gi, customerName)
            .replace(/\{organization_name\}/gi, orgName)
            .replace(/\{organization_website\}/gi, orgWebsite)
        : `Invoice ${invNo} – ${customerName} – ${orgName}`;

      setSenderOptions(options);
      setEmailRow({ ...sub, invoice_number: invNo });
      setEmailInitialForm({
        to: customerEmail,
        from: defaultFrom,
        subject: defaultSubject,
        message: defaultMessage,
      });
      setEmailOpen(true);
    } catch (err) {
      setActionError(err.message || 'Unable to open email dialog.');
    }
  };

  const handleSendInvoiceEmail = useCallback(async (formFromDialog) => {
    if (!emailRow) return;
    if (!formFromDialog.to || !formFromDialog.from) {
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
      const invNo = emailRow.invoice_number || 'W00000';
      const { doc, customerName } = await buildInvoicePdfForRow(emailRow, invNo);
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      const pdfFileName = `Invoice_${String(customerName).replace(/[^\w\-]+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      const amountDue = +(total + total * 0.05 + total * 0.06).toFixed(2);
      const formattedAmount = amountDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const savedEmailTemplate = loadEmailTemplateSettings();
      const renderedSignature = String(savedEmailTemplate?.signature || defaultTemplateSignature)
        .replace(/\{organization_name\}/gi, organization?.name || 'your organization')
        .replace(/\{organization_website\}/gi, organization?.website || '');
      const withInvoiceContext = ensureInvoiceContext(formFromDialog.message || '', invNo, formattedAmount);
      const finalMessage = withGlobalSignature(withInvoiceContext, renderedSignature);
      const bodyHtml = finalMessage.replace(/\n/g, '<br/>');
      const response = await fetch('/.netlify/functions/send-invoice-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: formFromDialog.to,
          from: formFromDialog.from,
          senderName: profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || '',
          subject: formFromDialog.subject,
          body: bodyHtml,
          pdfBase64,
          pdfFileName,
          invoiceNumber: invNo,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || payload?.details || `Email failed (${response.status})`);
      }
      if (emailRow?.isVirtual && emailRow?.customer_id) {
        const { periodStart, periodEnd } = getCurrentCycleRange();
        await supabase
          .from('invoices')
          .update({ status: 'sent', updated_at: new Date().toISOString() })
          .eq('organization_id', organization.id)
          .eq('customer_id', emailRow.customer_id)
          .eq('period_start', periodStart)
          .eq('period_end', periodEnd)
          .eq('invoice_number', invNo);
        setCycleInvoiceByCustomer((prev) => ({
          ...prev,
          [String(emailRow.customer_id).trim()]: {
            invoice_number: invNo,
            status: 'sent',
            updated_at: new Date().toISOString(),
          },
        }));
      } else if (emailRow?.id && !emailRow.isVirtual) {
        const { data: latestSi } = await supabase
          .from('subscription_invoices')
          .select('id')
          .eq('organization_id', organization.id)
          .eq('subscription_id', emailRow.id)
          .order('created_at', { ascending: false })
          .limit(1);
        const siId = latestSi?.[0]?.id;
        if (siId) {
          await supabase
            .from('subscription_invoices')
            .update({
              status: 'sent',
              invoice_number: invNo,
              updated_at: new Date().toISOString(),
            })
            .eq('id', siId);
        }
        const cid = String(emailRow.customer_id || '').trim();
        if (cid) {
          setCycleInvoiceByCustomer((prev) => ({
            ...prev,
            [cid]: {
              invoice_number: invNo,
              status: 'sent',
              updated_at: new Date().toISOString(),
            },
          }));
        }
      }
      setActionSuccess(`Invoice emailed to ${formFromDialog.to}.`);
      setEmailOpen(false);
      setEmailRow(null);
    } catch (err) {
      setActionError(err.message || 'Failed to send invoice email.');
    } finally {
      setEmailing(false);
    }
  }, [emailRow, buildInvoicePdfForRow, profile, user, organization?.name, organization?.website, organization?.id, loadEmailTemplateSettings, withGlobalSignature, ensureInvoiceContext, getCurrentCycleRange]);

  const handleBulkEmailInvoices = useCallback(async () => {
    const rows = filtered.filter((r) => r.status === 'active' && (parseFloat(r.totalPerCycle) || 0) > 0);
    if (rows.length === 0) {
      setActionError('No invoiceable rentals in the current view.');
      return;
    }
    setBulkEmailing(true);
    setBulkEmailProgress({ sent: 0, total: rows.length, failed: 0 });
    setActionError(null);
    setActionSuccess(null);

    let defaultFrom = '';
    const orgName = organization?.name || 'your organization';
    const orgWebsite = organization?.website || '';
    try {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('invoice_emails, default_invoice_email, email')
        .eq('id', organization.id)
        .single();
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionEmail = sessionData?.session?.user?.email?.trim() || '';
      const profileEmail = profile?.email?.trim() || '';
      defaultFrom = sessionEmail || profileEmail || user?.email?.trim() || orgData?.default_invoice_email || orgData?.email || '';
    } catch {
      defaultFrom = profile?.email?.trim() || user?.email?.trim() || '';
    }

    const savedEmailTemplate = loadEmailTemplateSettings();

    let sent = 0;
    let failed = 0;
    for (const row of rows) {
      try {
        let customerEmail = row.customer?.email || row.customer?.Email || row.customer?.email_address || '';
        if (!customerEmail) {
          const cid = String(row.customer_id || '').trim();
          if (cid) {
            const { data: byList } = await supabase
              .from('customers').select('email').eq('organization_id', organization.id).eq('CustomerListID', cid).maybeSingle();
            customerEmail = byList?.email?.trim() || '';
            if (!customerEmail) {
              const { data: byId } = await supabase
                .from('customers').select('email').eq('organization_id', organization.id).eq('id', cid).maybeSingle();
              customerEmail = byId?.email?.trim() || '';
            }
          }
        }
        if (!customerEmail) {
          failed += 1;
          setBulkEmailProgress((p) => ({ ...p, failed: p.failed + 1 }));
          continue;
        }

        const invNo = await resolveRentalInvoiceNumberForActions(row);
        const customerName = row.customer?.name || row.customer?.Name || row.customer_id || 'Customer';
        const total = parseFloat(row.totalPerCycle) || 0;
        const amountDue = +(total + total * 0.05 + total * 0.06).toFixed(2);
        const formattedAmount = amountDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        let msgBody = savedEmailTemplate?.body
          ? savedEmailTemplate.body
              .replace(/\{invoice_number\}/gi, invNo)
              .replace(/\{amount\}/gi, `$${formattedAmount}`)
              .replace(/\{customer_name\}/gi, customerName)
              .replace(/\{organization_name\}/gi, orgName)
              .replace(/\{organization_website\}/gi, orgWebsite)
          : `Your invoice ${invNo} for $${formattedAmount} is attached.\n\n${orgName} accepts the following payment methods: Cheque, EFT transfers, Interac E-Transfer, MasterCard, & VISA. E-transfers can be sent to ${defaultFrom}.\n\nCredit Card payments will be charged a 2.4% service fee.\n\nFor any billing or invoice inquiries, please reply to this email.\nThank you very much for your business.\n\n\nSincerely,\n${orgName}${orgWebsite ? `\n\n${orgWebsite}` : ''}`;
        if (savedEmailTemplate?.body && !msgBody.includes(invNo)) {
          msgBody = `Invoice ${invNo}\n\n${msgBody}`;
        }
        msgBody = ensureInvoiceContext(msgBody, invNo, formattedAmount);
        const renderedSignature = String(savedEmailTemplate?.signature || defaultTemplateSignature)
          .replace(/\{organization_name\}/gi, orgName)
          .replace(/\{organization_website\}/gi, orgWebsite);
        msgBody = withGlobalSignature(msgBody, renderedSignature);
        const subject = savedEmailTemplate?.subject
          ? savedEmailTemplate.subject
              .replace(/\{invoice_number\}/gi, invNo)
              .replace(/\{amount\}/gi, `$${formattedAmount}`)
              .replace(/\{customer_name\}/gi, customerName)
              .replace(/\{organization_name\}/gi, orgName)
              .replace(/\{organization_website\}/gi, orgWebsite)
          : `Invoice ${invNo} – ${customerName} – ${orgName}`;

        const { doc, customerName: cn } = await buildInvoicePdfForRow(row, invNo);
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        const pdfFileName = `Invoice_${String(cn || customerName).replace(/[^\w\-]+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        const bodyHtml = msgBody.replace(/\n/g, '<br/>');

        const response = await fetch('/.netlify/functions/send-invoice-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: customerEmail,
            from: defaultFrom,
            senderName: profile?.full_name || user?.user_metadata?.full_name || '',
            subject,
            body: bodyHtml,
            pdfBase64,
            pdfFileName,
            invoiceNumber: invNo,
          }),
        });
        if (!response.ok) {
          failed += 1;
          setBulkEmailProgress((p) => ({ ...p, failed: p.failed + 1 }));
        } else {
          sent += 1;
          setBulkEmailProgress((p) => ({ ...p, sent: p.sent + 1 }));
          try {
            if (row.isVirtual && row.customer_id) {
              const { periodStart, periodEnd } = getCurrentCycleRange();
              await supabase
                .from('invoices')
                .update({ status: 'sent', updated_at: new Date().toISOString() })
                .eq('organization_id', organization.id)
                .eq('customer_id', row.customer_id)
                .eq('period_start', periodStart)
                .eq('period_end', periodEnd)
                .eq('invoice_number', invNo);
            } else if (row.id && !row.isVirtual) {
              const { data: latestSi } = await supabase
                .from('subscription_invoices')
                .select('id')
                .eq('organization_id', organization.id)
                .eq('subscription_id', row.id)
                .order('created_at', { ascending: false })
                .limit(1);
              const siId = latestSi?.[0]?.id;
              if (siId) {
                await supabase
                  .from('subscription_invoices')
                  .update({
                    status: 'sent',
                    invoice_number: invNo,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', siId);
              }
            }
            const cid = String(row.customer_id || '').trim();
            if (cid) {
              setCycleInvoiceByCustomer((prev) => ({
                ...prev,
                [cid]: {
                  invoice_number: invNo,
                  status: 'sent',
                  updated_at: new Date().toISOString(),
                },
              }));
            }
          } catch {
            /* status update best-effort; email already sent */
          }
        }
      } catch {
        failed += 1;
        setBulkEmailProgress((p) => ({ ...p, failed: p.failed + 1 }));
      }
    }

    setBulkEmailing(false);
    if (failed > 0) {
      setActionError(`Sent ${sent}/${rows.length} invoices. ${failed} skipped (no email on file or send error).`);
    } else {
      setActionSuccess(`Sent ${sent}/${rows.length} invoices successfully.`);
    }
  }, [filtered, buildInvoicePdfForRow, organization, profile, user, loadEmailTemplateSettings, withGlobalSignature, ensureInvoiceContext, resolveRentalInvoiceNumberForActions]);

  const headerCards = useMemo(() => [
    { label: 'Active Rentals', value: activeRentalCount, icon: <People />, color: '#10B981' },
    { label: 'Active Assets', value: activeRentalAssetCount, icon: <People />, color: '#0EA5E9' },
    { label: 'Outstanding', value: formatCurrency(ctx.outstandingBalance), icon: <AccountBalance />, color: ctx.outstandingBalance > 0 ? '#EF4444' : '#10B981' },
    { label: 'Next Billing', value: derivedNextBilling ? formatDate(derivedNextBilling) : '—', icon: <Schedule />, color: '#F59E0B' },
  ], [activeRentalCount, activeRentalAssetCount, ctx.outstandingBalance, derivedNextBilling]);

  if (ctx.loading) {
    return (
      <Box sx={{ p: 4 }}>
        <LinearProgress sx={{ borderRadius: 1 }} />
        <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>Loading rentals...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, minHeight: '100%' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>Rentals</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Manage customer rentals and billing
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
          <Tooltip title="Set default email subject, body, and signature in Settings">
            <Button
              size="small"
              variant="outlined"
              startIcon={<EditIcon sx={{ fontSize: 14 }} />}
              onClick={() => navigate('/settings?tab=invoice-template')}
              sx={{ borderRadius: 1.5, textTransform: 'none', fontSize: '0.75rem', px: 1, py: 0.25, minWidth: 0 }}
            >
              Email Template
            </Button>
          </Tooltip>
          <Tooltip title="Filter by payment terms on the customer record (import or Customer detail). NET 30 = terms containing net and 30. Credit card = Visa, Mastercard, Amex, credit card, COD, etc.">
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 118 }}>
                <InputLabel id="monthly-qb-cohort-label">Monthly</InputLabel>
                <Select
                  labelId="monthly-qb-cohort-label"
                  label="Monthly"
                  value={monthlyQbCohort}
                  onChange={(e) => setMonthlyQbCohort(e.target.value)}
                  sx={{ borderRadius: 1.5, fontSize: '0.75rem', '& .MuiSelect-select': { py: 0.5 } }}
                >
                  <MenuItem value="all">All customers</MenuItem>
                  <MenuItem value="net30">NET 30 only</MenuItem>
                  <MenuItem value="credit_card">Credit card only</MenuItem>
                </Select>
              </FormControl>
              <Button
                size="small"
                variant="outlined"
                onClick={() => handleExportQbInvoiceCsv('monthly', monthlyQbCohort)}
                startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
                sx={{ borderRadius: 1.5, textTransform: 'none', fontSize: '0.75rem', px: 1, py: 0.25, minWidth: 0 }}
              >
                QB CSV
              </Button>
            </Stack>
          </Tooltip>
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
            variant="outlined"
            onClick={handleBulkEmailInvoices}
            disabled={saving || bulkEmailing}
            startIcon={<EmailIcon sx={{ fontSize: 16 }} />}
            sx={{ borderRadius: 1.5, textTransform: 'none', fontSize: '0.75rem', px: 1, py: 0.25, minWidth: 0 }}
          >
            {bulkEmailing
              ? `Sending ${bulkEmailProgress.sent + bulkEmailProgress.failed}/${bulkEmailProgress.total}…`
              : 'Bulk Email'}
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
      {bulkEmailing && (
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Sending bulk invoices…</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {bulkEmailProgress.sent} sent · {bulkEmailProgress.failed} skipped · {bulkEmailProgress.total} total
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={bulkEmailProgress.total > 0 ? ((bulkEmailProgress.sent + bulkEmailProgress.failed) / bulkEmailProgress.total) * 100 : 0}
            sx={{ borderRadius: 1, height: 6 }}
          />
        </Box>
      )}

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
            <Tab label={`Monthly (${tabRowCounts.monthly})`} />
            <Tab label={`Lease Agreements (${tabRowCounts.lease})`} />
            <Tab label={`Cancelled (${tabRowCounts.cancelled})`} />
          </Tabs>
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ ml: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mr: 0.5 }}>Terms:</Typography>
            {[
              { key: 'all', label: 'All' },
              { key: 'net30', label: `NET 30 (${termsCounts.net30})` },
              { key: 'credit_card', label: `Credit Card (${termsCounts.credit_card})` },
              { key: 'other', label: `Other (${termsCounts.other})` },
            ].map((opt) => (
              <Chip
                key={opt.key}
                label={opt.label}
                size="small"
                variant={termsFilter === opt.key ? 'filled' : 'outlined'}
                color={termsFilter === opt.key ? 'primary' : 'default'}
                onClick={() => setTermsFilter(opt.key)}
                sx={{ fontWeight: 600, fontSize: '0.7rem', cursor: 'pointer' }}
              />
            ))}
          </Stack>
          <TextField
            size="small"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ ml: 'auto', minWidth: 240, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
          {tabFilters[tab] === 'lease' && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => navigate('/lease-agreements')}
              sx={{ borderRadius: 1.5, textTransform: 'none', fontSize: '0.75rem', px: 1.5, whiteSpace: 'nowrap' }}
            >
              Manage Lease Agreements
            </Button>
          )}
        </Box>

        <TableContainer
          sx={{
            transition: 'opacity 0.15s ease',
            opacity: search !== debouncedSearch ? 0.88 : 1,
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: 'text.secondary', letterSpacing: '0.05em' } }}>
                <TableCell>Customer</TableCell>
                <TableCell>Period</TableCell>
                <TableCell>Terms</TableCell>
                <TableCell align="center">Items</TableCell>
                <TableCell align="right">Total / Cycle</TableCell>
                <TableCell>Invoice #</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    {allRows.length === 0 ? (
                      'No rentals found yet.'
                    ) : (
                      <Stack spacing={1.25} alignItems="center" sx={{ maxWidth: 520, mx: 'auto' }}>
                        <Typography variant="body2">
                          No rows match this tab or search ({allRows.length} total in list).
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
                          Lease customers appear under the Lease Agreements tab. Try the All tab, or clear the search box.
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center">
                          {search.trim() !== '' && (
                            <Button size="small" variant="outlined" onClick={() => setSearch('')}>
                              Clear search
                            </Button>
                          )}
                          {tab !== 0 && (
                            <Button size="small" variant="outlined" onClick={() => setTab(0)}>
                              All ({allRows.length})
                            </Button>
                          )}
                          {tabRowCounts.lease > 0 && tab !== 2 && (
                            <Button size="small" variant="outlined" onClick={() => setTab(2)}>
                              Lease Agreements ({tabRowCounts.lease})
                            </Button>
                          )}
                          {tabRowCounts.monthly > 0 && tab !== 1 && (
                            <Button size="small" variant="outlined" onClick={() => setTab(1)}>
                              Monthly ({tabRowCounts.monthly})
                            </Button>
                          )}
                        </Stack>
                      </Stack>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                pagedFiltered.map((sub, pageIdx) => (
                  <TableRow
                    key={sub.id}
                    hover
                    sx={{ cursor: sub.isVirtual ? 'default' : 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    onClick={() => { if (!sub.isVirtual) navigate(`/rentals/${sub.id}`); }}
                  >
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{sub.customer?.name || sub.customer?.Name || sub.customer_id}</Typography>
                        {isLeaseRow(sub) && (
                          <Chip label="Lease" size="small" color="info" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }} />
                        )}
                      </Stack>
                      {sub.legacySource === 'lease_agreements' && sub.notes && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>{sub.notes}</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {sub.legacySource === 'lease_agreements' ? (
                        <Stack spacing={0.35} alignItems="flex-start">
                          <Chip label="Yearly" size="small" variant="outlined" sx={{ textTransform: 'capitalize', fontWeight: 600 }} />
                          {sub.lease_expiry_label && (
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, lineHeight: 1.35 }}>
                              {sub.lease_expiry_label}
                            </Typography>
                          )}
                        </Stack>
                      ) : (
                        <Chip label={sub.billing_period} size="small" variant="outlined" sx={{ textTransform: 'capitalize', fontWeight: 600 }} />
                      )}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const t = String(sub.customer?.payment_terms || '').trim();
                        if (!t) return <Typography variant="caption" sx={{ color: 'text.disabled' }}>—</Typography>;
                        const lower = t.toLowerCase();
                        const isCreditCard = isCreditCardPaymentTerm(lower);
                        const displayTerms = isCodPaymentTerm(lower) ? 'CREDIT CARD' : t.toUpperCase();
                        return (
                          <Chip
                            label={displayTerms}
                            size="small"
                            variant="outlined"
                            color={isCreditCard ? 'warning' : 'default'}
                            sx={{ fontWeight: 600, fontSize: '0.68rem' }}
                          />
                        );
                      })()}
                    </TableCell>
                    <TableCell align="center">{sub.itemCount}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>{formatCurrency(sub.totalPerCycle)}</TableCell>
                    <TableCell>
                      {(() => {
                        const cid = String(sub.customer_id || '').trim();
                        const cycleInv = cid ? cycleInvoiceByCustomer[cid] : null;
                        const invNo = String(cycleInv?.invoice_number || '').trim();
                        const st = String(cycleInv?.status || '').toLowerCase();
                        return (
                          <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap">
                            {invNo ? (
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{invNo}</Typography>
                            ) : (
                              <Typography variant="caption" sx={{ color: 'text.disabled' }}>No invoice row</Typography>
                            )}
                            {invNo && st === 'sent' && (
                              <Chip label="Emailed" size="small" color="success" sx={{ height: 20, fontSize: '0.65rem' }} />
                            )}
                            {invNo && st && st !== 'sent' && (
                              <Chip
                                label={st === 'draft' ? 'Draft' : st === 'paid' ? 'Paid' : st === 'pending' ? 'Pending' : st}
                                size="small"
                                variant="outlined"
                                sx={{ height: 20, fontSize: '0.65rem', textTransform: 'capitalize' }}
                              />
                            )}
                          </Stack>
                        );
                      })()}
                    </TableCell>
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
                        {isLeaseRow(sub) && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="info"
                            onClick={() => navigate('/lease-agreements')}
                            sx={{ textTransform: 'none', fontSize: '0.72rem' }}
                          >
                            View Lease
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
                              <IconButton size="small" onClick={() => navigate(`/rentals/${sub.id}`)}>
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
        {filtered.length > 0 && (
          <TablePagination
            component="div"
            count={filtered.length}
            page={tablePage}
            onPageChange={(_, nextPage) => setTablePage(nextPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setTablePage(0);
            }}
            rowsPerPageOptions={[25, 50, 100, 250]}
          />
        )}
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
      <EmailInvoiceDialog
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        onSend={handleSendInvoiceEmail}
        sending={emailing}
        emailRow={emailRow}
        senderOptions={senderOptions}
        initialForm={emailInitialForm}
        primaryColor={primaryColor}
      />
    </Box>
  );
}
