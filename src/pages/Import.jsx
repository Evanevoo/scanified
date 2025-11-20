import logger from '../utils/logger';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase/client';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import throttle from 'lodash.throttle';
import debounce from 'lodash.debounce';
import { toast } from 'react-hot-toast';
import { getImportWorker, addImportWorkerListener, removeImportWorkerListener } from '../utils/ImportWorkerManager';
import { Box, Paper, Typography, Button, IconButton, Alert, LinearProgress, Card, CardContent, Stack, Chip, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { ArrowBack as ArrowBackIcon, Upload as UploadIcon, Search as SearchIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { findCustomer, normalizeCustomerName } from '../utils/customerMatching';
import { validateImportData, autoCorrectImportData, generateImportSummary } from '../utils/importValidation';

// Import type definitions
const IMPORT_TYPES = {
  INVOICES: 'invoices',
  SALES_RECEIPTS: 'sales_receipts'
};

// Field definitions for each import type
const FIELD_DEFINITIONS = {
  [IMPORT_TYPES.INVOICES]: {
    REQUIRED_FIELDS: [
      { key: 'customer_id', label: 'Customer ID', aliases: ['customerid', 'customer id', 'custid', 'cust id'] },
      { key: 'customer_name', label: 'Customer Name', aliases: ['customername', 'customer name', 'custname', 'cust name', 'company', 'company name'] },
      { key: 'date', label: 'Date', aliases: ['invoicedate', 'invoice date', 'txndate', 'txn_date', 'transaction date', 'order date'] },
      { key: 'product_code', label: 'Product Code', aliases: ['productcode', 'product code', 'assettype', 'asset type', 'item', 'item code', 'product', 'sku'] },
      { key: 'invoice_number', label: 'Invoice Number', aliases: ['invoicenumber', 'invoice number', 'invoice no', 'invoiceno', 'sales order number', 'salesordernumber', 'order number', 'ordernumber', 'ref', 'reference'] },
      { key: 'qty_out', label: 'Qty Out', aliases: ['qtyout', 'qty out', 'quantity shipped', 'quantityshipped', 'shipped', 'out', 'qty shipped'] },
      { key: 'qty_in', label: 'Qty In', aliases: ['qtyin', 'qty in', 'quantity returned', 'quantityreturned', 'returned', 'in', 'qty returned'] },
    ],
    OPTIONAL_FIELDS: [
      { key: 'description', label: 'Description', aliases: ['desc', 'itemdesc', 'linedesc', 'item description', 'product description'] },
      { key: 'rate', label: 'Rate', aliases: ['rate', 'unitprice', 'unit price', 'price', 'cost'] },
      { key: 'amount', label: 'Amount', aliases: ['amount', 'lineamount', 'total', 'line total', 'linetotal'] },
      { key: 'serial_number', label: 'Serial Number', aliases: ['serialnumber', 'serial', 'serial no', 'serialno'] },
    ]
  },
  [IMPORT_TYPES.SALES_RECEIPTS]: {
    REQUIRED_FIELDS: [
      { key: 'customer_id', label: 'Customer ID', aliases: ['customerid', 'customer id', 'custid', 'cust id'] },
      { key: 'customer_name', label: 'Customer Name', aliases: ['customername', 'customer name', 'custname', 'cust name', 'company', 'company name'] },
      { key: 'date', label: 'Date', aliases: ['receiptdate', 'receipt date', 'txndate', 'txn_date', 'transaction date', 'order date'] },
      { key: 'product_code', label: 'Product Code', aliases: ['productcode', 'product code', 'assettype', 'asset type', 'item', 'item code', 'product', 'sku'] },
      { key: 'sales_receipt_number', label: 'Sales Receipt Number', aliases: ['salesreceiptnumber', 'sales receipt number', 'receipt number', 'receiptnumber', 'refnumber', 'ref number', 'ref_no', 'ref no', 'sales order number', 'salesordernumber', 'order number', 'ordernumber'] },
      { key: 'qty_out', label: 'Qty Out', aliases: ['qtyout', 'qty out', 'quantity shipped', 'quantityshipped', 'shipped', 'out', 'qty shipped'] },
      { key: 'qty_in', label: 'Qty In', aliases: ['qtyin', 'qty in', 'quantity returned', 'quantityreturned', 'returned', 'in', 'qty returned'] },
    ],
    OPTIONAL_FIELDS: [
      { key: 'description', label: 'Description', aliases: ['desc', 'itemdesc', 'linedesc', 'item description', 'product description'] },
      { key: 'rate', label: 'Rate', aliases: ['rate', 'unitprice', 'unit price', 'price', 'cost'] },
      { key: 'amount', label: 'Amount', aliases: ['amount', 'lineamount', 'total', 'line total', 'linetotal'] },
      { key: 'serial_number', label: 'Serial Number', aliases: ['serialnumber', 'serial', 'serial no', 'serialno'] },
    ]
  }
};

// Helper to get current user info from Supabase
async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// --- Fuzzy string similarity helper ---
function stringSimilarity(a, b) {
  a = (a || '').toLowerCase().trim().replace(/\s+/g, ' ');
  b = (b || '').toLowerCase().trim().replace(/\s+/g, ' ');
  if (!a || !b) return 0;
  if (a === b) return 1;
  let matches = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] === b[i]) matches++;
  }
  return matches / Math.max(a.length, b.length);
}

const InvoiceImportWorker = () => new Worker(new URL('../workers/invoiceImportWorker.js', import.meta.url), { type: 'module' });

