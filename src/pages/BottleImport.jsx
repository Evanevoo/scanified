import React, { useState } from 'react';
import { Box, Typography, Button, Paper, Snackbar, Alert, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem, Table, TableHead, TableRow, TableCell, TableBody, Grid } from '@mui/material';
import * as XLSX from 'xlsx';
import { supabase } from '../../supabase';
import { get } from 'lodash';

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
      
      // 7. Feedback
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
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: '#fff', py: 4, px: 2 }}>
      <Typography variant="h4" fontWeight={700} mb={2}>Bottle Import</Typography>
      <Box mb={3} display="flex" gap={2} flexWrap="wrap">
        <Button
          variant="outlined"
          sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none', px: 3, borderColor: '#1976d2', color: '#1976d2', borderWidth: 2 }}
          component="label"
          disabled={importing}
        >
          {importing ? 'Importing...' : 'Import Bottles from File'}
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
      </Box>
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