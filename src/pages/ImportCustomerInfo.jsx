import logger from '../utils/logger';
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/client';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import { Box, Paper, Typography, Button, TextField, Alert, MenuItem, Snackbar } from '@mui/material';
import { findCustomer, normalizeCustomerName, extractCustomerId, batchFindCustomers } from '../utils/customerMatching';
import { TableSkeleton } from '../components/SmoothLoading';
import { useAuth } from '../hooks/useAuth';

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
  phone: ['phone', 'phone number', 'phonenumber', 'contact phone', 'mobile', 'mobile number'],
  email: ['email', 'email address', 'emailaddress', 'e-mail', 'contact email', 'customer email', 'rentalbillemailto'],
  barcode: ['barcode', 'customer_barcode', 'customer barcode', 'holderbarcode', 'customeridbarcode', 'scan code', 'scan_code'],
  address2: ['address2', 'address 2', 'billing address 2', 'shipping address line2', 'shipping address 2'],
  address3: ['address3', 'address 3', 'billing address 3', 'shipping address line3', 'shipping address 3'],
  address4: ['address4', 'address 4', 'billing address 4', 'shipping address line4', 'shipping address 4'],
  address5: ['address5', 'address 5', 'billing address 5', 'shipping address line5', 'shipping address 5'],
  city: ['city', 'billing city', 'shipping city'],
  postal_code: ['postal_code', 'postal code', 'zip', 'zipcode', 'billing zip', 'shipping zip', 'billing postal', 'shipping postal']
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
  { key: 'email', label: 'Email' },
  { key: 'barcode', label: 'Customer Barcode' }
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

