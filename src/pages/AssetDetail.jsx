import logger from '../utils/logger';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Stack,
  Typography,
  Paper,
  Grid,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Divider,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import { useDynamicAssetTerms } from '../hooks/useDynamicAssetTerms';
import { bottleLocationValueForCustomer, formatLocationDisplay, normalizeLocationKey } from '../utils/locationDisplay';

// Same derivation as Inventory (Assets) page - group by product_code when present so one row per code
function deriveInventoryGasTypes(bottles) {
  const assetMap = new Map();
  function cleanedLabel(bottle) {
    let gasType = bottle.description || bottle.product_code || bottle.gas_type || bottle.type;
    if (gasType) {
      gasType = gasType
        .replace(/^AVIATOR\s+/i, '')
        .replace(/\s+BOTTLE.*$/i, '')
        .replace(/\s+ASSET.*$/i, '')
        .replace(/\s+SIZE\s+\d+.*$/i, '')
        .replace(/\s+-\s+SIZE\s+\d+.*$/i, '')
        .replace(/\s+ASSETS.*$/i, '')
        .trim();
      if (gasType.length < 3) gasType = bottle.description || bottle.product_code || bottle.gas_type || bottle.type;
    }
    return gasType || 'Unknown Gas Type';
  }
  bottles.forEach((bottle) => {
    const normalizedCode = bottle.product_code && bottle.product_code.trim() ? bottle.product_code.trim() : null;
    const groupingKey = normalizedCode || cleanedLabel(bottle);
    if (!assetMap.has(groupingKey)) assetMap.set(groupingKey, []);
    assetMap.get(groupingKey).push(bottle);
  });
  return Array.from(assetMap.keys()).filter(Boolean).sort((a, b) => (a || '').localeCompare(b || ''));
}

// Only 4 statuses: Full, Empty, Rented, Lost (stored as filled, empty, rented, lost)
const NORMAL_STATUSES = ['filled', 'empty', 'rented', 'lost'];
const normalizeStatus = (s) => {
  if (s == null || s === '') return 'empty';
  const v = String(s).toLowerCase().trim();
  if (['filled', 'full', 'available'].includes(v)) return 'filled';
  if (v === 'empty') return 'empty';
  if (v === 'rented') return 'rented';
  if (v === 'lost') return 'lost';
  return 'empty';
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const toStartOfDay = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const sameCustomer = (record, assignedCustomerId, customerName) => {
  const recId = String(record?.customer_id || record?.assigned_customer || '').trim();
  const recName = String(record?.customer_name || '').trim().toLowerCase();
  const targetId = String(assignedCustomerId || '').trim();
  const targetName = String(customerName || '').trim().toLowerCase();
  if (targetId && recId && recId === targetId) return true;
  if (targetName && recName && recName === targetName) return true;
  return false;
};

const modeIndicatesDelivery = (record) => {
  const mode = String(record?.mode || record?.action || '').trim().toUpperCase();
  return mode === 'SHIP' || mode === 'DELIVERY' || mode === 'OUT';
};

const TRACKED_BOTTLE_FIELDS = [
  'barcode_number',
  'serial_number',
  'product_code',
  'gas_type',
  'status',
  'location',
  'assigned_customer',
  'customer_name',
  'ownership',
  'description',
];

const normalizeComparableValue = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }
  return value;
};

const valuesDiffer = (a, b) => JSON.stringify(normalizeComparableValue(a)) !== JSON.stringify(normalizeComparableValue(b));

const buildBottleFieldChanges = (previousBottle, updatedFields) => {
  const changes = {};
  TRACKED_BOTTLE_FIELDS.forEach((field) => {
    if (!(field in updatedFields)) return;
    const from = normalizeComparableValue(previousBottle?.[field]);
    const to = normalizeComparableValue(updatedFields?.[field]);
    if (!valuesDiffer(from, to)) return;
    changes[field] = { from, to };
  });
  return changes;
};

const stringifyHistoryDetails = (details) => {
  if (!details) return '';
  if (typeof details === 'string') return details;
  if (details.field_changes && typeof details.field_changes === 'object') {
    const lines = Object.entries(details.field_changes).map(([field, change]) => {
      const from = change?.from == null ? 'empty' : String(change.from);
      const to = change?.to == null ? 'empty' : String(change.to);
      return `${field}: ${from} -> ${to}`;
    });
    if (lines.length > 0) return lines.join(' | ');
  }
  try {
    return JSON.stringify(details);
  } catch {
    return String(details);
  }
};

