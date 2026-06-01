import React, { useState, useMemo, useEffect, useCallback, useRef, useImperativeHandle, forwardRef, memo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSubscriptions } from '../context/SubscriptionContext';
import { useTheme, resolveAccentToHex } from '../context/ThemeContext';
import { createSubscription, generateInvoice } from '../services/subscriptionService';
import { supabase } from '../supabase/client';
import { formatCurrency, formatDate, STATUS_COLORS } from '../utils/subscriptionUtils';
import { createRentalInvoicePdfDoc, defaultInvoiceNumber } from '../utils/rentalInvoicePdf';
import { getNextInvoiceNumbers, resolveInvoiceNumberForRentalPdf } from '../utils/invoiceUtils';
import {
  downloadQuickBooksInvoiceCsv,
  qbCsvInvoiceStorageKeys,
  QB_CSV_LAST_INV_MAP_KEY,
  resolveTaxCode,
} from '../utils/quickBooksInvoiceCsvDownload';
import {
  applyInvoiceEmailTemplateVars,
  buildRentalInvoiceEmailVarMap,
  mergePaymentMethodsIntoInvoiceEmailBody,
  stripRemitInstructionsFromInvoiceEmailBody,
} from '../utils/invoiceEmailTemplateVars';
import { logInvoiceEmailSend } from '../services/invoiceEmailHistory';
import {
  buildOpenAssetRowsForInvoice,
  fetchReturnsInInvoicePeriod,
  fetchAllReturnsInInvoicePeriodForOrg,
  invoiceReturnsCacheKey,
  rentalRowMatchesInvoiceCustomer,
} from '../utils/rentalInvoiceAssets';
import {
  buildAssetPricingMap,
  buildClassificationNodesById,
  buildCustomerOverrideMap,
  buildProductCodeClassificationMapFromBottles,
  collectNormalizedCustomerKeysForPricingRow,
  findAllProductsOverrideMultiKey,
  findBestSpecificOverrideMultiKey,
  normalizePricingKey,
  resolveDisplayUnitFromMaps,
  defaultUnitRatesFromAssetPricingTable,
  computeSubscriptionBillingCycleTotal,
} from '../utils/rentalDisplayPricing';
import {
  bottleProductCode,
  buildBottleLookupMaps,
  groupBillableUnitCountsByProductCode,
  isDnsRentalExcludedFromBillableCount,
  resolvedRentalProductCode,
} from '../services/billingFromAssets';
import {
  mergeOpenRentalsForBillingBasis,
  summarizeMergedOpenRentalsByProduct,
} from '../services/openRentalsBillingBasis';
import { useDebounce } from '../utils/performance';
import EmailInvoiceDialog from '../components/EmailInvoiceDialog';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { findActiveLeaseContract } from '../services/leaseBilling';
import {
  Box, Typography, Card, CardContent, Grid, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, Chip,
  Button, TextField, Tooltip, LinearProgress, CircularProgress, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel,
  Select, MenuItem, Alert, TablePagination, IconButton, Menu,
} from '@mui/material';
import { MoreVert } from '@mui/icons-material';
import {
  People, Schedule, AccountBalance,
} from '@mui/icons-material';
import {
  IoCloudDownloadOutline,
  IoReceiptOutline,
  IoMailOutline,
  IoArchiveOutline,
  IoAddCircleOutline,
  IoCreateOutline,
  IoPersonCircleOutline,
  IoRefreshOutline,
} from 'react-icons/io5';
import { PageSearchInput } from '../components/ui/search-input-with-icon';
import {
  customerKeysForLeaseMatch,
  expandLeaseMatchKeys,
  isActiveCustomerRecord as isActiveCustomer,
} from '../utils/leaseCustomerMatchKeys';
import {
  buildCustomerParentNameMap,
  withCustomerHierarchyDisplayName,
  getCustomerDisplayLabel,
  getCustomerListId,
  branchNameFromHierarchyLabel,
} from '../utils/customerParentConstraint';
import {
  getCurrentCycleRange as getSharedCurrentCycleRange,
  getBillingPeriodForSub,
  computeInvoicePdfPeriodForRow as computeSharedInvoicePdfPeriodForRow,
  lastDayOfMonthYm,
  qbCsvDatesForBilledMonth,
  sequenceMonthForSub,
  getPeriodForCyclePrep,
} from '../utils/rentalBillingPeriod';
import { preallocateCycleInvoicesForOrganization } from '../services/preallocateCycleInvoices';

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