// Enhanced customer matching function with organization filtering
async function findExistingCustomer(customerName, customerId, organizationId) {
  if (!customerName && !customerId) return null;
  
  // Strategy 1: Match by exact CustomerListID (case-insensitive) within organization
  if (customerId && organizationId) {
    const { data: customer, error } = await supabase
      .from('customers')
      .select('CustomerListID, name')
      .ilike('CustomerListID', customerId.trim())
      .eq('organization_id', organizationId)
      .single();
    
    if (customer && !error) {
      return customer;
    }
  }
  
  // Strategy 2: Parse customer name with ID in parentheses (within organization)
  if (customerName && organizationId) {
    const idMatch = customerName.match(/\(([^)]+)\)$/);
    if (idMatch) {
      const extractedId = idMatch[1].trim();
      const { data: customer, error } = await supabase
        .from('customers')
        .select('CustomerListID, name')
        .ilike('CustomerListID', extractedId)
        .eq('organization_id', organizationId)
        .single();
      
      if (customer && !error) {
        return customer;
      }
    }
  }
  
  // Strategy 3: Match by normalized name (remove parentheses and IDs) within organization
  if (customerName && organizationId) {
    const normalizedName = customerName.replace(/\([^)]*\)/g, '').trim();
    const { data: customer, error } = await supabase
      .from('customers')
      .select('CustomerListID, name')
      .ilike('name', normalizedName)
      .eq('organization_id', organizationId)
      .single();
    
    if (customer && !error) {
      return customer;
    }
  }
  
  // Strategy 4: Fuzzy name matching (case-insensitive) within organization
  if (customerName && organizationId) {
    const { data: customers, error } = await supabase
      .from('customers')
      .select('CustomerListID, name')
      .ilike('name', `%${customerName.trim()}%`)
      .eq('organization_id', organizationId);
    
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
  const { profile } = useAuth(); // Add useAuth hook to get profile

  useEffect(() => {
    const color = localStorage.getItem('themeColor') || 'teal-500';
    document.documentElement.style.setProperty('--accent', colorMap[color] || colorMap['teal-500'] || '#40B5AD');
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
      logger.log('Raw file content:', rawContent.slice(0, 500));
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
      logger.log('Detected columns:', detectedColumns);
      logger.log('First 3 data rows:', dataRows.slice(0,3));
      setColumns(detectedColumns);
      // Enhanced auto-map columns by name or position
      const normalize = (s) => (s || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
      const initialMapping = {};
      ALLOWED_FIELDS.forEach((f) => {
        const alias = FIELD_ALIASES[f.key] || [];
        const targetNames = [f.label, ...alias];
        const exact = detectedColumns.find(col => targetNames.some(a => normalize(col) === normalize(a)));
        if (exact) {
          initialMapping[f.key] = exact;
          return;
        }
        const fuzzy = detectedColumns.find(col => targetNames.some(a => normalize(col).includes(normalize(a))));
        if (fuzzy) {
          initialMapping[f.key] = fuzzy;
        }
      });
      // Force mapping for your example columns
      if (detectedColumns.includes('HolderStr')) initialMapping['CustomerListID'] = 'HolderStr';
      if (detectedColumns.includes('HolderName')) initialMapping['name'] = 'HolderName';
      if (detectedColumns.includes('BillToFullAddress')) initialMapping['contact_details'] = 'BillToFullAddress';
      // Common barcode headers
      if (detectedColumns.includes('Customer Barcode')) initialMapping['barcode'] = 'Customer Barcode';
      if (detectedColumns.includes('Barcode')) initialMapping['barcode'] = 'Barcode';
      if (detectedColumns.includes('HolderBarcode')) initialMapping['barcode'] = 'HolderBarcode';
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
          logger.log('Preview data:', previewData.slice(0,3));
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
    logger.log('Parse button clicked. File:', file);
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
      // Check if user has organization
      if (!profile?.organization_id) {
        throw new Error('You must be linked to an organization to import customers.');
      }
      
      // Enhanced customer validation and batch deduplication
      const customersToProcess = [];
      const duplicateCustomers = [];
      const invalidCustomers = [];
      const customersToUpdate = [];
      
      // Helper to normalize CustomerListID (lowercase, remove trailing letters)
      const normalizeId = (id) => {
        if (!id) return '';
        return id.toLowerCase().trim().replace(/[a-z]+$/, '');
      };
      
      // Helper to get value from customer object using mapping
      const getMappedValue = (customer, fieldKey) => {
        const mappedColumn = mapping[fieldKey];
        if (mappedColumn && customer[mappedColumn] !== undefined) {
          return customer[mappedColumn];
        }
        // Fallback to direct field key access (for backwards compatibility)
        return customer[fieldKey];
      };
      
      // Filter out invalid entries and detect duplicates within import data
      const seenCustomers = new Set();
      const seenBarcodes = new Map(); // Track barcodes (case-insensitive) -> customer
      const validCustomers = [];
      
      // Helper to normalize barcode for comparison (case-insensitive)
      const normalizeBarcode = (barcode) => {
        if (!barcode) return '';
        return barcode.toString().trim().toLowerCase();
      };
      
      for (const customer of preview) {
        const customerName = getMappedValue(customer, 'name') || '';
        const customerId = getMappedValue(customer, 'CustomerListID') || '';
        const customerBarcode = normalizeBarcode(getMappedValue(customer, 'barcode'));
        
        if (!customerName.trim() && !customerId.trim()) {
          invalidCustomers.push('Empty name and ID');
          continue;
        }
        
        // Check for duplicates within the import data itself using normalized IDs
        const normalizedName = customerName.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
        const normalizedId = normalizeId(customerId);
        const duplicateKey = `${normalizedName}_${normalizedId}`;
        
        if (seenCustomers.has(duplicateKey)) {
          duplicateCustomers.push(`${customerName} (${customerId}) - duplicate within import file`);
          continue;
        }
        
        // Check for duplicate barcodes (case-insensitive)
        if (customerBarcode) {
          if (seenBarcodes.has(customerBarcode)) {
            const existingCustomer = seenBarcodes.get(customerBarcode);
            duplicateCustomers.push(`${customerName} (${customerId}) - duplicate barcode "${customer.barcode}" already used by ${existingCustomer.name} (${existingCustomer.CustomerListID})`);
            continue;
          }
          seenBarcodes.set(customerBarcode, { name: customerName, CustomerListID: customerId });
        }
        
        seenCustomers.add(duplicateKey);
        validCustomers.push(customer);
      }
      
      // Batch lookup all existing customers (single database query)
      logger.log(`Checking ${validCustomers.length} customers against database...`);
      const existingCustomerMap = await batchFindCustomers(validCustomers, profile.organization_id);
      
      // Process each customer using the batch lookup results
      for (const customer of validCustomers) {
        const customerName = customer.name || '';
        const customerId = customer.CustomerListID || '';
        const key = `${customerId}_${customerName}`;
        const existingCustomer = existingCustomerMap[key];
        
        if (existingCustomer) {
          // Always update existing customer with new info from import file
          const updateData = {};
          let hasUpdates = false;
          
          // Update all fields if new data is provided (always use new data, don't check if more complete)
          const contactDetails = getMappedValue(customer, 'contact_details');
          if (contactDetails !== undefined && contactDetails !== null && contactDetails !== '') {
            updateData.contact_details = contactDetails.trim() || null;
            hasUpdates = true;
          }
          const address2 = getMappedValue(customer, 'address2');
          if (address2 !== undefined && address2 !== null && address2 !== '') {
            updateData.address2 = address2.trim() || null;
            hasUpdates = true;
          }
          const address3 = getMappedValue(customer, 'address3');
          if (address3 !== undefined && address3 !== null && address3 !== '') {
            updateData.address3 = address3.trim() || null;
            hasUpdates = true;
          }
          const address4 = getMappedValue(customer, 'address4');
          if (address4 !== undefined && address4 !== null && address4 !== '') {
            updateData.address4 = address4.trim() || null;
            hasUpdates = true;
          }
          const address5 = getMappedValue(customer, 'address5');
          if (address5 !== undefined && address5 !== null && address5 !== '') {
            updateData.address5 = address5.trim() || null;
            hasUpdates = true;
          }
          const city = getMappedValue(customer, 'city');
          if (city !== undefined && city !== null && city !== '') {
            updateData.city = city.trim() || null;
            hasUpdates = true;
          }
          const postalCode = getMappedValue(customer, 'postal_code');
          if (postalCode !== undefined && postalCode !== null && postalCode !== '') {
            updateData.postal_code = postalCode.trim() || null;
            hasUpdates = true;
          }
          const phone = getMappedValue(customer, 'phone');
          if (phone !== undefined && phone !== null && phone !== '') {
            updateData.phone = phone.trim() || null;
            hasUpdates = true;
          }
          const email = getMappedValue(customer, 'email');
          if (email !== undefined && email !== null && email !== '') {
            updateData.email = email.trim() || null;
            hasUpdates = true;
          }
          const barcode = getMappedValue(customer, 'barcode');
          if (barcode !== undefined && barcode !== null && barcode !== '') {
            const newBarcode = barcode.toString().trim();
            if (newBarcode) {
              updateData.barcode = newBarcode;
              hasUpdates = true;
            }
          }
          
          // Always update name if provided (in case of slight variations)
          const name = getMappedValue(customer, 'name');
          if (name && name.trim()) {
            updateData.name = name.trim();
            hasUpdates = true;
          }
          
          // Always add to update list if customer exists (even if no field changes detected)
          // This ensures we still update the customer record timestamp
          const nameValue = getMappedValue(customer, 'name');
          customersToUpdate.push({
            CustomerListID: existingCustomer.CustomerListID,
            updateData: hasUpdates ? updateData : { name: nameValue ? nameValue.trim() : customerName.trim() }, // At minimum update name
            displayName: `${customerName} (${customerId})`
          });
          continue;
        }
        
        // Prepare customer data for new customers
        // Normalize CustomerListID to lowercase (remove trailing letters for consistency)
        const normalizedId = normalizeId(customerId) || generateCustomerId();
        // Determine location from city or use default
        const cityValue = getMappedValue(customer, 'city');
        const city = (cityValue || '').trim().toUpperCase();
        let location = 'SASKATOON'; // Default
        if (city.includes('REGINA')) location = 'REGINA';
        else if (city.includes('CHILLIWACK')) location = 'CHILLIWACK';
        else if (city.includes('PRINCE GEORGE') || city.includes('PRINCE_GEORGE')) location = 'PRINCE_GEORGE';
        else if (city.includes('SASKATOON')) location = 'SASKATOON';
        
        // Normalize barcode (case-insensitive storage, but preserve original case)
        const barcodeValue = getMappedValue(customer, 'barcode');
        const normalizedBarcode = barcodeValue ? barcodeValue.toString().trim() : null;
        
        const customerData = {
          CustomerListID: normalizedId,
          name: customerName.trim(),
          contact_details: (getMappedValue(customer, 'contact_details') || '').trim() || null,
          address2: (getMappedValue(customer, 'address2') || '').trim() || null,
          address3: (getMappedValue(customer, 'address3') || '').trim() || null,
          address4: (getMappedValue(customer, 'address4') || '').trim() || null,
          address5: (getMappedValue(customer, 'address5') || '').trim() || null,
          city: (cityValue || '').trim() || null,
          postal_code: (getMappedValue(customer, 'postal_code') || '').trim() || null,
          phone: (getMappedValue(customer, 'phone') || '').trim() || null,
          email: (getMappedValue(customer, 'email') || '').trim() || null,
          barcode: normalizedBarcode,
          location: location,
          organization_id: profile.organization_id
        };
        
        customersToProcess.push(customerData);
      }
      
      // Batch update existing customers
      if (customersToUpdate.length > 0) {
        logger.log(`Updating ${customersToUpdate.length} existing customers...`);
        const UPDATE_BATCH_SIZE = 50;
        for (let i = 0; i < customersToUpdate.length; i += UPDATE_BATCH_SIZE) {
          const batch = customersToUpdate.slice(i, i + UPDATE_BATCH_SIZE);
          for (const { CustomerListID, updateData, displayName } of batch) {
            const { error: updateError } = await supabase
              .from('customers')
              .update(updateData)
              .eq('CustomerListID', CustomerListID)
              .eq('organization_id', profile.organization_id);
            
            if (!updateError) {
              importedCount++; // Count updates as successful imports
              logger.log(`Updated customer: ${displayName}`);
            } else {
              logger.error(`Failed to update customer ${displayName}:`, updateError);
              duplicateCustomers.push(`${displayName} - failed to update: ${updateError.message}`);
            }
          }
        }
      }
      
      // Import new customers with conflict handling
      if (customersToProcess.length > 0) {
        logger.log(`Importing ${customersToProcess.length} new customers...`);
        
        // Check for barcode conflicts before inserting (case-insensitive)
        const barcodesToCheck = customersToProcess
          .filter(c => c.barcode)
          .map(c => c.barcode.toLowerCase().trim());
        
        if (barcodesToCheck.length > 0) {
          // Fetch all customers with matching barcodes (case-insensitive)
          const { data: allCustomers, error: allCustomersError } = await supabase
            .from('customers')
            .select('barcode, CustomerListID, name')
            .eq('organization_id', profile.organization_id)
            .not('barcode', 'is', null);
          
          if (!allCustomersError && allCustomers) {
            // Filter to find matches (case-insensitive)
            const existingBarcodes = allCustomers.filter(c => {
              const existingBarcodeNorm = (c.barcode || '').toString().toLowerCase().trim();
              return barcodesToCheck.includes(existingBarcodeNorm);
            });
            
            if (existingBarcodes.length > 0) {
              // Remove customers with duplicate barcodes from insert list
              const existingBarcodeSet = new Set(existingBarcodes.map(c => (c.barcode || '').toString().toLowerCase().trim()).filter(Boolean));
              const filteredCustomers = [];
              const barcodeConflicts = [];
              
              for (const customer of customersToProcess) {
                if (customer.barcode) {
                  const normalizedBarcode = customer.barcode.toLowerCase().trim();
                  if (existingBarcodeSet.has(normalizedBarcode)) {
                    const existing = existingBarcodes.find(c => (c.barcode || '').toString().toLowerCase().trim() === normalizedBarcode);
                    barcodeConflicts.push(`${customer.name} (${customer.CustomerListID}) - barcode "${customer.barcode}" already used by ${existing?.name || 'another customer'}`);
                    // Try to update the existing customer instead
                    const { error: updateError } = await supabase
                      .from('customers')
                    .update({
                      name: customer.name,
                      contact_details: customer.contact_details,
                      address2: customer.address2,
                      address3: customer.address3,
                      address4: customer.address4,
                      address5: customer.address5,
                      city: customer.city,
                      postal_code: customer.postal_code,
                      phone: customer.phone,
                      email: customer.email
                    })
                      .ilike('barcode', customer.barcode)
                      .eq('organization_id', profile.organization_id);
                    
                    if (!updateError) {
                      importedCount++;
                      logger.log(`Updated customer by barcode: ${customer.name}`);
                    }
                    continue;
                  }
                }
                filteredCustomers.push(customer);
              }
              
              if (barcodeConflicts.length > 0) {
                duplicateCustomers.push(...barcodeConflicts);
              }
              
              customersToProcess.length = 0;
              customersToProcess.push(...filteredCustomers);
            }
          }
        }
        
        // Use upsert to handle duplicate key conflicts gracefully
        if (customersToProcess.length > 0) {
          const { data: insertData, error: insertError } = await supabase
            .from('customers')
            .upsert(customersToProcess, {
              onConflict: 'organization_id,CustomerListID',
              ignoreDuplicates: false
            });
          
          if (insertError) {
            logger.error('Insert error:', insertError);
            
            // If it's a constraint violation, try individual inserts to identify the problem
            if (insertError.code === '23505' || insertError.message.includes('duplicate key')) {
              logger.log('Constraint violation detected, trying individual inserts...');
              
              let successCount = 0;
              let conflictCount = 0;
              const conflictCustomers = [];
              
              for (const customer of customersToProcess) {
                try {
                  const { error: singleInsertError } = await supabase
                    .from('customers')
                    .insert([customer]);
                  
                  if (singleInsertError) {
                    if (singleInsertError.code === '23505' || singleInsertError.message.includes('duplicate key')) {
                      conflictCount++;
                      conflictCustomers.push(`${customer.name} (${customer.CustomerListID})`);
                      logger.log(`Conflict: ${customer.name} (${customer.CustomerListID})`);
                    } else {
                      throw singleInsertError;
                    }
                  } else {
                    successCount++;
                  }
                } catch (err) {
                  logger.error(`Error inserting ${customer.name}:`, err);
                  conflictCount++;
                  conflictCustomers.push(`${customer.name} (${customer.CustomerListID})`);
                }
              }
              
              importedCount += successCount;
              duplicateCustomers.push(...conflictCustomers.map(name => `${name} - duplicate CustomerListID`));
              
              if (successCount > 0) {
                logger.log(`Successfully imported ${successCount} customers, ${conflictCount} conflicts resolved`);
              }
            } else {
              throw new Error(`Import error: ${insertError.message}`);
            }
          } else {
            importedCount += customersToProcess.length;
          }
        }
      }
      
      skippedCount = duplicateCustomers.length + invalidCustomers.length;
      
      // Prepare result message
      let message = `Import complete! `;
      const updatedCount = customersToUpdate.length;
      if (importedCount > 0) {
        message += `Imported ${importedCount} new customers. `;
      }
      if (updatedCount > 0) {
        message += `Updated ${updatedCount} existing customers. `;
      }
      if (duplicateCustomers.length > 0 && duplicateCustomers.length > updatedCount) {
        const skippedDuplicates = duplicateCustomers.length - updatedCount;
        if (skippedDuplicates > 0) {
          message += `Skipped ${skippedDuplicates} duplicate customers. `;
        }
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
          let val = row[columnName];
          if (typeof val === 'string') val = val.trim();
          if (fieldKey === 'CustomerListID') val = normalizeId(val);
          mapped[fieldKey] = val;
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

        {loading && (
          <Box sx={{ my: 4 }}>
            <TableSkeleton rows={5} columns={3} />
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
                    <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 10).map((customer, idx) => {
                    // Helper to get mapped value for display
                    const getValue = (fieldKey) => {
                      const mappedColumn = mapping[fieldKey];
                      return mappedColumn ? (customer[mappedColumn] || '') : (customer[fieldKey] || '');
                    };
                    return (
                      <tr key={idx}>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{getValue('CustomerListID')}</td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{getValue('name')}</td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{getValue('contact_details')}</td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{getValue('email')}</td>
                      </tr>
                    );
                  })}
                  {preview.length > 10 && (
                    <tr>
                      <td colSpan={4} style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd', fontStyle: 'italic' }}>
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