import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Button, IconButton, Chip, LinearProgress, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, FormControlLabel, Checkbox, Stack, Grid, Card, CardContent
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { supabase } from '../supabase/client';

export default function AllAssetMovements() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState([]);
  const navigate = useNavigate();

  const allColumns = [
    { key: 'asset_id', label: 'Asset ID' },
    { key: 'type', label: 'Type' },
    { key: 'created_at', label: 'Created' },
    { key: 'user', label: 'User' },
    { key: 'device', label: 'Device' },
    { key: 'location', label: 'Location' },
    { key: 'data', label: 'Data' },
    { key: 'associated_assets', label: 'Associated Assets' },
    { key: 'notes', label: 'Notes' },
  ];
  const COLUMN_PREF_KEY = 'allAssetMovementsColumns';
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem(COLUMN_PREF_KEY);
    if (saved) return JSON.parse(saved);
    return allColumns.map(c => c.key);
  });

  function handleColumnChange(key) {
    let updated = visibleColumns.includes(key)
      ? visibleColumns.filter(k => k !== key)
      : [...visibleColumns, key];
    setVisibleColumns(updated);
    localStorage.setItem(COLUMN_PREF_KEY, JSON.stringify(updated));
  }

  useEffect(() => {
    async function fetchRecords() {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('asset_records')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) setError(error.message);
      else setRecords(data || []);
      setLoading(false);
    }
    fetchRecords();
  }, []);

  const filtered = records.filter(r => {
    const matchesText = !filter ||
      (r.asset_id && r.asset_id.toLowerCase().includes(filter.toLowerCase())) ||
      (r.type && r.type.toLowerCase().includes(filter.toLowerCase())) ||
      (r.user && r.user.toLowerCase().includes(filter.toLowerCase())) ||
      (r.location && r.location.toLowerCase().includes(filter.toLowerCase())) ||
      (r.notes && r.notes.toLowerCase().includes(filter.toLowerCase()));
    const matchesDate = (!dateFrom || new Date(r.created_at) >= new Date(dateFrom)) &&
      (!dateTo || new Date(r.created_at) <= new Date(dateTo));
    return matchesText && matchesDate;
  });

  // Bulk selection handlers
  function toggleSelectAll() {
    if (selected.length === filtered.length) setSelected([]);
    else setSelected(filtered.map(r => r.id));
  }
  function toggleSelectRow(id) {
    setSelected(selected.includes(id) ? selected.filter(sid => sid !== id) : [...selected, id]);
  }

  // Bulk export selected
  function downloadSelectedCSV() {
    const selectedRows = filtered.filter(r => selected.includes(r.id));
    if (!selectedRows.length) return;
    const header = Object.keys(selectedRows[0]).join(',');
    const csv = [
      header,
      ...selectedRows.map(row => Object.values(row).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'selected_asset_movements.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Bulk delete selected
  async function deleteSelected() {
    if (!selected.length) return;
    if (!window.confirm(`Delete ${selected.length} selected records? This cannot be undone.`)) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.from('asset_records').delete().in('id', selected);
    if (error) setError(error.message);
    else setRecords(records.filter(r => !selected.includes(r.id)));
    setSelected([]);
    setLoading(false);
  }

  // Export filtered records to CSV
  function downloadCSV() {
    if (!filtered.length) return;
    const header = Object.keys(filtered[0]).join(',');
    const csv = [
      header,
      ...filtered.map(row => Object.values(row).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'asset_movements.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate(-1)}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" fontWeight={800} color="primary">
            All Asset Movements
          </Typography>
        </Box>
        <IconButton onClick={() => window.location.reload()} disabled={loading}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {loading && <LinearProgress sx={{ mb: 3 }} />}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Filters and Actions */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search by asset, type, user, location, notes..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                type="date"
                label="From Date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                type="date"
                label="To Date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={downloadCSV}
                  disabled={!filtered.length}
                >
                  Export CSV
                </Button>
                <Button
                  variant="outlined"
                  color="success"
                  startIcon={<DownloadIcon />}
                  onClick={downloadSelectedCSV}
                  disabled={!selected.length}
                >
                  Export Selected
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={deleteSelected}
                  disabled={!selected.length}
                >
                  Delete Selected
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<SettingsIcon />}
                  onClick={() => setShowColumnModal(true)}
                >
                  Columns
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Column Selection Modal */}
      <Dialog open={showColumnModal} onClose={() => setShowColumnModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Show/Hide Columns</DialogTitle>
        <DialogContent>
          <Grid container spacing={1}>
            {allColumns.map(col => (
              <Grid item xs={12} sm={6} key={col.key}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={visibleColumns.includes(col.key)}
                      onChange={() => handleColumnChange(col.key)}
                    />
                  }
                  label={col.label}
                />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowColumnModal(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Results Summary */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Chip 
          label={`${filtered.length} records`} 
          color="primary" 
          variant="outlined" 
        />
        {selected.length > 0 && (
          <Chip 
            label={`${selected.length} selected`} 
            color="secondary" 
            variant="outlined" 
          />
        )}
      </Box>

      {/* Data Table */}
      <Paper variant="outlined">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selected.length === filtered.length && filtered.length > 0}
                    indeterminate={selected.length > 0 && selected.length < filtered.length}
                    onChange={toggleSelectAll}
                  />
                </TableCell>
                {allColumns.filter(col => visibleColumns.includes(col.key)).map(col => (
                  <TableCell key={col.key} sx={{ fontWeight: 600 }}>
                    {col.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(r => (
                <TableRow key={r.id} hover>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selected.includes(r.id)}
                      onChange={() => toggleSelectRow(r.id)}
                    />
                  </TableCell>
                  {allColumns.filter(col => visibleColumns.includes(col.key)).map(col => (
                    <TableCell key={col.key}>
                      {col.key === 'created_at' && r[col.key] 
                        ? new Date(r[col.key]).toLocaleString() 
                        : r[col.key] || '-'
                      }
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {filtered.length === 0 && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No movement records found.
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
} 