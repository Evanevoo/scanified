import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  FileDownload as FileDownloadIcon,
} from '@mui/icons-material';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import {
  computeCustomerRentalHistory,
  firstDayOfMonth,
  lastDayOfMonth,
} from '../services/customerRentalHistory';

function previousMonthYm() {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function buildMonthOptions(count = 18) {
  const out = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 0; i < count; i++) {
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString(undefined, { month: 'long', year: 'numeric' });
    out.push({ value: ym, label });
    d.setMonth(d.getMonth() - 1);
  }
  return out;
}

function csvEscape(v) {
  if (v == null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function CustomerRentalHistory() {
  const { organization } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [bottles, setBottles] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [billingMonth, setBillingMonth] = useState(() => previousMonthYm());

  const monthOptions = useMemo(() => buildMonthOptions(24), []);

  const loadData = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [custRes, rentalRes, bottleRes] = await Promise.all([
        supabase
          .from('customers')
          .select('id, CustomerListID, name, Name')
          .eq('organization_id', organization.id),
        supabase
          .from('rentals')
          .select('*')
          .eq('organization_id', organization.id),
        supabase
          .from('bottles')
          .select('*')
          .eq('organization_id', organization.id),
      ]);
      if (custRes.error) throw custRes.error;
      if (rentalRes.error) throw rentalRes.error;
      if (bottleRes.error) throw bottleRes.error;

      const sortedCustomers = (custRes.data || [])
        .map((c) => ({ ...c, _displayName: c.name || c.Name || c.CustomerListID || c.id }))
        .sort((a, b) => String(a._displayName).localeCompare(String(b._displayName)));
      setCustomers(sortedCustomers);
      setRentals(rentalRes.data || []);
      setBottles(bottleRes.data || []);
    } catch (e) {
      setError(e.message || 'Failed to load rental history data');
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) || null,
    [customers, selectedCustomerId]
  );

  const periodStart = useMemo(() => firstDayOfMonth(billingMonth), [billingMonth]);
  const periodEnd = useMemo(() => lastDayOfMonth(billingMonth), [billingMonth]);

  const history = useMemo(() => {
    if (!selectedCustomer || !periodStart || !periodEnd) return [];
    return computeCustomerRentalHistory({
      rentals,
      bottles,
      customerRecord: selectedCustomer,
      allCustomers: customers,
      periodStart,
      periodEnd,
    });
  }, [selectedCustomer, customers, rentals, bottles, periodStart, periodEnd]);

  const totals = useMemo(() => {
    return history.reduce(
      (acc, row) => {
        acc.startCount += row.startCount;
        acc.ship += row.ship;
        acc.rtn += row.rtn;
        acc.endCount += row.endCount;
        return acc;
      },
      { startCount: 0, ship: 0, rtn: 0, endCount: 0 }
    );
  }, [history]);

  const handleExportCsv = useCallback(() => {
    if (!history.length || !selectedCustomer) return;
    const headers = ['Item', 'Start Count', 'Ship', 'Return', 'End Count', 'Rent Days'];
    const lines = [headers.join(',')];
    for (const row of history) {
      lines.push([
        csvEscape(row.productCode),
        row.startCount,
        row.ship,
        row.rtn,
        row.endCount,
        row.rentDays,
      ].join(','));
    }
    lines.push(['TOTAL', totals.startCount, totals.ship, totals.rtn, totals.endCount, ''].join(','));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = String(selectedCustomer._displayName || selectedCustomer.id).replace(/[^a-z0-9]+/gi, '_');
    a.href = url;
    a.download = `rental_history_${safeName}_${billingMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [history, totals, selectedCustomer, billingMonth]);

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 2.25 },
          mb: 2,
          borderRadius: 2.5,
          border: '1px solid rgba(15, 23, 42, 0.08)',
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} flexDirection={{ xs: 'column', md: 'row' }} gap={1.5}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em' }}>
              Customer Rental History
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Per-customer monthly snapshot of bottles on rent — start, ships, returns, and end counts by product code.
              Strict customer matching (by ID), no fuzzy name aliasing.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={handleExportCsv}
              disabled={!history.length}
              sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 700 }}
            >
              Export CSV
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadData}
              sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 700 }}
            >
              Refresh
            </Button>
          </Stack>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper elevation={0} sx={{ p: { xs: 1.75, md: 2 }, mb: 2, borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Autocomplete
              size="small"
              options={customers}
              getOptionLabel={(opt) => opt._displayName || ''}
              value={selectedCustomer}
              onChange={(_, val) => setSelectedCustomerId(val?.id || '')}
              renderInput={(params) => (
                <TextField {...params} label="Customer" placeholder="Search by name..." />
              )}
              isOptionEqualToValue={(a, b) => a.id === b.id}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="Billing month"
              value={billingMonth}
              onChange={(e) => setBillingMonth(e.target.value)}
            >
              {monthOptions.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: { xs: 'left', md: 'right' }, color: 'text.secondary' }}>
              <Typography variant="caption" display="block">Period</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {periodStart || '—'} → {periodEnd || '—'}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Paper elevation={0} sx={{ p: { xs: 1.5, md: 2 }, mb: 2, borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip label={`Start: ${totals.startCount}`} color="default" />
          <Chip label={`Ship: ${totals.ship}`} color="info" />
          <Chip label={`Return: ${totals.rtn}`} color="warning" />
          <Chip label={`End: ${totals.endCount}`} color="success" />
          <Chip label={`Net change: ${totals.endCount - totals.startCount >= 0 ? '+' : ''}${totals.endCount - totals.startCount}`} variant="outlined" />
        </Stack>
        <Divider sx={{ my: 1.5 }} />
        <Typography variant="caption" color="text.secondary">
          Sanity check: <code>End = Start + Ship − Return</code> for each row.
        </Typography>
      </Paper>

      <TableContainer sx={{ borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Item / Product code</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Start count</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Ship</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Return</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>End count</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Rent days (avg)</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Reconcile</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Box display="flex" justifyContent="center" py={4}>
                    <CircularProgress size={26} />
                  </Box>
                </TableCell>
              </TableRow>
            ) : !selectedCustomer ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Box py={4} textAlign="center" color="text.secondary">
                    Select a customer to view their rental history.
                  </Box>
                </TableCell>
              </TableRow>
            ) : history.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Box py={4} textAlign="center" color="text.secondary">
                    No rental activity for this customer in {billingMonth}.
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              history.map((row) => {
                const expectedEnd = row.startCount + row.ship - row.rtn;
                const matches = expectedEnd === row.endCount;
                return (
                  <TableRow key={row.productCode} hover>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{row.productCode}</TableCell>
                    <TableCell align="right">{row.startCount}</TableCell>
                    <TableCell align="right" sx={{ color: row.ship > 0 ? 'info.main' : 'text.secondary' }}>{row.ship}</TableCell>
                    <TableCell align="right" sx={{ color: row.rtn > 0 ? 'warning.main' : 'text.secondary' }}>{row.rtn}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>{row.endCount}</TableCell>
                    <TableCell align="right">{row.rentDays}</TableCell>
                    <TableCell align="right">
                      {matches ? (
                        <Chip size="small" label="✓" color="success" sx={{ height: 20 }} />
                      ) : (
                        <Chip
                          size="small"
                          label={`expected ${expectedEnd}`}
                          color="warning"
                          sx={{ height: 20 }}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
            {history.length > 0 && (
              <TableRow sx={{ background: 'rgba(15, 23, 42, 0.04)' }}>
                <TableCell sx={{ fontWeight: 700 }}>TOTAL</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>{totals.startCount}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>{totals.ship}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>{totals.rtn}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>{totals.endCount}</TableCell>
                <TableCell align="right">—</TableCell>
                <TableCell align="right">—</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

