import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/client';
import { Box, Paper, Typography, Button, TextField, Alert, Snackbar, Grid, FormControl, InputLabel, Select, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Divider } from '@mui/material';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import QrCodeIcon from '@mui/icons-material/QrCode';
import { useAuth } from '../hooks/useAuth';

export default function Integrations() {
  const [customers, setCustomers] = useState([]);
  const [customersWithoutIds, setCustomersWithoutIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState('');
  const [idFormat, setIdFormat] = useState('1370000');
  const [startNumber, setStartNumber] = useState(1);
  const [quantity, setQuantity] = useState(10);
  const [generatedIds, setGeneratedIds] = useState([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedData, setUploadedData] = useState([]);
  const [processingUpload, setProcessingUpload] = useState(false);
  const [recentlyGeneratedCustomers, setRecentlyGeneratedCustomers] = useState([]);
  const { organization } = useAuth();

  useEffect(() => {
    loadCustomers();
    loadCustomersWithoutIds();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('CustomerListID, name, contact_details, phone')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      setSnackbar(`Error loading customers: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomersWithoutIds = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, contact_details, phone')
        .or('CustomerListID.is.null,CustomerListID.eq.')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomersWithoutIds(data || []);
    } catch (error) {
      console.error('Error loading customers without IDs:', error);
    }
  };

  const generateCustomerIds = async () => {
    setSkippedCount(0);
    // Fetch all existing CustomerListIDs from DB
    let existingIds = new Set(customers.map(c => c.CustomerListID));
    // Also check against already generated in this batch
    let batchIds = new Set();
    const ids = [];
    let skipped = 0;
    for (let i = 0; i < quantity; i++) {
      const currentNumber = startNumber + i;
      const timestamp = Date.now() + i; // Ensure uniqueness
      const customerId = `${idFormat}-${timestamp}`;
      if (existingIds.has(customerId) || batchIds.has(customerId)) {
        skipped++;
        continue;
      }
      batchIds.add(customerId);
      ids.push({
        CustomerListID: customerId,
        name: `Customer ${currentNumber}`,
        contact_details: '',
        phone: '',
        generated: true
      });
    }
    setGeneratedIds(ids);
    setSkippedCount(skipped);
    setSnackbar(`Generated ${ids.length} customer IDs${skipped > 0 ? ", skipped " + skipped + " duplicates" : ''}`);
  };

  const saveToDatabase = async () => {
    if (generatedIds.length === 0) {
      setSnackbar('No customer IDs to save');
      return;
    }

    setLoading(true);
    try {
      const customersToInsert = [];
      const customersToUpdate = [];

      generatedIds.forEach(customer => {
        const customerData = {
          CustomerListID: customer.CustomerListID,
          name: customer.name,
          contact_details: customer.contact_details,
          phone: customer.phone,
          customer_number: customer.CustomerListID,
          barcode: `*%${customer.CustomerListID}*`,
          customer_barcode: `*%${customer.CustomerListID}*`,
          AccountNumber: customer.CustomerListID,
          organization_id: organization?.id,
        };

        if (customer.fromExistingCustomer && customer.originalId) {
          customersToUpdate.push({ id: customer.originalId, ...customerData });
        } else {
          customersToInsert.push(customerData);
        }
      });

      // Insert new customers
      if (customersToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('customers')
          .insert(customersToInsert);

        if (insertError) throw insertError;
      }

      // Update existing customers
      for (const customer of customersToUpdate) {
        const { error: updateError } = await supabase
          .from('customers')
          .update(customer)
          .eq('id', customer.id);

        if (updateError) throw updateError;
      }

      const totalProcessed = customersToInsert.length + customersToUpdate.length;
      setSnackbar(`Successfully processed ${totalProcessed} customers (${customersToInsert.length} new, ${customersToUpdate.length} updated)`);
      
      // Store recently generated customers for export
      const recentlyGenerated = [...customersToInsert, ...customersToUpdate];
      setRecentlyGeneratedCustomers(recentlyGenerated);
      
      setGeneratedIds([]);
      setUploadedData([]);
      setUploadedFile(null);
      loadCustomers(); // Refresh the list
      loadCustomersWithoutIds(); // Refresh customers without IDs
    } catch (error) {
      setSnackbar(`Error saving customers: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (generatedIds.length === 0) {
      setSnackbar('No customer IDs to export');
      return;
    }

    const data = generatedIds.map(customer => ({
      'Customer ID': customer.CustomerListID,
      'Customer Name': customer.name,
      'Contact Details': customer.contact_details,
      'Phone': customer.phone,
      'Barcode': `*%${customer.CustomerListID}*`,
      'Account Number': customer.CustomerListID
    }));

    // Create worksheet with proper Excel formatting
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Set column widths for better readability
    const colWidths = [
      { wch: 15 }, // Customer ID
      { wch: 25 }, // Customer Name
      { wch: 30 }, // Contact Details
      { wch: 15 }, // Phone
      { wch: 20 }, // Barcode
      { wch: 15 }  // Account Number
    ];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customer IDs');
    
    // Write with proper Excel formatting
    const excelBuffer = XLSX.write(wb, { 
      bookType: 'xlsx', 
      type: 'array',
      compression: true
    });
    const dataBlob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const fileName = `customer_ids_${idFormat}_${new Date().toISOString().split('T')[0]}.xlsx`;
    saveAs(dataBlob, fileName);
    setSnackbar(`Exported ${generatedIds.length} customer IDs to Excel`);
  };

  const updateGeneratedCustomer = (index, field, value) => {
    setGeneratedIds(prev => prev.map((customer, i) => 
      i === index ? { ...customer, [field]: value } : customer
    ));
  };

  const removeGeneratedCustomer = (index) => {
    setGeneratedIds(prev => prev.filter((_, i) => i !== index));
  };

  const clearGenerated = () => {
    setGeneratedIds([]);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadedFile(file);
    setProcessingUpload(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { 
          type: 'array',
          cellDates: true,
          cellNF: false,
          cellText: false
        });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Use proper Excel parsing with headers
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: '',
          blankrows: false
        });

        if (jsonData.length < 2) {
          throw new Error('File must contain at least a header row and one data row');
        }

        // Convert to array of objects with headers
        const headers = jsonData[0].map(header => String(header || '').trim());
        const rows = jsonData.slice(1);
        const processedData = rows.map(row => {
          const obj = {};
          headers.forEach((header, index) => {
            obj[header] = row[index] || '';
          });
          return obj;
        }).filter(row => Object.values(row).some(value => value !== '')); // Remove empty rows

        setUploadedData(processedData);
        setSnackbar(`Successfully uploaded ${processedData.length} rows from ${file.name}`);
      } catch (error) {
        setSnackbar(`Error processing file: ${error.message}`);
      } finally {
        setProcessingUpload(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const generateIdsForUploadedData = () => {
    if (uploadedData.length === 0) {
      setSnackbar('No uploaded data to process');
      return;
    }

    const existingIds = new Set(customers.map(c => c.CustomerListID));
    const batchIds = new Set();
    const newIds = [];

    uploadedData.forEach((row, index) => {
      // Normalize keys for robust matching
      const normalizedRow = {};
      Object.keys(row).forEach(key => {
        normalizedRow[key.trim().toLowerCase()] = row[key];
      });
      const customerName =
        normalizedRow['name'] ||
        normalizedRow['customername'] ||
        normalizedRow['customer name'] ||
        normalizedRow['customer'] ||
        normalizedRow['customerfullname'] ||
        normalizedRow['customer full name'] ||
        `Customer ${index + 1}`;
      const customerFullName =
        normalizedRow['customerfullname'] ||
        normalizedRow['customer full name'] ||
        normalizedRow['customername'] ||
        normalizedRow['customer name'] ||
        normalizedRow['name'] ||
        normalizedRow['customer'] ||
        customerName;
      const customerContactDetails =
        normalizedRow['contact_details'] ||
        normalizedRow['contactdetails'] ||
        normalizedRow['address'] ||
        normalizedRow['customer address'] ||
        '';
      const customerPhone =
        normalizedRow['phone'] ||
        normalizedRow['phonenumber'] ||
        normalizedRow['customer phone'] ||
        '';
      const timestamp = Date.now() + index;
      const randomLetter = String.fromCharCode(65 + Math.floor(Math.random() * 26)); // A-Z
      const customerId = `${idFormat}-${timestamp}${randomLetter}`;
      if (!existingIds.has(customerId) && !batchIds.has(customerId)) {
        batchIds.add(customerId);
        newIds.push({
          CustomerListID: customerId,
          name: customerName,
          fullName: customerFullName,
          contact_details: customerContactDetails,
          phone: customerPhone,
          generated: true,
          fromUpload: true
        });
      }
    });

    setGeneratedIds(newIds);
    setSnackbar(`Generated ${newIds.length} customer IDs from uploaded data`);
  };

  const generateIdsForCustomersWithoutIds = () => {
    if (customersWithoutIds.length === 0) {
      setSnackbar('No customers without IDs found');
      return;
    }

    const existingIds = new Set(customers.map(c => c.CustomerListID));
    const batchIds = new Set();
    const newIds = [];

    customersWithoutIds.forEach((customer, index) => {
      const timestamp = Date.now() + index;
      const randomLetter = String.fromCharCode(65 + Math.floor(Math.random() * 26)); // A-Z
      const customerId = `${idFormat}-${timestamp}${randomLetter}`;
      if (!existingIds.has(customerId) && !batchIds.has(customerId)) {
        batchIds.add(customerId);
        newIds.push({
          CustomerListID: customerId,
          name: customer.name || `Customer ${index + 1}`,
          contact_details: customer.contact_details || '',
          phone: customer.phone || '',
          generated: true,
          fromExistingCustomer: true,
          originalId: customer.id
        });
      }
    });

    setGeneratedIds(newIds);
    setSnackbar(`Generated ${newIds.length} customer IDs for existing customers`);
  };

  const exportForZedAxis = () => {
    if (generatedIds.length === 0) {
      setSnackbar('No generated customer IDs to export');
      return;
    }

    // Zed Axis format: Customer ID, Customer Name, Contact Details, Phone, Barcode
    const zedAxisData = generatedIds.map(customer => ({
      'CustomerListID': customer.CustomerListID,
      'CustomerName': customer.name,
      'CustomerFullName': customer.fullName || customer.name,
      'Customer barcode': `*%${customer.CustomerListID}*`,
      'Customer Number': customer.CustomerListID,
    }));

    // Create worksheet with proper Excel formatting
    const ws = XLSX.utils.json_to_sheet(zedAxisData);
    
    // Set column widths for Zed Axis compatibility
    const colWidths = [
      { wch: 15 }, // Customer ID
      { wch: 25 }, // Customer Name
      { wch: 30 }, // Contact Details
      { wch: 15 }, // Phone
      { wch: 20 }, // Barcode
      { wch: 15 }  // Account Number
    ];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Zed Axis Import');
    
    // Write with proper Excel formatting
    const excelBuffer = XLSX.write(wb, { 
      bookType: 'xlsx', 
      type: 'array',
      compression: true
    });
    const dataBlob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const fileName = `zed_axis_customers_${idFormat}_${new Date().toISOString().split('T')[0]}.xlsx`;
    saveAs(dataBlob, fileName);
    setSnackbar(`Exported ${generatedIds.length} customers for Zed Axis import`);
  };

  const exportAllGeneratedForZedAxis = async () => {
    try {
      // Get all customers with the current ID format prefix that were recently created
      const { data, error } = await supabase
        .from('customers')
        .select('CustomerListID, name, contact_details, phone, created_at')
        .ilike('CustomerListID', `${idFormat}-%`)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data.length === 0) {
        setSnackbar('No recently generated customers found for export');
        return;
      }

      const zedAxisData = data.map(customer => ({
        'CustomerListID': customer.CustomerListID,
        'CustomerName': customer.name,
        'CustomerFullName': customer.fullName || customer.name,
        'Customer barcode': `*%${customer.CustomerListID}*`,
        'Customer Number': customer.CustomerListID,
      }));

      // Create worksheet with proper Excel formatting
      const ws = XLSX.utils.json_to_sheet(zedAxisData);
      
      // Set column widths for Zed Axis compatibility
      const colWidths = [
        { wch: 15 }, // Customer ID
        { wch: 25 }, // Customer Name
        { wch: 30 }, // Contact Details
        { wch: 15 }, // Phone
        { wch: 20 }, // Barcode
        { wch: 15 }  // Account Number
      ];
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Zed Axis Import');
      
      // Write with proper Excel formatting
      const excelBuffer = XLSX.write(wb, { 
        bookType: 'xlsx', 
        type: 'array',
        compression: true
      });
      const dataBlob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const fileName = `zed_axis_all_customers_${idFormat}_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(dataBlob, fileName);
      setSnackbar(`Exported ${data.length} recently generated customers for Zed Axis import`);
    } catch (error) {
      setSnackbar(`Error exporting customers: ${error.message}`);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'var(--bg-main)', py: 8, borderRadius: 0, overflow: 'visible' }}>
      <Paper elevation={0} sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 5 }, borderRadius: 0, boxShadow: '0 2px 12px 0 rgba(16,24,40,0.04)', border: '1px solid var(--divider)', bgcolor: 'var(--bg-main)', overflow: 'visible' }}>
        <Typography variant="h3" fontWeight={900} color="primary" mb={2} sx={{ letterSpacing: -1 }}>Customer ID Generator</Typography>
        
        <Typography variant="body1" mb={4} color="text.secondary">
          Upload customer files and generate customer IDs for Zed Axis/QuickBooks integration. These IDs follow the format: [PREFIX]-[TIMESTAMP]
        </Typography>

        {/* File Upload Section */}
        <Paper variant="outlined" sx={{ p: 3, mb: 4, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight={800} color="primary" mb={3}>Upload Customer File</Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Upload Excel files (.xlsx, .xls) with customer data. The first row should contain column headers.
            Supported columns: name, Name, CustomerName, contact_details, ContactDetails, Address, phone, Phone
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <input
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                id="file-upload"
                type="file"
                onChange={handleFileUpload}
              />
              <label htmlFor="file-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<CloudUploadIcon />}
                  disabled={processingUpload}
                  sx={{ borderRadius: 2, fontWeight: 700 }}
                >
                  {processingUpload ? 'Processing...' : 'Choose File'}
                </Button>
              </label>
              {uploadedFile && (
                <Typography variant="body2" sx={{ mt: 1, color: 'success.main' }}>
                  ✓ {uploadedFile.name} ({uploadedData.length} rows)
                </Typography>
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button
                onClick={generateIdsForUploadedData}
                variant="contained"
                color="secondary"
                disabled={uploadedData.length === 0}
                startIcon={<AddIcon />}
                sx={{ borderRadius: 2, fontWeight: 700 }}
              >
                Generate IDs from Upload
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Generate IDs for Customers Without IDs */}
        {customersWithoutIds.length > 0 && (
          <Paper variant="outlined" sx={{ p: 3, mb: 4, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={800} color="primary" mb={3}>
              Generate IDs for Existing Customers ({customersWithoutIds.length} found)
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Found {customersWithoutIds.length} customers without CustomerListID
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Button
                  onClick={generateIdsForCustomersWithoutIds}
                  variant="contained"
                  color="warning"
                  startIcon={<RefreshIcon />}
                  sx={{ borderRadius: 2, fontWeight: 700 }}
                >
                  Generate IDs for These Customers
                </Button>
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* Zed Axis Export Section */}
        <Paper variant="outlined" sx={{ p: 3, mb: 4, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight={800} color="info" mb={3}>
            Zed Axis Integration Export
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Export recently generated customers for Zed Axis import
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button
                onClick={exportAllGeneratedForZedAxis}
                variant="contained"
                color="info"
                startIcon={<DownloadIcon />}
                sx={{ borderRadius: 2, fontWeight: 700 }}
              >
                Export All Recent for Zed Axis
              </Button>
            </Grid>
          </Grid>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            This will export all customers with the current ID prefix that were created in the last 24 hours
          </Typography>
        </Paper>

        {/* ID Generation Controls */}
        <Paper variant="outlined" sx={{ p: 3, mb: 4, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight={800} color="primary" mb={3}>Generate Customer IDs</Typography>
          <Grid container spacing={2} alignItems="flex-end">
            <Grid item xs={12} sm={3}>
              <TextField
                label="ID Prefix"
                value={idFormat}
                onChange={(e) => setIdFormat(e.target.value)}
                fullWidth
                variant="outlined"
                inputProps={{ style: { fontWeight: 600 } }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                label="Start Number"
                type="number"
                value={startNumber}
                onChange={(e) => setStartNumber(parseInt(e.target.value) || 1)}
                fullWidth
                variant="outlined"
                inputProps={{ min: 1, style: { fontWeight: 600 } }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                label="Quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                fullWidth
                variant="outlined"
                inputProps={{ min: 1, max: 1000, style: { fontWeight: 600 } }}
              />
            </Grid>
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <Button
                onClick={generateCustomerIds}
                variant="contained"
                color="primary"
                fullWidth
                sx={{ borderRadius: 2, fontWeight: 700, py: 1.5, height: '56px' }}
                startIcon={<AddIcon />}
              >
                Generate IDs
              </Button>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                e.g., 1370000, 80000448
              </Typography>
              {skippedCount > 0 && (
                <Alert severity="warning" sx={{ mt: 1, mb: 0 }}>
                  {skippedCount} duplicate ID{skippedCount > 1 ? 's were' : ' was'} skipped because they already exist in the database.
                </Alert>
              )}
            </Grid>
          </Grid>
        </Paper>

        {/* Generated IDs Table */}
        {generatedIds.length > 0 && (
          <Paper variant="outlined" sx={{ mb: 4, borderRadius: 2 }}>
            <Box sx={{ p: 3, borderBottom: '1px solid var(--divider)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight={800} color="primary">
                  Generated Customer IDs ({generatedIds.length})
                </Typography>
                <Box>
                  <Button
                    onClick={clearGenerated}
                    variant="outlined"
                    color="secondary"
                    sx={{ mr: 2, borderRadius: 2 }}
                  >
                    Clear All
                  </Button>
                  <Button
                    onClick={exportForZedAxis}
                    variant="contained"
                    color="info"
                    sx={{ mr: 2, borderRadius: 2, fontWeight: 700 }}
                    startIcon={<DownloadIcon />}
                  >
                    Export for Zed Axis
                  </Button>
                  <Button
                    onClick={saveToDatabase}
                    variant="contained"
                    color="primary"
                    disabled={loading}
                    sx={{ borderRadius: 2, fontWeight: 700 }}
                  >
                    Save to Database
                  </Button>
                </Box>
              </Box>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'var(--bg-card)' }}>
                    <TableCell sx={{ fontWeight: 800 }}>Customer ID</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Contact Details</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Phone</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {generatedIds.map((customer, index) => (
                    <TableRow key={index} sx={{ '&:hover': { backgroundColor: 'var(--bg-card-hover)' } }}>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace" fontWeight={600}>
                          {customer.CustomerListID}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <TextField
                          value={customer.name}
                          onChange={(e) => updateGeneratedCustomer(index, 'name', e.target.value)}
                          variant="standard"
                          size="small"
                          fullWidth
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          value={customer.contact_details}
                          onChange={(e) => updateGeneratedCustomer(index, 'contact_details', e.target.value)}
                          variant="standard"
                          size="small"
                          fullWidth
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          value={customer.phone}
                          onChange={(e) => updateGeneratedCustomer(index, 'phone', e.target.value)}
                          variant="standard"
                          size="small"
                          fullWidth
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton
                          onClick={() => removeGeneratedCustomer(index)}
                          color="error"
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {/* Customers Without IDs */}
        {customersWithoutIds.length > 0 && (
          <Paper variant="outlined" sx={{ borderRadius: 2 }}>
            <Box sx={{ p: 3, borderBottom: '1px solid var(--divider)' }}>
              <Typography variant="h6" fontWeight={800} color="warning">
                Customers Without CustomerListID ({customersWithoutIds.length})
              </Typography>
            </Box>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'var(--bg-card)' }}>
                    <TableCell sx={{ fontWeight: 800 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Contact Details</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Phone</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {customersWithoutIds.slice(0, 10).map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>{customer.name}</TableCell>
                      <TableCell>{customer.contact_details}</TableCell>
                      <TableCell>{customer.phone}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {customersWithoutIds.length > 10 && (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Showing first 10 of {customersWithoutIds.length} customers without IDs
                  </Typography>
                </Box>
              )}
            </TableContainer>
          </Paper>
        )}

        <Snackbar open={!!snackbar} autoHideDuration={4000} onClose={() => setSnackbar('')}>
          <Alert severity="success" onClose={() => setSnackbar('')}>
            {snackbar}
          </Alert>
        </Snackbar>
      </Paper>
    </Box>
  );
} 