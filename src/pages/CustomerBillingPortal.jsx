import logger from '../utils/logger';
import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Grid, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Chip, Alert, CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, FormControl, InputLabel, Select, MenuItem, TextField,
  Divider, IconButton, Tooltip
} from '@mui/material';
import {
  Download as DownloadIcon,
  CreditCard as CreditCardIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { usageService } from '../services/usageService';
import { paymentService } from '../services/paymentService';
import { subscriptionService } from '../services/subscriptionService';
import { supabase } from '../supabase/client';

export default function CustomerBillingPortal() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [plans, setPlans] = useState({});
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile?.organization_id) {
      loadBillingData();
    }
  }, [profile]);

  const loadBillingData = async () => {
    try {
      setLoading(true);
      
      // Load organization data
      const { data: org } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single();
      
      setOrganization(org);

      // Load usage data
      const usageData = await usageService.getOrganizationUsage(profile.organization_id);
      setUsage(usageData);

      // Load invoices
      const invoiceData = await paymentService.getInvoiceHistory(profile.organization_id);
      setInvoices(invoiceData);

      // Load payment methods
      const paymentData = await paymentService.getPaymentMethods(profile.organization_id);
      setPaymentMethods(paymentData);

      // Load plans
      const plansData = await subscriptionService.getSubscriptionPlans();
      setPlans(plansData);

    } catch (err) {
      logger.error('Error loading billing data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!selectedPlan) return;
    
    setUpgrading(true);
    try {
      await subscriptionService.updateSubscription(profile.organization_id, selectedPlan);
      await loadBillingData(); // Refresh data
      setUpgradeModalOpen(false);
      setSelectedPlan('');
    } catch (err) {
      setError(err.message);
    } finally {
      setUpgrading(false);
    }
  };

  const getUsageColor = (percentage) => {
    if (percentage >= 90) return 'error';
    if (percentage >= 75) return 'warning';
    return 'success';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100); // Stripe amounts are in cents
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!organization) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Organization not found</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Billing & Usage
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Current Plan & Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h6">
                {plans[organization.subscription_plan]?.name || organization.subscription_plan} Plan
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ${plans[organization.subscription_plan]?.price || 0}/month
              </Typography>
            </Box>
            <Chip
              label={organization.subscription_status}
              color={organization.subscription_status === 'active' ? 'success' : 'warning'}
            />
          </Box>
          
          {organization.trial_end_date && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Trial ends on {formatDate(organization.trial_end_date)}
            </Alert>
          )}

          <Button
            variant="outlined"
            onClick={() => setUpgradeModalOpen(true)}
            startIcon={<TrendingUpIcon />}
          >
            Upgrade Plan
          </Button>
        </CardContent>
      </Card>

      {/* Usage Dashboard */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {usage && Object.entries(usage).map(([resource, data]) => (
          <Grid item xs={12} md={4} key={resource}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {resource.charAt(0).toUpperCase() + resource.slice(1)}
                </Typography>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">
                    {data.current} / {data.max}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {data.percentage}%
                  </Typography>
                </Box>
                
                <LinearProgress
                  variant="determinate"
                  value={data.percentage}
                  color={getUsageColor(data.percentage)}
                  sx={{ mb: 1 }}
                />
                
                {data.percentage >= 90 && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    <WarningIcon sx={{ mr: 1 }} />
                    Consider upgrading your plan
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Billing History */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Billing History
          </Typography>
          
          {invoices.length > 0 ? (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Invoice #</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>{formatDate(invoice.created)}</TableCell>
                      <TableCell>{invoice.number}</TableCell>
                      <TableCell>{formatCurrency(invoice.amount_paid)}</TableCell>
                      <TableCell>
                        <Chip
                          label={invoice.status}
                          color={invoice.status === 'paid' ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Download Invoice">
                          <IconButton
                            size="small"
                            onClick={() => window.open(invoice.hosted_invoice_url, '_blank')}
                          >
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No billing history available
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Payment Methods
          </Typography>
          
          {paymentMethods.length > 0 ? (
            <Box>
              {paymentMethods.map((method) => (
                <Box key={method.id} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CreditCardIcon sx={{ mr: 2 }} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body1">
                      •••• •••• •••• {method.card.last4}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Expires {method.card.exp_month}/{method.card.exp_year}
                    </Typography>
                  </Box>
                  {method.id === organization.default_payment_method_id && (
                    <Chip label="Default" color="primary" size="small" />
                  )}
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No payment methods on file
            </Typography>
          )}
          
          <Button
            variant="outlined"
            startIcon={<CreditCardIcon />}
            sx={{ mt: 2 }}
          >
            Add Payment Method
          </Button>
        </CardContent>
      </Card>

      {/* Upgrade Plan Modal */}
      <Dialog open={upgradeModalOpen} onClose={() => setUpgradeModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upgrade Your Plan</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Choose a plan that better fits your needs
          </Typography>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Select Plan</InputLabel>
            <Select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              label="Select Plan"
            >
              {Object.entries(plans).map(([key, plan]) => (
                <MenuItem key={key} value={key}>
                  <Box>
                    <Typography variant="body1">{plan.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      ${plan.price}/month - {plan.users} users, {plan.customers} customers, {plan.bottles} bottles
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {selectedPlan && (
            <Alert severity="info">
              <Typography variant="body2">
                Your plan will be updated immediately. Any prorated charges will be reflected in your next invoice.
              </Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpgradeModalOpen(false)} disabled={upgrading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpgrade}
            variant="contained"
            disabled={!selectedPlan || upgrading}
          >
            {upgrading ? 'Upgrading...' : 'Upgrade Plan'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 