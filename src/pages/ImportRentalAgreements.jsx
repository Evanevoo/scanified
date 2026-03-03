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

// TrackAbout Expiring Asset Agreements – column aliases for auto-mapping
const FIELD_DEFINITIONS = [
  { key: 'end_date', label: 'End Date', aliases: ['end date', 'enddate', 'expiration', 'expiry'] },
  { key: 'customer', label: 'Customer', aliases: ['customer', 'customer name', 'customername', 'company'] },
  { key: 'agreement_number', label: 'Agreement Number', aliases: ['agreement number', 'agreementnumber', 'agreement #', 'agreement no'] },
  { key: 'duration_months', label: 'Duration (Months)', aliases: ['duration (months)', 'duration', 'duration months', 'term', 'months'] },
  { key: 'assets_on_agreement', label: 'Assets on Agreement', aliases: ['assets on agreement', 'assets', 'asset type', 'asset type description'] },
  { key: 'total_cost', label: 'Total Cost', aliases: ['total cost', 'totalcost', 'total', 'cost', 'amount'] },
  { key: 'rent_balance', label: 'Rent Balance', aliases: ['rent balance', 'rentbalance', 'rent balance (number covered by agreements)', 'assets covered'] },
];

const MAPPING_STORAGE_KEY = 'importRentalAgreementFieldMapping';

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
    try {
      const saved = localStorage.getItem(MAPPING_STORAGE_KEY);
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (parsed.columns && JSON.stringify(parsed.columns) === JSON.stringify(detectedColumns)) {
        return parsed.mapping;
      }
    } catch {}
    return null;
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
      mapped.total_cost_parsed = parseTotalCost(mapped.total_cost);
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
        let detectedColumns = [];
        let dataRows = rows;
        if (isHeaderRow(rows[0])) {
          detectedColumns = rows[0].map((col, i) => (col && String(col).trim()) || `Column ${i + 1}`);
          dataRows = rows.slice(1);
        } else {
          detectedColumns = rows[0].map((_, i) => `Column ${i + 1}`);
        }
        setRawRows(dataRows);
        setColumns(detectedColumns);

        const saved = loadSavedMapping(detectedColumns);
        let autoMap = {};
        const normCols = detectedColumns.map((c) => c.toLowerCase().trim());
        FIELD_DEFINITIONS.forEach((field) => {
          let found = detectedColumns.find((col, i) => {
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
        const finalMapping = saved || autoMap;
        setMapping(finalMapping);
        setPreview(generatePreview(dataRows, detectedColumns, finalMapping));
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
          const text = evt.target.result;
          const firstLine = text.split('\n')[0] || '';
          const delimiter = (firstLine.match(/\t/g) || []).length >= (firstLine.match(/,/g) || []).length ? '\t' : ',';
          const rows = text
            .split(/\r?\n/)
            .map((line) => line.split(delimiter).map((cell) => (cell != null ? String(cell).trim() : '')))
            .filter((row) => row.length > 1 && row.some((c) => c !== ''));
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
    setPreview(generatePreview(rawRows, columns, newMapping));
    setAssignments({});
    setCustomerMatchMap({});
    if (columns.length) {
      localStorage.setItem(MAPPING_STORAGE_KEY, JSON.stringify({ columns, mapping: newMapping }));
    }
  };

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

  const unmatchedCount = preview.filter((_, idx) => !assignments[idx]).length;
  const canImport = preview.length > 0 && unmatchedCount === 0 && preview.every((row) => row.agreement_number && row.end_date_parsed);

  const handleImport = useCallback(async () => {
    if (!canImport || !organization?.id || !profile?.id) return;
    setImporting(true);
    setError(null);
    setImportProgress(0);
    const total = preview.length;
    let done = 0;
    try {
      for (let i = 0; i < preview.length; i++) {
        const row = preview[i];
        const assigned = assignments[i];
        if (!assigned) continue;
        const endDate = row.end_date_parsed || row.end_date;
        const startDate = row.start_date_parsed || deriveStartDate(endDate, row.duration_months);
        const annualAmount = row.total_cost_parsed != null ? row.total_cost_parsed : 0;
        const insertRow = {
          organization_id: organization.id,
          customer_id: assigned.CustomerListID,
          customer_name: assigned.name,
          agreement_number: (row.agreement_number || '').trim() || null,
          title: 'Imported from TrackAbout',
          start_date: startDate,
          end_date: endDate,
          annual_amount: annualAmount,
          billing_frequency: 'annual',
          payment_terms: 'Net 30',
          tax_rate: 0,
          status: 'active',
          special_provisions: [row.assets_on_agreement, row.rent_balance].filter(Boolean).join(' | ') || null,
          next_billing_date: endDate,
          created_by: profile.id,
          updated_by: profile.id,
        };
        const { error: insertErr } = await supabase.from('lease_agreements').insert(insertRow);
        if (insertErr) {
          logger.error('Insert error for row', i, insertErr);
          toast.error(`Row ${i + 1}: ${insertErr.message}`);
        }
        done += 1;
        setImportProgress(Math.round((done / total) * 100));
      }
      toast.success(`Imported ${done} rental agreement(s).`);
      navigate('/lease-agreements');
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
    <Box sx={{ p: 2, maxWidth: 1600, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Button startIcon={<ArrowBackIcon />} component={Link} to="/lease-agreements">
          Back
        </Button>
        <Typography variant="h6">Import TrackAbout Rental Agreements</Typography>
      </Box>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Upload an export of <strong>Expiring Asset Agreements</strong> from TrackAbout (CSV or Excel). Map columns, assign each row to one of your customers, then import as lease agreements.
          </Typography>
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
                sx={{ cursor: 'pointer' }}
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
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Column mapping (TrackAbout)
          </Typography>
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
          <Button size="small" onClick={() => runCustomerMatching()} disabled={matching || preview.length === 0} sx={{ mt: 2 }}>
            {matching ? 'Matching…' : 'Re-match customers'}
          </Button>
        </Paper>
      )}

      {preview.length > 0 && (
        <Paper sx={{ overflow: 'auto' }}>
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
            {canImport && (
              <Button
                variant="contained"
                onClick={handleImport}
                disabled={importing}
                startIcon={importing ? null : <CheckCircleIcon />}
              >
                {importing ? `Importing… ${importProgress}%` : 'Import as lease agreements'}
              </Button>
            )}
          </Box>
          {importing && <LinearProgress variant="determinate" value={importProgress} sx={{ mx: 2 }} />}
          <TableContainer sx={{ maxHeight: 480 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
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
                          value={assigned ? { id: assigned.id, name: assigned.name, CustomerListID: assigned.CustomerListID } : null}
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
