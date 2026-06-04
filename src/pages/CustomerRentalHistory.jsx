import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Autocomplete,
  Box,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  Grid,
  IconButton,
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
  Tooltip,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { IoRefreshOutline, IoDownloadOutline } from 'react-icons/io5';
import GradientMenu from '../components/ui/gradient-menu';
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
  const customerFilterOptions = useCallback((options, { inputValue }) => {
    const query = String(inputValue || '').trim().toLowerCase();
    if (!query) return options;
    return options.filter((customer) => {
      const name = String(customer?._displayName || '').toLowerCase();
      const rawName = String(customer?.name || customer?.Name || '').toLowerCase();
      const listId = String(customer?.CustomerListID || '').toLowerCase();
      const id = String(customer?.id || '').toLowerCase();
      return (
        name.includes(query) ||
        rawName.includes(query) ||
        listId.includes(query) ||
        id.includes(query)
      );
    });
  }, []);

  const loadData = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [custRes, rentalRes, bottleRes] = await Promise.all([
        supabase
          .from('customers')
          .select('id, CustomerListID, name')
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

  useEffect(() => {
    setReturnDetailOpen({});
  }, [selectedCustomerId, billingMonth]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) || null,
    [customers, selectedCustomerId]
  );

  const periodStart = useMemo(() => firstDayOfMonth(billingMonth), [billingMonth]);
  const periodEnd = useMemo(() => lastDayOfMonth(billingMonth), [billingMonth]);

  const { rows: history, returnsByProductCode } = useMemo(() => {
    if (!selectedCustomer || !periodStart || !periodEnd) {
      return { rows: [], returnsByProductCode: {} };
    }
    return computeCustomerRentalHistory({
      rentals,
      bottles,
      customerRecord: selectedCustomer,
      allCustomers: customers,
      periodStart,
      periodEnd,
    });
  }, [selectedCustomer, customers, rentals, bottles, periodStart, periodEnd]);

  const [returnDetailOpen, setReturnDetailOpen] = useState({});

  const toggleReturnDetails = useCallback((productCode) => {
    setReturnDetailOpen((prev) => {
      const shown = prev[productCode] !== false;
      return { ...prev, [productCode]: !shown };
    });
  }, []);

  const returnsDetailOpen = useCallback(
    (productCode, rtn) => {
      if (rtn <= 0) return false;
      return returnDetailOpen[productCode] !== false;
    },
    [returnDetailOpen]
  );

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

  const handleExportReturnsCsv = useCallback(() => {
    if (!selectedCustomer) return;
    const entries = Object.entries(returnsByProductCode || {}).filter(([, items]) => items?.length);
    if (entries.length === 0) return;
    const headers = ['product_code', 'rental_end_date', 'bottle_barcode', 'serial_number', 'bottle_id', 'rental_id'];
    const lines = [headers.join(',')];
    for (const [code, items] of entries) {
      for (const d of items) {
        lines.push(
          [
            csvEscape(code),
            csvEscape(d.rentalEndDate),
            csvEscape(d.bottleBarcode),
            csvEscape(d.serialNumber || ''),
            csvEscape(d.bottleId),
            csvEscape(d.rentalId),
          ].join(',')
        );
      }
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = String(selectedCustomer._displayName || selectedCustomer.id).replace(/[^a-z0-9]+/gi, '_');
    a.href = url;
    a.download = `rental_returns_detail_${safeName}_${billingMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [returnsByProductCode, selectedCustomer, billingMonth]);

  const hasReturnLineItems = useMemo(
    () => Object.values(returnsByProductCode || {}).some((items) => items?.length),
    [returnsByProductCode]
  );

  const toolbarItems = useMemo(
    () => [
      {
        id: 'export-csv',
        title: 'Export CSV',
        action: 'export-csv',
        icon: <IoDownloadOutline />,
        gradientFrom: '#56CCF2',
        gradientTo: '#2F80ED',
        disabled: !history.length,
      },
      {
        id: 'export-returns-csv',
        title: 'Export returns (barcodes)',
        action: 'export-returns-csv',
        icon: <IoDownloadOutline />,
        gradientFrom: '#F59E0B',
        gradientTo: '#D97706',
        disabled: !hasReturnLineItems,
      },
      {
        id: 'refresh',
        title: 'Refresh',
        action: 'refresh',
        icon: <IoRefreshOutline />,
        gradientFrom: '#a955ff',
        gradientTo: '#ea51ff',
      },
    ],
    [history.length, hasReturnLineItems]
  );

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
          <Box sx={{ minWidth: { xs: '100%', md: 220 }, maxWidth: '100%' }}>
            <GradientMenu
              variant="compact"
              items={toolbarItems}
              className="min-h-0 w-full justify-center md:justify-end py-2 bg-slate-100 rounded-xl border border-slate-200/90 shadow-sm"
              onAction={(action) => {
                if (action === 'export-csv') handleExportCsv();
                if (action === 'export-returns-csv') handleExportReturnsCsv();
                if (action === 'refresh') loadData();
              }}
            />
          </Box>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper elevation={0} sx={{ p: { xs: 1.75, md: 2 }, mb: 2, borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Autocomplete
              size="small"
              options={customers}
              filterOptions={customerFilterOptions}
              getOptionLabel={(opt) => opt._displayName || ''}
              value={selectedCustomer}
              onChange={(_, val) => setSelectedCustomerId(val?.id || '')}
              noOptionsText="No customers match your search"
              renderInput={(params) => (
                <TextField {...params} label="Customer" placeholder="Search by name, customer ID, or list ID..." />
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
        <Typography variant="caption" color="text.secondary" component="div">
          Sanity check: <code>End = Start + Ship − Return</code> for each row.
          {' '}
          Expand a row with Return &gt; 0 to see which rental closed (barcode / end date), or use <strong>Export returns (barcodes)</strong>.
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
                const returnItems = returnsByProductCode[row.productCode] || [];
                const showReturnBreakdown = row.rtn > 0 && returnItems.length > 0;
                const expanded = returnsDetailOpen(row.productCode, row.rtn);
                return (
                  <React.Fragment key={row.productCode}>
                    <TableRow hover>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{row.productCode}</TableCell>
                      <TableCell align="right">{row.startCount}</TableCell>
                      <TableCell align="right" sx={{ color: row.ship > 0 ? 'info.main' : 'text.secondary' }}>{row.ship}</TableCell>
                      <TableCell align="right" sx={{ color: row.rtn > 0 ? 'warning.main' : 'text.secondary' }}>
                        <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={0.5}>
                          <span>{row.rtn}</span>
                          {showReturnBreakdown && (
                            <Tooltip title={expanded ? 'Hide return details' : 'Show return details'}>
                              <IconButton
                                size="small"
                                aria-expanded={expanded}
                                aria-label={expanded ? 'Hide return details' : 'Show return details'}
                                onClick={() => toggleReturnDetails(row.productCode)}
                                sx={{ p: 0.25 }}
                              >
                                <ExpandMoreIcon
                                  sx={{
                                    transform: expanded ? 'rotate(180deg)' : 'none',
                                    transition: 'transform 0.2s',
                                  }}
                                />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
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
                    {showReturnBreakdown && (
                      <TableRow>
                        <TableCell colSpan={7} sx={{ py: 0, borderBottom: expanded ? undefined : 'none' }}>
                          <Collapse in={expanded} timeout="auto" unmountOnExit>
                            <Box sx={{ py: 1.5, px: { xs: 0.5, sm: 1 } }}>
                              <Typography variant="subtitle2" color="warning.dark" gutterBottom sx={{ fontWeight: 700 }}>
                                Returned in this period ({returnItems.length})
                              </Typography>
                              <TableContainer sx={{ maxWidth: 720 }}>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell sx={{ fontWeight: 700 }}>Rental end</TableCell>
                                      <TableCell sx={{ fontWeight: 700 }}>Barcode</TableCell>
                                      <TableCell sx={{ fontWeight: 700 }}>Serial</TableCell>
                                      <TableCell sx={{ fontWeight: 700 }} align="right">
                                        Bottle
                                      </TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {returnItems.map((d, idx) => (
                                      <TableRow key={`${row.productCode}-${d.rentalId ?? idx}-${d.rentalEndDate}`}>
                                        <TableCell>{d.rentalEndDate || '—'}</TableCell>
                                        <TableCell sx={{ fontFamily: 'monospace' }}>
                                          {d.bottleBarcode || (
                                            <Typography component="span" variant="body2" color="text.secondary">
                                              —
                                            </Typography>
                                          )}
                                        </TableCell>
                                        <TableCell sx={{ fontFamily: 'monospace' }}>
                                          {d.serialNumber || '—'}
                                        </TableCell>
                                        <TableCell align="right">
                                          {d.bottleId ? (
                                            <Chip
                                              size="small"
                                              component={RouterLink}
                                              to={`/bottle/${encodeURIComponent(d.bottleId)}`}
                                              clickable
                                              label="Bottle"
                                              variant="outlined"
                                              color="primary"
                                            />
                                          ) : d.bottleBarcode ? (
                                            <Chip
                                              size="small"
                                              component={RouterLink}
                                              to={`/assets/${encodeURIComponent(d.bottleBarcode)}/history`}
                                              clickable
                                              label="History"
                                              variant="outlined"
                                              color="secondary"
                                            />
                                          ) : (
                                            <Typography variant="caption" color="text.secondary">
                                              —
                                            </Typography>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
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

