import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  IconButton,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Tooltip,
  Stack,
  TablePagination
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Undo as UndoIcon,
  CheckCircle as VerifiedIcon,
  LocalShipping as ShippingIcon,
  Assignment as InvoiceIcon,
  Person as CustomerIcon,
  CalendarToday as DateIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { PageSearchInput } from '../components/ui/search-input-with-icon';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import logger from '../utils/logger';
import { bottleAssignmentService } from '../services/bottleAssignmentService';
import { dedupeVerifiedOrdersByOrderNumber } from '../utils/verifiedOrdersDedup';
import {
  collectVerifiedOrderNumbersFromImports,
  filterScannedOrdersWithoutImportCoverage,
  flattenImportRecordsToOrderRows,
  parseImportDataField,
  supplementImportRowsForScannedOrders,
} from '../utils/verifiedOrdersList';
import { resolveOrderNumberFromListEntry } from '../utils/verifiedOrdersDedup';

export default function VerifiedOrders() {
  const { organization } = useAuth();
  const navigate = useNavigate();
  const [verifiedOrders, setVerifiedOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all, invoice, receipt, scanned
  const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  
  // Dialog states
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [unverifyDialogOpen, setUnverifyDialogOpen] = useState(false);
  const [unverifyLoading, setUnverifyLoading] = useState(false);
  
  // Snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (organization?.id) {
      fetchVerifiedOrders();
    }
  }, [organization?.id]);

  useEffect(() => {
    applyFilters();
  }, [verifiedOrders, search, typeFilter, dateFilter]);

  const fetchVerifiedOrders = async () => {
    try {
      setLoading(true);
      logger.log('🔍 Fetching verified orders for organization:', organization.id);

      const normalizeOrderNumForList = (num) => {
        if (num == null || num === '') return '';
        const s = String(num).trim();
        if (/^\d+$/.test(s)) return s.replace(/^0+/, '') || '0';
        return s;
      };

      const [
        { data: invoices, error: invoiceError },
        { data: receipts, error: receiptError },
        { data: pendingInvoices, error: pendingInvErr },
        { data: pendingReceipts, error: pendingRecErr },
        { data: bottleScansList, error: bottleScanError },
      ] = await Promise.all([
        supabase
          .from('imported_invoices')
          .select('*')
          .eq('organization_id', organization.id)
          .in('status', ['verified', 'approved'])
          .order('approved_at', { ascending: false })
          .order('verified_at', { ascending: false }),
        supabase
          .from('imported_sales_receipts')
          .select('*')
          .eq('organization_id', organization.id)
          .in('status', ['verified', 'approved'])
          .order('approved_at', { ascending: false })
          .order('verified_at', { ascending: false }),
        supabase
          .from('imported_invoices')
          .select('*')
          .eq('organization_id', organization.id)
          .in('status', ['pending', 'processing']),
        supabase
          .from('imported_sales_receipts')
          .select('*')
          .eq('organization_id', organization.id)
          .in('status', ['pending', 'processing']),
        supabase
          .from('bottle_scans')
          .select('id, bottle_barcode, order_number, mode, organization_id, customer_name, customer_id, created_at')
          .eq('organization_id', organization.id)
          .not('order_number', 'is', null)
          .order('created_at', { ascending: false }),
      ]);

      if (invoiceError) {
        logger.error('Error fetching verified invoices:', invoiceError);
        throw invoiceError;
      }
      if (receiptError) {
        logger.error('Error fetching verified receipts:', receiptError);
        throw receiptError;
      }
      if (pendingInvErr) logger.warn('Pending invoices fetch (partial verified):', pendingInvErr);
      if (pendingRecErr) logger.warn('Pending receipts fetch (partial verified):', pendingRecErr);
      if (bottleScanError) {
        logger.error('Error fetching bottle_scans for verified list:', bottleScanError);
      }

      const scansForGroup = (bottleScansList || []).map((s) => ({
        ...s,
        barcode_number: s.bottle_barcode,
        action:
          (s.mode || '').toString().toUpperCase() === 'SHIP' ||
          (s.mode || '').toString().toUpperCase() === 'DELIVERY'
            ? 'out'
            : 'in',
      }));

      const importRecordSets = [
        { records: invoices, tableType: 'invoice' },
        { records: receipts, tableType: 'receipt' },
        { records: pendingInvoices, tableType: 'invoice' },
        { records: pendingReceipts, tableType: 'receipt' },
      ];

      // Expand every import file into per-order Invoice/Receipt rows (approved + pending).
      let importOrderRows = flattenImportRecordsToOrderRows(importRecordSets, normalizeOrderNumForList);
      importOrderRows.forEach((row) => {
        row.icon = row.type === 'invoice' ? <InvoiceIcon /> : <ShippingIcon />;
      });

      const hydratePartialVerifiedEvidenceDates = async (partials, orgId) => {
        if (!partials?.length || !orgId) return;
        const variantSet = new Set();
        for (const p of partials) {
          const raw = String(p.order_number || '').trim();
          if (!raw) continue;
          variantSet.add(raw);
          const n = normalizeOrderNumForList(raw);
          if (n && n !== raw) variantSet.add(n);
        }
        const variantList = [...variantSet].filter(Boolean);
        if (!variantList.length) return;

        const minMsByNorm = new Map();
        const recordMin = (orderKeyRaw, timeIso) => {
          if (!orderKeyRaw || !timeIso) return;
          const k = normalizeOrderNumForList(orderKeyRaw);
          if (!k) return;
          const t = new Date(timeIso).getTime();
          if (!Number.isFinite(t) || t <= 0) return;
          const prev = minMsByNorm.get(k);
          if (prev == null || t < prev) minMsByNorm.set(k, t);
        };

        const chunk = 120;
        for (let i = 0; i < variantList.length; i += chunk) {
          const slice = variantList.slice(i, i + chunk);
          const [{ data: btls }, { data: scans }] = await Promise.all([
            supabase
              .from('bottles')
              .select('last_verified_order, updated_at')
              .eq('organization_id', orgId)
              .in('last_verified_order', slice),
            supabase
              .from('bottle_scans')
              .select('order_number, created_at')
              .eq('organization_id', orgId)
              .in('order_number', slice),
          ]);
          (btls || []).forEach((b) => recordMin(b.last_verified_order, b.updated_at));
          (scans || []).forEach((s) => recordMin(s.order_number, s.created_at));
        }

        for (const p of partials) {
          const k = normalizeOrderNumForList(p.order_number);
          const evidenceMs = k ? minMsByNorm.get(k) : null;
          if (evidenceMs != null) {
            const iso = new Date(evidenceMs).toISOString();
            p.verified_at = iso;
            p.approved_at = iso;
          }
        }
      };
      await hydratePartialVerifiedEvidenceDates(importOrderRows, organization.id);

      const verifiedOrderNums = collectVerifiedOrderNumbersFromImports(
        [invoices, receipts, pendingInvoices, pendingReceipts],
        normalizeOrderNumForList,
      );
      const scannedOrdersRaw = groupScansByOrder(scansForGroup).filter((o) =>
        verifiedOrderNums.has(normalizeOrderNumForList(o.order_number)),
      );

      importOrderRows = supplementImportRowsForScannedOrders({
        importOrderRows,
        scannedOrders: scannedOrdersRaw,
        recordSets: importRecordSets,
        normalizeOrderNum: normalizeOrderNumForList,
      });
      importOrderRows.forEach((row) => {
        if (!row.icon) {
          row.icon = row.type === 'invoice' ? <InvoiceIcon /> : <ShippingIcon />;
        }
      });

      const scannedOrders = filterScannedOrdersWithoutImportCoverage(
        scannedOrdersRaw,
        importOrderRows,
        normalizeOrderNumForList,
      );

      const allOrders = [...importOrderRows, ...scannedOrders];
      
      // For orders without customer names, try to get from invoice data first, then fallback to bottle_scans or rentals
      for (const order of allOrders) {
        // First, try to extract customer name from invoice data using getCustomerName function
        // This properly checks all possible locations in the invoice data
        const customerNameFromInvoice = getCustomerName(order);
        
        if (customerNameFromInvoice && customerNameFromInvoice !== 'N/A' && customerNameFromInvoice !== 'Unknown') {
          // Invoice has customer name - use it (this is the source of truth)
          order.customer_name = customerNameFromInvoice;
          if (!order.data_parsed) order.data_parsed = {};
          order.data_parsed.customer_name = customerNameFromInvoice;
          logger.log(`✅ Found customer name from invoice data for order: ${customerNameFromInvoice}`);
        } else {
          // Invoice doesn't have customer name - fallback to bottle_scans or rentals
          // Extract order number manually (getOrderNumber is defined later)
          let orderNum = order.order_number || order.data_parsed?.order_number || order.data_parsed?.reference_number || order.data_parsed?.invoice_number;
          if (!orderNum && order.data_parsed?.rows && order.data_parsed.rows.length > 0) {
            const firstRow = order.data_parsed.rows[0];
            orderNum = firstRow.order_number || firstRow.invoice_number || firstRow.reference_number || firstRow.sales_receipt_number;
          }
          if (orderNum && orderNum !== 'N/A') {
            // Try to get customer name from rentals table first (more reliable than bottle_scans)
            const { data: rentals } = await supabase
              .from('rentals')
              .select('customer_name')
              .eq('order_number', orderNum)
              .eq('organization_id', organization.id)
              .limit(1);
            
            if (rentals && rentals.length > 0 && rentals[0].customer_name) {
              order.customer_name = rentals[0].customer_name;
              if (!order.data_parsed) order.data_parsed = {};
              order.data_parsed.customer_name = rentals[0].customer_name;
              logger.log(`✅ Found customer name from rentals for order ${orderNum}: ${rentals[0].customer_name}`);
            } else {
              // Last resort: try to get customer name from bottle_scans (may be incorrect)
              const { data: bottleScans } = await supabase
                .from('bottle_scans')
                .select('customer_name')
                .eq('order_number', orderNum)
                .eq('organization_id', organization.id)
                .limit(1);
              
              if (bottleScans && bottleScans.length > 0 && bottleScans[0].customer_name) {
                order.customer_name = bottleScans[0].customer_name;
                if (!order.data_parsed) order.data_parsed = {};
                order.data_parsed.customer_name = bottleScans[0].customer_name;
                logger.log(`⚠️ Found customer name from bottle_scans for order ${orderNum} (fallback): ${bottleScans[0].customer_name}`);
              }
            }
          }
        }
      }

      // One row per order number; invoice beats scanned when names differ (e.g. QB vs scan customer).
      const deduplicatedOrders = dedupeVerifiedOrdersByOrderNumber(allOrders);

      // #region agent log
      {
        const probeNorm = '75794';
        const normProbe = (o) =>
          normalizeOrderNumForList(resolveOrderNumberFromListEntry(o) || o.order_number);
        const pick = (list) =>
          (list || [])
            .filter((o) => normProbe(o) === probeNorm)
            .map((o) => ({ type: o.type, displayType: o.displayType, id: String(o.id || '').slice(0, 24) }));
        if (typeof fetch === 'function') {
          fetch('http://127.0.0.1:7758/ingest/242000ab-af8f-404d-8cf3-4f163de25904', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'fb3b83' },
            body: JSON.stringify({
              sessionId: 'fb3b83',
              runId: 'post-fix-v2',
              hypothesisId: 'V1-V3',
              location: 'VerifiedOrders.jsx:fetchVerifiedOrders',
              message: 'verified orders assembly for 75794',
              data: {
                importRows: pick(importOrderRows),
                scannedRaw: pick(scannedOrdersRaw),
                scannedKept: pick(scannedOrders),
                deduped: pick(deduplicatedOrders),
                inVerifiedOrderNums: verifiedOrderNums.has(probeNorm),
              },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
        }
      }
      // #endregion

      // Sort by latest first (approved_at / verified_at / created_at descending)
      const getOrderDate = (order) => new Date(order.approved_at || order.verified_at || order.created_at || 0).getTime();
      deduplicatedOrders.sort((a, b) => getOrderDate(b) - getOrderDate(a));

      logger.log(`✅ Fetched ${allOrders.length} verified orders (${deduplicatedOrders.length} after dedup)`);
      setVerifiedOrders(deduplicatedOrders);
    } catch (error) {
      logger.error('Error fetching verified orders:', error);
      setSnackbar({ 
        open: true, 
        message: 'Failed to load verified orders: ' + error.message, 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const groupScansByOrder = (scans) => {
    const orderGroups = {};
    
    scans.forEach(scan => {
      const orderNum = scan.order_number;
      if (!orderGroups[orderNum]) {
        orderGroups[orderNum] = {
          id: `scanned_${orderNum}`,
          type: 'scanned',
          displayType: 'Scanned Order',
          icon: <ShippingIcon />,
          order_number: orderNum,
          customer_name: scan.customer_name,
          status: scan.status,
          verified_at: scan.updated_at || scan.created_at,
          scans: [],
          data_parsed: {
            order_number: orderNum,
            customer_name: scan.customer_name,
            rows: []
          }
        };
      }
      orderGroups[orderNum].scans.push(scan);
    });

    return Object.values(orderGroups);
  };

  const parseDataField = parseImportDataField;

  const applyFilters = () => {
    let filtered = [...verifiedOrders];

    // Type filter: match exact type (invoice, receipt, scanned)
    if (typeFilter !== 'all') {
      filtered = filtered.filter(order => (order.type || '') === typeFilter);
    }

    // Date filter: use approved_at first (what we set on verify), then verified_at, then created_at
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          filterDate.setHours(0, 0, 0, 0);
          break;
      }

      filtered = filtered.filter(order => {
        const orderDate = new Date(order.approved_at || order.verified_at || order.created_at || 0);
        return orderDate >= filterDate;
      });
    }

    // Search filter: use same getters as display so search matches what user sees
    if (search.trim()) {
      const searchLower = search.toLowerCase().trim();
      filtered = filtered.filter(order => {
        const orderNum = String(getOrderNumber(order) || '').toLowerCase();
        const customerName = String(getCustomerName(order) || '').toLowerCase();
        const refNum = String(order.data_parsed?.reference_number || order.data_parsed?.invoice_number || '').toLowerCase();
        return (
          orderNum.includes(searchLower) ||
          customerName.includes(searchLower) ||
          refNum.includes(searchLower)
        );
      });
    }

    // Keep sort by latest first
    const getOrderDate = (order) => new Date(order.approved_at || order.verified_at || order.created_at || 0).getTime();
    filtered.sort((a, b) => getOrderDate(b) - getOrderDate(a));

    setFilteredOrders(filtered);
    setPage(0); // Reset to first page when filters change
  };

  // Normalize order number for matching (trim, strip leading zeros for numeric)
  const normalizeOrderNumForReverse = (num) => {
    if (num == null || num === '') return '';
    const s = String(num).trim();
    if (/^\d+$/.test(s)) return s.replace(/^0+/, '') || '0';
    return s;
  };
  const normalizeBarcode = (b) => (b == null || b === '') ? '' : String(b).trim().replace(/^0+/, '') || String(b).trim();

  // Reverse bottle assignments that were made during verify.
  // SHIP bottles get unassigned; RETURN bottles get reassigned back to the customer.
  const reverseBottleAssignments = async (orderNumber, customerName, orderCustomerId) => {
    if (!orderNumber || !organization?.id) return;
    const orgId = organization.id;
    const targetOrderNorm = normalizeOrderNumForReverse(orderNumber);
    if (!targetOrderNorm) return;

    // Use customer ID from order first (customer detail page queries by CustomerListID)
    let customerId = orderCustomerId ? String(orderCustomerId).trim() || null : null;
    if (!customerId && customerName) {
      const { data: cust } = await supabase
        .from('customers')
        .select('CustomerListID')
        .eq('name', customerName)
        .eq('organization_id', orgId)
        .limit(1)
        .single();
      if (cust) customerId = cust.CustomerListID;
    }

    const { data: bottleScansData } = await supabase
      .from('bottle_scans')
      .select('bottle_barcode, mode, created_at, order_number')
      .eq('organization_id', orgId)
      .not('order_number', 'is', null);
    const bottleScans = (bottleScansData || []).filter(s => normalizeOrderNumForReverse(s.order_number) === targetOrderNorm);

    const barcodeMode = new Map();
    const processRow = (barcode, mode, action, createdAt) => {
      if (!barcode) return;
      const bNorm = normalizeBarcode(barcode);
      if (!bNorm) return;
      const m = (mode || '').toUpperCase();
      const a = (action || '').toLowerCase();
      const isReturn = m === 'RETURN' || m === 'PICKUP' || a === 'in';
      const time = new Date(createdAt || 0).getTime();
      const existing = barcodeMode.get(bNorm);
      if (!existing || time >= existing.time) {
        barcodeMode.set(bNorm, { isReturn, time });
      }
    };
    bottleScans.forEach(s => processRow(s.bottle_barcode, s.mode, null, s.created_at));

    const shippedBarcodeNorms = new Set();
    const returnedBarcodeToRaw = new Map(); // norm -> one raw barcode for DB update
    barcodeMode.forEach(({ isReturn }, bNorm) => {
      if (isReturn) returnedBarcodeToRaw.set(bNorm, null);
      else shippedBarcodeNorms.add(bNorm);
    });
    const shippedRawBarcodes = new Set();
    bottleScans.forEach(s => {
      const b = s.bottle_barcode;
      if (b) {
        const n = normalizeBarcode(b);
        if (returnedBarcodeToRaw.has(n) && returnedBarcodeToRaw.get(n) == null) returnedBarcodeToRaw.set(n, b);
        if (shippedBarcodeNorms.has(n)) shippedRawBarcodes.add(b);
      }
    });

    logger.log(`🔄 Reversing bottle assignments for order ${orderNumber}: ${shippedBarcodeNorms.size} SHIP (will unassign), ${returnedBarcodeToRaw.size} RETURN (will reassign)`);

    // Reverse SHIP: unassign bottles from customer. Fetch by customer (ID + name) and by barcode so we don't miss.
    if (shippedBarcodeNorms.size > 0) {
      const byId = new Map();
      if (customerId) {
        const { data } = await supabase.from('bottles').select('id, barcode_number, assigned_customer, customer_name').eq('organization_id', orgId).eq('assigned_customer', customerId);
        (data || []).forEach(b => byId.set(b.id, b));
      }
      if (customerName && customerName.trim()) {
        const { data } = await supabase.from('bottles').select('id, barcode_number, assigned_customer, customer_name').eq('organization_id', orgId).eq('customer_name', customerName.trim());
        (data || []).forEach(b => byId.set(b.id, b));
      }
      // Fallback: fetch by SHIP barcodes so we catch bottles even if customer id/name mismatch
      if (shippedRawBarcodes.size > 0) {
        const arr = [...shippedRawBarcodes];
        for (let i = 0; i < arr.length; i += 200) {
          const chunk = arr.slice(i, i + 200);
          const { data } = await supabase.from('bottles').select('id, barcode_number, assigned_customer, customer_name').eq('organization_id', orgId).in('barcode_number', chunk);
          (data || []).forEach(b => {
            const norm = normalizeBarcode(b.barcode_number);
            if (norm && shippedBarcodeNorms.has(norm)) {
              const ac = String(b.assigned_customer || '').trim();
              const cn = String(b.customer_name || '').trim();
              const match = (customerId && ac === String(customerId).trim()) ||
                (customerName && cn === String(customerName).trim()) ||
                (customerName && ac === String(customerName).trim()) ||
                (customerId && cn === String(customerId).trim());
              if (match) byId.set(b.id, b);
            }
          });
        }
      }
      const customerBottles = Array.from(byId.values());
      const toUnassign = customerBottles.filter(b => {
        const norm = normalizeBarcode(b.barcode_number);
        return norm && shippedBarcodeNorms.has(norm);
      });
      for (const bottle of toUnassign) {
        const { error } = await supabase
          .from('bottles')
          .update({ assigned_customer: null, customer_name: null, status: 'available' })
          .eq('id', bottle.id);
        if (error) {
          logger.warn(`⚠️ Failed to unassign SHIP bottle ${bottle.barcode_number}:`, error.message);
        } else {
          logger.log(`✅ Unassigned SHIP bottle ${bottle.barcode_number} from customer`);
          const { data: rentals } = await supabase
            .from('rentals')
            .select('id')
            .eq('bottle_barcode', bottle.barcode_number)
            .eq('organization_id', orgId)
            .is('rental_end_date', null)
            .limit(1);
          if (rentals?.length > 0) {
            await supabase.from('rentals').update({ rental_end_date: new Date().toISOString().split('T')[0] }).eq('id', rentals[0].id);
          }
        }
      }
    }

    // Reverse RETURN: reassign bottles back to the customer (so they show on customer page again).
    const returnedNorms = new Set(returnedBarcodeToRaw.keys());
    if (returnedNorms.size === 0) return;

    const barcodeStrings = new Set();
    returnedBarcodeToRaw.forEach((raw, norm) => {
      if (raw) barcodeStrings.add(raw);
      if (norm) barcodeStrings.add(norm);
    });
    let bottlesToReassign = [];
    const { data: byBarcode } = await supabase
      .from('bottles')
      .select('id, barcode_number')
      .eq('organization_id', orgId)
      .in('barcode_number', [...barcodeStrings]);
    const byNorm = new Map();
    (byBarcode || []).forEach(b => {
      const n = normalizeBarcode(b.barcode_number);
      if (n && returnedNorms.has(n)) byNorm.set(n, b);
    });
    bottlesToReassign = [...byNorm.values()];
    if (bottlesToReassign.length < returnedNorms.size) {
      const { data: allOrg } = await supabase
        .from('bottles')
        .select('id, barcode_number')
        .eq('organization_id', orgId)
        .not('barcode_number', 'is', null)
        .limit(5000);
      (allOrg || []).forEach(b => {
        const n = normalizeBarcode(b.barcode_number);
        if (n && returnedNorms.has(n) && !byNorm.has(n)) {
          byNorm.set(n, b);
        }
      });
      bottlesToReassign = [...byNorm.values()];
    }
    const assignPayload = {
      assigned_customer: customerId != null ? customerId : customerName,
      customer_name: customerName || '',
      status: 'full'
    };
    for (const bottle of bottlesToReassign) {
      const { error } = await supabase
        .from('bottles')
        .update(assignPayload)
        .eq('id', bottle.id);
      if (error) {
        logger.warn(`⚠️ Failed to reassign RETURN bottle ${bottle.barcode_number} back to customer:`, error.message);
      } else {
        logger.log(`✅ Reassigned RETURN bottle ${bottle.barcode_number} back to customer ${customerName || customerId}`);
      }
    }
  };

  const handleUnverify = async (order) => {
    try {
      setUnverifyLoading(true);
      logger.log('🔄 Unverifying order:', order.id);

      const orderNumber = getOrderNumber(order);
      logger.log('📋 Order number for unverify:', orderNumber);

      // Normalize order number for matching (remove leading zeros and trim)
      const normalizeOrderNum = (num) => {
        if (!num) return '';
        return String(num).trim().replace(/^0+/, '');
      };
      const normalizedOrderNum = normalizeOrderNum(orderNumber);

      let tableName;
      if (order.type === 'invoice') {
        tableName = 'imported_invoices';
      } else if (order.type === 'receipt') {
        tableName = 'imported_sales_receipts';
      } else if (order.type === 'scanned') {
        // bottle_scans only; no status to revert (unverify for scanned = no-op for DB, UI removes from list)
        const { data: existingBottleScans } = await supabase
          .from('bottle_scans')
          .select('id, order_number')
          .eq('organization_id', organization.id);
        const matching = (existingBottleScans || []).filter(bs => {
          const bsOrderNum = normalizeOrderNum(bs.order_number);
          return bsOrderNum === normalizedOrderNum || bsOrderNum === normalizeOrderNum(order.order_number);
        });
        logger.log('🔍 Scanned order unverify (bottle_scans only):', order.order_number, 'rows:', matching.length);
        
        // Also clear verified_order_numbers from any matching imported_invoices/receipts
        try {
          for (const tbl of ['imported_invoices', 'imported_sales_receipts']) {
            const { data: matchingRecords } = await supabase
              .from(tbl)
              .select('id, data, status')
              .eq('organization_id', organization.id);
            for (const rec of matchingRecords || []) {
              let recData = rec.data;
              if (typeof recData === 'string') {
                try {
                  recData = JSON.parse(recData);
                } catch {
                  recData = {};
                }
              }
              recData = recData || {};
              const vor = Array.isArray(recData.verified_order_numbers)
                ? recData.verified_order_numbers
                : [];
              const hadOrder =
                vor.some((n) => normalizeOrderNum(n) === normalizedOrderNum) ||
                (recData.rows || recData.line_items || []).some((row) => {
                  const ref =
                    row.order_number ||
                    row.invoice_number ||
                    row.reference_number ||
                    row.sales_receipt_number;
                  return ref && normalizeOrderNum(ref) === normalizedOrderNum;
                });
              if (!hadOrder) continue;

              if (!Object.prototype.hasOwnProperty.call(recData, 'verified_order_numbers')) {
                recData.verified_order_numbers = [];
              }
              recData.verified_order_numbers = vor.filter(
                (n) => normalizeOrderNum(n) !== normalizedOrderNum,
              );
              const reopen = {
                data: recData,
                status: 'pending',
                approved_at: null,
                verified_at: null,
                verified_by: null,
              };
              if (tbl === 'imported_invoices') reopen.auto_approved = false;
              await supabase.from(tbl).update(reopen).eq('id', rec.id);
              logger.log(
                `✅ Reopened ${tbl} record ${rec.id} for unverified scanned order ${orderNumber}`,
              );
            }
          }
        } catch (vonErr) {
          logger.warn('Warning clearing verified_order_numbers for scanned order:', vonErr);
        }

        // Reverse bottle assignments (SHIP → unassign, RETURN → reassign back)
        const customerName = getCustomerName(order);
        const orderCustomerId = getCustomerId(order);
        await reverseBottleAssignments(orderNumber, customerName, orderCustomerId);

        setSnackbar({ 
          open: true, 
          message: 'Order unverified successfully. Bottle assignments have been reversed.', 
          severity: 'success' 
        });
        setUnverifyDialogOpen(false);
        setSelectedOrder(null);
        fetchVerifiedOrders();
        return;
      }

      // Try transactional RPC for bottle reversal + import record reset
      const rpcResult = await bottleAssignmentService.unverifyOrder({
        importRecordId: order.id,
        importTable: tableName,
        organizationId: organization.id,
        orderNumber: orderNumber,
      });

      if (rpcResult.success) {
        logger.log('RPC unverify succeeded:', rpcResult.data);
      } else {
        logger.warn('RPC unverify failed, falling back to inline logic:', rpcResult.error);

        // Fallback: manual record reset
        const { error: recordError } = await supabase
          .from(tableName)
          .update({
            status: 'pending',
            verified_at: null,
            verified_by: null,
            approved_at: null,
            ...(tableName === 'imported_invoices' ? { auto_approved: false } : {}),
          })
          .eq('id', order.id);
        if (recordError) throw recordError;

        // Fallback: reverse bottle assignments manually
        const customerName = getCustomerName(order);
        const orderCustomerId = getCustomerId(order);
        await reverseBottleAssignments(orderNumber, customerName, orderCustomerId);
      }

      // Single DB write: strip this order from verified_order_numbers (all # variants on this card) and
      // always reopen the import row so Order Verification lists it again (approved_at / status were hiding it).
      try {
        const normStrip = (n) => {
          if (n == null || n === '') return '';
          const s = String(n).trim();
          if (/^\d+$/.test(s)) return s.replace(/^0+/, '') || '0';
          return s;
        };
        const { data: currentRecord, error: curErr } = await supabase
          .from(tableName)
          .select('data')
          .eq('id', order.id)
          .eq('organization_id', organization.id)
          .single();
        if (curErr) throw curErr;
        const rawData = currentRecord?.data;
        let currentData = null;
        if (rawData != null && rawData !== '') {
          if (typeof rawData === 'string') {
            try {
              currentData = JSON.parse(rawData);
            } catch {
              currentData = null;
            }
          } else if (typeof rawData === 'object' && rawData !== null) {
            currentData = { ...rawData };
          }
        }
        const vor =
          currentData && Array.isArray(currentData.verified_order_numbers)
            ? currentData.verified_order_numbers
            : [];
        const stripNorms = new Set(
          [
            normStrip(orderNumber),
            normStrip(order.order_number),
            normalizedOrderNum,
            ...((order.data_parsed?.rows || order.data_parsed?.line_items || []).flatMap((r) => {
              const o = r.order_number || r.invoice_number || r.reference_number || r.sales_receipt_number;
              const x = normStrip(o);
              return x ? [x] : [];
            })),
          ].filter(Boolean)
        );
        if (currentData) {
          if (!Object.prototype.hasOwnProperty.call(currentData, 'verified_order_numbers')) {
            currentData.verified_order_numbers = [];
          }
          currentData.verified_order_numbers = vor.filter((n) => !stripNorms.has(normStrip(n)));
        }

        const patch = {
          status: 'pending',
          verified_at: null,
          verified_by: null,
          approved_at: null,
        };
        if (currentData) {
          patch.data = currentData;
        }
        if (tableName === 'imported_invoices') {
          patch.auto_approved = false;
        }
        await supabase.from(tableName).update(patch).eq('id', order.id).eq('organization_id', organization.id);
      } catch (e) {
        logger.warn('Warning unverify import row (data + reopen):', e);
        try {
          const patch = {
            status: 'pending',
            verified_at: null,
            verified_by: null,
            approved_at: null,
          };
          if (tableName === 'imported_invoices') patch.auto_approved = false;
          await supabase.from(tableName).update(patch).eq('id', order.id).eq('organization_id', organization.id);
        } catch (e2) {
          logger.warn('Warning unverify import row status-only fallback:', e2);
        }
      }

      // bottle_scans has no status; unverify state is on import record only
      logger.log('🔄 Unverify complete for order:', orderNumber);

      // Bottle reversal is handled above (RPC path or fallback)

      setSnackbar({ 
        open: true, 
        message: 'Order unverified successfully. Bottle assignments have been reversed.', 
        severity: 'success' 
      });
      setUnverifyDialogOpen(false);
      setSelectedOrder(null);
      fetchVerifiedOrders();
    } catch (error) {
      logger.error('Error unverifying order:', error);
      setSnackbar({ 
        open: true, 
        message: 'Failed to unverify order: ' + error.message, 
        severity: 'error' 
      });
    } finally {
      setUnverifyLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getOrderNumber = (order) => {
    // Try direct properties first
    if (order.order_number) return order.order_number;
    if (order.data_parsed?.order_number) return order.data_parsed.order_number;
    if (order.data_parsed?.reference_number) return order.data_parsed.reference_number;
    if (order.data_parsed?.invoice_number) return order.data_parsed.invoice_number;
    
    // Check rows array
    if (order.data_parsed?.rows && order.data_parsed.rows.length > 0) {
      for (const row of order.data_parsed.rows) {
        const rowOrderNum = row.order_number || row.invoice_number || row.reference_number || row.sales_receipt_number;
        if (rowOrderNum) return rowOrderNum;
      }
    }
    
    return 'N/A';
  };

  const getCustomerName = (order) => {
    // Try direct properties first
    if (order.customer_name) return order.customer_name;
    if (order.data_parsed?.customer_name) return order.data_parsed.customer_name;
    if (order.data_parsed?.CustomerName) return order.data_parsed.CustomerName;
    if (order.data_parsed?.Customer) return order.data_parsed.Customer;
    
    // Try to get from rows array (for imported invoices/receipts)
    if (order.data_parsed?.rows && order.data_parsed.rows.length > 0) {
      const firstRow = order.data_parsed.rows[0];
      if (firstRow.customer_name) return firstRow.customer_name;
      if (firstRow.CustomerName) return firstRow.CustomerName;
      if (firstRow.Customer) return firstRow.Customer;
    }
    
    // Try to get from line_items array
    if (order.data_parsed?.line_items && order.data_parsed.line_items.length > 0) {
      const firstItem = order.data_parsed.line_items[0];
      if (firstItem.customer_name) return firstItem.customer_name;
      if (firstItem.CustomerName) return firstItem.CustomerName;
      if (firstItem.Customer) return firstItem.Customer;
    }
    
    // Try to get from summary
    if (order.data_parsed?.summary?.customer_name) {
      return order.data_parsed.summary.customer_name;
    }
    
    // For scanned orders, try to get from scans
    if (order.scans && order.scans.length > 0) {
      const firstScan = order.scans[0];
      if (firstScan.customer_name) return firstScan.customer_name;
    }
    
    // Last resort: try to get from raw data if it's a string
    if (order.data && typeof order.data === 'string') {
      try {
        const parsed = JSON.parse(order.data);
        if (parsed.customer_name) return parsed.customer_name;
        if (parsed.CustomerName) return parsed.CustomerName;
        if (parsed.rows && parsed.rows.length > 0 && parsed.rows[0].customer_name) {
          return parsed.rows[0].customer_name;
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
    return '';
  };

  const getCustomerId = (order) => {
    if (order.customer_id) return order.customer_id;
    if (order.data_parsed?.customer_id) return order.data_parsed.customer_id;
    if (order.data_parsed?.CustomerListID) return order.data_parsed.CustomerListID;
    if (order.data_parsed?.CustomerId) return order.data_parsed.CustomerId;
    if (order.data_parsed?.rows?.[0]) {
      const r = order.data_parsed.rows[0];
      return r.customer_id || r.CustomerListID || r.CustomerId || '';
    }
    if (order.data_parsed?.line_items?.[0]) {
      const i = order.data_parsed.line_items[0];
      return i.customer_id || i.CustomerListID || i.CustomerId || '';
    }
    if (order.scans?.[0]?.customer_id) return order.scans[0].customer_id;
    return '';
  };

  const getItemCount = (order) => {
    if (order.type === 'scanned') {
      return order.scans?.length || 0;
    }
    const rows = order.data_parsed?.rows || order.data_parsed?.line_items || [];
    return rows.length;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, mb: 3, borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.08)', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: 1 }}>
          <VerifiedIcon color="success" />
          Verified Orders
        </Typography>
      </Paper>

      {/* Filters */}
      <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, mb: 3, borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <Box sx={{ minWidth: 250 }}>
            <Typography component="label" variant="body2" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
              Search
            </Typography>
            <PageSearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
              placeholder="Order #, Customer, Invoice..."
              className="w-full"
            />
          </Box>
          
          <TextField
            select
            label="Type"
            size="small"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="invoice">Invoices</MenuItem>
            <MenuItem value="receipt">Receipts</MenuItem>
            <MenuItem value="scanned">Scanned Orders</MenuItem>
          </TextField>

          <TextField
            select
            label="Date"
            size="small"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="all">All Time</MenuItem>
            <MenuItem value="today">Today</MenuItem>
            <MenuItem value="week">Last 7 Days</MenuItem>
            <MenuItem value="month">Last 30 Days</MenuItem>
          </TextField>

          <Box sx={{ flexGrow: 1 }} />
          
          <Typography variant="body2" color="text.secondary">
            {filteredOrders.length} verified order{filteredOrders.length !== 1 ? 's' : ''}
          </Typography>
        </Stack>
      </Paper>

      {/* Orders Table */}
      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f8fafc' }}>
              <TableCell>Type</TableCell>
              <TableCell>Order #</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell align="center">Items</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Verified Date</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                    No verified orders found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((order) => (
                  <TableRow key={order._listKey || order.id} hover>
                    <TableCell>
                      <Chip 
                        icon={order.icon}
                        label={order.displayType}
                        size="small"
                        color={order.type === 'invoice' ? 'primary' : order.type === 'receipt' ? 'secondary' : 'info'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {getOrderNumber(order)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CustomerIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {getCustomerName(order)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={getItemCount(order)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        icon={<VerifiedIcon />}
                        label={(() => {
                          const s = String(order.status || 'verified').toLowerCase();
                          if (s === 'verified' || s === 'approved') return 'Verified';
                          if (s === 'pending') return 'Pending';
                          return order.status ? String(order.status).replace(/^./, (c) => c.toUpperCase()) : 'Verified';
                        })()}
                        size="small"
                        color="success"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <DateIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {formatDate(order.verified_at || order.approved_at || order.created_at)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => {
                            const orderNum = getOrderNumber(order);
                            const customerName = getCustomerName(order);
                            // Navigate to the detail page like ImportApprovals does
                            navigate(`/import-approval/${order.id}/detail?customer=${encodeURIComponent(customerName)}&order=${encodeURIComponent(orderNum)}`);
                          }}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Unverify Order">
                        <IconButton
                          size="small"
                          color="warning"
                          onClick={() => {
                            setSelectedOrder(order);
                            setUnverifyDialogOpen(true);
                          }}
                        >
                          <UndoIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
        
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={filteredOrders.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(event, newPage) => setPage(newPage)}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
        />
      </TableContainer>

      {/* Unverify Confirmation Dialog */}
      <Dialog
        open={unverifyDialogOpen}
        onClose={() => !unverifyLoading && setUnverifyDialogOpen(false)}
      >
        <DialogTitle>Unverify Order?</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will move the order back to pending status. You'll need to verify it again.
          </Alert>
          {selectedOrder && (
            <Box>
              <Typography variant="body2" gutterBottom>
                <strong>Order:</strong> {getOrderNumber(selectedOrder)}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Customer:</strong> {getCustomerName(selectedOrder)}
              </Typography>
              <Typography variant="body2">
                <strong>Type:</strong> {selectedOrder.displayType}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setUnverifyDialogOpen(false)}
            disabled={unverifyLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleUnverify(selectedOrder)}
            color="warning"
            variant="contained"
            disabled={unverifyLoading}
            startIcon={unverifyLoading ? <CircularProgress size={16} /> : <UndoIcon />}
          >
            {unverifyLoading ? 'Unverifying...' : 'Unverify'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      {snackbar.open && (
        <Alert 
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 9999 }}
        >
          {snackbar.message}
        </Alert>
      )}
    </Box>
  );
}

