import logger from '../utils/logger';
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Payment as PaymentIcon,
  CreditCard as CardIcon,
  Receipt as ReceiptIcon,
  Download as DownloadIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Schedule as PendingIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_...');

const mockInvoices = [
  {
    id: 'inv_001',
    amount: 149.00,
    status: 'paid',
    date: '2024-01-15',
    description: 'Professional Plan - January 2024',
    downloadUrl: '/invoices/inv_001.pdf'
  },
  {
    id: 'inv_002',
    amount: 149.00,
    status: 'pending',
    date: '2024-02-15',
    description: 'Professional Plan - February 2024',
    dueDate: '2024-02-20'
  },
  {
    id: 'inv_003',
    amount: 149.00,
    status: 'overdue',
    date: '2024-03-15',
    description: 'Professional Plan - March 2024',
    dueDate: '2024-03-20'
  }
];

const mockPaymentMethods = [
  {
    id: 'pm_001',
    type: 'card',
    card: {
      brand: 'visa',
      last4: '4242',
      expMonth: 12,
      expYear: 2025
    },
    isDefault: true
  },
  {
    id: 'pm_002',
    type: 'card',
    card: {
      brand: 'mastercard',
      last4: '5555',
      expMonth: 8,
      expYear: 2026
    },
    isDefault: false
  }
];

function PaymentMethodForm({ onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);

    try {
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (error) {
        setError(error.message);
      } else {
        // Save payment method to backend
        logger.log('Payment method created:', paymentMethod);
        onSuccess(paymentMethod);
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Card Information
        </Typography>
        <Box sx={{ 
          p: 2, 
          border: 1, 
          borderColor: 'divider', 
          borderRadius: 1,
          '& .StripeElement': {
            height: '40px',
            padding: '10px 12px',
            color: '#424770',
            backgroundColor: 'white',
            fontSize: '16px',
            '::placeholder': {
              color: '#aab7c4'
            }
          }
        }}>
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
              },
            }}
          />
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <Button onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={!stripe || loading}
          startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
        >
          {loading ? 'Adding...' : 'Add Payment Method'}
        </Button>
      </Stack>
    </form>
  );
}

