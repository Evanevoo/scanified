import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase/client';
import {
  Box, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody, TableContainer, TextField, Alert, CircularProgress
} from '@mui/material';

const COLUMNS = [
  { key: 'customer_id', label: 'Customer ID' },
  { key: 'customer_name', label: 'Customer Name' },
  { key: 'invoice_number', label: 'Invoice/Receipt Number' },
  { key: 'gas_type', label: 'Gas Type' },
  { key: 'cylinder_type', label: 'Cylinder Type' },
  { key: 'qty_out', label: 'Qty Out' },
  { key: 'qty_in', label: 'Qty In' },
  { key: 'date', label: 'Date' },
  { key: 'scan_status', label: 'Scan Status' },
];

export default function SupabaseOrders() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      // Fetch invoices, customers, line items, cylinders, and scans
      const { data: invoices, error: invErr } = await supabase
        .from('invoices')
        .select('id, customer_id, invoice_date, details');
      const { data: customers, error: custErr } = await supabase
        .from('customers')
        .select('CustomerListID, name');
      const { data: lineItems, error: liErr } = await supabase
        .from('invoice_line_items')
        .select('invoice_id, product_code, description, qty_out, qty_in');
      const { data: cylinders, error: cylErr } = await supabase
        .from('cylinders')
        .select('product_code, type, description');
      // Try to fetch scans (scanned_sessions or similar)
      let scans = [];
      try {
        const { data: scanData } = await supabase
          .from('scanned_sessions')
          .select('order_number, product_code, scanned_at');
        scans = scanData || [];
      } catch {}
      if (invErr || custErr || liErr || cylErr) {
        setError(invErr?.message || custErr?.message || liErr?.message || cylErr?.message);
        setLoading(false);
        return;
      }
      const customerMap = {};
      for (const c of customers) customerMap[c.CustomerListID] = c.name;
      const invoiceMap = {};
      for (const inv of invoices) invoiceMap[inv.id] = inv;
      const cylinderMap = {};
      for (const cyl of cylinders) cylinderMap[cyl.product_code] = cyl;
      // Build rows: one per line item
      const tableRows = lineItems.map(li => {
        const inv = invoiceMap[li.invoice_id] || {};
        const cyl = cylinderMap[li.product_code] || {};
        // Scan status: look for a scan with matching order_number (details) and product_code
        const scanMatch = scans.find(s => s.order_number === inv.details && s.product_code === li.product_code);
        return {
          customer_id: inv.customer_id || '',
          customer_name: customerMap[inv.customer_id] || '',
          invoice_number: inv.details || '',
          gas_type: li.product_code || li.description || '',
          cylinder_type: cyl.type || cyl.description || '',
          qty_out: li.qty_out ?? '',
          qty_in: li.qty_in ?? '',
          date: inv.invoice_date || '',
          scan_status: scanMatch ? 'Scanned' : 'Not Scanned',
        };
      });
      setRows(tableRows);
      setLoading(false);
    }
    fetchData();
  }, []);

  const filtered = rows.filter(row => {
    const s = search.toLowerCase();
    const matchesText =
      !search ||
      (row.customer_id && row.customer_id.toLowerCase().includes(s)) ||
      (row.customer_name && row.customer_name.toLowerCase().includes(s)) ||
      (row.invoice_number && row.invoice_number.toLowerCase().includes(s)) ||
      (row.gas_type && row.gas_type.toLowerCase().includes(s)) ||
      (row.cylinder_type && row.cylinder_type.toLowerCase().includes(s));
    let matchesDate = true;
    if (dateFrom) matchesDate = matchesDate && row.date && row.date >= dateFrom;
    if (dateTo) matchesDate = matchesDate && row.date && row.date <= dateTo;
    return matchesText && matchesDate;
  });

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fff', py: 8, borderRadius: 0, overflow: 'visible' }}>
      <Paper elevation={0} sx={{ width: '100%', p: { xs: 2, md: 5 }, borderRadius: 0, boxShadow: '0 2px 12px 0 rgba(16,24,40,0.04)', border: '1px solid #eee', bgcolor: '#fff', overflow: 'visible' }}>
        <Typography variant="h3" fontWeight={900} color="primary" mb={2} sx={{ letterSpacing: -1 }}>Supabase Orders</Typography>
        <Box display="flex" flexWrap="wrap" gap={3} mb={4} alignItems="end">
          <TextField
            label="Search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Customer, Invoice #, Gas Type, Cylinder Type"
            size="small"
            sx={{ width: 220 }}
          />
          <TextField
            label="Date From"
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            size="small"
            sx={{ width: 160 }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Date To"
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            size="small"
            sx={{ width: 160 }}
            InputLabelProps={{ shrink: true }}
          />
        </Box>
        {loading && <Box p={4} textAlign="center"><CircularProgress /></Box>}
        {error && <Alert severity="error">Error: {error}</Alert>}
        {!loading && !error && (
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {COLUMNS.map(col => (
                    <TableCell key={col.key} sx={{ fontWeight: 700, bgcolor: 'primary.light', color: 'primary.contrastText' }}>{col.label}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={COLUMNS.length} align="center" sx={{ py: 4, color: 'text.secondary' }}>No records found.</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row, idx) => (
                    <TableRow key={idx} sx={{ backgroundColor: idx % 2 === 0 ? 'action.hover' : undefined }}>
                      {COLUMNS.map(col => (
                        <TableCell
                          key={col.key}
                          sx={col.key === 'scan_status' && row[col.key] === 'Not Scanned' ? { bgcolor: 'error.light', color: 'error.main', fontWeight: 700 } : {}}
                        >
                          {row[col.key] || ''}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
} 