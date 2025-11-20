import logger from '../utils/logger';
import React, { useState, useEffect } from 'react';
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
  TablePagination,
  Link
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Business as BusinessIcon,
  FilterList as FilterListIcon,
  SwapHoriz as SwapIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';

export default function OwnershipManagement() {
  const { organization } = useAuth();
  const [ownershipValues, setOwnershipValues] = useState([]);
  const [bottles, setBottles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Filters
  const [selectedOwnership, setSelectedOwnership] = useState('');
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
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(100);

  useEffect(() => {
    if (organization) {
      loadData();
    }
  }, [organization]);

  useEffect(() => {
    setPage(0);
  }, [selectedOwnership, searchTerm]);

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

  const filteredBottles = bottles.filter(bottle => {
    const matchesOwnership = !selectedOwnership || bottle.ownership === selectedOwnership;
    const matchesSearch = !searchTerm || 
      bottle.barcode_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bottle.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bottle.product_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bottle.gas_type?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesOwnership && matchesSearch;
  });

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredBottles.length / rowsPerPage) - 1);
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [filteredBottles.length, rowsPerPage, page]);

  const paginatedBottles = filteredBottles.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleChangePage = (_event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getOwnershipStats = () => {
    const stats = {};
    bottles.forEach(bottle => {
      const ownership = bottle.ownership || 'Unassigned';
      if (!stats[ownership]) {
        stats[ownership] = 0;
      }
      stats[ownership]++;
    });
    return stats;
  };

  const ownershipStats = getOwnershipStats();

  const handleOwnershipChipClick = (value) => {
    setSelectedOwnership(prev => (prev === value ? '' : value));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box 
          display="flex" 
          justifyContent="space-between" 
          alignItems={{ xs: 'flex-start', md: 'center' }}
          flexDirection={{ xs: 'column', md: 'row' }}
          gap={2}
          mb={3}
        >
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Ownership Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage bottle ownership values and assignments
            </Typography>
          </Box>
          <Box display="flex" gap={2} flexWrap="wrap">
            <Button
              variant="outlined"
              startIcon={<SwapIcon />}
              onClick={() => setBulkChangeDialog(true)}
              disabled={selectedBottles.size === 0}
              size="small"
            >
              Change Ownership ({selectedBottles.size})
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setAddDialog(true)}
              size="small"
            >
              Add Ownership Value
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Stats Cards */}
        <Grid container spacing={2} sx={{ mb: 3, width: '100%' }}>
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Total Bottles
                </Typography>
                <Typography variant="h3" fontWeight={700}>
                  {bottles.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Ownership Values
                </Typography>
                <Typography variant="h3" fontWeight={700}>
                  {ownershipValues.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Unassigned
                </Typography>
                <Typography variant="h3" fontWeight={700}>
                  {ownershipStats['Unassigned'] || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Ownership Values Section */}
        <Paper sx={{ p: 3, mb: 3, width: '100%', boxSizing: 'border-box' }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Ownership Values
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Click a value to filter the table. Use the edit icon to rename or the delete icon to remove.
          </Typography>
          {selectedOwnership && (
            <Button
              variant="text"
              size="small"
              sx={{ mt: 1, mb: 1 }}
              onClick={() => setSelectedOwnership('')}
            >
              Clear ownership filter ({selectedOwnership})
            </Button>
          )}
          <Box display="flex" flexWrap="wrap" gap={2} mt={2}>
            {ownershipValues.map((ownership) => (
              <Box key={ownership.id || ownership.value} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={`${ownership.value} (${ownershipStats[ownership.value] || 0})`}
                  onDelete={() => {
                    setOwnershipToDelete(ownership);
                    setDeleteDialog(true);
                  }}
                  onClick={() => handleOwnershipChipClick(ownership.value)}
                  color={selectedOwnership === ownership.value ? 'primary' : 'default'}
                  variant={selectedOwnership === ownership.value ? 'filled' : 'outlined'}
                  icon={<FilterListIcon fontSize="small" />}
                  sx={{ fontSize: '1rem', py: 2.5, px: 1 }}
                />
                <IconButton
                  size="small"
                  onClick={() => {
                    setEditingOwnership({ ...ownership });
                    setEditDialog(true);
                  }}
                  aria-label={`Edit ${ownership.value}`}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
            {ownershipValues.length === 0 && (
              <Typography color="text.secondary">
                No ownership values defined. Add one to get started.
              </Typography>
            )}
          </Box>
        </Paper>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3, width: '100%', boxSizing: 'border-box' }}>
          <Grid container spacing={2} alignItems="flex-end">
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Filter by Ownership</InputLabel>
                <Select
                  value={selectedOwnership}
                  label="Filter by Ownership"
                  onChange={(e) => setSelectedOwnership(e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="Unassigned">Unassigned</MenuItem>
                  {ownershipValues.map((o) => (
                    <MenuItem key={o.id || o.value} value={o.value}>
                      {o.value} ({ownershipStats[o.value] || 0})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                size="small"
                label="Search bottles"
                placeholder="Barcode, serial, product code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary" sx={{ pb: 0.5 }}>
                Showing {paginatedBottles.length > 0 ? page * rowsPerPage + 1 : 0}
                –
                {Math.min((page + 1) * rowsPerPage, filteredBottles.length)}
                {' '}of {filteredBottles.length} bottles
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        {/* Bottles Table */}
        <Paper sx={{ overflow: 'auto', width: '100%', boxSizing: 'border-box' }}>
          <TableContainer sx={{ maxHeight: 'calc(100vh - 500px)' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" sx={{ width: 48, fontWeight: 600, px: 1 }}>
                    <Checkbox
                      checked={
                        paginatedBottles.length > 0 &&
                        paginatedBottles.every(bottle => selectedBottles.has(bottle.id))
                      }
                      indeterminate={
                        paginatedBottles.some(bottle => selectedBottles.has(bottle.id)) &&
                        !paginatedBottles.every(bottle => selectedBottles.has(bottle.id))
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          const newSelected = new Set(selectedBottles);
                          paginatedBottles.forEach(bottle => newSelected.add(bottle.id));
                          setSelectedBottles(newSelected);
                        } else {
                          const newSelected = new Set(selectedBottles);
                          paginatedBottles.forEach(bottle => newSelected.delete(bottle.id));
                          setSelectedBottles(newSelected);
                        }
                      }}
                      size="small"
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', px: 2 }}>Barcode</TableCell>
                  <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', px: 2 }}>Serial Number</TableCell>
                  <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', px: 2 }}>Product Code</TableCell>
                  <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', px: 2 }}>Gas Type</TableCell>
                  <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', px: 2 }}>Ownership</TableCell>
                  <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', px: 2 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', px: 2 }}>Location</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedBottles.map((bottle) => (
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
                    <TableCell sx={{ whiteSpace: 'nowrap', px: 2 }}>
                      {bottle.barcode_number ? (
                        <Link
                          component={RouterLink}
                          to={`/bottle/${bottle.id}`}
                          underline="hover"
                          sx={{ fontWeight: 600 }}
                        >
                          {bottle.barcode_number}
                        </Link>
                      ) : (
                        '-'
                      )}
                    </TableCell>
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
                      <Chip
                        label={bottle.status || 'available'}
                        size="small"
                        color={bottle.status === 'available' ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', px: 2 }}>{bottle.location || '-'}</TableCell>
                  </TableRow>
                ))}
                {filteredBottles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        No bottles found
                        {searchTerm && ` for search "${searchTerm}"`}
                        {selectedOwnership && ` in ownership "${selectedOwnership}"`}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={filteredBottles.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[25, 50, 100]}
            labelRowsPerPage="Bottles per page"
          />
        </Paper>

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

