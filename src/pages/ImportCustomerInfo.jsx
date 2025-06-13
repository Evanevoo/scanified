import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/client';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import { Box, Paper, Typography, Button, TextField, Alert, MenuItem, Snackbar } from '@mui/material';
import { findCustomer, normalizeCustomerName, extractCustomerId } from '../utils/customerMatching';

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

// Enhanced alias map for auto-mapping CSV columns to customer fields
const FIELD_ALIASES = {
  CustomerListID: ['customerlistid', 'customer id', 'customer_id', 'id', 'accountnumber', 'account number', 'holderstr', 'customerlist'],
  name: ['name', 'customername', 'customer name', 'holdername', 'company', 'company name'],
  contact_details: ['contact_details', 'address', 'contact', 'contact info', 'contact information', 'address1', 'address 1', 'billtofulladdress'],
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

// Enhanced helper to format date to ISO
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

// Enhanced helper to normalize names for matching
function normalizeName(name) {
  return (name || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

// Enhanced customer matching function
async function findExistingCustomer(customerName, customerId) {
  if (!customerName && !customerId) return null;
  
  // Strategy 1: Match by exact CustomerListID (case-insensitive)
  if (customerId) {
    const { data: customer, error } = await supabase
      .from('customers')
      .select('CustomerListID, name')
      .ilike('CustomerListID', customerId.trim())
      .single();
    
    if (customer && !error) {
      return customer;
    }
  }
  
  // Strategy 2: Parse customer name with ID in parentheses
  if (customerName) {
    const idMatch = customerName.match(/\(([^)]+)\)$/);
    if (idMatch) {
      const extractedId = idMatch[1].trim();
      const { data: customer, error } = await supabase
        .from('customers')
        .select('CustomerListID, name')
        .ilike('CustomerListID', extractedId)
        .single();
      
      if (customer && !error) {
        return customer;
      }
    }
  }
  
  // Strategy 3: Match by normalized name (remove parentheses and IDs)
  if (customerName) {
    const normalizedName = customerName.replace(/\([^)]*\)/g, '').trim();
    const { data: customer, error } = await supabase
      .from('customers')
      .select('CustomerListID, name')
      .ilike('name', normalizedName)
      .single();
    
    if (customer && !error) {
      return customer;
    }
  }
  
  // Strategy 4: Fuzzy name matching (case-insensitive)
  if (customerName) {
    const { data: customers, error } = await supabase
      .from('customers')
      .select('CustomerListID, name')
      .ilike('name', `%${customerName.trim()}%`);
    
    if (customers && customers.length > 0 && !error) {
      // Return the first match (most exact)
      return customers[0];
    }
  }
  
  return null;
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
    setLoading(true);
    if (!e.target.files[0]) return;
    const file = e.target.files[0];
    const ext = file.name.split('.').pop().toLowerCase();
    const reader = new FileReader();
    reader.onload = (evt) => {
      let rows;
      let rawContent = evt.target.result;
      // Debug: log raw file content
      console.log('Raw file content:', rawContent.slice(0, 500));
      if (ext === 'xls' || ext === 'xlsx') {
        const bstr = rawContent;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      } else {
        // Remove blank lines and trim
        const lines = rawContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        rows = lines.map(line => line.split('\t'));
      }
      if (!rows.length) { setLoading(false); return; }
      // Remove empty rows
      rows = rows.filter(row => Array.isArray(row) ? row.some(cell => cell && cell.trim() !== '') : true);
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
      // Debug: log detected columns and first 3 rows
      console.log('Detected columns:', detectedColumns);
      console.log('First 3 data rows:', dataRows.slice(0,3));
      setColumns(detectedColumns);
      // Enhanced auto-map columns by name or position
      const initialMapping = {};
      ALLOWED_FIELDS.forEach((f, i) => {
        // Try to find a column by alias, case-insensitive and ignoring spaces/underscores
        const alias = FIELD_ALIASES[f.key] || [];
        const found = detectedColumns.find(col => alias.some(a => col.toLowerCase().replace(/[^a-z0-9]/g, '') === a.toLowerCase().replace(/[^a-z0-9]/g, '')));
        if (found) initialMapping[f.key] = found;
        else {
          // Try fuzzy match: contains alias
          const fuzzy = detectedColumns.find(col => alias.some(a => col.toLowerCase().replace(/[^a-z0-9]/g, '').includes(a.toLowerCase().replace(/[^a-z0-9]/g, ''))));
          if (fuzzy) initialMapping[f.key] = fuzzy;
          else if (detectedColumns[i]) initialMapping[f.key] = detectedColumns[i];
        }
      });
      // Force mapping for your example columns
      if (detectedColumns.includes('HolderStr')) initialMapping['CustomerListID'] = 'HolderStr';
      if (detectedColumns.includes('HolderName')) initialMapping['name'] = 'HolderName';
      if (detectedColumns.includes('BillToFullAddress')) initialMapping['contact_details'] = 'BillToFullAddress';
      setMapping(initialMapping);
      setShowMapping(true);
      // Build preview data in batches
      const previewData = [];
      const BATCH = 500;
      let i = 0;
      function processBatch() {
        for (let j = 0; j < BATCH && i < dataRows.length; j++, i++) {
          const row = dataRows[i];
          const obj = {};
          detectedColumns.forEach((col, idx) => { obj[col] = row[idx] || ''; });
          previewData.push(obj);
        }
        if (i < dataRows.length) {
          setTimeout(processBatch, 0);
        } else {
          // Debug: log preview data
          console.log('Preview data:', previewData.slice(0,3));
          setPreview(previewData);
          window._rawImportData = previewData;
          setLoading(false);
        }
      }
      processBatch();
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
    
    try {
      // Enhanced customer validation and deduplication
      const customersToProcess = [];
      const duplicateCustomers = [];
      const invalidCustomers = [];
      
      for (const customer of preview) {
        const customerName = customer[mapping.name] || '';
        const customerId = customer[mapping.CustomerListID] || '';
        
        // Skip if no name or ID
        if (!customerName.trim() && !customerId.trim()) {
          invalidCustomers.push('Empty name and ID');
          continue;
        }
        
        // Check if customer already exists using enhanced matching
        const existingCustomer = await findCustomer(customerName, customerId);
        
        if (existingCustomer) {
          duplicateCustomers.push(`${customerName} (${customerId}) - matches existing: ${existingCustomer.name} (${existingCustomer.CustomerListID})`);
          continue;
        }
        
        // Prepare customer data
        const customerData = {
          CustomerListID: customerId.trim() || generateCustomerId(),
          name: customerName.trim(),
          contact_details: customer[mapping.contact_details] || '',
          address2: customer[mapping.address2] || '',
          address3: customer[mapping.address3] || '',
          address4: customer[mapping.address4] || '',
          address5: customer[mapping.address5] || '',
          city: customer[mapping.city] || '',
          postal_code: customer[mapping.postal_code] || '',
          phone: customer[mapping.phone] || '',
          customer_barcode: customer[mapping.customer_barcode] || `*%${customerId.trim()}*`,
        };
        
        customersToProcess.push(customerData);
      }
      
      // Import new customers
      if (customersToProcess.length > 0) {
        const { error: insertError } = await supabase
          .from('customers')
          .insert(customersToProcess);
        
        if (insertError) {
          throw new Error(`Import error: ${insertError.message}`);
        }
        
        importedCount = customersToProcess.length;
      }
      
      skippedCount = duplicateCustomers.length + invalidCustomers.length;
      
      // Prepare result message
      let message = `Import complete! `;
      if (importedCount > 0) {
        message += `Imported ${importedCount} new customers. `;
      }
      if (duplicateCustomers.length > 0) {
        message += `Skipped ${duplicateCustomers.length} duplicate customers. `;
      }
      if (invalidCustomers.length > 0) {
        message += `Skipped ${invalidCustomers.length} invalid entries. `;
      }
      
      setSuccess(message.trim());
      setPreview([]);
      setFile(null);
      
    } catch (err) {
      setError(err.message);
      importErrorMsg = err.message;
      importStatus = 'error';
      errorCount = 1;
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
    setColumns([]);
    setMapping({});
    setShowMapping(false);
  };

  const handleConfirmMapping = () => {
    if (!window._rawImportData) return;
    
    const mappedData = window._rawImportData.map(row => {
      const mapped = {};
      Object.entries(mapping).forEach(([fieldKey, columnName]) => {
        if (columnName && row[columnName] !== undefined) {
          mapped[fieldKey] = row[columnName];
        }
      });
      return mapped;
    });
    
    setPreview(mappedData);
    setShowMapping(false);
    
    // Save mapping to localStorage
    localStorage.setItem('customerImportMapping', JSON.stringify(mapping));
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fff', py: 8, borderRadius: 0, overflow: 'visible' }}>
      <Paper elevation={0} sx={{ width: '100%', p: { xs: 2, md: 5 }, borderRadius: 0, boxShadow: '0 2px 12px 0 rgba(16,24,40,0.04)', border: '1px solid #eee', bgcolor: '#fff', overflow: 'visible' }}>
        <Typography variant="h3" fontWeight={900} color="primary" mb={2} sx={{ letterSpacing: -1 }}>Import Customer Information</Typography>
        
        {!showMapping && !preview.length && (
          <Box>
            <Typography variant="body1" color="text.secondary" mb={3}>
              Upload a CSV or Excel file with customer information. The system will automatically detect columns and match them to customer fields.
            </Typography>
            
            <input
              type="file"
              accept=".csv,.xlsx,.xls,.txt"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              id="file-input"
            />
            <label htmlFor="file-input">
              <Button
                variant="contained"
                component="span"
                sx={{
                  borderRadius: 999,
                  bgcolor: '#111',
                  color: '#fff',
                  fontWeight: 700,
                  px: 4,
                  py: 1.5,
                  fontSize: 16,
                  boxShadow: 'none',
                  ':hover': { bgcolor: '#222' }
                }}
              >
                Choose File
              </Button>
            </label>
            
            {file && (
              <Typography variant="body2" color="text.secondary" mt={2}>
                Selected file: {file.name}
              </Typography>
            )}
          </Box>
        )}

        {showMapping && (
          <Box>
            <Typography variant="h5" fontWeight={700} color="primary" mb={3}>
              Column Mapping
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Please confirm the column mapping for your customer data:
            </Typography>
            
            <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(300px, 1fr))" gap={3} mb={4}>
              {ALLOWED_FIELDS.map(field => (
                <Box key={field.key}>
                  <Typography variant="subtitle2" fontWeight={600} mb={1}>
                    {field.label}
                  </Typography>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    value={mapping[field.key] || ''}
                    onChange={(e) => setMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                  >
                    <MenuItem value="">Not mapped</MenuItem>
                    {columns.map(col => (
                      <MenuItem key={col} value={col}>{col}</MenuItem>
                    ))}
                  </TextField>
                </Box>
              ))}
            </Box>
            
            <Box display="flex" gap={2}>
              <Button
                variant="contained"
                onClick={handleConfirmMapping}
                sx={{
                  borderRadius: 999,
                  bgcolor: '#111',
                  color: '#fff',
                  fontWeight: 700,
                  px: 4,
                  py: 1.5,
                  fontSize: 16,
                  boxShadow: 'none',
                  ':hover': { bgcolor: '#222' }
                }}
              >
                Confirm Mapping
              </Button>
              <Button
                variant="outlined"
                onClick={handleCancel}
                sx={{
                  borderRadius: 999,
                  fontWeight: 700,
                  px: 4,
                  py: 1.5,
                  fontSize: 16
                }}
              >
                Cancel
              </Button>
            </Box>
          </Box>
        )}

        {preview.length > 0 && (
          <Box>
            <Typography variant="h5" fontWeight={700} color="primary" mb={3}>
              Preview ({preview.length} customers)
            </Typography>
            
            <Box sx={{ maxHeight: '400px', overflow: 'auto', mb: 4 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5' }}>
                    <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Customer ID</th>
                    <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Name</th>
                    <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 10).map((customer, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{customer.CustomerListID}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{customer.name}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{customer.contact_details}</td>
                    </tr>
                  ))}
                  {preview.length > 10 && (
                    <tr>
                      <td colSpan={3} style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd', fontStyle: 'italic' }}>
                        ... and {preview.length - 10} more customers
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Box>
            
            <Box display="flex" gap={2}>
              <Button
                variant="contained"
                onClick={handleApprove}
                disabled={loading}
                sx={{
                  borderRadius: 999,
                  bgcolor: '#111',
                  color: '#fff',
                  fontWeight: 700,
                  px: 4,
                  py: 1.5,
                  fontSize: 16,
                  boxShadow: 'none',
                  ':hover': { bgcolor: '#222' }
                }}
              >
                {loading ? 'Importing...' : 'Import Customers'}
              </Button>
              <Button
                variant="outlined"
                onClick={handleCancel}
                disabled={loading}
                sx={{
                  borderRadius: 999,
                  fontWeight: 700,
                  px: 4,
                  py: 1.5,
                  fontSize: 16
                }}
              >
                Cancel
              </Button>
            </Box>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 3 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mt: 3 }}>
            {success}
          </Alert>
        )}
      </Paper>
    </Box>
  );
};

export default ImportCustomerInfo; 