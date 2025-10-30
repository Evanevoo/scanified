import logger from '../utils/logger';
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Alert,
  Snackbar,
  Tooltip,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Receipt as BillingIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  AttachMoney as MoneyIcon,
  DateRange as DateIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import { StatsSkeleton, TableSkeleton } from '../components/SmoothLoading';

export default function LeaseAgreements() {
  const { profile } = useAuth();
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tabValue, setTabValue] = useState(0);
  const [selectedAgreement, setSelectedAgreement] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('view'); // 'view', 'add', 'edit'
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [customers, setCustomers] = useState([]);
  const [billingHistory, setBillingHistory] = useState([]);
  const [stats, setStats] = useState({
    totalAgreements: 0,
    activeAgreements: 0,
    totalAnnualValue: 0,
    expiringThisMonth: 0
  });

  // Form state for adding/editing agreements
  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    title: 'Annual Lease Agreement',
    start_date: '',
    end_date: '',
    annual_amount: '',
    billing_frequency: 'monthly',
    payment_terms: 'Net 30',
    tax_rate: '0.0000',
    terms_and_conditions: '',
    special_provisions: '',
    auto_renewal: false,
    renewal_notice_days: 30,
    asset_types: [],
    asset_locations: [],
    max_asset_count: '',
    billing_contact_email: '',
    billing_address: ''
  });

  useEffect(() => {
    if (profile?.organization_id) {
      fetchAgreements();
      fetchCustomers();
      fetchStats();
    }
  }, [profile]);

  const fetchAgreements = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lease_agreements')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgreements(data || []);
    } catch (error) {
      logger.error('Error fetching agreements:', error);
      setSnackbar({ open: true, message: 'Error loading agreements', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('CustomerListID, name')
        .eq('organization_id', profile.organization_id)
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      logger.error('Error fetching customers:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from('lease_agreements')
        .select('*')
        .eq('organization_id', profile.organization_id);

      if (error) throw error;

      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

      const stats = {
        totalAgreements: data.length,
        activeAgreements: data.filter(a => a.status === 'active').length,
        totalAnnualValue: data.reduce((sum, a) => sum + (parseFloat(a.annual_amount) || 0), 0),
        expiringThisMonth: data.filter(a => 
          a.status === 'active' && 
          new Date(a.end_date) <= nextMonth
        ).length
      };

      setStats(stats);
    } catch (error) {
      logger.error('Error fetching stats:', error);
    }
  };

  const fetchBillingHistory = async (agreementId) => {
    try {
      const { data, error } = await supabase
        .from('lease_billing_history')
        .select('*')
        .eq('lease_agreement_id', agreementId)
        .order('billing_date', { ascending: false });

      if (error) throw error;
      setBillingHistory(data || []);
    } catch (error) {
      logger.error('Error fetching billing history:', error);
    }
  };

  const handleAddAgreement = () => {
    setFormData({
      customer_id: '',
      customer_name: '',
      title: 'Annual Lease Agreement',
      start_date: '',
      end_date: '',
      annual_amount: '',
      billing_frequency: 'monthly',
      payment_terms: 'Net 30',
      tax_rate: '0.0000',
      terms_and_conditions: '',
      special_provisions: '',
      auto_renewal: false,
      renewal_notice_days: 30,
      asset_types: [],
      asset_locations: [],
      max_asset_count: '',
      billing_contact_email: '',
      billing_address: ''
    });
    setDialogMode('add');
    setDialogOpen(true);
  };

  const handleEditAgreement = (agreement) => {
    setFormData({
      ...agreement,
      start_date: agreement.start_date?.split('T')[0] || '',
      end_date: agreement.end_date?.split('T')[0] || '',
      asset_types: agreement.asset_types || [],
      asset_locations: agreement.asset_locations || []
    });
    setSelectedAgreement(agreement);
    setDialogMode('edit');
    setDialogOpen(true);
  };

  const handleViewAgreement = (agreement) => {
    setSelectedAgreement(agreement);
    setDialogMode('view');
    setDialogOpen(true);
    fetchBillingHistory(agreement.id);
  };

  const handleSaveAgreement = async () => {
    try {
      const agreementData = {
        ...formData,
        organization_id: profile.organization_id,
        annual_amount: parseFloat(formData.annual_amount) || 0,
        tax_rate: parseFloat(formData.tax_rate) || 0,
        max_asset_count: parseInt(formData.max_asset_count) || null,
        created_by: profile.id,
        updated_by: profile.id
      };

      if (dialogMode === 'add') {
        // Generate agreement number
        const { data: numberData, error: numberError } = await supabase
          .rpc('generate_agreement_number', { org_id: profile.organization_id });

        if (numberError) throw numberError;
        agreementData.agreement_number = numberData;

        // Calculate next billing date
        const nextBillingDate = calculateNextBillingDate(
          new Date(formData.start_date),
          formData.billing_frequency
        );
        agreementData.next_billing_date = nextBillingDate.toISOString().split('T')[0];

        const { error } = await supabase
          .from('lease_agreements')
          .insert([agreementData]);

        if (error) throw error;
        setSnackbar({ open: true, message: 'Agreement created successfully', severity: 'success' });
      } else {
        const { error } = await supabase
          .from('lease_agreements')
          .update(agreementData)
          .eq('id', selectedAgreement.id);

        if (error) throw error;
        setSnackbar({ open: true, message: 'Agreement updated successfully', severity: 'success' });
      }

      setDialogOpen(false);
      fetchAgreements();
      fetchStats();
    } catch (error) {
      logger.error('Error saving agreement:', error);
      setSnackbar({ open: true, message: 'Error saving agreement', severity: 'error' });
    }
  };

  const handleDeleteAgreement = async (agreementId) => {
    if (!window.confirm('Are you sure you want to delete this agreement?')) return;

    try {
      const { error } = await supabase
        .from('lease_agreements')
        .delete()
        .eq('id', agreementId);

      if (error) throw error;
      setSnackbar({ open: true, message: 'Agreement deleted successfully', severity: 'success' });
      fetchAgreements();
      fetchStats();
    } catch (error) {
      logger.error('Error deleting agreement:', error);
      setSnackbar({ open: true, message: 'Error deleting agreement', severity: 'error' });
    }
  };

  const calculateNextBillingDate = (startDate, frequency) => {
    const date = new Date(startDate);
    switch (frequency) {
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'semi-annual':
        date.setMonth(date.getMonth() + 6);
        break;
      case 'annual':
        date.setFullYear(date.getFullYear() + 1);
        break;
      default:
        date.setMonth(date.getMonth() + 1);
    }
    return date;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'expired': return 'error';
      case 'cancelled': return 'error';
      case 'draft': return 'warning';
      case 'renewed': return 'info';
      default: return 'default';
    }
  };

  const filteredAgreements = agreements.filter(agreement => {
    const matchesSearch = agreement.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agreement.agreement_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || agreement.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#fff', py: 8, borderRadius: 0, overflow: 'visible' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" gutterBottom>
            Lease Agreements
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            disabled
          >
            New Agreement
          </Button>
        </Box>
        <StatsSkeleton count={4} />
        <Box mt={4}><TableSkeleton rows={8} columns={8} /></Box>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          Lease Agreements
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddAgreement}
        >
          New Agreement
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <BusinessIcon color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">{stats.totalAgreements}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Agreements
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
                <DateIcon color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">{stats.activeAgreements}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Agreements
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
                  <Typography variant="h6">{formatCurrency(stats.totalAnnualValue)}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Annual Value
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
                <DateIcon color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">{stats.expiringThisMonth}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Expiring This Month
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Box display="flex" gap={2} mb={3}>
        <TextField
          placeholder="Search agreements..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 300 }}
        />
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label="Status"
          >
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="expired">Expired</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
            <MenuItem value="draft">Draft</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Agreements Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Agreement #</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Start Date</TableCell>
              <TableCell>End Date</TableCell>
              <TableCell>Annual Amount</TableCell>
              <TableCell>Billing Frequency</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAgreements.map((agreement) => (
              <TableRow key={agreement.id}>
                <TableCell>{agreement.agreement_number}</TableCell>
                <TableCell>{agreement.customer_name}</TableCell>
                <TableCell>{formatDate(agreement.start_date)}</TableCell>
                <TableCell>{formatDate(agreement.end_date)}</TableCell>
                <TableCell>{formatCurrency(agreement.annual_amount)}</TableCell>
                <TableCell>{agreement.billing_frequency}</TableCell>
                <TableCell>
                  <Chip
                    label={agreement.status}
                    color={getStatusColor(agreement.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box display="flex" gap={1}>
                    <Tooltip title="View">
                      <IconButton
                        size="small"
                        onClick={() => handleViewAgreement(agreement)}
                      >
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => handleEditAgreement(agreement)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteAgreement(agreement.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Agreement Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {dialogMode === 'add' ? 'New Lease Agreement' :
           dialogMode === 'edit' ? 'Edit Lease Agreement' :
           'View Lease Agreement'}
        </DialogTitle>
        <DialogContent>
          {dialogMode === 'view' ? (
            <Box>
              <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
                <Tab label="Details" />
                <Tab label="Billing History" />
              </Tabs>
              {tabValue === 0 && (
                <Box pt={2}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2">Agreement Number</Typography>
                      <Typography variant="body1" mb={2}>{selectedAgreement?.agreement_number}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2">Customer</Typography>
                      <Typography variant="body1" mb={2}>{selectedAgreement?.customer_name}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2">Start Date</Typography>
                      <Typography variant="body1" mb={2}>{formatDate(selectedAgreement?.start_date)}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2">End Date</Typography>
                      <Typography variant="body1" mb={2}>{formatDate(selectedAgreement?.end_date)}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2">Annual Amount</Typography>
                      <Typography variant="body1" mb={2}>{formatCurrency(selectedAgreement?.annual_amount)}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2">Billing Frequency</Typography>
                      <Typography variant="body1" mb={2}>{selectedAgreement?.billing_frequency}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2">Terms & Conditions</Typography>
                      <Typography variant="body1" mb={2}>{selectedAgreement?.terms_and_conditions || 'None specified'}</Typography>
                    </Grid>
                  </Grid>
                </Box>
              )}
              {tabValue === 1 && (
                <Box pt={2}>
                  <Typography variant="h6" mb={2}>Billing History</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Billing Date</TableCell>
                          <TableCell>Period</TableCell>
                          <TableCell>Amount</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {billingHistory.map((bill) => (
                          <TableRow key={bill.id}>
                            <TableCell>{formatDate(bill.billing_date)}</TableCell>
                            <TableCell>
                              {formatDate(bill.billing_period_start)} - {formatDate(bill.billing_period_end)}
                            </TableCell>
                            <TableCell>{formatCurrency(bill.total_amount)}</TableCell>
                            <TableCell>
                              <Chip
                                label={bill.payment_status}
                                color={bill.payment_status === 'paid' ? 'success' : 'warning'}
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>
          ) : (
            <Box pt={2}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Customer</InputLabel>
                    <Select
                      value={formData.customer_id}
                      onChange={(e) => {
                        const customer = customers.find(c => c.CustomerListID === e.target.value);
                        setFormData({
                          ...formData,
                          customer_id: e.target.value,
                          customer_name: customer?.name || ''
                        });
                      }}
                      label="Customer"
                    >
                      {customers.map((customer) => (
                        <MenuItem key={customer.CustomerListID} value={customer.CustomerListID}>
                          {customer.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Start Date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="End Date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Annual Amount"
                    type="number"
                    value={formData.annual_amount}
                    onChange={(e) => setFormData({ ...formData, annual_amount: e.target.value })}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Billing Frequency</InputLabel>
                    <Select
                      value={formData.billing_frequency}
                      onChange={(e) => setFormData({ ...formData, billing_frequency: e.target.value })}
                      label="Billing Frequency"
                    >
                      <MenuItem value="monthly">Monthly</MenuItem>
                      <MenuItem value="quarterly">Quarterly</MenuItem>
                      <MenuItem value="semi-annual">Semi-Annual</MenuItem>
                      <MenuItem value="annual">Annual</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Terms & Conditions"
                    multiline
                    rows={4}
                    value={formData.terms_and_conditions}
                    onChange={(e) => setFormData({ ...formData, terms_and_conditions: e.target.value })}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            {dialogMode === 'view' ? 'Close' : 'Cancel'}
          </Button>
          {dialogMode !== 'view' && (
            <Button onClick={handleSaveAgreement} variant="contained">
              Save
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 