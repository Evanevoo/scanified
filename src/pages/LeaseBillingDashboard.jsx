import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  Alert,
  LinearProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  AttachMoney as MoneyIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
  Receipt as ReceiptIcon,
  PlayArrow as ProcessIcon,
  Payment as PaymentIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import LeaseBillingService from '../services/leaseBillingService';

export default function LeaseBillingDashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [processingBilling, setProcessingBilling] = useState(false);
  const [billingStats, setBillingStats] = useState({
    totalDue: 0,
    totalOverdue: 0,
    totalPaid: 0,
    agreementsDue: 0,
    agreementsOverdue: 0
  });
  const [dueBilling, setDueBilling] = useState([]);
  const [overdueBilling, setOverdueBilling] = useState([]);
  const [recentBilling, setRecentBilling] = useState([]);
  const [paymentDialog, setPaymentDialog] = useState({ open: false, billing: null });
  const [paymentData, setPaymentData] = useState({
    payment_method: '',
    payment_reference: ''
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (profile?.organization_id) {
      fetchBillingData();
    }
  }, [profile]);

  const fetchBillingData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchBillingStats(),
        fetchDueBilling(),
        fetchOverdueBilling(),
        fetchRecentBilling()
      ]);
    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBillingStats = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const summary = await LeaseBillingService.getBillingSummary(
        profile.organization_id,
        thirtyDaysAgo.toISOString().split('T')[0],
        new Date().toISOString().split('T')[0]
      );

      setBillingStats({
        totalDue: summary.totalPending,
        totalOverdue: summary.totalOverdue,
        totalPaid: summary.totalPaid,
        agreementsDue: 0, // Will be calculated from due billing
        agreementsOverdue: 0 // Will be calculated from overdue billing
      });
    } catch (error) {
      console.error('Error fetching billing stats:', error);
    }
  };

  const fetchDueBilling = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('lease_agreements')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('status', 'active')
        .lte('next_billing_date', today);

      if (error) throw error;
      setDueBilling(data || []);
      
      setBillingStats(prev => ({
        ...prev,
        agreementsDue: data?.length || 0
      }));
    } catch (error) {
      console.error('Error fetching due billing:', error);
    }
  };

  const fetchOverdueBilling = async () => {
    try {
      const overdue = await LeaseBillingService.getOverdueBilling(profile.organization_id);
      setOverdueBilling(overdue);
      
      setBillingStats(prev => ({
        ...prev,
        agreementsOverdue: overdue.length
      }));
    } catch (error) {
      console.error('Error fetching overdue billing:', error);
    }
  };

  const fetchRecentBilling = async () => {
    try {
      const { data, error } = await supabase
        .from('lease_billing_history')
        .select(`
          *,
          lease_agreements (
            customer_name,
            agreement_number
          )
        `)
        .eq('organization_id', profile.organization_id)
        .order('billing_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentBilling(data || []);
    } catch (error) {
      console.error('Error fetching recent billing:', error);
    }
  };

  const handleProcessDueBilling = async () => {
    setProcessingBilling(true);
    try {
      const results = await LeaseBillingService.processDueBilling();
      
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      
      setSnackbar({
        open: true,
        message: `Processed ${successCount} billing records successfully${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
        severity: failureCount > 0 ? 'warning' : 'success'
      });
      
      await fetchBillingData();
    } catch (error) {
      console.error('Error processing billing:', error);
      setSnackbar({
        open: true,
        message: 'Error processing billing',
        severity: 'error'
      });
    } finally {
      setProcessingBilling(false);
    }
  };

  const handleMarkAsPaid = async () => {
    try {
      await LeaseBillingService.markBillingAsPaid(
        paymentDialog.billing.id,
        paymentData.payment_method,
        paymentData.payment_reference
      );
      
      setSnackbar({
        open: true,
        message: 'Payment recorded successfully',
        severity: 'success'
      });
      
      setPaymentDialog({ open: false, billing: null });
      setPaymentData({ payment_method: '', payment_reference: '' });
      await fetchBillingData();
    } catch (error) {
      console.error('Error marking as paid:', error);
      setSnackbar({
        open: true,
        message: 'Error recording payment',
        severity: 'error'
      });
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'success';
      case 'overdue': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box p={3}>
        <LinearProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading billing dashboard...
        </Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Lease Billing Dashboard
        </Typography>
        <Button
          variant="contained"
          startIcon={<ProcessIcon />}
          onClick={handleProcessDueBilling}
          disabled={processingBilling || dueBilling.length === 0}
        >
          {processingBilling ? 'Processing...' : `Process Due Billing (${dueBilling.length})`}
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <ScheduleIcon color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">{formatCurrency(billingStats.totalDue)}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Due ({billingStats.agreementsDue} agreements)
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <WarningIcon color="error" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">{formatCurrency(billingStats.totalOverdue)}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Overdue ({billingStats.agreementsOverdue} agreements)
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <CheckIcon color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">{formatCurrency(billingStats.totalPaid)}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Paid (Last 30 days)
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <MoneyIcon color="info" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">
                    {formatCurrency(billingStats.totalDue + billingStats.totalOverdue + billingStats.totalPaid)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Billed
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Alerts */}
      {billingStats.agreementsOverdue > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle1">
            {billingStats.agreementsOverdue} agreement{billingStats.agreementsOverdue > 1 ? 's have' : ' has'} overdue payments totaling {formatCurrency(billingStats.totalOverdue)}
          </Typography>
        </Alert>
      )}

      {billingStats.agreementsDue > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle1">
            {billingStats.agreementsDue} agreement{billingStats.agreementsDue > 1 ? 's are' : ' is'} due for billing
          </Typography>
        </Alert>
      )}

      {/* Recent Billing History */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Billing History
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Invoice #</TableCell>
                  <TableCell>Agreement</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Billing Date</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentBilling.map((billing) => (
                  <TableRow key={billing.id}>
                    <TableCell>{billing.invoice_number}</TableCell>
                    <TableCell>{billing.lease_agreements?.agreement_number}</TableCell>
                    <TableCell>{billing.lease_agreements?.customer_name}</TableCell>
                    <TableCell>{formatDate(billing.billing_date)}</TableCell>
                    <TableCell>{formatDate(billing.due_date)}</TableCell>
                    <TableCell>{formatCurrency(billing.total_amount)}</TableCell>
                    <TableCell>
                      <Chip
                        label={billing.payment_status}
                        color={getPaymentStatusColor(billing.payment_status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <IconButton size="small">
                          <ViewIcon />
                        </IconButton>
                        {billing.payment_status === 'pending' && (
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => setPaymentDialog({ open: true, billing })}
                          >
                            <PaymentIcon />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog
        open={paymentDialog.open}
        onClose={() => setPaymentDialog({ open: false, billing: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Record Payment</DialogTitle>
        <DialogContent>
          <Box pt={2}>
            <Typography variant="body1" mb={2}>
              Recording payment for invoice {paymentDialog.billing?.invoice_number}
            </Typography>
            <Typography variant="h6" mb={3}>
              Amount: {formatCurrency(paymentDialog.billing?.total_amount || 0)}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    value={paymentData.payment_method}
                    onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                    label="Payment Method"
                  >
                    <MenuItem value="check">Check</MenuItem>
                    <MenuItem value="credit_card">Credit Card</MenuItem>
                    <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                    <MenuItem value="cash">Cash</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Payment Reference"
                  value={paymentData.payment_reference}
                  onChange={(e) => setPaymentData({ ...paymentData, payment_reference: e.target.value })}
                  placeholder="Check number, transaction ID, etc."
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialog({ open: false, billing: null })}>
            Cancel
          </Button>
          <Button
            onClick={handleMarkAsPaid}
            variant="contained"
            disabled={!paymentData.payment_method}
          >
            Record Payment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 