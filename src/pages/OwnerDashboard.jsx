import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow, Paper, Chip,
  Alert, CircularProgress, AppBar, Toolbar, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Select, FormControl, InputLabel, Snackbar,
  TextField, Grid, Switch, FormControlLabel, LinearProgress, Divider
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Dashboard as DashboardIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { subscriptionService } from '../services/subscriptionService';
import { usageService } from '../services/usageService';

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOrg, setEditOrg] = useState(null);
  const [editPlan, setEditPlan] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [plans, setPlans] = useState([]);
  const [editForm, setEditForm] = useState({});
  const [usageData, setUsageData] = useState({});
  const [discounts, setDiscounts] = useState([]);
  const [currentDiscount, setCurrentDiscount] = useState({
    name: '',
    type: 'percentage',
    value: 0,
    is_active: true
  });
  const [freeAccess, setFreeAccess] = useState(false);

  useEffect(() => {
    fetchOrganizations();
    fetchPlans();
    fetchDiscounts();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrganizations(data || []);

      // Fetch usage data for all organizations
      const usagePromises = (data || []).map(org => 
        usageService.getOrganizationUsage(org.id).catch(err => {
          console.error(`Error fetching usage for org ${org.id}:`, err);
          return null;
        })
      );

      const usageResults = await Promise.all(usagePromises);
      const usageMap = {};
      (data || []).forEach((org, index) => {
        if (usageResults[index]) {
          usageMap[org.id] = usageResults[index];
        }
      });
      setUsageData(usageMap);
    } catch (err) {
      console.error('Error fetching organizations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase.from('subscription_plans').select('*');
      if (error) throw error;
      setPlans(data || []);
    } catch (err) {
      setPlans([]);
    }
  };

  const fetchDiscounts = async () => {
    try {
      const { data, error } = await supabase.from('discounts').select('*');
      if (error) throw error;
      setDiscounts(data || []);
    } catch (err) {
      setDiscounts([]);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString();
  };

  const handleEditClick = (org) => {
    setEditOrg(org);
    setEditForm({
      name: org.name || '',
      slug: org.slug || '',
      domain: org.domain || '',
      subscription_plan: org.subscription_plan || 'basic',
      subscription_status: org.subscription_status || 'trial',
      trial_start_date: org.trial_start_date ? org.trial_start_date.split('T')[0] : '',
      trial_end_date: org.trial_end_date ? org.trial_end_date.split('T')[0] : '',
      max_users: org.max_users || 5,
      max_customers: org.max_customers || 100,
      max_bottles: org.max_bottles || 1000,
      payment_required: org.payment_required || false,
      stripe_customer_id: org.stripe_customer_id || '',
      stripe_subscription_id: org.stripe_subscription_id || '',
      admin_email: org.admin_email || '',
      admin_phone: org.admin_phone || '',
      subscription_plan_id: org.subscription_plan_id || '',
      active_discount_id: org.active_discount_id || ''
    });
    setFreeAccess(org.subscription_status === 'free');
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditOrg(null);
    setEditPlan('');
    setEditForm({});
    setFreeAccess(false);
  };

  const handlePlanChange = (e) => {
    setEditPlan(e.target.value);
  };

  const handleFormChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const updateData = {
        name: editForm.name,
        slug: editForm.slug,
        domain: editForm.domain || null,
        subscription_plan: editForm.subscription_plan,
        subscription_status: editForm.subscription_status,
        trial_start_date: editForm.trial_start_date ? new Date(editForm.trial_start_date).toISOString() : null,
        trial_end_date: editForm.trial_end_date ? new Date(editForm.trial_end_date).toISOString() : null,
        max_users: parseInt(editForm.max_users),
        max_customers: parseInt(editForm.max_customers),
        max_bottles: parseInt(editForm.max_bottles),
        payment_required: editForm.payment_required,
        stripe_customer_id: editForm.stripe_customer_id || null,
        stripe_subscription_id: editForm.stripe_subscription_id || null,
        admin_email: editForm.admin_email || null,
        admin_phone: editForm.admin_phone || null
      };

      if (freeAccess) {
        updateData.subscription_status = 'free';
        updateData.stripe_subscription_id = null;
        updateData.payment_required = false;
        updateData.active_discount_id = null;
      } else {
        if (editOrg.subscription_status === 'free') {
          updateData.subscription_status = 'active';
        }
      }

      const { error } = await supabase
        .from('organizations')
        .update(updateData)
        .eq('id', editOrg.id);

      if (error) throw error;

      setSnackbar({ open: true, message: 'Organization updated successfully!', severity: 'success' });
      handleModalClose();
      fetchOrganizations();
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to update organization', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelSubscription = async () => {
    setSaving(true);
    try {
      await subscriptionService.cancelSubscription(editOrg.id);
      setSnackbar({ open: true, message: 'Subscription cancelled.', severity: 'success' });
      handleModalClose();
      fetchOrganizations();
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to cancel subscription', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleReactivateSubscription = async () => {
    setSaving(true);
    try {
      await subscriptionService.reactivateSubscription(editOrg.id);
      setSnackbar({ open: true, message: 'Subscription reactivated.', severity: 'success' });
      handleModalClose();
      fetchOrganizations();
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to reactivate subscription', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const getUsageColor = (percentage) => {
    if (percentage >= 90) return 'error';
    if (percentage >= 75) return 'warning';
    return 'success';
  };

  const getUsageText = (orgId, resource) => {
    const usage = usageData[orgId];
    if (!usage || !usage[resource]) return 'N/A';
    
    const data = usage[resource];
    return `${data.current}/${data.max} (${data.percentage}%)`;
  };

  const handleCreateDiscount = async () => {
    if (!currentDiscount.name || currentDiscount.value <= 0) {
      setSnackbar({ open: true, message: 'Discount name and value are required.', severity: 'warning' });
      return;
    }
    const { data, error } = await supabase.from('discounts').insert(currentDiscount).select();
    if (error) {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    } else {
      setSnackbar({ open: true, message: 'Discount created!', severity: 'success' });
      setDiscounts(prev => [...prev, data[0]]);
      setCurrentDiscount({ name: '', type: 'percentage', value: 0, is_active: true });
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header */}
      <AppBar position="static" sx={{ mb: 3 }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/home')}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <DashboardIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Owner Dashboard - Customer Management
          </Typography>
          <Button 
            color="inherit" 
            onClick={() => navigate('/home')}
            startIcon={<DashboardIcon />}
          >
            Main Dashboard
          </Button>
        </Toolbar>
      </AppBar>

      {/* Content */}
      <Box sx={{ p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">
            Customer Organizations ({organizations.length})
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/register')}
          >
            Add New Customer
          </Button>
        </Box>

        {/* Organizations Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Organization</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Plan</TableCell>
                <TableCell>Usage</TableCell>
                <TableCell>Trial Ends</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {organizations.map((org) => (
                <TableRow key={org.id}>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {org.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {org.slug}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={org.subscription_status}
                      color={org.subscription_status === 'active' ? 'success' : 'warning'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{org.subscription_plan}</TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        Users: {getUsageText(org.id, 'users')}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        Customers: {getUsageText(org.id, 'customers')}
                      </Typography>
                      <Typography variant="body2">
                        Bottles: {getUsageText(org.id, 'bottles')}
                      </Typography>
                      {usageData[org.id] && (
                        <Box sx={{ mt: 1 }}>
                          {Object.entries(usageData[org.id]).map(([resource, data]) => (
                            <LinearProgress
                              key={resource}
                              variant="determinate"
                              value={data.percentage}
                              color={getUsageColor(data.percentage)}
                              sx={{ height: 4, mb: 0.5 }}
                            />
                          ))}
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {org.trial_end_date ? formatDate(org.trial_end_date) : 'N/A'}
                  </TableCell>
                  <TableCell>{formatDate(org.created_at)}</TableCell>
                  <TableCell>
                    <Button variant="outlined" size="small" onClick={() => handleEditClick(org)}>
                      Edit Plan
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {organizations.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary">
              No organizations found
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/register')}
              sx={{ mt: 2 }}
            >
              Add Your First Customer
            </Button>
          </Box>
        )}

        <Dialog open={modalOpen} onClose={handleModalClose} maxWidth="md" fullWidth>
          <DialogTitle>Edit Organization - {editOrg?.name}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Organization Name"
                  value={editForm.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Organization Slug"
                  value={editForm.slug}
                  onChange={(e) => handleFormChange('slug', e.target.value)}
                  margin="normal"
                  helperText="URL identifier"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Domain"
                  value={editForm.domain}
                  onChange={(e) => handleFormChange('domain', e.target.value)}
                  margin="normal"
                  helperText="Custom domain (optional)"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Subscription Plan</InputLabel>
                  <Select
                    value={editForm.subscription_plan}
                    onChange={(e) => handleFormChange('subscription_plan', e.target.value)}
                    label="Subscription Plan"
                  >
                    {plans.map(p => <MenuItem key={p.id} value={p.id}>{p.name} (${p.price}/{p.price_interval})</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Subscription Status</InputLabel>
                  <Select
                    value={editForm.subscription_status}
                    onChange={(e) => handleFormChange('subscription_status', e.target.value)}
                    label="Subscription Status"
                  >
                    <MenuItem value="trial">Trial</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                    <MenuItem value="suspended">Suspended</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={editForm.payment_required}
                      onChange={(e) => handleFormChange('payment_required', e.target.checked)}
                    />
                  }
                  label="Payment Required"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Trial Start Date"
                  type="date"
                  value={editForm.trial_start_date}
                  onChange={(e) => handleFormChange('trial_start_date', e.target.value)}
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Trial End Date"
                  type="date"
                  value={editForm.trial_end_date}
                  onChange={(e) => handleFormChange('trial_end_date', e.target.value)}
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Max Users"
                  type="number"
                  value={editForm.max_users}
                  onChange={(e) => handleFormChange('max_users', e.target.value)}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Max Customers"
                  type="number"
                  value={editForm.max_customers}
                  onChange={(e) => handleFormChange('max_customers', e.target.value)}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Max Bottles"
                  type="number"
                  value={editForm.max_bottles}
                  onChange={(e) => handleFormChange('max_bottles', e.target.value)}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Stripe Customer ID"
                  value={editForm.stripe_customer_id}
                  onChange={(e) => handleFormChange('stripe_customer_id', e.target.value)}
                  margin="normal"
                  helperText="Payment processor customer ID"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Stripe Subscription ID"
                  value={editForm.stripe_subscription_id}
                  onChange={(e) => handleFormChange('stripe_subscription_id', e.target.value)}
                  margin="normal"
                  helperText="Payment processor subscription ID"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Admin Email"
                  type="email"
                  value={editForm.admin_email}
                  onChange={(e) => handleFormChange('admin_email', e.target.value)}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Admin Phone"
                  value={editForm.admin_phone}
                  onChange={(e) => handleFormChange('admin_phone', e.target.value)}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={freeAccess}
                      onChange={(e) => setFreeAccess(e.target.checked)}
                      name="freeAccess"
                      color="primary"
                    />
                  }
                  label="Grant Free Access"
                />
              </Grid>
              {!freeAccess && (
                <>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth margin="normal">
                      <InputLabel id="plan-select-label">Subscription Plan</InputLabel>
                      <Select
                        labelId="plan-select-label"
                        value={editForm.subscription_plan_id}
                        onChange={(e) => handleFormChange('subscription_plan_id', e.target.value)}
                        label="Subscription Plan"
                      >
                        {plans.map(p => <MenuItem key={p.id} value={p.id}>{p.name} (${p.price}/{p.price_interval})</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Divider sx={{ my: 2 }}><Chip label="Discounts" /></Divider>
                    <FormControl fullWidth margin="normal">
                      <InputLabel id="discount-select-label">Apply Discount</InputLabel>
                      <Select
                        labelId="discount-select-label"
                        value={editForm.active_discount_id}
                        onChange={(e) => handleFormChange('active_discount_id', e.target.value)}
                        label="Apply Discount"
                      >
                        <MenuItem value=""><em>None</em></MenuItem>
                        {discounts.filter(d => d.is_active).map(d => (
                          <MenuItem key={d.id} value={d.id}>
                            {d.name} ({d.type === 'percentage' ? `${d.value}% off` : `$${d.value} off`})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={12}>
                    <Typography variant="h6" sx={{ mt: 2 }}>Create New Discount</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Discount Name"
                          value={currentDiscount.name}
                          onChange={(e) => setCurrentDiscount(p => ({...p, name: e.target.value}))}
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <TextField
                          label="Value"
                          type="number"
                          value={currentDiscount.value}
                          onChange={(e) => setCurrentDiscount(p => ({...p, value: e.target.value}))}
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <Select
                          value={currentDiscount.type}
                          onChange={(e) => setCurrentDiscount(p => ({...p, type: e.target.value}))}
                          fullWidth
                        >
                          <MenuItem value="percentage">%</MenuItem>
                          <MenuItem value="fixed_amount">$</MenuItem>
                        </Select>
                      </Grid>
                      <Grid item xs={12}>
                        <Button onClick={handleCreateDiscount} variant="outlined">Create Discount</Button>
                      </Grid>
                    </Grid>
                  </Grid>
                </>
              )}
            </Grid>
          </DialogContent>
          <DialogActions sx={{ flexDirection: 'column', alignItems: 'stretch', gap: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <Button onClick={handleModalClose} disabled={saving}>Cancel</Button>
              <Button onClick={handleSaveAll} variant="contained" disabled={saving}>
                {saving ? 'Saving...' : 'Save All Changes'}
              </Button>
            </Box>
            {editForm.subscription_status === 'active' ? (
              <Button color="warning" onClick={handleCancelSubscription} disabled={saving} fullWidth>
                Cancel Subscription
              </Button>
            ) : (
              <Button color="success" onClick={handleReactivateSubscription} disabled={saving} fullWidth>
                Reactivate Subscription
              </Button>
            )}
          </DialogActions>
        </Dialog>
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          message={snackbar.message}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        />
      </Box>
    </Box>
  );
} 