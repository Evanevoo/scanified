import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, CircularProgress, Alert, MenuItem, Select, InputLabel, FormControl
} from '@mui/material';

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
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchOrganizations() {
      const { data, error } = await supabase.from('organizations').select('id, name');
      if (!error) setOrganizations(data || []);
    }
    fetchOrganizations();
  }, []);

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      setError(null);
      let query = supabase.from('sales_orders').select('*').not('scanned_at', 'is', null).order('scanned_at', { ascending: false });
      if (selectedOrg) query = query.eq('organization_id', selectedOrg);
      const { data, error } = await query;
      if (error) setError(error.message);
      else setOrders(data || []);
      setLoading(false);
    }
    fetchOrders();
  }, [saving, selectedOrg]);

  const handleEdit = (order) => {
    setEditingId(order.id);
    setEditForm({
      sales_order_number: order.sales_order_number || '',
      customer_name: order.customer_name || '',
      assets: order.assets || '',
    });
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleSave = async (id) => {
    setSaving(true);
    const { error } = await supabase
      .from('sales_orders')
      .update({
        sales_order_number: editForm.sales_order_number,
        customer_name: editForm.customer_name,
        assets: editForm.assets,
      })
      .eq('id', id);
    setEditingId(null);
    setSaving(false);
    if (error) setError(error.message);
  };

  // Filter orders by search
  const filteredOrders = orders.filter(order => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (order.sales_order_number && order.sales_order_number.toLowerCase().includes(s)) ||
      (order.customer_name && order.customer_name.toLowerCase().includes(s)) ||
      (order.assets && order.assets.toLowerCase && order.assets.toLowerCase().includes(s))
    );
  });

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fff', py: 8, borderRadius: 0, overflow: 'visible' }}>
      <Paper elevation={0} sx={{ width: '100%', p: { xs: 2, md: 5 }, borderRadius: 0, boxShadow: '0 2px 12px 0 rgba(16,24,40,0.04)', border: '1px solid #eee', bgcolor: '#fff', overflow: 'visible' }}>
        <Typography variant="h3" fontWeight={900} color="primary" mb={2} sx={{ letterSpacing: -1 }}>Scanned Orders</Typography>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} gap={2}>
          <FormControl sx={{ minWidth: 220 }} size="small">
            <InputLabel>Organization</InputLabel>
            <Select
              value={selectedOrg}
              label="Organization"
              onChange={e => setSelectedOrg(e.target.value)}
            >
              <MenuItem value="">All Organizations</MenuItem>
              {organizations.map(org => (
                <MenuItem key={org.id} value={org.id}>{org.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            size="small"
            label="Search orders, customer, asset..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{ minWidth: 260 }}
          />
          <Button
            variant="outlined"
            color="secondary"
            size="small"
            onClick={() => setDebugMode(v => !v)}
          >
            {debugMode ? 'Hide Debug' : 'Show Debug'}
          </Button>
        </Box>
        {loading ? (
          <Box p={4} textAlign="center"><CircularProgress /></Box>
        ) : error ? (
          <Alert severity="error">Error: {error}</Alert>
        ) : (
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Order ID</TableCell>
                  <TableCell>Order Number</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Assets</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Scanned At</TableCell>
                  <TableCell>Scanned By</TableCell>
                  <TableCell>Actions</TableCell>
                  {debugMode && <TableCell>Debug</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredOrders.map(order => {
                  const isMismatched = !order.assets || !order.status;
                  let assetList = [];
                  if (Array.isArray(order.assets)) assetList = order.assets;
                  else if (typeof order.assets === 'string') assetList = order.assets.split(',').map(a => a.trim()).filter(Boolean);
                  return (
                    <TableRow key={order.id} className={isMismatched ? 'bg-red-100' : ''}>
                      <TableCell>{order.id}</TableCell>
                      <TableCell>
                        {editingId === order.id ? (
                          <TextField
                            name="sales_order_number"
                            value={editForm.sales_order_number}
                            onChange={handleEditChange}
                            size="small"
                          />
                        ) : (
                          order.sales_order_number
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
                            name="assets"
                            value={editForm.assets}
                            onChange={handleEditChange}
                            size="small"
                            placeholder="Comma-separated asset IDs"
                          />
                        ) : (
                          <Box display="flex" flexDirection="column" gap={0.5}>
                            {assetList.map((asset, idx) => (
                              <AssetWithWarning key={asset + idx} asset={asset} currentCustomer={order.customer_name} />
                            ))}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>{order.status}</TableCell>
                      <TableCell>{order.scanned_at ? new Date(order.scanned_at).toLocaleString() : ''}</TableCell>
                      <TableCell>{order.scanned_by}</TableCell>
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
                          <Button
                            variant="contained"
                            color="primary"
                            size="small"
                            onClick={() => handleEdit(order)}
                          >Edit</Button>
                        )}
                      </TableCell>
                      {debugMode && (
                        <TableCell>
                          <pre style={{ fontSize: 10, maxWidth: 200, whiteSpace: 'pre-wrap' }}>{JSON.stringify(order, null, 2)}</pre>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {filteredOrders.length === 0 && <Typography color="text.secondary" mt={2}>No scanned orders found.</Typography>}
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
} 