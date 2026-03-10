import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase/client';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  CircularProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  AccountBalance as AccountBalanceIcon,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { TableSkeleton } from '../components/SmoothLoading';
import { toCsv, downloadFile } from '../utils/invoiceUtils';
import logger from '../utils/logger';

export default function RentalInvoiceSearch() {
  const navigate = useNavigate();
  const { organization } = useAuth();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    invoiceNumber: '',
    customerSearch: '',
    status: '',
  });
  const [exporting, setExporting] = useState(false);

  const fetchInvoices = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    setError('');
    try {
      let query = supabase
        .from('invoices')
        .select('id, invoice_number, customer_id, customer_name, customer_email, invoice_date, period_start, period_end, subtotal, tax_amount, total_amount, status, email_sent, email_sent_at, created_at')
        .eq('organization_id', organization.id)
        .order('invoice_date', { ascending: false });

      if (filters.dateFrom) {
        query = query.gte('invoice_date', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('invoice_date', filters.dateTo);
      }
      if (filters.invoiceNumber?.trim()) {
        query = query.ilike('invoice_number', `%${filters.invoiceNumber.trim()}%`);
      }
      if (filters.customerSearch?.trim()) {
        query = query.or(`customer_name.ilike.%${filters.customerSearch.trim()}%,customer_id.ilike.%${filters.customerSearch.trim()}%`);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setInvoices(data || []);
    } catch (err) {
      logger.error('RentalInvoiceSearch fetch error:', err);
      setError(err.message || 'Failed to load invoices.');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [organization?.id, filters.dateFrom, filters.dateTo, filters.invoiceNumber, filters.customerSearch, filters.status]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleExport = () => {
    setExporting(true);
    try {
      const cols = [
        'Invoice #',
        'Customer ID',
        'Customer Name',
        'Invoice Date',
        'Period Start',
        'Period End',
        'Subtotal',
        'Tax',
        'Total',
        'Status',
        'Email Sent',
        'Created',
      ];
      const rows = invoices.map((inv) => ({
        'Invoice #': inv.invoice_number || '',
        'Customer ID': inv.customer_id || '',
        'Customer Name': inv.customer_name || '',
        'Invoice Date': inv.invoice_date || '',
        'Period Start': inv.period_start || '',
        'Period End': inv.period_end || '',
        Subtotal: inv.subtotal != null ? Number(inv.subtotal).toFixed(2) : '',
        Tax: inv.tax_amount != null ? Number(inv.tax_amount).toFixed(2) : '',
        Total: inv.total_amount != null ? Number(inv.total_amount).toFixed(2) : '',
        Status: inv.status || '',
        'Email Sent': inv.email_sent ? 'Yes' : 'No',
        Created: inv.created_at ? new Date(inv.created_at).toISOString().slice(0, 10) : '',
      }));
      const csv = toCsv(rows, cols);
      const filename = `rental_invoices_export_${new Date().toISOString().slice(0, 10)}.csv`;
      downloadFile(csv, filename);
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (n) => (n != null ? `$${Number(n).toFixed(2)}` : '—');
  const formatDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '—');

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2 }, maxWidth: '100%' }}>
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h5" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccountBalanceIcon color="primary" />
              Billing & accounting
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Search and export rental invoices. QuickBooks CSV and lease billing are on the{' '}
              <Link to="/rentals" style={{ fontWeight: 500 }}>Rentals</Link> page (Export menu) and{' '}
              <Link to="/lease-billing-dashboard" style={{ fontWeight: 500 }}>Lease billing dashboard</Link>.
            </Typography>
          </Box>
          <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={() => fetchInvoices()} disabled={loading}>
            Refresh
          </Button>
        </Stack>
      </Box>

      <Card elevation={0} sx={{ mb: 3, borderRadius: 2, border: '1px solid rgba(0,0,0,0.06)' }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
            Filter by date, customer, or invoice number, then export to CSV.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} flexWrap="wrap" gap={2} alignItems="flex-end">
            <TextField
              size="small"
              label="From date"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 160 }}
            />
            <TextField
              size="small"
              label="To date"
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 160 }}
            />
            <TextField
              size="small"
              label="Invoice #"
              placeholder="e.g. W00001"
              value={filters.invoiceNumber}
              onChange={(e) => setFilters((f) => ({ ...f, invoiceNumber: e.target.value }))}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 180 }}
            />
            <TextField
              size="small"
              label="Customer name or ID"
              placeholder="Search customer"
              value={filters.customerSearch}
              onChange={(e) => setFilters((f) => ({ ...f, customerSearch: e.target.value }))}
              sx={{ minWidth: 200 }}
            />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="sent">Sent</MenuItem>
                <MenuItem value="paid">Paid</MenuItem>
                <MenuItem value="overdue">Overdue</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={exporting ? <CircularProgress size={18} /> : <DownloadIcon />}
              onClick={handleExport}
              disabled={invoices.length === 0 || exporting}
            >
              {exporting ? 'Exporting…' : 'Export to CSV'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.06)' }}>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <TableSkeleton rows={8} columns={8} />
          ) : invoices.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No invoices match your filters. Adjust dates or search terms, or generate invoices from the Rentals page.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Invoice #</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Period</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Subtotal</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Tax</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Total</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id} hover>
                      <TableCell>{inv.invoice_number || '—'}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {inv.customer_name || inv.customer_id || '—'}
                        </Typography>
                        {inv.customer_id && (
                          <Typography variant="caption" color="text.secondary">
                            {inv.customer_id}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(inv.invoice_date)}</TableCell>
                      <TableCell>
                        {formatDate(inv.period_start)} – {formatDate(inv.period_end)}
                      </TableCell>
                      <TableCell align="right">{formatCurrency(inv.subtotal)}</TableCell>
                      <TableCell align="right">{formatCurrency(inv.tax_amount)}</TableCell>
                      <TableCell align="right">{formatCurrency(inv.total_amount)}</TableCell>
                      <TableCell>
                        {inv.status ? (
                          <Chip
                            label={String(inv.status)}
                            size="small"
                            color={
                              inv.status === 'paid'
                                ? 'success'
                                : inv.status === 'overdue'
                                  ? 'error'
                                  : inv.status === 'sent'
                                    ? 'info'
                                    : 'default'
                            }
                            variant="outlined"
                          />
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>{inv.email_sent ? 'Yes' : 'No'}</TableCell>
                      <TableCell align="center">
                        <Tooltip title="View invoice detail">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/invoice/${inv.id}`)}
                            aria-label="View invoice"
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {!loading && invoices.length > 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Showing {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}.
        </Typography>
      )}
    </Box>
  );
}