export default function AssetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { terms, isReady } = useDynamicAssetTerms();

  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [locations, setLocations] = useState([]);
  const [ownershipValues, setOwnershipValues] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [loadingExceptions, setLoadingExceptions] = useState(false);
  const [movementHistory, setMovementHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [customerData, setCustomerData] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [gasTypes, setGasTypes] = useState([]);

  const logBottleAuditEvent = async ({ action, details, bottleId = null }) => {
    if (!profile?.organization_id || !bottleId) return;
    const basePayload = {
      organization_id: profile.organization_id,
      user_id: profile?.id || null,
      action,
      details,
      created_at: new Date().toISOString(),
    };
    const tableAwarePayload = {
      ...basePayload,
      table_name: 'bottles',
      record_id: bottleId,
    };
    const { error } = await supabase.from('audit_logs').insert(tableAwarePayload);
    if (error) {
      logger.warn('Primary bottle audit insert failed, retrying minimal payload:', error);
      const { error: fallbackError } = await supabase.from('audit_logs').insert(basePayload);
      if (fallbackError) {
        logger.error('Failed to write bottle audit log:', fallbackError);
      }
    }
  };

  const derivedDaysAtLocation = React.useMemo(() => {
    if (!asset?.assigned_customer || !movementHistory.length) {
      return asset?.days_at_location || 0;
    }

    const latestCustomerDelivery = movementHistory
      .filter((record) => modeIndicatesDelivery(record) && sameCustomer(record, asset.assigned_customer, asset.customer_name))
      .map((record) => toStartOfDay(record.created_at))
      .filter(Boolean)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    if (!latestCustomerDelivery) return asset?.days_at_location || 0;

    const today = toStartOfDay(new Date());
    const diffDays = Math.floor((today.getTime() - latestCustomerDelivery.getTime()) / MS_PER_DAY);
    return Math.max(0, diffDays);
  }, [asset?.assigned_customer, asset?.customer_name, asset?.days_at_location, movementHistory]);

  useEffect(() => {
    fetchAssetDetail();
    fetchLocations();
    fetchCustomers();
    fetchGasTypes();
    if (profile?.organization_id) {
      fetchOwnershipValues();
    }
    if (id) {
      fetchExceptions();
    }
  }, [id, profile?.organization_id]);

  // Fetch movement history when asset is loaded
  useEffect(() => {
    if (asset?.barcode_number || asset?.serial_number) {
      fetchMovementHistory();
    }
  }, [asset?.barcode_number, asset?.serial_number, profile?.organization_id]);

  // Fetch customer data when assigned_customer changes
  useEffect(() => {
    if (asset?.assigned_customer) {
      fetchCustomerData(asset.assigned_customer);
    } else {
      setCustomerData(null);
    }
  }, [asset?.assigned_customer, profile?.organization_id]);

  const fetchAssetDetail = async () => {
    try {
      setLoading(true);
      
      // CRITICAL SECURITY: Must filter by organization_id to prevent cross-organization data access
      if (!profile?.organization_id) {
        throw new Error('Organization not found. Please log in again.');
      }
      
      const { data, error } = await supabase
        .from('bottles')
        .select('id, barcode_number, serial_number, product_code, gas_type, status, location, assigned_customer, customer_name, ownership, description, organization_id, created_at, days_at_location, type, category')
        .eq('id', id)
        .eq('organization_id', profile.organization_id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Asset not found or you do not have permission to view it');
        }
        throw error;
      }
      
      // SECURITY CHECK: Double-verify the asset belongs to the user's organization
      if (data && data.organization_id !== profile.organization_id) {
        throw new Error('Unauthorized: This asset belongs to a different organization');
      }
      
      setAsset(data);
      // Only set editData with fields that can be edited (exclude system fields like id, organization_id, created_at, updated_at, etc.)
      setEditData({
        barcode_number: data.barcode_number || '',
        serial_number: data.serial_number || '',
        product_code: data.product_code || '',
        gas_type: data.gas_type || '',
        status: normalizeStatus(data.status),
        location: data.location || '',
        assigned_customer: data.assigned_customer || '',
        customer_name: data.customer_name || '',
        ownership: data.ownership || '',
        description: data.description || ''
      });
      
      // Fetch customer data if bottle is assigned to a customer
      if (data?.assigned_customer) {
        fetchCustomerData(data.assigned_customer);
      }
      
      // Movement history is fetched by the useEffect when asset state is set
    } catch (error) {
      logger.error('Error fetching asset:', error);
      setError(error.message || 'Failed to load asset details');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoadingCustomers(true);
      if (!profile?.organization_id) return;

      const { data, error } = await supabase
        .from('customers')
        .select('CustomerListID, name, customer_type, location, city')
        .eq('organization_id', profile.organization_id)
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      logger.error('Error fetching customers:', error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Build the same Gas Type list as Inventory (/inventory) from this org's bottles
  const fetchGasTypes = async () => {
    try {
      if (!profile?.organization_id) return;
      const { data: bottles, error } = await supabase
        .from('bottles')
        .select('product_code, description, gas_type, type')
        .eq('organization_id', profile.organization_id);

      if (error) throw error;
      const list = deriveInventoryGasTypes(bottles || []);
      setGasTypes(list);
    } catch (err) {
      logger.error('Error fetching gas types from inventory:', err);
    }
  };

  const fetchLocations = async () => {
    try {
      let query = supabase.from('locations').select('id, name, province').order('name');
      if (profile?.organization_id) {
        query = query.eq('organization_id', profile.organization_id);
      }
      const { data, error } = await query;

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      logger.error('Error fetching locations:', error);
      // Fallback to hardcoded locations if database fails
      setLocations([
        { id: 'saskatoon', name: 'Saskatoon', province: 'Saskatchewan' },
        { id: 'regina', name: 'Regina', province: 'Saskatchewan' },
        { id: 'chilliwack', name: 'Chilliwack', province: 'British Columbia' },
        { id: 'prince-george', name: 'Prince George', province: 'British Columbia' }
      ]);
    }
  };

  const fetchExceptions = async () => {
    try {
      setLoadingExceptions(true);
      if (!profile?.organization_id || !id) return;

      const { data, error } = await supabase
        .from('asset_exceptions')
        .select('*')
        .eq('asset_id', id)
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching exceptions:', error);
        return;
      }

      setExceptions(data || []);
    } catch (error) {
      logger.error('Error fetching exceptions:', error);
    } finally {
      setLoadingExceptions(false);
    }
  };

  const fetchCustomerData = async (customerHint) => {
    try {
      if (!profile?.organization_id || !customerHint) return;

      // assigned_customer may be a CustomerListID OR (from legacy import paths) a display name.
      // Try ID first, then fall back to name lookup so the linked customer card still appears.
      const byId = await supabase
        .from('customers')
        .select('CustomerListID, name, location, city')
        .eq('CustomerListID', customerHint)
        .eq('organization_id', profile.organization_id)
        .maybeSingle();

      if (byId.data) {
        setCustomerData(byId.data);
        return;
      }

      const byName = await supabase
        .from('customers')
        .select('CustomerListID, name, location, city')
        .eq('name', customerHint)
        .eq('organization_id', profile.organization_id)
        .maybeSingle();

      if (byName.data) {
        setCustomerData(byName.data);
        return;
      }

      setCustomerData(null);
    } catch (error) {
      logger.error('Error fetching customer data:', error);
    }
  };

  const fetchOwnershipValues = async () => {
    try {
      if (!profile?.organization_id) return;
      
      // Try to fetch from ownership_values table
      const { data, error } = await supabase
        .from('ownership_values')
        .select('value')
        .eq('organization_id', profile.organization_id)
        .order('value');
      
      if (error && error.code !== 'PGRST116') {
        // If error is not "table doesn't exist", log it
        logger.error('Error fetching ownership values:', error);
      }
      
      if (data && data.length > 0) {
        setOwnershipValues(data.map(item => item.value));
      } else {
        // Fallback: Extract unique ownership values from bottles
        const { data: bottlesData } = await supabase
          .from('bottles')
          .select('ownership')
          .eq('organization_id', profile.organization_id)
          .not('ownership', 'is', null)
          .not('ownership', 'eq', '');
        
        const uniqueValues = [...new Set(bottlesData?.map(b => b.ownership).filter(Boolean))];
        setOwnershipValues(uniqueValues.sort());
      }
    } catch (error) {
      logger.error('Error fetching ownership values:', error);
    }
  };

  const fetchMovementHistory = async () => {
    try {
      setLoadingHistory(true);
      if (!profile?.organization_id || !asset) {
        setLoadingHistory(false);
        return;
      }

      const barcodeNumber = asset.barcode_number;
      const serialNumber = asset.serial_number;
      
      if (!barcodeNumber && !serialNumber) {
        setMovementHistory([]);
        setLoadingHistory(false);
        return;
      }

      let allHistory = [];
      const nowIso = new Date().toISOString();
      const isMissingSourceError = (err) => {
        const msg = String(err?.message || '').toLowerCase();
        return (
          msg.includes('does not exist') ||
          msg.includes('could not find the table') ||
          msg.includes('relation') ||
          msg.includes('schema cache')
        );
      };
      const runOptionalQuery = async (queryFactory, sourceLabel) => {
        try {
          const { data, error } = await queryFactory();
          if (error) {
            if (!isMissingSourceError(error)) {
              logger.warn(`Movement history optional source failed (${sourceLabel}):`, error);
            }
            return [];
          }
          return data || [];
        } catch (err) {
          if (!isMissingSourceError(err)) {
            logger.warn(`Movement history optional source threw (${sourceLabel}):`, err);
          }
          return [];
        }
      };

      // Fetch from bottle_scans (single source for movement history)
      if (barcodeNumber) {
        const { data: bsData, error: bsError } = await supabase
          .from('bottle_scans')
          .select('*')
          .or(`barcode_number.eq.${barcodeNumber},bottle_barcode.eq.${barcodeNumber},cylinder_barcode.eq.${barcodeNumber}`)
          .eq('organization_id', profile.organization_id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (!bsError && bsData) {
          bsData.forEach(scan => {
            allHistory.push({
              ...scan,
              history_type: 'bottle_scan',
              barcode_number: scan.barcode_number || scan.bottle_barcode,
              action: scan.mode || 'SCAN'
            });
          });
        }
      }

      // Include older/parallel scan stream if present
      if (barcodeNumber) {
        const cylinderScanRows = await runOptionalQuery(
          () =>
            supabase
              .from('cylinder_scans')
              .select('*')
              .or(`barcode_number.eq.${barcodeNumber},cylinder_barcode.eq.${barcodeNumber},bottle_barcode.eq.${barcodeNumber}`)
              .eq('organization_id', profile.organization_id)
              .order('created_at', { ascending: false })
              .limit(50),
          'cylinder_scans'
        );
        cylinderScanRows.forEach((scan) => {
          allHistory.push({
            ...scan,
            id: scan.id || `${scan.created_at || nowIso}_cylinder_scan`,
            history_type: 'cylinder_scan',
            barcode_number: scan.barcode_number || scan.cylinder_barcode || scan.bottle_barcode || barcodeNumber,
            customer_id: scan.customer_id || null,
            customer_name: scan.customer_name || null,
            location: scan.location || null,
            created_at: scan.created_at || scan.timestamp || nowIso,
            action: scan.mode || scan.action || 'SCAN',
            mode: scan.mode || scan.action || 'SCAN',
            order_number: scan.order_number || scan.invoice_number || null
          });
        });
      }

      // 3. Fetch from rentals table (for shipment/return dates)
      if (barcodeNumber) {
        const { data: rentalsData, error: rentalsError } = await supabase
          .from('rentals')
          .select('*')
          .or(`bottle_barcode.eq.${barcodeNumber},bottle_id.eq.${asset.id}`)
          .eq('organization_id', profile.organization_id)
          .order('rental_start_date', { ascending: false })
          .limit(50);

        if (!rentalsError && rentalsData) {
          rentalsData.forEach(rental => {
            const isRNB = rental.is_dns === true && (rental.dns_description || '').includes('Return not on balance');
            // Add rental start (shipment) — RNB is not a delivery, show as RNB
            if (rental.rental_start_date) {
              allHistory.push({
                id: `rental_start_${rental.id}`,
                history_type: isRNB ? 'rental_rnb' : 'rental_start',
                barcode_number: rental.bottle_barcode || barcodeNumber,
                customer_id: rental.customer_id,
                customer_name: rental.customer_name,
                location: rental.location,
                created_at: rental.rental_start_date,
                action: isRNB ? 'RNB' : 'SHIP',
                mode: isRNB ? 'RNB' : 'SHIP',
                order_number: rental.dns_order_number || rental.order_number || null
              });
            }
            // Add rental end (return)
            if (rental.rental_end_date) {
              allHistory.push({
                id: `rental_end_${rental.id}`,
                history_type: 'rental_end',
                barcode_number: rental.bottle_barcode || barcodeNumber,
                customer_id: rental.customer_id,
                customer_name: rental.customer_name,
                location: rental.location,
                created_at: rental.rental_end_date,
                action: 'RETURN',
                mode: 'RETURN',
                order_number: rental.order_number || null
              });
            }
          });
        }
      }

      // Include exceptions as timeline events so users can see non-scan changes
      if (asset.id && profile?.organization_id) {
        const exceptionRows = await runOptionalQuery(
          () =>
            supabase
              .from('asset_exceptions')
              .select('*')
              .eq('asset_id', asset.id)
              .eq('organization_id', profile.organization_id)
              .order('created_at', { ascending: false })
              .limit(50),
          'asset_exceptions'
        );
        exceptionRows.forEach((item) => {
          allHistory.push({
            ...item,
            id: `exception_${item.id}`,
            history_type: 'exception',
            barcode_number: barcodeNumber,
            customer_id: item.customer_id || null,
            customer_name: item.customer_name || null,
            location: item.location || asset.location || null,
            created_at: item.created_at || nowIso,
            action: item.exception_type ? `EXCEPTION: ${item.exception_type}` : 'EXCEPTION',
            mode: item.resolution_status || 'EXCEPTION',
            notes: item.resolution_note || item.notes || null,
            order_number: item.order_number || null
          });
        });
      }

      // Optional transfer activity source
      if (profile?.organization_id && (asset.id || barcodeNumber)) {
        const transferRows = await runOptionalQuery(
          () =>
            supabase
              .from('transfer_history')
              .select('*')
              .eq('organization_id', profile.organization_id)
              .or(`bottle_id.eq.${asset.id},bottle_barcode.eq.${barcodeNumber}`)
              .order('created_at', { ascending: false })
              .limit(50),
          'transfer_history'
        );
        transferRows.forEach((item) => {
          allHistory.push({
            ...item,
            id: `transfer_${item.id}`,
            history_type: 'transfer',
            barcode_number: item.bottle_barcode || barcodeNumber,
            customer_id: item.customer_id || null,
            customer_name: item.customer_name || null,
            location: item.to_location || item.location || item.from_location || null,
            created_at: item.created_at || item.transfer_date || nowIso,
            action: item.action || item.transfer_type || 'TRANSFER',
            mode: 'TRANSFER',
            notes: item.notes || null,
            order_number: item.order_number || null
          });
        });
      }

      // Optional audit source for direct bottle edits
      if (profile?.organization_id && asset.id) {
        let auditRows = await runOptionalQuery(
          () =>
            supabase
              .from('audit_logs')
              .select('*')
              .eq('organization_id', profile.organization_id)
              .eq('table_name', 'bottles')
              .eq('record_id', asset.id)
              .order('created_at', { ascending: false })
              .limit(50),
          'audit_logs'
        );
        if (!auditRows.length) {
          auditRows = await runOptionalQuery(
            () =>
              supabase
                .from('audit_logs')
                .select('*')
                .eq('organization_id', profile.organization_id)
                .eq('record_id', asset.id)
                .order('created_at', { ascending: false })
                .limit(50),
            'audit_logs_fallback'
          );
        }
        auditRows.forEach((item) => {
          allHistory.push({
            ...item,
            id: `audit_${item.id}`,
            history_type: 'audit',
            barcode_number: barcodeNumber,
            customer_id: null,
            customer_name: null,
            location: item.location || asset.location || null,
            created_at: item.created_at || nowIso,
            action: item.action ? `AUDIT: ${item.action}` : 'AUDIT UPDATE',
            mode: item.action || 'AUDIT',
            notes: stringifyHistoryDetails(item.details),
            details: item.details || null,
            order_number: item.order_number || null
          });
        });
      }

      // 4. Fetch from cylinder_fills table (for fill history)
      if (barcodeNumber || asset.id) {
        const orClauses = [];
        if (barcodeNumber) orClauses.push(`barcode_number.eq.${barcodeNumber}`);
        if (asset.id) orClauses.push(`cylinder_id.eq.${asset.id}`);

        let fillsQuery = supabase
          .from('cylinder_fills')
          .select('*')
          .or(orClauses.join(','))
          .order('fill_date', { ascending: false })
          .limit(50);
        if (profile?.organization_id) {
          fillsQuery = fillsQuery.eq('organization_id', profile.organization_id);
        }
        const { data: fillsData, error: fillsError } = await fillsQuery;

        if (!fillsError && fillsData) {
          fillsData.forEach(fill => {
            allHistory.push({
              id: `fill_${fill.id}`,
              history_type: 'fill',
              barcode_number: fill.barcode_number || barcodeNumber,
              created_at: fill.fill_date || fill.created_at,
              action: 'FILL',
              mode: 'FILL',
              filled_by: fill.filled_by,
              notes: fill.notes
            });
          });
        }
      }

      // 5. Add bottle creation as "Add New Asset" if we have created_at
      if (asset.created_at) {
        allHistory.push({
          id: 'bottle_created',
          history_type: 'creation',
          barcode_number: barcodeNumber,
          created_at: asset.created_at,
          action: 'Add New Asset',
          mode: 'CREATE',
          location: asset.location
        });
      }
      if (asset.updated_at && asset.created_at && new Date(asset.updated_at).getTime() !== new Date(asset.created_at).getTime()) {
        allHistory.push({
          id: 'bottle_last_updated',
          history_type: 'record_update',
          barcode_number: barcodeNumber,
          created_at: asset.updated_at,
          action: 'Asset Record Updated',
          mode: 'UPDATE',
          location: asset.location
        });
      }

      // Deduplicate by created_at and action type
      const uniqueHistory = allHistory.reduce((acc, item) => {
        const key = `${item.created_at}_${item.action || item.mode}_${item.history_type || ''}`;
        if (!acc.find(existing => {
          const existingKey = `${existing.created_at}_${existing.action || existing.mode}_${existing.history_type || ''}`;
          return existingKey === key;
        })) {
          acc.push(item);
        }
        return acc;
      }, []);

      // Sort by date, most recent first
      uniqueHistory.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setMovementHistory(uniqueHistory.slice(0, 50));
    } catch (error) {
      logger.error('Error fetching movement history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      // SECURITY: Verify user has permission to update this asset
      if (!profile?.organization_id) {
        throw new Error('Organization not found');
      }
      
      // Track if assignment changed
      const previousCustomer = asset.assigned_customer;
      const previousCustomerName = asset.customer_name;
      const previousLocation = asset.location;
      
      // Determine status: respect user's choice unless assignment changed
      let finalStatus = editData.status;
      const assignmentChanged = previousCustomer !== (editData.assigned_customer || null) && String(editData.assigned_customer || '').trim() !== String(previousCustomer || '').trim();
      const ownershipValue = String(editData.ownership || '').trim().toLowerCase();
      const isCustomerOwned = ownershipValue.includes('customer') || 
                             ownershipValue.includes('owned') || 
                             ownershipValue === 'customer owned';
      
      if (assignmentChanged) {
        // Only override status when assignment actually changed
        if (editData.assigned_customer && editData.assigned_customer.trim()) {
          // Assigning to customer
          const customer = customers.find(c => c.CustomerListID === editData.assigned_customer);
          if (customer?.customer_type === 'VENDOR' || isCustomerOwned) {
            finalStatus = 'filled'; // In-house / vendor: keep as Full
          } else {
            finalStatus = 'rented';
          }
          if (!editData.customer_name && customer) {
            editData.customer_name = customer.name;
          }
        } else {
          // Unassigning: use user's status choice (e.g. Full), or default to empty
          finalStatus = normalizeStatus(editData.status);
          editData.customer_name = null;
        }
      }
      // If assignment did not change, finalStatus already is editData.status (user's choice)

      const customerForSave = editData.assigned_customer
        ? customers.find((c) => c.CustomerListID === editData.assigned_customer)
        : null;
      const shouldSyncBottleLocationFromCustomer = Boolean(
        editData.assigned_customer &&
          customerForSave &&
          customerForSave.customer_type !== 'VENDOR'
      );
      const resolvedLocationFromCustomer = shouldSyncBottleLocationFromCustomer
        ? bottleLocationValueForCustomer(customerForSave, locations)
        : null;
      const finalLocationForSave =
        resolvedLocationFromCustomer != null && resolvedLocationFromCustomer !== ''
          ? resolvedLocationFromCustomer
          : editData.location || null;
      
      // Build update data object with only valid fields, ensuring no undefined or system fields
      const updateData = {};
      
      // Only include fields that exist and are not empty strings (convert empty strings to null)
      if (editData.barcode_number !== undefined) {
        updateData.barcode_number = editData.barcode_number || null;
      }
      if (editData.serial_number !== undefined) {
        updateData.serial_number = editData.serial_number || null;
      }
      if (editData.product_code !== undefined) {
        updateData.product_code = editData.product_code || null;
      }
      if (editData.gas_type !== undefined) {
        updateData.gas_type = editData.gas_type || null;
      }
      if (finalStatus !== undefined) {
        updateData.status = NORMAL_STATUSES.includes(finalStatus) ? finalStatus : normalizeStatus(finalStatus);
      }
      if (editData.location !== undefined) {
        updateData.location = finalLocationForSave || null;
      }
      if (editData.assigned_customer !== undefined) {
        updateData.assigned_customer = editData.assigned_customer || null;
      }
      if (editData.customer_name !== undefined) {
        updateData.customer_name = editData.customer_name || null;
      }
      if (editData.ownership !== undefined) {
        updateData.ownership = editData.ownership || null;
      }
      if (editData.description !== undefined) {
        updateData.description = editData.description || null;
      }
      
      // Explicitly remove any system fields that might have been included
      delete updateData.id;
      delete updateData.organization_id;
      delete updateData.created_at;
      delete updateData.updated_at;
      
      const { error } = await supabase
        .from('bottles')
        .update(updateData)
        .eq('id', id)
        .eq('organization_id', profile.organization_id);

      if (error) throw error;

      const fieldChanges = buildBottleFieldChanges(asset, updateData);
      if (Object.keys(fieldChanges).length > 0) {
        await logBottleAuditEvent({
          action: 'BOTTLE_UPDATE',
          bottleId: id,
          details: {
            event_type: 'bottle_update',
            bottle_id: id,
            barcode_number: asset?.barcode_number || updateData?.barcode_number || null,
            field_changes: fieldChanges,
          },
        });
      }

      // Create a scan record if assignment changed
      const assignmentChangedForScan = previousCustomer !== (editData.assigned_customer || null);
      const locationChangedEffective = previousLocation !== finalLocationForSave;
      if (assignmentChangedForScan || locationChangedEffective) {
        const scanMode = assignmentChanged 
          ? (editData.assigned_customer ? 'SHIP' : 'RETURN')
          : 'LOCATE';
        
        const scanData = {
          barcode_number: asset.barcode_number || editData.barcode_number,
          product_code: asset.product_code || editData.product_code,
          mode: scanMode,
          action: scanMode === 'RETURN' ? 'in' : scanMode === 'SHIP' ? 'out' : 'out',
          order_number: 'manual', // Placeholder so insert doesn't fail if column is NOT NULL
          customer_id: editData.assigned_customer || null,
          customer_name: editData.customer_name || null,
          location: finalLocationForSave || null,
          organization_id: profile.organization_id,
          created_at: new Date().toISOString(),
          status: 'approved' // Manual assignments are automatically approved
        };
        
        const { error: bottleScanError } = await supabase
          .from('bottle_scans')
          .insert({
            organization_id: profile.organization_id,
            bottle_barcode: asset.barcode_number || editData.barcode_number,
            mode: scanMode,
            order_number: scanData.order_number,
            customer_id: editData.assigned_customer || null,
            customer_name: editData.customer_name || null,
            timestamp: new Date().toISOString(),
            created_at: new Date().toISOString()
          });
        if (bottleScanError) {
          logger.error('Error creating bottle_scan record:', bottleScanError);
        } else {
          logger.log('Created bottle_scan record for assignment change');
        }
      }

      // Refresh asset data
      await fetchAssetDetail();
      setEditDialog(false);
      setSuccess('Bottle updated successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      logger.error('Error updating asset:', error);
      setError(error.message || 'Failed to update asset');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this asset?')) return;

    try {
      // SECURITY: Verify user has permission to delete this asset
      if (!profile?.organization_id) {
        throw new Error('Organization not found');
      }

      await logBottleAuditEvent({
        action: 'BOTTLE_DELETE',
        bottleId: id,
        details: {
          event_type: 'bottle_delete',
          bottle_id: id,
          barcode_number: asset?.barcode_number || null,
          snapshot: {
            barcode_number: asset?.barcode_number || null,
            serial_number: asset?.serial_number || null,
            product_code: asset?.product_code || null,
            gas_type: asset?.gas_type || null,
            status: asset?.status || null,
            location: asset?.location || null,
            assigned_customer: asset?.assigned_customer || null,
            customer_name: asset?.customer_name || null,
            ownership: asset?.ownership || null,
            description: asset?.description || null,
          },
        },
      });
      
      const { error } = await supabase
        .from('bottles') // Keep using bottles table for now
        .delete()
        .eq('id', id)
        .eq('organization_id', profile.organization_id); // SECURITY: Only delete assets from user's organization

      if (error) throw error;

      navigate('/inventory-management');
    } catch (error) {
      logger.error('Error deleting asset:', error);
      setError(error.message || 'Failed to delete asset');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!asset) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Alert severity="error">Asset not found</Alert>
      </Box>
    );
  }

  const assetTitle = isReady ? terms.asset : 'Asset';

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, mb: 3, borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.08)', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' }}>
        <Box display="flex" alignItems="center" flexWrap="wrap" gap={1}>
          <Button onClick={() => navigate('/inventory-management')} startIcon={<ArrowBackIcon />} sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none' }}>
            Back
          </Button>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em' }}>
            {assetTitle} Detail
          </Typography>
          <Box flexGrow={1} />
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<HistoryIcon />}
              onClick={() => {
                const historyId = asset.barcode_number || asset.serial_number || id;
                navigate(`/assets/${historyId}/history`);
              }}
            >
              View History
            </Button>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => {
                // Reset editData to current asset when opening edit dialog (only editable fields)
                if (asset) {
                  setEditData({
                    barcode_number: asset.barcode_number || '',
                    serial_number: asset.serial_number || '',
                    product_code: asset.product_code || '',
                    gas_type: asset.gas_type || '',
                    status: asset.status || 'available',
                    location: asset.location || '',
                    assigned_customer: asset.assigned_customer || '',
                    customer_name: asset.customer_name || '',
                    ownership: asset.ownership || '',
                    description: asset.description || ''
                  });
                }
                setEditDialog(true);
              }}
            >
              Edit
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleDelete}
            >
              Delete
            </Button>
          </Stack>
        </Box>
      </Paper>

      {/* Error/Success Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Asset Information */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
        <Typography variant="h6" gutterBottom>
          Basic Information
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="textSecondary">
              Barcode Number
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {asset.barcode_number || '-'}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="textSecondary">
              Serial Number
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {asset.serial_number || '-'}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="textSecondary">
              Product Code
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {asset.product_code || '-'}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="textSecondary">
              Gas Type
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {asset.gas_type || '-'}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="textSecondary">
              Status
            </Typography>
            <Chip 
              label={
                asset.status === 'filled' || asset.status === 'full' ? 'Full' :
                asset.status === 'empty' ? 'Empty' :
                asset.status === 'rented' ? 'Rented' :
                asset.status === 'lost' ? 'Lost' :
                asset.status || 'Unknown'
              }
              color={
                asset.status === 'filled' || asset.status === 'full' ? 'success' :
                asset.status === 'empty' ? 'warning' :
                asset.status === 'rented' ? 'info' :
                asset.status === 'lost' ? 'error' : 'default'
              }
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="textSecondary">
              Location
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {(() => {
                // If bottle is assigned to a customer, show customer's location first
                if (customerData?.location) {
                  return formatLocationDisplay(customerData.location);
                }
                // Otherwise show bottle's location
                return asset.location ? formatLocationDisplay(asset.location) : '-';
              })()}
            </Typography>
            {customerData?.location && asset.location && normalizeLocationKey(customerData.location) !== normalizeLocationKey(asset.location) && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                (Bottle location: {formatLocationDisplay(asset.location)})
              </Typography>
            )}
          </Grid>

          <Grid item xs={12}>
            <Typography variant="body2" color="textSecondary">
              Description
            </Typography>
            <Typography variant="body1">
              {asset.description || '-'}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Customer Assignment */}
      {asset.assigned_customer && (
        <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
          <Typography variant="h6" gutterBottom>
            Customer Assignment
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="textSecondary">
                Customer ID
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {asset.assigned_customer}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="textSecondary">
                Customer Name
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {asset.customer_name || '-'}
              </Typography>
            </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="textSecondary">
              Customer Location
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {customerData?.location
                ? formatLocationDisplay(customerData.location)
                : customerData?.city
                  ? formatLocationDisplay(customerData.city)
                  : '-'}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="textSecondary">
              Days at Location
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {derivedDaysAtLocation} days
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="textSecondary">
              Ownership
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {asset.ownership || '-'}
            </Typography>
          </Grid>
        </Grid>
      </Paper>
      )}

      {/* Movement History Section */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            Movement History
          </Typography>
          <Button
            variant="text"
            size="small"
            startIcon={<HistoryIcon />}
            onClick={() => {
              const historyId = asset.barcode_number || asset.serial_number || id;
              navigate(`/assets/${historyId}/history`);
            }}
          >
            View Full History
          </Button>
        </Box>
        {loadingHistory ? (
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress size={24} />
          </Box>
        ) : movementHistory.length > 0 ? (
          <Box sx={{ overflowX: 'auto', borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e0e0e0' }}>
                  <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Action</th>
                  <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Resulting Location</th>
                  <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Category</th>
                  <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Group</th>
                  <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Type</th>
                  <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Product Code</th>
                  <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Description</th>
                  <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Barcode</th>
                  <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Map</th>
                </tr>
              </thead>
              <tbody>
                {movementHistory.slice(0, 10).map((record, index) => {
                  // Determine action type based on mode/action
                  let action = '';
                  const recordMode = record.mode;
                  if (recordMode === 'RNB' || record.action === 'RNB' || record.history_type === 'rental_rnb') {
                    action = 'RNB (Return not on balance)';
                  } else if (recordMode === 'SHIP' || record.action === 'SHIP' || record.history_type === 'rental_start') {
                    action = 'Delivery';
                  } else if (recordMode === 'RETURN' || record.action === 'RETURN' || record.history_type === 'rental_end') {
                    action = 'Return';
                  } else if (recordMode === 'FILL' || record.action === 'FILL' || record.history_type === 'fill') {
                    action = 'Fill';
                  } else if (recordMode === 'LOCATE' || record.action === 'LOCATE') {
                    action = 'Locate Full';
                  } else if (recordMode === 'CREATE' || record.action === 'Add New Asset' || record.history_type === 'creation') {
                    action = 'Add New Asset';
                  } else {
                    action = recordMode || record.action || 'Scan';
                  }
                  
                  // Determine resulting location
                  let resultingLocation = '';
                  if (record.customer_name) {
                    const customerId = record.customer_id || record.assigned_customer || '';
                    resultingLocation = `Customer: ${record.customer_name}${customerId ? ` (${customerId})` : ''}`;
                  } else if (record.location) {
                    resultingLocation = `In-House: ${record.location}`;
                  } else if (record.history_type === 'fill') {
                    resultingLocation = 'Fill Plant';
                  } else {
                    resultingLocation = 'Unknown';
                  }
                  
                  // Get asset details (use asset data or record data)
                  const category = asset.category || record.category || 'INDUSTRIAL CYLINDERS';
                  const group = asset.gas_type || record.gas_type || record.group || '';
                  const type = asset.product_code || record.product_code || record.type || '';
                  const productCode = asset.product_code || record.product_code || '';
                  const description =
                    record.history_type === 'audit'
                      ? (record.notes || record.description || asset.description || '')
                      : (record.description || record.notes || asset.description || '');
                  const barcode = asset.barcode_number || record.barcode_number || record.bottle_barcode || '';
                  
                  // Format date; show date-only when value is date-only or midnight UTC to avoid
                  // midnight UTC displaying as "6:00 PM" in timezones behind UTC (e.g. Saskatchewan)
                  const rawDate = record.created_at;
                  let dateStr = '-';
                  if (rawDate) {
                    const d = new Date(rawDate);
                    const dateOnlyString = typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate.trim());
                    const midnightUtc = !Number.isNaN(d.getTime()) && d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0;
                    if (dateOnlyString || midnightUtc) {
                      dateStr = d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
                    } else {
                      dateStr = d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
                    }
                  }
                  
                  return (
                    <tr key={record.id || index} style={{ borderBottom: '1px solid #e0e0e0' }}>
                      <td style={{ padding: '8px' }}>{dateStr}</td>
                      <td style={{ padding: '8px' }}>{action}</td>
                      <td style={{ padding: '8px' }}>{resultingLocation}</td>
                      <td style={{ padding: '8px' }}>{category}</td>
                      <td style={{ padding: '8px' }}>{group}</td>
                      <td style={{ padding: '8px' }}>{type}</td>
                      <td style={{ padding: '8px' }}>{productCode}</td>
                      <td style={{ padding: '8px' }}>{description}</td>
                      <td style={{ padding: '8px' }}>{barcode}</td>
                      <td style={{ padding: '8px' }}>
                        {record.location && (
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => {
                              // Navigate to map or show location details
                              window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(record.location)}`, '_blank');
                            }}
                          >
                            View
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {movementHistory.length > 10 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Showing 10 of {movementHistory.length} records. Click "View Full History" to see all.
              </Typography>
            )}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No movement history found for this {assetTitle.toLowerCase()}.
          </Typography>
        )}
      </Paper>

      {/* Exceptions Section */}
      {exceptions.length > 0 && (
        <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
          <Typography variant="h6" gutterBottom>
            Exceptions on this asset
          </Typography>
          {loadingExceptions ? (
            <Box display="flex" justifyContent="center" p={2}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            exceptions.map((exception) => (
              <Alert 
                key={exception.id} 
                severity={exception.resolution_status === 'RESOLVED' ? 'info' : 'warning'}
                sx={{ mb: 2 }}
              >
                <Box>
                  <Typography variant="body2" fontWeight="bold" gutterBottom>
                    {exception.resolution_status === 'RESOLVED' ? 'Resolved' : exception.resolution_status}: {exception.exception_type}
                  </Typography>
                  {exception.resolution_note && (
                    <Typography variant="body2" color="text.secondary">
                      {exception.resolution_note}
                    </Typography>
                  )}
                  {exception.order_number && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      Order: {exception.order_number}
                    </Typography>
                  )}
                  {exception.created_at && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {new Date(exception.created_at).toLocaleString()}
                    </Typography>
                  )}
                </Box>
              </Alert>
            ))
          )}
        </Paper>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialog} onClose={() => {
        setEditDialog(false);
        // Reset editData to current asset when closing (only editable fields)
        if (asset) {
          setEditData({
            barcode_number: asset.barcode_number || '',
            serial_number: asset.serial_number || '',
            product_code: asset.product_code || '',
            gas_type: asset.gas_type || '',
            status: normalizeStatus(asset.status),
            location: asset.location || '',
            assigned_customer: asset.assigned_customer || '',
            customer_name: asset.customer_name || '',
            ownership: asset.ownership || '',
            description: asset.description || ''
          });
        }
      }} maxWidth="md" fullWidth>
        <DialogTitle>Edit {assetTitle}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Barcode Number"
                value={editData.barcode_number || ''}
                onChange={(e) => setEditData({ ...editData, barcode_number: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Serial Number"
                value={editData.serial_number || ''}
                onChange={(e) => setEditData({ ...editData, serial_number: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Product Code"
                value={editData.product_code || ''}
                onChange={(e) => setEditData({ ...editData, product_code: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Gas Type</InputLabel>
                <Select
                  value={editData.gas_type || ''}
                  onChange={(e) => setEditData({ ...editData, gas_type: e.target.value })}
                  label="Gas Type"
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {gasTypes.map((label) => (
                    <MenuItem key={label} value={label}>
                      {label}
                    </MenuItem>
                  ))}
                  {/* If current value is not in inventory list (e.g. new type), keep it selectable */}
                  {editData.gas_type && !gasTypes.includes((editData.gas_type || '').trim()) && (
                    <MenuItem value={editData.gas_type}>
                      {editData.gas_type} (current)
                    </MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={normalizeStatus(editData.status)}
                  onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                  label="Status"
                >
                  <MenuItem value="filled">Full</MenuItem>
                  <MenuItem value="empty">Empty</MenuItem>
                  <MenuItem value="rented">Rented</MenuItem>
                  <MenuItem value="lost">Lost</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Location</InputLabel>
                <Select
                  value={editData.location || ''}
                  onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                  label="Location"
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {locations.map((location) => (
                    <MenuItem key={location.id} value={location.name.toUpperCase()}>
                      {location.name} ({location.province})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Assign to Customer</InputLabel>
                <Select
                  value={editData.assigned_customer || ''}
                  onChange={(e) => {
                    const customerId = e.target.value;
                    const customer = customers.find(c => c.CustomerListID === customerId);
                    const next = {
                      ...editData,
                      assigned_customer: customerId || null,
                      customer_name: customer?.name || null
                    };
                    if (customerId && customer && customer.customer_type !== 'VENDOR') {
                      const loc = bottleLocationValueForCustomer(customer, locations);
                      if (loc) next.location = loc;
                    }
                    setEditData(next);
                  }}
                  label="Assign to Customer"
                  disabled={loadingCustomers}
                >
                  <MenuItem value="">
                    <em>Unassign (No Customer)</em>
                  </MenuItem>
                  {customers.map((customer) => (
                    <MenuItem key={customer.CustomerListID} value={customer.CustomerListID}>
                      {customer.name} ({customer.CustomerListID})
                      {customer.customer_type === 'VENDOR' && ' - Vendor'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Ownership</InputLabel>
                <Select
                  value={editData.ownership || ''}
                  label="Ownership"
                  onChange={(e) => setEditData({ ...editData, ownership: e.target.value })}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {ownershipValues.map((value) => (
                    <MenuItem key={value} value={value}>
                      {value}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={editData.description || ''}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setEditDialog(false);
            // Reset editData to current asset when canceling (only editable fields)
            if (asset) {
              setEditData({
                barcode_number: asset.barcode_number || '',
                serial_number: asset.serial_number || '',
                product_code: asset.product_code || '',
                gas_type: asset.gas_type || '',
                status: normalizeStatus(asset.status),
                location: asset.location || '',
                assigned_customer: asset.assigned_customer || '',
                customer_name: asset.customer_name || '',
                ownership: asset.ownership || '',
                description: asset.description || ''
              });
            }
          }}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 