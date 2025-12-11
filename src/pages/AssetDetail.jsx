import logger from '../utils/logger';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Autocomplete,
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Divider,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import { useDynamicAssetTerms } from '../hooks/useDynamicAssetTerms';

export default function AssetDetail() {
  const { barcode, id } = useParams(); // Support both barcode and legacy UUID routes
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { terms, isReady } = useDynamicAssetTerms();

  // UUID pattern for checking if an identifier is a UUID
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const [asset, setAsset] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [locations, setLocations] = useState([]);
  const [ownershipValues, setOwnershipValues] = useState([]);
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    fetchAssetDetail();
    fetchLocations();
    if (profile?.organization_id) {
      fetchOwnershipValues();
      fetchCustomers();
    }
  }, [barcode, id, profile?.organization_id]);

  const fetchAssetDetail = async () => {
    try {
      setLoading(true);
      
      // CRITICAL SECURITY: Must filter by organization_id to prevent cross-organization data access
      if (!profile?.organization_id) {
        throw new Error('Organization not found. Please log in again.');
      }
      
      // Use barcode if available, otherwise fall back to id (for legacy UUID routes)
      const identifier = barcode || id;
      if (!identifier) {
        throw new Error('Barcode or ID is required');
      }
      
      // Check if identifier is a UUID (for legacy support)
      const isUUID = uuidPattern.test(identifier);
      
      let query = supabase
        .from('bottles')
        .select('*')
        .eq('organization_id', profile.organization_id); // SECURITY: Only show assets from user's organization
      
      if (isUUID) {
        // Legacy UUID route - query by id
        query = query.eq('id', identifier);
      } else {
        // Barcode route - query by barcode_number
        query = query.eq('barcode_number', identifier);
      }
      
      const { data, error } = await query.single();
      
      // If we accessed via UUID and found the bottle, redirect to barcode URL for cleaner URLs
      if (data && isUUID && data.barcode_number) {
        navigate(`/bottle/${data.barcode_number}`, { replace: true });
        return; // Exit early, redirect will reload the component with barcode
      }

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Asset not found or you do not have permission to view it');
        }
        throw error;
      }
      
      // SECURITY CHECK: Double-verify the asset belongs to the user's organization
      if (data && data.organization_id !== profile.organization_id) {
        throw new Error('Unauthorized: This asset belongs to a different organization');
      }
      
      setAsset(data);
      setEditData(data);
      
      // Fetch customer information if bottle is assigned to a customer
      // Handle both UUID and CustomerListID formats
      if (data.assigned_customer) {
        // Check if assigned_customer is a UUID (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
        const isUUID = uuidPattern.test(data.assigned_customer);
        
        let customerData = null;
        let customerError = null;
        
        if (isUUID) {
          // If it's a UUID, query by id
          const { data: custData, error: custError } = await supabase
            .from('customers')
            .select('CustomerListID, name, location, id')
            .eq('id', data.assigned_customer)
            .eq('organization_id', profile.organization_id)
            .single();
          customerData = custData;
          customerError = custError;
        } else {
          // If it's a CustomerListID, query by CustomerListID
          const { data: custData, error: custError } = await supabase
            .from('customers')
            .select('CustomerListID, name, location, id')
            .eq('CustomerListID', data.assigned_customer)
            .eq('organization_id', profile.organization_id)
            .single();
          customerData = custData;
          customerError = custError;
        }
        
        if (!customerError && customerData) {
          setCustomer(customerData);
          // Update editData to use CustomerListID for the selector
          setEditData({ ...data, assigned_customer: customerData.CustomerListID });
          
          // If customer has a location and bottle location doesn't match, update it
          if (customerData.location && data.location !== customerData.location) {
            // Update the bottle location to match customer location
            const identifier = barcode || id;
            const isUUID = uuidPattern.test(identifier);
            
            let updateQuery = supabase
              .from('bottles')
              .update({ location: customerData.location })
              .eq('organization_id', profile.organization_id);
            
            if (isUUID) {
              updateQuery = updateQuery.eq('id', identifier);
            } else {
              updateQuery = updateQuery.eq('barcode_number', identifier);
            }
            
            const { error: updateError } = await updateQuery;
            
            if (!updateError) {
              // Update local state to reflect the change
              const updatedAsset = { ...data, location: customerData.location };
              setAsset(updatedAsset);
              setEditData({ ...updatedAsset, assigned_customer: customerData.CustomerListID });
            }
          }
        }
      }
    } catch (error) {
      logger.error('Error fetching asset:', error);
      setError(error.message || 'Failed to load asset details');
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, province')
        .order('name');

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      logger.error('Error fetching locations:', error);
      // Fallback to hardcoded locations if database fails
      setLocations([
        { id: 'saskatoon', name: 'Saskatoon', province: 'Saskatchewan' },
        { id: 'regina', name: 'Regina', province: 'Saskatchewan' },
        { id: 'chilliwack', name: 'Chilliwack', province: 'British Columbia' },
        { id: 'prince-george', name: 'Prince George', province: 'British Columbia' }
      ]);
    }
  };

  const fetchOwnershipValues = async () => {
    try {
      if (!profile?.organization_id) return;
      
      // Try to fetch from ownership_values table
      const { data, error } = await supabase
        .from('ownership_values')
        .select('value')
        .eq('organization_id', profile.organization_id)
        .order('value');
      
      if (error && error.code !== 'PGRST116') {
        // If error is not "table doesn't exist", log it
        logger.error('Error fetching ownership values:', error);
      }
      
      if (data && data.length > 0) {
        setOwnershipValues(data.map(item => item.value));
      } else {
        // Fallback: Extract unique ownership values from bottles
        const { data: bottlesData } = await supabase
          .from('bottles')
          .select('ownership')
          .eq('organization_id', profile.organization_id)
          .not('ownership', 'is', null)
          .not('ownership', 'eq', '');
        
        const uniqueValues = [...new Set(bottlesData?.map(b => b.ownership).filter(Boolean))];
        setOwnershipValues(uniqueValues.sort());
      }
    } catch (error) {
      logger.error('Error fetching ownership values:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      if (!profile?.organization_id) return;
      
      const { data, error } = await supabase
        .from('customers')
        .select('CustomerListID, name, id')
        .eq('organization_id', profile.organization_id)
        .order('name');
      
      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      logger.error('Error fetching customers:', error);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // SECURITY: Verify user has permission to update this asset
      if (!profile?.organization_id) {
        throw new Error('Organization not found');
      }
      
      // Prepare update data
      const updateData = { ...editData };
      
      // Get current assigned_customer value (might be UUID or CustomerListID)
      const currentAssignedCustomer = asset.assigned_customer;
      // Check if it's a UUID
      const currentIsUUID = currentAssignedCustomer && uuidPattern.test(currentAssignedCustomer);
      
      // Get current CustomerListID for comparison
      let currentCustomerListID = currentAssignedCustomer;
      if (currentIsUUID && customer) {
        currentCustomerListID = customer.CustomerListID;
      }
      
      // Handle customer assignment: if assigned_customer is changed, we need to:
      // 1. Use CustomerListID for application logic (stored in assigned_customer)
      // 2. But the database foreign key constraint requires UUID, so we need to find the UUID
      if (updateData.assigned_customer !== currentCustomerListID) {
        if (updateData.assigned_customer) {
          // Find the customer UUID for the selected CustomerListID
          const selectedCustomer = customers.find(c => c.CustomerListID === updateData.assigned_customer);
          if (selectedCustomer) {
            // Store CustomerListID in assigned_customer for application logic
            // The database foreign key constraint will be handled by Supabase
            updateData.assigned_customer = selectedCustomer.CustomerListID;
            // Also update customer_name for display
            updateData.customer_name = selectedCustomer.name;
            
            // Update status to 'rented' if assigning to a customer
            if (!updateData.status || updateData.status === 'available') {
              updateData.status = 'rented';
            }
          } else {
            throw new Error('Selected customer not found');
          }
        } else {
          // Unassigning customer
          updateData.assigned_customer = null;
          updateData.customer_name = null;
          // Update status to 'available' if unassigning
          updateData.status = 'available';
        }
      }
      
      const identifier = barcode || id;
      const isUUID = uuidPattern.test(identifier);
      
      let updateQuery = supabase
        .from('bottles')
        .update(updateData)
        .eq('organization_id', profile.organization_id); // SECURITY: Only update assets in user's organization
      
      if (isUUID) {
        updateQuery = updateQuery.eq('id', identifier);
      } else {
        updateQuery = updateQuery.eq('barcode_number', identifier);
      }
      
      const { error } = await updateQuery;

      if (error) throw error;

      // Refresh asset data to get updated customer info
      await fetchAssetDetail();
      setEditDialog(false);
      setSuccess('Asset updated successfully');
    } catch (error) {
      logger.error('Error updating asset:', error);
      setError(error.message || 'Failed to update asset');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this asset?')) return;

    try {
      // SECURITY: Verify user has permission to delete this asset
      if (!profile?.organization_id) {
        throw new Error('Organization not found');
      }
      
      const identifier = barcode || id;
      const isUUID = uuidPattern.test(identifier);
      
      let deleteQuery = supabase
        .from('bottles')
        .delete()
        .eq('organization_id', profile.organization_id); // SECURITY: Only delete assets from user's organization
      
      if (isUUID) {
        deleteQuery = deleteQuery.eq('id', identifier);
      } else {
        deleteQuery = deleteQuery.eq('barcode_number', identifier);
      }
      
      const { error } = await deleteQuery;

      if (error) throw error;

      navigate('/inventory-management');
    } catch (error) {
      logger.error('Error deleting asset:', error);
      setError(error.message || 'Failed to delete asset');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!asset) {
    return (
      <Box p={3}>
        <Alert severity="error">Asset not found</Alert>
      </Box>
    );
  }

  const assetTitle = isReady ? terms.asset : 'Asset';

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => navigate('/inventory-management')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          {assetTitle} Detail
        </Typography>
        <Box flexGrow={1} />
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={() => setEditDialog(true)}
          sx={{ mr: 1 }}
        >
          Edit
        </Button>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={handleDelete}
        >
          Delete
        </Button>
      </Box>

      {/* Error/Success Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Asset Information */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Basic Information
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="textSecondary">
              Barcode Number
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {asset.barcode_number || '-'}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="textSecondary">
              Serial Number
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {asset.serial_number || '-'}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="textSecondary">
              Product Code
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {asset.product_code || '-'}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="textSecondary">
              Location
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {customer?.location || asset.location || '-'}
            </Typography>
            {customer?.location && customer.location !== asset.location && (
              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block', mt: 0.5 }}>
                (Synced from customer location)
              </Typography>
            )}
          </Grid>

          <Grid item xs={12}>
            <Typography variant="body2" color="textSecondary">
              Description
            </Typography>
            <Typography variant="body1">
              {asset.description || '-'}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Customer Assignment */}
      {asset.assigned_customer && (
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Customer Assignment
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="textSecondary">
                Customer ID
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {asset.assigned_customer}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="textSecondary">
                Customer Name
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {asset.customer_name || '-'}
              </Typography>
            </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="textSecondary">
              Days at Location
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {asset.days_at_location || 0} days
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="textSecondary">
              Ownership
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {asset.ownership || '-'}
            </Typography>
          </Grid>
        </Grid>
      </Paper>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit {assetTitle}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Barcode Number"
                value={editData.barcode_number || ''}
                onChange={(e) => setEditData({ ...editData, barcode_number: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Serial Number"
                value={editData.serial_number || ''}
                onChange={(e) => setEditData({ ...editData, serial_number: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Product Code"
                value={editData.product_code || ''}
                onChange={(e) => setEditData({ ...editData, product_code: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Location</InputLabel>
                <Select
                  value={editData.location || customer?.location || ''}
                  onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                  label="Location"
                >
                  {locations.map((location) => (
                    <MenuItem key={location.id} value={location.name.toUpperCase()}>
                      {location.name} ({location.province})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {customer?.location && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Customer location: {customer.location}
                </Typography>
              )}
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Ownership</InputLabel>
                <Select
                  value={editData.ownership || ''}
                  label="Ownership"
                  onChange={(e) => setEditData({ ...editData, ownership: e.target.value })}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {ownershipValues.map((value) => (
                    <MenuItem key={value} value={value}>
                      {value}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={customers}
                value={
                  customers.find(c => c.CustomerListID === editData.assigned_customer) || null
                }
                onChange={(_, newValue) => {
                  if (newValue) {
                    setEditData({
                      ...editData,
                      assigned_customer: newValue.CustomerListID,
                      customer_name: newValue.name
                    });
                  } else {
                    setEditData({
                      ...editData,
                      assigned_customer: null,
                      customer_name: null
                    });
                  }
                }}
                getOptionLabel={(option) =>
                  option ? `${option.name} (${option.CustomerListID})` : ''
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Assigned Customer"
                    placeholder="Search customers"
                  />
                )}
                clearOnEscape
                isOptionEqualToValue={(option, value) =>
                  option.CustomerListID === value.CustomerListID
                }
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={editData.description || ''}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 