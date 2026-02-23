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
import { Box, Paper, Typography, Button, IconButton, Alert, LinearProgress, Card, CardContent, Stack, Chip, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, FormControlLabel, Checkbox, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { ArrowBack as ArrowBackIcon, Upload as UploadIcon, Search as SearchIcon, CheckCircle as CheckCircleIcon, CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { findCustomer, normalizeCustomerName, batchFindCustomers } from '../utils/customerMatching';
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
  const [previewLoadingStep, setPreviewLoadingStep] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);
  const [progress, setProgress] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importErrors, setImportErrors] = useState([]);
  const [debugMode, setDebugMode] = useState(false);
  const [skippedItems, setSkippedItems] = useState([]);
  const [workerStatus, setWorkerStatus] = useState({ status: 'idle', progress: 0, error: null });
  const [isDragging, setIsDragging] = useState(false);
  const [autoCreateCustomers, setAutoCreateCustomers] = useState(false);
  const [importStep, setImportStep] = useState('');
  const previewTableRef = useRef(null);
  const [previewScrollTop, setPreviewScrollTop] = useState(0);
  const PREVIEW_ROW_HEIGHT = 41;
  const PREVIEW_VISIBLE_ROWS = 20;
  
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

  const clearFileState = useCallback(() => {
    setFile(null);
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
  }, []);

  const processFile = useCallback((file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    const accepted = ['txt', 'csv', 'xls', 'xlsx'];
    if (!accepted.includes(ext)) {
      toast.error('Please upload a .txt, .csv, .xls, or .xlsx file');
      return;
    }
    setFile(file);
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
  }, []);

  const handleFileChange = (e) => {
    processFile(e.target.files?.[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer?.files?.[0];
    if (droppedFile) processFile(droppedFile);
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

  async function validateRows(previewRows, mappingObj, organizationId) {
    const errors = [];
    previewRows.forEach((row, idx) => {
      REQUIRED_FIELDS.forEach(field => {
        if (!mappingObj[field.key]) {
          errors.push({ row: idx, field: field.key, reason: 'Field not mapped' });
        } else if (!row[field.key] || row[field.key].toString().trim() === '') {
          errors.push({ row: idx, field: field.key, reason: 'Missing value' });
        }
      });
    });
    let missingCustomerCount = 0;
    if (organizationId && previewRows.some(r => r.customer_id || r.customer_name)) {
      const customersToCheck = previewRows.map(r => ({ CustomerListID: r.customer_id, name: r.customer_name }));
      const customerMap = await batchFindCustomers(customersToCheck, organizationId);
      const missingIds = new Set();
      previewRows.forEach((row, idx) => {
        if (row.customer_id || row.customer_name) {
          const key = `${row.customer_id || ''}_${row.customer_name || ''}`;
          if (!customerMap[key]) {
            errors.push({ row: idx, field: 'customer_id', reason: `Customer not found: ${row.customer_name || 'Unknown'} (${row.customer_id || 'No ID'})` });
            missingIds.add((row.customer_id || '').toLowerCase());
          }
        }
      });
      missingCustomerCount = missingIds.size;
    }
    setValidationErrors(errors);
    if (missingCustomerCount > 0) {
      setPreviewSummary(prev => ({ ...(prev || {}), customersCreated: missingCustomerCount }));
    }
    return { valid: errors.length === 0, missingCustomerCount: missingCustomerCount || 0 };
  }

  // Unified import function that automatically detects type
  async function handleImport(e) {
    if (e) e.preventDefault();
    setLoading(true);
    setImporting(true);
    setImportProgress(0);
    setImportErrors([]);
    setImportStep('Validating...');
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('User not authenticated');
      const { data: userProfile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
      let result = await validateRows(preview, mapping, userProfile?.organization_id);
      let valid = result.valid;
      if (!valid && autoCreateCustomers && result.missingCustomerCount > 0) {
        setImportStep('Creating missing customers...');
        await createMissingCustomers();
        setLoading(true);
        setImporting(true);
        setValidationErrors([]);
        setPreviewSummary(prev => prev ? { ...prev, customersCreated: 0 } : null);
        result = await validateRows(preview, mapping, userProfile?.organization_id);
        valid = result.valid;
      }
      if (!valid) {
        setLoading(false);
        setImporting(false);
        setImportStep('');
        return;
      }
      setImportStep('Detecting import type...');
      setImportProgress(25);
      const isSalesReceipt = await detectSalesReceiptType();
      setImportStep('Submitting for approval...');
      setImportProgress(75);
      if (isSalesReceipt) {
        await handleSalesReceiptImport();
      } else {
        await handleInvoiceImport();
      }
      setImportProgress(100);
      setImportStep('');
    } catch (error) {
      setError(error.message);
      setImportStep('');
      setLoading(false);
      setImporting(false);
    }
  }

  // Function to detect if this should be processed as sales receipts (bulk query - fast)
  async function detectSalesReceiptType() {
    const user = await getCurrentUser();
    if (!user) {
      logger.error('User not authenticated');
      return false;
    }
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();
    if (profileError || !userProfile?.organization_id) {
      logger.error('User not assigned to an organization');
      return false;
    }
    const productCodes = [...new Set(preview.map(r => r.product_code).filter(Boolean))];
    if (productCodes.length === 0) return false;
    const { data: cylinders } = await supabase
      .from('bottles')
      .select('barcode_number')
      .in('barcode_number', productCodes)
      .eq('organization_id', userProfile.organization_id);
    const cylinderBarcodes = new Set((cylinders || []).map(c => c.barcode_number));
    let cylinderCount = 0, totalRows = 0;
    for (const row of preview) {
      if (row.product_code) {
        totalRows++;
        if (cylinderBarcodes.has(row.product_code)) cylinderCount++;
      }
    }
    return cylinderCount > 0 && (cylinderCount / totalRows) > 0.5;
  }

  // Group preview rows by invoice/reference number – same invoice_number (or reference_number) = one group = one DB row
  function groupPreviewByReferenceNumber(rows) {
    const byInvoiceNumber = {};
    for (const row of rows) {
      const invoiceNumber = String(
        row.invoice_number ?? row.reference_number ?? row.sales_receipt_number ?? ''
      ).trim() || 'UNKNOWN';
      if (!byInvoiceNumber[invoiceNumber]) byInvoiceNumber[invoiceNumber] = [];
      byInvoiceNumber[invoiceNumber].push(row);
    }
    return Object.entries(byInvoiceNumber).map(([refNumber, groupRows]) => ({ refNumber, rows: groupRows }));
  }

  // Normalize order/ref number for matching (trim, strip leading zeros for all-digit)
  function normalizeOrderNum(num) {
    if (num == null || num === '') return '';
    const s = String(num).trim();
    if (/^\d+$/.test(s)) return s.replace(/^0+/, '') || '0';
    return s;
  }

  // Return a Set of normalized order numbers that already exist (pending, verified, or approved) so we skip re-importing them
  async function getExistingOrderNumbersForOrg(type, organizationId) {
    const table = type === 'invoice' ? 'imported_invoices' : 'imported_sales_receipts';
    const { data: records, error } = await supabase
      .from(table)
      .select('id, data')
      .eq('organization_id', organizationId)
      .in('status', ['pending', 'verified', 'approved']);
    if (error) {
      logger.warn('Could not fetch verified records for skip check:', error);
      return new Set();
    }
    const set = new Set();
    for (const rec of records || []) {
      const data = typeof rec.data === 'string' ? JSON.parse(rec.data) : rec.data;
      if (!data) continue;
      let orderNum = data.summary?.reference_number ?? data.reference_number ?? data.order_number ?? data.invoice_number;
      if (orderNum == null && data.rows?.[0]) {
        const row = data.rows[0];
        orderNum = row.order_number ?? row.invoice_number ?? row.reference_number ?? row.sales_receipt_number;
      }
      const norm = normalizeOrderNum(orderNum);
      if (norm) set.add(norm);
      // Also include any verified_order_numbers from the same record (multi-order imports)
      const verifiedOrders = data.verified_order_numbers;
      if (Array.isArray(verifiedOrders)) {
        verifiedOrders.forEach(n => {
          const nNorm = normalizeOrderNum(n);
          if (nNorm) set.add(nNorm);
        });
      }
    }
    return set;
  }

  // Import logic for invoices – one DB row per invoice (per reference number)
  async function handleInvoiceImport() {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('User not authenticated');
      
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();
      
      if (profileError || !userProfile?.organization_id) {
        throw new Error('User not assigned to an organization');
      }
      
      const groups = groupPreviewByReferenceNumber(preview);
      const existingOrderNums = await getExistingOrderNumbersForOrg('invoice', userProfile.organization_id);
      const groupsToInsert = groups.filter(({ refNumber }) => !existingOrderNums.has(normalizeOrderNum(refNumber)));
      const skippedCount = groups.length - groupsToInsert.length;
      if (skippedCount > 0) {
        logger.log(`Skipping ${skippedCount} already existing invoice(s) on re-import`);
      }
      logger.log('Creating invoice import: one row per invoice', { groupCount: groupsToInsert.length, totalRows: preview.length, skippedExisting: skippedCount });

      const insertPayloads = groupsToInsert.map(({ refNumber, rows: groupRows }) => ({
        data: {
          rows: groupRows,
          mapping,
          summary: {
            total_rows: groupRows.length,
            uploaded_by: user.id,
            uploaded_at: new Date().toISOString(),
            reference_number: refNumber
          }
        },
        uploaded_by: user.id,
        organization_id: userProfile.organization_id,
        status: 'pending'
      }));

      const BATCH = 50;
      let inserted = 0;
      for (let i = 0; i < insertPayloads.length; i += BATCH) {
        const batch = insertPayloads.slice(i, i + BATCH);
        const { data, error: importError } = await supabase
          .from('imported_invoices')
          .insert(batch)
          .select('id');
        if (importError) {
          if (importError.message.includes('row-level security policy')) {
            for (const payload of batch) {
              const { error: singleError } = await supabase
                .from('imported_invoices')
                .insert({ ...payload, uploaded_by: undefined })
                .select('id');
              if (!singleError) inserted++;
            }
          } else throw new Error(importError.message);
        } else {
          inserted += (data?.length ?? 0);
        }
      }

      const message = skippedCount > 0
        ? `Import submitted. ${inserted} invoice(s) added for approval. ${skippedCount} already existing invoice(s) skipped.`
        : 'Import submitted for approval';
      setResult({
        message,
        total_rows: preview.length,
        status: 'pending_approval',
        invoices_submitted: inserted,
        invoices_skipped: skippedCount
      });
    } catch (error) {
      logger.error('Invoice import error:', error);
      setError(error.message);
    }
    setLoading(false);
    setImporting(false);
  }

  async function handleSalesReceiptImport() {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('User not authenticated');
      
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();
      
      if (profileError || !userProfile?.organization_id) {
        throw new Error('User not assigned to an organization');
      }
      
      const groups = groupPreviewByReferenceNumber(preview);
      const existingOrderNums = await getExistingOrderNumbersForOrg('receipt', userProfile.organization_id);
      const groupsToInsert = groups.filter(({ refNumber }) => !existingOrderNums.has(normalizeOrderNum(refNumber)));
      const skippedCount = groups.length - groupsToInsert.length;
      if (skippedCount > 0) {
        logger.log(`Skipping ${skippedCount} already existing receipt(s) on re-import`);
      }
      logger.log('Creating sales receipt import: one row per receipt', { groupCount: groupsToInsert.length, totalRows: preview.length, skippedExisting: skippedCount });

      const insertPayloads = groupsToInsert.map(({ refNumber, rows: groupRows }) => ({
        data: {
          rows: groupRows,
          mapping,
          summary: {
            total_rows: groupRows.length,
            uploaded_by: user.id,
            uploaded_at: new Date().toISOString(),
            reference_number: refNumber
          }
        },
        uploaded_by: user.id,
        organization_id: userProfile.organization_id,
        status: 'pending'
      }));

      const BATCH = 50;
      let inserted = 0;
      for (let i = 0; i < insertPayloads.length; i += BATCH) {
        const batch = insertPayloads.slice(i, i + BATCH);
        const { data, error: importError } = await supabase
          .from('imported_sales_receipts')
          .insert(batch)
          .select('id');
        if (importError) {
          if (importError.message.includes('row-level security policy')) {
            for (const payload of batch) {
              const { error: singleError } = await supabase
                .from('imported_sales_receipts')
                .insert({ ...payload, uploaded_by: undefined })
                .select('id');
              if (!singleError) inserted++;
            }
          } else throw new Error(importError.message);
        } else {
          inserted += (data?.length ?? 0);
        }
      }

      const message = skippedCount > 0
        ? `Import submitted. ${inserted} receipt(s) added for approval. ${skippedCount} already existing receipt(s) skipped.`
        : 'Import submitted for approval';
      setResult({
        message,
        total_rows: preview.length,
        status: 'pending_approval',
        receipts_submitted: inserted,
        receipts_skipped: skippedCount
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

  // Check preview statuses for both types (bulk queries - much faster)
  async function checkPreviewStatuses() {
    setLoading(true);
    setPreviewLoadingStep('Loading customers & products...');
    const statuses = [];
    let customersCreated = 0, customersExisting = 0;
    let invoicesCreated = 0, invoicesExisting = 0;
    let receiptsCreated = 0, receiptsExisting = 0;
    let lineItemsCreated = 0, lineItemsSkipped = 0;

    const user = await getCurrentUser();
    if (!user) {
      toast.error('User not authenticated');
      setLoading(false);
      return;
    }
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

    const refNumbers = preview.map(r => String(r.reference_number || '')).filter(Boolean);
    const uniqueRefs = [...new Set(refNumbers)];
    const productCodes = [...new Set(preview.map(r => r.product_code).filter(Boolean))];

    const [customersRes, bottlesRes, receiptsRes, invoicesRes] = await Promise.all([
      supabase.from('customers').select('CustomerListID').eq('organization_id', userProfile.organization_id),
      productCodes.length ? supabase.from('bottles').select('barcode_number').in('barcode_number', productCodes).eq('organization_id', userProfile.organization_id) : { data: [] },
      uniqueRefs.length ? supabase.from('sales_receipts').select('id,sales_receipt_number').in('sales_receipt_number', uniqueRefs) : { data: [] },
      uniqueRefs.length ? supabase.from('invoices').select('id,details').in('details', uniqueRefs) : { data: [] }
    ]);

    const existingCustomerIds = new Set((customersRes.data || []).map(c => (c.CustomerListID || '').trim().toLowerCase()));
    const bottleSet = new Set((bottlesRes.data || []).map(b => b.barcode_number));
    const receiptByNumber = new Map((receiptsRes.data || []).map(r => [String(r.sales_receipt_number), r]));
    const invoiceByDetails = new Map((invoicesRes.data || []).map(i => [String(i.details), i]));

    setPreviewLoadingStep('Checking existing invoices & receipts...');
    const receiptIds = [...receiptByNumber.values()].map(r => r.id).filter(Boolean);
    const invoiceIds = [...invoiceByDetails.values()].map(i => i.id).filter(Boolean);
    const existingLineItems = new Set();
    if (receiptIds.length > 0) {
      const { data: srItems } = await supabase.from('sales_receipt_line_items').select('sales_receipt_id,product_code').in('sales_receipt_id', receiptIds);
      (srItems || []).forEach(it => existingLineItems.add(`${it.sales_receipt_id}|${it.product_code}`));
    }
    if (invoiceIds.length > 0) {
      const { data: invItems } = await supabase.from('invoice_line_items').select('invoice_id,product_code').in('invoice_id', invoiceIds);
      (invItems || []).forEach(it => existingLineItems.add(`inv|${it.invoice_id}|${it.product_code}`));
    }

    const seenCustomerIds = new Set();
    for (const row of preview) {
      let customerStatus = 'Existing';
      let invoiceStatus = 'Existing';
      let receiptStatus = 'Existing';
      let lineItemStatus = 'Created';
      const cid = (row.customer_id || '').trim().toLowerCase();
      if (cid) {
        if (!existingCustomerIds.has(cid)) {
          if (!seenCustomerIds.has(cid)) {
            customersCreated++;
            seenCustomerIds.add(cid);
          }
          customerStatus = 'Create';
        } else {
          customersExisting++;
        }
      }

      const isCylinder = row.product_code && bottleSet.has(row.product_code);
      const refNum = String(row.reference_number || '');

      if (isCylinder) {
        const receipt = refNum ? receiptByNumber.get(refNum) : null;
        if (!receipt) {
          receiptsCreated++;
          receiptStatus = 'Create';
        } else {
          receiptsExisting++;
        }
        if (receipt) {
          const lineKey = `${receipt.id}|${row.product_code}`;
          if (existingLineItems.has(lineKey)) {
            lineItemStatus = 'Skipped (Duplicate)';
            lineItemsSkipped++;
          } else {
            lineItemsCreated++;
          }
        } else {
          lineItemsCreated++;
        }
      } else {
        const invoice = refNum ? invoiceByDetails.get(refNum) : null;
        if (!invoice) {
          invoicesCreated++;
          invoiceStatus = 'Create';
        } else {
          invoicesExisting++;
        }
        if (invoice) {
          const lineKey = `inv|${invoice.id}|${row.product_code}`;
          if (existingLineItems.has(lineKey)) {
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
    setPreviewLoadingStep('');
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
        // Determine location from city or use default
        const city = (customerRow.city || customerRow.City || '').trim().toUpperCase();
        let location = 'SASKATOON'; // Default
        if (city.includes('REGINA')) location = 'REGINA';
        else if (city.includes('CHILLIWACK')) location = 'CHILLIWACK';
        else if (city.includes('PRINCE GEORGE') || city.includes('PRINCE_GEORGE')) location = 'PRINCE_GEORGE';
        else if (city.includes('SASKATOON')) location = 'SASKATOON';
        
        customersToCreate.push({
          CustomerListID: customerRow.customer_id, // Use original case
          name: customerRow.customer_name || `Customer ${customerRow.customer_id}`,
          barcode: `*%${(customerRow.customer_id || '').toLowerCase().replace(/\s+/g, '')}*`,
          customer_barcode: `*%${(customerRow.customer_id || '').toLowerCase().replace(/\s+/g, '')}*`,
          location: location,
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
          
          // Determine location from city or use default
          const city = (row.city || row.City || '').trim().toUpperCase();
          let location = 'SASKATOON'; // Default
          if (city.includes('REGINA')) location = 'REGINA';
          else if (city.includes('CHILLIWACK')) location = 'CHILLIWACK';
          else if (city.includes('PRINCE GEORGE') || city.includes('PRINCE_GEORGE')) location = 'PRINCE_GEORGE';
          else if (city.includes('SASKATOON')) location = 'SASKATOON';
          
          newCustomers.push({
            CustomerListID: customerId,
            name: row.customer_name.trim(),
            barcode: `*%${customerIdLower.replace(/\s+/g, '')}*`,
            customer_barcode: `*%${customerIdLower.replace(/\s+/g, '')}*`,
            location: location,
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
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            <strong>Tip:</strong> Preview is optional—you can map fields and click Import directly for faster workflow.
          </Typography>
        </CardContent>
      </Card>

      {/* File Upload Card with Drag-and-Drop */}
      <Card
        variant="outlined"
        sx={{
          mb: 3,
          border: '2px dashed',
          borderColor: isDragging ? 'primary.main' : 'divider',
          bgcolor: isDragging ? 'action.hover' : 'background.paper',
          transition: 'border-color 0.2s, background-color 0.2s'
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
            <Button
              variant="outlined"
              component="label"
              startIcon={<CloudUploadIcon />}
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
                onDelete={clearFileState}
              />
            )}
            {!file && (
              <Typography variant="body2" color="text.secondary">
                or drag and drop .txt, .csv, .xls, .xlsx here
              </Typography>
            )}
            
            <Button
              variant="outlined"
              color="success"
              onClick={checkPreviewStatuses}
              disabled={!file || !preview.length || loading}
              startIcon={<SearchIcon />}
            >
              {loading ? (previewLoadingStep || 'Analyzing...') : 'Preview Status'}
            </Button>
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={autoCreateCustomers}
                  onChange={(e) => setAutoCreateCustomers(e.target.checked)}
                  color="primary"
                />
              }
              label="Auto-create missing customers"
            />
            <Button
              variant="contained"
              onClick={handleImport}
              disabled={!file || !preview.length || loading || validationErrors.length > 0 || importing || (previewSummary?.customersCreated > 0 && !autoCreateCustomers)}
              startIcon={!importStep ? <CheckCircleIcon /> : null}
            >
              {importStep || (loading ? 'Importing...' : 'Import')}
            </Button>
          </Stack>
          {importing && importStep && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress variant="determinate" value={importProgress} sx={{ height: 8, borderRadius: 1 }} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {importStep}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
        
      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setValidationErrors([])}>
          <Typography variant="subtitle2" gutterBottom>Fix these issues before importing:</Typography>
          <Box component="ul" sx={{ m: 0, pl: 2 }}>
            {validationErrors.slice(0, 5).map((err, i) => (
              <li key={i}>
                Row {err.row + 1}: {err.reason}
              </li>
            ))}
          </Box>
          {validationErrors.length > 5 && (
            <Typography variant="body2" color="text.secondary">...and {validationErrors.length - 5} more</Typography>
          )}
        </Alert>
      )}
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

      {/* Preview Table (virtualized for large files) */}
      {preview.length > 0 && (() => {
        const useVirtual = preview.length > 50;
        const startIndex = useVirtual ? Math.max(0, Math.floor(previewScrollTop / PREVIEW_ROW_HEIGHT)) : 0;
        const endIndex = useVirtual ? Math.min(preview.length, startIndex + PREVIEW_VISIBLE_ROWS) : Math.min(preview.length, 10);
        const visibleRows = preview.slice(startIndex, endIndex);
        return (
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
                {useVirtual && (
                  <Typography variant="caption" color="text.secondary">
                    (virtualized: showing rows {startIndex + 1}–{endIndex})
                  </Typography>
                )}
              </Box>
              
              <TableContainer
                ref={previewTableRef}
                onScroll={(e) => setPreviewScrollTop(e.target.scrollTop)}
                sx={{ maxHeight: useVirtual ? 420 : undefined, overflow: 'auto' }}
              >
                <Table size="small" stickyHeader>
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
                    {useVirtual && startIndex > 0 && (
                      <TableRow sx={{ visibility: 'hidden', pointerEvents: 'none' }}>
                        <TableCell colSpan={7} sx={{ height: startIndex * PREVIEW_ROW_HEIGHT, padding: 0, border: 0, lineHeight: 0 }} />
                      </TableRow>
                    )}
                    {visibleRows.map((row, i) => (
                      <TableRow key={startIndex + i} hover sx={{ height: PREVIEW_ROW_HEIGHT }}>
                        <TableCell>{row.customer_id || '-'}</TableCell>
                        <TableCell>{row.customer_name || '-'}</TableCell>
                        <TableCell>{row.date || '-'}</TableCell>
                        <TableCell>{row.product_code || '-'}</TableCell>
                        <TableCell>{row.reference_number || '-'}</TableCell>
                        <TableCell>{row.qty_out || '0'}</TableCell>
                        <TableCell>{row.qty_in || '0'}</TableCell>
                      </TableRow>
                    ))}
                    {useVirtual && endIndex < preview.length && (
                      <TableRow sx={{ visibility: 'hidden', pointerEvents: 'none' }}>
                        <TableCell colSpan={7} sx={{ height: (preview.length - endIndex) * PREVIEW_ROW_HEIGHT, padding: 0, border: 0, lineHeight: 0 }} />
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {preview.length > 10 && !useVirtual && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Showing first 10 rows of {preview.length} total rows
                </Typography>
              )}
            </CardContent>
          </Card>
        );
      })()}

        {/* Preview Summary */}
        {previewSummary && (
          <Card variant="outlined" sx={{ mb: 3, bgcolor: 'background.paper' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Preview Summary</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">Customers</Typography>
                  <Typography variant="body2" color="success.main">{previewSummary.customersCreated} to create</Typography>
                  <Typography variant="body2" color="text.secondary">{previewSummary.customersExisting} existing</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">Invoices</Typography>
                  <Typography variant="body2" color="info.main">{previewSummary.invoicesCreated} to create</Typography>
                  <Typography variant="body2" color="text.secondary">{previewSummary.invoicesExisting} existing</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">Sales Receipts</Typography>
                  <Typography variant="body2" sx={{ color: 'secondary.main' }}>{previewSummary.receiptsCreated} to create</Typography>
                  <Typography variant="body2" color="text.secondary">{previewSummary.receiptsExisting} existing</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">Line Items</Typography>
                  <Typography variant="body2" color="warning.main">{previewSummary.lineItemsCreated} to create</Typography>
                  <Typography variant="body2" color="text.secondary">{previewSummary.lineItemsSkipped} skipped</Typography>
                </Grid>
              </Grid>
              {previewSummary.customersCreated > 0 && (
                <Alert severity="warning" sx={{ mt: 2 }} action={
                  <Button color="inherit" size="small" onClick={createMissingCustomers} disabled={loading}>
                    {loading ? 'Creating...' : 'Create Missing Customers'}
                  </Button>
                }>
                  <Typography variant="body2">
                    <strong>Missing customers:</strong> Create {previewSummary.customersCreated} customers before importing, or enable &quot;Auto-create missing customers&quot; and click Import.
                  </Typography>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {result && (
          <Alert severity="success" sx={{ mb: 3 }} icon={false}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              {result.status === 'pending_approval' ? 'Import Submitted for Approval!' : 'Import Completed Successfully!'}
            </Typography>
            {result.status === 'pending_approval' ? (
              <>
                <Typography variant="body2">Your import has been submitted and is awaiting approval by an administrator.</Typography>
                <Typography variant="body2">Total rows: {result.total_rows}</Typography>
                {(result.invoices_submitted != null || result.receipts_submitted != null) && (
                  <Typography variant="body2">
                    {result.invoices_submitted != null && `${result.invoices_submitted} invoice(s) submitted for approval. `}
                    {result.receipts_submitted != null && `${result.receipts_submitted} sales receipt(s) submitted for approval. `}
                    {(result.invoices_skipped > 0 || result.receipts_skipped > 0) && (
                      <>{(result.invoices_skipped ?? 0) + (result.receipts_skipped ?? 0)} already existing order(s) skipped. </>
                    )}
                    Each can be verified separately.
                  </Typography>
                )}
                <Button component={Link} to="/import-approvals" variant="contained" size="small" sx={{ mt: 2 }}>
                  Go to Order Verification
                </Button>
              </>
            ) : (
              <>
                <Typography variant="body2">Customers created: {result.customersCreated ?? 0}, already existed: {result.customersExisting ?? 0}</Typography>
                <Typography variant="body2">
                  {result.receiptsCreated !== undefined ? 'Sales Receipts' : 'Invoices'} created: {result.invoicesCreated ?? result.receiptsCreated ?? 0}, existing: {result.invoicesExisting ?? result.receiptsExisting ?? 0}
                </Typography>
                <Typography variant="body2">Line items: {result.lineItemsCreated ?? 0} imported, {result.lineItemsSkipped ?? 0} skipped. Total: {result.imported ?? 0}, Errors: {result.errors ?? 0}</Typography>
                {result.importType === 'direct' && (
                  <Box sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="body2" fontWeight={600} gutterBottom>Where to find your data</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Button component={Link} to="/invoices" size="small" variant="outlined">View Invoices</Button>
                      <Button component={Link} to="/customers" size="small" variant="outlined">View Customers</Button>
                    </Stack>
                  </Box>
                )}
              </>
            )}
            {result.skippedRows?.length > 0 && (
              <Button size="small" variant="outlined" sx={{ mt: 1 }} onClick={() => downloadCSV(result.skippedRows)}>
                Download Skipped Rows as CSV
              </Button>
            )}
            {result.receiptsCreated !== undefined && Object.keys(assetBalances).length > 0 && (
              <Button variant="contained" size="small" sx={{ mt: 1, ml: 1 }} onClick={() => setShowInvoiceModal(true)} disabled={generatingInvoices}>
                {generatingInvoices ? 'Generating...' : 'Generate Rental Invoices'}
              </Button>
            )}
          </Alert>
        )}

        {importing && (
          <Paper elevation={4} sx={{ position: 'fixed', bottom: 16, right: 16, p: 2, zIndex: 1300, minWidth: 220 }}>
            <Typography variant="body2" fontWeight={600}>Import in progress</Typography>
            <LinearProgress variant="determinate" value={importProgress} sx={{ mt: 1, height: 6, borderRadius: 1 }} />
            <Typography variant="caption" color="text.secondary">{importProgress}%</Typography>
            {importErrors.length > 0 && <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 0.5 }}>Errors: {importErrors.length}</Typography>}
          </Paper>
        )}

        {debugMode && (
          <Paper elevation={2} sx={{ position: 'fixed', bottom: 0, right: 0, p: 1.5, zIndex: 1200 }}>
            <Typography variant="caption">Status: {workerStatus.status}</Typography>
            <Typography variant="caption">Progress: {workerStatus.progress}%</Typography>
            {workerStatus.error && <Typography variant="caption" color="error.main">Error: {workerStatus.error}</Typography>}
          </Paper>
        )}

        {/* Rental Invoice Modal */}
        <Dialog open={showInvoiceModal} onClose={() => !generatingInvoices && setShowInvoiceModal(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Generate Rental Invoices</DialogTitle>
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
              toast.success('Rental invoices generated!');
            }}
          >
            <DialogContent>
              <TextField
                fullWidth
                label="Rental Amount per Asset"
                type="number"
                value={rentalAmount}
                onChange={e => setRentalAmount(Number(e.target.value))}
                inputProps={{ min: 0, step: 0.01 }}
                required
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                select
                label="Rental Period"
                value={rentalPeriod}
                onChange={e => setRentalPeriod(e.target.value)}
                SelectProps={{ native: true }}
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </TextField>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowInvoiceModal(false)} disabled={generatingInvoices}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={generatingInvoices}>{generatingInvoices ? 'Generating...' : 'Generate'}</Button>
            </DialogActions>
          </form>
        </Dialog>

        {skippedItems.length > 0 && (
          <Button variant="outlined" size="small" onClick={downloadSkippedItems} sx={{ mb: 2 }}>
            Download Skipped Items Debug CSV
          </Button>
        )}

        {/* Customer Import Report */}
        {customerImportReport && (
          <Card variant="outlined" sx={{ mb: 3, bgcolor: 'grey.50' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>Customer Import Report</Typography>
              <Typography variant="body2" color="success.main" component="div">
                <strong>Created ({customerImportReport.created.length}):</strong>
                {customerImportReport.created.length === 0 ? ' None' : (
                  <Box component="ul" sx={{ m: 0, pl: 2 }}>
                    {customerImportReport.created.map(c => (
                      <li key={c.CustomerListID}>{c.CustomerListID} – {c.name}</li>
                    ))}
                  </Box>
                )}
              </Typography>
              <Typography variant="body2" color="warning.dark" sx={{ mt: 1 }} component="div">
                <strong>Skipped ({customerImportReport.skipped.length}):</strong>
                {customerImportReport.skipped.length === 0 ? ' None' : (
                  <Box component="ul" sx={{ m: 0, pl: 2 }}>
                    {customerImportReport.skipped.map(c => (
                      <li key={c.CustomerListID}>{c.CustomerListID} – {c.name} <Box component="span" sx={{ fontStyle: 'italic' }}>({c.reason})</Box></li>
                    ))}
                  </Box>
                )}
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>
    );
} 