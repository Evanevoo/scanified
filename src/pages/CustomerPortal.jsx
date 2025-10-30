import logger from '../utils/logger';
import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Grid, 
  Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Paper, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, FormControl, InputLabel, Select,
  MenuItem, Alert, CircularProgress, Tabs, Tab, Divider,
  IconButton, Tooltip, Badge
} from '@mui/material';
import {
  ShoppingCart as CartIcon,
  LocalShipping as DeliveryIcon,
  History as HistoryIcon,
  AccountCircle as AccountIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`customer-tabpanel-${index}`}
      aria-labelledby={`customer-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function CustomerPortal() {
  const { profile, organization } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [orders, setOrders] = useState([]);
  const [bottles, setBottles] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newOrderDialog, setNewOrderDialog] = useState(false);
  const [orderForm, setOrderForm] = useState({
    gasType: '',
    size: '',
    quantity: 1,
    deliveryDate: '',
    specialInstructions: ''
  });

  useEffect(() => {
    if (organization) {
      fetchCustomerData();
    }
  }, [organization]);

  const fetchCustomerData = async () => {
    try {
      // Fetch customer's bottles
      const { data: bottlesData } = await supabase
        .from('bottles')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      setBottles(bottlesData || []);

      // Fetch customer's orders (rentals)
      const { data: ordersData } = await supabase
        .from('rentals')
        .select(`
          *,
          bottles (*)
        `)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      setOrders(ordersData || []);

      // Fetch customer's invoices
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      setInvoices(invoicesData || []);
    } catch (err) {
      logger.error('Error fetching customer data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNewOrder = async () => {
    try {
      const { error } = await supabase
        .from('rentals')
        .insert([{
          organization_id: organization.id,
          gas_type: orderForm.gasType,
          size: orderForm.size,
          quantity: orderForm.quantity,
          delivery_date: orderForm.deliveryDate,
          special_instructions: orderForm.specialInstructions,
          status: 'pending'
        }]);

      if (error) throw error;

      setNewOrderDialog(false);
      setOrderForm({
        gasType: '',
        size: '',
        quantity: 1,
        deliveryDate: '',
        specialInstructions: ''
      });
      fetchCustomerData();
    } catch (err) {
      logger.error('Error creating order:', err);
      setError(err.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered': return 'success';
      case 'in_transit': return 'warning';
      case 'pending': return 'info';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const downloadInvoice = async (invoiceId) => {
    try {
      // Generate PDF invoice (you'll need to implement this)
      const response = await fetch(`/.netlify/functions/generate-invoice?invoiceId=${invoiceId}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      a.click();
    } catch (err) {
      logger.error('Error downloading invoice:', err);
      setError('Failed to download invoice');
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
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Customer Portal
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Welcome back, {profile?.full_name}! Manage your orders, track deliveries, and view your account.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Quick Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {bottles.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Bottles
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {orders.filter(o => o.status === 'pending').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pending Orders
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {orders.filter(o => o.status === 'in_transit').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                In Transit
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                ${invoices.reduce((sum, inv) => sum + (inv.total || 0), 0).toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Spent
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="Orders" icon={<CartIcon />} />
            <Tab label="Bottles" icon={<DeliveryIcon />} />
            <Tab label="Invoices" icon={<HistoryIcon />} />
            <Tab label="Account" icon={<AccountIcon />} />
          </Tabs>
        </Box>

        {/* Orders Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">Your Orders</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setNewOrderDialog(true)}
            >
              New Order
            </Button>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Order ID</TableCell>
                  <TableCell>Gas Type</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Delivery Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>#{order.id}</TableCell>
                    <TableCell>{order.gas_type}</TableCell>
                    <TableCell>{order.size}</TableCell>
                    <TableCell>{order.quantity}</TableCell>
                    <TableCell>
                      {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : 'Not specified'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={order.status}
                        color={getStatusColor(order.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton 
                          size="small"
                          onClick={() => {
                            alert(`Order Details:\n\nOrder ID: #${order.id}\nGas Type: ${order.gas_type}\nSize: ${order.size}\nQuantity: ${order.quantity}\nDelivery Date: ${order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : 'Not specified'}\nStatus: ${order.status}\nSpecial Instructions: ${order.special_instructions || 'None'}`);
                          }}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Bottles Tab */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" sx={{ mb: 2 }}>Your Bottles</Typography>
          
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Bottle ID</TableCell>
                  <TableCell>Gas Type</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last Updated</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bottles.map((bottle) => (
                  <TableRow key={bottle.id}>
                    <TableCell>{bottle.bottle_id}</TableCell>
                    <TableCell>{bottle.gas_type}</TableCell>
                    <TableCell>{bottle.size}</TableCell>
                    <TableCell>
                      <Chip
                        label={bottle.status}
                        color={bottle.status === 'active' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(bottle.updated_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton 
                          size="small"
                          onClick={() => {
                            alert(`Bottle Details:\n\nBottle ID: ${bottle.bottle_id}\nGas Type: ${bottle.gas_type}\nSize: ${bottle.size}\nStatus: ${bottle.status}\nLast Updated: ${new Date(bottle.updated_at).toLocaleDateString()}\nOrganization: ${bottle.organization_id}`);
                          }}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Invoices Tab */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" sx={{ mb: 2 }}>Invoice History</Typography>
          
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Invoice #</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>#{invoice.invoice_number}</TableCell>
                    <TableCell>
                      {new Date(invoice.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>${invoice.total?.toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip
                        label={invoice.status}
                        color={invoice.status === 'paid' ? 'success' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Download PDF">
                        <IconButton 
                          size="small"
                          onClick={() => downloadInvoice(invoice.id)}
                        >
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Email Invoice">
                        <IconButton size="small">
                          <EmailIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Account Tab */}
        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" sx={{ mb: 2 }}>Account Information</Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Contact Information</Typography>
                  <Typography><strong>Name:</strong> {profile?.full_name}</Typography>
                  <Typography><strong>Email:</strong> {profile?.email}</Typography>
                  <Typography><strong>Phone:</strong> {profile?.phone || 'Not provided'}</Typography>
                  <Typography><strong>Organization:</strong> {organization?.name}</Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Subscription</Typography>
                  <Typography><strong>Plan:</strong> {organization?.subscription_plan}</Typography>
                  <Typography><strong>Status:</strong> {organization?.subscription_status}</Typography>
                  <Typography><strong>Next Billing:</strong> 
                    {organization?.subscription_end_date 
                      ? new Date(organization.subscription_end_date).toLocaleDateString()
                      : 'Not set'
                    }
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Card>

      {/* New Order Dialog */}
      <Dialog open={newOrderDialog} onClose={() => setNewOrderDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Place New Order</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Gas Type</InputLabel>
                <Select
                  value={orderForm.gasType}
                  onChange={(e) => setOrderForm({ ...orderForm, gasType: e.target.value })}
                >
                  <MenuItem value="oxygen">Oxygen</MenuItem>
                  <MenuItem value="nitrogen">Nitrogen</MenuItem>
                  <MenuItem value="argon">Argon</MenuItem>
                  <MenuItem value="carbon_dioxide">Carbon Dioxide</MenuItem>
                  <MenuItem value="acetylene">Acetylene</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Size</InputLabel>
                <Select
                  value={orderForm.size}
                  onChange={(e) => setOrderForm({ ...orderForm, size: e.target.value })}
                >
                  <MenuItem value="small">Small (20L)</MenuItem>
                  <MenuItem value="medium">Medium (40L)</MenuItem>
                  <MenuItem value="large">Large (80L)</MenuItem>
                  <MenuItem value="extra_large">Extra Large (120L)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Quantity"
                value={orderForm.quantity}
                onChange={(e) => setOrderForm({ ...orderForm, quantity: parseInt(e.target.value) })}
                inputProps={{ min: 1 }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Delivery Date"
                value={orderForm.deliveryDate}
                onChange={(e) => setOrderForm({ ...orderForm, deliveryDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Special Instructions"
                value={orderForm.specialInstructions}
                onChange={(e) => setOrderForm({ ...orderForm, specialInstructions: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewOrderDialog(false)}>
            Cancel
          </Button>
          <Button 
            variant="contained"
            onClick={handleNewOrder}
            disabled={!orderForm.gasType || !orderForm.size}
          >
            Place Order
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 