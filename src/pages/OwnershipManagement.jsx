import logger from '../utils/logger';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  Grid,
  Card,
  CardContent,
  TablePagination
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  SwapHoriz as SwapIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';
import { formatLocationDisplay } from '../utils/locationDisplay';

/** Aligns with Assets.jsx: legacy "available" / "filled" count as full for fill-level filtering. */
function isCustomerOwned(ownership) {
  const value = (ownership || '').toString().trim().toLowerCase();
  return value.includes('customer') && value.includes('own');
}

function normalizeFillStatus(status, ownership) {
  if (isCustomerOwned(ownership)) return 'na';
  const value = (status || '').toString().trim().toLowerCase();
  if (!value) return 'full';
  if (value === 'empty') return 'empty';
  if (['full', 'filled', 'available'].includes(value)) return 'full';
  return 'other';
}

function bottleFillChipProps(status, ownership) {
  const fill = normalizeFillStatus(status, ownership);
  const raw = (status || '').toString().trim();
  const label =
    fill === 'na'
      ? 'N/A'
      : fill === 'full'
      ? 'Full'
      : fill === 'empty'
        ? 'Empty'
        : raw
          ? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
          : '—';
  const color = fill === 'full' ? 'success' : fill === 'empty' ? 'warning' : 'default';
  return { label, color };
}

