import logger from '../utils/logger';
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '../utils/performance';
import { toCsv, downloadFile, getNextAgreementNumbers } from '../utils/invoiceUtils';
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
  FormControlLabel,
  Checkbox,
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
  const navigate = useNavigate();
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState(0);
  const [tabValue, setTabValue] = useState(0);
  const [selectedAgreement, setSelectedAgreement] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('view'); // 'view', 'add', 'edit'
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [customers, setCustomers] = useState([]);
  const [customerBottles, setCustomerBottles] = useState([]); // bottles assigned to selected customer (for assign-to-bottle)
  const [billingHistory, setBillingHistory] = useState([]);
  const [retroactiveBilling, setRetroactiveBilling] = useState({ isRetroactive: false, proRatedAmount: 0, message: '' });
  const [stats, setStats] = useState({
    totalAgreements: 0,
    activeAgreements: 0,
    totalAnnualValue: 0,
    expiringThisMonth: 0
  });

  // Form state for adding/editing agreements (bottle_id = per-bottle lease, null = customer-level)
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
    billing_address: '',
    bottle_id: null,
    applyToAllBottles: false
  });

  const fetchAgreements = async () => {
    const { data, error } = await supabase
      .from('lease_agreements')
      .select('*, bottles:bottle_id(barcode_number)')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    setAgreements(data || []);
  };

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('CustomerListID, name')
      .eq('organization_id', profile.organization_id)
      .order('name');
    if (error) throw error;
    setCustomers(data || []);
  };

  const fetchStats = async () => {
    const { data, error } = await supabase
      .from('lease_agreements')
      .select('*')
      .eq('organization_id', profile.organization_id);
    if (error) throw error;
    const list = data || [];
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setStats({
      totalAgreements: list.length,
      activeAgreements: list.filter((a) => a.status === 'active').length,
      totalAnnualValue: list.reduce((sum, a) => sum + (parseFloat(a.annual_amount) || 0), 0),
      expiringThisMonth: list.filter(
        (a) =>
          a.status === 'active' &&
          a.end_date &&
          new Date(a.end_date) >= startOfMonth &&
          new Date(a.end_date) <= endOfMonth
      ).length,
    });
  };

  useEffect(() => {
    if (profile?.organization_id) {
      setLoading(true);
      Promise.all([fetchAgreements(), fetchCustomers(), fetchStats()])
        .catch((error) => {
          logger.error('Error loading:', error);
          setSnackbar({ open: true, message: 'Error loading agreements', severity: 'error' });
        })
        .finally(() => setLoading(false));
    }
  }, [profile?.organization_id]);

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

  // Fetch bottles assigned to the selected customer (for Assign to bottle)
  const fetchCustomerBottles = async (customerId) => {
    if (!customerId || !profile?.organization_id) {
      setCustomerBottles([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('bottles')
        .select('id, barcode_number')
        .eq('organization_id', profile.organization_id)
        .eq('assigned_customer', customerId)
        .order('barcode_number');
      if (error) throw error;
      setCustomerBottles(data || []);
    } catch (error) {
      logger.error('Error fetching customer bottles:', error);
      setCustomerBottles([]);
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
      billing_address: '',
      bottle_id: null,
      applyToAllBottles: false
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
      asset_locations: agreement.asset_locations || [],
      applyToAllBottles: false
    });
    setSelectedAgreement(agreement);
    setDialogMode('edit');
    setDialogOpen(true);
    fetchCustomerBottles(agreement.customer_id);
  };

  const handleViewAgreement = (agreement) => {
    setSelectedAgreement(agreement);
    setDialogMode('view');
    setTabValue(0);
    setDialogOpen(true);
    fetchBillingHistory(agreement.id);
  };

  const handleSaveAgreement = async () => {
    try {
      if (!formData.customer_id) {
        setSnackbar({ open: true, message: 'Please select a customer', severity: 'warning' });
        return;
      }
      if (!formData.start_date || !formData.start_date.trim()) {
        setSnackbar({ open: true, message: 'Start date is required', severity: 'warning' });
        return;
      }
      const startDate = new Date(formData.start_date);
      if (Number.isNaN(startDate.getTime())) {
        setSnackbar({ open: true, message: 'Please enter a valid start date', severity: 'warning' });
        return;
      }
      if (dialogMode === 'add' && !formData.applyToAllBottles && !formData.bottle_id) {
        setSnackbar({ open: true, message: 'Please select a bottle or "Apply to all bottles"', severity: 'warning' });
        return;
      }

      const { bottles: _bottles, applyToAllBottles: _applyAll, ...formDataForDb } = formData;
      const baseData = {
        ...formDataForDb,
        organization_id: profile.organization_id,
        annual_amount: parseFloat(formData.annual_amount) || 0,
        tax_rate: parseFloat(formData.tax_rate) || 0,
        max_asset_count: parseInt(formData.max_asset_count) || null,
        created_by: profile.id,
        updated_by: profile.id
      };

      if (dialogMode === 'add') {
        const applyToAll = formData.applyToAllBottles; // One customer-level lease covering all bottles

        const [agreementNumber] = await getNextAgreementNumbers(profile.organization_id, 1);
        if (!agreementNumber) throw new Error('Failed to reserve agreement number');

        const nextBillingDate = calculateNextBillingDate(startDate, formData.billing_frequency);
        const nextBillingStr = nextBillingDate.toISOString().split('T')[0];

        const insertRow = {
          ...baseData,
          agreement_number: agreementNumber,
          bottle_id: applyToAll ? null : formData.bottle_id || null, // null = customer-level lease
          next_billing_date: nextBillingStr
        };

        const { error } = await supabase.from('lease_agreements').insert(insertRow);
        if (error) throw error;
        setSnackbar({
          open: true,
          message: applyToAll
            ? (customerBottles.length > 0
                ? `Created customer-level lease covering all ${customerBottles.length} bottle${customerBottles.length !== 1 ? 's' : ''}`
                : 'Created customer-level lease agreement')
            : 'Agreement created successfully',
          severity: 'success'
        });
      } else {
        const { error } = await supabase
          .from('lease_agreements')
          .update({ ...baseData, bottle_id: formData.bottle_id || null })
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
      const [numberData] = await getNextAgreementNumbers(profile.organization_id, 1);
      if (!numberData) throw new Error('Failed to generate agreement number');

      // Calculate next billing date
      const nextBillingDate = calculateNextBillingDate(
        newStartDate,
        agreement.billing_frequency
      );

      // Create new agreement (preserve per-bottle lease: copy bottle_id so renewed agreement stays for same bottle)
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
        bottle_id: agreement.bottle_id || null,
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

    // If start date is in the past (retroactive)
    if (start < now) {
      // Calculate how many billing periods have passed
      const daysPassed = Math.floor((now - start) / (1000 * 60 * 60 * 24));
      const daysInYear = 365;
      
      let periodAmount = annualAmount;
      let periodDays = daysInYear;

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

      // Calculate number of periods passed and remaining amount
      const periodsPassed = Math.floor(daysPassed / periodDays);
      const remainingDaysInPeriod = daysPassed % periodDays;
      const proRatedAmount = (periodsPassed * periodAmount) + ((remainingDaysInPeriod / periodDays) * periodAmount);

      return {
        isRetroactive: true,
        proRatedAmount: Math.round(proRatedAmount * 100) / 100,
        periodsPassed: periodsPassed,
        message: `This is a retroactive agreement. The customer should be billed ${formatCurrency(proRatedAmount)} for the period from ${start.toLocaleDateString()} to ${now.toLocaleDateString()}.`
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

  const filteredAgreements = useMemo(() => {
    const term = debouncedSearch.toLowerCase();
    const byTab = activeTab === 0 ? null : activeTab === 1 ? 'active' : activeTab === 2 ? 'expired' : activeTab === 3 ? 'renewed' : null;
    const status = byTab || statusFilter;
    return agreements.filter((agreement) => {
      const bottleBarcode = agreement.bottle_id
        ? (Array.isArray(agreement.bottles) ? agreement.bottles[0]?.barcode_number : agreement.bottles?.barcode_number) ?? ''
        : '';
      const matchesSearch =
        !term ||
        agreement.customer_name?.toLowerCase().includes(term) ||
        agreement.agreement_number?.toLowerCase().includes(term) ||
        (typeof bottleBarcode === 'string' && bottleBarcode.toLowerCase().includes(term));
      const matchesStatus = status === 'all' || agreement.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [agreements, debouncedSearch, statusFilter, activeTab]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getBottleDisplay = (agreement) => {
    if (!agreement.bottle_id) return '—';
    const barcode = Array.isArray(agreement.bottles) ? agreement.bottles[0]?.barcode_number : agreement.bottles?.barcode_number;
    return barcode ?? agreement.bottle_id;
  };

  const exportToCSV = () => {
    const cols = ['Agreement #', 'Customer', 'Customer ID', 'Bottle', 'Start Date', 'End Date', 'Annual Amount', 'Billing Frequency', 'Status'];
    const rows = filteredAgreements.map((a) => ({
      'Agreement #': a.agreement_number,
      Customer: a.customer_name,
      'Customer ID': a.customer_id,
      Bottle: getBottleDisplay(a),
      'Start Date': a.start_date,
      'End Date': a.end_date,
      'Annual Amount': a.annual_amount,
      'Billing Frequency': a.billing_frequency,
      Status: a.status,
    }));
    if (rows.length === 0) return;
    const csv = toCsv(rows, cols);
    downloadFile(csv, `lease_agreements_${new Date().toISOString().slice(0, 10)}.csv`);
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
        <Box display="flex" gap={2}>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportToCSV} disabled={filteredAgreements.length === 0}>
            Export CSV
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddAgreement}>
            New Agreement
          </Button>
        </Box>
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

      {/* Quick Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label={`All (${agreements.length})`} />
          <Tab label={`Active (${stats.activeAgreements})`} />
          <Tab label={`Expired (${agreements.filter((a) => a.status === 'expired').length})`} />
          <Tab label={`Renewed (${agreements.filter((a) => a.status === 'renewed').length})`} />
        </Tabs>
      </Box>

      {/* Filters */}
      <Box display="flex" gap={2} mb={3}>
        <TextField
          placeholder="Search by customer, agreement #, or bottle..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 320 }}
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
            <MenuItem value="renewed">Renewed</MenuItem>
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
              <TableCell>Bottle</TableCell>
              <TableCell>Start Date</TableCell>
              <TableCell>End Date</TableCell>
              <TableCell>Annual Amount</TableCell>
              <TableCell>Billing Frequency</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAgreements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">
                    {agreements.length === 0
                      ? 'No lease agreements yet. Click "New Agreement" to create one.'
                      : 'No agreements match your filters.'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredAgreements.map((agreement) => (
              <TableRow key={agreement.id}>
                <TableCell>{agreement.agreement_number}</TableCell>
                <TableCell>
                  <Typography
                    component="span"
                    sx={{ cursor: 'pointer', color: 'primary.main', '&:hover': { textDecoration: 'underline' } }}
                    onClick={() => navigate(`/customer/${agreement.customer_id}`)}
                  >
                    {agreement.customer_name}
                  </Typography>
                </TableCell>
                <TableCell>
                  {agreement.bottle_id ? (
                    <Typography
                      component="span"
                      sx={{ cursor: 'pointer', color: 'primary.main', '&:hover': { textDecoration: 'underline' } }}
                      onClick={() => navigate(`/bottle/${agreement.bottle_id}`)}
                    >
                      {getBottleDisplay(agreement)}
                    </Typography>
                  ) : (
                    '—'
                  )}
                </TableCell>
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
            )))}
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
                      <Typography
                        variant="body1"
                        mb={2}
                        sx={{ cursor: 'pointer', color: 'primary.main', '&:hover': { textDecoration: 'underline' } }}
                        onClick={() => selectedAgreement?.customer_id && (setDialogOpen(false), navigate(`/customer/${selectedAgreement.customer_id}`))}
                      >
                        {selectedAgreement?.customer_name}
                      </Typography>
                    </Grid>
                    {selectedAgreement?.bottle_id && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2">Bottle (per-bottle lease)</Typography>
                        <Typography
                          variant="body1"
                          mb={2}
                          sx={{ cursor: 'pointer', color: 'primary.main', '&:hover': { textDecoration: 'underline' } }}
                          onClick={() => { setDialogOpen(false); navigate(`/bottle/${selectedAgreement.bottle_id}`); }}
                        >
                          {getBottleDisplay(selectedAgreement)}
                        </Typography>
                      </Grid>
                    )}
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
                  {billingHistory.length === 0 ? (
                    <Typography color="text.secondary" sx={{ py: 4 }}>
                      No billing history recorded yet.
                    </Typography>
                  ) : (
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
                  )}
                </Box>
              )}
            </Box>
          ) : (
            <Box pt={2}>
              {retroactiveBilling.isRetroactive && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <strong>Retroactive Agreement Detected</strong><br/>
                  {retroactiveBilling.message}<br/>
                  <strong>Next regular billing will occur on: {formData.start_date ? calculateNextBillingDate(new Date(formData.start_date), formData.billing_frequency).toLocaleDateString() : 'N/A'}</strong>
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
                        const newCustomerId = e.target.value;
                        setFormData({
                          ...formData,
                          customer_id: newCustomerId,
                          customer_name: customer?.name || '',
                          bottle_id: null,
                          applyToAllBottles: false
                        });
                        fetchCustomerBottles(newCustomerId);
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
                {formData.customer_id && (
                  <>
                    {dialogMode === 'add' && customerBottles.length > 0 && (
                      <Grid item xs={12}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={formData.applyToAllBottles || false}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  applyToAllBottles: e.target.checked,
                                  bottle_id: e.target.checked ? null : formData.bottle_id
                                })
                              }
                            />
                          }
                          label={
                            <Typography>
                              Apply to all bottles ({customerBottles.length} bottle{customerBottles.length !== 1 ? 's' : ''}) — creates one customer-level lease covering all bottles
                            </Typography>
                          }
                        />
                      </Grid>
                    )}
                    {(!formData.applyToAllBottles || dialogMode === 'edit') && (
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                          <InputLabel>Assign to bottle</InputLabel>
                          <Select
                            value={formData.bottle_id || ''}
                            onChange={(e) => setFormData({ ...formData, bottle_id: e.target.value || null })}
                            label="Assign to bottle"
                          >
                            <MenuItem value="">None – customer-level agreement</MenuItem>
                            {customerBottles.map((bottle) => (
                              <MenuItem key={bottle.id} value={bottle.id}>
                                {bottle.barcode_number || bottle.id}
                              </MenuItem>
                            ))}
                          </Select>
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            Optional: assign this lease to one bottle (per-bottle lease). Leave as None for a customer-level agreement.
                          </Typography>
                        </FormControl>
                      </Grid>
                    )}
                  </>
                )}
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