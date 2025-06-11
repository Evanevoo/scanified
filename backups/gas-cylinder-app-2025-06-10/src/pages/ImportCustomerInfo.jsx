import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/client';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import { Box, Paper, Typography, Button, TextField, Alert, MenuItem, Snackbar } from '@mui/material';

const colorMap = {
  'blue-600': '#2563eb',
  'emerald-500': '#10b981',
  'purple-600': '#7c3aed',
  'rose-500': '#f43f5e',
  'amber-500': '#f59e42',
};

function generateCustomerId() {
  // Simple unique ID generator (can be replaced with a more robust one)
  return Math.random().toString(36).substr(2, 8).toUpperCase() + '-' + Date.now();
}

// Alias map for auto-mapping CSV columns to customer fields
const FIELD_ALIASES = {
  CustomerListID: ['customerlistid', 'customer id', 'customer_id', 'id', 'accountnumber', 'account number'],
  name: ['name', 'customername', 'customer name'],
  contact_details: ['contact_details', 'address', 'contact', 'contact info', 'contact information', 'address1', 'address 1'],
  phone: ['phone', 'phone number', 'phonenumber', 'contact phone', 'mobile', 'mobile number']
};
const ALLOWED_FIELDS = [
  { key: 'CustomerListID', label: 'CustomerListID' },
  { key: 'name', label: 'Name' },
  { key: 'contact_details', label: 'Address' },
  { key: 'address2', label: 'Address 2' },
  { key: 'address3', label: 'Address 3' },
  { key: 'address4', label: 'Address 4' },
  { key: 'address5', label: 'Address 5' },
  { key: 'city', label: 'City' },
  { key: 'postal_code', label: 'Postal Code' },
  { key: 'phone', label: 'Phone' },
  { key: 'customer_barcode', label: 'Customer Barcode' }
];

// Asset import fields for 'Import Assets by Customer'
const ASSET_IMPORT_FIELDS = [
  { key: 'CUSTOMER', label: 'Customer' },
  { key: 'BARCODE', label: 'Barcode' },
  { key: 'SERIAL_NUMBER', label: 'Serial Number' },
  { key: 'CATEGORY', label: 'Category' },
  { key: 'GROUP', label: 'Group' },
  { key: 'TYPE', label: 'Type' },
  { key: 'ITEM', label: 'Item' },
  { key: 'ITEM_DESCRIPTION', label: 'Item Description' },
  { key: 'OWNERSHIP', label: 'Ownership' },
  { key: 'START_DATE', label: 'Start Date' },
  { key: 'STOP_DATE', label: 'Stop Date' },
  { key: 'DAYS_ON_RENT', label: 'Days on Rent' },
];

// Helper to extract just the ID from a string like "Name (ID)"
function extractCustomerId(val) {
  if (!val) return '';
  const match = val.match(/\(([^)]+)\)$/);
  return match ? match[1] : val;
}

// Helper to format date to ISO
function formatDate(val) {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d) ? null : d.toISOString();
}

const TXT_COLUMNS = [
  "Customer ID",
  "Customer Name",
  "Parent Customer ID",
  "Servicing Location",
  "Billing Name",
  "Billing Address 1",
  "Billing Address 2",
  "Billing City",
  "Billing State",
  "Billing Zip",
  "Billing Country",
  "Shipping Address Line1",
  "Shipping Address Line2",
  "Shipping Address Line3",
  "Shipping City",
  "Shipping State",
  "Shipping Zip",
  "Shipping Country",
  "Payment Terms",
  "Tax Region",
  "Fax",
  "RentalBillEmailTo",
  "Salesman"
];

// Helper to normalize names for matching
function normalizeName(name) {
  return (name || '').trim().replace(/\s+/g, '').toLowerCase();
}

