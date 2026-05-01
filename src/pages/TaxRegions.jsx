import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../supabase/client';
import {
  Box, Typography, Paper, Stack, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, LinearProgress,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Refresh as RefreshIcon, Search as SearchIcon,
} from '@mui/icons-material';

export default function TaxRegions() {
  const { organization } = useAuth();
  const { organizationColors } = useTheme();
  const primaryColor = organizationColors?.primary || '#40B5AD';

  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [storageMode, setStorageMode] = useState('tax_regions');

  const fetchRegions = async () => {
    if (!organization?.id) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('tax_regions')
        .select('*')
        .eq('organization_id', organization.id)
        .order('province');
      if (err) {
        // Fallback for orgs that have not run the tax_regions migration yet.
        const { data: locData, error: locErr } = await supabase
          .from('locations')
          .select('id, organization_id, name, province, gst_rate, pst_rate, total_tax_rate')
          .eq('organization_id', organization.id)
          .order('province');
        if (locErr) throw err;
        setStorageMode('locations');
        setRegions((locData || []).map((l) => ({
          id: l.id,
          organization_id: l.organization_id,
          province: l.province || '',
          city: l.name || '',
          region_name: null,
          gst_rate: parseFloat(l.gst_rate) || 0,
          pst_rate: parseFloat(l.pst_rate) || 0,
          hst_rate: 0,
          total_rate: parseFloat(l.total_tax_rate) || ((parseFloat(l.gst_rate) || 0) + (parseFloat(l.pst_rate) || 0)),
        })));
      } else {
        setStorageMode('tax_regions');
        setRegions(data || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegions();
  }, [organization?.id]);

  const filtered = search.trim()
    ? regions.filter((r) =>
        (r.province || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.city || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.region_name || '').toLowerCase().includes(search.toLowerCase())
      )
    : regions;

  const openNew = () => {
    setEditItem({ province: '', city: '', region_name: '', gst_rate: 5, pst_rate: 6, hst_rate: 0, total_rate: 11 });
    setEditOpen(true);
  };

  const openEdit = (item) => {
    setEditItem({ ...item });
    setEditOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        organization_id: organization.id,
        province: editItem.province || '',
        city: editItem.city || null,
        region_name: editItem.region_name || null,
        gst_rate: parseFloat(editItem.gst_rate) || 0,
        pst_rate: parseFloat(editItem.pst_rate) || 0,
        hst_rate: parseFloat(editItem.hst_rate) || 0,
        total_rate: parseFloat(editItem.total_rate) || 0,
      };
      if (storageMode === 'tax_regions') {
        if (editItem.id) {
          const { error: err } = await supabase.from('tax_regions').update(payload).eq('id', editItem.id);
          if (err) throw err;
        } else {
          const { error: err } = await supabase.from('tax_regions').insert(payload);
          if (err) throw err;
        }
      } else {
        const locPayload = {
          organization_id: organization.id,
          name: editItem.city || editItem.region_name || editItem.province || 'Unspecified',
          province: editItem.province || '',
          gst_rate: parseFloat(editItem.gst_rate) || 0,
          pst_rate: parseFloat(editItem.pst_rate) || 0,
          total_tax_rate: parseFloat(editItem.total_rate) || 0,
        };
        if (editItem.id) {
          const { error: err } = await supabase.from('locations').update(locPayload).eq('id', editItem.id);
          if (err) throw err;
        } else {
          const { error: err } = await supabase.from('locations').insert(locPayload);
          if (err) throw err;
        }
      }
      setEditOpen(false);
      fetchRegions();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this tax region?')) return;
    try {
      const { error: err } = storageMode === 'tax_regions'
        ? await supabase.from('tax_regions').delete().eq('id', id)
        : await supabase.from('locations').delete().eq('id', id);
      if (err) throw err;
      fetchRegions();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <Box sx={{ p: 4 }}><LinearProgress /><Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>Loading tax regions...</Typography></Box>;
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, minHeight: '100%' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Tax Regions</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Tax rates per location for billing {storageMode === 'locations' ? '(using existing locations table)' : ''}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh"><IconButton onClick={fetchRegions} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}><RefreshIcon /></IconButton></Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}
            sx={{ textTransform: 'none', borderRadius: 2, bgcolor: primaryColor, '&:hover': { bgcolor: primaryColor, opacity: 0.9 } }}>
            Add Region
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <TextField size="small" placeholder="Search regions..." value={search} onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 300, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: 'text.secondary' } }}>
                <TableCell>Province</TableCell>
                <TableCell>City</TableCell>
                <TableCell>Region Name</TableCell>
                <TableCell align="right">GST %</TableCell>
                <TableCell align="right">PST %</TableCell>
                <TableCell align="right">HST %</TableCell>
                <TableCell align="right">Total %</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>No tax regions configured.</TableCell></TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{r.province}</TableCell>
                    <TableCell>{r.city || '—'}</TableCell>
                    <TableCell>{r.region_name || '—'}</TableCell>
                    <TableCell align="right">{r.gst_rate}%</TableCell>
                    <TableCell align="right">{r.pst_rate}%</TableCell>
                    <TableCell align="right">{r.hst_rate}%</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{r.total_rate}%</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(r)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => handleDelete(r.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{editItem?.id ? 'Edit Tax Region' : 'Add Tax Region'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField size="small" label="Province" value={editItem?.province || ''} onChange={(e) => setEditItem((p) => ({ ...p, province: e.target.value }))} />
            <TextField size="small" label="City" value={editItem?.city || ''} onChange={(e) => setEditItem((p) => ({ ...p, city: e.target.value }))} />
            <TextField size="small" label="Region Name" value={editItem?.region_name || ''} onChange={(e) => setEditItem((p) => ({ ...p, region_name: e.target.value }))} />
            <Stack direction="row" spacing={2}>
              <TextField size="small" label="GST %" type="number" value={editItem?.gst_rate ?? ''} onChange={(e) => setEditItem((p) => ({ ...p, gst_rate: e.target.value }))} fullWidth inputProps={{ min: 0, step: 0.5 }} />
              <TextField size="small" label="PST %" type="number" value={editItem?.pst_rate ?? ''} onChange={(e) => setEditItem((p) => ({ ...p, pst_rate: e.target.value }))} fullWidth inputProps={{ min: 0, step: 0.5 }} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField size="small" label="HST %" type="number" value={editItem?.hst_rate ?? ''} onChange={(e) => setEditItem((p) => ({ ...p, hst_rate: e.target.value }))} fullWidth inputProps={{ min: 0, step: 0.5 }} />
              <TextField size="small" label="Total %" type="number" value={editItem?.total_rate ?? ''} onChange={(e) => setEditItem((p) => ({ ...p, total_rate: e.target.value }))} fullWidth inputProps={{ min: 0, step: 0.5 }} />
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
