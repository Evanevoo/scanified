import logger from '../utils/logger';
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../supabase/client';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Chip,
  Divider,
  TextField,
  CircularProgress,
  Alert,
  FormControl,
  FormControlLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  InputLabel,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  Snackbar,
  ButtonGroup,
  Tooltip,
  Tabs,
  Tab,
  Grid,
  Stack
} from '@mui/material';
import { createFilterOptions } from '@mui/material/Autocomplete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HomeIcon from '@mui/icons-material/Home';
import TransferWithinAStationIcon from '@mui/icons-material/TransferWithinAStation';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import DeselectIcon from '@mui/icons-material/Deselect';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import FilterListIcon from '@mui/icons-material/FilterList';
import HistoryIcon from '@mui/icons-material/History';
import SpeedIcon from '@mui/icons-material/Speed';
import ReceiptIcon from '@mui/icons-material/Receipt';
import SettingsIcon from '@mui/icons-material/Settings';
import EditIcon from '@mui/icons-material/Edit';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import DeleteIcon from '@mui/icons-material/Delete';
import { TableSkeleton, CardSkeleton } from '../components/SmoothLoading';
import { AssetTransferService } from '../services/assetTransferService';
import { useAuth } from '../hooks/useAuth';
import DNSConversionDialog from '../components/DNSConversionDialog';
import BarcodeDisplay from '../components/BarcodeDisplay';
import { formatLocationDisplay, normalizeLocationKey } from '../utils/locationDisplay';
import { formatDate } from '../utils/subscriptionUtils';
import { summarizeBottlesByType, getBottleSummaryGroupKey } from '../utils/bottleInventoryGrouping';
import { useSubscriptions } from '../context/SubscriptionContext';
import {
  buildAssetPricingMap,
  buildCustomerOverrideMap,
  resolveMonthlyDisplayUnit,
  pickMonthlyFromLegacyRentalRatesJson,
  defaultUnitRatesFromAssetPricingTable,
} from '../utils/rentalDisplayPricing';
import {
  fetchOrgRentalPricingContext,
  monthlyRateForNewRental,
  monthlyRateForProductPlaceholder,
  invalidateOrgRentalPricingCache,
} from '../utils/rentalPricing';
import { findActiveLeaseContract } from '../services/leaseBilling';
import {
  bottleProductCode,
  bottleStrictProductCode,
  isCustomerOwnedForBilling,
  isDnsRentalExcludedFromBillableCount,
} from '../services/billingFromAssets';
import {
  finalizeCustomerBranchParentFields,
  getCustomerBranchParentValidationError,
  CUSTOMER_TYPE_BRANCH,
  ACCOUNT_TYPE_BRANCH,
  ACCOUNT_TYPE_MAIN,
  customerTypeForForm,
  getCustomerTypeChipLabel,
  getCustomerTypeChipColor,
  isBranchTypeSelectedInForm,
  formatCustomerHierarchyDisplayName,
} from '../utils/customerParentConstraint';
import { expandLeaseMatchKeys } from '../utils/leaseCustomerMatchKeys';
import { normalizePricingKey } from '../services/pricingResolution';

/**
 * When auto-inserting an open rental for an assigned bottle, avoid defaulting start date to "today"
 * (that misreads as "rental started today"). Prefer explicit bottle rental date, then record creation,
 * then last location touch, then today.
 */
import { backfillOpenRentalsForAssignedBottles } from '../services/backfillOpenRentalsForAssignedBottles';
import { closeOrphanOpenRentalsForOrg } from '../services/closeOrphanOpenRentalsForOrg';

function normalizeInventoryBottleStatus(status) {
  const v = String(status ?? '').toLowerCase().trim();
  if (['filled', 'full', 'available'].includes(v)) return 'filled';
  if (v === 'rented') return 'rented';
  if (v === 'empty') return 'empty';
  return v || 'unknown';
}

function displayInventoryStatusChip(asset, statusIsRented) {
  if (statusIsRented) return 'Rented';
  const st = normalizeInventoryBottleStatus(asset?.status);
  if (st === 'empty') return 'Returned';
  if (st === 'filled') return 'Filled';
  if (st === 'rented') return 'Rented';
  if (asset?.status) return String(asset.status);
  return 'Unknown';
}

function displayRentalRowLocation(rental, bottle, customer) {
  const pick = (v) => (v == null ? '' : String(v).trim());
  for (const raw of [
    pick(rental?.location),
    pick(customer?.location),
    pick(customer?.city),
    pick(bottle?.location),
  ]) {
    if (raw) return formatLocationDisplay(raw);
  }
  return 'Unknown';
}

/** Raw location key for inventory row / filter — customer branch (Locations page) before bottle warehouse field. */
function resolveCustomerInventoryLocationRaw(asset, customer) {
  const pick = (v) => (v == null ? '' : String(v).trim());
  return (
    pick(customer?.location) ||
    pick(customer?.city) ||
    pick(asset?.location) ||
    ''
  );
}

function displayAssignedAssetLocationChip(asset, customer) {
  const raw = resolveCustomerInventoryLocationRaw(asset, customer);
  if (!raw) return 'Unknown';
  return formatLocationDisplay(raw);
}

/** Compare barcodes / serials loosely (leading zeros, serial stored as barcode on rental). */
function normalizeAssetIdKey(v) {
  const t = String(v ?? '').trim();
  if (!t) return '';
  if (/^\d+$/.test(t)) {
    const stripped = t.replace(/^0+/, '');
    return stripped || '0';
  }
  return t.toLowerCase();
}

function bottleMatchesRentalRow(bottle, rentalBarcode) {
  if (!rentalBarcode || !bottle) return false;
  const r = String(rentalBarcode).trim().replace(/\.0+$/, '');
  const bc = bottle.barcode_number || bottle.barcode || '';
  const sn = bottle.serial_number || '';
  const candidates = [bc, sn].filter(Boolean);
  for (const c of candidates) {
    const ct = String(c).trim().replace(/\.0+$/, '');
    if (!ct) continue;
    if (ct === r) return true;
    if (normalizeAssetIdKey(ct) === normalizeAssetIdKey(r)) return true;
  }
  return false;
}

/** Resolve assigned bottle for a non-DNS rental (used for pricing + display rows). */
function findCustomerAssetForRental(assets, rental) {
  if (!rental || rental.is_dns) return null;
  const rid = rental.bottle_id;
  const ridKey = rid == null ? '' : String(rid).trim();
  return (assets || []).find((b) => {
    const bidKey = b?.id == null ? '' : String(b.id).trim();
    if (ridKey && bidKey && bidKey === ridKey) return true;
    if (rental.bottle_barcode) return bottleMatchesRentalRow(b, rental.bottle_barcode);
    return false;
  }) || null;
}

/** Same as findCustomerAssetForRental but includes org bottles not in the merged assigned list. */
function findCustomerAssetForRentalExtended(assignedAssets, supplementalBottles, rental) {
  const fromAssigned = findCustomerAssetForRental(assignedAssets, rental);
  if (fromAssigned) return fromAssigned;
  if (!supplementalBottles?.length) return null;
  return findCustomerAssetForRental(supplementalBottles, rental);
}

/**
 * Type/Product column: same SKU must read the same. Prefer Asset type pricing `description`
 * for the bottle/rental product code, then bottle description (full text) before short `type`.
 */
function resolveRentalHistoryTypeProductLabel(rental, bottle, assetPricingMap) {
  const pricingDesc = (codeRaw) => {
    const k = normalizePricingKey(codeRaw);
    if (!k || !assetPricingMap?.get) return '';
    const row = assetPricingMap.get(k);
    const d = row?.description != null ? String(row.description).trim() : '';
    return d;
  };

  if (bottle) {
    const strict = bottleStrictProductCode(bottle);
    const loose = bottleProductCode(bottle);
    const fromCatalog =
      pricingDesc(strict) ||
      pricingDesc(loose);
    if (fromCatalog) return fromCatalog;
    return (
      bottle.description ||
      bottle.type ||
      bottle.product_code ||
      bottle.display_label ||
      'Unknown'
    );
  }

  const rentalCodeCandidates = [
    rental?.product_code,
    rental?.product_type,
    rental?.asset_type,
    rental?.gas_type,
    rental?.cylinder_type,
    rental?.sku,
    rental?.cylinder?.type,
  ];
  for (const c of rentalCodeCandidates) {
    const d = pricingDesc(c);
    if (d) return d;
  }

  return (
    rental?.cylinder?.type ||
    rental?.product_code ||
    rental?.product_type ||
    rental?.asset_type ||
    rental?.gas_type ||
    rental?.cylinder_type ||
    (typeof rental?.description === 'string' ? rental.description : '') ||
    'Unknown'
  );
}