const ImportCustomerInfo = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [snackbar, setSnackbar] = useState('');
  const navigate = useNavigate();
  const [columns, setColumns] = useState([]); // detected columns from CSV
  const [mapping, setMapping] = useState({}); // fieldKey -> columnName
  const [showMapping, setShowMapping] = useState(false);

  useEffect(() => {
    const color = localStorage.getItem('themeColor') || 'blue-600';
    document.documentElement.style.setProperty('--accent', colorMap[color] || colorMap['blue-600']);
    // Theme override for Import Customers page
    const importCustomersTheme = localStorage.getItem('importCustomersTheme') || 'system';
    if (importCustomersTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else if (importCustomersTheme === 'dark') {
      document.documentElement.classList.add('dark');
    }
    // If 'system', do nothing (use global theme)
  }, []);

  // Load mapping from localStorage if available and columns match
  useEffect(() => {
    if (columns.length > 0) {
      const saved = localStorage.getItem('customerImportMapping');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Only use saved mapping if all mapped columns exist in the current file
          const valid = Object.values(parsed).every(col => !col || columns.includes(col));
          if (valid) setMapping(parsed);
        } catch {}
      }
    }
    // eslint-disable-next-line
  }, [columns.join()]);

  const handleFileChange = (e) => {
    setColumns([]);
    setMapping({});
    setShowMapping(false);
    if (!e.target.files[0]) return;
    const file = e.target.files[0];
    const ext = file.name.split('.').pop().toLowerCase();
    const reader = new FileReader();
    reader.onload = (evt) => {
      let rows;
      if (ext === 'xls' || ext === 'xlsx') {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      } else {
        const text = evt.target.result;
        rows = text.split('\n').map(line => line.split('\t'));
      }
      if (!rows.length) return;
      let detectedColumns = [];
      let dataRows = rows;
      // Detect if first row is header
      const isHeader = rows[0].every(cell => typeof cell === 'string' && cell.length > 0 && !/^[0-9]+$/.test(cell));
      if (isHeader) {
        detectedColumns = rows[0].map((col, i) => col.trim() || `Column ${i+1}`);
        dataRows = rows.slice(1);
      } else {
        detectedColumns = ALLOWED_FIELDS.map(f => f.label);
      }
      setColumns(detectedColumns);
      // Auto-map columns by name or position
      const initialMapping = {};
      ALLOWED_FIELDS.forEach((f, i) => {
        if (detectedColumns[i]) initialMapping[f.key] = detectedColumns[i];
      });
      setMapping(initialMapping);
      setShowMapping(true);
      setPreview([]);
      window._rawImportData = dataRows.map(row => {
        const obj = {};
        ALLOWED_FIELDS.forEach((f, i) => { obj[f.key] = row[i] || ''; });
        return obj;
      });
    };
    if (ext === 'xls' || ext === 'xlsx') {
      reader.readAsBinaryString(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleParse = () => {
    console.log('Parse button clicked. File:', file);
    if (!file) {
      setError('Please select a file before parsing.');
      return;
    }
    setError('');
    setSuccess('');
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      let data = XLSX.utils.sheet_to_json(ws, { defval: '' });
      // Detect columns
      const detectedColumns = data.length > 0 ? Object.keys(data[0]) : [];
      setColumns(detectedColumns);
      // Auto-map columns by name
      const initialMapping = {};
      ALLOWED_FIELDS.forEach(f => {
        const found = detectedColumns.find(col => col.toLowerCase().replace(/[^a-z0-9]/g, '') === f.label.toLowerCase().replace(/[^a-z0-9]/g, ''));
        if (found) initialMapping[f.key] = found;
      });
      setMapping(initialMapping);
      setShowMapping(true);
      setPreview([]); // Clear preview until mapping is confirmed
      // Store raw data for later mapping
      window._rawImportData = data;
    };
    reader.readAsBinaryString(file);
  };

  const handleFieldChange = (idx, field, value) => {
    setPreview(prev => prev.map((row, i) => {
      if (i !== idx) return row;
      let updated = { ...row, [field]: value };
      if (field === 'CustomerListID') {
        const normValue = normalizeId(value);
        updated.CustomerListID = normValue;
        updated.customer_number = normValue;
        updated.barcode = `*%${normValue}*`;
        updated.AccountNumber = normValue;
      }
      return updated;
    }));
  };

  const normalizeId = id => {
    return (id || '').trim().replace(/\s+/g, '').toLowerCase();
  };

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  };

  const handleApprove = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    const importStart = new Date().toISOString();
    let importHistoryId = null;
    let importUser = await getCurrentUser();
    let importErrorMsg = '';
    let importStatus = 'success';
    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    // Normalize all preview IDs
    const normalizedPreview = preview.map(c => ({
      ...c,
      CustomerListID: normalizeId(c.CustomerListID),
    }));
    // Batch .in() query for existing IDs
    const BATCH_SIZE = 500;
    let existingIds = new Set();
    for (let i = 0; i < normalizedPreview.length; i += BATCH_SIZE) {
      const batch = normalizedPreview.slice(i, i + BATCH_SIZE).map(c => c.CustomerListID);
      const { data: existing } = await supabase.from('customers').select('CustomerListID').in('CustomerListID', batch);
      (existing || []).forEach(c => existingIds.add(normalizeId(c.CustomerListID)));
    }
    // Deduplicate within the batch itself and normalize
    const seenIds = new Set();
    const duplicateInBatch = [];
    const duplicateInDb = [];
    const invalidIds = [];
    const toInsert = normalizedPreview
      .filter(c => {
        let rawId = c.CustomerListID || '';
        let cleanedId = normalizeId(rawId);
        let normId = cleanedId;
        if (!normId) { invalidIds.push(rawId); return false; }
        if (existingIds.has(normId)) { duplicateInDb.push(cleanedId); return false; }
        if (seenIds.has(normId)) { duplicateInBatch.push(cleanedId); return false; }
        seenIds.add(normId);
        // Update the row to have the cleaned ID and barcode
        c.CustomerListID = cleanedId;
        c.customer_number = cleanedId;
        c.barcode = `*%${cleanedId}*`;
        c.AccountNumber = cleanedId;
        return true;
      })
      .map(row => {
        const filtered = {};
        ALLOWED_FIELDS.forEach(f => { if (row[f.key] !== undefined) filtered[f.key] = row[f.key]; });
        return filtered;
      });
    // Debug logging
    console.log('Checked existing IDs:', Array.from(existingIds));
    console.log('To insert:', toInsert.map(c => c.CustomerListID));
    if (duplicateInBatch.length > 0 || duplicateInDb.length > 0 || invalidIds.length > 0) {
      setError(
        (duplicateInDb.length ? `Skipped (already in database): ${duplicateInDb.join(', ')}. ` : '') +
        (duplicateInBatch.length ? `Skipped (duplicate in file): ${duplicateInBatch.join(', ')}. ` : '') +
        (invalidIds.length ? `Skipped (invalid/empty ID): ${invalidIds.join(', ')}.` : '')
      );
    }
    if (toInsert.length === 0) {
      setError('All customers in the file already exist.');
      skippedCount = preview.length;
      importStatus = 'skipped';
      errorCount = 0;
      importedCount = 0;
      // Log import history (all skipped)
      await supabase.from('import_history').insert([
        {
          file_name: file?.name || '',
          import_type: 'customers',
          user_id: importUser?.id || null,
          user_email: importUser?.email || null,
          started_at: importStart,
          finished_at: new Date().toISOString(),
          status: importStatus,
          summary: { imported: importedCount, skipped: skippedCount, errors: errorCount },
          error_message: 'All customers in the file already exist.'
        }
      ]);
      setLoading(false);
      return;
    }
    // Use insert to only add new customers, skip existing
    const { error: insertError } = await supabase.from('customers').insert(toInsert);
    if (insertError) {
      // Try to extract the problematic ID from the error message
      let duplicateIdMsg = '';
      if (insertError.message && insertError.message.includes('duplicate key value')) {
        duplicateIdMsg = `\nIDs attempted: ${toInsert.map(c => c.CustomerListID).join(', ')}`;
      }
      setError(insertError.message + duplicateIdMsg);
      console.error('Insert error:', insertError, 'IDs attempted:', toInsert.map(c => c.CustomerListID));
      importErrorMsg = insertError.message + duplicateIdMsg;
      importStatus = 'error';
      errorCount = 1;
    } else {
      setSuccess(`${toInsert.length} customers imported successfully!`);
      setPreview([]);
      setFile(null);
      importedCount = toInsert.length;
      skippedCount = duplicateInDb.length + duplicateInBatch.length + invalidIds.length;
      errorCount = 0;
    }
    // Log import history
    await supabase.from('import_history').insert([
      {
        file_name: file?.name || '',
        import_type: 'customers',
        user_id: importUser?.id || null,
        user_email: importUser?.email || null,
        started_at: importStart,
        finished_at: new Date().toISOString(),
        status: importStatus,
        summary: { imported: importedCount, skipped: skippedCount, errors: errorCount },
        error_message: importErrorMsg
      }
    ]);
    setLoading(false);
  };

  const handleCancel = () => {
    setPreview([]);
    setFile(null);
    setError('');
    setSuccess('');
  };

  // Add a function to build preview from mapping
  const handleConfirmMapping = () => {
    // Save mapping to localStorage
    localStorage.setItem('customerImportMapping', JSON.stringify(mapping));
    const data = window._rawImportData || [];
    const mappedData = data.map(row => {
      const obj = {};
      ALLOWED_FIELDS.forEach(f => {
        const col = mapping[f.key];
        obj[f.key] = col ? row[col] : '';
      });
      // Generate barcode and account fields
      const normId = obj.CustomerListID ? normalizeId(obj.CustomerListID) : '';
      obj.customer_number = normId;
      obj.customer_barcode = obj.customer_barcode || '';
      obj.barcode = obj.customer_barcode || `*%${normId}*`;
      obj.AccountNumber = normId;
      return obj;
    });
    setPreview(mappedData);
    setShowMapping(false);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fff', py: 8, borderRadius: 0, overflow: 'visible' }}>
      <Paper elevation={0} sx={{ maxWidth: 1100, mx: 'auto', p: { xs: 2, md: 5 }, borderRadius: 0, boxShadow: '0 2px 12px 0 rgba(16,24,40,0.04)', border: '1px solid #eee', bgcolor: '#fff', overflow: 'visible' }}>
        <Button onClick={() => navigate('/dashboard')} variant="outlined" color="primary" sx={{ mb: 4, borderRadius: 999, fontWeight: 700, px: 4 }}>
          ← Back to Dashboard
        </Button>
        <Typography variant="h3" fontWeight={900} color="primary" mb={2} sx={{ letterSpacing: -1 }}>Import Customers</Typography>
        <Typography variant="body1" mb={3} color="text.secondary">
          Import customers from Excel or CSV files. Your file columns will be automatically mapped by name or position.
        </Typography>
        <Box mb={4}>
          <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} style={{ display: 'none' }} id="file-input" />
          <label htmlFor="file-input">
            <Button variant="outlined" component="span" sx={{ borderRadius: 999, fontWeight: 700, px: 4 }}>
              Choose File
            </Button>
          </label>
          {file && (
            <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
              Selected: {file.name}
            </Typography>
          )}
        </Box>
        <Box mb={3}>
          <Button onClick={handleParse} disabled={!file} variant="contained" color="primary" sx={{ borderRadius: 999, fontWeight: 700, px: 4 }}>
            Parse File
          </Button>
        </Box>
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}
        {showMapping && columns.length > 0 && (
          <Box mb={5}>
            <Typography variant="h6" fontWeight={800} mb={2}>Map your file columns to app fields:</Typography>
            <Paper variant="outlined" sx={{ mb: 2, borderRadius: 3, border: '1px solid #e3e7ef', boxShadow: 'none', p: 2 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
                <thead>
                  <tr style={{ background: '#fafbfc' }}>
                    <th style={{ fontWeight: 800, padding: 8, borderBottom: '1px solid #eee' }}>App Field</th>
                    <th style={{ fontWeight: 800, padding: 8, borderBottom: '1px solid #eee' }}>File Column</th>
                  </tr>
                </thead>
                <tbody>
                  {ALLOWED_FIELDS.map(f => (
                    <tr key={f.key}>
                      <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{f.label}</td>
                      <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>
                        <TextField
                          select
                          value={mapping[f.key] || ''}
                          onChange={e => setMapping({ ...mapping, [f.key]: e.target.value })}
                          size="medium"
                          sx={{ minWidth: 160 }}
                        >
                          <MenuItem value="">-- None --</MenuItem>
                          {columns.map(col => (
                            <MenuItem key={col} value={col}>{col}</MenuItem>
                          ))}
                        </TextField>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Paper>
            <Button variant="contained" color="primary" onClick={handleConfirmMapping} sx={{ borderRadius: 999, fontWeight: 700, px: 4 }}>Confirm Mapping</Button>
          </Box>
        )}
        {loading && (
          <Box mb={4} display="flex" justifyContent="center" alignItems="center">
            <Typography variant="h6" color="primary">Mapping data, please wait...</Typography>
          </Box>
        )}
        {preview.length > 0 && (
          <Box mt={4}>
            <Typography variant="h6" fontWeight={800} color="primary" mb={4}>Preview & Approve</Typography>
            <Box mb={4}>
              <Button onClick={handleApprove} disabled={loading} variant="contained" color="primary" sx={{ mr: 2, borderRadius: 999, fontWeight: 700, px: 4 }}>Approve & Import</Button>
              <Button onClick={handleCancel} disabled={loading} variant="outlined" color="primary" sx={{ borderRadius: 999, fontWeight: 700, px: 4 }}>Cancel</Button>
            </Box>
            <Paper variant="outlined" sx={{ overflowX: 'auto', borderRadius: 3, border: '1px solid #e3e7ef', boxShadow: 'none' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }} role="table" aria-label="Customer import preview table">
                <thead style={{ background: '#fafbfc' }}>
                  <tr>
                    {ALLOWED_FIELDS.map(field => (
                      <th key={field.key} scope="col" style={{ fontWeight: 800, padding: 8, borderBottom: '1px solid #eee' }}>{field.label}</th>
                    ))}
                    <th scope="col" style={{ fontWeight: 800, padding: 8, borderBottom: '1px solid #eee' }}>Customer Number</th>
                    <th scope="col" style={{ fontWeight: 800, padding: 8, borderBottom: '1px solid #eee' }}>Barcode</th>
                    <th scope="col" style={{ fontWeight: 800, padding: 8, borderBottom: '1px solid #eee' }}>AccountNumber</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 100).map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f3f3f3' }}>
                      {ALLOWED_FIELDS.map(field => (
                        <td key={field.key} style={{ padding: 8 }}><TextField value={row[field.key] || ''} onChange={e => handleFieldChange(idx, field.key, e.target.value)} size="small" sx={{ bgcolor: '#fafbfc', borderRadius: 2 }} /></td>
                      ))}
                      <td><TextField value={row.customer_number} readOnly size="small" sx={{ bgcolor: '#f3f3f3', borderRadius: 2 }} /></td>
                      <td><TextField value={row.barcode} readOnly size="small" sx={{ bgcolor: '#f3f3f3', borderRadius: 2, fontFamily: 'monospace' }} /></td>
                      <td><TextField value={row.AccountNumber} readOnly size="small" sx={{ bgcolor: '#f3f3f3', borderRadius: 2 }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 100 && (
                <Typography variant="body2" color="textSecondary" sx={{ p: 2 }}>
                  Showing first 100 rows of {preview.length} total rows.
                </Typography>
              )}
            </Paper>
          </Box>
        )}
        <Snackbar open={!!snackbar} autoHideDuration={3000} onClose={() => setSnackbar('')}><Alert severity="success">{snackbar}</Alert></Snackbar>
      </Paper>
    </Box>
  );
}

export default ImportCustomerInfo; 