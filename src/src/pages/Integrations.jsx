import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/client';
import { Box, Paper, Typography, Button, TextField, Alert, Snackbar, Grid, FormControl, InputLabel, Select, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton } from '@mui/material';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

export default function Integrations() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState('');
  const [idFormat, setIdFormat] = useState('1370000');
  const [startNumber, setStartNumber] = useState(1);
  const [quantity, setQuantity] = useState(10);
  const [generatedIds, setGeneratedIds] = useState([]);
  const [skippedCount, setSkippedCount] = useState(0);

  useEffect(() => {
    loadCustomers();
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
      const customersToInsert = generatedIds.map(customer => ({
        CustomerListID: customer.CustomerListID,
        name: customer.name,
        contact_details: customer.contact_details,
        phone: customer.phone,
        customer_number: customer.CustomerListID,
        barcode: `*%${customer.CustomerListID}*`,
        customer_barcode: `*%${customer.CustomerListID}*`,
        AccountNumber: customer.CustomerListID
      }));

      const { error } = await supabase
        .from('customers')
        .insert(customersToInsert);

      if (error) throw error;

      setSnackbar(`Successfully saved ${generatedIds.length} customers to database`);
      setGeneratedIds([]);
      loadCustomers(); // Refresh the list
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

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customer IDs');
    
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
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

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fff', py: 8, borderRadius: 0, overflow: 'visible' }}>
      <Paper elevation={0} sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 5 }, borderRadius: 0, boxShadow: '0 2px 12px 0 rgba(16,24,40,0.04)', border: '1px solid #eee', bgcolor: '#fff', overflow: 'visible' }}>
        <Typography variant="h3" fontWeight={900} color="primary" mb={2} sx={{ letterSpacing: -1 }}>Customer ID Generator</Typography>
        
        <Typography variant="body1" mb={4} color="text.secondary">
          Generate customer IDs for Zed Axis/QuickBooks integration. These IDs follow the format: [PREFIX]-[TIMESTAMP]
        </Typography>

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
            <Box sx={{ p: 3, borderBottom: '1px solid #eee' }}>
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
                    onClick={exportToExcel}
                    variant="contained"
                    color="success"
                    sx={{ mr: 2, borderRadius: 2, fontWeight: 700 }}
                  >
                    Export to Excel
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
                  <TableRow sx={{ backgroundColor: '#fafbfc' }}>
                    <TableCell sx={{ fontWeight: 800 }}>Customer ID</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Contact Details</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Phone</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {generatedIds.map((customer, index) => (
                    <TableRow key={index} sx={{ '&:hover': { backgroundColor: '#f8f9fa' } }}>
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

        {/* Recent Customers */}
        <Paper variant="outlined" sx={{ borderRadius: 2 }}>
          <Box sx={{ p: 3, borderBottom: '1px solid #eee' }}>
            <Typography variant="h6" fontWeight={800} color="primary">
              Recent Customers in Database
            </Typography>
          </Box>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#fafbfc' }}>
                  <TableCell sx={{ fontWeight: 800 }}>Customer ID</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Contact Details</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Phone</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.CustomerListID}>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace" fontWeight={600}>
                        {customer.CustomerListID}
                      </Typography>
                    </TableCell>
                    <TableCell>{customer.name}</TableCell>
                    <TableCell>{customer.contact_details}</TableCell>
                    <TableCell>{customer.phone}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Snackbar open={!!snackbar} autoHideDuration={4000} onClose={() => setSnackbar('')}>
          <Alert severity="success" onClose={() => setSnackbar('')}>
            {snackbar}
          </Alert>
        </Snackbar>
      </Paper>
    </Box>
  );
} 