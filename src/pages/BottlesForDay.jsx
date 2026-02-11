import logger from '../utils/logger';
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, CircularProgress, Alert, Snackbar, FormControl, InputLabel, Select, MenuItem, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { SearchInput } from '@/components/ui';
import { SearchInputWithIcon } from '@/components/ui/search-input-with-icon';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { ErrorBoundary } from 'react-error-boundary';
import { useAuth } from '../hooks/useAuth';

function BottlesForDayErrorFallback({ error, resetErrorBoundary }) {
  return (
    <Box p={3}>
      <Typography variant="h6" color="error">
        Error loading Bottles for Day page
      </Typography>
      <Typography variant="body2" color="textSecondary">
        {error?.message || 'An unknown error occurred'}
      </Typography>
      <Button 
        variant="contained" 
        onClick={resetErrorBoundary}
        sx={{ mt: 2 }}
      >
        Try Again
      </Button>
    </Box>
  );
}

function BottlesForDay({ profile }) {
  logger.log('BottlesForDay component rendering, profile:', profile);
  
  const [bottles, setBottles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [successMsg, setSuccessMsg] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [editForm, setEditForm] = useState({ fill_date: '', notes: '', fill_type: 'full' });
  const [actionLoading, setActionLoading] = useState(false);

  const navigate = useNavigate();
  const { organization, profile: authProfile } = useAuth();
  const effectiveProfile = profile || authProfile;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Format YYYY-MM-DD as local date to avoid UTC-midnight showing previous day
  const formatSelectedDate = (d) => {
    if (!d) return '';
    return new Date(d + 'T12:00:00').toLocaleDateString();
  };

  // Build start/end of selected local day in UTC for DB queries (explicit local date to avoid timezone bugs)
  const getDateRangeISO = (dateStr) => {
    const d = dateStr || new Date().toISOString().split('T')[0];
    const year = parseInt(d.slice(0, 4), 10);
    const month = parseInt(d.slice(5, 7), 10) - 1;
    const day = parseInt(d.slice(8, 10), 10);
    const start = new Date(year, month, day, 0, 0, 0, 0);
    const end = new Date(year, month, day, 23, 59, 59, 999);
    return { startISO: start.toISOString(), endISO: end.toISOString() };
  };

  // Fetch bottles for the selected day
  const fetchBottlesForDay = async (date, searchTerm = '') => {
    if (!organization?.id) return;
    
    logger.log('Fetching bottles for day:', date);
    setLoading(true);
    try {
      const today = date || new Date().toISOString().split('T')[0];
      const { startISO, endISO } = getDateRangeISO(today);
      const bottlesList = [];

      // Get all bottles from cylinder_fills table (records created by Fill Cylinder screen)
      // Use local-day boundaries in UTC so selected date matches user's timezone
      const { data: cylinderFills, error: fillsError } = await supabase
        .from('cylinder_fills')
        .select(`
          id,
          cylinder_id,
          barcode_number,
          fill_date,
          fill_timezone,
          filled_by,
          notes,
          fill_type,
          previous_status,
          previous_location,
          bottles(
            id,
            barcode_number,
            serial_number,
            product_code,
            description,
            gas_type,
            status,
            location,
            assigned_customer,
            customer_name,
            fill_count,
            last_filled_date,
            last_location_update,
            organization_id
          )
        `)
        .gte('fill_date', startISO)
        .lte('fill_date', endISO)
        .order('fill_date', { ascending: false });

      if (fillsError) {
        logger.warn('Error fetching cylinder fills:', fillsError);
      } else if (cylinderFills) {
        cylinderFills.forEach(fill => {
          const bottleData = fill.bottles;
          if (bottleData) {
            const bottle = Array.isArray(bottleData) ? bottleData[0] : bottleData;
            if (bottle && bottle.organization_id === organization.id) {
              bottlesList.push({
                ...bottle,
                fill_date: fill.fill_date,
                fill_timezone: fill.fill_timezone ?? null,
                fill_notes: fill.notes,
                filled_by: fill.filled_by,
                fill_record_id: fill.id,
                fill_type: fill.fill_type,
                fill_previous_status: fill.previous_status,
                fill_previous_location: fill.previous_location
              });
            }
          }
        });
      }

      // Also get bottles that had their last_location_update in this local day
      // (catches bottles without cylinder_fills, e.g. older app versions)
      const { data: locationUpdatedBottles, error: locationError } = await supabase
        .from('bottles')
        .select('*')
        .eq('organization_id', organization.id)
        .in('status', ['full', 'empty'])
        .gte('last_location_update', startISO)
        .lte('last_location_update', endISO);

      if (locationError) {
        logger.warn('Error fetching location updated bottles:', locationError);
      } else if (locationUpdatedBottles) {
        // Add bottles that aren't already in the list
        locationUpdatedBottles.forEach(bottle => {
          const exists = bottlesList.find(b => b.id === bottle.id);
          if (!exists) {
            bottlesList.push({
              ...bottle,
              fill_date: bottle.last_location_update
            });
          }
        });
      }

      // Apply search filter
      let filteredBottles = bottlesList;
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        filteredBottles = bottlesList.filter(bottle => 
          bottle.barcode_number?.toLowerCase().includes(searchLower) ||
          bottle.serial_number?.toLowerCase().includes(searchLower) ||
          bottle.product_code?.toLowerCase().includes(searchLower) ||
          bottle.customer_name?.toLowerCase().includes(searchLower) ||
          bottle.description?.toLowerCase().includes(searchLower) ||
          bottle.gas_type?.toLowerCase().includes(searchLower)
        );
      }

      logger.log('Bottles for day fetched successfully:', filteredBottles.length);
      setBottles(filteredBottles);
    } catch (err) {
      logger.error('Error in fetchBottlesForDay:', err);
      setError(err.message);
    }
    setLoading(false);
  };

  // Initial load and when date/search changes
  useEffect(() => {
    fetchBottlesForDay(selectedDate, debouncedSearch);
  }, [organization, selectedDate, debouncedSearch]);

  const handleSearchChange = (e) => {
    setSearchInput(e.target.value);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setDebouncedSearch('');
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  const toDatetimeLocal = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // Format fill date/time: show in scanner timezone when available, otherwise browser local
  const formatFillDate = (bottle) => {
    if (!bottle?.fill_date) return null;
    const d = new Date(bottle.fill_date);
    if (Number.isNaN(d.getTime())) return null;
    const tz = bottle.fill_timezone;
    try {
      if (tz) {
        return d.toLocaleString(undefined, { timeZone: tz, dateStyle: 'medium', timeStyle: 'short' });
      }
      return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    }
  };
  const formatFillDateTzLabel = (bottle) => {
    if (!bottle?.fill_date || !bottle?.fill_timezone) return null;
    try {
      const rtf = new Intl.DateTimeFormat(undefined, { timeZone: bottle.fill_timezone, timeZoneName: 'short' });
      const parts = rtf.formatToParts(new Date(bottle.fill_date));
      const tzPart = parts.find(p => p.type === 'timeZoneName');
      return tzPart?.value ?? bottle.fill_timezone;
    } catch {
      return bottle.fill_timezone;
    }
  };

  const handleOpenEdit = (bottle) => {
    setEditRow(bottle);
    setEditForm({
      fill_date: toDatetimeLocal(bottle.fill_date),
      notes: bottle.fill_notes || '',
      fill_type: bottle.fill_type || (bottle.status === 'empty' ? 'empty' : 'full')
    });
    setEditOpen(true);
  };

  const handleCloseEdit = () => {
    setEditOpen(false);
    setEditRow(null);
  };

  const handleSaveEdit = async () => {
    if (!editRow?.fill_record_id) return;
    setActionLoading(true);
    setError(null);
    try {
      const dt = editForm.fill_date ? new Date(editForm.fill_date).toISOString() : editRow.fill_date;
      const { error: upErr } = await supabase
        .from('cylinder_fills')
        .update({ fill_date: dt, notes: editForm.notes || null, fill_type: editForm.fill_type })
        .eq('id', editRow.fill_record_id);

      if (upErr) throw upErr;

      // If fill_type changed, update the bottle's status
      if (editForm.fill_type !== editRow.status) {
        const { error: bottleErr } = await supabase
          .from('bottles')
          .update({ status: editForm.fill_type })
          .eq('id', editRow.id)
          .eq('organization_id', organization.id);
        if (bottleErr) throw bottleErr;
      }

      setSuccessMsg('Fill updated.');
      handleCloseEdit();
      fetchBottlesForDay(selectedDate, debouncedSearch);
    } catch (err) {
      setError(err?.message || 'Failed to update fill');
    }
    setActionLoading(false);
  };

  const handleCancelFill = async (bottle) => {
    if (!bottle?.fill_record_id) return;
    const canRevert = bottle.fill_previous_status != null && bottle.fill_previous_location != null;
    const msg = canRevert
      ? 'This will remove the fill record and revert the bottle to its previous status and location. Continue?'
      : 'This will remove the fill record. The bottle status will not be reverted (older record). Continue?';
    if (!window.confirm(msg)) return;

    setActionLoading(true);
    setError(null);
    try {
      const { error: delErr } = await supabase
        .from('cylinder_fills')
        .delete()
        .eq('id', bottle.fill_record_id);

      if (delErr) throw delErr;

      if (canRevert) {
        const { error: bottleErr } = await supabase
          .from('bottles')
          .update({
            status: bottle.fill_previous_status,
            location: bottle.fill_previous_location || null,
            assigned_customer: null,
            customer_name: null,
            last_location_update: new Date().toISOString()
          })
          .eq('id', bottle.id)
          .eq('organization_id', organization.id);
        if (bottleErr) throw bottleErr;
      }

      setSuccessMsg(canRevert ? 'Fill cancelled and bottle reverted.' : 'Fill record removed.');
      fetchBottlesForDay(selectedDate, debouncedSearch);
    } catch (err) {
      setError(err?.message || 'Failed to cancel fill');
    }
    setActionLoading(false);
  };

  if (!organization?.id) return <Box p={4} textAlign="center"><CircularProgress /></Box>;
  if (loading) return <Box p={4} textAlign="center"><CircularProgress /></Box>;
  if (error) return <Box p={4} color="error.main">Error: {error}</Box>;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'var(--bg-main)', py: 8, borderRadius: 0, overflow: 'visible' }}>
      <Paper elevation={0} sx={{ width: '100%', p: { xs: 2, md: 5 }, borderRadius: 0, boxShadow: '0 2px 12px 0 rgba(16,24,40,0.04)', border: '1px solid var(--divider)', bgcolor: 'var(--bg-main)', overflow: 'visible' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h3" fontWeight={900} color="primary" sx={{ letterSpacing: -1 }}>
            Fill History
          </Typography>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/home')}
            sx={{ fontWeight: 700, borderRadius: 8, px: 3 }}
          >
            Back to Dashboard
          </Button>
        </Box>

        {/* Filters */}
        <Box sx={{ mb: 3 }}>
          <Box display="flex" gap={2} alignItems="center" mb={3} flexWrap="wrap">
            <TextField
              type="date"
              label="Select Date"
              value={selectedDate}
              onChange={handleDateChange}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 200 }}
            />
            <Box sx={{ flex: 1, width: '100%' }}>
              <SearchInputWithIcon
                placeholder="Search bottles by barcode, serial, customer..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                }}
                onClear={() => setSearchInput('')}
                className="w-full"
              />
            </Box>
          </Box>
          
          <Typography variant="body2" color="text.secondary" mb={2}>
            {searchInput.trim() 
              ? `Found ${bottles.length} bottles matching "${searchInput}"`
              : `Showing ${bottles.length} bottles processed on Fill Cylinder page for ${formatSelectedDate(selectedDate)}`
            }
            {' '}Fill times are shown in scanner timezone when available; otherwise in your local timezone.
          </Typography>
        </Box>

        {/* Bottles Table */}
        {bottles.length === 0 ? (
          <Box p={4} textAlign="center">
            <Typography variant="h6" color="text.secondary" mb={2}>
              No bottles processed on Fill Cylinder page for {formatSelectedDate(selectedDate)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try selecting a different date or check if there are any bottles scanned on the Fill Cylinder page.
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ borderRadius: 2, width: '100%', maxWidth: '100%', mb: 3 }}>
            <Table size="medium" sx={{ width: '100%' }}>
              <TableHead>
                <TableRow sx={{ background: '#fafbfc' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Barcode</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Serial Number</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Product Code</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Gas Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Fill</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Fill Count</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Fill Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bottles.map((bottle) => (
                  <TableRow key={bottle.id} sx={{ borderBottom: '1.5px solid #f0f0f0' }}>
                    <TableCell sx={{ fontWeight: 600, color: '#1976d2', cursor: 'pointer' }} onClick={() => navigate(`/assets/${bottle.id}`)}>
                      {bottle.barcode_number || 'N/A'}
                    </TableCell>
                    <TableCell>{bottle.serial_number || 'N/A'}</TableCell>
                    <TableCell>{bottle.product_code || 'N/A'}</TableCell>
                    <TableCell>{bottle.gas_type || 'N/A'}</TableCell>
                    <TableCell>
                      {bottle.customer_name ? (
                        <Typography variant="body2" sx={{ cursor: 'pointer', color: '#1976d2' }} onClick={() => bottle.customer_id && navigate(`/customer/${bottle.customer_id}`)}>
                          {bottle.customer_name}
                        </Typography>
                      ) : 'N/A'}
                    </TableCell>
                    <TableCell>{bottle.location || 'N/A'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={bottle.status || 'N/A'} 
                        size="small"
                        color={bottle.status === 'full' ? 'success' : bottle.status === 'empty' ? 'warning' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip label={bottle.fill_type || bottle.status || '—'} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} color="primary">
                        {bottle.fill_count || 0}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {bottle.fill_date ? (
                        <Box>
                          <Typography variant="body2">
                            {formatFillDate(bottle)}
                          </Typography>
                          {formatFillDateTzLabel(bottle) && (
                            <Typography variant="caption" color="text.secondary">
                              {formatFillDateTzLabel(bottle)}
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">N/A</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {bottle.fill_record_id ? (
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton size="small" onClick={() => handleOpenEdit(bottle)} title="Edit fill" disabled={actionLoading}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleCancelFill(bottle)} title="Cancel fill" disabled={actionLoading} color="error">
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">—</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Edit Fill Dialog */}
        <Dialog open={editOpen} onClose={handleCloseEdit} maxWidth="sm" fullWidth>
          <DialogTitle>Edit fill</DialogTitle>
          <DialogContent>
            {editRow && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                <TextField
                  label="Fill date & time"
                  type="datetime-local"
                  value={editForm.fill_date}
                  onChange={(e) => setEditForm((f) => ({ ...f, fill_date: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  label="Notes"
                  value={editForm.notes}
                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                  multiline
                  rows={2}
                  fullWidth
                />
                <FormControl fullWidth>
                  <InputLabel>Fill type</InputLabel>
                  <Select
                    value={editForm.fill_type}
                    label="Fill type"
                    onChange={(e) => setEditForm((f) => ({ ...f, fill_type: e.target.value }))}
                  >
                    <MenuItem value="full">Full</MenuItem>
                    <MenuItem value="empty">Empty</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseEdit}>Cancel</Button>
            <Button variant="contained" onClick={handleSaveEdit} disabled={actionLoading}>
              {actionLoading ? 'Saving…' : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Success/Error Messages */}
        <Snackbar open={!!successMsg} autoHideDuration={6000} onClose={() => setSuccessMsg('')}>
          <Alert onClose={() => setSuccessMsg('')} severity="success" sx={{ width: '100%' }}>
            {successMsg}
          </Alert>
        </Snackbar>
        
        <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
          <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        </Snackbar>
      </Paper>
    </Box>
  );
}

// Export BottlesForDay wrapped in ErrorBoundary
export default function BottlesForDayWithBoundary(props) {
  return (
    <ErrorBoundary FallbackComponent={BottlesForDayErrorFallback}>
      <BottlesForDay {...props} />
    </ErrorBoundary>
  );
}
