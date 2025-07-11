import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  CircularProgress, Button, Chip, Divider, Grid, Card, CardContent, TextField, MenuItem, Snackbar, Alert, Select
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Autocomplete from '@mui/material/Autocomplete';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../hooks/useAuth';

export default function BottleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile: userProfile, organization } = useAuth();
  const [bottle, setBottle] = useState(null);
  const [assetInfo, setAssetInfo] = useState(null);
  const [rentals, setRentals] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editBottle, setEditBottle] = useState(null);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [locations, setLocations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [ownerType, setOwnerType] = useState('organization');
  const [ownerCustomerId, setOwnerCustomerId] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerList, setOwnerList] = useState([]);
  const [newOwnerName, setNewOwnerName] = useState('');
  const [manageOwnersOpen, setManageOwnersOpen] = useState(false);
  const [deletingOwnerId, setDeletingOwnerId] = useState(null);
  const [ownerCustomerIds, setOwnerCustomerIds] = useState([]);
  const [owners, setOwners] = useState([]);
  const [ownersLoading, setOwnersLoading] = useState(false);
  const [ownersError, setOwnersError] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [ownerToDelete, setOwnerToDelete] = useState(null);
  const [selectedOwner, setSelectedOwner] = useState('');

  useEffect(() => {
    const fetchBottleDetails = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch bottle details by ID
        const { data: bottleData, error: bottleError } = await supabase
          .from('bottles')
          .select('*')
          .eq('id', id)
          .single();
        
        if (bottleError) {
          setError('Bottle not found');
          setLoading(false);
          return;
        }
        
        // Auto-fill logic for bottle fields if empty
        if (bottleData.description) {
          const desc = bottleData.description.trim();
          const firstWord = desc.split(/\s|-/)[0];
          if (!bottleData.type || bottleData.type.trim() === '') bottleData.type = firstWord;
          if (!bottleData.category || bottleData.category.trim() === '') bottleData.category = 'BOTTLE';
          if (!bottleData.group_name || bottleData.group_name.trim() === '') bottleData.group_name = firstWord;
          if (!bottleData.gas_type || bottleData.gas_type.trim() === '') bottleData.gas_type = firstWord;
        }
        setBottle(bottleData);
        setEditBottle(bottleData);
        
        // Fetch asset information based on product description
        if (bottleData.description) {
          const { data: assetData, error: assetError } = await supabase
            .from('bottles')
            .select('*')
            .eq('description', bottleData.description);
          
          if (!assetError && assetData && assetData.length > 0) {
            // Find the first bottle with populated values for asset details
            const firstWithType = assetData.find(b => b.type && b.type.trim() !== '') || assetData[0];
            const firstWithCategory = assetData.find(b => b.category && b.category.trim() !== '') || assetData[0];
            const firstWithGroup = assetData.find(b => b.group_name && b.group_name.trim() !== '') || assetData[0];
            const firstWithGasType = assetData.find(b => b.gas_type && b.gas_type.trim() !== '') || assetData[0];
            
            // Calculate asset-level statistics
            const assetStats = {
              product_code: bottleData.product_code || '',
              description: bottleData.description,
              type: firstWithType?.type || '',
              category: firstWithCategory?.category || '',
              group_name: firstWithGroup?.group_name || '',
              gas_type: firstWithGasType?.gas_type || '',
              location: assetData[0].location || '',
              total_count: assetData.length,
              available_count: assetData.filter(b => b.status === 'available').length,
              rented_count: assetData.filter(b => b.status === 'rented').length,
              lost_count: assetData.filter(b => b.status === 'lost').length,
              in_house_total: assetData.reduce((sum, b) => sum + (b.in_house_total || 0), 0),
              with_customer_total: assetData.reduce((sum, b) => sum + (b.with_customer_total || 0), 0),
              lost_total: assetData.reduce((sum, b) => sum + (b.lost_total || 0), 0),
              total: assetData.reduce((sum, b) => sum + (b.total || 0), 0)
            };
            setAssetInfo(assetStats);
          }
        }
        
        // Fetch rental history (try all possible links, no join)
        let rentalData = [];
        // Try by bottle_id
        let res = await supabase
          .from('rentals')
          .select('*')
          .eq('bottle_id', bottleData.id)
          .order('rental_start_date', { ascending: false });
        if (res.data && res.data.length > 0) {
          rentalData = res.data;
        } else {
          // Try by serial_number
          res = await supabase
            .from('rentals')
            .select('*')
            .eq('serial_number', bottleData.serial_number)
            .order('rental_start_date', { ascending: false });
          if (res.data && res.data.length > 0) {
            rentalData = res.data;
          } else {
            // Try by barcode_number
            res = await supabase
              .from('rentals')
              .select('*')
              .eq('barcode_number', bottleData.barcode_number)
              .order('rental_start_date', { ascending: false });
            if (res.data && res.data.length > 0) {
              rentalData = res.data;
            }
          }
        }
        setRentals(rentalData || []);
        
        // Fetch customer details if assigned
        if (bottleData.assigned_customer) {
          const { data: customerData, error: customerError } = await supabase
            .from('customers')
            .select('*')
            .eq('CustomerListID', bottleData.assigned_customer)
            .single();
          
          if (!customerError && customerData) {
            setCustomer(customerData);
          }
        }
        
        // Fetch locations for dropdown
        const fetchLocations = async () => {
          const { data, error } = await supabase.from('locations').select('*').order('name');
          if (!error && data) setLocations(data);
        };
        fetchLocations();
        
        // Fetch owner information
        if (bottleData.owner_type && bottleData.owner_id && bottleData.owner_name) {
          setOwnerType(bottleData.owner_type);
          setOwnerCustomerId(bottleData.owner_id);
          setOwnerName(bottleData.owner_name);
        }
        
      } catch (err) {
        setError(err.message);
      }
      
      setLoading(false);
    };
    
    if (id) {
      fetchBottleDetails();
    }
  }, [id]);

  // Fetch customers for assignment
  useEffect(() => {
    const fetchCustomers = async () => {
      const { data, error } = await supabase.from('customers').select('CustomerListID, name').order('name');
      if (!error && data) setCustomers(data);
    };
    fetchCustomers();
  }, []);

  // In useEffect, after fetching customers and locations, build the owner list
  useEffect(() => {
    const externalOwners = customers.filter(c => c.CustomerListID === 'Not Set').map(c => c.name);
    setOwnerList([
      { type: 'organization', label: organization?.name || 'This Organization', value: 'organization' },
      ...locations.map(loc => ({ type: 'location', label: loc.name, value: loc.name })),
      ...externalOwners.map(name => ({ type: 'external_company', label: name, value: name })),
    ]);
  }, [customers, locations, organization]);

  // Fetch owner customer IDs on mount or when bottles/customers change
  useEffect(() => {
    const fetchOwnerCustomerIds = async () => {
      const { data: bottlesData } = await supabase
        .from('bottles')
        .select('owner_id')
        .eq('organization_id', userProfile.organization_id);
      const ids = Array.from(new Set((bottlesData || []).map(b => b.owner_id).filter(Boolean)));
      setOwnerCustomerIds(ids);
    };
    if (userProfile?.organization_id) fetchOwnerCustomerIds();
  }, [userProfile, customers]);

  useEffect(() => {
    if (bottle) {
      setOwnerType(bottle.owner_type || 'organization');
      setOwnerCustomerId(bottle.owner_id || '');
      setOwnerName(bottle.owner_name || '');
      // Only show the current bottle's owner in the ownerList
      let ownerValue = '';
      let ownerLabel = '';
      if (bottle.owner_type === 'organization') {
        ownerValue = 'organization';
        ownerLabel = bottle.owner_name || 'This Organization';
      } else if (bottle.owner_type === 'customer') {
        ownerValue = bottle.owner_id;
        ownerLabel = bottle.owner_name + (bottle.owner_id ? ` (${bottle.owner_id})` : '');
      } else if (bottle.owner_type === 'external_company') {
        ownerValue = bottle.owner_name;
        ownerLabel = bottle.owner_name;
      }
      if (ownerValue) {
        setOwnerList([{ type: bottle.owner_type, label: ownerLabel, value: ownerValue }]);
      } else {
        setOwnerList([]);
      }
      // Set selectedOwner to bottle.owner_id if present
      setSelectedOwner(bottle.owner_id || '');
    }
  }, [bottle]);

  // Fetch owners from the owners table
  useEffect(() => {
    const fetchOwners = async () => {
      setOwnersLoading(true);
      let orgId = bottle?.organization_id || userProfile?.organization_id;
      const { data, error } = await supabase
        .from('owners')
        .select('*')
        .eq('organization_id', orgId)
        .order('name');
      if (error) setOwnersError('Failed to load owners');
      else setOwners(data || []);
      setOwnersLoading(false);
      // Debug log
      console.log('Bottle owner_id:', bottle?.owner_id, 'Fetched owners:', data);
    };
    fetchOwners();
  }, [bottle, userProfile]);

  const handleEditChange = (field, value) => {
    setEditBottle(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('bottles')
        .update(editBottle)
        .eq('id', bottle.id);
      if (error) throw error;
      setSnackbar({ open: true, message: 'Bottle updated successfully!', severity: 'success' });
      setBottle(editBottle);
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    }
    setSaving(false);
  };

  // Add owner input handler
  const handleAddOwner = () => {
    if (newOwnerName.trim() && !ownerList.some(o => o.value === newOwnerName.trim())) {
      setOwnerList([...ownerList, { type: 'external_company', label: newOwnerName.trim(), value: newOwnerName.trim() }]);
      setNewOwnerName('');
    }
  };

  // Delete owner handler
  const handleDeleteOwner = async (ownerId) => {
    setDeletingOwnerId(ownerId);
    // Remove owner from customers table
    await supabase.from('customers').delete().eq('CustomerListID', ownerId);
    // Update bottles owned by this customer to be organization-owned
    await supabase.from('bottles').update({ owner_type: 'organization', owner_id: userProfile.organization_id, owner_name: organization?.name || '' }).eq('owner_id', ownerId);
    setDeletingOwnerId(null);
    setManageOwnersOpen(false);
    // Optionally, refetch customers/owners
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={4} textAlign="center">
        <Typography variant="h5" color="error" mb={2}>
          Error: {error}
        </Typography>
        <Button variant="contained" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </Box>
    );
  }

  if (!bottle) {
    return (
      <Box p={4} textAlign="center">
        <Typography variant="h5" mb={2}>
          Bottle not found
        </Typography>
        <Button variant="contained" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', py: 4 }}>
      <Box maxWidth="1200px" mx="auto" px={3}>
        {/* Header */}
        <Box display="flex" alignItems="center" mb={4}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Typography variant="h4" fontWeight={700} color="primary">
            Bottle Details
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Bottle Information */}
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" fontWeight={700} mb={3} color="primary">
                🏷️ Asset Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Barcode</Typography>
                  <TextField
                    value={editBottle?.barcode_number || ''}
                    onChange={e => handleEditChange('barcode_number', e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Serial Number</Typography>
                  <TextField
                    value={editBottle?.serial_number || ''}
                    onChange={e => handleEditChange('serial_number', e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Group</Typography>
                  <TextField
                    value={editBottle?.group_name || ''}
                    onChange={e => handleEditChange('group_name', e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Type</Typography>
                  <TextField
                    value={editBottle?.type || ''}
                    onChange={e => handleEditChange('type', e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Product Code</Typography>
                  <TextField
                    value={editBottle?.product_code || ''}
                    onChange={e => handleEditChange('product_code', e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Description</Typography>
                  <TextField
                    value={editBottle?.description || ''}
                    onChange={e => handleEditChange('description', e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Owner</Typography>
                  <Select
                    value={editBottle?.owner_id || ''}
                    onChange={e => {
                      const selectedId = e.target.value;
                      const selectedOwner = owners.find(o => o.id === selectedId);
                      setEditBottle(prev => ({
                        ...prev,
                        owner_id: selectedId,
                        owner_name: selectedOwner ? selectedOwner.name : prev.owner_name
                      }));
                    }}
                    fullWidth
                    size="small"
                    sx={{ mb: 1 }}
                    renderValue={selected => {
                      const owner = owners.find(o => o.id === selected);
                      return owner ? owner.name : 'Select owner...';
                    }}
                  >
                    {owners.map(o => (
                      <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>
                    ))}
                  </Select>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Ownership</Typography>
                  <TextField
                    value={editBottle?.owner_name || ''}
                    onChange={e => setEditBottle(prev => ({ ...prev, owner_name: e.target.value }))}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Grid container spacing={2} alignItems="flex-end">
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Location</Typography>
                      <Select
                        value={editBottle?.location || ''}
                        onChange={e => handleEditChange('location', e.target.value)}
                        fullWidth
                        size="small"
                      >
                        <MenuItem value=""><em>None</em></MenuItem>
                        {locations.map(loc => (
                          <MenuItem key={loc.name} value={loc.name}>{loc.name}</MenuItem>
                        ))}
                      </Select>
                    </Grid>
                  </Grid>
                  <Button
                    variant="outlined"
                    color="secondary"
                    sx={{ mr: 2, mb: 1 }}
                    onClick={async () => {
                      if (!editBottle?.description) return;
                      // Use ilike for case-insensitive match if supported
                      let assetData = [];
                      let assetError = null;
                      try {
                        const { data, error } = await supabase
                          .from('bottles')
                          .select('*')
                          .ilike('description', editBottle.description.trim());
                        assetData = data || [];
                        assetError = error;
                      } catch (e) {
                        // fallback to eq if ilike not supported
                        const { data, error } = await supabase
                          .from('bottles')
                          .select('*')
                          .eq('description', editBottle.description.trim());
                        assetData = data || [];
                        assetError = error;
                      }
                      if (!assetError && assetData.length > 0) {
                        // Helper to get most common or first non-empty value
                        const getBest = (field) => {
                          const nonEmpty = assetData.map(b => b[field]).filter(v => v && v.trim() !== '');
                          if (nonEmpty.length === 0) return '';
                          const freq = {};
                          nonEmpty.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
                          return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0] || nonEmpty[0];
                        };
                        let changed = false;
                        let filledFields = [];
                        setEditBottle(prev => {
                          const updated = { ...prev };
                          if (!prev.group_name || prev.group_name.trim() === '') {
                            const val = getBest('group_name');
                            if (val) { updated.group_name = val; changed = true; filledFields.push('Group'); }
                          }
                          if (!prev.type || prev.type.trim() === '') {
                            const val = getBest('type');
                            if (val) { updated.type = val; changed = true; filledFields.push('Type'); }
                          }
                          if (!prev.product_code || prev.product_code.trim() === '') {
                            const val = getBest('product_code');
                            if (val) { updated.product_code = val; changed = true; filledFields.push('Product Code'); }
                          }
                          if (!prev.location || prev.location.trim() === '') {
                            const val = getBest('location');
                            if (val) { updated.location = val; changed = true; filledFields.push('Location'); }
                          }
                          return updated;
                        });
                        setTimeout(() => {
                          if (changed) {
                            setSnackbar({ open: true, message: `Fields auto-filled: ${filledFields.join(', ')}`, severity: 'info' });
                          } else {
                            setSnackbar({ open: true, message: 'No new info found to fill.', severity: 'info' });
                          }
                        }, 100);
                        // Debug log
                        console.log('Auto-fill candidates:', assetData.map(b => ({ group_name: b.group_name, type: b.type, product_code: b.product_code, location: b.location })));
                      } else {
                        setSnackbar({ open: true, message: 'No asset info found for this description.', severity: 'warning' });
                      }
                    }}
                  >
                    Refresh & Auto-Fill
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSave}
                    disabled={saving}
                    sx={{ mt: 2 }}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Customer Information */}
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" fontWeight={700} mb={3} color="primary">
                👤 Customer Information
              </Typography>
              
              {customer ? (
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Customer ID</Typography>
                    <Typography variant="body1" fontWeight={600}>{customer.CustomerListID}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Name</Typography>
                    <Typography variant="body1" fontWeight={600}>{customer.name}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Customer Number</Typography>
                    <Typography variant="body1" fontWeight={600}>{customer.customer_number || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Button 
                      variant="outlined" 
                      onClick={() => navigate(`/customer/${customer.CustomerListID}`)}
                      sx={{ mt: 1 }}
                    >
                      View Customer Details
                    </Button>
                  </Grid>
                </Grid>
              ) : (
                <Box>
                  <Typography variant="body2" color="text.secondary" mb={1}>Assign to Customer</Typography>
                  <Select
                    value={selectedCustomer}
                    onChange={e => setSelectedCustomer(e.target.value)}
                    fullWidth
                    displayEmpty
                    size="small"
                    sx={{ mb: 2 }}
                  >
                    <MenuItem value=""><em>Select a customer...</em></MenuItem>
                    <em style={{ fontStyle: 'normal', fontWeight: 600, color: '#888' }}>Locations (Owner/In House)</em>
                    {locations.map(loc => (
                      <MenuItem key={`loc-${loc.id}`} value={loc.name}>{loc.name}</MenuItem>
                    ))}
                    <em style={{ fontStyle: 'normal', fontWeight: 600, color: '#888' }}>Owner (In House, Not Set)</em>
                    {customers.filter(c => c.CustomerListID === 'Not Set').map(c => (
                      <MenuItem key={`owner-${c.name}`} value={c.CustomerListID}>{c.name} (Not Set)</MenuItem>
                    ))}
                    <MenuItem value="Customer Owned">Customer Owned</MenuItem>
                    <em style={{ fontStyle: 'normal', fontWeight: 600, color: '#888' }}>Customers</em>
                    {customers.filter(c => c.CustomerListID !== 'Not Set').map(c => (
                      <MenuItem key={c.CustomerListID} value={c.CustomerListID}>{c.name} ({c.CustomerListID})</MenuItem>
                    ))}
                  </Select>
                  <Button
                    variant="contained"
                    color="primary"
                    disabled={!selectedCustomer || assigning}
                    onClick={async () => {
                      setAssigning(true);
                      try {
                        const { error } = await supabase
                          .from('bottles')
                          .update({ assigned_customer: selectedCustomer })
                          .eq('id', bottle.id);
                        if (error) throw error;
                        setSnackbar({ open: true, message: 'Customer assigned successfully!', severity: 'success' });
                        // Refetch bottle details to update UI
                        const { data: customerData, error: customerError } = await supabase
                          .from('customers')
                          .select('*')
                          .eq('CustomerListID', selectedCustomer)
                          .single();
                        if (!customerError && customerData) setCustomer(customerData);
                      } catch (err) {
                        setSnackbar({ open: true, message: err.message, severity: 'error' });
                      }
                      setAssigning(false);
                    }}
                  >
                    {assigning ? 'Assigning...' : 'Assign Customer'}
                  </Button>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Rental History */}
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" fontWeight={700} mb={3} color="primary">
                📋 Rental History
              </Typography>
              
              {rentals.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                        <TableCell sx={{ fontWeight: 700 }}>Start Date</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>End Date</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Rental Type</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Rate</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rentals.map((rental) => (
                        <TableRow key={rental.id} hover>
                          <TableCell>{rental.rental_start_date || 'N/A'}</TableCell>
                          <TableCell>{rental.rental_end_date || 'Active'}</TableCell>
                          <TableCell>
                            {rental.customer ? (
                              <Typography variant="body2" color="primary" fontWeight={600}>
                                {rental.customer.name}
                              </Typography>
                            ) : (
                              'Location'
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={rental.rental_type || 'N/A'} 
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>${rental.rental_amount || 'N/A'}</TableCell>
                          <TableCell>{rental.location || 'N/A'}</TableCell>
                          <TableCell>
                            <Chip 
                              label={rental.rental_end_date ? 'Ended' : 'Active'} 
                              color={rental.rental_end_date ? 'default' : 'success'}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body1" color="text.secondary">
                  No rental history found for this bottle.
                </Typography>
              )}
            </Paper>
          </Grid>

          {/* Owner Information */}
          {/* --- Entire Owner Information section removed --- */}
        </Grid>
      </Box>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        ContentProps={{ sx: { zIndex: 20000 } }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 