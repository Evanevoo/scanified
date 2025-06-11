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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
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

  useEffect(() => {
    loadLocationsFromDatabase();
  }, []);

  const loadLocationsFromDatabase = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error loading locations:', error);
        // If table doesn't exist, create it with initial data
        await createLocationsTable();
      } else if (data && data.length > 0) {
        // Merge database data with initial structure
        const mergedLocations = initialLocations.map(location => {
          const dbLocation = data.find(db => db.id === location.id);
          return dbLocation ? { ...location, ...dbLocation } : location;
        });
        setLocations(mergedLocations);
      } else {
        // No data in database, insert initial data
        await insertInitialLocations();
      }
    } catch (error) {
      console.error('Error:', error);
      setSnackbarMsg('Error loading locations');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const createLocationsTable = async () => {
    try {
      // This would typically be done via Supabase migrations
      // For now, we'll just insert the initial data
      await insertInitialLocations();
    } catch (error) {
      console.error('Error creating locations table:', error);
    }
  };

  const insertInitialLocations = async () => {
    try {
      const { error } = await supabase
        .from('locations')
        .insert(initialLocations.map(loc => ({
          id: loc.id,
          name: loc.name,
          province: loc.province,
          gst_rate: loc.gst_rate,
          pst_rate: loc.pst_rate,
          total_tax_rate: loc.total_tax_rate
        })));

      if (error) {
        console.error('Error inserting initial locations:', error);
      }
    } catch (error) {
      console.error('Error:', error);
    }
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
        throw error;
      }

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
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error updating location:', error);
      setSnackbarMsg('Error updating tax rates');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
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

  const handleEditChange = (field, value) => {
    setEditValues(prev => ({ ...prev, [field]: value }));
  };

  if (loading && locations.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fff', py: 8, borderRadius: 0, overflow: 'visible' }}>
      <Paper elevation={0} sx={{ width: '100%', p: { xs: 2, md: 5 }, borderRadius: 0, boxShadow: '0 2px 12px 0 rgba(16,24,40,0.04)', border: '1px solid #eee', bgcolor: '#fff', overflow: 'visible' }}>
        <Typography variant="h3" fontWeight={900} color="primary" mb={2} sx={{ letterSpacing: -1 }}>Locations</Typography>
        <Typography variant="body1" color="text.secondary" mb={4}>
          Manage locations and their tax rates. Bottles assigned to these locations are considered "at home" and not rented until scanned to a customer order.
        </Typography>

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
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleEdit(location.id)}
                          disabled={loading}
                        >
                          <EditIcon />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Box mt={4} p={3} bgcolor="#f8f9fa" borderRadius={2} border="1px solid #e9ecef">
          <Typography variant="h6" fontWeight={600} color="primary" mb={2}>
            📋 Location Assignment Rules
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={1}>
            • Bottles assigned to these locations are considered "at home" and not rented
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={1}>
            • When a bottle is scanned to a customer order, it will be assigned to that customer
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={1}>
            • Tax rates are automatically applied based on the location when billing
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Locations can be selected when bulk importing bottles or assigning individual bottles
          </Typography>
        </Box>

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={() => setSnackbarOpen(false)}
        >
          <Alert 
            onClose={() => setSnackbarOpen(false)} 
            severity={snackbarSeverity}
            sx={{ width: '100%' }}
          >
            {snackbarMsg}
          </Alert>
        </Snackbar>
      </Paper>
    </Box>
  );
} 