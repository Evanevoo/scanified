import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSubscriptions } from '../context/SubscriptionContext';
import { useTheme } from '../context/ThemeContext';
import {
  modifySubscription, cancelSubscription, renewSubscription,
  generateInvoice, getEffectivePrice,
} from '../services/subscriptionService';
import { supabase } from '../supabase/client';
import {
  formatCurrency, formatDate, formatPeriod, computeSubscriptionTotal,
  STATUS_COLORS,
} from '../utils/subscriptionUtils';
import {
  Box, Typography, Paper, Stack, Grid, Chip, Button, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Alert, LinearProgress,
  Card, CardContent, Tooltip, Divider,
} from '@mui/material';
import {
  ArrowBack, Add as AddIcon, Delete as RemoveIcon, Receipt as InvoiceIcon,
  Cancel as CancelIcon, Autorenew as RenewIcon, Edit as EditIcon,
} from '@mui/icons-material';

export default function SubscriptionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { organization } = useAuth();
  const ctx = useSubscriptions();
  const { organizationColors } = useTheme();
  const primaryColor = organizationColors?.primary || '#40B5AD';

  const [addItemOpen, setAddItemOpen] = useState(false);
  const [newItem, setNewItem] = useState({ product_code: '', quantity: 1, unit_price: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelPolicy, setCancelPolicy] = useState('end_of_term');

  const sub = ctx.subscriptions.find((s) => s.id === id);
  const items = useMemo(() => ctx.subscriptionItems.filter((i) => i.subscription_id === id), [ctx.subscriptionItems, id]);
  const activeItems = items.filter((i) => i.status === 'active');
  const customer = ctx.customers.find((c) => c.id === sub?.customer_id || c.CustomerListID === sub?.customer_id);
  const subInvoices = useMemo(() => ctx.invoices.filter((i) => i.subscription_id === id), [ctx.invoices, id]);
  const total = computeSubscriptionTotal(activeItems);

  const handleAddItem = async () => {
    setSaving(true);
    setError(null);
    try {
      let price = parseFloat(newItem.unit_price);
      if (!price && organization?.id && newItem.product_code) {
        price = await getEffectivePrice(organization.id, sub.customer_id, newItem.product_code, sub.billing_period);
      }
      await modifySubscription(id, [{ product_code: newItem.product_code, quantity: parseInt(newItem.quantity) || 1, unit_price: price || 0 }], []);
      setAddItemOpen(false);
      setNewItem({ product_code: '', quantity: 1, unit_price: '' });
      ctx.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveItem = async (itemId) => {
    setSaving(true);
    setError(null);
    try {
      await modifySubscription(id, [], [itemId]);
      ctx.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    setSaving(true);
    setError(null);
    try {
      await cancelSubscription(id, cancelPolicy);
      setCancelOpen(false);
      ctx.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRenew = async () => {
    setSaving(true);
    setError(null);
    try {
      await renewSubscription(id);
      ctx.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateInvoice = async () => {
    setSaving(true);
    setError(null);
    try {
      await generateInvoice(organization.id, id);
      ctx.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (ctx.loading) {
    return <Box sx={{ p: 4 }}><LinearProgress /></Box>;
  }

  if (!sub) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">Subscription not found</Typography>
        <Button onClick={() => navigate('/subscriptions')} sx={{ mt: 2 }}>Back to Subscriptions</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, minHeight: '100%' }}>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/subscriptions')} sx={{ mb: 2, textTransform: 'none' }}>
        Back to Subscriptions
      </Button>

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 3, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>{customer?.name || customer?.Name || sub.customer_id}</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Chip label={sub.status} color={STATUS_COLORS[sub.status] || 'default'} size="small" sx={{ fontWeight: 600, textTransform: 'capitalize' }} />
              <Chip label={sub.billing_period} variant="outlined" size="small" sx={{ fontWeight: 600, textTransform: 'capitalize' }} />
              {sub.auto_renew && <Chip label="Auto-renew" variant="outlined" size="small" color="success" sx={{ fontWeight: 600 }} />}
            </Stack>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setAddItemOpen(true)} disabled={sub.status !== 'active'} sx={{ textTransform: 'none', borderRadius: 2 }}>
              Add Item
            </Button>
            <Button variant="outlined" startIcon={<InvoiceIcon />} onClick={handleGenerateInvoice} disabled={saving} sx={{ textTransform: 'none', borderRadius: 2 }}>
              Generate Invoice
            </Button>
            {sub.status === 'active' ? (
              <Button variant="outlined" color="error" startIcon={<CancelIcon />} onClick={() => setCancelOpen(true)} sx={{ textTransform: 'none', borderRadius: 2 }}>
                Cancel
              </Button>
            ) : (
              <Button variant="outlined" color="success" startIcon={<RenewIcon />} onClick={handleRenew} disabled={saving} sx={{ textTransform: 'none', borderRadius: 2 }}>
                Renew
              </Button>
            )}
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={3}>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem' }}>Start Date</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>{formatDate(sub.start_date)}</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem' }}>Current Period</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>{formatPeriod(sub.current_period_start, sub.current_period_end)}</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem' }}>Next Billing</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>{formatDate(sub.next_billing_date)}</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem' }}>Total / Cycle</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: primaryColor }}>{formatCurrency(total)}</Typography>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Subscription Items</Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: 'text.secondary' } }}>
                    <TableCell>Product</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="center">Qty</TableCell>
                    <TableCell align="right">Unit Price</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>No items. Add items to this subscription.</TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item.id} sx={{ opacity: item.status === 'removed' ? 0.5 : 1 }}>
                        <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace' }}>{item.product_code || '—'}</TableCell>
                        <TableCell>{item.description || '—'}</TableCell>
                        <TableCell align="center">{item.quantity}</TableCell>
                        <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>{formatCurrency((parseFloat(item.unit_price) || 0) * item.quantity)}</TableCell>
                        <TableCell align="center">
                          <Chip label={item.status} size="small" color={item.status === 'active' ? 'success' : 'default'} sx={{ fontWeight: 600, textTransform: 'capitalize' }} />
                        </TableCell>
                        <TableCell align="right">
                          {item.status === 'active' && (
                            <Tooltip title="Remove item">
                              <IconButton size="small" color="error" onClick={() => handleRemoveItem(item.id)} disabled={saving}>
                                <RemoveIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Billing History</Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: 'text.secondary' } }}>
                    <TableCell>Invoice #</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {subInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>No invoices yet.</TableCell>
                    </TableRow>
                  ) : (
                    subInvoices.map((inv) => (
                      <TableRow key={inv.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/invoices?id=${inv.id}`)}>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.8rem' }}>{inv.invoice_number}</TableCell>
                        <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{formatCurrency(inv.total_amount)}</TableCell>
                        <TableCell>
                          <Chip label={inv.status} size="small" color={STATUS_COLORS[inv.status] || 'default'} sx={{ fontWeight: 600, textTransform: 'capitalize' }} />
                        </TableCell>
                        <TableCell>{formatDate(inv.created_at)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Add Item Dialog */}
      <Dialog open={addItemOpen} onClose={() => setAddItemOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add Item</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Product Code</InputLabel>
              <Select
                value={newItem.product_code}
                label="Product Code"
                onChange={(e) => {
                  const pc = e.target.value;
                  const pricing = ctx.assetTypePricing.find((p) => p.product_code === pc);
                  const price = sub.billing_period === 'yearly' ? pricing?.yearly_price : pricing?.monthly_price;
                  setNewItem((p) => ({ ...p, product_code: pc, unit_price: price || '' }));
                }}
              >
                {ctx.assetTypePricing.map((p) => (
                  <MenuItem key={p.id} value={p.product_code}>
                    {p.product_code} — {p.description || p.category || 'No description'} ({formatCurrency(sub.billing_period === 'yearly' ? p.yearly_price : p.monthly_price)})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              size="small" label="Quantity" type="number"
              value={newItem.quantity}
              onChange={(e) => setNewItem((p) => ({ ...p, quantity: e.target.value }))}
              inputProps={{ min: 1 }}
            />
            <TextField
              size="small" label="Unit Price" type="number"
              value={newItem.unit_price}
              onChange={(e) => setNewItem((p) => ({ ...p, unit_price: e.target.value }))}
              inputProps={{ min: 0, step: 0.01 }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddItemOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleAddItem} disabled={saving || !newItem.product_code} sx={{ textTransform: 'none', bgcolor: primaryColor }}>
            {saving ? 'Adding...' : 'Add Item'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Cancel Subscription</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>Choose when to cancel this subscription:</Typography>
          <FormControl fullWidth size="small">
            <InputLabel>Cancellation Policy</InputLabel>
            <Select value={cancelPolicy} label="Cancellation Policy" onChange={(e) => setCancelPolicy(e.target.value)}>
              <MenuItem value="end_of_term">End of current period</MenuItem>
              <MenuItem value="immediate">Immediately</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCancelOpen(false)} sx={{ textTransform: 'none' }}>Keep Subscription</Button>
          <Button variant="contained" color="error" onClick={handleCancel} disabled={saving} sx={{ textTransform: 'none' }}>
            {saving ? 'Cancelling...' : 'Confirm Cancel'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
