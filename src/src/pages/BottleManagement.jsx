import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Snackbar, Alert, CircularProgress, Checkbox, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@mui/material';
import * as XLSX from 'xlsx';
import { supabase } from '../../supabase';

const columns = [
  { label: 'Barcode', key: 'barcode_number' },
  { label: 'Serial Number', key: 'serial_number' },
  { label: 'Product Code', key: 'product_code' },
  { label: 'Description', key: 'description' },
  { label: 'Days At Location', key: 'days_at_location' },
  { label: 'Customer', key: 'customer_name' },
  { label: 'CustomerListID', key: 'customer_list_id' },
];

export default function BottleManagement() {
  const [bottles, setBottles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [selected, setSelected] = useState([]);
  const [deleteAllDialog, setDeleteAllDialog] = useState(false);
  const [deleteSelectedDialog, setDeleteSelectedDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef();

  useEffect(() => {
    fetchBottles();
  }, []);

  const fetchBottles = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('cylinders').select('*').order('barcode_number');
    if (error) {
      setSnackbar({ open: true, message: 'Failed to load bottles: ' + error.message, severity: 'error' });
      setBottles([]);
    } else {
      setBottles(data || []);
    }
    setLoading(false);
    setSelected([]);
  };

  // Handle file import
  const handleImport = async (file) => {
    setImporting(true);
    setSnackbar({ open: false, message: '', severity: 'info' });
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

      // Validate CustomerListID and get customer info
      const validBottles = [];
      const invalidCustomerIds = [];
      
      for (const row of rows) {
        if (!row.Barcode) continue; // Skip rows without barcode
        
        if (row.CustomerListID) {
          // Search for customer by CustomerListID (case-insensitive)
          const { data: customer, error } = await supabase
            .from('customers')
            .select('name, CustomerListID')
            .ilike('CustomerListID', row.CustomerListID.trim())
            .single();
          
          if (customer && !error) {
            // Valid customer found - add bottle with customer info
            validBottles.push({
              barcode_number: row.Barcode,
              serial_number: row.SerialNumber,
              product_code: row.ProductCode,
              description: row.Description,
              days_at_location: row['Days At Location'] ? Number(row['Days At Location']) : 0,
              customer_name: customer.name,
              customer_list_id: customer.CustomerListID, // Use the exact case from database
            });
          } else {
            // Invalid CustomerListID - track for reporting
            invalidCustomerIds.push(row.CustomerListID);
          }
        } else {
          // No CustomerListID - add bottle without customer info
          validBottles.push({
            barcode_number: row.Barcode,
            serial_number: row.SerialNumber,
            product_code: row.ProductCode,
            description: row.Description,
            days_at_location: row['Days At Location'] ? Number(row['Days At Location']) : 0,
            customer_name: '',
            customer_list_id: '',
          });
        }
      }

      if (validBottles.length === 0) {
        throw new Error('No valid bottles found to import.');
      }

      // Import valid bottles
      const { error } = await supabase
        .from('cylinders')
        .upsert(validBottles, { onConflict: ['barcode_number'] });
      
      if (error) throw new Error('Import error: ' + error.message);

      // Prepare success message
      let message = `Import complete! Processed ${validBottles.length} bottles.`;
      if (invalidCustomerIds.length > 0) {
        const uniqueInvalidIds = [...new Set(invalidCustomerIds)];
        message += ` Skipped ${invalidCustomerIds.length} bottles with invalid CustomerListID: ${uniqueInvalidIds.slice(0, 5).join(', ')}${uniqueInvalidIds.length > 5 ? '...' : ''}`;
      }

      setSnackbar({ open: true, message, severity: 'success' });
      fetchBottles();
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    } finally {
      setImporting(false);
    }
  };

  // Delete all bottles
  const handleDeleteAll = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.from('cylinders').delete().neq('barcode_number', '');
      if (error) throw error;
      setSnackbar({ open: true, message: 'All bottles deleted.', severity: 'success' });
      fetchBottles();
    } catch (err) {
      setSnackbar({ open: true, message: 'Delete failed: ' + err.message, severity: 'error' });
    } finally {
      setDeleting(false);
      setDeleteAllDialog(false);
    }
  };

  // Delete selected bottles
  const handleDeleteSelected = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.from('cylinders').delete().in('barcode_number', selected);
      if (error) throw error;
      setSnackbar({ open: true, message: 'Selected bottles deleted.', severity: 'success' });
      fetchBottles();
    } catch (err) {
      setSnackbar({ open: true, message: 'Delete failed: ' + err.message, severity: 'error' });
    } finally {
      setDeleting(false);
      setDeleteSelectedDialog(false);
    }
  };

  // Selection logic
  const isAllSelected = bottles.length > 0 && selected.length === bottles.length;
  const handleSelectAll = (e) => {
    if (e.target.checked) setSelected(bottles.map(b => b.barcode_number));
    else setSelected([]);
  };
  const handleSelect = (barcode) => {
    setSelected(prev => prev.includes(barcode) ? prev.filter(x => x !== barcode) : [...prev, barcode]);
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: '#fff', py: 4, px: 2 }}>
      <Box sx={{ width: '100%', mx: 'auto' }}>
        <Typography variant="h4" fontWeight={700} mb={2}>Bottle Management</Typography>
        <Box mb={3} display="flex" gap={2} flexWrap="wrap">
          <Button
            variant="outlined"
            sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none', px: 3, borderColor: '#a259e6', color: '#a259e6', borderWidth: 2 }}
            onClick={() => fileInputRef.current.click()}
            disabled={importing}
          >
            {importing ? 'Importing...' : 'Bulk Assign from File'}
          </Button>
          <Button
            variant="contained"
            color="error"
            sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none', px: 3 }}
            onClick={() => setDeleteAllDialog(true)}
            disabled={loading || bottles.length === 0 || deleting}
          >
            Delete All Bottles
          </Button>
          <Button
            variant="contained"
            color="error"
            sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none', px: 3 }}
            onClick={() => setDeleteSelectedDialog(true)}
            disabled={selected.length === 0 || deleting}
          >
            Delete Selected
          </Button>
          <input
            type="file"
            accept=".csv,.xlsx,.xls,.txt"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={e => {
              if (e.target.files[0]) handleImport(e.target.files[0]);
              e.target.value = '';
            }}
          />
        </Box>
        <Paper elevation={3} sx={{ borderRadius: 4, p: 0, width: '100%', overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: '70vh', overflowX: 'auto' }}>
            <Table stickyHeader sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" sx={{ width: 50 }}>
                    <Checkbox
                      checked={isAllSelected}
                      indeterminate={selected.length > 0 && selected.length < bottles.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  {columns.map(col => (
                    <TableCell 
                      key={col.key} 
                      sx={{ 
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: col.key === 'description' ? 200 : col.key === 'customer_name' ? 150 : 120
                      }}
                    >
                      {col.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + 1} align="center">
                      <CircularProgress size={28} />
                    </TableCell>
                  </TableRow>
                ) : bottles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + 1} align="center">
                      No bottles found.
                    </TableCell>
                  </TableRow>
                ) : (
                  bottles.map((bottle, idx) => (
                    <TableRow key={bottle.id || idx} selected={selected.includes(bottle.barcode_number)}>
                      <TableCell padding="checkbox" sx={{ width: 50 }}>
                        <Checkbox
                          checked={selected.includes(bottle.barcode_number)}
                          onChange={() => handleSelect(bottle.barcode_number)}
                        />
                      </TableCell>
                      {columns.map(col => (
                        <TableCell 
                          key={col.key}
                          sx={{
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: col.key === 'description' ? 200 : col.key === 'customer_name' ? 150 : 120
                          }}
                        >
                          {bottle[col.key]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
        {/* Delete All Dialog */}
        <Dialog open={deleteAllDialog} onClose={() => setDeleteAllDialog(false)}>
          <DialogTitle>Delete All Bottles?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              This will permanently delete all bottles from the system. This cannot be undone. Are you sure?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteAllDialog(false)} disabled={deleting}>Cancel</Button>
            <Button onClick={handleDeleteAll} color="error" disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete All'}
            </Button>
          </DialogActions>
        </Dialog>
        {/* Delete Selected Dialog */}
        <Dialog open={deleteSelectedDialog} onClose={() => setDeleteSelectedDialog(false)}>
          <DialogTitle>Delete Selected Bottles?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              This will permanently delete the selected bottles. This cannot be undone. Are you sure?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteSelectedDialog(false)} disabled={deleting}>Cancel</Button>
            <Button onClick={handleDeleteSelected} color="error" disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete Selected'}
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
    </Box>
  );
} 