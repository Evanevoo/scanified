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
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', py: 4 }}>
      <Box sx={{ maxWidth: '1200px', mx: 'auto', px: 3 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" fontWeight={700} color="primary" sx={{ mb: 1 }}>
            Customer Portal
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Welcome back, {customer?.name || 'Customer'}! Manage your account and track your gas cylinder services.
          </Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 4, borderRadius: 2 }}>
          <Typography variant="body1" fontWeight={500}>
            Your Self-Service Hub
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            View your active rentals, request deliveries, manage your profile, and access billing information all in one place.
          </Typography>
        </Alert>

        {/* Customer Info Card */}
        <Card sx={{ mb: 4, border: '1px solid #e2e8f0', borderRadius: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5" fontWeight={600}>
                Account Information
              </Typography>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => {
                  setEditProfile({ ...customer });
                  setEditProfileDialog(true);
                }}
                sx={{ borderRadius: 2 }}
              >
                Edit Profile
              </Button>
            </Box>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <PersonIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">Customer Name</Typography>
                    <Typography variant="body1" fontWeight={500}>{customer?.name || 'Not provided'}</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <PhoneIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">Phone</Typography>
                    <Typography variant="body1" fontWeight={500}>{customer?.phone || 'Not provided'}</Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <EmailIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">Email</Typography>
                    <Typography variant="body1" fontWeight={500}>{customer?.email || 'Not provided'}</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <LocationIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">Address</Typography>
                    <Typography variant="body1" fontWeight={500}>{customer?.address || 'Not provided'}</Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 3 }}>
          <Box sx={{ borderBottom: '1px solid #e2e8f0' }}>
            <Tabs 
              value={activeTab} 
              onChange={(e, newValue) => setActiveTab(newValue)}
              sx={{
                px: 3,
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  minHeight: 64
                }
              }}
            >
              <Tab label="Active Rentals" icon={<ShippingIcon />} iconPosition="start" />
              <Tab label="Delivery Requests" icon={<ScheduleIcon />} iconPosition="start" />
              <Tab label="Billing & Invoices" icon={<ReceiptIcon />} iconPosition="start" />
            </Tabs>
          </Box>

          <Box sx={{ p: 4 }}>
            {/* Active Rentals Tab */}
            <TabPanel value={activeTab} index={0}>
              <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight={600}>
                  Your Active Rentals
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {rentals.length} active rental{rentals.length !== 1 ? 's' : ''}
                </Typography>
              </Box>
              
              {rentals.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                    No Active Rentals
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    You don't have any active gas cylinder rentals at the moment.
                  </Typography>
                </Box>
              ) : (
                <TableContainer component={Paper} sx={{ border: '1px solid #e2e8f0' }}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f8fafc' }}>
                        <TableCell sx={{ fontWeight: 600 }}>Cylinder ID</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Gas Type</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Size</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Rental Date</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rentals.map((rental) => (
                        <TableRow key={rental.id}>
                          <TableCell sx={{ fontFamily: 'monospace' }}>{rental.cylinder_id}</TableCell>
                          <TableCell>{rental.gas_type}</TableCell>
                          <TableCell>{rental.size}</TableCell>
                          <TableCell>{new Date(rental.rental_date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Chip 
                              label={getRentalStatus(rental)} 
                              color={getRentalStatusColor(getRentalStatus(rental))}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Button size="small" variant="outlined">
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </TabPanel>

            {/* Delivery Requests Tab */}
            <TabPanel value={activeTab} index={1}>
              <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight={600}>
                  Delivery Requests
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setDeliveryDialog(true)}
                  sx={{ borderRadius: 2 }}
                >
                  Request Delivery
                </Button>
              </Box>
              
              {deliveries.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                    No Delivery Requests
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    You haven't made any delivery requests yet.
                  </Typography>
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {deliveries.map((delivery) => (
                    <Grid item xs={12} md={6} key={delivery.id}>
                      <Card sx={{ border: '1px solid #e2e8f0' }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" fontWeight={600}>
                              Delivery #{delivery.id}
                            </Typography>
                            <Chip 
                              label={delivery.status} 
                              color={getDeliveryStatusColor(delivery.status)}
                              size="small"
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Requested: {new Date(delivery.requested_date).toLocaleDateString()}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Delivery Date: {new Date(delivery.delivery_date).toLocaleDateString()}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </TabPanel>

            {/* Billing Tab */}
            <TabPanel value={activeTab} index={2}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                Billing & Invoices
              </Typography>
              
              {invoices.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                    No Invoices
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    You don't have any invoices yet.
                  </Typography>
                </Box>
              ) : (
                <TableContainer component={Paper} sx={{ border: '1px solid #e2e8f0' }}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f8fafc' }}>
                        <TableCell sx={{ fontWeight: 600 }}>Invoice #</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell sx={{ fontFamily: 'monospace' }}>#{invoice.id}</TableCell>
                          <TableCell>{new Date(invoice.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>${invoice.amount}</TableCell>
                          <TableCell>
                            <Chip 
                              label={invoice.status} 
                              color={invoice.status === 'paid' ? 'success' : 'warning'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Button size="small" variant="outlined">
                              Download
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </TabPanel>
          </Box>
        </Card>

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