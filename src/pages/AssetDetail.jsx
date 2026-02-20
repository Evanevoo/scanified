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

// Same derivation as Inventory (Assets) page - group by product_code when present so one row per code
function deriveInventoryGasTypes(bottles) {
  const assetMap = new Map();
  function cleanedLabel(bottle) {
    let gasType = bottle.description || bottle.product_code || bottle.gas_type || bottle.type;
    if (gasType) {
      gasType = gasType
        .replace(/^AVIATOR\s+/i, '')
        .replace(/\s+BOTTLE.*$/i, '')
        .replace(/\s+ASSET.*$/i, '')
        .replace(/\s+SIZE\s+\d+.*$/i, '')
        .replace(/\s+-\s+SIZE\s+\d+.*$/i, '')
        .replace(/\s+ASSETS.*$/i, '')
        .trim();
      if (gasType.length < 3) gasType = bottle.description || bottle.product_code || bottle.gas_type || bottle.type;
    }
    return gasType || 'Unknown Gas Type';
  }
  bottles.forEach((bottle) => {
    const normalizedCode = bottle.product_code && bottle.product_code.trim() ? bottle.product_code.trim() : null;
    const groupingKey = normalizedCode || cleanedLabel(bottle);
    if (!assetMap.has(groupingKey)) assetMap.set(groupingKey, []);
    assetMap.get(groupingKey).push(bottle);
  });
  return Array.from(assetMap.keys()).filter(Boolean).sort((a, b) => (a || '').localeCompare(b || ''));
}

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
  const [ownershipValues, setOwnershipValues] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [loadingExceptions, setLoadingExceptions] = useState(false);
  const [movementHistory, setMovementHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [customerData, setCustomerData] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [gasTypes, setGasTypes] = useState([]);

  useEffect(() => {
    fetchAssetDetail();
    fetchLocations();
    fetchCustomers();
    fetchGasTypes();
    if (profile?.organization_id) {
      fetchOwnershipValues();
    }
    if (id) {
      fetchExceptions();
    }
  }, [id, profile?.organization_id]);

  // Fetch movement history when asset is loaded
  useEffect(() => {
    if (asset?.barcode_number || asset?.serial_number) {
      fetchMovementHistory();
    }
  }, [asset?.barcode_number, asset?.serial_number, profile?.organization_id]);

  // Fetch customer data when assigned_customer changes
  useEffect(() => {
    if (asset?.assigned_customer) {
      fetchCustomerData(asset.assigned_customer);
    } else {
      setCustomerData(null);
    }
  }, [asset?.assigned_customer, profile?.organization_id]);

  const fetchAssetDetail = async () => {
    try {
      setLoading(true);
      
      // CRITICAL SECURITY: Must filter by organization_id to prevent cross-organization data access
      if (!profile?.organization_id) {
        throw new Error('Organization not found. Please log in again.');
      }
      
      const { data, error } = await supabase
        .from('bottles')
        .select('id, barcode_number, serial_number, product_code, gas_type, status, location, assigned_customer, customer_name, ownership, description, organization_id')
        .eq('id', id)
        .eq('organization_id', profile.organization_id)
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
      // Only set editData with fields that can be edited (exclude system fields like id, organization_id, created_at, updated_at, etc.)
      setEditData({
        barcode_number: data.barcode_number || '',
        serial_number: data.serial_number || '',
        product_code: data.product_code || '',
        gas_type: data.gas_type || '',
        status: data.status || 'available',
        location: data.location || '',
        assigned_customer: data.assigned_customer || '',
        customer_name: data.customer_name || '',
        ownership: data.ownership || '',
        description: data.description || ''
      });
      
      // Fetch customer data if bottle is assigned to a customer
      if (data?.assigned_customer) {
        fetchCustomerData(data.assigned_customer);
      }
      
      // Fetch movement history after asset is loaded
      if (data?.barcode_number || data?.serial_number) {
        fetchMovementHistory();
      }
    } catch (error) {
      logger.error('Error fetching asset:', error);
      setError(error.message || 'Failed to load asset details');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoadingCustomers(true);
      if (!profile?.organization_id) return;

      const { data, error } = await supabase
        .from('customers')
        .select('CustomerListID, name, customer_type')
        .eq('organization_id', profile.organization_id)
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      logger.error('Error fetching customers:', error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Build the same Gas Type list as Inventory (/inventory) from this org's bottles
  const fetchGasTypes = async () => {
    try {
      if (!profile?.organization_id) return;
      const { data: bottles, error } = await supabase
        .from('bottles')
        .select('product_code, description, gas_type, type')
        .eq('organization_id', profile.organization_id);

      if (error) throw error;
      const list = deriveInventoryGasTypes(bottles || []);
      setGasTypes(list);
    } catch (err) {
      logger.error('Error fetching gas types from inventory:', err);
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

  const fetchExceptions = async () => {
    try {
      setLoadingExceptions(true);
      if (!profile?.organization_id || !id) return;

      const { data, error } = await supabase
        .from('asset_exceptions')
        .select('*')
        .eq('asset_id', id)
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching exceptions:', error);
        return;
      }

      setExceptions(data || []);
    } catch (error) {
      logger.error('Error fetching exceptions:', error);
    } finally {
      setLoadingExceptions(false);
    }
  };

  const fetchCustomerData = async (customerId) => {
    try {
      if (!profile?.organization_id || !customerId) return;

      const { data, error } = await supabase
        .from('customers')
        .select('CustomerListID, name, location, city, province')
        .eq('CustomerListID', customerId)
        .eq('organization_id', profile.organization_id)
        .single();

      if (error) {
        logger.error('Error fetching customer data:', error);
        return;
      }

      setCustomerData(data);
    } catch (error) {
      logger.error('Error fetching customer data:', error);
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

  const fetchMovementHistory = async () => {
    try {
      setLoadingHistory(true);
      if (!profile?.organization_id || !asset) return;

      const barcodeNumber = asset.barcode_number;
      const serialNumber = asset.serial_number;
      
      if (!barcodeNumber && !serialNumber) {
        setMovementHistory([]);
        return;
      }

      let allHistory = [];

      // 1. Fetch from scans table (primary source for movement history)
      if (barcodeNumber) {
        const { data: scansData, error: scansError } = await supabase
          .from('scans')
          .select('id, barcode_number, created_at, "mode", action')
          .eq('barcode_number', barcodeNumber)
          .eq('organization_id', profile.organization_id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (!scansError && scansData) {
          scansData.forEach(scan => {
            allHistory.push({
              ...scan,
              history_type: 'scan',
              action: scan.mode || scan.action || 'SCAN'
            });
          });
        } else if (scansError) {
          logger.error('Error fetching scans:', scansError);
        }
      }

      // 2. Fetch from bottle_scans table (bottle_barcode, cylinder_barcode, or barcode_number)
      if (barcodeNumber) {
        const { data: bsData, error: bsError } = await supabase
          .from('bottle_scans')
          .select('*')
          .or(`barcode_number.eq.${barcodeNumber},bottle_barcode.eq.${barcodeNumber},cylinder_barcode.eq.${barcodeNumber}`)
          .eq('organization_id', profile.organization_id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (!bsError && bsData) {
          bsData.forEach(scan => {
            allHistory.push({
              ...scan,
              history_type: 'bottle_scan',
              barcode_number: scan.barcode_number || scan.bottle_barcode,
              action: scan.mode || 'SCAN'
            });
          });
        }
      }

      // 3. Fetch from rentals table (for shipment/return dates)
      if (barcodeNumber) {
        const { data: rentalsData, error: rentalsError } = await supabase
          .from('rentals')
          .select('*')
          .or(`bottle_barcode.eq.${barcodeNumber},bottle_id.eq.${asset.id}`)
          .eq('organization_id', profile.organization_id)
          .order('rental_start_date', { ascending: false })
          .limit(50);

        if (!rentalsError && rentalsData) {
          rentalsData.forEach(rental => {
            // Add rental start (shipment)
            if (rental.rental_start_date) {
              allHistory.push({
                id: `rental_start_${rental.id}`,
                history_type: 'rental_start',
                barcode_number: rental.bottle_barcode || barcodeNumber,
                customer_id: rental.customer_id,
                customer_name: rental.customer_name,
                location: rental.location,
                created_at: rental.rental_start_date,
                action: 'SHIP',
                mode: 'SHIP',
                order_number: rental.order_number || null
              });
            }
            // Add rental end (return)
            if (rental.rental_end_date) {
              allHistory.push({
                id: `rental_end_${rental.id}`,
                history_type: 'rental_end',
                barcode_number: rental.bottle_barcode || barcodeNumber,
                customer_id: rental.customer_id,
                customer_name: rental.customer_name,
                location: rental.location,
                created_at: rental.rental_end_date,
                action: 'RETURN',
                mode: 'RETURN',
                order_number: rental.order_number || null
              });
            }
          });
        }
      }

      // 4. Fetch from cylinder_fills table (for fill history)
      if (barcodeNumber || asset.id) {
        const { data: fillsData, error: fillsError } = await supabase
          .from('cylinder_fills')
          .select('*')
          .or(`barcode_number.eq.${barcodeNumber || ''},cylinder_id.eq.${asset.id || ''}`)
          .order('fill_date', { ascending: false })
          .limit(50);

        if (!fillsError && fillsData) {
          fillsData.forEach(fill => {
            allHistory.push({
              id: `fill_${fill.id}`,
              history_type: 'fill',
              barcode_number: fill.barcode_number || barcodeNumber,
              created_at: fill.fill_date || fill.created_at,
              action: 'FILL',
              mode: 'FILL',
              filled_by: fill.filled_by,
              notes: fill.notes
            });
          });
        }
      }

      // 5. Add bottle creation as "Add New Asset" if we have created_at
      if (asset.created_at) {
        allHistory.push({
          id: 'bottle_created',
          history_type: 'creation',
          barcode_number: barcodeNumber,
          created_at: asset.created_at,
          action: 'Add New Asset',
          mode: 'CREATE',
          location: asset.location
        });
      }

      // Deduplicate by created_at and action type
      const uniqueHistory = allHistory.reduce((acc, item) => {
        const key = `${item.created_at}_${item.action || item.mode}_${item.history_type || ''}`;
        if (!acc.find(existing => {
          const existingKey = `${existing.created_at}_${existing.action || existing.mode}_${existing.history_type || ''}`;
          return existingKey === key;
        })) {
          acc.push(item);
        }
        return acc;
      }, []);

      // Sort by date, most recent first
      uniqueHistory.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setMovementHistory(uniqueHistory.slice(0, 50));
    } catch (error) {
      logger.error('Error fetching movement history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      // SECURITY: Verify user has permission to update this asset
      if (!profile?.organization_id) {
        throw new Error('Organization not found');
      }
      
      // Track if assignment changed
      const previousCustomer = asset.assigned_customer;
      const previousCustomerName = asset.customer_name;
      const previousLocation = asset.location;
      
      // Determine status based on customer assignment and ownership
      let finalStatus = editData.status;
      const ownershipValue = String(editData.ownership || '').trim().toLowerCase();
      const isCustomerOwned = ownershipValue.includes('customer') || 
                             ownershipValue.includes('owned') || 
                             ownershipValue === 'customer owned';
      
      // If assigning to customer, set status appropriately
      if (editData.assigned_customer && editData.assigned_customer.trim()) {
        // Find customer to get customer type
        const customer = customers.find(c => c.CustomerListID === editData.assigned_customer);
        
        if (customer?.customer_type === 'VENDOR') {
          // Vendors are in-house, no charge
          finalStatus = 'available';
        } else if (isCustomerOwned) {
          // Customer-owned bottles stay available
          finalStatus = 'available';
        } else {
          // Regular customer assignment = rented
          finalStatus = 'rented';
        }
        
        // Get customer name if not set
        if (!editData.customer_name && customer) {
          editData.customer_name = customer.name;
        }
      } else {
        // Unassigning customer (return) - set to empty so it shows "Empty" until refilled
        finalStatus = 'empty';
        editData.customer_name = null;
      }
      
      // Build update data object with only valid fields, ensuring no undefined or system fields
      const updateData = {};
      
      // Only include fields that exist and are not empty strings (convert empty strings to null)
      if (editData.barcode_number !== undefined) {
        updateData.barcode_number = editData.barcode_number || null;
      }
      if (editData.serial_number !== undefined) {
        updateData.serial_number = editData.serial_number || null;
      }
      if (editData.product_code !== undefined) {
        updateData.product_code = editData.product_code || null;
      }
      if (editData.gas_type !== undefined) {
        updateData.gas_type = editData.gas_type || null;
      }
      if (finalStatus !== undefined) {
        updateData.status = finalStatus;
      }
      if (editData.location !== undefined) {
        updateData.location = editData.location || null;
      }
      if (editData.assigned_customer !== undefined) {
        updateData.assigned_customer = editData.assigned_customer || null;
      }
      if (editData.customer_name !== undefined) {
        updateData.customer_name = editData.customer_name || null;
      }
      if (editData.ownership !== undefined) {
        updateData.ownership = editData.ownership || null;
      }
      if (editData.description !== undefined) {
        updateData.description = editData.description || null;
      }
      
      // Explicitly remove any system fields that might have been included
      delete updateData.id;
      delete updateData.organization_id;
      delete updateData.created_at;
      delete updateData.updated_at;
      
      const { error } = await supabase
        .from('bottles')
        .update(updateData)
        .eq('id', id)
        .eq('organization_id', profile.organization_id);

      if (error) throw error;

      // Create a scan record if assignment changed
      const assignmentChanged = previousCustomer !== editData.assigned_customer;
      const locationChanged = previousLocation !== editData.location;
      
      if (assignmentChanged || locationChanged) {
        const scanMode = assignmentChanged 
          ? (editData.assigned_customer ? 'SHIP' : 'RETURN')
          : 'LOCATE';
        
        const scanData = {
          barcode_number: asset.barcode_number || editData.barcode_number,
          serial_number: asset.serial_number || editData.serial_number,
          product_code: asset.product_code || editData.product_code,
          gas_type: asset.gas_type || editData.gas_type,
          mode: scanMode,
          action: scanMode === 'RETURN' ? 'in' : scanMode === 'SHIP' ? 'out' : null,
          order_number: 'manual', // Placeholder so insert doesn't fail if column is NOT NULL
          customer_id: editData.assigned_customer || null,
          customer_name: editData.customer_name || null,
          location: editData.location || null,
          organization_id: profile.organization_id,
          created_at: new Date().toISOString(),
          status: 'approved' // Manual assignments are automatically approved
        };
        
        // Insert into scans table (for movement history)
        const { error: scanError } = await supabase
          .from('scans')
          .insert(scanData);
        
        if (scanError) {
          logger.error('Error creating scan record:', scanError);
          // Don't throw - the bottle update succeeded, scan record is just for history
        } else {
          logger.log('Created scan record for assignment change');
        }
      }

      // Refresh asset data
      await fetchAssetDetail();
      setEditDialog(false);
      setSuccess('Bottle updated successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
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
          startIcon={<HistoryIcon />}
          onClick={() => {
            const historyId = asset.barcode_number || asset.serial_number || id;
            navigate(`/assets/${historyId}/history`);
          }}
          sx={{ mr: 1 }}
        >
          View History
        </Button>
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={() => {
            // Reset editData to current asset when opening edit dialog (only editable fields)
            if (asset) {
              setEditData({
                barcode_number: asset.barcode_number || '',
                serial_number: asset.serial_number || '',
                product_code: asset.product_code || '',
                gas_type: asset.gas_type || '',
                status: asset.status || 'available',
                location: asset.location || '',
                assigned_customer: asset.assigned_customer || '',
                customer_name: asset.customer_name || '',
                ownership: asset.ownership || '',
                description: asset.description || ''
              });
            }
            setEditDialog(true);
          }}
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
              Gas Type
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {asset.gas_type || '-'}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="textSecondary">
              Status
            </Typography>
            <Chip 
              label={
                asset.status === 'filled' ? 'Full' :
                asset.status === 'empty' ? 'Empty' :
                asset.status === 'rented' ? 'Rented' :
                asset.status === 'available' ? 'Available' :
                asset.status || 'Unknown'
              }
              color={
                asset.status === 'filled' ? 'success' :
                asset.status === 'empty' ? 'warning' :
                asset.status === 'rented' ? 'success' :
                asset.status === 'available' ? 'default' :
                asset.status === 'maintenance' ? 'warning' :
                asset.status === 'retired' ? 'secondary' :
                asset.status === 'lost' ? 'error' : 'default'
              }
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="textSecondary">
              Location
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {(() => {
                // If bottle is assigned to a customer, show customer's location first
                if (customerData?.location) {
                  return customerData.location;
                }
                // Otherwise show bottle's location
                return asset.location || '-';
              })()}
            </Typography>
            {customerData?.location && asset.location && customerData.location !== asset.location && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                (Bottle location: {asset.location})
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
              Customer Location
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {customerData?.location || customerData?.city || '-'}
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

      {/* Movement History Section */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            Movement History
          </Typography>
          <Button
            variant="text"
            size="small"
            startIcon={<HistoryIcon />}
            onClick={() => {
              const historyId = asset.barcode_number || asset.serial_number || id;
              navigate(`/assets/${historyId}/history`);
            }}
          >
            View Full History
          </Button>
        </Box>
        {loadingHistory ? (
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress size={24} />
          </Box>
        ) : movementHistory.length > 0 ? (
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #e0e0e0' }}>
                  <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Action</th>
                  <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Resulting Location</th>
                  <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Category</th>
                  <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Group</th>
                  <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Type</th>
                  <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Product Code</th>
                  <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Description</th>
                  <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Barcode</th>
                  <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Map</th>
                </tr>
              </thead>
              <tbody>
                {movementHistory.slice(0, 10).map((record, index) => {
                  // Determine action type based on mode/action
                  let action = '';
                  const recordMode = record.mode;
                  if (recordMode === 'SHIP' || record.action === 'SHIP' || record.history_type === 'rental_start') {
                    action = 'Delivery';
                  } else if (recordMode === 'RETURN' || record.action === 'RETURN' || record.history_type === 'rental_end') {
                    action = 'Return';
                  } else if (recordMode === 'FILL' || record.action === 'FILL' || record.history_type === 'fill') {
                    action = 'Fill';
                  } else if (recordMode === 'LOCATE' || record.action === 'LOCATE') {
                    action = 'Locate Full';
                  } else if (recordMode === 'CREATE' || record.action === 'Add New Asset' || record.history_type === 'creation') {
                    action = 'Add New Asset';
                  } else {
                    action = recordMode || record.action || 'Scan';
                  }
                  
                  // Determine resulting location
                  let resultingLocation = '';
                  if (record.customer_name) {
                    const customerId = record.customer_id || record.assigned_customer || '';
                    resultingLocation = `Customer: ${record.customer_name}${customerId ? ` (${customerId})` : ''}`;
                  } else if (record.location) {
                    resultingLocation = `In-House: ${record.location}`;
                  } else if (record.history_type === 'fill') {
                    resultingLocation = 'Fill Plant';
                  } else {
                    resultingLocation = 'Unknown';
                  }
                  
                  // Get asset details (use asset data or record data)
                  const category = asset.category || record.category || 'INDUSTRIAL CYLINDERS';
                  const group = asset.gas_type || record.gas_type || record.group || '';
                  const type = asset.product_code || record.product_code || record.type || '';
                  const productCode = asset.product_code || record.product_code || '';
                  const description = asset.description || record.description || '';
                  const barcode = asset.barcode_number || record.barcode_number || record.bottle_barcode || '';
                  
                  // Format date
                  const dateStr = record.created_at 
                    ? new Date(record.created_at).toLocaleDateString('en-US', { 
                        month: 'numeric', 
                        day: 'numeric', 
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })
                    : '-';
                  
                  return (
                    <tr key={record.id || index} style={{ borderBottom: '1px solid #e0e0e0' }}>
                      <td style={{ padding: '8px' }}>{dateStr}</td>
                      <td style={{ padding: '8px' }}>{action}</td>
                      <td style={{ padding: '8px' }}>{resultingLocation}</td>
                      <td style={{ padding: '8px' }}>{category}</td>
                      <td style={{ padding: '8px' }}>{group}</td>
                      <td style={{ padding: '8px' }}>{type}</td>
                      <td style={{ padding: '8px' }}>{productCode}</td>
                      <td style={{ padding: '8px' }}>{description}</td>
                      <td style={{ padding: '8px' }}>{barcode}</td>
                      <td style={{ padding: '8px' }}>
                        {record.location && (
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => {
                              // Navigate to map or show location details
                              window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(record.location)}`, '_blank');
                            }}
                          >
                            View
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {movementHistory.length > 10 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Showing 10 of {movementHistory.length} records. Click "View Full History" to see all.
              </Typography>
            )}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No movement history found for this {assetTitle.toLowerCase()}.
          </Typography>
        )}
      </Paper>

      {/* Exceptions Section */}
      {exceptions.length > 0 && (
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Exceptions on this asset
          </Typography>
          {loadingExceptions ? (
            <Box display="flex" justifyContent="center" p={2}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            exceptions.map((exception) => (
              <Alert 
                key={exception.id} 
                severity={exception.resolution_status === 'RESOLVED' ? 'info' : 'warning'}
                sx={{ mb: 2 }}
              >
                <Box>
                  <Typography variant="body2" fontWeight="bold" gutterBottom>
                    {exception.resolution_status === 'RESOLVED' ? 'Resolved' : exception.resolution_status}: {exception.exception_type}
                  </Typography>
                  {exception.resolution_note && (
                    <Typography variant="body2" color="text.secondary">
                      {exception.resolution_note}
                    </Typography>
                  )}
                  {exception.order_number && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      Order: {exception.order_number}
                    </Typography>
                  )}
                  {exception.created_at && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {new Date(exception.created_at).toLocaleString()}
                    </Typography>
                  )}
                </Box>
              </Alert>
            ))
          )}
        </Paper>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialog} onClose={() => {
        setEditDialog(false);
        // Reset editData to current asset when closing (only editable fields)
        if (asset) {
          setEditData({
            barcode_number: asset.barcode_number || '',
            serial_number: asset.serial_number || '',
            product_code: asset.product_code || '',
            gas_type: asset.gas_type || '',
            status: asset.status || 'available',
            location: asset.location || '',
            assigned_customer: asset.assigned_customer || '',
            customer_name: asset.customer_name || '',
            ownership: asset.ownership || '',
            description: asset.description || ''
          });
        }
      }} maxWidth="md" fullWidth>
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
                <InputLabel>Gas Type</InputLabel>
                <Select
                  value={editData.gas_type || ''}
                  onChange={(e) => setEditData({ ...editData, gas_type: e.target.value })}
                  label="Gas Type"
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {gasTypes.map((label) => (
                    <MenuItem key={label} value={label}>
                      {label}
                    </MenuItem>
                  ))}
                  {/* If current value is not in inventory list (e.g. new type), keep it selectable */}
                  {editData.gas_type && !gasTypes.includes((editData.gas_type || '').trim()) && (
                    <MenuItem value={editData.gas_type}>
                      {editData.gas_type} (current)
                    </MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={editData.status || 'available'}
                  onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                  label="Status"
                >
                  <MenuItem value="available">Available</MenuItem>
                  <MenuItem value="filled">Full</MenuItem>
                  <MenuItem value="empty">Empty</MenuItem>
                  <MenuItem value="rented">Rented</MenuItem>
                  <MenuItem value="maintenance">Maintenance</MenuItem>
                  <MenuItem value="retired">Retired</MenuItem>
                  <MenuItem value="lost">Lost</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Location</InputLabel>
                <Select
                  value={editData.location || ''}
                  onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                  label="Location"
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {locations.map((location) => (
                    <MenuItem key={location.id} value={location.name.toUpperCase()}>
                      {location.name} ({location.province})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Assign to Customer</InputLabel>
                <Select
                  value={editData.assigned_customer || ''}
                  onChange={(e) => {
                    const customerId = e.target.value;
                    const customer = customers.find(c => c.CustomerListID === customerId);
                    setEditData({ 
                      ...editData, 
                      assigned_customer: customerId || null,
                      customer_name: customer?.name || null
                    });
                  }}
                  label="Assign to Customer"
                  disabled={loadingCustomers}
                >
                  <MenuItem value="">
                    <em>Unassign (No Customer)</em>
                  </MenuItem>
                  {customers.map((customer) => (
                    <MenuItem key={customer.CustomerListID} value={customer.CustomerListID}>
                      {customer.name} ({customer.CustomerListID})
                      {customer.customer_type === 'VENDOR' && ' - Vendor'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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
          <Button onClick={() => {
            setEditDialog(false);
            // Reset editData to current asset when canceling (only editable fields)
            if (asset) {
              setEditData({
                barcode_number: asset.barcode_number || '',
                serial_number: asset.serial_number || '',
                product_code: asset.product_code || '',
                gas_type: asset.gas_type || '',
                status: asset.status || 'available',
                location: asset.location || '',
                assigned_customer: asset.assigned_customer || '',
                customer_name: asset.customer_name || '',
                ownership: asset.ownership || '',
                description: asset.description || ''
              });
            }
          }}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 