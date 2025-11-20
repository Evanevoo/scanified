import logger from '../utils/logger';
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, CardActions,
  Button, Chip, IconButton, TextField, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Alert, CircularProgress, Avatar, Tooltip, Badge,
  FormControl, InputLabel, Select, MenuItem, Container,
  Accordion, AccordionSummary, AccordionDetails,
  List, ListItem, ListItemText, ListItemIcon,
  Divider, Switch, FormControlLabel, FormGroup,
  Stepper, Step, StepLabel, StepContent,
  Tabs, Tab, Slider, FormControlLabel as MuiFormControlLabel,
  Checkbox, RadioGroup, Radio, Autocomplete
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot
} from '@mui/lab';
import {
  AttachMoney as MoneyIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Settings as SettingsIcon,
  Timeline as TimelineIcon,
  Map as MapIcon,
  Navigation as NavigationIcon,
  Speed as SpeedIcon,
  Nature as EcoIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  QrCode as QrCodeIcon,
  Scanner as ScannerIcon,
  Inventory2 as PackageIcon,
  LocalShipping as ShippingIcon,
  Storage as StorageIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  AccessTime as TimeIcon,
  Straighten as DistanceIcon,
  LocalGasStation as FuelIcon,
  Security as SecurityIcon,
  Description as DocumentIcon,
  Assessment as AssessmentIcon,
  Gavel as ComplianceIcon,
  Report as ReportIcon,
  FileCopy as ManifestIcon,
  Verified as VerifiedIcon,
  Dangerous as DangerousIcon,
  Science as ScienceIcon,
  LocalFireDepartment as FireIcon,
  HealthAndSafety as SafetyIcon,
  History as HistoryIcon,
  TrackChanges as TrackIcon,
  Fingerprint as FingerprintIcon,
  VerifiedUser as VerifiedUserIcon,
  AccountBalance as AccountBalanceIcon,
  Business as BusinessIcon,
  ContactMail as ContactMailIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  CalendarToday as CalendarIcon,
  Schedule as ScheduleIcon,
  Flag as FlagIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Pending as PendingIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Calculate as CalculateIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Percent as PercentIcon,
  Receipt as ReceiptIcon,
  CreditCard as CreditCardIcon,
  AccountBalanceWallet as WalletIcon,
  LocalAtm as AtmIcon,
  Payment as PaymentIcon,
  MonetizationOn as MonetizationIcon,
  ShowChart as ChartIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  Timeline as TimelineChartIcon
} from '@mui/icons-material';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';