export default function Import() {
  const [file, setFile] = useState(null);
  const [rawRows, setRawRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [mapping, setMapping] = useState({});
  const [preview, setPreview] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [rowStatuses, setRowStatuses] = useState([]);
  const [previewChecked, setPreviewChecked] = useState(false);
  const [previewSummary, setPreviewSummary] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [progress, setProgress] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importErrors, setImportErrors] = useState([]);
  const [debugMode, setDebugMode] = useState(false);
  const [skippedItems, setSkippedItems] = useState([]);
  const [workerStatus, setWorkerStatus] = useState({ status: 'idle', progress: 0, error: null });
  
  // Sales Receipts specific state
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [rentalAmount, setRentalAmount] = useState(0);
  const [rentalPeriod, setRentalPeriod] = useState('monthly');
  const [assetBalances, setAssetBalances] = useState({});
  const [generatingInvoices, setGeneratingInvoices] = useState(false);
  const lastImportBalances = useRef({});

  // Use combined field definitions for both types
  const REQUIRED_FIELDS = [
    { key: 'customer_id', label: 'Customer ID', aliases: ['customerid', 'customer id', 'custid', 'cust id'] },
    { key: 'customer_name', label: 'Customer Name', aliases: ['customername', 'customer name', 'custname', 'cust name', 'company', 'company name'] },
    { key: 'date', label: 'Date', aliases: ['invoicedate', 'invoice date', 'receiptdate', 'receipt date', 'txndate', 'txn_date', 'transaction date', 'order date'] },
    { key: 'product_code', label: 'Product Code', aliases: ['productcode', 'product code', 'assettype', 'asset type', 'item', 'item code', 'product', 'sku'] },
    { key: 'reference_number', label: 'Reference Number', aliases: ['invoicenumber', 'invoice number', 'invoice no', 'invoiceno', 'salesreceiptnumber', 'sales receipt number', 'receipt number', 'receiptnumber', 'sales order number', 'salesordernumber', 'order number', 'ordernumber', 'ref', 'reference', 'refnumber', 'ref number', 'ref_no', 'ref no'] },
    { key: 'qty_out', label: 'Qty Out', aliases: ['qtyout', 'qty out', 'quantity shipped', 'quantityshipped', 'shipped', 'out', 'qty shipped'] },
    { key: 'qty_in', label: 'Qty In', aliases: ['qtyin', 'qty in', 'quantity returned', 'quantityreturned', 'returned', 'in', 'qty returned'] },
  ];

  const OPTIONAL_FIELDS = [
    { key: 'description', label: 'Description', aliases: ['desc', 'itemdesc', 'linedesc', 'item description', 'product description'] },
    { key: 'rate', label: 'Rate', aliases: ['rate', 'unitprice', 'unit price', 'price', 'cost'] },
    { key: 'amount', label: 'Amount', aliases: ['amount', 'lineamount', 'total', 'line total', 'linetotal'] },
    { key: 'serial_number', label: 'Serial Number', aliases: ['serialnumber', 'serial', 'serial no', 'serialno'] },
  ];

  const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];
  const MAPPING_STORAGE_KEY = 'importFieldMapping';

  // Helper to guess if first row is header
  function isHeaderRow(row) {
    return row.every(cell => typeof cell === 'string' && cell.length > 0 && !/^[0-9]+$/.test(cell));
  }

  // Load mapping from localStorage if columns match
  function loadSavedMapping(detectedColumns) {
    try {
      const saved = localStorage.getItem(MAPPING_STORAGE_KEY);
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (parsed.columns && Array.isArray(parsed.columns) && JSON.stringify(parsed.columns) === JSON.stringify(detectedColumns)) {
        return parsed.mapping;
      }
    } catch {}
    return null;
  }

  const handleFileChange = async e => {
    // Verify user is still authenticated before processing file
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      logger.error('User not authenticated during file selection');
      setError('Session expired. Please refresh the page and try again.');
      e.target.value = ''; // Clear file input
      return;
    }
    
    setFile(e.target.files[0]);
    setRawRows([]);
    setColumns([]);
    setMapping({});
    setPreview([]);
    setResult(null);
    setError(null);
    setRowStatuses([]);
    setPreviewChecked(false);
    setPreviewSummary(null);
    setValidationErrors([]);
    
    const file = e.target.files[0];
    if (!file) return;
    
    const ext = file.name.split('.').pop().toLowerCase();
    const processRows = (rows) => {
      if (!rows.length) return;
      let detectedColumns = [];
      let dataRows = rows;
      if (isHeaderRow(rows[0])) {
        detectedColumns = rows[0].map((col, i) => col.trim() || `Column ${i+1}`);
        dataRows = rows.slice(1);
      } else {
        detectedColumns = rows[0].map((_, i) => `Column ${i+1}`);
      }
      setRawRows(dataRows);
      setColumns(detectedColumns);
      
      const savedMapping = loadSavedMapping(detectedColumns);
      let autoMap = {};
      if (savedMapping) {
        autoMap = savedMapping;
      } else {
        // Improved auto-mapping logic
        ALL_FIELDS.forEach(field => {
          let found = null;
          
          // First, try exact matches (case-insensitive)
          found = detectedColumns.find(col => {
            const normCol = col.toLowerCase().trim();
            const normKey = field.key.toLowerCase();
            if (normCol === normKey) return true;
            if (field.aliases) {
              return field.aliases.some(alias => normCol === alias.toLowerCase());
            }
            return false;
          });
          
          // If no exact match, try partial matches
          if (!found) {
            found = detectedColumns.find(col => {
              const normCol = col.toLowerCase().replace(/\s|_/g, '');
              const normKey = field.key.replace(/_/g, '');
              if (normCol.includes(normKey) || normKey.includes(normCol)) return true;
              if (field.aliases) {
                return field.aliases.some(alias => {
                  const normAlias = alias.toLowerCase().replace(/\s|_/g, '');
                  return normCol.includes(normAlias) || normAlias.includes(normCol);
                });
              }
              return false;
            });
          }
          
          // Special handling for common patterns
          if (!found) {
            if (field.key === 'customer_id' && detectedColumns.some(col => 
              col.toLowerCase().includes('customer') && col.toLowerCase().includes('id'))) {
              found = detectedColumns.find(col => 
                col.toLowerCase().includes('customer') && col.toLowerCase().includes('id'));
            }
            if (field.key === 'customer_name' && detectedColumns.some(col => 
              col.toLowerCase().includes('customer') && col.toLowerCase().includes('name'))) {
              found = detectedColumns.find(col => 
                col.toLowerCase().includes('customer') && col.toLowerCase().includes('name'));
            }
            if (field.key === 'date' && detectedColumns.some(col => 
              col.toLowerCase().includes('date'))) {
              found = detectedColumns.find(col => col.toLowerCase().includes('date'));
            }
            if (field.key === 'product_code' && detectedColumns.some(col => 
              col.toLowerCase().includes('product') || col.toLowerCase().includes('asset') || col.toLowerCase().includes('item'))) {
              found = detectedColumns.find(col => 
                col.toLowerCase().includes('product') || col.toLowerCase().includes('asset') || col.toLowerCase().includes('item'));
            }
            if (field.key === 'reference_number' && detectedColumns.some(col => 
              col.toLowerCase().includes('invoice') || col.toLowerCase().includes('order') || col.toLowerCase().includes('number'))) {
              found = detectedColumns.find(col => 
                col.toLowerCase().includes('invoice') || col.toLowerCase().includes('order') || col.toLowerCase().includes('number'));
            }
            if (field.key === 'qty_out' && detectedColumns.some(col => 
              col.toLowerCase().includes('shipped') || col.toLowerCase().includes('out'))) {
              found = detectedColumns.find(col => 
                col.toLowerCase().includes('shipped') || col.toLowerCase().includes('out'));
            }
            if (field.key === 'qty_in' && detectedColumns.some(col => 
              col.toLowerCase().includes('returned') || col.toLowerCase().includes('in'))) {
              found = detectedColumns.find(col => 
                col.toLowerCase().includes('returned') || col.toLowerCase().includes('in'));
            }
          }
          
          if (found) autoMap[field.key] = found;
        });
      }
      setMapping(autoMap);
      setPreview(generatePreview(dataRows, detectedColumns, autoMap));
      
      // Always check preview statuses for both types
      setTimeout(() => {
        checkPreviewStatuses();
      }, 0);
    };
    
    if (ext === 'xls' || ext === 'xlsx') {
      const reader = new FileReader();
      reader.onload = evt => {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        processRows(rows);
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = evt => {
        const text = evt.target.result;
        
        // Detect delimiter (tab or comma)
        const firstLine = text.split('\n')[0];
        const tabCount = (firstLine.match(/\t/g) || []).length;
        const commaCount = (firstLine.match(/,/g) || []).length;
        const delimiter = tabCount >= commaCount ? '\t' : ',';
        
        const rows = text
          .split(/\r?\n/) // Handle different line endings
          .map(line => line.split(delimiter))
          .filter(row => row.length > 1 && row.some(cell => cell.trim() !== ''))
          .map(row => row.map(cell => cell.trim())); // Trim whitespace from cells
        
        processRows(rows);
      };
      reader.readAsText(file);
    }
  };

  // Generate preview rows based on mapping
  function generatePreview(dataRows, detectedColumns, mappingObj) {
    return dataRows.map(row => {
      const mapped = {};
      ALL_FIELDS.forEach(field => {
        const colName = mappingObj[field.key];
        if (colName) {
          const colIdx = detectedColumns.indexOf(colName);
          let value = row[colIdx] || '';
          // Special handling for product_code if it contains colons
          if (field.key === 'product_code' && value && value.includes(':')) {
            value = value.split(':').pop().trim();
          }
          mapped[field.key] = value;
        } else {
          mapped[field.key] = '';
        }
      });
      return mapped;
    });
  }

  // Save mapping to localStorage on change
  const handleMappingChange = (fieldKey, colName) => {
    const newMapping = { ...mapping, [fieldKey]: colName };
    setMapping(newMapping);
    setPreview(generatePreview(rawRows, columns, newMapping));
    if (columns.length) {
      localStorage.setItem(MAPPING_STORAGE_KEY, JSON.stringify({ columns, mapping: newMapping }));
    }
  };

  const handleResetMapping = () => {
    localStorage.removeItem(MAPPING_STORAGE_KEY);
    setMapping({});
    setPreview(generatePreview(rawRows, columns, {}));
  };

  function isValidDate(dateStr) {
    if (!dateStr) return false;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      const [d, m, y] = dateStr.split('/');
      return d >= '01' && d <= '31' && m >= '01' && m <= '12' && y.length === 4;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, d] = dateStr.split('-');
      return d >= '01' && d <= '31' && m >= '01' && m <= '12' && y.length === 4;
    }
    return false;
  }

  function convertDate(dateStr) {
    if (!dateStr) return null;
    // Convert DD/MM/YYYY to YYYY-MM-DD
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      const [d, m, y] = dateStr.split('/');
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    // Already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    return null;
  }

  function validateRows(previewRows, mappingObj) {
    const errors = [];
    const customerValidationPromises = [];
    
    previewRows.forEach((row, idx) => {
      REQUIRED_FIELDS.forEach(field => {
        if (!mappingObj[field.key]) {
          errors.push({ row: idx, field: field.key, reason: 'Field not mapped' });
        } else if (!row[field.key] || row[field.key].toString().trim() === '') {
          errors.push({ row: idx, field: field.key, reason: 'Missing value' });
        }
      });
      
      // Enhanced customer validation
      if (row.customer_id || row.customer_name) {
        const validationPromise = findCustomer(row.customer_name, row.customer_id)
          .then(customer => {
            if (!customer) {
              errors.push({ 
                row: idx, 
                field: 'customer_id', 
                reason: `Customer not found: ${row.customer_name || 'Unknown'} (${row.customer_id || 'No ID'})` 
              });
            }
          })
          .catch(err => {
            logger.error('Customer validation error:', err);
            errors.push({ 
              row: idx, 
              field: 'customer_id', 
              reason: 'Error validating customer' 
            });
          });
        customerValidationPromises.push(validationPromise);
      }
    });
    
    // Wait for all customer validations to complete
    Promise.all(customerValidationPromises).then(() => {
      setValidationErrors(errors);
    });
    
    return errors.length === 0;
  }

  // Check for existing imports and update them
  async function checkAndUpdateExistingImport(type, preview, mapping, user, organizationId) {
    try {
      // Create a unique key based on the data
      const dataHash = JSON.stringify(preview).length + '_' + preview.length;
      const importKey = `${type}_${dataHash}_${user.id}`;
      
      logger.log('Checking for existing import with key:', importKey);
      
      // Check if an import with similar data already exists (filter by organization)
      const { data: existingImports, error: checkError } = await supabase
        .from(type === 'invoice' ? 'imported_invoices' : 'imported_sales_receipts')
        .select('id, status, uploaded_at, organization_id')
        .eq('status', 'pending')
        .eq('organization_id', organizationId)
        .order('uploaded_at', { ascending: false })
        .limit(5);
      
      if (checkError) {
        logger.error('Error checking existing imports:', checkError);
        return null; // Continue with new import
      }
      
      logger.log('Found existing imports:', existingImports);
      
      // If we have recent pending imports, update the most recent one
      if (existingImports && existingImports.length > 0) {
        const mostRecent = existingImports[0];
        logger.log('Updating existing import:', mostRecent.id);
        
        const { data: updatedImport, error: updateError } = await supabase
          .from(type === 'invoice' ? 'imported_invoices' : 'imported_sales_receipts')
          .update({
            data: {
              rows: preview,
              mapping,
              summary: {
                total_rows: preview.length,
                uploaded_by: user.id,
                uploaded_at: new Date().toISOString(),
                import_key: importKey,
                updated_from_existing: true
              }
            },
            uploaded_at: new Date().toISOString(),
            organization_id: organizationId
          })
          .eq('id', mostRecent.id)
          .select()
          .single();
        
        if (updateError) {
          logger.error('Error updating existing import:', updateError);
          return null; // Continue with new import
        }
        
        logger.log('Successfully updated existing import:', updatedImport);
        return updatedImport;
      }
      
      return null; // No existing import to update
    } catch (error) {
      logger.error('Error in checkAndUpdateExistingImport:', error);
      return null; // Continue with new import
    }
  }

  // Unified import function that automatically detects type
  async function handleImport(e) {
    if (e) e.preventDefault();
    if (!validateRows(preview, mapping)) return;
    
    setLoading(true);
    setImporting(true);
    setImportProgress(0);
    setImportErrors([]);
    
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('User not authenticated');
      
      // Auto-detect import type based on data patterns
      const isSalesReceipt = await detectSalesReceiptType();
      
      if (isSalesReceipt) {
        await handleSalesReceiptImport();
      } else {
        await handleInvoiceImport();
      }
    } catch (error) {
      setError(error.message);
      setLoading(false);
      setImporting(false);
    }
  }

  // Function to detect if this should be processed as sales receipts
  async function detectSalesReceiptType() {
    let cylinderCount = 0;
    let totalRows = 0;
    
    // Get current user and organization
    const user = await getCurrentUser();
    if (!user) {
      logger.error('User not authenticated');
      return false;
    }
    
    // Get user's organization_id
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();
    
    if (profileError || !userProfile?.organization_id) {
      logger.error('User not assigned to an organization');
      return false;
    }
    
    for (const row of preview) {
      if (row.product_code) {
        totalRows++;
        const { data: cylinder } = await supabase
          .from('bottles')
          .select('id')
          .eq('barcode_number', row.product_code)
          .eq('organization_id', userProfile.organization_id)
          .single();
        
        if (cylinder) {
          cylinderCount++;
        }
      }
    }
    
    // If more than 50% of products are cylinders, treat as sales receipts
    return cylinderCount > 0 && (cylinderCount / totalRows) > 0.5;
  }

  // Import logic for invoices
  async function handleInvoiceImport() {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('User not authenticated');
      
      // Get user's organization_id
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();
      
      if (profileError || !userProfile?.organization_id) {
        throw new Error('User not assigned to an organization');
      }
      
      logger.log('Creating invoice import with data:', {
        previewLength: preview.length,
        userId: user.id,
        organizationId: userProfile.organization_id,
        status: 'pending'
      });
      
      // Check for existing imports first
      const existingImport = await checkAndUpdateExistingImport('invoice', preview, mapping, user, userProfile.organization_id);
      if (existingImport) {
        setResult({
          message: 'Import updated and submitted for approval',
          total_rows: preview.length,
          status: 'pending_approval'
        });
        setLoading(false);
        setImporting(false);
        return;
      }
      
      // Store in temporary table for approval instead of direct insertion
      const { data: importedInvoice, error: importError } = await supabase
        .from('imported_invoices')
        .insert({
          data: {
            rows: preview,
            mapping,
            summary: {
              total_rows: preview.length,
              uploaded_by: user.id,
              uploaded_at: new Date().toISOString()
            }
          },
          uploaded_by: user.id,
          organization_id: userProfile.organization_id,
          status: 'pending'
        })
        .select()
        .single();

      logger.log('Invoice import result:', { importedInvoice, importError });

      if (importError) {
        // If RLS policy error, try without uploaded_by field
        if (importError.message.includes('row-level security policy')) {
          logger.log('RLS policy error detected, trying without uploaded_by field...');
          
          const { data: retryInvoice, error: retryError } = await supabase
            .from('imported_invoices')
            .insert({
              data: {
                rows: preview,
                mapping,
                summary: {
                  total_rows: preview.length,
                  uploaded_by: user.id,
                  uploaded_at: new Date().toISOString()
                }
              },
              status: 'pending'
            })
            .select()
            .single();

          if (retryError) {
            throw new Error(`Import failed after RLS retry: ${retryError.message}`);
          }
          
          setResult({
            message: 'Import submitted for approval (RLS retry mode)',
            total_rows: preview.length,
            status: 'pending_approval'
          });
          return;
        }
        
        throw new Error(importError.message);
      }

      setResult({
        message: 'Import submitted for approval',
        total_rows: preview.length,
        status: 'pending_approval'
      });

    } catch (error) {
      logger.error('Invoice import error:', error);
      setError(error.message);
    }
    setLoading(false);
    setImporting(false);
  }

  // Import logic for sales receipts
  async function handleSalesReceiptImport() {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('User not authenticated');
      
      // Get user's organization_id
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();
      
      if (profileError || !userProfile?.organization_id) {
        throw new Error('User not assigned to an organization');
      }
      
      logger.log('Creating sales receipt import with data:', {
        previewLength: preview.length,
        userId: user.id,
        organizationId: userProfile.organization_id,
        status: 'pending'
      });
      
      // Check for existing imports first  
      const existingImport = await checkAndUpdateExistingImport('sales_receipt', preview, mapping, user, userProfile.organization_id);
      if (existingImport) {
        setResult({
          message: 'Import updated and submitted for approval',
          total_rows: preview.length,
          status: 'pending_approval'
        });
        setLoading(false);
        setImporting(false);
        return;
      }
      
      // Store in temporary table for approval instead of direct insertion
      const { data: importedReceipt, error: importError } = await supabase
        .from('imported_sales_receipts')
        .insert({
          data: {
            rows: preview,
            mapping,
            summary: {
              total_rows: preview.length,
              uploaded_by: user.id,
              uploaded_at: new Date().toISOString()
            }
          },
          uploaded_by: user.id,
          organization_id: userProfile.organization_id,
          status: 'pending'
        })
        .select()
        .single();

      logger.log('Sales receipt import result:', { importedReceipt, importError });

      if (importError) {
        // If RLS policy error, try without uploaded_by field
        if (importError.message.includes('row-level security policy')) {
          logger.log('RLS policy error detected, trying without uploaded_by field...');
          
          const { data: retryReceipt, error: retryError } = await supabase
            .from('imported_sales_receipts')
            .insert({
              data: {
                rows: preview,
                mapping,
                summary: {
                  total_rows: preview.length,
                  uploaded_by: user.id,
                  uploaded_at: new Date().toISOString()
                }
              },
              status: 'pending'
            })
            .select()
            .single();

          if (retryError) {
            throw new Error(`Import failed after RLS retry: ${retryError.message}`);
          }
          
          setResult({
            message: 'Import submitted for approval (RLS retry mode)',
            total_rows: preview.length,
            status: 'pending_approval'
          });
          return;
        }
        
        throw new Error(importError.message);
      }

      setResult({
        message: 'Import submitted for approval',
        total_rows: preview.length,
        status: 'pending_approval'
      });

    } catch (error) {
      logger.error('Sales receipt import error:', error);
      setError(error.message);
    }
    setLoading(false);
    setImporting(false);
  }

  const updateProgress = throttle((progress) => setImportProgress(progress), 100);

  async function importBatchWithRetry(batch, retries = 3) {
    try {
      await handleImport(null);
    } catch (e) {
      if (retries > 0) {
        await importBatchWithRetry(batch, retries - 1);
      } else {
        throw e;
      }
    }
  }

  function downloadCSV(rows) {
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv' });
    saveAs(blob, 'skipped_items_debug.csv');
  }

  function downloadSkippedItems() {
    const csv = Papa.unparse(skippedItems);
    const blob = new Blob([csv], { type: 'text/csv' });
    saveAs(blob, 'skipped_items_debug.csv');
  }

  // Check preview statuses for both types
  async function checkPreviewStatuses() {
    setLoading(true);
    const statuses = [];
    let customersCreated = 0, customersExisting = 0;
    let invoicesCreated = 0, invoicesExisting = 0;
    let receiptsCreated = 0, receiptsExisting = 0;
    let lineItemsCreated = 0, lineItemsSkipped = 0;
    
    // Get current user and organization
    const user = await getCurrentUser();
    if (!user) {
      toast.error('User not authenticated');
      setLoading(false);
      return;
    }
    
    // Get user's organization_id
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();
    
    if (profileError || !userProfile?.organization_id) {
      toast.error('User not assigned to an organization');
      setLoading(false);
      return;
    }
    
    // Deduplicate customer IDs in the preview
    const allCustomerIds = Array.from(new Set(preview.map(row => (row.customer_id || '').trim().toLowerCase()))).filter(Boolean);
    // Query all at once for existing customers in THIS organization only
    const { data: existingCustomers, error: fetchError } = await supabase
      .from('customers')
      .select('CustomerListID')
      .eq('organization_id', userProfile.organization_id);
    const existingIds = new Set((existingCustomers || []).map(c => (c.CustomerListID || '').trim().toLowerCase()));

    for (const row of preview) {
      let customerStatus = 'Existing';
      let invoiceStatus = 'Existing';
      let receiptStatus = 'Existing';
      let lineItemStatus = 'Created';
      const cid = (row.customer_id || '').trim().toLowerCase();
      if (cid && !existingIds.has(cid)) {
        customersCreated++;
        customerStatus = 'Create';
        existingIds.add(cid); // Prevent double-counting
      } else {
        customersExisting++;
      }
      
      // Check if this should be an invoice or sales receipt
      const { data: bottle } = await supabase
        .from('bottles')
        .select('id')
        .eq('barcode_number', row.product_code)
        .eq('organization_id', userProfile.organization_id)
        .single();
      
      if (bottle) {
        // This is a sales receipt
        const { data: existingReceipt } = await supabase
          .from('sales_receipts')
          .select('id')
          .eq('sales_receipt_number', String(row.reference_number))
          .single();
        
        if (!existingReceipt) {
          receiptsCreated++;
          receiptStatus = 'Create';
        } else {
          receiptsExisting++;
        }
      } else {
        // This is an invoice
        const { data: existingInvoice } = await supabase
          .from('invoices')
          .select('id')
          .eq('details', String(row.reference_number))
          .single();
        
        if (!existingInvoice) {
          invoicesCreated++;
          invoiceStatus = 'Create';
        } else {
          invoicesExisting++;
        }
      }
      
      // Check line item
      if (bottle) {
        // Sales receipt line item
        const { data: existingReceipt } = await supabase
          .from('sales_receipts')
          .select('id')
          .eq('sales_receipt_number', String(row.reference_number))
          .single();
        
        if (existingReceipt) {
          const { data: existingLineItem } = await supabase
            .from('sales_receipt_line_items')
            .select('id')
            .eq('sales_receipt_id', existingReceipt.id)
            .eq('product_code', row.product_code)
            .single();
          if (existingLineItem) {
            lineItemStatus = 'Skipped (Duplicate)';
            lineItemsSkipped++;
          } else {
            lineItemsCreated++;
          }
        } else {
          lineItemsCreated++;
        }
      } else {
        // Invoice line item
        const { data: existingInvoice } = await supabase
          .from('invoices')
          .select('id')
          .eq('details', String(row.reference_number))
          .single();
        
        if (existingInvoice) {
          const { data: existingLineItem } = await supabase
            .from('invoice_line_items')
            .select('id')
            .eq('invoice_id', existingInvoice.id)
            .eq('product_code', row.product_code)
            .single();
          if (existingLineItem) {
            lineItemStatus = 'Skipped (Duplicate)';
            lineItemsSkipped++;
          } else {
            lineItemsCreated++;
          }
        } else {
          lineItemsCreated++;
        }
      }
      
      statuses.push({ customerStatus, invoiceStatus, receiptStatus, lineItemStatus });
    }
    setRowStatuses(statuses);
    setPreviewSummary({ customersCreated, customersExisting, invoicesCreated, invoicesExisting, receiptsCreated, receiptsExisting, lineItemsCreated, lineItemsSkipped });
    setPreviewChecked(true);
    setLoading(false);
  }

  // Add state for import report
  const [customerImportReport, setCustomerImportReport] = useState(null);

  async function createMissingCustomers() {
    logger.log('createMissingCustomers called');
    
    // Get current user and organization
    const user = await getCurrentUser();
    if (!user) {
      toast.error('User not authenticated');
      return;
    }
    
    // Get user's organization_id
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();
    
    if (profileError || !userProfile?.organization_id) {
      toast.error('User not assigned to an organization');
      return;
    }
    
    logger.log('User organization_id:', userProfile.organization_id);
    
    // Get all unique customer IDs from the preview (same logic as checkPreviewStatuses)
    const allCustomerIds = Array.from(new Set(preview.map(row => (row.customer_id || '').trim().toLowerCase()))).filter(Boolean);
    
    if (allCustomerIds.length === 0) {
      logger.log('No customer IDs found in preview');
      toast.error('No customers to create');
      return;
    }
    
    logger.log('All customer IDs from preview:', allCustomerIds);
    
    // Check which customers exist in THIS organization
    const { data: existingCustomers, error: fetchError } = await supabase
      .from('customers')
      .select('CustomerListID')
      .eq('organization_id', userProfile.organization_id);
    
    if (fetchError) {
      logger.error('Error fetching existing customers:', fetchError);
      toast.error('Error checking existing customers');
      return;
    }
    
    const existingIds = new Set((existingCustomers || []).map(c => (c.CustomerListID || '').trim().toLowerCase()));
    const missingCustomerIds = allCustomerIds.filter(cid => !existingIds.has(cid));
    
    logger.log('Missing customer IDs:', missingCustomerIds);
    
    if (missingCustomerIds.length === 0) {
      logger.log('No customers to create');
      toast.success('No customers to create');
      return;
    }

    logger.log('Creating customers:', missingCustomerIds);
    setLoading(true);
    let createdCount = 0;
    let errorCount = 0;
    const errors = [];
    const createdCustomers = [];
    const skippedCustomers = [];

    // Get the actual customer data from preview for these IDs
    const customersToCreate = [];
    const seenInBatch = new Set();
    
    for (const customerId of missingCustomerIds) {
      // Find the first row with this customer ID to get the customer name
      const customerRow = preview.find(row => 
        (row.customer_id || '').trim().toLowerCase() === customerId
      );
      
      if (customerRow && !seenInBatch.has(customerId)) {
        logger.log(`Customer ${customerId} will be created for this organization`);
        customersToCreate.push({
          CustomerListID: customerRow.customer_id, // Use original case
          name: customerRow.customer_name || `Customer ${customerRow.customer_id}`,
          barcode: `*%${(customerRow.customer_id || '').toLowerCase().replace(/\s+/g, '')}*`,
          customer_barcode: `*%${(customerRow.customer_id || '').toLowerCase().replace(/\s+/g, '')}*`,
          organization_id: userProfile.organization_id // Explicitly set organization_id
        });
        seenInBatch.add(customerId);
      }
    }
    
    logger.log('Customers to create:', customersToCreate);

    if (customersToCreate.length === 0) {
      logger.log('No customers to create after processing');
      setLoading(false);
      toast.success('No customers to create');
      return;
    }

    // Create customers in batches, fallback to one-by-one if batch fails
    const batchSize = 10;
    for (let i = 0; i < customersToCreate.length; i += batchSize) {
      const batch = customersToCreate.slice(i, i + batchSize);
      logger.log(`Creating batch ${Math.floor(i / batchSize) + 1}:`, batch);
      
      try {
        const { data, error } = await supabase
          .from('customers')
          .insert(batch)
          .select();
        
        logger.log('Supabase response - data:', data);
        logger.log('Supabase response - error:', error);
        
        if (error && (error.code === '23505' || error.message.includes('duplicate key'))) {
          logger.log('Batch failed due to duplicate, trying one-by-one...');
          // Batch failed due to duplicate, try one-by-one
          for (const customer of batch) {
            logger.log('Trying to create customer one-by-one:', customer);
            const { data: singleData, error: singleError } = await supabase
              .from('customers')
              .insert([customer])
              .select();
            
            logger.log('Single customer response - data:', singleData);
            logger.log('Single customer response - error:', singleError);
            
            if (singleError && (singleError.code === '23505' || singleError.message.includes('duplicate key'))) {
              // Skip duplicate, do not increment errorCount
              logger.log('Customer already exists (primary key constraint):', customer.CustomerListID);
              skippedCustomers.push({
                CustomerListID: customer.CustomerListID,
                name: customer.name,
                reason: 'already exists (primary key constraint)'
              });
              errors.push(`Duplicate: ${customer.CustomerListID}`);
            } else if (singleError) {
              errorCount++;
              errors.push(`Error: ${singleError.message}`);
            } else if (singleData && singleData.length > 0) {
              createdCount++;
              createdCustomers.push({
                CustomerListID: singleData[0].CustomerListID,
                name: singleData[0].name
              });
            }
          }
        } else if (error) {
          logger.error('Batch error:', error);
          errorCount += batch.length;
          errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
        } else if (data && data.length > 0) {
          logger.log('Batch created successfully:', data);
          createdCount += data.length;
          for (const c of data) {
            createdCustomers.push({
              CustomerListID: c.CustomerListID,
              name: c.name
            });
          }
        } else {
          logger.log('No data returned from batch insert, but no error either');
        }
      } catch (e) {
        logger.error('Exception in batch creation:', e);
        errorCount += batch.length;
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${e.message}`);
      }
    }

    logger.log('Customer creation completed. Created:', createdCount, 'Errors:', errorCount);
    setLoading(false);

    // After building skippedCustomers, deduplicate by CustomerListID
    const dedupedSkipped = Array.from(new Map(skippedCustomers.map(c => [c.CustomerListID, c])).values());
    setCustomerImportReport({ created: createdCustomers, skipped: dedupedSkipped });

    if (createdCount > 0) {
      logger.log('Showing success toast');
      toast.success(`Successfully created ${createdCount} customers`);
    }
    if (errorCount > 0) {
      logger.log('Showing error toast');
      toast.error(`Failed to create ${errorCount} customers. Check console for details.`);
      logger.error('Customer creation errors:', errors);
    }
    
    // Show detailed results
    const otherOrgCustomers = skippedCustomers.filter(c => c.reason.includes('another organization'));
    if (otherOrgCustomers.length > 0) {
      toast.info(`${otherOrgCustomers.length} customers exist in other organizations and cannot be created here.`);
    }
    
    // Refresh the preview status to update the summary
    await checkPreviewStatuses();
  }

  // Direct import function that handles customer creation automatically
  async function handleDirectImport() {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('User not authenticated');
      
      logger.log('Starting direct import with automatic customer creation...');
      
      let imported = 0, errors = 0;
      let customersCreated = 0, customersExisting = 0;
      let invoicesCreated = 0, invoicesExisting = 0;
      let receiptsCreated = 0, receiptsExisting = 0;
      let lineItemsCreated = 0, lineItemsSkipped = 0;
      let skippedRows = [];
      
      if (!preview.length) throw new Error('No data to import.');
      
      // Get user's organization_id for proper filtering
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();
      
      if (profileError || !userProfile?.organization_id) {
        throw new Error('User not assigned to an organization');
      }
      
      const CHUNK_SIZE = 500;
      for (let chunkStart = 0; chunkStart < preview.length; chunkStart += CHUNK_SIZE) {
        const chunk = preview.slice(chunkStart, chunkStart + CHUNK_SIZE);

        // --- Bulk check for existing customers within the organization ---
        const customerIds = [...new Set(chunk.map(row => row.customer_id).filter(Boolean))];
        const { data: existingCustomers = [] } = await supabase
          .from('customers')
          .select('CustomerListID')
          .in('CustomerListID', customerIds)
          .eq('organization_id', userProfile.organization_id);
        const existingCustomerIds = new Set((existingCustomers || []).map(c => c.CustomerListID));
        
        // --- Bulk insert new customers with better duplicate handling ---
        const newCustomers = [];
        const seenInChunk = new Set();
        
        for (const row of chunk) {
          if (!row.customer_id || !row.customer_name) continue;
          
          const customerId = row.customer_id.trim();
          const customerIdLower = customerId.toLowerCase();
          
          // Skip if already exists in database or already processed in this chunk
          if (existingCustomerIds.has(customerId) || seenInChunk.has(customerIdLower)) {
            continue;
          }
          
          newCustomers.push({
            CustomerListID: customerId,
            name: row.customer_name.trim(),
            barcode: `*%${customerIdLower.replace(/\s+/g, '')}*`,
            customer_barcode: `*%${customerIdLower.replace(/\s+/g, '')}*`,
            organization_id: userProfile.organization_id // Explicitly set organization_id
          });
          seenInChunk.add(customerIdLower);
        }
        
        if (newCustomers.length) {
          logger.log(`Creating ${newCustomers.length} new customers...`);
          
          // Validate organization_id before attempting insert
          if (!userProfile.organization_id) {
            throw new Error('User profile missing organization_id - cannot create customers');
          }
          
          // Enhanced customer creation with RLS-friendly approach
          const { error: customerError } = await supabase.from('customers').insert(newCustomers);
          if (customerError) {
            logger.error('Error creating customers:', customerError);
            
            // Handle RLS policy errors specifically
            if (customerError.message.includes('row-level security policy')) {
              logger.log('RLS policy error detected. Trying individual inserts with explicit organization context...');
              
              // Try one-by-one with explicit organization context
              for (const customer of newCustomers) {
                try {
                  // Double-check organization_id is set
                  const customerWithOrgId = {
                    ...customer,
                    organization_id: userProfile.organization_id
                  };
                  
                  const { error: singleError } = await supabase
                    .from('customers')
                    .insert([customerWithOrgId]);
                    
                  if (singleError) {
                    if (singleError.code === '23505') {
                      // Duplicate key error - customer already exists
                      logger.log('Customer already exists (ignoring):', customer.CustomerListID);
                    } else if (singleError.message.includes('row-level security policy')) {
                      logger.error('RLS policy violation for customer:', customer.CustomerListID);
                      logger.error('Customer data:', customerWithOrgId);
                      logger.error('User profile:', userProfile);
                      errors++;
                    } else {
                      logger.error('Error creating customer:', customer.CustomerListID, singleError);
                      errors++;
                    }
                  } else {
                    customersCreated++;
                  }
                } catch (err) {
                  logger.error('Unexpected error creating customer:', customer.CustomerListID, err);
                  errors++;
                }
              }
            } else {
              // Try one-by-one if batch fails for other reasons
              for (const customer of newCustomers) {
                const { error: singleError } = await supabase.from('customers').insert([customer]);
                if (singleError && singleError.code !== '23505') { // Ignore duplicate errors
                  logger.error('Error creating customer:', customer.CustomerListID, singleError);
                  errors++;
                } else if (singleError && singleError.code === '23505') {
                  logger.log('Customer already exists (ignoring):', customer.CustomerListID);
                } else {
                  customersCreated++;
                }
              }
            }
          } else {
            customersCreated += newCustomers.length;
          }
        }
        customersExisting += customerIds.length - newCustomers.length;

        // --- Determine if this is invoice or sales receipt data ---
        const { data: bottle } = await supabase
          .from('bottles')
          .select('id')
          .eq('barcode_number', chunk[0]?.product_code)
          .eq('organization_id', userProfile.organization_id)
          .single();
        
        const isSalesReceipt = bottle;

        if (isSalesReceipt) {
          // --- Handle sales receipts ---
          const receiptNumbers = [...new Set(chunk.map(row => row.reference_number).filter(Boolean))];
          const { data: existingReceipts = [] } = await supabase
            .from('invoices')
            .select('details')
            .in('details', receiptNumbers);
          const existingReceiptNumbers = new Set((existingReceipts || []).map(r => r.details));

          // Create new sales receipts (using invoices table)
          for (const row of chunk) {
            if (!existingReceiptNumbers.has(row.reference_number)) {
              const { data: receipt, error: receiptError } = await supabase
                .from('invoices')
                .insert({
                  details: row.reference_number, // Use details column for receipt number
                  customer_id: row.customer_id,
                  invoice_date: convertDate(row.date), // Convert date format
                  amount: 0 // Use amount instead of total_amount
                })
                .select()
                .single();

              if (receiptError) {
                logger.error('Error creating sales receipt:', receiptError);
                errors++;
                continue;
              }

              receiptsCreated++;
              
              // Create line item
              const { error: lineItemError } = await supabase
                .from('invoice_line_items')
                .insert({
                  invoice_id: receipt.id,
                  product_code: row.product_code,
                  qty_out: row.qty_out || 0,
                  qty_in: row.qty_in || 0,
                  description: row.product_code,
                  rate: 0,
                  amount: 0,
                  serial_number: row.product_code
                });

              if (lineItemError) {
                logger.error('Error creating line item:', lineItemError);
                errors++;
              } else {
                lineItemsCreated++;
                imported++;
              }
            } else {
              receiptsExisting++;
              lineItemsSkipped++;
            }
          }
        } else {
          // --- Handle invoices ---
          const invoiceNumbers = [...new Set(chunk.map(row => row.reference_number).filter(Boolean))];
          const { data: existingInvoices = [] } = await supabase
            .from('invoices')
            .select('details')
            .in('details', invoiceNumbers);
          const existingInvoiceNumbers = new Set((existingInvoices || []).map(i => i.details));

          // Create new invoices
          for (const row of chunk) {
            if (!existingInvoiceNumbers.has(row.reference_number)) {
              const { data: invoice, error: invoiceError } = await supabase
                .from('invoices')
                .insert({
                  details: row.reference_number,
                  customer_id: row.customer_id,
                  invoice_date: convertDate(row.date), // Convert date format
                  amount: 0
                })
                .select()
                .single();

              if (invoiceError) {
                logger.error('Error creating invoice:', invoiceError);
                errors++;
                continue;
              }

              invoicesCreated++;
              
              // Create line item
              const { error: lineItemError } = await supabase
                .from('invoice_line_items')
                .insert({
                  invoice_id: invoice.id,
                  product_code: row.product_code,
                  qty_out: row.qty_out || 0,
                  qty_in: row.qty_in || 0,
                  description: row.product_code,
                  rate: 0,
                  amount: 0,
                  serial_number: row.product_code
                });

              if (lineItemError) {
                logger.error('Error creating line item:', lineItemError);
                errors++;
              } else {
                lineItemsCreated++;
                imported++;
              }
            } else {
              invoicesExisting++;
              lineItemsSkipped++;
            }
          }
        }
      }

      setResult({
        message: 'Direct import completed successfully!',
        imported,
        errors,
        customersCreated,
        customersExisting,
        invoicesCreated,
        invoicesExisting,
        receiptsCreated,
        receiptsExisting,
        lineItemsCreated,
        lineItemsSkipped,
        skippedRows,
        importType: 'direct',
        dataLocation: 'Directly in database - check Invoices page or database tables'
      });

    } catch (error) {
      logger.error('Direct import error:', error);
      setError(error.message);
    }
    setLoading(false);
    setImporting(false);
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate(-1)}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" fontWeight={800} color="primary">
            Import Data
          </Typography>
        </Box>
      </Box>

      {/* Format Guide Card */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} color="primary" gutterBottom>
            Expected File Format
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Your file should be tab-separated (.txt) or comma-separated (.csv) with the following columns:
          </Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2"><strong>Customer ID:</strong> Unique customer identifier</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2"><strong>Customer Name:</strong> Company or customer name</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2"><strong>Date:</strong> Invoice/Receipt date (MM/DD/YYYY or YYYY-MM-DD)</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2"><strong>Product Code:</strong> Asset type or product code (e.g., BCS68-300)</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2"><strong>Reference Number:</strong> Invoice or sales receipt number</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2"><strong>Quantity Shipped:</strong> Number of items shipped/out</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2"><strong>Quantity Returned:</strong> Number of items returned/in</Typography>
            </Grid>
          </Grid>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
            <Typography variant="caption" color="primary" fontWeight={600} display="block" gutterBottom>
              Example row:
            </Typography>
            <Typography variant="caption" fontFamily="monospace">
              80000C33-1745333424A	Rockford Engineering Works Ltd.	06/06/2025	BCS68-300	64034	2	0
            </Typography>
          </Paper>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            <strong>Note:</strong> The system will automatically detect whether to process as invoices or sales receipts based on your data.
          </Typography>
        </CardContent>
      </Card>

      {/* File Upload Card */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadIcon />}
              disabled={loading}
            >
              Choose File
              <input 
                type="file" 
                accept=".txt,.csv,.xlsx,.xls" 
                onChange={handleFileChange} 
                style={{ display: 'none' }}
              />
            </Button>
            
            {file && (
              <Chip 
                label={file.name} 
                color="primary" 
                variant="outlined" 
                onDelete={() => {
                  setFile(null);
                  setRawRows([]);
                  setColumns([]);
                  setMapping({});
                  setPreview([]);
                  setResult(null);
                  setError(null);
                }}
              />
            )}
            
            <Button
              variant="outlined"
              color="success"
              onClick={checkPreviewStatuses}
              disabled={!file || !preview.length || loading}
              startIcon={<SearchIcon />}
            >
              {loading ? 'Analyzing...' : 'Preview'}
            </Button>
            
            <Button
              variant="contained"
              onClick={handleImport}
              disabled={!file || !preview.length || loading || !previewChecked || validationErrors.length > 0 || importing || (previewSummary && previewSummary.customersCreated > 0)}
              startIcon={loading ? <LinearProgress size={16} /> : <CheckCircleIcon />}
            >
              {loading ? 'Importing...' : 'Import'}
            </Button>
          </Stack>
        </CardContent>
      </Card>
        
      {/* Help message when import is disabled due to missing customers */}
      {previewSummary && previewSummary.customersCreated > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2">
            You need to create {previewSummary.customersCreated} missing customers before you can import the data. 
            Click the "Create Missing Customers" button in the summary above to proceed.
          </Typography>
        </Alert>
      )}

      {/* Field Mapping UI */}
      {columns.length > 0 && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Typography variant="h6" fontWeight={600}>
                Field Mapping
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={handleResetMapping}
              >
                Reset Mapping
              </Button>
            </Box>
            
            {/* Detected Columns Info */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
              <Typography variant="body2" fontWeight={600} color="text.secondary" gutterBottom>
                Detected Columns ({columns.length}):
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {columns.map((col, idx) => (
                  <Chip
                    key={idx}
                    label={col || `Column ${idx + 1}`}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Paper>
            
            <Grid container spacing={2}>
              {ALL_FIELDS.map(field => (
                <Grid item xs={12} md={6} key={field.key}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="body2" sx={{ minWidth: 160, fontWeight: 600, color: 'primary.main' }}>
                      {field.label}
                      {REQUIRED_FIELDS.find(f => f.key === field.key) ? '' : ' (optional)'}
                    </Typography>
                    <select
                      style={{ 
                        border: '1px solid #ccc', 
                        padding: '8px', 
                        borderRadius: '4px', 
                        width: '100%',
                        fontSize: '14px'
                      }}
                      value={mapping[field.key] || ''}
                      onChange={e => handleMappingChange(field.key, e.target.value)}
                    >
                      <option value="">-- Not Mapped --</option>
                      {columns.map(col => (
                        <option key={col} value={col}>{col || `Column ${columns.indexOf(col) + 1}`}</option>
                      ))}
                    </select>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Preview Table */}
      {preview.length > 0 && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Typography variant="h6" fontWeight={600}>
                Preview
              </Typography>
              <Chip 
                label={`${preview.length} rows`} 
                color="primary" 
                variant="outlined" 
                size="small"
              />
            </Box>
            
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Customer ID</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Customer Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Product Code</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Reference Number</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Qty Out</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Qty In</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview.slice(0, 10).map((row, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell>{row.customer_id || '-'}</TableCell>
                      <TableCell>{row.customer_name || '-'}</TableCell>
                      <TableCell>{row.date || '-'}</TableCell>
                      <TableCell>{row.product_code || '-'}</TableCell>
                      <TableCell>{row.reference_number || '-'}</TableCell>
                      <TableCell>{row.qty_out || '0'}</TableCell>
                      <TableCell>{row.qty_in || '0'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            {preview.length > 10 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Showing first 10 rows of {preview.length} total rows
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

        {/* Preview Summary */}
        {previewSummary && (
          <div className="mb-6 bg-white/80 rounded-lg p-4 border border-blue-200">
            <div className="font-semibold mb-2">Preview Summary:</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-medium text-gray-700">Customers:</div>
                <div className="text-green-600">{previewSummary.customersCreated} to create</div>
                <div className="text-gray-600">{previewSummary.customersExisting} existing</div>
              </div>
              <div>
                <div className="font-medium text-gray-700">Invoices:</div>
                <div className="text-blue-600">{previewSummary.invoicesCreated} to create</div>
                <div className="text-gray-600">{previewSummary.invoicesExisting} existing</div>
              </div>
              <div>
                <div className="font-medium text-gray-700">Sales Receipts:</div>
                <div className="text-purple-600">{previewSummary.receiptsCreated} to create</div>
                <div className="text-gray-600">{previewSummary.receiptsExisting} existing</div>
              </div>
              <div>
                <div className="font-medium text-gray-700">Line Items:</div>
                <div className="text-orange-600">{previewSummary.lineItemsCreated} to create</div>
                <div className="text-gray-600">{previewSummary.lineItemsSkipped} skipped</div>
              </div>
            </div>
            
            {/* Create Missing Customers Button */}
            {previewSummary.customersCreated > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <div className="text-sm text-yellow-800 mb-2">
                  <strong>Missing Customers Detected:</strong> You need to create {previewSummary.customersCreated} customers before importing.
                </div>
                <button
                  onClick={createMissingCustomers}
                  disabled={loading}
                  className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 font-semibold transition disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Missing Customers'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="bg-green-100 text-green-800 p-4 rounded space-y-1">
            {result.status === 'pending_approval' ? (
              <>
                <div className="font-semibold text-lg">✅ Import Submitted for Approval!</div>
                <div>Your import has been submitted and is awaiting approval by an administrator.</div>
                <div>Total rows: {result.total_rows}</div>
                <div className="mt-2 text-sm">
                  You can check the status of your import in the <strong>Import Approvals</strong> page.
                </div>
                <div className="mt-3">
                  <a href="/verification-center" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">
                    Go to Verification Center
                  </a>
                </div>
              </>
            ) : (
              <>
                <div className="font-semibold text-lg">✅ Import Completed Successfully!</div>
                <div>Customers created: {result.customersCreated}, already existed: {result.customersExisting}</div>
                <div>
                  {result.receiptsCreated !== undefined ? 'Sales Receipts' : 'Invoices'} created: {result.invoicesCreated || result.receiptsCreated}, 
                  already existed: {result.invoicesExisting || result.receiptsExisting}
                </div>
                <div>Line items imported: {result.lineItemsCreated}, skipped: {result.lineItemsSkipped}</div>
                <div>Total imported: {result.imported}, Errors: {result.errors}</div>
                
                {/* Show where to find the data */}
                {result.importType === 'direct' && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                    <div className="font-semibold text-blue-900 mb-2">📍 Where to find your imported data:</div>
                    <div className="text-blue-800 text-sm space-y-1">
                      <div>• <strong>Sales Receipts/Invoices:</strong> Check the <a href="/invoices" className="underline">Invoices page</a></div>
                      <div>• <strong>Customers:</strong> Check the <a href="/customers" className="underline">Customers page</a></div>
                      <div>• <strong>Line Items:</strong> View in the database or invoice details</div>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <a href="/invoices" className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-xs">
                        View Invoices
                      </a>
                      <a href="/customers" className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-xs">
                        View Customers
                      </a>
                    </div>
                  </div>
                )}
              </>
            )}
            
            {result.skippedRows && result.skippedRows.length > 0 && (
              <button
                className="bg-gray-200 text-gray-800 px-3 py-1 rounded shadow hover:bg-gray-300 text-xs font-semibold mb-2"
                onClick={() => downloadCSV(result.skippedRows)}
              >
                Download Skipped Rows as CSV
              </button>
            )}
            
            {/* Rental Invoice Generation Button for Sales Receipts */}
            {result.receiptsCreated !== undefined && Object.keys(assetBalances).length > 0 && (
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 font-semibold transition mt-2"
                onClick={() => setShowInvoiceModal(true)}
                disabled={generatingInvoices}
              >
                Generate Rental Invoices
              </button>
            )}
          </div>
        )}

        {/* Progress Bars */}
        {loading && (
          <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
            <div
              className="bg-blue-600 h-4 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}
        
        {importing && (
          <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow-lg z-50">
            Import in progress... You can navigate to another page. Import will continue in the background.<br />
            Progress: {importProgress}%
            {importErrors.length > 0 && <div className="text-red-200 mt-2">Errors: {importErrors.length}</div>}
          </div>
        )}

        {/* Debug Mode */}
        {debugMode && (
          <div className="fixed bottom-0 right-0 bg-white border p-2 z-50">
            <div>Status: {workerStatus.status}</div>
            <div>Progress: {workerStatus.progress}%</div>
            {workerStatus.error && <div className="text-red-500">Error: {workerStatus.error}</div>}
          </div>
        )}

        {/* Rental Invoice Modal */}
        {showInvoiceModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-96">
              <h3 className="text-lg font-bold mb-4">Generate Rental Invoices</h3>
              <form
                onSubmit={async e => {
                  e.preventDefault();
                  setGeneratingInvoices(true);
                  const invoices = {};
                  for (const key in lastImportBalances.current) {
                    const [customer_id, product_code] = key.split('|');
                    const qty = lastImportBalances.current[key];
                    if (qty > 0) {
                      if (!invoices[customer_id]) invoices[customer_id] = [];
                      invoices[customer_id].push({ product_code, qty });
                    }
                  }
                  for (const customer_id in invoices) {
                    const { data: invoice, error: invoiceError } = await supabase
                      .from('invoices')
                      .insert({
                        customer_id,
                        invoice_date: new Date().toISOString().split('T')[0],
                        details: `Rental Invoice (${rentalPeriod})`,
                        rental_period: rentalPeriod
                      })
                      .select()
                      .single();
                    if (invoiceError) continue;
                    const lineItems = invoices[customer_id].map(item => ({
                      invoice_id: invoice.id,
                      product_code: item.product_code,
                      qty_out: item.qty,
                      rate: rentalAmount,
                      amount: rentalAmount * item.qty
                    }));
                    if (lineItems.length) {
                      await supabase.from('invoice_line_items').insert(lineItems);
                    }
                  }
                  setGeneratingInvoices(false);
                  setShowInvoiceModal(false);
                  alert('Rental invoices generated!');
                }}
              >
                <div className="mb-4">
                  <label className="block mb-2">Rental Amount per Asset</label>
                  <input
                    type="number"
                    className="border p-2 rounded w-full"
                    value={rentalAmount}
                    onChange={e => setRentalAmount(Number(e.target.value))}
                    min={0}
                    step={0.01}
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block mb-2">Rental Period</label>
                  <select
                    className="border p-2 rounded w-full"
                    value={rentalPeriod}
                    onChange={e => setRentalPeriod(e.target.value)}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="bg-gray-400 text-white px-4 py-2 rounded"
                    onClick={() => setShowInvoiceModal(false)}
                    disabled={generatingInvoices}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded"
                    disabled={generatingInvoices}
                  >
                    {generatingInvoices ? 'Generating...' : 'Generate'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {skippedItems.length > 0 && (
          <button onClick={downloadSkippedItems} className="bg-gray-200 text-gray-800 px-3 py-1 rounded shadow hover:bg-gray-300 text-xs font-semibold mb-2">
            Download Skipped Items Debug CSV
          </button>
        )}

        {/* Customer Import Report */}
        {customerImportReport && (
          <div className="bg-gray-50 border border-gray-300 rounded p-4 mb-4">
            <div className="font-bold mb-2">Customer Import Report</div>
            <div className="mb-2 text-green-700">
              <strong>Created ({customerImportReport.created.length}):</strong>
              {customerImportReport.created.length === 0 ? ' None' : ''}
              <ul className="list-disc ml-6">
                {customerImportReport.created.map(c => (
                  <li key={c.CustomerListID}>{c.CustomerListID} - {c.name}</li>
                ))}
              </ul>
            </div>
            <div className="mb-2 text-yellow-800">
              <strong>Skipped ({customerImportReport.skipped.length}):</strong>
              {customerImportReport.skipped.length === 0 ? ' None' : ''}
              <ul className="list-disc ml-6">
                {customerImportReport.skipped.map(c => (
                  <li key={c.CustomerListID}>{c.CustomerListID} - {c.name} <span className="italic">({c.reason})</span></li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Box>
    );
} 