import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Alert,
  CircularProgress,
  Stack,
  TextField,
} from '@mui/material';
import { Download as DownloadIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useSubscriptions } from '../context/SubscriptionContext';
import { PageSearchInput } from '../components/ui/search-input-with-icon';
import {
  fetchInvoiceEmailSends,
  downloadStoredInvoicePdf,
} from '../services/invoiceEmailHistory';
import { formatDate } from '../utils/subscriptionUtils';

export default function InvoiceEmailHistory() {
  const { organization } = useAuth();
  const ctx = useSubscriptions();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);

  const customerNameById = useMemo(() => {
    const m = new Map();
    for (const c of ctx.customers || []) {
      const id = String(c.id || c.CustomerListID || '').trim();
      const name = c.name || c.Name || id;
      if (id) m.set(id, name);
    }
    return m;
  }, [ctx.customers]);

  const load = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchInvoiceEmailSends(organization.id);
      setRows(data);
    } catch (e) {
      setError(e?.message || 'Failed to load emailed invoice history.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const inv = String(r.invoice_number || '').toLowerCase();
      const subj = String(r.subject || '').toLowerCase();
      const cust = String(customerNameById.get(r.customer_id) || r.customer_id || '').toLowerCase();
      const to = (r.emailed_to || []).join(' ').toLowerCase();
      return inv.includes(q) || subj.includes(q) || cust.includes(q) || to.includes(q);
    });
  }, [rows, search, customerNameById]);

  const handleDownload = async (row) => {
    if (!row.pdf_storage_path) {
      setError('No stored PDF for this send. Re-email from Rentals to archive a copy.');
      return;
    }
    setDownloadingId(row.id);
    try {
      const blob = await downloadStoredInvoicePdf(row.pdf_storage_path);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${row.invoice_number || 'export'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e?.message || 'Download failed.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Emailed invoice history
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Every successful rental invoice email sent from Rentals, with downloadable PDF attachments when stored.
            </Typography>
          </Box>
          <Button startIcon={<RefreshIcon />} onClick={load} disabled={loading}>
            Refresh
          </Button>
        </Stack>
      </Paper>

      {error ? (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <PageSearchInput
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onClear={() => setSearch('')}
        placeholder="Search invoice #, customer, recipient…"
        className="mb-3 w-full sm:max-w-[360px]"
      />

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                <TableCell>Sent</TableCell>
                <TableCell>Invoice #</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Period</TableCell>
                <TableCell>Emailed to</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell align="right">PDF</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {rows.length === 0
                        ? 'No emailed invoices logged yet. Send an invoice from Rentals to record it here.'
                        : 'No rows match your search.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{formatDate(row.sent_at)}</TableCell>
                    <TableCell>{row.invoice_number}</TableCell>
                    <TableCell>
                      {customerNameById.get(row.customer_id) || row.customer_id || '—'}
                    </TableCell>
                    <TableCell>
                      {row.period_start && row.period_end
                        ? `${row.period_start} – ${row.period_end}`
                        : '—'}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>
                      <Typography variant="body2" noWrap title={(row.emailed_to || []).join(', ')}>
                        {(row.emailed_to || []).join(', ') || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 220 }}>
                      <Typography variant="body2" noWrap title={row.subject}>
                        {row.subject || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        startIcon={<DownloadIcon />}
                        disabled={!row.pdf_storage_path || downloadingId === row.id}
                        onClick={() => handleDownload(row)}
                      >
                        Download
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
