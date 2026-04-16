import logger from '../utils/logger';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Alert,
  CircularProgress,
  Checkbox,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Chip,
  Tooltip,
  Autocomplete,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import CategoryIcon from '@mui/icons-material/Category';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import {
  distinctProductCodesFromBottles,
  distinctCategoriesFromBottles,
} from '../utils/organizationRentalClassUtils';
import { invalidateOrgRentalPricingCache } from '../services/rentalPricingContext';

const METHODS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'daily', label: 'Daily' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'starting_balance', label: 'Starting balance' },
  { value: 'no_rent', label: 'No rent' },
];

const emptyForm = () => ({
  group_name: 'From inventory',
  class_name: '',
  rental_method: 'monthly',
  default_daily: '',
  default_weekly: '',
  default_monthly: '10',
  match_product_code: '',
  match_category: '',
  sort_order: 0,
});

export default function OrganizationRentalClassesManager() {
  const { organization } = useAuth();
  const [rows, setRows] = useState([]);
  const [bottles, setBottles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedCodes, setSelectedCodes] = useState(() => new Set());
  const [categoryImportOpen, setCategoryImportOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState(() => new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());

  const load = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [{ data: classData, error: cErr }, { data: bottleData, error: bErr }] = await Promise.all([
        supabase
          .from('organization_rental_classes')
          .select('*')
          .eq('organization_id', organization.id)
          .order('sort_order', { ascending: true })
          .order('group_name', { ascending: true }),
        supabase.from('bottles').select('product_code, category').eq('organization_id', organization.id),
      ]);
      if (cErr && !/relation|does not exist/i.test(cErr.message || '')) throw cErr;
      if (bErr) throw bErr;
      setRows(cErr ? [] : classData || []);
      setBottles(bottleData || []);
    } catch (e) {
      logger.error('OrganizationRentalClassesManager load:', e);
      setError(e.message || 'Failed to load');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const usedProductCodes = useMemo(() => {
    const s = new Set();
    rows.forEach((r) => {
      const c = (r.match_product_code || '').toString().trim().toLowerCase();
      if (c) s.add(c);
    });
    return s;
  }, [rows]);

  const importCandidates = useMemo(() => {
    return distinctProductCodesFromBottles(bottles).filter((code) => !usedProductCodes.has(code.toLowerCase()));
  }, [bottles, usedProductCodes]);

  const distinctCategories = useMemo(() => distinctCategoriesFromBottles(bottles), [bottles]);

  const usedCategoryKeys = useMemo(() => {
    const s = new Set();
    rows.forEach((r) => {
      const c = (r.match_category || '').toString().trim().toLowerCase();
      if (c) s.add(c);
    });
    return s;
  }, [rows]);

  const categoryImportCandidates = useMemo(
    () => distinctCategories.filter((cat) => !usedCategoryKeys.has(cat.toLowerCase())),
    [distinctCategories, usedCategoryKeys]
  );

  const openAddClassForCategory = (cat) => {
    setForm({
      ...emptyForm(),
      group_name: 'By category',
      class_name: cat,
      match_category: cat,
      match_product_code: '',
    });
    setAddOpen(true);
  };

  const handleDelete = async (id) => {
    if (!organization?.id || !confirm('Delete this rental class?')) return;
    try {
      const { error: delErr } = await supabase
        .from('organization_rental_classes')
        .delete()
        .eq('id', id)
        .eq('organization_id', organization.id);
      if (delErr) throw delErr;
      invalidateOrgRentalPricingCache(organization.id);
      await load();
    } catch (e) {
      alert(e.message || 'Delete failed');
    }
  };

  const handleSaveNew = async () => {
    if (!organization?.id || !form.class_name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        organization_id: organization.id,
        group_name: form.group_name.trim() || 'From inventory',
        class_name: form.class_name.trim(),
        rental_method: form.rental_method,
        default_daily: form.default_daily === '' ? null : parseFloat(form.default_daily),
        default_weekly: form.default_weekly === '' ? null : parseFloat(form.default_weekly),
        default_monthly: form.default_monthly === '' ? null : parseFloat(form.default_monthly),
        match_product_code: form.match_product_code.trim() || null,
        match_category: form.match_category.trim() || null,
        sort_order: parseInt(String(form.sort_order), 10) || 0,
        updated_at: new Date().toISOString(),
      };
      const { error: insErr } = await supabase.from('organization_rental_classes').insert(payload);
      if (insErr) throw insErr;
      invalidateOrgRentalPricingCache(organization.id);
      setAddOpen(false);
      setForm(emptyForm());
      await load();
    } catch (e) {
      alert(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async () => {
    if (!organization?.id || selectedCodes.size === 0) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const inserts = [...selectedCodes].map((code, i) => ({
        organization_id: organization.id,
        group_name: 'From inventory',
        class_name: code,
        rental_method: 'monthly',
        default_monthly: 10,
        match_product_code: code,
        sort_order: rows.length + i,
        updated_at: now,
      }));
      const { error: insErr } = await supabase.from('organization_rental_classes').insert(inserts);
      if (insErr) throw insErr;
      invalidateOrgRentalPricingCache(organization.id);
      setImportOpen(false);
      setSelectedCodes(new Set());
      await load();
    } catch (e) {
      alert(e.message || 'Import failed');
    } finally {
      setSaving(false);
    }
  };

  const handleImportCategories = async () => {
    if (!organization?.id || selectedCategories.size === 0) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const inserts = [...selectedCategories].map((cat, i) => ({
        organization_id: organization.id,
        group_name: 'By category',
        class_name: cat,
        rental_method: 'monthly',
        default_monthly: 10,
        match_category: cat,
        sort_order: rows.length + i,
        updated_at: now,
      }));
      const { error: insErr } = await supabase.from('organization_rental_classes').insert(inserts);
      if (insErr) throw insErr;
      invalidateOrgRentalPricingCache(organization.id);
      setCategoryImportOpen(false);
      setSelectedCategories(new Set());
      await load();
    } catch (e) {
      alert(e.message || 'Import failed');
    } finally {
      setSaving(false);
    }
  };

  const updateRowField = async (row, field, rawValue) => {
    if (!organization?.id) return;
    const updates = { updated_at: new Date().toISOString() };
    if (['default_daily', 'default_weekly', 'default_monthly'].includes(field)) {
      updates[field] = rawValue === '' ? null : parseFloat(rawValue);
    } else if (field === 'sort_order') {
      updates.sort_order = parseInt(String(rawValue), 10) || 0;
    } else {
      updates[field] = rawValue;
    }
    try {
      const { error: uErr } = await supabase
        .from('organization_rental_classes')
        .update(updates)
        .eq('id', row.id)
        .eq('organization_id', organization.id);
      if (uErr) throw uErr;
      invalidateOrgRentalPricingCache(organization.id);
      await load();
    } catch (e) {
      alert(e.message || 'Update failed');
    }
  };

  if (!organization?.id) {
    return <Alert severity="info">Select an organization to manage rental classes from assets.</Alert>;
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={700} color="#0f172a">
            Organization rental classes
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 720 }}>
            Match bottles by product code or category (exact match, or longest prefix when the code on the asset is longer than the match text).{' '}
            Per-customer overrides: customer → Rental → rental class rates. Open rentals refresh from this table on each load.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={<Inventory2Icon />}
            onClick={() => {
              setSelectedCodes(new Set());
              setImportOpen(true);
            }}
            disabled={importCandidates.length === 0}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
          >
            Add from inventory
          </Button>
          <Button
            variant="outlined"
            startIcon={<CategoryIcon />}
            onClick={() => {
              setSelectedCategories(new Set());
              setCategoryImportOpen(true);
            }}
            disabled={categoryImportCandidates.length === 0}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
          >
            Add from categories
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setForm(emptyForm());
              setAddOpen(true);
            }}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
          >
            Add class
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
          {/relation|does not exist/i.test(error) ? ' Run sql/create_organization_rental_classes.sql in Supabase.' : ''}
        </Alert>
      )}

      {!loading && !error && rows.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No organization classes yet. Use <strong>Add from inventory</strong> or <strong>Add class</strong>. Until you add rows, the app uses the built-in default catalog.
        </Alert>
      )}

      {!loading && !error && rows.length > 0 && (
        <Alert severity="success" variant="outlined" sx={{ mb: 2 }}>
          <strong>{rows.length}</strong> organization {rows.length === 1 ? 'class' : 'classes'} — matching uses sort order (product code, then category). Anything unmatched still falls back to the built-in catalog unless overridden per customer.
        </Alert>
      )}

      {distinctCategories.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} color="text.primary" sx={{ mb: 1 }}>
            Categories on your bottles ({distinctCategories.length})
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
            Click a category to add a class with <strong>Match category</strong> set (then set rates in the form). Categories that already have a class are still listed; use the table to edit rates.
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, maxHeight: 220, overflow: 'auto' }}>
            {distinctCategories.map((cat) => {
              const hasClass = usedCategoryKeys.has(cat.toLowerCase());
              return (
                <Tooltip key={cat} title={hasClass ? 'Already have a class for this category — click to add another or edit in the table' : 'Add class for this category'}>
                  <Chip
                    size="small"
                    label={cat}
                    onClick={() => openAddClassForCategory(cat)}
                    color={hasClass ? 'default' : 'primary'}
                    variant={hasClass ? 'outlined' : 'filled'}
                    sx={{ fontWeight: hasClass ? 400 : 600 }}
                  />
                </Tooltip>
              );
            })}
          </Box>
        </Paper>
      )}

      {distinctCategories.length === 0 && !error && (
        <Alert severity="warning" variant="outlined" sx={{ mb: 2 }}>
          No <strong>category</strong> values found on bottles yet. Set <code>category</code> on assets (e.g. in bottle management), or use <strong>Match product code</strong> instead.
        </Alert>
      )}

      {rows.length > 0 && (
        <TableContainer sx={{ borderRadius: 2, border: '1px solid rgba(15, 23, 42, 0.08)', maxHeight: 480 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell>Group</TableCell>
                <TableCell>Class</TableCell>
                <TableCell>Method</TableCell>
                <TableCell>Match product</TableCell>
                <TableCell>Match category</TableCell>
                <TableCell align="right">Daily</TableCell>
                <TableCell align="right">Weekly</TableCell>
                <TableCell align="right">Monthly</TableCell>
                <TableCell align="right">Sort</TableCell>
                <TableCell width={48} />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>
                    <TextField
                      size="small"
                      defaultValue={r.group_name || ''}
                      onBlur={(e) => updateRowField(r, 'group_name', e.target.value)}
                      sx={{ minWidth: 120 }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      defaultValue={r.class_name || ''}
                      onBlur={(e) => updateRowField(r, 'class_name', e.target.value)}
                      sx={{ minWidth: 140 }}
                    />
                  </TableCell>
                  <TableCell sx={{ minWidth: 130 }}>
                    <FormControl size="small" fullWidth>
                      <Select
                        value={r.rental_method || 'monthly'}
                        onChange={(e) => updateRowField(r, 'rental_method', e.target.value)}
                      >
                        {METHODS.map((m) => (
                          <MenuItem key={m.value} value={m.value}>
                            {m.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      defaultValue={r.match_product_code || ''}
                      onBlur={(e) => updateRowField(r, 'match_product_code', e.target.value.trim() || null)}
                      placeholder="SKU"
                      sx={{ width: 120 }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      defaultValue={r.match_category || ''}
                      onBlur={(e) => updateRowField(r, 'match_category', e.target.value.trim() || null)}
                      sx={{ width: 120 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <TextField
                      size="small"
                      type="number"
                      defaultValue={r.default_daily ?? ''}
                      onBlur={(e) => updateRowField(r, 'default_daily', e.target.value)}
                      sx={{ width: 88 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <TextField
                      size="small"
                      type="number"
                      defaultValue={r.default_weekly ?? ''}
                      onBlur={(e) => updateRowField(r, 'default_weekly', e.target.value)}
                      sx={{ width: 88 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <TextField
                      size="small"
                      type="number"
                      defaultValue={r.default_monthly ?? ''}
                      onBlur={(e) => updateRowField(r, 'default_monthly', e.target.value)}
                      sx={{ width: 88 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <TextField
                      size="small"
                      type="number"
                      defaultValue={r.sort_order ?? 0}
                      onBlur={(e) => updateRowField(r, 'sort_order', e.target.value)}
                      sx={{ width: 64 }}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" color="error" onClick={() => handleDelete(r.id)} aria-label="delete">
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={importOpen} onClose={() => setImportOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Product codes from inventory</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Select codes from your bottles table that are not already linked to a class. Each selection creates a class with monthly default $10 (edit after import).
          </Typography>
          {importCandidates.length === 0 ? (
            <Typography variant="body2">No new codes to import.</Typography>
          ) : (
            <List dense sx={{ maxHeight: 320, overflow: 'auto' }}>
              {importCandidates.map((code) => (
                <ListItem key={code} disablePadding>
                  <ListItemButton onClick={() => {
                    setSelectedCodes((prev) => {
                      const next = new Set(prev);
                      if (next.has(code)) next.delete(code);
                      else next.add(code);
                      return next;
                    });
                  }}>
                    <ListItemIcon>
                      <Checkbox edge="start" checked={selectedCodes.has(code)} tabIndex={-1} disableRipple />
                    </ListItemIcon>
                    <ListItemText primary={code} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleImport} disabled={saving || selectedCodes.size === 0}>
            Import selected
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={categoryImportOpen} onClose={() => setCategoryImportOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Categories from inventory</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Select categories from your bottles that do not already have a class with the same <strong>Match category</strong>. Each creates a class named after the category with default $10/month (edit after import).
          </Typography>
          {categoryImportCandidates.length === 0 ? (
            <Typography variant="body2">Every listed category already has a matching class, or there are no categories on bottles.</Typography>
          ) : (
            <List dense sx={{ maxHeight: 320, overflow: 'auto' }}>
              {categoryImportCandidates.map((cat) => (
                <ListItem key={cat} disablePadding>
                  <ListItemButton
                    onClick={() => {
                      setSelectedCategories((prev) => {
                        const next = new Set(prev);
                        if (next.has(cat)) next.delete(cat);
                        else next.add(cat);
                        return next;
                      });
                    }}
                  >
                    <ListItemIcon>
                      <Checkbox edge="start" checked={selectedCategories.has(cat)} tabIndex={-1} disableRipple />
                    </ListItemIcon>
                    <ListItemText primary={cat} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCategoryImportOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleImportCategories}
            disabled={saving || selectedCategories.size === 0}
          >
            Import selected
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add rental class</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="Group name"
            value={form.group_name}
            onChange={(e) => setForm((f) => ({ ...f, group_name: e.target.value }))}
            size="small"
            fullWidth
          />
          <TextField
            label="Class name"
            value={form.class_name}
            onChange={(e) => setForm((f) => ({ ...f, class_name: e.target.value }))}
            size="small"
            fullWidth
            required
          />
          <FormControl size="small" fullWidth>
            <InputLabel>Method</InputLabel>
            <Select
              value={form.rental_method}
              label="Method"
              onChange={(e) => setForm((f) => ({ ...f, rental_method: e.target.value }))}
            >
              {METHODS.map((m) => (
                <MenuItem key={m.value} value={m.value}>
                  {m.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Match product code (optional)"
            value={form.match_product_code}
            onChange={(e) => setForm((f) => ({ ...f, match_product_code: e.target.value }))}
            size="small"
            fullWidth
            helperText="Exact match to bottle product_code"
          />
          <Autocomplete
            freeSolo
            options={distinctCategories}
            inputValue={form.match_category}
            onInputChange={(_, newInputValue) => setForm((f) => ({ ...f, match_category: newInputValue }))}
            onChange={(_, newValue) => {
              if (newValue != null) setForm((f) => ({ ...f, match_category: String(newValue) }));
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Match category (optional)"
                size="small"
                fullWidth
                helperText="Choose from your bottle categories or type a value (must match bottle category text)"
              />
            )}
          />
          <Stack direction="row" spacing={1}>
            <TextField
              label="Daily"
              type="number"
              value={form.default_daily}
              onChange={(e) => setForm((f) => ({ ...f, default_daily: e.target.value }))}
              size="small"
            />
            <TextField
              label="Weekly"
              type="number"
              value={form.default_weekly}
              onChange={(e) => setForm((f) => ({ ...f, default_weekly: e.target.value }))}
              size="small"
            />
            <TextField
              label="Monthly"
              type="number"
              value={form.default_monthly}
              onChange={(e) => setForm((f) => ({ ...f, default_monthly: e.target.value }))}
              size="small"
            />
          </Stack>
          <TextField
            label="Sort order"
            type="number"
            value={form.sort_order}
            onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
            size="small"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveNew} disabled={saving || !form.class_name.trim()}>
            {saving ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