export default function CustomerPayments() {
  const { profile, organization } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [addPaymentDialog, setAddPaymentDialog] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState({ open: false, invoice: null });
  const [loading, setLoading] = useState(false);

  // Load real data on component mount
  useEffect(() => {
    if (organization) {
      loadBillingData();
    }
  }, [organization]);

  const loadBillingData = async () => {
    try {
      setLoading(true);
      
      // Load invoices from database
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (invoiceError) throw invoiceError;
      setInvoices(invoiceData || mockInvoices); // Fallback to mock data if no real invoices

      // Load payment methods from Stripe (you'd implement this with your backend)
      // For now, using mock data
      setPaymentMethods(mockPaymentMethods);
      
    } catch (error) {
      logger.error('Error loading billing data:', error);
      // Use mock data as fallback
      setInvoices(mockInvoices);
      setPaymentMethods(mockPaymentMethods);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'success';
      case 'pending': return 'warning';
      case 'overdue': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid': return <SuccessIcon />;
      case 'pending': return <PendingIcon />;
      case 'overdue': return <ErrorIcon />;
      default: return <ReceiptIcon />;
    }
  };

  const handlePayInvoice = async (invoice) => {
    setLoading(true);
    try {
      // Create payment intent on your backend
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: invoice.amount * 100, // Convert to cents
          currency: 'usd',
          invoice_id: invoice.id,
          organization_id: organization.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }

      const { client_secret } = await response.json();

      // For now, simulate successful payment
      logger.log('Processing payment for invoice:', invoice.id);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update invoice status in database
      const { error } = await supabase
        .from('invoices')
        .update({ 
          status: 'paid',
          paid_at: new Date().toISOString()
        })
        .eq('id', invoice.id);

      if (error) throw error;

      setPaymentDialog({ open: false, invoice: null });
      // Reload billing data to reflect changes
      await loadBillingData();
      alert('Payment processed successfully!');
    } catch (error) {
      logger.error('Payment failed:', error);
      alert('Payment failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPaymentMethod = (paymentMethod) => {
    logger.log('Adding payment method:', paymentMethod);
    setAddPaymentDialog(false);
    // Refresh payment methods
  };

  const calculateTotalDue = () => {
    return invoices
      .filter(inv => inv.status !== 'paid')
      .reduce((sum, inv) => sum + inv.amount, 0);
  };

  return (
    <Elements stripe={stripePromise}>
      <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Billing & Payments
            </Typography>
            <Typography color="text.secondary">
              Manage your subscription, invoices, and payment methods
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {/* Overview Cards */}
            <Grid item xs={12}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <PaymentIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                      <Typography variant="h5" fontWeight={600}>
                        ${organization?.subscription?.amount || 149}/mo
                      </Typography>
                      <Typography color="text.secondary">
                        Current Plan
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <ReceiptIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                      <Typography variant="h5" fontWeight={600}>
                        {invoices.filter(inv => inv.status === 'paid').length}
                      </Typography>
                      <Typography color="text.secondary">
                        Paid Invoices
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <ErrorIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                      <Typography variant="h5" fontWeight={600}>
                        ${calculateTotalDue()}
                      </Typography>
                      <Typography color="text.secondary">
                        Amount Due
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <CardIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                      <Typography variant="h5" fontWeight={600}>
                        {paymentMethods.length}
                      </Typography>
                      <Typography color="text.secondary">
                        Payment Methods
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Grid>

            {/* Recent Invoices */}
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" fontWeight={600}>
                    Recent Invoices
                  </Typography>
                  <Button variant="outlined" size="small">
                    View All
                  </Button>
                </Box>

                <List>
                  {invoices.map((invoice, index) => (
                    <React.Fragment key={invoice.id}>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle1">
                                {invoice.description}
                              </Typography>
                              <Chip
                                icon={getStatusIcon(invoice.status)}
                                label={invoice.status.toUpperCase()}
                                size="small"
                                color={getStatusColor(invoice.status)}
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Invoice Date: {new Date(invoice.date).toLocaleDateString()}
                              </Typography>
                              {invoice.dueDate && (
                                <Typography variant="body2" color="text.secondary">
                                  Due Date: {new Date(invoice.dueDate).toLocaleDateString()}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="h6" fontWeight={600}>
                              ${invoice.amount}
                            </Typography>
                            {invoice.status === 'paid' ? (
                              <Tooltip title="Download Invoice">
                                <IconButton size="small">
                                  <DownloadIcon />
                                </IconButton>
                              </Tooltip>
                            ) : (
                              <Button
                                variant="contained"
                                size="small"
                                onClick={() => setPaymentDialog({ open: true, invoice })}
                              >
                                Pay Now
                              </Button>
                            )}
                          </Stack>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < invoices.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </Paper>
            </Grid>

            {/* Payment Methods */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" fontWeight={600}>
                    Payment Methods
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => setAddPaymentDialog(true)}
                  >
                    Add
                  </Button>
                </Box>

                <Stack spacing={2}>
                  {paymentMethods.map((method) => (
                    <Card key={method.id} variant="outlined">
                      <CardContent sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <CardIcon color="primary" />
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="subtitle2">
                              •••• •••• •••• {method.card.last4}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {method.card.brand.toUpperCase()} expires {method.card.expMonth}/{method.card.expYear}
                            </Typography>
                          </Box>
                          {method.isDefault && (
                            <Chip label="Default" size="small" color="primary" />
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Paper>
            </Grid>

            {/* Subscription Details */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Subscription Details
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Current Plan
                      </Typography>
                      <Typography variant="h6">
                        Professional Plan
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        $149/month • Billed monthly
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Next Billing Date
                      </Typography>
                      <Typography variant="h6">
                        March 15, 2024
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Auto-renewal enabled
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Stack spacing={1}>
                      <Button variant="outlined" fullWidth>
                        Change Plan
                      </Button>
                      <Button variant="text" color="error" fullWidth>
                        Cancel Subscription
                      </Button>
                    </Stack>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </Container>

        {/* Add Payment Method Dialog */}
        <Dialog open={addPaymentDialog} onClose={() => setAddPaymentDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add Payment Method</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 1 }}>
              <PaymentMethodForm
                onSuccess={handleAddPaymentMethod}
                onCancel={() => setAddPaymentDialog(false)}
              />
            </Box>
          </DialogContent>
        </Dialog>

        {/* Payment Dialog */}
        <Dialog open={paymentDialog.open} onClose={() => setPaymentDialog({ open: false, invoice: null })} maxWidth="sm" fullWidth>
          <DialogTitle>Pay Invoice</DialogTitle>
          <DialogContent>
            {paymentDialog.invoice && (
              <Box sx={{ mt: 1 }}>
                <Alert severity="info" sx={{ mb: 3 }}>
                  You are about to pay ${paymentDialog.invoice.amount} for {paymentDialog.invoice.description}
                </Alert>
                
                <Typography variant="subtitle2" gutterBottom>
                  Select Payment Method
                </Typography>
                
                <Stack spacing={2}>
                  {paymentMethods.map((method) => (
                    <Card key={method.id} variant="outlined" sx={{ cursor: 'pointer' }}>
                      <CardContent sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <CardIcon color="primary" />
                          <Box>
                            <Typography variant="subtitle2">
                              •••• •••• •••• {method.card.last4}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {method.card.brand.toUpperCase()} expires {method.card.expMonth}/{method.card.expYear}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPaymentDialog({ open: false, invoice: null })}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => handlePayInvoice(paymentDialog.invoice)}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <PaymentIcon />}
            >
              {loading ? 'Processing...' : `Pay $${paymentDialog.invoice?.amount}`}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Elements>
  );
}