import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Stack,
  Typography,
  Paper,
  Button,
  TextField,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import {
  fetchMergedAssetMovementHistory,
  formatAuditMovementLabel,
  isSyntheticMovementRow,
} from '../services/assetMovementHistory';
import {
  isPendingOrderScanRecord,
  scanRecordModeFamily,
} from '../utils/orderScanApprovalStatus';
import { PageSearchInput } from '../components/ui/search-input-with-icon';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Flatten merged movement rows into the Asset Record Log table shape. Legacy asset_records stay editable. */
function mergedMovementToLogRows(asset, merged) {
  return (merged || []).map((row) => {
    if (row.history_type === 'asset_record') {
      return {
        ...row,
        _rowKey: `asset_record_${row.id}`,
        _editable: true,
        type: row.type || row.action || 'RECORD',
        created_at: row.created_at || '',
        submitted_at: row.submitted_at || row.created_at || '',
        user: row.user || '-',
        device: row.device || '-',
        location: row.location || '-',
        data: row.data || '-',
        associated_assets: row.associated_assets || asset.id,
        notes: row.notes || '',
      };
    }

    const ht = row.history_type || '';
    const mode = String(row.mode || row.action || '').trim();
    let typeLabel = mode || 'SCAN';
    if (ht === 'rental_rnb' || mode === 'RNB') typeLabel = 'RNB (order return — not on open rental)';
    else if (isPendingOrderScanRecord(row) && scanRecordModeFamily(row) === 'SHIP') {
      typeLabel = 'Ship scan (pending approval)';
    } else if (isPendingOrderScanRecord(row) && scanRecordModeFamily(row) === 'RETURN') {
      typeLabel = 'Return scan (pending approval)';
    } else if (ht === 'rental_start' || mode === 'SHIP') typeLabel = 'SHIP';
    else if (ht === 'rental_end' || mode === 'RETURN') typeLabel = 'RETURN';
    else if (ht === 'fill' || mode === 'FILL') typeLabel = 'FILL';
    else if (ht === 'transfer') typeLabel = 'TRANSFER';
    else if (ht === 'exception') typeLabel = row.action || 'EXCEPTION';
    else if (ht === 'audit') typeLabel = formatAuditMovementLabel(row);
    else if (ht === 'creation') typeLabel = 'Add New Asset';
    else if (ht === 'record_update') typeLabel = row.action || 'Asset record updated';
    else if (ht === 'cylinder_scan') typeLabel = mode || 'CYLINDER_SCAN';
    else if (ht === 'bottle_scan') typeLabel = mode || 'SCAN';

    const cid = row.customer_id || row.assigned_customer || '';
    const cname = row.customer_name || '';
    const loc =
      isPendingOrderScanRecord(row)
        ? (() => {
            const orderLabel = row.order_number ? `Order ${row.order_number}` : 'Order (pending)';
            const custHint = cname || cid ? ` · ${cname || cid}` : '';
            return scanRecordModeFamily(row) === 'RETURN'
              ? `${orderLabel}${custHint} · scanned return, inventory not updated yet`
              : `${orderLabel}${custHint} · scanned, not assigned yet`;
          })()
        : row.scan_order_status === 'inventory_updated' && scanRecordModeFamily(row) === 'RETURN'
          ? (() => {
              const orderLabel = row.order_number ? `Order ${row.order_number}` : 'Order';
              return `${orderLabel} · return processed (inventory updated)`;
            })()
        : cname || cid
          ? (() => {
              const base = cname
                ? `Customer: ${cname}${cid ? ` (${cid})` : ''}`
                : `Customer: (${cid})`;
              return ht === 'rental_rnb' || mode === 'RNB'
                ? `${base} · billing exception (not on open rental when approved)`
                : base;
            })()
          : row.location
            ? `In-House: ${row.location}`
          : ht === 'fill'
            ? 'Fill Plant'
            : '-';

    const dataParts = [
      ht ? `Source: ${ht}` : null,
      row.order_number ? `Order: ${row.order_number}` : null,
      row.product_code ? `Product: ${row.product_code}` : null,
    ].filter(Boolean);

    const noteParts = [
      row.notes,
      row.filled_by ? `Filled by: ${row.filled_by}` : null,
      row.dns_description ? `DNS: ${row.dns_description}` : null,
    ].filter(Boolean);

    return {
      ...row,
      _rowKey: String(row.id ?? `${ht}_${row.created_at}_${mode}`),
      _editable: false,
      type: typeLabel,
      created_at: row.created_at || '',
      submitted_at: row.created_at || '',
      user: row.scanned_by || row.user_name || row.user || row.user_id || '-',
      device: row.device || row.device_id || '-',
      location: loc,
      data: dataParts.length ? dataParts.join(' | ') : '-',
      associated_assets: asset.id,
      notes: noteParts.join(' | ') || '',
    };
  });
}

