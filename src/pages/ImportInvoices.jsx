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
import { TableSkeleton } from '../components/SmoothLoading';

const REQUIRED_FIELDS = [
  { key: 'customer_id', label: 'Customer ID' },
  { key: 'customer_name', label: 'Customer Name' },
  { key: 'date', label: 'Date' },
  { key: 'product_code', label: 'Product Code' },
  { key: 'invoice_number', label: 'Invoice Number' },
  { key: 'qty_out', label: 'Qty Out' },
  { key: 'qty_in', label: 'Qty In' },
];

const OPTIONAL_FIELDS = [
  { key: 'description', label: 'Description', aliases: ['desc', 'itemdesc', 'linedesc'] },
  { key: 'rate', label: 'Rate', aliases: ['rate', 'unitprice'] },
  { key: 'amount', label: 'Amount', aliases: ['amount', 'lineamount', 'total'] },
  { key: 'serial_number', label: 'Serial Number', aliases: ['serialnumber', 'serial'] },
];

const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

const MAPPING_STORAGE_KEY = 'importInvoicesFieldMapping';

// Helper to get current user info from Supabase
async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// --- Fuzzy string similarity helper ---
function stringSimilarity(a, b) {
  // Lowercase, trim, remove extra spaces
  a = (a || '').toLowerCase().trim().replace(/\s+/g, ' ');
  b = (b || '').toLowerCase().trim().replace(/\s+/g, ' ');
  if (!a || !b) return 0;
  if (a === b) return 1;
  // Simple ratio of matching chars (not Levenshtein for speed)
  let matches = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] === b[i]) matches++;
  }
  return matches / Math.max(a.length, b.length);
}

const InvoiceImportWorker = () => new Worker(new URL('../workers/invoiceImportWorker.js', import.meta.url), { type: 'module' });

