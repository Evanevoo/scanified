import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { Box, Paper, Typography, Button, TextField, Table, TableHead, TableRow, TableCell, TableBody, TableContainer, TableSortLabel, TablePagination, MenuItem, Select, InputLabel, FormControl, IconButton, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import InfoOutlined from '@mui/icons-material/InfoOutlined';

export default function ImportApprovalsHistory() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('verified');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [customers, setCustomers] = useState([]);
  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('verified_at');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [detailDialog, setDetailDialog] = useState({ open: false, row: null });
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data, error } = await supabase
        .from('imported_invoices')
        .select('*')
        .in('status', ['approved', 'rejected'])
        .order('verified_at', { ascending: false });
      setRows(data || []);
      setLoading(false);
    }
    async function fetchCustomers() {
      const { data } = await supabase.from('customers').select('CustomerListID, CustomerName');
      setCustomers(data || []);
    }
    fetchData();
    fetchCustomers();
  }, []);

  // Filtering
  const filtered = rows.filter(row => {
    const d = row.data || {};
    if (statusFilter && row.status !== statusFilter) return false;
    if (customerFilter && d.customer_id !== customerFilter && d.customer_name !== customerFilter) return false;
    if (dateFrom && (!row.verified_at || row.verified_at < dateFrom)) return false;
    if (dateTo && (!row.verified_at || row.verified_at > dateTo)) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (row.id && String(row.id).toLowerCase().includes(s)) ||
      (d.invoice_number && String(d.invoice_number).toLowerCase().includes(s)) ||
      (d.customer_name && String(d.customer_name).toLowerCase().includes(s)) ||
      (row.data && JSON.stringify(row.data).toLowerCase().includes(s))
    );
  });

  // Sorting
  const sorted = filtered.sort((a, b) => {
    let aVal = a[orderBy] || '';
    let bVal = b[orderBy] || '';
    if (orderBy === 'verified_at' || orderBy === 'date') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }
    if (order === 'asc') return aVal > bVal ? 1 : -1;
    return aVal < bVal ? 1 : -1;
  });

  // Pagination
  const paged = sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box sx={{ p: { xs: 1, md: 4 }, maxWidth: 1400, mx: 'auto' }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/import-approvals')} sx={{ mb: 3, borderRadius: 999, fontWeight: 700, px: 4 }} variant="outlined">Back to Import Approvals</Button>
      <Typography variant="h4" fontWeight={900} color="primary" mb={3} sx={{ letterSpacing: -1 }}>Verified Invoices History</Typography>
      <Paper elevation={2} sx={{ mb: 3, p: 2, borderRadius: 3 }}>
        <Box display="flex" flexWrap="wrap" gap={2} mb={2} alignItems="center">
          <TextField label="Search" value={search} onChange={e => setSearch(e.target.value)} size="small" sx={{ width: 220 }} />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Customer</InputLabel>
            <Select value={customerFilter} label="Customer" onChange={e => setCustomerFilter(e.target.value)}>
              <MenuItem value="">All Customers</MenuItem>
              {customers.map(c => (
                <MenuItem key={c.CustomerListID} value={c.CustomerName}>{c.CustomerName}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select value={statusFilter} label="Status" onChange={e => setStatusFilter(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="verified">Verified</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
            </Select>
          </FormControl>
          <TextField label="From" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} size="small" sx={{ width: 150 }} InputLabelProps={{ shrink: true }} />
          <TextField label="To" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} size="small" sx={{ width: 150 }} InputLabelProps={{ shrink: true }} />
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel active={orderBy === 'invoice_number'} direction={order} onClick={() => setOrderBy('invoice_number')}>
                    Invoice #
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel active={orderBy === 'customer_name'} direction={order} onClick={() => setOrderBy('customer_name')}>
                    Customer
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel active={orderBy === 'date'} direction={order} onClick={() => setOrderBy('date')}>
                    Date
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel active={orderBy === 'verified_at'} direction={order} onClick={() => setOrderBy('verified_at')}>
                    Verified At
                  </TableSortLabel>
                </TableCell>
                <TableCell>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paged.map(row => {
                const d = row.data || {};
                return (
                  <TableRow key={row.id}>
                    <TableCell>{d.invoice_number || d.order_number || row.id}</TableCell>
                    <TableCell>{d.customer_name}</TableCell>
                    <TableCell>{d.date}</TableCell>
                    <TableCell>{row.verified_at || row.approved_at || row.updated_at || row.uploaded_at}</TableCell>
                    <TableCell>
                      <IconButton onClick={() => setDetailDialog({ open: true, row })}><InfoOutlined /></IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Paper>
      <Dialog open={detailDialog.open} onClose={() => setDetailDialog({ open: false, row: null })} maxWidth="md" fullWidth>
        <DialogTitle>Invoice Details</DialogTitle>
        <DialogContent>
          <pre style={{ fontSize: 14, background: '#f7f7fa', borderRadius: 6, padding: 12, maxHeight: 400, overflow: 'auto' }}>{JSON.stringify(detailDialog.row, null, 2)}</pre>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog({ open: false, row: null })}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 