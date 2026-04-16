import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase/client';
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
  Button,
  Chip,
  Checkbox,
  CircularProgress,
  Alert,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  TextField,
  Snackbar,
  Tooltip,
  ButtonGroup,
  Stack
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  SwapHoriz as SwapHorizIcon,
  TransferWithinAStation as TransferWithinAStationIcon,
  SelectAll as SelectAllIcon,
  Deselect as DeselectIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { AssetTransferService } from '../services/assetTransferService';
import { useAuth } from '../hooks/useAuth';
import { formatLocationDisplay } from '../utils/locationDisplay';

export default function TransferFromCustomers() {
  const { id } = useParams(); // Target customer ID
  const navigate = useNavigate();
  const { organization } = useAuth();
  
  const [targetCustomer, setTargetCustomer] = useState(null);
  const [sourceCustomers, setSourceCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [availableAssets, setAvailableAssets] = useState([]);
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transferLoading, setTransferLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferReason, setTransferReason] = useState('');
  const [message, setMessage] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchData();
  }, [id, selectedCustomer]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get target customer
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('CustomerListID', id)
        .eq('organization_id', organization?.id)
        .single();

      if (customerError) throw customerError;
      setTargetCustomer(customerData);

      // Get available source customers (exclude target customer)
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('CustomerListID, name, customer_type, contact_details')
        .eq('organization_id', organization?.id)
        .neq('CustomerListID', id)
        .order('name');

      if (customersError) throw customersError;
      setSourceCustomers(customersData || []);

    } catch (error) {
      setMessage({
        open: true,
        message: `Error loading data: ${error.message}`,
        severity: 'error'
      });
    }
    setLoading(false);
  };

  const fetchCustomerAssets = async (customerId) => {
    try {
      const { data: assetsData, error: assetsError } = await supabase
        .from('bottles')
        .select('*')
        .eq('assigned_customer', customerId)
        .eq('organization_id', organization?.id);

      if (assetsError) throw assetsError;
      setAvailableAssets(assetsData || []);
      setSelectedAssets([]); // Reset selection when customer changes

    } catch (error) {
      setMessage({
        open: true,
        message: `Error loading customer assets: ${error.message}`,
        severity: 'error'
      });
    }
  };

  const handleSelectAsset = (assetId) => {
    setSelectedAssets(prev => 
      prev.includes(assetId) 
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const handleSelectAllAssets = () => {
    if (selectedAssets.length === availableAssets.length) {
      setSelectedAssets([]);
    } else {
      setSelectedAssets(availableAssets.map(asset => asset.id));
    }
  };

  const handleTransfer = async () => {
    if (selectedAssets.length === 0) {
      setMessage({
        open: true,
        message: 'Please select at least one asset to transfer',
        severity: 'warning'
      });
      return;
    }

    setTransferLoading(true);
    try {
      const result = await AssetTransferService.transferAssets(
        selectedAssets,
        selectedCustomer.CustomerListID,
        targetCustomer.CustomerListID,
        organization?.id,
        transferReason || `Transfer from ${selectedCustomer.name} to ${targetCustomer.name}`
      );

      if (result.success) {
        setMessage({
          open: true,
          message: result.message,
          severity: 'success'
        });
        
        // Refresh data
        if (selectedCustomer) {
          await fetchCustomerAssets(selectedCustomer.CustomerListID);
        }
        
        setTransferDialogOpen(false);
        setTransferReason('');
        
        // Update target customer's bottle count in parent
        navigate(`/customer/${id}`, { replace: true });
        
      } else {
        setMessage({
          open: true,
          message: result.message,
          severity: 'error'
        });
      }
    } catch (error) {
      setMessage({
        open: true,
        message: `Transfer failed: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setTransferLoading(false);
    }
  };

  // Filter assets
  const filteredAssets = availableAssets.filter(asset => {
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
    const matchesSearch = !searchTerm || 
      asset.barcode_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
        {/* Header */}
        <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, mb: 3, borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.08)', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(`/customer/${id}`)}
              variant="outlined"
              sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none', px: 4 }}
            >
              Back to Customer
            </Button>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em' }}>
              Transfer Bottles to {targetCustomer?.name}
            </Typography>
          </Box>
        </Paper>

        {/* Customer Selection */}
        <Paper elevation={0} sx={{ p: 4, mb: 3, borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
          <Typography variant="h6" fontWeight={700} color="primary" mb={3}>
            📋 Select Source Customer
          </Typography>
          
          <Autocomplete
            options={sourceCustomers}
            getOptionLabel={(option) => `${option.name} (${option.CustomerListID})`}
            renderOption={(props, option) => (
              <Box component="li" {...props}>
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    {option.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ID: {option.CustomerListID} | Type: {option.customer_type || 'CUSTOMER'}
                  </Typography>
                </Box>
              </Box>
            )}
            value={selectedCustomer}
            onChange={(event, newValue) => {
              setSelectedCustomer(newValue);
              if (newValue) {
                fetchCustomerAssets(newValue.CustomerListID);
              } else {
                setAvailableAssets([]);
                setSelectedAssets([]);
              }
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search and Select Source Customer"
                placeholder="Type customer name or ID..."
                InputProps={{
                  ...params.InputProps,
                  startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
                }}
              />
            )}
            sx={{ mb: 2 }}
          />

          {selectedCustomer && (
            <Alert severity="info">
              <Typography variant="body2">
                <strong>Selected Source:</strong> {selectedCustomer.name} ({selectedCustomer.CustomerListID})
                <br />
                <strong>Customer Type:</strong> {selectedCustomer.customer_type || 'CUSTOMER'}
                <br />
                <strong>Contact:</strong> {selectedCustomer.contact_details || 'Not provided'}
              </Typography>
            </Alert>
          )}
        </Paper>

        {/* Assets Table */}
        {selectedCustomer && (
          <Paper elevation={0} sx={{ borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" p={3}>
              <Box>
                <Typography variant="h5" fontWeight={700} color="primary">
                  🔄 Available Assets ({filteredAssets.length})
                </Typography>
              </Box>
              
              {availableAssets.length > 0 && (
                <Box display="flex" gap={1}>
                  <ButtonGroup variant="outlined" size="small">
                    <Button
                      onClick={handleSelectAllAssets}
                      startIcon={selectedAssets.length === availableAssets.length ? <DeselectIcon /> : <SelectAllIcon />}
                      sx={{ fontWeight: 700, textTransform: 'none' }}
                    >
                      {selectedAssets.length === availableAssets.length ? 'Deselect All' : 'Select All'}
                    </Button>
                    <Button
                      onClick={() => setTransferDialogOpen(true)}
                      disabled={selectedAssets.length === 0}
                      startIcon={<TransferWithinAStationIcon />}
                      color="primary"
                      variant="contained"
                      sx={{ fontWeight: 700, textTransform: 'none' }}
                    >
                      Transfer Selected ({selectedAssets.length})
                    </Button>
                  </ButtonGroup>
                </Box>
              )}
            </Box>

            {/* Filters */}
            <Box p={3} pb={0} display="flex" gap={2} alignItems="center">
              <TextField
                placeholder="Search assets"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
                inputProps={{ 'aria-label': 'Search assets' }}
                InputProps={{
                  startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
                }}
                sx={{ minWidth: 200 }}
              />
              <TextField
                select
                size="small"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                inputProps={{ 'aria-label': 'Status filter' }}
                sx={{ minWidth: 120 }}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="available">Available</MenuItem>
                <MenuItem value="rented">Rented</MenuItem>
                <MenuItem value="maintenance">Maintenance</MenuItem>
              </TextField>
              
              {statusFilter !== 'all' && (
                <Button
                  size="small"
                  onClick={() => setStatusFilter('all')}
                  variant="outlined"
                  sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none' }}
                >
                  Clear Filter
                </Button>
              )}
            </Box>

            <TableContainer sx={{ borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={selectedAssets.length > 0 && selectedAssets.length < availableAssets.length}
                        checked={availableAssets.length > 0 && selectedAssets.length === availableAssets.length}
                        onChange={handleSelectAllAssets}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Barcode</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Serial Number</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Type/Description</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Last Audited</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAssets.map((asset) => (
                    <TableRow key={asset.id} hover selected={selectedAssets.includes(asset.id)}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedAssets.includes(asset.id)}
                          onChange={() => handleSelectAsset(asset.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {asset.barcode_number || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>{asset.serial_number || 'N/A'}</TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {asset.description || asset.type || 'No description'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={asset.location ? formatLocationDisplay(asset.location) : 'Unknown'} 
                          color="default" 
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={asset.status || 'Unknown'} 
                          color={asset.status === 'rented' ? 'success' : 'warning' }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {asset.last_audited ? new Date(asset.last_audited).toLocaleDateString() : 'Never'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {filteredAssets.length === 0 && (
              <Box p={6} textAlign="center">
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No assets found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {searchTerm ? 'Try adjusting your search terms' : `${selectedCustomer.name} doesn't have any bottles assigned`}
                </Typography>
              </Box>
            )}
          </Paper>
        )}

        {/* Transfer Confirmation Dialog */}
        <Dialog open={transferDialogOpen} onClose={() => setTransferDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={1}>
              <TransferWithinAStationIcon color="primary" />
              Confirm Transfer
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Transfer {selectedAssets.length} selected asset(s):
              </Typography>
              
              <Typography variant="body1" fontWeight={600} sx={{ mb: 2 }}>
                FROM: {selectedCustomer?.name} ({selectedCustomer?.CustomerListID})
              </Typography>
              <Typography variant="body1" fontWeight={600} sx={{ mb: 2 }}>
                TO: {targetCustomer?.name} ({targetCustomer?.CustomerListID})
              </Typography>
              
              <TextField
                label="Transfer Reason (Optional)"
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                fullWidth
                multiline
                rows={3}
                placeholder="Enter reason for transfer..."
                margin="normal"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTransferDialogOpen(false)} disabled={transferLoading}>
              Cancel
            </Button>
            <Button 
              onClick={handleTransfer}
              variant="contained"
              disabled={transferLoading}
              startIcon={transferLoading ? <CircularProgress size={16} /> : <TransferWithinAStationIcon />}
            >
              {transferLoading ? 'Transferring...' : `Transfer ${selectedAssets.length} Assets`}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Status Messages */}
        <Snackbar
          open={message.open}
          autoHideDuration={6000}
          onClose={() => setMessage({ ...message, open: false })}
        >
          <Alert 
            onClose={() => setMessage({ ...message, open: false })}
            severity={message.severity}
            sx={{ width: '100%' }}
          >
            {message.message}
          </Alert>
        </Snackbar>
    </Box>
  );
}
