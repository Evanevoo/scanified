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
  Divider,
  TextField,
  CircularProgress,
  Alert,
  FormControl,
  Select,
  MenuItem,
  Card,
  CardContent,
  InputLabel,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  Snackbar,
  ButtonGroup,
  Tooltip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HomeIcon from '@mui/icons-material/Home';
import TransferWithinAStationIcon from '@mui/icons-material/TransferWithinAStation';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import DeselectIcon from '@mui/icons-material/Deselect';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import FilterListIcon from '@mui/icons-material/FilterList';
import HistoryIcon from '@mui/icons-material/History';
import SpeedIcon from '@mui/icons-material/Speed';
import { TableSkeleton, CardSkeleton } from '../components/SmoothLoading';
import { AssetTransferService } from '../services/assetTransferService';
import { useAuth } from '../hooks/useAuth';

// Helper to check if a string looks like an address
function looksLikeAddress(str) {
  if (!str) return false;
  // Heuristic: contains a comma and a number
  return /\d/.test(str) && str.includes(',');
}

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { organization } = useAuth();
  const [customer, setCustomer] = useState(null);
  const [customerAssets, setCustomerAssets] = useState([]);
  const [locationAssets, setLocationAssets] = useState([]);
  const [bottleSummary, setBottleSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Transfer functionality state
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [availableCustomers, setAvailableCustomers] = useState([]);
  const [targetCustomer, setTargetCustomer] = useState(null);
  const [transferReason, setTransferReason] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferMessage, setTransferMessage] = useState({ open: false, message: '', severity: 'success' });
  
  // Enhanced transfer features state
  const [showTransferHistory, setShowTransferHistory] = useState(false);
  const [transferHistory, setTransferHistory] = useState([]);
  const [locationFilter, setLocationFilter] = useState('all');
  const [quickTransferDialogOpen, setQuickTransferDialogOpen] = useState(false);
  const [recentCustomers, setRecentCustomers] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // First, check if there are multiple customers with this ID
        const { data: allCustomers, error: checkError } = await supabase
          .from('customers')
          .select('*')
          .eq('CustomerListID', id);
        
        if (checkError) throw checkError;
        
        if (!allCustomers || allCustomers.length === 0) {
          setError(`Customer with ID "${id}" not found.`);
          setLoading(false);
          return;
        }
        
        if (allCustomers.length > 1) {
          setError(`Multiple customers found with ID "${id}". This indicates a data integrity issue. Please contact support.`);
          setLoading(false);
          return;
        }
        
        // We have exactly one customer
        const customerData = allCustomers[0];
        setCustomer(customerData);
        setEditForm(customerData);
        
        const { data: customerAssetsData, error: customerAssetsError } = await supabase
          .from('bottles')
          .select('*')
          .eq('assigned_customer', id);
        if (customerAssetsError) throw customerAssetsError;
        setCustomerAssets(customerAssetsData || []);
        
        // Calculate bottle summary by type
        const summary = {};
        (customerAssetsData || []).forEach(bottle => {
          const type = bottle.type || bottle.description || 'Unknown';
          summary[type] = (summary[type] || 0) + 1;
        });
        setBottleSummary(summary);
        
        const { data: rentalData, error: rentalError } = await supabase
          .from('rentals')
          .select('*')
          .eq('customer_id', id);
        if (rentalError) throw rentalError;
        setLocationAssets(rentalData || []);
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  // Enhanced transfer functionality functions
  const handleSelectAsset = (assetId) => {
    setSelectedAssets(prev => 
      prev.includes(assetId) 
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  // Load recent customers for quick transfer
  const loadRecentCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('CustomerListID, name, customer_type, contact_details')
        .eq('organization_id', organization?.id || customer?.organization_id)
        .neq('CustomerListID', customer?.CustomerListID)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentCustomers(data || []);
    } catch (error) {
      console.error('Error loading recent customers:', error);
    }
  };

  // Transfer assets to warehouse (remove assignment)
  const handleTransferToWarehouse = async () => {
    if (selectedAssets.length === 0) {
      setTransferMessage({
        open: true,
        message: 'Please select at least one asset to transfer to warehouse',
        severity: 'warning'
      });
      return;
    }

    setTransferLoading(true);
    try {
      const { data: updatedAssets, error: updateError } = await supabase
        .from('bottles')
        .update({
          assigned_customer: null,
          customer_name: null,
          status: 'available',
          updated_at: new Date().toISOString()
        })
        .in('id', selectedAssets)
        .eq('organization_id', organization?.id || customer?.organization_id)
        .select();

      if (updateError) throw updateError;

      setTransferMessage({
        open: true,
        message: `Successfully transferred ${updatedAssets.length} asset(s) to warehouse`,
        severity: 'success'
      });

      // Refresh data
      const { data: customerAssetsData, error: customerAssetsError } = await supabase
        .from('bottles')
        .select('*')
        .eq('assigned_customer', id);

      if (!customerAssetsError) {
        setCustomerAssets(customerAssetsData || []);
        
        // Recalculate bottle summary
        const summary = {};
        (customerAssetsData || []).forEach(bottle => {
          const type = bottle.type || bottle.description || 'Unknown';
          summary[type] = (summary[type] || 0) + 1;
        });
        setBottleSummary(summary);
      }

      setSelectedAssets([]);
    } catch (error) {
      setTransferMessage({
        open: true,
        message: `Transfer to warehouse failed: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setTransferLoading(false);
    }
  };

  // Load transfer history
  const loadTransferHistory = async () => {
    try {
      // For now, we'll create a simple audit trail from bottle updates
      // In a real implementation, you'd have a dedicated transfers table
      const { data, error } = await supabase
        .from('bottles')
        .select('*')
        .eq('organization_id', organization?.id || customer?.organization_id)
        .not('assigned_customer', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      // This is a simplified version - in production you'd have proper transfer audit logs
      const recentTransfers = (data || []).map(bottle => ({
        id: bottle.id,
        type: 'asset_assignment',
        timestamp: bottle.updated_at,
        description: `Asset ${bottle.barcode_number || bottle.serial_number} assigned to ${bottle.customer_name}`,
        details: {
          assetId: bottle.id,
          customerName: bottle.customer_name,
          customerId: bottle.assigned_customer,
          status: bottle.status
        }
      }));

      setTransferHistory(recentTransfers);
    } catch (error) {
      console.error('Error loading transfer history:', error);
      setTransferHistory([]);
    }
  };

  const handleSelectAllAssets = () => {
    if (selectedAssets.length === customerAssets.length) {
      setSelectedAssets([]);
    } else {
      setSelectedAssets(customerAssets.map(asset => asset.id));
    }
  };

  const handleOpenTransferDialog = async (quickTransfer = false) => {
    if (selectedAssets.length === 0) {
      setTransferMessage({
        open: true,
        message: 'Please select at least one asset to transfer',
        severity: 'warning'
      });
      return;
    }

    setTransferLoading(true);
    try {
      if (quickTransfer) {
        // Load recent customers for quick transfer
        await loadRecentCustomers();
        setQuickTransferDialogOpen(true);
      } else {
        // Load all customers for full transfer dialog
        const result = await AssetTransferService.getAvailableCustomers(
          organization?.id || customer?.organization_id, 
          customer?.CustomerListID
        );
        
        if (result.success) {
          setAvailableCustomers(result.customers);
          setTransferDialogOpen(true);
        } else {
          setTransferMessage({
            open: true,
            message: `Failed to load customers: ${result.error}`,
            severity: 'error'
          });
        }
      }
    } catch (error) {
      setTransferMessage({
        open: true,
        message: `Error loading customers: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setTransferLoading(false);
    }
  };

  const handleCloseTransferDialog = () => {
    setTransferDialogOpen(false);
    setTargetCustomer(null);
    setTransferReason('');
  };

  const handleConfirmTransfer = async () => {
    if (!targetCustomer) {
      setTransferMessage({
        open: true,
        message: 'Please select a target customer',
        severity: 'warning'
      });
      return;
    }

    setTransferLoading(true);
    try {
      const result = await AssetTransferService.transferAssets(
        selectedAssets,
        customer?.CustomerListID,
        targetCustomer.CustomerListID,
        organization?.id || customer?.organization_id,
        transferReason
      );

      if (result.success) {
        setTransferMessage({
          open: true,
          message: result.message,
          severity: 'success'
        });
        
        // Refresh data and reset state
        const { data: customerAssetsData, error: customerAssetsError } = await supabase
          .from('bottles')
          .select('*')
          .eq('assigned_customer', id);
        
        if (!customerAssetsError) {
          setCustomerAssets(customerAssetsData || []);
          
          // Recalculate bottle summary
          const summary = {};
          (customerAssetsData || []).forEach(bottle => {
            const type = bottle.type || bottle.description || 'Unknown';
            summary[type] = (summary[type] || 0) + 1;
          });
          setBottleSummary(summary);
        }
        
        setSelectedAssets([]);
        handleCloseTransferDialog();
      } else {
        setTransferMessage({
          open: true,
          message: result.message,
          severity: 'error'
        });
      }
    } catch (error) {
      setTransferMessage({
        open: true,
        message: `Transfer failed: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setTransferLoading(false);
    }
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    // Normalize barcode: trim whitespace only (organizations control format)
    const normalizedBarcode = (editForm.barcode || '')
      .toString()
      .trim();
    const updateFields = {
      name: editForm.name,
      email: editForm.email,
      phone: editForm.phone,
      contact_details: editForm.contact_details,
      address: editForm.address,
      address2: editForm.address2,
      address3: editForm.address3,
      address4: editForm.address4,
      address5: editForm.address5,
      city: editForm.city,
      postal_code: editForm.postal_code,
      customer_type: editForm.customer_type || 'CUSTOMER',
      // Include barcode if provided (empty string allowed to clear)
      barcode: normalizedBarcode || null
    };
    const { error } = await supabase
      .from('customers')
      .update(updateFields)
      .eq('CustomerListID', id);
    if (error) {
      setSaveError(error.message);
      setSaving(false);
      return;
    }
    setCustomer({ ...customer, ...updateFields });
    setEditing(false);
    setSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  if (loading) return (
    <Box sx={{ p: 4, maxWidth: 900, mx: 'auto' }}>
      <CardSkeleton count={1} />
      <Box mt={4}><TableSkeleton rows={4} columns={5} /></Box>
      <Box mt={4}><TableSkeleton rows={3} columns={7} /></Box>
    </Box>
  );
  
  if (error) return (
    <Box p={4} color="error.main">
      <Typography>Error: {error}</Typography>
    </Box>
  );
  
  if (!customer) return (
    <Box p={4}>
      <Typography>Customer not found.</Typography>
    </Box>
  );

  return (
    <Box sx={{ p: 4, maxWidth: 900, mx: 'auto' }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
        variant="outlined"
        sx={{ mb: 4, borderRadius: 999, fontWeight: 700, px: 4 }}
      >
        Back
      </Button>
      
      <Typography variant="h3" fontWeight={900} color="primary" mb={3} sx={{ letterSpacing: -1 }}>
        Customer Details
      </Typography>

      {/* Customer Information */}
      <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 4, border: '1.5px solid #e0e0e0', boxShadow: '0 2px 12px 0 rgba(16,24,40,0.04)' }}>
        <Box display="flex" alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between" flexDirection={{ xs: 'column', md: 'row' }} mb={2}>
          <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
            <Typography variant="h5" fontWeight={700} color="primary">
              {editing ? (
                <TextField name="name" value={editForm.name || ''} onChange={handleEditChange} size="small" label="Name" sx={{ minWidth: 200 }} />
              ) : (
                customer.name
              )}
            </Typography>
            {!editing && (
              <Chip 
                label={customer.customer_type || 'CUSTOMER'} 
                color={customer.customer_type === 'VENDOR' ? 'secondary' : 'primary'} 
                size="medium"
                sx={{ fontWeight: 'bold' }}
              />
            )}
          </Box>
          {!editing && (
            <Button variant="outlined" onClick={() => setEditing(true)} sx={{ borderRadius: 999, fontWeight: 700, ml: { md: 2 } }}>Edit Customer</Button>
          )}
        </Box>
        <Divider sx={{ mb: 2 }} />
        <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3}>
          <Box>
            <Typography variant="body2" color="text.secondary">Customer ID</Typography>
            <Typography variant="body1" fontWeight={600} fontFamily="monospace" sx={{ mb: 2 }}>{customer.CustomerListID}</Typography>
            <Typography variant="body2" color="text.secondary">Customer Barcode</Typography>
            {editing ? (
              <TextField 
                name="barcode" 
                value={editForm.barcode || ''} 
                onChange={handleEditChange} 
                size="small" 
                label="Barcode (optional)" 
                placeholder="e.g. 800006B3-1611180703A"
                sx={{ mb: 2, minWidth: 220 }} 
                helperText="Scanned code used on mobile; leading % will be stripped automatically"
              />
            ) : (
              <Typography variant="body1" fontFamily="monospace" sx={{ mb: 2 }}>
                {customer.barcode || <em style={{ color: '#888' }}>No barcode set</em>}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">Email</Typography>
            {editing ? (
              <TextField 
                name="email" 
                value={editForm.email || ''} 
                onChange={handleEditChange} 
                size="small" 
                label="Email" 
                type="email"
                sx={{ mb: 2, minWidth: 200 }} 
                placeholder="customer@example.com"
              />
            ) : (
              <Typography variant="body1" sx={{ mb: 2 }}>
                {customer.email ? (
                  <a href={`mailto:${customer.email}`} style={{ color: '#1976d2', textDecoration: 'none' }}>
                    {customer.email}
                  </a>
                ) : (
                  <em style={{ color: '#888' }}>Not provided</em>
                )}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">Phone</Typography>
            {editing ? (
              <TextField name="phone" value={editForm.phone || ''} onChange={handleEditChange} size="small" label="Phone" sx={{ mb: 2, minWidth: 180 }} />
            ) : (
              <Typography variant="body1" sx={{ mb: 2 }}>{customer.phone || 'Not provided'}</Typography>
            )}
            
            <Typography variant="body2" color="text.secondary">Customer Type</Typography>
            {editing ? (
              <FormControl size="small" sx={{ mb: 2, minWidth: 180 }}>
                <InputLabel>Customer Type</InputLabel>
                <Select
                  name="customer_type"
                  value={editForm.customer_type || 'CUSTOMER'}
                  onChange={handleEditChange}
                  label="Customer Type"
                >
                  <MenuItem value="CUSTOMER">Customer</MenuItem>
                  <MenuItem value="VENDOR">Vendor</MenuItem>
                  <MenuItem value="TEMPORARY">Temporary (Walk-in)</MenuItem>
                </Select>
              </FormControl>
            ) : (
              <Typography variant="body1" sx={{ mb: 2 }}>
                <Chip 
                  label={customer.customer_type || 'CUSTOMER'} 
                  color={
                    customer.customer_type === 'VENDOR' ? 'secondary' : 
                    customer.customer_type === 'TEMPORARY' ? 'warning' : 'primary'
                  } 
                  size="small"
                  variant="outlined"
                />
              </Typography>
            )}
            
            <Typography variant="body2" color="text.secondary">Location</Typography>
            {editing ? (
              <FormControl size="small" sx={{ mb: 2, minWidth: 180 }}>
                <Select
                  name="location"
                  value={editForm.location || 'SASKATOON'}
                  onChange={handleEditChange}
                  label="Location"
                >
                  <MenuItem value="SASKATOON">SASKATOON</MenuItem>
                  <MenuItem value="REGINA">REGINA</MenuItem>
                  <MenuItem value="CHILLIWACK">CHILLIWACK</MenuItem>
                  <MenuItem value="PRINCE_GEORGE">PRINCE GEORGE</MenuItem>
                </Select>
              </FormControl>
            ) : (
              <Typography variant="body1" sx={{ mb: 2 }}>
                <Chip 
                  label={customer.location || 'SASKATOON'} 
                  color="primary" 
                  size="small"
                  variant="outlined"
                />
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">Contact</Typography>
            {editing ? (
              <TextField name="contact_details" value={editForm.contact_details || ''} onChange={handleEditChange} size="small" label="Contact" sx={{ minWidth: 180 }} />
            ) : (
              <Typography variant="body1">
                {([
                  customer.address,
                  customer.address2,
                  customer.address3,
                  customer.address4,
                  customer.address5,
                  customer.city,
                  customer.postal_code
                ].filter(Boolean).length === 0 && looksLikeAddress(customer.contact_details))
                  ? 'Not provided'
                  : (customer.contact_details || 'Not provided')}
              </Typography>
            )}
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Address</Typography>
            {editing ? (
              <>
                <TextField name="address" value={editForm.address || ''} onChange={handleEditChange} size="small" label="Address" sx={{ mb: 1, minWidth: 180 }} />
                <TextField name="address2" value={editForm.address2 || ''} onChange={handleEditChange} size="small" label="Address 2" sx={{ mb: 1, minWidth: 180 }} />
                <TextField name="address3" value={editForm.address3 || ''} onChange={handleEditChange} size="small" label="Address 3" sx={{ mb: 1, minWidth: 180 }} />
                <TextField name="address4" value={editForm.address4 || ''} onChange={handleEditChange} size="small" label="Address 4" sx={{ mb: 1, minWidth: 180 }} />
                <TextField name="address5" value={editForm.address5 || ''} onChange={handleEditChange} size="small" label="Address 5" sx={{ mb: 1, minWidth: 180 }} />
                <TextField name="city" value={editForm.city || ''} onChange={handleEditChange} size="small" label="City" sx={{ mb: 1, minWidth: 180 }} />
                <TextField name="postal_code" value={editForm.postal_code || ''} onChange={handleEditChange} size="small" label="Postal Code" sx={{ mb: 1, minWidth: 180 }} />
              </>
            ) : (
              <Typography variant="body1" sx={{ mb: 2 }}>
                {([
                  customer.address,
                  customer.address2,
                  customer.address3,
                  customer.address4,
                  customer.address5,
                  customer.city,
                  customer.postal_code
                ].filter(Boolean).length > 0)
                  ? [
                      customer.address,
                      customer.address2,
                      customer.address3,
                      customer.address4,
                      customer.address5,
                      customer.city,
                      customer.postal_code
                    ].filter(Boolean).join(', ')
                  : (looksLikeAddress(customer.contact_details)
                      ? customer.contact_details
                      : 'Not provided')}
              </Typography>
            )}
          </Box>
        </Box>
        {editing && (
          <Box>
            {/* Customer Type Info */}
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Customer Type:</strong><br/>
                • <strong>CUSTOMER</strong> - Gets charged rental fees for assigned bottles<br/>
                • <strong>VENDOR</strong> - Does NOT get charged rental fees (business partner)
              </Typography>
            </Alert>
            
            <Box display="flex" gap={2} mt={3}>
              <Button variant="contained" color="primary" onClick={handleSave} disabled={saving}>
                {saving ? <CircularProgress size={20} /> : 'Save Changes'}
              </Button>
              <Button variant="outlined" color="secondary" onClick={() => { setEditing(false); setEditForm(customer); }} disabled={saving}>
                Cancel
              </Button>
            </Box>
            
            {saveError && <Alert severity="error" sx={{ mt: 2 }}>{saveError}</Alert>}
            {saveSuccess && <Alert severity="success" sx={{ mt: 2 }}>Customer information updated successfully!</Alert>}
          </Box>
        )}
      </Paper>

      {/* Transfer Information & Quick Actions */}
      {customerAssets.length === 0 && (
        <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 4, backgroundColor: '#f8f9ff', border: '1px solid #e3e8ff' }}>
          <Typography variant="h6" fontWeight={700} color="primary" mb={2}>
            📦 Bottle Assignment & Transfer Options
          </Typography>
          
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3} mb={2}>
            <Box>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Assign Bottles TO This Customer:
              </Typography>
              <Box display="flex" flexDirection="column" gap={1}>
                <Button 
                  variant="outlined" 
                  component={Link}
                  to={`/bottle-management`}
                  startIcon={<TransferWithinAStationIcon />}
                  sx={{ justifyContent: 'flex-start', mb: 1 }}
                >
                  Use Bottle Management Page
                </Button>
                <Button 
                  variant="outlined" 
                  component={Link}
                  to={`/customer/${id}/transfer-to`}
                  startIcon={<TransferWithinAStationIcon />}
                  sx={{ justifyContent: 'flex-start', mb: 1 }}
                >
                  Transfer from Other Customers
                </Button>
              </Box>
            </Box>
            
            <Box>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom color="text.secondary">
                Transfer FROM This Customer:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Transfer options will appear here once bottles are assigned to {customer?.name}.
              </Typography>
              <Box mt={2} p={2} sx={{ backgroundColor: '#fff', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                <Typography variant="body2" fontWeight={600} mb={1}>
                  Available Transfer Types:
                </Typography>
                <Typography variant="body2">• Transfer to other customers</Typography>
                <Typography variant="body2">• Quick transfer to recent customers</Typography>
                <Typography variant="body2">• Return to warehouse</Typography>
                <Typography variant="body2">• Transfer history tracking</Typography>
              </Box>
            </Box>
          </Box>

          <Alert severity="info">
            <Typography variant="body2">
              <strong>Tip:</strong> Once bottles are assigned to this customer, you'll see comprehensive transfer controls 
              including customer-to-customer transfers, warehouse returns, and audit trail functionality.
            </Typography>
          </Alert>
        </Paper>
      )}

      {/* Bottle Rental Summary */}
      <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 4, border: '1.5px solid #e0e0e0', boxShadow: '0 2px 12px 0 rgba(16,24,40,0.04)' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Typography variant="h5" fontWeight={700} color="primary">
            📊 Bottle Rental Summary
          </Typography>
          {customer.customer_type === 'VENDOR' && (
            <Chip 
              label="NO RENTAL FEES" 
              color="secondary" 
              size="small"
              sx={{ fontWeight: 'bold' }}
            />
          )}
        </Box>
        
        {Object.keys(bottleSummary).length === 0 ? (
          <Box>
            <Typography color="text.secondary" mb={2}>No bottles currently assigned to this customer.</Typography>
            
            {/* Billing Information - show even when no bottles */}
            <Box mt={2}>
              {customer.customer_type === 'VENDOR' ? (
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Billing Status:</strong> This vendor account is NOT charged rental fees for assigned bottles.
                  </Typography>
                </Alert>
              ) : (
                <Alert severity="success">
                  <Typography variant="body2">
                    <strong>Billing Status:</strong> This customer account IS charged rental fees for assigned bottles.
                  </Typography>
                </Alert>
              )}
            </Box>
          </Box>
        ) : (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Total bottles by type:
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={2}>
              {Object.entries(bottleSummary).map(([type, count]) => (
                <Chip
                  key={type}
                  label={`${type} (${count})`}
                  color="primary"
                  variant="outlined"
                  sx={{ 
                    fontWeight: 600, 
                    fontSize: '1rem',
                    px: 2,
                    py: 1,
                    borderRadius: 2
                  }}
                />
              ))}
            </Box>
            <Typography variant="body2" color="text.secondary" mt={2}>
              Total bottles: {customerAssets.length}
            </Typography>
            
            {/* Billing Information */}
            <Box mt={2}>
              {customer.customer_type === 'VENDOR' ? (
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Billing Status:</strong> This vendor account is NOT charged rental fees for assigned bottles.
                  </Typography>
                </Alert>
              ) : (
                <Alert severity="success">
                  <Typography variant="body2">
                    <strong>Billing Status:</strong> This customer account IS charged rental fees for assigned bottles.
                  </Typography>
                </Alert>
              )}
            </Box>
          </Box>
        )}
      </Paper>

      {/* Currently Assigned Bottles */}
      <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h5" fontWeight={700} color="primary">
              🏠 Currently Assigned Bottles ({customerAssets.length})
            </Typography>
            {customerAssets.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No bottles assigned to this customer yet
              </Typography>
            )}
          </Box>
          
          {customerAssets.length > 0 && (
            <Box display="flex" gap={1} flexWrap="wrap">
              <ButtonGroup variant="outlined" size="small">
                <Tooltip title="Select/Deselect All">
                  <Button
                    onClick={handleSelectAllAssets}
                    startIcon={selectedAssets.length === customerAssets.length ? <DeselectIcon /> : <SelectAllIcon />}
                  >
                    {selectedAssets.length === customerAssets.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </Tooltip>
                <Tooltip title={selectedAssets.length === 0 ? "Select assets to transfer" : `Transfer ${selectedAssets.length} selected asset(s) to customer`}>
                  <Button
                    onClick={() => handleOpenTransferDialog(false)}
                    disabled={selectedAssets.length === 0 || transferLoading}
                    startIcon={transferLoading ? <CircularProgress size={16} /> : <TransferWithinAStationIcon />}
                    color="primary"
                  >
                    Transfer ({selectedAssets.length})
                  </Button>
                </Tooltip>
              </ButtonGroup>
              
              <ButtonGroup variant="outlined" size="small">
                <Tooltip title="Quick transfer to recent customers">
                  <Button
                    onClick={() => handleOpenTransferDialog(true)}
                    disabled={selectedAssets.length === 0 || transferLoading}
                    startIcon={<SpeedIcon />}
                    color="secondary"
                  >
                    Quick Transfer
                  </Button>
                </Tooltip>
                <Tooltip title="Return assets to warehouse/in-house">
                  <Button
                    onClick={handleTransferToWarehouse}
                    disabled={selectedAssets.length === 0 || transferLoading}
                    startIcon={<WarehouseIcon />}
                    color="warning"
                  >
                    To Warehouse ({selectedAssets.length})
                  </Button>
                </Tooltip>
              </ButtonGroup>

              <ButtonGroup variant="text" size="small">
                <Tooltip title="View transfer history">
                  <Button
                    onClick={() => {
                      loadTransferHistory();
                      setShowTransferHistory(true);
                    }}
                    startIcon={<HistoryIcon />}
                    color="info"
                  >
                    History
                  </Button>
                </Tooltip>
                <Tooltip title="Filter by location">
                  <Button
                    onClick={() => setLocationFilter(locationFilter === 'all' ? 'SASKATOON' : 'all')}
                    startIcon={<FilterListIcon />}
                    color="info"
                  >
                    Filter
                  </Button>
                </Tooltip>
              </ButtonGroup>
            </Box>
          )}
        </Box>
        
        {customerAssets.length === 0 ? (
          <Box>
            <Typography color="text.secondary" mb={2}>
              No bottles currently assigned to this customer.
            </Typography>
            <Alert severity="info">
              <Typography variant="body2">
                To assign bottles to this customer, you can:
              </Typography>
              <ul style={{ marginTop: '8px', marginBottom: '8px' }}>
                <li>Scan bottles in the mobile app and assign them to this customer</li>
                <li>Use the Bottle Management page to assign bottles</li>
                <li>Import bottle assignments from files</li>
              </ul>
              <Typography variant="body2">
                Transfer functionality will appear once bottles are assigned to this customer.
              </Typography>
            </Alert>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f7fa' }}>
                  <TableCell padding="checkbox" sx={{ fontWeight: 700 }}>
                    <Checkbox
                      indeterminate={selectedAssets.length > 0 && selectedAssets.length < customerAssets.length}
                      checked={customerAssets.length > 0 && selectedAssets.length === customerAssets.length}
                      onChange={handleSelectAllAssets}
                      color="primary"
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Serial Number</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Barcode</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customerAssets
                  .filter(asset => locationFilter === 'all' || asset.location === locationFilter)
                  .map((asset) => (
                  <TableRow key={asset.id} hover selected={selectedAssets.includes(asset.id)}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedAssets.includes(asset.id)}
                        onChange={() => handleSelectAsset(asset.id)}
                        color="primary"
                      />
                    </TableCell>
                    <TableCell>{asset.serial_number}</TableCell>
                    <TableCell>
                      {asset.barcode_number ? (
                        <Link
                          to={`/bottle/${asset.id}`}
                          style={{ color: '#1976d2', textDecoration: 'underline', cursor: 'pointer' }}
                        >
                          {asset.barcode_number}
                        </Link>
                      ) : ''}
                    </TableCell>
                    <TableCell>{asset.type || asset.description || 'Unknown'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={asset.location || 'Unknown'} 
                        color="primary" 
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={
                          customer?.customer_type === 'VENDOR' 
                            ? "In-house (no charge)" 
                            : customer?.customer_type === 'TEMPORARY'
                            ? "Rented (temp - needs setup)"
                            : "Rented"
                        }
                        color={
                          customer?.customer_type === 'VENDOR' ? 'default' : 
                          customer?.customer_type === 'TEMPORARY' ? 'warning' : 'success'
                        }
                        size="small"
                        icon={customer?.customer_type === 'VENDOR' ? <HomeIcon /> : null}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Rental History */}
      <Paper elevation={3} sx={{ p: 4, borderRadius: 4 }}>
        <Typography variant="h5" fontWeight={700} color="primary" mb={3}>
          📋 Rental History ({locationAssets.length})
        </Typography>
        
        {locationAssets.length === 0 ? (
          <Typography color="text.secondary">No rental history found for this customer.</Typography>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f7fa' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Serial Number</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Rental Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Rental Amount</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Start Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {locationAssets.map((rental) => (
                  <TableRow key={rental.id} hover>
                    <TableCell>{rental.cylinder?.serial_number || 'Unknown'}</TableCell>
                    <TableCell>{rental.cylinder?.type || 'Unknown'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={rental.rental_type || 'Monthly'} 
                        color="primary" 
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>${rental.rental_amount || 0}</TableCell>
                    <TableCell>
                      <Chip 
                        label={rental.location || 'Unknown'} 
                        color="secondary" 
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{rental.rental_start_date || '-'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={rental.status || 'Active'} 
                        color={rental.status === 'at_home' ? 'warning' : 'success'} 
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Transfer Dialog */}
      <Dialog 
        open={transferDialogOpen} 
        onClose={handleCloseTransferDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <TransferWithinAStationIcon color="primary" />
            Transfer Assets
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Transfer {selectedAssets.length} selected asset(s) from <strong>{customer?.name}</strong> to another customer:
            </Typography>
            
            <Autocomplete
              options={availableCustomers}
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
              value={targetCustomer}
              onChange={(event, newValue) => setTargetCustomer(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Target Customer"
                  placeholder="Choose customer to transfer assets to..."
                  fullWidth
                  margin="normal"
                  required
                />
              )}
              sx={{ mb: 2 }}
            />

            <TextField
              label="Transfer Reason (Optional)"
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              fullWidth
              multiline
              rows={3}
              placeholder="Enter reason for transfer (e.g., customer request, equipment reallocation, etc.)"
              margin="normal"
            />

            {selectedAssets.length > 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Assets to transfer:</strong> {selectedAssets.length} item(s)
                </Typography>
                <Typography variant="caption">
                  Selected assets will be immediately reassigned to the target customer.
                </Typography>
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCloseTransferDialog}
            disabled={transferLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmTransfer}
            variant="contained"
            disabled={!targetCustomer || transferLoading}
            startIcon={transferLoading ? <CircularProgress size={16} /> : <TransferWithinAStationIcon />}
          >
            {transferLoading ? 'Transferring...' : 'Transfer Assets'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Quick Transfer Dialog */}
      <Dialog 
        open={quickTransferDialogOpen} 
        onClose={() => setQuickTransferDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <SpeedIcon color="primary" />
            Quick Transfer to Recent Customers
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Transfer {selectedAssets.length} selected asset(s) from <strong>{customer?.name}</strong> to a recent customer:
            </Typography>
            
            {recentCustomers.length === 0 ? (
              <Alert severity="info">
                <Typography variant="body2">
                  No recent customers found. Use the main Transfer button to search all customers.
                </Typography>
              </Alert>
            ) : (
              <Box display="flex" flexDirection="column" gap={1} mt={2}>
                {recentCustomers.map((customer) => (
                  <Button
                    key={customer.CustomerListID}
                    variant="outlined"
                    fullWidth
                    onClick={() => {
                      setTargetCustomer(customer);
                      setTransferDialogOpen(true);
                      setQuickTransferDialogOpen(false);
                    }}
                    sx={{ justifyContent: 'flex-start', p: 2, mb: 1 }}
                  >
                    <Box textAlign="left">
                      <Typography variant="body2" fontWeight={600}>
                        {customer.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ID: {customer.CustomerListID} | Type: {customer.customer_type || 'CUSTOMER'} 
                      </Typography>
                    </Box>
                  </Button>
                ))}
              </Box>
            )}

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Note:</strong> Recent customers are based on recently updated accounts. 
                Use the main "Transfer" button to search all customers.
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuickTransferDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="outlined"
            onClick={() => {
              setQuickTransferDialogOpen(false);
              handleOpenTransferDialog(false);
            }}
          >
            Search All Customers
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transfer History Dialog */}
      <Dialog 
        open={showTransferHistory} 
        onClose={() => setShowTransferHistory(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <HistoryIcon color="primary" />
            Transfer History
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Recent asset transfer activity for this customer:
            </Typography>
            
            {transferHistory.length === 0 ? (
              <Alert severity="info">
                <Typography variant="body2">
                  No recent transfer history found. Transfer activity will appear here once assets are moved.
                </Typography>
              </Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f7fa' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Date/Time</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transferHistory.map((transfer) => (
                      <TableRow key={transfer.id} hover>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(transfer.timestamp).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={transfer.type.replace('_', ' ')} 
                            color="primary" 
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{transfer.description}</TableCell>
                        <TableCell>
                          <Chip 
                            label={transfer.details.status} 
                            color="success" 
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Note:</strong> This shows the most recent 20 transfer activities. 
                Complete audit trails are maintained in the system logs.
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTransferHistory(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transfer Status Messages */}
      <Snackbar
        open={transferMessage.open}
        autoHideDuration={6000}
        onClose={() => setTransferMessage({ ...transferMessage, open: false })}
      >
        <Alert 
          onClose={() => setTransferMessage({ ...transferMessage, open: false })}
          severity={transferMessage.severity}
          sx={{ width: '100%' }}
        >
          {transferMessage.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 