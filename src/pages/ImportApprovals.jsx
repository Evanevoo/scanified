import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase/client';
import { Box, Paper, Typography, Button, Alert, Snackbar, CircularProgress, Divider, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, MenuItem, Select, FormControl, InputLabel, TableContainer, Table, TableHead, TableBody, TableRow, TableCell, Chip, Checkbox, Autocomplete, Tooltip, Fab, Zoom } from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import HistoryIcon from '@mui/icons-material/History';
import CloseIcon from '@mui/icons-material/Close';
import { CheckCircleOutline, DeleteOutline, InfoOutlined } from '@mui/icons-material';

function formatDate(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleString();
}

function PreviewJson({ data }) {
  return (
    <pre style={{ maxHeight: 200, overflow: 'auto', background: '#fafbfc', borderRadius: 6, padding: 8, fontSize: 13 }}>{JSON.stringify(data, null, 2)}</pre>
  );
}

// Helper to robustly parse the data field
function parseDataField(data) {
  if (!data) return {};
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return { _raw: data, _error: 'Malformed JSON' };
    }
  }
  return data;
}

export default function ImportApprovals() {
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [pendingReceipts, setPendingReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState('');
  const [search, setSearch] = useState('');
  const [auditDialog, setAuditDialog] = useState({ open: false, logs: [], title: '' });
  const navigate = useNavigate();
  const [customerNameToId, setCustomerNameToId] = useState({});
  const customerLookupDone = useRef(false);
  const [productCodeToGroup, setProductCodeToGroup] = useState({});
  const [scannedCounts, setScannedCounts] = useState({});
  const [allScannedRows, setAllScannedRows] = useState([]);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [scannedOrders, setScannedOrders] = useState([]);
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('all');
  const [receiptStatusFilter, setReceiptStatusFilter] = useState('all');
  const [invoiceSort, setInvoiceSort] = useState({ field: 'order', dir: 'asc' });
  const [receiptSort, setReceiptSort] = useState({ field: 'order', dir: 'asc' });
  const [selectedRows, setSelectedRows] = useState([]);
  const [detailDialog, setDetailDialog] = useState({ open: false, row: null });
  const [customerOptions, setCustomerOptions] = useState([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [dateDialog, setDateDialog] = useState(false);
  const [locationDialog, setLocationDialog] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [gasTypes, setGasTypes] = useState([]);
  const [verifyWarning, setVerifyWarning] = useState({ open: false, row: null, mismatch: false });
  const [historyDialog, setHistoryDialog] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  const recordOptions = [
    'Verify This Record',
    'Delete This Record',
    'Change Record Date and Time',
    'Change Customer',
    'Change P.O Number',
    'Change Location',
    'Create or Delete Correction Sales Order',
    'Mark for Investigation',
  ];
  const assetOptions = [
    'Reclassify Assets',
    'Change Asset Properties',
    'Attach Not-Scanned Assets',
    'Attach by Barcode or by Serial #',
    'Replace Incorrect Asset',
    'Switch Deliver / Return',
    'Detach Assets',
    'Move to Another Sales Order',
  ];

  // Fetch all cylinders for group lookup
  useEffect(() => {
    async function fetchCylinders() {
      const { data: cylinders } = await supabase.from('cylinders').select('product_code, group_name');
      const map = {};
      (cylinders || []).forEach(c => {
        if (c.product_code) map[c.product_code.trim()] = c.group_name || '';
      });
      setProductCodeToGroup(map);
    }
    fetchCylinders();
  }, []);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError('');
      try {
        const { data: invoices, error: invErr } = await supabase
          .from('imported_invoices')
          .select('*')
          .eq('status', 'pending')
          .order('uploaded_at', { ascending: false });
        const { data: receipts, error: recErr } = await supabase
          .from('imported_sales_receipts')
          .select('*')
          .eq('status', 'pending')
          .order('uploaded_at', { ascending: false });
        if (invErr || recErr) throw new Error(invErr?.message || recErr?.message);
        setPendingInvoices(invoices || []);
        setPendingReceipts(receipts || []);
      } catch (e) {
        setError(e.message);
      }
      setLoading(false);
    }
    fetchData();
  }, [snackbar]);

  // Fetch all customers once for lookup
  useEffect(() => {
    if (customerLookupDone.current) return;
    async function fetchCustomers() {
      const { data: customers } = await supabase.from('customers').select('CustomerListID, CustomerName');
      const map = {};
      (customers || []).forEach(c => {
        if (c.CustomerName) map[c.CustomerName.trim().toLowerCase()] = c.CustomerListID;
      });
      setCustomerNameToId(map);
      customerLookupDone.current = true;
    }
    fetchCustomers();
  }, []);

  // Fetch scanned bottle counts for each invoice/order number
  useEffect(() => {
    async function fetchScannedCounts() {
      if (!pendingInvoices.length) return;
      // Get all unique invoice/order numbers
      const numbers = pendingInvoices.map(row => {
        const d = parseDataField(row.data);
        return d.invoice_number || d.order_number;
      }).filter(Boolean);
      if (!numbers.length) return;
      // Query cylinders for all matching product_code or order/invoice number
      // (Assume cylinders table has a field like last_invoice_number or last_order_number, or use a scan/asset record table if available)
      // For now, try to match by product_code if that's all we have
      const counts = {};
      for (const num of numbers) {
        // Try to count cylinders with a matching last_invoice_number or last_order_number
        const { count } = await supabase
          .from('cylinders')
          .select('id', { count: 'exact', head: true })
          .or(`last_invoice_number.eq.${num},last_order_number.eq.${num}`);
        counts[num] = count || 0;
      }
      setScannedCounts(counts);
    }
    fetchScannedCounts();
  }, [pendingInvoices]);

  // Batch fetch all relevant cylinders for all pending invoices
  useEffect(() => {
    async function fetchAllScanned() {
      if (!pendingInvoices.length) return;
      // Get all unique invoice/order numbers
      const numbers = pendingInvoices.map(row => {
        const d = parseDataField(row.data);
        return d.invoice_number || d.order_number;
      }).filter(Boolean);
      if (!numbers.length) return;
      // Fetch all cylinders for all these invoice/order numbers
      const { data: cylinders } = await supabase
        .from('cylinders')
        .select('category, group_name, type, product_code, last_invoice_number, last_order_number')
        .or(numbers.map(num => `last_invoice_number.eq.${num}`).concat(numbers.map(num => `last_order_number.eq.${num}`)).join(','));
      setAllScannedRows(cylinders || []);
    }
    fetchAllScanned();
  }, [pendingInvoices]);

  // Build a lookup: { [invoiceNumber]: { [groupKey]: trkCount } }
  const scannedLookup = {};
  for (const cyl of allScannedRows) {
    const invNum = cyl.last_invoice_number || cyl.last_order_number;
    if (!invNum) continue;
    const key = [cyl.category, cyl.group_name, cyl.type, cyl.product_code].join('|');
    if (!scannedLookup[invNum]) scannedLookup[invNum] = {};
    if (!scannedLookup[invNum][key]) scannedLookup[invNum][key] = 0;
    scannedLookup[invNum][key]++;
  }

  // Fetch scanned orders (cylinder_scans)
  useEffect(() => {
    async function fetchScannedOrders() {
      const { data, error } = await supabase
        .from('cylinder_scans')
        .select('*');
      if (!error) setScannedOrders(data || []);
    }
    fetchScannedOrders();
  }, []);

  // Helper to get scanned order by order/invoice number
  function getScannedOrder(orderNum) {
    return scannedOrders.find(
      o => (o.order_number || '').toString().trim() === (orderNum || '').toString().trim()
    );
  }

  // Real approval logic for invoices
  async function processInvoice(invoice) {
    try {
      // Get or create customer
      let customer = null;
      if (invoice.customer_id) {
        const { data: existing } = await supabase.from('customers').select('CustomerListID, name').eq('CustomerListID', invoice.customer_id);
        if (existing && existing.length > 0) {
          customer = existing[0];
        }
      }
      if (!customer && invoice.customer_name) {
        const { data: existing } = await supabase.from('customers').select('CustomerListID, name').ilike('name', invoice.customer_name);
        if (existing && existing.length > 0) {
          customer = existing[0];
        } else {
          // Create new customer
          const { data: created } = await supabase.from('customers').insert({
            name: invoice.customer_name,
            CustomerListID: `80000448-${Date.now()}S`
          }).select('CustomerListID, name').single();
          customer = created;
        }
      }
      if (!customer) return { success: false, error: 'No customer found or created' };

      // Create invoice
      const { data: inv, error: invErr } = await supabase.from('invoices').insert({
        invoice_number: invoice.invoice_number,
        customer_id: customer.CustomerListID,
        date: invoice.date,
        total_amount: invoice.total_amount || 0
      }).select('id').single();
      if (invErr) return { success: false, error: invErr.message };

      // Create line items
      if (invoice.line_items && Array.isArray(invoice.line_items)) {
        const items = invoice.line_items.map(li => ({
          invoice_id: inv.id,
          product_code: li.product_code,
          qty_out: li.qty_out,
          qty_in: li.qty_in,
          description: li.description,
          rate: li.rate,
          amount: li.amount,
          serial_number: li.serial_number
        }));
        if (items.length) {
          const { error: liErr } = await supabase.from('invoice_line_items').insert(items);
          if (liErr) return { success: false, error: liErr.message };
        }
        for (const li of invoice.line_items) {
          // Assign bottles out (delivery)
          if (li.qty_out && li.qty_out > 0 && li.serial_number) {
            // Assign cylinder to customer
            await supabase.from('cylinders').update({ assigned_customer: customer.CustomerListID }).eq('serial_number', li.serial_number);
            // Create or update rental
            const { data: existingRental } = await supabase.from('rentals').select('id').eq('serial_number', li.serial_number).eq('customer_id', customer.CustomerListID).eq('status', 'active').single();
            if (!existingRental) {
              await supabase.from('rentals').insert({
                customer_id: customer.CustomerListID,
                serial_number: li.serial_number,
                product_code: li.product_code,
                start_date: invoice.date || new Date().toISOString(),
                status: 'active'
              });
            }
          }
          // Unassign bottles in (return)
          if (li.qty_in && li.qty_in > 0 && li.serial_number) {
            // Unassign cylinder from customer
            await supabase.from('cylinders').update({ assigned_customer: null }).eq('serial_number', li.serial_number);
            // Close rental
            await supabase.from('rentals').update({ status: 'closed', end_date: invoice.date || new Date().toISOString() }).eq('serial_number', li.serial_number).eq('customer_id', customer.CustomerListID).eq('status', 'active');
          }
        }
      }
      // Optionally update rentals, etc. here
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
  // Real approval logic for receipts
  async function processReceipt(receipt) {
    try {
      // Get or create customer
      let customer = null;
      if (receipt.customer_id) {
        const { data: existing } = await supabase.from('customers').select('CustomerListID, name').eq('CustomerListID', receipt.customer_id);
        if (existing && existing.length > 0) {
          customer = existing[0];
        }
      }
      if (!customer && receipt.customer_name) {
        const { data: existing } = await supabase.from('customers').select('CustomerListID, name').ilike('name', receipt.customer_name);
        if (existing && existing.length > 0) {
          customer = existing[0];
        } else {
          // Create new customer
          const { data: created } = await supabase.from('customers').insert({
            name: receipt.customer_name,
            CustomerListID: `80000448-${Date.now()}S`
          }).select('CustomerListID, name').single();
          customer = created;
        }
      }
      if (!customer) return { success: false, error: 'No customer found or created' };

      // Create sales receipt
      const { data: sr, error: srErr } = await supabase.from('sales_receipts').insert({
        sales_receipt_number: receipt.sales_receipt_number,
        customer_id: customer.CustomerListID,
        date: receipt.date,
        total_amount: receipt.total_amount || 0
      }).select('id').single();
      if (srErr) return { success: false, error: srErr.message };

      // Create line items
      if (receipt.line_items && Array.isArray(receipt.line_items)) {
        const items = receipt.line_items.map(li => ({
          sales_receipt_id: sr.id,
          product_code: li.product_code,
          qty_out: li.qty_out,
          qty_in: li.qty_in,
          description: li.description,
          rate: li.rate,
          amount: li.amount,
          serial_number: li.serial_number
        }));
        if (items.length) {
          const { error: liErr } = await supabase.from('sales_receipt_line_items').insert(items);
          if (liErr) return { success: false, error: liErr.message };
        }
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Advanced filtering/search
  const now = Date.now();
  const filteredInvoices = pendingInvoices.filter(row => {
    const dataInv = row.data || {};
    const isVerified = row.status === 'verified';
    const verifiedAt = row.verified_at || row.approved_at || row.updated_at || row.uploaded_at;
    let within24h = false;
    if (isVerified && verifiedAt) {
      const verifiedTime = new Date(verifiedAt).getTime();
      within24h = (now - verifiedTime) < 24 * 60 * 60 * 1000;
    }
    if (!search) return !isVerified || within24h;
    const s = search.toLowerCase();
    const matches = (
      (row.id && String(row.id).toLowerCase().includes(s)) ||
      (dataInv.invoice_number && String(dataInv.invoice_number).toLowerCase().includes(s)) ||
      (dataInv.sales_receipt_number && String(dataInv.sales_receipt_number).toLowerCase().includes(s)) ||
      (dataInv.order_number && String(dataInv.order_number).toLowerCase().includes(s)) ||
      (dataInv.sales_order_number && String(dataInv.sales_order_number).toLowerCase().includes(s)) ||
      (dataInv.customer_name && String(dataInv.customer_name).toLowerCase().includes(s)) ||
      (row.data && JSON.stringify(row.data).toLowerCase().includes(s))
    );
    return matches || (!isVerified || within24h);
  });
  const filteredReceipts = pendingReceipts.filter(row => {
    const dataRec = row.data || {};
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (row.id && String(row.id).toLowerCase().includes(s)) ||
      (dataRec.invoice_number && String(dataRec.invoice_number).toLowerCase().includes(s)) ||
      (dataRec.sales_receipt_number && String(dataRec.sales_receipt_number).toLowerCase().includes(s)) ||
      (dataRec.order_number && String(dataRec.order_number).toLowerCase().includes(s)) ||
      (dataRec.sales_order_number && String(dataRec.sales_order_number).toLowerCase().includes(s)) ||
      (dataRec.customer_name && String(dataRec.customer_name).toLowerCase().includes(s)) ||
      (row.data && JSON.stringify(row.data).toLowerCase().includes(s))
    );
  });

  // After filteredInvoices is defined, filter out duplicates by invoice_number and customer_id
  const uniqueInvoicesMap = new Map();
  const uniqueFilteredInvoices = [];
  for (const row of filteredInvoices) {
    const d = row.data || {};
    const key = `${d.invoice_number || ''}|${d.customer_id || ''}`;
    if (!uniqueInvoicesMap.has(key)) {
      uniqueInvoicesMap.set(key, true);
      uniqueFilteredInvoices.push(row);
    }
  }

  // Audit log viewing
  async function handleViewAuditLogs(type, row) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('import_id', row.id)
      .order('timestamp', { ascending: false });
    setAuditDialog({
      open: true,
      logs: data || [],
      title: `${type === 'invoice' ? 'Invoice' : 'Sales Receipt'} #${row.id} Audit Log`
    });
  }

  async function handleApprove(type, row) {
    try {
      let result;
      if (type === 'invoice') result = await processInvoice(row.data);
      else result = await processReceipt(row.data);
      if (!result.success) throw new Error(result.error || 'Processing failed');
      // Mark as approved
      await supabase
        .from(type === 'invoice' ? 'imported_invoices' : 'imported_sales_receipts')
        .update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: null })
        .eq('id', row.id);
      // Log to audit_logs
      await supabase.from('audit_logs').insert({
        action: `approve_${type}`,
        import_id: row.id,
        user_id: null, // TODO: set current user id if available
        timestamp: new Date().toISOString(),
        details: row.data,
        old_value: null,
        new_value: null,
        warning: null
      });
      setSnackbar(`${type === 'invoice' ? 'Invoice' : 'Sales Receipt'} #${row.id} approved.`);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleReject(type, row) {
    try {
      await supabase
        .from(type === 'invoice' ? 'imported_invoices' : 'imported_sales_receipts')
        .update({ status: 'rejected', approved_at: new Date().toISOString(), approved_by: null })
        .eq('id', row.id);
      // Log to audit_logs
      await supabase.from('audit_logs').insert({
        action: `reject_${type}`,
        import_id: row.id,
        user_id: null, // TODO: set current user id if available
        timestamp: new Date().toISOString(),
        details: row.data,
        old_value: null,
        new_value: null,
        warning: null
      });
      setSnackbar(`${type === 'invoice' ? 'Invoice' : 'Sales Receipt'} #${row.id} rejected.`);
    } catch (e) {
      setError(e.message);
    }
  }

  // Add delete handlers for invoices and receipts
  async function handleDelete(type, row) {
    try {
      await supabase
        .from(type === 'invoice' ? 'imported_invoices' : 'imported_sales_receipts')
        .delete()
        .eq('id', row.id);
      setSnackbar(`${type === 'invoice' ? 'Invoice' : 'Sales Receipt'} #${row.id} deleted.`);
    } catch (e) {
      setError(e.message);
    }
  }

  // Bulk delete invoices
  async function handleBulkDeleteInvoices() {
    if (selectedInvoices.length === 0) return;
    setLoading(true);
    let errorOccurred = false;
    for (const invoiceId of selectedInvoices) {
      try {
        await supabase.from('imported_invoices').delete().eq('id', invoiceId);
      } catch (error) {
        setError(error.message);
        errorOccurred = true;
        break;
      }
    }
    setLoading(false);
    if (!errorOccurred) {
      setSnackbar(`${selectedInvoices.length} invoice(s) deleted.`);
      setSelectedInvoices([]);
      // Refetch the data to update the UI
      // You can extract fetchData to a separate function if not already
      // For example:
      // await fetchData();
      window.location.reload(); // Simple way to force refresh, or call your fetchData logic
    }
  }

  // Helper to get status for imported row
  function getStatus(invShip, scanShip, invReturn, scanReturn, scanned) {
    if (!scanned) return 'No Scan';
    if (invShip !== scanShip || invReturn !== scanReturn) return 'Mismatch';
    return 'Match';
  }

  // Helper to get status for unmatched scan
  function getUnmatchedScanStatus() { return 'Unmatched Scan'; }

  // Build a set of all imported order numbers
  const importedOrderNumbers = new Set(uniqueFilteredInvoices.map(row => {
    const d = row.data || {};
    return d.invoice_number || d.order_number;
  }).filter(Boolean));

  // Find unmatched scans
  const unmatchedScans = scannedOrders.filter(scan => !importedOrderNumbers.has(scan.order_number));

  // --- Merge pending invoices and receipts into a single list ---
  const unifiedPending = [
    ...uniqueFilteredInvoices.map(row => ({ ...row, _type: 'invoice' })),
    ...filteredReceipts.map(row => ({ ...row, _type: 'receipt' }))
  ];

  // Sort by date descending (or uploaded_at)
  unifiedPending.sort((a, b) => {
    const da = a.data?.date || a.uploaded_at || '';
    const db = b.data?.date || b.uploaded_at || '';
    return db.localeCompare(da);
  });

  const handleSelectRow = (id) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedRows.length === unifiedPending.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(unifiedPending.map((row) => row.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (!window.confirm('Delete all selected imports? This cannot be undone.')) return;
    setLoading(true);
    try {
      const invoiceIds = unifiedPending.filter(row => row._type === 'invoice' && selectedRows.includes(row.id)).map(row => row.id);
      const receiptIds = unifiedPending.filter(row => row._type === 'receipt' && selectedRows.includes(row.id)).map(row => row.id);
      if (invoiceIds.length) {
        await supabase.from('imported_invoices').delete().in('id', invoiceIds);
      }
      if (receiptIds.length) {
        await supabase.from('imported_sales_receipts').delete().in('id', receiptIds);
      }
      setSnackbar(`${selectedRows.length} import(s) deleted.`);
      setSelectedRows([]);
      window.location.reload();
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  // Function to search customers
  async function searchCustomers(query) {
    setCustomerSearchLoading(true);
    const { data, error } = await supabase
      .from('customers')
      .select('CustomerListID, CustomerName')
      .or(`CustomerName.ilike.%${query}%,CustomerListID.ilike.%${query}%`)
      .limit(10);
    setCustomerOptions(data || []);
    setCustomerSearchLoading(false);
  }

  // Handler for sidebar actions
  async function handleSidebarAction(opt) {
    const id = detailDialog.row?.id;
    if (!id) return;
    if (opt === 'Verify This Record') {
      // Check for bottle count mismatch
      const row = detailDialog.row;
      const lineItems = row.data?.line_items || [];
      const invoiceCount = lineItems.reduce((sum, li) => sum + (li.qty_out || 0) + (li.qty_in || 0), 0);
      // Find scanned count for this invoice/order
      const invNum = row.data?.invoice_number || row.data?.order_number;
      const scannedCount = scannedCounts[invNum] || 0;
      if (invoiceCount !== scannedCount) {
        setVerifyWarning({ open: true, row, mismatch: true, invoiceCount, scannedCount });
        return;
      }
      await supabase.from('imported_invoices').update({ status: 'verified' }).eq('id', id);
      setSnackbar('Record verified!');
      setDetailDialog(d => ({ ...d, row: { ...d.row, status: 'verified' } }));
    } else if (opt === 'Delete This Record') {
      await supabase.from('imported_invoices').delete().eq('id', id);
      setSnackbar('Record deleted!');
      setDetailDialog({ open: false, row: null });
    } else if (opt === 'Change Record Date and Time') {
      setDateDialog(true);
    } else if (opt === 'Change Customer') {
      setDetailDialog(d => ({ ...d, changeCustomer: true }));
    } else if (opt === 'Change P.O Number') {
      setDetailDialog(d => ({ ...d, changePO: true }));
    } else if (opt === 'Change Location') {
      setLocationDialog(true);
    } else if (opt === 'Mark for Investigation') {
      await supabase.from('imported_invoices').update({ investigation: true }).eq('id', id);
      setSnackbar('Marked for investigation!');
      setDetailDialog(d => ({ ...d, row: { ...d.row, investigation: true } }));
    } else {
      setSnackbar(opt + ' (placeholder)');
    }
  }

  useEffect(() => {
    async function fetchGasTypes() {
      const { data } = await supabase.from('gas_types').select('product_code, description');
      setGasTypes(data || []);
    }
    fetchGasTypes();
  }, []);

  const productCodeToDescription = Object.fromEntries((gasTypes || []).map(g => [g.product_code, g.description]));

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fff', py: 8, borderRadius: 0, overflow: 'visible' }}>
      <Paper elevation={0} sx={{ width: '100%', p: { xs: 2, md: 5 }, borderRadius: 0, boxShadow: '0 2px 12px 0 rgba(16,24,40,0.04)', border: '1px solid #eee', bgcolor: '#fff', overflow: 'visible' }}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <Button
            variant="outlined"
            component={Link}
            to="/"
            sx={{ fontWeight: 700, borderRadius: 999, px: 4 }}
          >
            ← Back to Dashboard
          </Button>
          <Button
            variant="outlined"
            component={Link}
            to="/import-approvals/history"
            sx={{ fontWeight: 700, borderRadius: 999, px: 4 }}
            type="button"
          >
            History
          </Button>
        </Box>
        <Typography variant="h3" fontWeight={900} color="primary" mb={2} sx={{ letterSpacing: -1 }}>Pending Verification</Typography>
        <Box mb={3} display="flex" flexDirection={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} gap={2}>
          <TextField
            label="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            size="small"
            sx={{ minWidth: 260, bgcolor: '#f7fafc', borderRadius: 2 }}
          />
        </Box>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loading ? <Box p={4} textAlign="center"><CircularProgress /></Box> : (
          <>
            <Typography variant="h5" fontWeight={800} color="primary" mb={2} mt={1}>Pending</Typography>
            {unifiedPending.length === 0 && <Alert severity="success" sx={{ mb: 3 }}>No pending items.</Alert>}
            {unifiedPending.length > 0 && (
              <Box mb={2} display="flex" alignItems="center" gap={2}>
                <Button
                  variant="contained"
                  color="error"
                  disabled={selectedRows.length === 0}
                  onClick={handleDeleteSelected}
                >
                  Delete Selected
                </Button>
                <Typography variant="body2" color="text.secondary">
                  {selectedRows.length} selected
                </Typography>
              </Box>
            )}
            <Paper variant="outlined" sx={{ mb: 4, p: 0, borderRadius: 3, border: '1px solid #e3e7ef', background: '#fafbfc', overflow: 'visible', boxShadow: '0 2px 12px 0 rgba(16,24,40,0.06)' }}>
              <TableContainer>
                <Table sx={{ minWidth: 900 }} aria-label="Pending table">
                  <TableHead>
                    <TableRow sx={{ background: '#f5f7fa' }}>
                      <TableCell padding="checkbox">
                      <input
                        type="checkbox"
                        checked={selectedRows.length === unifiedPending.length && unifiedPending.length > 0}
                        onChange={handleSelectAll}
                      />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 15 }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 15 }}>Order/Receipt #</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 15 }}>Customer</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 15 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 15 }}>Group</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 15 }}>Product</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 15 }}>SHP (Imp/Scan)</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 15 }}>RTN (Imp/Scan)</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 15 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 15 }}>Detail</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {/* Render grouped invoices as cards with header, alert, and detailed table */}
                    {(() => {
                      // Group invoices by invoice_number/order_number
                      const invoiceGroups = {};
                      unifiedPending.forEach(row => {
                        const d = row.data || {};
                        const type = row._type;
                        if (type === 'invoice') {
                          const invNum = d.invoice_number || d.order_number || row.id;
                          if (!invoiceGroups[invNum]) invoiceGroups[invNum] = [];
                          invoiceGroups[invNum].push(row);
                        }
                      });
                      // Get receipts (not grouped)
                      const receipts = unifiedPending.filter(row => row._type === 'receipt');
                      // Render grouped invoices
                      const rows = [];
                      Object.entries(invoiceGroups).forEach(([invNum, groupRows], groupIdx) => {
                        const firstRow = groupRows[0];
                        const d = firstRow.data || {};
                        let customer = d.customer_name || '-';
                        if (d.customer_id) customer += ` (${d.customer_id})`;
                        let date = d.date || formatDate(firstRow.uploaded_at);
                        // Gather all line items for this invoice
                        let lineItems = [];
                        groupRows.forEach(row => {
                          const d = row.data || {};
                          if (Array.isArray(d.line_items)) {
                            d.line_items.forEach(item => lineItems.push(item));
                          } else if (d.product_code) {
                            lineItems.push(d);
                          }
                        });
                        // Determine if there is a scan but no imported invoice
                        const hasScan = !!getScannedOrder(d.invoice_number || d.order_number || d.sales_receipt_number);
                        const hasImported = !!firstRow;
                        // Determine if there is a mismatch for alert
                        let hasMismatch = false;
                        lineItems.forEach(item => {
                          // Find the scanned order for this invoice/order
                          const scanned = getScannedOrder(d.invoice_number || d.order_number || d.sales_receipt_number);
                          // Calculate scanned (Trk) and imported (Inv) values
                          let trkShip = 0, trkRtn = 0;
                          if (scanned) {
                            trkShip = Array.isArray(scanned.ship_cylinders) ? scanned.ship_cylinders.filter(cyl => cyl.product_code === item.product_code).length : 0;
                            trkRtn = Array.isArray(scanned.return_cylinders) ? scanned.return_cylinders.filter(cyl => cyl.product_code === item.product_code).length : 0;
                          }
                          const invShip = item.qty_out || 0;
                          const invRtn = item.qty_in || 0;
                          // Highlight if mismatch
                          const shipMismatch = trkShip !== invShip;
                          const rtnMismatch = trkRtn !== invRtn;
                          if (shipMismatch || rtnMismatch) hasMismatch = true;
                        });
                        // Render the card for this invoice
                        rows.push(
                          <TableRow key={`group-card-${invNum}`}> {/* Use a single cell to span the card */}
                            <TableCell colSpan={12} sx={{ p: 0, border: 0 }}>
                              <Box mb={4} borderRadius={2} overflow="hidden" boxShadow={2} border="1px solid #e0e0e0">
                                {/* Header */}
                                <Box bgcolor="#6b8797" color="#fff" p={3} display="flex" flexDirection="column" gap={1}>
                                  <Typography fontWeight={700} fontSize={18}>ACTION: Delivery</Typography>
                                  <Typography><b>SALES ORDER #:</b> {invNum}</Typography>
                                  <Typography>
                                    <b>CUSTOMER:</b> {d.customer_id ? (
                                      <Link to={`/customers/${d.customer_id}`} style={{ color: '#90caf9', textDecoration: 'underline', fontWeight: 600 }}>
                                        {d.customer_name}
                                      </Link>
                                    ) : d.customer_name || '-'}
                                  </Typography>
                                  <Typography><b>DATE:</b> {date}</Typography>
                                </Box>
                                {/* Alert */}
                                {hasScan && !hasImported && (
                                  <Alert severity="warning" sx={{ borderRadius: 0 }}>
                                    No accounting system data was found matching this invoice.
                                  </Alert>
                                )}
                                {hasScan && hasImported && hasMismatch && (
                                  <Alert severity="error" sx={{ borderRadius: 0 }}>
                                    Accounting does not match. Accounting data shown in <b style={{ color: 'red' }}>bold red text</b> where it differs from LessAnnoyingScan.
                                  </Alert>
                                )}
                                <Box display="flex">
                                  {/* Action Button */}
                                  <Box p={2} bgcolor="#eaf3fb" display="flex" alignItems="center">
                                    <Button variant="contained" color="success" size="large" sx={{ minWidth: 120, fontWeight: 700 }}
                                      onClick={() => {
                                        console.log('Navigating to', `/imported-invoices/${firstRow?.id}`);
                                        handleApprove('invoice', firstRow);
                                      }}>
                                      VERIFY
                                    </Button>
                                  </Box>
                                  {/* Table */}
                                  <TableContainer component={Paper} sx={{ flex: 1, boxShadow: 'none', borderRadius: 0 }}>
                                    <Table size="small">
                                      <TableHead>
                                        <TableRow>
                                          <TableCell>Category</TableCell>
                                          <TableCell>Group</TableCell>
                                          <TableCell>Type</TableCell>
                                          <TableCell>Product Code</TableCell>
                                          <TableCell>SHP</TableCell>
                                          <TableCell>RTN</TableCell>
                                          <TableCell>Highlight</TableCell>
                                          <TableCell>Detail</TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {lineItems.map((item, idx) => {
                                          // Find the scanned order for this invoice/order
                                          const scanned = getScannedOrder(d.invoice_number || d.order_number || d.sales_receipt_number);
                                          // Calculate scanned (Trk) and imported (Inv) values
                                          let trkShip = 0, trkRtn = 0;
                                          if (scanned) {
                                            trkShip = Array.isArray(scanned.ship_cylinders) ? scanned.ship_cylinders.filter(cyl => cyl.product_code === item.product_code).length : 0;
                                            trkRtn = Array.isArray(scanned.return_cylinders) ? scanned.return_cylinders.filter(cyl => cyl.product_code === item.product_code).length : 0;
                                          }
                                          const invShip = item.qty_out || 0;
                                          const invRtn = item.qty_in || 0;
                                          // Highlight if mismatch
                                          const shipMismatch = trkShip !== invShip;
                                          const rtnMismatch = trkRtn !== invRtn;
                                          return (
                                            <TableRow key={idx} sx={{ background: idx % 2 === 0 ? '#fff' : '#f7fafd' }}>
                                              <TableCell>{item.category || '-'}</TableCell>
                                              <TableCell>{item.group || '-'}</TableCell>
                                              <TableCell>{item.type || '-'}</TableCell>
                                              <TableCell>{item.product_code || '-'}</TableCell>
                                              <TableCell>
                                                Trk: <span style={{ color: shipMismatch ? 'red' : 'green', fontWeight: shipMismatch ? 700 : 400 }}>{trkShip}</span><br />
                                                Inv: <span style={{ color: shipMismatch ? 'red' : 'green', fontWeight: shipMismatch ? 700 : 400 }}>{invShip}</span>
                                              </TableCell>
                                              <TableCell>
                                                Trk: <span style={{ color: rtnMismatch ? 'red' : 'green', fontWeight: rtnMismatch ? 700 : 400 }}>{trkRtn}</span><br />
                                                Inv: <span style={{ color: rtnMismatch ? 'red' : 'green', fontWeight: rtnMismatch ? 700 : 400 }}>{invRtn}</span>
                                              </TableCell>
                                              <TableCell>
                                                <Checkbox />
                                              </TableCell>
                                              <TableCell>
                                                <IconButton color="primary" onClick={() => {
                                                  setDetailDialog({ open: true, row: firstRow });
                                                }} size="small">
                                                  <InfoOutlined />
                                                </IconButton>
                                              </TableCell>
                                            </TableRow>
                                          );
                                        })}
                                      </TableBody>
                                    </Table>
                                  </TableContainer>
                                </Box>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      });
                      // Render receipts (not grouped, as before)
                      receipts.forEach((receiptRow, idx) => {
                        const receiptD = receiptRow.data || {};
                        const receiptType = receiptRow._type;
                        let receiptOrderNum = receiptD.invoice_number || receiptD.order_number || receiptD.sales_receipt_number || receiptRow.id;
                        let receiptCustomer = receiptD.customer_name || '-';
                        if (receiptD.customer_id) receiptCustomer += ` (${receiptD.customer_id})`;
                        let receiptDate = receiptD.date || formatDate(receiptRow.uploaded_at);
                        let receiptGroup = receiptType === 'invoice' ? (productCodeToGroup[receiptD.product_code?.trim()] || receiptD.group || receiptD.gas_type || receiptD.product_group || '-') : '-';
                        let receiptProduct = receiptD.product_code || '-';
                        let impShip = 0, impReturn = 0, scanShip = 0, scanReturn = 0, status = '-';
                        const scanned = getScannedOrder(receiptD.invoice_number || receiptD.order_number || receiptD.sales_receipt_number);
                        if (receiptType === 'invoice') {
                          if (Array.isArray(receiptD.line_items)) {
                            for (const item of receiptD.line_items) {
                              const qty = Number(item.qty_out ?? item.qty ?? 1);
                              if (qty > 0) impShip += qty;
                              if (qty < 0) impReturn += Math.abs(qty);
                            }
                          } else if (receiptD.product_code) {
                            const qty = Number(receiptD.qty_out ?? receiptD.qty ?? 1);
                            if (qty > 0) impShip += qty;
                            if (qty < 0) impReturn += Math.abs(qty);
                          }
                          scanShip = Array.isArray(scanned?.ship_cylinders) ? scanned.ship_cylinders.length : 0;
                          scanReturn = Array.isArray(scanned?.return_cylinders) ? scanned.return_cylinders.length : 0;
                          status = getStatus(impShip, scanShip, impReturn, scanReturn, scanned);
                        } else if (receiptType === 'receipt') {
                          if (Array.isArray(receiptD.shipped_bottles)) impShip = receiptD.shipped_bottles.length;
                          if (Array.isArray(receiptD.returned_bottles)) impReturn = receiptD.returned_bottles.length;
                          if (!impShip && receiptD.qty_out) impShip = Number(receiptD.qty_out) || 0;
                          if (!impReturn && receiptD.qty_in) impReturn = Number(receiptD.qty_in) || 0;
                          scanShip = Array.isArray(scanned?.ship_cylinders) ? scanned.ship_cylinders.length : 0;
                          scanReturn = Array.isArray(scanned?.return_cylinders) ? scanned.return_cylinders.length : 0;
                          const shpMismatch = impShip !== scanShip;
                          const rtnMismatch = impReturn !== scanReturn;
                          status = (!scanned ? 'No Scan' : (shpMismatch || rtnMismatch ? 'Mismatch' : 'Match'));
                        }
                        let statusColor = 'default';
                        if (status === 'Match') statusColor = 'success';
                        else if (status === 'Mismatch') statusColor = 'error';
                        else if (status === 'No Scan') statusColor = 'warning';
                        rows.push(
                          <TableRow
                            key={receiptRow.id}
                            hover
                            sx={{ background: idx % 2 === 0 ? '#fff' : '#f7fafd', transition: 'background 0.2s' }}
                          >
                            <TableCell padding="checkbox">
                              <input
                                type="checkbox"
                                checked={selectedRows.includes(receiptRow.id)}
                                onChange={() => handleSelectRow(receiptRow.id)}
                              />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{receiptType === 'invoice' ? 'Invoice' : 'Sales Receipt'}</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{receiptOrderNum}</TableCell>
                            <TableCell>{receiptCustomer}</TableCell>
                            <TableCell>{receiptDate}</TableCell>
                            <TableCell>{receiptGroup}</TableCell>
                            <TableCell>{receiptProduct}</TableCell>
                            <TableCell align="center">
                              <div style={{ lineHeight: 1.2 }}>
                                <span style={{ fontWeight: 700, color: impShip !== scanShip ? '#d32f2f' : '#222' }}>Imp: {impShip}</span><br />
                                <span style={{ fontWeight: 700, color: impShip !== scanShip ? '#d32f2f' : '#222' }}>Scan: {scanShip}</span>
                              </div>
                            </TableCell>
                            <TableCell align="center">
                              <div style={{ lineHeight: 1.2 }}>
                                <span style={{ fontWeight: 700, color: impReturn !== scanReturn ? '#d32f2f' : '#222' }}>Imp: {impReturn}</span><br />
                                <span style={{ fontWeight: 700, color: impReturn !== scanReturn ? '#d32f2f' : '#222' }}>Scan: {scanReturn}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Box display="flex" alignItems="center">
                                <Box mr={1}>
                                  <Chip label={status} color={statusColor} size="small" sx={{ fontWeight: 700, fontSize: 13 }} />
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <IconButton color="primary" onClick={() => {
                                setDetailDialog({ open: true, row: receiptRow });
                              }} size="small">
                                <InfoOutlined />
                              </IconButton>
                            </TableCell>
                            <TableCell>
                              {receiptType === 'invoice' ? (
                                <>
                                  <IconButton color="success" onClick={() => handleApprove('invoice', receiptRow)} size="small">
                                    <CheckCircleOutline />
                                  </IconButton>
                                  <IconButton color="error" onClick={() => handleDelete('invoice', receiptRow)} size="small">
                                    <DeleteOutline />
                                  </IconButton>
                                </>
                              ) : (
                                <>
                                  <IconButton color="success" onClick={() => handleApprove('receipt', receiptRow)} size="small">
                                    <CheckCircleOutline />
                                  </IconButton>
                                  <IconButton color="error" onClick={() => handleDelete('receipt', receiptRow)} size="small">
                                    <DeleteOutline />
                                  </IconButton>
                                </>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      });
                      return rows;
                    })()}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </>
        )}
        <Snackbar open={!!snackbar} autoHideDuration={3000} onClose={() => setSnackbar('')}><Alert severity="success">{snackbar}</Alert></Snackbar>
        {/* Audit Log Dialog */}
        <Dialog open={auditDialog.open} onClose={() => setAuditDialog({ ...auditDialog, open: false })} maxWidth="md" fullWidth>
          <DialogTitle>{auditDialog.title}</DialogTitle>
          <DialogContent>
            {auditDialog.logs.length === 0 ? (
              <Typography>No audit log entries found.</Typography>
            ) : (
              <Box>
                {auditDialog.logs.map((log, idx) => (
                  <Paper key={log.id || idx} sx={{ mb: 2, p: 2, borderRadius: 2, bgcolor: '#f9f9f9' }}>
                    <Typography variant="subtitle2">{log.action} — {formatDate(log.timestamp)}</Typography>
                    <Typography variant="body2" color="text.secondary">User: {log.user_id || 'N/A'}</Typography>
                    <Typography variant="body2" color="text.secondary">Warning: {log.warning || '-'}</Typography>
                    <Typography variant="body2" color="text.secondary">Old Value: {log.old_value ? JSON.stringify(log.old_value) : '-'}</Typography>
                    <Typography variant="body2" color="text.secondary">New Value: {log.new_value ? JSON.stringify(log.new_value) : '-'}</Typography>
                    <Typography variant="body2" color="text.secondary">Details: {log.details ? JSON.stringify(log.details) : '-'}</Typography>
                  </Paper>
                ))}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAuditDialog({ ...auditDialog, open: false })}>Close</Button>
          </DialogActions>
        </Dialog>
        <Dialog open={detailDialog.open} onClose={() => setDetailDialog({ open: false, row: null })} maxWidth="md" fullWidth fullScreen>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Import Detail</span>
            <Box>
              <Button size="small" variant="outlined" sx={{ mr: 1 }} onClick={() => setDetailDialog(d => ({ ...d, changeCustomer: true }))}>Change Customer</Button>
              <Button size="small" variant="outlined" onClick={() => setDetailDialog(d => ({ ...d, changePO: true }))}>Change P.O Number</Button>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={3}>
              {/* Left: Details */}
              <Box flex={2} minWidth={0}>
                {detailDialog.row && (
                  <Box>
                    <Typography variant="h6" mb={2}>
                      {detailDialog.row._type === 'invoice' ? 'Invoice' : 'Sales Receipt'} #{detailDialog.row.data?.invoice_number || detailDialog.row.data?.sales_receipt_number || detailDialog.row.id}
                    </Typography>
                    <Typography variant="subtitle1" mb={1}>
                      <b>Customer:</b> {detailDialog.row.data?.customer_name} ({detailDialog.row.data?.customer_id})
                    </Typography>
                    <Typography variant="subtitle2" mb={1}>
                      <b>Date:</b> {detailDialog.row.data?.date}
                    </Typography>
                    <Typography variant="subtitle2" mb={2}>
                      <b>Product(s):</b>
                    </Typography>
                    {Array.isArray(detailDialog.row.data?.line_items) && detailDialog.row.data.line_items.length > 0 ? (
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
                        <thead>
                          <tr>
                            <th style={{ borderBottom: '1px solid #ccc', padding: 12, fontSize: 18, textAlign: 'center' }}>Product Code</th>
                            <th style={{ borderBottom: '1px solid #ccc', padding: 12, fontSize: 18, textAlign: 'center' }}>Description</th>
                            <th style={{ borderBottom: '1px solid #ccc', padding: 12, fontSize: 18, textAlign: 'center' }}>Qty Out</th>
                            <th style={{ borderBottom: '1px solid #ccc', padding: 12, fontSize: 18, textAlign: 'center' }}>Qty In</th>
                            <th style={{ borderBottom: '1px solid #ccc', padding: 12, fontSize: 18, textAlign: 'center' }}>Serial Number</th>
                            <th style={{ borderBottom: '1px solid #ccc', padding: 12, fontSize: 18, textAlign: 'center' }}>Attach/Detach</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailDialog.row.data.line_items.map((item, idx) => (
                            <tr key={idx}>
                              <td style={{ padding: 12, fontSize: 16, textAlign: 'center' }}>{item.product_code}</td>
                              <td style={{ padding: 12, fontSize: 16, textAlign: 'center' }}>{productCodeToDescription[item.product_code] || item.description || ''}</td>
                              <td style={{ padding: 12, fontSize: 16, textAlign: 'center' }}>{item.qty_out}</td>
                              <td style={{ padding: 12, fontSize: 16, textAlign: 'center' }}>{item.qty_in}</td>
                              <td style={{ padding: 12, fontSize: 16, textAlign: 'center' }}>{item.serial_number}</td>
                              <td style={{ padding: 12, textAlign: 'center' }}>
                                <Button size="large" variant="outlined" sx={{ mr: 1, fontSize: 16, px: 3, py: 1 }}>Attach</Button>
                                <Button size="large" variant="outlined" color="error" sx={{ fontSize: 16, px: 3, py: 1 }}>Detach</Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <Typography>No line items found.</Typography>
                    )}
                  </Box>
                )}
              </Box>
              {/* Right: Sidebar */}
              <Box flex={1} minWidth={220}>
                <Typography fontWeight={700} fontSize={15} color="#888" mb={1} sx={{ borderBottom: '1px solid #eee' }}>RECORD OPTIONS</Typography>
                {recordOptions.filter(opt => opt !== 'Change Customer' && opt !== 'Change P.O Number').map(opt => (
                  <Box key={opt} sx={{ mb: 0.5 }}>
                    <Button
                      variant="text"
                      sx={{
                        color: '#1976d2',
                        textTransform: 'none',
                        fontWeight: 500,
                        textDecoration: 'underline',
                        px: 0,
                        minWidth: 0,
                        '&:hover': { color: '#125ea2', textDecoration: 'underline' }
                      }}
                      onClick={() => handleSidebarAction(opt)}
                      fullWidth
                      align="left"
                    >
                      {opt}
                    </Button>
                  </Box>
                ))}
                <Divider sx={{ my: 2 }} />
                <Typography fontWeight={700} fontSize={15} color="#888" mb={1} sx={{ borderBottom: '1px solid #eee' }}>ASSET OPTIONS</Typography>
                {assetOptions.map(opt => (
                  <Box key={opt} sx={{ mb: 0.5 }}>
                    <Tooltip
                      title={
                        opt === 'Reclassify Assets' ? 'Change what kind of bottle this is.' :
                        opt === 'Attach by Barcode or by Serial #' ? 'Attach a bottle using its barcode or serial number.' :
                        opt === 'Replace Incorrect Asset' ? 'Change what was scanned/invoiced to a different bottle.' :
                        opt === 'Switch Deliver / Return' ? 'Change a bottle from SHP to RTN and vice versa.' :
                        opt === 'Detach Assets' ? 'Remove assets from the invoice.' :
                        opt === 'Move to Another Sales Order' ? 'Move asset to a different sales order.' :
                        opt === 'Attach Not-Scanned Assets' ? 'Attach assets that were not scanned.' :
                        opt === 'Change Asset Properties' ? 'Edit asset properties.' :
                        ''
                      }
                      arrow
                      placement="right"
                    >
                      <Button
                        variant="text"
                        sx={{
                          color: '#1976d2',
                          textTransform: 'none',
                          fontWeight: 500,
                          textDecoration: 'underline',
                          px: 0,
                          minWidth: 0,
                          '&:hover': { color: '#125ea2', textDecoration: 'underline' }
                        }}
                        onClick={() => setSnackbar(opt + ' (placeholder)')}
                        fullWidth
                        align="left"
                      >
                        {opt}
                      </Button>
                    </Tooltip>
                  </Box>
                ))}
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailDialog({ open: false, row: null })}>Close</Button>
          </DialogActions>
          {/* Change Customer Dialog */}
          <Dialog open={!!detailDialog.changeCustomer} onClose={() => setDetailDialog(d => ({ ...d, changeCustomer: false }))} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4, p: 2, minWidth: 420 } }}>
            <DialogTitle sx={{ fontSize: 24, fontWeight: 700, textAlign: 'center', pb: 0 }}>Change Customer</DialogTitle>
            <DialogContent sx={{ p: 3 }}>
              <Autocomplete
                freeSolo
                loading={customerSearchLoading}
                options={customerOptions.map(opt => ({ label: `${opt.CustomerName} (${opt.CustomerListID})`, value: opt.CustomerListID }))}
                onInputChange={(_, value) => {
                  setDetailDialog(d => ({ ...d, newCustomer: value }));
                  if (value && value.length >= 2) searchCustomers(value);
                }}
                onChange={(_, value) => {
                  if (value) setDetailDialog(d => ({ ...d, newCustomer: value.value }));
                }}
                renderInput={params => (
                  <TextField
                    {...params}
                    label="Search Customer Name or ID"
                    fullWidth
                    sx={{ my: 2, fontSize: 20 }}
                    InputLabelProps={{ sx: { fontSize: 18 } }}
                    inputProps={{ ...params.inputProps, style: { fontSize: 20, padding: 14 } }}
                    value={detailDialog.newCustomer || ''}
                    onChange={e => setDetailDialog(d => ({ ...d, newCustomer: e.target.value }))}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {customerSearchLoading ? <CircularProgress color="inherit" size={24} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                      style: { fontSize: 20, padding: 14 }
                    }}
                  />
                )}
              />
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
              <Button onClick={() => setDetailDialog(d => ({ ...d, changeCustomer: false }))} sx={{ fontSize: 18, px: 3 }}>Cancel</Button>
              <Button variant="contained" sx={{ fontSize: 18, px: 3 }} onClick={async () => {
                // Update customer in imported_invoices
                const id = detailDialog.row.id;
                const newCustomer = detailDialog.newCustomer;
                if (!newCustomer) return;
                await supabase.from('imported_invoices').update({ customer_name: newCustomer }).eq('id', id);
                setDetailDialog(d => ({ ...d, changeCustomer: false, row: { ...d.row, data: { ...d.row.data, customer_name: newCustomer } } }));
              }}>Save</Button>
            </DialogActions>
          </Dialog>
          {/* Change P.O Number Dialog */}
          <Dialog open={!!detailDialog.changePO} onClose={() => setDetailDialog(d => ({ ...d, changePO: false }))}>
            <DialogTitle>Change P.O Number</DialogTitle>
            <DialogContent>
              <TextField
                label="New P.O Number"
                fullWidth
                sx={{ my: 2 }}
                value={detailDialog.newPO || ''}
                onChange={e => setDetailDialog(d => ({ ...d, newPO: e.target.value }))}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailDialog(d => ({ ...d, changePO: false }))}>Cancel</Button>
              <Button variant="contained" onClick={async () => {
                // Update PO number in imported_invoices
                const id = detailDialog.row.id;
                const newPO = detailDialog.newPO;
                if (!newPO) return;
                await supabase.from('imported_invoices').update({ po_number: newPO }).eq('id', id);
                setDetailDialog(d => ({ ...d, changePO: false, row: { ...d.row, data: { ...d.row.data, po_number: newPO } } }));
              }}>Save</Button>
            </DialogActions>
          </Dialog>
          {/* Change Record Date and Time Dialog */}
          <Dialog open={dateDialog} onClose={() => setDateDialog(false)}>
            <DialogTitle>Change Record Date and Time</DialogTitle>
            <DialogContent>
              <TextField
                label="New Date and Time"
                type="datetime-local"
                fullWidth
                sx={{ my: 2 }}
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDateDialog(false)}>Cancel</Button>
              <Button variant="contained" onClick={async () => {
                const id = detailDialog.row?.id;
                if (!id || !newDate) return;
                await supabase.from('imported_invoices').update({ date: newDate }).eq('id', id);
                setSnackbar('Date/time updated!');
                setDetailDialog(d => ({ ...d, row: { ...d.row, data: { ...d.row.data, date: newDate } } }));
                setDateDialog(false);
              }}>Save</Button>
            </DialogActions>
          </Dialog>
          {/* Change Location Dialog */}
          <Dialog open={locationDialog} onClose={() => setLocationDialog(false)}>
            <DialogTitle>Change Location</DialogTitle>
            <DialogContent>
              <TextField
                label="New Location"
                fullWidth
                sx={{ my: 2 }}
                value={newLocation}
                onChange={e => setNewLocation(e.target.value)}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setLocationDialog(false)}>Cancel</Button>
              <Button variant="contained" onClick={async () => {
                const id = detailDialog.row?.id;
                if (!id || !newLocation) return;
                await supabase.from('imported_invoices').update({ location: newLocation }).eq('id', id);
                setSnackbar('Location updated!');
                setDetailDialog(d => ({ ...d, row: { ...d.row, data: { ...d.row.data, location: newLocation } } }));
                setLocationDialog(false);
              }}>Save</Button>
            </DialogActions>
          </Dialog>
          {/* Verify warning dialog */}
          <Dialog open={verifyWarning.open} onClose={() => setVerifyWarning({ open: false, row: null, mismatch: false })}>
            <DialogTitle>Warning: Bottle Count Mismatch</DialogTitle>
            <DialogContent>
              <Typography color="error" fontWeight={700} mb={2}>
                The number of bottles scanned ({verifyWarning.scannedCount}) does not match the invoice ({verifyWarning.invoiceCount}).
              </Typography>
              <Typography>Are you sure you want to verify this record anyway?</Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setVerifyWarning({ open: false, row: null, mismatch: false })}>Cancel</Button>
              <Button variant="contained" color="error" onClick={async () => {
                const id = verifyWarning.row?.id;
                if (!id) return;
                await supabase.from('imported_invoices').update({ status: 'verified' }).eq('id', id);
                setSnackbar('Record verified!');
                setDetailDialog(d => ({ ...d, row: { ...d.row, status: 'verified' } }));
                setVerifyWarning({ open: false, row: null, mismatch: false });
              }}>Verify Anyway</Button>
            </DialogActions>
          </Dialog>
        </Dialog>
        <Zoom in>
          <Fab
            color="primary"
            component={Link}
            to="/import-approvals/history"
            sx={{
              position: 'fixed',
              bottom: 32,
              right: 32,
              zIndex: 2000,
              boxShadow: 6,
            }}
            aria-label="History"
          >
            <HistoryIcon />
          </Fab>
        </Zoom>
      </Paper>
    </Box>
  );
} 