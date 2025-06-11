import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase/client';
import { Box, Paper, Typography, Button, Alert, Snackbar, CircularProgress, Divider, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import HistoryIcon from '@mui/icons-material/History';

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
  const filteredInvoices = pendingInvoices.filter(row => {
    if (!search) return true;
    const s = search.toLowerCase();
    const d = row.data || {};
    return (
      (row.id && String(row.id).toLowerCase().includes(s)) ||
      (d.invoice_number && String(d.invoice_number).toLowerCase().includes(s)) ||
      (d.sales_receipt_number && String(d.sales_receipt_number).toLowerCase().includes(s)) ||
      (d.order_number && String(d.order_number).toLowerCase().includes(s)) ||
      (d.sales_order_number && String(d.sales_order_number).toLowerCase().includes(s)) ||
      (d.customer_name && String(d.customer_name).toLowerCase().includes(s)) ||
      (row.data && JSON.stringify(row.data).toLowerCase().includes(s))
    );
  });
  const filteredReceipts = pendingReceipts.filter(row => {
    if (!search) return true;
    const s = search.toLowerCase();
    const d = row.data || {};
    return (
      (row.id && String(row.id).toLowerCase().includes(s)) ||
      (d.invoice_number && String(d.invoice_number).toLowerCase().includes(s)) ||
      (d.sales_receipt_number && String(d.sales_receipt_number).toLowerCase().includes(s)) ||
      (d.order_number && String(d.order_number).toLowerCase().includes(s)) ||
      (d.sales_order_number && String(d.sales_order_number).toLowerCase().includes(s)) ||
      (d.customer_name && String(d.customer_name).toLowerCase().includes(s)) ||
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

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fff', py: 8, borderRadius: 0, overflow: 'visible' }}>
      <Paper elevation={0} sx={{ maxWidth: 1100, mx: 'auto', p: { xs: 2, md: 5 }, borderRadius: 0, boxShadow: '0 2px 12px 0 rgba(16,24,40,0.04)', border: '1px solid #eee', bgcolor: '#fff', overflow: 'visible' }}>
        <Button onClick={() => navigate('/dashboard')} variant="outlined" color="primary" sx={{ mb: 4, borderRadius: 999, fontWeight: 700, px: 4 }}>
          ← Back to Dashboard
        </Button>
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
              <Paper variant="outlined" sx={{ mb: 4, p: 0, borderRadius: 0, border: '1px solid #e3e7ef', background: '#fafbfc', overflow: 'visible' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fafbfc' }} role="table" aria-label="Pending table">
                  <thead>
                    <tr style={{ background: '#f5f7fa' }}>
                      <th scope="col" style={{ padding: 10, borderBottom: '1px solid #e3e7ef', fontWeight: 700, fontSize: 15 }}>Type</th>
                      <th scope="col" style={{ padding: 10, borderBottom: '1px solid #e3e7ef', fontWeight: 700, fontSize: 15 }}>Order/Receipt #</th>
                      <th scope="col" style={{ padding: 10, borderBottom: '1px solid #e3e7ef', fontWeight: 700, fontSize: 15 }}>Customer</th>
                      <th scope="col" style={{ padding: 10, borderBottom: '1px solid #e3e7ef', fontWeight: 700, fontSize: 15 }}>Date</th>
                      <th scope="col" style={{ padding: 10, borderBottom: '1px solid #e3e7ef', fontWeight: 700, fontSize: 15 }}>Group</th>
                      <th scope="col" style={{ padding: 10, borderBottom: '1px solid #e3e7ef', fontWeight: 700, fontSize: 15 }}>Product</th>
                      <th scope="col" style={{ padding: 10, borderBottom: '1px solid #e3e7ef', fontWeight: 700, fontSize: 15 }}>SHP (Imp/Scan)</th>
                      <th scope="col" style={{ padding: 10, borderBottom: '1px solid #e3e7ef', fontWeight: 700, fontSize: 15 }}>RTN (Imp/Scan)</th>
                      <th scope="col" style={{ padding: 10, borderBottom: '1px solid #e3e7ef', fontWeight: 700, fontSize: 15 }}>Status</th>
                      <th scope="col" style={{ padding: 10, borderBottom: '1px solid #e3e7ef', fontWeight: 700, fontSize: 15 }}>Detail</th>
                      <th scope="col" style={{ padding: 10, borderBottom: '1px solid #e3e7ef', fontWeight: 700, fontSize: 15 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {unifiedPending.map(row => {
                      const d = row.data || {};
                      const type = row._type;
                      let orderNum = d.invoice_number || d.order_number || d.sales_receipt_number || row.id;
                      let customer = d.customer_name || '-';
                      if (d.customer_id) customer += ` (${d.customer_id})`;
                      let date = d.date || formatDate(row.uploaded_at);
                      let group = type === 'invoice' ? (productCodeToGroup[d.product_code?.trim()] || d.group || d.gas_type || d.product_group || '-') : '-';
                      let product = d.product_code || '-';
                      let impShip = 0, impReturn = 0, scanShip = 0, scanReturn = 0, status = '-';
                      const scanned = getScannedOrder(d.invoice_number || d.order_number || d.sales_receipt_number);
                      if (type === 'invoice') {
                        if (Array.isArray(d.line_items)) {
                          for (const item of d.line_items) {
                            const qty = Number(item.qty_out ?? item.qty ?? 1);
                            if (qty > 0) impShip += qty;
                            if (qty < 0) impReturn += Math.abs(qty);
                          }
                        } else if (d.product_code) {
                          const qty = Number(d.qty_out ?? d.qty ?? 1);
                          if (qty > 0) impShip += qty;
                          if (qty < 0) impReturn += Math.abs(qty);
                        }
                        scanShip = Array.isArray(scanned?.ship_cylinders) ? scanned.ship_cylinders.length : 0;
                        scanReturn = Array.isArray(scanned?.return_cylinders) ? scanned.return_cylinders.length : 0;
                        status = getStatus(impShip, scanShip, impReturn, scanReturn, scanned);
                      } else if (type === 'receipt') {
                        if (Array.isArray(d.shipped_bottles)) impShip = d.shipped_bottles.length;
                        if (Array.isArray(d.returned_bottles)) impReturn = d.returned_bottles.length;
                        if (!impShip && d.qty_out) impShip = Number(d.qty_out) || 0;
                        if (!impReturn && d.qty_in) impReturn = Number(d.qty_in) || 0;
                        scanShip = Array.isArray(scanned?.ship_cylinders) ? scanned.ship_cylinders.length : 0;
                        scanReturn = Array.isArray(scanned?.return_cylinders) ? scanned.return_cylinders.length : 0;
                        const shpMismatch = impShip !== scanShip;
                        const rtnMismatch = impReturn !== scanReturn;
                        status = (!scanned ? 'No Scan' : (shpMismatch || rtnMismatch ? 'Mismatch' : 'Match'));
                      }
                      return (
                        <tr key={row.id} style={{ background: (status === 'Mismatch' || status === 'Unmatched Scan') ? '#fffbe6' : '#fff' }}>
                          <td style={{ padding: 10, fontWeight: 600 }}>{type === 'invoice' ? 'Invoice' : 'Sales Receipt'}</td>
                          <td style={{ padding: 10, fontWeight: 600 }}>{orderNum}</td>
                          <td style={{ padding: 10 }}>{customer}</td>
                          <td style={{ padding: 10 }}>{date}</td>
                          <td style={{ padding: 10 }}>{group}</td>
                          <td style={{ padding: 10 }}>{product}</td>
                          <td style={{ padding: 10, textAlign: 'center' }}>
                            <div style={{ lineHeight: 1.2 }}>
                              <span style={{ fontWeight: 700, color: impShip !== scanShip ? 'red' : '#222' }}>Imp: {impShip}</span><br />
                              <span style={{ fontWeight: 700, color: impShip !== scanShip ? 'red' : '#222' }}>Scan: {scanShip}</span>
                            </div>
                          </td>
                          <td style={{ padding: 10, textAlign: 'center' }}>
                            <div style={{ lineHeight: 1.2 }}>
                              <span style={{ fontWeight: 700, color: impReturn !== scanReturn ? 'red' : '#222' }}>Imp: {impReturn}</span><br />
                              <span style={{ fontWeight: 700, color: impReturn !== scanReturn ? 'red' : '#222' }}>Scan: {scanReturn}</span>
                            </div>
                          </td>
                          <td style={{ padding: 10, fontWeight: 700, color: status === 'Match' ? 'green' : status === 'Mismatch' ? 'red' : '#888' }}>{status}</td>
                          <td style={{ padding: 10 }}><Link to={`/import-approvals/${row.id}`} style={{ color: '#1976d2', textDecoration: 'underline', fontWeight: 500 }}>Detail</Link></td>
                          <td style={{ padding: 10 }}>
                            {type === 'invoice' ? (
                              <>
                                <Button variant="contained" color="success" size="small" sx={{ minWidth: 0, px: 2, mr: 1 }} onClick={() => handleApprove('invoice', row)}>Verify</Button>
                                <Button variant="contained" color="error" size="small" sx={{ minWidth: 0, px: 2 }} onClick={() => handleDelete('invoice', row)}>Delete</Button>
                              </>
                            ) : (
                              <>
                                <Button variant="contained" color="success" size="small" sx={{ minWidth: 0, px: 2, mr: 1 }} onClick={() => handleApprove('receipt', row)}>Approve</Button>
                                <Button variant="contained" color="error" size="small" sx={{ minWidth: 0, px: 2 }} onClick={() => handleDelete('receipt', row)}>Delete</Button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Paper>
            )}
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
      </Paper>
    </Box>
  );
} 