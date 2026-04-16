import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { parseDbTimestamp } from '../utils/parseDbTimestamp';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../context/PermissionsContext';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, CircularProgress, Alert, MenuItem, Select, InputLabel, FormControl, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Card, CardContent, Grid, Stack
} from '@mui/material';
import { Add, Remove, Edit, Save, Cancel } from '@mui/icons-material';

function AssetWithWarning({ asset, currentCustomer }) {
  const [warning, setWarning] = useState('');
  useEffect(() => {
    async function checkAssetHistory() {
      if (!asset) return;
      // Fetch scan history for this asset (barcode or id)
      const { data: scans, error } = await supabase
        .from('bottle_scans')
        .select('customer, mode, scanned_at')
        .eq('bottle_barcode', asset)
        .order('scanned_at', { ascending: false });
      if (error || !scans || scans.length === 0) return;
      // Find the most recent SHIP and RETURN events
      let lastShip = null, lastReturn = null;
      for (const scan of scans) {
        if (!lastShip && scan.mode === 'SHIP') lastShip = scan;
        if (!lastReturn && scan.mode === 'RETURN') lastReturn = scan;
        if (lastShip && lastReturn) break;
      }
      // If lastShip is for a different customer than lastReturn, and lastReturn is before lastShip, warn
      if (lastShip && lastShip.customer !== currentCustomer) {
        if (!lastReturn || new Date(lastReturn.scanned_at) < new Date(lastShip.scanned_at)) {
          setWarning('This asset was not returned by the previous customer before being shipped again.');
        }
      }
    }
    checkAssetHistory();
  }, [asset, currentCustomer]);
  return (
    <Box>
      <Typography variant="body2">{asset}</Typography>
      {warning && <Alert severity="warning" sx={{ mt: 0.5 }}>{warning}</Alert>}
    </Box>
  );
}

