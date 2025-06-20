import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  CircularProgress, Button, Chip, Divider, Grid, Card, CardContent, TextField, MenuItem, Snackbar, Alert
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function BottleDetail() {
  const { barcode_number } = useParams();
  const navigate = useNavigate();
  const [bottle, setBottle] = useState(null);
  const [rentals, setRentals] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editBottle, setEditBottle] = useState(null);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const fetchBottleDetails = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch bottle details
        const { data: bottleData, error: bottleError } = await supabase
          .from('bottles')
          .select('*')
          .eq('barcode_number', barcode_number)
          .single();
        
        if (bottleError) {
          setError('Bottle not found');
          setLoading(false);
          return;
        }
        
        setBottle(bottleData);
        setEditBottle(bottleData);
        
        // Fetch rental history
        const { data: rentalData, error: rentalError } = await supabase
          .from('rentals')
          .select('*, customer:customer_id (CustomerListID, name, customer_number)')
          .eq('bottle_id', bottleData.id)
          .order('rental_start_date', { ascending: false });
        
        if (!rentalError) {
          setRentals(rentalData || []);
        }
        
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
        
      } catch (err) {
        setError(err.message);
      }
      
      setLoading(false);
    };
    
    if (barcode_number) {
      fetchBottleDetails();
    }
  }, [barcode_number]);

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
                📦 Bottle Information
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
                  <Typography variant="body2" color="text.secondary">Product Code</Typography>
                  <TextField
                    value={editBottle?.product_code || ''}
                    onChange={e => handleEditChange('product_code', e.target.value)}
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
                  <Typography variant="body2" color="text.secondary">Category</Typography>
                  <TextField
                    value={editBottle?.category || ''}
                    onChange={e => handleEditChange('category', e.target.value)}
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
                  <Typography variant="body2" color="text.secondary">Description</Typography>
                  <TextField
                    value={editBottle?.description || ''}
                    onChange={e => handleEditChange('description', e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Gas Type</Typography>
                  <TextField
                    value={editBottle?.gas_type || ''}
                    onChange={e => handleEditChange('gas_type', e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Location</Typography>
                  <TextField
                    value={editBottle?.location || ''}
                    onChange={e => handleEditChange('location', e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Status</Typography>
                  <Chip 
                    label={bottle.assigned_customer ? 'Rented' : 'Available'} 
                    color={bottle.assigned_customer ? 'warning' : 'success'}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12}>
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
                      onClick={() => navigate(`/customers/${customer.CustomerListID}`)}
                      sx={{ mt: 1 }}
                    >
                      View Customer Details
                    </Button>
                  </Grid>
                </Grid>
              ) : (
                <Typography variant="body1" color="text.secondary">
                  No customer assigned to this bottle.
                </Typography>
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
        </Grid>
      </Box>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 