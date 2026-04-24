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
      setLoading(true);
      setError(null);
      try {
        // Try to find asset by barcode or serial_number
        const { data: assetData, error: assetError } = await supabase
          .from('bottles')
          .select('*')
          .or(`barcode_number.eq.${id},serial_number.eq.${id}`)
          .single();
        if (assetError || !assetData) throw new Error('Asset not found.');
        setAsset(assetData);
        setEditForm(assetData);
        // Fetch asset history/records (simulate with a table 'asset_records' or use mock data)
        const { data: recordsData, error: recordsError } = await supabase
          .from('asset_records')
          .select('*')
          .eq('asset_id', assetData.id)
          .order('created_at', { ascending: false });
        setRecords(recordsData || []);
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

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
          table_name: 'bottles',
          record_id: asset.id,
          details: {
            event_type: 'bottle_update',
            bottle_id: asset.id,
            barcode_number: editForm.barcode_number || asset.barcode_number || null,
            field_changes: fieldChanges,
          },
          created_at: new Date().toISOString(),
        };
        const { error: auditError } = await supabase.from('audit_logs').insert(baseAuditPayload);
        if (auditError) {
          await supabase.from('audit_logs').insert({
            action: 'BOTTLE_UPDATE',
            details: baseAuditPayload.details,
            created_at: baseAuditPayload.created_at,
          });
        }
      }
      setAsset(editForm);
      setEditMode(false);
    }
    setLoading(false);
  };

  // Record edit handlers
  const handleRecordEdit = (record) => {
    setRecordEditId(record.id);
    setRecordEditForm(record);
  };
  const handleRecordEditChange = e => setRecordEditForm({ ...recordEditForm, [e.target.name]: e.target.value });
  const handleRecordEditSave = async () => {
    setLoading(true);
    setError(null);
    const { error: updateError } = await supabase.from('asset_records').update(recordEditForm).eq('id', recordEditId);
    if (updateError) setError(updateError.message);
    else {
      setRecords(records.map(r => r.id === recordEditId ? recordEditForm : r));
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
      <TextField
        size="small"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        placeholder="Search records by type, user, location, notes..."
        sx={{ mb: 2, width: { xs: '100%', sm: 320 } }}
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
            {records.filter(r =>
              !searchTerm ||
              r.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              r.user?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              r.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              r.notes?.toLowerCase().includes(searchTerm.toLowerCase())
            ).map(record => (
              <TableRow key={record.id} sx={recordEditId === record.id ? { backgroundColor: '#fefce8' } : {}}>
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
                      <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => handleRecordEdit(record)} sx={{ textTransform: 'none' }}>
                        Edit
                      </Button>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
