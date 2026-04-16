import logger from '../utils/logger';
import React, { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import { formatLocationDisplay } from '../utils/locationDisplay';
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
  CircularProgress,
  Alert,
  Stack,
  Chip,
  TextField,
  Button,
  Card,
  CardContent,
  Grid,
  Link,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  MenuItem,
  Menu,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { Inventory2 as InventoryIcon, ExpandMore as ExpandMoreIcon, ViewColumn as ViewColumnIcon } from '@mui/icons-material';

function friendlyLoadError(message) {
  const m = (message || '').toLowerCase();
  if (!message) return 'Could not load bottle locations.';
  if (m.includes('network') || m.includes('failed to fetch') || m.includes('load failed')) {
    return `${message} Check your connection, then retry.`;
  }
  return message;
}

function customerSortKey(row) {
  if (row.kind === 'in_house') return '\u0000';
  return (row.name || '').toLowerCase();
}

export default function BottleLocations() {
  const { organization, loading: authLoading } = useAuth();
  const [bottles, setBottles] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [rnbRentals, setRnbRentals] = useState([]);
  const [appLocationsCount, setAppLocationsCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('overview');
  const [loadKey, setLoadKey] = useState(0);
  const [placeView, setPlaceView] = useState('all');
  const [viewPrefsHydrated, setViewPrefsHydrated] = useState(false);
  const [columnMenuAnchor, setColumnMenuAnchor] = useState(null);
  const [columns, setColumns] = useState({
    place: true,
    bottles: true,
    detail: true,
    goTo: true,
  });

  useEffect(() => {
    if (!organization?.id) return;
    setViewPrefsHydrated(false);
  }, [organization?.id]);

  useEffect(() => {
    if (!organization?.id) return;
    const key = `bottle-locations-views-v1:${organization.id}`;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const p = JSON.parse(raw);
        if (p.placeView && ['all', 'customers', 'inhouse'].includes(p.placeView)) setPlaceView(p.placeView);
        if (p.columns && typeof p.columns === 'object') {
          setColumns((c) => ({ ...c, ...p.columns }));
        }
      }
    } catch {
      /* ignore */
    }
    setViewPrefsHydrated(true);
  }, [organization?.id]);

  useEffect(() => {
    if (!viewPrefsHydrated || !organization?.id) return;
    const key = `bottle-locations-views-v1:${organization.id}`;
    try {
      localStorage.setItem(key, JSON.stringify({ placeView, columns }));
    } catch {
      /* ignore */
    }
  }, [placeView, columns, viewPrefsHydrated, organization?.id]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!organization?.id) {
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const [bRes, cRes, rRes, locRes] = await Promise.all([
          supabase
            .from('bottles')
            .select('*')
            .eq('organization_id', organization.id)
            .order('barcode_number'),
          supabase
            .from('customers')
            .select('CustomerListID, name')
            .eq('organization_id', organization.id),
          supabase
            .from('rentals')
            .select('id, customer_id, bottle_barcode, dns_product_code, dns_description, location, created_at')
            .eq('organization_id', organization.id)
            .eq('is_dns', true)
            .is('rental_end_date', null)
            .ilike('dns_description', '%Return not on balance%')
            .order('customer_id'),
          supabase
            .from('locations')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', organization.id),
        ]);

        if (bRes.error) throw bRes.error;
        if (cRes.error) throw cRes.error;
        if (rRes.error) throw rRes.error;

        if (!cancelled) {
          setBottles(bRes.data || []);
          setCustomers(cRes.data || []);
          setRnbRentals(rRes.data || []);
          if (locRes.error) {
            logger.warn('BottleLocations: locations count failed', locRes.error);
            setAppLocationsCount(null);
          } else {
            setAppLocationsCount(typeof locRes.count === 'number' ? locRes.count : 0);
          }
        }
      } catch (e) {
        logger.error('BottleLocations load error:', e);
        if (!cancelled) setError(e?.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [organization?.id, loadKey]);

  useEffect(() => {
    if (authLoading) return;
    if (!organization?.id) {
      setLoading(false);
    }
  }, [authLoading, organization?.id]);

  const customerNameByListId = useMemo(() => {
    const m = new Map();
    (customers || []).forEach((c) => {
      if (c?.CustomerListID) m.set(c.CustomerListID, c.name || c.CustomerListID);
    });
    return m;
  }, [customers]);

  const { physicalTotal, placeRows, inHouseByLocation, withCustomerCount, inHouseCount } = useMemo(() => {
    const list = bottles || [];
    const physical = list.length;
    const inHouse = [];
    const byCustomer = new Map();

    list.forEach((b) => {
      const cid = b.assigned_customer || b.customer_id;
      if (!cid) {
        inHouse.push(b);
        return;
      }
      if (!byCustomer.has(cid)) {
        byCustomer.set(cid, []);
      }
      byCustomer.get(cid).push(b);
    });

    const locCounts = {};
    inHouse.forEach((b) => {
      const raw = b.location != null && String(b.location).trim() ? b.location : '';
      const label = raw ? formatLocationDisplay(raw) : 'Unspecified';
      locCounts[label] = (locCounts[label] || 0) + 1;
    });
    const inHouseByLocationSorted = Object.entries(locCounts).sort((a, b) => b[1] - a[1]);

    const rows = [];
    rows.push({
      kind: 'in_house',
      id: 'IN_HOUSE',
      name: 'In-house / warehouse',
      count: inHouse.length,
      detail: inHouseByLocationSorted.length
        ? `${inHouseByLocationSorted.length} distinct bottle location value${inHouseByLocationSorted.length === 1 ? '' : 's'}`
        : '—',
    });

    byCustomer.forEach((bl, customerListId) => {
      const name = customerNameByListId.get(customerListId) || `Unknown (${customerListId})`;
      rows.push({
        kind: 'customer',
        id: customerListId,
        name,
        count: bl.length,
        detail: 'Customer site',
      });
    });

    rows.sort((a, b) => {
      if (a.kind === 'in_house') return -1;
      if (b.kind === 'in_house') return 1;
      return b.count - a.count || customerSortKey(a).localeCompare(customerSortKey(b));
    });

    return {
      physicalTotal: physical,
      placeRows: rows,
      inHouseByLocation: inHouseByLocationSorted,
      withCustomerCount: list.filter((b) => b.assigned_customer || b.customer_id).length,
      inHouseCount: inHouse.length,
    };
  }, [bottles, customerNameByListId]);

  const filteredPlaceRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return placeRows;
    return placeRows.filter(
      (r) =>
        (r.name && r.name.toLowerCase().includes(q)) ||
        String(r.id).toLowerCase().includes(q) ||
        (r.kind === 'in_house' && 'in-house warehouse'.includes(q))
    );
  }, [placeRows, search]);

  const viewFilteredPlaceRows = useMemo(() => {
    if (placeView === 'customers') return filteredPlaceRows.filter((r) => r.kind === 'customer');
    if (placeView === 'inhouse') return filteredPlaceRows.filter((r) => r.kind === 'in_house');
    return filteredPlaceRows;
  }, [filteredPlaceRows, placeView]);

  const rnbWithNames = useMemo(() => {
    return (rnbRentals || []).map((r) => ({
      ...r,
      customerName: r.customer_id ? customerNameByListId.get(r.customer_id) || r.customer_id : '—',
    }));
  }, [rnbRentals, customerNameByListId]);

  const rnbDistinctCustomerCount = useMemo(() => {
    const ids = new Set((rnbRentals || []).map((r) => r.customer_id).filter(Boolean));
    return ids.size;
  }, [rnbRentals]);

  const effectiveColumns = useMemo(() => {
    const hasAny = columns.place || columns.bottles || columns.detail || columns.goTo;
    if (hasAny) return columns;
    return { place: true, bottles: true, detail: true, goTo: true };
  }, [columns]);

  if (authLoading || loading) {
    return (
      <Box sx={{ minHeight: '100%', bgcolor: 'transparent', py: 2 }}>
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            p: { xs: 2, md: 3 },
            borderRadius: 3,
            border: '1px solid rgba(15, 23, 42, 0.08)',
            bgcolor: '#fcfcfb',
          }}
        >
          <Box p={4} textAlign="center">
            <CircularProgress />
          </Box>
        </Paper>
      </Box>
    );
  }

  if (!organization?.id) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">No organization found. Sign in and select an organization to view bottle locations.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100%', bgcolor: 'transparent', py: 2, borderRadius: 0, overflow: 'visible' }}>
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          p: { xs: 2, md: 3 },
          borderRadius: 3,
          boxShadow: 'none',
          border: '1px solid rgba(15, 23, 42, 0.08)',
          bgcolor: '#fcfcfb',
          overflow: 'visible',
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 3 },
            mb: 3,
            borderRadius: 3,
            border: '1px solid rgba(15, 23, 42, 0.08)',
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.25, flexWrap: 'wrap' }}>
                <Chip label="Inventory" color="primary" size="small" sx={{ borderRadius: 999, fontWeight: 700 }} />
                <Chip label={organization?.name || 'Organization'} size="small" variant="outlined" sx={{ borderRadius: 999 }} />
              </Stack>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em' }}>
                Where bottles are
              </Typography>
              <Typography variant="body2" sx={{ color: '#475569', mt: 0.5, maxWidth: 720, fontWeight: 500 }}>
                Where cylinders are right now — by warehouse row or customer site (not the same as your Locations list).
              </Typography>
              <Typography variant="body1" sx={{ color: '#64748b', mt: 1, maxWidth: 720 }}>
                Roll-up of physical inventory. Use the tabs below; RNB (Return not on balance) billing exceptions have their own tab.
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <Button component={RouterLink} to="/assets" variant="outlined" sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}>
                Back to bottle inventory
              </Button>
              <Button component={RouterLink} to="/customers" variant="text" sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 600 }}>
                Customer list
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {error && (
          <Alert
            severity="error"
            sx={{ mb: 3 }}
            action={
              <Button color="inherit" size="small" onClick={() => { setError(null); setLoadKey((k) => k + 1); }} sx={{ fontWeight: 700 }}>
                Retry
              </Button>
            }
          >
            <Typography variant="body2">{friendlyLoadError(error)}</Typography>
            <Typography variant="caption" color="inherit" sx={{ display: 'block', mt: 0.75, opacity: 0.95 }}>
              If this keeps happening, check your connection or try again in a minute.
            </Typography>
          </Alert>
        )}

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            mb: 2,
            minHeight: 44,
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 44 },
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Tab label="Overview" value="overview" />
          <Tab label="By place" value="by-place" />
          <Tab label="In-house" value="in-house" />
          <Tab label="RNB" value="rnb" />
        </Tabs>

        {tab === 'overview' && (
          <>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              {[
                {
                  label: 'Physical bottles',
                  value: physicalTotal,
                  helper: 'Tracked cylinder records',
                },
                {
                  label: 'In-house',
                  value: inHouseCount,
                  helper: 'Not assigned to a customer',
                },
                {
                  label: 'With customers',
                  value: withCustomerCount,
                  helper: 'Assigned to a customer',
                },
                {
                  label: 'RNB (not in physical total)',
                  value: rnbRentals.length,
                  helper: 'Return not on balance — exception only',
                },
              ].map((m) => (
                <Grid item xs={12} sm={6} lg={3} key={m.label}>
                  <Card elevation={0} sx={{ borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)', height: '100%' }}>
                    <CardContent sx={{ p: 2.25 }}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        {m.label}
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f172a', mt: 0.5, letterSpacing: '-0.03em' }}>
                        {m.value}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#64748b', mt: 0.75 }}>
                        {m.helper}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Accordion
              disableGutters
              elevation={0}
              sx={{
                mb: 2,
                border: '1px solid rgba(15, 23, 42, 0.08)',
                borderRadius: '12px !important',
                '&:before': { display: 'none' },
                overflow: 'hidden',
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2, py: 1 }}>
                <Typography sx={{ fontWeight: 700, color: '#0f172a' }}>Understanding the numbers</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0, px: 2, pb: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Physical bottles are rows in your inventory. They are either in-house (no customer assignment) or assigned to a customer. RNB (Return not on balance) rows are billing exceptions and are not part of the physical total—open the <strong>RNB</strong> tab for detail and resolution steps.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {typeof appLocationsCount === 'number' && (
                    <>
                      You have <strong>{appLocationsCount}</strong> location record{appLocationsCount === 1 ? '' : 's'} in the app’s{' '}
                      <Link component={RouterLink} to="/locations" underline="hover" sx={{ fontWeight: 600 }}>
                        Locations
                      </Link>{' '}
                      list (branches / warehouses you maintain). That is separate from the <strong>location</strong> text stored on individual in-house bottles. The <strong>Detail</strong> column on the By place tab for <strong>In-house / warehouse</strong> shows how many distinct values appear on that field (including “Unspecified” when a bottle has no location set).
                    </>
                  )}
                  {typeof appLocationsCount !== 'number' && (
                    <>
                      The <strong>Locations</strong> page lists branches and warehouses you maintain. That is separate from the <strong>location</strong> text on individual in-house bottles. See the <strong>By place</strong> tab for the roll-up.
                    </>
                  )}
                </Typography>
              </AccordionDetails>
            </Accordion>

            {physicalTotal === 0 && (
              <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  No bottles in inventory yet. Import data or add cylinders to see them here.
                </Typography>
                <Button component={RouterLink} to="/assets" size="small" variant="outlined" sx={{ textTransform: 'none', fontWeight: 600 }}>
                  Open Assets
                </Button>
              </Alert>
            )}
          </>
        )}

        {tab === 'by-place' && (
          <>
            <Box
              sx={{
                position: 'sticky',
                top: 0,
                zIndex: 4,
                bgcolor: '#fcfcfb',
                pt: 0.5,
                pb: 2,
                mb: 1,
                borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
              }}
            >
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} flexWrap="wrap" useFlexGap>
                <TextField
                  size="small"
                  placeholder="Filter by place or customer"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  inputProps={{ 'aria-label': 'Filter by place or customer' }}
                  sx={{ minWidth: 220, flex: { md: '1 1 0' } }}
                />
                <TextField
                  select
                  size="small"
                  value={placeView}
                  onChange={(e) => setPlaceView(e.target.value)}
                  inputProps={{ 'aria-label': 'Saved view' }}
                  sx={{ minWidth: 200 }}
                >
                  <MenuItem value="all">All places</MenuItem>
                  <MenuItem value="customers">Customer sites only</MenuItem>
                  <MenuItem value="inhouse">In-house / warehouse only</MenuItem>
                </TextField>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ViewColumnIcon />}
                  onClick={(e) => setColumnMenuAnchor(e.currentTarget)}
                  sx={{ textTransform: 'none', fontWeight: 600 }}>
                  Columns
                </Button>
                <Menu anchorEl={columnMenuAnchor} open={Boolean(columnMenuAnchor)} onClose={() => setColumnMenuAnchor(null)}>
                  {[
                    { key: 'place', label: 'Place' },
                    { key: 'bottles', label: 'Bottles count' },
                    { key: 'detail', label: 'Detail' },
                    { key: 'goTo', label: 'Go to' },
                  ].map((c) => (
                    <MenuItem key={c.key} disableRipple onClick={(e) => e.stopPropagation()} sx={{ py: 0 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={!!columns[c.key]}
                            onChange={() => setColumns((prev) => ({ ...prev, [c.key]: !prev[c.key] }))}
                          />
                        }
                        label={c.label}
                      />
                    </MenuItem>
                  ))}
                </Menu>
              </Stack>
            </Box>

            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#0f172a' }}>
              Physical bottles by place
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 920 }}>
              Customer rows link to the customer page. In-house rows combine all bottles not assigned to a customer. Use a saved view to focus the table.
            </Typography>
            <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.08)', boxShadow: 'none', mb: 2 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                      {effectiveColumns.place && <TableCell sx={{ fontWeight: 700 }}>Place</TableCell>}
                      {effectiveColumns.bottles && (
                        <TableCell sx={{ fontWeight: 700 }} align="right">
                          Bottles
                        </TableCell>
                      )}
                      {effectiveColumns.detail && <TableCell sx={{ fontWeight: 700 }}>Detail</TableCell>}
                      {effectiveColumns.goTo && (
                        <TableCell sx={{ fontWeight: 700 }} align="right">
                          Go to
                        </TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {viewFilteredPlaceRows.map((row) => (
                      <TableRow key={row.id} hover sx={{ '&:hover': { backgroundColor: '#fcfcfd' } }}>
                        {effectiveColumns.place && (
                          <TableCell>
                            <Stack direction="row" spacing={1} alignItems="center">
                              {row.kind === 'in_house' ? (
                                <InventoryIcon fontSize="small" color="action" />
                              ) : null}
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {row.name}
                                </Typography>
                                {row.kind === 'customer' && (
                                  <Typography variant="caption" color="text.secondary">
                                    {row.id}
                                  </Typography>
                                )}
                              </Box>
                            </Stack>
                          </TableCell>
                        )}
                        {effectiveColumns.bottles && (
                          <TableCell align="right">
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {row.count}
                            </Typography>
                          </TableCell>
                        )}
                        {effectiveColumns.detail && (
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {row.detail}
                            </Typography>
                          </TableCell>
                        )}
                        {effectiveColumns.goTo && (
                          <TableCell align="right">
                            {row.kind === 'customer' ? (
                              <Button component={RouterLink} to={`/customer/${encodeURIComponent(row.id)}`} size="small" sx={{ textTransform: 'none', fontWeight: 600 }}>
                                Customer
                              </Button>
                            ) : (
                              <Typography variant="caption" color="text.secondary">
                                —
                              </Typography>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {viewFilteredPlaceRows.length === 0 && (
                <Box p={3} textAlign="center">
                  <Typography color="text.secondary" sx={{ mb: 1 }}>
                    No rows match your filter or saved view.
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Try clearing the filter, switching to “All places”, or check spelling.
                  </Typography>
                </Box>
              )}
            </Paper>
          </>
        )}

        {tab === 'in-house' && (
          <>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: '#0f172a' }}>
              In-house breakdown by location field
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Uses each bottle’s <strong>location</strong> when it is not assigned to a customer.
            </Typography>
            {inHouseByLocation.length > 0 ? (
              <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.08)', boxShadow: 'none', mb: 2 }}>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                        <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="right">
                          Bottles
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {inHouseByLocation.map(([loc, n]) => (
                        <TableRow key={loc}>
                          <TableCell>{loc}</TableCell>
                          <TableCell align="right">{n}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            ) : (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                No in-house bottles with a location breakdown, or none in inventory yet. Try <strong>By place</strong> for the full roll-up.
              </Alert>
            )}
          </>
        )}

        {tab === 'rnb' && (
          <>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#0f172a' }}>
              RNB — Return not on balance
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              These open DNS rentals are flagged “Return not on balance.” They explain the RNB count shown next to your physical total on the Assets page; they are not additional physical bottles.
            </Typography>
            {rnbWithNames.length > 0 && (
              <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Which customer?
                </Typography>
                <Typography variant="body2" sx={{ mb: 1.5 }}>
                  The table lists <strong>every open RNB line</strong> ({rnbWithNames.length} row{rnbWithNames.length === 1 ? '' : 's'}
                  {rnbDistinctCustomerCount > 0
                    ? ` across ${rnbDistinctCustomerCount} customer${rnbDistinctCustomerCount === 1 ? '' : 's'}`
                    : ''}
                  ). The <strong>Customer</strong> column is who the exception is tied to. Use <strong>Open customer</strong> to go to their page.
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75 }}>
                  How to fix (remove from RNB count)
                </Typography>
                <Typography variant="body2" component="div">
                  <Box component="ol" sx={{ m: 0, pl: 2.25, '& li': { mb: 0.5 } }}>
                    <li>Click <strong>Open customer</strong> for that row.</li>
                    <li>
                      On the customer page, select the <strong>Rental</strong> tab (next to Customer Info).
                    </li>
                    <li>
                      Find the rental row with the red <strong>RNB (Return not on balance)</strong> chip and click <strong>Resolve</strong>. That closes the rental so it no longer counts as RNB.
                    </li>
                  </Box>
                </Typography>
              </Alert>
            )}
            <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.08)', boxShadow: 'none' }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#fff5f5' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Barcode</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Rental location</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">
                        Open customer
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rnbWithNames.map((r) => (
                      <TableRow key={r.id} sx={{ bgcolor: '#fffafa' }}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {r.customerName}
                          </Typography>
                        </TableCell>
                        <TableCell>{r.bottle_barcode || '—'}</TableCell>
                        <TableCell>{r.dns_product_code || '—'}</TableCell>
                        <TableCell>{r.location ? formatLocationDisplay(r.location) : '—'}</TableCell>
                        <TableCell align="right">
                          {r.customer_id ? (
                            <Button component={RouterLink} to={`/customer/${encodeURIComponent(r.customer_id)}`} size="small" sx={{ textTransform: 'none', fontWeight: 600 }}>
                              Open customer
                            </Button>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {rnbWithNames.length === 0 && (
                <Box p={3} textAlign="center">
                  <Typography color="text.secondary">No open RNB rentals.</Typography>
                </Box>
              )}
            </Paper>
          </>
        )}
      </Paper>
    </Box>
  );
}
