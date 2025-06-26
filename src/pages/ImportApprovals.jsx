import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase/client';
import { Box, Paper, Typography, Button, Alert, Snackbar, CircularProgress, Divider, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, MenuItem, Select, FormControl, InputLabel, TableContainer, Table, TableHead, TableBody, TableRow, TableCell, Chip, Checkbox, Autocomplete, Tooltip, Fab, Zoom, Card, CardContent, CardHeader, Grid } from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import HistoryIcon from '@mui/icons-material/History';
import CloseIcon from '@mui/icons-material/Close';
import { CheckCircleOutline, DeleteOutline, InfoOutlined } from '@mui/icons-material';
import ImportApprovalDetail from './ImportApprovalDetail';

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
  const [productCodeToAssetInfo, setProductCodeToAssetInfo] = useState({});

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
      const { data: cylinders } = await supabase.from('bottles').select('product_code, group_name');
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
      const { data: customers } = await supabase.from('customers').select('CustomerListID, name');
      const map = {};
      (customers || []).forEach(c => {
        if (c.name) map[c.name.trim().toLowerCase()] = c.CustomerListID;
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
      // For now, just set counts to 0 since we don't have the tracking columns
      const counts = {};
      pendingInvoices.forEach(row => {
        const d = parseDataField(row.data);
        const num = d.invoice_number || d.order_number;
        if (num) counts[num] = 0;
      });
      setScannedCounts(counts);
    }
    fetchScannedCounts();
  }, [pendingInvoices]);

  // Batch fetch all relevant bottles for all pending invoices
  useEffect(() => {
    async function fetchAllScanned() {
      if (!pendingInvoices.length) return;
      // Just fetch basic bottle information for product code mapping
      const { data: bottles } = await supabase
        .from('bottles')
        .select('category, group_name, type, product_code');
      setAllScannedRows(bottles || []);
    }
    fetchAllScanned();
  }, [pendingInvoices]);

  // Build a lookup: { [invoiceNumber]: { [groupKey]: trkCount } }
  const scannedLookup = {};
  // For now, just create an empty lookup since we don't have invoice/order tracking
  // This can be enhanced later when we add proper tracking columns

  // Fetch scanned orders (cylinder_scans)
  useEffect(() => {
    async function fetchScannedOrders() {
      try {
        const { data, error } = await supabase
          .from('cylinder_scans')
          .select('*');
        if (!error) setScannedOrders(data || []);
      } catch (e) {
        // Table might not exist, just set empty array
        setScannedOrders([]);
      }
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

      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Fetch gas types for dropdown
  useEffect(() => {
    async function fetchGasTypes() {
      const { data } = await supabase.from('gas_types').select('name');
      setGasTypes(data?.map(gt => gt.name) || []);
    }
    fetchGasTypes();
  }, []);

  // Fetch all bottles for product code lookup
  useEffect(() => {
    async function fetchBottles() {
      const { data: bottles } = await supabase.from('bottles').select('product_code, category, group_name, type');
      const map = {};
      (bottles || []).forEach(b => {
        if (b.product_code) map[b.product_code.trim()] = {
          category: b.category || '',
          group: b.group_name || '',
          type: b.type || ''
        };
      });
      setProductCodeToAssetInfo(map);
    }
    fetchBottles();
  }, []);

  // Advanced filtering/search
  const now = Date.now();
  const filteredInvoices = pendingInvoices.filter(row => {
    const dataInv = row.data || {};
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (dataInv.invoice_number && String(dataInv.invoice_number).toLowerCase().includes(s)) ||
      (dataInv.order_number && String(dataInv.order_number).toLowerCase().includes(s)) ||
      (dataInv.customer_name && String(dataInv.customer_name).toLowerCase().includes(s))
    );
  });

  // Group by invoice number from line items (support more field names)
  const invoiceCustomerLineItems = {};
  filteredInvoices.forEach(row => {
    const d = parseDataField(row.data);
    const lineItems = getLineItems([row]);
    lineItems.forEach(li => {
      // Check for all possible invoice number fields
      const invoiceKey = li.invoice_number || li.order_number || li.InvoiceNumber || li.ReferenceNumber || li.reference_number || 'UnknownInvoice';
      const customerName = li.customer_name || d.customer_name || '';
      const customerId = li.customer_id || d.customer_id || '';
      const customerKey = customerName || customerId || 'UnknownCustomer';
      const groupKey = `${invoiceKey}__${customerKey}`;
      if (!invoiceCustomerLineItems[groupKey]) invoiceCustomerLineItems[groupKey] = {
        invoiceKey,
        customerKey,
        customerName,
        customerId,
        items: [],
        date: li.date || d.date || row.uploaded_at,
        row,
        d
      };
      invoiceCustomerLineItems[groupKey].items.push({ ...li, _row: row, _data: d });
    });
  });

  // Helper to infer status/warning
  function inferStatus(group) {
    const d = parseDataField(group[0].data);
    if (d.accounting_mismatch) return { type: 'error', msg: 'Accounting does not match. Accounting data shown in bold red text where it differs from TrackAbout.' };
    if (d.no_accounting_match) return { type: 'warning', msg: 'No accounting system data was found matching this invoice.' };
    return null;
  }

  // Helper to get line items
  function getLineItems(group) {
    const d = parseDataField(group[0].data);
    return d.line_items || d.rows || d.delivered || [];
  }

  // Helper to get customer name and ID
  function getCustomerInfo(d) {
    if (!d.customer_name) return { name: 'Unknown', id: '' };
    // Try to extract ID from name if present in parentheses
    const match = d.customer_name.match(/(.+?)\s*\(([^)]+)\)/);
    if (match) return { name: match[1].trim(), id: match[2].trim() };
    return { name: d.customer_name, id: '' };
  }

  // Helper to get the best sales order number
  function getSalesOrderNumber(d, lineItems) {
    // Prefer sales_order_number, then order_number, then invoice_number
    if (d.sales_order_number) return d.sales_order_number;
    if (d.order_number) return d.order_number;
    if (d.invoice_number) return d.invoice_number;
    // Fallback: try to get from line items if present
    if (Array.isArray(lineItems) && lineItems.length > 0) {
      // Try to find a field that looks like an order number
      for (const li of lineItems) {
        if (li.order_number) return li.order_number;
        if (li.sales_order_number) return li.sales_order_number;
      }
    }
    return '';
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
    if (!errorOccurred) {
      setSnackbar(`${selectedInvoices.length} invoices deleted.`);
      setSelectedInvoices([]);
    }
    setLoading(false);
  }

  function getStatus(invShip, scanShip, invReturn, scanReturn, scanned) {
    if (invShip && scanShip) return 'Matched';
    if (invShip && !scanShip) return 'Missing Scan';
    if (!invShip && scanShip) return 'Extra Scan';
    return 'No Match';
  }

  function getUnmatchedScanStatus() { return 'Unmatched Scan'; }

  const handleSelectRow = (id) => {
    setSelectedRows(prev => 
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedRows.length === filteredInvoices.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredInvoices.map(row => row.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRows.length === 0) return;
    if (!window.confirm(`Delete ${selectedRows.length} selected items?`)) return;
    setLoading(true);
    for (const id of selectedRows) {
      try {
        await supabase.from('imported_invoices').delete().eq('id', id);
      } catch (e) {
        setError(e.message);
        break;
      }
    }
    setSelectedRows([]);
    setLoading(false);
  };

  async function searchCustomers(query) {
    if (query.length < 2) return;
    setCustomerSearchLoading(true);
    const { data } = await supabase.from('customers').select('CustomerListID, name').ilike('name', `%${query}%`).limit(10);
    setCustomerOptions(data || []);
    setCustomerSearchLoading(false);
  }

  async function handleSidebarAction(opt) {
    // Placeholder for sidebar actions
    console.log('Sidebar action:', opt);
  }

  // Helper to get tracked/scanned quantity for a line item
  function getTrackedQty(li) {
    const invoiceNum = li.invoice_number || li.order_number || li.InvoiceNumber || li.ReferenceNumber || li.reference_number;
    const customerId = li.customer_id || li.customer_name;
    const productCode = li.product_code;
    // Find all matching scans for this invoice, product, and customer
    const scans = scannedOrders.filter(
      s =>
        (s.order_number === invoiceNum || s.invoice_number === invoiceNum) &&
        (s.customer_id === customerId || s.customer_name === customerId) &&
        s.cylinder_barcode === productCode
    );
    // Sum up the quantity if available, else count the scans
    return scans.reduce((sum, s) => sum + (s.qty || s.quantity || 1), 0);
  }

  // Helper to get tracked/scanned return quantity for a line item
  function getTrackedReturnQty(li) {
    const invoiceNum = li.invoice_number || li.order_number || li.InvoiceNumber || li.ReferenceNumber || li.reference_number;
    const customerId = li.customer_id || li.customer_name;
    const productCode = li.product_code;
    // Find all matching scans for this invoice, product, and customer, mode RETURN
    const scans = scannedOrders.filter(
      s =>
        (s.order_number === invoiceNum || s.invoice_number === invoiceNum) &&
        (s.customer_id === customerId || s.customer_name === customerId) &&
        s.cylinder_barcode === productCode &&
        (s.mode === 'RETURN' || s.mode === 'RTN')
    );
    return scans.reduce((sum, s) => sum + (s.qty || s.quantity || 1), 0);
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Import Approvals
        </Typography>
        <Button
          variant="outlined"
          startIcon={<HistoryIcon />}
          onClick={() => navigate('/import-approvals/history')}
        >
          Import Approvals History
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <TextField
        fullWidth
        label="Search imports..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 3 }}
      />

      {Object.values(invoiceCustomerLineItems).length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="textSecondary">No pending invoices found.</Typography>
        </Paper>
      ) : (
        <Grid container spacing={4}>
          {Object.values(invoiceCustomerLineItems).map(group => {
            const firstItem = group.items[0];
            const status = inferStatus([firstItem._row]);
            return (
              <Grid item xs={12} key={group.invoiceKey + group.customerKey}>
                <Card sx={{ background: '#f8fafc', borderRadius: 3, boxShadow: 4, mb: 5, p: 0 }}>
                  <Box sx={{ background: '#6c849b', color: 'white', p: 2, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
                    <Grid container spacing={2} alignItems="center" justifyContent="space-between">
                      <Grid item xs={12} sm={4} md={4}><b>INVOICE #:</b> {group.invoiceKey}</Grid>
                      <Grid item xs={12} sm={4} md={4}><b>CUSTOMER:</b> {group.customerName || group.customerKey}{group.customerId && group.customerName && (<span style={{ color: '#fff', fontWeight: 400 }}> ({group.customerId})</span>)}</Grid>
                      <Grid item xs={12} sm={3} md={3}><b>DATE:</b> {formatDate(group.date)}</Grid>
                      <Grid item xs={12} sm={1} md={1} textAlign="right">
                        <Button 
                          size="small" 
                          sx={{ color: 'white', borderColor: 'white' }} 
                          variant="outlined" 
                          onClick={() => {
                            console.log('Details clicked, group:', group);
                            console.log('group.row.id:', group.row?.id);
                            if (group.row?.id) {
                              const params = new URLSearchParams({
                                invoiceNumber: group.invoiceKey,
                                customerName: group.customerName || group.customerKey,
                                customerId: group.customerId || ''
                              });
                              navigate(`/import-approval/${group.row.id}/detail?${params.toString()}`);
                            } else {
                              console.error('No ID found for navigation');
                              alert('Error: Could not navigate to details - missing ID');
                            }
                          }}
                        >
                          Details
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>
                  <Divider sx={{ my: 0 }} />
                  <CardContent sx={{ background: '#f8fafc', p: 3 }}>
                    {status && (
                      <Alert severity={status.type} sx={{ mb: 2, fontWeight: 600 }}>{status.msg}</Alert>
                    )}
                    <TableContainer component={Paper} sx={{ mb: 2, boxShadow: 0, borderRadius: 2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ background: '#f0f4f8' }}>
                            <TableCell><b>Category</b></TableCell>
                            <TableCell><b>Group</b></TableCell>
                            <TableCell><b>Type</b></TableCell>
                            <TableCell><b>Product Code</b></TableCell>
                            <TableCell><b>SHP</b></TableCell>
                            <TableCell><b>RTN</b></TableCell>
                            <TableCell><b>Highlight</b></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {group.items.length === 0 ? (
                            <TableRow><TableCell colSpan={7}>No line items</TableCell></TableRow>
                          ) : (
                            group.items.map((li, idx) => {
                              const assetInfo = productCodeToAssetInfo[li.product_code?.trim()] || {};
                              const shpInv = li.ship || li.qty_out || li.SHP || 0;
                              const shpTrk = getTrackedQty(li);
                              const shpColor = shpInv == shpTrk ? 'green' : 'red';
                              const rtnInv = li.return || li.qty_in || li.RTN || 0;
                              const rtnTrk = getTrackedReturnQty(li);
                              const rtnColor = rtnInv == rtnTrk ? 'green' : 'red';
                              return (
                                <TableRow key={idx} sx={{ background: idx % 2 === 0 ? '#fff' : '#f6f8fa' }}>
                                  <TableCell>{assetInfo.category || li.category || ''}</TableCell>
                                  <TableCell>{assetInfo.group || li.group || li.group_name || ''}</TableCell>
                                  <TableCell>{assetInfo.type || li.type || ''}</TableCell>
                                  <TableCell>{li.product_code || ''}</TableCell>
                                  <TableCell>
                                    <div><span style={{ color: shpColor }}>Trk: {shpTrk}</span></div>
                                    <div><span style={{ color: shpColor }}>Inv: {shpInv}</span></div>
                                  </TableCell>
                                  <TableCell>
                                    <div><span style={{ color: rtnColor }}>Trk: {rtnTrk}</span></div>
                                    <div><span style={{ color: rtnColor }}>Inv: {rtnInv}</span></div>
                                  </TableCell>
                                  <TableCell><Checkbox /></TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <Box display="flex" gap={2} alignItems="center" mt={2}>
                      <Button variant="contained" color="success" size="large" sx={{ fontWeight: 700, minWidth: 120 }} onClick={() => handleApprove('invoice', firstItem._row)}>VERIFY</Button>
                      <Button variant="outlined" color="error" size="large" sx={{ fontWeight: 700, minWidth: 120 }} onClick={() => handleReject('invoice', firstItem._row)}>Reject</Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Snackbar */}
      <Snackbar
        open={!!snackbar}
        autoHideDuration={6000}
        onClose={() => setSnackbar('')}
        message={snackbar}
      />
    </Box>
  );
} 