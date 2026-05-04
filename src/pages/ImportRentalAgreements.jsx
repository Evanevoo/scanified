import logger from '../utils/logger';
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase/client';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  TextField,
  LinearProgress,
  Chip,
  Grid,
  Card,
  CardContent,
  Stack,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CloudUpload as CloudUploadIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { findCustomer, batchFindCustomers } from '../utils/customerMatching';
import { useAuth } from '../hooks/useAuth';

// TrackAbout Expiring Asset Agreements — column aliases for auto-mapping
const FIELD_DEFINITIONS = [
  { key: 'end_date', label: 'End Date', aliases: ['end date', 'enddate', 'expiration', 'expiry'] },
  { key: 'customer', label: 'Customer', aliases: ['customer', 'customer name', 'customername', 'company'] },
  { key: 'agreement_number', label: 'Agreement Number', aliases: ['agreement number', 'agreementnumber', 'agreement #', 'agreement no'] },
  { key: 'this_agreement', label: 'This Agreement (#)', aliases: ['this agreement', 'this agreement #', 'agreement items', 'items on agreement'] },
  { key: 'bottle_count', label: '# Bottles', aliases: ['# bottles', 'bottles', 'bottle count', 'items', 'item count', 'qty', 'quantity', 'number of bottles'] },
  { key: 'duration_months', label: 'Duration (Months)', aliases: ['duration (months)', 'duration', 'duration months', 'term', 'months'] },
  { key: 'assets_on_agreement', label: 'Assets on Agreement', aliases: ['assets on agreement', 'assets', 'asset type', 'asset type description'] },
  { key: 'price_per_asset', label: 'Price Per Asset', aliases: ['price per asset', 'price/asset', 'per asset price', 'asset price'] },
  { key: 'total_cost', label: 'Total Cost', aliases: ['total cost', 'totalcost', 'total', 'cost', 'amount', 'agreement amount', 'this agreement amount'] },
  { key: 'rent_balance', label: 'Rent Balance', aliases: ['rent balance', 'rentbalance', 'rent balance (number covered by agreements)', 'assets covered'] },
];

const MAPPING_STORAGE_KEY = 'importRentalAgreementFieldMapping';