/** Explains open-rentals vs assigned-bottle count without blaming DNS when dnsCount is 0. */
function buildOpenRentalsBillingHelper({
  delta,
  openCount,
  assignedBottleCount,
  dnsCount,
  rnbCount,
  rnsCount,
  missingAssignedWithoutOpenRental = 0,
}) {
  if (delta < 0) {
    const abs = Math.abs(delta);
    const missing = missingAssignedWithoutOpenRental;
    if (missing > 0) {
      return `${openCount} open rental row(s) drive monthly billing; ${assignedBottleCount} bottles are assigned in inventory. ${missing} assigned bottle${missing !== 1 ? 's' : ''} ${missing !== 1 ? 'have' : 'has'} no matching open rental — those cylinders do not add an invoice line until an open rental exists.`;
    }
    return `${openCount} open rental row(s); ${assignedBottleCount} bottles assigned (Δ −${abs}). Inventory is higher than open rentals — often assigned assets still missing a rental row, or counts mix customer-owned / DNS rows.`;
  }
  if (delta === 0) {
    return 'Monthly rental invoices total these lines — same open rows as the Rentals workspace';
  }
  const dnsLine =
    dnsCount > 0
      ? `${dnsCount} DNS (approved invoice without a scanned bottle). `
      : '';
  const rnbLine = rnbCount > 0 ? `${rnbCount} RNB. ` : '';
  const rnsLine = rnsCount > 0 ? `${rnsCount} RNS. ` : '';
  const tail =
    dnsCount === 0 && rnbCount === 0 && rnsCount === 0
      ? `With no DNS/RNB/RNS here, this ${delta}-row gap usually means open rentals exist for bottles not yet assigned in inventory. Use Assign/Reassign to sync inventory.`
      : 'Remaining mismatch is usually open rentals not yet paired with an assigned bottle. Use Assign/Reassign to sync inventory.';
  return `Billing uses ${openCount} open rows vs ${assignedBottleCount} assigned bottles (Δ ${delta}). ${dnsLine}${rnbLine}${rnsLine}${tail}`;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const getLocalSkuRatesKey = (organizationId, customerId) =>
  `customer_sku_rates:${organizationId || ''}:${customerId || ''}`;

// Helper to check if a string looks like an address
function looksLikeAddress(str) {
  if (!str) return false;
  // Heuristic: contains a comma and a number
  return /\d/.test(str) && str.includes(',');
}

/** Payment terms: shared between Overview edit and Rental settings dialog */
const CUSTOMER_PAYMENT_TERM_OPTIONS = [
  { value: '', label: 'Not set' },
  { value: 'CREDIT CARD', label: 'Credit card' },
  { value: 'Net 15', label: 'Net 15' },
  { value: 'Net 30', label: 'Net 30' },
  { value: 'Net 60', label: 'Net 60' },
  { value: 'Due on receipt', label: 'Due on receipt' },
];

function canonicalPaymentTermValue(raw) {
  if (raw == null || raw === '') return '';
  const t = String(raw).trim();
  const lower = t.toLowerCase();
  if (lower === 'cod' || lower === 'cash on delivery' || lower === 'c.o.d.') return 'CREDIT CARD';
  const hit = CUSTOMER_PAYMENT_TERM_OPTIONS.find((o) => o.value && o.value.toLowerCase() === lower);
  return hit ? hit.value : t;
}

const CUSTOMER_PK_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const filterParentCustomerOptions = createFilterOptions({
  stringify: (option) =>
    `${option?.name ?? ''} ${option?.CustomerListID ?? ''}`.trim(),
});

/** True when bottle assignment fields match this customer (List ID, route id, UUID pk, or legacy name). */
function bottleAssignedToCurrentCustomer(bottle, customer, routeIdFallback) {
  if (!bottle || !customer) return false;
  const listId = String(customer.CustomerListID || '').trim();
  const routeList = String(routeIdFallback || '').trim();
  const listKeys = new Set([listId, routeList].filter(Boolean));
  const name = String(customer.name || '').trim();
  const pk = String(customer.id || '').trim();

  const ac = String(bottle.assigned_customer ?? '').trim();
  const cu = String(bottle.customer_uuid ?? '').trim();
  const cn = String(bottle.customer_name ?? '').trim();

  for (const k of listKeys) {
    if (k && (ac === k || cu === k)) return true;
  }
  if (pk && CUSTOMER_PK_UUID_RE.test(pk) && (ac === pk || cu === pk)) return true;
  if (name && (ac === name || cu === name || cn === name)) return true;
  return false;
}

/**
 * Load one customer row from the URL segment. Handles:
 * - CustomerListID exact match
 * - CustomerListID case mismatch (Postgres eq is case-sensitive for text)
 * - Deep links using customers.id (UUID) instead of CustomerListID
 * Always scoped by organization when orgId is provided.
 */
async function fetchCustomerRowForRouteParam(supabaseClient, orgId, routeId) {
  const raw = routeId == null ? '' : decodeURIComponent(String(routeId)).trim();
  if (!raw) {
    return { data: [], error: null };
  }

  const base = () =>
    orgId
      ? supabaseClient.from('customers').select('*').eq('organization_id', orgId)
      : supabaseClient.from('customers').select('*');

  const { data: byListExact, error: e1 } = await base().eq('CustomerListID', raw);
  if (e1) return { data: null, error: e1 };
  if (byListExact?.length) return { data: byListExact, error: null };

  const { data: byListIlike, error: e2 } = await base().ilike('CustomerListID', raw);
  if (e2) return { data: null, error: e2 };
  if (byListIlike?.length) return { data: byListIlike, error: null };

  if (CUSTOMER_PK_UUID_RE.test(raw)) {
    const { data: byPk, error: e3 } = await base().eq('id', raw);
    if (e3) return { data: null, error: e3 };
    if (byPk?.length) return { data: byPk, error: null };
  }

  return { data: [], error: null };
}

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const tabWasHiddenRef = useRef(false);
  /** When true, next fetchData run skips full-page loading (tab focus / bfcache inventory refresh). */
  const silentInventoryRefreshRef = useRef(false);
  const { organization } = useAuth();
  const subscriptionCtx = useSubscriptions();
  const [customer, setCustomer] = useState(null);
  const [customerAssets, setCustomerAssets] = useState([]);
  const [locationAssets, setLocationAssets] = useState([]);
  const [bottleSummary, setBottleSummary] = useState({});
  const [customerDataVersion, setCustomerDataVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Transfer functionality state
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [availableCustomers, setAvailableCustomers] = useState([]);
  const [targetCustomer, setTargetCustomer] = useState(null);
  const [transferReason, setTransferReason] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferMessage, setTransferMessage] = useState({ open: false, message: '', severity: 'success' });
  
  // Enhanced transfer features state
  const [showTransferHistory, setShowTransferHistory] = useState(false);
  const [transferHistory, setTransferHistory] = useState([]);
  const [locationFilter, setLocationFilter] = useState('all');
  const [showDnsInBottleList, setShowDnsInBottleList] = useState(true);
  const [quickTransferDialogOpen, setQuickTransferDialogOpen] = useState(false);
  const [recentCustomers, setRecentCustomers] = useState([]);
  const [warehouseConfirmDialogOpen, setWarehouseConfirmDialogOpen] = useState(false);
  const [parentCustomer, setParentCustomer] = useState(null); // { id, name, CustomerListID } when this customer is under a parent
  const [childCustomers, setChildCustomers] = useState([]);   // customers where parent_customer_id = this customer's id
  /** Branches under this customer + parent row when this customer is a branch — same keys as bottle/rental merge on initial load. */
  const getSubsidiaryRowsForMerge = useCallback(() => {
    const rows = [...(childCustomers || [])];
    const seen = new Set(rows.map((r) => r?.id).filter(Boolean));
    if (parentCustomer?.id && !seen.has(parentCustomer.id)) {
      rows.push(parentCustomer);
    }
    return rows;
  }, [childCustomers, parentCustomer]);
  const [parentOptions, setParentOptions] = useState([]);     // for edit form "Under parent" selector
  const [customerDetailTab, setCustomerDetailTab] = useState(0); // 0 = Customer Info, 1 = Rental
  const [customerPricing, setCustomerPricing] = useState(null); // customer-specific pricing for this customer
  const [rentalSettingsDialog, setRentalSettingsDialog] = useState(false);
  const [rentalSettingsForm, setRentalSettingsForm] = useState({
    payment_terms: '',
    purchase_order: '',
    tax_region: '',
    daily_calculation_method: 'start_of_day',
    minimum_billable_amount: '5.00',
    rental_bill_format: 'default',
    tax_status: 'default'
  });
  const [rentalSettingsSaving, setRentalSettingsSaving] = useState(false);
  const [productSkuRatesDialogOpen, setProductSkuRatesDialogOpen] = useState(false);
  const [productSkuRatesDraft, setProductSkuRatesDraft] = useState({});
  const [productSkuExtraCode, setProductSkuExtraCode] = useState('');
  const [productSkuExtraMonthly, setProductSkuExtraMonthly] = useState('');
  const [savingProductSkuRates, setSavingProductSkuRates] = useState(false);
  const [orgRentalClasses, setOrgRentalClasses] = useState([]);
  const [resolvingRnbId, setResolvingRnbId] = useState(null); // rental id being resolved (RNB close)
  const [resolvingRnsId, setResolvingRnsId] = useState(null); // rental id being resolved (RNS close)
  const [resolvingDnsId, setResolvingDnsId] = useState(null); // rental id being resolved (DNS close)
  const [fixingDnsRnb, setFixingDnsRnb] = useState(false);
  const [addManualDnsOpen, setAddManualDnsOpen] = useState(false);
  const [addManualDnsSaving, setAddManualDnsSaving] = useState(false);
  const [manualDnsForm, setManualDnsForm] = useState({
    dns_line_type: 'dns',
    product_code: '',
    quantity: '1',
    rental_start_date: new Date().toISOString().split('T')[0],
    order_ref: '',
  });

  const [leaseContractRow, setLeaseContractRow] = useState(null);
  const [leaseItemsRows, setLeaseItemsRows] = useState([]);
  const [leaseStartDate, setLeaseStartDate] = useState('');
  const [leaseEndDate, setLeaseEndDate] = useState('');
  const [newLeaseLine, setNewLeaseLine] = useState({
    asset_type_id: '',
    contracted_quantity: '1',
    unit_price: '',
    yearly_price: '',
  });
  const [leaseBusy, setLeaseBusy] = useState(false);
  /** Yearly leases from `lease_agreements` (Lease agreements page); separate from `lease_contracts` inline editor. */
  const [yearlyLeaseAgreements, setYearlyLeaseAgreements] = useState([]);
  /** Bottles referenced by open rentals but missing from merged assigned-bottle list (stale/wrong customer link, etc.). */
  const [supplementalBottles, setSupplementalBottles] = useState([]);
  const [reassigningOrphans, setReassigningOrphans] = useState(false);
  const [endingOrphanRentals, setEndingOrphanRentals] = useState(false);

  /**
   * Bottles for this account. Legacy import paths could have saved:
   *   - bottles.assigned_customer = CustomerListID (correct)
   *   - bottles.assigned_customer = display name
   *   - bottles.customer_uuid    = customers.id (UUID) only — PostgREST rejects non-UUID filters
   *     on uuid columns, so we only query customer_uuid when the key looks like a UUID.
   *   - bottles.customer_name    = display name
   * Merge every match so no assignments disappear.
   */
  const fetchMergedBottlesForCustomer = useCallback(
    async (orgId, customerName, customerListId, customerPkId = null, subsidiaryCustomerRows = []) => {
      const map = new Map();

      const mergeOneAccount = async (nameRaw, listIdRaw, pkRaw) => {
        const listId = (listIdRaw || id || '').toString().trim();
        const pkTrim = String(pkRaw || '').trim();
        const pkQueries =
          pkTrim && CUSTOMER_PK_UUID_RE.test(pkTrim)
            ? [
                supabase.from('bottles').select('*').eq('organization_id', orgId).eq('assigned_customer', pkTrim),
                supabase.from('bottles').select('*').eq('organization_id', orgId).eq('customer_uuid', pkTrim),
              ]
            : [];
        const listIdLooksUuid = listId && CUSTOMER_PK_UUID_RE.test(listId);
        const idRuns = await Promise.all([
          listId
            ? supabase.from('bottles').select('*').eq('organization_id', orgId).eq('assigned_customer', listId)
            : Promise.resolve({ data: [], error: null }),
          listId && listIdLooksUuid
            ? supabase.from('bottles').select('*').eq('organization_id', orgId).eq('customer_uuid', listId)
            : Promise.resolve({ data: [], error: null }),
          ...pkQueries,
        ]);

        idRuns.forEach(({ data, error }) => {
          if (error) return;
          (data || []).forEach((b) => {
            if (b?.id) map.set(b.id, b);
          });
        });

        if (nameRaw) {
          const nameTrim = String(nameRaw).trim();
          const nameLooksUuid = nameTrim && CUSTOMER_PK_UUID_RE.test(nameTrim);
          const legacyRuns = await Promise.all([
            supabase.from('bottles').select('*').eq('organization_id', orgId).eq('assigned_customer', nameRaw),
            nameLooksUuid
              ? supabase.from('bottles').select('*').eq('organization_id', orgId).eq('customer_uuid', nameTrim)
              : Promise.resolve({ data: [], error: null }),
            supabase.from('bottles').select('*').eq('organization_id', orgId).eq('customer_name', nameRaw),
          ]);
          legacyRuns.forEach(({ data, error }) => {
            if (error) return;
            (data || []).forEach((b) => {
              if (b?.id) map.set(b.id, b);
            });
          });
        }
      };

      await mergeOneAccount(customerName, customerListId, customerPkId);
      for (const row of subsidiaryCustomerRows || []) {
        if (!row) continue;
        await mergeOneAccount(row.name, row.CustomerListID, row.id);
      }

      return Array.from(map.values());
    },
    [id]
  );

  /** Open rentals: CustomerListID match, merged with legacy rows keyed by display name (same customer can have both). */
  const fetchMergedOpenRentalsForCustomer = useCallback(
    async (orgId, customerName, customerListId, customerPkId = null, subsidiaryCustomerRows = []) => {
      const seen = new Set();
      const merged = [];
      const push = (rows) => {
        (rows || []).forEach((r) => {
          if (r?.id && !seen.has(r.id)) {
            seen.add(r.id);
            merged.push(r);
          }
        });
      };

      const mergeOneAccount = async (nameRaw, listIdRaw, pkRaw) => {
        const nameTrim = String(nameRaw || '').trim();
        const listId = String(listIdRaw || id || '').trim();
        const pkTrim = String(pkRaw || '').trim();

        let rentalById = [];
        if (listId) {
          const { data, error: rentalError } = await supabase
            .from('rentals')
            .select('*')
            .eq('customer_id', listId)
            .eq('organization_id', orgId)
            .is('rental_end_date', null);
          if (rentalError) throw rentalError;
          rentalById = data || [];
        }

        let rentalByPk = [];
        if (pkTrim && CUSTOMER_PK_UUID_RE.test(pkTrim)) {
          const { data, error: pkErr } = await supabase
            .from('rentals')
            .select('*')
            .eq('customer_id', pkTrim)
            .eq('organization_id', orgId)
            .is('rental_end_date', null);
          if (pkErr) throw pkErr;
          rentalByPk = data || [];
        }

        let rentalByName = [];
        let rentalByNameAsId = [];
        let rentalByNameError = null;
        let rentalByNameAsIdError = null;
        if (nameTrim) {
          const byNameResp = await supabase
            .from('rentals')
            .select('*')
            .eq('customer_name', nameTrim)
            .eq('organization_id', orgId)
            .is('rental_end_date', null);
          const byNameAsIdResp = await supabase
            .from('rentals')
            .select('*')
            .eq('customer_id', nameTrim)
            .eq('organization_id', orgId)
            .is('rental_end_date', null);
          rentalByName = byNameResp.data || [];
          rentalByNameAsId = byNameAsIdResp.data || [];
          rentalByNameError = byNameResp.error;
          rentalByNameAsIdError = byNameAsIdResp.error;
        }

        push(rentalById);
        push(rentalByPk);
        if (!rentalByNameError) push(rentalByName);
        if (!rentalByNameAsIdError) push(rentalByNameAsId);
      };

      await mergeOneAccount(customerName, customerListId, customerPkId);
      for (const row of subsidiaryCustomerRows || []) {
        if (!row) continue;
        await mergeOneAccount(row.name, row.CustomerListID, row.id);
      }

      // Final safety dedupe by business key so one active row is shown per bottle/DNS key.
      // Keep the most recent row when duplicates exist.
      const byKey = new Map();
      const dedupeKey = (r) => {
        if (r?.is_dns === true) {
          // Keep distinct DNS rows by id; rentalById/byName merge already removes true duplicates by id.
          return `dns_row:${String(r?.id || '').trim() || `${r?.dns_product_code || r?.product_code || ''}:${String(r?.bottle_barcode || '').trim().toUpperCase()}:${r?.customer_id || ''}:${r?.rental_start_date || ''}:${r?.created_at || ''}`}`;
        }
        if (r?.bottle_id) return `bottle_id:${r.bottle_id}`;
        if (r?.bottle_barcode) return `barcode:${String(r.bottle_barcode).trim().toUpperCase()}`;
        return `row:${r?.id || Math.random().toString(36).slice(2)}`;
      };
      const rank = (r) => {
        const start = Date.parse(r?.rental_start_date || '') || 0;
        const updated = Date.parse(r?.updated_at || '') || 0;
        const created = Date.parse(r?.created_at || '') || 0;
        return [start, updated, created];
      };
      const isNewer = (next, cur) => {
        const [ns, nu, nc] = rank(next);
        const [cs, cu, cc] = rank(cur);
        if (ns !== cs) return ns > cs;
        if (nu !== cu) return nu > cu;
        return nc >= cc;
      };

      merged.forEach((row) => {
        const key = dedupeKey(row);
        const existing = byKey.get(key);
        if (!existing || isNewer(row, existing)) {
          byKey.set(key, row);
        }
      });

      return Array.from(byKey.values());
    },
    [id]
  );

  // DNS = approved invoice without a scanned bottle.
  // RNB = return scanned on this customer's order but no matching open rental/assignment for them when approved (order customer ≠ “on rent” for that bottle).
  // RNS = return with no scanned bottle
  const dnsRentals = useMemo(() => (locationAssets || []).filter(r => r.is_dns), [locationAssets]);
  const rnbRentals = useMemo(
    () => dnsRentals.filter((r) => String(r.dns_description || '').toLowerCase().includes('return not on balance')),
    [dnsRentals]
  );
  const rnsRentals = useMemo(
    () => dnsRentals.filter((r) => String(r.dns_description || '').toLowerCase().includes('return not scanned')),
    [dnsRentals]
  );
  const dnsOnlyRentals = useMemo(() => dnsRentals.filter(r => {
    const desc = String(r.dns_description || '').toLowerCase();
    return !desc.includes('return not on balance') && !desc.includes('return not scanned');
  }), [dnsRentals]);
  const dnsSummaryByType = useMemo(() => {
    const byType = {};
    (dnsOnlyRentals || []).forEach(r => {
      const type = r.dns_product_code || r.product_code || 'UNCLASSIFIED';
      byType[type] = (byType[type] || 0) + 1;
    });
    return byType;
  }, [dnsOnlyRentals]);
  const rnbSummaryByType = useMemo(() => {
    const byType = {};
    (rnbRentals || []).forEach((r) => {
      const pc = (r.dns_product_code || r.product_code || '').trim();
      const key = pc
        ? getBottleSummaryGroupKey({ product_code: pc, type: '', description: '', gas_type: '' })
        : 'RNB';
      byType[key] = (byType[key] || 0) + 1;
    });
    return byType;
  }, [rnbRentals]);
  const rnsSummaryByType = useMemo(() => {
    const byType = {};
    (rnsRentals || []).forEach(r => {
      const type = r.dns_product_code || r.product_code || 'RNS';
      byType[type] = (byType[type] || 0) + 1;
    });
    return byType;
  }, [rnsRentals]);
  const displayBottleList = useMemo(() => {
    const physical = (customerAssets || []).map((a) => ({ ...a, isDns: false }));
    if (!showDnsInBottleList) return physical;
    const dnsRows = [...dnsOnlyRentals, ...rnbRentals].map((r) => ({
      id: 'dns-' + r.id,
      serial_number: '—',
      barcode_number: String(r.dns_description || '').toLowerCase().includes('return not on balance')
        ? (r.bottle_barcode || 'RNB')
        : (r.bottle_barcode || 'DNS'),
      type: r.dns_product_code || r.product_code || 'UNCLASSIFIED',
      description: r.dns_description || '',
      location: '—',
      isDns: true
    }));
    return [...physical, ...dnsRows];
  }, [customerAssets, dnsOnlyRentals, rnbRentals, showDnsInBottleList]);
  const openRentalBottleKeys = useMemo(() => {
    const bottleIds = new Set();
    const barcodes = new Set();
    for (const r of (locationAssets || [])) {
      if (!r || r.is_dns) continue;
      const bid = r.bottle_id == null ? '' : String(r.bottle_id).trim();
      if (bid) bottleIds.add(bid);
      const bc = String(r.bottle_barcode || '').trim().toUpperCase();
      if (bc) barcodes.add(bc);
    }
    return { bottleIds, barcodes };
  }, [locationAssets]);
  // Total = physical + DNS only, minus RNS (return not scanned). RNB is exception — not added.
  const totalBottleCount = Math.max(0, (customerAssets?.length || 0) + dnsOnlyRentals.length - rnsRentals.length);

  const resolveRnb = async (rental) => {
    if (!rental?.id || !customer?.organization_id) return;
    setResolvingRnbId(rental.id);
    try {
      const { error } = await supabase
        .from('rentals')
        .update({
          rental_end_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', rental.id);
      if (error) throw error;
      const merged = await fetchMergedOpenRentalsForCustomer(
        customer.organization_id,
        customer.name,
        customer.CustomerListID,
        customer.id,
        getSubsidiaryRowsForMerge()
      );
      setLocationAssets(merged);
      setTransferMessage({ open: true, message: 'RNB resolved. It will no longer show on this customer.', severity: 'success' });
    } catch (e) {
      logger.error('Resolve RNB error:', e);
      setTransferMessage({ open: true, message: e?.message || 'Failed to resolve RNB', severity: 'error' });
    } finally {
      setResolvingRnbId(null);
    }
  };

  const resolveRns = async (rental) => {
    if (!rental?.id || !customer?.organization_id) return;
    setResolvingRnsId(rental.id);
    try {
      const { error } = await supabase
        .from('rentals')
        .update({
          rental_end_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', rental.id);
      if (error) throw error;
      const merged = await fetchMergedOpenRentalsForCustomer(
        customer.organization_id,
        customer.name,
        customer.CustomerListID,
        customer.id,
        getSubsidiaryRowsForMerge()
      );
      setLocationAssets(merged);
      setTransferMessage({ open: true, message: 'RNS resolved. It will no longer reduce this customer\'s total.', severity: 'success' });
    } catch (e) {
      logger.error('Resolve RNS error:', e);
      setTransferMessage({ open: true, message: e?.message || 'Failed to resolve RNS', severity: 'error' });
    } finally {
      setResolvingRnsId(null);
    }
  };

  const resolveDns = async (rental) => {
    if (!rental?.id || !customer?.organization_id) return;
    setResolvingDnsId(rental.id);
    try {
      const { error } = await supabase
        .from('rentals')
        .update({
          rental_end_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', rental.id);
      if (error) throw error;
      const merged = await fetchMergedOpenRentalsForCustomer(
        customer.organization_id,
        customer.name,
        customer.CustomerListID,
        customer.id,
        getSubsidiaryRowsForMerge()
      );
      setLocationAssets(merged);
      setTransferMessage({ open: true, message: 'DNS cleared. It will no longer show on this customer.', severity: 'success' });
    } catch (e) {
      logger.error('Resolve DNS error:', e);
      setTransferMessage({ open: true, message: e?.message || 'Failed to clear DNS', severity: 'error' });
    } finally {
      setResolvingDnsId(null);
    }
  };

  const submitManualDns = async () => {
    const orgId = customer?.organization_id;
    if (!orgId) return;
    if (manualDnsProductPickerOptions.length === 0) {
      setTransferMessage({
        open: true,
        message:
          'No product SKUs available. Add Asset type pricing rows or set product/type on bottles (Assets), then try again.',
        severity: 'warning',
      });
      return;
    }
    const productCode = (manualDnsForm.product_code || '').trim();
    if (!productCode) {
      setTransferMessage({ open: true, message: 'Select a product code from the list.', severity: 'warning' });
      return;
    }
    if (!manualDnsProductCodeAllowed.has(productCode.toLowerCase())) {
      setTransferMessage({
        open: true,
        message: 'Choose a product code from the list (pricing, rental class, or inventory SKU).',
        severity: 'warning',
      });
      return;
    }
    let q = parseInt(manualDnsForm.quantity, 10);
    if (Number.isNaN(q) || q < 1) q = 1;
    q = Math.min(q, 500);
    const startYmd =
      (manualDnsForm.rental_start_date || '').trim() || new Date().toISOString().split('T')[0];
    const lineType = manualDnsForm.dns_line_type || 'dns';
    const dnsDescription =
      lineType === 'rnb'
        ? `Return not on balance — ${productCode} (manual)`
        : lineType === 'rns'
          ? `Return not scanned — ${productCode} (manual)`
          : `${productCode} – manual DNS (delivered not scanned)`;
    const orderRef = (manualDnsForm.order_ref || '').trim();
    const dnsOrderNumber = orderRef ? `MANUAL-${orderRef}` : `MANUAL-${Date.now()}`;
    const customerIdForRental = customer.CustomerListID || customer.name;
    const customerNameForRental = customer.name || '';
    const rentalLocation =
      (customer?.location && String(customer.location).trim()) ||
      (customer?.city && String(customer.city).trim()) ||
      'SASKATOON';

    setAddManualDnsSaving(true);
    try {
      const pricingCtx = await fetchOrgRentalPricingContext(supabase, orgId);
      let rental_amount = monthlyRateForProductPlaceholder(customerIdForRental, productCode, pricingCtx);
      if (!(rental_amount > 0)) rental_amount = 10;

      const nowIso = new Date().toISOString();
      const rows = [];
      for (let i = 0; i < q; i += 1) {
        rows.push({
          organization_id: orgId,
          customer_id: customerIdForRental,
          customer_name: customerNameForRental,
          is_dns: true,
          dns_product_code: productCode,
          dns_description: dnsDescription,
          dns_order_number: dnsOrderNumber,
          bottle_id: null,
          bottle_barcode: null,
          rental_start_date: startYmd,
          rental_end_date: null,
          rental_amount,
          rental_type: 'monthly',
          tax_code: 'GST+PST',
          tax_rate: 0.11,
          location: rentalLocation,
          status: 'active',
          created_at: nowIso,
          updated_at: nowIso,
        });
      }
      const { error } = await supabase.from('rentals').insert(rows);
      if (error) throw error;
      const merged = await fetchMergedOpenRentalsForCustomer(
        orgId,
        customer.name,
        customer.CustomerListID,
        customer.id,
        getSubsidiaryRowsForMerge()
      );
      setLocationAssets(merged);
      setAddManualDnsOpen(false);
      setManualDnsForm({
        dns_line_type: 'dns',
        product_code: '',
        quantity: '1',
        rental_start_date: new Date().toISOString().split('T')[0],
        order_ref: '',
      });
      const typeWord =
        lineType === 'rnb' ? 'RNB' : lineType === 'rns' ? 'RNS' : 'DNS';
      setTransferMessage({
        open: true,
        message: `Added ${q} ${typeWord} rental line(s) for ${productCode}.`,
        severity: 'success',
      });
    } catch (e) {
      logger.error('Manual DNS insert error:', e);
      setTransferMessage({
        open: true,
        message: e?.message || 'Failed to add DNS line',
        severity: 'error',
      });
    } finally {
      setAddManualDnsSaving(false);
    }
  };

  const resolveDnsRnbPairs = async () => {
    if (!customer?.organization_id || !customer?.CustomerListID) return;
    setFixingDnsRnb(true);
    try {
      const productKey = (r) => String(r?.dns_product_code || r?.product_code || '').trim().toUpperCase() || 'UNCLASSIFIED';
      const sortByOldest = (a, b) => {
        const aTime = Date.parse(a?.rental_start_date || a?.created_at || '') || 0;
        const bTime = Date.parse(b?.rental_start_date || b?.created_at || '') || 0;
        return aTime - bTime;
      };

      const dnsByProduct = {};
      const rnbByProduct = {};

      (dnsOnlyRentals || []).forEach((r) => {
        const key = productKey(r);
        if (!dnsByProduct[key]) dnsByProduct[key] = [];
        dnsByProduct[key].push(r);
      });
      (rnbRentals || []).forEach((r) => {
        const key = productKey(r);
        if (!rnbByProduct[key]) rnbByProduct[key] = [];
        rnbByProduct[key].push(r);
      });

      Object.keys(dnsByProduct).forEach((k) => dnsByProduct[k].sort(sortByOldest));
      Object.keys(rnbByProduct).forEach((k) => rnbByProduct[k].sort(sortByOldest));

      const idsToClose = [];
      const keys = new Set([...Object.keys(dnsByProduct), ...Object.keys(rnbByProduct)]);
      keys.forEach((key) => {
        const dnsRows = dnsByProduct[key] || [];
        const rnbRows = rnbByProduct[key] || [];
        const pairCount = Math.min(dnsRows.length, rnbRows.length);
        for (let i = 0; i < pairCount; i += 1) {
          if (dnsRows[i]?.id) idsToClose.push(dnsRows[i].id);
          if (rnbRows[i]?.id) idsToClose.push(rnbRows[i].id);
        }
      });

      if (idsToClose.length === 0) {
        setTransferMessage({
          open: true,
          message: 'No DNS/RNB pairs found to auto-resolve for this customer.',
          severity: 'info',
        });
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const { error } = await supabase
        .from('rentals')
        .update({
          rental_end_date: today,
          updated_at: new Date().toISOString(),
        })
        .in('id', idsToClose)
        .eq('organization_id', customer.organization_id);
      if (error) throw error;

      const merged = await fetchMergedOpenRentalsForCustomer(
        customer.organization_id,
        customer.name,
        customer.CustomerListID,
        customer.id,
        getSubsidiaryRowsForMerge()
      );
      setLocationAssets(merged);
      setTransferMessage({
        open: true,
        message: `Auto-resolved ${Math.floor(idsToClose.length / 2)} DNS/RNB pair(s) for this customer.`,
        severity: 'success',
      });
    } catch (e) {
      logger.error('resolveDnsRnbPairs error:', e);
      setTransferMessage({
        open: true,
        message: e?.message || 'Failed to auto-resolve DNS/RNB pairs',
        severity: 'error',
      });
    } finally {
      setFixingDnsRnb(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!organization?.id) {
        return;
      }
      const silentRefresh = silentInventoryRefreshRef.current;
      silentInventoryRefreshRef.current = false;
      if (!silentRefresh) {
        setLoading(true);
      }
      setError(null);
      try {
        const { data: allCustomers, error: checkError } = await fetchCustomerRowForRouteParam(
          supabase,
          organization.id,
          id
        );

        if (checkError) throw checkError;

        if (!allCustomers || allCustomers.length === 0) {
          setError(`Customer with ID "${id}" not found.`);
          setLoading(false);
          return;
        }

        if (allCustomers.length > 1) {
          setError(
            `Multiple customers found with ID "${id}". This indicates a data integrity issue. Please contact support.`
          );
          setLoading(false);
          return;
        }
        
        // We have exactly one customer
        const customerData = allCustomers[0];
        setCustomer(customerData);
        setEditForm({
          ...customerData,
          billing_mode: customerData.billing_mode || 'rental',
          customer_type: customerTypeForForm(customerData),
        });

        // Parent: customer under another (e.g. branch under head office)
        let parentRow = null;
        if (customerData.parent_customer_id) {
          const { data: pr } = await supabase
            .from('customers')
            .select('id, name, CustomerListID')
            .eq('id', customerData.parent_customer_id)
            .maybeSingle();
          parentRow = pr || null;
          setParentCustomer(parentRow);
        } else {
          setParentCustomer(null);
        }
        // Children: locations/departments under this customer
        let childrenRows = [];
        if (customerData.id) {
          const { data: children } = await supabase
            .from('customers')
            .select('id, name, CustomerListID')
            .eq('parent_customer_id', customerData.id)
            .order('name');
          childrenRows = children || [];
          setChildCustomers(childrenRows);
        } else {
          setChildCustomers([]);
        }

        // Also merge bottles/rentals keyed under linked customer rows (branch list IDs / parent account).
        const subsidiaryCustomerRows = [];
        const seenSubId = new Set();
        const pushSubsidiary = (row) => {
          if (!row?.id || seenSubId.has(row.id)) return;
          if (String(row.id) === String(customerData.id)) return;
          seenSubId.add(row.id);
          subsidiaryCustomerRows.push(row);
        };
        childrenRows.forEach(pushSubsidiary);
        if (parentRow) pushSubsidiary(parentRow);

        const orgId = customerData.organization_id;
        const customerAssetsData = await fetchMergedBottlesForCustomer(
          orgId,
          customerData.name,
          customerData.CustomerListID,
          customerData.id,
          subsidiaryCustomerRows
        );
        setCustomerAssets(customerAssetsData);

        setBottleSummary(summarizeBottlesByType(customerAssetsData || []));

        const merged = await fetchMergedOpenRentalsForCustomer(
          orgId,
          customerData.name,
          customerData.CustomerListID,
          customerData.id,
          subsidiaryCustomerRows
        );
        const { inserted: backfilledRentalsInserted } = await backfillOpenRentalsForAssignedBottles(
          supabase,
          orgId,
          {
            bottles: customerAssetsData || [],
            openRentals: merged,
            customers: [customerData, ...(subsidiaryCustomerRows || [])],
          },
        );
        let openRentalsWorking = merged;
        let openRentalsFinal = merged?.length ?? 0;
        if (backfilledRentalsInserted > 0) {
          openRentalsWorking = await fetchMergedOpenRentalsForCustomer(
            orgId,
            customerData.name,
            customerData.CustomerListID,
            customerData.id,
            subsidiaryCustomerRows
          );
          openRentalsFinal = openRentalsWorking?.length ?? 0;
          if (typeof subscriptionCtx?.refreshSilent === 'function') {
            subscriptionCtx.refreshSilent();
          }
        }

        const { closed: orphansClosed } = await closeOrphanOpenRentalsForOrg(supabase, orgId, {
          openRentals: openRentalsWorking,
          bottles: customerAssetsData || [],
          customers: [customerData, ...(subsidiaryCustomerRows || [])],
        });
        if (orphansClosed > 0) {
          openRentalsWorking = await fetchMergedOpenRentalsForCustomer(
            orgId,
            customerData.name,
            customerData.CustomerListID,
            customerData.id,
            subsidiaryCustomerRows
          );
          openRentalsFinal = openRentalsWorking?.length ?? 0;
          if (typeof subscriptionCtx?.refreshSilent === 'function') {
            subscriptionCtx.refreshSilent();
          }
        }
        setLocationAssets(openRentalsWorking);
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };
    fetchData();
  }, [
    id,
    location.key,
    customerDataVersion,
    organization?.id,
    fetchMergedBottlesForCustomer,
    fetchMergedOpenRentalsForCustomer,
  ]);

  /** Inventory + open rentals can change while this tab is in background or via bfcache back navigation — refetch so assigned bottles match DB. */
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        tabWasHiddenRef.current = true;
        return;
      }
      if (document.visibilityState === 'visible' && tabWasHiddenRef.current) {
        tabWasHiddenRef.current = false;
        silentInventoryRefreshRef.current = true;
        setCustomerDataVersion((v) => v + 1);
      }
    };
    const onPageShow = (e) => {
      if (e.persisted) {
        silentInventoryRefreshRef.current = true;
        setCustomerDataVersion((v) => v + 1);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

  useEffect(() => {
    if (!customer?.organization_id || (!customer?.CustomerListID && !customer?.id)) {
      setLeaseContractRow(null);
      setLeaseItemsRows([]);
      setYearlyLeaseAgreements([]);
      return;
    }
    const leaseCustomerKeys = [
      ...new Set(
        [customer.CustomerListID, customer.id]
          .filter(Boolean)
          .map((k) => String(k).trim())
          .filter(Boolean),
      ),
    ];
    if (leaseCustomerKeys.length === 0) {
      setLeaseContractRow(null);
      setLeaseItemsRows([]);
      setYearlyLeaseAgreements([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: orgCustomers } = await supabase
        .from('customers')
        .select('*')
        .eq('organization_id', customer.organization_id);

      if (cancelled) return;

      const subKey = customer.CustomerListID || customer.id;
      const matchKeys = expandLeaseMatchKeys(subKey, customer, orgCustomers || []);
      const expandedArr = Array.from(matchKeys).filter(Boolean);
      /** Same alias expansion as Subscriptions — lease rows may key by List ID, UUID, or name. */
      const inKeys = expandedArr.length > 0 ? expandedArr : leaseCustomerKeys;

      const { data: contracts, error: contractsError } = await supabase
        .from('lease_contracts')
        .select('*')
        .eq('organization_id', customer.organization_id)
        .in('customer_id', inKeys)
        .order('start_date', { ascending: false });
      if (contractsError) {
        logger.warn('CustomerDetail lease_contracts fetch:', contractsError);
      }
      if (cancelled) return;

      const contractRows = contractsError ? [] : contracts || [];

      /** Yearly lease workspace (`lease_agreements`) — same customer may have no `lease_contracts` row yet. */
      let yearlyMerged = [];
      try {
        const { data: byCustomerId, error: yErr } = await supabase
          .from('lease_agreements')
          .select('*')
          .eq('organization_id', customer.organization_id)
          .in('customer_id', inKeys);
        if (!yErr && byCustomerId?.length) {
          byCustomerId.forEach((r) => yearlyMerged.push(r));
        }
        const displayName = String(customer.name || customer.Name || '').trim();
        if (displayName) {
          const { data: byName, error: nErr } = await supabase
            .from('lease_agreements')
            .select('*')
            .eq('organization_id', customer.organization_id)
            .ilike('customer_name', displayName);
          if (!nErr && byName?.length) {
            byName.forEach((r) => yearlyMerged.push(r));
          }
        }
        const dedup = new Map();
        yearlyMerged.forEach((r) => {
          if (r?.id) dedup.set(r.id, r);
        });
        yearlyMerged = [...dedup.values()];
      } catch {
        yearlyMerged = [];
      }

      const active = findActiveLeaseContract(contractRows, inKeys, customer.organization_id);
      const c = active || (contractRows && contractRows[0]) || null;
      if (cancelled) return;
      setYearlyLeaseAgreements(yearlyMerged);
      setLeaseContractRow(c);
      if (c) {
        setLeaseStartDate(c.start_date || '');
        setLeaseEndDate(c.end_date || '');
        const { data: items } = await supabase
          .from('lease_contract_items')
          .select('*')
          .eq('contract_id', c.id);
        if (!cancelled) setLeaseItemsRows(items || []);
      } else {
        setLeaseStartDate((prev) => prev || new Date().toISOString().split('T')[0]);
        setLeaseEndDate('');
        setLeaseItemsRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    customer?.organization_id,
    customer?.CustomerListID,
    customer?.id,
    customer?.name,
    customer?.Name,
  ]);

  // Load parent customer options when entering edit (for "Under parent" selector)
  useEffect(() => {
    if (!editing || !organization?.id || !customer?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('customers').select('id, name, CustomerListID').eq('organization_id', organization.id).order('name');
      if (!cancelled && data) setParentOptions(data.filter(c => c.id !== customer.id));
    })();
    return () => { cancelled = true; };
  }, [editing, organization?.id, customer?.id]);

  // Load customer-specific pricing when customer is set (for Rental tab)
  useEffect(() => {
    if (!customer?.CustomerListID || !organization?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('customer_pricing')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('customer_id', customer.CustomerListID)
        .maybeSingle();
      if (!cancelled) setCustomerPricing(data || null);
    })();
    return () => { cancelled = true; };
  }, [customer?.CustomerListID, organization?.id]);

  useEffect(() => {
    if (!organization?.id) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('organization_rental_classes')
        .select('*')
        .eq('organization_id', organization.id)
        .order('sort_order', { ascending: true });
      if (!cancelled) {
        if (!error) setOrgRentalClasses(data || []);
        else setOrgRentalClasses([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [organization?.id]);

  const [rentalHistoryLocalRatesVersion, setRentalHistoryLocalRatesVersion] = useState(0);
  useEffect(() => {
    const bump = () => setRentalHistoryLocalRatesVersion((v) => v + 1);
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

  const rentalHistoryAssetPricingMap = useMemo(
    () => buildAssetPricingMap(subscriptionCtx.assetTypePricing),
    [subscriptionCtx.assetTypePricing]
  );

  const rentalHistoryCustomerOverrideMap = useMemo(
    () =>
      buildCustomerOverrideMap({
        legacyPricingOverrides: subscriptionCtx.legacyPricingOverrides,
        customerPricingOverrides: subscriptionCtx.customerPricingOverrides,
        organizationId: organization?.id,
        customers: subscriptionCtx.customers,
      }),
    [
      subscriptionCtx.legacyPricingOverrides,
      subscriptionCtx.customerPricingOverrides,
      subscriptionCtx.customers,
      organization?.id,
      rentalHistoryLocalRatesVersion,
    ]
  );

  const rentalHistoryDefaultMonthly = useMemo(
    () => defaultUnitRatesFromAssetPricingTable(subscriptionCtx.assetTypePricing).monthly,
    [subscriptionCtx.assetTypePricing]
  );

  /**
   * DNS / RNB / RNS manual lines: union of Asset type pricing, rental classes, and every SKU
   * appearing on org bottles (same inventory universe as Assets).
   */
  const manualDnsProductPickerOptions = useMemo(() => {
    const byNorm = new Map();
    const add = (code, description = '', category = '') => {
      const c = String(code || '').trim();
      if (!c) return;
      const k = c.toLowerCase();
      if (!byNorm.has(k)) {
        byNorm.set(k, {
          product_code: c,
          description,
          category,
        });
      }
    };

    for (const p of subscriptionCtx.assetTypePricing || []) {
      if (String(p?.product_code || '').trim() && p.is_active !== false) {
        add(p.product_code, p.description || '', p.category || '');
      }
    }

    for (const row of orgRentalClasses || []) {
      const code = String(row.match_product_code || '').trim();
      if (!code) continue;
      const label = String(row.class_name || row.group_name || '').trim();
      add(code, label ? `${label} (rental class)` : 'Rental class', row.match_category || '');
    }

    for (const b of subscriptionCtx.bottles || []) {
      const code = bottleProductCode(b);
      if (code) add(code, 'Organization inventory (Assets)', '');
    }

    for (const asset of customerAssets || []) {
      const code = bottleProductCode(asset);
      if (code) add(code, 'This customer’s bottles', '');
    }

    return [...byNorm.values()].sort((a, b) =>
      a.product_code.localeCompare(b.product_code, undefined, { sensitivity: 'base' })
    );
  }, [subscriptionCtx.assetTypePricing, subscriptionCtx.bottles, orgRentalClasses, customerAssets]);

  const manualDnsProductCodeAllowed = useMemo(() => {
    const s = new Set();
    for (const o of manualDnsProductPickerOptions) {
      s.add(o.product_code.toLowerCase());
    }
    return s;
  }, [manualDnsProductPickerOptions]);

  const filterManualDnsProductOptions = useMemo(
    () =>
      createFilterOptions({
        stringify: (option) =>
          `${option.product_code} ${option.description || ''} ${option.category || ''}`,
      }),
    []
  );

  /**
   * Supplemental bottle fetch + auto-reassign.
   * When an open rental references a bottle that isn't in the assigned list,
   * look it up in the org, then automatically reassign it here — if there's
   * an open rental and no return was ever scanned, the customer still has it.
   */
  useEffect(() => {
    const orgId = organization?.id;
    const cust = customer;
    if (!orgId || !cust) {
      setSupplementalBottles([]);
      return;
    }
    const listId = (cust.CustomerListID || id || '').toString().trim();
    const assets = customerAssets || [];
    const loc = locationAssets || [];
    const needIds = [];
    const needBarcodes = [];
    const idSeen = new Set();
    const bcSeen = new Set();
    for (const r of loc) {
      if (r?.is_dns) continue;
      if (findCustomerAssetForRental(assets, r)) continue;
      if (r?.bottle_id && !idSeen.has(r.bottle_id)) {
        idSeen.add(r.bottle_id);
        needIds.push(r.bottle_id);
      }
      const bc = String(r?.bottle_barcode || '').trim();
      if (bc && !bcSeen.has(bc)) {
        bcSeen.add(bc);
        needBarcodes.push(bc);
      }
    }
    if (!needIds.length && !needBarcodes.length) {
      setSupplementalBottles([]);
      return;
    }
    let cancelled = false;
    const CHUNK = 80;
    (async () => {
      const collected = [];
      const mergeRows = (rows) => {
        for (const b of rows || []) {
          if (b?.id) collected.push(b);
        }
      };
      try {
        for (let i = 0; i < needIds.length; i += CHUNK) {
          const slice = needIds.slice(i, i + CHUNK);
          const { data, error } = await supabase
            .from('bottles')
            .select('*')
            .eq('organization_id', orgId)
            .in('id', slice);
          if (error) throw error;
          mergeRows(data);
        }
        for (let i = 0; i < needBarcodes.length; i += CHUNK) {
          const slice = needBarcodes.slice(i, i + CHUNK);
          const { data: d1, error: e1 } = await supabase
            .from('bottles')
            .select('*')
            .eq('organization_id', orgId)
            .in('barcode_number', slice);
          if (e1) throw e1;
          mergeRows(d1);
          const { data: d2, error: e2 } = await supabase
            .from('bottles')
            .select('*')
            .eq('organization_id', orgId)
            .in('serial_number', slice);
          if (e2) throw e2;
          mergeRows(d2);
        }
      } catch (e) {
        logger.error('Supplemental bottle fetch failed:', e);
      }
      const dedupe = new Map();
      for (const b of collected) {
        if (b?.id) dedupe.set(b.id, b);
      }
      const found = Array.from(dedupe.values());
      if (cancelled) return;
      setSupplementalBottles(found);

      // Auto-reassign disabled: silently rewriting bottles.assigned_customer based on
      // stale open rentals can merge customers that share legacy rental linkage.
      // Use the explicit "Assign N bottle(s)" button on this page when you want to
      // reconcile inventory with open rental rows.
    })();
    return () => {
      cancelled = true;
    };
  }, [organization?.id, customer, locationAssets, customerAssets, id, fetchMergedBottlesForCustomer]);

  const orphanRentals = useMemo(() => {
    const assets = customerAssets || [];
    const extras = supplementalBottles || [];
    const cust = customer;
    return (locationAssets || [])
      .filter((r) => {
        if (r?.is_dns) return false;
        if (findCustomerAssetForRental(assets, r)) return false;
        const viaExtra = findCustomerAssetForRental(extras, r);
        if (viaExtra && bottleAssignedToCurrentCustomer(viaExtra, cust, id)) return false;
        return true;
      })
      .map((r) => {
        const bottle = findCustomerAssetForRental(extras, r);
        return { rental: r, bottle };
      });
  }, [locationAssets, customerAssets, supplementalBottles, customer, id]);

  /** Assigned cylinders (non–customer-owned) with no matching non-DNS open rental — not an invoice line until a rental row exists. */
  const assignedBottlesMissingOpenRental = useMemo(() => {
    const rentals = (locationAssets || []).filter((r) => !r?.is_dns);
    const assets = customerAssets || [];
    const missing = [];
    for (const b of assets) {
      if (isCustomerOwnedForBilling(b)) continue;
      const matched = rentals.some((r) => {
        const rid = r?.bottle_id != null ? String(r.bottle_id).trim() : '';
        const bid = b?.id != null ? String(b.id).trim() : '';
        if (rid && bid && rid === bid) return true;
        if (r?.bottle_barcode) return bottleMatchesRentalRow(b, r.bottle_barcode);
        return false;
      });
      if (!matched) missing.push(b);
    }
    return missing;
  }, [locationAssets, customerAssets]);

  const handleReassignOrphans = async () => {
    if (!customer || !organization?.id) return;
    const normalizeBarcode = (value) => {
      if (value === undefined || value === null) return '';
      return String(value).trim().replace(/\.0+$/, '');
    };
    const stripLeadingZeros = (value) => {
      const normalized = normalizeBarcode(value);
      if (!normalized) return '';
      const stripped = normalized.replace(/^0+/, '');
      return stripped || '0';
    };

    const listId = customer.CustomerListID || id;
    const toFix = orphanRentals.filter((o) => o.bottle?.id);
    if (!toFix.length) return;
    setReassigningOrphans(true);
    try {
      let fixed = 0;
      let alreadyAssigned = 0;
      for (const { rental, bottle } of toFix) {
        const payload = {
          assigned_customer: listId,
          customer_uuid: listId,
          customer_name: customer.name,
        };
        let updated = false;

        // Primary: update by bottle row id (only when id is a UUID).
        const bottleRowId = String(bottle?.id || '').trim();
        if (bottleRowId && UUID_RE.test(bottleRowId)) {
          const { data, error } = await supabase
            .from('bottles')
            .update(payload)
            .eq('id', bottleRowId)
            .eq('organization_id', organization.id)
            .select('id');
          if (error) {
            logger.error('Reassign orphan bottle by id failed:', error);
          } else if ((data || []).length > 0) {
            updated = true;
          }
        }

        // Fallback: resolve bottle id from rental barcode/serial variants, then update by id.
        if (!updated) {
          const barcodeRaw = normalizeBarcode(rental?.bottle_barcode);
          if (barcodeRaw) {
            const candidates = [barcodeRaw];
            const noLeadingZeros = stripLeadingZeros(barcodeRaw);
            if (noLeadingZeros && !candidates.includes(noLeadingZeros)) {
              candidates.push(noLeadingZeros);
            }

            let resolvedBottleId = null;
            let resolvedBottleRow = null;

            for (const candidate of candidates) {
              const [byBarcodeRes, bySerialRes] = await Promise.all([
                supabase
                  .from('bottles')
                  .select('id, assigned_customer, customer_name')
                  .eq('organization_id', organization.id)
                  .eq('barcode_number', candidate)
                  .limit(1),
                supabase
                  .from('bottles')
                  .select('id, assigned_customer, customer_name')
                  .eq('organization_id', organization.id)
                  .eq('serial_number', candidate)
                  .limit(1),
              ]);

              const byBarcodeRow = byBarcodeRes?.data?.[0] || null;
              const bySerialRow = bySerialRes?.data?.[0] || null;
              const hit = byBarcodeRow || bySerialRow;
              if (hit?.id) {
                resolvedBottleId = hit.id;
                resolvedBottleRow = hit;
                break;
              }
            }

            if (resolvedBottleId) {
              const alreadyCorrect =
                String(resolvedBottleRow?.assigned_customer || '').trim() === String(listId).trim()
                && String(resolvedBottleRow?.customer_name || '').trim() === String(customer.name || '').trim();

              if (alreadyCorrect) {
                alreadyAssigned += 1;
                updated = true;
              } else {
                const resolvedBottleIdText = String(resolvedBottleId || '').trim();
                if (resolvedBottleIdText && UUID_RE.test(resolvedBottleIdText)) {
                  const { data, error } = await supabase
                    .from('bottles')
                    .update(payload)
                    .eq('id', resolvedBottleIdText)
                    .eq('organization_id', organization.id)
                    .select('id');
                  if (error) {
                    logger.error('Reassign orphan bottle by resolved id failed:', error);
                  } else if ((data || []).length > 0) {
                    updated = true;
                  }
                } else {
                  // Legacy/non-UUID ids can exist in lookup data; update by matched barcode/serial instead.
                  for (const candidate of candidates) {
                    const { data: barcodeData, error: barcodeError } = await supabase
                      .from('bottles')
                      .update(payload)
                      .eq('organization_id', organization.id)
                      .eq('barcode_number', candidate)
                      .select('id');
                    if (barcodeError) {
                      logger.error('Reassign orphan bottle by barcode failed:', barcodeError);
                    } else if ((barcodeData || []).length > 0) {
                      updated = true;
                      break;
                    }

                    const { data: serialData, error: serialError } = await supabase
                      .from('bottles')
                      .update(payload)
                      .eq('organization_id', organization.id)
                      .eq('serial_number', candidate)
                      .select('id');
                    if (serialError) {
                      logger.error('Reassign orphan bottle by serial failed:', serialError);
                    } else if ((serialData || []).length > 0) {
                      updated = true;
                      break;
                    }
                  }
                }
              }
            }
          }
        }

        if (updated) fixed++;
      }
      const freshBottles = await fetchMergedBottlesForCustomer(
        organization.id,
        customer.name,
        listId,
        customer.id,
        getSubsidiaryRowsForMerge()
      );
      setCustomerAssets(freshBottles);
      setTransferMessage({
        open: true,
        message:
          fixed > 0
            ? `Reassigned ${fixed} bottle(s) to ${customer.name}.`
            : alreadyAssigned > 0
              ? `${alreadyAssigned} bottle(s) were already assigned to ${customer.name}.`
              : 'No bottle assignments were changed. These rows may already be assigned or require manual data repair.',
        severity: fixed > 0 ? 'success' : 'warning',
      });
    } catch (e) {
      logger.error('Reassign orphans error:', e);
      setTransferMessage({ open: true, message: e?.message || 'Failed to reassign', severity: 'error' });
    } finally {
      setReassigningOrphans(false);
    }
  };

  const orphanRentalsToEnd = useMemo(
    () => (orphanRentals || []).filter((o) => o.rental?.id && !o.rental?.is_dns),
    [orphanRentals]
  );

  const handleEndOrphanRentals = async () => {
    if (!customer?.organization_id) return;
    const rows = orphanRentalsToEnd;
    if (!rows.length) return;
    const n = rows.length;
    if (
      !window.confirm(
        `Close ${n} open rental row(s) for this customer? They will stop being billed (use when cylinders were transferred back to the warehouse or should not be on rent).`
      )
    ) {
      return;
    }
    setEndingOrphanRentals(true);
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const updatedAt = new Date().toISOString();
      let closed = 0;
      for (const { rental } of rows) {
        const { error } = await supabase
          .from('rentals')
          .update({
            rental_end_date: endDate,
            updated_at: updatedAt,
          })
          .eq('id', rental.id)
          .eq('organization_id', customer.organization_id);
        if (error) {
          logger.error('End orphan rental failed:', error);
        } else {
          closed += 1;
        }
      }
      const merged = await fetchMergedOpenRentalsForCustomer(
        customer.organization_id,
        customer.name,
        customer.CustomerListID,
        customer.id,
        getSubsidiaryRowsForMerge()
      );
      setLocationAssets(merged);
      if (closed > 0 && typeof subscriptionCtx?.refresh === 'function') {
        subscriptionCtx.refresh();
      }
      setTransferMessage({
        open: true,
        message:
          closed > 0
            ? `Closed ${closed} rental row(s). They are no longer included in open rental billing.`
            : 'No rental rows were closed.',
        severity: closed > 0 ? 'success' : 'warning',
      });
    } catch (e) {
      logger.error('End orphan rentals error:', e);
      setTransferMessage({
        open: true,
        message: e?.message || 'Failed to close rentals',
        severity: 'error',
      });
    } finally {
      setEndingOrphanRentals(false);
    }
  };

  /** Match Rentals page: overrides + rate table + local SKU rates, not stale DB rental_amount. */
  const rentalHistoryDisplayRows = useMemo(() => {
    const assets = customerAssets || [];
    const extra = supplementalBottles || [];
    const customerKey = customer?.CustomerListID;
    return (locationAssets || []).map((rental) => {
      const isDNS = rental.is_dns === true;
      const isYearly = (rental.rental_type || 'monthly').toLowerCase() === 'yearly';
      if (isDnsRentalExcludedFromBillableCount(rental)) {
        return { rental, displayAmount: 0 };
      }
      if (isYearly) {
        const raw = parseFloat(String(rental.rental_amount ?? ''));
        return {
          rental,
          displayAmount: Number.isFinite(raw) ? raw : 0,
        };
      }
      if (rental.rental_amount_manual === true) {
        const raw = parseFloat(String(rental.rental_amount ?? ''));
        return { rental, displayAmount: Number.isFinite(raw) ? raw : 0 };
      }
      let bottle = null;
      if (isDNS) {
        bottle = {
          product_code: rental.dns_product_code || '',
          category: '',
        };
      } else {
        bottle = findCustomerAssetForRentalExtended(assets, extra, rental);
      }
      if (!bottle) {
        const raw = parseFloat(String(rental.rental_amount ?? ''));
        return { rental, displayAmount: Number.isFinite(raw) ? raw : 0 };
      }
      const productCodeRaw = isDNS
        ? (rental.dns_product_code || bottle.product_code || '')
        : getBottleSummaryGroupKey(bottle);
      const amt = resolveMonthlyDisplayUnit({
        customerKeyRaw: customerKey,
        productCodeRaw,
        customerOverrideMap: rentalHistoryCustomerOverrideMap,
        assetPricingMap: rentalHistoryAssetPricingMap,
        defaultMonthly: rentalHistoryDefaultMonthly,
        customer,
      });
      return { rental, displayAmount: Number.isFinite(amt) ? amt : 0 };
    });
  }, [
    locationAssets,
    customerAssets,
    supplementalBottles,
    customer,
    rentalHistoryCustomerOverrideMap,
    rentalHistoryAssetPricingMap,
    rentalHistoryDefaultMonthly,
  ]);

  // Enhanced transfer functionality functions
  const handleSelectAsset = (assetId) => {
    setSelectedAssets(prev => 
      prev.includes(assetId) 
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  // Load recent customers for quick transfer
  const loadRecentCustomers = async () => {
    try {
      // First, get bottles with assigned customers, ordered by last_location_update or created_at
      // This ensures we get customers based on recent transfer activity, not just customer creation date
      const { data: bottlesData, error: bottlesError } = await supabase
        .from('bottles')
        .select('assigned_customer, last_location_update, created_at')
        .eq('organization_id', organization?.id || customer?.organization_id)
        .not('assigned_customer', 'is', null)
        .neq('assigned_customer', customer?.CustomerListID)
        .limit(100); // Get more bottles to ensure we have enough unique customers

      if (bottlesError) throw bottlesError;

      // Group bottles by customer and find the most recent timestamp for each customer
      // Use last_location_update if available, otherwise fall back to created_at
      const customerTimestamps = {};
      (bottlesData || []).forEach(bottle => {
        const customerId = bottle.assigned_customer;
        if (!customerId) return;
        
        // Use last_location_update if available, otherwise created_at
        const timestamp = bottle.last_location_update || bottle.created_at;
        if (!timestamp) return;
        
        // Keep the most recent timestamp for each customer
        if (!customerTimestamps[customerId] || 
            new Date(timestamp) > new Date(customerTimestamps[customerId])) {
          customerTimestamps[customerId] = timestamp;
        }
      });

      // Sort customers by their most recent timestamp (most recent first)
      const sortedCustomerIds = Object.keys(customerTimestamps).sort((a, b) => {
        const timestampA = new Date(customerTimestamps[a]);
        const timestampB = new Date(customerTimestamps[b]);
        return timestampB - timestampA; // Descending order (most recent first)
      }).slice(0, 5); // Take top 5

      if (sortedCustomerIds.length === 0) {
        setRecentCustomers([]);
        return;
      }

      // Fetch customer details for the sorted customer IDs
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('CustomerListID, name, customer_type, contact_details')
        .eq('organization_id', organization?.id || customer?.organization_id)
        .in('CustomerListID', sortedCustomerIds);

      if (customersError) throw customersError;

      // Sort the customers data to match the order we determined
      const sortedCustomers = sortedCustomerIds
        .map(id => customersData?.find(c => c.CustomerListID === id))
        .filter(Boolean);

      setRecentCustomers(sortedCustomers || []);
    } catch (error) {
      logger.error('Error loading recent customers:', error);
    }
  };

  // Open confirmation dialog for warehouse transfer
  const handleTransferToWarehouse = () => {
    if (selectedAssets.length === 0) {
      setTransferMessage({
        open: true,
        message: 'Please select at least one asset to transfer to warehouse',
        severity: 'warning'
      });
      return;
    }
    setWarehouseConfirmDialogOpen(true);
  };

  const confirmTransferToWarehouse = async () => {
    setWarehouseConfirmDialogOpen(false);
    setTransferLoading(true);
    try {
      const orgId = organization?.id || customer?.organization_id;
      const { data: { user } } = await supabase.auth.getUser();

      const { data: result, error: rpcError } = await supabase.rpc('return_bottles_to_warehouse', {
        p_bottle_ids: selectedAssets,
        p_organization_id: orgId,
        p_user_id: user?.id || null,
      });

      if (rpcError) throw rpcError;

      const bottlesUpdated = result?.bottles_updated || selectedAssets.length;
      const rentalsClosed = result?.rentals_closed || 0;

      setTransferMessage({
        open: true,
        message: `Transferred ${bottlesUpdated} asset(s) to warehouse. ${rentalsClosed} rental(s) closed.`,
        severity: 'success'
      });

      try {
        const customerAssetsData = await fetchMergedBottlesForCustomer(
          orgId,
          customer?.name,
          customer?.CustomerListID,
          customer?.id,
          getSubsidiaryRowsForMerge()
        );
        setCustomerAssets(customerAssetsData || []);
        setBottleSummary(summarizeBottlesByType(customerAssetsData || []));
      } catch (e) {
        logger.error('Refresh bottles after warehouse transfer:', e);
      }

      setSelectedAssets([]);
    } catch (error) {
      setTransferMessage({
        open: true,
        message: `Transfer to warehouse failed: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setTransferLoading(false);
    }
  };

  const loadTransferHistory = async () => {
    try {
      const orgId = organization?.id || customer?.organization_id;

      const barcodes = (customerAssets || []).map(b => b.barcode_number).filter(Boolean);
      if (barcodes.length === 0) {
        setTransferHistory([]);
        return;
      }
      const { data: scanData, error: scanError } = await supabase
        .from('bottle_scans')
        .select('id, bottle_barcode, created_at, mode, order_number, customer_name')
        .eq('organization_id', orgId)
        .in('bottle_barcode', barcodes)
        .order('created_at', { ascending: false })
        .limit(50);

      if (scanError) throw scanError;

      const transfers = (scanData || []).map(scan => {
        const barcode = scan.bottle_barcode || scan.barcode_number;
        const mode = (scan.mode || '').toString().toUpperCase();
        const isShip = mode === 'SHIP' || mode === 'DELIVERY';
        const isReturn = mode === 'RETURN' || mode === 'PICKUP';
        return {
          id: scan.id,
          type: isShip ? 'delivery' : isReturn ? 'return' : 'scan',
          timestamp: scan.created_at,
          description: isShip
            ? `Asset ${barcode} delivered to ${scan.customer_name || 'customer'}`
            : isReturn
              ? `Asset ${barcode} returned to warehouse`
              : `Asset ${barcode} scanned`,
          details: {
            barcode: barcode,
            orderNumber: scan.order_number,
            location: scan.location,
            status: isShip ? 'rented' : isReturn ? 'returned' : 'scanned'
          }
        };
      });

      // Fallback: if no scan records, show current bottle assignments
      if (transfers.length === 0 && customerAssets?.length > 0) {
        const bottleTransfers = customerAssets.map(bottle => ({
          id: bottle.id,
          type: 'asset_assignment',
          timestamp: bottle.last_location_update || bottle.created_at,
          description: `Asset ${bottle.barcode_number || bottle.serial_number} assigned to ${bottle.customer_name || customer?.name}`,
          details: {
            barcode: bottle.barcode_number,
            status: bottle.status
          }
        }));
        bottleTransfers.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setTransferHistory(bottleTransfers.slice(0, 20));
      } else {
        setTransferHistory(transfers);
      }
    } catch (error) {
      logger.error('Error loading transfer history:', error);
      setTransferHistory([]);
    }
  };

  const handleSelectAllAssets = () => {
    if (selectedAssets.length === customerAssets.length) {
      setSelectedAssets([]);
    } else {
      setSelectedAssets(customerAssets.map(asset => asset.id));
    }
  };

  const handleOpenTransferDialog = async (quickTransfer = false) => {
    if (selectedAssets.length === 0) {
      setTransferMessage({
        open: true,
        message: 'Please select at least one asset to transfer',
        severity: 'warning'
      });
      return;
    }

    setTransferLoading(true);
    try {
      if (quickTransfer) {
        // Load recent customers for quick transfer
        await loadRecentCustomers();
        setQuickTransferDialogOpen(true);
      } else {
        // Load all customers for full transfer dialog
        const result = await AssetTransferService.getAvailableCustomers(
          organization?.id || customer?.organization_id, 
          customer?.CustomerListID
        );
        
        if (result.success) {
          setAvailableCustomers(result.customers);
          setTransferDialogOpen(true);
        } else {
          setTransferMessage({
            open: true,
            message: `Failed to load customers: ${result.error}`,
            severity: 'error'
          });
        }
      }
    } catch (error) {
      setTransferMessage({
        open: true,
        message: `Error loading customers: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setTransferLoading(false);
    }
  };

  const handleCloseTransferDialog = () => {
    setTransferDialogOpen(false);
    setTargetCustomer(null);
    setTransferReason('');
  };

  const handleConfirmTransfer = async () => {
    if (!targetCustomer) {
      setTransferMessage({
        open: true,
        message: 'Please select a target customer',
        severity: 'warning'
      });
      return;
    }

    setTransferLoading(true);
    try {
      const result = await AssetTransferService.transferAssets(
        selectedAssets,
        customer?.CustomerListID,
        targetCustomer.CustomerListID,
        organization?.id || customer?.organization_id,
        transferReason
      );

      if (result.success) {
        setTransferMessage({
          open: true,
          message: result.message,
          severity: 'success'
        });
        setCustomerDataVersion((v) => v + 1);
        setSelectedAssets([]);
        handleCloseTransferDialog();
      } else {
        setTransferMessage({
          open: true,
          message: result.message,
          severity: 'error'
        });
      }
    } catch (error) {
      setTransferMessage({
        open: true,
        message: `Transfer failed: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setTransferLoading(false);
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    if (!name) return;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleOpenRentalSettings = () => {
    setRentalSettingsForm({
      payment_terms: customer?.payment_terms ?? '',
      purchase_order: customer?.purchase_order ?? '',
      tax_region: customer?.location || customer?.tax_region || 'SASKATOON',
      daily_calculation_method: customer?.daily_calculation_method || 'start_of_day',
      minimum_billable_amount: customer?.minimum_billable_amount ?? '5.00',
      rental_bill_format: customer?.rental_bill_format || 'default',
      tax_status: customer?.tax_status || 'default'
    });
    setRentalSettingsDialog(true);
  };

  const handleSaveRentalSettings = async () => {
    setRentalSettingsSaving(true);
    try {
      // Persist fields that exist on customers table; location doubles as tax region
      const updateFields = {
        payment_terms: rentalSettingsForm.payment_terms || null,
        purchase_order: rentalSettingsForm.purchase_order || null,
        location: rentalSettingsForm.tax_region || customer?.location
      };
      const { error } = await supabase
        .from('customers')
        .update(updateFields)
        .eq('CustomerListID', id);
      if (error) throw error;
      setCustomer(prev => prev ? { ...prev, ...updateFields } : prev);
      setRentalSettingsDialog(false);
      setTransferMessage({ open: true, message: 'Rental settings saved.', severity: 'success' });
    } catch (e) {
      logger.error('Save rental settings error:', e);
      setTransferMessage({ open: true, message: e?.message || 'Failed to save rental settings', severity: 'error' });
    } finally {
      setRentalSettingsSaving(false);
    }
  };

  const openProductSkuRatesDialog = async () => {
    let stored =
      customerPricing?.rental_rates_by_product_code &&
      typeof customerPricing.rental_rates_by_product_code === 'object'
        ? { ...customerPricing.rental_rates_by_product_code }
        : {};
    try {
      if (organization?.id && customer?.CustomerListID) {
        const { data: skuOverrides } = await supabase
          .from('customer_pricing_overrides')
          .select('product_code, custom_monthly_price')
          .eq('organization_id', organization.id)
          .eq('customer_id', customer.CustomerListID)
          .not('product_code', 'is', null)
          .eq('is_active', true);
        for (const row of skuOverrides || []) {
          const code = String(row?.product_code || '').trim();
          const monthly = Number(row?.custom_monthly_price);
          if (!code || !Number.isFinite(monthly)) continue;
          stored[code] = { monthly };
        }
      }
    } catch {
      // Keep using local customer_pricing data when overrides lookup fails.
    }
    try {
      if (organization?.id && customer?.CustomerListID) {
        const localRaw = localStorage.getItem(getLocalSkuRatesKey(organization.id, customer.CustomerListID));
        const localRates = localRaw ? JSON.parse(localRaw) : {};
        if (localRates && typeof localRates === 'object') {
          Object.entries(localRates).forEach(([code, value]) => {
            const c = String(code || '').trim();
            const monthly = Number(value?.monthly);
            if (!c || !Number.isFinite(monthly)) return;
            stored[c] = { monthly };
          });
        }
      }
    } catch {
      // Ignore local storage parsing issues.
    }
    const codeSet = new Set();
    (customerAssets || []).forEach((b) => {
      const c = (b.product_code || '').trim();
      if (c) codeSet.add(c);
    });
    Object.keys(stored).forEach((k) => {
      const c = (k || '').trim();
      if (c) codeSet.add(c);
    });
    const sorted = [...codeSet].sort((a, b) => a.localeCompare(b));
    const initial = {};
    sorted.forEach((code) => {
      const hitMonthly = pickMonthlyFromLegacyRentalRatesJson(stored, code);
      initial[code] = {
        monthly:
          hitMonthly != null && Number.isFinite(hitMonthly) ? String(hitMonthly) : '',
      };
    });
    setProductSkuRatesDraft(initial);
    setProductSkuExtraCode('');
    setProductSkuExtraMonthly('');
    setProductSkuRatesDialogOpen(true);
  };

  const handleSaveProductSkuRates = async () => {
    if (!organization?.id || !customer?.CustomerListID) return;
    setSavingProductSkuRates(true);
    try {
      const prev =
        customerPricing?.rental_rates_by_product_code &&
        typeof customerPricing.rental_rates_by_product_code === 'object'
          ? { ...customerPricing.rental_rates_by_product_code }
          : {};
      const next = { ...prev };
      Object.entries(productSkuRatesDraft).forEach(([code, v]) => {
        const c = code.trim();
        if (!c) return;
        const raw = v && String(v.monthly ?? '').trim();
        if (raw === '') {
          delete next[c];
          return;
        }
        const n = Number.parseFloat(raw);
        if (!Number.isFinite(n) || n < 0) return;
        next[c] = { monthly: n };
      });

      let savedViaLegacyTable = false;
      let savedViaLocalFallback = false;
      try {
        const { data: existing, error: selErr } = await supabase
          .from('customer_pricing')
          .select('id')
          .eq('organization_id', organization.id)
          .eq('customer_id', customer.CustomerListID)
          .maybeSingle();
        if (selErr) throw selErr;

        if (existing?.id) {
          const { error } = await supabase
            .from('customer_pricing')
            .update({ rental_rates_by_product_code: next })
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('customer_pricing').insert({
            organization_id: organization.id,
            customer_id: customer.CustomerListID,
            rental_rates_by_product_code: next,
            discount_percent: 0,
            markup_percent: 0,
            rental_period: 'monthly',
            is_active: true,
            effective_date: new Date().toISOString().split('T')[0],
            rental_class_rates: {},
          });
          if (error) throw error;
        }
      } catch (writeErr) {
        const writeMsg = writeErr?.message || '';
        const isMissingJsonbColumn = /rental_rates_by_product_code|column|schema cache/i.test(writeMsg);
        if (!isMissingJsonbColumn) throw writeErr;

        // Compatibility fallback for orgs without rental_rates_by_product_code column:
        // persist SKU monthly rates as product-specific rows in customer_pricing_overrides.
        const { data: existingRows, error: existingRowsErr } = await supabase
          .from('customer_pricing_overrides')
          .select('id, product_code')
          .eq('organization_id', organization.id)
          .eq('customer_id', customer.CustomerListID)
          .not('product_code', 'is', null);
        if (existingRowsErr) {
          const missingOverridesTable = existingRowsErr.code === '42P01'
            || /relation .*customer_pricing_overrides.* does not exist/i.test(existingRowsErr.message || '');
          if (!missingOverridesTable) throw existingRowsErr;
          try {
            localStorage.setItem(
              getLocalSkuRatesKey(organization.id, customer.CustomerListID),
              JSON.stringify(next)
            );
            window.dispatchEvent(new Event('rental-pricing-local-updated'));
            savedViaLocalFallback = true;
          } catch {
            throw existingRowsErr;
          }
        } else {
          const byCode = new Map(
            (existingRows || []).map((row) => [String(row.product_code || '').trim().toUpperCase(), row])
          );
          const desired = Object.entries(next)
            .map(([code, value]) => {
              const monthly = Number(value?.monthly);
              return { code: String(code || '').trim(), monthly };
            })
            .filter((row) => row.code && Number.isFinite(row.monthly) && row.monthly >= 0);

          for (const row of desired) {
            const key = row.code.toUpperCase();
            const existingRow = byCode.get(key);
            if (existingRow?.id) {
              const { error: upErr } = await supabase
                .from('customer_pricing_overrides')
                .update({
                  custom_monthly_price: row.monthly,
                  custom_yearly_price: null,
                  is_active: true,
                })
                .eq('id', existingRow.id);
              if (upErr) throw upErr;
            } else {
              const { error: insErr } = await supabase
                .from('customer_pricing_overrides')
                .insert({
                  organization_id: organization.id,
                  customer_id: customer.CustomerListID,
                  product_code: row.code,
                  custom_monthly_price: row.monthly,
                  custom_yearly_price: null,
                  discount_percent: 0,
                  fixed_rate_override: null,
                  is_active: true,
                });
              if (insErr) throw insErr;
            }
          }

          const desiredCodeKeys = new Set(desired.map((r) => r.code.toUpperCase()));
          for (const row of existingRows || []) {
            const key = String(row.product_code || '').trim().toUpperCase();
            if (!key || desiredCodeKeys.has(key)) continue;
            const { error: delErr } = await supabase
              .from('customer_pricing_overrides')
              .delete()
              .eq('id', row.id);
            if (delErr) throw delErr;
          }
          savedViaLegacyTable = true;
        }
      }

      const { data: refreshed, error: refErr } = await supabase
        .from('customer_pricing')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('customer_id', customer.CustomerListID)
        .maybeSingle();
      if (!refErr && refreshed) setCustomerPricing(refreshed);
      else setCustomerPricing((prev) => ({ ...(prev || {}), rental_rates_by_product_code: next }));

      invalidateOrgRentalPricingCache(organization.id);
      setProductSkuRatesDialogOpen(false);
      setTransferMessage({
        open: true,
        message: savedViaLegacyTable
          ? 'Product code rates saved via customer_pricing_overrides (JSON column on customer_pricing not available).'
          : savedViaLocalFallback
            ? 'Product code rates saved on this device only. In Supabase SQL Editor run sql/add_rental_rates_by_product_code_to_customer_pricing.sql (and if needed sql/ensure_customer_pricing_overrides.sql), reload the API schema cache, then save again for server-wide pricing.'
          : 'Product code rates saved.',
        severity: 'success',
      });
    } catch (e) {
      logger.error('Save product SKU rates error:', e);
      const msg = e?.message || 'Failed to save product code rates';
      const hint =
        /rental_rates_by_product_code|column/i.test(msg)
          ? ' Run sql/add_rental_rates_by_product_code_to_customer_pricing.sql in Supabase, then try again.'
          : '';
      setTransferMessage({ open: true, message: msg + hint, severity: 'error' });
    } finally {
      setSavingProductSkuRates(false);
    }
  };

  const handleCreateLeaseContract = async () => {
    if (!customer?.organization_id || !customer?.CustomerListID) return;
    setLeaseBusy(true);
    try {
      const { data, error } = await supabase
        .from('lease_contracts')
        .insert({
          organization_id: customer.organization_id,
          customer_id: customer.CustomerListID,
          billing_cycle: 'yearly',
          start_date: leaseStartDate || new Date().toISOString().split('T')[0],
          end_date: leaseEndDate || null,
          status: 'active',
        })
        .select()
        .single();
      if (error) throw error;
      setLeaseContractRow(data);
      setLeaseItemsRows([]);
      subscriptionCtx.refresh?.();
      setTransferMessage({ open: true, message: 'Lease contract created.', severity: 'success' });
    } catch (e) {
      setTransferMessage({ open: true, message: e?.message || 'Failed to create lease', severity: 'error' });
    } finally {
      setLeaseBusy(false);
    }
  };

  const handleSaveLeaseDates = async () => {
    if (!leaseContractRow?.id) return;
    setLeaseBusy(true);
    try {
      const { error } = await supabase
        .from('lease_contracts')
        .update({
          start_date: leaseStartDate,
          end_date: leaseEndDate || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leaseContractRow.id);
      if (error) throw error;
      subscriptionCtx.refresh?.();
      setTransferMessage({ open: true, message: 'Lease dates saved.', severity: 'success' });
    } catch (e) {
      setTransferMessage({ open: true, message: e?.message || 'Failed to save lease', severity: 'error' });
    } finally {
      setLeaseBusy(false);
    }
  };

  const handleAddLeaseLine = async () => {
    if (!leaseContractRow?.id || !customer?.organization_id) return;
    const atp = subscriptionCtx.assetTypePricing?.find((p) => p.id === newLeaseLine.asset_type_id);
    const up = newLeaseLine.unit_price === '' ? null : parseFloat(newLeaseLine.unit_price);
    const yp = newLeaseLine.yearly_price === '' ? null : parseFloat(newLeaseLine.yearly_price);
    if ((up == null || !Number.isFinite(up)) && (yp == null || !Number.isFinite(yp))) {
      setTransferMessage({
        open: true,
        message: 'Enter a unit price and/or yearly price for the lease line.',
        severity: 'error',
      });
      return;
    }
    if (!atp?.id) {
      setTransferMessage({ open: true, message: 'Select an asset type.', severity: 'error' });
      return;
    }
    setLeaseBusy(true);
    try {
      const { error } = await supabase.from('lease_contract_items').insert({
        organization_id: customer.organization_id,
        contract_id: leaseContractRow.id,
        asset_type_id: atp.id,
        product_code: atp.product_code || null,
        contracted_quantity: Math.max(0, parseInt(newLeaseLine.contracted_quantity, 10) || 0),
        unit_price: Number.isFinite(up) ? up : null,
        yearly_price: Number.isFinite(yp) ? yp : null,
      });
      if (error) throw error;
      const { data: items } = await supabase
        .from('lease_contract_items')
        .select('*')
        .eq('contract_id', leaseContractRow.id);
      setLeaseItemsRows(items || []);
      setNewLeaseLine({ asset_type_id: '', contracted_quantity: '1', unit_price: '', yearly_price: '' });
      subscriptionCtx.refresh?.();
    } catch (e) {
      setTransferMessage({ open: true, message: e?.message || 'Failed to add line', severity: 'error' });
    } finally {
      setLeaseBusy(false);
    }
  };

  const handleDeleteLeaseLine = async (lineId) => {
    if (!lineId) return;
    setLeaseBusy(true);
    try {
      const { error } = await supabase.from('lease_contract_items').delete().eq('id', lineId);
      if (error) throw error;
      setLeaseItemsRows((rows) => rows.filter((r) => r.id !== lineId));
      subscriptionCtx.refresh?.();
    } catch (e) {
      setTransferMessage({ open: true, message: e?.message || 'Failed to delete line', severity: 'error' });
    } finally {
      setLeaseBusy(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    const newCustomerListID = (editForm.CustomerListID || '').trim();
    if (!newCustomerListID) {
      setSaveError('Customer ID is required.');
      setSaving(false);
      return;
    }
    // Normalize barcode: trim whitespace only (organizations control format)
    const normalizedBarcode = (editForm.barcode || '')
      .toString()
      .trim();
    const rawParent = editForm.parent_customer_id;
    const normalizedParentId =
      rawParent != null && String(rawParent).trim() !== ''
        ? String(rawParent).trim()
        : null;
    if (normalizedParentId && customer?.id && normalizedParentId === customer.id) {
      setSaveError('A customer cannot be its own parent. Choose a different parent account.');
      setSaving(false);
      return;
    }
    if (isBranchTypeSelectedInForm(editForm.customer_type) && !normalizedParentId) {
      setSaveError(
        'Branch / location requires a parent account. Choose one under “Part of (parent customer)”, or change type to Customer.'
      );
      setSaving(false);
      return;
    }
    const updateFields = {
      name: editForm.name,
      email: editForm.email,
      phone: editForm.phone,
      contact_details: editForm.contact_details,
      address: editForm.address,
      address2: editForm.address2,
      address3: editForm.address3,
      address4: editForm.address4,
      address5: editForm.address5,
      city: editForm.city,
      postal_code: editForm.postal_code,
      customer_type: editForm.customer_type,
      location: editForm.location || 'SASKATOON',
      department: (editForm.department || '').trim() || null,
      parent_customer_id: normalizedParentId,
      // Include barcode if provided (empty string allowed to clear)
      barcode: normalizedBarcode || null,
      billing_mode: editForm.billing_mode === 'lease' ? 'lease' : 'rental',
      payment_terms: canonicalPaymentTermValue(editForm.payment_terms) || null,
    };
    const customerIdChanged = newCustomerListID !== id;
    if (customerIdChanged) {
      const orgId = customer?.organization_id;
      if (!orgId) {
        setSaveError('Organization is missing for this customer.');
        setSaving(false);
        return;
      }
      const { data: duplicate, error: duplicateCheckError } = await supabase
        .from('customers')
        .select('id, CustomerListID')
        .eq('organization_id', orgId)
        .eq('CustomerListID', newCustomerListID)
        .maybeSingle();
      if (duplicateCheckError) {
        setSaveError(duplicateCheckError.message || 'Could not validate customer ID uniqueness.');
        setSaving(false);
        return;
      }
      if (duplicate && duplicate.id !== customer?.id) {
        setSaveError(`Customer ID "${newCustomerListID}" already exists in this organization.`);
        setSaving(false);
        return;
      }
    }
    if (customerIdChanged) {
      updateFields.CustomerListID = newCustomerListID;
    }
    const updatePayload = finalizeCustomerBranchParentFields(updateFields);
    const branchParentError = getCustomerBranchParentValidationError(updatePayload);
    if (branchParentError) {
      setSaveError(branchParentError);
      setSaving(false);
      return;
    }
    const { error } = await supabase
      .from('customers')
      .update(updatePayload)
      .eq('CustomerListID', id)
      .eq('organization_id', customer.organization_id);
    if (error) {
      const msg = error.message || '';
      const branchParentHint =
        /check_branch_has_parent/i.test(msg) || /branch.*parent/i.test(msg)
          ? ' A row under a parent must use Branch / location with a parent selected.'
          : /customers_customer_type_check/i.test(msg)
            ? ' Customer type must be Customer, Vendor, or Temporary — branch hierarchy is stored separately (account type + parent).'
            : '';
      setSaveError(
        branchParentHint ? `${msg}.${branchParentHint}` : msg
      );
      setSaving(false);
      return;
    }
    if (customerIdChanged) {
      const orgId = customer.organization_id;
      await supabase.from('bottles').update({ assigned_customer: newCustomerListID }).eq('assigned_customer', id).eq('organization_id', orgId);
      await supabase.from('rentals').update({ customer_id: newCustomerListID }).eq('customer_id', id).eq('organization_id', orgId);
      navigate(`/customer/${newCustomerListID}`, { replace: true });
    }
    setCustomer({ ...customer, ...updatePayload });
    subscriptionCtx.refresh?.();
    if (updatePayload.parent_customer_id) {
      const { data: p } = await supabase.from('customers').select('id, name, CustomerListID').eq('id', updatePayload.parent_customer_id).single();
      setParentCustomer(p || null);
    } else {
      setParentCustomer(null);
    }
    setEditing(false);
    setSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  if (loading) return (
    <Box sx={{ p: 4, width: '100%' }}>
      <CardSkeleton count={1} />
      <Box mt={4}><TableSkeleton rows={4} columns={5} /></Box>
      <Box mt={4}><TableSkeleton rows={3} columns={7} /></Box>
    </Box>
  );
  
  if (error) return (
    <Box p={4} color="error.main">
      <Typography>Error: {error}</Typography>
    </Box>
  );
  
  if (!customer) return (
    <Box p={4}>
      <Typography>Customer not found.</Typography>
    </Box>
  );

  const openRentalsDelta = (locationAssets?.length || 0) - (customerAssets?.length || 0);
  const openRentalsBillingHelper = buildOpenRentalsBillingHelper({
    delta: openRentalsDelta,
    openCount: locationAssets.length,
    assignedBottleCount: customerAssets.length,
    dnsCount: dnsRentals.length,
    rnbCount: rnbRentals.length,
    rnsCount: rnsRentals.length,
    missingAssignedWithoutOpenRental: assignedBottlesMissingOpenRental.length,
  });
  const leaseAgreementStatus = (() => {
    const statusFromYearlyLeases = (rows) => {
      const activeRows = (rows || []).filter((a) => String(a.status || '').toLowerCase() === 'active');
      const pool = activeRows.length ? activeRows : rows || [];
      const primary = [...pool].sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
      )[0];
      if (!primary) {
        return {
          value: 'Yes (yearly)',
          helper: `${rows.length} yearly lease agreement(s) on file — open Lease agreements to manage.`,
          color: 'info',
        };
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = primary.start_date ? new Date(primary.start_date) : null;
      const end = primary.end_date ? new Date(primary.end_date) : null;
      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(0, 0, 0, 0);
      const isScheduled = start && start > today;
      const isExpired = end && end < today;
      const isActive = !isScheduled && !isExpired;
      const dateParts = [
        primary.start_date ? `starts ${formatDate(primary.start_date)}` : null,
        primary.end_date ? `ends ${formatDate(primary.end_date)}` : 'no end date',
      ].filter(Boolean);
      return {
        value: isActive ? 'Active (yearly)' : isScheduled ? 'Scheduled (yearly)' : 'Expired (yearly)',
        helper: `${rows.length} agreement${rows.length === 1 ? '' : 's'} (${dateParts.join(', ')}) — Lease agreements workspace.`,
        color: isActive ? 'success' : isScheduled ? 'info' : 'warning',
      };
    };

    if (!leaseContractRow) {
      if (yearlyLeaseAgreements.length > 0) {
        return statusFromYearlyLeases(yearlyLeaseAgreements);
      }
      return {
        value: 'No',
        helper: 'No lease agreement is linked to this customer.',
        color: 'default',
      };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = leaseContractRow.start_date ? new Date(leaseContractRow.start_date) : null;
    const end = leaseContractRow.end_date ? new Date(leaseContractRow.end_date) : null;
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(0, 0, 0, 0);
    const isScheduled = start && start > today;
    const isExpired = end && end < today;
    const isActive = !isScheduled && !isExpired;
    const dateParts = [
      leaseContractRow.start_date ? `starts ${formatDate(leaseContractRow.start_date)}` : null,
      leaseContractRow.end_date ? `ends ${formatDate(leaseContractRow.end_date)}` : 'no end date',
    ].filter(Boolean);
    const yearlyHint =
      yearlyLeaseAgreements.length > 0
        ? ` Also ${yearlyLeaseAgreements.length} yearly lease record${yearlyLeaseAgreements.length === 1 ? '' : 's'} (Lease agreements).`
        : '';
    return {
      value: isActive ? 'Active' : isScheduled ? 'Scheduled' : 'Expired',
      helper: `${leaseItemsRows.length} contract line${leaseItemsRows.length === 1 ? '' : 's'}; ${dateParts.join(', ')}.${yearlyHint}`,
      color: isActive ? 'success' : isScheduled ? 'info' : 'warning',
    };
  })();
  const detailMetrics = [
    {
      label: 'Open rentals (billing)',
      value: locationAssets.length,
      helper: openRentalsBillingHelper,
    },
    {
      label: 'Physical inventory',
      value: customerAssets.length,
      helper:
        'Containers assigned to this account. Count can be lower than open rentals (DNS, etc.) or higher when assigned bottles still lack an open rental row.',
    },
    {
      label: 'Lease agreement',
      value: leaseAgreementStatus.value,
      helper: leaseAgreementStatus.helper,
      color: leaseAgreementStatus.color,
    },
  ];

  return (
    <Box sx={{ p: { xs: 1.25, sm: 2 }, width: '100%' }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.75, sm: 2.25 },
          mb: 2,
          borderRadius: 3,
          border: '1px solid rgba(15, 23, 42, 0.08)',
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.25, flexWrap: 'wrap' }}>
              <Chip label="Customer detail" color="primary" size="small" sx={{ borderRadius: 999, fontWeight: 700 }} />
              <Chip label={getCustomerTypeChipLabel(customer)} size="small" variant="outlined" sx={{ borderRadius: 999 }} />
              <Chip label={formatLocationDisplay(customer.location || 'SASKATOON')} size="small" variant="outlined" sx={{ borderRadius: 999 }} />
              <Chip
                label={`Lease: ${leaseAgreementStatus.value}`}
                color={leaseAgreementStatus.color}
                size="small"
                variant={leaseAgreementStatus.color === 'default' ? 'outlined' : 'filled'}
                sx={{ borderRadius: 999, fontWeight: 700 }}
              />
            </Stack>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>
              {customer.name}
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5, maxWidth: 760 }}>
              Customer profile, inventory, and rental activity.
            </Typography>
          </Box>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
            variant="outlined"
            sx={{ borderRadius: 999, fontWeight: 700, px: 3, textTransform: 'none' }}
          >
            Back
          </Button>
        </Stack>
      </Paper>

      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        {detailMetrics.map((metric) => (
          <Grid item xs={12} sm={6} lg={3} key={metric.label}>
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: 2.5,
                border: '1px solid rgba(15, 23, 42, 0.08)',
                height: '100%',
                backgroundColor: '#fff',
              }}
            >
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {metric.label}
              </Typography>
              {metric.color ? (
                <Chip
                  label={metric.value}
                  size="small"
                  color={metric.color}
                  variant={metric.color === 'default' ? 'outlined' : 'filled'}
                  sx={{ mt: 0.75, borderRadius: 999, fontWeight: 800 }}
                />
              ) : (
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a', mt: 0.25, letterSpacing: '-0.02em' }}>
                  {metric.value}
                </Typography>
              )}
              <Typography variant="body2" sx={{ color: '#64748b', mt: 0.75 }}>
                {metric.helper}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Tabs
        value={customerDetailTab}
        onChange={(_, v) => setCustomerDetailTab(v)}
        sx={{
          mb: 2,
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', minHeight: 42, py: 0.5 },
          '& .Mui-selected': { color: 'primary.main' }
        }}
      >
        <Tab label="Customer Info" id="customer-detail-tab-0" aria-controls="customer-detail-tabpanel-0" />
        <Tab label="Rental" id="customer-detail-tab-1" aria-controls="customer-detail-tabpanel-1" />
      </Tabs>

      {/* Tab 0: Customer Info */}
      {customerDetailTab === 0 && (
      <>
      {/* Customer Information */}
      <Paper elevation={0} sx={{ p: { xs: 1.75, md: 2.5 }, mb: 2.5, borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.08)', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)' }}>
        <Box display="flex" alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between" flexDirection={{ xs: 'column', md: 'row' }} mb={2}>
          <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
            <Typography variant="h5" fontWeight={700} color="primary">
              {editing ? (
                <TextField name="name" value={editForm.name || ''} onChange={handleEditChange} size="small" label="Name" sx={{ minWidth: 200 }} />
              ) : (
                formatCustomerHierarchyDisplayName(
                  customer,
                  parentCustomer?.id
                    ? new Map([[String(parentCustomer.id), parentCustomer.name]])
                    : new Map()
                )
              )}
            </Typography>
            {!editing && (
              <Chip 
                label={getCustomerTypeChipLabel(customer)} 
                color={getCustomerTypeChipColor(customer)}
                size="medium"
                sx={{ fontWeight: 'bold' }}
              />
            )}
          </Box>
          {!editing && (
            <Button variant="outlined" onClick={() => setEditing(true)} sx={{ borderRadius: 999, fontWeight: 700, ml: { md: 2 } }}>Edit Customer</Button>
          )}
        </Box>
        <Divider sx={{ mb: 2 }} />
        <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3}>
          <Box>
            <Typography variant="body2" color="text.secondary">Customer ID</Typography>
            {editing ? (
              <TextField
                name="CustomerListID"
                value={editForm.CustomerListID || ''}
                onChange={handleEditChange}
                size="small"
                label="Customer number"
                sx={{ mb: 2, minWidth: 200 }}
                helperText="Changing this updates bottle assignments and rentals that reference this customer."
              />
            ) : (
              <Typography variant="body1" fontWeight={600} fontFamily="monospace" sx={{ mb: 2 }}>{customer.CustomerListID}</Typography>
            )}
            <Typography variant="body2" color="text.secondary">Part of (parent customer)</Typography>
            {editing ? (
              <Autocomplete
                options={parentOptions}
                filterOptions={filterParentCustomerOptions}
                getOptionLabel={(opt) => (opt && (opt.name || opt.CustomerListID || '')) || ''}
                value={
                  !editForm.parent_customer_id
                    ? null
                    : parentOptions.find(
                        (o) => String(o?.id ?? '') === String(editForm.parent_customer_id ?? '')
                      ) ??
                      (parentCustomer?.id != null &&
                      String(parentCustomer.id) === String(editForm.parent_customer_id)
                        ? parentCustomer
                        : null)
                }
                onChange={(_, v) => {
                  const pid =
                    v?.id != null && String(v.id).trim() !== '' ? String(v.id).trim() : null;
                  setEditForm((prev) => ({
                    ...prev,
                    parent_customer_id: pid,
                    account_type: pid ? ACCOUNT_TYPE_BRANCH : ACCOUNT_TYPE_MAIN,
                    customer_type: pid
                      ? 'BRANCH'
                      : prev.customer_type === 'BRANCH'
                        ? 'CUSTOMER'
                        : prev.customer_type,
                  }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    label="Under (parent customer)"
                    placeholder="Search name or customer ID…"
                    required={isBranchTypeSelectedInForm(editForm.customer_type)}
                    helperText={
                      isBranchTypeSelectedInForm(editForm.customer_type) &&
                      !editForm.parent_customer_id
                        ? 'Required for Branch / location'
                        : 'Optional — links this account under a parent company'
                    }
                    sx={{ mb: 2, minWidth: 220 }}
                  />
                )}
                isOptionEqualToValue={(a, b) =>
                  String(a?.id ?? '') === String(b?.id ?? '')
                }
                autoHighlight
                openOnFocus
                selectOnFocus
                noOptionsText="No matching customers"
                componentsProps={{
                  popper: {
                    sx: { zIndex: (theme) => theme.zIndex.modal + 1 },
                  },
                }}
              />
            ) : (
              <Typography variant="body1" sx={{ mb: 2 }}>
                {parentCustomer ? (
                  <Button size="small" variant="text" sx={{ p: 0, minWidth: 0, textTransform: 'none' }} onClick={() => navigate(`/customer/${parentCustomer.CustomerListID}`)}>
                    {parentCustomer.name}
                  </Button>
                ) : (
                  <em style={{ color: '#888' }}>— Top-level customer</em>
                )}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">Customer Barcode</Typography>
            {editing ? (
              <TextField 
                name="barcode" 
                value={editForm.barcode || ''} 
                onChange={handleEditChange} 
                size="small" 
                label="Barcode (optional)" 
                placeholder="e.g. 800006B3-1611180703A"
                sx={{ mb: 2, minWidth: 220 }} 
                helperText="Scanned code used on mobile; leading % will be stripped automatically"
              />
            ) : (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body1" fontFamily="monospace" sx={{ mb: 1 }}>
                  {customer.barcode || <em style={{ color: '#888' }}>No barcode set</em>}
                </Typography>
                {customer.barcode && (
                  <Box 
                    sx={{ 
                      mt: 2, 
                      p: 2, 
                      backgroundColor: '#fff', 
                      border: '1px solid #e0e0e0', 
                      borderRadius: 1,
                      display: 'flex',
                      justifyContent: 'center'
                    }}
                  >
                    <BarcodeDisplay
                      value={customer.barcode.replace(/^%/, '')}
                      format="CODE128"
                      width={2}
                      height={80}
                      displayValue={true}
                      fontSize={14}
                      margin={5}
                      background="#ffffff"
                      lineColor="#000000"
                    />
                  </Box>
                )}
              </Box>
            )}
            <Typography variant="body2" color="text.secondary">Email</Typography>
            {editing ? (
              <TextField 
                name="email" 
                value={editForm.email || ''} 
                onChange={handleEditChange} 
                size="small" 
                type="email"
                sx={{ mb: 2, minWidth: 200 }} 
                placeholder="customer@example.com"
              />
            ) : (
              <Typography variant="body1" sx={{ mb: 2 }}>
                {customer.email ? (
                  <a href={`mailto:${customer.email}`} style={{ color: '#1976d2', textDecoration: 'none' }}>
                    {customer.email}
                  </a>
                ) : (
                  <em style={{ color: '#888' }}>Not provided</em>
                )}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">Phone</Typography>
            {editing ? (
              <TextField name="phone" value={editForm.phone || ''} onChange={handleEditChange} size="small" sx={{ mb: 2, minWidth: 180 }} />
            ) : (
              <Typography variant="body1" sx={{ mb: 2 }}>{customer.phone || 'Not provided'}</Typography>
            )}

            <Typography variant="body2" color="text.secondary">Payment terms</Typography>
            {editing ? (
              <FormControl size="small" sx={{ mb: 2, minWidth: 220 }}>
                <InputLabel id="customer-payment-terms-label">Payment terms</InputLabel>
                <Select
                  labelId="customer-payment-terms-label"
                  label="Payment terms"
                  value={editForm.payment_terms ?? ''}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, payment_terms: e.target.value }))
                  }
                >
                  {CUSTOMER_PAYMENT_TERM_OPTIONS.map((opt) => (
                    <MenuItem key={opt.label + opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                  {(editForm.payment_terms || '').trim() !== ''
                    && !CUSTOMER_PAYMENT_TERM_OPTIONS.some((o) => o.value === editForm.payment_terms)
                    ? (
                      <MenuItem value={editForm.payment_terms}>{editForm.payment_terms} (imported)</MenuItem>
                    )
                    : null}
                </Select>
              </FormControl>
            ) : (
              <Typography variant="body1" sx={{ mb: 2 }}>
                {customer.payment_terms ? (
                  <Chip size="small" label={customer.payment_terms} variant="outlined" sx={{ fontWeight: 600 }} />
                ) : (
                  <em style={{ color: '#888' }}>Not set — edit customer or import a Terms column</em>
                )}
              </Typography>
            )}
            
            <Typography variant="body2" color="text.secondary">Customer Type</Typography>
            {editing ? (
              <FormControl size="small" sx={{ mb: 2, minWidth: 180 }}>
                <Select
                  value={editForm.customer_type || 'CUSTOMER'}
                  onChange={(e) => {
                    const nextType = e.target.value;
                    if (
                      nextType === CUSTOMER_TYPE_BRANCH &&
                      !editForm.parent_customer_id
                    ) {
                      setSaveError(
                        'Select a parent customer first, then use Branch / location — or pick the parent under “Part of” and type will switch automatically.'
                      );
                      return;
                    }
                    setSaveError(null);
                    setEditForm((prev) => ({ ...prev, customer_type: nextType }));
                  }}
                >
                  <MenuItem value="CUSTOMER">Customer</MenuItem>
                  <MenuItem value="BRANCH">Branch / location (under parent)</MenuItem>
                  <MenuItem value="VENDOR">Vendor</MenuItem>
                  <MenuItem value="TEMPORARY">Temporary (Walk-in)</MenuItem>
                </Select>
              </FormControl>
            ) : (
              <Typography component="div" variant="body1" sx={{ mb: 2 }}>
                <Chip 
                  label={getCustomerTypeChipLabel(customer)} 
                  color={getCustomerTypeChipColor(customer)}
                  size="small"
                  variant="outlined"
                />
              </Typography>
            )}

            <Typography variant="body2" color="text.secondary">Billing mode</Typography>
            {editing ? (
              <FormControl size="small" sx={{ mb: 2, minWidth: 260 }}>
                <Select
                  name="billing_mode"
                  value={editForm.billing_mode || 'rental'}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, billing_mode: e.target.value }))
                  }
                >
                  <MenuItem value="rental">Rental — bill from assigned bottles (live)</MenuItem>
                  <MenuItem value="lease">Lease — bill from yearly contract lines</MenuItem>
                </Select>
              </FormControl>
            ) : (
              <Typography component="div" variant="body1" sx={{ mb: 2 }}>
                <Chip
                  size="small"
                  variant="outlined"
                  color={(customer.billing_mode || 'rental') === 'lease' ? 'secondary' : 'primary'}
                  label={
                    (customer.billing_mode || 'rental') === 'lease'
                      ? 'Lease (contract pricing)'
                      : 'Rental (assigned assets)'
                  }
                />
              </Typography>
            )}
            
            <Typography variant="body2" color="text.secondary">Location</Typography>
            {editing ? (
              <FormControl size="small" sx={{ mb: 2, minWidth: 180 }}>
                <Select
                  value={editForm.location || 'SASKATOON'}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, location: e.target.value }))
                  }
                  label="Location"
                >
                  <MenuItem value="SASKATOON">SASKATOON</MenuItem>
                  <MenuItem value="REGINA">REGINA</MenuItem>
                  <MenuItem value="CHILLIWACK">CHILLIWACK</MenuItem>
                  <MenuItem value="PRINCE_GEORGE">PRINCE GEORGE</MenuItem>
                </Select>
              </FormControl>
            ) : (
              <Typography component="div" variant="body1" sx={{ mb: 2 }}>
                <Chip 
                  label={formatLocationDisplay(customer.location || 'SASKATOON')} 
                  color="primary" 
                  size="small"
                  variant="outlined"
                />
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">Department</Typography>
            {editing ? (
              <TextField
                name="department"
                value={editForm.department || ''}
                onChange={handleEditChange}
                size="small"
                placeholder="e.g. Warehouse, Lab, Shipping"
                sx={{ mb: 2, minWidth: 180 }}
              />
            ) : (
              <Typography variant="body1" sx={{ mb: 2 }}>
                {customer.department || <em style={{ color: '#888' }}>Not set</em>}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">Contact</Typography>
            {editing ? (
              <TextField name="contact_details" value={editForm.contact_details || ''} onChange={handleEditChange} size="small" sx={{ minWidth: 180 }} />
            ) : (
              <Typography variant="body1">
                {([
                  customer.address,
                  customer.address2,
                  customer.address3,
                  customer.address4,
                  customer.address5,
                  customer.city,
                  customer.postal_code
                ].filter(Boolean).length === 0 && looksLikeAddress(customer.contact_details))
                  ? 'Not provided'
                  : (customer.contact_details || 'Not provided')}
              </Typography>
            )}
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Address</Typography>
            {editing ? (
              <>
                <TextField name="address" value={editForm.address || ''} onChange={handleEditChange} size="small" label="Address" sx={{ mb: 1, minWidth: 180 }} />
                <TextField name="address2" value={editForm.address2 || ''} onChange={handleEditChange} size="small" label="Address 2" sx={{ mb: 1, minWidth: 180 }} />
                <TextField name="address3" value={editForm.address3 || ''} onChange={handleEditChange} size="small" label="Address 3" sx={{ mb: 1, minWidth: 180 }} />
                <TextField name="address4" value={editForm.address4 || ''} onChange={handleEditChange} size="small" label="Address 4" sx={{ mb: 1, minWidth: 180 }} />
                <TextField name="address5" value={editForm.address5 || ''} onChange={handleEditChange} size="small" label="Address 5" sx={{ mb: 1, minWidth: 180 }} />
                <TextField name="city" value={editForm.city || ''} onChange={handleEditChange} size="small" label="City" sx={{ mb: 1, minWidth: 180 }} />
                <TextField name="postal_code" value={editForm.postal_code || ''} onChange={handleEditChange} size="small" label="Postal Code" sx={{ mb: 1, minWidth: 180 }} />
              </>
            ) : (
              <Typography variant="body1" sx={{ mb: 2 }}>
                {([
                  customer.address,
                  customer.address2,
                  customer.address3,
                  customer.address4,
                  customer.address5,
                  customer.city,
                  customer.postal_code
                ].filter(Boolean).length > 0)
                  ? [
                      customer.address,
                      customer.address2,
                      customer.address3,
                      customer.address4,
                      customer.address5,
                      customer.city,
                      customer.postal_code
                    ].filter(Boolean).join(', ')
                  : (looksLikeAddress(customer.contact_details)
                      ? customer.contact_details
                      : 'Not provided')}
              </Typography>
            )}
          </Box>
        </Box>

        {((editing && (editForm.billing_mode || 'rental') === 'lease') ||
          (!editing && (customer.billing_mode || 'rental') === 'lease')) && (
          <Paper variant="outlined" sx={{ mt: 3, p: 2, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Lease contract
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Invoice amounts for lease customers come only from these lines (not org pricing rules). Use yearly price and/or unit price × quantity.
            </Typography>
            {!leaseContractRow && yearlyLeaseAgreements.length > 0 && (
              <Alert severity="info" sx={{ mb: 2 }}>
                This customer has{' '}
                <strong>{yearlyLeaseAgreements.length}</strong> yearly lease agreement
                {yearlyLeaseAgreements.length === 1 ? '' : 's'} on file. Edit them under{' '}
                <Link to="/lease-agreements">Lease agreements</Link>. The contract lines below are optional — they are for
                per-SKU lease lines on this profile; yearly invoices can keep using the agreements workspace only.
              </Alert>
            )}
            {!leaseContractRow && (
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                <TextField
                  label="Start date"
                  type="date"
                  size="small"
                  value={leaseStartDate || new Date().toISOString().split('T')[0]}
                  onChange={(e) => setLeaseStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="End (optional)"
                  type="date"
                  size="small"
                  value={leaseEndDate}
                  onChange={(e) => setLeaseEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
                <Button
                  variant="contained"
                  onClick={handleCreateLeaseContract}
                  disabled={leaseBusy || !customer?.CustomerListID}
                >
                  Create lease contract
                </Button>
              </Stack>
            )}
            {leaseContractRow && (
              <>
                <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap alignItems="center">
                  <TextField
                    label="Start date"
                    type="date"
                    size="small"
                    value={leaseStartDate}
                    onChange={(e) => setLeaseStartDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label="End date (optional)"
                    type="date"
                    size="small"
                    value={leaseEndDate}
                    onChange={(e) => setLeaseEndDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                  <Button variant="outlined" onClick={handleSaveLeaseDates} disabled={leaseBusy}>
                    Save dates
                  </Button>
                </Stack>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>SKU</TableCell>
                        <TableCell align="right">Qty</TableCell>
                        <TableCell align="right">Unit $</TableCell>
                        <TableCell align="right">Yearly $</TableCell>
                        <TableCell align="right" width={48} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {leaseItemsRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 2, color: 'text.secondary' }}>
                            No lines yet. Add an asset type below.
                          </TableCell>
                        </TableRow>
                      ) : (
                        leaseItemsRows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell sx={{ fontFamily: 'monospace' }}>{row.product_code || '—'}</TableCell>
                            <TableCell align="right">{row.contracted_quantity}</TableCell>
                            <TableCell align="right">
                              {row.unit_price != null ? row.unit_price : '—'}
                            </TableCell>
                            <TableCell align="right">
                              {row.yearly_price != null ? row.yearly_price : '—'}
                            </TableCell>
                            <TableCell align="right">
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteLeaseLine(row.id)}
                                disabled={leaseBusy}
                                aria-label="Delete line"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                  Add line
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                  <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Asset type</InputLabel>
                    <Select
                      value={newLeaseLine.asset_type_id}
                      label="Asset type"
                      onChange={(e) => setNewLeaseLine((p) => ({ ...p, asset_type_id: e.target.value }))}
                    >
                      {(subscriptionCtx.assetTypePricing || []).map((p) => (
                        <MenuItem key={p.id} value={p.id}>
                          {p.product_code}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    size="small"
                    label="Qty"
                    value={newLeaseLine.contracted_quantity}
                    onChange={(e) =>
                      setNewLeaseLine((p) => ({ ...p, contracted_quantity: e.target.value }))
                    }
                    sx={{ width: 88 }}
                  />
                  <TextField
                    size="small"
                    label="Unit price"
                    value={newLeaseLine.unit_price}
                    onChange={(e) => setNewLeaseLine((p) => ({ ...p, unit_price: e.target.value }))}
                    sx={{ width: 110 }}
                  />
                  <TextField
                    size="small"
                    label="Yearly price"
                    value={newLeaseLine.yearly_price}
                    onChange={(e) => setNewLeaseLine((p) => ({ ...p, yearly_price: e.target.value }))}
                    sx={{ width: 110 }}
                  />
                  <Button
                    variant="contained"
                    onClick={handleAddLeaseLine}
                    disabled={leaseBusy || !newLeaseLine.asset_type_id}
                  >
                    Add
                  </Button>
                </Stack>
              </>
            )}
          </Paper>
        )}

        {childCustomers.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Locations / departments under this customer</Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {childCustomers.map((ch) => (
                <Chip
                  key={ch.id}
                  label={ch.name}
                  onClick={() => navigate(`/customer/${ch.CustomerListID}`)}
                  sx={{ cursor: 'pointer' }}
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
        )}
        {editing && (
          <Box>
            {/* Customer Type Info */}
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Customer Type:</strong><br/>
                • <strong>CUSTOMER</strong> - Gets charged rental fees for assigned bottles<br/>
                • <strong>BRANCH</strong> - Site or department under a parent customer (required when &quot;Under parent&quot; is set; billed like customer)<br/>
                • <strong>VENDOR</strong> - Does NOT get charged rental fees (business partner)
              </Typography>
            </Alert>
            
            <Box display="flex" gap={2} mt={3}>
              <Button variant="contained" color="primary" onClick={handleSave} disabled={saving}>
                {saving ? <CircularProgress size={20} /> : 'Save Changes'}
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                onClick={() => {
                  setEditing(false);
                  setEditForm({
                    ...customer,
                    billing_mode: customer.billing_mode || 'rental',
                    customer_type: customerTypeForForm(customer),
                  });
                }}
                disabled={saving}
              >
                Cancel
              </Button>
            </Box>
            
            {saveError && <Alert severity="error" sx={{ mt: 2 }}>{saveError}</Alert>}
            {saveSuccess && <Alert severity="success" sx={{ mt: 2 }}>Customer information updated successfully!</Alert>}
          </Box>
        )}
      </Paper>

      {/* Transfer Information & Quick Actions */}
      {customerAssets.length === 0 && (
        <Paper elevation={0} sx={{ p: { xs: 1.75, md: 2.5 }, mb: 2.5, borderRadius: 3, backgroundColor: '#f8fafc', border: '1px solid rgba(59, 130, 246, 0.16)' }}>
          <Typography variant="h6" fontWeight={700} color="primary" mb={2}>
            📦 Bottle Assignment & Transfer Options
          </Typography>
          
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3} mb={2}>
            <Box>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Assign Bottles TO This Customer:
              </Typography>
              <Box display="flex" flexDirection="column" gap={1}>
                <Button 
                  variant="outlined" 
                  component={Link}
                  to={`/bottle-management`}
                  startIcon={<TransferWithinAStationIcon />}
                  sx={{ justifyContent: 'flex-start', mb: 1 }}
                >
                  Use Bottle Management Page
                </Button>
                <Button 
                  variant="outlined" 
                  component={Link}
                  to={`/customer/${id}/transfer-to`}
                  startIcon={<TransferWithinAStationIcon />}
                  sx={{ justifyContent: 'flex-start', mb: 1 }}
                >
                  Transfer from Other Customers
                </Button>
              </Box>
            </Box>
            
            <Box>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom color="text.secondary">
                Transfer FROM This Customer:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Transfer options will appear here once bottles are assigned to {customer?.name}.
              </Typography>
              <Box mt={2} p={2} sx={{ backgroundColor: '#fff', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                <Typography variant="body2" fontWeight={600} mb={1}>
                  Available Transfer Types:
                </Typography>
                <Typography variant="body2">• Transfer to other customers</Typography>
                <Typography variant="body2">• Quick transfer to recent customers</Typography>
                <Typography variant="body2">• Return to warehouse</Typography>
                <Typography variant="body2">• Transfer history tracking</Typography>
              </Box>
            </Box>
          </Box>

          <Alert severity="info">
            <Typography variant="body2">
              <strong>Tip:</strong> Once bottles are assigned to this customer, you'll see comprehensive transfer controls 
              including customer-to-customer transfers, warehouse returns, and audit trail functionality.
            </Typography>
          </Alert>
        </Paper>
      )}

      {/* Bottle Rental Summary */}
      <Paper elevation={0} sx={{ p: { xs: 1.75, md: 2.5 }, mb: 2.5, borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.08)', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Typography variant="h5" fontWeight={700} color="primary">
            📊 Bottle Rental Summary
          </Typography>
          {customer.customer_type === 'VENDOR' && (
            <Chip 
              label="NO RENTAL FEES" 
              color="secondary" 
              size="small"
              sx={{ fontWeight: 'bold' }}
            />
          )}
        </Box>
        
        {Object.keys(bottleSummary).length === 0 ? (
          <Box>
            <Typography color="text.secondary" mb={2}>No bottles currently assigned to this customer.</Typography>
          </Box>
        ) : (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Total bottles by type:
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={2}>
              {Object.entries(bottleSummary).map(([type, count]) => (
                <Chip
                  key={type}
                  label={`${type} (${count})`}
                  color="primary"
                  variant="outlined"
                  sx={{ 
                    fontWeight: 600, 
                    fontSize: '1rem',
                    px: 2,
                    py: 1,
                    borderRadius: 2
                  }}
                />
              ))}
              {Object.entries(dnsSummaryByType).map(([type, count]) => (
                <Chip
                  key={`dns-${type}`}
                  label={`${type} DNS (${count})`}
                  color="info"
                  variant="outlined"
                  sx={{ 
                    fontWeight: 600, 
                    fontSize: '1rem',
                    px: 2,
                    py: 1,
                    borderRadius: 2
                  }}
                />
              ))}
              {Object.entries(rnbSummaryByType).map(([type, count]) => (
                <Chip
                  key={`rnb-${type}`}
                  label={`${type} RNB (${count})`}
                  color="error"
                  variant="outlined"
                  sx={{
                    fontWeight: 600,
                    fontSize: '1rem',
                    px: 2,
                    py: 1,
                    borderRadius: 2
                  }}
                />
              ))}
              {Object.entries(rnsSummaryByType).map(([type, count]) => (
                <Chip
                  key={`rns-${type}`}
                  label={`${type} RNS (${count})`}
                  color="default"
                  variant="outlined"
                  sx={{
                    fontWeight: 600,
                    fontSize: '1rem',
                    px: 2,
                    py: 1,
                    borderRadius: 2
                  }}
                />
              ))}
            </Box>
            <Typography variant="body2" color="text.secondary" mt={2}>
              On-hand roll-up: {totalBottleCount} ({customerAssets.length} physical{dnsOnlyRentals.length > 0 ? ` + ${dnsOnlyRentals.length} DNS` : ''}{rnbRentals.length > 0 ? `, ${rnbRentals.length} RNB not counted here` : ''}{rnsRentals.length > 0 ? ` − ${rnsRentals.length} RNS` : ''}).
            {assignedBottlesMissingOpenRental.length > 0 && (
              <>
                {' '}
                <strong>{assignedBottlesMissingOpenRental.length}</strong> assigned bottle
                {assignedBottlesMissingOpenRental.length !== 1 ? 's' : ''}{' '}
                {assignedBottlesMissingOpenRental.length !== 1 ? 'have' : 'has'} no open rental (not on the invoice total yet).
              </>
            )}
            {' '}Billing uses{' '}
              <strong>{locationAssets.length} open rental rows</strong>, which can be higher than physical inventory.
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Currently Assigned Bottles (physical + optional DNS/RNB placeholders) */}
      <Paper elevation={0} sx={{ p: { xs: 1.75, md: 2.5 }, mb: 2.5, borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.08)', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h5" fontWeight={700} color="primary">
              🏠 Currently Assigned Bottles ({showDnsInBottleList ? totalBottleCount : customerAssets.length})
            </Typography>
            <FormControlLabel
              control={(
                <Checkbox
                  size="small"
                  checked={showDnsInBottleList}
                  onChange={(e) => setShowDnsInBottleList(e.target.checked)}
                />
              )}
              label="Show DNS/RNB rows in bottle list"
              sx={{ mt: 0.5 }}
            />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
              <Button
                size="small"
                variant="outlined"
                color="primary"
                onClick={() => {
                  setManualDnsForm({
                    dns_line_type: 'dns',
                    product_code: '',
                    quantity: '1',
                    rental_start_date: new Date().toISOString().split('T')[0],
                    order_ref: '',
                  });
                  setAddManualDnsOpen(true);
                }}
                disabled={!customer?.organization_id || !(customer?.CustomerListID || customer?.name)}
              >
                Add DNS line
              </Button>
              {(dnsOnlyRentals.length > 0 && rnbRentals.length > 0) && (
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  onClick={resolveDnsRnbPairs}
                  disabled={fixingDnsRnb}
                  startIcon={fixingDnsRnb ? <CircularProgress size={14} /> : null}
                >
                  {fixingDnsRnb ? 'Fixing DNS/RNB…' : 'Fix DNS/RNB for customer'}
                </Button>
              )}
            </Stack>
            {(dnsOnlyRentals.length > 0 || rnbRentals.length > 0 || rnsRentals.length > 0) && (
              <Typography variant="body2" color="text.secondary">
                {customerAssets.length} physical
                {dnsOnlyRentals.length > 0 ? ` + ${dnsOnlyRentals.length} DNS` : ''}
                {rnbRentals.length > 0
                  ? ` (${rnbRentals.length} RNB: return on their order, but bottle was not on their open rental when approved — not counted as physical)`
                  : ''}
                {rnsRentals.length > 0 ? ` − ${rnsRentals.length} RNS` : ''}
                {totalBottleCount !== customerAssets.length && (dnsOnlyRentals.length > 0 || rnsRentals.length > 0) && ` = ${totalBottleCount} total`}
              </Typography>
            )}
            {displayBottleList.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No bottles assigned to this customer yet
              </Typography>
            )}
          </Box>
          
          {customerAssets.length > 0 && (
            <Box display="flex" gap={1} flexWrap="wrap">
              <ButtonGroup variant="outlined" size="small">
                <Tooltip title="Select/Deselect All">
                  <Button
                    onClick={handleSelectAllAssets}
                    startIcon={selectedAssets.length === customerAssets.length ? <DeselectIcon /> : <SelectAllIcon />}
                  >
                    {selectedAssets.length === customerAssets.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </Tooltip>
                <Tooltip title={selectedAssets.length === 0 ? "Select assets to transfer" : `Transfer ${selectedAssets.length} selected asset(s) to customer`}>
                  <span style={{ display: 'inline-flex' }}>
                    <Button
                      onClick={() => handleOpenTransferDialog(false)}
                      disabled={selectedAssets.length === 0 || transferLoading}
                      startIcon={transferLoading ? <CircularProgress size={16} /> : <TransferWithinAStationIcon />}
                      color="primary"
                    >
                      Transfer ({selectedAssets.length})
                    </Button>
                  </span>
                </Tooltip>
              </ButtonGroup>
              
              <ButtonGroup variant="outlined" size="small">
                <Tooltip title="Quick transfer to recent customers">
                  <span style={{ display: 'inline-flex' }}>
                    <Button
                      onClick={() => handleOpenTransferDialog(true)}
                      disabled={selectedAssets.length === 0 || transferLoading}
                      startIcon={<SpeedIcon />}
                      color="secondary"
                    >
                      Quick Transfer
                    </Button>
                  </span>
                </Tooltip>
                <Tooltip title="Return assets to warehouse/in-house">
                  <span style={{ display: 'inline-flex' }}>
                    <Button
                      onClick={handleTransferToWarehouse}
                      disabled={selectedAssets.length === 0 || transferLoading}
                      startIcon={<WarehouseIcon />}
                      color="warning"
                    >
                      To Warehouse ({selectedAssets.length})
                    </Button>
                  </span>
                </Tooltip>
              </ButtonGroup>

              <ButtonGroup variant="text" size="small">
                <Tooltip title="View transfer history">
                  <Button
                    onClick={() => {
                      loadTransferHistory();
                      setShowTransferHistory(true);
                    }}
                    startIcon={<HistoryIcon />}
                    color="info"
                  >
                    History
                  </Button>
                </Tooltip>
                <Tooltip title="Filter by location">
                  <Button
                    onClick={() => setLocationFilter(locationFilter === 'all' ? 'SASKATOON' : 'all')}
                    startIcon={<FilterListIcon />}
                    color="info"
                  >
                    Filter
                  </Button>
                </Tooltip>
              </ButtonGroup>
            </Box>
          )}
        </Box>
        
        {displayBottleList.length === 0 ? (
          <Box>
            <Typography color="text.secondary" mb={2}>
              No bottles currently assigned to this customer.
            </Typography>
            <Alert severity="info">
              <Typography variant="body2">
                To assign bottles to this customer, you can:
              </Typography>
              <ul style={{ marginTop: '8px', marginBottom: '8px' }}>
                <li>Scan bottles in the mobile app and assign them to this customer</li>
                <li>Use the Bottle Management page to assign bottles</li>
                <li>Import bottle assignments from files</li>
              </ul>
              <Typography variant="body2">
                Transfer functionality will appear once bottles are assigned to this customer.
              </Typography>
            </Alert>
          </Box>
        ) : (
          <TableContainer sx={{ borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                  <TableCell padding="checkbox" sx={{ fontWeight: 700 }}>
                    <Checkbox
                      indeterminate={selectedAssets.length > 0 && selectedAssets.length < customerAssets.length}
                      checked={customerAssets.length > 0 && selectedAssets.length === customerAssets.length}
                      onChange={handleSelectAllAssets}
                      color="primary"
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Serial Number</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Barcode</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayBottleList
                  .filter(
                    (asset) =>
                      asset.isDns ||
                      locationFilter === 'all' ||
                      normalizeLocationKey(resolveCustomerInventoryLocationRaw(asset, customer)) ===
                        normalizeLocationKey(locationFilter)
                  )
                  .map((asset) => {
                  const assetIdKey = asset?.id == null ? '' : String(asset.id).trim();
                  const assetBarcodeKey = String(asset?.barcode_number || asset?.barcode || '').trim().toUpperCase();
                  const assetSerialKey = String(asset?.serial_number || '').trim().toUpperCase();
                  const hasOpenRental =
                    (!asset.isDns) &&
                    (
                      (assetIdKey && openRentalBottleKeys.bottleIds.has(assetIdKey)) ||
                      (assetBarcodeKey && openRentalBottleKeys.barcodes.has(assetBarcodeKey)) ||
                      (assetSerialKey && openRentalBottleKeys.barcodes.has(assetSerialKey))
                    );
                  const invStatus = normalizeInventoryBottleStatus(asset?.status);
                  const returnedToHouse = invStatus === 'empty';
                  const statusIsRented =
                    !returnedToHouse &&
                    (hasOpenRental || invStatus === 'rented');
                  return (
                  <TableRow key={asset.id} hover selected={!asset.isDns && selectedAssets.includes(asset.id)} sx={asset.isDns ? { backgroundColor: 'action.hover' } : undefined}>
                    <TableCell padding="checkbox">
                      {asset.isDns ? (
                        <Typography component="span" color="text.secondary">—</Typography>
                      ) : (
                        <Checkbox
                          checked={selectedAssets.includes(asset.id)}
                          onChange={() => handleSelectAsset(asset.id)}
                          color="primary"
                        />
                      )}
                    </TableCell>
                    <TableCell>{asset.serial_number}</TableCell>
                    <TableCell>
                      {asset.isDns ? (
                        <Typography component="span" color="text.secondary" fontWeight={500}>{asset.barcode_number || 'DNS'}</Typography>
                      ) : asset.barcode_number ? (
                        <Link
                          to={`/bottle/${asset.id}?fromCustomer=${encodeURIComponent(
                            customer?.CustomerListID || customer?.id || ''
                          )}`}
                          style={{ color: '#1976d2', textDecoration: 'underline', cursor: 'pointer' }}
                        >
                          {asset.barcode_number}
                        </Link>
                      ) : ''}
                    </TableCell>
                    <TableCell>{asset.product_code || asset.type || asset.description || 'Unknown'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={displayAssignedAssetLocationChip(asset, customer)}
                        color="primary" 
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {asset.isDns ? (
                        <Chip label={asset.barcode_number || 'DNS'} color={asset.barcode_number === 'RNB' ? 'error' : 'info'} size="small" variant="outlined" />
                      ) : (
                        <Chip 
                          label={
                            customer?.customer_type === 'VENDOR' 
                              ? "In-house (no charge)" 
                              : customer?.customer_type === 'TEMPORARY'
                              ? "Rented (temp - needs setup)"
                              : displayInventoryStatusChip(asset, statusIsRented)
                          }
                          color={
                            customer?.customer_type === 'VENDOR' ? 'default' : 
                            customer?.customer_type === 'TEMPORARY' ? 'warning' : 
                            statusIsRented ? 'success' : 'warning'
                          }
                          size="small"
                          icon={customer?.customer_type === 'VENDOR' ? <HomeIcon /> : null}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                )})}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Rental History */}
      <Paper elevation={0} sx={{ p: { xs: 1.75, md: 2.5 }, borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.08)', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.25, mb: 2 }}>
          <Typography variant="h5" fontWeight={700} color="primary">
            📋 Open rentals ({locationAssets.length} — billing basis)
          </Typography>
          {locationAssets.length > 0 && (
            <Button
              component={Link}
              to="/pricing/customers"
              state={
                id
                  ? {
                      prefillCustomerId: id,
                      prefillCustomerName: customer?.name || customer?.Name || '',
                    }
                  : undefined
              }
              variant="outlined"
              size="small"
            >
              Edit rental rates (per asset)
            </Button>
          )}
        </Box>
        {locationAssets.length > 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 900 }}>
            Rental amount uses your <strong>standard rate table</strong>, product/category matching, and this customer&apos;s pricing — the same rules as the Rentals page. Use the button above to open <strong>Customer Pricing</strong> for per-SKU overrides (same as &quot;Edit Rates&quot; on Rentals).
            {' '}
            <strong>Start date</strong> comes from each open rental row; when the app auto-creates a rental for an assigned asset, it uses that asset&apos;s dates (not &quot;today&quot;) so this column reflects history, not when you opened the page.
            {' '}
            <strong>
              Invoices charge each open row below ({locationAssets.length}); customer-owned cylinders are not counted as rent.
            </strong>
            {openRentalsDelta !== 0 && (
              <>
                {' '}
                Physical inventory shows <strong>{customerAssets.length}</strong> assigned containers.
                {openRentalsDelta < 0 && (
                  <>
                    {' '}
                    You have <strong>{Math.abs(openRentalsDelta)}</strong> more assigned bottle
                    {Math.abs(openRentalsDelta) !== 1 ? 's' : ''} than open rental row
                    {Math.abs(openRentalsDelta) !== 1 ? 's' : ''}
                    {assignedBottlesMissingOpenRental.length > 0 ? (
                      <>
                        {' '}
                        — no matching rental row for barcode
                        {assignedBottlesMissingOpenRental.length !== 1 ? 's' : ''}:{' '}
                        <strong>
                          {assignedBottlesMissingOpenRental
                            .map((b) => b.barcode_number || b.serial_number || b.id)
                            .filter(Boolean)
                            .join(', ')}
                        </strong>
                      </>
                    ) : ''}
                    . Those assets are not billed monthly until an open rental row exists (this page usually creates one when you load the customer; refresh if data just changed).
                  </>
                )}
                {openRentalsDelta > 0 &&
                  (dnsRentals.length === 0 && rnbRentals.length === 0 && rnsRentals.length === 0
                    ? ` The ${openRentalsDelta}-row gap means more open rentals than bottles in the assigned list here — often transfers, DNS-style placeholders, or lookup mismatch (see warning above if shown).`
                    : ' Higher open-row counts often include DNS/RNB/RNS placeholders versus physical inventory.')}
              </>
            )}
          </Typography>
        )}

        {orphanRentals.length > 0 && (
          <Alert
            severity="warning"
            sx={{ mb: 2 }}
            action={
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
                <Button
                  color="warning"
                  size="small"
                  variant="outlined"
                  disabled={
                    endingOrphanRentals ||
                    reassigningOrphans ||
                    orphanRentalsToEnd.length === 0
                  }
                  onClick={handleEndOrphanRentals}
                  startIcon={endingOrphanRentals ? <CircularProgress size={14} /> : null}
                >
                  {endingOrphanRentals
                    ? 'Closing…'
                    : `End ${orphanRentalsToEnd.length} rental(s) (stop billing)`}
                </Button>
                <Button
                  color="warning"
                  size="small"
                  variant="contained"
                  disabled={
                    reassigningOrphans ||
                    endingOrphanRentals ||
                    orphanRentals.filter((o) => o.bottle?.id).length === 0
                  }
                  onClick={handleReassignOrphans}
                  startIcon={reassigningOrphans ? <CircularProgress size={14} /> : <Inventory2Icon />}
                >
                  {reassigningOrphans ? 'Reassigning…' : `Assign ${orphanRentals.filter((o) => o.bottle?.id).length} bottle(s)`}
                </Button>
              </Stack>
            }
          >
            <Typography variant="body2" fontWeight={600} gutterBottom>
              {orphanRentals.length} rental row(s) are billing this customer but the bottle isn&apos;t assigned here in inventory.
            </Typography>
            <Typography variant="body2">
              Barcodes: {orphanRentals.map((o) => o.rental.bottle_barcode || '?').join(', ')}.
              {orphanRentals.filter((o) => o.bottle?.id).length > 0
                ? ' If cylinders were returned to the warehouse, use End rental(s) to stop billing. Otherwise assign bottles here so inventory matches open rentals.'
                : ' Could not find matching bottle records — use End rental(s) if these should not bill, or investigate data.'}{' '}
              Customer-owned cylinders are excluded from rental charges automatically.
            </Typography>
          </Alert>
        )}

        {locationAssets.length === 0 ? (
          <Typography color="text.secondary">No rental history found for this customer.</Typography>
        ) : (
          <TableContainer sx={{ borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Serial/Barcode</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Type/Product</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Rental Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Rental Amount</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Start Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rentalHistoryDisplayRows.map(({ rental, displayAmount }) => {
                  const isDNS = rental.is_dns === true;
                  const dnsDescLc = String(rental.dns_description || '').toLowerCase();
                  const isRNB = isDNS && dnsDescLc.includes('return not on balance');
                  const isRNS = isDNS && dnsDescLc.includes('return not scanned');
                  const dnsDescriptionText = typeof rental.dns_description === 'string' ? rental.dns_description : '';
                  const dnsDisplayDescription = /delivered not[- ]scanned/i.test(dnsDescriptionText)
                    ? 'DNS'
                    : (dnsDescriptionText || 'Approved invoice, no scanned bottle');
                  const bottle =
                    !isDNS &&
                    findCustomerAssetForRentalExtended(customerAssets || [], supplementalBottles, rental);
                  const typeProduct = resolveRentalHistoryTypeProductLabel(
                    rental,
                    bottle,
                    rentalHistoryAssetPricingMap
                  );
                  return (
                    <TableRow key={rental.id} hover sx={{ bgcolor: isRNB ? '#ffebee' : isRNS ? '#f5f5f5' : isDNS ? '#fff3cd' : 'inherit' }}>
                      <TableCell>
                        {isRNB ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography component="span" variant="body2" fontFamily="monospace">
                              {rental.bottle_barcode || '—'}
                            </Typography>
                            <Chip label="RNB" color="error" size="small" sx={{ fontWeight: 'bold' }} />
                          </Box>
                        ) : isRNS ? (
                          <Chip label="RNS" color="default" size="small" sx={{ fontWeight: 'bold' }} />
                        ) : isDNS ? (
                          <Chip 
                            label="DNS" 
                            color="warning" 
                            size="small"
                            sx={{ fontWeight: 'bold' }}
                          />
                        ) : (
                          rental.bottle_barcode || rental.cylinder?.serial_number || 'Unknown'
                        )}
                      </TableCell>
                      <TableCell>
                        {isDNS ? (
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {rental.dns_product_code || 'N/A'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {dnsDisplayDescription}
                            </Typography>
                          </Box>
                        ) : (
                          typeProduct
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={rental.rental_type || 'Monthly'} 
                          color="primary" 
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>${displayAmount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Chip 
                          label={displayRentalRowLocation(rental, bottle, customer)} 
                          color="secondary" 
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{rental.rental_start_date || '-'}</TableCell>
                      <TableCell>
                        <Tooltip
                          title={
                            isRNB
                              ? 'Return was on this customer’s order, but when approved there was no open rental (and matching assignment) for this bottle under this customer. Movement history may still show “Customer: …” because that is the order account.'
                              : ''
                          }
                          disableHoverListener={!isRNB}
                        >
                          <Chip 
                            label={isRNB ? 'RNB (order return — not on open rental)' : isRNS ? 'RNS (Return, no scanned bottle)' : isDNS ? 'DNS (Invoice, no scanned bottle)' : (rental.status || 'Active')} 
                            color={isRNB ? 'error' : isRNS ? 'default' : isDNS ? 'warning' : (rental.status === 'at_home' ? 'warning' : 'success')}
                            size="small"
                          />
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        {isRNB && (
                          <Tooltip title="Close this RNB so it no longer shows on the customer list">
                            <span>
                              <Button
                                size="small"
                                variant="outlined"
                                color="secondary"
                                disabled={resolvingRnbId === rental.id}
                                onClick={() => resolveRnb(rental)}
                                startIcon={resolvingRnbId === rental.id ? <CircularProgress size={14} /> : null}
                              >
                                {resolvingRnbId === rental.id ? 'Resolving…' : 'Resolve'}
                              </Button>
                            </span>
                          </Tooltip>
                        )}
                        {isRNS && (
                          <Tooltip title="Close this RNS so it no longer reduces the customer total">
                            <span>
                              <Button
                                size="small"
                                variant="outlined"
                                color="inherit"
                                disabled={resolvingRnsId === rental.id}
                                onClick={() => resolveRns(rental)}
                                startIcon={resolvingRnsId === rental.id ? <CircularProgress size={14} /> : null}
                              >
                                {resolvingRnsId === rental.id ? 'Resolving…' : 'Resolve'}
                              </Button>
                            </span>
                          </Tooltip>
                        )}
                        {isDNS && !isRNB && !isRNS && (
                          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                            <DNSConversionDialog
                              dnsRental={rental}
                              customerId={customer?.CustomerListID}
                              customerName={customer?.name}
                              onConverted={() => {
                                const loadRentals = async () => {
                                  const merged = await fetchMergedOpenRentalsForCustomer(
                                    customer?.organization_id,
                                    customer?.name,
                                    customer?.CustomerListID || id,
                                    customer?.id,
                                    getSubsidiaryRowsForMerge()
                                  );
                                  setLocationAssets(merged);
                                };
                                loadRentals();
                              }}
                            />
                            <Tooltip title="Close this DNS so it no longer shows on this customer">
                              <span>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="warning"
                                  disabled={resolvingDnsId === rental.id}
                                  onClick={() => resolveDns(rental)}
                                  startIcon={resolvingDnsId === rental.id ? <CircularProgress size={14} /> : null}
                                >
                                  {resolvingDnsId === rental.id ? 'Clearing…' : 'Clear DNS'}
                                </Button>
                              </span>
                            </Tooltip>
                          </Stack>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog
        open={addManualDnsOpen}
        onClose={() => !addManualDnsSaving && setAddManualDnsOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add DNS / RNB / RNS line</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Creates open rental placeholder rows for this customer (no bottle record). The line type controls classification here and in roll-ups, using the same description markers as imports.{' '}
            <strong>Product code</strong> is chosen from the list below:{' '}
            <Link to="/inventory/asset-classifications">Asset Classifications</Link>, rental-class match codes, and{' '}
            <strong>every SKU used on bottles in your organization</strong> (same product keys as the Assets /
            inventory pages).
          </Typography>
          {manualDnsProductPickerOptions.length === 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              No SKUs found. Add products under{' '}
              <Link to="/inventory/asset-classifications">Asset Classifications</Link> or ensure bottles on{' '}
              <Link to="/assets">Assets</Link> have a product / type field set — then reopen this dialog.
            </Alert>
          )}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="manual-dns-type-label">Line type</InputLabel>
              <Select
                labelId="manual-dns-type-label"
                label="Line type"
                value={manualDnsForm.dns_line_type}
                onChange={(e) =>
                  setManualDnsForm((f) => ({ ...f, dns_line_type: e.target.value }))
                }
              >
                <MenuItem value="dns">DNS — Shipped on invoice, no scanned bottle</MenuItem>
                <MenuItem value="rnb">RNB — Return on order, not on open rental for this customer</MenuItem>
                <MenuItem value="rns">RNS — Return with no scanned bottle</MenuItem>
              </Select>
            </FormControl>
            <Autocomplete
              size="small"
              options={manualDnsProductPickerOptions}
              filterOptions={filterManualDnsProductOptions}
              getOptionLabel={(opt) => opt?.product_code || ''}
              isOptionEqualToValue={(a, b) =>
                String(a?.product_code || '').toLowerCase() === String(b?.product_code || '').toLowerCase()
              }
              value={
                manualDnsProductPickerOptions.find(
                  (o) =>
                    o.product_code.toLowerCase() === (manualDnsForm.product_code || '').trim().toLowerCase()
                ) || null
              }
              onChange={(_, v) =>
                setManualDnsForm((f) => ({ ...f, product_code: v?.product_code?.trim() || '' }))
              }
              disabled={manualDnsProductPickerOptions.length === 0}
              renderOption={(props, option) => (
                <li {...props} key={option.product_code}>
                  <Stack spacing={0}>
                    <Typography variant="body2" fontFamily="monospace" fontWeight={600}>
                      {option.product_code}
                    </Typography>
                    {(option.description || option.category) && (
                      <Typography variant="caption" color="text.secondary">
                        {[option.description, option.category].filter(Boolean).join(' · ')}
                      </Typography>
                    )}
                  </Stack>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Product code"
                  required
                  helperText={
                    manualDnsProductPickerOptions.length === 0
                      ? 'Add pricing rows or product codes on Assets.'
                      : 'Search all org SKUs (pricing + inventory). Rates use your pricing rules.'
                  }
                />
              )}
              noOptionsText="No matching product codes"
              autoHighlight
              openOnFocus
              selectOnFocus
              componentsProps={{
                popper: {
                  disablePortal: true,
                  sx: { zIndex: (theme) => theme.zIndex.modal + 1 },
                },
              }}
            />
            <TextField
              label="Description (stored on rental)"
              value={
                (manualDnsForm.product_code || '').trim()
                  ? manualDnsForm.dns_line_type === 'rnb'
                    ? `Return not on balance — ${(manualDnsForm.product_code || '').trim()} (manual)`
                    : manualDnsForm.dns_line_type === 'rns'
                      ? `Return not scanned — ${(manualDnsForm.product_code || '').trim()} (manual)`
                      : `${(manualDnsForm.product_code || '').trim()} – manual DNS (delivered not scanned)`
                  : 'Enter a product code to preview description…'
              }
              fullWidth
              size="small"
              multiline
              minRows={2}
              InputProps={{ readOnly: true }}
              helperText="Filled automatically from type and product code."
            />
            <TextField
              label="Quantity"
              type="number"
              inputProps={{ min: 1, max: 500 }}
              value={manualDnsForm.quantity}
              onChange={(e) => setManualDnsForm((f) => ({ ...f, quantity: e.target.value }))}
              size="small"
              sx={{ maxWidth: 160 }}
            />
            <TextField
              label="Rental start date"
              type="date"
              value={manualDnsForm.rental_start_date}
              onChange={(e) => setManualDnsForm((f) => ({ ...f, rental_start_date: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              size="small"
              sx={{ maxWidth: 220 }}
            />
            <TextField
              label="Order reference (optional)"
              value={manualDnsForm.order_ref}
              onChange={(e) => setManualDnsForm((f) => ({ ...f, order_ref: e.target.value }))}
              fullWidth
              size="small"
              helperText="Stored as dns_order_number MANUAL-… for grouping."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddManualDnsOpen(false)} disabled={addManualDnsSaving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={submitManualDns}
            disabled={addManualDnsSaving || manualDnsProductPickerOptions.length === 0}
            startIcon={addManualDnsSaving ? <CircularProgress size={16} /> : null}
          >
            {addManualDnsSaving ? 'Saving…' : 'Add line'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog 
        open={transferDialogOpen} 
        onClose={handleCloseTransferDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <TransferWithinAStationIcon color="primary" />
            Transfer Assets
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Transfer {selectedAssets.length} selected asset(s) from <strong>{customer?.name}</strong> to another customer:
            </Typography>
            
            <Autocomplete
              options={availableCustomers}
              filterOptions={filterParentCustomerOptions}
              getOptionLabel={(option) => `${option.name} (${option.CustomerListID})`}
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  <Box>
                    <Typography variant="body2" fontWeight={500}>
                      {option.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ID: {option.CustomerListID} | Type: {option.customer_type || 'CUSTOMER'}
                    </Typography>
                  </Box>
                </Box>
              )}
              value={targetCustomer}
              onChange={(event, newValue) => setTargetCustomer(newValue)}
              autoHighlight
              openOnFocus
              noOptionsText="No matching customers"
              componentsProps={{
                popper: {
                  disablePortal: true,
                  sx: { zIndex: (theme) => theme.zIndex.modal + 1 },
                },
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Target Customer"
                  placeholder="Search name or customer ID…"
                  fullWidth
                  margin="normal"
                  required
                />
              )}
              sx={{ mb: 2 }}
            />

            <TextField
              label="Transfer Reason (Optional)"
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              fullWidth
              multiline
              rows={3}
              placeholder="Enter reason for transfer (e.g., customer request, equipment reallocation, etc.)"
              margin="normal"
            />

            {selectedAssets.length > 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Assets to transfer:</strong> {selectedAssets.length} item(s)
                </Typography>
                <Typography variant="caption">
                  Selected assets will be immediately reassigned to the target customer.
                </Typography>
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCloseTransferDialog}
            disabled={transferLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmTransfer}
            variant="contained"
            disabled={!targetCustomer || transferLoading}
            startIcon={transferLoading ? <CircularProgress size={16} /> : <TransferWithinAStationIcon />}
          >
            {transferLoading ? 'Transferring...' : 'Transfer Assets'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Quick Transfer Dialog */}
      <Dialog 
        open={quickTransferDialogOpen} 
        onClose={() => setQuickTransferDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <SpeedIcon color="primary" />
            Quick Transfer to Recent Customers
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Transfer {selectedAssets.length} selected asset(s) from <strong>{customer?.name}</strong> to a recent customer:
            </Typography>
            
            {recentCustomers.length === 0 ? (
              <Alert severity="info">
                <Typography variant="body2">
                  No recent customers found. Use the main Transfer button to search all customers.
                </Typography>
              </Alert>
            ) : (
              <Box display="flex" flexDirection="column" gap={1} mt={2}>
                {recentCustomers.map((customer) => (
                  <Button
                    key={customer.CustomerListID}
                    variant="outlined"
                    fullWidth
                    onClick={() => {
                      setTargetCustomer(customer);
                      setTransferDialogOpen(true);
                      setQuickTransferDialogOpen(false);
                    }}
                    sx={{ justifyContent: 'flex-start', p: 2, mb: 1 }}
                  >
                    <Box textAlign="left">
                      <Typography variant="body2" fontWeight={600}>
                        {customer.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ID: {customer.CustomerListID} | Type: {customer.customer_type || 'CUSTOMER'} 
                      </Typography>
                    </Box>
                  </Button>
                ))}
              </Box>
            )}

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Note:</strong> Recent customers are based on recently updated accounts. 
                Use the main "Transfer" button to search all customers.
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuickTransferDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="outlined"
            onClick={() => {
              setQuickTransferDialogOpen(false);
              handleOpenTransferDialog(false);
            }}
          >
            Search All Customers
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transfer History Dialog */}
      <Dialog 
        open={showTransferHistory} 
        onClose={() => setShowTransferHistory(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <HistoryIcon color="primary" />
            Scan-based transfer history
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Recent asset transfer activity for this customer:
            </Typography>
            
            {transferHistory.length === 0 ? (
              <Alert severity="info">
                <Typography variant="body2">
                  No recent transfer history found. Transfer activity will appear here once assets are moved.
                </Typography>
              </Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f7fa' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Date/Time</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transferHistory.map((transfer) => (
                      <TableRow key={transfer.id} hover>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(transfer.timestamp).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={transfer.type.replace('_', ' ')} 
                            color="primary" 
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{transfer.description}</TableCell>
                        <TableCell>
                          <Chip 
                            label={transfer.details.status} 
                            color="success" 
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Note:</strong> This shows the most recent 20 transfer activities. 
                Complete audit trails are maintained in the system logs.
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTransferHistory(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Warehouse Transfer Confirmation Dialog */}
      <Dialog 
        open={warehouseConfirmDialogOpen} 
        onClose={() => setWarehouseConfirmDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <WarehouseIcon color="warning" />
            Confirm Transfer to Warehouse
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight={600}>
                You are about to transfer {selectedAssets.length} asset(s) from <strong>{customer?.name}</strong> to the warehouse.
              </Typography>
            </Alert>
            
            <Typography variant="body2" color="text.secondary" gutterBottom>
              This action will:
            </Typography>
            <Box component="ul" sx={{ mt: 1, mb: 2, pl: 2 }}>
              <li>
                <Typography variant="body2">Remove customer assignment</Typography>
              </li>
              <li>
                <Typography variant="body2">Set status to 'available'</Typography>
              </li>
              <li>
                <Typography variant="body2">Clear location information</Typography>
              </li>
              <li>
                <Typography variant="body2">Make assets available for reassignment</Typography>
              </li>
            </Box>

            <Typography variant="body2" fontWeight={600} gutterBottom>
              Selected assets ({selectedAssets.length}):
            </Typography>
            <Box 
              sx={{ 
                maxHeight: 200, 
                overflowY: 'auto', 
                border: '1px solid #e0e0e0', 
                borderRadius: 1, 
                p: 1.5,
                backgroundColor: '#f9f9f9'
              }}
            >
              {customerAssets
                .filter(asset => selectedAssets.includes(asset.id))
                .map(asset => (
                  <Box key={asset.id} sx={{ mb: 0.5 }}>
                    <Typography variant="body2" fontFamily="monospace">
                      • {asset.serial_number || asset.barcode_number} 
                      <span style={{ color: '#666', marginLeft: '8px' }}>
                        ({asset.type || asset.description || 'Unknown'})
                      </span>
                    </Typography>
                  </Box>
                ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setWarehouseConfirmDialogOpen(false)}
            disabled={transferLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmTransferToWarehouse}
            variant="contained"
            color="warning"
            disabled={transferLoading}
            startIcon={transferLoading ? <CircularProgress size={16} /> : <WarehouseIcon />}
          >
            {transferLoading ? 'Transferring...' : 'Confirm Transfer to Warehouse'}
          </Button>
        </DialogActions>
      </Dialog>

      </>
      )}

      {/* Tab 1: Rental settings (TrackAbout-style) - theme matches Customer Info paper */}
      {customerDetailTab === 1 && (
        <Paper elevation={3} sx={{ p: { xs: 1.75, md: 2.5 }, mb: 2.5, borderRadius: 4, border: '1.5px solid', borderColor: 'divider', boxShadow: '0 2px 12px 0 rgba(16,24,40,0.04)' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5" fontWeight={700} color="primary">Rental</Typography>
            <Button variant="outlined" startIcon={<EditIcon />} onClick={handleOpenRentalSettings} sx={{ borderRadius: 2, fontWeight: 700 }}>
              Edit rental settings
            </Button>
          </Box>
          <Divider sx={{ mb: 3 }} />

          <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: 'rgba(25, 118, 210, 0.04)', borderColor: 'primary.light' }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
              <Box>
                <Typography variant="subtitle2" fontWeight={700} color="primary.dark" gutterBottom>
                  Purchase order (P.O.)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 560 }}>
                  Shown on rental invoice PDFs in the &quot;PURCHASE ORDER&quot; column when set. Leave empty for customers who do not use a PO.
                </Typography>
                <Typography variant="body1" sx={{ mt: 1, fontWeight: customer?.purchase_order ? 600 : 400 }}>
                  {customer?.purchase_order ? customer.purchase_order : '— None on file'}
                </Typography>
              </Box>
              <Button variant="contained" onClick={handleOpenRentalSettings} sx={{ flexShrink: 0, fontWeight: 700 }}>
                Enter or edit P.O.
              </Button>
            </Stack>
          </Paper>

          <Typography variant="subtitle1" fontWeight={600} color="text.secondary" sx={{ mb: 1 }}>
            Rates by product code (SKU)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 720 }}>
            Price by <strong>inventory product code</strong>. When this customer swaps to another cylinder with the same code, the monthly rate stays the same. Overrides class-based pricing for that SKU. Clear a row to remove the override and fall back to the organization rate table.
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1} alignItems="center" sx={{ mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<Inventory2Icon />}
              onClick={openProductSkuRatesDialog}
              sx={{ borderRadius: 2, fontWeight: 700 }}
            >
              Edit rates by product code
            </Button>
            {customerPricing?.rental_rates_by_product_code &&
            typeof customerPricing.rental_rates_by_product_code === 'object' &&
            Object.keys(customerPricing.rental_rates_by_product_code).length > 0 ? (
              <Typography variant="caption" color="text.secondary">
                {Object.keys(customerPricing.rental_rates_by_product_code).length} product code rate(s) on file
              </Typography>
            ) : (
              <Typography variant="caption" color="text.secondary">
                No SKU-specific rates — org rate table applies
              </Typography>
            )}
          </Box>

          <Typography variant="subtitle1" fontWeight={600} color="text.secondary" sx={{ mt: 3, mb: 2 }}>Other settings</Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5, listStyle: 'none' }}>
            <Box component="li" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2">Daily calculation method</Typography>
              <Typography variant="body2" color="text.secondary">{rentalSettingsForm.daily_calculation_method === 'end_of_day' ? 'End of day' : 'Default (start of day)'}</Typography>
              <Button size="small" variant="text" color="primary" onClick={handleOpenRentalSettings}>Change</Button>
            </Box>
            <Box component="li" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2">Minimum billable amount</Typography>
              <Typography variant="body2" color="text.secondary">${rentalSettingsForm.minimum_billable_amount}</Typography>
              <Button size="small" variant="text" color="primary" onClick={handleOpenRentalSettings}>Change</Button>
            </Box>
            <Box component="li" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2">Tax region</Typography>
              <Typography variant="body2" color="text.secondary">{customer?.location ? formatLocationDisplay(customer.location) : 'SSK'}</Typography>
              <Button size="small" variant="text" color="primary" onClick={handleOpenRentalSettings}>Change</Button>
            </Box>
            <Box component="li" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2">Rental bill format</Typography>
              <Typography variant="body2" color="text.secondary">Default</Typography>
            </Box>
            <Box component="li" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2">Tax status</Typography>
              <Typography variant="body2" color="text.secondary">Default</Typography>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Rental Settings Edit Dialog - theme matches app dialogs */}
      <Dialog open={rentalSettingsDialog} onClose={() => setRentalSettingsDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Rental settings</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              size="small"
              label="Purchase order (P.O.)"
              value={rentalSettingsForm.purchase_order || ''}
              onChange={(e) => setRentalSettingsForm(f => ({ ...f, purchase_order: e.target.value }))}
              placeholder="e.g. P000021880"
              helperText="Optional. Printed on rental invoice PDFs; leave blank if this customer does not use a PO."
              autoFocus
            />
            <FormControl fullWidth size="small">
              <InputLabel>Payment terms</InputLabel>
              <Select
                value={rentalSettingsForm.payment_terms || ''}
                onChange={(e) => setRentalSettingsForm(f => ({ ...f, payment_terms: e.target.value }))}
                label="Payment terms"
              >
                {CUSTOMER_PAYMENT_TERM_OPTIONS.map((opt) => (
                  <MenuItem key={`rs-${opt.label}-${opt.value}`} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Tax region</InputLabel>
              <Select
                value={rentalSettingsForm.tax_region || 'SASKATOON'}
                onChange={(e) => setRentalSettingsForm(f => ({ ...f, tax_region: e.target.value }))}
                label="Tax region"
              >
                <MenuItem value="SASKATOON">SASKATOON (SSK)</MenuItem>
                <MenuItem value="REGINA">REGINA</MenuItem>
                <MenuItem value="CHILLIWACK">CHILLIWACK</MenuItem>
                <MenuItem value="PRINCE_GEORGE">PRINCE GEORGE</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Daily calculation method</InputLabel>
              <Select
                value={rentalSettingsForm.daily_calculation_method || 'start_of_day'}
                onChange={(e) => setRentalSettingsForm(f => ({ ...f, daily_calculation_method: e.target.value }))}
                label="Daily calculation method"
              >
                <MenuItem value="start_of_day">Default (start of day)</MenuItem>
                <MenuItem value="end_of_day">End of day</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              size="small"
              type="number"
              inputProps={{ min: 0, step: 0.01 }}
              label="Minimum billable amount ($)"
              value={rentalSettingsForm.minimum_billable_amount || ''}
              onChange={(e) => setRentalSettingsForm(f => ({ ...f, minimum_billable_amount: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRentalSettingsDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveRentalSettings} disabled={rentalSettingsSaving}>
            {rentalSettingsSaving ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={productSkuRatesDialogOpen}
        onClose={() => setProductSkuRatesDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Rates by product code</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Monthly rent per SKU on this customer. Clear a field to remove the override and fall back to class pricing. You can prefix-match longer codes (e.g. key <code>BOX300</code> applies to <code>BOX300-16PK</code>) using the same rules as the org rate table.
          </Typography>
          <Box
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <TableContainer sx={{ maxHeight: 360, overflow: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 700, minWidth: 160 }}>Product code</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, width: 96, whiteSpace: 'nowrap' }}>
                      On hand
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, width: 140, whiteSpace: 'nowrap' }}>
                      Monthly ($)
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.keys(productSkuRatesDraft).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} sx={{ border: 0, py: 3, color: 'text.secondary' }}>
                        No product codes yet. Use the fields below to add your first SKU (e.g. before inventory arrives).
                      </TableCell>
                    </TableRow>
                  ) : (
                    Object.keys(productSkuRatesDraft)
                      .sort((a, b) => a.localeCompare(b))
                      .map((code) => {
                        const row = productSkuRatesDraft[code] || { monthly: '' };
                        const onHand = (customerAssets || []).filter(
                          (b) => (b.product_code || '').trim() === code
                        ).length;
                        return (
                          <TableRow key={code} hover>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{code}</TableCell>
                            <TableCell align="right">{onHand || '—'}</TableCell>
                            <TableCell align="right">
                              <TextField
                                size="small"
                                type="number"
                                inputProps={{ min: 0, step: 0.01 }}
                                placeholder="—"
                                value={row.monthly}
                                onChange={(e) =>
                                  setProductSkuRatesDraft((prev) => ({
                                    ...prev,
                                    [code]: { ...prev[code], monthly: e.target.value },
                                  }))
                                }
                                sx={{ width: 128, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <Box
              sx={{
                px: 2,
                py: 2,
                bgcolor: 'action.hover',
                borderTop: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, fontWeight: 600 }}>
                Add a row
              </Typography>
              <Stack spacing={2}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Product code (e.g. BOX300)"
                  value={productSkuExtraCode}
                  onChange={(e) => setProductSkuExtraCode(e.target.value)}
                  inputProps={{ 'aria-label': 'Product code to add' }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                  <TextField
                    size="small"
                    type="number"
                    inputProps={{ min: 0, step: 0.01, 'aria-label': 'Monthly amount' }}
                    placeholder="Monthly amount (USD)"
                    value={productSkuExtraMonthly}
                    onChange={(e) => setProductSkuExtraMonthly(e.target.value)}
                    sx={{
                      minWidth: { xs: '100%', sm: 220 },
                      maxWidth: { sm: 280 },
                      flex: { sm: '0 0 auto' },
                      '& .MuiOutlinedInput-root': { borderRadius: 1.5 },
                    }}
                  />
                  <Button
                    variant="outlined"
                    size="medium"
                    onClick={() => {
                      const c = productSkuExtraCode.trim();
                      if (!c) return;
                      setProductSkuRatesDraft((prev) => ({
                        ...prev,
                        [c]: { monthly: productSkuExtraMonthly.trim() },
                      }));
                      setProductSkuExtraCode('');
                      setProductSkuExtraMonthly('');
                    }}
                    sx={{
                      borderRadius: 2,
                      fontWeight: 600,
                      px: 2.5,
                      minHeight: 40,
                      alignSelf: { xs: 'stretch', sm: 'center' },
                    }}
                  >
                    Add row
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProductSkuRatesDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveProductSkuRates} disabled={savingProductSkuRates}>
            {savingProductSkuRates ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transfer Status Messages */}
      <Snackbar
        open={transferMessage.open}
        autoHideDuration={6000}
        onClose={() => setTransferMessage({ ...transferMessage, open: false })}
      >
        <Alert 
          onClose={() => setTransferMessage({ ...transferMessage, open: false })}
          severity={transferMessage.severity}
          sx={{ width: '100%' }}
        >
          {transferMessage.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 