import React, { useState, useMemo } from 'react';
import { useSubscriptions } from '../context/SubscriptionContext';
import { useTheme, resolveAccentToHex } from '../context/ThemeContext';
import { formatCurrency } from '../utils/subscriptionUtils';
import {
  buildTrackaboutQbInvoiceRow,
  TRACKABOUT_QB_EXPORT_COLUMNS,
} from '../utils/quickBooksInvoiceCsvDownload';
import {
  Box, Typography, Paper, Stack, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, LinearProgress,
} from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';

export default function QuickBooksExport() {
  const ctx = useSubscriptions();
  const { accent } = useTheme();
  const primaryColor = resolveAccentToHex(accent);

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  const rows = useMemo(() => {
    return ctx.invoices
      .filter((inv) => {
        if (inv.status === 'void') return false;
        const created = inv.created_at ? inv.created_at.split('T')[0] : '';
        return created >= dateFrom && created <= dateTo;
      })
      .map((inv) => {
        const customer = ctx.customers.find((c) => c.id === inv.customer_id || c.CustomerListID === inv.customer_id);
        const storedTotal = parseFloat(inv.total_amount) || 0;
        const storedTax = parseFloat(inv.tax_amount) || 0;
        let subtotal = +(storedTotal - storedTax).toFixed(2);
        if (!(subtotal > 0) && storedTotal > 0) subtotal = storedTotal;

        return buildTrackaboutQbInvoiceRow({
          invoiceNumber: inv.invoice_number,
          customerNumber: customer?.CustomerListID || customer?.id || inv.customer_id,
          subtotal,
          invoiceDate: inv.created_at ? inv.created_at.split('T')[0] : '',
          dueDate: inv.due_date || '',
          name: customer?.name || customer?.Name || inv.customer_id,
          purchaseOrder: customer?.purchase_order || '',
        });
      });
  }, [ctx.invoices, ctx.customers, dateFrom, dateTo]);

  const handleDownload = () => {
    if (rows.length === 0) return;
    const cols = TRACKABOUT_QB_EXPORT_COLUMNS;
    const csvRows = rows.map((r) => cols.map((c) => {
      const val = r[c];
      return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
    }).join(','));
    const csv = [cols.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quickbooks-export-${dateFrom}-to-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (ctx.loading) {
    return <Box sx={{ p: 4 }}><LinearProgress /></Box>;
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, minHeight: '100%' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>QuickBooks Export</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Trackabout-compatible CSV for Zed Axis (SSK tax + P.O.)
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<DownloadIcon />} onClick={handleDownload} disabled={rows.length === 0}
          sx={{ textTransform: 'none', borderRadius: 2, bgcolor: primaryColor, '&:hover': { bgcolor: primaryColor, opacity: 0.9 } }}>
          Download CSV ({rows.length} rows)
        </Button>
      </Stack>

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField size="small" label="From" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField size="small" label="To" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} InputLabelProps={{ shrink: true }} />
          <Typography variant="body2" color="text.secondary">{rows.length} invoice(s) in range</Typography>
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: 'text.secondary' } }}>
                {TRACKABOUT_QB_EXPORT_COLUMNS.map((col) => (
                  <TableCell key={col} align={col === 'Total' || col === 'TX' || col === 'Rate' ? 'right' : 'left'}>
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={TRACKABOUT_QB_EXPORT_COLUMNS.length} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No invoices in the selected date range.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r, i) => (
                  <TableRow key={i} hover>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{r['Invoice#']}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{r['Customer Number']}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>{formatCurrency(r.Total)}</TableCell>
                    <TableCell>{r.Date}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{Number(r.TX).toFixed(2)}</TableCell>
                    <TableCell>{r['TX code']}</TableCell>
                    <TableCell>{r['Due date']}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{r.Rate}</TableCell>
                    <TableCell>{r.Name}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{r['P.O.'] || '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