/** Same customer key as computeSubscriptionBillingCycleTotal / groupBillableUnitCountsByProductCode. */
function subscriptionMatchKeyForInvoiceRow(row, customerRecord) {
  return (
    String(
      row?.customer_id ||
        customerRecord?.CustomerListID ||
        customerRecord?.id ||
        customerRecord?.name ||
        customerRecord?.Name ||
        '',
    ).trim() || String(row?.customer_id || '')
  );
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

/** Run async tasks with max `concurrency` in flight (ZIP PDF export). */
async function runPool(items, concurrency, worker) {
  if (!items.length) return;
  const n = Math.max(1, Math.min(concurrency, items.length));
  let next = 0;
  const nextIndex = () => {
    if (next >= items.length) return null;
    const i = next;
    next += 1;
    return i;
  };
  const launch = async () => {
    let i;
    while ((i = nextIndex()) !== null) {
      await worker(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: n }, launch));
}

/** Invoice # chips: keyed by customer id and by subscription id (fixes mismatched UUID vs CustomerListID on older rows). */
function emptyCycleInvoiceLookup() {
  return { byCustomerId: {}, bySubscriptionId: {} };
}

/**
 * Overlay the real `customers` row onto resolver stubs so fields like purchase_order /
 * payment_terms are not dropped when subscriptions match bottle-derived lookups first.
 */
function mergeCustomerDirectoryFields(baseCustomer, subscriptionCustomerId, matchCustomerBySubId) {
  const b = baseCustomer != null && typeof baseCustomer === 'object' ? { ...baseCustomer } : {};
  const cid = String(subscriptionCustomerId ?? b.CustomerListID ?? b.id ?? '').trim();
  if (!cid || typeof matchCustomerBySubId !== 'function') return baseCustomer ?? b;
  const dir = matchCustomerBySubId(cid);
  return dir ? { ...b, ...dir } : Object.keys(b).length ? b : baseCustomer;
}

/** Same row identity as QuickBooks CSV ordering for W-number assignment. */
function qbExportRowMatchesSub(exportRow, sub) {
  if (exportRow?.id != null && sub?.id != null && String(exportRow.id) === String(sub.id)) return true;
  const cr = String(exportRow?.customer_id || '').trim();
  const cs = String(sub?.customer_id || '').trim();
  if (!cr || !cs || cr !== cs) return false;
  const pr = String(exportRow?.billing_period || 'monthly').toLowerCase();
  const ps = String(sub?.billing_period || 'monthly').toLowerCase();
  return pr === ps;
}

/**
 * Read-only W###### matching the last QuickBooks CSV download for this `sequenceMonth`, then the same
 * formula as `downloadQuickBooksInvoiceCsv` for the current export row order (does not advance invoice_state).
 */
function computeQbSequentialInvoiceNumber(exportRows, csvOptions, targetSub) {
  if (!targetSub) return null;
  try {
    const raw = sessionStorage.getItem(QB_CSV_LAST_INV_MAP_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const wantSeq = String(csvOptions?.sequenceMonth || '').trim();
      if (parsed?.seqMonth === wantSeq && parsed?.byRowKey && wantSeq) {
        for (const key of qbCsvInvoiceStorageKeys(targetSub)) {
          const fromLastExport = parsed.byRowKey[key];
          if (fromLastExport) return fromLastExport;
        }
      }
    }
  } catch {
    /* ignore */
  }
  if (!exportRows?.length) return null;
  const state = JSON.parse(localStorage.getItem('invoice_state') || '{}');
  const lastNumber = Number(state?.lastNumber);
  const hasLastNumber = Number.isFinite(lastNumber);
  const startNumber = hasLastNumber ? (lastNumber + 1) : 10000;
  const idx = exportRows.findIndex((r) => qbExportRowMatchesSub(r, targetSub));
  if (idx < 0) return null;
  return `W${String(startNumber + idx).padStart(5, '0')}`;
}

function daysAtLocationSummaryFromBottles(bottles) {
  const vals = (bottles || [])
    .map((b) => Number(b.days_at_location))
    .filter((n) => Number.isFinite(n) && n >= 0);
  if (!vals.length) return 'See attached PDF for on-hand assets.';
  const max = Math.max(...vals);
  const avg = Math.round(vals.reduce((a, c) => a + c, 0) / vals.length);
  return `On-hand assets: max ${max} days at location, average ${avg} days (see PDF).`;
}

const normalize = (v) => String(v || '').trim().toLowerCase();
const normalizeName = (v) => String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();

/** Rentals list: omit rows whose customer directory record is inactive / archived / soft-deleted. */
function rowReferencesDeletedCustomer(row, customers) {
  if (row?.customer && typeof row.customer === 'object' && !isActiveCustomer(row.customer)) {
    return true;
  }
  const uid = normalize(row.customer_id);
  if (!uid) return false;
  for (const c of customers || []) {
    const ids = [normalize(c.id), normalize(c.CustomerListID)].filter(Boolean);
    if (!ids.includes(uid)) continue;
    return !isActiveCustomer(c);
  }
  return false;
}

/**
 * Customers page deletes rows from `customers` (hard delete); subscriptions/open rentals often remain.
 * Those rentals rows still show names from Stripe/subscription stubs until we hide “orphan” identities.
 *
 * Important: do **not** use display-name matching for persisted subscriptions that still have `customer_id`.
 * Otherwise `resolveCustomer(sub.customer_name)` can attach a *different* active customer with the same
 * name, and this check would think the row is still valid — the classic “deleted customer still on Rentals”.
 */
function rowBillingCustomerRemovedFromDirectory(row, customers) {
  const list = customers || [];
  if (!list.length) return false;

  /** Direct keys only — `expandLeaseMatchKeys` merges aliases via active directory rows, so a stub name
   *  matching a *different* live customer incorrectly pulls that customer’s ids in and hides the orphan. */
  const keys = customerKeysForLeaseMatch(row.customer_id, row.customer);
  if (keys.size === 0) return false;

  const hasStripeCustomerId = String(row.customer_id || '').trim() !== '';

  for (const c of list) {
    if (!isActiveCustomer(c)) continue;
    const ids = [normalize(c.id), normalize(c.CustomerListID)].filter(Boolean);
    if (ids.some((id) => keys.has(id))) return false;
    const nn = normalizeName(c.name || c.Name || '');
    /** Never “validate” orphans by name when the row carries any customer id (Stripe, UUID, List ID).
     *  Virtual bottle/subscription rows used `isPersistedSubscription` before and still matched wrong names. */
    if (nn && keys.has(nn) && !hasStripeCustomerId) {
      return false;
    }
  }
  return true;
}

/**
 * Isolated search field. Owns its own input state so typing only re-renders
 * this component (not the entire 4000+ line Subscriptions page with 50 table
 * rows × 6 gradient-menu items each). The debounced value is bubbled up via
 * `onDebouncedChange` so the parent only re-renders once typing settles.
 */
/** Compact row actions — avoids 50+ GradientMenu instances (each was min-h-screen sized). */
function RentalRowActionsMenu({ items, onAction, disabled, buttonLabel = 'Actions' }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  return (
    <>
      <Button
        size="small"
        variant="outlined"
        aria-label={buttonLabel}
        disabled={disabled}
        endIcon={<MoreVert sx={{ fontSize: 16 }} />}
        onClick={(e) => {
          e.stopPropagation();
          setAnchorEl(e.currentTarget);
        }}
        sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', py: 0.35, minWidth: 0 }}
      >
        {buttonLabel}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        onClick={(e) => e.stopPropagation()}
        slotProps={{ paper: { sx: { minWidth: 168 } } }}
      >
        {items.map((item) => (
          <MenuItem
            key={item.id}
            disabled={item.disabled}
            onClick={() => {
              setAnchorEl(null);
              if (!item.disabled && item.action) onAction(item.action);
            }}
          >
            {item.title}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

const SubscriptionsSearchField = memo(forwardRef(function SubscriptionsSearchField(
  { onDebouncedChange },
  ref,
) {
  const [value, setValue] = useState('');
  const debounced = useDebounce(value, 280);
  const onDebouncedChangeRef = useRef(onDebouncedChange);
  useEffect(() => {
    onDebouncedChangeRef.current = onDebouncedChange;
  }, [onDebouncedChange]);
  const lastSentRef = useRef('');
  useEffect(() => {
    if (lastSentRef.current === debounced) return;
    lastSentRef.current = debounced;
    onDebouncedChangeRef.current?.(debounced);
  }, [debounced]);

  useImperativeHandle(
    ref,
    () => ({
      clear: () => {
        setValue('');
        lastSentRef.current = '';
        onDebouncedChangeRef.current?.('');
      },
      getValue: () => value,
    }),
    [value],
  );

  const isPending = value !== debounced;

  return (
    <Box
      sx={{
        ml: 'auto',
        minWidth: 240,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        opacity: isPending ? 0.85 : 1,
        transition: 'opacity 0.15s ease',
      }}
    >
      <PageSearchInput
        placeholder="Search customers..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="min-w-0 flex-1"
      />
      {isPending ? <CircularProgress size={14} thickness={5} sx={{ flexShrink: 0 }} /> : null}
    </Box>
  );
}));

export default function Subscriptions() {
  const { organization, user, profile } = useAuth();
  const ctx = useSubscriptions();
  const { accent } = useTheme();
  const primaryColor = resolveAccentToHex(accent);
  const navigate = useNavigate();

  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchFieldRef = useRef(null);
  const handleClearSearch = useCallback(() => {
    searchFieldRef.current?.clear();
  }, []);
  const [tablePage, setTablePage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [createOpen, setCreateOpen] = useState(false);
  const [newSub, setNewSub] = useState({ customer_id: '', billing_period: 'monthly' });
  const [saving, setSaving] = useState(false);
  const [preallocatingNumbers, setPreallocatingNumbers] = useState(false);
  const resolveInvNoRef = useRef(null);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  /** Saved invoice template JSON for PDF/email (localStorage; org-scoped). */
  const [invoiceTemplate, setInvoiceTemplate] = useState(null);
  const [remitAddress, setRemitAddress] = useState(null);
  const [localRatesVersion, setLocalRatesVersion] = useState(0);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [senderOptions, setSenderOptions] = useState([]);
  const [emailRow, setEmailRow] = useState(null);
  const [emailInitialForm, setEmailInitialForm] = useState({ to: '', from: '', subject: '', message: '' });
  /** Bumps on each Email open so EmailInvoiceDialog remounts and always shows the latest saved template. */
  const [emailDialogMountKey, setEmailDialogMountKey] = useState('email-dlg-closed');
  const blurActiveElement = useCallback(() => {
    if (typeof document === 'undefined') return;
    const active = document.activeElement;
    if (active && typeof active.blur === 'function') active.blur();
  }, []);
  const [termsFilter, setTermsFilter] = useState('all');
  /** Monthly QuickBooks CSV: all | net30 | credit_card */
  const [monthlyQbCohort, setMonthlyQbCohort] = useState('all');
  /** QuickBooks CSV / invoice PDF: `live` = same totals as table (default). `YYYY-MM` = counts/pricing as of that month-end. */
  const [qbCsvBillingMonth, setQbCsvBillingMonth] = useState(() => 'live');
  const qbCsvMonthMenuOptions = useMemo(() => {
    const opts = [{ value: 'live', label: 'Current table (live)' }];
    const now = new Date();
    for (let i = 1; i <= 24; i += 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      opts.push({
        value: ym,
        label: d.toLocaleString('default', { month: 'long', year: 'numeric' }),
      });
    }
    return opts;
  }, []);
  const [bulkEmailing, setBulkEmailing] = useState(false);
  const [bulkEmailProgress, setBulkEmailProgress] = useState({ sent: 0, total: 0, failed: 0 });
  const [zipExporting, setZipExporting] = useState(false);
  const [zipExportProgress, setZipExportProgress] = useState({ done: 0, total: 0 });
  const [rentalsWorkspaceRefreshing, setRentalsWorkspaceRefreshing] = useState(false);
  const [activeLeaseAgreements, setActiveLeaseAgreements] = useState([]);
  const [cycleInvoiceLookup, setCycleInvoiceLookup] = useState(emptyCycleInvoiceLookup);
  /** Bumps after saving a custom invoice # so the grid refetches cycle invoice status. */
  const [invoiceLookupRefreshKey, setInvoiceLookupRefreshKey] = useState(0);
  const [invoiceNoDialogOpen, setInvoiceNoDialogOpen] = useState(false);
  const [invoiceNoEditRow, setInvoiceNoEditRow] = useState(null);
  const [invoiceNoDraft, setInvoiceNoDraft] = useState('');
  const [savingInvoiceNo, setSavingInvoiceNo] = useState(false);
  const [invoiceNoSaveError, setInvoiceNoSaveError] = useState('');
  const defaultTemplateSignature = 'Sincerely,\n{organization_name}';
  const loadEmailTemplateSettings = useCallback((organizationIdOverride) => {
    try {
      const id = organizationIdOverride ?? organization?.id;
      if (!id) return null;
      const raw = localStorage.getItem(`invoiceEmailTemplate_${id}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [organization?.id]);

  /** Loaded from organizations.rental_invoice_email_template (shared; survives logout). */
  const [rentalInvoiceEmailTemplateDb, setRentalInvoiceEmailTemplateDb] = useState(null);
  useEffect(() => {
    if (!organization?.id) {
      setRentalInvoiceEmailTemplateDb(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('rental_invoice_email_template')
          .eq('id', organization.id)
          .maybeSingle();
        if (cancelled) return;
        if (error?.message?.includes('rental_invoice_email_template')) {
          setRentalInvoiceEmailTemplateDb(null);
          return;
        }
        const t = data?.rental_invoice_email_template;
        if (t && typeof t === 'object') {
          setRentalInvoiceEmailTemplateDb(t);
          return;
        }
        setRentalInvoiceEmailTemplateDb(null);
      } catch {
        if (!cancelled) setRentalInvoiceEmailTemplateDb(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [organization?.id]);

  const getSavedEmailTemplate = useCallback(() => {
    const id = organization?.id;
    if (!id) return null;
    if (rentalInvoiceEmailTemplateDb && typeof rentalInvoiceEmailTemplateDb === 'object') {
      const t = rentalInvoiceEmailTemplateDb;
      const has =
        String(t.body || '').trim()
        || String(t.subject || '').trim()
        || String(t.signature || '').trim()
        || String(t.payment_methods || '').trim()
        || String(t.e_transfer_email || '').trim();
      if (has) return t;
    }
    return loadEmailTemplateSettings(id);
  }, [organization?.id, rentalInvoiceEmailTemplateDb, loadEmailTemplateSettings]);
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
  const remitAddressBlock = useMemo(() => {
    const lines = [
      String(remitAddress?.remit_name || organization?.name || '').trim(),
      String(remitAddress?.remit_address_line1 || '').trim(),
      String(remitAddress?.remit_address_line2 || '').trim(),
      String(remitAddress?.remit_address_line3 || '').trim(),
    ].filter(Boolean);
    return lines.join('\n');
  }, [remitAddress, organization?.name]);
  const getCurrentCycleRange = useCallback(() => getSharedCurrentCycleRange(), []);

  /** Same period boundaries as rental PDF / line items (yearly subs use Stripe period when present). */
  const getPdfBillingPeriodForSub = useCallback(
    (sub, qbBillingMonthYm = 'live') => {
      const { periodStart, periodEnd } = getBillingPeriodForSub(sub, { qbBillingMonthYm });
      return { periodStart, periodEnd };
    },
    [],
  );

  // Stable extraction of bottle-derived customer candidates; only recomputes
  // when the actual set of unique (id, name) pairs changes, not on every
  // bottles array reference change from realtime updates.
  const bottleDerivedCandidatesRef = useRef([]);
  const qbSnapshotGroupsCacheRef = useRef(null);
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

    /**
     * `preserveExisting=true` for bottle-derived stubs (id/name only, no purchase_order /
     * payment_terms / billing_mode) so they do NOT overwrite the real `customers` row
     * that already populated the map. Without this guard, fields like `purchase_order`
     * silently disappear from row.customer once a matching bottle stub is added.
     */
    const addCandidate = (candidate, { preserveExisting = false } = {}) => {
      if (!candidate) return;
      if (!isActiveCustomer(candidate)) return;
      const ids = [candidate.id, candidate.CustomerListID, candidate.customer_id]
        .map(normalize)
        .filter(Boolean);
      ids.forEach((id) => {
        if (preserveExisting && byId.has(id)) return;
        byId.set(id, candidate);
      });
      // Index branch `name` only — never `displayName` (Parent:Child) to avoid wrong customer matches.
      const n = normalizeName(candidate.name || candidate.Name || candidate.customer_name);
      if (n && !(preserveExisting && byName.has(n))) {
        byName.set(n, candidate);
      }
    };

    for (const c of (ctx.customers || [])) {
      addCandidate(c);
    }

    for (const c of bottleDerivedCandidates) {
      addCandidate(c, { preserveExisting: true });
    }

    return { byId, byName };
  }, [ctx.customers, bottleDerivedCandidates]);

  const resolveCustomer = useCallback((idOrName, fallbackName = '') => {
    const idKey = normalize(idOrName);
    if (idKey) {
      const byIdHit = customerResolvers.byId.get(idKey);
      if (byIdHit) return byIdHit;
    }
    const branchLabel = branchNameFromHierarchyLabel(idOrName);
    const nameKey =
      normalizeName(branchLabel) ||
      normalizeName(idOrName) ||
      normalizeName(branchNameFromHierarchyLabel(fallbackName)) ||
      normalizeName(fallbackName);
    return customerResolvers.byName.get(nameKey) || null;
  }, [customerResolvers]);

  const matchCustomerRecordBySubscriptionId = useCallback((customerId) => {
    if (!customerId) return null;
    const key = normalize(customerId);
    for (const c of ctx.customers || []) {
      if (!isActiveCustomer(c)) continue;
      const ids = [c.id, c.CustomerListID].map(normalize).filter(Boolean);
      if (ids.includes(key)) return c;
    }
    return null;
  }, [ctx.customers]);

  const parentNameById = useMemo(
    () => buildCustomerParentNameMap(ctx.customers),
    [ctx.customers]
  );

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
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) {
          setRemitAddress(data);
        } else {
          setRemitAddress(null);
        }
      } catch { /* columns may not exist yet */ }
    })();
  }, [organization?.id]);

  useEffect(() => {
    let active = true;
    const loadActiveLeaseAgreements = async () => {
      const orgId = profile?.organization_id;
      if (!orgId) {
        if (active) setActiveLeaseAgreements([]);
        return;
      }
      try {
        // Narrow fetch only — avoid fetchBillingWorkspaceData (duplicate full bottles/customers/rentals pulls).
        const { data, error } = await supabase
          .from('lease_agreements')
          .select('id, customer_id, customer_name, status, max_asset_count, bottle_id')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false });
        if (!active) return;
        if (error) throw error;
        setActiveLeaseAgreements(data || []);
      } catch {
        if (active) setActiveLeaseAgreements([]);
      }
    };
    loadActiveLeaseAgreements();
    return () => { active = false; };
  }, [profile?.organization_id]);

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

  const classificationNodesById = useMemo(
    () => buildClassificationNodesById(ctx.classificationNodes || []),
    [ctx.classificationNodes]
  );

  const productCodeToBottleClassification = useMemo(
    () => buildProductCodeClassificationMapFromBottles(ctx.bottles || []),
    [ctx.bottles]
  );

  const resolveDisplayUnitPrice = useCallback(
    (pricingRow, item) => {
      const pc = normalizePricingKey(item?.product_code || item?.description);
      const bottleCls = pc ? productCodeToBottleClassification.get(pc) : null;
      return resolveDisplayUnitFromMaps({
        row: pricingRow,
        item,
        customerOverrideMap,
        assetPricingMap,
        defaultMonthly: defaultUnitRateByPeriod.monthly,
        defaultYearly: defaultUnitRateByPeriod.yearly,
        bottleClassificationNodeId: bottleCls || null,
        classificationNodesById:
          classificationNodesById instanceof Map && classificationNodesById.size > 0
            ? classificationNodesById
            : null,
      });
    },
    [
      customerOverrideMap,
      assetPricingMap,
      defaultUnitRateByPeriod,
      productCodeToBottleClassification,
      classificationNodesById,
    ]
  );

  const leaseCoveredCountByCustomerKey = useMemo(() => {
    const map = new Map();
    const add = (key, count) => {
      const k = normalize(key);
      const n = Number(count) || 0;
      if (!k || n <= 0) return;
      map.set(k, (map.get(k) || 0) + n);
    };
    const addName = (key, count) => {
      const k = normalizeName(key);
      const n = Number(count) || 0;
      if (!k || n <= 0) return;
      map.set(k, (map.get(k) || 0) + n);
    };
    const customerById = new Map();
    const customerByName = new Map();
    for (const c of (ctx.customers || [])) {
      const ids = [c?.id, c?.CustomerListID].map((v) => normalize(v)).filter(Boolean);
      for (const id of ids) customerById.set(id, c);
      const nk = normalizeName(c?.name || c?.Name || '');
      if (nk) customerByName.set(nk, c);
    }
    const bottleCountByCustomer = new Map();
    for (const b of (ctx.bottles || [])) {
      const k = normalize(b.assigned_customer || b.customer_id);
      if (!k) continue;
      bottleCountByCustomer.set(k, (bottleCountByCustomer.get(k) || 0) + 1);
    }
    for (const a of (activeLeaseAgreements || [])) {
      const st = String(a?.status || '').trim().toLowerCase();
      if (st === 'cancelled' || st === 'expired' || st === 'renewed') continue;
      const cid = normalize(a.customer_id);
      const cname = normalizeName(a.customer_name);
      const cap = parseInt(String(a.max_asset_count ?? ''), 10);
      const covered =
        a.bottle_id
          ? 1
          : (Number.isFinite(cap) && cap > 0
              ? cap
              : (bottleCountByCustomer.get(cid) || 0));
      const matchedCustomer =
        (cid && customerById.get(cid)) ||
        (cname && customerByName.get(cname)) ||
        null;
      const agreementIdKeys = new Set();
      const agreementNameKeys = new Set();
      if (cid) agreementIdKeys.add(cid);
      const rawName = normalizeName(a.customer_name);
      if (rawName) agreementNameKeys.add(rawName);
      if (matchedCustomer) {
        const mid = normalize(matchedCustomer.id);
        const mlist = normalize(matchedCustomer.CustomerListID);
        const mname = normalizeName(matchedCustomer.name);
        const mName = normalizeName(matchedCustomer.Name);
        if (mid) agreementIdKeys.add(mid);
        if (mlist) agreementIdKeys.add(mlist);
        if (mname) agreementNameKeys.add(mname);
        if (mName) agreementNameKeys.add(mName);
      }
      agreementIdKeys.forEach((k) => add(k, covered));
      agreementNameKeys.forEach((k) => addName(k, covered));
    }
    return map;
  }, [activeLeaseAgreements, ctx.bottles, ctx.customers]);

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
      classificationNodes: ctx.classificationNodes || [],
    };

    return ctx.subscriptions.map((sub) => {
      const items = ctx.subscriptionItems.filter((i) => i.subscription_id === sub.id && i.status === 'active');
      const hasSubscriptionCustomerId = String(sub.customer_id || '').trim() !== '';
      /** Never resolve by name when `customer_id` is set — deleted UUID/List ID + shared display name must not attach to a different live customer. */
      const baseCustomer = hasSubscriptionCustomerId
        ? resolveCustomer(sub.customer_id) ||
          matchCustomerRecordBySubscriptionId(sub.customer_id) ||
          {
            CustomerListID: sub.customer_id,
            id: sub.customer_id,
            name: sub.customer_name || sub.customer_id,
            Name: sub.customer_name,
          }
        : resolveCustomer(sub.customer_name || '') ||
          resolveCustomer('', sub.customer_name || '') ||
          {
            CustomerListID: sub.customer_id,
            id: sub.customer_id,
            name: sub.customer_name || sub.customer_id,
            Name: sub.customer_name,
          };
      const customer = withCustomerHierarchyDisplayName(
        mergeCustomerDirectoryFields(baseCustomer, sub.customer_id, matchCustomerRecordBySubscriptionId),
        parentNameById
      );
      const activeLease = findActiveLeaseContract(
        ctx.leaseContracts || [],
        sub.customer_id,
        organization?.id
      );
      const leaseKeys = expandLeaseMatchKeys(sub.customer_id, customer, ctx.customers);
      const matchesLeaseContract = (ctx.leaseContracts || []).some((c) => {
        if (organization?.id && c.organization_id && c.organization_id !== organization?.id) return false;
        const ck = normalize(String(c.customer_id || '').trim());
        return ck && leaseKeys.has(ck);
      });
      const forceYearlyPeriod =
        customer?.billing_mode === 'lease' ||
        matchesLeaseContract;
      const effectiveBillingPeriod = forceYearlyPeriod
        ? 'yearly'
        : canonicalBillingPeriod(sub.billing_period);
      /** Lease contract $ only when customer is lease mode or row matches a contract (not legacy-import alone). */
      const useLeaseContractIfPresent =
        customer?.billing_mode === 'lease' || matchesLeaseContract;

      let totalPerCycle = 0;
      let itemCount = 0;
      /** Per SKU from groupBillableUnitCountsByProductCode (bottles + open rentals, billable rules). */
      let productCounts = null;

      if (customer?.billing_mode === 'lease' || (activeLease && useLeaseContractIfPresent)) {
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
        totalPerCycle = computeSubscriptionBillingCycleTotal(
          { ...sub, billing_period: effectiveBillingPeriod },
          customer,
          pricingCtx,
          { ...billingData, useLeaseContractIfPresent },
        );
      } else {
        const subscriptionMatchKey =
          String(
            sub.customer_id ||
              customer?.CustomerListID ||
              customer?.id ||
              customer?.name ||
              customer?.Name ||
              ''
          ).trim() || sub.customer_id;
        const groupsRaw = groupBillableUnitCountsByProductCode(
          billingData.bottles,
          billingData.rentals,
          subscriptionMatchKey,
          customer,
          { allCustomers: billingData.customers },
        );
        const groups = groupsRaw;
        totalPerCycle = computeSubscriptionBillingCycleTotal(
          { ...sub, billing_period: effectiveBillingPeriod },
          customer,
          pricingCtx,
          {
            ...billingData,
            useLeaseContractIfPresent,
            ...(groups.length > 0 ? { precomputedGroups: groups } : {}),
          },
        );
        itemCount = groups.reduce((s, g) => s + (Number(g.count) || 0), 0);
        if (groups.length > 0) {
          productCounts = {};
          for (const g of groups) {
            if (g.count <= 0) continue;
            const key = g.productCode || '__unclassified__';
            productCounts[key] = (productCounts[key] || 0) + g.count;
          }
          if (Object.keys(productCounts).length === 0) productCounts = null;
        }
      }
      return {
        ...sub,
        items,
        customer,
        totalPerCycle,
        itemCount,
        billing_period: effectiveBillingPeriod,
        /** Skip SKU re-total in allRows pass when total came from lease contract lines. */
        useLeaseContractForTotal: !!activeLease && useLeaseContractIfPresent,
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
    ctx.classificationNodes,
    customerResolvers,
    matchCustomerRecordBySubscriptionId,
    customerOverrideMap,
    assetPricingMap,
    defaultUnitRateByPeriod,
    organization?.id,
    leaseCoveredCountByCustomerKey,
    parentNameById,
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

    const groups = new Map();
    for (const bottle of (ctx.bottles || [])) {
      const assignedId = norm(bottle.assigned_customer || bottle.customer_id);
      const assignedName = normName(bottle.customer_name);
      /** If bottles still reference a deleted List ID / UUID, do not attach another active customer by name. */
      const matchedCustomer =
        (assignedId && customerById.get(assignedId)) ||
        (!assignedId && assignedName && customerByName.get(assignedName)) ||
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
      const rawProductCode = bottleProductCode(bottle);
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
        const assignedIdKey = norm(group.assignedId);
        const assignedNameKey = normName(group.assignedName);
        const matchedCustomer =
          (assignedIdKey && customerById.get(assignedIdKey)) ||
          (!assignedIdKey && assignedNameKey && customerByName.get(assignedNameKey)) ||
          null;
        const customer =
          matchedCustomer ||
          (!assignedIdKey ? resolveCustomer(group.assignedId, group.assignedName) : null);
        if (!customer) return null;
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

        const mergedVirtualCustomer = withCustomerHierarchyDisplayName(
          mergeCustomerDirectoryFields(
            customer || { name: displayName, Name: displayName },
            customerIdValue,
            matchCustomerRecordBySubscriptionId
          ),
          parentNameById
        );
        const mergedBillingBasisRows = mergeOpenRentalsForBillingBasis(
          ctx.rentals || [],
          {
            customerListId: customerIdValue,
            customerName:
              mergedVirtualCustomer?.name ||
              mergedVirtualCustomer?.Name ||
              group.assignedName ||
              '',
          }
        );
        const rentalSummary = summarizeMergedOpenRentalsByProduct(
          mergedBillingBasisRows,
          ctx.bottles || []
        );
        const rentalProductCounts = {};
        for (const row of rentalSummary) {
          const qty = Number(row?.count) || 0;
          if (qty <= 0) continue;
          const key = row?.productCode || '__unclassified__';
          rentalProductCounts[key] = (rentalProductCounts[key] || 0) + qty;
        }
        const rentalItemCount = mergedBillingBasisRows.filter((r) => !isDnsRentalExcludedFromBillableCount(r)).length;

        return {
          id: `virtual-${groupKey}`,
          customer: mergedVirtualCustomer,
          customer_id: customerIdValue,
          billing_period: (() => {
            const leaseKeys = expandLeaseMatchKeys(customerIdValue, customer, ctx.customers);
            const matchesLeaseContract = (ctx.leaseContracts || []).some((c) => {
              if (organization?.id && c.organization_id && c.organization_id !== organization?.id) return false;
              const ck = normalize(String(c.customer_id || '').trim());
              return ck && leaseKeys.has(ck);
            });
            const forceYearly =
              customer?.billing_mode === 'lease' ||
              matchesLeaseContract;
            return forceYearly ? 'yearly' : 'monthly';
          })(),
          itemCount: rentalItemCount > 0 ? rentalItemCount : group.bottleCount,
          productCounts: rentalItemCount > 0 ? rentalProductCounts : (group.productCounts || {}),
          totalPerCycle: 0,
          next_billing_date: null,
          status: 'active',
          isVirtual: true,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b.itemCount || 0) - (a.itemCount || 0));
  }, [ctx.bottles, ctx.rentals, ctx.subscriptions, ctx.customers, ctx.leaseContracts, customerResolvers, organization?.id, matchCustomerRecordBySubscriptionId, parentNameById]);

  /** Legacy “rentals table only” virtual rows — must track `ctx.rentals` (same as SubscriptionContext) so counts stay in sync after refresh/realtime. A one-time fetch on org id alone went stale vs Customer Detail. */
  const legacyRows = useMemo(() => {
    let rows = [];
    try {
      const legacyBottleMaps = buildBottleLookupMaps(ctx.bottles || []);
      const grouped = (ctx.rentals || [])
        .filter((r) => {
          if (String(r?.rental_type || '').toLowerCase() === 'yearly') return false;
          // DNS billables ("Delivered Not Scanned") should count.
          // Exclude DNS records that represent return exceptions.
          const desc = String(r?.dns_description || '').toLowerCase();
          if (desc.includes('return not on balance')) return false;
          if (desc.includes('return not scanned')) return false;
          return true;
        })
        .reduce((acc, row) => {
          const key = String(row.customer_id || row.customer_name || 'unassigned').trim();
          if (!key) return acc;
          const rentalCid = String(row.customer_id || '').trim();
          const resolvedCustomer = rentalCid
            ? resolveCustomer(rentalCid, '')
            : resolveCustomer(row.customer_name, row.customer_name);
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
            billing_period: 'monthly',
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

      rows = Array.from(grouped.values()).map((g) => {
        const mergedCustomer = withCustomerHierarchyDisplayName(
          mergeCustomerDirectoryFields(
            g.customer || { name: g.customer_name, Name: g.customer_name },
            g.customer_id,
            matchCustomerRecordBySubscriptionId
          ),
          parentNameById
        );
        return {
          id: `legacy-${g.key}`,
          customer: mergedCustomer,
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
        };
      });
    } catch {
      rows = [];
    }

    return rows;
  }, [ctx.rentals, ctx.bottles, resolveCustomer, matchCustomerRecordBySubscriptionId, parentNameById]);

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
      const k = String(r.customer_id || r.customer?.name || '').trim().toLowerCase();
      return k && !existingKeys.has(k);
    });
    const combined = [...merged, ...extraLegacy].filter((row) => {
      if (rowReferencesDeletedCustomer(row, ctx.customers)) return false;
      if (rowBillingCustomerRemovedFromDirectory(row, ctx.customers)) return false;

      const itemCount = parseFloat(row.itemCount) || 0;
      const rawTotal = parseFloat(row.totalPerCycle) || 0;
      const fromLegacyRentals = row.legacySource === 'rentals_table';
      const isPersistedSubscriptionRow = row.id != null && subscriptionIds.has(row.id);

      // Drop rows with no quantity and no cycle total, unless they're from the
      // legacy rentals table or are real subscription records.
      if (!fromLegacyRentals && !isPersistedSubscriptionRow && itemCount <= 0 && rawTotal <= 0) {
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

      if (!inCustomerDirectory && !fromLegacyRentals && !pricedLiveSubscription && !isPersistedSubscriptionRow) {
        return false;
      }

      return true;
    });
    const legacyTotalsByCustomer = new Map(
      (legacyRows || []).map((r) => [normalize(r.customer_id || r.customer?.name), parseFloat(r.totalPerCycle) || 0])
    );
    const legacyCountsByCustomer = new Map(
      (legacyRows || []).map((r) => [normalize(r.customer_id || r.customer?.name), parseFloat(r.itemCount) || 0])
    );
    const legacyProductCountsByCustomer = new Map(
      (legacyRows || []).map((r) => [normalize(r.customer_id || r.customer?.name), r.productCounts || null])
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
      const customerKey = normalize(row.customer_id);
      const hasActiveLeaseContract = !!findActiveLeaseContract(
        ctx.leaseContracts || [],
        row.customer_id,
        organization?.id
      );
      /** Keep lease-contract annual totals; do not replace with per-SKU rate math. */
      const preserveLeaseContractTotal =
        row.useLeaseContractForTotal === true ||
        (hasActiveLeaseContract && row.customer?.billing_mode === 'lease');
      const allProductsOverride = findAllProductsOverrideMultiKey(customerOverrideMap, row);
      const period = String(row.billing_period || 'monthly').toLowerCase();
      let total = parseFloat(row.totalPerCycle) || 0;
      let computedItemCount = parseFloat(row.itemCount) || 0;
      let effectiveProductCounts = row.productCounts && typeof row.productCounts === 'object'
        ? row.productCounts
        : null;
      let fullyLeaseCoveredRentalRow = false;
      const leaseCoverKeys = [
        row.customer_id,
        row.customer?.id,
        row.customer?.CustomerListID,
        row.customer?.name,
        row.customer?.Name,
        ...collectNormalizedCustomerKeysForPricingRow(row),
      ].map((v) => normalize(v)).filter(Boolean);
      const leaseCoverNameKeys = [
        row.customer?.name,
        row.customer?.Name,
        row.customer_name,
      ].map((v) => normalizeName(v)).filter(Boolean);
      const leaseCoveredUnits = Math.max(
        ...leaseCoverKeys.map((k) => leaseCoveredCountByCustomerKey.get(k) || 0),
        ...leaseCoverNameKeys.map((k) => leaseCoveredCountByCustomerKey.get(k) || 0),
        0,
      );
      if (row.isVirtual) {
        const legacyCount = legacyCountsByCustomer.get(customerKey) || 0;
        if (legacyCount > computedItemCount) computedItemCount = legacyCount;
        if (!effectiveProductCounts) {
          const legacyMix = legacyProductCountsByCustomer.get(customerKey);
          if (legacyMix && typeof legacyMix === 'object' && Object.keys(legacyMix).length > 0) {
            effectiveProductCounts = legacyMix;
          }
        }
      }

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

      // Sum Σ (units × resolved rate per SKU). Must run for **all** rows with a product mix —
      // not only virtual rows. Otherwise persisted subscriptions never set usedSpecificProductOverride
      // and the blanket __all__ branch below replaces the total with one rate × total qty,
      // wiping per-SKU customer overrides.
      let usedSpecificProductOverride = false;
      const shouldApplyLeaseCoverageToMonthly =
        canonicalBillingPeriod(row.billing_period) === 'monthly'
        && String(row.customer?.billing_mode || '').toLowerCase() !== 'lease';
      if (!preserveLeaseContractTotal && shouldApplyLeaseCoverageToMonthly && leaseCoveredUnits > 0) {
        let coveredLeft = leaseCoveredUnits;
        if (effectiveProductCounts && typeof effectiveProductCounts === 'object') {
          const adjusted = {};
          for (const [code, qtyRaw] of Object.entries(effectiveProductCounts)) {
            const qty = parseFloat(qtyRaw) || 0;
            if (qty <= 0) continue;
            if (coveredLeft <= 0) {
              adjusted[code] = qty;
              continue;
            }
            const deduct = Math.min(qty, coveredLeft);
            coveredLeft -= deduct;
            const nextQty = qty - deduct;
            if (nextQty > 0) adjusted[code] = nextQty;
          }
          effectiveProductCounts = Object.keys(adjusted).length > 0 ? adjusted : null;
          computedItemCount = effectiveProductCounts
            ? Object.values(effectiveProductCounts).reduce((s, n) => s + (parseFloat(n) || 0), 0)
            : 0;
        } else {
          computedItemCount = Math.max(0, computedItemCount - leaseCoveredUnits);
        }
        fullyLeaseCoveredRentalRow = computedItemCount <= 0;
        if (fullyLeaseCoveredRentalRow) total = 0;
      }
      if (!preserveLeaseContractTotal && effectiveProductCounts && typeof effectiveProductCounts === 'object') {
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
          const pcKey = normalizePricingKey(productCode);
          const bottleCls = pcKey ? productCodeToBottleClassification.get(pcKey) : null;
          const unit = resolveDisplayUnitFromMaps({
            row: rowForPricing,
            item: { product_code: productCode },
            customerOverrideMap,
            assetPricingMap,
            defaultMonthly: defaultUnitRateByPeriod.monthly,
            defaultYearly: defaultUnitRateByPeriod.yearly,
            bottleClassificationNodeId: bottleCls || null,
            classificationNodesById:
              classificationNodesById instanceof Map && classificationNodesById.size > 0
                ? classificationNodesById
                : null,
          });
          return sum + unit * qty;
        }, 0);
        if (recalculated > 0) total = recalculated;
      }

      const activeMixKeys =
        effectiveProductCounts && typeof effectiveProductCounts === 'object'
          ? Object.keys(effectiveProductCounts).filter((k) => (parseFloat(effectiveProductCounts[k]) || 0) > 0)
          : [];
      const multiSkuProductMix = activeMixKeys.length > 1;

      if (!preserveLeaseContractTotal && allProductsOverride && !usedSpecificProductOverride && !multiSkuProductMix) {
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
      if (!fullyLeaseCoveredRentalRow && (parseFloat(total) || 0) <= 0) {
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
      if (!fullyLeaseCoveredRentalRow && !preserveLeaseContractTotal && (parseFloat(total) || 0) <= 0) {
        const qty = computedItemCount;
        if (qty > 0) {
          const periodFallback = String(row.billing_period || 'monthly').toLowerCase();
          const unit = periodFallback === 'yearly' ? defaultUnitRateByPeriod.yearly : defaultUnitRateByPeriod.monthly;
          total = (Number.isFinite(unit) ? unit : 0) * qty;
        }
      }

      if (fullyLeaseCoveredRentalRow) return null;
      return { ...row, itemCount: computedItemCount, ...(effectiveProductCounts ? { productCounts: effectiveProductCounts } : {}), totalPerCycle: total };
    }).filter(Boolean).filter((row) => canonicalBillingPeriod(row.billing_period) !== 'yearly');
  }, [
    enriched,
    customersWithBottlesNoSubscription,
    legacyRows,
    customerOverrideMap,
    ctx.customers,
    ctx.subscriptions,
    ctx.bottles,
    ctx.leaseContracts,
    assetPricingMap,
    defaultUnitRateByPeriod,
    organization?.id,
    customerResolvers,
    leaseCoveredCountByCustomerKey,
    classificationNodesById,
    productCodeToBottleClassification,
  ]);

  /** Stable key so invoice-status fetch does not re-run when `allRows` gets a new array reference but same customers/subs. */
  const cycleInvoiceLookupKey = useMemo(() => {
    const customerIds = [...new Set(
      (allRows || [])
        .map((r) => String(r.customer_id || '').trim())
        .filter(Boolean)
    )].sort().join('\u0001');
    const subscriptionIds = [...new Set(
      (allRows || [])
        .filter((r) => !r.isVirtual && r.id && !String(r.id).startsWith('legacy-') && !String(r.id).startsWith('virtual-'))
        .map((r) => r.id)
        .filter(Boolean)
    )].sort().join('\u0001');
    return `${customerIds}\u0002${subscriptionIds}`;
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
  }, [allRows, debouncedSearch, termsFilter]);

  const effectiveRowsPerPage = useMemo(() => {
    const n = Number(rowsPerPage);
    if (!Number.isFinite(n) || n < 1) return 50;
    return Math.min(500, Math.floor(n));
  }, [rowsPerPage]);

  const effectiveTablePage = useMemo(() => {
    if (filtered.length === 0) return 0;
    const maxPage = Math.max(0, Math.ceil(filtered.length / effectiveRowsPerPage) - 1);
    const p = Number(tablePage);
    if (!Number.isFinite(p) || p < 0) return 0;
    return Math.min(p, maxPage);
  }, [filtered.length, effectiveRowsPerPage, tablePage]);

  const pagedFiltered = useMemo(() => {
    const start = effectiveTablePage * effectiveRowsPerPage;
    return filtered.slice(start, start + effectiveRowsPerPage);
  }, [filtered, effectiveTablePage, effectiveRowsPerPage]);

  useEffect(() => {
    setTablePage(0);
  }, [termsFilter, debouncedSearch]);

  useEffect(() => {
    if (filtered.length === 0) {
      if (tablePage !== 0) setTablePage(0);
      return;
    }
    const maxPage = Math.max(0, Math.ceil(filtered.length / effectiveRowsPerPage) - 1);
    if (tablePage > maxPage) setTablePage(maxPage);
  }, [filtered.length, effectiveRowsPerPage, tablePage]);

  useEffect(() => {
    let active = true;
    const loadCycleInvoiceStatus = async () => {
      if (!organization?.id) {
        if (active) setCycleInvoiceLookup(emptyCycleInvoiceLookup());
        return;
      }
      const customerIds = [...new Set(
        (allRows || [])
          .map((r) => String(r.customer_id || '').trim())
          .filter(Boolean)
      )];
      const subscriptionIds = [
        ...new Set(
          (allRows || [])
            .filter((r) => !r.isVirtual && r.id && !String(r.id).startsWith('legacy-') && !String(r.id).startsWith('virtual-'))
            .map((r) => r.id)
            .filter(Boolean)
        ),
      ];
      if (customerIds.length === 0 && subscriptionIds.length === 0) {
        if (active) setCycleInvoiceLookup(emptyCycleInvoiceLookup());
        return;
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

      const mapByCustomer = {};
      const mapBySubscription = {};

      if (customerIds.length > 0) {
        const { periodStart: virtualCycleStart, periodEnd: virtualCycleEnd } = getCurrentCycleRange();
        const { data } = await supabase
          .from('invoices')
          .select('customer_id, invoice_number, status, created_at')
          .eq('organization_id', organization.id)
          .eq('period_start', virtualCycleStart)
          .eq('period_end', virtualCycleEnd)
          .in('customer_id', customerIds);
        if (!active) return;
        for (const row of (data || [])) {
          const key = String(row.customer_id || '').trim();
          if (!key) continue;
          mapByCustomer[key] = {
            invoice_number: row.invoice_number,
            status: String(row.status || '').toLowerCase(),
            updated_at: row.created_at || null,
          };
        }
      }

      if (subscriptionIds.length > 0) {
        const periodPairsMap = new Map();
        for (const r of allRows || []) {
          if (r.isVirtual || !r.id || String(r.id).startsWith('legacy-') || String(r.id).startsWith('virtual-')) {
            continue;
          }
          const { periodStart: ps, periodEnd: pe } = getPdfBillingPeriodForSub(r);
          periodPairsMap.set(`${ps}\t${pe}`, { periodStart: ps, periodEnd: pe });
        }
        const periodPairs = [...periodPairsMap.values()];

        let subInvQuery = supabase
          .from('subscription_invoices')
          .select('subscription_id, customer_id, invoice_number, status, updated_at, period_start, period_end')
          .eq('organization_id', organization.id)
          .in('subscription_id', subscriptionIds);

        if (periodPairs.length === 1) {
          subInvQuery = subInvQuery
            .eq('period_start', periodPairs[0].periodStart)
            .eq('period_end', periodPairs[0].periodEnd);
        } else if (periodPairs.length > 1) {
          const orExpr = periodPairs
            .map((p) => `and(period_start.eq.${p.periodStart},period_end.eq.${p.periodEnd})`)
            .join(',');
          subInvQuery = subInvQuery.or(orExpr);
        }

        const { data: subInvRows } = await subInvQuery;
        if (!active) return;
        for (const row of (subInvRows || [])) {
          const incoming = {
            invoice_number: row.invoice_number,
            status: String(row.status || '').toLowerCase(),
            updated_at: row.updated_at || null,
          };
          const ck = String(row.customer_id || '').trim();
          if (ck) {
            mapByCustomer[ck] = mergeCycleEntry(mapByCustomer[ck], incoming);
          }
          const sid = String(row.subscription_id || '').trim();
          if (sid) {
            mapBySubscription[sid] = mergeCycleEntry(mapBySubscription[sid], incoming);
          }
        }
      }

      setCycleInvoiceLookup({ byCustomerId: mapByCustomer, bySubscriptionId: mapBySubscription });
    };
    loadCycleInvoiceStatus().catch(() => {
      if (active) setCycleInvoiceLookup(emptyCycleInvoiceLookup());
    });
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `cycleInvoiceLookupKey` replaces `allRows` so we do not refetch when row arrays are recreated with the same customers/subscriptions
  }, [organization?.id, cycleInvoiceLookupKey, getCurrentCycleRange, getPdfBillingPeriodForSub, invoiceLookupRefreshKey]);

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

      const exported = downloadQuickBooksInvoiceCsv(
        (allRows || []).filter((r) => r.status === 'active' && (parseFloat(r.itemCount) || 0) > 0),
        { getCurrentCycleRange },
      );

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

  /** Same enriched rows as the grid: totals use computeSubscriptionBillingCycleTotal / totalPerCycle. */
  const getActiveExportRows = () => (allRows || []).filter((row) => (
    row.status === 'active' &&
    (parseFloat(row.itemCount) || 0) > 0
  ));

  const buildQbCsvExportRows = useCallback(async (period, cohort = 'all') => {
    const billingData = {
      bottles: ctx.bottles || [],
      rentals: ctx.rentals || [],
      leaseContracts: ctx.leaseContracts || [],
      leaseContractItems: ctx.leaseContractItems || [],
      customers: ctx.customers || [],
    };
    const pricingCtxExport = {
      customerOverrideMap,
      assetPricingMap,
      defaultMonthly: defaultUnitRateByPeriod.monthly,
      defaultYearly: defaultUnitRateByPeriod.yearly,
      classificationNodes: ctx.classificationNodes || [],
    };

    const base =
      qbCsvBillingMonth === 'live'
        ? getActiveExportRows()
        : (allRows || []).filter((row) => row.status === 'active');

    let rows = base.filter((r) => String(r.billing_period || 'monthly').toLowerCase() === period);
    if (period === 'monthly' && cohort !== 'all') {
      rows = rows.filter((r) => rowMatchesMonthlyQbCohort(r, cohort));
    }

    let csvOptions = { filePrefix: `quickbooks_invoices_${period}` };

    if (qbCsvBillingMonth !== 'live') {
      const pe = lastDayOfMonthYm(qbCsvBillingMonth);
      if (!pe) {
        return {
          rows: [],
          csvOptions: { filePrefix: `quickbooks_invoices_${period}` },
          invalidBillingMonth: true,
        };
      }
      const dates = qbCsvDatesForBilledMonth(qbCsvBillingMonth);

      // Load ALL rentals (open + closed) so the snapshot counts units active on the
      // period end — not just currently open ones from ctx.rentals.
      // Same approach as buildInvoicePdfForRow / handleExportInvoicePdfsZip.
      let snapshotRentals = billingData.rentals;
      try {
        const { data, error: rErr } = await supabase
          .from('rentals')
          .select('*')
          .eq('organization_id', organization.id);
        if (!rErr && data?.length) snapshotRentals = data;
      } catch { /* fall back to ctx.rentals */ }

      // Billable units = assigned bottles + open rentals as of month-end (same as computeSubscriptionBillingCycleTotal).
      const lookupSnapshotGroups = (mergedCust, row) => {
        const matchKey = subscriptionMatchKeyForInvoiceRow(row, mergedCust);
        return groupBillableUnitCountsByProductCode(
          billingData.bottles,
          snapshotRentals,
          matchKey,
          mergedCust,
          {
            allCustomers: billingData.customers,
            asOfPeriodEnd: pe,
            allowAssignedBottleRecovery: true,
          },
        );
      };

      const snapshotGroupsCache = new Map();
      const mapped = [];
      for (const row of rows) {
        const leaseKeys = expandLeaseMatchKeys(row.customer_id, row.customer, ctx.customers);
        const matchesLeaseContract = (ctx.leaseContracts || []).some((c) => {
          if (organization?.id && c.organization_id && c.organization_id !== organization?.id) return false;
          const ck = normalize(String(c.customer_id || '').trim());
          return ck && leaseKeys.has(ck);
        });
        const useLeaseContractIfPresent =
          row.customer?.billing_mode === 'lease' || matchesLeaseContract;
        const contract = findActiveLeaseContract(
          billingData.leaseContracts,
          row.customer_id,
          row.organization_id
        );
        const isLeasePricing =
          row.customer?.billing_mode === 'lease' || (!!contract && useLeaseContractIfPresent);
        if (isLeasePricing) {
          const total = computeSubscriptionBillingCycleTotal(
            { ...row, billing_period: row.billing_period },
            row.customer,
            pricingCtxExport,
            { ...billingData, useLeaseContractIfPresent }
          );
          mapped.push({ ...row, totalPerCycle: total, itemCount: row.itemCount });
          continue;
        }
        const baseCust =
          matchCustomerRecordBySubscriptionId(row.customer_id) ||
          row.customer || {
            id: row.customer_id,
            CustomerListID: row.customer_id,
          };
        const mergedCust = mergeCustomerDirectoryFields(
          baseCust,
          row.customer_id,
          matchCustomerRecordBySubscriptionId,
        );
        const listId = String(
          row.customer_id || mergedCust?.CustomerListID || mergedCust?.id || '',
        ).trim();
        const nameKey = String(mergedCust?.name || mergedCust?.Name || '')
          .trim()
          .replace(/\s+/g, ' ')
          .toLowerCase();
        const gCacheKey = `${pe}\t${listId}\t${nameKey}`;
        let groups = snapshotGroupsCache.get(gCacheKey);
        if (!groups) {
          groups = lookupSnapshotGroups(mergedCust, row);
          snapshotGroupsCache.set(gCacheKey, groups);
        }
        const total = computeSubscriptionBillingCycleTotal(
          { ...row, billing_period: row.billing_period },
          mergedCust,
          pricingCtxExport,
          {
            ...billingData,
            rentals: snapshotRentals,
            useLeaseContractIfPresent,
            asOfPeriodEnd: pe,
            allowAssignedBottleRecovery: true,
            precomputedGroups: groups,
          }
        );
        const itemCount = groups.reduce((s, g) => s + (Number(g.count) || 0), 0);
        mapped.push({
          ...row,
          totalPerCycle: total,
          itemCount,
        });
      }
      qbSnapshotGroupsCacheRef.current = snapshotGroupsCache;
      rows = mapped.filter(
        (r) => (parseFloat(r.totalPerCycle) || 0) > 0 && (parseFloat(r.itemCount) || 0) > 0
      );
      csvOptions = {
        ...csvOptions,
        invoiceDate: dates.invoiceDate,
        dueDate: dates.dueDate,
        sequenceMonth: qbCsvBillingMonth,
      };
    } else {
      const c = getCurrentCycleRange();
      csvOptions = {
        ...csvOptions,
        invoiceDate: c.periodEnd,
        dueDate: c.dueDate,
        sequenceMonth: c.periodStart.slice(0, 7),
      };
    }

    return { rows, csvOptions };
  }, [
    allRows,
    assetPricingMap,
    ctx.bottles,
    ctx.customers,
    ctx.classificationNodes,
    ctx.leaseContractItems,
    ctx.leaseContracts,
    ctx.rentals,
    customerOverrideMap,
    defaultUnitRateByPeriod.monthly,
    defaultUnitRateByPeriod.yearly,
    getActiveExportRows,
    getCurrentCycleRange,
    organization?.id,
    qbCsvBillingMonth,
  ]);

  const handleExportQbInvoiceCsv = async (period, cohort = 'all') => {
    setActionError(null);
    setActionSuccess(null);
    setSaving(true);
    try {
      if (period === 'yearly') {
        setActionError('Yearly lease QuickBooks CSV is available on the Lease agreements page.');
        return;
      }
      const result = await buildQbCsvExportRows(period, cohort);
      if (result.invalidBillingMonth) {
        setActionError('Select a valid billing month for the QuickBooks export.');
        return;
      }
      const { rows, csvOptions } = result;
      if (rows.length === 0) {
        const cohortHint =
          period === 'monthly' && cohort === 'net30'
            ? ' (NET 30 terms only — check customer payment terms on import)'
            : period === 'monthly' && cohort === 'credit_card'
              ? ' (credit card terms, including COD aliases)'
              : '';
        const snapHint =
          qbCsvBillingMonth !== 'live'
            ? ' For a past month, no rows had billable units on that month-end (or filters exclude everyone).'
            : '';
        setActionError(`No active ${period} rentals match this export${cohortHint}.${snapHint}`);
        return;
      }

      const cohortSuffix =
        period === 'monthly' && cohort === 'net30'
          ? '_net30'
          : period === 'monthly' && cohort === 'credit_card'
            ? '_creditcard'
            : '';
      const monthTag = qbCsvBillingMonth === 'live' ? 'live' : qbCsvBillingMonth;
      const resolveInvNo = resolveInvNoRef.current;
      const rowsWithInvoiceNumbers = [];
      if (resolveInvNo) {
        for (const row of rows) {
          rowsWithInvoiceNumbers.push({
            ...row,
            invoice_number: await resolveInvNo(row),
          });
        }
      } else {
        rowsWithInvoiceNumbers.push(...rows);
      }
      const exported = downloadQuickBooksInvoiceCsv(rowsWithInvoiceNumbers, {
        ...csvOptions,
        filePrefix: `quickbooks_invoices_${period}${cohortSuffix}_${monthTag}`,
        getCurrentCycleRange,
      });
      const cohortLabel =
        period === 'monthly' && cohort === 'net30'
          ? ', NET 30 customers only'
          : period === 'monthly' && cohort === 'credit_card'
            ? ', credit card customers only (includes COD)'
            : '';
      const monthLabel =
        qbCsvBillingMonth === 'live'
          ? 'current cycle dates, live counts'
          : `billed month ${qbCsvBillingMonth} (month-end snapshot)`;
      setActionSuccess(
        `Exported ${exported} QuickBooks CSV row${exported === 1 ? '' : 's'} (${period}${cohortLabel}; ${monthLabel}). Invoice numbers match PDF/email (saved cycle numbers).`
      );
      setInvoiceLookupRefreshKey((k) => k + 1);
    } finally {
      setSaving(false);
    }
  };

  const ensureVirtualInvoiceNumber = useCallback(async (row) => {
    const { periodStart, periodEnd, dueDate } = getBillingPeriodForSub(row, {
      qbBillingMonthYm: qbCsvBillingMonth,
    });
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
  }, [organization?.id, qbCsvBillingMonth]);

  /** Reserve a real subscription_invoices row + sequential # when none exists (avoids W00010-style id fallbacks). */
  const ensureSubscriptionCycleInvoiceNumber = useCallback(
    async (sub) => {
      const { periodStart, periodEnd } = getPdfBillingPeriodForSub(sub, qbCsvBillingMonth);
      const { dueDate } = getBillingPeriodForSub(sub, { qbBillingMonthYm: qbCsvBillingMonth }).dueDate
        || getCurrentCycleRange().dueDate;
      const cid = String(sub?.customer_id || '').trim();
      const rawId = sub?.id;
      const subId =
        rawId != null
        && !sub?.isVirtual
        && !String(rawId).startsWith('virtual-')
        && !String(rawId).startsWith('legacy-')
          ? String(rawId).trim()
          : '';
      if (!organization?.id || !cid || !subId || !periodStart || !periodEnd) return null;

      const { data: existingSi } = await supabase
        .from('subscription_invoices')
        .select('invoice_number')
        .eq('organization_id', organization.id)
        .eq('subscription_id', subId)
        .eq('period_start', periodStart)
        .eq('period_end', periodEnd)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const existingNo = String(existingSi?.invoice_number || '').trim();
      if (existingNo) return existingNo;

      const total = parseFloat(sub?.totalPerCycle) || 0;
      const gstAmt = +(total * 0.05).toFixed(2);
      const pstAmt = +(total * 0.06).toFixed(2);
      const taxAmount = +(gstAmt + pstAmt).toFixed(2);
      const totalAmount = +(total + taxAmount).toFixed(2);

      let lastErr = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const reserved = await getNextInvoiceNumbers(organization.id, 1);
        const invoiceNumber = reserved?.[0];
        if (!invoiceNumber) {
          throw new Error('Failed to reserve a unique invoice number. Please retry.');
        }
        const { error } = await supabase.from('subscription_invoices').insert({
          organization_id: organization.id,
          subscription_id: subId,
          customer_id: cid,
          invoice_number: invoiceNumber,
          status: 'draft',
          period_start: periodStart,
          period_end: periodEnd,
          subtotal: total,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          due_date: dueDate,
        });
        if (!error) return invoiceNumber;
        lastErr = error;
        const { data: raceSi } = await supabase
          .from('subscription_invoices')
          .select('invoice_number')
          .eq('organization_id', organization.id)
          .eq('subscription_id', subId)
          .eq('period_start', periodStart)
          .eq('period_end', periodEnd)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        const raceNo = String(raceSi?.invoice_number || '').trim();
        if (raceNo) return raceNo;
        if (String(error?.code || '') !== '23505') break;
      }
      if (lastErr) console.warn('ensureSubscriptionCycleInvoiceNumber:', lastErr);
      return null;
    },
    [organization?.id, getPdfBillingPeriodForSub, getCurrentCycleRange, qbCsvBillingMonth],
  );

  /**
   * `defaultInvoiceNumber(sub)` derives Wxxxxx from the Stripe subscription id (e.g. W00010).
   * If that was persisted to subscription_invoices before real sequences existed, replace it
   * with invoice_settings / getNextInvoiceNumbers and update the row.
   */
  const repairPlaceholderSubscriptionInvoiceNumber = useCallback(
    async (sub, invNo) => {
      const n = String(invNo || '').trim();
      if (!n || !organization?.id || sub?.isVirtual) return invNo;
      const rawId = sub?.id;
      if (
        rawId == null
        || String(rawId).startsWith('virtual-')
        || String(rawId).startsWith('legacy-')
      ) {
        return invNo;
      }
      const placeholder = defaultInvoiceNumber({ id: rawId, invoice_number: '' });
      if (n !== placeholder) return invNo;

      const { periodStart, periodEnd } = getPdfBillingPeriodForSub(sub, qbCsvBillingMonth);
      if (!periodStart || !periodEnd) return invNo;
      const subId = String(rawId).trim();

      const { data: si } = await supabase
        .from('subscription_invoices')
        .select('id, invoice_number')
        .eq('organization_id', organization.id)
        .eq('subscription_id', subId)
        .eq('period_start', periodStart)
        .eq('period_end', periodEnd)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!si?.id) return invNo;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const reserved = await getNextInvoiceNumbers(organization.id, 1);
        const next = reserved?.[0];
        if (!next || String(next).trim() === n) return invNo;
        const { error } = await supabase
          .from('subscription_invoices')
          .update({ invoice_number: next, updated_at: new Date().toISOString() })
          .eq('id', si.id);
        if (!error) return String(next).trim();
        if (String(error?.code || '') !== '23505') break;
      }
      return invNo;
    },
    [organization?.id, getPdfBillingPeriodForSub],
  );

  /**
   * After a successful send-invoice-email call, persist `sent` so the Rentals table "Emailed" chip survives refresh.
   * Inserts a cycle row when none exists (e.g. PDF used a placeholder # without a DB row, or invoice # mismatch blocked update).
   */
  const persistRentalInvoiceEmailSent = useCallback(
    async (row, pdfInvNo) => {
      const invNo = String(pdfInvNo || '').trim();
      if (!invNo || !organization?.id) return;

      if (row?.isVirtual && row?.customer_id) {
        const { periodStart, periodEnd, dueDate } = getCurrentCycleRange();
        const invoiceDate = new Date().toISOString().split('T')[0];
        const total = parseFloat(row?.totalPerCycle) || 0;
        const gstAmt = +(total * 0.05).toFixed(2);
        const pstAmt = +(total * 0.06).toFixed(2);
        const taxAmount = +(gstAmt + pstAmt).toFixed(2);
        const totalAmount = +(total + taxAmount).toFixed(2);

        const { data: existingRows } = await supabase
          .from('invoices')
          .select('id')
          .eq('organization_id', organization.id)
          .eq('customer_id', row.customer_id)
          .eq('period_start', periodStart)
          .eq('period_end', periodEnd)
          .limit(1);

        const invId = existingRows?.[0]?.id;
        if (invId) {
          await supabase
            .from('invoices')
            .update({
              status: 'sent',
              invoice_number: invNo,
            })
            .eq('id', invId);
        } else {
          await supabase.from('invoices').insert({
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
            invoice_number: invNo,
            status: 'sent',
          });
        }
        return;
      }

      if (!row?.id || row.isVirtual) return;
      const rawId = row.id;
      if (String(rawId).startsWith('legacy-') || String(rawId).startsWith('virtual-')) return;

      const subId = String(rawId).trim();
      const { periodStart, periodEnd } = getPdfBillingPeriodForSub(row, qbCsvBillingMonth);
      const { dueDate } = getBillingPeriodForSub(row, { qbBillingMonthYm: qbCsvBillingMonth }).dueDate
        || getCurrentCycleRange().dueDate;
      const cid = String(row.customer_id || '').trim();
      if (!subId || !cid || !periodStart || !periodEnd) return;

      const { data: siRows } = await supabase
        .from('subscription_invoices')
        .select('id')
        .eq('organization_id', organization.id)
        .eq('subscription_id', subId)
        .eq('period_start', periodStart)
        .eq('period_end', periodEnd)
        .order('updated_at', { ascending: false })
        .limit(1);

      const siId = siRows?.[0]?.id;
      const total = parseFloat(row?.totalPerCycle) || 0;
      const gstAmt = +(total * 0.05).toFixed(2);
      const pstAmt = +(total * 0.06).toFixed(2);
      const taxAmount = +(gstAmt + pstAmt).toFixed(2);
      const totalAmount = +(total + taxAmount).toFixed(2);

      if (siId) {
        await supabase
          .from('subscription_invoices')
          .update({
            status: 'sent',
            invoice_number: invNo,
            updated_at: new Date().toISOString(),
          })
          .eq('id', siId);
      } else {
        await supabase.from('subscription_invoices').insert({
          organization_id: organization.id,
          subscription_id: subId,
          customer_id: cid,
          invoice_number: invNo,
          status: 'sent',
          period_start: periodStart,
          period_end: periodEnd,
          subtotal: total,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          due_date: dueDate,
        });
      }
    },
    [organization?.id, getCurrentCycleRange, getPdfBillingPeriodForSub],
  );

  /**
   * Persist a user-chosen invoice # for the current billing cycle so PDF, email, and Excel
   * all read it via resolveInvoiceNumberForRentalPdf / resolveRentalInvoiceNumberForActions.
   */
  const persistCustomInvoiceNumber = useCallback(
    async (sub, newNumberRaw) => {
      const newNumber = String(newNumberRaw || '').trim();
      const takenMsg = (n) =>
        `Invoice number "${n}" is already taken. Use a different number.`;
      if (!newNumber) {
        return { success: false, error: 'Invoice number is required.' };
      }
      if (!organization?.id) {
        return { success: false, error: 'Organization not loaded.' };
      }
      const cid = String(sub?.customer_id || '').trim();
      if (!cid) {
        return { success: false, error: 'This row has no customer id.' };
      }
      const { periodStart, periodEnd } = getPdfBillingPeriodForSub(sub, qbCsvBillingMonth);
      if (!periodStart || !periodEnd) {
        return { success: false, error: 'Could not determine billing period for this row.' };
      }
      const { dueDate } = getBillingPeriodForSub(sub, { qbBillingMonthYm: qbCsvBillingMonth }).dueDate
        || getCurrentCycleRange().dueDate;
      const today = new Date().toISOString().split('T')[0];
      const total = parseFloat(sub?.totalPerCycle) || 0;
      const gstAmt = +(total * 0.05).toFixed(2);
      const pstAmt = +(total * 0.06).toFixed(2);
      const taxAmount = +(gstAmt + pstAmt).toFixed(2);
      const totalAmount = +(total + taxAmount).toFixed(2);
      const customerName = sub?.customer?.name || sub?.customer?.Name || cid;

      const isVirtualBilling = Boolean(sub?.isVirtual);
      const rawSid = sub?.id != null ? String(sub.id).trim() : '';
      const subIdOk =
        rawSid
        && !rawSid.startsWith('virtual-')
        && !rawSid.startsWith('legacy-');

      if (!isVirtualBilling && !subIdOk) {
        return {
          success: false,
          error: 'This rental row cannot store an invoice number (missing subscription id).',
        };
      }

      try {
        if (isVirtualBilling) {
          const { data: existingInv } = await supabase
            .from('invoices')
            .select('id')
            .eq('organization_id', organization.id)
            .eq('customer_id', cid)
            .eq('period_start', periodStart)
            .eq('period_end', periodEnd)
            .maybeSingle();

          if (existingInv?.id) {
            const { data: conflict } = await supabase
              .from('invoices')
              .select('id')
              .eq('organization_id', organization.id)
              .eq('invoice_number', newNumber)
              .neq('id', existingInv.id)
              .maybeSingle();
            if (conflict?.id) {
              return { success: false, error: takenMsg(newNumber) };
            }
            const { error } = await supabase
              .from('invoices')
              .update({ invoice_number: newNumber })
              .eq('id', existingInv.id);
            if (error) throw error;
          } else {
            const { data: conflict } = await supabase
              .from('invoices')
              .select('id')
              .eq('organization_id', organization.id)
              .eq('invoice_number', newNumber)
              .maybeSingle();
            if (conflict?.id) {
              return { success: false, error: takenMsg(newNumber) };
            }
            const { error } = await supabase.from('invoices').insert({
              organization_id: organization.id,
              customer_id: cid,
              customer_name: customerName,
              period_start: periodStart,
              period_end: periodEnd,
              invoice_date: today,
              due_date: dueDate,
              subtotal: total,
              tax_amount: taxAmount,
              total_amount: totalAmount,
              status: 'pending',
              invoice_number: newNumber,
            });
            if (error) throw error;
          }
        } else {
          const subId = rawSid;
          const { data: existingSi } = await supabase
            .from('subscription_invoices')
            .select('id')
            .eq('organization_id', organization.id)
            .eq('subscription_id', subId)
            .eq('period_start', periodStart)
            .eq('period_end', periodEnd)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (existingSi?.id) {
            const { data: conflict } = await supabase
              .from('subscription_invoices')
              .select('id')
              .eq('organization_id', organization.id)
              .eq('invoice_number', newNumber)
              .neq('id', existingSi.id)
              .maybeSingle();
            if (conflict?.id) {
              return { success: false, error: takenMsg(newNumber) };
            }
            const { error } = await supabase
              .from('subscription_invoices')
              .update({ invoice_number: newNumber, updated_at: new Date().toISOString() })
              .eq('id', existingSi.id);
            if (error) throw error;
          } else {
            const { data: conflict } = await supabase
              .from('subscription_invoices')
              .select('id')
              .eq('organization_id', organization.id)
              .eq('invoice_number', newNumber)
              .maybeSingle();
            if (conflict?.id) {
              return { success: false, error: takenMsg(newNumber) };
            }
            const { error } = await supabase.from('subscription_invoices').insert({
              organization_id: organization.id,
              subscription_id: subId,
              customer_id: cid,
              invoice_number: newNumber,
              status: 'draft',
              period_start: periodStart,
              period_end: periodEnd,
              subtotal: total,
              tax_amount: taxAmount,
              total_amount: totalAmount,
              due_date: dueDate,
            });
            if (error) throw error;
          }
        }
        return { success: true };
      } catch (e) {
        const code = String(e?.code || '');
        const msg = String(e?.message || '');
        if (code === '23505' || msg.includes('unique') || msg.includes('duplicate')) {
          return { success: false, error: takenMsg(newNumber) };
        }
        return { success: false, error: e?.message || 'Failed to save invoice number.' };
      }
    },
    [organization?.id, getPdfBillingPeriodForSub, getCurrentCycleRange],
  );

  /** Same invoice # for PDF download, email, and bulk email (virtual rows use persisted `invoices` via ensureVirtual). */
  const resolveRentalInvoiceNumberForActions = useCallback(
    async (sub) => {
      const { periodStart, periodEnd } = getPdfBillingPeriodForSub(sub, qbCsvBillingMonth);
      // Saved / prep # / subscription_invoices always win — never stale browser CSV cache for org users.
      let invNo = '';
      let fromDb = await resolveInvoiceNumberForRentalPdf(
        supabase,
        organization.id,
        sub,
        periodStart,
        periodEnd
      );
      // Invoice # column uses live cycle; QB month dropdown must not miss prep # rows.
      if (!fromDb && String(qbCsvBillingMonth || 'live').trim().toLowerCase() !== 'live') {
        const livePeriod = getPdfBillingPeriodForSub(sub, 'live');
        fromDb = await resolveInvoiceNumberForRentalPdf(
          supabase,
          organization.id,
          sub,
          livePeriod.periodStart,
          livePeriod.periodEnd
        );
      }
      if (fromDb) invNo = String(fromDb).trim();

      // Reserve the next org-wide sequential # for this billing period (never reuse last month's row).
      if (!invNo && sub?.isVirtual) {
        const v = await ensureVirtualInvoiceNumber(sub);
        invNo = v ? String(v).trim() : '';
      }
      if (!invNo && !sub?.isVirtual) {
        const ensured = await ensureSubscriptionCycleInvoiceNumber(sub);
        invNo = ensured ? String(ensured).trim() : '';
      }

      // Legacy localStorage W10000+ preview only when org counter could not run.
      if (!invNo && !organization?.id) {
        const csvPeriod =
          String(sub?.billing_period || 'monthly').toLowerCase() === 'yearly' ? 'yearly' : 'monthly';
        try {
          const built = await buildQbCsvExportRows(csvPeriod, 'all');
          if (!built.invalidBillingMonth && built.rows?.length) {
            const qbNo = computeQbSequentialInvoiceNumber(built.rows, built.csvOptions, sub);
            if (qbNo) invNo = String(qbNo).trim();
          }
        } catch (e) {
          console.warn('QB sequential invoice number lookup failed', e);
        }
      }
      if (!invNo) {
        invNo = defaultInvoiceNumber(sub);
      }
      const repaired = await repairPlaceholderSubscriptionInvoiceNumber(sub, invNo);
      return repaired || invNo;
    },
    [
      buildQbCsvExportRows,
      ensureVirtualInvoiceNumber,
      ensureSubscriptionCycleInvoiceNumber,
      getPdfBillingPeriodForSub,
      organization?.id,
      qbCsvBillingMonth,
      repairPlaceholderSubscriptionInvoiceNumber,
    ]
  );

  resolveInvNoRef.current = resolveRentalInvoiceNumberForActions;

  const openInvoiceNumberDialog = useCallback(
    async (sub) => {
      blurActiveElement();
      setActionError(null);
      setInvoiceNoSaveError('');
      setInvoiceNoEditRow(sub);
      setInvoiceNoDraft('');
      setInvoiceNoDialogOpen(true);
      try {
        const n = await resolveRentalInvoiceNumberForActions(sub);
        setInvoiceNoDraft(n || '');
      } catch {
        setInvoiceNoDraft('');
      }
    },
    [blurActiveElement, resolveRentalInvoiceNumberForActions],
  );

  const handleSaveInvoiceNumber = useCallback(async () => {
    if (!invoiceNoEditRow) return;
    setSavingInvoiceNo(true);
    setActionError(null);
    setInvoiceNoSaveError('');
    try {
      const result = await persistCustomInvoiceNumber(invoiceNoEditRow, invoiceNoDraft);
      if (!result.success) {
        const err = result.error || 'Could not save invoice number.';
        setInvoiceNoSaveError(err);
        setActionError(err);
        return;
      }
      setInvoiceLookupRefreshKey((k) => k + 1);
      setInvoiceNoDialogOpen(false);
      setInvoiceNoEditRow(null);
      setInvoiceNoSaveError('');
      setActionSuccess(
        'Invoice number saved. PDF, email, and Excel will use this number for this billing cycle.',
      );
    } catch (e) {
      const err = e?.message || 'Failed to save invoice number.';
      setInvoiceNoSaveError(err);
      setActionError(err);
    } finally {
      setSavingInvoiceNo(false);
    }
  }, [invoiceNoEditRow, invoiceNoDraft, persistCustomInvoiceNumber]);

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

  const buildInvoicePdfForRow = useCallback(async (row, invoiceNumberOverride = null, pdfBuildOpts = {}) => {
    const orgRentalsCache = pdfBuildOpts.orgRentalsCache;
    const { periodStart, periodEnd, dueDate } = computeSharedInvoicePdfPeriodForRow(
      row,
      qbCsvBillingMonth
    );
    const invoiceDate = periodEnd;

    const rawCustomer =
      matchCustomerRecordBySubscriptionId(row.customer_id) ||
      row?.customer ||
      {
        CustomerListID: row.customer_id,
        id: row.customer_id,
        name: row.customer_name || row.customer_id,
        Name: row.customer_name,
      };
    const customerMerged = mergeCustomerDirectoryFields(
      rawCustomer,
      row.customer_id,
      matchCustomerRecordBySubscriptionId,
    );
    const customerRecord = {
      ...customerMerged,
      purchase_order:
        customerMerged.purchase_order
        ?? rawCustomer.purchase_order
        ?? row?.customer?.purchase_order
        ?? null,
    };

    /** Enriched row shape so asset list / returns use the same customer as Customer Detail. */
    const rowForBilling = { ...row, customer: customerRecord };

    let lineItems = [];
    let hasDetail = false;

    let rentalsForSnapshot = ctx.rentals || [];
    /** When `live`, invoice lines must match Subscriptions grid (`productCounts` / open-rental rollup). When a past month is selected, use month-end snapshot (bottles + rentals as-of). */
    const pdfBillingLive = String(qbCsvBillingMonth || '').trim().toLowerCase() === 'live';
    const billingMode = String(customerRecord?.billing_mode || '').toLowerCase();
    if (billingMode === 'lease') {
      lineItems = getLineItemsForRow(row);
      hasDetail =
        (Array.isArray(row?.items) && row.items.length > 0) ||
        (row?.productCounts && Object.keys(row.productCounts || {}).length > 0);
    } else {
      try {
        let orgRentals;
        let rErr = null;
        if (Array.isArray(orgRentalsCache)) {
          orgRentals = orgRentalsCache;
        } else {
          const res = await supabase
            .from('rentals')
            .select('*')
            .eq('organization_id', organization.id);
          orgRentals = res.data;
          rErr = res.error;
        }
        if (!rErr && Array.isArray(orgRentals)) {
          rentalsForSnapshot = orgRentals;
        }

        // Live PDF: same SKU lines and totals as the grid (enriched row.productCounts).
        if (
          pdfBillingLive &&
          row?.productCounts &&
          Object.keys(row.productCounts).length > 0
        ) {
          lineItems = getLineItemsForRow(row);
          hasDetail = lineItems.length > 0;
        } else {
          const listId = String(
            row.customer_id || customerRecord?.CustomerListID || customerRecord?.id || '',
          ).trim();
          const custName = String(customerRecord?.name || customerRecord?.Name || '').trim();
          const nameKey = custName.replace(/\s+/g, ' ').toLowerCase();
          const zipGroupsCache = pdfBuildOpts.zipGroupsCache;
          const gCacheKey = `${pdfBillingLive ? 'live' : periodEnd}\t${listId}\t${nameKey}`;
          let groups = zipGroupsCache?.get(gCacheKey);
          if (!groups) {
            const rentalRowsForBilling = pdfBillingLive
              ? ((ctx.rentals && ctx.rentals.length > 0)
                  ? ctx.rentals
                  : ((!rErr && Array.isArray(orgRentals)) ? orgRentals : (ctx.rentals || [])))
              : ((!rErr && Array.isArray(orgRentals)) ? orgRentals : (ctx.rentals || []));
            const groupOpts = pdfBillingLive
              ? { allCustomers: ctx.customers || [] }
              : {
                  allCustomers: ctx.customers || [],
                  asOfPeriodEnd: periodEnd,
                  allowAssignedBottleRecovery: true,
                };
            groups = groupBillableUnitCountsByProductCode(
              ctx.bottles || [],
              rentalRowsForBilling,
              subscriptionMatchKeyForInvoiceRow(row, customerRecord),
              customerRecord,
              groupOpts,
            );
            if (zipGroupsCache) zipGroupsCache.set(gCacheKey, groups);
          }
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
      if (!hasDetail || lineItems.length === 0) {
        lineItems = getLineItemsForRow(row);
        hasDetail =
          (Array.isArray(row?.items) && row.items.length > 0) ||
          (row?.productCounts && Object.keys(row.productCounts || {}).length > 0) ||
          lineItems.length > 0;
      }
    }

    const lineSum = lineItems.reduce((s, li) => s + (Number(li.amount) || 0), 0);
    const rowTotal = parseFloat(row.totalPerCycle) || 0;
    /** Live rental invoices: match grid subtotal. Lease / historical month: use computed lines. */
    const total =
      billingMode !== 'lease' && pdfBillingLive && rowTotal > 0
        ? rowTotal
        : hasDetail && lineSum > 0
          ? lineSum
          : rowTotal;
    const gstRate = 0.05;
    const pstRate = 0.06;
    const gst = +(total * gstRate).toFixed(2);
    const pst = +(total * pstRate).toFixed(2);
    const tax = +(gst + pst).toFixed(2);
    const taxRate = +(gstRate + pstRate).toFixed(2);
    const grandTotal = +(total + tax).toFixed(2);
    let openAssets = buildOpenAssetRowsForInvoice(rowForBilling, ctx.bottles, rentalsForSnapshot, {
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
      const returnsByKey = pdfBuildOpts.returnsByPeriodKey;
      const rk = invoiceReturnsCacheKey(periodStart, periodEnd);
      const bulk = returnsByKey?.get(rk);
      if (bulk && Array.isArray(bulk)) {
        returnsInPeriod = bulk.filter((r) => rentalRowMatchesInvoiceCustomer(r, rowForBilling));
      } else {
        returnsInPeriod = await fetchReturnsInInvoicePeriod(supabase, organization.id, rowForBilling, periodStart, periodEnd);
      }
    } catch (e) {
      console.warn('Invoice PDF: could not load returns in period', e);
    }
    const bottlesForPdf = openAssets.map((b) => (b.display_label ? { ...b, description: b.display_label } : b));
    let remitForPdf = remitAddress;
    const hasBillTo =
      String(remitForPdf?.remit_name || '').trim() ||
      String(remitForPdf?.remit_address_line1 || '').trim();
    if (organization?.id && !hasBillTo) {
      try {
        const { data } = await supabase
          .from('invoice_settings')
          .select('remit_name, remit_address_line1, remit_address_line2, remit_address_line3, gst_number')
          .eq('organization_id', organization.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) remitForPdf = data;
      } catch (e) {
        console.warn('Invoice PDF: could not load bill-to from invoice_settings', e);
      }
    }
    const mergedTemplate = { ...(invoiceTemplate || {}) };
    // Always let Settings -> Bill-To values override any stale local template fields.
    if (remitForPdf) {
      mergedTemplate.remit_name = remitForPdf.remit_name || '';
      mergedTemplate.remit_address_line1 = remitForPdf.remit_address_line1 || '';
      mergedTemplate.remit_address_line2 = remitForPdf.remit_address_line2 || '';
      mergedTemplate.remit_address_line3 = remitForPdf.remit_address_line3 || '';
      mergedTemplate.gst_number = remitForPdf.gst_number || '';
    }
    const invoiceNoForPdf =
      String(invoiceNumberOverride ?? '').trim() ||
      String(row?.invoice_number ?? '').trim() ||
      defaultInvoiceNumber(row);
    const poForPdf = String(customerRecord?.purchase_order ?? row?.customer?.purchase_order ?? '').trim();
    const pdfResult = await createRentalInvoicePdfDoc({
      organization,
      invoiceTemplate: mergedTemplate,
      primaryColorFallback: primaryColor,
      row,
      customerRecord,
      lineItems,
      invoiceNumber: invoiceNoForPdf,
      totals: { subtotal: total, gst, pst, tax, amountDue: grandTotal, gstRate, pstRate, taxRate },
      period: { start: periodStart, end: periodEnd },
      dates: { invoice: invoiceDate, due: dueDate },
      terms: customerRecord?.payment_terms || 'NET 30',
      purchaseOrder: poForPdf || undefined,
      bottles: bottlesForPdf,
      returnsInPeriod,
      formatCurrency,
    });
    return {
      ...pdfResult,
      amountDue: grandTotal,
      subtotal: total,
      invoiceNumber: invoiceNoForPdf,
      lineItems,
      bottles: bottlesForPdf,
      totals: { subtotal: total, gst, pst, tax, amountDue: grandTotal, gstRate, pstRate, taxRate },
      dates: { invoice: invoiceDate, due: dueDate },
    };
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
    qbCsvBillingMonth,
    remitAddress,
  ]);

  const handleDownloadInvoicePdfForRow = useCallback(async (sub) => {
    const total = parseFloat(sub.totalPerCycle) || 0;
    if (total <= 0) {
      setActionError('Cannot download a $0.00 invoice PDF.');
      return;
    }
    try {
      const invNo = await resolveRentalInvoiceNumberForActions(sub);
      const snapOpts = qbSnapshotGroupsCacheRef.current ? { zipGroupsCache: qbSnapshotGroupsCacheRef.current } : {};
      const { doc, fileName, customerName } = await buildInvoicePdfForRow(sub, invNo, snapOpts);
      doc.save(fileName);
      setActionSuccess(`Invoice PDF downloaded for ${customerName}.`);
    } catch (err) {
      setActionError(err.message || 'Failed to generate invoice PDF.');
    }
  }, [buildInvoicePdfForRow, organization?.id, resolveRentalInvoiceNumberForActions]);

  const handleExportCustomerExcel = useCallback(async (sub) => {
    try {
      const invNo = await resolveRentalInvoiceNumberForActions(sub);
      const snapOpts = qbSnapshotGroupsCacheRef.current ? { zipGroupsCache: qbSnapshotGroupsCacheRef.current } : {};
      const invoiceBundle = await buildInvoicePdfForRow(sub, invNo, snapOpts);
      const total = Number(invoiceBundle?.totals?.subtotal ?? invoiceBundle?.subtotal ?? 0);
      if (total <= 0) {
        setActionError('Cannot export a $0.00 invoice row.');
        return;
      }

      const gst = +(invoiceBundle?.totals?.gst ?? 0);
      const pst = +(invoiceBundle?.totals?.pst ?? 0);
      const tax = +(invoiceBundle?.totals?.tax ?? (gst + pst));
      const grandTotal = +(invoiceBundle?.totals?.amountDue ?? (total + tax));
      const txCode = resolveTaxCode(gst, pst);
      const invoiceDate = invoiceBundle?.dates?.invoice || getCurrentCycleRange().periodEnd;
      const dueDate = invoiceBundle?.dates?.due || getCurrentCycleRange().dueDate;
      const poExcel = String(
        sub?.customer?.purchase_order
          ?? matchCustomerRecordBySubscriptionId(sub?.customer_id)?.purchase_order
          ?? '',
      ).trim();
      const orderedColumns = [
        'Invoice#',
        'Customer Number',
        'P.O.',
        'Total',
        'Date',
        'TX',
        'TX code',
        'Due date',
        'Rate',
        'Name',
        '# of Bottles',
      ];

      const lineQtySum = Array.isArray(invoiceBundle?.lineItems)
        ? invoiceBundle.lineItems.reduce((s, li) => s + (Number(li.qty) || 0), 0)
        : 0;
      const bottleCountExcel =
        lineQtySum > 0 ? lineQtySum : (parseFloat(sub.itemCount) || 0);

      const singleRowOrdered = [{
        'Invoice#': invoiceBundle?.invoiceNumber || invNo,
        'Customer Number': sub.customer_id || '',
        'P.O.': poExcel,
        'Total': grandTotal,
        'Date': invoiceDate,
        'TX': tax,
        'TX code': txCode,
        'Due date': dueDate,
        'Rate': total,
        'Name': sub.customer?.name || sub.customer?.Name || sub.customer_id || '',
        '# of Bottles': bottleCountExcel,
      }];

      const wb = XLSX.utils.book_new();
      const summaryWs = XLSX.utils.json_to_sheet(singleRowOrdered, { header: orderedColumns });
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Invoice');
      const safeCustomer = String(sub.customer?.name || sub.customer?.Name || sub.customer_id || 'customer')
        .replace(/[^\w-]+/g, '_');
      XLSX.writeFile(wb, `quickbooks_invoice_${safeCustomer}_${invoiceDate}.xlsx`);
      setActionSuccess(`Excel exported for ${sub.customer?.name || sub.customer?.Name || sub.customer_id}.`);
    } catch (err) {
      setActionError(err?.message || 'Failed to export customer Excel.');
    }
  }, [buildInvoicePdfForRow, getCurrentCycleRange, resolveRentalInvoiceNumberForActions, matchCustomerRecordBySubscriptionId]);

  const openEmailDialogForRow = async (sub) => {
    blurActiveElement();
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

      const invNo = await resolveRentalInvoiceNumberForActions(sub);
      const snapOpts = qbSnapshotGroupsCacheRef.current ? { zipGroupsCache: qbSnapshotGroupsCacheRef.current } : {};
      const pdfBundle = await buildInvoicePdfForRow(sub, invNo, snapOpts);
      const amountDue = pdfBundle.amountDue;
      const displayInvNo = pdfBundle.invoiceNumber;
      const formattedAmount = amountDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const savedEmailTemplate = getSavedEmailTemplate();
      const remitName = String(remitAddress?.remit_name || orgName).trim();
      const remitLine1 = String(remitAddress?.remit_address_line1 || '').trim();
      const remitLine2 = String(remitAddress?.remit_address_line2 || '').trim();
      const remitLine3 = String(remitAddress?.remit_address_line3 || '').trim();
      const billingInquiryEmail =
        orgData?.default_invoice_email || orgData?.email || organization?.email || '';
      const customerPo = String(
        sub?.customer?.purchase_order
        ?? matchCustomerRecordBySubscriptionId(sub?.customer_id)?.purchase_order
        ?? '',
      ).trim();
      const emailVars = buildRentalInvoiceEmailVarMap({
        invoiceNumber: displayInvNo,
        formattedAmount,
        customerName,
        customerPurchaseOrder: customerPo,
        orgName,
        orgWebsite,
        remitName,
        remitLine1,
        remitLine2,
        remitLine3,
        remitAddressBlock,
        billingInquiryEmail,
        savedTemplate: savedEmailTemplate,
      });
      const renderedSignature = applyInvoiceEmailTemplateVars(
        String(savedEmailTemplate?.signature || defaultTemplateSignature),
        emailVars
      );

      const savedBodyRaw = savedEmailTemplate?.body;
      const hasSavedEmailBody = typeof savedBodyRaw === 'string' && savedBodyRaw.trim().length > 0;
      let defaultMessage = hasSavedEmailBody
        ? applyInvoiceEmailTemplateVars(savedBodyRaw, emailVars)
        : `Your invoice ${displayInvNo} for $${formattedAmount} is attached.\n\nFor any billing or invoice inquiries, please reply to this email.\nThank you very much for your business.`;
      defaultMessage = stripRemitInstructionsFromInvoiceEmailBody(defaultMessage);
      defaultMessage = mergePaymentMethodsIntoInvoiceEmailBody(defaultMessage, savedBodyRaw, emailVars);
      if (hasSavedEmailBody && !defaultMessage.includes(displayInvNo)) {
        defaultMessage = `Invoice ${displayInvNo}\n\n${defaultMessage}`;
      }
      defaultMessage = ensureInvoiceContext(defaultMessage, displayInvNo, formattedAmount);
      if (!hasSavedEmailBody && customerPo) {
        defaultMessage = `${defaultMessage.trim()}\n\nCustomer P.O.: ${customerPo}`;
      }
      defaultMessage = withGlobalSignature(defaultMessage, renderedSignature);

      const savedSubjectRaw = savedEmailTemplate?.subject;
      const hasSavedSubject = typeof savedSubjectRaw === 'string' && savedSubjectRaw.trim().length > 0;
      const defaultSubject = hasSavedSubject
        ? applyInvoiceEmailTemplateVars(savedSubjectRaw, emailVars)
        : `Invoice ${displayInvNo} – ${customerName} – ${orgName}`;

      setSenderOptions(options);
      setEmailRow({ ...sub, invoice_number: displayInvNo });
      setEmailDialogMountKey(`dlg-${Date.now()}-${displayInvNo}`);
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
      const invResolved = await resolveRentalInvoiceNumberForActions(emailRow);
      const snapOpts = qbSnapshotGroupsCacheRef.current ? { zipGroupsCache: qbSnapshotGroupsCacheRef.current } : {};
      const pdfBundle = await buildInvoicePdfForRow(
        emailRow,
        invResolved,
        snapOpts
      );
      const { doc, customerName: pdfCustomerName, amountDue, invoiceNumber: pdfInvNo, bottles: pdfBottles } = pdfBundle;
      const customerName =
        String(pdfCustomerName || '').trim()
        || emailRow?.customer?.name
        || emailRow?.customer?.Name
        || emailRow?.customer_id
        || 'Customer';
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      const pdfFileName = `Invoice_${String(customerName).replace(/[^\w-]+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      const formattedAmount = amountDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const savedEmailTemplate = getSavedEmailTemplate();
      const remitName = String(remitAddress?.remit_name || organization?.name || 'your organization').trim();
      const remitLine1 = String(remitAddress?.remit_address_line1 || '').trim();
      const remitLine2 = String(remitAddress?.remit_address_line2 || '').trim();
      const remitLine3 = String(remitAddress?.remit_address_line3 || '').trim();
      const orgName = organization?.name || 'your organization';
      const orgWebsite = organization?.website || '';
      const billingInquiryEmail =
        organization?.default_invoice_email || organization?.email || '';
      const customerPoSend = String(
        emailRow?.customer?.purchase_order
        ?? matchCustomerRecordBySubscriptionId(emailRow?.customer_id)?.purchase_order
        ?? '',
      ).trim();
      const emailVars = buildRentalInvoiceEmailVarMap({
        invoiceNumber: pdfInvNo,
        formattedAmount,
        customerName,
        customerPurchaseOrder: customerPoSend,
        orgName,
        orgWebsite,
        remitName,
        remitLine1,
        remitLine2,
        remitLine3,
        remitAddressBlock,
        billingInquiryEmail,
        savedTemplate: savedEmailTemplate,
        daysAtLocationSummary: daysAtLocationSummaryFromBottles(pdfBottles),
      });
      const renderedSignature = applyInvoiceEmailTemplateVars(
        String(savedEmailTemplate?.signature || defaultTemplateSignature),
        emailVars
      );
      const subjectResolved = applyInvoiceEmailTemplateVars(formFromDialog.subject || '', emailVars);
      let messageResolved = applyInvoiceEmailTemplateVars(formFromDialog.message || '', emailVars);
      messageResolved = stripRemitInstructionsFromInvoiceEmailBody(messageResolved);
      messageResolved = mergePaymentMethodsIntoInvoiceEmailBody(
        messageResolved,
        savedEmailTemplate?.body,
        emailVars
      );
      const withInvoiceContext = ensureInvoiceContext(messageResolved, pdfInvNo, formattedAmount);
      const finalMessage = withGlobalSignature(withInvoiceContext, renderedSignature);
      const bodyHtml = finalMessage.replace(/\n/g, '<br/>');
      const response = await fetch('/.netlify/functions/send-invoice-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: formFromDialog.to,
          from: formFromDialog.from,
          senderName: profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || '',
          subject: subjectResolved,
          body: bodyHtml,
          pdfBase64,
          pdfFileName,
          invoiceNumber: pdfInvNo,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || payload?.details || `Email failed (${response.status})`);
      }
      await persistRentalInvoiceEmailSent(emailRow, pdfInvNo);
      const { periodStart, periodEnd } = getBillingPeriodForSub(emailRow, {
        qbBillingMonthYm: qbCsvBillingMonth,
      });
      const subIdRaw = String(emailRow.id || '').trim();
      const subscriptionId =
        subIdRaw && !emailRow.isVirtual && !subIdRaw.startsWith('legacy-') && !subIdRaw.startsWith('virtual-')
          ? subIdRaw
          : null;
      await logInvoiceEmailSend({
        organizationId: organization.id,
        subscriptionId,
        customerId: emailRow.customer_id,
        invoiceNumber: pdfInvNo,
        periodStart,
        periodEnd,
        emailedTo: String(formFromDialog.to || '')
          .split(/[,;]/)
          .map((e) => e.trim())
          .filter(Boolean),
        emailFrom: formFromDialog.from,
        subject: subjectResolved,
        messageId: payload?.messageId,
        sentByUserId: profile?.id || user?.id,
        pdfBase64,
      });
      const cid = String(emailRow.customer_id || '').trim();
      const sid = String(emailRow.id || '').trim();
      if (cid || sid) {
        setCycleInvoiceLookup((prev) => {
          const base = prev?.byCustomerId && prev?.bySubscriptionId ? prev : emptyCycleInvoiceLookup();
          const entry = {
            invoice_number: pdfInvNo,
            status: 'sent',
            updated_at: new Date().toISOString(),
          };
          return {
            byCustomerId: cid ? { ...base.byCustomerId, [cid]: entry } : { ...base.byCustomerId },
            bySubscriptionId:
              sid && !emailRow.isVirtual && !sid.startsWith('legacy-') && !sid.startsWith('virtual-')
                ? { ...base.bySubscriptionId, [sid]: entry }
                : { ...base.bySubscriptionId },
          };
        });
      }
      setActionSuccess(`Invoice emailed to ${formFromDialog.to}.`);
      setEmailOpen(false);
      setEmailRow(null);
    } catch (err) {
      setActionError(err.message || 'Failed to send invoice email.');
    } finally {
      setEmailing(false);
    }
  }, [emailRow, buildInvoicePdfForRow, profile, user, organization?.name, organization?.website, organization?.id, organization?.email, organization?.default_invoice_email, getSavedEmailTemplate, withGlobalSignature, ensureInvoiceContext, persistRentalInvoiceEmailSent, resolveRentalInvoiceNumberForActions, remitAddress, remitAddressBlock, matchCustomerRecordBySubscriptionId, qbCsvBillingMonth]);

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
    let billingInquiryEmail = organization?.default_invoice_email || organization?.email || '';
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
      billingInquiryEmail = orgData?.default_invoice_email || orgData?.email || billingInquiryEmail;
    } catch {
      defaultFrom = profile?.email?.trim() || user?.email?.trim() || '';
    }

    const savedEmailTemplate = getSavedEmailTemplate();
    const remitName = String(remitAddress?.remit_name || orgName).trim();
    const remitLine1 = String(remitAddress?.remit_address_line1 || '').trim();
    const remitLine2 = String(remitAddress?.remit_address_line2 || '').trim();
    const remitLine3 = String(remitAddress?.remit_address_line3 || '').trim();

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
        const bulkSnapOpts = qbSnapshotGroupsCacheRef.current ? { zipGroupsCache: qbSnapshotGroupsCacheRef.current } : {};
        const bulkPdfBundle = await buildInvoicePdfForRow(row, invNo, bulkSnapOpts);
        const { doc, customerName: cn, amountDue, invoiceNumber: pdfInvNo } = bulkPdfBundle;
        const formattedAmount = amountDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        const customerPoBulk = String(
          row?.customer?.purchase_order
          ?? matchCustomerRecordBySubscriptionId(row?.customer_id)?.purchase_order
          ?? '',
        ).trim();
        const emailVars = buildRentalInvoiceEmailVarMap({
          invoiceNumber: pdfInvNo,
          formattedAmount,
          customerName,
          customerPurchaseOrder: customerPoBulk,
          orgName,
          orgWebsite,
          remitName,
          remitLine1,
          remitLine2,
          remitLine3,
          remitAddressBlock,
          billingInquiryEmail,
          savedTemplate: savedEmailTemplate,
          daysAtLocationSummary: daysAtLocationSummaryFromBottles(bulkPdfBundle.bottles),
        });

        const bulkBodyRaw = savedEmailTemplate?.body;
        const bulkHasBody = typeof bulkBodyRaw === 'string' && bulkBodyRaw.trim().length > 0;
        let msgBody = bulkHasBody
          ? applyInvoiceEmailTemplateVars(bulkBodyRaw, emailVars)
          : `Your invoice ${pdfInvNo} for $${formattedAmount} is attached.\n\nFor any billing or invoice inquiries, please reply to this email.\nThank you very much for your business.`;
        msgBody = stripRemitInstructionsFromInvoiceEmailBody(msgBody);
        msgBody = mergePaymentMethodsIntoInvoiceEmailBody(msgBody, bulkBodyRaw, emailVars);
        if (bulkHasBody && !msgBody.includes(pdfInvNo)) {
          msgBody = `Invoice ${pdfInvNo}\n\n${msgBody}`;
        }
        msgBody = ensureInvoiceContext(msgBody, pdfInvNo, formattedAmount);
        if (!bulkHasBody && customerPoBulk) {
          msgBody = `${String(msgBody).trim()}\n\nCustomer P.O.: ${customerPoBulk}`;
        }
        const renderedSignature = applyInvoiceEmailTemplateVars(
          String(savedEmailTemplate?.signature || defaultTemplateSignature),
          emailVars
        );
        msgBody = withGlobalSignature(msgBody, renderedSignature);
        const bulkSubjectRaw = savedEmailTemplate?.subject;
        const bulkHasSubject = typeof bulkSubjectRaw === 'string' && bulkSubjectRaw.trim().length > 0;
        const subject = bulkHasSubject
          ? applyInvoiceEmailTemplateVars(bulkSubjectRaw, emailVars)
          : `Invoice ${pdfInvNo} – ${customerName} – ${orgName}`;
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        const pdfFileName = `Invoice_${String(cn || customerName).replace(/[^\w-]+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
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
            invoiceNumber: pdfInvNo,
          }),
        });
        if (!response.ok) {
          failed += 1;
          setBulkEmailProgress((p) => ({ ...p, failed: p.failed + 1 }));
        } else {
          sent += 1;
          setBulkEmailProgress((p) => ({ ...p, sent: p.sent + 1 }));
          try {
            const bulkPayload = await response.json().catch(() => ({}));
            await persistRentalInvoiceEmailSent(row, pdfInvNo);
            const { periodStart: bPs, periodEnd: bPe } = getBillingPeriodForSub(row, {
              qbBillingMonthYm: qbCsvBillingMonth,
            });
            const rowSid = String(row.id || '').trim();
            await logInvoiceEmailSend({
              organizationId: organization.id,
              subscriptionId:
                rowSid && !row.isVirtual && !rowSid.startsWith('legacy-') && !rowSid.startsWith('virtual-')
                  ? rowSid
                  : null,
              customerId: row.customer_id,
              invoiceNumber: pdfInvNo,
              periodStart: bPs,
              periodEnd: bPe,
              emailedTo: [customerEmail].filter(Boolean),
              emailFrom: defaultFrom,
              subject,
              messageId: bulkPayload?.messageId,
              sentByUserId: profile?.id || user?.id,
              pdfBase64,
            });
            const cid = String(row.customer_id || '').trim();
            const sid = String(row.id || '').trim();
            if (cid || sid) {
              setCycleInvoiceLookup((prev) => {
                const base = prev?.byCustomerId && prev?.bySubscriptionId ? prev : emptyCycleInvoiceLookup();
                const entry = {
                  invoice_number: pdfInvNo,
                  status: 'sent',
                  updated_at: new Date().toISOString(),
                };
                return {
                  byCustomerId: cid ? { ...base.byCustomerId, [cid]: entry } : { ...base.byCustomerId },
                  bySubscriptionId:
                    sid && !row.isVirtual && !sid.startsWith('legacy-') && !sid.startsWith('virtual-')
                      ? { ...base.bySubscriptionId, [sid]: entry }
                      : { ...base.bySubscriptionId },
                };
              });
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
  }, [filtered, buildInvoicePdfForRow, organization, profile, user, getSavedEmailTemplate, withGlobalSignature, ensureInvoiceContext, persistRentalInvoiceEmailSent, resolveRentalInvoiceNumberForActions, remitAddress, remitAddressBlock, matchCustomerRecordBySubscriptionId, qbCsvBillingMonth]);

  const handleExportInvoicePdfsZip = useCallback(async () => {
    const baseRows = filtered.filter((r) => r.status === 'active' && (parseFloat(r.totalPerCycle) || 0) > 0);
    const rows = baseRows.filter((r) => canonicalBillingPeriod(r.billing_period) !== 'yearly');
    if (rows.length === 0) {
      setActionError('No monthly invoiceable rentals in the current view.');
      return;
    }
    setZipExporting(true);
    setZipExportProgress({ done: 0, total: rows.length });
    setActionError(null);
    setActionSuccess(null);

    // One rentals load for the whole ZIP — buildInvoicePdfForRow otherwise queries the full table per row.
    const needsRentalSnapshot = rows.some(
      (r) => String(r.customer?.billing_mode || '').toLowerCase() !== 'lease'
    );
    let orgRentalsCache = [];
    if (needsRentalSnapshot) {
      const { data, error: rentalsZipErr } = await supabase
        .from('rentals')
        .select('*')
        .eq('organization_id', organization.id);
      if (rentalsZipErr) {
        setActionError(rentalsZipErr.message || 'Could not load rentals for ZIP export.');
        setZipExporting(false);
        setZipExportProgress({ done: 0, total: 0 });
        return;
      }
      orgRentalsCache = data || [];
    }

    const zip = new JSZip();
    const usedFinalNames = new Set();
    const makeEntryName = (invNo, customerName) => {
      const safeInv = String(invNo || 'INV').replace(/[^\w\-.]+/g, '_');
      const safeCust = String(customerName || 'Customer').replace(/[^\w\-.]+/g, '_').slice(0, 72);
      return `Rental_Invoice_${safeInv}_${safeCust}.pdf`;
    };
    const uniquePdfName = (invNo, customerName) => {
      const base = makeEntryName(invNo, customerName);
      if (!usedFinalNames.has(base)) {
        usedFinalNames.add(base);
        return base;
      }
      let n = 2;
      let candidate = base.replace(/\.pdf$/i, `_${n}.pdf`);
      while (usedFinalNames.has(candidate)) {
        n += 1;
        candidate = base.replace(/\.pdf$/i, `_${n}.pdf`);
      }
      usedFinalNames.add(candidate);
      return candidate;
    };

    /** Serialize ZIP entry naming (parallel PDF workers share `usedFinalNames`). */
    let filenameChain = Promise.resolve();
    const reserveEntryName = (invNo, customerName) => {
      const task = filenameChain.then(() => uniquePdfName(invNo, customerName));
      filenameChain = task.then(
        () => undefined,
        () => undefined
      );
      return task;
    };

    let ok = 0;
    const failLabels = [];

    try {
      const periodKeys = new Set();
      for (const row of rows) {
        const { periodStart, periodEnd } = computeSharedInvoicePdfPeriodForRow(
          row,
          qbCsvBillingMonth
        );
        periodKeys.add(invoiceReturnsCacheKey(periodStart, periodEnd));
      }
      const returnsByPeriodKey = new Map();
      await Promise.all(
        [...periodKeys].map(async (pkey) => {
          const pipe = pkey.indexOf('|');
          const periodStart = pkey.slice(0, pipe);
          const periodEnd = pkey.slice(pipe + 1);
          const enriched = await fetchAllReturnsInInvoicePeriodForOrg(
            supabase,
            organization.id,
            periodStart,
            periodEnd
          );
          returnsByPeriodKey.set(pkey, enriched);
        })
      );

      const prepared = [];
      for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i];
        const invNo = await resolveRentalInvoiceNumberForActions(row);
        const label = row.customer?.name || row.customer?.Name || row.customer_id || `Row ${i + 1}`;
        prepared.push({ row, invNo, label });
      }

      const zipGroupsCache = new Map();
      const pdfBuildOpts = { orgRentalsCache, returnsByPeriodKey, zipGroupsCache };
      let done = 0;
      await runPool(prepared, 4, async ({ row, invNo, label }) => {
        try {
          const { doc, customerName } = await buildInvoicePdfForRow(row, invNo, pdfBuildOpts);
          const entryName = await reserveEntryName(invNo, customerName);
          zip.file(entryName, doc.output('arraybuffer'));
          ok += 1;
        } catch (e) {
          failLabels.push(`${label}: ${e?.message || String(e)}`);
        } finally {
          done += 1;
          setZipExportProgress({ done, total: rows.length });
        }
      });

      const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'STORE',
      });
      const orgSlug = String(organization?.name || 'invoices').replace(/[^\w-]+/g, '_').slice(0, 48);
      const day = new Date().toISOString().slice(0, 10);
      saveAs(blob, `Rental_Invoices_Monthly_${orgSlug}_${day}.zip`);

      if (failLabels.length === 0) {
        setActionSuccess(
          `Downloaded monthly ZIP with ${ok} invoice PDF(s) (search and terms filter).`
        );
      } else if (ok === 0) {
        setActionError(
          `Monthly ZIP export failed for all rows. ${failLabels.slice(0, 2).join(' · ')}${failLabels.length > 2 ? '…' : ''}`
        );
      } else {
        setActionSuccess(
          `Monthly ZIP has ${ok} PDF(s). ${failLabels.length} row(s) failed — e.g. ${failLabels[0]}`
        );
      }
    } catch (e) {
      setActionError(e?.message || 'Failed to create monthly invoice ZIP.');
    } finally {
      setZipExporting(false);
      setZipExportProgress({ done: 0, total: 0 });
    }
  }, [
    filtered,
    buildInvoicePdfForRow,
    resolveRentalInvoiceNumberForActions,
    getCurrentCycleRange,
    qbCsvBillingMonth,
    organization?.id,
    organization?.name,
  ]);

  const headerCards = useMemo(() => [
    { label: 'Active Rentals', value: activeRentalCount, icon: <People />, color: '#10B981' },
    {
      label: 'Billed units (Σ)',
      value: activeRentalAssetCount,
      icon: <People />,
      color: '#0EA5E9',
      tooltip:
        'Sum of the Items column for every active subscription in your organization (all customers). This is not one customer’s bottle count.',
    },
    { label: 'Outstanding', value: formatCurrency(ctx.outstandingBalance), icon: <AccountBalance />, color: ctx.outstandingBalance > 0 ? '#EF4444' : '#10B981' },
    { label: 'Next Billing', value: derivedNextBilling ? formatDate(derivedNextBilling) : '—', icon: <Schedule />, color: '#F59E0B' },
  ], [activeRentalCount, activeRentalAssetCount, ctx.outstandingBalance, derivedNextBilling]);

  const handleRefreshRentalsWorkspace = useCallback(async () => {
    setActionError(null);
    setActionSuccess(null);
    setRentalsWorkspaceRefreshing(true);
    try {
      await ctx.refreshSilent();
      setActionSuccess('Rentals and bottle counts updated from the server.');
    } catch (e) {
      setActionError(e?.message || 'Refresh failed.');
    } finally {
      setRentalsWorkspaceRefreshing(false);
    }
  }, [ctx]);

  const handlePreallocateCycleInvoiceNumbers = useCallback(async () => {
    if (!organization?.id) return;
    setPreallocatingNumbers(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const result = await preallocateCycleInvoicesForOrganization(supabase, organization.id, {
        force: true,
      });
      if (result.skipped) {
        setActionError(result.hint || 'Could not determine billing period for pre-allocation.');
        return;
      }
      setInvoiceLookupRefreshKey((k) => k + 1);
      const errCount = (result.errors || []).length;
      setActionSuccess(
        `Invoice numbers for ${result.periodStart} – ${result.periodEnd}: ` +
          `${result.created} new, ${result.alreadyHadNumber} already assigned` +
          (result.skippedZeroSubtotal ? `, ${result.skippedZeroSubtotal} skipped ($0).` : '.') +
          (errCount > 0 ? ` ${errCount} customer(s) had errors — check console.` : '') +
          ' Numbers continue from your invoice_settings counter.',
      );
      if (errCount > 0) {
        console.warn('Preallocate invoice numbers errors:', result.errors);
      }
    } catch (e) {
      setActionError(e?.message || 'Failed to prepare invoice numbers.');
    } finally {
      setPreallocatingNumbers(false);
    }
  }, [organization?.id]);

  const rentalToolbarMenuItems = useMemo(() => {
    const emailTitle = bulkEmailing
      ? `${bulkEmailProgress.sent + bulkEmailProgress.failed}/${bulkEmailProgress.total}`
      : 'Email';
    const zipTitle = zipExporting
      ? `${zipExportProgress.done}/${zipExportProgress.total}`
      : 'ZIP';
    return [
      {
        id: 'refresh',
        title: rentalsWorkspaceRefreshing ? 'Updating…' : 'Update',
        action: 'refresh',
        icon: <IoRefreshOutline />,
        disabled: saving || bulkEmailing || zipExporting || rentalsWorkspaceRefreshing,
      },
      {
        id: 'csv',
        title: 'CSV',
        action: 'csv',
        icon: <IoCloudDownloadOutline />,
        disabled: saving || zipExporting || rentalsWorkspaceRefreshing,
      },
      {
        id: 'invoices',
        title: 'Invoices',
        action: 'invoices',
        icon: <IoReceiptOutline />,
        disabled: saving || zipExporting || rentalsWorkspaceRefreshing,
      },
      {
        id: 'prep-numbers',
        title: preallocatingNumbers ? '…' : 'Prep #',
        action: 'prep-numbers',
        icon: <IoCreateOutline />,
        disabled: saving || preallocatingNumbers || bulkEmailing || zipExporting || rentalsWorkspaceRefreshing,
      },
      {
        id: 'email',
        title: emailTitle,
        action: 'email',
        icon: <IoMailOutline />,
        disabled: saving || bulkEmailing || zipExporting || rentalsWorkspaceRefreshing,
      },
      {
        id: 'zip',
        title: zipTitle,
        action: 'zip',
        icon: <IoArchiveOutline />,
        disabled: saving || bulkEmailing || zipExporting || rentalsWorkspaceRefreshing,
      },
      {
        id: 'new',
        title: 'New',
        action: 'new',
        icon: <IoAddCircleOutline />,
      },
    ];
  }, [
    saving,
    preallocatingNumbers,
    zipExporting,
    rentalsWorkspaceRefreshing,
    bulkEmailing,
    bulkEmailProgress.sent,
    bulkEmailProgress.failed,
    bulkEmailProgress.total,
    zipExportProgress.done,
    zipExportProgress.total,
  ]);

  const handleRentalToolbarAction = useCallback(
    (action) => {
      switch (action) {
        case 'refresh':
          void handleRefreshRentalsWorkspace();
          break;
        case 'csv':
          handleExportQbInvoiceCsv('monthly', monthlyQbCohort);
          break;
        case 'invoices':
          handleGenerateAllInvoices();
          break;
        case 'prep-numbers':
          void handlePreallocateCycleInvoiceNumbers();
          break;
        case 'email':
          handleBulkEmailInvoices();
          break;
        case 'zip':
          handleExportInvoicePdfsZip();
          break;
        case 'new':
          blurActiveElement();
          setCreateOpen(true);
          break;
        default:
          break;
      }
    },
    [
      handleRefreshRentalsWorkspace,
      handleExportQbInvoiceCsv,
      monthlyQbCohort,
      handleGenerateAllInvoices,
      handlePreallocateCycleInvoiceNumbers,
      handleBulkEmailInvoices,
      handleExportInvoicePdfsZip,
    ],
  );

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
      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', lg: 'flex-start' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box sx={{ flexShrink: 0 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>Rentals</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Manage customer rentals and billing. Invoice numbers for the current cycle are prepared automatically on the
            last and first day of each month (continuing from the previous counter), or use Prep # anytime.
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
            Per customer: row <strong>Export / bill</strong> → PDF, Excel, Email.
          </Typography>
        </Box>
        <Stack
          direction="row"
          flexWrap="wrap"
          useFlexGap
          spacing={1}
          alignItems="center"
          sx={{
            width: { xs: '100%', lg: 'auto' },
            flex: '0 0 auto',
            minWidth: 0,
            justifyContent: { xs: 'flex-start', lg: 'flex-end' },
            rowGap: 1,
            columnGap: 1,
          }}
        >
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="qb-csv-billing-month-label">Month</InputLabel>
            <Select
              labelId="qb-csv-billing-month-label"
              label="Month"
              value={qbCsvBillingMonth}
              onChange={(e) => setQbCsvBillingMonth(e.target.value)}
              sx={{ fontSize: '0.8125rem', '& .MuiSelect-select': { py: 0.6 } }}
              MenuProps={{ disablePortal: false, PaperProps: { sx: { zIndex: 1301 } } }}
            >
              {qbCsvMonthMenuOptions.map((o) => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 112 }}>
            <InputLabel id="monthly-qb-cohort-label">Terms</InputLabel>
            <Select
              labelId="monthly-qb-cohort-label"
              label="Terms"
              value={monthlyQbCohort}
              onChange={(e) => setMonthlyQbCohort(e.target.value)}
              sx={{ fontSize: '0.8125rem', '& .MuiSelect-select': { py: 0.6 } }}
              MenuProps={{ disablePortal: false, PaperProps: { sx: { zIndex: 1301 } } }}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="net30">NET 30</MenuItem>
              <MenuItem value="credit_card">Card</MenuItem>
            </Select>
          </FormControl>
          <Stack
            direction="row"
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
            spacing={0.5}
            sx={{
              py: 0.5,
              px: 0.75,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'action.hover',
            }}
          >
            {rentalToolbarMenuItems
              .filter((item) => item.action !== 'csv' && item.action !== 'zip')
              .map((item) => (
                <Tooltip key={item.id} title={item.title}>
                  <span>
                    <IconButton
                      size="small"
                      disabled={item.disabled}
                      aria-label={item.title}
                      onClick={() => handleRentalToolbarAction(item.action)}
                      sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                    >
                      {item.icon}
                    </IconButton>
                  </span>
                </Tooltip>
              ))}
          </Stack>
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
      {zipExporting && (
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Building monthly invoice PDFs for ZIP…
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {zipExportProgress.done} / {zipExportProgress.total}
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={zipExportProgress.total > 0 ? (zipExportProgress.done / zipExportProgress.total) * 100 : 0}
            sx={{ borderRadius: 1, height: 6 }}
          />
        </Box>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {headerCards.map((c, i) => (
          <Grid item xs={6} sm={4} md key={i}>
            {c.tooltip ? (
              <Tooltip title={c.tooltip} enterDelay={400}>
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, cursor: 'help' }}>
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
              </Tooltip>
            ) : (
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
            )}
          </Grid>
        ))}
      </Grid>

      <Paper
        elevation={0}
        sx={{
          mb: 3,
          p: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          bgcolor: 'background.paper',
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          flexWrap="wrap"
          useFlexGap
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mr: { sm: 1 } }}>
            Bulk export
          </Typography>
          <Button
            variant="contained"
            size="small"
            startIcon={<IoCloudDownloadOutline />}
            disabled={saving || zipExporting || rentalsWorkspaceRefreshing}
            onClick={() => handleRentalToolbarAction('csv')}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            Export CSV (QuickBooks)
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<IoArchiveOutline />}
            disabled={saving || bulkEmailing || zipExporting || rentalsWorkspaceRefreshing}
            onClick={() => handleRentalToolbarAction('zip')}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            {zipExporting
              ? `Building PDF ZIP… ${zipExportProgress.done}/${zipExportProgress.total}`
              : 'Export PDFs (ZIP)'}
          </Button>
          <Typography variant="caption" sx={{ color: 'text.secondary', flex: { sm: '1 1 200px' } }}>
            Uses Month and Terms filters above. Excel is one file per customer via row Export / bill.
          </Typography>
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ px: 2, pt: 2, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" sx={{ mr: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
              Monthly rentals ({allRows.length})
            </Typography>
            <Button size="small" variant="outlined" component={Link} to="/lease-agreements" sx={{ borderRadius: 999, textTransform: 'none', fontSize: '0.75rem' }}>
              Yearly leases & billing
            </Button>
          </Stack>
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
          <SubscriptionsSearchField
            ref={searchFieldRef}
            onDebouncedChange={setDebouncedSearch}
          />
          </Box>
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: 'text.secondary', letterSpacing: '0.05em' } }}>
                <TableCell>Customer</TableCell>
                <TableCell>Period</TableCell>
                <TableCell>Terms</TableCell>
                <TableCell sx={{ maxWidth: 140 }}>P.O.</TableCell>
                <TableCell align="center">
                  <Tooltip
                    title="Billable units for this subscription (bottles + open rentals, billable rules). Invoice PDF and QB month export use Customer Detail–style merged open rentals (billing basis) as of period end."
                    enterDelay={500}
                  >
                    <Box component="span" sx={{ cursor: 'help', borderBottom: '1px dotted', borderColor: 'text.secondary' }}>
                      Items
                    </Box>
                  </Tooltip>
                </TableCell>
                <TableCell align="right">Total / Cycle</TableCell>
                <TableCell>Invoice #</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    {allRows.length === 0 ? (
                      'No rentals found yet.'
                    ) : (
                      <Stack spacing={1.25} alignItems="center" sx={{ maxWidth: 520, mx: 'auto' }}>
                        <Typography variant="body2">
                          No rows match this tab or search ({allRows.length} total in list).
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
                          Clear search or adjust Terms chips. Yearly lease billing lives under Lease agreements.
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center">
                          {debouncedSearch.trim() !== '' && (
                            <Button size="small" variant="outlined" onClick={handleClearSearch}>
                              Clear search
                            </Button>
                          )}
                          <Button size="small" variant="outlined" component={Link} to="/lease-agreements">
                            Open lease agreements
                          </Button>
                        </Stack>
                      </Stack>
                    )}
                  </TableCell>
                </TableRow>
              ) : pagedFiltered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    <Stack spacing={1} alignItems="center">
                      <Typography variant="body2">
                        No rows on this page ({filtered.length} match filters). Try page 1 or change rows per page.
                      </Typography>
                      <Button size="small" variant="outlined" onClick={() => setTablePage(0)}>
                        Go to first page
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : (
                pagedFiltered.map((sub) => (
                  <TableRow
                    key={`${String(sub.id || 'row')}-${String(sub.customer_id || '')}`}
                    hover
                    sx={{ cursor: sub.isVirtual ? 'default' : 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    onClick={() => { if (!sub.isVirtual) navigate(`/rentals/${sub.id}`); }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {getCustomerDisplayLabel(sub.customer, parentNameById) || sub.customer_id}
                      </Typography>
                      <Typography
                        variant="caption"
                        component="div"
                        sx={{ color: 'text.secondary', fontFamily: 'monospace', mt: 0.25 }}
                      >
                        {getCustomerListId(sub.customer, sub.customer_id) || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={sub.billing_period} size="small" variant="outlined" sx={{ textTransform: 'capitalize', fontWeight: 600 }} />
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
                    <TableCell sx={{ maxWidth: 140 }}>
                      {(() => {
                        const po = String(sub?.customer?.purchase_order ?? '').trim();
                        return po ? (
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.8rem' }} noWrap title={po}>
                            {po}
                          </Typography>
                        ) : (
                          <Typography variant="caption" sx={{ color: 'text.disabled' }}>—</Typography>
                        );
                      })()}
                    </TableCell>
                    <TableCell align="center">{sub.itemCount}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>{formatCurrency(sub.totalPerCycle)}</TableCell>
                    <TableCell>
                      {(() => {
                        const cid = String(sub.customer_id || '').trim();
                        const sid = String(sub.id || '').trim();
                        const lu =
                          cycleInvoiceLookup?.byCustomerId && cycleInvoiceLookup?.bySubscriptionId
                            ? cycleInvoiceLookup
                            : emptyCycleInvoiceLookup();
                        const subSidOk =
                          sid
                          && !sub.isVirtual
                          && !sid.startsWith('legacy-')
                          && !sid.startsWith('virtual-');
                        const cycleInv =
                          (cid && lu.byCustomerId[cid])
                          || (subSidOk && lu.bySubscriptionId[sid])
                          || null;
                        const invNo = String(cycleInv?.invoice_number || '').trim();
                        const st = String(cycleInv?.status || '').toLowerCase();
                        return (
                          <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap">
                            {invNo ? (
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{invNo}</Typography>
                            ) : cid ? (
                              <Typography variant="caption" sx={{ color: 'text.disabled' }}>Not set</Typography>
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
                    <TableCell
                      align="right"
                      onClick={(e) => e.stopPropagation()}
                      sx={{ py: 0.75 }}
                    >
                      {(() => {
                        const billableAmount = parseFloat(sub.totalPerCycle) || 0;
                        const canBill = billableAmount > 0;
                        const canEditRates = Boolean(sub.customer_id);
                        const rowActionItems = [
                          {
                            id: 'pdf',
                            title: 'PDF',
                            action: 'pdf',
                            icon: <IoReceiptOutline />,
                            gradientFrom: '#56CCF2',
                            gradientTo: '#2F80ED',
                            disabled: !canBill,
                          },
                          {
                            id: 'email',
                            title: 'Email',
                            action: 'email',
                            icon: <IoMailOutline />,
                            gradientFrom: '#FF9966',
                            gradientTo: '#FF5E62',
                            disabled: saving || !canBill,
                          },
                          {
                            id: 'excel',
                            title: 'Excel',
                            action: 'excel',
                            icon: <IoCloudDownloadOutline />,
                            gradientFrom: '#80FF72',
                            gradientTo: '#7EE8FA',
                            disabled: saving || !canBill,
                          },
                          {
                            id: 'edit-invoice',
                            title: 'Edit Inv #',
                            action: 'edit-invoice',
                            icon: <IoCreateOutline />,
                            gradientFrom: '#38bdf8',
                            gradientTo: '#0ea5e9',
                            disabled: !sub.customer_id,
                          },
                          {
                            id: 'edit-rates',
                            title: 'Edit Rates',
                            action: 'edit-rates',
                            icon: <IoAddCircleOutline />,
                            gradientFrom: '#a955ff',
                            gradientTo: '#ea51ff',
                            disabled: !canEditRates,
                          },
                        ];

                        if (sub.customer_id) {
                          rowActionItems.splice(3, 0, {
                            id: 'customer',
                            title: 'Customer',
                            action: 'customer',
                            icon: <IoPersonCircleOutline />,
                            gradientFrom: '#ffa9c6',
                            gradientTo: '#f434e2',
                          });
                        }

                        return (
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <RentalRowActionsMenu
                              disabled={saving}
                              items={rowActionItems}
                              buttonLabel="Export / bill"
                              onAction={(action) => {
                                switch (action) {
                                  case 'pdf':
                                    handleDownloadInvoicePdfForRow(sub);
                                    break;
                                  case 'email':
                                    blurActiveElement();
                                    openEmailDialogForRow(sub);
                                    break;
                                  case 'excel':
                                    handleExportCustomerExcel(sub);
                                    break;
                                  case 'customer': {
                                    const id = String(sub.customer_id || '').trim();
                                    if (!id) {
                                      setActionError('No customer identifier available for this row.');
                                      return;
                                    }
                                    navigate(`/customer/${encodeURIComponent(id)}`);
                                    break;
                                  }
                                  case 'edit-invoice':
                                    openInvoiceNumberDialog(sub);
                                    break;
                                  case 'edit-rates':
                                    navigate('/pricing/customers', {
                                      state: {
                                        prefillCustomerId: sub.customer_id,
                                        prefillCustomerName:
                                          sub.customer?.name || sub.customer?.Name || sub.customer_id,
                                      },
                                    });
                                    break;
                                  default:
                                    break;
                                }
                              }}
                            />
                          </Box>
                        );
                      })()}
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
            page={effectiveTablePage}
            onPageChange={(_, nextPage) => setTablePage(nextPage)}
            rowsPerPage={effectiveRowsPerPage}
            onRowsPerPageChange={(e) => {
              const next = parseInt(e.target.value, 10);
              setRowsPerPage(Number.isFinite(next) && next > 0 ? next : 50);
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
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Billing period is monthly. Yearly lease billing is managed under{' '}
              <Link to="/lease-agreements" style={{ fontWeight: 600 }}>Lease agreements</Link>.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving || !newSub.customer_id} sx={{ textTransform: 'none', bgcolor: primaryColor, '&:hover': { bgcolor: primaryColor, opacity: 0.9 } }}>
            {saving ? 'Creating...' : 'Create Rental'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={invoiceNoDialogOpen}
        onClose={() => {
          if (!savingInvoiceNo) {
            setInvoiceNoDialogOpen(false);
            setInvoiceNoEditRow(null);
            setInvoiceNoSaveError('');
          }
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Invoice number</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            This value is stored for the current billing cycle and is used when you download PDF, send email, or export Excel for this customer.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Invoice #"
            value={invoiceNoDraft}
            onChange={(e) => {
              setInvoiceNoDraft(e.target.value);
              if (invoiceNoSaveError) setInvoiceNoSaveError('');
            }}
            disabled={savingInvoiceNo}
            placeholder="e.g. W00142"
            InputProps={{ sx: { fontFamily: 'monospace' } }}
          />
          {invoiceNoSaveError ? (
            <Alert severity="error" sx={{ mt: 2 }} onClose={() => setInvoiceNoSaveError('')}>
              {invoiceNoSaveError}
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              setInvoiceNoDialogOpen(false);
              setInvoiceNoEditRow(null);
              setInvoiceNoSaveError('');
            }}
            disabled={savingInvoiceNo}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveInvoiceNumber}
            disabled={savingInvoiceNo || !String(invoiceNoDraft || '').trim()}
            sx={{ textTransform: 'none', bgcolor: primaryColor, '&:hover': { bgcolor: primaryColor, opacity: 0.9 } }}
            startIcon={savingInvoiceNo ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {savingInvoiceNo ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <EmailInvoiceDialog
        key={emailDialogMountKey}
        open={emailOpen}
        onClose={() => {
          setEmailOpen(false);
          setEmailDialogMountKey('email-dlg-closed');
        }}
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