function normalizeMappingHeader(h) {
  return String(h ?? '')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Map a saved column label to the current file’s header cell (exact or normalized match). */
function resolveColumnNameToCurrent(savedColName, detectedColumns) {
  if (!savedColName || !Array.isArray(detectedColumns) || !detectedColumns.length) return null;
  const trimmed = String(savedColName).trim();
  if (detectedColumns.includes(trimmed)) return trimmed;
  const normSaved = normalizeMappingHeader(trimmed);
  const byNorm = new Map();
  for (const c of detectedColumns) {
    const n = normalizeMappingHeader(c);
    if (!byNorm.has(n)) byNorm.set(n, c);
  }
  return byNorm.get(normSaved) || null;
}

function readSavedMappingPayload() {
  try {
    const raw = localStorage.getItem(MAPPING_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function findFirstColumnByPatterns(detectedColumns, patterns = []) {
  return detectedColumns.find((col) => {
    const normalized = String(col || '').toLowerCase().trim();
    return patterns.some((pattern) => pattern.test(normalized));
  });
}

function normalizeTrackAboutMapping(mapping, detectedColumns) {
  const next = { ...(mapping || {}) };
  const thisAgreementCol = findFirstColumnByPatterns(detectedColumns, [/\bthis\s+agreement\b/i]);
  const totalCostCol = findFirstColumnByPatterns(detectedColumns, [/\btotal\s+cost\b/i]);
  const pricePerAssetCol = findFirstColumnByPatterns(detectedColumns, [/\bprice\s*per\s*asset\b/i, /\bper\s*asset\s*price\b/i]);

  // Restore legacy/intended TrackAbout mapping behavior.
  if (thisAgreementCol) {
    next.this_agreement = thisAgreementCol;
    if (!next.bottle_count) next.bottle_count = thisAgreementCol;
  }
  if (totalCostCol) {
    next.total_cost = totalCostCol;
  }
  if (pricePerAssetCol && !next.price_per_asset) {
    next.price_per_asset = pricePerAssetCol;
  }

  return next;
}

function buildLeaseImportAutoMap(detectedColumns) {
  const autoMap = {};
  FIELD_DEFINITIONS.forEach((field) => {
    let found = detectedColumns.find((col) => {
      const n = col.toLowerCase().trim();
      if (n === field.key.toLowerCase()) return true;
      if (field.aliases?.some((a) => n === a.toLowerCase())) return true;
      if (n.includes(field.key.replace(/_/g, ' ')) || field.aliases?.some((a) => n.includes(a))) return true;
      return false;
    });
    if (!found && field.key === 'customer') {
      found = detectedColumns.find((c) => c.toLowerCase().includes('customer') && !c.toLowerCase().includes('id'));
    }
    if (!found && field.key === 'end_date') {
      found = detectedColumns.find((c) => c.toLowerCase().includes('end') && c.toLowerCase().includes('date'));
    }
    if (!found && field.key === 'agreement_number') {
      found = detectedColumns.find((c) => c.toLowerCase().includes('agreement') && (c.toLowerCase().includes('number') || c.toLowerCase().includes('#')));
    }
    if (!found && field.key === 'total_cost') {
      found = detectedColumns.find((c) => c.toLowerCase().includes('total') && c.toLowerCase().includes('cost'));
    }
    if (!found && field.key === 'rent_balance') {
      found = detectedColumns.find((c) => c.toLowerCase().includes('rent') && c.toLowerCase().includes('balance'));
    }
    if (found) autoMap[field.key] = found;
  });
  return autoMap;
}

/** Parse "Name (ID)" from TrackAbout Customer column */
function parseCustomerColumn(val) {
  if (!val || typeof val !== 'string') return { customer_name: '', customer_id: '' };
  const trimmed = val.trim();
  const match = trimmed.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (match) {
    return { customer_name: match[1].trim(), customer_id: match[2].trim() };
  }
  return { customer_name: trimmed, customer_id: '' };
}

/** Excel serial date: days since 1900-01-01 (epoch 25569 = 1970-01-01) → YYYY-MM-DD */
function excelSerialToDate(serial) {
  const n = typeof serial === 'number' ? serial : parseFloat(serial);
  if (Number.isNaN(n) || n < 1) return null;
  const utcMs = (n - 25569) * 86400 * 1000;
  const d = new Date(utcMs);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Parse US-style date M/D/YYYY or M-D-YYYY, or Excel serial number, to YYYY-MM-DD */
function parseEndDate(dateStr) {
  if (dateStr == null || dateStr === '') return null;
  if (typeof dateStr === 'number' || (typeof dateStr === 'string' && /^\d+(\.\d+)?$/.test(dateStr.trim()))) {
    return excelSerialToDate(dateStr);
  }
  const s = String(dateStr).trim();
  let parts;
  if (s.includes('/')) parts = s.split('/');
  else if (s.includes('-')) parts = s.split('-');
  else return null;
  if (parts.length !== 3) return null;
  let m, d, y;
  if (parts[0].length <= 2 && parts[1].length <= 2 && parts[2].length === 4) {
    m = parseInt(parts[0], 10);
    d = parseInt(parts[1], 10);
    y = parseInt(parts[2], 10);
  } else return null;
  if (Number.isNaN(m) || Number.isNaN(d) || Number.isNaN(y)) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Parse currency to number */
function parseTotalCost(val) {
  if (val == null || val === '') return null;
  const s = String(val).replace(/[$,]/g, '').trim();
  const n = parseFloat(s);
  return Number.isNaN(n) ? null : n;
}

function parseTotalCostWithFallback(row, detectedColumns, mappingObj) {
  const mappedTotalCostColumn = mappingObj?.total_cost;
  const mappedTotalCostIdx = mappedTotalCostColumn ? detectedColumns.indexOf(mappedTotalCostColumn) : -1;
  const mappedRaw = mappedTotalCostIdx >= 0 ? row[mappedTotalCostIdx] : null;
  const direct = parseTotalCost(mappedRaw);
  if (direct != null) return direct;

  const fallbackIndices = [];
  if (mappedTotalCostIdx >= 0) {
    fallbackIndices.push(mappedTotalCostIdx + 1);
  }

  detectedColumns.forEach((col, idx) => {
    const normalized = String(col || '').toLowerCase();
    if (normalized.includes('total') && normalized.includes('cost')) fallbackIndices.push(idx);
    if (normalized.includes('this agreement')) fallbackIndices.push(idx);
    if (normalized.includes('agreement amount')) fallbackIndices.push(idx);
    if (normalized.includes('amount') && !normalized.includes('rent balance')) fallbackIndices.push(idx);
  });

  const visited = new Set();
  for (const idx of fallbackIndices) {
    if (idx < 0 || idx >= row.length || visited.has(idx)) continue;
    visited.add(idx);
    const value = row[idx];
    const parsed = parseTotalCost(value);
    if (parsed != null) return parsed;

    const maybeCurrencyOnly = String(value ?? '').trim();
    if (maybeCurrencyOnly === '$' || maybeCurrencyOnly.toLowerCase() === 'usd') {
      const adjacent = parseTotalCost(row[idx + 1]);
      if (adjacent != null) return adjacent;
    }
  }

  return null;
}

function parsePositiveIntFromUnknown(value) {
  if (value == null) return null;
  const asString = String(value).trim();
  if (!asString) return null;
  const match = asString.match(/\d+/);
  if (!match) return null;
  const parsed = Number.parseInt(match[0], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseBottleCountWithFallback(row, detectedColumns, mappingObj, mapped = {}) {
  const explicitCandidates = [
    mapped.this_agreement,
    mapped.bottle_count,
    mapped.rent_balance,
  ];
  for (const candidate of explicitCandidates) {
    const parsed = parsePositiveIntFromUnknown(candidate);
    if (parsed != null) return parsed;
  }

  const preferredIndices = [];
  const headerPatterns = [
    /\bthis\s+agreement\b/i,
    /#\s*bottles?/i,
    /\bbottles?\b/i,
    /\bitems?\b/i,
    /\bqty\b/i,
    /\bquantity\b/i,
    /\bassets?\s+covered\b/i,
    /\brent\s+balance\b/i,
  ];

  detectedColumns.forEach((col, idx) => {
    const name = String(col || '');
    if (headerPatterns.some((pattern) => pattern.test(name))) {
      preferredIndices.push(idx);
    }
  });

  const totalCostColumn = mappingObj?.total_cost;
  if (totalCostColumn) {
    const totalCostIdx = detectedColumns.indexOf(totalCostColumn);
    if (totalCostIdx >= 0) {
      const thisAgreementIdx = detectedColumns.findIndex((col) => /\bthis\s+agreement\b/i.test(String(col || '')));
      if (thisAgreementIdx >= 0 && thisAgreementIdx !== totalCostIdx) {
        preferredIndices.unshift(thisAgreementIdx);
      }
    }
  }

  const visited = new Set();
  for (const idx of preferredIndices) {
    if (idx < 0 || idx >= row.length || visited.has(idx)) continue;
    visited.add(idx);
    const parsed = parsePositiveIntFromUnknown(row[idx]);
    if (parsed != null) return parsed;
  }

  return 1;
}

/** Derive start_date from end_date and duration_months */
function deriveStartDate(endDateStr, durationMonths) {
  if (!endDateStr) return null;
  const end = new Date(endDateStr);
  if (Number.isNaN(end.getTime())) return null;
  const months = parseInt(durationMonths, 10) || 12;
  const start = new Date(end);
  start.setMonth(start.getMonth() - months);
  return start.toISOString().split('T')[0];
}

function isHeaderRow(row) {
  return row.every((cell) => typeof cell === 'string' && cell.length > 0 && !/^\d+$/.test(cell));
}

function normalizeHeaderCell(cell) {
  return String(cell ?? '')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function mergeHeaderRowsIfNeeded(rows) {
  if (!Array.isArray(rows) || rows.length < 2) return rows;
  const first = rows[0] || [];
  const second = rows[1] || [];
  const secondHasText = second.some((cell) => String(cell ?? '').trim() !== '');
  if (!isHeaderRow(first) || !secondHasText) return rows;

  // If second row looks like header continuation (e.g. "Number", "(Months)", "on Agreement"), merge it.
  const dataHintRow = rows[2] || [];
  const dataHintLooksLikeData = dataHintRow.some((cell) => /\d{1,2}\/\d{1,2}\/\d{4}/.test(String(cell ?? '')) || /^L\d+/i.test(String(cell ?? '').trim()));
  const continuationTokens = ['number', '(months)', 'months', 'on agreement', 'cost', 'balance', 'covered by agreements'];
  const continuationScore = second.reduce((score, cell) => {
    const s = String(cell ?? '').toLowerCase().trim();
    if (!s) return score;
    return score + (continuationTokens.some((t) => s.includes(t)) ? 1 : 0);
  }, 0);

  if (continuationScore < 1 && !dataHintLooksLikeData) return rows;

  const maxLen = Math.max(first.length, second.length);
  const merged = Array.from({ length: maxLen }, (_, i) => {
    const a = normalizeHeaderCell(first[i]);
    const b = normalizeHeaderCell(second[i]);
    return normalizeHeaderCell([a, b].filter(Boolean).join(' ')) || `Column ${i + 1}`;
  });
  return [merged, ...rows.slice(2)];
}

function isLikelyHeaderLikeDataRow(row) {
  const rowText = row.map((c) => String(c ?? '').toLowerCase().trim()).filter(Boolean);
  if (rowText.length === 0) return true;
  const headerTokens = ['end date', 'customer', 'agreement', 'agreement number', 'number', 'duration', 'assets', 'total cost', 'rent balance'];
  const tokenHits = rowText.filter((cell) => headerTokens.some((t) => cell === t || cell.includes(t))).length;
  const hasRealAgreementNumber = rowText.some((cell) => /^l\d+/i.test(cell));
  const hasDateValue = rowText.some((cell) => /^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(cell) || /^\d{4}-\d{2}-\d{2}$/.test(cell));
  if (hasRealAgreementNumber || hasDateValue) return false;
  return tokenHits >= Math.max(1, Math.floor(rowText.length / 2));
}

function detectDelimiterFromText(text) {
  const firstNonEmptyLine = (text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0) || '';
  const commaCount = (firstNonEmptyLine.match(/,/g) || []).length;
  const tabCount = (firstNonEmptyLine.match(/\t/g) || []).length;
  return tabCount >= commaCount ? '\t' : ',';
}

function parseDelimitedText(text, delimiter) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && ch === delimiter) {
      row.push(cell.trim());
      cell = '';
      continue;
    }

    if (!inQuotes && (ch === '\n' || ch === '\r')) {
      if (ch === '\r' && next === '\n') i += 1;
      row.push(cell.trim());
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += ch;
  }

  row.push(cell.trim());
  if (row.some((c) => c !== '')) rows.push(row);
  return rows;
}

function filterImportRows(previewRows) {
  return previewRows.filter((row) => {
    const keyFields = [
      row.end_date,
      row.customer,
      row.agreement_number,
      row.duration_months,
      row.assets_on_agreement,
      row.total_cost,
      row.rent_balance,
    ];
    return keyFields.some((value) => String(value ?? '').trim() !== '');
  });
}

export default function ImportRentalAgreements() {
  const navigate = useNavigate();
  const { organization, profile } = useAuth();
  const [file, setFile] = useState(null);
  const [rawRows, setRawRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [mapping, setMapping] = useState({});
  const [preview, setPreview] = useState([]);
  const [assignments, setAssignments] = useState({}); // rowIndex -> { id, name, CustomerListID }
  const [customerMatchMap, setCustomerMatchMap] = useState({}); // key -> found customer or null
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [matching, setMatching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [error, setError] = useState(null);

  const loadSavedMapping = useCallback((detectedColumns) => {
    const parsed = readSavedMappingPayload();
    if (!parsed?.mapping || !Array.isArray(detectedColumns) || !detectedColumns.length) return null;

    // Exact header row match (legacy behavior).
    if (parsed.columns && JSON.stringify(parsed.columns) === JSON.stringify(detectedColumns)) {
      return parsed.mapping;
    }

    // Flexible restore: reuse any saved picks where the column still exists (or normalizes the same).
    const merged = {};
    for (const [fieldKey, savedCol] of Object.entries(parsed.mapping)) {
      if (!savedCol) continue;
      const resolved = resolveColumnNameToCurrent(savedCol, detectedColumns);
      if (resolved) merged[fieldKey] = resolved;
    }
    return Object.keys(merged).length ? merged : null;
  }, []);

  const generatePreview = useCallback((dataRows, detectedColumns, mappingObj) => {
    return dataRows.map((row) => {
      const mapped = {};
      FIELD_DEFINITIONS.forEach((field) => {
        const colName = mappingObj[field.key];
        const colIdx = colName ? detectedColumns.indexOf(colName) : -1;
        let value = colIdx >= 0 ? (row[colIdx] ?? '') : '';
        if (typeof value !== 'string') value = String(value ?? '');
        mapped[field.key] = value.trim();
      });
      if (mapped.customer) {
        const { customer_name, customer_id } = parseCustomerColumn(mapped.customer);
        mapped.customer_name = customer_name;
        mapped.customer_id = customer_id;
      } else {
        mapped.customer_name = '';
        mapped.customer_id = '';
      }
      mapped.end_date_parsed = parseEndDate(mapped.end_date);
      mapped.price_per_asset_parsed = parseTotalCost(mapped.price_per_asset);
      mapped.total_cost_parsed = parseTotalCostWithFallback(row, detectedColumns, mappingObj);
      mapped.bottle_count_parsed = parseBottleCountWithFallback(row, detectedColumns, mappingObj, mapped);
      mapped.start_date_parsed = deriveStartDate(
        mapped.end_date_parsed,
        mapped.duration_months
      );
      return mapped;
    });
  }, []);

  const processFile = useCallback(
    (uploadedFile) => {
      if (!uploadedFile) return;
      const ext = uploadedFile.name.split('.').pop().toLowerCase();
      if (!['csv', 'txt', 'xls', 'xlsx'].includes(ext)) {
        toast.error('Please upload a .csv, .txt, .xls, or .xlsx file');
        return;
      }
      setFile(uploadedFile);
      setError(null);
      setPreview([]);
      setAssignments({});
      setCustomerMatchMap({});

      const processRows = (rows) => {
        if (!rows.length) return;
        const normalizedRows = mergeHeaderRowsIfNeeded(rows);
        let detectedColumns = [];
        let dataRows = normalizedRows;
        if (isHeaderRow(normalizedRows[0])) {
          detectedColumns = normalizedRows[0].map((col, i) => normalizeHeaderCell(col) || `Column ${i + 1}`);
          dataRows = normalizedRows.slice(1);
        } else {
          detectedColumns = normalizedRows[0].map((_, i) => `Column ${i + 1}`);
        }
        dataRows = dataRows.filter((row) => !isLikelyHeaderLikeDataRow(row));
        setRawRows(dataRows);
        setColumns(detectedColumns);

        const saved = loadSavedMapping(detectedColumns);
        const autoMap = buildLeaseImportAutoMap(detectedColumns);
        const finalMapping = normalizeTrackAboutMapping({ ...autoMap, ...(saved || {}) }, detectedColumns);
        setMapping(finalMapping);
        const generatedPreview = generatePreview(dataRows, detectedColumns, finalMapping);
        setPreview(filterImportRows(generatedPreview));
        if (detectedColumns.length) {
          localStorage.setItem(MAPPING_STORAGE_KEY, JSON.stringify({ columns: detectedColumns, mapping: finalMapping }));
        }
      };

      if (ext === 'xls' || ext === 'xlsx') {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const data = new Uint8Array(evt.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
          processRows(rows);
        };
        reader.readAsArrayBuffer(uploadedFile);
      } else {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const text = String(evt.target.result || '');
          let rows = [];
          try {
            // Use SheetJS parser for CSV/TXT too; it is more resilient to quoted fields/newlines.
            const workbook = XLSX.read(text, { type: 'string' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
          } catch (parseErr) {
            logger.warn('SheetJS text parse failed, falling back to manual parser', parseErr);
          }

          if (!rows.length || rows.length === 1) {
            const delimiter = detectDelimiterFromText(text);
            rows = parseDelimitedText(text, delimiter);
          }

          processRows(rows);
        };
        reader.readAsText(uploadedFile);
      }
    },
    [loadSavedMapping, generatePreview]
  );

  useEffect(() => {
    if (!organization?.id) return;
    let cancelled = false;
    (async () => {
      const { data, error: err } = await supabase
        .from('customers')
        .select('id, name, CustomerListID')
        .eq('organization_id', organization.id)
        .order('name');
      if (!cancelled && !err) setCustomers(data || []);
    })();
    return () => { cancelled = true; };
  }, [organization?.id]);

  const runCustomerMatching = useCallback(async () => {
    if (!organization?.id || !preview.length) return;
    setMatching(true);
    setError(null);
    try {
      const toFind = preview.map((row) => ({
        CustomerListID: row.customer_id || '',
        name: row.customer_name || '',
      }));
      const map = await batchFindCustomers(toFind, organization.id);
      setCustomerMatchMap(map);
      setAssignments((prev) => {
        const next = { ...prev };
        preview.forEach((row, idx) => {
          const key = `${row.customer_id || ''}_${row.customer_name || ''}`;
          const found = map[key];
          if (found) {
            const full = customers.find(
              (c) =>
                (c.CustomerListID && c.CustomerListID === found.CustomerListID) ||
                (c.name && c.name.toLowerCase().trim() === (found.name || '').toLowerCase().trim())
            );
            if (full) {
              next[idx] = { id: full.id, name: full.name, CustomerListID: full.CustomerListID };
            }
          }
        });
        return next;
      });
    } catch (err) {
      logger.error('Customer matching error:', err);
      setError(err.message || 'Failed to match customers');
    } finally {
      setMatching(false);
    }
  }, [organization?.id, preview, customers]);

  useEffect(() => {
    if (
      preview.length > 0 &&
      organization?.id &&
      customers.length > 0 &&
      Object.keys(customerMatchMap).length === 0 &&
      !matching
    ) {
      runCustomerMatching();
    }
  }, [preview.length, organization?.id, customers.length, customerMatchMap, matching, runCustomerMatching]);

  const handleMappingChange = (fieldKey, colName) => {
    const newMapping = { ...mapping, [fieldKey]: colName || undefined };
    if (!colName) delete newMapping[fieldKey];
    setMapping(newMapping);
    const generatedPreview = generatePreview(rawRows, columns, newMapping);
    setPreview(filterImportRows(generatedPreview));
    setAssignments({});
    setCustomerMatchMap({});
    if (columns.length) {
      localStorage.setItem(MAPPING_STORAGE_KEY, JSON.stringify({ columns, mapping: newMapping }));
    }
  };

  const handleRestoreSavedMapping = useCallback(() => {
    if (!columns.length || !rawRows.length) {
      toast.error('Upload the file first, then restore saved mapping.');
      return;
    }
    const saved = loadSavedMapping(columns);
    if (!saved || !Object.keys(saved).length) {
      toast.error('No saved mapping found, or none of the saved columns match this file’s headers.');
      return;
    }
    const autoMap = buildLeaseImportAutoMap(columns);
    const finalMapping = normalizeTrackAboutMapping({ ...autoMap, ...saved }, columns);
    setMapping(finalMapping);
    setPreview(filterImportRows(generatePreview(rawRows, columns, finalMapping)));
    setAssignments({});
    setCustomerMatchMap({});
    localStorage.setItem(MAPPING_STORAGE_KEY, JSON.stringify({ columns, mapping: finalMapping }));
    toast.success('Restored saved column mapping.');
  }, [columns, rawRows, loadSavedMapping, generatePreview]);

  const handleAssignCustomer = (rowIndex, customer) => {
    if (!customer) {
      setAssignments((prev) => {
        const next = { ...prev };
        delete next[rowIndex];
        return next;
      });
      return;
    }
    setAssignments((prev) => ({
      ...prev,
      [rowIndex]: {
        id: customer.id,
        name: customer.name,
        CustomerListID: customer.CustomerListID,
      },
    }));
  };

  const resolveAssignedCustomerOption = (assigned) => {
    if (!assigned) return null;
    return (
      customers.find((opt) =>
        (assigned.id && opt.id === assigned.id)
        || (assigned.CustomerListID && opt.CustomerListID === assigned.CustomerListID)
      ) || null
    );
  };

  const unmatchedCount = preview.filter((_, idx) => !assignments[idx]).length;
  const rowsMissingRequiredFields = preview.filter((row) => !row.agreement_number || !row.end_date_parsed).length;
  const importableRows = preview.filter((row, idx) => {
    return Boolean(assignments[idx] && row.agreement_number && row.end_date_parsed);
  });
  const skippedRowsCount = preview.length - importableRows.length;
  const canImport = importableRows.length > 0;

  const handleImport = useCallback(async () => {
    if (!canImport || !organization?.id || !profile?.id) return;
    setImporting(true);
    setError(null);
    setImportProgress(0);
    const rowsToImport = preview
      .map((row, idx) => ({ row, idx }))
      .filter(({ row, idx }) => Boolean(assignments[idx] && row.agreement_number && row.end_date_parsed));
    const total = rowsToImport.length;
    let done = 0;
    let failed = 0;
    let rentalsSyncUnavailable = false;
    try {
      for (const entry of rowsToImport) {
        const row = entry.row;
        const rowIndex = entry.idx;
        const assigned = assignments[rowIndex];
        const endDate = row.end_date_parsed || row.end_date;
        const startDate = row.start_date_parsed || deriveStartDate(endDate, row.duration_months);
        const bottleCount = Number.isFinite(row.bottle_count_parsed) && row.bottle_count_parsed > 0
          ? row.bottle_count_parsed
          : 1;
        const totalAgreementAmount = row.total_cost_parsed != null ? row.total_cost_parsed : 0;
        const inferredFromUnitPrice = (row.price_per_asset_parsed != null && row.price_per_asset_parsed > 0 && totalAgreementAmount > 0)
          ? Math.round(totalAgreementAmount / row.price_per_asset_parsed)
          : null;
        const effectiveBottleCount = Number.isFinite(inferredFromUnitPrice) && inferredFromUnitPrice > 0
          ? inferredFromUnitPrice
          : bottleCount;
        // LeaseAgreements treats customer-level annual_amount as per-bottle rate.
        // Imported TrackAbout "Total Cost" is total for all covered bottles, so normalize it.
        const annualAmount = effectiveBottleCount > 0 ? (totalAgreementAmount / effectiveBottleCount) : totalAgreementAmount;
        const insertRow = {
          organization_id: organization.id,
          customer_id: assigned.CustomerListID,
          customer_name: assigned.name,
          agreement_number: (row.agreement_number || '').trim() || null,
          title: 'Imported from TrackAbout',
          start_date: startDate,
          end_date: endDate,
          annual_amount: annualAmount,
          max_asset_count: effectiveBottleCount,
          billing_frequency: 'annual',
          payment_terms: 'Net 30',
          tax_rate: 0,
          status: 'active',
          special_provisions: [row.assets_on_agreement, row.rent_balance].filter(Boolean).join(' | ') || null,
          next_billing_date: endDate,
          created_by: profile.id,
          updated_by: profile.id,
        };
        let rowImported = false;
        const { error: insertErr } = await supabase.from('lease_agreements').insert(insertRow);
        if (insertErr) {
          const isConflict = insertErr.code === '23505' || insertErr.status === 409;
          if (isConflict && insertRow.agreement_number) {
            const { data: existing, error: findErr } = await supabase
              .from('lease_agreements')
              .select('id')
              .eq('organization_id', organization.id)
              .eq('agreement_number', insertRow.agreement_number)
              .maybeSingle();
            if (!findErr && existing?.id) {
              const updatePayload = { ...insertRow };
              delete updatePayload.created_by;
              const { error: updateErr } = await supabase
                .from('lease_agreements')
                .update({ ...updatePayload, updated_by: profile.id })
                .eq('id', existing.id);
              if (updateErr) {
                failed += 1;
                logger.error('Update-on-conflict error for row', rowIndex, updateErr);
                toast.error(`Row ${rowIndex + 1}: ${updateErr.message}`);
              } else {
                rowImported = true;
              }
            } else {
              failed += 1;
              logger.error('Conflict lookup error for row', rowIndex, findErr || insertErr);
              toast.error(`Row ${rowIndex + 1}: ${insertErr.message}`);
            }
          } else {
            failed += 1;
            logger.error('Insert error for row', rowIndex, insertErr);
            toast.error(`Row ${rowIndex + 1}: ${insertErr.message}`);
          }
        } else {
          rowImported = true;
        }

        if (rowImported) {
          try {
            const customerId = assigned.CustomerListID;
            const agreementNo = (row.agreement_number || '').trim();
            const quantity = effectiveBottleCount;
            const productCode = String(row.assets_on_agreement || '').trim().split(/\s+/).find(Boolean) || null;
            const itemDescription = `Lease agreement ${agreementNo}${row.assets_on_agreement ? ` - ${String(row.assets_on_agreement).trim()}` : ''}`;

            let { data: sub, error: subSelErr } = await supabase
              .from('subscriptions')
              .select('id, status')
              .eq('organization_id', organization.id)
              .eq('customer_id', customerId)
              .in('status', ['active', 'paused'])
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            if (subSelErr) throw subSelErr;

            if (!sub?.id) {
              const { data: createdSub, error: subInsErr } = await supabase
                .from('subscriptions')
                .insert({
                  organization_id: organization.id,
                  customer_id: customerId,
                  status: 'active',
                  billing_period: 'yearly',
                  start_date: startDate,
                  current_period_start: startDate,
                  current_period_end: endDate,
                  next_billing_date: endDate,
                  auto_renew: true,
                  notes: 'Auto-created from lease agreement import',
                })
                .select('id')
                .single();
              if (subInsErr) throw subInsErr;
              sub = createdSub;
            } else {
              const { error: subUpdErr } = await supabase
                .from('subscriptions')
                .update({
                  status: 'active',
                  billing_period: 'yearly',
                  current_period_start: startDate,
                  current_period_end: endDate,
                  next_billing_date: endDate,
                })
                .eq('id', sub.id);
              if (subUpdErr) throw subUpdErr;
            }

            const { data: existingItem, error: itemSelErr } = await supabase
              .from('subscription_items')
              .select('id')
              .eq('organization_id', organization.id)
              .eq('subscription_id', sub.id)
              .eq('description', itemDescription)
              .maybeSingle();
            if (itemSelErr) throw itemSelErr;

            if (existingItem?.id) {
              const { error: itemUpdErr } = await supabase
                .from('subscription_items')
                .update({
                  product_code: productCode,
                  quantity,
                  unit_price: annualAmount,
                  status: 'active',
                })
                .eq('id', existingItem.id);
              if (itemUpdErr) throw itemUpdErr;
            } else {
              const { error: itemInsErr } = await supabase
                .from('subscription_items')
                .insert({
                  subscription_id: sub.id,
                  organization_id: organization.id,
                  product_code: productCode,
                  description: itemDescription,
                  quantity,
                  unit_price: annualAmount,
                  status: 'active',
                });
              if (itemInsErr) throw itemInsErr;
            }
          } catch (syncErr) {
            const msg = String(syncErr?.message || '');
            const isMissingSubscriptionsTable =
              syncErr?.code === '42P01'
              || syncErr?.code === 'PGRST205'
              || /relation "public\.(subscriptions|subscription_items)" does not exist/i.test(msg);
            if (isMissingSubscriptionsTable) {
              rentalsSyncUnavailable = true;
              logger.warn('Rentals sync skipped: subscriptions tables are missing for this org database.');
            } else {
              failed += 1;
              rowImported = false;
              logger.error('Subscription sync error for row', rowIndex, syncErr);
              toast.error(`Row ${rowIndex + 1} imported agreement but failed to sync Rentals: ${syncErr.message}`);
            }
          }
        }

        if (rowImported) done += 1;
        const processed = done + failed;
        setImportProgress(Math.round((processed / total) * 100));
      }
      const skipped = preview.length - total;
      if (done > 0 && failed === 0 && skipped === 0) {
        toast.success(`Imported ${done} rental agreement(s).`);
      } else if (done > 0) {
        toast.success(`Imported ${done} agreement(s). Skipped ${skipped + failed} row(s).`);
      } else {
        toast.error('No agreements were imported. Please fix row errors and try again.');
      }
      if (done > 0 && rentalsSyncUnavailable) {
        toast('Imported to lease agreements. Rentals sync was skipped because subscriptions tables are missing. Run subscription_system_migration.sql for this org database.');
      }
      if (done > 0) {
        navigate('/subscriptions');
      }
    } catch (err) {
      logger.error('Import error:', err);
      setError(err.message || 'Import failed');
    } finally {
      setImporting(false);
      setImportProgress(0);
    }
  }, [canImport, organization?.id, profile?.id, preview, assignments, navigate]);

  const handleFileChange = (e) => processFile(e.target.files?.[0]);
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    processFile(e.dataTransfer?.files?.[0]);
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1600, mx: 'auto' }}>
      <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, mb: 3, borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.08)', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button startIcon={<ArrowBackIcon />} component={Link} to="/subscriptions" sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none' }}>
            Back
          </Button>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em' }}>
            Import TrackAbout Rental Agreements
          </Typography>
        </Box>
      </Paper>

      <Card elevation={0} sx={{ mb: 2, borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
        <CardContent>
          <Box
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            sx={{
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 2,
              p: 3,
              textAlign: 'center',
              bgcolor: 'action.hover',
            }}
          >
            <input
              accept=".csv,.txt,.xls,.xlsx"
              type="file"
              id="rental-agreement-file"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <label htmlFor="rental-agreement-file">
              <Button
                component="span"
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                sx={{ cursor: 'pointer', borderRadius: 999, fontWeight: 700, textTransform: 'none' }}
              >
                Choose file
              </Button>
            </label>
            {file && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                {file.name}
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {columns.length > 0 && (
        <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} mb={1}>
            <Typography variant="subtitle2" gutterBottom sx={{ mb: 0 }}>
              Column mapping (TrackAbout)
            </Typography>
            <Button size="small" variant="outlined" onClick={handleRestoreSavedMapping} sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none' }}>
              Restore saved mapping
            </Button>
          </Box>
          <Grid container spacing={2}>
            {FIELD_DEFINITIONS.map((field) => (
              <Grid item xs={12} sm={6} md={4} key={field.key}>
                <FormControl size="small" fullWidth>
                  <InputLabel>{field.label}</InputLabel>
                  <Select
                    value={mapping[field.key] || ''}
                    label={field.label}
                    onChange={(e) => handleMappingChange(field.key, e.target.value)}
                  >
                    <MenuItem value="">— Not mapped —</MenuItem>
                    {columns.map((col) => (
                      <MenuItem key={col} value={col}>
                        {col}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            ))}
          </Grid>
          <Button size="small" onClick={() => runCustomerMatching()} disabled={matching || preview.length === 0} sx={{ mt: 2, borderRadius: 999, fontWeight: 700, textTransform: 'none' }}>
            {matching ? 'Matching…' : 'Re-match customers'}
          </Button>
        </Paper>
      )}

      {preview.length > 0 && (
        <Paper elevation={0} sx={{ overflow: 'auto', borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="subtitle1">
              Preview & assign customer ({preview.length} row{preview.length !== 1 ? 's' : ''})
            </Typography>
            {unmatchedCount > 0 && (
              <Chip
                icon={<ErrorIcon />}
                label={`${unmatchedCount} row(s) need a customer`}
                color="warning"
                size="small"
              />
            )}
            {rowsMissingRequiredFields > 0 && (
              <Chip
                icon={<ErrorIcon />}
                label={`${rowsMissingRequiredFields} row(s) missing agreement # or end date`}
                color="warning"
                size="small"
              />
            )}
            <Button
              variant="contained"
              onClick={handleImport}
              disabled={importing || !canImport}
              startIcon={importing ? null : <CheckCircleIcon />}
              sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none' }}
            >
              {importing ? `Saving & importing… ${importProgress}%` : `Save & import ${importableRows.length} agreement${importableRows.length !== 1 ? 's' : ''}`}
            </Button>
          </Box>
          {!canImport && (
            <Alert severity="warning" sx={{ mx: 2, mb: 1 }}>
              No importable rows yet. Assign a customer and provide an agreement number + end date for at least one row.
            </Alert>
          )}
          {canImport && skippedRowsCount > 0 && (
            <Alert severity="info" sx={{ mx: 2, mb: 1 }}>
              {skippedRowsCount} row(s) will be skipped because they are missing a customer assignment or required fields.
            </Alert>
          )}
          {importing && <LinearProgress variant="determinate" value={importProgress} sx={{ mx: 2 }} />}
          <TableContainer sx={{ maxHeight: 480, borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                  <TableCell>#</TableCell>
                  <TableCell>End Date</TableCell>
                  <TableCell>Customer (from file)</TableCell>
                  <TableCell>Agreement #</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Assets</TableCell>
                  <TableCell>Total Cost</TableCell>
                  <TableCell>Assigned customer</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {preview.map((row, idx) => {
                  const key = `${row.customer_id || ''}_${row.customer_name || ''}`;
                  const matched = customerMatchMap[key];
                  const assigned = assignments[idx];
                  return (
                    <TableRow key={idx}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{row.end_date_parsed || row.end_date || '—'}</TableCell>
                      <TableCell>
                        {row.customer_name || row.customer || '—'}
                        {row.customer_id ? ` (${row.customer_id})` : ''}
                      </TableCell>
                      <TableCell>{row.agreement_number || '—'}</TableCell>
                      <TableCell>{row.duration_months || '—'}</TableCell>
                      <TableCell sx={{ maxWidth: 140 }}>{row.assets_on_agreement || '—'}</TableCell>
                      <TableCell>
                        {row.total_cost_parsed != null ? `$${row.total_cost_parsed}` : row.total_cost || '—'}
                      </TableCell>
                      <TableCell sx={{ minWidth: 220 }}>
                        <Autocomplete
                          size="small"
                          options={customers}
                          getOptionLabel={(opt) => `${opt.name} (${opt.CustomerListID || ''})`}
                          isOptionEqualToValue={(option, value) =>
                            (option?.id && value?.id && option.id === value.id)
                            || (option?.CustomerListID && value?.CustomerListID && option.CustomerListID === value.CustomerListID)
                          }
                          value={resolveAssignedCustomerOption(assigned)}
                          onChange={(_, val) => handleAssignCustomer(idx, val)}
                          renderInput={(params) => <TextField {...params} placeholder="Select customer" />}
                        />
                      </TableCell>
                      <TableCell>
                        {assigned ? (
                          <Chip icon={<CheckCircleIcon />} label="Assigned" color="success" size="small" />
                        ) : matched ? (
                          <Chip label="Matched (select to assign)" size="small" variant="outlined" />
                        ) : (
                          <Chip label="No match" color="warning" size="small" />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
}

