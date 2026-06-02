import logger from '../utils/logger';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  MenuItem,
  Autocomplete
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { supabase } from '../supabase/client';
import { clearRentalsBottleLinksForBottleIds } from '../utils/bottleDeleteHelpers';
import { useAuth } from '../hooks/useAuth';
import { useDynamicAssetTerms } from '../hooks/useDynamicAssetTerms';
import { bottleLocationValueForCustomer, formatLocationDisplay, normalizeLocationKey } from '../utils/locationDisplay';
import {
  isCustomerOwnedOwnership,
  persistedStatusForOwnership,
  bottleStatusDisplayLabel,
  bottleStatusChipColor,
  CUSTOMER_OWNED_STORED_STATUS,
} from '../utils/bottleOwnership';
import {
  fetchMergedAssetMovementHistory,
  normalizeAuditDetails,
  postAssignmentFromAuditFieldChanges,
  stringifyHistoryDetails,
} from '../services/assetMovementHistory';
import { closeOpenRentalsForBottle } from '../services/closeOpenRentalsForBottle';
import { useSubscriptions } from '../context/SubscriptionContext';
import {
  bottleHasStaleCustomerAssignment,
  isActiveCustomerAssignment,
  staleBottleCustomerLabel,
} from '../utils/bottleCustomerDirectory';
import {
  isPendingOrderScanRecord,
  isScanEffectiveForAssignmentReplay,
  scanRecordModeFamily,
} from '../utils/orderScanApprovalStatus';
/** Exclude deleted rows only when those columns exist on the row (not selected from DB). */
const isAssignableCustomer = (customer) => {
  if (!customer) return false;
  if (customer.is_deleted === true) return false;
  if (customer.is_active === false) return false;
  return true;
};

const CUSTOMER_ASSIGN_SELECT =
  'id, CustomerListID, name, customer_type, location, city, contact_details, phone';
const CUSTOMER_ASSIGN_SEARCH_MIN = 1;

/** Same `.or()` shape as Customers.jsx `applySearchOr` (proven in production). */
const buildCustomerSearchOr = (searchLower) =>
  `name.ilike.%${searchLower}%,CustomerListID.ilike.%${searchLower}%,contact_details.ilike.%${searchLower}%,phone.ilike.%${searchLower}%,city.ilike.%${searchLower}%,postal_code.ilike.%${searchLower}%`;

const sanitizeCustomerSearchTerm = (raw) =>
  String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[%(),]/g, '');

