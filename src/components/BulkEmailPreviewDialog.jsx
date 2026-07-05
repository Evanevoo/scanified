import React, { useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  Alert,
  Box,
} from '@mui/material';

/**
 * @typedef {object} BulkEmailPreviewItem
 * @property {string} customerName
 * @property {string|null} email
 * @property {string} invoiceNumber
 * @property {number} itemCount
 * @property {number} totalPerCycle
 * @property {boolean} willSend
 * @property {string} [skipReason]
 */

function BulkEmailPreviewDialog({
  open,
  onClose,
  onConfirm,
  loading,
  sending,
  items = [],
  billingMonthLabel,
  termsLabel,
  searchActive,
  primaryColor,
}) {
  const summary = useMemo(() => {
    const sendable = items.filter((i) => i.willSend);
    const skipped = items.filter((i) => !i.willSend);
    const totalAmount = sendable.reduce((s, i) => s + (Number(i.totalPerCycle) || 0), 0);
    const totalUnits = sendable.reduce((s, i) => s + (Number(i.itemCount) || 0), 0);
    return { sendable, skipped, totalAmount, totalUnits };
  }, [items]);

  const formatMoney = (n) =>
    (Number(n) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  return (
    <Dialog open={open} onClose={sending ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        Review bulk invoice email
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Alert severity="info" sx={{ '& .MuiAlert-message': { width: '100%' } }}>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              These are the same monthly rental rows as <strong>Export CSV</strong> and the monthly{' '}
              <strong>ZIP</strong> PDFs — billing month, payment-terms filter, and invoice numbers match.
              After you confirm, sending continues in the background if you leave this page.
            </Typography>
            <Typography variant="caption" color="text.secondary" component="div">
              Billing month: {billingMonthLabel}
              {' · '}
              Terms: {termsLabel}
              {searchActive ? ' · Search filter applied (visible rows only)' : ''}
            </Typography>
          </Alert>

          {loading ? (
            <Box sx={{ py: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Loading customers, invoice numbers, and email addresses…
              </Typography>
              <LinearProgress sx={{ borderRadius: 1 }} />
            </Box>
          ) : (
            <>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                <Chip
                  size="small"
                  color="success"
                  variant="outlined"
                  label={`${summary.sendable.length} to send`}
                />
                {summary.skipped.length > 0 && (
                  <Chip
                    size="small"
                    color="warning"
                    variant="outlined"
                    label={`${summary.skipped.length} skipped (no email)`}
                  />
                )}
                <Chip
                  size="small"
                  variant="outlined"
                  label={`${summary.totalUnits} units · ${formatMoney(summary.totalAmount)}`}
                />
              </Stack>

              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 360 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Customer</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Invoice #</TableCell>
                      <TableCell align="right">Items</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                          No invoiceable rows for the current filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item, idx) => (
                        <TableRow
                          key={`${item.invoiceNumber}-${item.customerName}-${idx}`}
                          sx={{ opacity: item.willSend ? 1 : 0.72 }}
                        >
                          <TableCell>{item.customerName}</TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {item.email || '—'}
                          </TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {item.invoiceNumber}
                          </TableCell>
                          <TableCell align="right">{item.itemCount}</TableCell>
                          <TableCell align="right" sx={{ fontFamily: 'monospace' }}>
                            {formatMoney(item.totalPerCycle)}
                          </TableCell>
                          <TableCell>
                            {item.willSend ? (
                              <Chip size="small" label="Ready" color="success" variant="outlined" />
                            ) : (
                              <Chip
                                size="small"
                                label={item.skipReason || 'Skipped'}
                                color="warning"
                                variant="outlined"
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={sending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={loading || sending || summary.sendable.length === 0}
          sx={{ bgcolor: primaryColor, '&:hover': { bgcolor: primaryColor, opacity: 0.9 } }}
        >
          {sending
            ? 'Sending…'
            : `Send ${summary.sendable.length} invoice${summary.sendable.length === 1 ? '' : 's'}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default BulkEmailPreviewDialog;
