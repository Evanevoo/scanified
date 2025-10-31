import logger from '../utils/logger';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
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
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { terms, isReady } = useDynamicAssetTerms();

  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    fetchAssetDetail();
    fetchLocations();
  }, [id]);

  const fetchAssetDetail = async () => {
    try {
      setLoading(true);
      
      // CRITICAL SECURITY: Must filter by organization_id to prevent cross-organization data access
      if (!profile?.organization_id) {
        throw new Error('Organization not found. Please log in again.');
      }
      
      const { data, error } = await supabase
        .from('bottles') // Keep using bottles table for now
        .select('*')
        .eq('id', id)
        .eq('organization_id', profile.organization_id) // SECURITY: Only show assets from user's organization
        .single();

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

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // SECURITY: Verify user has permission to update this asset
      if (!profile?.organization_id) {
        throw new Error('Organization not found');
      }
      
      const { error } = await supabase
        .from('bottles') // Keep using bottles table for now
        .update(editData)
        .eq('id', id)
        .eq('organization_id', profile.organization_id); // SECURITY: Only update assets in user's organization

      if (error) throw error;

      setAsset(editData);
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
      
      const { error } = await supabase
        .from('bottles') // Keep using bottles table for now
        .delete()
        .eq('id', id)
        .eq('organization_id', profile.organization_id); // SECURITY: Only delete assets from user's organization

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
              {asset.location || '-'}
            </Typography>
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
                  value={editData.location || ''}
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
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Ownership"
                value={editData.ownership || ''}
                onChange={(e) => setEditData({ ...editData, ownership: e.target.value })}
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