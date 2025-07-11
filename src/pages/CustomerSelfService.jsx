import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Badge,
  Tabs,
  Tab,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  Person as PersonIcon,
  LocalShipping as ShippingIcon,
  Schedule as ScheduleIcon,
  Receipt as ReceiptIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import { useErrorHandler } from '../hooks/useErrorHandler';

export default function CustomerSelfService() {
  const { profile: userProfile } = useAuth();
  const { handleError } = useErrorHandler();
  const [customer, setCustomer] = useState(null);
  const [rentals, setRentals] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [deliveryDialog, setDeliveryDialog] = useState(false);
  const [newDelivery, setNewDelivery] = useState({
    delivery_date: '',
    delivery_time: '',
    special_instructions: '',
    contact_person: '',
    phone_number: ''
  });
  const [editProfileDialog, setEditProfileDialog] = useState(false);
  const [editProfile, setEditProfile] = useState({});

  useEffect(() => {
    if (userProfile?.organization_id) {
      fetchCustomerData();
    }
  }, [userProfile]);

  const fetchCustomerData = async () => {
    try {
      // Create customer profile based on user's actual profile data
      const customerProfile = {
        CustomerListID: userProfile.id,
        name: userProfile.full_name || userProfile.name || 'Customer',
        phone: userProfile.phone || '',
        email: userProfile.email || '',
        address: userProfile.address || '',
        status: 'Active',
        created_at: userProfile.created_at || new Date().toISOString()
      };
      
      setCustomer(customerProfile);

      // Fetch actual rentals from the database
      try {
        const { data: rentalData, error: rentalError } = await supabase
          .from('rentals')
          .select('*')
          .eq('customer_id', userProfile.id)
          .order('rental_start_date', { ascending: false });

        if (rentalError) {
          console.log('No rentals table or no rentals found:', rentalError);
          setRentals([]);
        } else {
          setRentals(rentalData || []);
        }
      } catch (error) {
        console.log('Error fetching rentals:', error);
        setRentals([]);
      }

      // Fetch actual delivery requests from the database
      try {
        const { data: deliveryData, error: deliveryError } = await supabase
          .from('delivery_requests')
          .select('*')
          .eq('customer_id', userProfile.id)
          .order('created_at', { ascending: false });

        if (deliveryError) {
          console.log('No delivery_requests table or no deliveries found:', deliveryError);
          setDeliveries([]);
        } else {
          setDeliveries(deliveryData || []);
        }
      } catch (error) {
        console.log('Error fetching deliveries:', error);
        setDeliveries([]);
      }

      // Fetch actual invoices from the database
      try {
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .select('*')
          .eq('customer_id', userProfile.id)
          .order('invoice_date', { ascending: false });

        if (invoiceError) {
          console.log('No invoices table or no invoices found:', invoiceError);
          setInvoices([]);
        } else {
          setInvoices(invoiceData || []);
        }
      } catch (error) {
        console.log('Error fetching invoices:', error);
        setInvoices([]);
      }

    } catch (error) {
      handleError(error, { message: 'Failed to fetch customer data' });
    } finally {
      setLoading(false);
    }
  };

  const createDeliveryRequest = async () => {
    try {
      // For now, just close the dialog since we don't have the delivery_requests table
      // In a real implementation, you'd insert into the delivery_requests table
      setDeliveryDialog(false);
      setNewDelivery({
        delivery_date: '',
        delivery_time: '',
        special_instructions: '',
        contact_person: '',
        phone_number: ''
      });
      
      // Show a message that this feature requires the delivery_requests table
      alert('Delivery request creation requires the delivery_requests table to be created in your database.');
    } catch (error) {
      handleError(error, { message: 'Failed to create delivery request' });
    }
  };

  const updateProfile = async () => {
    try {
      // Update the user's profile instead of customer record
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editProfile.name,
          phone: editProfile.phone,
          email: editProfile.email,
          address: editProfile.address
        })
        .eq('id', userProfile.id);

      if (error) throw error;
      
      setEditProfileDialog(false);
      fetchCustomerData();
    } catch (error) {
      handleError(error, { message: 'Failed to update profile' });
    }
  };

  const getRentalStatus = (rental) => {
    if (!rental.rental_end_date) return 'Active';
    const endDate = new Date(rental.rental_end_date);
    const today = new Date();
    if (endDate < today) return 'Overdue';
    return 'Completed';
  };

  const getRentalStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'success';
      case 'Overdue': return 'error';
      case 'Completed': return 'default';
      default: return 'default';
    }
  };

  const getDeliveryStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'confirmed': return 'info';
      case 'in_transit': return 'primary';
      case 'delivered': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!customer) {
    return (
      <Box p={3}>
        <Alert severity="info">
          Welcome to the Customer Self-Service Portal! This is a demo version that shows how customers can manage their account, view rentals, and request deliveries.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          👤 Customer Self-Service Portal
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>Customer Portal:</strong> This portal shows your actual profile data and will display real rentals, deliveries, and invoices when those tables are available in your database.
        </Alert>
      </Box>

      {/* Customer Profile Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Typography variant="h5" gutterBottom>
                Welcome, {customer.name}!
              </Typography>
              <Typography variant="body1" color="textSecondary" gutterBottom>
                Customer ID: {customer.CustomerListID}
              </Typography>
              <Box display="flex" alignItems="center" gap={2} sx={{ mt: 2 }}>
                {customer.phone && (
                  <Box display="flex" alignItems="center" gap={1}>
                    <PhoneIcon fontSize="small" color="action" />
                    <Typography variant="body2">{customer.phone}</Typography>
                  </Box>
                )}
                {customer.email && (
                  <Box display="flex" alignItems="center" gap={1}>
                    <EmailIcon fontSize="small" color="action" />
                    <Typography variant="body2">{customer.email}</Typography>
                  </Box>
                )}
                {customer.address && (
                  <Box display="flex" alignItems="center" gap={1}>
                    <LocationIcon fontSize="small" color="action" />
                    <Typography variant="body2">{customer.address}</Typography>
                  </Box>
                )}
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box display="flex" justifyContent="flex-end" gap={2}>
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => {
                    setEditProfile(customer);
                    setEditProfileDialog(true);
                  }}
                >
                  Edit Profile
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setDeliveryDialog(true)}
                >
                  Request Delivery
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Active Rentals
                  </Typography>
                  <Typography variant="h4" color="primary.main">
                    {rentals.filter(r => getRentalStatus(r) === 'Active').length}
                  </Typography>
                </Box>
                <ScheduleIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Pending Deliveries
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {deliveries.filter(d => d.status === 'pending').length}
                  </Typography>
                </Box>
                <ShippingIcon color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Invoices
                  </Typography>
                  <Typography variant="h4" color="info.main">
                    {invoices.length}
                  </Typography>
                </Box>
                <ReceiptIcon color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Account Status
                  </Typography>
                  <Chip
                    label={customer.status || 'Active'}
                    color={customer.status === 'Active' ? 'success' : 'warning'}
                    size="small"
                  />
                </Box>
                <PersonIcon color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Rentals" />
          <Tab label="Deliveries" />
          <Tab label="Invoices" />
          <Tab label="Account" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Paper>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              My Rentals
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Bottle</TableCell>
                    <TableCell>Product</TableCell>
                    <TableCell>Start Date</TableCell>
                    <TableCell>End Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rentals.map((rental) => (
                    <TableRow key={rental.id} hover>
                      <TableCell>{rental.bottles?.barcode_number || rental.serial_number}</TableCell>
                      <TableCell>{rental.bottles?.description || rental.product_code}</TableCell>
                      <TableCell>
                        {new Date(rental.rental_start_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {rental.rental_end_date 
                          ? new Date(rental.rental_end_date).toLocaleDateString()
                          : 'Ongoing'
                        }
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getRentalStatus(rental)}
                          color={getRentalStatusColor(getRentalStatus(rental))}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton size="small">
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Paper>
      )}

      {activeTab === 1 && (
        <Paper>
          <Box sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Delivery Requests
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setDeliveryDialog(true)}
              >
                New Request
              </Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Request Date</TableCell>
                    <TableCell>Delivery Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {deliveries.map((delivery) => (
                    <TableRow key={delivery.id} hover>
                      <TableCell>
                        {new Date(delivery.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {delivery.delivery_date 
                          ? new Date(delivery.delivery_date).toLocaleDateString()
                          : 'TBD'
                        }
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={delivery.status}
                          color={getDeliveryStatusColor(delivery.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{delivery.contact_person}</TableCell>
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton size="small">
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Paper>
      )}

      {activeTab === 2 && (
        <Paper>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Invoices
            </Typography>
            <TableContainer>
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
                    <TableRow key={invoice.id} hover>
                      <TableCell>{invoice.invoice_number}</TableCell>
                      <TableCell>
                        {new Date(invoice.invoice_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>${invoice.total_amount?.toFixed(2)}</TableCell>
                      <TableCell>
                        <Chip
                          label={invoice.status || 'Paid'}
                          color={invoice.status === 'Paid' ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View Invoice">
                          <IconButton size="small">
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Paper>
      )}

      {activeTab === 3 && (
        <Paper>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Account Information
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <PersonIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Name"
                      secondary={customer.name}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <PhoneIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Phone"
                      secondary={customer.phone || 'Not provided'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <EmailIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Email"
                      secondary={customer.email || 'Not provided'}
                    />
                  </ListItem>
                </List>
              </Grid>
              <Grid item xs={12} md={6}>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <LocationIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Address"
                      secondary={customer.address || 'Not provided'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CalendarIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Member Since"
                      secondary={customer.created_at 
                        ? new Date(customer.created_at).toLocaleDateString()
                        : 'Unknown'
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircleIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Status"
                      secondary={customer.status || 'Active'}
                    />
                  </ListItem>
                </List>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      )}

      {/* Delivery Request Dialog */}
      <Dialog open={deliveryDialog} onClose={() => setDeliveryDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request Delivery</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Delivery Date"
              type="date"
              value={newDelivery.delivery_date}
              onChange={(e) => setNewDelivery({ ...newDelivery, delivery_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Preferred Time"
              value={newDelivery.delivery_time}
              onChange={(e) => setNewDelivery({ ...newDelivery, delivery_time: e.target.value })}
              placeholder="e.g., Morning, Afternoon, Evening"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Contact Person"
              value={newDelivery.contact_person}
              onChange={(e) => setNewDelivery({ ...newDelivery, contact_person: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Phone Number"
              value={newDelivery.phone_number}
              onChange={(e) => setNewDelivery({ ...newDelivery, phone_number: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Special Instructions"
              multiline
              rows={3}
              value={newDelivery.special_instructions}
              onChange={(e) => setNewDelivery({ ...newDelivery, special_instructions: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeliveryDialog(false)}>
            Cancel
          </Button>
          <Button variant="contained" onClick={createDeliveryRequest}>
            Submit Request
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={editProfileDialog} onClose={() => setEditProfileDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Profile</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Name"
              value={editProfile.name || ''}
              onChange={(e) => setEditProfile({ ...editProfile, name: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Phone"
              value={editProfile.phone || ''}
              onChange={(e) => setEditProfile({ ...editProfile, phone: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={editProfile.email || ''}
              onChange={(e) => setEditProfile({ ...editProfile, email: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Address"
              multiline
              rows={2}
              value={editProfile.address || ''}
              onChange={(e) => setEditProfile({ ...editProfile, address: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditProfileDialog(false)}>
            Cancel
          </Button>
          <Button variant="contained" onClick={updateProfile}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 