export default function ImportInvoices() {
  const [file, setFile] = useState(null);
  const [rawRows, setRawRows] = useState([]); // raw file rows
  const [columns, setColumns] = useState([]); // detected columns
  const [mapping, setMapping] = useState({}); // fieldKey -> columnName
  const [preview, setPreview] = useState([]); // mapped preview
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [rowStatuses, setRowStatuses] = useState([]); // For detailed preview
  const [previewChecked, setPreviewChecked] = useState(false);
  const [previewSummary, setPreviewSummary] = useState(null);
  const [progress, setProgress] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importErrors, setImportErrors] = useState([]);
  const [debugMode, setDebugMode] = useState(false);
  const [skippedItems, setSkippedItems] = useState([]);
  const [workerStatus, setWorkerStatus] = useState({ status: 'idle', progress: 0, error: null });

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
      // Only use if columns match
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
      // Try to load saved mapping
      const savedMapping = loadSavedMapping(detectedColumns);
      let autoMap = {};
      if (savedMapping) {
        autoMap = savedMapping;
      } else {
        // Try to auto-map by name or alias
        ALL_FIELDS.forEach(field => {
          const found = detectedColumns.find(col => {
            const normCol = col.toLowerCase().replace(/\s|_/g, '');
            if (normCol.includes(field.key.replace(/_/g, ''))) return true;
            if (field.aliases) return field.aliases.some(alias => normCol.includes(alias));
            return false;
          });
          if (found) autoMap[field.key] = found;
        });
      }
      setMapping(autoMap);
      setPreview(generatePreview(dataRows, detectedColumns, autoMap));
      // Automatically check preview after setting it
      setTimeout(() => {
        checkPreviewStatuses();
      }, 0);
    };
    if (ext === 'xls' || ext === 'xlsx') {
      // Excel file parsing
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
      // Text/CSV parsing
      const reader = new FileReader();
      reader.onload = evt => {
        const text = evt.target.result;
        const rows = text
          .split('\n')
          .map(line => line.split('\t'))
          .filter(row => row.length > 1 && row.some(cell => cell.trim() !== ''));
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
          mapped[field.key] = row[colIdx] || '';
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
    // Save to localStorage
    if (columns.length) {
      localStorage.setItem(MAPPING_STORAGE_KEY, JSON.stringify({ columns, mapping: newMapping }));
    }
  };

  // Reset mapping
  const handleResetMapping = () => {
    localStorage.removeItem(MAPPING_STORAGE_KEY);
    setMapping({});
    setPreview(generatePreview(rawRows, columns, {}));
  };

  // Helper to validate date format
  function isValidDate(dateStr) {
    // Accepts DD/MM/YYYY or YYYY-MM-DD
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

  // Helper to validate all rows before import
  function validateRows(previewRows, mappingObj) {
    const errors = [];
    previewRows.forEach((row, idx) => {
      ALL_FIELDS.forEach(field => {
        if (!mappingObj[field.key]) {
          errors.push({ row: idx, field: field.key, reason: 'Field not mapped' });
        } else if (!row[field.key] || row[field.key].toString().trim() === '') {
          errors.push({ row: idx, field: field.key, reason: 'Missing value' });
        }
      });
      // Date validation
      if (row.date && !isValidDate(row.date)) {
        errors.push({ row: idx, field: 'date', reason: 'Invalid date format' });
      }
      // Qty validation
      if (row.qty_out && isNaN(Number(row.qty_out))) {
        errors.push({ row: idx, field: 'qty_out', reason: 'Not a number' });
      }
      if (row.qty_in && isNaN(Number(row.qty_in))) {
        errors.push({ row: idx, field: 'qty_in', reason: 'Not a number' });
      }
    });
    return errors;
  }

  useEffect(() => {
    async function handleWorkerMessage(event) {
      const { type, batchId, rows: batchRows, start, result, progress, errors } = event.data;
      if (type === 'batch') {
        let batchErrors = [];
        try {
          // --- Bulk check for existing customers ---
          const customerIds = [...new Set(batchRows.map(row => row.customer_id).filter(Boolean))];
          const { data: existingCustomers = [] } = await supabase
            .from('customers')
            .select('CustomerListID')
            .in('CustomerListID', customerIds);
          const existingCustomerIds = new Set((existingCustomers || []).map(c => c.CustomerListID));
          // --- Bulk insert new customers ---
          const newCustomers = batchRows
            .filter(row => !existingCustomerIds.has(row.customer_id))
            .map(row => ({
              CustomerListID: row.customer_id,
              name: row.customer_name
            }));
          if (newCustomers.length) {
            const { error: custErr } = await supabase.from('customers').insert(newCustomers);
            if (custErr) batchErrors.push({ type: 'customer', error: custErr.message });
          }
          // --- Bulk check for existing invoices ---
          const invoiceNumbers = [...new Set(batchRows.map(row => row.invoice_number).filter(Boolean))];
          const { data: existingInvoices = [] } = await supabase
            .from('invoices')
            .select('id, details')
            .in('details', invoiceNumbers);
          const existingInvoiceMap = new Map((existingInvoices || []).map(inv => [inv.details, inv.id]));
          // --- Bulk insert new invoices ---
          const newInvoices = [];
          const invoiceNumberToId = {};
          for (const row of batchRows) {
            if (!existingInvoiceMap.has(row.invoice_number)) {
              let date = row.date;
              if (date && date.includes('/')) {
                const [day, month, year] = date.split('/');
                if (year && month && day) {
                  date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                }
              }
              newInvoices.push({
                customer_id: row.customer_id,
                invoice_date: date,
                details: row.invoice_number
              });
            }
          }
          if (newInvoices.length) {
            const { data: insertedInvoices = [], error: invErr } = await supabase
              .from('invoices')
              .insert(newInvoices)
              .select();
            if (invErr) batchErrors.push({ type: 'invoice', error: invErr.message });
            insertedInvoices.forEach(inv => {
              invoiceNumberToId[inv.details] = inv.id;
            });
          }
          // Merge all invoice IDs (existing + new)
          for (const inv of existingInvoices) {
            invoiceNumberToId[inv.details] = inv.id;
          }
          // --- Bulk check for existing line items ---
          const lineItemChecks = [];
          for (const row of batchRows) {
            const invoiceId = invoiceNumberToId[row.invoice_number];
            if (invoiceId && row.product_code) {
              lineItemChecks.push({ invoice_id: invoiceId, product_code: row.product_code });
            }
          }
          let existingLineItems = [];
          if (lineItemChecks.length) {
            const uniquePairs = Array.from(new Set(lineItemChecks.map(
              li => `${li.invoice_id}|${li.product_code}`
            ))).map(pair => {
              const [invoice_id, product_code] = pair.split('|');
              return { invoice_id, product_code };
            });
            for (let i = 0; i < uniquePairs.length; i += 200) {
              const batch = uniquePairs.slice(i, i + 200);
              const { data: batchItems = [] } = await supabase
                .from('invoice_line_items')
                .select('invoice_id, product_code')
                .in('invoice_id', batch.map(b => b.invoice_id))
                .in('product_code', batch.map(b => b.product_code));
              existingLineItems = existingLineItems.concat(batchItems);
            }
          }
          const existingLineItemSet = new Set(existingLineItems.map(
            li => `${li.invoice_id}|${li.product_code}`
          ));
          // --- Bulk insert new line items ---
          const { data: allCylinders = [] } = await supabase
            .from('cylinders')
            .select('product_code, description');
          const newLineItems = [];
          const cylinderMap = new Map((allCylinders || []).map(c => [c.product_code.trim().toLowerCase(), c]));
          for (const row of batchRows) {
            const invoiceId = invoiceNumberToId[row.invoice_number];
            if (!invoiceId) continue;
            let cylinder = cylinderMap.get(row.product_code.trim().toLowerCase());
            let matchType = 'product_code';
            let fuzzyInfo = null;
            if (!cylinder && row.description) {
              let bestScore = 0;
              let bestCyl = null;
              for (const cyl of allCylinders) {
                const score = stringSimilarity(row.description, cyl.description);
                if (score > bestScore) {
                  bestScore = score;
                  bestCyl = cyl;
                }
              }
              if (bestScore >= 0.8 && bestCyl) {
                cylinder = bestCyl;
                matchType = 'fuzzy_description';
                fuzzyInfo = { bestScore, bestCylDesc: bestCyl.description };
              }
            }
            if (!cylinder) {
              batchErrors.push({ type: 'line_item', error: 'Not a cylinder', row });
              continue;
            }
            const key = `${invoiceId}|${cylinder.product_code}`;
            if (existingLineItemSet.has(key)) {
              batchErrors.push({ type: 'line_item', error: 'Duplicate line item', row });
              continue;
            }
            newLineItems.push({
              invoice_id: invoiceId,
              product_code: cylinder.product_code,
              qty_out: parseInt(row.qty_out, 10) || 0,
              qty_in: parseInt(row.qty_in, 10) || 0,
              description: row.description || null,
              rate: row.rate ? parseFloat(row.rate) : null,
              amount: row.amount ? parseFloat(row.amount) : null,
              serial_number: row.serial_number || null,
              matchType,
              fuzzyInfo: fuzzyInfo ? JSON.stringify(fuzzyInfo) : null
            });
          }
          if (newLineItems.length) {
            const { error: liErr } = await supabase.from('invoice_line_items').insert(newLineItems);
            if (liErr) batchErrors.push({ type: 'line_item', error: liErr.message });
          }
        } catch (err) {
          batchErrors.push({ type: 'batch', error: err.message });
        }
        worker.postMessage({ type: 'batchResult', data: { batchId, nextIndex: start + batchRows.length, errors: batchErrors } });
        setImportProgress(Math.round(((start + batchRows.length) / preview.length) * 100));
      } else if (type === 'done') {
        setImporting(false);
        setImportErrors(result.errors || []);
        setImportProgress(100);
        alert('Import complete!');
      } else if (type === 'progress') {
        setImportProgress(progress);
      }
    }
    addImportWorkerListener(handleWorkerMessage);
    return () => removeImportWorkerListener(handleWorkerMessage);
  }, []);

  const handleImport = async e => {
    if (e) e.preventDefault();
    setImporting(true);
    setImportProgress(0);
    setImportErrors([]);
    // Prepare data for worker
    const worker = getImportWorker();
    worker.postMessage({
      type: 'start',
      data: {
        rows: preview,
        mapping,
        columns,
        allFields: ALL_FIELDS,
        batchSize: 100
      }
    });
  };

  function downloadCSV(rows) {
    if (!rows.length) return;
    const header = Object.keys(rows[0]).join(',');
    const csv = [
      header,
      ...rows.map(row => Object.values(row).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'skipped_rows.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Track validation errors for highlighting
  const [validationErrors, setValidationErrors] = useState([]);

  // Check existence for each row in preview
  async function checkPreviewStatuses() {
    setLoading(true);
    setError(null);
    setPreviewChecked(false);
    const statuses = [];
    let customersCreated = 0, customersExisting = 0;
    let invoicesCreated = 0, invoicesExisting = 0;
    let lineItemsCreated = 0, lineItemsSkipped = 0;
    for (let i = 0; i < preview.length; i++) {
      const row = preview[i];
      let customerStatus = 'New';
      let invoiceStatus = 'New';
      let lineItemStatus = 'New';
      // Check customer
      let { data: customer } = await supabase
        .from('customers')
        .select('CustomerListID')
        .eq('CustomerListID', row.customer_id)
        .single();
      if (customer) {
        customerStatus = 'Existing';
        customersExisting++;
      } else {
        customersCreated++;
      }
      // Check invoice
      let { data: invoice } = await supabase
        .from('invoices')
        .select('id')
        .eq('details', row.invoice_number)
        .single();
      if (invoice) {
        invoiceStatus = 'Existing';
        invoicesExisting++;
      } else {
        invoicesCreated++;
      }
      // Check line item (only if product_code exists in cylinders, case-insensitive, trimmed)
      const { data: cylinder } = await supabase
        .from('cylinders')
        .select('product_code')
        .ilike('product_code', (row.product_code || '').trim())
        .single();
      if (!cylinder) {
        lineItemStatus = 'Skipped (Not a cylinder)';
        lineItemsSkipped++;
      } else if (invoice) {
        // Check for duplicate line item
        const { data: existingLineItem } = await supabase
          .from('invoice_line_items')
          .select('id')
          .eq('invoice_id', invoice.id)
          .ilike('product_code', (row.product_code || '').trim())
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
      statuses.push({ customerStatus, invoiceStatus, lineItemStatus });
    }
    setRowStatuses(statuses);
    setPreviewSummary({ customersCreated, customersExisting, invoicesCreated, invoicesExisting, lineItemsCreated, lineItemsSkipped });
    setPreviewChecked(true);
    setLoading(false);
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

  function downloadSkippedItems() {
    const csv = Papa.unparse(skippedItems);
    const blob = new Blob([csv], { type: 'text/csv' });
    saveAs(blob, 'skipped_items_debug.csv');
  }

  return (
    <div className="max-w-4xl mx-auto mt-10 bg-gradient-to-br from-white via-blue-50 to-blue-100 shadow-2xl rounded-2xl p-8 border border-blue-100">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-extrabold text-blue-900 tracking-tight">Import Invoices Only</h2>
        <button
          onClick={() => navigate(-1)}
          className="bg-gradient-to-r from-gray-400 to-gray-300 text-white px-6 py-2 rounded-lg shadow-md hover:from-gray-500 hover:to-gray-400 font-semibold transition"
        >
          Back
        </button>
      </div>
      <form onSubmit={handleImport} className="mb-6 flex gap-2 items-end">
        <input type="file" accept=".txt,.csv,.xlsx,.xls" onChange={handleFileChange} className="border p-2 rounded w-full" />
        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg shadow-md hover:bg-blue-700 font-semibold transition" disabled={!file || !preview.length || loading || !previewChecked || validationErrors.length > 0 || importing}>{loading ? 'Importing...' : 'Import'}</button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ALL_FIELDS.map(field => (
              <div key={field.key} className="flex items-center gap-2">
                <label className="w-40 font-medium text-blue-900">{field.label}{REQUIRED_FIELDS.find(f => f.key === field.key) ? '' : ' (optional)'}</label>
                <select
                  className="border p-2 rounded w-full"
                  value={mapping[field.key] || ''}
                  onChange={e => handleMappingChange(field.key, e.target.value)}
                >
                  <option value="">-- Not Mapped --</option>
                  {columns.map(col => (
                    <option key={col} value={col}>{col}</option>
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
                  {ALL_FIELDS.map(field => <th key={field.key} className="border px-2 py-1 text-xs uppercase">{field.label}</th>)}
                  <th className="border px-2 py-1 text-xs uppercase">Customer</th>
                  <th className="border px-2 py-1 text-xs uppercase">Invoice</th>
                  <th className="border px-2 py-1 text-xs uppercase">Line Item</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 5).map((row, i) => {
                  // Find errors for this row
                  const rowErrors = validationErrors.filter(e => e.row === i);
                  const status = rowStatuses[i] || {};
                  return (
                    <tr key={i} className={rowErrors.length ? 'bg-red-100' : ''}>
                      {ALL_FIELDS.map(field => {
                        const cellError = rowErrors.find(e => e.field === field.key);
                        return (
                          <td key={field.key} className={`border px-2 py-1 text-xs ${cellError ? 'bg-red-200 text-red-800 font-bold' : ''}`}>{row[field.key] || ''}</td>
                        );
                      })}
                      <td className="border px-2 py-1 text-xs">{status.customerStatus || ''}</td>
                      <td className="border px-2 py-1 text-xs">{status.invoiceStatus || ''}</td>
                      <td className="border px-2 py-1 text-xs">{status.lineItemStatus || ''}</td>
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
          <div>Invoices to create: {previewSummary.invoicesCreated}, already exist: {previewSummary.invoicesExisting}</div>
          <div>Line items to import: {previewSummary.lineItemsCreated}, skipped: {previewSummary.lineItemsSkipped}</div>
        </div>
      )}
      {result && (
        <div className="bg-green-100 text-green-800 p-4 rounded space-y-1">
          <div>Import finished!</div>
          <div>Customers created: {result.customersCreated}, already existed: {result.customersExisting}</div>
          <div>Invoices created: {result.invoicesCreated}, already existed: {result.invoicesExisting}</div>
          <div>Line items imported: {result.lineItemsCreated}, skipped: {result.lineItemsSkipped}</div>
          <div>Total imported: {result.imported}, Errors: {result.errors}</div>
          {result.skippedRows && result.skippedRows.length > 0 && (
            <div className="mb-2">
              <button
                className="bg-gray-200 text-gray-800 px-3 py-1 rounded shadow hover:bg-gray-300 text-xs font-semibold mb-2"
                onClick={() => downloadCSV(result.skippedRows)}
              >
                Download Skipped Rows as CSV
              </button>
              <div className="text-xs text-red-700">
                <b>Unmatched Descriptions (first 10):</b>
                <ul>
                  {result.skippedRows.slice(0, 10).map((row, i) => (
                    <li key={i}>{row.unmatched_description}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
      {loading && (
        <div className="w-full mb-4">
          <TableSkeleton rows={5} columns={ALL_FIELDS.length + 3} />
        </div>
      )}
      {importing && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow-lg z-50">
          Import in progress... You can navigate to another page. Import will continue in the background.<br />
          Progress: {importProgress}%
          {importErrors.length > 0 && <div className="text-red-200 mt-2">Errors: {importErrors.length}</div>}
        </div>
      )}
      {debugMode && (
        <div className="fixed bottom-0 right-0 bg-white border p-2 z-50">
          <div>Status: {workerStatus.status}</div>
          <div>Progress: {workerStatus.progress}%</div>
          {workerStatus.error && <div className="text-red-500">Error: {workerStatus.error}</div>}
        </div>
      )}
      {skippedItems.length > 0 && (
        <button onClick={downloadSkippedItems} className="bg-gray-200 text-gray-800 px-3 py-1 rounded shadow hover:bg-gray-300 text-xs font-semibold mb-2">Download Skipped Items Debug CSV</button>
      )}
    </div>
  );
} 