const TRACKED_FIELDS = [
  'barcode_number',
  'serial_number',
  'category',
  'group_name',
  'type',
  'description',
  'gas_type',
  'dock_stock',
  'status',
  'use_state',
  'location',
  'assigned_customer',
  'customer_name',
  'ownership',
];

const normalizeValue = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }
  return value;
};

const buildFieldChanges = (before, after) => {
  const changes = {};
  TRACKED_FIELDS.forEach((field) => {
    if (!(field in after)) return;
    const from = normalizeValue(before?.[field]);
    const to = normalizeValue(after?.[field]);
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      changes[field] = { from, to };
    }
  });
  return changes;
};

export default function AssetHistory() {
  const { id } = useParams(); // id can be barcode or serial number
  const navigate = useNavigate();
  const { organization, profile } = useAuth();
  const [asset, setAsset] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [recordEditId, setRecordEditId] = useState(null);
  const [recordEditForm, setRecordEditForm] = useState({});

  // Asset lookup by barcode or serial number
  useEffect(() => {
    const fetchData = async () => {
      const searchId = String(id || '').trim();
      const organizationId = organization?.id || profile?.organization_id || null;
      if (!searchId) {
        setAsset(null);
        setRecords([]);
        setError('Asset not found.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // Resolve by ID first, then barcode, then serial.
        // Avoid .single() so duplicate values do not hard-fail the lookup.
        const queryOne = async (column, value) => {
          let q = supabase.from('bottles').select('*').eq(column, value);
          if (organizationId) q = q.eq('organization_id', organizationId);
          const { data, error } = await q.order('created_at', { ascending: false }).limit(1);
          if (error) throw error;
          return Array.isArray(data) && data.length > 0 ? data[0] : null;
        };

        let assetData = null;
        if (UUID_RE.test(searchId)) {
          assetData = await queryOne('id', searchId);
        }
        if (!assetData) assetData = await queryOne('barcode_number', searchId);
        if (!assetData) {
          const stripped = searchId.replace(/^0+/, '') || searchId;
          if (stripped !== searchId) assetData = await queryOne('barcode_number', stripped);
        }
        if (!assetData) assetData = await queryOne('serial_number', searchId);
        if (!assetData) throw new Error('Asset not found.');
        setAsset(assetData);
        setEditForm(assetData);
        // Same merged sources as Asset Detail: scans, rentals (RNB/start/end), fills, transfers,
        // exceptions, audits, legacy asset_records, creation/update markers.
        const mergedRaw = await fetchMergedAssetMovementHistory(supabase, {
          organizationId: assetData.organization_id,
          asset: assetData,
          perSourceLimit: 250,
          maxRecords: 800,
        });
        const merged = mergedMovementToLogRows(
          assetData,
          (mergedRaw || []).filter((r) => !isSyntheticMovementRow(r)),
        );
        setRecords(merged);
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };
    fetchData();
  }, [id, organization?.id, profile?.organization_id]);

  // Asset edit handlers
  const handleAssetEdit = () => setEditMode(true);
  const handleAssetEditChange = e => setEditForm({ ...editForm, [e.target.name]: e.target.value });
  const handleAssetEditSave = async () => {
    setLoading(true);
    setError(null);
    const fieldChanges = buildFieldChanges(asset, editForm);
    const { error: updateError } = await supabase.from('bottles').update(editForm).eq('id', asset.id);
    if (updateError) {
      setError(updateError.message);
    } else {
      if (Object.keys(fieldChanges).length > 0) {
        const baseAuditPayload = {
          action: 'BOTTLE_UPDATE',
          organization_id: asset.organization_id || organization?.id || profile?.organization_id || null,
          user_id: profile?.id || null,
          timestamp: new Date().toISOString(),
          details: {
            event_type: 'bottle_update',
            bottle_id: asset.id,
            barcode_number: editForm.barcode_number || asset.barcode_number || null,
            field_changes: fieldChanges,
          },
        };
        const { error: auditError } = await supabase.from('audit_logs').insert(baseAuditPayload);
        if (auditError) {
          await supabase.from('audit_logs').insert({
            action: 'BOTTLE_UPDATE',
            details: baseAuditPayload.details,
          });
        }
      }
      setAsset(editForm);
      setEditMode(false);
    }
    setLoading(false);
  };

  // Record edit handlers (only legacy rows in asset_records are editable)
  const handleRecordEdit = (record) => {
    if (!record._editable) return;
    setRecordEditId(record.id);
    setRecordEditForm({
      id: record.id,
      type: record.type ?? '',
      created_at: record.created_at ?? '',
      submitted_at: record.submitted_at ?? record.created_at ?? '',
      user: record.user ?? '',
      device: record.device ?? '',
      location: record.location ?? '',
      data: record.data ?? '',
      associated_assets: record.associated_assets ?? '',
      notes: record.notes ?? '',
    });
  };
  const handleRecordEditChange = e => setRecordEditForm({ ...recordEditForm, [e.target.name]: e.target.value });
  const handleRecordEditSave = async () => {
    setLoading(true);
    setError(null);
    const { id: _omitId, ...payload } = recordEditForm;
    const { error: updateError } = await supabase.from('asset_records').update(payload).eq('id', recordEditId);
    if (updateError) setError(updateError.message);
    else {
      try {
        const mergedRaw = await fetchMergedAssetMovementHistory(supabase, {
          organizationId: asset.organization_id,
          asset,
          perSourceLimit: 250,
          maxRecords: 800,
        });
        setRecords(
          mergedMovementToLogRows(
            asset,
            (mergedRaw || []).filter((r) => !isSyntheticMovementRow(r)),
          ),
        );
      } catch (e) {
        setError(e?.message || 'Failed to refresh history');
      }
      setRecordEditId(null);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!asset) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Alert severity="error">Asset not found.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, mb: 3, borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.08)', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' }}>
        <Box display="flex" alignItems="center" gap={1}>
          <Button onClick={() => navigate(-1)} startIcon={<ArrowBackIcon />} sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none' }}>
            Back
          </Button>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em' }}>
            Asset History
          </Typography>
        </Box>
      </Paper>

      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
            {asset.description || 'Asset'}
          </Typography>
          {!editMode && (
            <Button variant="outlined" startIcon={<EditIcon />} onClick={handleAssetEdit} sx={{ textTransform: 'none' }}>
              Edit Asset
            </Button>
          )}
        </Box>
        {editMode ? (
          <>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth size="small" name="barcode_number" label="Barcode" value={editForm.barcode_number || ''} onChange={handleAssetEditChange} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth size="small" name="serial_number" label="Serial Number" value={editForm.serial_number || ''} onChange={handleAssetEditChange} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth size="small" name="category" label="Category" value={editForm.category || ''} onChange={handleAssetEditChange} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth size="small" name="group_name" label="Group" value={editForm.group_name || ''} onChange={handleAssetEditChange} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth size="small" name="type" label="Type" value={editForm.type || ''} onChange={handleAssetEditChange} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth size="small" name="description" label="Description" value={editForm.description || ''} onChange={handleAssetEditChange} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth size="small" name="gas_type" label="Gas Type" value={editForm.gas_type || ''} onChange={handleAssetEditChange} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth size="small" name="dock_stock" label="Dock Stock" value={editForm.dock_stock || ''} onChange={handleAssetEditChange} />
              </Grid>
            </Grid>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={handleAssetEditSave}>Save</Button>
              <Button variant="outlined" onClick={() => { setEditMode(false); setEditForm(asset); }}>Cancel</Button>
            </Stack>
          </>
        ) : (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Barcode</Typography>
              <Typography variant="body1" fontWeight="bold">
                {asset.barcode_number ? (
                  <Link to={`/bottle/${asset.id}`} style={{ color: '#1976d2', textDecoration: 'underline' }}>
                    {asset.barcode_number}
                  </Link>
                ) : '-'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Serial Number</Typography>
              <Typography variant="body1" fontWeight="bold">{asset.serial_number || '-'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Category</Typography>
              <Typography variant="body1" fontWeight="bold">{asset.category || '-'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Group</Typography>
              <Typography variant="body1" fontWeight="bold">{asset.group_name || '-'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Type</Typography>
              <Typography variant="body1" fontWeight="bold">{asset.type || '-'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Description</Typography>
              <Typography variant="body1" fontWeight="bold">{asset.description || '-'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Gas Type</Typography>
              <Typography variant="body1" fontWeight="bold">{asset.gas_type || '-'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Dock Stock</Typography>
              <Typography variant="body1" fontWeight="bold">{asset.dock_stock || '-'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Status</Typography>
              <Typography variant="body1" fontWeight="bold">{asset.status || '-'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Use State</Typography>
              <Typography variant="body1" fontWeight="bold">{asset.use_state || '-'}</Typography>
            </Grid>
          </Grid>
        )}
      </Paper>

      <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', mb: 2 }}>
        Asset Record Log
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Includes bottle scans, cylinder scans, rentals (delivery / return / RNB), fills, transfers, exceptions,
        audits, manual asset records, and creation updates — same timeline as the asset detail movement history.
      </Typography>
      <PageSearchInput
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        onClear={() => setSearchTerm('')}
        placeholder="Search records by type, user, location, notes..."
        className="mb-2 w-full sm:max-w-[320px]"
      />
      <TableContainer sx={{ borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f8fafc' }}>
              <TableCell>Type</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Submitted</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Device</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Data</TableCell>
              <TableCell>Associated Assets</TableCell>
              <TableCell>Notes</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(() => {
              const filtered = records.filter(r =>
                !searchTerm ||
                r.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.user?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.data?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.notes?.toLowerCase().includes(searchTerm.toLowerCase())
              );
              if (filtered.length === 0) {
                return (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        {records.length === 0
                          ? 'No movement or audit events recorded for this asset yet.'
                          : 'No records match your search.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              }
              return filtered.map(record => (
              <TableRow key={record._rowKey || record.id} sx={recordEditId === record.id ? { backgroundColor: '#fefce8' } : {}}>
                {recordEditId === record.id ? (
                  <>
                    <TableCell><TextField size="small" name="type" value={recordEditForm.type || ''} onChange={handleRecordEditChange} sx={{ width: 100 }} /></TableCell>
                    <TableCell>{recordEditForm.created_at}</TableCell>
                    <TableCell>{recordEditForm.submitted_at}</TableCell>
                    <TableCell><TextField size="small" name="user" value={recordEditForm.user || ''} onChange={handleRecordEditChange} sx={{ width: 100 }} /></TableCell>
                    <TableCell><TextField size="small" name="device" value={recordEditForm.device || ''} onChange={handleRecordEditChange} sx={{ width: 100 }} /></TableCell>
                    <TableCell><TextField size="small" name="location" value={recordEditForm.location || ''} onChange={handleRecordEditChange} sx={{ width: 100 }} /></TableCell>
                    <TableCell><TextField size="small" name="data" value={recordEditForm.data || ''} onChange={handleRecordEditChange} sx={{ width: 100 }} /></TableCell>
                    <TableCell><TextField size="small" name="associated_assets" value={recordEditForm.associated_assets || ''} onChange={handleRecordEditChange} sx={{ width: 100 }} /></TableCell>
                    <TableCell><TextField size="small" name="notes" value={recordEditForm.notes || ''} onChange={handleRecordEditChange} sx={{ width: 100 }} /></TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <Button size="small" variant="contained" onClick={handleRecordEditSave}>Save</Button>
                        <Button size="small" variant="outlined" onClick={() => setRecordEditId(null)}>Cancel</Button>
                      </Stack>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>{record.type}</TableCell>
                    <TableCell>{record.created_at}</TableCell>
                    <TableCell>{record.submitted_at}</TableCell>
                    <TableCell>{record.user}</TableCell>
                    <TableCell>{record.device}</TableCell>
                    <TableCell>{record.location}</TableCell>
                    <TableCell>{record.data}</TableCell>
                    <TableCell>{record.associated_assets}</TableCell>
                    <TableCell>{record.notes}</TableCell>
                    <TableCell>
                      {record._editable ? (
                        <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => handleRecordEdit(record)} sx={{ textTransform: 'none' }}>
                          Edit
                        </Button>
                      ) : (
                        <Typography variant="caption" color="text.secondary">—</Typography>
                      )}
                    </TableCell>
                  </>
                )}
              </TableRow>
              ));
            })()}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
