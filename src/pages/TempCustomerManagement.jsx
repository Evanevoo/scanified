import logger from '../utils/logger';
import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Button, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Autocomplete, Alert, CircularProgress, Grid, Card, CardContent,
  FormControl, InputLabel, Select, MenuItem, Checkbox, IconButton
} from '@mui/material';
import {
  SwapHoriz as ReassignIcon,
  Person as PersonIcon,
  Home as HomeIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { TemporaryCustomerService } from '../services/temporaryCustomerService';
import { supabase } from '../supabase/client';

export default function TempCustomerManagement() {
  const { organization } = useAuth();
  const [tempItems, setTempItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Reassignment dialog state
  const [reassignDialog, setReassignDialog] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerOptions, setCustomerOptions] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [reassigning, setReassigning] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalItems: 0,
    needsReassignment: 0
  });

  useEffect(() => {
    if (organization?.id) {
      fetchTempCustomerItems();
    }
  }, [organization]);

  const fetchTempCustomerItems = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await TemporaryCustomerService.getTempCustomerItems(organization.id);
      
      if (result.success) {
        setTempItems(result.items);
        setStats({
          totalItems: result.count,
          needsReassignment: result.count
        });
      } else {
        // Provide more helpful error messages
        let errorMessage = result.message || 'Unknown error occurred';
        
        if (errorMessage.includes('customer_type')) {
          errorMessage = `Database migration required: The 'customer_type' column is missing from the customers table. Please run the database migration in Supabase SQL Editor. See TEMP_CUSTOMER_TROUBLESHOOTING.md for details.`;
        } else if (errorMessage.includes('Organization ID is required')) {
          errorMessage = `Organization not found: Please refresh the page and ensure you're logged in properly.`;
        }
        
        setError(errorMessage);
        logger.error('Temp customer service error:', result);
      }
    } catch (err) {
      logger.error('Failed to fetch temp customer items:', err);
      setError(`Failed to fetch temp customer items: ${err.message}. Check browser console for details.`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectItem = (itemId) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === tempItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(tempItems.map(item => item.id));
    }
  };

  const openReassignDialog = () => {
    if (selectedItems.length === 0) {
      setError('Please select items to reassign');
      return;
    }
    setReassignDialog(true);
    searchCustomers('');
  };

  const searchCustomers = async (searchTerm) => {
    try {
      const result = await TemporaryCustomerService.searchCustomersForReassignment(
        searchTerm, 
        organization.id
      );
      
      if (result.success) {
        setCustomerOptions(result.customers);
      }
    } catch (err) {
      logger.error('Error searching customers:', err);
    }
  };

  const handleReassign = async () => {
    if (!selectedCustomer) {
      setError('Please select a customer');
      return;
    }

    setReassigning(true);
    setError(null);
    
    try {
      const result = await TemporaryCustomerService.reassignFromTempCustomer(
        selectedItems,
        selectedCustomer.CustomerListID,
        organization.id
      );
      
      if (result.success) {
        setSuccess(result.message);
        setReassignDialog(false);
        setSelectedItems([]);
        setSelectedCustomer(null);
        setSearchTerm('');
        fetchTempCustomerItems(); // Refresh the list
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to reassign items: ' + err.message);
    } finally {
      setReassigning(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', py: 4 }}>
      <Box maxWidth="1200px" mx="auto" px={3}>
        
        {/* Header */}
        <Box display="flex" justifyContent="between" alignItems="center" mb={4}>
          <Box>
            <Typography variant="h4" fontWeight={700} color="primary" gutterBottom>
              Temp Customer Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage items assigned to walk-in customers and reassign them to proper customer accounts
            </Typography>
          </Box>
          <Button
            startIcon={<RefreshIcon />}
            onClick={fetchTempCustomerItems}
            variant="outlined"
            sx={{ ml: 2 }}
          >
            Refresh
          </Button>
        </Box>

        {/* Error/Success Messages */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {/* Stats Cards */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <WarningIcon color="warning" />
                  <Box>
                    <Typography variant="h4" fontWeight={700} color="warning.main">
                      {stats.totalItems}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Items with Temp Customer
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <PersonIcon color="primary" />
                  <Box>
                    <Typography variant="h4" fontWeight={700} color="primary">
                      {selectedItems.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Selected for Reassignment
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Action Buttons */}
        {tempItems.length > 0 && (
          <Box display="flex" gap={2} mb={3}>
            <Button
              variant="contained"
              startIcon={<ReassignIcon />}
              onClick={openReassignDialog}
              disabled={selectedItems.length === 0}
              color="primary"
            >
              Reassign Selected ({selectedItems.length})
            </Button>
            <Button
              variant="outlined"
              onClick={handleSelectAll}
            >
              {selectedItems.length === tempItems.length ? 'Deselect All' : 'Select All'}
            </Button>
          </Box>
        )}

        {/* Items Table */}
        <Paper elevation={2} sx={{ borderRadius: 2 }}>
          {tempItems.length === 0 ? (
            <Box p={6} textAlign="center">
              <HomeIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No items assigned to temp customer
              </Typography>
              <Typography variant="body2" color="text.secondary">
                All walk-in customer items have been properly assigned
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f7fa' }}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedItems.length === tempItems.length && tempItems.length > 0}
                        indeterminate={selectedItems.length > 0 && selectedItems.length < tempItems.length}
                        onChange={handleSelectAll}
                      />
                    </TableCell>
                    <TableCell>Barcode</TableCell>
                    <TableCell>Serial Number</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Ownership</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Assigned Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tempItems.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedItems.includes(item.id)}
                          onChange={() => handleSelectItem(item.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {item.barcode_number || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>{item.serial_number || 'N/A'}</TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap>
                          {item.description || 'No description'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={item.location || 'Unknown'} 
                          color="default" 
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{item.ownership || 'Not specified'}</TableCell>
                      <TableCell>
                        <Chip 
                          label="Needs Reassignment"
                          color="warning"
                          size="small"
                          icon={<WarningIcon />}
                        />
                      </TableCell>
                      <TableCell>
                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* Reassignment Dialog */}
        <Dialog open={reassignDialog} onClose={() => setReassignDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={1}>
              <ReassignIcon color="primary" />
              Reassign Items to Customer
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Reassigning {selectedItems.length} item(s) from Temp Customer to a real customer account.
            </Typography>
            
            <Autocomplete
              options={customerOptions}
              getOptionLabel={(option) => `${option.name} (${option.CustomerListID})`}
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {option.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ID: {option.CustomerListID} • Type: {option.customer_type}
                    </Typography>
                  </Box>
                </Box>
              )}
              value={selectedCustomer}
              onChange={(event, newValue) => setSelectedCustomer(newValue)}
              onInputChange={(event, newInputValue) => {
                setSearchTerm(newInputValue);
                searchCustomers(newInputValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search and Select Customer"
                  placeholder="Type customer name or ID..."
                  fullWidth
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
                  }}
                />
              )}
              loading={customerOptions.length === 0 && searchTerm.length > 0}
              noOptionsText="No customers found. Create a new customer first."
              sx={{ mb: 2 }}
            />

            {selectedCustomer && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Selected:</strong> {selectedCustomer.name} ({selectedCustomer.CustomerListID})
                  <br />
                  <strong>Type:</strong> {selectedCustomer.customer_type}
                  <br />
                  <strong>Contact:</strong> {selectedCustomer.contact_details || 'Not provided'}
                </Typography>
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setReassignDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleReassign}
              variant="contained"
              disabled={!selectedCustomer || reassigning}
              startIcon={reassigning ? <CircularProgress size={16} /> : <ReassignIcon />}
            >
              {reassigning ? 'Reassigning...' : 'Reassign Items'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}