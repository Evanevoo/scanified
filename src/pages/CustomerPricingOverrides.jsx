import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSubscriptions } from '../context/SubscriptionContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../supabase/client';
import { formatCurrency } from '../utils/subscriptionUtils';
import {
  Box, Typography, Paper, Stack, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, LinearProgress,
  InputAdornment, Chip, FormControl, InputLabel, Select, MenuItem, Autocomplete,
  Checkbox,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Refresh as RefreshIcon, Search as SearchIcon,
} from '@mui/icons-material';

export default function CustomerPricingOverrides() {
  const { organization } = useAuth();
  const location = useLocation();
  const ctx = useSubscriptions();
  const { organizationColors } = useTheme();
  const primaryColor = organizationColors?.primary || '#40B5AD';

  const [search, setSearch] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkCustomers, setBulkCustomers] = useState([]);
  const [bulkValues, setBulkValues] = useState({ discount_percent: '', fixed_rate_override: '' });
  const [fallbackCustomers, setFallbackCustomers] = useState([]);
  const [fallbackProductCodes, setFallbackProductCodes] = useState([]);
  const [fallbackBottleCustomers, setFallbackBottleCustomers] = useState([]);
  const [fallbackRentalCustomers, setFallbackRentalCustomers] = useState([]);
  const [legacyOverrides, setLegacyOverrides] = useState([]);

  useEffect(() => {
    let active = true;
    const loadFallbacks = async () => {
      if (!organization?.id) return;
      try {
        const [custRes, bottleRes, bottleCustomerRes, rentalsRes] = await Promise.all([
          supabase
            .from('customers')
            .select('id, CustomerListID, name, Name')
            .eq('organization_id', organization.id)
            .order('name'),
          supabase
            .from('bottles')
            .select('product_code')
            .eq('organization_id', organization.id)
            .not('product_code', 'is', null),
          supabase
            .from('bottles')
            .select('assigned_customer, customer_id, customer_name')
            .eq('organization_id', organization.id),
          supabase
            .from('rentals')
            .select('customer_id, customer_name')
            .eq('organization_id', organization.id)
            .is('rental_end_date', null),
        ]);
        if (!active) return;
        if (!custRes.error) setFallbackCustomers(custRes.data || []);
        if (!bottleRes.error) {
          const uniqueCodes = [...new Set((bottleRes.data || []).map((b) => b.product_code).filter(Boolean))];
          setFallbackProductCodes(uniqueCodes);
        }
        if (!bottleCustomerRes.error) {
          const byId = new Map();
          for (const row of bottleCustomerRes.data || []) {
            const id = row.assigned_customer || row.customer_id;
            if (!id) continue;
            if (!byId.has(id)) {
              byId.set(id, {
                id,
                CustomerListID: id,
                name: row.customer_name || id,
                Name: row.customer_name || id,
              });
            }
          }
          setFallbackBottleCustomers([...byId.values()]);
        }
        if (!rentalsRes.error) {
          const byId = new Map();
          for (const row of rentalsRes.data || []) {
            const id = row.customer_id || row.customer_name;
            if (!id) continue;
            if (!byId.has(id)) {
              byId.set(id, {
                id,
                CustomerListID: id,
                name: row.customer_name || row.customer_id || id,
                Name: row.customer_name || row.customer_id || id,
              });
            }
          }
          setFallbackRentalCustomers([...byId.values()]);
        }
        const { data: legacyPricingRows, error: legacyPricingErr } = await supabase
          .from('customer_pricing')
          .select('*')
          .eq('organization_id', organization.id);
        if (!legacyPricingErr) {
          const mapped = [];
          for (const row of legacyPricingRows || []) {
            const customerId = row.customer_id || row.CustomerListID || row.customer_number;
            if (!customerId) continue;
            const common = {
              customer_id: customerId,
              discount_percent: Number.isFinite(Number(row.discount_percent)) ? Number(row.discount_percent) : 0,
              fixed_rate_override: row.fixed_rate_override != null && row.fixed_rate_override !== '' ? Number(row.fixed_rate_override) : null,
              is_active: row.is_active !== false,
              effective_date: row.effective_date || null,
              expiry_date: row.expiry_date || null,
            };

            mapped.push({
              id: `legacy-${row.id || customerId}-all`,
              source: 'legacy',
              product_code: null,
              custom_monthly_price: row.custom_monthly_price ?? row.monthly ?? null,
              custom_yearly_price: row.custom_yearly_price ?? row.yearly ?? null,
              ...common,
            });

            const ratesByCode = row.rental_rates_by_product_code;
            if (ratesByCode && typeof ratesByCode === 'object') {
              Object.entries(ratesByCode).forEach(([productCode, value]) => {
                if (!productCode) return;
                const monthly = typeof value === 'object' && value !== null ? (value.monthly ?? value.rate ?? null) : value;
                mapped.push({
                  id: `legacy-${row.id || customerId}-${productCode}`,
                  source: 'legacy',
                  product_code: productCode,
                  custom_monthly_price: monthly != null && monthly !== '' ? Number(monthly) : null,
                  custom_yearly_price: null,
                  ...common,
                });
              });
            }
          }
          setLegacyOverrides(mapped);
        }
      } catch {
        // Silent fallback: page still usable with whatever context has.
      }
    };
    loadFallbacks();
    return () => { active = false; };
  }, [organization?.id]);

  const customerOptions = useMemo(() => {
    const combined = [...(ctx.customers || []), ...fallbackCustomers, ...fallbackBottleCustomers, ...fallbackRentalCustomers];
    const byId = new Map();
    for (const c of combined) {
      const id = c?.id || c?.CustomerListID;
      if (!id) continue;
      if (!byId.has(id)) byId.set(id, c);
    }
    return [...byId.values()];
  }, [ctx.customers, fallbackCustomers, fallbackBottleCustomers, fallbackRentalCustomers]);

  const productCodeOptions = useMemo(() => {
    if (ctx.assetTypePricing && ctx.assetTypePricing.length > 0) {
      return [...new Set(ctx.assetTypePricing.map((p) => p.product_code).filter(Boolean))];
    }
    return fallbackProductCodes;
  }, [ctx.assetTypePricing, fallbackProductCodes]);

  const allCustomerIds = useMemo(
    () => customerOptions.map((c) => c.id || c.CustomerListID).filter(Boolean),
    [customerOptions]
  );
  const handleSelectAllCustomers = () => setBulkCustomers(allCustomerIds);
  const handleClearAllCustomers = () => setBulkCustomers([]);
  const selectedBulkCustomerOptions = useMemo(
    () => customerOptions.filter((c) => bulkCustomers.includes(c.id || c.CustomerListID)),
    [customerOptions, bulkCustomers]
  );

  const enriched = useMemo(() => {
    const keyFor = (o) => `${String(o.customer_id || '').trim()}::${String(o.product_code || '').trim().toUpperCase()}`;
    const merged = new Map();

    for (const legacy of legacyOverrides || []) {
      merged.set(keyFor(legacy), legacy);
    }
    for (const current of ctx.customerPricingOverrides || []) {
      merged.set(keyFor(current), current);
    }

    return [...merged.values()].map((o) => {
      const cust = customerOptions.find((c) => c.id === o.customer_id || c.CustomerListID === o.customer_id);
      return { ...o, customerName: cust?.name || cust?.Name || o.customer_id };
    });
  }, [ctx.customerPricingOverrides, legacyOverrides, customerOptions]);

  const filtered = useMemo(() => {
    if (!search.trim()) return enriched;
    const q = search.toLowerCase();
    return enriched.filter((o) =>
      o.customerName.toLowerCase().includes(q) ||
      (o.product_code || '').toLowerCase().includes(q)
    );
  }, [enriched, search]);

  const openNew = () => {
    setEditItem({
      customer_id: '', product_code: '', custom_monthly_price: '', custom_yearly_price: '',
      discount_percent: '', fixed_rate_override: '', effective_date: '', expiry_date: '', is_active: true,
    });
    setEditOpen(true);
  };

  useEffect(() => {
    const prefillCustomerId = location?.state?.prefillCustomerId;
    if (!prefillCustomerId) return;
    const normalizedPrefillId = String(prefillCustomerId).trim();
    setSearch(location?.state?.prefillCustomerName || normalizedPrefillId);

    // Prefer editing an existing row for this customer.
    const customerRows = (enriched || []).filter(
      (row) => String(row.customer_id || '').trim() === normalizedPrefillId
    );
    const preferredExisting =
      customerRows.find((row) => !row.product_code) || // all-products row first
      customerRows[0] ||
      null;

    if (preferredExisting) {
      // Legacy rows are synthesized; open as a new override prefilled with legacy values.
      if (preferredExisting.source === 'legacy') {
        setEditItem({
          __lockCustomer: true,
          customer_id: normalizedPrefillId,
          product_code: preferredExisting.product_code || '',
          custom_monthly_price: preferredExisting.custom_monthly_price ?? '',
          custom_yearly_price: preferredExisting.custom_yearly_price ?? '',
          discount_percent: preferredExisting.discount_percent ?? '',
          fixed_rate_override: preferredExisting.fixed_rate_override ?? '',
          effective_date: preferredExisting.effective_date || '',
          expiry_date: preferredExisting.expiry_date || '',
          is_active: preferredExisting.is_active !== false,
        });
      } else {
        setEditItem({ __lockCustomer: true, ...preferredExisting });
      }
    } else {
      setEditItem({
        __lockCustomer: true,
        customer_id: normalizedPrefillId,
        product_code: '',
        custom_monthly_price: '',
        custom_yearly_price: '',
        discount_percent: '',
        fixed_rate_override: '',
        effective_date: '',
        expiry_date: '',
        is_active: true,
      });
    }
    setEditOpen(true);
  }, [location?.state?.prefillCustomerId, location?.state?.prefillCustomerName, enriched]);

  const openEdit = (item) => {
    setEditItem({ ...item });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editItem.customer_id) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        organization_id: organization.id,
        customer_id: editItem.customer_id,
        product_code: editItem.product_code || null,
        custom_monthly_price: editItem.custom_monthly_price ? parseFloat(editItem.custom_monthly_price) : null,
        custom_yearly_price: editItem.custom_yearly_price ? parseFloat(editItem.custom_yearly_price) : null,
        discount_percent: editItem.discount_percent ? parseFloat(editItem.discount_percent) : 0,
        fixed_rate_override: editItem.fixed_rate_override ? parseFloat(editItem.fixed_rate_override) : null,
        effective_date: editItem.effective_date || null,
        expiry_date: editItem.expiry_date || null,
        is_active: editItem.is_active !== false,
      };
      if (editItem.id) {
        const { error: err } = await supabase.from('customer_pricing_overrides').update(payload).eq('id', editItem.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('customer_pricing_overrides').insert(payload);
        if (err) throw err;
      }
      setEditOpen(false);
      ctx.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this override?')) return;
    try {
      const { error: err } = await supabase.from('customer_pricing_overrides').delete().eq('id', id);
      if (err) throw err;
      ctx.refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBulkApply = async () => {
    if (bulkCustomers.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      for (const custId of bulkCustomers) {
        const existing = ctx.customerPricingOverrides.find((o) => o.customer_id === custId && !o.product_code);
        const payload = {
          organization_id: organization.id,
          customer_id: custId,
          discount_percent: bulkValues.discount_percent ? parseFloat(bulkValues.discount_percent) : 0,
          fixed_rate_override: bulkValues.fixed_rate_override ? parseFloat(bulkValues.fixed_rate_override) : null,
          is_active: true,
        };
        if (existing) {
          await supabase.from('customer_pricing_overrides').update(payload).eq('id', existing.id);
        } else {
          await supabase.from('customer_pricing_overrides').insert(payload);
        }
      }
      setBulkOpen(false);
      setBulkCustomers([]);
      setBulkValues({ discount_percent: '', fixed_rate_override: '' });
      ctx.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (ctx.loading) {
    return <Box sx={{ p: 4 }}><LinearProgress /></Box>;
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, minHeight: '100%' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Customer Pricing Overrides</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>Per-customer custom rates and discounts</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh"><IconButton onClick={ctx.refresh} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}><RefreshIcon /></IconButton></Tooltip>
          <Button variant="outlined" onClick={() => setBulkOpen(true)} sx={{ textTransform: 'none', borderRadius: 2 }}>Bulk Apply</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openNew} sx={{ textTransform: 'none', borderRadius: 2, bgcolor: primaryColor, '&:hover': { bgcolor: primaryColor, opacity: 0.9 } }}>
            Add Override
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <TextField size="small" placeholder="Search by customer or product..." value={search} onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 300, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: 'text.secondary' } }}>
                <TableCell>Customer</TableCell>
                <TableCell>Product Code</TableCell>
                <TableCell align="right">Monthly</TableCell>
                <TableCell align="right">Yearly</TableCell>
                <TableCell align="right">Discount %</TableCell>
                <TableCell align="right">Fixed Rate</TableCell>
                <TableCell>Active</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>No overrides. Add one or apply bulk pricing.</TableCell></TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{item.customerName}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{item.product_code || 'All'}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{item.custom_monthly_price != null ? formatCurrency(item.custom_monthly_price) : '—'}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{item.custom_yearly_price != null ? formatCurrency(item.custom_yearly_price) : '—'}</TableCell>
                    <TableCell align="right">{item.discount_percent > 0 ? `${item.discount_percent}%` : '—'}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{item.fixed_rate_override != null ? formatCurrency(item.fixed_rate_override) : '—'}</TableCell>
                    <TableCell>{item.is_active ? <Chip label="Active" size="small" color="success" /> : <Chip label="Inactive" size="small" />}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(item)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => handleDelete(item.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{editItem?.id ? 'Edit Override' : 'Add Override'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Customer</InputLabel>
              <Select
                value={editItem?.customer_id || ''}
                label="Customer"
                onChange={(e) => setEditItem((p) => ({ ...p, customer_id: e.target.value }))}
                disabled={!!editItem?.id || !!editItem?.__lockCustomer}
              >
                {customerOptions.map((c) => <MenuItem key={c.id || c.CustomerListID} value={c.id || c.CustomerListID}>{c.name || c.Name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Product Code (optional)</InputLabel>
              <Select value={editItem?.product_code || ''} label="Product Code (optional)" onChange={(e) => setEditItem((p) => ({ ...p, product_code: e.target.value }))}>
                <MenuItem value="">All Products</MenuItem>
                {productCodeOptions.map((pc) => <MenuItem key={pc} value={pc}>{pc}</MenuItem>)}
              </Select>
            </FormControl>
            <Stack direction="row" spacing={2}>
              <TextField size="small" label="Custom Monthly" type="number" value={editItem?.custom_monthly_price ?? ''} onChange={(e) => setEditItem((p) => ({ ...p, custom_monthly_price: e.target.value }))} fullWidth inputProps={{ min: 0, step: 0.01 }} />
              <TextField size="small" label="Custom Yearly" type="number" value={editItem?.custom_yearly_price ?? ''} onChange={(e) => setEditItem((p) => ({ ...p, custom_yearly_price: e.target.value }))} fullWidth inputProps={{ min: 0, step: 0.01 }} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField size="small" label="Discount %" type="number" value={editItem?.discount_percent ?? ''} onChange={(e) => setEditItem((p) => ({ ...p, discount_percent: e.target.value }))} fullWidth inputProps={{ min: 0, max: 100, step: 0.5 }} />
              <TextField size="small" label="Fixed Rate" type="number" value={editItem?.fixed_rate_override ?? ''} onChange={(e) => setEditItem((p) => ({ ...p, fixed_rate_override: e.target.value }))} fullWidth inputProps={{ min: 0, step: 0.01 }} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField size="small" label="Effective Date" type="date" value={editItem?.effective_date || ''} onChange={(e) => setEditItem((p) => ({ ...p, effective_date: e.target.value }))} fullWidth InputLabelProps={{ shrink: true }} />
              <TextField size="small" label="Expiry Date" type="date" value={editItem?.expiry_date || ''} onChange={(e) => setEditItem((p) => ({ ...p, expiry_date: e.target.value }))} fullWidth InputLabelProps={{ shrink: true }} />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ textTransform: 'none', bgcolor: primaryColor }}>{saving ? 'Saving...' : 'Save'}</Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Apply Dialog */}
      <Dialog open={bulkOpen} onClose={() => setBulkOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Bulk Apply Pricing</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">Select customers and set a discount or fixed rate override for all selected.</Typography>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="outlined"
                onClick={handleSelectAllCustomers}
                disabled={allCustomerIds.length === 0}
                sx={{ textTransform: 'none' }}
              >
                Select All
              </Button>
              <Button
                size="small"
                variant="text"
                onClick={handleClearAllCustomers}
                disabled={bulkCustomers.length === 0}
                sx={{ textTransform: 'none' }}
              >
                Clear
              </Button>
            </Stack>
            <Autocomplete
              multiple
              disableCloseOnSelect
              options={customerOptions}
              value={selectedBulkCustomerOptions}
              onChange={(_, values) => setBulkCustomers(values.map((v) => v.id || v.CustomerListID))}
              getOptionLabel={(option) => option.name || option.Name || option.id || option.CustomerListID || ''}
              isOptionEqualToValue={(option, value) => (option.id || option.CustomerListID) === (value.id || value.CustomerListID)}
              renderOption={(props, option, { selected }) => (
                <li {...props}>
                  <Checkbox size="small" checked={selected} sx={{ mr: 1 }} />
                  {option.name || option.Name || option.id || option.CustomerListID}
                </li>
              )}
              renderInput={(params) => <TextField {...params} size="small" label="Select Customers" placeholder="Choose customers..." />}
            />
            <TextField size="small" label="Discount %" type="number" value={bulkValues.discount_percent} onChange={(e) => setBulkValues((p) => ({ ...p, discount_percent: e.target.value }))} inputProps={{ min: 0, max: 100, step: 0.5 }} />
            <TextField size="small" label="Fixed Rate Override" type="number" value={bulkValues.fixed_rate_override} onChange={(e) => setBulkValues((p) => ({ ...p, fixed_rate_override: e.target.value }))} inputProps={{ min: 0, step: 0.01 }} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setBulkOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleBulkApply} disabled={saving || bulkCustomers.length === 0} sx={{ textTransform: 'none', bgcolor: primaryColor }}>
            {saving ? 'Applying...' : `Apply to ${bulkCustomers.length} Customers`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