export default function AdvancedRentals() {
  const { profile, organization } = useAuth();
  const { can } = usePermissions();
  
  const [rentalRates, setRentalRates] = useState([]);
  const [demurrageRates, setDemurrageRates] = useState([]);
  const [bracketRates, setBracketRates] = useState([]);
  const [rentalCalculations, setRentalCalculations] = useState([]);
  const [rentalHistory, setRentalHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Dialog states
  const [createRateDialog, setCreateRateDialog] = useState(false);
  const [editRateDialog, setEditRateDialog] = useState(false);
  const [createDemurrageDialog, setCreateDemurrageDialog] = useState(false);
  const [createBracketDialog, setCreateBracketDialog] = useState(false);
  const [calculateDialog, setCalculateDialog] = useState(false);
  const [selectedRate, setSelectedRate] = useState(null);
  
  // Form states
  const [rateForm, setRateForm] = useState({
    rate_name: '',
    rate_type: 'daily',
    base_rate: 0,
    currency: 'USD',
    effective_date: '',
    expiry_date: '',
    customer_type: 'all',
    asset_type: 'all',
    minimum_rental_period: 1,
    maximum_rental_period: 365,
    grace_period: 0,
    is_active: true
  });
  
  const [demurrageForm, setDemurrageForm] = useState({
    rate_name: '',
    base_rate: 0,
    currency: 'USD',
    grace_period: 0,
    escalation_rate: 0,
    maximum_rate: 0,
    calculation_method: 'daily',
    effective_date: '',
    expiry_date: '',
    is_active: true
  });
  
  const [bracketForm, setBracketForm] = useState({
    rate_name: '',
    brackets: [
      { min_days: 0, max_days: 30, rate: 0, rate_type: 'daily' },
      { min_days: 31, max_days: 90, rate: 0, rate_type: 'daily' },
      { min_days: 91, max_days: 365, rate: 0, rate_type: 'daily' }
    ],
    currency: 'USD',
    effective_date: '',
    expiry_date: '',
    is_active: true
  });
  
  const [calculationForm, setCalculationForm] = useState({
    asset_id: '',
    customer_id: '',
    start_date: '',
    end_date: '',
    rate_type: 'daily',
    quantity: 1,
    apply_demurrage: true,
    apply_brackets: true
  });

  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (profile?.organization_id) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const orgId = profile.organization_id;

      // Fetch rental data in parallel
      const [ratesResult, demurrageResult, bracketsResult, calculationsResult, historyResult] = await Promise.all([
        supabase
          .from('rental_rates')
          .select(`
            *,
            customer:customers(name),
            asset_type:asset_types(name)
          `)
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('demurrage_rates')
          .select('*')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('bracket_rates')
          .select(`
            *,
            brackets:bracket_rate_details(order by min_days)
          `)
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('rental_calculations')
          .select(`
            *,
            asset:bottles(barcode_number),
            customer:customers(name)
          `)
          .eq('organization_id', orgId)
          .order('calculated_at', { ascending: false }),
        
        supabase
          .from('rental_history')
          .select(`
            *,
            asset:bottles(barcode_number),
            customer:customers(name)
          `)
          .eq('organization_id', orgId)
          .order('rental_start_date', { ascending: false })
      ]);

      if (ratesResult.error) throw ratesResult.error;
      if (demurrageResult.error) throw demurrageResult.error;
      if (bracketsResult.error) throw bracketsResult.error;
      if (calculationsResult.error) throw calculationsResult.error;
      if (historyResult.error) throw historyResult.error;

      setRentalRates(ratesResult.data || []);
      setDemurrageRates(demurrageResult.data || []);
      setBracketRates(bracketsResult.data || []);
      setRentalCalculations(calculationsResult.data || []);
      setRentalHistory(historyResult.data || []);

    } catch (error) {
      logger.error('Error fetching rental data:', error);
      setError('Failed to load rental data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRate = async () => {
    try {
      setError('');
      
      const { data, error } = await supabase
        .from('rental_rates')
        .insert({
          organization_id: profile.organization_id,
          rate_name: rateForm.rate_name,
          rate_type: rateForm.rate_type,
          base_rate: rateForm.base_rate,
          currency: rateForm.currency,
          effective_date: rateForm.effective_date,
          expiry_date: rateForm.expiry_date,
          customer_type: rateForm.customer_type,
          asset_type: rateForm.asset_type,
          minimum_rental_period: rateForm.minimum_rental_period,
          maximum_rental_period: rateForm.maximum_rental_period,
          grace_period: rateForm.grace_period,
          is_active: rateForm.is_active,
          created_by: profile.id
        })
        .select()
        .single();

      if (error) throw error;

      setSuccess('Rental rate created successfully');
      setCreateRateDialog(false);
      resetRateForm();
      fetchData();

    } catch (error) {
      logger.error('Error creating rental rate:', error);
      setError('Failed to create rental rate');
    }
  };

  const handleCreateDemurrage = async () => {
    try {
      setError('');
      
      const { data, error } = await supabase
        .from('demurrage_rates')
        .insert({
          organization_id: profile.organization_id,
          rate_name: demurrageForm.rate_name,
          base_rate: demurrageForm.base_rate,
          currency: demurrageForm.currency,
          grace_period: demurrageForm.grace_period,
          escalation_rate: demurrageForm.escalation_rate,
          maximum_rate: demurrageForm.maximum_rate,
          calculation_method: demurrageForm.calculation_method,
          effective_date: demurrageForm.effective_date,
          expiry_date: demurrageForm.expiry_date,
          is_active: demurrageForm.is_active,
          created_by: profile.id
        })
        .select()
        .single();

      if (error) throw error;

      setSuccess('Demurrage rate created successfully');
      setCreateDemurrageDialog(false);
      resetDemurrageForm();
      fetchData();

    } catch (error) {
      logger.error('Error creating demurrage rate:', error);
      setError('Failed to create demurrage rate');
    }
  };

  const handleCreateBracket = async () => {
    try {
      setError('');
      
      // Create the bracket rate
      const { data: bracketData, error: bracketError } = await supabase
        .from('bracket_rates')
        .insert({
          organization_id: profile.organization_id,
          rate_name: bracketForm.rate_name,
          currency: bracketForm.currency,
          effective_date: bracketForm.effective_date,
          expiry_date: bracketForm.expiry_date,
          is_active: bracketForm.is_active,
          created_by: profile.id
        })
        .select()
        .single();

      if (bracketError) throw bracketError;

      // Create the bracket details
      const bracketDetails = bracketForm.brackets.map((bracket, index) => ({
        bracket_rate_id: bracketData.id,
        min_days: bracket.min_days,
        max_days: bracket.max_days,
        rate: bracket.rate,
        rate_type: bracket.rate_type,
        order_index: index
      }));

      const { error: detailsError } = await supabase
        .from('bracket_rate_details')
        .insert(bracketDetails);

      if (detailsError) throw detailsError;

      setSuccess('Bracket rate created successfully');
      setCreateBracketDialog(false);
      resetBracketForm();
      fetchData();

    } catch (error) {
      logger.error('Error creating bracket rate:', error);
      setError('Failed to create bracket rate');
    }
  };

  const handleCalculateRental = async () => {
    try {
      setError('');
      
      // Simulate rental calculation
      const startDate = new Date(calculationForm.start_date);
      const endDate = new Date(calculationForm.end_date);
      const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      
      const baseRate = 25; // Mock base rate
      const baseAmount = baseRate * days * calculationForm.quantity;
      
      // Calculate demurrage if applicable
      let demurrageAmount = 0;
      if (calculationForm.apply_demurrage && days > 30) {
        const demurrageDays = days - 30;
        demurrageAmount = demurrageDays * 5; // Mock demurrage rate
      }
      
      // Calculate bracket adjustments if applicable
      let bracketAdjustment = 0;
      if (calculationForm.apply_brackets) {
        if (days > 90) {
          bracketAdjustment = baseAmount * 0.1; // 10% discount for long-term
        } else if (days > 30) {
          bracketAdjustment = baseAmount * 0.05; // 5% discount for medium-term
        }
      }
      
      const totalAmount = baseAmount + demurrageAmount - bracketAdjustment;
      
      const { data, error } = await supabase
        .from('rental_calculations')
        .insert({
          organization_id: profile.organization_id,
          asset_id: calculationForm.asset_id,
          customer_id: calculationForm.customer_id,
          start_date: calculationForm.start_date,
          end_date: calculationForm.end_date,
          rental_days: days,
          base_rate: baseRate,
          base_amount: baseAmount,
          demurrage_amount: demurrageAmount,
          bracket_adjustment: bracketAdjustment,
          total_amount: totalAmount,
          currency: 'USD',
          calculated_by: profile.id
        })
        .select()
        .single();

      if (error) throw error;

      setSuccess(`Rental calculated successfully: $${totalAmount.toFixed(2)}`);
      setCalculateDialog(false);
      resetCalculationForm();
      fetchData();

    } catch (error) {
      logger.error('Error calculating rental:', error);
      setError('Failed to calculate rental');
    }
  };

  const resetRateForm = () => {
    setRateForm({
      rate_name: '',
      rate_type: 'daily',
      base_rate: 0,
      currency: 'USD',
      effective_date: '',
      expiry_date: '',
      customer_type: 'all',
      asset_type: 'all',
      minimum_rental_period: 1,
      maximum_rental_period: 365,
      grace_period: 0,
      is_active: true
    });
  };

  const resetDemurrageForm = () => {
    setDemurrageForm({
      rate_name: '',
      base_rate: 0,
      currency: 'USD',
      grace_period: 0,
      escalation_rate: 0,
      maximum_rate: 0,
      calculation_method: 'daily',
      effective_date: '',
      expiry_date: '',
      is_active: true
    });
  };

  const resetBracketForm = () => {
    setBracketForm({
      rate_name: '',
      brackets: [
        { min_days: 0, max_days: 30, rate: 0, rate_type: 'daily' },
        { min_days: 31, max_days: 90, rate: 0, rate_type: 'daily' },
        { min_days: 91, max_days: 365, rate: 0, rate_type: 'daily' }
      ],
      currency: 'USD',
      effective_date: '',
      expiry_date: '',
      is_active: true
    });
  };

  const resetCalculationForm = () => {
    setCalculationForm({
      asset_id: '',
      customer_id: '',
      start_date: '',
      end_date: '',
      rate_type: 'daily',
      quantity: 1,
      apply_demurrage: true,
      apply_brackets: true
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'expired': return 'warning';
      case 'pending': return 'info';
      default: return 'default';
    }
  };

  const getRateTypeColor = (type) => {
    switch (type) {
      case 'daily': return 'primary';
      case 'weekly': return 'secondary';
      case 'monthly': return 'success';
      case 'yearly': return 'warning';
      default: return 'default';
    }
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return dateString ? new Date(dateString).toLocaleDateString() : 'N/A';
  };

  const formatDateTime = (dateString) => {
    return dateString ? new Date(dateString).toLocaleString() : 'N/A';
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Advanced Rentals
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage rental rates, demurrage calculations, and bracket-based pricing
          </Typography>
        </Box>
        <Box>
          <Button
            variant="outlined"
            startIcon={<CalculateIcon />}
            onClick={() => setCalculateDialog(true)}
            sx={{ mr: 2 }}
          >
            Calculate Rental
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateRateDialog(true)}
          >
            New Rate
          </Button>
        </Box>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <MoneyIcon color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">{rentalRates.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Rates
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <TrendingUpIcon color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">{demurrageRates.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Demurrage Rates
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <BarChartIcon color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">{bracketRates.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Bracket Rates
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <ReceiptIcon color="info" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">{rentalCalculations.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Calculations
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 4 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Rental Rates" />
          <Tab label="Demurrage Rates" />
          <Tab label="Bracket Rates" />
          <Tab label="Calculations" />
          <Tab label="Rental History" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Paper sx={{ mb: 4 }}>
          <Box p={3}>
            <Typography variant="h6" gutterBottom>
              Rental Rates
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Rate Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Base Rate</TableCell>
                    <TableCell>Currency</TableCell>
                    <TableCell>Effective Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rentalRates.map((rate) => (
                    <TableRow key={rate.id}>
                      <TableCell>
                        <Typography variant="subtitle2">{rate.rate_name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={rate.rate_type}
                          size="small" 
                          color={getRateTypeColor(rate.rate_type)}
                        />
                      </TableCell>
                      <TableCell>
                        {formatCurrency(rate.base_rate, rate.currency)}
                      </TableCell>
                      <TableCell>
                        {rate.currency}
                      </TableCell>
                      <TableCell>
                        {formatDate(rate.effective_date)}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={rate.is_active ? 'Active' : 'Inactive'} 
                          size="small" 
                          color={getStatusColor(rate.is_active ? 'active' : 'inactive')}
                        />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <Tooltip title="View Details">
                            <IconButton size="small">
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton size="small">
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small">
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
          </Box>
        </Paper>
      )}

      {activeTab === 1 && (
        <Paper sx={{ mb: 4 }}>
          <Box p={3}>
            <Typography variant="h6" gutterBottom>
              Demurrage Rates
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Rate Name</TableCell>
                    <TableCell>Base Rate</TableCell>
                    <TableCell>Grace Period</TableCell>
                    <TableCell>Escalation Rate</TableCell>
                    <TableCell>Max Rate</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {demurrageRates.map((rate) => (
                    <TableRow key={rate.id}>
                      <TableCell>
                        <Typography variant="subtitle2">{rate.rate_name}</Typography>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(rate.base_rate, rate.currency)}
                      </TableCell>
                      <TableCell>
                        {rate.grace_period} days
                      </TableCell>
                      <TableCell>
                        {rate.escalation_rate}%
                      </TableCell>
                      <TableCell>
                        {formatCurrency(rate.maximum_rate, rate.currency)}
                      </TableCell>
                      <TableCell>
                        {rate.calculation_method}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={rate.is_active ? 'Active' : 'Inactive'} 
                          size="small" 
                          color={getStatusColor(rate.is_active ? 'active' : 'inactive')}
                        />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <Tooltip title="View Details">
                            <IconButton size="small">
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton size="small">
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small">
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
          </Box>
        </Paper>
      )}

      {activeTab === 2 && (
        <Paper sx={{ mb: 4 }}>
          <Box p={3}>
            <Typography variant="h6" gutterBottom>
              Bracket Rates
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Rate Name</TableCell>
                    <TableCell>Brackets</TableCell>
                    <TableCell>Currency</TableCell>
                    <TableCell>Effective Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bracketRates.map((rate) => (
                    <TableRow key={rate.id}>
                      <TableCell>
                        <Typography variant="subtitle2">{rate.rate_name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          {rate.brackets?.map((bracket, index) => (
                            <Typography key={index} variant="caption" display="block">
                              {bracket.min_days}-{bracket.max_days} days: {formatCurrency(bracket.rate, rate.currency)}/{bracket.rate_type}
                            </Typography>
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {rate.currency}
                      </TableCell>
                      <TableCell>
                        {formatDate(rate.effective_date)}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={rate.is_active ? 'Active' : 'Inactive'} 
                          size="small" 
                          color={getStatusColor(rate.is_active ? 'active' : 'inactive')}
                        />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <Tooltip title="View Details">
                            <IconButton size="small">
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton size="small">
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small">
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
          </Box>
        </Paper>
      )}

      {activeTab === 3 && (
        <Paper sx={{ mb: 4 }}>
          <Box p={3}>
            <Typography variant="h6" gutterBottom>
              Rental Calculations
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Asset</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Period</TableCell>
                    <TableCell>Days</TableCell>
                    <TableCell>Base Amount</TableCell>
                    <TableCell>Demurrage</TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell>Calculated</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rentalCalculations.map((calc) => (
                    <TableRow key={calc.id}>
                      <TableCell>
                        {calc.asset?.barcode_number || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {calc.customer?.name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">{formatDate(calc.start_date)}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            to {formatDate(calc.end_date)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {calc.rental_days}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(calc.base_amount, calc.currency)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(calc.demurrage_amount, calc.currency)}
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2" color="primary">
                          {formatCurrency(calc.total_amount, calc.currency)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {formatDateTime(calc.calculated_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Paper>
      )}

      {activeTab === 4 && (
        <Paper sx={{ mb: 4 }}>
          <Box p={3}>
            <Typography variant="h6" gutterBottom>
              Rental History
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Asset</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Start Date</TableCell>
                    <TableCell>End Date</TableCell>
                    <TableCell>Total Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rentalHistory.map((rental) => (
                    <TableRow key={rental.id}>
                      <TableCell>
                        {rental.asset?.barcode_number || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {rental.customer?.name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {formatDate(rental.rental_start_date)}
                      </TableCell>
                      <TableCell>
                        {formatDate(rental.rental_end_date)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(rental.total_amount, rental.currency)}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={rental.status} 
                          size="small" 
                          color={getStatusColor(rental.status)}
                        />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <Tooltip title="View Details">
                            <IconButton size="small">
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Generate Invoice">
                            <IconButton size="small">
                              <ReceiptIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Paper>
      )}

      {/* Create Rate Dialog */}
      <Dialog 
        open={createRateDialog} 
        onClose={() => setCreateRateDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create Rental Rate</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Rate Name"
                  value={rateForm.rate_name}
                  onChange={(e) => setRateForm({ ...rateForm, rate_name: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Rate Type</InputLabel>
                  <Select
                    value={rateForm.rate_type}
                    onChange={(e) => setRateForm({ ...rateForm, rate_type: e.target.value })}
                  >
                    <MenuItem value="daily">Daily</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                    <MenuItem value="yearly">Yearly</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Base Rate"
                  type="number"
                  value={rateForm.base_rate}
                  onChange={(e) => setRateForm({ ...rateForm, base_rate: parseFloat(e.target.value) || 0 })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Currency</InputLabel>
                  <Select
                    value={rateForm.currency}
                    onChange={(e) => setRateForm({ ...rateForm, currency: e.target.value })}
                  >
                    <MenuItem value="USD">USD</MenuItem>
                    <MenuItem value="EUR">EUR</MenuItem>
                    <MenuItem value="GBP">GBP</MenuItem>
                    <MenuItem value="CAD">CAD</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Grace Period (days)"
                  type="number"
                  value={rateForm.grace_period}
                  onChange={(e) => setRateForm({ ...rateForm, grace_period: parseInt(e.target.value) || 0 })}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Effective Date"
                  type="date"
                  value={rateForm.effective_date}
                  onChange={(e) => setRateForm({ ...rateForm, effective_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Expiry Date"
                  type="date"
                  value={rateForm.expiry_date}
                  onChange={(e) => setRateForm({ ...rateForm, expiry_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Minimum Rental Period (days)"
                  type="number"
                  value={rateForm.minimum_rental_period}
                  onChange={(e) => setRateForm({ ...rateForm, minimum_rental_period: parseInt(e.target.value) || 1 })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Maximum Rental Period (days)"
                  type="number"
                  value={rateForm.maximum_rental_period}
                  onChange={(e) => setRateForm({ ...rateForm, maximum_rental_period: parseInt(e.target.value) || 365 })}
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={rateForm.is_active}
                      onChange={(e) => setRateForm({ ...rateForm, is_active: e.target.checked })}
                    />
                  }
                  label="Active"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateRateDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateRate} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Create Demurrage Dialog */}
      <Dialog 
        open={createDemurrageDialog} 
        onClose={() => setCreateDemurrageDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create Demurrage Rate</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Rate Name"
                  value={demurrageForm.rate_name}
                  onChange={(e) => setDemurrageForm({ ...demurrageForm, rate_name: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Base Rate"
                  type="number"
                  value={demurrageForm.base_rate}
                  onChange={(e) => setDemurrageForm({ ...demurrageForm, base_rate: parseFloat(e.target.value) || 0 })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Grace Period (days)"
                  type="number"
                  value={demurrageForm.grace_period}
                  onChange={(e) => setDemurrageForm({ ...demurrageForm, grace_period: parseInt(e.target.value) || 0 })}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Escalation Rate (%)"
                  type="number"
                  value={demurrageForm.escalation_rate}
                  onChange={(e) => setDemurrageForm({ ...demurrageForm, escalation_rate: parseFloat(e.target.value) || 0 })}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Maximum Rate"
                  type="number"
                  value={demurrageForm.maximum_rate}
                  onChange={(e) => setDemurrageForm({ ...demurrageForm, maximum_rate: parseFloat(e.target.value) || 0 })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Calculation Method</InputLabel>
                  <Select
                    value={demurrageForm.calculation_method}
                    onChange={(e) => setDemurrageForm({ ...demurrageForm, calculation_method: e.target.value })}
                  >
                    <MenuItem value="daily">Daily</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Currency</InputLabel>
                  <Select
                    value={demurrageForm.currency}
                    onChange={(e) => setDemurrageForm({ ...demurrageForm, currency: e.target.value })}
                  >
                    <MenuItem value="USD">USD</MenuItem>
                    <MenuItem value="EUR">EUR</MenuItem>
                    <MenuItem value="GBP">GBP</MenuItem>
                    <MenuItem value="CAD">CAD</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Effective Date"
                  type="date"
                  value={demurrageForm.effective_date}
                  onChange={(e) => setDemurrageForm({ ...demurrageForm, effective_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Expiry Date"
                  type="date"
                  value={demurrageForm.expiry_date}
                  onChange={(e) => setDemurrageForm({ ...demurrageForm, expiry_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={demurrageForm.is_active}
                      onChange={(e) => setDemurrageForm({ ...demurrageForm, is_active: e.target.checked })}
                    />
                  }
                  label="Active"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDemurrageDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateDemurrage} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Calculate Rental Dialog */}
      <Dialog 
        open={calculateDialog} 
        onClose={() => setCalculateDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Calculate Rental</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Asset ID"
                  value={calculationForm.asset_id}
                  onChange={(e) => setCalculationForm({ ...calculationForm, asset_id: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Customer ID"
                  value={calculationForm.customer_id}
                  onChange={(e) => setCalculationForm({ ...calculationForm, customer_id: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Start Date"
                  type="date"
                  value={calculationForm.start_date}
                  onChange={(e) => setCalculationForm({ ...calculationForm, start_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="End Date"
                  type="date"
                  value={calculationForm.end_date}
                  onChange={(e) => setCalculationForm({ ...calculationForm, end_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Quantity"
                  type="number"
                  value={calculationForm.quantity}
                  onChange={(e) => setCalculationForm({ ...calculationForm, quantity: parseInt(e.target.value) || 1 })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Rate Type</InputLabel>
                  <Select
                    value={calculationForm.rate_type}
                    onChange={(e) => setCalculationForm({ ...calculationForm, rate_type: e.target.value })}
                  >
                    <MenuItem value="daily">Daily</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={calculationForm.apply_demurrage}
                        onChange={(e) => setCalculationForm({ ...calculationForm, apply_demurrage: e.target.checked })}
                      />
                    }
                    label="Apply Demurrage"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={calculationForm.apply_brackets}
                        onChange={(e) => setCalculationForm({ ...calculationForm, apply_brackets: e.target.checked })}
                      />
                    }
                    label="Apply Bracket Rates"
                  />
                </FormGroup>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCalculateDialog(false)}>Cancel</Button>
          <Button onClick={handleCalculateRental} variant="contained">Calculate</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
