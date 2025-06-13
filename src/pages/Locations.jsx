import React, { useState, useEffect } from 'react';
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
  TextField,
  Button,
  IconButton,
  Snackbar,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import { supabase } from '../supabase/client';

// Initial locations with current tax rates (as of 2024)
const initialLocations = [
  {
    id: 'saskatoon',
    name: 'Saskatoon',
    province: 'Saskatchewan',
    gst_rate: 5.0, // GST 5%
    pst_rate: 6.0, // Saskatchewan PST 6%
    total_tax_rate: 11.0,
    is_editing: false
  },
  {
    id: 'regina',
    name: 'Regina',
    province: 'Saskatchewan',
    gst_rate: 5.0, // GST 5%
    pst_rate: 6.0, // Saskatchewan PST 6%
    total_tax_rate: 11.0,
    is_editing: false
  },
  {
    id: 'chilliwack',
    name: 'Chilliwack',
    province: 'British Columbia',
    gst_rate: 5.0, // GST 5%
    pst_rate: 7.0, // BC PST 7%
    total_tax_rate: 12.0,
    is_editing: false
  },
  {
    id: 'prince-george',
    name: 'Prince George',
    province: 'British Columbia',
    gst_rate: 5.0, // GST 5%
    pst_rate: 7.0, // BC PST 7%
    total_tax_rate: 12.0,
    is_editing: false
  }
];