export default function OwnershipManagement() {
  const { organization } = useAuth();
  const [ownershipValues, setOwnershipValues] = useState([]);
  const [bottles, setBottles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Filters
  const [selectedOwnership, setSelectedOwnership] = useState('');
  const [fillFilter, setFillFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialogs
  const [addDialog, setAddDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [bulkChangeDialog, setBulkChangeDialog] = useState(false);
  
  // Form states
  const [newOwnership, setNewOwnership] = useState('');
  const [editingOwnership, setEditingOwnership] = useState(null);
  const [ownershipToDelete, setOwnershipToDelete] = useState(null);
  const [selectedBottles, setSelectedBottles] = useState(new Set());
  const [bulkChangeFrom, setBulkChangeFrom] = useState('');
  const [bulkChangeTo, setBulkChangeTo] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(100);

  useEffect(() => {
    if (organization) {
      loadData();
    }
  }, [organization]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim().toLowerCase());
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(0);
  }, [selectedOwnership, fillFilter, debouncedSearchTerm, rowsPerPage]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Load bottles
      const { data: bottlesData, error: bottlesError } = await supabase
        .from('bottles')
        .select('id, barcode_number, serial_number, product_code, gas_type, ownership, status, location, customer_name')
        .eq('organization_id', organization.id)
        .order('barcode_number');
      
      if (bottlesError) throw bottlesError;
      
      setBottles(bottlesData || []);
      
      // Load ownership values
      await loadOwnershipValues();
    } catch (err) {
      logger.error('Error loading data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadOwnershipValues = async () => {
    try {
      // First, try to load from ownership_values table
      const { data: ownershipData, error: ownershipError } = await supabase
        .from('ownership_values')
        .select('*')
        .eq('organization_id', organization.id)
        .order('value');
      
      if (ownershipError && ownershipError.code !== 'PGRST116') {
        // If error is not "table doesn't exist", throw it
        logger.error('Error loading ownership values:', ownershipError);
      }
      
      if (ownershipData && ownershipData.length > 0) {
        setOwnershipValues(ownershipData);
      } else {
        // Fallback: Extract unique ownership values from bottles
        const { data: bottlesData } = await supabase
          .from('bottles')
          .select('ownership')
          .eq('organization_id', organization.id)
          .not('ownership', 'is', null)
          .not('ownership', 'eq', '');
        
        const uniqueValues = [...new Set(bottlesData?.map(b => b.ownership).filter(Boolean))];
        const ownershipObjects = uniqueValues.map(value => ({
          value,
          organization_id: organization.id
        }));
        
        setOwnershipValues(ownershipObjects);
        
        // Try to save them to the table
        if (uniqueValues.length > 0) {
          await syncOwnershipValues(uniqueValues);
        }
      }
    } catch (err) {
      logger.error('Error loading ownership values:', err);
    }
  };

  const syncOwnershipValues = async (values) => {
    try {
      const ownershipRecords = values.map(value => ({
        organization_id: organization.id,
        value: value
      }));
      
      const { error } = await supabase
        .from('ownership_values')
        .upsert(ownershipRecords, { 
          onConflict: 'organization_id,value',
          ignoreDuplicates: true 
        });
      
      if (error && error.code !== 'PGRST116') {
        logger.error('Error syncing ownership values:', error);
      }
    } catch (err) {
      logger.error('Error in syncOwnershipValues:', err);
    }
  };

  const handleAddOwnership = async () => {
    if (!newOwnership.trim()) {
      showSnackbar('Please enter an ownership value', 'error');
      return;
    }
    
    // Check for duplicates
    if (ownershipValues.some(o => o.value.toLowerCase() === newOwnership.trim().toLowerCase())) {
      showSnackbar('This ownership value already exists', 'error');
      return;
    }
    
    try {
      const newRecord = {
        organization_id: organization.id,
        value: newOwnership.trim()
      };
      
      const { data, error } = await supabase
        .from('ownership_values')
        .insert([newRecord])
        .select();
      
      if (error) throw error;
      
      setOwnershipValues([...ownershipValues, data[0]]);
      setNewOwnership('');
      setAddDialog(false);
      showSnackbar('Ownership value added successfully', 'success');
    } catch (err) {
      logger.error('Error adding ownership:', err);
      showSnackbar('Error adding ownership value: ' + err.message, 'error');
    }
  };

  const handleEditOwnership = async () => {
    if (!editingOwnership?.value.trim()) {
      showSnackbar('Please enter an ownership value', 'error');
      return;
    }
    
    try {
      const { error: updateError } = await supabase
        .from('ownership_values')
        .update({ value: editingOwnership.value.trim() })
        .eq('id', editingOwnership.id);
      
      if (updateError) throw updateError;
      
      // Also update all bottles with the old value
      const oldValue = ownershipValues.find(o => o.id === editingOwnership.id)?.value;
      if (oldValue) {
        const { error: bottlesError } = await supabase
          .from('bottles')
          .update({ ownership: editingOwnership.value.trim() })
          .eq('organization_id', organization.id)
          .eq('ownership', oldValue);
        
        if (bottlesError) logger.error('Error updating bottles:', bottlesError);
      }
      
      setOwnershipValues(ownershipValues.map(o => 
        o.id === editingOwnership.id ? editingOwnership : o
      ));
      setEditDialog(false);
      setEditingOwnership(null);
      showSnackbar('Ownership value updated successfully', 'success');
      loadData(); // Reload to reflect changes
    } catch (err) {
      logger.error('Error editing ownership:', err);
      showSnackbar('Error updating ownership value: ' + err.message, 'error');
    }
  };

  const handleDeleteOwnership = async () => {
    try {
      // Check if any bottles use this ownership
      const bottlesWithOwnership = bottles.filter(
        b => b.ownership === ownershipToDelete.value
      );
      
      if (bottlesWithOwnership.length > 0) {
        showSnackbar(
          `Cannot delete: ${bottlesWithOwnership.length} bottle(s) use this ownership value`,
          'error'
        );
        return;
      }
      
      const { error } = await supabase
        .from('ownership_values')
        .delete()
        .eq('id', ownershipToDelete.id);
      
      if (error) throw error;
      
      setOwnershipValues(ownershipValues.filter(o => o.id !== ownershipToDelete.id));
      setDeleteDialog(false);
      setOwnershipToDelete(null);
      showSnackbar('Ownership value deleted successfully', 'success');
    } catch (err) {
      logger.error('Error deleting ownership:', err);
      showSnackbar('Error deleting ownership value: ' + err.message, 'error');
    }
  };

  const handleBulkChangeOwnership = async () => {
    if (!bulkChangeTo) {
      showSnackbar('Please select a new ownership value', 'error');
      return;
    }
    
    try {
      const bottleIds = Array.from(selectedBottles);
      
      const { error } = await supabase
        .from('bottles')
        .update({ ownership: bulkChangeTo })
        .in('id', bottleIds);
      
      if (error) throw error;
      
      setBulkChangeDialog(false);
      setSelectedBottles(new Set());
      showSnackbar(`Successfully updated ownership for ${bottleIds.length} bottle(s)`, 'success');
      loadData(); // Reload to reflect changes
    } catch (err) {
      logger.error('Error bulk changing ownership:', err);
      showSnackbar('Error updating ownership: ' + err.message, 'error');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const filteredBottles = useMemo(() => {
    return bottles.filter((bottle) => {
      const ownershipValue = bottle.ownership || 'Unassigned';
      const matchesOwnership = !selectedOwnership || ownershipValue === selectedOwnership;

      const fill = normalizeFillStatus(bottle.status, bottle.ownership);
      const matchesFill = !fillFilter || fill === fillFilter;

      const matchesSearch = !debouncedSearchTerm ||
        bottle.barcode_number?.toLowerCase().includes(debouncedSearchTerm) ||
        bottle.serial_number?.toLowerCase().includes(debouncedSearchTerm) ||
        bottle.product_code?.toLowerCase().includes(debouncedSearchTerm) ||
        bottle.gas_type?.toLowerCase().includes(debouncedSearchTerm) ||
        (fill === 'na' && 'n/a'.includes(debouncedSearchTerm));

      return matchesOwnership && matchesFill && matchesSearch;
    });
  }, [bottles, selectedOwnership, fillFilter, debouncedSearchTerm]);

  const ownershipStats = useMemo(() => {
    const stats = {};
    bottles.forEach((bottle) => {
      const ownership = bottle.ownership || 'Unassigned';
      if (!stats[ownership]) {
        stats[ownership] = 0;
      }
      stats[ownership]++;
    });
    return stats;
  }, [bottles]);

  const paginatedBottles = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredBottles.slice(start, start + rowsPerPage);
  }, [filteredBottles, page, rowsPerPage]);

  const allVisibleSelected = paginatedBottles.length > 0 && paginatedBottles.every((b) => selectedBottles.has(b.id));
  const someVisibleSelected = paginatedBottles.some((b) => selectedBottles.has(b.id));

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
        {/* Header */}
        <Paper elevation={0} sx={{ p: { xs: 2, md: 2.25 }, mb: 2, borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' }}>
          <Box display="flex" justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} flexDirection={{ xs: 'column', md: 'row' }} gap={1.5}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em' }}>
              Ownership Management
            </Typography>
            <Box display="flex" gap={2} flexWrap="wrap">
              <Button
                variant="outlined"
                startIcon={<SwapIcon />}
                onClick={() => setBulkChangeDialog(true)}
                disabled={selectedBottles.size === 0}
                size="small"
                sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none' }}
              >
                Change Ownership ({selectedBottles.size})
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setAddDialog(true)}
                size="small"
                sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none' }}
              >
                Add Ownership Value
              </Button>
            </Box>
          </Box>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Stats Cards */}
        <Grid container spacing={1.5} sx={{ mb: 2, width: '100%' }}>
          <Grid item xs={12} sm={6} md={4}>
            <Card elevation={0} sx={{ height: '100%', borderRadius: 2, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
              <CardContent sx={{ py: 1.25, px: 1.75, '&:last-child': { pb: 1.25 } }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.02em', display: 'block', mb: 0.25 }}>
                  Total Bottles
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                  {bottles.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card elevation={0} sx={{ height: '100%', borderRadius: 2, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
              <CardContent sx={{ py: 1.25, px: 1.75, '&:last-child': { pb: 1.25 } }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.02em', display: 'block', mb: 0.25 }}>
                  Ownership Values
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                  {ownershipValues.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card elevation={0} sx={{ height: '100%', borderRadius: 2, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
              <CardContent sx={{ py: 1.25, px: 1.75, '&:last-child': { pb: 1.25 } }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.02em', display: 'block', mb: 0.25 }}>
                  Unassigned
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                  {ownershipStats['Unassigned'] || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Ownership Values Section */}
        <Paper elevation={0} sx={{ p: { xs: 1.75, md: 2 }, mb: 2, width: '100%', boxSizing: 'border-box', borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
            Ownership Values
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={2} mt={2}>
            {ownershipValues.map((ownership) => (
              <Chip
                key={ownership.id || ownership.value}
                label={`${ownership.value} (${ownershipStats[ownership.value] || 0})`}
                onDelete={() => {
                  setOwnershipToDelete(ownership);
                  setDeleteDialog(true);
                }}
                onClick={() => {
                  setEditingOwnership({ ...ownership });
                  setEditDialog(true);
                }}
                sx={{ fontSize: '1rem', py: 2.5, px: 1 }}
              />
            ))}
            {ownershipValues.length === 0 && (
              <Typography color="text.secondary">
                No ownership values defined. Add one to get started.
              </Typography>
            )}
          </Box>
        </Paper>

        {/* Filters */}
        <Paper elevation={0} sx={{ p: { xs: 1.75, md: 2 }, mb: 2, width: '100%', boxSizing: 'border-box', borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', lg: 'row' },
              alignItems: { xs: 'stretch', lg: 'center' },
              gap: 2,
              flexWrap: 'wrap',
            }}
          >
            <TextField
              select
              size="small"
              value={selectedOwnership}
              onChange={(e) => setSelectedOwnership(e.target.value)}
              inputProps={{ 'aria-label': 'Filter by ownership' }}
              sx={{ width: { xs: '100%', sm: 220 }, flexShrink: 0 }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="Unassigned">Unassigned</MenuItem>
              {ownershipValues.map((o) => (
                <MenuItem key={o.id || o.value} value={o.value}>
                  {o.value} ({ownershipStats[o.value] || 0})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              value={fillFilter}
              onChange={(e) => setFillFilter(e.target.value)}
              inputProps={{ 'aria-label': 'Fill filter' }}
              sx={{ width: { xs: '100%', sm: 160 }, flexShrink: 0 }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="full">Full</MenuItem>
              <MenuItem value="empty">Empty</MenuItem>
              <MenuItem value="na">N/A (Customer Owned)</MenuItem>
            </TextField>
            <TextField
              size="small"
              placeholder="Search bottles — barcode, serial, product code…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              inputProps={{ 'aria-label': 'Search bottles' }}
              sx={{
                flex: { lg: '1 1 220px' },
                width: { xs: '100%', lg: 'auto' },
                minWidth: { lg: 200 },
              }}
            />
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                width: { xs: '100%', lg: 'auto' },
                ml: { lg: 'auto' },
                flexShrink: 0,
                alignSelf: { xs: 'flex-start', lg: 'center' },
                lineHeight: { lg: '40px' },
              }}
            >
              Showing {filteredBottles.length} of {bottles.length} bottles
            </Typography>
          </Box>
        </Paper>

        {/* Bottles Table */}
        <TableContainer sx={{ maxHeight: 'calc(100dvh - 220px)', borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                  <TableCell padding="checkbox" sx={{ width: 48, fontWeight: 600, px: 1 }}>
                    <Checkbox
                      checked={allVisibleSelected}
                      indeterminate={someVisibleSelected && !allVisibleSelected}
                      onChange={(e) => {
                        const visibleIds = paginatedBottles.map((b) => b.id);
                        const newSelected = new Set(selectedBottles);

                        if (e.target.checked) {
                          visibleIds.forEach((id) => newSelected.add(id));
                        } else {
                          visibleIds.forEach((id) => newSelected.delete(id));
                        }

                        setSelectedBottles(newSelected);
                      }}
                      size="small"
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', px: 2 }}>Barcode</TableCell>
                  <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', px: 2 }}>Serial Number</TableCell>
                  <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', px: 2 }}>Product Code</TableCell>
                  <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', px: 2 }}>Gas Type</TableCell>
                  <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', px: 2 }}>Ownership</TableCell>
                  <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', px: 2 }}>Fill</TableCell>
                  <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', px: 2 }}>Location</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedBottles.map((bottle) => {
                  const fillChip = bottleFillChipProps(bottle.status, bottle.ownership);
                  return (
                  <TableRow key={bottle.id} hover>
                    <TableCell padding="checkbox" sx={{ width: 48, px: 1 }}>
                      <Checkbox
                        checked={selectedBottles.has(bottle.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedBottles);
                          if (e.target.checked) {
                            newSelected.add(bottle.id);
                          } else {
                            newSelected.delete(bottle.id);
                          }
                          setSelectedBottles(newSelected);
                        }}
                        size="small"
                      />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', px: 2 }}>{bottle.barcode_number || '-'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', px: 2 }}>{bottle.serial_number || '-'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', px: 2 }}>{bottle.product_code || '-'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', px: 2 }}>{bottle.gas_type || '-'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', px: 2 }}>
                      <Chip
                        label={bottle.ownership || 'Unassigned'}
                        size="small"
                        color={bottle.ownership ? 'primary' : 'default'}
                      />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', px: 2 }}>
                      <Chip label={fillChip.label} color={fillChip.color} size="small" />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', px: 2 }}>{bottle.location ? formatLocationDisplay(bottle.location) : '-'}</TableCell>
                  </TableRow>
                  );
                })}
                {filteredBottles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        No bottles found
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={filteredBottles.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(parseInt(event.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[25, 50, 100, 250]}
            />
        </TableContainer>

        {/* Add Ownership Dialog */}
        <Dialog open={addDialog} onClose={() => setAddDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add Ownership Value</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Ownership Value"
              value={newOwnership}
              onChange={(e) => setNewOwnership(e.target.value)}
              placeholder="e.g., WeldCor, RP&G, Customer Owned"
              sx={{ mt: 2 }}
              autoFocus
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddOwnership} variant="contained">
              Add
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Ownership Dialog */}
        <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Edit Ownership Value</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Ownership Value"
              value={editingOwnership?.value || ''}
              onChange={(e) => setEditingOwnership({ ...editingOwnership, value: e.target.value })}
              sx={{ mt: 2 }}
              autoFocus
            />
            <Alert severity="warning" sx={{ mt: 2 }}>
              This will update all bottles ({ownershipStats[ownershipValues.find(o => o.id === editingOwnership?.id)?.value] || 0}) that use this ownership value.
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialog(false)}>Cancel</Button>
            <Button onClick={handleEditOwnership} variant="contained">
              Update
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Ownership Dialog */}
        <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Delete Ownership Value</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete "{ownershipToDelete?.value}"?
            </Typography>
            {ownershipStats[ownershipToDelete?.value] > 0 && (
              <Alert severity="error" sx={{ mt: 2 }}>
                Cannot delete: {ownershipStats[ownershipToDelete?.value]} bottle(s) use this ownership value.
                Please reassign them first.
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleDeleteOwnership} 
              color="error" 
              variant="contained"
              disabled={ownershipStats[ownershipToDelete?.value] > 0}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Bulk Change Ownership Dialog */}
        <Dialog open={bulkChangeDialog} onClose={() => setBulkChangeDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Change Ownership for {selectedBottles.size} Bottle(s)</DialogTitle>
          <DialogContent>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>New Ownership</InputLabel>
              <Select
                value={bulkChangeTo}
                label="New Ownership"
                onChange={(e) => setBulkChangeTo(e.target.value)}
              >
                {ownershipValues.map((o) => (
                  <MenuItem key={o.id || o.value} value={o.value}>
                    {o.value}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBulkChangeDialog(false)}>Cancel</Button>
            <Button onClick={handleBulkChangeOwnership} variant="contained">
              Update
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert 
            onClose={() => setSnackbar({ ...snackbar, open: false })} 
            severity={snackbar.severity}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
    </Box>
  );
}

