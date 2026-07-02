import logger from '../utils/logger';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Autocomplete,
  Box,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  Delete as DeleteIcon,
  PlaylistAdd as PlaylistAddIcon,
} from '@mui/icons-material';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import { useAssetConfig } from '../hooks/useAssetConfig';
import {
  barcodeLookupVariants,
  duplicateBarcodeMessage,
  findBottleByBarcode,
  isDuplicateBarcodeDbError,
  normalizeBottleBarcode,
  stripLeadingZeros,
} from '../utils/bottleBarcode';
import {
  getGasTypeDetailLine,
  getGasTypeShortLabel,
  gasTypeMatchesQuery,
} from '../utils/gasTypeDisplay';
import { cylinderLimitService } from '../services/cylinderLimitService';
import CylinderLimitDialog from '../components/CylinderLimitDialog';
import {
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  Section,
  StyledAlert,
} from '../components/ui/StyledComponents';

const BATCH_INSERT_SIZE = 50;
const DEFAULT_EMPTY_ROWS = 5;

function makeRowId() {
  return `row-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function emptyRow() {
  return { id: makeRowId(), barcode: '', serial: '' };
}

/** Parse free-form text: newlines, commas, tabs, semicolons, or spaces between barcodes. */
function parseBarcodeInput(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows = [];

  for (const line of lines) {
    if (/[,\t;]/.test(line)) {
      const parts = line.split(/[,\t;]/).map((p) => p.trim());
      if (parts[0]) rows.push({ barcode: parts[0], serial: parts[1] || '' });
      continue;
    }
    const tokens = line.split(/\s+/).filter(Boolean);
    if (tokens.length === 1) {
      rows.push({ barcode: tokens[0], serial: '' });
    } else {
      tokens.forEach((token) => rows.push({ barcode: token, serial: '' }));
    }
  }

  return rows;
}

function filledRows(rows) {
  return rows
    .map((r) => ({
      ...r,
      barcode: normalizeBottleBarcode(r.barcode),
      serial: (r.serial || '').trim(),
    }))
    .filter((r) => r.barcode);
}

export default function QuickAdd() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { config: assetConfig } = useAssetConfig();
  const assetLabel = assetConfig?.assetDisplayName || 'Cylinder';
  const assetLabelPlural = assetConfig?.assetDisplayNamePlural || 'Cylinders';

  const [rows, setRows] = useState(() => Array.from({ length: DEFAULT_EMPTY_ROWS }, emptyRow));
  const [bulkPaste, setBulkPaste] = useState('');

  const [gasTypes, setGasTypes] = useState([]);
  const [selectedGasType, setSelectedGasType] = useState(null);
  const [gasTypeInput, setGasTypeInput] = useState('');

  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState('');

  const [owners, setOwners] = useState([]);
  const [selectedOwner, setSelectedOwner] = useState('');

  const [loadingGasTypes, setLoadingGasTypes] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [limitDialog, setLimitDialog] = useState({ open: false, limitCheck: null, message: null, upgradeSuggestion: null });

  const validRowCount = useMemo(() => filledRows(rows).length, [rows]);

  useEffect(() => {
    const fetchGasTypes = async () => {
      setLoadingGasTypes(true);
      try {
        const { data, error: fetchError } = await supabase
          .from('gas_types')
          .select('*')
          .order('category', { ascending: true })
          .order('group_name', { ascending: true })
          .order('type', { ascending: true });
        if (fetchError) throw fetchError;
        setGasTypes(data || []);
      } catch (err) {
        logger.error('Failed to load gas types:', err);
        setError('Failed to load gas types.');
      } finally {
        setLoadingGasTypes(false);
      }
    };
    fetchGasTypes();
  }, []);

  useEffect(() => {
    const fetchLocations = async () => {
      setLoadingLocations(true);
      if (!profile?.organization_id) {
        setLocations([]);
        setLoadingLocations(false);
        return;
      }
      try {
        const { data, error: fetchError } = await supabase
          .from('locations')
          .select('id, name, province')
          .eq('organization_id', profile.organization_id)
          .order('name', { ascending: true });
        if (fetchError) throw fetchError;
        setLocations(data || []);
      } catch (err) {
        logger.error('Failed to load locations:', err);
        setError('Failed to load locations.');
        setLocations([]);
      } finally {
        setLoadingLocations(false);
      }
    };
    fetchLocations();
  }, [profile?.organization_id]);

  useEffect(() => {
    const fetchOwners = async () => {
      if (!profile?.organization_id) return;
      const { data, error: fetchError } = await supabase
        .from('ownership_values')
        .select('id, value')
        .eq('organization_id', profile.organization_id)
        .order('value', { ascending: true });
      if (!fetchError && data) {
        setOwners(data.map((item) => ({ id: item.id, name: item.value })));
      }
    };
    fetchOwners();
  }, [profile?.organization_id]);

  const filteredGasTypes = useMemo(() => {
    if (!gasTypeInput.trim()) return gasTypes;
    return gasTypes.filter((gt) => gasTypeMatchesQuery(gt, gasTypeInput));
  }, [gasTypes, gasTypeInput]);

  const updateRow = useCallback((id, field, value) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }, []);

  const removeRow = useCallback((id) => {
    setRows((prev) => {
      const next = prev.filter((r) => r.id !== id);
      return next.length > 0 ? next : [emptyRow()];
    });
  }, []);

  const addEmptyRows = useCallback((count = 1) => {
    setRows((prev) => [...prev, ...Array.from({ length: count }, emptyRow)]);
  }, []);

  const handleBulkPaste = () => {
    setError('');
    setSuccess('');
    const parsed = parseBarcodeInput(bulkPaste);
    if (parsed.length === 0) {
      setError('Enter at least one barcode — one per line, or separated by commas, spaces, or tabs.');
      return;
    }

    let addedCount = 0;
    let skippedDupes = 0;

    setRows((prev) => {
      const next = [...prev];
      const existingKeys = new Set(
        filledRows(next).map((r) => stripLeadingZeros(r.barcode) || r.barcode)
      );
      const toInsert = [];

      for (const item of parsed) {
        const b = normalizeBottleBarcode(item.barcode);
        if (!b) continue;
        const key = stripLeadingZeros(b) || b;
        if (existingKeys.has(key)) {
          skippedDupes++;
          continue;
        }
        existingKeys.add(key);
        toInsert.push({ id: makeRowId(), barcode: b, serial: (item.serial || '').trim() });
      }

      addedCount = toInsert.length;
      if (toInsert.length === 0) return prev;

      let insertAt = 0;
      for (let i = 0; i < next.length && insertAt < toInsert.length; i++) {
        if (!normalizeBottleBarcode(next[i].barcode)) {
          next[i] = toInsert[insertAt];
          insertAt++;
        }
      }
      while (insertAt < toInsert.length) {
        next.push(toInsert[insertAt]);
        insertAt++;
      }
      return next;
    });

    setBulkPaste('');

    if (addedCount === 0) {
      setError('All pasted barcodes are already in the list.');
    } else if (skippedDupes > 0) {
      setSuccess(`Added ${addedCount} barcode(s); skipped ${skippedDupes} duplicate(s).`);
    } else {
      setSuccess(`Added ${addedCount} barcode(s) to the list.`);
    }
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    const validRows = filledRows(rows);
    if (validRows.length === 0) {
      setError('Enter at least one barcode.');
      return;
    }
    if (!selectedGasType || !selectedLocationId) {
      setError('Gas type and location are required for all bottles.');
      return;
    }

    const selectedLocationData = locations.find((loc) => loc.id === selectedLocationId);
    if (!selectedLocationData) {
      setError('Invalid location selected.');
      return;
    }

    const seenBarcodes = new Set();
    const duplicateInBatch = [];
    validRows.forEach((r) => {
      const key = stripLeadingZeros(r.barcode) || r.barcode;
      if (seenBarcodes.has(key)) duplicateInBatch.push(r.barcode);
      else seenBarcodes.add(key);
    });
    if (duplicateInBatch.length > 0) {
      setError(
        `Duplicate barcodes in list: ${[...new Set(duplicateInBatch)].slice(0, 5).join(', ')}${duplicateInBatch.length > 5 ? '...' : ''}`
      );
      return;
    }

    setSubmitting(true);

    if (profile?.organization_id) {
      const validation = await cylinderLimitService.validateCylinderAddition(
        profile.organization_id,
        validRows
      );
      if (!validation.isValid) {
        setSubmitting(false);
        setLimitDialog({
          open: true,
          limitCheck: validation.limitCheck,
          message: {
            type: validation.errorType || 'error',
            title: 'Cylinder limit reached',
            message: validation.error,
          },
          upgradeSuggestion: validation.upgradeSuggestion,
        });
        return;
      }
    }

    const lookupVariants = [...new Set(validRows.flatMap((r) => barcodeLookupVariants(r.barcode)))];
    const { data: existingBottles } = await supabase
      .from('bottles')
      .select('barcode_number, serial_number')
      .eq('organization_id', profile.organization_id)
      .in('barcode_number', lookupVariants.length > 0 ? lookupVariants : ['__none__']);

    const toInsert = [];
    const skipped = [];
    validRows.forEach((r) => {
      if (findBottleByBarcode(existingBottles, r.barcode)) {
        skipped.push(`Barcode ${r.barcode}`);
        return;
      }
      toInsert.push(r);
    });

    if (toInsert.length === 0) {
      setError(
        skipped.length > 0
          ? `All barcodes already exist: ${skipped.slice(0, 3).join(', ')}${skipped.length > 3 ? '...' : ''}`
          : 'No bottles to add.'
      );
      setSubmitting(false);
      return;
    }

    const baseRow = {
      gas_type: selectedGasType.type,
      group_name: selectedGasType.group_name,
      category: selectedGasType.category,
      product_code: selectedGasType.product_code,
      description: selectedGasType.description,
      location: (selectedLocationData.name || '').toUpperCase().replace(/\s+/g, '_'),
      ownership: selectedOwner || undefined,
      organization_id: profile.organization_id,
    };

    try {
      for (let i = 0; i < toInsert.length; i += BATCH_INSERT_SIZE) {
        const batch = toInsert.slice(i, i + BATCH_INSERT_SIZE);
        const insertRows = batch.map((r) => ({
          ...baseRow,
          barcode_number: r.barcode,
          serial_number: r.serial || r.barcode,
        }));
        const { error: insertError } = await supabase.from('bottles').insert(insertRows);
        if (insertError) throw insertError;
      }

      const added = toInsert.length;
      const skipMsg = skipped.length > 0 ? ` (${skipped.length} already existed)` : '';
      setSuccess(`${added} ${added !== 1 ? assetLabelPlural.toLowerCase() : assetLabel.toLowerCase()} added successfully!${skipMsg}`);
      setRows(Array.from({ length: DEFAULT_EMPTY_ROWS }, emptyRow));
      setBulkPaste('');
      setSelectedGasType(null);
      setGasTypeInput('');
      setSelectedLocationId('');
      setSelectedOwner('');
    } catch (err) {
      logger.error('Batch insert error:', err);
      setError(
        isDuplicateBarcodeDbError(err)
          ? duplicateBarcodeMessage(toInsert[0]?.barcode)
          : `Failed to add bottles: ${err.message}`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit =
    !submitting &&
    !loadingGasTypes &&
    !loadingLocations &&
    gasTypes.length > 0 &&
    locations.length > 0 &&
    validRowCount > 0 &&
    selectedGasType &&
    selectedLocationId;

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 960, mx: 'auto' }}>
      <PageHeader
        title="Quick Add"
        subtitle={`Add multiple ${assetLabelPlural.toLowerCase()} at once — set gas type and location once, then enter or paste all barcodes.`}
        actions={
          <SecondaryButton startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>
            Back
          </SecondaryButton>
        }
      />

      {error ? (
        <StyledAlert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </StyledAlert>
      ) : null}
      {success ? (
        <StyledAlert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </StyledAlert>
      ) : null}

      <Section title="Details (applies to all barcodes)">
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Autocomplete
              options={filteredGasTypes}
              value={selectedGasType}
              onChange={(_, value) => setSelectedGasType(value)}
              inputValue={gasTypeInput}
              onInputChange={(_, value) => setGasTypeInput(value)}
              loading={loadingGasTypes}
              getOptionLabel={(option) => getGasTypeShortLabel(option)}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {getGasTypeShortLabel(option)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {getGasTypeDetailLine(option)}
                    </Typography>
                  </Box>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Gas code / type"
                  placeholder="Search by gas code or type…"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingGasTypes ? <CircularProgress color="inherit" size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth disabled={loadingLocations || locations.length === 0}>
              <InputLabel>Location</InputLabel>
              <Select
                value={selectedLocationId}
                label="Location"
                onChange={(e) => setSelectedLocationId(e.target.value)}
              >
                <MenuItem value="">
                  <em>Select location</em>
                </MenuItem>
                {locations.map((loc) => (
                  <MenuItem key={loc.id} value={loc.id}>
                    {loc.name}
                    {loc.province ? ` (${loc.province})` : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Ownership (optional)</InputLabel>
              <Select
                value={selectedOwner}
                label="Ownership (optional)"
                onChange={(e) => setSelectedOwner(e.target.value)}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {owners.map((owner) => (
                  <MenuItem key={owner.id} value={owner.name}>
                    {owner.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Section>

      <Section title={`Barcodes · ${validRowCount} entered`}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Paste multiple barcodes at once
            </Typography>
            <TextField
              fullWidth
              multiline
              minRows={4}
              placeholder={'One per line, or separated by commas / spaces / tabs\n1234567890\n9876543210, SN-001\n111222333 444555666'}
              value={bulkPaste}
              onChange={(e) => setBulkPaste(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleBulkPaste();
                }
              }}
            />
            <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'flex-end' }}>
              <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', mr: 'auto' }}>
                Ctrl+Enter to add pasted barcodes
              </Typography>
              <SecondaryButton
                startIcon={<PlaylistAddIcon />}
                onClick={handleBulkPaste}
                disabled={!bulkPaste.trim()}
              >
                Add to list
              </SecondaryButton>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <Typography variant="subtitle2" color="text.secondary">
              Or enter individually
            </Typography>
            <SecondaryButton size="small" startIcon={<AddIcon />} onClick={() => addEmptyRows(1)}>
              Add row
            </SecondaryButton>
            <SecondaryButton size="small" onClick={() => addEmptyRows(10)}>
              Add 10 rows
            </SecondaryButton>
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width="50%">Barcode</TableCell>
                  <TableCell>Serial (optional)</TableCell>
                  <TableCell align="right" width={56} />
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell sx={{ py: 0.75 }}>
                      <TextField
                        fullWidth
                        size="small"
                        variant="standard"
                        placeholder="Barcode"
                        value={row.barcode}
                        onChange={(e) => updateRow(row.id, 'barcode', e.target.value)}
                        inputProps={{ style: { fontFamily: 'monospace' } }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 0.75 }}>
                      <TextField
                        fullWidth
                        size="small"
                        variant="standard"
                        placeholder="Optional"
                        value={row.serial}
                        onChange={(e) => updateRow(row.id, 'serial', e.target.value)}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ py: 0.75 }}>
                      <IconButton size="small" aria-label="Remove row" onClick={() => removeRow(row.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      </Section>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mt: 1 }}>
        <PrimaryButton
          size="large"
          onClick={handleSubmit}
          disabled={!canSubmit}
          startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
        >
          {submitting
            ? 'Adding…'
            : `Add ${validRowCount || 0} ${validRowCount !== 1 ? assetLabelPlural : assetLabel}`}
        </PrimaryButton>
        {selectedGasType ? (
          <Chip size="small" label={getGasTypeShortLabel(selectedGasType)} color="primary" variant="outlined" />
        ) : null}
        {validRowCount > 0 ? (
          <Chip size="small" label={`${validRowCount} barcode${validRowCount !== 1 ? 's' : ''}`} variant="outlined" />
        ) : null}
      </Box>

      <CylinderLimitDialog
        open={limitDialog.open}
        onClose={() => setLimitDialog((prev) => ({ ...prev, open: false }))}
        limitCheck={limitDialog.limitCheck}
        message={limitDialog.message}
        upgradeSuggestion={limitDialog.upgradeSuggestion}
      />
    </Box>
  );
}