export default function Locations() {
  const [locations, setLocations] = useState(initialLocations);
  const [loading, setLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [editValues, setEditValues] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    loadLocationsFromDatabase();
  }, []);

  const loadLocationsFromDatabase = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      // Handle database error
    }
  };

  const createLocationsTable = async () => {
    try {
      // Create locations table if it doesn't exist
      const { error } = await supabase.rpc('create_locations_table');
      if (error) throw error;
    } catch (error) {
      // Handle table creation error
    }
  };

  const insertInitialLocations = async () => {
    try {
      const { error } = await supabase
        .from('locations')
        .insert(initialLocations);
      if (error) throw error;
    } catch (error) {
      // Handle insertion error
    }
  };

  const handleEditChange = (field, value) => {
    setEditValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEdit = (locationId) => {
    const location = locations.find(loc => loc.id === locationId);
    setEditValues({
      gst_rate: location.gst_rate,
      pst_rate: location.pst_rate
    });
    setLocations(locations.map(loc => 
      loc.id === locationId ? { ...loc, is_editing: true } : loc
    ));
  };

  const handleSave = async (locationId) => {
    const location = locations.find(loc => loc.id === locationId);
    const newGstRate = parseFloat(editValues.gst_rate);
    const newPstRate = parseFloat(editValues.pst_rate);
    const newTotalRate = newGstRate + newPstRate;

    if (isNaN(newGstRate) || isNaN(newPstRate)) {
      setSnackbarMsg('Please enter valid tax rates');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('locations')
        .update({
          gst_rate: newGstRate,
          pst_rate: newPstRate,
          total_tax_rate: newTotalRate
        })
        .eq('id', locationId);

      if (error) {
        setSnackbarMsg('Failed to update location');
        setSnackbarSeverity('error');
      } else {
        setLocations(locations.map(loc => 
          loc.id === locationId 
            ? { 
                ...loc, 
                gst_rate: newGstRate,
                pst_rate: newPstRate,
                total_tax_rate: newTotalRate,
                is_editing: false 
              }
            : loc
        ));

        setSnackbarMsg('Tax rates updated successfully');
        setSnackbarSeverity('success');
      }
    } catch (error) {
      setSnackbarMsg('Error updating tax rates');
      setSnackbarSeverity('error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = (locationId) => {
    setLocations(locations.map(loc => 
      loc.id === locationId ? { ...loc, is_editing: false } : loc
    ));
    setEditValues({});
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const handleDelete = async (locationId) => {
    if (!window.confirm('Are you sure you want to delete this location?')) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('locations').delete().eq('id', locationId);
      if (error) throw error;
      setLocations(locations.filter(loc => loc.id !== locationId));
      setSnackbarMsg('Location deleted successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      setSnackbarMsg('Error deleting location');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fff', py: 8, borderRadius: 0, overflow: 'visible' }}>
      <Paper elevation={0} sx={{ width: '100%', p: { xs: 2, md: 5 }, borderRadius: 0, boxShadow: '0 2px 12px 0 rgba(16,24,40,0.04)', border: '1px solid #eee', bgcolor: '#fff', overflow: 'visible' }}>
        <Typography variant="h3" fontWeight={900} color="primary" mb={2} sx={{ letterSpacing: -1 }}>
          📍 Location Management
        </Typography>
        
        <Typography variant="body1" color="text.secondary" mb={4}>
          Manage tax rates for different locations. GST and PST rates can be customized per location.
        </Typography>

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Summary Cards */}
            <Grid container spacing={3} mb={4}>
              <Grid item xs={12} sm={6} md={3}>
                <Card elevation={3} sx={{ borderRadius: 3, bgcolor: '#f8f9fa' }}>
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <Typography variant="h4" fontWeight={900} color="primary" mb={1}>
                      {locations.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Locations
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card elevation={3} sx={{ borderRadius: 3, bgcolor: '#e3f2fd' }}>
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <Typography variant="h4" fontWeight={900} color="primary" mb={1}>
                      SK
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Saskatchewan
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card elevation={3} sx={{ borderRadius: 3, bgcolor: '#f3e5f5' }}>
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <Typography variant="h4" fontWeight={900} color="primary" mb={1}>
                      BC
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      British Columbia
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card elevation={3} sx={{ borderRadius: 3, bgcolor: '#e8f5e8' }}>
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <Typography variant="h4" fontWeight={900} color="primary" mb={1}>
                      5%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      GST Rate
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Locations Table */}
            <Paper elevation={3} sx={{ borderRadius: 4, overflow: 'hidden' }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f7fa' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Province</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>GST Rate (%)</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>PST Rate (%)</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Total Tax Rate (%)</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {locations.map((location) => (
                      <TableRow key={location.id} hover>
                        <TableCell>
                          <Typography variant="body1" fontWeight={600}>
                            {location.name}
                          </Typography>
                        </TableCell>
                        <TableCell>{location.province}</TableCell>
                        <TableCell>
                          {location.is_editing ? (
                            <TextField
                              type="number"
                              value={editValues.gst_rate || location.gst_rate}
                              onChange={(e) => handleEditChange('gst_rate', e.target.value)}
                              size="small"
                              sx={{ width: 80 }}
                              inputProps={{ step: 0.1, min: 0, max: 100 }}
                            />
                          ) : (
                            `${location.gst_rate}%`
                          )}
                        </TableCell>
                        <TableCell>
                          {location.is_editing ? (
                            <TextField
                              type="number"
                              value={editValues.pst_rate || location.pst_rate}
                              onChange={(e) => handleEditChange('pst_rate', e.target.value)}
                              size="small"
                              sx={{ width: 80 }}
                              inputProps={{ step: 0.1, min: 0, max: 100 }}
                            />
                          ) : (
                            `${location.pst_rate}%`
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body1" fontWeight={600} color="primary">
                            {location.is_editing 
                              ? `${(parseFloat(editValues.gst_rate || location.gst_rate) + parseFloat(editValues.pst_rate || location.pst_rate)).toFixed(1)}%`
                              : `${location.total_tax_rate}%`
                            }
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {location.is_editing ? (
                            <Box display="flex" gap={1}>
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleSave(location.id)}
                                disabled={loading}
                              >
                                <SaveIcon />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="default"
                                onClick={() => handleCancel(location.id)}
                                disabled={loading}
                              >
                                <CancelIcon />
                              </IconButton>
                            </Box>
                          ) : (
                            <>
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleEdit(location.id)}
                                disabled={loading}
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDelete(location.id)}
                                disabled={loading}
                                sx={{ ml: 1 }}
                              >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                              </IconButton>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </>
        )}

        {/* Snackbar for notifications */}
        <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose}>
          <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
            {snackbarMsg}
          </Alert>
        </Snackbar>
      </Paper>
    </Box>
  );
} 