// Only 4 statuses: Full, Empty, Rented, Lost (stored as filled, empty, rented, lost)
const NORMAL_STATUSES = ['filled', 'empty', 'rented', 'lost', 'available'];
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const customerOptionSearchText = (option) =>
  [
    option?.name,
    option?.Name,
    option?.CustomerListID,
    option?.city,
    option?.phone,
    option?.contact_details,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

const customerOptionLabel = (option) => {
  const name = String(option?.name || option?.Name || '').trim();
  const listId = String(option?.CustomerListID || '').trim();
  const suffix = option?.customer_type === 'VENDOR' ? ' - Vendor' : '';
  if (name && listId) return `${name} (${listId})${suffix}`;
  if (name) return `${name}${suffix}`;
  return listId;
};
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

const modeIndicatesReturn = (record) => {
  const mode = String(record?.mode || record?.action || '').trim().toUpperCase();
  return (
    mode === 'RETURN' ||
    mode === 'PICKUP' ||
    mode === 'IN' ||
    record?.history_type === 'rental_end'
  );
};

const modeIndicatesFill = (record) => {
  const mode = String(record?.mode || record?.action || '').trim().toUpperCase();
  return mode === 'FILL' || record?.history_type === 'fill';
};

const modeIndicatesDeliveryForStatus = (record) => {
  const mode = String(record?.mode || record?.action || '').trim().toUpperCase();
  return mode === 'SHIP' || mode === 'DELIVERY' || mode === 'OUT' || record?.history_type === 'rental_start';
};

const timelineSortMs = (record) => {
  const t = new Date(record?.created_at ?? 0).getTime();
  return Number.isFinite(t) ? t : 0;
};

/** Rows that are not scan/rental/audit workflow — skip when inferring current assignment/status from history. */
const isSyntheticTimelineNoise = (record) => {
  if (!record) return true;
  if (record.history_type === 'record_update' || record.history_type === 'creation') return true;
  if (record.id === 'bottle_last_updated' || record.id === 'bottle_created') return true;
  return false;
};

/**
 * Replay decisive events oldest → newest so a RETURN after a DELIVERY on the same day wins (newest-first list alone does not).
 */
const replayBottleStateFromTimeline = (timelineAsc) => {
  let assignedCustomerId = '';
  let customerName = '';
  let status = '';

  for (const record of timelineAsc) {
    if (modeIndicatesFill(record)) {
      assignedCustomerId = '';
      customerName = '';
      status = 'filled';
      continue;
    }
    if (modeIndicatesReturn(record) || record?.history_type === 'rental_end') {
      if (!isScanEffectiveForAssignmentReplay(record)) continue;
      assignedCustomerId = '';
      customerName = '';
      status = 'empty';
      continue;
    }
    const auditCust = auditBottleUpdateCustomerAssignment(record);
    if (auditCust) {
      assignedCustomerId = auditCust.assignedCustomerId;
      customerName = auditCust.customerName;
      const st = auditBottleUpdateDerivedDisplayStatus(record);
      if (st) status = st;
      continue;
    }
    const auditSt = auditBottleUpdateDerivedDisplayStatus(record);
    if (auditSt != null) {
      status = auditSt;
      continue;
    }
    if (modeIndicatesDelivery(record) || record?.history_type === 'rental_start') {
      if (!isScanEffectiveForAssignmentReplay(record)) continue;
      const cid = String(record?.customer_id || record?.assigned_customer || '').trim();
      const cname = String(record?.customer_name || '').trim();
      if (cid || cname) {
        assignedCustomerId = cid;
        customerName = cname;
        status = 'rented';
      }
    }
  }
  return { assignedCustomerId, customerName, status };
};

/** Drop deleted-directory customers from timeline replay so auto-repair does not re-assign them. */
const sanitizeReplayedBottleState = (replayed, customers) => {
  if (!replayed) return replayed;
  let { assignedCustomerId = '', customerName = '', status = '' } = replayed;
  if (!isActiveCustomerAssignment(assignedCustomerId, customerName, customers)) {
    assignedCustomerId = '';
    customerName = '';
    if (normalizeStatus(status) === 'rented') status = 'empty';
  }
  return { assignedCustomerId, customerName, status };
};

/**
 * Manual edits write audit_logs BOTTLE_UPDATE with field_changes; scan-only inference must not skip these,
 * otherwise an old RETURN row wins and the Status chip shows Empty despite empty→rented in the audit.
 */
const auditBottleUpdateDerivedDisplayStatus = (record) => {
  if (record?.history_type !== 'audit') return null;
  const m = String(record?.mode || record?.action || '').toUpperCase();
  if (!m.includes('BOTTLE_UPDATE')) return null;
  const d = normalizeAuditDetails(record.details);
  const fc = d?.field_changes;
  if (!fc || typeof fc !== 'object') return null;
  const stRaw = fc.status?.to;
  if (stRaw !== undefined && stRaw !== null && String(stRaw).trim() !== '') {
    return normalizeStatus(stRaw);
  }
  const post = postAssignmentFromAuditFieldChanges(d);
  const cid = post?.assigned_customer != null ? String(post.assigned_customer).trim() : '';
  if (cid) {
    return 'rented';
  }
  return null;
};

/** Customer shown on assignment / warnings — same gap as status until SHIP existed; audits carry merged or field_changes assignment. */
const auditBottleUpdateCustomerAssignment = (record) => {
  if (record?.history_type !== 'audit') return null;
  const m = String(record?.mode || record?.action || '').toUpperCase();
  if (!m.includes('BOTTLE_UPDATE')) return null;
  let customerId = String(record?.customer_id || record?.assigned_customer || '').trim();
  let customerName = String(record?.customer_name || '').trim();
  if (!customerId && !customerName) {
    const d = normalizeAuditDetails(record.details);
    const post = postAssignmentFromAuditFieldChanges(d);
    customerId = post?.assigned_customer != null ? String(post.assigned_customer).trim() : '';
    customerName = post?.customer_name != null ? String(post.customer_name).trim() : '';
  }
  if (!customerId && !customerName) return null;
  return {
    assignedCustomerId: customerId,
    customerName,
    sourceAction: 'set_by_bottle_update_audit',
  };
};

const TRACKED_BOTTLE_FIELDS = [
  'barcode_number',
  'serial_number',
  'product_code',
  'gas_type',
  'status',
  'location',
  'assigned_customer',
  'customer_id',
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

const getAuditFieldChangeDisplay = (auditDetails, fieldName, fallbackValue) => {
  const change = auditDetails?.field_changes?.[fieldName];
  if (!change) return fallbackValue;
  const from = change?.from == null || change?.from === '' ? 'empty' : String(change.from);
  const to = change?.to == null || change?.to === '' ? 'empty' : String(change.to);
  return `${from} -> ${to}`;
};

export default function AssetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile, organization } = useAuth();
  const subscriptionCtx = useSubscriptions();
  const organizationId = organization?.id || profile?.organization_id || null;
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
  const [movementHistoryError, setMovementHistoryError] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [customerData, setCustomerData] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [customerAssignOptions, setCustomerAssignOptions] = useState([]);
  const [customerAssignInput, setCustomerAssignInput] = useState('');
  const [customerAssignSearchError, setCustomerAssignSearchError] = useState('');
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const customerSearchTimerRef = useRef(null);
  const [gasTypes, setGasTypes] = useState([]);
  const staleClearRepairKeyRef = useRef(null);
  const historySyncRepairKeyRef = useRef(null);
  const orphanRentalsClosedRef = useRef(null);
  const gasTypeOptions = React.useMemo(
    () =>
      [...new Set((gasTypes || []).map((item) => (item?.type || '').trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b)),
    [gasTypes]
  );
  const productCodeOptions = React.useMemo(
    () =>
      [...new Set((gasTypes || []).map((item) => (item?.product_code || '').trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b)),
    [gasTypes]
  );

  const logBottleAuditEvent = async ({ action, details, bottleId = null }) => {
    if (!profile?.organization_id || !bottleId) return;
    const basePayload = {
      organization_id: profile.organization_id,
      user_id: profile?.id || null,
      action,
      details,
      timestamp: new Date().toISOString(),
    };
    const { error } = await supabase.from('audit_logs').insert(basePayload);
    if (error) {
      logger.warn('Primary bottle audit insert failed, retrying minimal payload:', error);
      const { error: fallbackError } = await supabase.from('audit_logs').insert(basePayload);
      if (fallbackError) {
        logger.error('Failed to write bottle audit log:', fallbackError);
      }
    }
  };

  const effectiveCustomerAssignment = React.useMemo(() => {
    const fallback = {
      assignedCustomerId: String(
        asset?.assigned_customer || asset?.customer_id || asset?.customer_uuid || ''
      ).trim(),
      customerName: String(asset?.customer_name || '').trim(),
      sourceAction: 'fallback',
    };
    if (!movementHistory.length) return fallback;

    const timelineAsc = movementHistory
      .filter((r) => !isSyntheticTimelineNoise(r))
      .sort((a, b) => {
        const d = timelineSortMs(a) - timelineSortMs(b);
        if (d !== 0) return d;
        return String(a?.id ?? '').localeCompare(String(b?.id ?? ''));
      });

    const replayed = sanitizeReplayedBottleState(replayBottleStateFromTimeline(timelineAsc), customers);
    const sameAsDb =
      String(replayed.assignedCustomerId || '') === String(fallback.assignedCustomerId || '') &&
      String(replayed.customerName || '') === String(fallback.customerName || '');
    if (sameAsDb) return fallback;

    if (!replayed.assignedCustomerId && !replayed.customerName) {
      return { assignedCustomerId: '', customerName: '', sourceAction: 'replay_timeline_cleared' };
    }
    return {
      assignedCustomerId: replayed.assignedCustomerId,
      customerName: replayed.customerName,
      sourceAction: 'replay_timeline_delivery_or_audit',
    };
  }, [
    movementHistory,
    asset?.assigned_customer,
    asset?.customer_id,
    asset?.customer_uuid,
    asset?.customer_name,
    customers,
  ]);

  const effectiveAssignedCustomerId = effectiveCustomerAssignment.assignedCustomerId;
  const effectiveAssignedCustomerName = effectiveCustomerAssignment.customerName;
  const hasCustomerAssignmentDisplay = Boolean(
    String(effectiveAssignedCustomerId || '').trim() || String(effectiveAssignedCustomerName || '').trim()
  );
  const staleCustomerAssignment = React.useMemo(() => {
    if (bottleHasStaleCustomerAssignment(asset, customers)) return true;
    if (effectiveAssignedCustomerId || effectiveAssignedCustomerName) {
      return bottleHasStaleCustomerAssignment(
        {
          assigned_customer: effectiveAssignedCustomerId,
          customer_name: effectiveAssignedCustomerName,
        },
        customers
      );
    }
    return false;
  }, [asset, customers, effectiveAssignedCustomerId, effectiveAssignedCustomerName]);
  const hasActiveCustomerAssignment = hasCustomerAssignmentDisplay && !staleCustomerAssignment;
  const effectiveStatus = React.useMemo(() => {
    const fallback = normalizeStatus(asset?.status);
    if (!movementHistory.length) {
      return persistedStatusForOwnership(fallback, asset?.ownership);
    }

    const timelineAsc = movementHistory
      .filter((r) => !isSyntheticTimelineNoise(r))
      .sort((a, b) => {
        const d = timelineSortMs(a) - timelineSortMs(b);
        if (d !== 0) return d;
        return String(a?.id ?? '').localeCompare(String(b?.id ?? ''));
      });

    const replayed = sanitizeReplayedBottleState(replayBottleStateFromTimeline(timelineAsc), customers);
    const raw = replayed.status ? normalizeStatus(replayed.status) : fallback;
    return persistedStatusForOwnership(raw, asset?.ownership);
  }, [movementHistory, asset?.status, asset?.ownership, customers]);

  useEffect(() => {
    const clearStaleCustomerAssignment = async () => {
      if (!asset?.id || !profile?.organization_id || !customers.length) return;
      if (!bottleHasStaleCustomerAssignment(asset, customers)) return;

      const repairKey = `stale-customer|${asset.id}|${staleBottleCustomerLabel(asset)}`;
      if (staleClearRepairKeyRef.current === repairKey) return;
      staleClearRepairKeyRef.current = repairKey;

      const priorStatus = normalizeStatus(asset?.status);
      const updateData = {
        assigned_customer: null,
        customer_name: null,
        customer_uuid: null,
        days_at_location: 0,
        status: priorStatus === 'rented' ? 'empty' : priorStatus,
      };

      const { error: clearError } = await supabase
        .from('bottles')
        .update(updateData)
        .eq('id', asset.id)
        .eq('organization_id', profile.organization_id);

      if (clearError) {
        logger.warn('Clear stale customer assignment failed:', clearError);
        return;
      }

      const updatedAsset = { ...asset, ...updateData, customer_id: null };
      setAsset(updatedAsset);
      setCustomerData(null);

      try {
        const closed = await closeOpenRentalsForBottle(supabase, profile.organization_id, {
          bottleId: asset.id,
          barcode: asset.barcode_number,
        });
        if (closed > 0) {
          subscriptionCtx?.refreshSilent?.();
        }
      } catch (rentalCloseError) {
        logger.warn('Close rentals after stale customer clear:', rentalCloseError);
      }

      await fetchMovementHistory(updatedAsset);

      setSuccess(
        `Cleared assignment to removed customer "${staleBottleCustomerLabel(asset)}". Status set to ${updateData.status}.`
      );
    };

    void clearStaleCustomerAssignment();
  }, [
    asset?.id,
    asset?.assigned_customer,
    asset?.customer_name,
    asset?.customer_uuid,
    asset?.customer_id,
    asset?.status,
    customers,
    profile?.organization_id,
  ]);

  // Bottles cleared in inventory but still billing (e.g. stale-customer repair before rental close).
  useEffect(() => {
    const closeOrphanRentalsForUnassignedBottle = async () => {
      if (!asset?.id || !profile?.organization_id || !customers.length) return;
      if (bottleHasStaleCustomerAssignment(asset, customers)) return;
      const assigned = String(asset.assigned_customer || asset.customer_uuid || '').trim();
      const name = String(asset.customer_name || '').trim();
      if (assigned || name) return;

      const repairKey = `orphan-rentals|${asset.id}`;
      if (orphanRentalsClosedRef.current === repairKey) return;
      orphanRentalsClosedRef.current = repairKey;

      try {
        const closed = await closeOpenRentalsForBottle(supabase, profile.organization_id, {
          bottleId: asset.id,
          barcode: asset.barcode_number,
        });
        if (closed > 0) {
          subscriptionCtx?.refreshSilent?.();
          await fetchMovementHistory(asset);
        }
      } catch (rentalCloseError) {
        logger.warn('Close orphan rentals for unassigned bottle:', rentalCloseError);
      }
    };

    void closeOrphanRentalsForUnassignedBottle();
  }, [
    asset?.id,
    asset?.assigned_customer,
    asset?.customer_name,
    asset?.customer_uuid,
    asset?.barcode_number,
    customers.length,
    profile?.organization_id,
  ]);

  useEffect(() => {
    const syncAssignmentFromHistory = async () => {
      if (!asset?.id || !profile?.organization_id || movementHistory.length === 0) return;
      if (bottleHasStaleCustomerAssignment(asset, customers)) return;
      if (effectiveCustomerAssignment.sourceAction === 'fallback') return;

      const currentId = String(asset.assigned_customer || '').trim();
      const currentName = String(asset.customer_name || '').trim();
      const nextId = String(effectiveAssignedCustomerId || '').trim();
      const nextName = String(effectiveAssignedCustomerName || '').trim();
      if (!isActiveCustomerAssignment(nextId, nextName, customers)) return;
      const currentStatus = normalizeStatus(asset?.status);
      const needsRepair = currentId !== nextId || currentName !== nextName || currentStatus !== effectiveStatus;
      if (!needsRepair) return;

      const repairKey = `${asset.id}|${currentId}|${currentName}|${nextId}|${nextName}|${currentStatus}|${effectiveStatus}|${effectiveCustomerAssignment.sourceAction}`;
      if (historySyncRepairKeyRef.current === repairKey) return;
      historySyncRepairKeyRef.current = repairKey;

      const updateData = {
        assigned_customer: nextId || null,
        customer_name: nextName || null,
        customer_uuid: UUID_RE.test(nextId) ? nextId : null,
        status: effectiveStatus,
      };
      if (!nextId) {
        // Returned/filled bottles should not carry previous customer aging.
        updateData.days_at_location = 0;
      }

      const { error: repairError } = await supabase
        .from('bottles')
        .update(updateData)
        .eq('id', asset.id)
        .eq('organization_id', profile.organization_id);

      if (repairError) {
        logger.warn('Assignment repair from movement history failed:', repairError);
        return;
      }

      setAsset((prev) => prev ? { ...prev, ...updateData } : prev);
    };

    syncAssignmentFromHistory();
  }, [
    asset?.id,
    asset?.assigned_customer,
    asset?.customer_name,
    profile?.organization_id,
    movementHistory,
    effectiveAssignedCustomerId,
    effectiveAssignedCustomerName,
    effectiveStatus,
    effectiveCustomerAssignment.sourceAction,
    customers,
  ]);

  const derivedDaysAtLocation = React.useMemo(() => {
    const today = toStartOfDay(new Date());
    if (!today) return asset?.days_at_location || 0;

    // Customer-assigned assets: age from latest delivery to this customer.
    if (effectiveAssignedCustomerId && movementHistory.length) {
      const latestCustomerDelivery = movementHistory
        .filter((record) => modeIndicatesDelivery(record) && sameCustomer(record, effectiveAssignedCustomerId, effectiveAssignedCustomerName))
        .map((record) => toStartOfDay(record.created_at))
        .filter(Boolean)
        .sort((a, b) => b.getTime() - a.getTime())[0];

      if (latestCustomerDelivery) {
        const diffDays = Math.floor((today.getTime() - latestCustomerDelivery.getTime()) / MS_PER_DAY);
        return Math.max(0, diffDays);
      }
    }

    // In-house / unassigned assets: age from latest known movement event.
    if (movementHistory.length) {
      const latestMovementDate = movementHistory
        .map((record) => toStartOfDay(record.created_at))
        .filter(Boolean)
        .sort((a, b) => b.getTime() - a.getTime())[0];
      if (latestMovementDate) {
        const diffDays = Math.floor((today.getTime() - latestMovementDate.getTime()) / MS_PER_DAY);
        return Math.max(0, diffDays);
      }
    }

    // Fallback to record timestamps before using stored counter.
    const fallbackDate = toStartOfDay(asset?.updated_at || asset?.created_at);
    if (fallbackDate) {
      const diffDays = Math.floor((today.getTime() - fallbackDate.getTime()) / MS_PER_DAY);
      return Math.max(0, diffDays);
    }
    return asset?.days_at_location || 0;
  }, [
    effectiveAssignedCustomerId,
    effectiveAssignedCustomerName,
    movementHistory,
    asset?.updated_at,
    asset?.created_at,
    asset?.days_at_location
  ]);

  const displayStatus = movementHistory.length ? effectiveStatus : normalizeStatus(asset?.status);

  useEffect(() => {
    fetchAssetDetail();
    fetchLocations();
    fetchCustomers();
    fetchGasTypes();
    if (profile?.organization_id) {
      fetchOwnershipValues();
    }
  }, [id, profile?.organization_id]);

  useEffect(() => {
    if (asset?.id && profile?.organization_id) {
      fetchExceptions(asset.id);
    } else {
      setExceptions([]);
    }
  }, [asset?.id, profile?.organization_id]);

  // Fetch movement history when asset is loaded
  useEffect(() => {
    if (asset?.barcode_number || asset?.serial_number) {
      fetchMovementHistory();
    }
  }, [
    asset?.barcode_number,
    asset?.serial_number,
    asset?.assigned_customer,
    asset?.customer_name,
    asset?.status,
    profile?.organization_id,
  ]);

  // Fetch customer data when assignment id or display name changes (name-only legacy rows)
  useEffect(() => {
    const hint =
      String(effectiveAssignedCustomerId || effectiveAssignedCustomerName || '').trim();
    if (hint) {
      fetchCustomerData(hint);
    } else {
      setCustomerData(null);
    }
  }, [effectiveAssignedCustomerId, effectiveAssignedCustomerName, profile?.organization_id]);

  const fetchAssetDetail = async () => {
    try {
      setLoading(true);
      
      // CRITICAL SECURITY: Must filter by organization_id to prevent cross-organization data access
      if (!profile?.organization_id) {
        throw new Error('Organization not found. Please log in again.');
      }

      const searchId = String(id || '').trim();
      if (!searchId) {
        throw new Error('Asset not found.');
      }

      const bottleSelect =
        'id, barcode_number, serial_number, product_code, gas_type, status, location, assigned_customer, customer_id:customer_uuid, customer_name, ownership, description, organization_id, created_at, updated_at, days_at_location, type, category';

      const queryOne = async (column, value) => {
        const { data, error } = await supabase
          .from('bottles')
          .select(bottleSelect)
          .eq(column, value)
          .eq('organization_id', profile.organization_id)
          .order('created_at', { ascending: false })
          .limit(1);
        if (error) throw error;
        return Array.isArray(data) && data.length > 0 ? data[0] : null;
      };

      let data = null;
      if (UUID_RE.test(searchId)) {
        data = await queryOne('id', searchId);
      }
      if (!data) {
        data = await queryOne('barcode_number', searchId);
      }
      if (!data) {
        const stripped = searchId.replace(/^0+/, '') || searchId;
        if (stripped !== searchId) {
          data = await queryOne('barcode_number', stripped);
        }
      }
      if (!data) {
        data = await queryOne('serial_number', searchId);
      }

      if (!data) {
        throw new Error('Asset not found or you do not have permission to view it');
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
      
      const loadHint = String(data?.assigned_customer || data?.customer_id || data?.customer_name || '').trim();
      if (loadHint) {
        fetchCustomerData(loadHint);
      }

      return data;
    } catch (error) {
      logger.error('Error fetching asset:', error);
      setError(error.message || 'Failed to load asset details');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const activeCustomers = useMemo(
    () => (customers || []).filter(isAssignableCustomer),
    [customers]
  );

  const filterCustomersLocally = useCallback((pool, rawInput, limit = 50) => {
    const needle = sanitizeCustomerSearchTerm(rawInput);
    if (!needle) return (pool || []).filter(isAssignableCustomer).slice(0, limit);
    return (pool || [])
      .filter(isAssignableCustomer)
      .filter((c) => customerOptionSearchText(c).includes(needle))
      .slice(0, limit);
  }, []);

  const fetchCustomers = async () => {
    try {
      if (!organizationId) return;

      const { data, error } = await supabase
        .from('customers')
        .select(CUSTOMER_ASSIGN_SELECT)
        .eq('organization_id', organizationId)
        .order('name')
        .limit(1000);

      if (error) throw error;
      setCustomers((data || []).filter(isAssignableCustomer));
    } catch (error) {
      logger.error('Error fetching customers:', error);
      setCustomers([]);
    }
  };

  const searchCustomerAssignOptions = useCallback(
    async (rawInput) => {
      if (!organizationId) {
        setCustomerAssignOptions([]);
        setCustomerAssignSearchError('Organization not loaded. Refresh the page and try again.');
        return;
      }

      let directory = customers;
      if (directory.length === 0) {
        const { data, error } = await supabase
          .from('customers')
          .select(CUSTOMER_ASSIGN_SELECT)
          .eq('organization_id', organizationId)
          .order('name')
          .limit(1000);
        if (!error && data?.length) {
          directory = data.filter(isAssignableCustomer);
          setCustomers(directory);
        }
      }

      const directoryActive = directory.filter(isAssignableCustomer);
      const q = String(rawInput || '').trim();
      setCustomerAssignSearchError('');

      if (q.length < CUSTOMER_ASSIGN_SEARCH_MIN) {
        const seed = directoryActive.slice(0, 50);
        const assignedId = String(editData.assigned_customer || '').trim();
        if (assignedId && !seed.some((c) => c.CustomerListID === assignedId)) {
          const match =
            directoryActive.find((c) => c.CustomerListID === assignedId) ||
            directory.find((c) => c.CustomerListID === assignedId);
          if (match) seed.unshift(match);
        }
        setCustomerAssignOptions(seed);
        if (seed.length === 0) {
          setCustomerAssignSearchError('No customers in your organization. Add customers under Customer List first.');
        }
        return;
      }

      const searchLower = sanitizeCustomerSearchTerm(q);
      if (!searchLower) {
        setCustomerAssignOptions([]);
        return;
      }

      setLoadingCustomers(true);
      try {
        let { data, error } = await supabase
          .from('customers')
          .select(CUSTOMER_ASSIGN_SELECT)
          .eq('organization_id', organizationId)
          .or(buildCustomerSearchOr(searchLower))
          .order('name')
          .limit(50);

        if (error) {
          logger.warn('Customer search wide query failed, retrying name/id only:', error.message);
          ({ data, error } = await supabase
            .from('customers')
            .select(CUSTOMER_ASSIGN_SELECT)
            .eq('organization_id', organizationId)
            .or(`name.ilike.%${searchLower}%,CustomerListID.ilike.%${searchLower}%`)
            .order('name')
            .limit(50));
        }

        if (error) throw error;

        let rows = (data || []).filter(isAssignableCustomer);
        if (rows.length === 0) {
          rows = filterCustomersLocally(directory, q);
        }
        setCustomerAssignOptions(rows);
        if (rows.length === 0) {
          setCustomerAssignSearchError(
            directoryActive.length === 0
              ? 'No customers loaded for your organization. Check Customer List, then try again.'
              : `No customers matching "${q}".`
          );
        }
      } catch (error) {
        logger.error('Error searching customers for bottle assign:', error);
        const local = filterCustomersLocally(directory, q);
        setCustomerAssignOptions(local);
        setCustomerAssignSearchError(
          local.length > 0
            ? ''
            : error.message || 'Customer search failed. Try Customer List to confirm records exist.'
        );
      } finally {
        setLoadingCustomers(false);
      }
    },
    [
      organizationId,
      activeCustomers,
      customers,
      editData.assigned_customer,
      filterCustomersLocally,
    ]
  );

  useEffect(() => {
    if (!editDialog) {
      setCustomerAssignInput('');
      return undefined;
    }
    void searchCustomerAssignOptions('');
    return () => {
      if (customerSearchTimerRef.current) {
        clearTimeout(customerSearchTimerRef.current);
      }
    };
  }, [editDialog, searchCustomerAssignOptions]);

  // Load gas type catalog so gas type can drive product code automatically.
  const fetchGasTypes = async () => {
    try {
      if (!profile?.organization_id) return;
      const { data, error } = await supabase
        .from('gas_types')
        .select('id, category, group_name, type, product_code, description')
        .order('category', { ascending: true })
        .order('group_name', { ascending: true })
        .order('type', { ascending: true });

      if (error) throw error;
      setGasTypes(data || []);
    } catch (err) {
      logger.error('Error fetching gas type catalog:', err);
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

  const fetchExceptions = async (bottleRowId) => {
    try {
      setLoadingExceptions(true);
      if (!profile?.organization_id || !bottleRowId) return;

      const { data, error } = await supabase
        .from('asset_exceptions')
        .select('*')
        .eq('asset_id', bottleRowId)
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

  const fetchMovementHistory = async (assetSnapshot = null) => {
    const sourceAsset = assetSnapshot ?? asset;
    try {
      setLoadingHistory(true);
      setMovementHistoryError('');
      if (!profile?.organization_id || !sourceAsset) {
        setLoadingHistory(false);
        return;
      }

      const barcodeNumber = sourceAsset.barcode_number;
      const serialNumber = sourceAsset.serial_number;

      if (!barcodeNumber && !serialNumber) {
        setMovementHistory([]);
        setLoadingHistory(false);
        return;
      }

      const merged = await fetchMergedAssetMovementHistory(supabase, {
        organizationId: profile.organization_id,
        asset: sourceAsset,
        perSourceLimit: 200,
        maxRecords: 250,
      });
      setMovementHistory(merged);
    } catch (error) {
      logger.error('Error fetching movement history:', error);
      setMovementHistory([]);
      setMovementHistoryError(
        error?.message || 'Could not load movement history. Try again or open the full asset log.',
      );
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSave = async (evt) => {
    if (evt?.preventDefault) evt.preventDefault();
    if (evt?.stopPropagation) evt.stopPropagation();
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
      const prevAssign = String(previousCustomer ?? '').trim();
      const nextAssign = String(editData.assigned_customer ?? '').trim();
      const assignmentChanged = prevAssign !== nextAssign;
      const isCustomerOwned = isCustomerOwnedOwnership(editData.ownership);
      
      if (assignmentChanged) {
        // Only override status when assignment actually changed
        if (editData.assigned_customer && editData.assigned_customer.trim()) {
          // Assigning to customer
          const customer = customers.find(c => c.CustomerListID === editData.assigned_customer);
          if (customer?.customer_type === 'VENDOR' || isCustomerOwned) {
            finalStatus = isCustomerOwned ? CUSTOMER_OWNED_STORED_STATUS : 'filled';
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

      if (isCustomerOwned) {
        finalStatus = persistedStatusForOwnership(finalStatus, editData.ownership);
      }

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
        // Keep UUID mirror only when assigned customer is actually a UUID.
        const assignedCustomerText = String(updateData.assigned_customer || '').trim();
        updateData.customer_uuid = UUID_RE.test(assignedCustomerText) ? assignedCustomerText : null;
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
      
      const bottleRowId = asset?.id;
      if (!bottleRowId) {
        throw new Error('Asset not loaded');
      }

      const { error } = await supabase
        .from('bottles')
        .update(updateData)
        .eq('id', bottleRowId)
        .eq('organization_id', profile.organization_id);

      if (error) throw error;

      if (assignmentChanged && !nextAssign) {
        try {
          const closed = await closeOpenRentalsForBottle(supabase, profile.organization_id, {
            bottleId: bottleRowId,
            barcode: updateData.barcode_number || asset.barcode_number,
          });
          if (closed > 0) {
            subscriptionCtx?.refreshSilent?.();
          }
        } catch (rentalCloseError) {
          logger.warn('Close rentals after manual unassign:', rentalCloseError);
        }
      }

      const fieldChanges = buildBottleFieldChanges(asset, updateData);
      if (Object.keys(fieldChanges).length > 0) {
        await logBottleAuditEvent({
          action: 'BOTTLE_UPDATE',
          bottleId: bottleRowId,
          details: {
            event_type: 'bottle_update',
            bottle_id: bottleRowId,
            barcode_number: asset?.barcode_number || updateData?.barcode_number || null,
            field_changes: fieldChanges,
          },
        });
      }
      const typeChangeFields = ['category', 'group_name', 'type', 'gas_type', 'product_code', 'description'];
      const hasTypeChange = typeChangeFields.some((field) => field in fieldChanges);
      if (hasTypeChange) {
        const typeChangeSummary = typeChangeFields
          .filter((field) => field in fieldChanges)
          .map((field) => {
            const from = fieldChanges[field]?.from == null ? 'empty' : String(fieldChanges[field].from);
            const to = fieldChanges[field]?.to == null ? 'empty' : String(fieldChanges[field].to);
            return `${field}: ${from} -> ${to}`;
          })
          .join(' | ');
        const { error: typeChangeScanError } = await supabase
          .from('bottle_scans')
          .insert({
            organization_id: profile.organization_id,
            bottle_barcode: updateData.barcode_number || asset.barcode_number,
            mode: 'LOCATE',
            order_number: 'manual',
            customer_id: updateData.assigned_customer || asset.assigned_customer || null,
            customer_name: updateData.customer_name || asset.customer_name || null,
            location: updateData.location || asset.location || null,
            notes: `[TYPE_CHANGE] ${typeChangeSummary}`,
            timestamp: new Date().toISOString(),
            created_at: new Date().toISOString()
          });
        if (typeChangeScanError) {
          logger.warn('Failed to create TYPE_CHANGE scan record:', typeChangeScanError);
        }
      }

      // Create a scan record if assignment or branch location changed (same trim logic as assignmentChanged)
      const locationChangedEffective =
        String(previousLocation ?? '').trim() !== String(finalLocationForSave ?? '').trim();
      if (assignmentChanged || locationChangedEffective) {
        const scanMode = assignmentChanged ? (nextAssign ? 'SHIP' : 'RETURN') : 'LOCATE';
        
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
        
        const manualUiNote =
          scanMode === 'SHIP'
            ? '[MANUAL_UI] Assignment saved from Asset Detail (not a handset / Trackabout scan).'
            : scanMode === 'RETURN'
              ? '[MANUAL_UI] Unassignment saved from Asset Detail (not a handset / Trackabout scan).'
              : '[MANUAL_UI] Location update saved from Asset Detail (not a handset / Trackabout scan).';

        const { error: bottleScanError } = await supabase
          .from('bottle_scans')
          .insert({
            organization_id: profile.organization_id,
            bottle_barcode: asset.barcode_number || editData.barcode_number,
            mode: scanMode,
            order_number: scanData.order_number,
            customer_id: nextAssign ? editData.assigned_customer || null : null,
            customer_name: nextAssign ? editData.customer_name || null : null,
            notes: manualUiNote,
            timestamp: new Date().toISOString(),
            created_at: new Date().toISOString()
          });
        if (bottleScanError) {
          logger.error('Error creating bottle_scan record:', bottleScanError);
        } else {
          logger.log('Created bottle_scan record for assignment change');
        }
      }

      // Refresh asset data and movement history so RETURN scans and cleared assignment are visible
      // before syncAssignmentFromHistory runs (stale history would otherwise re-apply the old customer).
      const freshAsset = await fetchAssetDetail();
      if (freshAsset) {
        await fetchMovementHistory(freshAsset);
      }
      setEditDialog(false);
      setSuccess('Bottle updated successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      logger.error('Error updating asset:', {
        error,
        bottleId: asset?.id,
        organizationId: profile?.organization_id,
      });
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

      const bottleRowId = asset?.id;
      if (!bottleRowId) {
        throw new Error('Asset not loaded');
      }

      await logBottleAuditEvent({
        action: 'BOTTLE_DELETE',
        bottleId: bottleRowId,
        details: {
          event_type: 'bottle_delete',
          bottle_id: bottleRowId,
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

      const { error: detachErr } = await clearRentalsBottleLinksForBottleIds(
        supabase,
        profile.organization_id,
        [bottleRowId]
      );
      if (detachErr) throw detachErr;

      const { error } = await supabase
        .from('bottles') // Keep using bottles table for now
        .delete()
        .eq('id', bottleRowId)
        .eq('organization_id', profile.organization_id); // SECURITY: Only delete assets from user's organization

      if (error) throw error;

      navigate('/assets');
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
          <Button onClick={() => navigate('/assets')} startIcon={<ArrowBackIcon />} sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none' }}>
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
                    location: String(asset.location || '').trim().toUpperCase(),
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
              label={bottleStatusDisplayLabel(displayStatus, asset?.ownership)}
              color={bottleStatusChipColor(displayStatus, asset?.ownership)}
              size="small"
            />
            {isCustomerOwnedOwnership(asset?.ownership) &&
              ['rented', 'filled', 'empty', 'available', 'full'].includes(
                String(displayStatus || '').toLowerCase()
              ) && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, maxWidth: 520 }}>
                Customer-owned bottles do not use fill or rental status. Save to store status as not tracked (N/A).
              </Typography>
            )}
            {staleCustomerAssignment && (
              <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 1, maxWidth: 520 }}>
                This asset still referenced removed customer &quot;{staleBottleCustomerLabel(asset)}&quot; (deleted from
                the directory). Clearing stale assignment… or use Edit to assign a current customer.
              </Typography>
            )}
            {effectiveStatus === 'rented' && !hasActiveCustomerAssignment && !staleCustomerAssignment && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, maxWidth: 520 }}>
                No customer is linked on this asset record, so it is not clear who it is rented to. Movement history
                has no ship/delivery yet. Use Edit to assign a customer, or open Rentals / the customer page if an open
                rental row exists without a matching assignment here.
              </Typography>
            )}
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

      {/* Customer Assignment — show when list id, legacy customer_id, or display name exists */}
      {hasActiveCustomerAssignment && (
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
                {effectiveAssignedCustomerId || '—'}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="textSecondary">
                Customer Name
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {effectiveAssignedCustomerName || '-'}
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
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
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
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Scan, rental, fill, and audit events for this asset (chain of custody).
        </Typography>
        {movementHistoryError ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {movementHistoryError}
          </Alert>
        ) : null}
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
                  const auditDetails = normalizeAuditDetails(record.details);
                  const typeChangeFields = ['category', 'group_name', 'type', 'gas_type', 'product_code', 'description'];
                  const isTypeChangeAudit =
                    record.history_type === 'audit' &&
                    typeChangeFields.some((field) => auditDetails?.field_changes?.[field]);

                  // Determine action type based on mode/action
                  let action = '';
                  const recordMode = record.mode;
                  const isRnbRecord =
                    recordMode === 'RNB' ||
                    record.action === 'RNB' ||
                    record.history_type === 'rental_rnb';
                  const isTypeChangeScan =
                    recordMode === 'LOCATE' &&
                    typeof record.notes === 'string' &&
                    record.notes.includes('[TYPE_CHANGE]');
                  if (isTypeChangeAudit || isTypeChangeScan) {
                    action = 'Bottle Type Changed';
                  } else if (isRnbRecord) {
                    action = 'RNB (order return — not on open rental)';
                  } else if (isPendingOrderScanRecord(record) && scanRecordModeFamily(record) === 'SHIP') {
                    action = 'Ship scan (pending approval)';
                  } else if (isPendingOrderScanRecord(record) && scanRecordModeFamily(record) === 'RETURN') {
                    action = 'Return scan (pending approval)';
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
                  } else if (record.history_type === 'record_update') {
                    action = record.action || 'Asset record updated';
                  } else {
                    action = recordMode || record.action || 'Scan';
                  }
                  
                  // Determine resulting location (RNB still shows order customer — that is who the return was billed to on the order, not proof of an open rental row)
                  let resultingLocation = '';
                  const isSyntheticBottleStamp =
                    record.history_type === 'record_update' &&
                    (record.id === 'bottle_last_updated' || String(record?.action || '').includes('Asset record updated'));
                  const skipSyntheticStaleCustomer =
                    isSyntheticBottleStamp && staleCustomerAssignment;
                  const custIdForDisplay = skipSyntheticStaleCustomer
                    ? ''
                    : record.customer_id ||
                      record.assigned_customer ||
                      (isSyntheticBottleStamp
                        ? asset?.customer_uuid || asset?.customer_id || asset?.assigned_customer
                        : '') ||
                      '';
                  const custNameForDisplay = skipSyntheticStaleCustomer
                    ? ''
                    : record.customer_name ||
                      (isSyntheticBottleStamp ? asset?.customer_name : '') ||
                      '';
                  if (skipSyntheticStaleCustomer) {
                    resultingLocation = 'Customer removed from directory (stale assignment cleared)';
                  } else if (isPendingOrderScanRecord(record)) {
                    const orderLabel = record.order_number
                      ? `Order ${record.order_number}`
                      : 'Order (pending)';
                    const custHint =
                      custNameForDisplay || custIdForDisplay
                        ? ` · ${custNameForDisplay || custIdForDisplay}`
                        : '';
                    resultingLocation =
                      scanRecordModeFamily(record) === 'RETURN'
                        ? `${orderLabel}${custHint} · scanned return, inventory not updated yet`
                        : `${orderLabel}${custHint} · scanned, not assigned yet`;
                  } else if (custNameForDisplay || custIdForDisplay) {
                    const base = custNameForDisplay
                      ? `Customer: ${custNameForDisplay}${custIdForDisplay ? ` (${custIdForDisplay})` : ''}`
                      : `Customer: (${custIdForDisplay})`;
                    resultingLocation = isRnbRecord
                      ? `${base} · billing exception (not on open rental when approved)`
                      : base;
                  } else if (record.location) {
                    resultingLocation = `In-House: ${record.location}`;
                  } else if (record.history_type === 'fill') {
                    resultingLocation = 'Fill Plant';
                  } else {
                    resultingLocation = 'Unknown';
                  }
                  
                  // Get asset details (use asset data or record data)
                  const category = isTypeChangeAudit
                    ? getAuditFieldChangeDisplay(auditDetails, 'category', asset.category || record.category || 'INDUSTRIAL CYLINDERS')
                    : (asset.category || record.category || 'INDUSTRIAL CYLINDERS');
                  const group = isTypeChangeAudit
                    ? getAuditFieldChangeDisplay(auditDetails, 'group_name', asset.gas_type || record.gas_type || record.group || '')
                    : (asset.gas_type || record.gas_type || record.group || '');
                  const type = isTypeChangeAudit
                    ? getAuditFieldChangeDisplay(auditDetails, 'gas_type', asset.gas_type || record.gas_type || record.type || '')
                    : (asset.gas_type || record.gas_type || record.type || '');
                  const productCode = isTypeChangeAudit
                    ? getAuditFieldChangeDisplay(auditDetails, 'product_code', asset.product_code || record.product_code || '')
                    : (asset.product_code || record.product_code || '');
                  const description = isTypeChangeAudit
                    ? getAuditFieldChangeDisplay(auditDetails, 'description', asset.description || record.description || '')
                    : (
                        record.history_type === 'audit'
                          ? (record.notes || record.description || asset.description || '')
                          : (record.description || record.notes || asset.description || '')
                      );
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
      <Dialog
        open={editDialog}
        onClose={() => {
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
      }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          component: 'form',
          onSubmit: handleSave,
        }}
      >
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
              <FormControl fullWidth>
                <InputLabel>Product Code</InputLabel>
                <Select
                  value={editData.product_code || ''}
                  onChange={(e) => {
                    const selectedProductCode = e.target.value;
                    const matchedGasType = gasTypes.find((item) => item.product_code === selectedProductCode);
                    setEditData({
                      ...editData,
                      product_code: selectedProductCode,
                      gas_type: matchedGasType?.type || editData.gas_type || '',
                      description: matchedGasType?.description || editData.description || ''
                    });
                  }}
                  label="Product Code"
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {productCodeOptions.map((code) => (
                    <MenuItem key={code} value={code}>
                      {code}
                    </MenuItem>
                  ))}
                  {editData.product_code && !productCodeOptions.includes((editData.product_code || '').trim()) && (
                    <MenuItem value={editData.product_code}>
                      {editData.product_code} (current)
                    </MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Gas Type</InputLabel>
                <Select
                  value={editData.gas_type || ''}
                  onChange={(e) => {
                    const selectedGasType = e.target.value;
                    const matchedGasType = gasTypes.find((item) => item.type === selectedGasType);
                    setEditData({
                      ...editData,
                      gas_type: selectedGasType,
                      product_code: matchedGasType?.product_code || editData.product_code || '',
                      description: matchedGasType?.description || editData.description || ''
                    });
                  }}
                  label="Gas Type"
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {gasTypeOptions.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                  {editData.gas_type && !gasTypeOptions.includes((editData.gas_type || '').trim()) && (
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
                  value={
                    isCustomerOwnedOwnership(editData.ownership)
                      ? normalizeStatus(editData.status) === 'lost'
                        ? 'lost'
                        : CUSTOMER_OWNED_STORED_STATUS
                      : normalizeStatus(editData.status)
                  }
                  onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                  label="Status"
                >
                  {isCustomerOwnedOwnership(editData.ownership) ? (
                    [
                      <MenuItem key="available" value={CUSTOMER_OWNED_STORED_STATUS}>N/A (not tracked)</MenuItem>,
                      <MenuItem key="lost" value="lost">Lost</MenuItem>,
                    ]
                  ) : (
                    [
                      <MenuItem key="filled" value="filled">Full</MenuItem>,
                      <MenuItem key="empty" value="empty">Empty</MenuItem>,
                      <MenuItem key="rented" value="rented">Rented</MenuItem>,
                      <MenuItem key="lost" value="lost">Lost</MenuItem>,
                    ]
                  )}
                </Select>
                {isCustomerOwnedOwnership(editData.ownership) && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1.75 }}>
                    Customer-owned bottles are not rental stock; fill level is not tracked.
                  </Typography>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Location</InputLabel>
                <Select
                  value={String(editData.location || '').trim().toUpperCase()}
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
              <Autocomplete
                options={customerAssignOptions}
                loading={loadingCustomers}
                clearOnEscape
                inputValue={customerAssignInput}
                onInputChange={(_, value, reason) => {
                  if (reason === 'reset') return;
                  setCustomerAssignInput(value || '');
                  if (customerSearchTimerRef.current) {
                    clearTimeout(customerSearchTimerRef.current);
                  }
                  customerSearchTimerRef.current = setTimeout(() => {
                    void searchCustomerAssignOptions(value);
                  }, 300);
                }}
                value={
                  customerAssignOptions.find((c) => c.CustomerListID === editData.assigned_customer) ||
                  activeCustomers.find((c) => c.CustomerListID === editData.assigned_customer) ||
                  (editData.assigned_customer
                    ? {
                        CustomerListID: editData.assigned_customer,
                        name: editData.customer_name || editData.assigned_customer,
                        customer_type: null,
                      }
                    : null)
                }
                isOptionEqualToValue={(option, value) =>
                  String(option?.CustomerListID || '') === String(value?.CustomerListID || '')
                }
                getOptionLabel={customerOptionLabel}
                filterOptions={(options) => options}
                noOptionsText={
                  loadingCustomers
                    ? 'Searching customers…'
                    : customerAssignSearchError || 'No customers found'
                }
                onChange={(_, selectedCustomer) => {
                  const customerId = selectedCustomer?.CustomerListID || null;
                  const next = {
                    ...editData,
                    assigned_customer: customerId,
                    customer_name: selectedCustomer?.name || selectedCustomer?.Name || null,
                  };
                  if (customerId && selectedCustomer && selectedCustomer.customer_type !== 'VENDOR') {
                    const loc = bottleLocationValueForCustomer(selectedCustomer, locations);
                    if (loc) next.location = loc;
                  }
                  setEditData(next);
                  setCustomerAssignInput(selectedCustomer ? customerOptionLabel(selectedCustomer) : '');
                  setCustomerAssignSearchError('');
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Assign to Customer"
                    placeholder="Search by name, CustomerListID, phone, or city"
                    error={Boolean(customerAssignSearchError)}
                    helperText={
                      customerAssignSearchError ||
                      (activeCustomers.length > 0
                        ? `${activeCustomers.length} customers in directory — type to search`
                        : 'Type a name or CustomerListID to search')
                    }
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Ownership</InputLabel>
                <Select
                  value={editData.ownership || ''}
                  label="Ownership"
                  onChange={(e) => {
                    const ownership = e.target.value;
                    const next = { ...editData, ownership };
                    if (isCustomerOwnedOwnership(ownership)) {
                      next.status = persistedStatusForOwnership(editData.status, ownership);
                    }
                    setEditData(next);
                  }}
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
          <Button onClick={(e) => handleSave(e)} type="button" variant="contained" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 