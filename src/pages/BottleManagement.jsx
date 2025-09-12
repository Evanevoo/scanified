import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Snackbar,
  Alert,
  TablePagination,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  PersonAdd as PersonAddIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

const BottleManagement = () => {
  const { user, organization } = useAuth();
  const navigate = useNavigate();
  const [bottles, setBottles] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Dialog states
  const [uploadDialog, setUploadDialog] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState([]);
  const [editDialog, setEditDialog] = useState(false);
  const [editingBottle, setEditingBottle] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [bottlesToDelete, setBottlesToDelete] = useState([]);

  // Load data
  useEffect(() => {
    if (organization) {
      loadBottles();
      loadCustomers();
    }
  }, [organization]);

  const loadBottles = async () => {
    try {
      const { data, error } = await supabase
        .from('bottles')
        .select(`
          *,
          customers:assigned_customer (
            "CustomerListID",
            name
          )
        `)
        .eq('organization_id', organization.id)
        .order('customer_name', { ascending: true });

      if (error) throw error;
      setBottles(data || []);
    } catch (error) {
      console.error('Error loading bottles:', error);
      setSnackbar({ open: true, message: 'Failed to load bottles', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('"CustomerListID", name')
        .eq('organization_id', organization.id)
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  // Filter and paginate bottles
  const filteredBottles = useMemo(() => {
    let filtered = bottles;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(bottle =>
        bottle.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bottle.barcode_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bottle.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bottle.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(bottle => bottle.status === statusFilter);
    }

    return filtered;
  }, [bottles, searchTerm, statusFilter]);

  const paginatedBottles = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredBottles.slice(start, start + rowsPerPage);
  }, [filteredBottles, page, rowsPerPage]);

  // File upload handling
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadFile(file);
      previewFile(file);
    }
  };

  const previewFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Show first 5 rows as preview
        setUploadPreview(jsonData.slice(0, 5));
      } catch (error) {
        console.error('Error reading file:', error);
        setSnackbar({ open: true, message: 'Invalid file format', severity: 'error' });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleUploadBottles = async () => {
    if (!uploadFile) return;

    try {
      setLoading(true);
      
      // Read Excel file
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          // Get locations for status determination
          const { data: locations } = await supabase
            .from('locations')
            .select('name')
            .eq('organization_id', organization.id);

          const locationNames = locations?.map(loc => loc.name.toLowerCase()) || [];

          // Create customer map
          const customerMap = new Map();
          const { data: existingCustomers } = await supabase
            .from('customers')
            .select('"CustomerListID", name')
            .eq('organization_id', organization.id);

          if (existingCustomers) {
            existingCustomers.forEach(customer => {
              customerMap.set(customer.CustomerListID, customer.name);
            });
          }

          // Process bottles
          const bottlesToInsert = [];
          const customersToCreate = [];
          const processedCustomerIds = new Set();

          // Debug: Log available column names
          if (jsonData.length > 0) {
            console.log('Available Excel columns:', Object.keys(jsonData[0]));
            console.log('Sample row data:', jsonData[0]);
          }

          jsonData.forEach(row => {
            const customerName = row['Customer'] || row['customer_name'] || '';
            const customerId = row['CustomerListID'] || row['customer_list_id'] || '';
            
            // Collect unique customers
            if (customerName.trim() && customerId.trim() && !processedCustomerIds.has(customerId.trim())) {
              processedCustomerIds.add(customerId.trim());
              
              if (!customerMap.has(customerId.trim())) {
                customersToCreate.push({
                  CustomerListID: customerId.trim(),
                  name: customerName.trim(),
                  organization_id: organization.id
                });
              }
            }

            // Create bottle
            const location = row['Location'] || row['location'] || '';
            const isAtYourFacility = locationNames.some(loc => location.toLowerCase().includes(loc));
            
            // Determine gas_type from description if not provided
            let gasType = row['Gas Type'] || row['gas_type'] || row['GasType'] || row['Gas'] || '';
            if (!gasType && row['Description']) {
              const desc = row['Description'].toUpperCase();
              if (desc.includes('ARGON')) gasType = 'ARGON';
              else if (desc.includes('OXYGEN')) gasType = 'OXYGEN';
              else if (desc.includes('NITROGEN')) gasType = 'NITROGEN';
              else if (desc.includes('HELIUM')) gasType = 'HELIUM';
              else if (desc.includes('CO2')) gasType = 'CO2';
            }

            const bottle = {
              barcode_number: row['Barcode'] || row['barcode_number'] || row['Barcode Number'] || '',
              serial_number: (row['Serial Number'] || row['serial_number'] || row['Serial'] || '').toString().trim(),
              assigned_customer: customerMap.has(customerId.trim()) ? customerId.trim() : null,
              customer_name: customerName,
              location: location,
              product_code: row['Product Code'] || row['product_code'] || row['ProductCode'] || row['Product'] || '',
              description: row['Description'] || row['description'] || row['Desc'] || '',
              gas_type: gasType,
              status: 'rented', // All bottles are rentals by default
              organization_id: organization.id
            };

            bottlesToInsert.push(bottle);
          });

          // Create customers first
          if (customersToCreate.length > 0) {
            console.log(`Creating ${customersToCreate.length} customers...`);
            
            const { error: customerError } = await supabase
              .from('customers')
              .upsert(customersToCreate, { 
                onConflict: 'CustomerListID',
                ignoreDuplicates: false 
              });

            if (customerError) {
              console.error('Customer creation error:', customerError);
              
              // Handle duplicate key errors by querying existing customers
              if (customerError.code === '23505') {
                console.log('Handling duplicate customers - querying existing ones...');
                
                // Query for existing customers that might have caused the duplicate error
                const existingCustomerIds = customersToCreate.map(c => c.CustomerListID);
                const { data: existingCustomers } = await supabase
                  .from('customers')
                  .select('"CustomerListID", name')
                  .in('"CustomerListID"', existingCustomerIds)
                  .eq('organization_id', organization.id);
                
                if (existingCustomers) {
                  existingCustomers.forEach(customer => {
                    customerMap.set(customer.CustomerListID, customer.name);
                  });
                  console.log(`Added ${existingCustomers.length} existing customers to map`);
                }
              }
            } else {
              // Update customer map with newly created customers
              customersToCreate.forEach(customer => {
                customerMap.set(customer.CustomerListID, customer.name);
              });
              console.log(`Added ${customersToCreate.length} new customers to map`);
            }
          }

          // Now update bottles with correct assigned_customer values
          bottlesToInsert.forEach(bottle => {
            if (bottle.customer_name && bottle.customer_name.trim()) {
              // Find the customer ID for this bottle by matching customer name
              const customerId = Array.from(customerMap.keys()).find(id => 
                customerMap.get(id) === bottle.customer_name.trim()
              );
              if (customerId) {
                bottle.assigned_customer = customerId;
              } else {
                // If no customer found, this bottle should be available (not rented)
                bottle.status = 'available';
                bottle.assigned_customer = null;
              }
            } else {
              // No customer name means this bottle should be available
              bottle.status = 'available';
              bottle.assigned_customer = null;
            }
          });

          // Insert bottles
          const batchSize = 100;
          for (let i = 0; i < bottlesToInsert.length; i += batchSize) {
            const batch = bottlesToInsert.slice(i, i + batchSize);
            const { error } = await supabase
              .from('bottles')
              .insert(batch);

            if (error) {
              console.error('Error inserting batch:', error);
              throw error;
            }
          }

          setSnackbar({ open: true, message: `${bottlesToInsert.length} bottles uploaded successfully!`, severity: 'success' });
          setUploadDialog(false);
          setUploadFile(null);
          setUploadPreview([]);
          loadBottles();
          loadCustomers();

        } catch (error) {
          console.error('Error processing file:', error);
          setSnackbar({ open: true, message: 'Failed to upload bottles', severity: 'error' });
        } finally {
          setLoading(false);
        }
      };
      reader.readAsArrayBuffer(uploadFile);
    } catch (error) {
      console.error('Error uploading bottles:', error);
      setSnackbar({ open: true, message: 'Failed to upload bottles', severity: 'error' });
      setLoading(false);
    }
  };

  const handleEditBottle = (bottle) => {
    setEditingBottle(bottle);
    setEditDialog(true);
  };

  const handleSaveEdit = async () => {
    try {
      const { error } = await supabase
        .from('bottles')
        .update({
          serial_number: editingBottle.serial_number,
          barcode_number: editingBottle.barcode_number,
          assigned_customer: editingBottle.assigned_customer,
          customer_name: editingBottle.customer_name,
          location: editingBottle.location,
          product_code: editingBottle.product_code,
          description: editingBottle.description,
          gas_type: editingBottle.gas_type,
          status: editingBottle.status
        })
        .eq('id', editingBottle.id);

      if (error) throw error;

      setSnackbar({ open: true, message: 'Bottle updated successfully', severity: 'success' });
      setEditDialog(false);
      setEditingBottle(null);
      loadBottles();
    } catch (error) {
      console.error('Error updating bottle:', error);
      setSnackbar({ open: true, message: 'Failed to update bottle', severity: 'error' });
    }
  };

  const handleDeleteBottles = async () => {
    try {
      const bottleIds = bottlesToDelete.map(b => b.id);
      console.log('Deleting bottles:', bottlesToDelete.map(b => ({ id: b.id, barcode: b.barcode_number })));
      console.log('Bottle IDs to delete:', bottleIds);
      
      // Check if we have valid IDs
      if (bottleIds.length === 0) {
        throw new Error('No bottles selected for deletion');
      }
      
      // Check for invalid IDs
      const invalidIds = bottleIds.filter(id => !id || typeof id !== 'string');
      if (invalidIds.length > 0) {
        console.error('Invalid bottle IDs found:', invalidIds);
        throw new Error('Some bottles have invalid IDs');
      }

      // Try deleting in smaller batches to avoid timeouts
      const batchSize = 50; // Smaller batches for better reliability
      let successCount = 0;
      let errorCount = 0;
      
      console.log(`Deleting ${bottleIds.length} bottles in batches of ${batchSize}...`);
      
      for (let i = 0; i < bottleIds.length; i += batchSize) {
        const batch = bottleIds.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(bottleIds.length/batchSize)} (${batch.length} bottles)`);
        
        try {
          const { error: batchError } = await supabase
            .from('bottles')
            .delete()
            .in('id', batch);
          
          if (batchError) {
            console.error(`Batch ${Math.floor(i/batchSize) + 1} failed:`, batchError);
            // If batch fails, try individual deletions
            for (const bottleId of batch) {
              try {
                const { error: individualError } = await supabase
                  .from('bottles')
                  .delete()
                  .eq('id', bottleId);
                
                if (individualError) {
                  console.error(`Failed to delete bottle ${bottleId}:`, individualError);
                  errorCount++;
                } else {
                  successCount++;
                }
              } catch (err) {
                console.error(`Exception deleting bottle ${bottleId}:`, err);
                errorCount++;
              }
            }
          } else {
            successCount += batch.length;
            console.log(`Batch ${Math.floor(i/batchSize) + 1} successful: ${batch.length} bottles deleted`);
          }
          
          // Small delay between batches to avoid overwhelming the database
          if (i + batchSize < bottleIds.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (err) {
          console.error(`Exception in batch ${Math.floor(i/batchSize) + 1}:`, err);
          errorCount += batch.length;
        }
      }
      
      if (errorCount > 0) {
        throw new Error(`${errorCount} bottles failed to delete, ${successCount} deleted successfully`);
      }

      setSnackbar({ 
        open: true, 
        message: `${successCount} bottles deleted successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`, 
        severity: errorCount > 0 ? 'warning' : 'success' 
      });
      setDeleteDialog(false);
      setBottlesToDelete([]);
      loadBottles();
    } catch (error) {
      console.error('Error deleting bottles:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to delete bottles';
      if (error.code === '23503') {
        errorMessage = 'Cannot delete bottles that are referenced by other records (rentals, scans, etc.)';
      } else if (error.code === '400') {
        errorMessage = 'Bad request - check bottle IDs and try again';
      } else if (error.message) {
        errorMessage = `Delete failed: ${error.message}`;
      }
      
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    }
  };

  const handleBottleDetails = (bottle) => {
    navigate(`/bottle/${bottle.id}`);
  };

  const handleCustomerDetails = async (customerId, customerName) => {
    if (customerId) {
      navigate(`/customer/${customerId}`);
    } else if (customerName && customerName !== '-') {
      // If no customer ID but we have a name, try to find the customer
      try {
        // First try exact match
        let { data: customerData, error } = await supabase
          .from('customers')
          .select('"CustomerListID"')
          .eq('name', customerName.trim())
          .eq('organization_id', organization.id)
          .single();

        // If not found, try case-insensitive partial match
        if (error || !customerData) {
          const { data: partialMatch, error: partialError } = await supabase
            .from('customers')
            .select('"CustomerListID"')
            .ilike('name', `%${customerName.trim()}%`)
            .eq('organization_id', organization.id)
            .limit(1)
            .single();

          if (!partialError && partialMatch) {
            customerData = partialMatch;
            error = null;
          }
        }

        if (!error && customerData) {
          navigate(`/customer/${customerData.CustomerListID}`);
        } else {
          setSnackbar({ 
            open: true, 
            message: `Customer "${customerName}" not found. They may need to be created first.`, 
            severity: 'warning' 
          });
        }
      } catch (error) {
        console.error('Error finding customer:', error);
        setSnackbar({ open: true, message: 'Error finding customer', severity: 'error' });
      }
    } else {
      setSnackbar({ open: true, message: 'No customer information available', severity: 'warning' });
    }
  };

  const handleBulkDelete = () => {
    if (bottles.length === 0) {
      setSnackbar({ open: true, message: 'No bottles to delete', severity: 'warning' });
      return;
    }
    setBottlesToDelete(bottles);
    setDeleteDialog(true);
  };

  const handleCreateMissingCustomers = async () => {
    try {
      // Get all unique customers from bottles that don't have assigned_customer
      // We need to re-read the Excel data to get the original CustomerListID
      if (!uploadFile) {
        setSnackbar({ open: true, message: 'No upload file available. Please re-upload to create customers.', severity: 'warning' });
        return;
      }

      // Re-read the Excel file to get original CustomerListID values
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          // Get unique customers with their original CustomerListID
          const customerMap = new Map();
          jsonData.forEach(row => {
            const customerName = row['Customer'] || row['customer_name'] || '';
            const customerId = row['CustomerListID'] || row['customer_list_id'] || '';
            
            if (customerName.trim() && customerId.trim()) {
              customerMap.set(customerName.trim(), customerId.trim());
            }
          });

          // Find bottles that need customers created
          const missingCustomers = bottles
            .filter(bottle => bottle.customer_name && bottle.customer_name !== '-' && !bottle.assigned_customer)
            .map(bottle => {
              const originalCustomerId = customerMap.get(bottle.customer_name.trim());
              return {
                name: bottle.customer_name.trim(),
                CustomerListID: originalCustomerId || `AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
              };
            })
            .filter((customer, index, self) => 
              index === self.findIndex(c => c.name === customer.name)
            );

          if (missingCustomers.length === 0) {
            setSnackbar({ open: true, message: 'No missing customers found', severity: 'info' });
            return;
          }

          console.log(`Creating ${missingCustomers.length} missing customers with original CustomerListID...`);
          console.log('Missing customers:', missingCustomers);

          // Create customers
          const customersToCreate = missingCustomers.map(customer => ({
            CustomerListID: customer.CustomerListID,
            name: customer.name,
            organization_id: organization.id
          }));

          // Use upsert to handle existing customers gracefully
          const { error } = await supabase
            .from('customers')
            .upsert(customersToCreate, { 
              onConflict: 'CustomerListID',
              ignoreDuplicates: false 
            });

          if (error) {
            console.error('Error creating missing customers:', error);
            setSnackbar({ open: true, message: 'Failed to create missing customers', severity: 'error' });
          } else {
            // Now update bottles to assign them to the newly created customers
            console.log('Updating bottles with customer assignments...');
            
            for (const customer of missingCustomers) {
              const { error: updateError } = await supabase
                .from('bottles')
                .update({ assigned_customer: customer.CustomerListID })
                .eq('customer_name', customer.name)
                .eq('organization_id', organization.id)
                .is('assigned_customer', null);

              if (updateError) {
                console.error(`Error updating bottles for customer ${customer.name}:`, updateError);
              }
            }

            setSnackbar({ 
              open: true, 
              message: `Successfully created ${missingCustomers.length} missing customers with original CustomerListID and assigned bottles!`, 
              severity: 'success' 
            });
            loadBottles(); // Reload to refresh the data
          }
        } catch (error) {
          console.error('Error creating missing customers:', error);
          setSnackbar({ open: true, message: 'Failed to create missing customers', severity: 'error' });
        }
      };

      reader.readAsArrayBuffer(uploadFile);
    } catch (error) {
      console.error('Error creating missing customers:', error);
      setSnackbar({ open: true, message: 'Failed to create missing customers', severity: 'error' });
    }
  };

  if (loading && bottles.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading bottles...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Bottle Management</Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleBulkDelete}
            disabled={bottles.length === 0}
          >
            Delete All Bottles
          </Button>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<PersonAddIcon />}
            onClick={handleCreateMissingCustomers}
            sx={{ mr: 1 }}
          >
            Create Missing Customers
          </Button>
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => setUploadDialog(true)}
          >
            Upload Bottles
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Box display="flex" gap={2} mb={3}>
        <TextField
          label="Search bottles"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
          sx={{ minWidth: 200 }}
        />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="available">Available</MenuItem>
            <MenuItem value="rented">Rented</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Serial Number</TableCell>
              <TableCell>Barcode</TableCell>
              <TableCell>Product Code</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Gas Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedBottles.map((bottle) => (
              <TableRow key={bottle.id}>
                <TableCell>{bottle.serial_number || '-'}</TableCell>
                <TableCell 
                  onClick={() => handleBottleDetails(bottle)}
                  sx={{ 
                    cursor: 'pointer',
                    color: 'primary.main',
                    textDecoration: 'underline',
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    }
                  }}
                >
                  {bottle.barcode_number || '-'}
                </TableCell>
                <TableCell>{bottle.product_code || '-'}</TableCell>
                <TableCell>{bottle.description || '-'}</TableCell>
                <TableCell>{bottle.gas_type || '-'}</TableCell>
                <TableCell>
                  <Chip
                    label={bottle.status}
                    color={bottle.status === 'available' ? 'success' : 'warning'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{bottle.location || '-'}</TableCell>
                <TableCell 
                  onClick={() => {
                    if (bottle.customer_name && bottle.customer_name !== '-') {
                      handleCustomerDetails(bottle.assigned_customer, bottle.customer_name);
                    }
                  }}
                  sx={{ 
                    cursor: (bottle.customer_name && bottle.customer_name !== '-') ? 'pointer' : 'default',
                    color: (bottle.customer_name && bottle.customer_name !== '-') ? 'primary.main' : 'inherit',
                    textDecoration: (bottle.customer_name && bottle.customer_name !== '-') ? 'underline' : 'none',
                    '&:hover': {
                      backgroundColor: (bottle.customer_name && bottle.customer_name !== '-') ? 'action.hover' : 'transparent'
                    }
                  }}
                >
                  {bottle.customer_name || '-'}
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => handleEditBottle(bottle)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setBottlesToDelete([bottle]);
                      setDeleteDialog(true);
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        component="div"
        count={filteredBottles.length}
        page={page}
        onPageChange={(e, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 25, 50, 100]}
      />

      {/* Upload Dialog */}
      <Dialog open={uploadDialog} onClose={() => setUploadDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Upload Bottles</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              style={{ marginBottom: 16 }}
            />
            
            {uploadPreview.length > 0 && (
              <Box>
                <Typography variant="h6" gutterBottom>Preview (first 5 rows):</Typography>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {Object.keys(uploadPreview[0]).map(key => (
                          <TableCell key={key}>{key}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {uploadPreview.map((row, index) => (
                        <TableRow key={index}>
                          {Object.values(row).map((value, i) => (
                            <TableCell key={i}>{String(value)}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialog(false)}>Cancel</Button>
          <Button
            onClick={handleUploadBottles}
            variant="contained"
            disabled={!uploadFile}
          >
            Upload
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Bottle</DialogTitle>
        <DialogContent>
          {editingBottle && (
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Serial Number"
                value={editingBottle.serial_number || ''}
                onChange={(e) => setEditingBottle({...editingBottle, serial_number: e.target.value})}
                fullWidth
              />
              <TextField
                label="Barcode"
                value={editingBottle.barcode_number || ''}
                onChange={(e) => setEditingBottle({...editingBottle, barcode_number: e.target.value})}
                fullWidth
              />
              <TextField
                label="Customer Name"
                value={editingBottle.customer_name || ''}
                onChange={(e) => setEditingBottle({...editingBottle, customer_name: e.target.value})}
                fullWidth
              />
              <TextField
                label="Location"
                value={editingBottle.location || ''}
                onChange={(e) => setEditingBottle({...editingBottle, location: e.target.value})}
                fullWidth
              />
              <TextField
                label="Product Code"
                value={editingBottle.product_code || ''}
                onChange={(e) => setEditingBottle({...editingBottle, product_code: e.target.value})}
                fullWidth
              />
              <TextField
                label="Description"
                value={editingBottle.description || ''}
                onChange={(e) => setEditingBottle({...editingBottle, description: e.target.value})}
                fullWidth
              />
              <TextField
                label="Gas Type"
                value={editingBottle.gas_type || ''}
                onChange={(e) => setEditingBottle({...editingBottle, gas_type: e.target.value})}
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={editingBottle.status}
                  label="Status"
                  onChange={(e) => setEditingBottle({...editingBottle, status: e.target.value})}
                >
                  <MenuItem value="available">Available</MenuItem>
                  <MenuItem value="rented">Rented</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {bottlesToDelete.length} bottle(s)? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteBottles} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({...snackbar, open: false})}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ 
          zIndex: 99999999,
          position: 'fixed !important',
          top: '200px !important',
          right: '20px !important',
          '& .MuiSnackbar-root': {
            position: 'fixed !important',
            top: '200px !important',
            right: '20px !important'
          }
        }}
      >
        <Alert
          onClose={() => setSnackbar({...snackbar, open: false})}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BottleManagement;