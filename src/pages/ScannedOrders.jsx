import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, CircularProgress, Alert, MenuItem, Select, InputLabel, FormControl, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions
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
  const isAdmin = profile?.role === 'admin';
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

  const handleEdit = (order) => {
    if (!isAdmin) {
      const scanTime = new Date(order.created_at);
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
    if (!isAdmin) {
      const scanTime = new Date(order.created_at);
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

  // Filter orders by search
  const filteredOrders = orders.filter(order => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (order.order_number && order.order_number.toLowerCase().includes(s)) ||
      (order.customer_name && order.customer_name.toLowerCase().includes(s)) ||
      (order.bottle_barcode && order.bottle_barcode.toLowerCase().includes(s))
    );
  });

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'var(--bg-main)', py: 8, borderRadius: 0, overflow: 'visible' }}>
      <Paper elevation={0} sx={{ width: '100%', p: { xs: 2, md: 5 }, borderRadius: 0, boxShadow: '0 2px 12px 0 rgba(16,24,40,0.04)', border: '1px solid var(--divider)', bgcolor: 'var(--bg-main)', overflow: 'visible' }}>
        <Typography variant="h3" fontWeight={900} color="primary" mb={2} sx={{ letterSpacing: -1 }}>Scanned Orders</Typography>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} gap={2}>
          <TextField
            size="small"
            label="Search orders, customer, asset..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{ minWidth: 260 }}
          />
        </Box>
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
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Scan ID</TableCell>
                  <TableCell>Order Number</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Bottle Barcode</TableCell>
                  <TableCell>Mode</TableCell>
                  <TableCell>Scanned At</TableCell>
                  <TableCell>User ID</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredOrders.map(order => {
                  const scanTime = new Date(order.created_at);
                  const now = new Date();
                  const hoursDiff = (now.getTime() - scanTime.getTime()) / (1000 * 60 * 60);
                  const isEditable = isAdmin || hoursDiff <= 24;
                  
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
                      <TableCell>{order.created_at ? new Date(order.created_at).toLocaleString('en-US', { 
                        year: 'numeric', 
                        month: '2-digit', 
                        day: '2-digit', 
                        hour: '2-digit', 
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true 
                      }) : 'N/A'}</TableCell>
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