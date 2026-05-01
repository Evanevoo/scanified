import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSubscriptions } from '../context/SubscriptionContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../supabase/client';
import { formatCurrency } from '../utils/subscriptionUtils';
import {
  Box, Typography, Paper, Stack, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, LinearProgress,
  InputAdornment, Chip, Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Refresh as RefreshIcon, Search as SearchIcon, FileUpload as ImportIcon,
} from '@mui/icons-material';

export default function AssetTypePricing() {
  const { organization } = useAuth();
  const ctx = useSubscriptions();
  const { organizationColors } = useTheme();
  const primaryColor = organizationColors?.primary || '#40B5AD';

  const [search, setSearch] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [importing, setImporting] = useState(false);
  const [storageMode, setStorageMode] = useState('asset_type_pricing');
  const [legacyRows, setLegacyRows] = useState([]);
  const [inventoryProductCodes, setInventoryProductCodes] = useState([]);

  useEffect(() => {
    let active = true;
    const detectMode = async () => {
      if (!organization?.id) return;
      const probe = await supabase.from('asset_type_pricing').select('id').eq('organization_id', organization.id).limit(1);
      if (probe?.error?.code === '42P01') {
        if (!active) return;
        setStorageMode('organization_rental_classes');
        const { data } = await supabase
          .from('organization_rental_classes')
          .select('*')
          .eq('organization_id', organization.id)
          .order('sort_order', { ascending: true });
        if (!active) return;
        setLegacyRows((data || []).map((r) => ({
          id: r.id,
          product_code: r.match_product_code || '',
          category: r.match_category || '',
          description: r.class_name || '',
          monthly_price: parseFloat(r.default_monthly) || 0,
          yearly_price: parseFloat(r.default_weekly) || ((parseFloat(r.default_monthly) || 0) * 12),
          is_active: true,
          _legacy: r,
        })));
      } else {
        if (!active) return;
        setStorageMode('asset_type_pricing');
        setLegacyRows([]);
      }
    };
    detectMode();
    return () => { active = false; };
  }, [organization?.id, ctx.assetTypePricing.length]);

  const sourceRows = storageMode === 'organization_rental_classes' ? legacyRows : ctx.assetTypePricing;
  const productCodeOptions = useMemo(() => {
    const fromRows = sourceRows.map((r) => r.product_code).filter(Boolean);
    return [...new Set([...fromRows, ...inventoryProductCodes])].sort((a, b) => a.localeCompare(b));
  }, [sourceRows, inventoryProductCodes]);
  const categoryOptions = useMemo(() => {
    const fromRows = sourceRows.map((r) => r.category).filter(Boolean);
    return [...new Set(fromRows)].sort((a, b) => a.localeCompare(b));
  }, [sourceRows]);

  useEffect(() => {
    let active = true;
    const loadProductCodeOptions = async () => {
      if (!organization?.id) return;
      const { data, error } = await supabase
        .from('bottles')
        .select('product_code')
        .eq('organization_id', organization.id)
        .not('product_code', 'is', null);
      if (!active || error) return;
      const uniqueCodes = [...new Set((data || []).map((b) => b.product_code).filter(Boolean))];
      setInventoryProductCodes(uniqueCodes);
    };
    loadProductCodeOptions();
    return () => { active = false; };
  }, [organization?.id]);

  const filtered = useMemo(() => {
    if (!search.trim()) return sourceRows;
    const q = search.toLowerCase();
    return sourceRows.filter((p) =>
      (p.product_code || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
    );
  }, [sourceRows, search]);

  const openNew = () => {
    setEditItem({ product_code: '', category: '', description: '', monthly_price: '', yearly_price: '', is_active: true });
    setEditOpen(true);
  };

  const openEdit = (item) => {
    setEditItem({ ...item });
    setEditOpen(true);
  };

  const handleSave = async () => {
    const requiresProductCode = storageMode !== 'organization_rental_classes';
    if (requiresProductCode && !editItem.product_code?.trim()) {
      setError('Product code is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        organization_id: organization.id,
        product_code: editItem.product_code,
        category: editItem.category || null,
        description: editItem.description || null,
        monthly_price: parseFloat(editItem.monthly_price) || 0,
        yearly_price: parseFloat(editItem.yearly_price) || 0,
        is_active: editItem.is_active !== false,
      };

      if (storageMode === 'organization_rental_classes') {
        const legacyPayload = {
          organization_id: organization.id,
          class_name: editItem.description || editItem.product_code || 'Asset Type',
          match_product_code: editItem.product_code?.trim() || null,
          match_category: editItem.category || null,
          default_monthly: parseFloat(editItem.monthly_price) || 0,
          // Legacy table has no yearly column; persist yearly in default_weekly as a compatibility field.
          default_weekly: parseFloat(editItem.yearly_price) || 0,
          rental_method: 'monthly',
        };
        if (editItem.id) {
          const { error: err } = await supabase.from('organization_rental_classes').update(legacyPayload).eq('id', editItem.id);
          if (err) throw err;
        } else {
          const { error: err } = await supabase.from('organization_rental_classes').insert(legacyPayload);
          if (err) throw err;
        }
      } else if (editItem.id) {
        const { error: err } = await supabase.from('asset_type_pricing').update(payload).eq('id', editItem.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('asset_type_pricing').insert(payload);
        if (err) throw err;
      }
      setEditOpen(false);
      if (storageMode === 'organization_rental_classes') {
        const { data } = await supabase
          .from('organization_rental_classes')
          .select('*')
          .eq('organization_id', organization.id)
          .order('sort_order', { ascending: true });
        setLegacyRows((data || []).map((r) => ({
          id: r.id,
          product_code: r.match_product_code || '',
          category: r.match_category || '',
          description: r.class_name || '',
          monthly_price: parseFloat(r.default_monthly) || 0,
          yearly_price: parseFloat(r.default_weekly) || ((parseFloat(r.default_monthly) || 0) * 12),
          is_active: true,
          _legacy: r,
        })));
      } else {
        ctx.refresh();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this pricing entry?')) return;
    try {
      const { error: err } = storageMode === 'organization_rental_classes'
        ? await supabase.from('organization_rental_classes').delete().eq('id', id)
        : await supabase.from('asset_type_pricing').delete().eq('id', id);
      if (err) throw err;
      if (storageMode === 'organization_rental_classes') {
        setLegacyRows((prev) => prev.filter((r) => r.id !== id));
      } else {
        ctx.refresh();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleImportFromInventory = async () => {
    setImporting(true);
    setError(null);
    try {
      const { data: bottles, error: bErr } = await supabase
        .from('bottles')
        .select('product_code')
        .eq('organization_id', organization.id)
        .not('product_code', 'is', null);
      if (bErr) throw bErr;

      const existing = new Set(sourceRows.map((p) => p.product_code?.toLowerCase()));
      const unique = [...new Set((bottles || []).map((b) => b.product_code).filter(Boolean))];
      const newCodes = unique.filter((pc) => !existing.has(pc.toLowerCase()));

      if (newCodes.length === 0) {
        setError('All product codes are already in the pricing table.');
        return;
      }

      const rows = newCodes.map((pc) => ({
        organization_id: organization.id,
        product_code: pc,
        monthly_price: 10,
        yearly_price: 100,
        is_active: true,
      }));

      if (storageMode === 'organization_rental_classes') {
        const legacyRowsToInsert = newCodes.map((pc) => ({
          organization_id: organization.id,
          class_name: pc,
          match_product_code: pc,
          default_monthly: 10,
          default_weekly: 100,
          rental_method: 'monthly',
        }));
        const { error: iErr } = await supabase.from('organization_rental_classes').insert(legacyRowsToInsert);
        if (iErr) throw iErr;
        const { data } = await supabase
          .from('organization_rental_classes')
          .select('*')
          .eq('organization_id', organization.id)
          .order('sort_order', { ascending: true });
        setLegacyRows((data || []).map((r) => ({
          id: r.id,
          product_code: r.match_product_code || '',
          category: r.match_category || '',
          description: r.class_name || '',
          monthly_price: parseFloat(r.default_monthly) || 0,
          yearly_price: parseFloat(r.default_weekly) || ((parseFloat(r.default_monthly) || 0) * 12),
          is_active: true,
          _legacy: r,
        })));
      } else {
        const { error: iErr } = await supabase.from('asset_type_pricing').insert(rows);
        if (iErr) throw iErr;
        ctx.refresh();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  if (ctx.loading) {
    return <Box sx={{ p: 4 }}><LinearProgress /><Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>Loading pricing...</Typography></Box>;
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, minHeight: '100%' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Asset Type Pricing</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Default monthly and yearly prices per product type
            {storageMode === 'organization_rental_classes' ? ' (legacy mode)' : ''}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh"><IconButton onClick={ctx.refresh} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}><RefreshIcon /></IconButton></Tooltip>
          <Button variant="outlined" startIcon={<ImportIcon />} onClick={handleImportFromInventory} disabled={importing} sx={{ textTransform: 'none', borderRadius: 2 }}>
            {importing ? 'Importing...' : 'Import from Inventory'}
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openNew} sx={{ textTransform: 'none', borderRadius: 2, bgcolor: primaryColor, '&:hover': { bgcolor: primaryColor, opacity: 0.9 } }}>
            Add Pricing
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <TextField
            size="small" placeholder="Search product codes..." value={search} onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 300, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: 'text.secondary', letterSpacing: '0.05em' } }}>
                <TableCell>Product Code</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Monthly</TableCell>
                <TableCell align="right">Yearly</TableCell>
                <TableCell align="right">Yearly Discount</TableCell>
                <TableCell>Active</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>No pricing entries. Add one or import from inventory.</TableCell></TableRow>
              ) : (
                filtered.map((item) => {
                  const yearlyEquiv = (parseFloat(item.monthly_price) || 0) * 12;
                  const discount = yearlyEquiv > 0 ? Math.round((1 - (parseFloat(item.yearly_price) || 0) / yearlyEquiv) * 100) : 0;
                  return (
                    <TableRow key={item.id} hover>
                      <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace' }}>{item.product_code}</TableCell>
                      <TableCell>{item.category || '—'}</TableCell>
                      <TableCell>{item.description || '—'}</TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{formatCurrency(item.monthly_price)}</TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{formatCurrency(item.yearly_price)}</TableCell>
                      <TableCell align="right">{discount > 0 ? <Chip label={`${discount}% off`} size="small" color="success" sx={{ fontWeight: 600 }} /> : '—'}</TableCell>
                      <TableCell>{item.is_active ? <Chip label="Active" size="small" color="success" /> : <Chip label="Inactive" size="small" />}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(item)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => handleDelete(item.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{editItem?.id ? 'Edit Pricing' : 'Add Pricing'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Autocomplete
              freeSolo
              options={productCodeOptions}
              value={editItem?.product_code || ''}
              onInputChange={(_, value) => setEditItem((p) => ({ ...p, product_code: value }))}
              disabled={!!editItem?.id && storageMode !== 'organization_rental_classes'}
              renderInput={(params) => <TextField {...params} size="small" label="Product Code" />}
            />
            <Autocomplete
              freeSolo
              options={categoryOptions}
              value={editItem?.category || ''}
              onInputChange={(_, value) => setEditItem((p) => ({ ...p, category: value }))}
              renderInput={(params) => <TextField {...params} size="small" label="Category" />}
            />
            <TextField size="small" label="Description" value={editItem?.description || ''} onChange={(e) => setEditItem((p) => ({ ...p, description: e.target.value }))} />
            <Stack direction="row" spacing={2}>
              <TextField size="small" label="Monthly Price" type="number" value={editItem?.monthly_price ?? ''} onChange={(e) => setEditItem((p) => ({ ...p, monthly_price: e.target.value }))} inputProps={{ min: 0, step: 0.01 }} fullWidth />
              <TextField size="small" label="Yearly Price" type="number" value={editItem?.yearly_price ?? ''} onChange={(e) => setEditItem((p) => ({ ...p, yearly_price: e.target.value }))} inputProps={{ min: 0, step: 0.01 }} fullWidth />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ textTransform: 'none', bgcolor: primaryColor }}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
