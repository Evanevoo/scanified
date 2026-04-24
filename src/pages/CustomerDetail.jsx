import logger from '../utils/logger';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
  Chip,
  Divider,
  TextField,
  CircularProgress,
  Alert,
  FormControl,
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
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import SettingsIcon from '@mui/icons-material/Settings';
import EditIcon from '@mui/icons-material/Edit';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import { TableSkeleton, CardSkeleton } from '../components/SmoothLoading';
import { AssetTransferService } from '../services/assetTransferService';
import {
  fetchOrgRentalPricingContext,
  monthlyRateForNewRental,
  invalidateOrgRentalPricingCache,
} from '../services/rentalPricingContext';
import { useAuth } from '../hooks/useAuth';
import DNSConversionDialog from '../components/DNSConversionDialog';
import BarcodeDisplay from '../components/BarcodeDisplay';
import { formatLocationDisplay, normalizeLocationKey } from '../utils/locationDisplay';
import { summarizeBottlesByType, getBottleSummaryGroupKey } from '../utils/bottleInventoryGrouping';
import {
  getUnifiedClasses,
  formatUnifiedClassLabel,
  computeEffectiveMonthlyRate,
  pickCustomerProductRateEntry,
} from '../utils/organizationRentalClassUtils';
import { getResolvedClassRates } from '../utils/rentalClassRates';

// Helper to check if a string looks like an address
function looksLikeAddress(str) {
  if (!str) return false;
  // Heuristic: contains a comma and a number
  return /\d/.test(str) && str.includes(',');
}