export default function ScannedOrders() {
  const { organization, profile } = useAuth();
  const { isAdmin: isElevatedRole } = usePermissions();
  /** Admin, org owner, and platform owner can edit scans after the 24h window (uses resolved role from permissions). */
  const canBypassScanEditWindow = isElevatedRole();
  const browserTz = typeof Intl !== 'undefined' && Intl.DateTimeFormat?.().resolvedOptions?.().timeZone;
  // Prefer profile timezone (Settings). Else browser TZ. Else UTC so scan times are consistent.
  const displayTimezone = profile?.preferences?.timezone || browserTz || 'UTC';

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState({});
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [bottles, setBottles] = useState([]);
  const [barcodeToProductCode, setBarcodeToProductCode] = useState({});

  const selectedOrg = organization?.id ?? '';

  useEffect(() => {
    async function fetchUsers() {
      const { data, error } = await supabase.from('profiles').select('id, email, full_name');
      if (!error) {
        const userMap = {};
        data.forEach(user => {
          userMap[user.id] = user.full_name || user.email;
        });
        setUsers(userMap);
      }
    }
    fetchUsers();
  }, []);

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      setError(null);
      if (!selectedOrg) {
        setOrders([]);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('bottle_scans')
        .select('*')
        .not('order_number', 'is', null)
        .eq('organization_id', selectedOrg)
        .order('created_at', { ascending: false });
      if (error) setError(error.message);
      else setOrders(data || []);
      setLoading(false);
    }
    fetchOrders();
  }, [saving, selectedOrg]);

  // Resolve product_code from bottles table for displayed barcodes (bottle_scans may not have product_code)
  useEffect(() => {
    async function fetchProductCodes() {
      if (!selectedOrg || !orders?.length) {
        setBarcodeToProductCode({});
        return;
      }
      const barcodes = [...new Set(orders.map(o => (o.bottle_barcode || o.cylinder_barcode || o.barcode_number).trim()).filter(Boolean))];
      if (barcodes.length === 0) {
        setBarcodeToProductCode({});
        return;
      }
      const { data: bottleRows, error } = await supabase
        .from('bottles')
        .select('barcode_number, product_code')
        .eq('organization_id', selectedOrg)
        .in('barcode_number', barcodes);
      if (error) return;
      const map = {};
      (bottleRows || []).forEach(b => {
        const bc = (b.barcode_number || '').trim();
        if (bc) map[bc] = b.product_code || '';
      });
      setBarcodeToProductCode(map);
    }
    fetchProductCodes();
  }, [selectedOrg, orders]);

  const handleEdit = (order) => {
    if (!canBypassScanEditWindow) {
      const scanTime = parseDbTimestamp(order.timestamp || order.created_at) || new Date(0);
      const now = new Date();
      const hoursDiff = (now.getTime() - scanTime.getTime()) / (1000 * 60 * 60);
      if (hoursDiff > 24) {
        alert('Edit Not Allowed: Scans can only be edited within 24 hours of submission.');
        return;
      }
    }
    setEditingId(order.id);
    setEditForm({
      order_number: order.order_number || '',
      customer_name: order.customer_name || '',
      bottle_barcode: order.bottle_barcode || '',
    });
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleSave = async (id) => {
    setSaving(true);
    const { error } = await supabase
      .from('bottle_scans')
      .update({
        order_number: editForm.order_number,
        customer_name: editForm.customer_name,
        bottle_barcode: editForm.bottle_barcode,
      })
      .eq('id', id);
    setEditingId(null);
    setSaving(false);
    if (error) setError(error.message);
  };

  const handleEnhancedEdit = (order) => {
    if (!canBypassScanEditWindow) {
      const scanTime = parseDbTimestamp(order.timestamp || order.created_at) || new Date(0);
      const now = new Date();
      const hoursDiff = (now.getTime() - scanTime.getTime()) / (1000 * 60 * 60);
      if (hoursDiff > 24) {
        alert('Edit Not Allowed: Scans can only be edited within 24 hours of submission.');
        return;
      }
    }
    setSelectedOrder(order);
    setBottles([{ barcode: order.bottle_barcode, mode: order.mode }]);
    setEditForm({
      order_number: order.order_number || '',
      customer_name: order.customer_name || '',
      customer_id: order.customer_id || '',
    });
    setEditDialogOpen(true);
  };

  const handleAddBottle = () => {
    setBottles([...bottles, { barcode: '', mode: 'SHIP' }]);
  };

  const handleRemoveBottle = (index) => {
    if (bottles.length > 1) {
      setBottles(bottles.filter((_, i) => i !== index));
    }
  };

  const handleBottleChange = (index, field, value) => {
    const newBottles = [...bottles];
    newBottles[index][field] = value;
    setBottles(newBottles);
  };

  const handleSaveEnhanced = async () => {
    setSaving(true);
    try {
      // Update the main order record
      const { error: orderError } = await supabase
        .from('bottle_scans')
        .update({
          order_number: editForm.order_number,
          customer_name: editForm.customer_name,
          customer_id: editForm.customer_id,
          bottle_barcode: bottles[0]?.barcode,
          mode: bottles[0]?.mode,
        })
        .eq('id', selectedOrder.id);

      if (orderError) throw orderError;

      // If there are additional bottles, create new scan records
      if (bottles.length > 1) {
        const additionalBottles = bottles.slice(1);
        const newScans = additionalBottles.map(bottle => ({
          organization_id: selectedOrder.organization_id,
          order_number: editForm.order_number,
          customer_name: editForm.customer_name,
          customer_id: editForm.customer_id,
          bottle_barcode: bottle.barcode,
          mode: bottle.mode,
          user_id: selectedOrder.user_id,
          created_at: new Date().toISOString(),
          timestamp: new Date().toISOString(),
        }));

        const { error: scansError } = await supabase
          .from('bottle_scans')
          .insert(newScans);

        if (scansError) throw scansError;
      }

      setEditDialogOpen(false);
      setSaving(false);
    } catch (error) {
      setError(error.message);
      setSaving(false);
    }
  };

  // Deduplicate: one row per (order_number, bottle_barcode, customer), most recent scan wins (so same order + different customers both show)
  const dedupedOrders = React.useMemo(() => {
    const keyToRow = new Map();
    const norm = (v) => (v != null && v !== '') ? String(v).trim() : '';
    (orders || []).forEach(row => {
      const orderNum = norm(row.order_number);
      const barcode = norm(row.bottle_barcode || row.cylinder_barcode || row.barcode_number);
      const customer = norm(row.customer_name || row.customer_id || row.customer || '');
      if (!orderNum || !barcode) return;
      const key = `${orderNum}\t${barcode}\t${customer}`;
      const existing = keyToRow.get(key);
      const rowTime = new Date(row.created_at || 0).getTime();
      if (!existing || rowTime >= new Date(existing.created_at || 0).getTime()) {
        keyToRow.set(key, row);
      }
    });
    return Array.from(keyToRow.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [orders]);

  const getProductCode = (order) => {
    const fromScan = order.product_code;
    if (fromScan != null && fromScan !== '') return fromScan;
    const barcode = (order.bottle_barcode || order.cylinder_barcode || order.barcode_number || '').trim();
    return barcode ? (barcodeToProductCode[barcode] ?? '') : '';
  };

  // Filter orders by search
  const filteredOrders = dedupedOrders.filter(order => {
    if (!search) return true;
    const s = search.toLowerCase();
    const productCode = getProductCode(order);
    return (
      (order.order_number && order.order_number.toLowerCase().includes(s)) ||
      (order.customer_name && order.customer_name.toLowerCase().includes(s)) ||
      (order.bottle_barcode && order.bottle_barcode.toLowerCase().includes(s)) ||
      (productCode && productCode.toLowerCase().includes(s))
    );
  });

  const editableOrdersCount = filteredOrders.filter(order => {
    const scanTime = parseDbTimestamp(order.timestamp || order.created_at) || new Date(0);
    const now = new Date();
    const hoursDiff = (now.getTime() - scanTime.getTime()) / (1000 * 60 * 60);
    return canBypassScanEditWindow || hoursDiff <= 24;
  }).length;

  const workflowMetrics = [
    {
      label: 'Visible scans',
      value: filteredOrders.length,
      helper: 'Deduplicated order rows in the current view',
    },
    {
      label: 'Orders loaded',
      value: dedupedOrders.length,
      helper: 'Latest scan per order, asset, and customer combination',
    },
    {
      label: 'Editable now',
      value: editableOrdersCount,
      helper: canBypassScanEditWindow
        ? 'Admin / owner can revise all visible scans (no 24h limit)'
        : 'Standard users can edit scans from the last 24 hours',
    },
    {
      label: 'Timezone',
      value: displayTimezone,
      helper: profile?.preferences?.timezone ? 'Using profile timezone from settings' : 'Using browser fallback timezone',
    },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'var(--bg-main)', py: 4, borderRadius: 0, overflow: 'visible' }}>
      <Paper elevation={0} sx={{ width: '100%', p: { xs: 2, md: 3 }, borderRadius: 3, boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)', border: '1px solid rgba(15, 23, 42, 0.08)', bgcolor: 'var(--bg-main)', overflow: 'visible' }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, md: 3 },
            mb: 3,
            borderRadius: 3,
            border: '1px solid rgba(15, 23, 42, 0.08)',
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
            <Box>
              <Stack direction="row" spacing={1} sx={{ mb: 1.25, flexWrap: 'wrap' }}>
                <Chip label="Operations" color="primary" size="small" sx={{ borderRadius: 999, fontWeight: 700 }} />
                <Chip label="Scanned orders" size="small" variant="outlined" sx={{ borderRadius: 999 }} />
              </Stack>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em' }}>
                Scanned orders workspace
              </Typography>
              <Typography variant="body1" sx={{ color: '#64748b', mt: 1, maxWidth: 760 }}>
                Review scan submissions, correct order metadata, and keep time-sensitive edits visible for the operations team.
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: '#64748b', maxWidth: 320 }}>
              Scan times are shown in your timezone ({profile?.preferences?.timezone ? 'Settings' : 'browser'}
              {' → '}{displayTimezone}).
            </Typography>
          </Stack>
        </Paper>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {workflowMetrics.map((metric) => (
            <Grid item xs={12} sm={6} lg={3} key={metric.label}>
              <Card elevation={0} sx={{ borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)', height: '100%' }}>
                <CardContent sx={{ p: 2.25 }}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {metric.label}
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f172a', mt: 0.5, letterSpacing: '-0.03em' }}>
                    {metric.value}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', mt: 0.75 }}>
                    {metric.helper}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 2.5 },
            mb: 3,
            borderRadius: 2.5,
            border: '1px solid rgba(15, 23, 42, 0.08)',
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }}>
            <TextField
              size="small"
              label="Search orders, customer, product code, asset..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              sx={{ minWidth: { xs: '100%', md: 320 } }}
            />
            <Chip
              label={`${filteredOrders.length} visible row${filteredOrders.length === 1 ? '' : 's'}`}
              variant="outlined"
              sx={{ alignSelf: { xs: 'flex-start', md: 'center' }, borderRadius: 999, fontWeight: 700 }}
            />
          </Stack>
        </Paper>
        {!organization && (
          <Alert severity="info" sx={{ mb: 2 }}>
            No organization is linked to your account. Scanned orders will appear here once your account is assigned to an organization.
          </Alert>
        )}
        {loading ? (
          <Box p={4} textAlign="center"><CircularProgress /></Box>
        ) : error ? (
          <Alert severity="error">Error: {error}</Alert>
        ) : (
          <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.08)', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                  <TableCell>Scan ID</TableCell>
                  <TableCell>Order Number</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Product Code</TableCell>
                  <TableCell>Bottle Barcode</TableCell>
                  <TableCell>Mode</TableCell>
                  <TableCell>Scanned At</TableCell>
                  <TableCell>User ID</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredOrders.map(order => {
                  // Use timestamp (actual scan time from device) when available; else created_at
                  const scanTimeRaw = order.timestamp || order.created_at;
                  const scanTime = parseDbTimestamp(scanTimeRaw) || new Date(0);
                  const now = new Date();
                  const hoursDiff = (now.getTime() - scanTime.getTime()) / (1000 * 60 * 60);
                  const isEditable = canBypassScanEditWindow || hoursDiff <= 24;
                  
                  return (
                    <TableRow 
                      key={order.id}
                      sx={{
                        backgroundColor: isEditable ? 'inherit' : '#f5f5f5',
                        opacity: isEditable ? 1 : 0.7,
                        '&:hover': {
                          backgroundColor: isEditable ? '#f0f0f0' : '#f5f5f5',
                        }
                      }}
                    >
                      <TableCell>{order.id}</TableCell>
                      <TableCell>
                        {editingId === order.id ? (
                          <TextField
                            name="order_number"
                            value={editForm.order_number}
                            onChange={handleEditChange}
                            size="small"
                          />
                        ) : (
                          order.order_number
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === order.id ? (
                          <TextField
                            name="customer_name"
                            value={editForm.customer_name}
                            onChange={handleEditChange}
                            size="small"
                          />
                        ) : (
                          order.customer_name
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>{getProductCode(order) || '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        {editingId === order.id ? (
                          <TextField
                            name="bottle_barcode"
                            value={editForm.bottle_barcode}
                            onChange={handleEditChange}
                            size="small"
                            placeholder="Bottle barcode"
                          />
                        ) : (
                          order.bottle_barcode
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={order.mode} 
                          color={order.mode === 'SHIP' ? 'success' : order.mode === 'RETURN' ? 'warning' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{scanTimeRaw && scanTime.getTime() ? (() => {
                        try {
                          const opts = {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                            timeZone: displayTimezone,
                            timeZoneName: 'short'
                          };
                          return scanTime.toLocaleString(undefined, opts);
                        } catch {
                          return scanTime.toLocaleString();
                        }
                      })() : 'N/A'}</TableCell>
                      <TableCell>{users[order.user_id] || order.user_id || 'N/A'}</TableCell>
                      <TableCell>
                        {editingId === order.id ? (
                          <>
                            <Button
                              variant="contained"
                              color="success"
                              size="small"
                              onClick={() => handleSave(order.id)}
                              disabled={saving}
                              sx={{ mr: 1 }}
                            >Save</Button>
                            <Button
                              variant="outlined"
                              color="secondary"
                              size="small"
                              onClick={() => setEditingId(null)}
                            >Cancel</Button>
                          </>
                        ) : (
                          <>
                            <IconButton
                              size="small"
                              onClick={() => handleEnhancedEdit(order)}
                              color={isEditable ? "primary" : "disabled"}
                              disabled={!isEditable}
                            >
                              <Edit />
                            </IconButton>
                            {!isEditable && (
                              <Chip 
                                label="Edit Expired" 
                                color="error" 
                                size="small"
                                sx={{ ml: 1 }}
                              />
                            )}
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {filteredOrders.length === 0 && <Typography color="text.secondary" mt={2}>No scanned orders found.</Typography>}
          </TableContainer>
        )}
      </Paper>

      {/* Enhanced Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Order & Manage Bottles</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {/* Order Information */}
            <Typography variant="h6">Order Information</Typography>
            <TextField
              label="Order Number"
              name="order_number"
              value={editForm.order_number}
              onChange={handleEditChange}
              fullWidth
            />
            <TextField
              label="Customer Name"
              name="customer_name"
              value={editForm.customer_name}
              onChange={handleEditChange}
              fullWidth
            />
            <TextField
              label="Customer ID"
              name="customer_id"
              value={editForm.customer_id}
              onChange={handleEditChange}
              fullWidth
            />

            {/* Bottles Management */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
              <Typography variant="h6">Bottles ({bottles.length})</Typography>
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={handleAddBottle}
                size="small"
              >
                Add Bottle
              </Button>
            </Box>

            {bottles.map((bottle, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 2, alignItems: 'center', p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <TextField
                  label="Bottle Barcode"
                  value={bottle.barcode}
                  onChange={(e) => handleBottleChange(index, 'barcode', e.target.value)}
                  sx={{ flex: 1 }}
                />
                <FormControl sx={{ minWidth: 120 }}>
                  <InputLabel>Mode</InputLabel>
                  <Select
                    value={bottle.mode}
                    label="Mode"
                    onChange={(e) => handleBottleChange(index, 'mode', e.target.value)}
                  >
                    <MenuItem value="SHIP">SHIP</MenuItem>
                    <MenuItem value="RETURN">RETURN</MenuItem>
                    <MenuItem value="FILL">FILL</MenuItem>
                    <MenuItem value="LOCATE">LOCATE</MenuItem>
                  </Select>
                </FormControl>
                {bottles.length > 1 && (
                  <IconButton
                    color="error"
                    onClick={() => handleRemoveBottle(index)}
                  >
                    <Remove />
                  </IconButton>
                )}
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSaveEnhanced}
            variant="contained"
            disabled={saving}
            startIcon={<Save />}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 