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
  Business as BusinessIcon,
  Autorenew as RenewIcon
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
  const [retroactiveBilling, setRetroactiveBilling] = useState({ isRetroactive: false, proRatedAmount: 0, message: '' });
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

  // Calculate retroactive billing when form dates/amounts change
  useEffect(() => {
    if (formData.start_date && formData.annual_amount && formData.billing_frequency && dialogMode !== 'view') {
      const result = calculateProRatedAmount(
        formData.start_date,
        formData.end_date,
        parseFloat(formData.annual_amount) || 0,
        formData.billing_frequency
      );
      setRetroactiveBilling(result);
    } else {
      setRetroactiveBilling({ isRetroactive: false, proRatedAmount: 0, message: '' });
    }
  }, [formData.start_date, formData.end_date, formData.annual_amount, formData.billing_frequency, dialogMode]);

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

  const handleRenewAgreement = async (agreement) => {
    if (!window.confirm('Are you sure you want to renew this lease agreement? This will create a new agreement starting from the end date of the current one.')) return;

    try {
      // Calculate new dates
      const oldEndDate = new Date(agreement.end_date);
      const newStartDate = new Date(oldEndDate);
      newStartDate.setDate(newStartDate.getDate() + 1); // Start day after old agreement ends
      
      const newEndDate = new Date(newStartDate);
      newEndDate.setFullYear(newEndDate.getFullYear() + 1); // One year lease

      // Generate new agreement number
      const { data: numberData, error: numberError } = await supabase
        .rpc('generate_agreement_number', { org_id: profile.organization_id });

      if (numberError) throw numberError;

      // Calculate next billing date
      const nextBillingDate = calculateNextBillingDate(
        newStartDate,
        agreement.billing_frequency
      );

      // Create new agreement
      const renewedAgreement = {
        organization_id: profile.organization_id,
        customer_id: agreement.customer_id,
        customer_name: agreement.customer_name,
        agreement_number: numberData,
        title: agreement.title,
        start_date: newStartDate.toISOString().split('T')[0],
        end_date: newEndDate.toISOString().split('T')[0],
        annual_amount: agreement.annual_amount,
        billing_frequency: agreement.billing_frequency,
        payment_terms: agreement.payment_terms,
        tax_rate: agreement.tax_rate,
        terms_and_conditions: agreement.terms_and_conditions,
        special_provisions: agreement.special_provisions,
        auto_renewal: agreement.auto_renewal,
        renewal_notice_days: agreement.renewal_notice_days,
        asset_types: agreement.asset_types,
        asset_locations: agreement.asset_locations,
        max_asset_count: agreement.max_asset_count,
        billing_contact_email: agreement.billing_contact_email,
        billing_address: agreement.billing_address,
        status: 'active',
        next_billing_date: nextBillingDate.toISOString().split('T')[0],
        created_by: profile.id,
        updated_by: profile.id,
        renewed_from_id: agreement.id
      };

      const { error } = await supabase
        .from('lease_agreements')
        .insert([renewedAgreement]);

      if (error) throw error;

      // Update old agreement status
      await supabase
        .from('lease_agreements')
        .update({ status: 'renewed' })
        .eq('id', agreement.id);

      setSnackbar({ open: true, message: 'Agreement renewed successfully', severity: 'success' });
      fetchAgreements();
      fetchStats();
    } catch (error) {
      logger.error('Error renewing agreement:', error);
      setSnackbar({ open: true, message: 'Error renewing agreement', severity: 'error' });
    }
  };

  const calculateProRatedAmount = (startDate, endDate, annualAmount, billingFrequency) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Reset to start of day for accurate comparison

    // If start date is in the past (retroactive), only bill for remaining period from today forward
    if (start < now) {
      // For yearly rentals, calculate remaining months of the current year
      // Use today as the billing start date (not the original start date)
      const billingStartDate = new Date(now);
      
      // For annual billing, calculate from today to end of year (or end date, whichever comes first)
      let billingEndDate;
      if (billingFrequency === 'annual') {
        // End of current year
        billingEndDate = new Date(now.getFullYear(), 11, 31); // December 31 of current year
        // If end date is before end of year, use end date
        if (end < billingEndDate) {
          billingEndDate = new Date(end);
        }
      } else {
        // For other frequencies, use the end date
        billingEndDate = new Date(end);
      }

      // Calculate days remaining from today to billing end date
      const daysRemaining = Math.ceil((billingEndDate - billingStartDate) / (1000 * 60 * 60 * 24)) + 1;
      
      let periodAmount = annualAmount;
      let periodDays = 365;

      switch (billingFrequency) {
        case 'monthly':
          periodAmount = annualAmount / 12;
          periodDays = 30;
          break;
        case 'quarterly':
          periodAmount = annualAmount / 4;
          periodDays = 91;
          break;
        case 'semi-annual':
          periodAmount = annualAmount / 2;
          periodDays = 182;
          break;
        case 'annual':
          periodAmount = annualAmount;
          periodDays = 365;
          break;
      }

      // Calculate pro-rated amount for remaining period
      // For annual: calculate remaining months of the year from today
      let proRatedAmount = 0;
      if (billingFrequency === 'annual') {
        // Calculate remaining days from today to end of year, then convert to months
        const endOfYear = new Date(now.getFullYear(), 11, 31); // December 31
        const daysRemainingInYear = Math.ceil((endOfYear - now) / (1000 * 60 * 60 * 24)) + 1;
        const daysInYear = 365;
        const monthlyAmount = annualAmount / 12;
        // Calculate months (including partial month)
        const monthsRemaining = (daysRemainingInYear / daysInYear) * 12;
        proRatedAmount = monthsRemaining * monthlyAmount;
      } else {
        // For other frequencies, calculate based on days
        proRatedAmount = (daysRemaining / periodDays) * periodAmount;
      }

      // Calculate next billing date (start of next year for annual)
      let nextBillingDate = new Date(billingStartDate);
      if (billingFrequency === 'annual') {
        nextBillingDate = new Date(now.getFullYear() + 1, 0, 1); // January 1 of next year
      } else {
        // Inline calculation for other frequencies
        switch (billingFrequency) {
          case 'monthly':
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
            break;
          case 'quarterly':
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 3);
            break;
          case 'semi-annual':
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 6);
            break;
          default:
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        }
      }

      return {
        isRetroactive: true,
        proRatedAmount: Math.round(proRatedAmount * 100) / 100,
        periodsPassed: 0, // Not billing for past periods
        message: `This is a retroactive agreement. The customer should be billed ${formatCurrency(proRatedAmount)} for the remaining period from ${billingStartDate.toLocaleDateString()} to ${billingEndDate.toLocaleDateString()}.`,
        nextBillingDate: nextBillingDate
      };
    }

    return { isRetroactive: false, proRatedAmount: 0, message: '' };
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
                    {(agreement.status === 'expired' || agreement.status === 'active') && (
                      <Tooltip title={agreement.status === 'expired' ? 'Renew Agreement' : 'Renew Agreement Early'}>
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handleRenewAgreement(agreement)}
                        >
                          <RenewIcon />
                        </IconButton>
                      </Tooltip>
                    )}
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
              {retroactiveBilling.isRetroactive && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <strong>Retroactive Agreement Detected</strong><br/>
                  {retroactiveBilling.message}<br/>
                  <strong>Next regular billing will occur on: {retroactiveBilling.nextBillingDate ? retroactiveBilling.nextBillingDate.toLocaleDateString() : (formData.start_date ? calculateNextBillingDate(new Date(formData.start_date), formData.billing_frequency).toLocaleDateString() : 'N/A')}</strong>
                </Alert>
              )}
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
          {dialogMode === 'view' && selectedAgreement && (selectedAgreement.status === 'expired' || selectedAgreement.status === 'active') && (
            <Button 
              onClick={() => {
                setDialogOpen(false);
                handleRenewAgreement(selectedAgreement);
              }} 
              variant="contained" 
              color="success"
              startIcon={<RenewIcon />}
            >
              Renew Agreement
            </Button>
          )}
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