const CUSTOMER_PK_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  const { organization } = useAuth();
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
  const [quickTransferDialogOpen, setQuickTransferDialogOpen] = useState(false);
  const [recentCustomers, setRecentCustomers] = useState([]);
  const [warehouseConfirmDialogOpen, setWarehouseConfirmDialogOpen] = useState(false);
  const [parentCustomer, setParentCustomer] = useState(null); // { id, name, CustomerListID } when this customer is under a parent
  const [childCustomers, setChildCustomers] = useState([]);   // customers where parent_customer_id = this customer's id
  const [parentOptions, setParentOptions] = useState([]);     // for edit form "Under parent" selector
  const [customerDetailTab, setCustomerDetailTab] = useState(0); // 0 = Customer Info, 1 = Rental
  const [customerPricing, setCustomerPricing] = useState(null); // customer-specific pricing for this customer
  const [rentalSettingsDialog, setRentalSettingsDialog] = useState(false);
  const [rentalSettingsForm, setRentalSettingsForm] = useState({
    payment_terms: '',
    purchase_order: '',
    purchase_order_required: true,
    tax_region: '',
    daily_calculation_method: 'start_of_day',
    minimum_billable_amount: '5.00',
    rental_bill_format: 'default',
    tax_status: 'default'
  });
  const [rentalSettingsSaving, setRentalSettingsSaving] = useState(false);
  const [rentalClassRatesDialogOpen, setRentalClassRatesDialogOpen] = useState(false);
  const [classRatesDraft, setClassRatesDraft] = useState({});
  const [savingClassRates, setSavingClassRates] = useState(false);
  const [productSkuRatesDialogOpen, setProductSkuRatesDialogOpen] = useState(false);
  const [productSkuRatesDraft, setProductSkuRatesDraft] = useState({});
  const [productSkuExtraCode, setProductSkuExtraCode] = useState('');
  const [productSkuExtraMonthly, setProductSkuExtraMonthly] = useState('');
  const [savingProductSkuRates, setSavingProductSkuRates] = useState(false);
  const [negotiatedForm, setNegotiatedForm] = useState({ fixed_rate: '', discount_percent: '' });
  const [savingNegotiated, setSavingNegotiated] = useState(false);
  const [orgRentalClasses, setOrgRentalClasses] = useState([]);
  const [resolvingRnbId, setResolvingRnbId] = useState(null); // rental id being resolved (RNB close)
  const [resolvingRnsId, setResolvingRnsId] = useState(null); // rental id being resolved (RNS close)

  /**
   * Bottles for this account. Legacy import paths could have saved:
   *   - bottles.assigned_customer = CustomerListID (correct)
   *   - bottles.assigned_customer = display name
   *   - bottles.customer_id      = CustomerListID
   *   - bottles.customer_id      = display name
   *   - bottles.customer_name    = display name
   * Merge every match so no assignments disappear.
   */
  const fetchMergedBottlesForCustomer = useCallback(async (orgId, customerName, customerListId) => {
    const listId = (customerListId || id || '').toString().trim();
    const runs = await Promise.all([
      listId
        ? supabase.from('bottles').select('*').eq('organization_id', orgId).eq('assigned_customer', listId)
        : Promise.resolve({ data: [], error: null }),
      customerName
        ? supabase.from('bottles').select('*').eq('organization_id', orgId).eq('assigned_customer', customerName)
        : Promise.resolve({ data: [], error: null }),
      listId
        ? supabase.from('bottles').select('*').eq('organization_id', orgId).eq('customer_id', listId)
        : Promise.resolve({ data: [], error: null }),
      customerName
        ? supabase.from('bottles').select('*').eq('organization_id', orgId).eq('customer_id', customerName)
        : Promise.resolve({ data: [], error: null }),
      customerName
        ? supabase.from('bottles').select('*').eq('organization_id', orgId).eq('customer_name', customerName)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const map = new Map();
    runs.forEach(({ data, error }) => {
      if (error) return;
      (data || []).forEach((b) => {
        if (b?.id) map.set(b.id, b);
      });
    });
    return Array.from(map.values());
  }, [id]);

  /** Open rentals: customer_id may be List ID or (incorrectly) name; customer_name also matches. */
  const fetchMergedOpenRentalsForCustomer = useCallback(async (orgId, customerName, customerListId) => {
    const listId = (customerListId || id || '').toString().trim();
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
    const { data: rentalByName, error: rentalByNameError } = await supabase
      .from('rentals')
      .select('*')
      .eq('customer_name', customerName)
      .eq('organization_id', orgId)
      .is('rental_end_date', null);
    const { data: rentalByNameAsId, error: rentalByNameAsIdError } = await supabase
      .from('rentals')
      .select('*')
      .eq('customer_id', customerName)
      .eq('organization_id', orgId)
      .is('rental_end_date', null);
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
    push(rentalById);
    if (!rentalByNameError) push(rentalByName);
    if (!rentalByNameAsIdError) push(rentalByNameAsId);
    return merged;
  }, [id]);

  // Combine physical bottles with DNS (Delivered Not Scanned), RNB (Return not on balance), and RNS (Return not scanned)
  const dnsRentals = useMemo(() => (locationAssets || []).filter(r => r.is_dns), [locationAssets]);
  const rnbRentals = useMemo(() => dnsRentals.filter(r => (r.dns_description || '').includes('Return not on balance')), [dnsRentals]);
  const rnsRentals = useMemo(() => dnsRentals.filter(r => (r.dns_description || '').includes('Return not scanned')), [dnsRentals]);
  const dnsOnlyRentals = useMemo(() => dnsRentals.filter(r => {
    const desc = r.dns_description || '';
    return !desc.includes('Return not on balance') && !desc.includes('Return not scanned');
  }), [dnsRentals]);
  const dnsSummaryByType = useMemo(() => {
    const byType = {};
    (dnsOnlyRentals || []).forEach(r => {
      const type = r.dns_product_code || r.product_code || 'DNS';
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
    const physical = (customerAssets || []).map(a => ({ ...a, isDns: false }));
    const dnsRows = [...dnsOnlyRentals, ...rnbRentals].map(r => ({
      id: 'dns-' + r.id,
      serial_number: '—',
      barcode_number: (r.dns_description || '').includes('Return not on balance') ? (r.bottle_barcode || 'RNB') : (r.bottle_barcode || 'DNS'),
      type: r.dns_product_code || r.product_code || '—',
      description: r.dns_description || '',
      location: '—',
      isDns: true
    }));
    return [...physical, ...dnsRows];
  }, [customerAssets, dnsOnlyRentals, rnbRentals]);
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
        customer.CustomerListID
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
        customer.CustomerListID
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

  useEffect(() => {
    const fetchData = async () => {
      if (!organization?.id) {
        return;
      }
      setLoading(true);
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
        setEditForm(customerData);

        // Parent: customer under another (e.g. Stevenson Industrial Regina under Stevenson Industrial)
        if (customerData.parent_customer_id) {
          const { data: parentRow } = await supabase.from('customers').select('id, name, CustomerListID').eq('id', customerData.parent_customer_id).single();
          setParentCustomer(parentRow || null);
        } else {
          setParentCustomer(null);
        }
        // Children: locations/departments under this customer (e.g. Stevenson Industrial Regina, Saskatoon under Stevenson Industrial)
        if (customerData.id) {
          const { data: children } = await supabase.from('customers').select('id, name, CustomerListID').eq('parent_customer_id', customerData.id).order('name');
          setChildCustomers(children || []);
        } else {
          setChildCustomers([]);
        }
        
        const orgId = customerData.organization_id;
        const customerAssetsData = await fetchMergedBottlesForCustomer(
          orgId,
          customerData.name,
          customerData.CustomerListID
        );
        setCustomerAssets(customerAssetsData);
        
        setBottleSummary(summarizeBottlesByType(customerAssetsData || []));
        
        const merged = await fetchMergedOpenRentalsForCustomer(
          orgId,
          customerData.name,
          customerData.CustomerListID
        );
        // Backfill: assigned bottles with no rental record (e.g. assigned before rental creation was enforced)
        const bottleIdsWithRental = new Set(merged.map(r => r.bottle_id).filter(Boolean));
        const barcodesWithRental = new Set(merged.map(r => r.bottle_barcode).filter(Boolean));
        const bottlesWithoutRental = (customerAssetsData || []).filter(b => {
          const hasById = b.id && bottleIdsWithRental.has(b.id);
          const barcode = b.barcode_number || b.barcode;
          const hasByBarcode = barcode && barcodesWithRental.has(barcode);
          return !hasById && !hasByBarcode;
        });
        if (bottlesWithoutRental.length > 0) {
          const pricingCtx = await fetchOrgRentalPricingContext(supabase, customerData.organization_id);
          for (const bottle of bottlesWithoutRental) {
            const barcode = bottle.barcode_number || bottle.barcode;
            const rental_amount = monthlyRateForNewRental(customerData.CustomerListID, bottle, pricingCtx);
            await supabase.from('rentals').insert({
              organization_id: customerData.organization_id,
              customer_id: customerData.CustomerListID,
              customer_name: customerData.name,
              bottle_id: bottle.id,
              bottle_barcode: barcode,
              rental_start_date: bottle.rental_start_date || new Date().toISOString().split('T')[0],
              rental_end_date: null,
              rental_amount,
              rental_type: 'monthly',
              tax_rate: 0.11,
              location: bottle.location || 'SASKATOON',
              status: 'active',
              is_dns: false,
            });
          }
          const mergedAfterBackfill = await fetchMergedOpenRentalsForCustomer(
            orgId,
            customerData.name,
            customerData.CustomerListID
          );
          setLocationAssets(mergedAfterBackfill);
        } else {
          setLocationAssets(merged);
        }
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };
    fetchData();
  }, [
    id,
    customerDataVersion,
    organization?.id,
    fetchMergedBottlesForCustomer,
    fetchMergedOpenRentalsForCustomer,
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
    if (!customerPricing) {
      setNegotiatedForm({ fixed_rate: '', discount_percent: '' });
      return;
    }
    const fr = customerPricing.fixed_rate_override;
    const dp = customerPricing.discount_percent;
    setNegotiatedForm({
      fixed_rate: fr != null && fr !== '' ? String(fr) : '',
      discount_percent:
        dp != null && dp !== '' && Number.parseFloat(String(dp)) > 0 ? String(dp) : '',
    });
  }, [customerPricing]);

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

  const unifiedRentalClasses = useMemo(() => getUnifiedClasses(orgRentalClasses), [orgRentalClasses]);

  /** Match Rentals workspace: show class/customer pricing, not stale DB rental_amount. */
  const rentalHistoryDisplayRows = useMemo(() => {
    const orgRows = orgRentalClasses || [];
    const assets = customerAssets || [];
    return (locationAssets || []).map((rental) => {
      const isDNS = rental.is_dns === true;
      const isYearly = (rental.rental_type || 'monthly').toLowerCase() === 'yearly';
      if (isYearly) {
        const raw = parseFloat(String(rental.rental_amount ?? ''));
        return {
          rental,
          displayAmount: Number.isFinite(raw) ? raw : 0,
        };
      }
      // Respect explicit per-rental overrides saved from the Rentals edit dialog.
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
        bottle = assets.find(
          (b) =>
            (rental.bottle_id && b.id === rental.bottle_id) ||
            (rental.bottle_barcode &&
              (b.barcode_number || b.barcode) === rental.bottle_barcode)
        );
      }
      if (!bottle) {
        const raw = parseFloat(String(rental.rental_amount ?? ''));
        return { rental, displayAmount: Number.isFinite(raw) ? raw : 0 };
      }
      const amt = computeEffectiveMonthlyRate(customerPricing, bottle, orgRows);
      return { rental, displayAmount: Number.isFinite(amt) ? amt : 0 };
    });
  }, [locationAssets, customerAssets, customerPricing, orgRentalClasses]);

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
          customer?.CustomerListID
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
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleOpenRentalSettings = () => {
    setRentalSettingsForm({
      payment_terms: customer?.payment_terms ?? '',
      purchase_order: customer?.purchase_order ?? '',
      purchase_order_required: customer?.purchase_order_required !== false,
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

  const openRentalClassRatesDialog = () => {
    const stored = customerPricing?.rental_class_rates;
    const initial = {};
    unifiedRentalClasses.forEach((c) => {
      const ex = stored && typeof stored === 'object' ? stored[c.id] : null;
      initial[c.id] = {
        daily: ex?.daily != null && ex.daily !== '' ? String(ex.daily) : '',
        weekly: ex?.weekly != null && ex.weekly !== '' ? String(ex.weekly) : '',
        monthly: ex?.monthly != null && ex.monthly !== '' ? String(ex.monthly) : '',
      };
    });
    setClassRatesDraft(initial);
    setRentalClassRatesDialogOpen(true);
  };

  const formatMethodLabel = (m) => {
    if (m === 'starting_balance') return 'Starting balance';
    if (m === 'equipment') return 'Equipment';
    if (m === 'no_rent') return 'No rent';
    if (m === 'daily') return 'Daily';
    return m ? m.charAt(0).toUpperCase() + m.slice(1) : '—';
  };

  const handleSaveRentalClassRates = async () => {
    if (!organization?.id || !customer?.CustomerListID) return;
    setSavingClassRates(true);
    try {
      const rental_class_rates = {};
      unifiedRentalClasses.forEach((c) => {
        const d = classRatesDraft[c.id] || {};
        const entry = {};
        ['daily', 'weekly', 'monthly'].forEach((k) => {
          const raw = d[k];
          if (raw === '' || raw == null) return;
          const n = parseFloat(String(raw));
          if (Number.isFinite(n)) entry[k] = n;
        });
        if (Object.keys(entry).length > 0) rental_class_rates[c.id] = entry;
      });

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
          .update({ rental_class_rates })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('customer_pricing').insert({
          organization_id: organization.id,
          customer_id: customer.CustomerListID,
          discount_percent: 0,
          markup_percent: 0,
          rental_period: 'monthly',
          is_active: true,
          effective_date: new Date().toISOString().split('T')[0],
          rental_class_rates,
          rental_rates_by_product_code: {},
        });
        if (error) throw error;
      }

      const { data: refreshed, error: refErr } = await supabase
        .from('customer_pricing')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('customer_id', customer.CustomerListID)
        .maybeSingle();
      if (!refErr && refreshed) setCustomerPricing(refreshed);
      else setCustomerPricing((prev) => ({ ...(prev || {}), rental_class_rates }));

      invalidateOrgRentalPricingCache(organization.id);
      setRentalClassRatesDialogOpen(false);
      setTransferMessage({ open: true, message: 'Rental class rates saved.', severity: 'success' });
    } catch (e) {
      logger.error('Save rental class rates error:', e);
      const msg = e?.message || 'Failed to save rental class rates';
      const hint =
        /rental_class_rates|column/i.test(msg)
          ? ' Run sql/add_rental_class_rates_to_customer_pricing.sql in Supabase, then try again.'
          : '';
      setTransferMessage({ open: true, message: msg + hint, severity: 'error' });
    } finally {
      setSavingClassRates(false);
    }
  };

  const openProductSkuRatesDialog = () => {
    const stored =
      customerPricing?.rental_rates_by_product_code &&
      typeof customerPricing.rental_rates_by_product_code === 'object'
        ? customerPricing.rental_rates_by_product_code
        : {};
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
    const wrap = { rental_rates_by_product_code: stored };
    const initial = {};
    sorted.forEach((code) => {
      const hit = pickCustomerProductRateEntry(wrap, code);
      initial[code] = {
        monthly:
          hit?.monthly != null && Number.isFinite(Number(hit.monthly)) ? String(hit.monthly) : '',
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
      setTransferMessage({ open: true, message: 'Product code rates saved.', severity: 'success' });
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

  const handleSaveNegotiatedPricing = async () => {
    if (!organization?.id || !customer?.CustomerListID) return;
    const fixedRaw = negotiatedForm.fixed_rate.trim();
    const discRaw = negotiatedForm.discount_percent.trim();
    const fixedParsed = fixedRaw === '' ? null : Number.parseFloat(fixedRaw);
    const discParsed = discRaw === '' ? 0 : Number.parseFloat(discRaw);
    if (fixedParsed != null && (!Number.isFinite(fixedParsed) || fixedParsed < 0)) {
      setTransferMessage({ open: true, message: 'Fixed rate must be empty or a non-negative number.', severity: 'error' });
      return;
    }
    if (!Number.isFinite(discParsed) || discParsed < 0 || discParsed > 100) {
      setTransferMessage({ open: true, message: 'Discount must be between 0 and 100%.', severity: 'error' });
      return;
    }
    setSavingNegotiated(true);
    try {
      const { data: existing, error: selErr } = await supabase
        .from('customer_pricing')
        .select('id')
        .eq('organization_id', organization.id)
        .eq('customer_id', customer.CustomerListID)
        .maybeSingle();
      if (selErr) throw selErr;

      const patch = {
        fixed_rate_override: fixedParsed,
        discount_percent: discParsed,
      };

      if (existing?.id) {
        const { error } = await supabase.from('customer_pricing').update(patch).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('customer_pricing').insert({
          organization_id: organization.id,
          customer_id: customer.CustomerListID,
          ...patch,
          markup_percent: 0,
          rental_period: 'monthly',
          is_active: true,
          effective_date: new Date().toISOString().split('T')[0],
          rental_class_rates: {},
          rental_rates_by_product_code: {},
        });
        if (error) throw error;
      }

      const { data: refreshed, error: refErr } = await supabase
        .from('customer_pricing')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('customer_id', customer.CustomerListID)
        .maybeSingle();
      if (!refErr && refreshed) setCustomerPricing(refreshed);
      else
        setCustomerPricing((prev) => ({
          ...(prev || {}),
          fixed_rate_override: fixedParsed,
          discount_percent: discParsed,
        }));

      invalidateOrgRentalPricingCache(organization.id);
      setTransferMessage({ open: true, message: 'Customer-wide pricing saved.', severity: 'success' });
    } catch (e) {
      logger.error('Save negotiated pricing error:', e);
      setTransferMessage({
        open: true,
        message: e?.message || 'Failed to save customer-wide pricing',
        severity: 'error',
      });
    } finally {
      setSavingNegotiated(false);
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
      customer_type: editForm.customer_type || 'CUSTOMER',
      location: editForm.location || 'SASKATOON',
      department: (editForm.department || '').trim() || null,
      parent_customer_id: editForm.parent_customer_id || null,
      // Include barcode if provided (empty string allowed to clear)
      barcode: normalizedBarcode || null
    };
    const customerIdChanged = newCustomerListID !== id;
    if (customerIdChanged) {
      updateFields.CustomerListID = newCustomerListID;
    }
    const { error } = await supabase
      .from('customers')
      .update(updateFields)
      .eq('CustomerListID', id);
    if (error) {
      setSaveError(error.message);
      setSaving(false);
      return;
    }
    if (customerIdChanged) {
      const orgId = customer.organization_id;
      await supabase.from('bottles').update({ assigned_customer: newCustomerListID }).eq('assigned_customer', id).eq('organization_id', orgId);
      await supabase.from('rentals').update({ customer_id: newCustomerListID }).eq('customer_id', id).eq('organization_id', orgId);
      navigate(`/customer/${newCustomerListID}`, { replace: true });
    }
    setCustomer({ ...customer, ...updateFields });
    if (updateFields.parent_customer_id) {
      const { data: p } = await supabase.from('customers').select('id, name, CustomerListID').eq('id', updateFields.parent_customer_id).single();
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

  const detailMetrics = [
    {
      label: 'Assigned bottles',
      value: totalBottleCount,
      helper: 'Inventory and rental exceptions included in the customer total',
    },
    {
      label: 'Physical assets',
      value: customerAssets.length,
      helper: 'Containers physically assigned to this account',
    },
    {
      label: 'Child locations',
      value: childCustomers.length,
      helper: 'Subsidiary locations or departments linked here',
    },
    {
      label: 'Open rentals',
      value: locationAssets.length,
      helper: 'Live rental rows attached to this customer',
    },
  ];

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, width: '100%' }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3 },
          mb: 3,
          borderRadius: 3,
          border: '1px solid rgba(15, 23, 42, 0.08)',
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.25, flexWrap: 'wrap' }}>
              <Chip label="Customer detail" color="primary" size="small" sx={{ borderRadius: 999, fontWeight: 700 }} />
              <Chip label={customer.customer_type || 'CUSTOMER'} size="small" variant="outlined" sx={{ borderRadius: 999 }} />
              <Chip label={formatLocationDisplay(customer.location || 'SASKATOON')} size="small" variant="outlined" sx={{ borderRadius: 999 }} />
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em' }}>
              {customer.name}
            </Typography>
            <Typography variant="body1" sx={{ color: '#64748b', mt: 1, maxWidth: 760 }}>
              Review customer identity, structure, assigned inventory, rental activity, and transfer actions from one operational detail workspace.
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

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {detailMetrics.map((metric) => (
          <Grid item xs={12} sm={6} lg={3} key={metric.label}>
            <Paper
              elevation={0}
              sx={{
                p: 2.25,
                borderRadius: 2.5,
                border: '1px solid rgba(15, 23, 42, 0.08)',
                height: '100%',
                backgroundColor: '#fff',
              }}
            >
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {metric.label}
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f172a', mt: 0.5, letterSpacing: '-0.03em' }}>
                {metric.value}
              </Typography>
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
          mb: 3,
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', minHeight: 52 },
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
      <Paper elevation={0} sx={{ p: { xs: 2.5, md: 4 }, mb: 4, borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.08)', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)' }}>
        <Box display="flex" alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between" flexDirection={{ xs: 'column', md: 'row' }} mb={2}>
          <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
            <Typography variant="h5" fontWeight={700} color="primary">
              {editing ? (
                <TextField name="name" value={editForm.name || ''} onChange={handleEditChange} size="small" label="Name" sx={{ minWidth: 200 }} />
              ) : (
                customer.name
              )}
            </Typography>
            {!editing && (
              <Chip 
                label={customer.customer_type || 'CUSTOMER'} 
                color={customer.customer_type === 'VENDOR' ? 'secondary' : 'primary'} 
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
                getOptionLabel={(opt) => (opt && (opt.name || opt.CustomerListID || '')) || ''}
                value={parentOptions.find(o => o.id === editForm.parent_customer_id) || null}
                onChange={(_, v) => setEditForm({ ...editForm, parent_customer_id: v?.id ?? null })}
                renderInput={(params) => (
                  <TextField {...params} size="small" label="Under (parent customer)" placeholder="e.g. Stevenson Industrial" sx={{ mb: 2, minWidth: 220 }} />
                )}
                isOptionEqualToValue={(a, b) => (a?.id ?? null) === (b?.id ?? null)}
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
                label="Email" 
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
              <TextField name="phone" value={editForm.phone || ''} onChange={handleEditChange} size="small" label="Phone" sx={{ mb: 2, minWidth: 180 }} />
            ) : (
              <Typography variant="body1" sx={{ mb: 2 }}>{customer.phone || 'Not provided'}</Typography>
            )}
            
            <Typography variant="body2" color="text.secondary">Customer Type</Typography>
            {editing ? (
              <FormControl size="small" sx={{ mb: 2, minWidth: 180 }}>
                <InputLabel>Customer Type</InputLabel>
                <Select
                  name="customer_type"
                  value={editForm.customer_type || 'CUSTOMER'}
                  onChange={handleEditChange}
                  label="Customer Type"
                >
                  <MenuItem value="CUSTOMER">Customer</MenuItem>
                  <MenuItem value="VENDOR">Vendor</MenuItem>
                  <MenuItem value="TEMPORARY">Temporary (Walk-in)</MenuItem>
                </Select>
              </FormControl>
            ) : (
              <Typography component="div" variant="body1" sx={{ mb: 2 }}>
                <Chip 
                  label={customer.customer_type || 'CUSTOMER'} 
                  color={
                    customer.customer_type === 'VENDOR' ? 'secondary' : 
                    customer.customer_type === 'TEMPORARY' ? 'warning' : 'primary'
                  } 
                  size="small"
                  variant="outlined"
                />
              </Typography>
            )}
            
            <Typography variant="body2" color="text.secondary">Location</Typography>
            {editing ? (
              <FormControl size="small" sx={{ mb: 2, minWidth: 180 }}>
                <Select
                  name="location"
                  value={editForm.location || 'SASKATOON'}
                  onChange={handleEditChange}
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
                label="Department (optional)"
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
              <TextField name="contact_details" value={editForm.contact_details || ''} onChange={handleEditChange} size="small" label="Contact" sx={{ minWidth: 180 }} />
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
                • <strong>VENDOR</strong> - Does NOT get charged rental fees (business partner)
              </Typography>
            </Alert>
            
            <Box display="flex" gap={2} mt={3}>
              <Button variant="contained" color="primary" onClick={handleSave} disabled={saving}>
                {saving ? <CircularProgress size={20} /> : 'Save Changes'}
              </Button>
              <Button variant="outlined" color="secondary" onClick={() => { setEditing(false); setEditForm(customer); }} disabled={saving}>
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
        <Paper elevation={0} sx={{ p: { xs: 2.5, md: 4 }, mb: 4, borderRadius: 3, backgroundColor: '#f8fafc', border: '1px solid rgba(59, 130, 246, 0.16)' }}>
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
      <Paper elevation={0} sx={{ p: { xs: 2.5, md: 4 }, mb: 4, borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.08)', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)' }}>
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
              Total bottles: {totalBottleCount} ({customerAssets.length} physical{dnsOnlyRentals.length > 0 ? ` + ${dnsOnlyRentals.length} DNS` : ''}{rnbRentals.length > 0 ? `, ${rnbRentals.length} RNB not counted` : ''}{rnsRentals.length > 0 ? ` − ${rnsRentals.length} RNS` : ''})
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Currently Assigned Bottles (physical + DNS so we know how many the customer has) */}
      <Paper elevation={0} sx={{ p: { xs: 2.5, md: 4 }, mb: 4, borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.08)', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h5" fontWeight={700} color="primary">
              🏠 Currently Assigned Bottles ({totalBottleCount})
            </Typography>
            {(dnsOnlyRentals.length > 0 || rnbRentals.length > 0 || rnsRentals.length > 0) && (
              <Typography variant="body2" color="text.secondary">
                {customerAssets.length} physical
                {dnsOnlyRentals.length > 0 ? ` + ${dnsOnlyRentals.length} DNS` : ''}
                {rnbRentals.length > 0 ? ` (${rnbRentals.length} RNB return not on balance — not counted)` : ''}
                {rnsRentals.length > 0 ? ` − ${rnsRentals.length} RNS` : ''}
                {totalBottleCount !== customerAssets.length && (dnsOnlyRentals.length > 0 || rnsRentals.length > 0) && ` = ${totalBottleCount} total`}
              </Typography>
            )}
            {totalBottleCount === 0 && (
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
        
        {totalBottleCount === 0 ? (
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
                  .filter(asset => asset.isDns || locationFilter === 'all' || normalizeLocationKey(asset.location) === normalizeLocationKey(locationFilter))
                  .map((asset) => (
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
                          to={`/bottle/${asset.id}`}
                          style={{ color: '#1976d2', textDecoration: 'underline', cursor: 'pointer' }}
                        >
                          {asset.barcode_number}
                        </Link>
                      ) : ''}
                    </TableCell>
                    <TableCell>{asset.type || asset.description || 'Unknown'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={(() => {
                          const raw = asset.location || customer?.city || customer?.name || 'Unknown';
                          return raw === 'Unknown' ? raw : formatLocationDisplay(raw);
                        })()} 
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
                              : (asset.status === 'rented' || asset.status === 'RENTED') 
                                ? "Rented" 
                                : asset.status || "Rented"
                          }
                          color={
                            customer?.customer_type === 'VENDOR' ? 'default' : 
                            customer?.customer_type === 'TEMPORARY' ? 'warning' : 
                            (asset.status === 'rented' || asset.status === 'RENTED') ? 'success' : 'warning'
                          }
                          size="small"
                          icon={customer?.customer_type === 'VENDOR' ? <HomeIcon /> : null}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Rental History */}
      <Paper elevation={0} sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.08)', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 3 }}>
          <Typography variant="h5" fontWeight={700} color="primary">
            📋 Rental History ({locationAssets.length}{rnbRentals.length > 0 ? ` — ${totalBottleCount} billable` : ''})
          </Typography>
          {locationAssets.length > 0 && (
            <Button
              component={Link}
              to="/rentals"
              state={id ? { openEditForCustomerId: id } : undefined}
              variant="outlined"
              size="small"
            >
              Edit rental rates (per asset)
            </Button>
          )}
        </Box>
        {locationAssets.length > 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 900 }}>
            Rental amount uses your <strong>standard rate table</strong>, product/category matching, and this customer&apos;s pricing (same rules as the Rentals page). Stored database amounts may differ until the next save.
          </Typography>
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
                  const isRNB = isDNS && (rental.dns_description || '').includes('Return not on balance');
                  const isRNS = isDNS && (rental.dns_description || '').includes('Return not scanned');
                  const bottle = !isDNS && (customerAssets || []).find(
                    (b) => b.id === rental.bottle_id || (b.barcode_number || b.barcode) === rental.bottle_barcode
                  );
                  const typeProduct = bottle ? (bottle.type || bottle.description || bottle.product_code) : (rental.cylinder?.type || 'Unknown');
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
                              {rental.dns_description || 'Not Scanned'}
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
                          label={rental.location ? formatLocationDisplay(rental.location) : 'Unknown'} 
                          color="secondary" 
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{rental.rental_start_date || '-'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={isRNB ? 'RNB (Return not on balance)' : isRNS ? 'RNS (Return not scanned)' : isDNS ? 'DNS (Not Scanned)' : (rental.status || 'Active')} 
                          color={isRNB ? 'error' : isRNS ? 'default' : isDNS ? 'warning' : (rental.status === 'at_home' ? 'warning' : 'success')}
                          size="small"
                        />
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
                        {isDNS && !isRNB && (
                          <DNSConversionDialog
                            dnsRental={rental}
                            customerId={customer?.CustomerListID}
                            customerName={customer?.name}
                            onConverted={() => {
                              // Reload rentals (same as initial load: by customer_id and by customer_name for DNS)
                              const loadRentals = async () => {
                                const { data: rentalById } = await supabase
                                  .from('rentals')
                                  .select('*')
                                  .eq('customer_id', id)
                                  .eq('organization_id', customer?.organization_id)
                                  .is('rental_end_date', null);
                                const { data: rentalByName } = await supabase
                                  .from('rentals')
                                  .select('*')
                                  .eq('customer_name', customer?.name)
                                  .eq('organization_id', customer?.organization_id)
                                  .is('rental_end_date', null)
                                  .eq('is_dns', true);
                                const seen = new Set((rentalById || []).map(r => r.id));
                                const merged = [...(rentalById || [])];
                                (rentalByName || []).forEach(r => { if (!seen.has(r.id)) { seen.add(r.id); merged.push(r); } });
                                setLocationAssets(merged);
                              };
                              loadRentals();
                            }}
                          />
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
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Target Customer"
                  placeholder="Choose customer to transfer assets to..."
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
            Transfer History
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
        <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 4, border: '1.5px solid', borderColor: 'divider', boxShadow: '0 2px 12px 0 rgba(16,24,40,0.04)' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5" fontWeight={700} color="primary">Rental</Typography>
            <Button variant="outlined" startIcon={<EditIcon />} onClick={handleOpenRentalSettings} sx={{ borderRadius: 2, fontWeight: 700 }}>
              Edit rental settings
            </Button>
          </Box>
          <Divider sx={{ mb: 3 }} />

          <Typography variant="subtitle1" fontWeight={600} color="text.secondary" sx={{ mb: 2 }}>Rental rates</Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5, listStyle: 'none' }}>
            <Box component="li" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2">Organization standard rate table</Typography>
              <Button component={Link} to="/rental/classes" size="small" variant="text" color="primary">Manage</Button>
            </Box>
            <Box component="li" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2">Per-class rates for this customer</Typography>
              <Button size="small" variant="text" color="primary" onClick={openRentalClassRatesDialog}>
                Edit (e.g. lower skid / industrial)
              </Button>
            </Box>
            <Box component="li" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2">Rentals workspace</Typography>
              <Button component={Link} to="/rentals" state={{ openEditForCustomerId: id }} size="small" variant="text" color="primary">
                Open
              </Button>
            </Box>
            <Box component="li" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2">Daily calculation method</Typography>
              <Typography variant="body2" color="text.secondary">{rentalSettingsForm.daily_calculation_method === 'end_of_day' ? 'End of day' : 'Default (start of day)'}</Typography>
            </Box>
            <Box component="li" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2">Minimum billable amount</Typography>
              <Typography variant="body2" color="text.secondary">${rentalSettingsForm.minimum_billable_amount}, Default</Typography>
            </Box>
          </Box>

          <Typography variant="subtitle1" fontWeight={600} color="text.secondary" sx={{ mt: 3, mb: 1 }}>
            Customer-wide pricing
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 720 }}>
            <strong>Fixed monthly rate</strong> applies the same dollar amount to <em>every</em> billable monthly line for this customer and overrides class-based pricing (use for a simple negotiated flat).{' '}
            <strong>Discount %</strong> reduces the system default when no class rate applies. For different amounts by product group, use <strong>per-class rates</strong> below instead.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }} alignItems={{ sm: 'flex-start' }}>
            <TextField
              label="Fixed monthly rate (all cylinders)"
              type="number"
              size="small"
              value={negotiatedForm.fixed_rate}
              onChange={(e) => setNegotiatedForm((f) => ({ ...f, fixed_rate: e.target.value }))}
              inputProps={{ min: 0, step: 0.01 }}
              helperText="Leave empty to use class table + per-class overrides"
              sx={{ flex: 1, maxWidth: 280 }}
            />
            <TextField
              label="Discount % off default"
              type="number"
              size="small"
              value={negotiatedForm.discount_percent}
              onChange={(e) => setNegotiatedForm((f) => ({ ...f, discount_percent: e.target.value }))}
              inputProps={{ min: 0, max: 100, step: 0.5 }}
              helperText="0–100; used when class pricing does not apply"
              sx={{ flex: 1, maxWidth: 220 }}
            />
            <Button
              variant="contained"
              onClick={handleSaveNegotiatedPricing}
              disabled={savingNegotiated}
              sx={{ mt: { xs: 0, sm: 0.5 }, borderRadius: 2, fontWeight: 700, alignSelf: { sm: 'center' } }}
            >
              {savingNegotiated ? <CircularProgress size={22} color="inherit" /> : 'Save'}
            </Button>
          </Stack>

          <Typography variant="subtitle1" fontWeight={600} color="text.secondary" sx={{ mt: 3, mb: 1 }}>
            Rates by product code (SKU)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 720 }}>
            Price by <strong>inventory product code</strong>, not barcode. When this customer swaps to another cylinder with the same code, the monthly rate stays the same. Overrides class-based pricing for that SKU (does not apply if you set a customer-wide <strong>fixed monthly rate</strong> above).
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1} alignItems="center" sx={{ mb: 2 }}>
            <Button
              variant="outlined"
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
                No SKU-specific rates — class table applies
              </Typography>
            )}
          </Box>

          <Typography variant="subtitle1" fontWeight={600} color="text.secondary" sx={{ mt: 2, mb: 1 }}>
            Rental class rates
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 720 }}>
            Organization defaults come from the standard rate table. Use <strong>Edit rental class rates</strong> to adjust by <em>rental class</em> (group). Prefer <strong>product code</strong> above when each SKU should have its own negotiated price.
          </Typography>
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
            <Button variant="outlined" startIcon={<AttachMoneyIcon />} onClick={openRentalClassRatesDialog} sx={{ borderRadius: 2, fontWeight: 700 }}>
              Edit rental class rates
            </Button>
            {!customerPricing?.rental_class_rates || Object.keys(customerPricing.rental_class_rates).length === 0 ? (
              <Typography variant="caption" color="text.secondary">No customer overrides — org / built-in defaults apply</Typography>
            ) : (
              <Typography variant="caption" color="text.secondary">
                {Object.keys(customerPricing.rental_class_rates).length} customer bracket override(s)
              </Typography>
            )}
          </Box>
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 280, borderRadius: 2 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell><strong>Rental class</strong></TableCell>
                  <TableCell><strong>Method</strong></TableCell>
                  <TableCell><strong>Scope</strong></TableCell>
                  <TableCell align="right"><strong>Daily</strong></TableCell>
                  <TableCell align="right"><strong>Weekly</strong></TableCell>
                  <TableCell align="right"><strong>Monthly</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {unifiedRentalClasses.map((c) => {
                  const r = getResolvedClassRates(customerPricing?.rental_class_rates, c.id, orgRentalClasses);
                  const ov = customerPricing?.rental_class_rates?.[c.id];
                  const hasOverride = ov && typeof ov === 'object' && Object.keys(ov).length > 0;
                  const inOrg = orgRentalClasses.some((row) => String(row.id) === String(c.id));
                  const scope = hasOverride ? 'Customer' : inOrg ? 'Org default' : 'Built-in';
                  const fmt = (v) => (v != null && Number.isFinite(v) ? v.toFixed(3) : '—');
                  return (
                    <TableRow key={c.id} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatUnifiedClassLabel(c)}</TableCell>
                      <TableCell>{formatMethodLabel(c.method)}</TableCell>
                      <TableCell>
                        <Chip size="small" label={scope} variant="outlined" color={hasOverride ? 'primary' : 'default'} />
                      </TableCell>
                      <TableCell align="right">{fmt(r.daily)}</TableCell>
                      <TableCell align="right">{fmt(r.weekly)}</TableCell>
                      <TableCell align="right">{fmt(r.monthly)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="subtitle1" fontWeight={600} color="text.secondary" sx={{ mt: 3, mb: 2 }}>Other billing methods</Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5, listStyle: 'none' }}>
            <Box component="li" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2">Flat fees</Typography>
              <Button component={Link} to="/rentals" size="small" variant="text" color="primary">Rentals workspace</Button>
            </Box>
            <Box component="li" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2">Asset agreements</Typography>
              <Typography variant="body2" color="text.secondary">None set — Add</Typography>
            </Box>
          </Box>

          <Typography variant="subtitle1" fontWeight={600} color="text.secondary" sx={{ mt: 3, mb: 2 }}>Other settings</Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5, listStyle: 'none' }}>
            <Box component="li" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2">Payment terms</Typography>
              <Typography variant="body2" color="text.secondary">{customer?.payment_terms || 'Not set'}</Typography>
            </Box>
            <Box component="li" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: customer?.purchase_order ? 'transparent' : 'warning.light', px: 1.5, borderRadius: 1 }}>
              <Typography variant="body2">Purchase order</Typography>
              <Typography variant="body2" fontWeight={customer?.purchase_order ? 400 : 600}>
                {customer?.purchase_order ? `${customer.purchase_order} (Required)` : 'Not set (Required)'}
              </Typography>
              <Button size="small" variant="text" color="primary" onClick={handleOpenRentalSettings}>Change</Button>
            </Box>
            <Box component="li" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2">Tax region</Typography>
              <Typography variant="body2" color="text.secondary">{customer?.location ? formatLocationDisplay(customer.location) : 'SSK'}</Typography>
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
            <FormControl fullWidth size="small">
              <InputLabel>Payment terms</InputLabel>
              <Select
                value={rentalSettingsForm.payment_terms || ''}
                onChange={(e) => setRentalSettingsForm(f => ({ ...f, payment_terms: e.target.value }))}
                label="Payment terms"
              >
                <MenuItem value="">Not set</MenuItem>
                <MenuItem value="CREDIT CARD">Credit card</MenuItem>
                <MenuItem value="Net 15">Net 15</MenuItem>
                <MenuItem value="Net 30">Net 30</MenuItem>
                <MenuItem value="Net 60">Net 60</MenuItem>
                <MenuItem value="Due on receipt">Due on receipt</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              size="small"
              label="Purchase order (required)"
              value={rentalSettingsForm.purchase_order || ''}
              onChange={(e) => setRentalSettingsForm(f => ({ ...f, purchase_order: e.target.value }))}
              placeholder="e.g. P000021880"
            />
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
        open={rentalClassRatesDialogOpen}
        onClose={() => setRentalClassRatesDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Edit rental class rates</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Leave blank to keep the organization or built-in default for that class. These values are customer-specific overrides only.
          </Typography>
          <TableContainer sx={{ maxHeight: 420 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell><strong>Class</strong></TableCell>
                  <TableCell><strong>Method</strong></TableCell>
                  <TableCell align="right"><strong>Daily</strong></TableCell>
                  <TableCell align="right"><strong>Weekly</strong></TableCell>
                  <TableCell align="right"><strong>Monthly</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {unifiedRentalClasses.map((c) => {
                  const row = classRatesDraft[c.id] || { daily: '', weekly: '', monthly: '' };
                  const setField = (field, val) => {
                    setClassRatesDraft((prev) => ({
                      ...prev,
                      [c.id]: { ...(prev[c.id] || {}), [field]: val },
                    }));
                  };
                  const methodNorm = ((c.method ?? 'monthly') + '').trim().toLowerCase() || 'monthly';
                  const showDailyCol = methodNorm === 'equipment' || methodNorm === 'daily';
                  const showWeeklyCol = methodNorm === 'equipment';
                  // Monthly override always; equipment gets D/W/M; daily-method classes get daily + monthly (TrackAbout-style)
                  return (
                    <TableRow key={c.id}>
                      <TableCell sx={{ maxWidth: 260, whiteSpace: 'normal', wordBreak: 'break-word' }}>{formatUnifiedClassLabel(c)}</TableCell>
                      <TableCell>{formatMethodLabel(c.method)}</TableCell>
                      <TableCell align="right">
                        {showDailyCol ? (
                          <TextField
                            size="small"
                            type="number"
                            inputProps={{ min: 0, step: 0.001 }}
                            value={row.daily}
                            onChange={(e) => setField('daily', e.target.value)}
                            sx={{ width: 100 }}
                          />
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {showWeeklyCol ? (
                          <TextField
                            size="small"
                            type="number"
                            inputProps={{ min: 0, step: 0.001 }}
                            value={row.weekly}
                            onChange={(e) => setField('weekly', e.target.value)}
                            sx={{ width: 100 }}
                          />
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          size="small"
                          type="number"
                          inputProps={{ min: 0, step: 0.001 }}
                          value={row.monthly}
                          onChange={(e) => setField('monthly', e.target.value)}
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRentalClassRatesDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveRentalClassRates} disabled={savingClassRates}>
            {savingClassRates ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={productSkuRatesDialogOpen}
        onClose={() => setProductSkuRatesDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Rates by product code</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Monthly rent per SKU on this customer. Clear a field to remove the override and fall back to class pricing. You can prefix-match longer codes (e.g. key <code>BOX300</code> applies to <code>BOX300-16PK</code>) using the same rules as the org rate table.
          </Typography>
          <TableContainer sx={{ maxHeight: 360 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell><strong>Product code</strong></TableCell>
                  <TableCell align="right"><strong>On hand</strong></TableCell>
                  <TableCell align="right"><strong>Monthly ($)</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.keys(productSkuRatesDraft)
                  .sort((a, b) => a.localeCompare(b))
                  .map((code) => {
                    const row = productSkuRatesDraft[code] || { monthly: '' };
                    const onHand = (customerAssets || []).filter(
                      (b) => (b.product_code || '').trim() === code
                    ).length;
                    return (
                      <TableRow key={code}>
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
                            sx={{ width: 120 }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </TableContainer>
          {Object.keys(productSkuRatesDraft).length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
              No product codes yet. Add a SKU below (e.g. before inventory arrives).
            </Typography>
          )}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }} alignItems={{ sm: 'flex-end' }}>
            <TextField
              size="small"
              label="Add product code"
              value={productSkuExtraCode}
              onChange={(e) => setProductSkuExtraCode(e.target.value)}
              sx={{ flex: 1 }}
            />
            <TextField
              size="small"
              label="Monthly ($)"
              type="number"
              inputProps={{ min: 0, step: 0.01 }}
              value={productSkuExtraMonthly}
              onChange={(e) => setProductSkuExtraMonthly(e.target.value)}
              sx={{ width: 140 }}
            />
            <Button
              variant="outlined"
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
            >
              Add row
            </Button>
          </Stack>
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