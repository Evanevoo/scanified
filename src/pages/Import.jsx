import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import throttle from 'lodash.throttle';
import debounce from 'lodash.debounce';
import { toast } from 'react-hot-toast';
import { getImportWorker, addImportWorkerListener, removeImportWorkerListener } from '../utils/ImportWorkerManager';
import { Box, Paper, Typography } from '@mui/material';
import { findCustomer, normalizeCustomerName } from '../utils/customerMatching';

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

  const handleFileChange = e => {
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
            console.error('Customer validation error:', err);
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
    // Check if any products are cylinders (indicating sales receipts)
    let cylinderCount = 0;
    let totalRows = 0;
    
    for (const row of preview) {
      if (row.product_code) {
        totalRows++;
        const { data: cylinder } = await supabase
          .from('cylinders')
          .select('id')
          .eq('barcode_number', row.product_code)
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
          uploaded_by: user.id
        })
        .select()
        .single();

      if (importError) {
        throw new Error(importError.message);
      }

      setResult({
        message: 'Import submitted for approval',
        imported_id: importedInvoice.id,
        total_rows: preview.length,
        status: 'pending_approval'
      });

    } catch (error) {
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
          uploaded_by: user.id
        })
        .select()
        .single();

      if (importError) {
        throw new Error(importError.message);
      }

      setResult({
        message: 'Import submitted for approval',
        imported_id: importedReceipt.id,
        total_rows: preview.length,
        status: 'pending_approval'
      });

    } catch (error) {
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
    
    for (let i = 0; i < preview.length; i++) {
      const row = preview[i];
      let customerStatus = 'Existing';
      let invoiceStatus = 'Existing';
      let receiptStatus = 'Existing';
      let lineItemStatus = 'Created';
      
      // Check customer
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('CustomerListID')
        .eq('CustomerListID', row.customer_id)
        .single();
      
      if (!existingCustomer) {
        customersCreated++;
        customerStatus = 'Create';
      } else {
        customersExisting++;
      }
      
      // Check if this should be an invoice or sales receipt
      const { data: cylinder } = await supabase
        .from('cylinders')
        .select('id')
        .eq('barcode_number', row.product_code)
        .single();
      
      if (cylinder) {
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
          .eq('invoice_number', String(row.reference_number))
          .single();
        
        if (!existingInvoice) {
          invoicesCreated++;
          invoiceStatus = 'Create';
        } else {
          invoicesExisting++;
        }
      }
      
      // Check line item
      if (cylinder) {
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
          .eq('invoice_number', String(row.reference_number))
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

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fff', py: 8, borderRadius: 0, overflow: 'visible' }}>
      <Paper elevation={0} sx={{ width: '100%', p: { xs: 2, md: 5 }, borderRadius: 0, boxShadow: '0 2px 12px 0 rgba(16,24,40,0.04)', border: '1px solid #eee', bgcolor: '#fff', overflow: 'visible' }}>
        <Typography variant="h3" fontWeight={900} color="primary" mb={2} sx={{ letterSpacing: -1 }}>Import Data</Typography>
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => navigate(-1)}
            className="bg-gradient-to-r from-gray-400 to-gray-300 text-white px-6 py-2 rounded-lg shadow-md hover:from-gray-500 hover:to-gray-400 font-semibold transition"
          >
            Back
          </button>
        </div>

        {/* Format Guide */}
        <div className="mb-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="font-semibold mb-2 text-blue-900">Expected File Format:</div>
          <div className="text-sm text-blue-800 mb-3">
            Your file should be tab-separated (.txt) or comma-separated (.csv) with the following columns:
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div><strong>Customer ID:</strong> Unique customer identifier</div>
            <div><strong>Customer Name:</strong> Company or customer name</div>
            <div><strong>Date:</strong> Invoice/Receipt date (MM/DD/YYYY or YYYY-MM-DD)</div>
            <div><strong>Product Code:</strong> Asset type or product code (e.g., BCS68-300)</div>
            <div><strong>Reference Number:</strong> Invoice or sales receipt number</div>
            <div><strong>Quantity Shipped:</strong> Number of items shipped/out</div>
            <div><strong>Quantity Returned:</strong> Number of items returned/in</div>
          </div>
          <div className="mt-3 p-2 bg-white rounded border text-xs font-mono">
            <div className="text-blue-600 font-semibold mb-1">Example row:</div>
            <div>80000C33-1745333424A	Rockford Engineering Works Ltd.	06/06/2025	BCS68-300	64034	2	0</div>
          </div>
          <div className="mt-3 text-sm text-blue-700">
            <strong>Note:</strong> The system will automatically detect whether to process as invoices or sales receipts based on your data.
          </div>
        </div>

        <form onSubmit={handleImport} className="mb-6 flex gap-2 items-end">
          <input 
            type="file" 
            accept=".txt,.csv,.xlsx,.xls" 
            onChange={handleFileChange} 
            className="border p-2 rounded w-full" 
          />
          <button 
            type="submit" 
            className="bg-blue-600 text-white px-6 py-2 rounded-lg shadow-md hover:bg-blue-700 font-semibold transition"
            disabled={!file || !preview.length || loading || !previewChecked || validationErrors.length > 0 || importing}
          >
            {loading ? 'Importing...' : 'Import'}
          </button>
        </form>

        {/* Field Mapping UI */}
        {columns.length > 0 && (
          <div className="mb-6 bg-white/80 rounded-lg p-4 border border-blue-200">
            <div className="font-semibold mb-2 flex items-center gap-4">
              Field Mapping:
              <button
                type="button"
                className="bg-gray-200 text-gray-800 px-3 py-1 rounded shadow hover:bg-gray-300 text-xs font-semibold"
                onClick={handleResetMapping}
              >
                Reset Mapping
              </button>
            </div>
            
            {/* Detected Columns Info */}
            <div className="mb-4 p-2 bg-gray-50 rounded text-sm">
              <div className="font-medium text-gray-700 mb-1">Detected Columns ({columns.length}):</div>
              <div className="text-gray-600 font-mono">
                {columns.map((col, idx) => (
                  <span key={idx} className="inline-block bg-white px-2 py-1 rounded border mr-2 mb-1">
                    {col || `Column ${idx + 1}`}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ALL_FIELDS.map(field => (
                <div key={field.key} className="flex items-center gap-2">
                  <label className="w-40 font-medium text-blue-900">
                    {field.label}
                    {REQUIRED_FIELDS.find(f => f.key === field.key) ? '' : ' (optional)'}
                  </label>
                  <select
                    className="border p-2 rounded w-full"
                    value={mapping[field.key] || ''}
                    onChange={e => handleMappingChange(field.key, e.target.value)}
                  >
                    <option value="">-- Not Mapped --</option>
                    {columns.map(col => (
                      <option key={col} value={col}>{col || `Column ${columns.indexOf(col) + 1}`}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preview Table */}
        {preview.length > 0 && (
          <div className="mb-6">
            <div className="font-semibold mb-2">Preview ({preview.length} rows):</div>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border">
                <thead>
                  <tr>
                    <th className="border px-2 py-1 text-xs uppercase">Customer ID</th>
                    <th className="border px-2 py-1 text-xs uppercase">Customer Name</th>
                    <th className="border px-2 py-1 text-xs uppercase">Date</th>
                    <th className="border px-2 py-1 text-xs uppercase">Product Code</th>
                    <th className="border px-2 py-1 text-xs uppercase">Reference Number</th>
                    <th className="border px-2 py-1 text-xs uppercase">Qty Out</th>
                    <th className="border px-2 py-1 text-xs uppercase">Qty In</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 5).map((row, i) => {
                    const rowErrors = validationErrors.filter(e => e.row === i);
                    return (
                      <tr key={i} className={rowErrors.length ? 'bg-red-100' : ''}>
                        <td className={`border px-2 py-1 text-xs ${rowErrors.find(e => e.field === 'customer_id') ? 'bg-red-200 text-red-800 font-bold' : ''}`}>
                          {row.customer_id || ''}
                        </td>
                        <td className={`border px-2 py-1 text-xs ${rowErrors.find(e => e.field === 'customer_name') ? 'bg-red-200 text-red-800 font-bold' : ''}`}>
                          {row.customer_name || ''}
                        </td>
                        <td className={`border px-2 py-1 text-xs ${rowErrors.find(e => e.field === 'date') ? 'bg-red-200 text-red-800 font-bold' : ''}`}>
                          {row.date || ''}
                        </td>
                        <td className={`border px-2 py-1 text-xs ${rowErrors.find(e => e.field === 'product_code') ? 'bg-red-200 text-red-800 font-bold' : ''}`}>
                          <a href={`/bottles/${row.product_code}`} style={{ color: '#1976d2', textDecoration: 'underline', cursor: 'pointer' }}>
                            {row.product_code}
                          </a>
                        </td>
                        <td className={`border px-2 py-1 text-xs ${rowErrors.find(e => e.field === 'reference_number') ? 'bg-red-200 text-red-800 font-bold' : ''}`}>
                          {row.reference_number || ''}
                        </td>
                        <td className={`border px-2 py-1 text-xs ${rowErrors.find(e => e.field === 'qty_out') ? 'bg-red-200 text-red-800 font-bold' : ''}`}>
                          {row.qty_out || ''}
                        </td>
                        <td className={`border px-2 py-1 text-xs ${rowErrors.find(e => e.field === 'qty_in') ? 'bg-red-200 text-red-800 font-bold' : ''}`}>
                          {row.qty_in || ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {preview.length > 5 && <div className="text-xs text-gray-500 mt-1">Showing first 5 rows only.</div>}
            </div>
            {validationErrors.length > 0 && (
              <div className="text-red-700 bg-red-100 border border-red-300 rounded p-2 mt-2">
                {validationErrors.length} validation error(s) found. Please fix highlighted rows before importing.
              </div>
            )}
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded shadow hover:bg-blue-600 font-semibold transition mt-4"
              onClick={checkPreviewStatuses}
              disabled={loading || validationErrors.length > 0}
            >
              {loading ? 'Checking...' : 'Check Preview'}
            </button>
          </div>
        )}

        {/* Preview Summary */}
        {previewChecked && previewSummary && (
          <div className="bg-blue-50 text-blue-900 p-4 rounded mb-4 border border-blue-200">
            <div className="font-semibold mb-1">Import Summary:</div>
            <div>Customers to create: {previewSummary.customersCreated}, already exist: {previewSummary.customersExisting}</div>
            <div>Records to create: {previewSummary.invoicesCreated || previewSummary.receiptsCreated}, already exist: {previewSummary.invoicesExisting || previewSummary.receiptsExisting}</div>
            <div>Line items to import: {previewSummary.lineItemsCreated}, skipped: {previewSummary.lineItemsSkipped}</div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="bg-green-100 text-green-800 p-4 rounded space-y-1">
            {result.status === 'pending_approval' ? (
              <>
                <div className="font-semibold text-lg">✅ Import Submitted for Approval!</div>
                <div>Your import has been submitted and is awaiting approval by an administrator.</div>
                <div>Import ID: {result.imported_id}</div>
                <div>Total rows: {result.total_rows}</div>
                <div className="mt-2 text-sm">
                  You can check the status of your import in the <strong>Import Approvals</strong> page.
                </div>
              </>
            ) : (
              <>
                <div>Import finished!</div>
                <div>Customers created: {result.customersCreated}, already existed: {result.customersExisting}</div>
                <div>
                  {result.receiptsCreated !== undefined ? 'Sales Receipts' : 'Invoices'} created: {result.invoicesCreated || result.receiptsCreated}, 
                  already existed: {result.invoicesExisting || result.receiptsExisting}
                </div>
                <div>Line items imported: {result.lineItemsCreated}, skipped: {result.lineItemsSkipped}</div>
                <div>Total imported: {result.imported}, Errors: {result.errors}</div>
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
      </Paper>
    </Box>
  );
} 