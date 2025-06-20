import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Snackbar, 
  Alert, 
  CircularProgress, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Table, 
  TableHead, 
  TableRow, 
  TableCell, 
  TableBody, 
  Grid,
  TextField,
  InputAdornment,
  TablePagination,
  Chip,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  TableContainer,
  FormControlLabel,
  Checkbox,
  Stack
} from '@mui/material';
import { 
  Search as SearchIcon, 
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Visibility as ViewIcon,
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { supabase } from '../supabase/client';
import { get } from 'lodash';
import backgroundService from '../utils/backgroundService';

const columns = [
  { label: 'Serial Number', key: 'serial_number' },
  { label: 'Barcode', key: 'barcode_number' },
  { label: 'CustomerListID', key: 'CustomerListID' },
  { label: 'Customer Name', key: 'customer_name' },
  { label: 'ProductCode', key: 'product_code' },
  { label: 'Description', key: 'description' },
  { label: 'Ownership', key: 'ownership' },
  { label: 'Days At Location', key: 'days_at_location' },
  { label: 'Location', key: 'location' },
  { label: 'Gas Type', key: 'gas_type' },
];

export default function BottleImport() {
  const [importing, setImporting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [fileData, setFileData] = useState([]);
  const [fileHeaders, setFileHeaders] = useState([]);
  const [columnMappings, setColumnMappings] = useState({});
  const [previewData, setPreviewData] = useState([]);
  const [mappingDialog, setMappingDialog] = useState(false);
  
  // Bottle display states
  const [bottles, setBottles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterGasType, setFilterGasType] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [customers, setCustomers] = useState([]);
  const [gasTypes, setGasTypes] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedBottleId, setSelectedBottleId] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bottleToEdit, setBottleToEdit] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch bottles with pagination and filters
  const fetchBottles = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('bottles')
        .select('*', { count: 'exact' });

      // Apply search filter
      if (searchTerm) {
        query = query.or(`barcode_number.ilike.%${searchTerm}%,serial_number.ilike.%${searchTerm}%,product_code.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      // Apply customer filter
      if (filterCustomer) {
        query = query.eq('assigned_customer', filterCustomer);
      }

      // Apply gas type filter
      if (filterGasType) {
        query = query.eq('gas_type', filterGasType);
      }

      // Apply location filter
      if (filterLocation) {
        query = query.eq('location', filterLocation);
      }

      // Apply pagination
      const from = page * rowsPerPage;
      const to = from + rowsPerPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      // Fetch customer data for bottles that have assigned_customer
      const bottlesWithCustomers = data || [];
      const customerIds = [...new Set(bottlesWithCustomers
        .map(bottle => bottle.assigned_customer)
        .filter(Boolean))];

      let customerMap = {};
      if (customerIds.length > 0) {
        const { data: customerData } = await supabase
          .from('customers')
          .select('"CustomerListID", name')
          .in('CustomerListID', customerIds);
        
        customerMap = (customerData || []).reduce((map, customer) => {
          map[customer.CustomerListID] = customer;
          return map;
        }, {});
      }

      // Add customer data to bottles
      const bottlesWithCustomerData = bottlesWithCustomers.map(bottle => ({
        ...bottle,
        customer: bottle.assigned_customer ? customerMap[bottle.assigned_customer] : null
      }));

      setBottles(bottlesWithCustomerData);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching bottles:', error);
      setSnackbar({ open: true, message: 'Error loading bottles: ' + error.message, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch filter options
  const fetchFilterOptions = async () => {
    try {
      // Get customers
      const { data: customerData } = await supabase
        .from('customers')
        .select('"CustomerListID", name')
        .order('name');
      setCustomers(customerData || []);

      // Get unique gas types
      const { data: gasData } = await supabase
        .from('bottles')
        .select('gas_type')
        .not('gas_type', 'is', null);
      const uniqueGasTypes = [...new Set(gasData?.map(b => b.gas_type) || [])];
      setGasTypes(uniqueGasTypes.sort());

      // Get unique locations
      const { data: locationData } = await supabase
        .from('bottles')
        .select('location')
        .not('location', 'is', null);
      const uniqueLocations = [...new Set(locationData?.map(b => b.location) || [])];
      setLocations(uniqueLocations.sort());
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  useEffect(() => {
    fetchBottles();
    fetchFilterOptions();
  }, [page, rowsPerPage, searchTerm, filterCustomer, filterGasType, filterLocation]);

  const handleImport = async (file) => {
    setImporting(true);
    try {
      let rows = [];
      const ext = file.name.split('.').pop().toLowerCase();
      if (ext === 'csv' || ext === 'txt') {
        const text = await file.text();
        const lines = text.split('\n').filter(Boolean);
        const headers = lines[0].split(',').map(h => h.trim());
        rows = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          const row = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx] || '';
          });
          return row;
        });
      } else if (ext === 'xlsx' || ext === 'xls') {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(sheet);
      } else {
        throw new Error('Unsupported file type. Please use CSV, XLS, or XLSX.');
      }
      setFileData(rows);
      setFileHeaders(Object.keys(rows[0] || {}));
      setPreviewData(rows.slice(0, 5));
      // Auto-map columns
      const autoMappings = {};
      columns.forEach(col => {
        const match = fileHeaders.find(h => h.toLowerCase().replace(/\s|_/g, '') === col.key.toLowerCase().replace(/\s|_/g, ''));
        if (match) autoMappings[col.key] = match;
      });
      setColumnMappings(autoMappings);
      setMappingDialog(true);
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    } finally {
      setImporting(false);
    }
  };

  const processImport = async () => {
    setImporting(true);
    setMappingDialog(false);
    try {
      // 1. Normalize and gather all unique customer_list_id/customer_name
      const customerMap = {};
      for (let i = 0; i < fileData.length; i++) {
        const row = fileData[i];
        const get = (field) => row[columnMappings[field]] || '';
        const rawId = get('CustomerListID');
        const normalizedCustomerListId = String(rawId || '').toUpperCase().trim();
        const customerName = get('customer_name') || normalizedCustomerListId;
        if (normalizedCustomerListId) {
          customerMap[normalizedCustomerListId] = customerName;
        }
      }
      
      // 2. Fetch all existing customers (normalized)
      const allCustomerIds = Object.keys(customerMap);
      let existingCustomers = [];
      if (allCustomerIds.length > 0) {
        const { data: foundCustomers, error: custErr } = await supabase
          .from('customers')
          .select('"CustomerListID", name');
        if (!custErr && foundCustomers) {
          existingCustomers = foundCustomers.map(c => String(c.CustomerListID).toUpperCase().trim());
        }
      }
      
      // 3. Insert any missing customers
      const missingCustomers = allCustomerIds.filter(cid => !existingCustomers.includes(cid));
      if (missingCustomers.length > 0) {
        const toInsert = missingCustomers.map(cid => ({
          CustomerListID: cid,
          name: customerMap[cid] || cid
        }));
        const { error: insertCustomerError } = await supabase.from('customers').insert(toInsert);
        if (insertCustomerError) {
          throw new Error(`Failed to create customers: ${insertCustomerError.message}`);
        }
      }
      
      // 4. Refresh customer list after insert and get exact case from database
      let { data: allCustomers, error: allCustErr } = await supabase
        .from('customers')
        .select('"CustomerListID", name');
      if (allCustErr) {
        throw new Error(`Failed to fetch customers: ${allCustErr.message}`);
      }
      
      // Create a map of normalized ID to exact case from database
      const customerIdMap = {};
      (allCustomers || []).forEach(c => {
        const normalized = String(c.CustomerListID).toUpperCase().trim();
        customerIdMap[normalized] = c.CustomerListID; // Store exact case from database
      });
      
      // 5. Build validBottles, create customers if they don't exist
      const validBottles = [];
      const skippedRows = [];
      for (let i = 0; i < fileData.length; i++) {
        const row = fileData[i];
        const get = (field) => row[columnMappings[field]] || '';
        const barcode = get('barcode_number');
        const serial = get('serial_number');
        const rawId = get('CustomerListID');
        const customerName = get('customer_name');
        const normalizedCustomerListId = String(rawId || '').toUpperCase().trim();
        
        if (!barcode && !serial) {
          skippedRows.push(`Row ${i + 2}: Missing barcode and serial number.`);
          continue;
        }
        
        // If we have a customer name or ID, try to find or create the customer
        let finalCustomerListId = null;
        if (normalizedCustomerListId || customerName) {
          // First try to find by CustomerListID
          if (normalizedCustomerListId && customerIdMap[normalizedCustomerListId]) {
            finalCustomerListId = customerIdMap[normalizedCustomerListId];
          } else if (customerName) {
            // Try to find by name
            const { data: customerByName, error: nameErr } = await supabase
              .from('customers')
              .select('"CustomerListID"')
              .ilike('name', customerName.trim())
              .single();
            
            if (customerByName && !nameErr) {
              finalCustomerListId = customerByName.CustomerListID;
              // Update our map for future lookups
              const normalized = String(finalCustomerListId).toUpperCase().trim();
              customerIdMap[normalized] = finalCustomerListId;
            } else {
              // Create new customer
              const newCustomerId = normalizedCustomerListId || `CUST_${Date.now()}_${i}`;
              const { data: newCustomer, error: createErr } = await supabase
                .from('customers')
                .insert({
                  CustomerListID: newCustomerId,
                  name: customerName || newCustomerId
                })
                .select('"CustomerListID"')
                .single();
              
              if (newCustomer && !createErr) {
                finalCustomerListId = newCustomer.CustomerListID;
                // Update our map for future lookups
                const normalized = String(finalCustomerListId).toUpperCase().trim();
                customerIdMap[normalized] = finalCustomerListId;
              } else {
                skippedRows.push(`Row ${i + 2}: Failed to create customer '${customerName || normalizedCustomerListId}': ${createErr?.message || 'Unknown error'}`);
                continue;
              }
            }
          }
        }
        
        const bottleData = {
          customer_name: customerName,
          assigned_customer: finalCustomerListId,
          product_code: get('product_code'),
          description: get('description'),
          ownership: get('ownership'),
          days_at_location: (() => {
            const raw = get('days_at_location');
            if (!raw) return 0;
            const cleaned = String(raw).replace(/,/g, '');
            const parsed = parseInt(cleaned, 10);
            return isNaN(parsed) ? 0 : parsed;
          })(),
          barcode_number: barcode,
          serial_number: serial,
          location: get('location'),
          gas_type: get('gas_type') || 'Unknown',
        };
        validBottles.push(bottleData);
      }
      
      // 6. Insert bottles into bottles table
      if (validBottles.length > 0) {
        const { error: insertError } = await supabase
          .from('bottles')
          .insert(validBottles);
        if (insertError) {
          throw new Error('Import error: ' + insertError.message);
        }
      }
      
      // 7. Feedback and refresh
      let message = `Import complete!`;
      if (validBottles.length > 0) {
        message += ` Imported: ${validBottles.length}.`;
      }
      if (skippedRows.length > 0) {
        message += ` Skipped: ${skippedRows.length}.`;
        message += '\n' + skippedRows.slice(0, 10).join('\n');
        if (skippedRows.length > 10) message += `\n...and ${skippedRows.length - 10} more.`;
      }
      setSnackbar({ open: true, message: message.trim(), severity: skippedRows.length > 0 ? 'warning' : 'success' });
      
      // Refresh the bottles list and filter options
      await fetchBottles();
      await fetchFilterOptions();
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    } finally {
      setImporting(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterCustomer('');
    setFilterGasType('');
    setFilterLocation('');
    setPage(0);
  };

  const handleSelectBottle = (id) => {
    setSelectedBottleId(id === selectedBottleId ? null : id);
  };

  const handleEditBottle = () => {
    const bottle = bottles.find(b => b.id === selectedBottleId);
    setBottleToEdit(bottle);
    setEditForm({ ...bottle });
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('bottles')
        .update(editForm)
        .eq('id', bottleToEdit.id);
      if (error) throw error;
      setSnackbar({ open: true, message: 'Bottle updated successfully!', severity: 'success' });
      setEditDialogOpen(false);
      setSelectedBottleId(null);
      await fetchBottles();
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    }
    setSaving(false);
  };

  const handleDeleteBottle = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('bottles')
        .delete()
        .eq('id', selectedBottleId);
      if (error) throw error;
      setSnackbar({ open: true, message: 'Bottle deleted successfully!', severity: 'success' });
      setDeleteDialogOpen(false);
      setSelectedBottleId(null);
      await fetchBottles();
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    }
    setDeleting(false);
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: '#fff', py: 4, px: 2 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h4" fontWeight={700}>Bottle Management</Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <CheckCircleIcon color="success" fontSize="small" />
          <Typography variant="body2" color="text.secondary">
            Auto-updates running
          </Typography>
        </Box>
      </Box>
      
      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2} sx={{ borderRadius: 2 }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" fontWeight={700} color="primary">
                {totalCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Bottles
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2} sx={{ borderRadius: 2 }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" fontWeight={700} color="success.main">
                {customers.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Customers
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2} sx={{ borderRadius: 2 }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" fontWeight={700} color="info.main">
                {gasTypes.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Gas Types
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2} sx={{ borderRadius: 2 }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" fontWeight={700} color="warning.main">
                {locations.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Locations
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Action Buttons */}
      <Box mb={3} display="flex" gap={2} flexWrap="wrap" alignItems="center">
        <Button
          variant="contained"
          startIcon={<UploadIcon />}
          sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none', px: 3 }}
          component="label"
          disabled={importing}
        >
          {importing ? 'Importing...' : 'Import Bottles'}
          <input
            type="file"
            accept=".csv,.xlsx,.xls,.txt"
            hidden
            onChange={e => {
              if (e.target.files[0]) handleImport(e.target.files[0]);
              e.target.value = '';
            }}
          />
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => {
            fetchBottles();
            fetchFilterOptions();
          }}
          sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none', px: 3 }}
        >
          Refresh
        </Button>
      </Box>

      {/* Search and Filters */}
      <Paper elevation={1} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" fontWeight={600} mb={2}>
          <FilterIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Search & Filters
        </Typography>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6} lg={7}>
            <TextField
              fullWidth
              placeholder="Search barcode, serial, or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              size="medium"
              sx={{ fontSize: 18, height: 48 }}
            />
          </Grid>
          <Grid item md={3} lg={3}>
            <FormControl fullWidth size="medium" sx={{ height: 48, minWidth: 200 }}>
              <InputLabel sx={{ fontSize: 18, top: -7 }}>Customer</InputLabel>
              <Select
                value={filterCustomer}
                onChange={(e) => setFilterCustomer(e.target.value)}
                label="Customer"
                sx={{ height: 48, fontSize: 18, display: 'flex', alignItems: 'center', minWidth: 200 }}
                MenuProps={{ PaperProps: { sx: { fontSize: 18 } } }}
              >
                <MenuItem value="">All Customers</MenuItem>
                {customers.map((customer) => (
                  <MenuItem key={customer.CustomerListID} value={customer.CustomerListID} sx={{ fontSize: 18 }}>
                    {customer.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item md={3} lg={3}>
            <FormControl fullWidth size="medium" sx={{ height: 48, minWidth: 200 }}>
              <InputLabel sx={{ fontSize: 18, top: -7 }}>Gas Type</InputLabel>
              <Select
                value={filterGasType}
                onChange={(e) => setFilterGasType(e.target.value)}
                label="Gas Type"
                sx={{ height: 48, fontSize: 18, display: 'flex', alignItems: 'center', minWidth: 200 }}
                MenuProps={{ PaperProps: { sx: { fontSize: 18 } } }}
              >
                <MenuItem value="">All Types</MenuItem>
                {gasTypes.map((type) => (
                  <MenuItem key={type} value={type} sx={{ fontSize: 18 }}>{type}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item md={3} lg={3}>
            <FormControl fullWidth size="medium" sx={{ height: 48, minWidth: 200 }}>
              <InputLabel sx={{ fontSize: 18, top: -7 }}>Location</InputLabel>
              <Select
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                label="Location"
                sx={{ height: 48, fontSize: 18, display: 'flex', alignItems: 'center', minWidth: 200 }}
                MenuProps={{ PaperProps: { sx: { fontSize: 18 } } }}
              >
                <MenuItem value="">All Locations</MenuItem>
                {locations.map((location) => (
                  <MenuItem key={location} value={location} sx={{ fontSize: 18 }}>{location}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2} lg={2} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={clearFilters}
              sx={{ borderRadius: 3, fontWeight: 700, textTransform: 'none', fontSize: 18, height: 48, px: 3, ml: 2 }}
              size="large"
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<EditIcon />}
          disabled={!selectedBottleId}
          onClick={handleEditBottle}
        >
          Edit
        </Button>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          disabled={!selectedBottleId}
          onClick={handleDeleteBottle}
        >
          Delete
        </Button>
      </Box>

      {/* Bottles Table */}
      <Paper elevation={1} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell padding="checkbox"></TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Barcode</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Serial Number</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Gas Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Product Code</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Ownership</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Days at Location</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : bottles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      No bottles found. {searchTerm || filterCustomer || filterGasType || filterLocation ? 'Try adjusting your filters.' : 'Import some bottles to get started.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                bottles.map((bottle) => (
                  <TableRow key={bottle.id} hover selected={selectedBottleId === bottle.id}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedBottleId === bottle.id}
                        onChange={() => handleSelectBottle(bottle.id)}
                        color="primary"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={bottle.barcode_number || 'N/A'} 
                        size="small" 
                        color={bottle.barcode_number ? "primary" : "default"}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {bottle.serial_number || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {bottle.customer?.name || bottle.customer_name || 'Unassigned'}
                      </Typography>
                      {bottle.customer?.CustomerListID && (
                        <Typography variant="caption" color="text.secondary">
                          {bottle.customer.CustomerListID}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={bottle.gas_type || 'Unknown'} 
                        size="small" 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {bottle.location || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {bottle.product_code || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={bottle.ownership || 'Unknown'} 
                        size="small" 
                        color={bottle.ownership === 'Owned' ? "success" : "default"}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {bottle.days_at_location || 0} days
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton 
                          size="small" 
                          onClick={() => window.open(`/bottles/${bottle.barcode_number || bottle.serial_number}`, '_blank')}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[25, 50, 100]}
          labelRowsPerPage="Bottles per page:"
        />
      </Paper>

      {/* Mapping Dialog */}
      <Dialog open={mappingDialog} onClose={() => setMappingDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Column Mapping</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Map your file columns to the database fields. The system has auto-mapped some columns based on header names.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" mb={2}>Database Fields</Typography>
              {columns.map(col => (
                <FormControl key={col.key} fullWidth sx={{ mb: 2 }}>
                  <InputLabel>{col.label}</InputLabel>
                  <Select
                    value={columnMappings[col.key] || ''}
                    onChange={e => setColumnMappings(prev => ({ ...prev, [col.key]: e.target.value }))}
                    label={col.label}
                  >
                    <MenuItem value="">
                      <em>Not mapped</em>
                    </MenuItem>
                    {fileHeaders.map(header => (
                      <MenuItem key={header} value={header}>{header}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ))}
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" mb={2}>File Preview (First 5 rows)</Typography>
              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {fileHeaders.map(header => (
                        <TableCell key={header} sx={{ fontWeight: 700, fontSize: '0.75rem' }}>{header}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {previewData.map((row, idx) => (
                      <TableRow key={idx}>
                        {fileHeaders.map(header => (
                          <TableCell key={header} sx={{ fontSize: '0.75rem' }}>{row[header] || ''}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMappingDialog(false)}>Cancel</Button>
          <Button onClick={processImport} variant="contained" disabled={importing}>
            {importing ? 'Importing...' : 'Import'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Bottle</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Barcode Number"
            fullWidth
            value={editForm.barcode_number || ''}
            onChange={e => setEditForm(f => ({ ...f, barcode_number: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Serial Number"
            fullWidth
            value={editForm.serial_number || ''}
            onChange={e => setEditForm(f => ({ ...f, serial_number: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Customer"
            select
            fullWidth
            value={editForm.assigned_customer || ''}
            onChange={e => setEditForm(f => ({ ...f, assigned_customer: e.target.value }))}
          >
            <MenuItem value="">Unassigned</MenuItem>
            {customers.map(c => (
              <MenuItem key={c.CustomerListID} value={c.CustomerListID}>{c.name}</MenuItem>
            ))}
          </TextField>
          <TextField
            margin="dense"
            label="Gas Type"
            select
            fullWidth
            value={editForm.gas_type || ''}
            onChange={e => setEditForm(f => ({ ...f, gas_type: e.target.value }))}
          >
            <MenuItem value="">Unknown</MenuItem>
            {gasTypes.map(type => (
              <MenuItem key={type} value={type}>{type}</MenuItem>
            ))}
          </TextField>
          <TextField
            margin="dense"
            label="Location"
            select
            fullWidth
            value={editForm.location || ''}
            onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))}
          >
            <MenuItem value="">N/A</MenuItem>
            {locations.map(loc => (
              <MenuItem key={loc} value={loc}>{loc}</MenuItem>
            ))}
          </TextField>
          <TextField
            margin="dense"
            label="Product Code"
            fullWidth
            value={editForm.product_code || ''}
            onChange={e => setEditForm(f => ({ ...f, product_code: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Ownership"
            fullWidth
            value={editForm.ownership || ''}
            onChange={e => setEditForm(f => ({ ...f, ownership: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleEditSave} color="primary" variant="contained" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </DialogActions>
      </Dialog>
      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs">
        <DialogTitle>Delete Bottle</DialogTitle>
        <DialogContent>
          <p>Are you sure you want to delete this bottle? This action cannot be undone.</p>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={deleting}>{deleting ? 'Deleting...' : 'Delete'}</Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
} 