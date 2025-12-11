import logger from '../utils/logger';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Grid, Button, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, FormControl, InputLabel, Select, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Chip, Alert, IconButton, Tooltip, Switch, FormControlLabel,
  Divider, Accordion, AccordionSummary, AccordionDetails, InputAdornment,
  TablePagination
} from '@mui/material';
import {
  Save as SaveIcon, Edit as EditIcon, Delete as DeleteIcon,
  Add as AddIcon, People as PeopleIcon, AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon, Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon, CheckCircle as CheckIcon,
  Warning as WarningIcon, Info as InfoIcon, Search as SearchIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';
import { useDebounce } from '../utils/performance';

export default function BulkRentalPricingManager() {
  const { organization } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [pricingTiers, setPricingTiers] = useState([]);
  const [customerPricing, setCustomerPricing] = useState([]);
  const [leaseAgreements, setLeaseAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [sortByPeriod, setSortByPeriod] = useState('all'); // all, monthly, yearly
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [bulkPricing, setBulkPricing] = useState({
    discountPercent: 0,
    markupPercent: 0,
    fixedRateOverride: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    applyToAll: false,
    rentalPeriod: 'monthly' // monthly, yearly
  });
  
  // Dialog states
  const [tierDialog, setTierDialog] = useState({ open: false, tier: null, isNew: false });
  const [customerDialog, setCustomerDialog] = useState({ open: false, customer: null, isNew: false });
  const [pricingDetailDialog, setPricingDetailDialog] = useState({ open: false, customer: null, pricing: null });

  useEffect(() => {
    if (organization?.id) {
      loadData();
    }
  }, [organization]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Debug: Log organization info
      if (import.meta.env.DEV) {
        logger.log('🔍 Organization Debug:', {
          organizationId: organization?.id,
          organizationName: organization?.name,
          organizationData: organization
        });
      }
      
      // Load customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .eq('organization_id', organization.id)
        .order('name');
      
      if (customersError) {
        logger.error('Error loading customers:', customersError);
        throw new Error(`Failed to load customers: ${customersError.message || customersError.details || 'Unknown error'}`);
      }
      
      logger.log('📊 Customers loaded:', {
        count: customersData?.length || 0,
        organizationId: organization.id,
        organizationName: organization.name,
        sampleCustomers: customersData?.slice(0, 3)?.map(c => ({ id: c.id, name: c.name, CustomerListID: c.CustomerListID }))
      });
      
      setCustomers(customersData || []);
      
      // Load pricing tiers
      const { data: tiersData, error: tiersError } = await supabase
        .from('pricing_tiers')
        .select('*')
        .eq('organization_id', organization.id)
        .order('min_quantity');
      
      if (tiersError) {
        logger.error('Error loading pricing tiers:', tiersError);
        throw new Error(`Failed to load pricing tiers: ${tiersError.message || tiersError.details || 'Unknown error'}`);
      }
      
      // Load customer-specific pricing
      const { data: pricingData, error: pricingError } = await supabase
        .from('customer_pricing')
        .select('*')
        .eq('organization_id', organization.id);
      
      if (pricingError) {
        logger.error('Error loading customer pricing:', pricingError);
        throw new Error(`Failed to load customer pricing: ${pricingError.message || pricingError.details || 'Unknown error'}`);
      }

      // Load lease agreements
      const { data: agreementsData, error: agreementsError } = await supabase
        .from('lease_agreements')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('status', 'active');
      
      if (agreementsError) {
        logger.error('Error loading lease agreements:', agreementsError);
        // Don't throw - lease agreements are optional for this page
      }

      setCustomers(customersData || []);
      setPricingTiers(tiersData || []);
      setCustomerPricing(pricingData || []);
      setLeaseAgreements(agreementsData || []);
      
    } catch (error) {
      logger.error('Error loading data:', error);
      const errorMessage = error?.message || error?.details || error?.hint || 'Failed to load data';
      alert('Error loading pricing data: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerSelection = (customerListId, selected) => {
    if (selected) {
      setSelectedCustomers(prev => [...prev, customerListId]);
    } else {
      setSelectedCustomers(prev => prev.filter(id => id !== customerListId));
    }
  };

  // Helper function to check if a rental period is yearly
  const isYearlyPeriod = (period) => {
    if (!period) return false;
    const periodStr = period.toString().toLowerCase().trim();
    return periodStr === 'yearly' || 
           periodStr === 'annual' || 
           periodStr === 'annually' ||
           periodStr === 'year' ||
           periodStr.includes('year') ||
           periodStr.includes('annual');
  };

  // Helper function to check if billing frequency is yearly (for lease agreements)
  const isYearlyBillingFrequency = (frequency) => {
    if (!frequency) return false;
    const freqStr = frequency.toString().toLowerCase().trim();
    return freqStr === 'annual' || 
           freqStr === 'yearly' || 
           freqStr === 'annually' ||
           freqStr === 'semi-annual';
  };

  const createTestPricingData = async () => {
    if (!organization?.id) return;
    
    try {
      // Create some sample pricing data for testing
      const testPricingData = [
        {
          customer_id: customers[0]?.CustomerListID || 'TEST-CUSTOMER-1',
          rental_period: 'monthly',
          discount_percent: 10,
          organization_id: organization.id
        },
        {
          customer_id: customers[1]?.CustomerListID || 'TEST-CUSTOMER-2',
          rental_period: 'yearly',
          discount_percent: 15,
          organization_id: organization.id
        },
        {
          customer_id: customers[2]?.CustomerListID || 'TEST-CUSTOMER-3',
          rental_period: 'monthly',
          discount_percent: 20,
          organization_id: organization.id
        }
      ];

      const { error } = await supabase
        .from('customer_pricing')
        .insert(testPricingData);

      if (error) throw error;

      alert('Test pricing data created successfully!');
      loadData(); // Reload data to show the new pricing
    } catch (error) {
      logger.error('Error creating test pricing data:', error);
      alert('Failed to create test pricing data: ' + error.message);
    }
  };

  // Filter customers based on search term and rental period
  const filteredCustomers = useMemo(() => {
    let filtered = customers;

    // Filter by search term (using debounced value)
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(customer => 
        customer.name?.toLowerCase().includes(searchLower) ||
        customer.CustomerListID?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by rental period
    if (sortByPeriod !== 'all') {
      filtered = filtered.filter(customer => {
        const currentPricing = customerPricing.find(p => p.customer_id === customer.CustomerListID);
        const customerLease = leaseAgreements.find(a => 
          (a.customer_id === customer.CustomerListID || a.customer_name === customer.name) &&
          a.status === 'active'
        );
        
        if (sortByPeriod === 'no-pricing') {
          return !currentPricing && !customerLease;
        } else {
          // Check if customer has pricing with the specific rental period
          if (sortByPeriod === 'yearly') {
            // Check for yearly variations with more robust matching
            // Include customers with yearly pricing OR yearly lease agreements
            return (currentPricing && isYearlyPeriod(currentPricing.rental_period)) ||
                   (customerLease && isYearlyBillingFrequency(customerLease.billing_frequency));
          } else if (sortByPeriod === 'monthly') {
            // For monthly filter, exclude customers with yearly lease agreements
            // Only show customers with monthly pricing AND no yearly lease agreements
            const hasYearlyLease = customerLease && isYearlyBillingFrequency(customerLease.billing_frequency);
            if (hasYearlyLease) {
              return false; // Exclude customers with yearly lease agreements from monthly filter
            }
            const customerPeriod = (currentPricing?.rental_period || 'monthly').toLowerCase().trim();
            return currentPricing && customerPeriod === sortByPeriod;
          } else {
            const customerPeriod = (currentPricing?.rental_period || 'monthly').toLowerCase().trim();
            return currentPricing && customerPeriod === sortByPeriod;
          }
        }
      });
    }

    return filtered;
  }, [customers, debouncedSearchTerm, sortByPeriod, customerPricing, leaseAgreements]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [debouncedSearchTerm, sortByPeriod]);

  // Pagination
  const paginatedCustomers = filteredCustomers.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSelectAll = (selected) => {
    if (selected) {
      // Select all filtered customers (all pages)
      setSelectedCustomers(filteredCustomers.map(c => c.CustomerListID));
    } else {
      // Deselect all filtered customers
      const filteredIds = new Set(filteredCustomers.map(c => c.CustomerListID));
      setSelectedCustomers(prev => prev.filter(id => !filteredIds.has(id)));
    }
  };

  const applyBulkPricing = async () => {
    if (selectedCustomers.length === 0) {
      alert('Please select at least one customer');
      return;
    }

    try {
      setSaving(true);
      
      logger.log('Applying bulk pricing with data:', {
        organizationId: organization.id,
        selectedCustomers,
        bulkPricing
      });
      
      const pricingRecords = selectedCustomers.map(customerId => ({
        organization_id: organization.id,
        customer_id: customerId, // This should be CustomerListID, not UUID
        discount_percent: bulkPricing.discountPercent,
        markup_percent: bulkPricing.markupPercent,
        fixed_rate_override: bulkPricing.fixedRateOverride || null,
        rental_period: bulkPricing.rentalPeriod, // monthly or yearly
        effective_date: bulkPricing.effectiveDate,
        expiry_date: bulkPricing.expiryDate || null,
        is_active: true,
        notes: `Bulk pricing applied on ${new Date().toLocaleDateString()} (${bulkPricing.rentalPeriod})`
      }));

      logger.log('Pricing records to insert:', pricingRecords);

      // Delete existing pricing for selected customers (batched to avoid URL length limits)
      logger.log('Deleting existing pricing for customers:', selectedCustomers.length);
      const BATCH_SIZE = 100;
      const batches = [];
      for (let i = 0; i < selectedCustomers.length; i += BATCH_SIZE) {
        batches.push(selectedCustomers.slice(i, i + BATCH_SIZE));
      }
      
      logger.log(`Splitting ${selectedCustomers.length} customer IDs into ${batches.length} batches for deletion`);
      
      // Delete in batches
      for (const batch of batches) {
        const { error: deleteError } = await supabase
          .from('customer_pricing')
          .delete()
          .eq('organization_id', organization.id)
          .in('customer_id', batch);

        if (deleteError) {
          logger.error('Error deleting existing pricing batch:', deleteError);
          throw new Error(`Failed to delete existing pricing: ${deleteError.message || deleteError.details || 'Unknown error'}`);
        }
      }
      
      logger.log('Successfully deleted existing pricing for all customers');

      // Insert new pricing records
      logger.log('Inserting new pricing records...');
      const { error } = await supabase
        .from('customer_pricing')
        .insert(pricingRecords);

      if (error) {
        logger.error('Error inserting pricing records:', error);
        throw error;
      }

      // Reload data
      await loadData();
      
      logger.log('Bulk pricing applied successfully');
      alert(`Successfully applied bulk pricing to ${selectedCustomers.length} customers`);
      setSelectedCustomers([]);
      setBulkPricing({
        discountPercent: 0,
        markupPercent: 0,
        fixedRateOverride: '',
        effectiveDate: new Date().toISOString().split('T')[0],
        expiryDate: '',
        applyToAll: false,
        rentalPeriod: 'monthly'
      });
      
    } catch (error) {
      logger.error('Error applying bulk pricing:', error);
      const errorMessage = error?.message || error?.details || error?.hint || 'Unknown error occurred';
      alert('Error applying bulk pricing: ' + errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const deleteCustomerPricing = async (customerListId) => {
    if (!confirm('Are you sure you want to remove custom pricing for this customer?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('customer_pricing')
        .delete()
        .eq('organization_id', organization.id)
        .eq('customer_id', customerListId);

      if (error) {
        throw error;
      }

      await loadData();
      alert('Customer pricing removed successfully');
      
    } catch (error) {
      logger.error('Error deleting customer pricing:', error);
      const errorMessage = error?.message || error?.details || error?.hint || 'Unknown error occurred';
      alert('Error removing customer pricing: ' + errorMessage);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading pricing data...</Typography>
      </Box>
    );
  }

  if (!organization) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Please connect to an organization to access the bulk rental pricing manager.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Bulk Rental Pricing Manager
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Apply pricing changes to multiple customers at once. Changes will be reflected in the rental system.
      </Typography>

      {/* Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PeopleIcon color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="primary">
                    {customers.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Customers
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <MoneyIcon color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="success.main">
                    {customerPricing.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Custom Pricing
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUpIcon color="info" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="info.main">
                    {pricingTiers.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pricing Tiers
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <SettingsIcon color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {selectedCustomers.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Selected
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Bulk Pricing Configuration */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Bulk Pricing Configuration
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Discount Percentage"
              type="number"
              value={bulkPricing.discountPercent}
              onChange={(e) => setBulkPricing(prev => ({ ...prev, discountPercent: parseFloat(e.target.value) || 0 }))}
              inputProps={{ min: 0, max: 100, step: 0.1 }}
              helperText="Percentage discount from standard pricing"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Markup Percentage"
              type="number"
              value={bulkPricing.markupPercent}
              onChange={(e) => setBulkPricing(prev => ({ ...prev, markupPercent: parseFloat(e.target.value) || 0 }))}
              inputProps={{ min: 0, step: 0.1 }}
              helperText="Percentage markup on standard pricing"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Fixed Rate Override"
              type="number"
              value={bulkPricing.fixedRateOverride}
              onChange={(e) => setBulkPricing(prev => ({ ...prev, fixedRateOverride: e.target.value }))}
              helperText={`Fixed ${bulkPricing.rentalPeriod} rate (overrides tier pricing)`}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Rental Period</InputLabel>
              <Select
                value={bulkPricing.rentalPeriod}
                onChange={(e) => setBulkPricing(prev => ({ ...prev, rentalPeriod: e.target.value }))}
              >
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="yearly">Yearly</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Effective Date"
              type="date"
              value={bulkPricing.effectiveDate}
              onChange={(e) => setBulkPricing(prev => ({ ...prev, effectiveDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Expiry Date (Optional)"
              type="date"
              value={bulkPricing.expiryDate}
              onChange={(e) => setBulkPricing(prev => ({ ...prev, expiryDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={applyBulkPricing}
            disabled={saving || selectedCustomers.length === 0}
            sx={{ minWidth: 200 }}
          >
            {saving ? 'Applying...' : `Apply to ${selectedCustomers.length} Customers`}
          </Button>
          
          <Button
            variant="outlined"
            onClick={() => setSelectedCustomers([])}
            disabled={selectedCustomers.length === 0}
          >
            Clear Selection
          </Button>
        </Box>
      </Paper>

      {/* Search and Filter Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Search & Filter Customers
        </Typography>
        
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Search Customers"
              placeholder="Search by name or customer ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Filter by Rental Period</InputLabel>
              <Select
                value={sortByPeriod}
                onChange={(e) => setSortByPeriod(e.target.value)}
              >
                <MenuItem value="all">All Customers ({customers.length})</MenuItem>
                <MenuItem value="monthly">Monthly Rentals ({customerPricing.filter(p => {
                  const period = (p.rental_period || 'monthly').toLowerCase();
                  return period === 'monthly';
                }).length})</MenuItem>
                <MenuItem value="yearly">Yearly Rentals ({customerPricing.filter(p => isYearlyPeriod(p.rental_period)).length + leaseAgreements.filter(a => isYearlyBillingFrequency(a.billing_frequency)).length})</MenuItem>
                <MenuItem value="no-pricing">No Custom Pricing ({customers.length - customerPricing.length})</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        
        {/* Debug Info */}
        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Debug Info:</strong> Showing {filteredCustomers.length} of {customers.length} customers
            {searchTerm && ` (filtered by "${searchTerm}")`}
            {sortByPeriod !== 'all' && ` (filtered by ${sortByPeriod})`}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            <strong>Customer Breakdown:</strong>
            {' '}
            {(() => {
              // Get customers with yearly lease agreements
              const yearlyLeaseAgreements = leaseAgreements.filter(a => isYearlyBillingFrequency(a.billing_frequency));
              const yearlyLeaseCustomerIds = new Set(
                yearlyLeaseAgreements.map(a => a.customer_id || a.customer_name)
              );
              const yearlyLeaseCustomerNames = new Set(
                yearlyLeaseAgreements.map(a => a.customer_name).filter(Boolean)
              );
              
              // Get customers with yearly pricing
              const yearlyPricingCustomerIds = new Set(
                customerPricing
                  .filter(p => isYearlyPeriod(p.rental_period))
                  .map(p => p.customer_id)
              );
              
              // Count monthly customers (those with monthly pricing AND no yearly lease)
              const monthlyCount = customerPricing.filter(p => {
                const period = (p.rental_period || 'monthly').toLowerCase();
                if (period !== 'monthly') return false;
                
                // Check if this customer has a yearly lease
                const customer = customers.find(c => c.CustomerListID === p.customer_id);
                const hasYearlyLease = yearlyLeaseCustomerIds.has(p.customer_id) || 
                                      (customer && yearlyLeaseCustomerNames.has(customer.name));
                return !hasYearlyLease;
              }).length;
              
              // Count yearly customers (unique customers with yearly pricing OR yearly lease)
              const allYearlyCustomerIds = new Set([
                ...yearlyPricingCustomerIds,
                ...yearlyLeaseCustomerIds
              ]);
              
              // Also check by customer name for lease agreements
              yearlyLeaseAgreements.forEach(lease => {
                const customer = customers.find(c => 
                  c.CustomerListID === lease.customer_id || c.name === lease.customer_name
                );
                if (customer) {
                  allYearlyCustomerIds.add(customer.CustomerListID);
                }
              });
              
              const yearlyCount = allYearlyCustomerIds.size;
              
              return `Monthly: ${monthlyCount} • Yearly: ${yearlyCount} • Total: ${customers.length}`;
            })()}
            {import.meta.env.DEV && (
              <>
                {' • '}
                <span style={{ fontSize: '0.85em', color: '#666' }}>
                  (Pricing records: {customerPricing.length}, Leases: {leaseAgreements.length})
                </span>
              </>
            )}
          </Typography>
          {import.meta.env.DEV && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                <strong>Detailed Breakdown:</strong>
                {' '}
                Customer Pricing Records: {customerPricing.length} total
                {' • '}
                Monthly pricing: {customerPricing.filter(p => {
                  const period = (p.rental_period || 'monthly').toLowerCase();
                  return period === 'monthly';
                }).length}
                {' • '}
                Yearly pricing: {customerPricing.filter(p => isYearlyPeriod(p.rental_period)).length}
                {' • '}
                Lease Agreements: {leaseAgreements.length} active
                {' • '}
                Yearly leases: {leaseAgreements.filter(a => isYearlyBillingFrequency(a.billing_frequency)).length}
              </Typography>
            </>
          )}
          {customerPricing.length === 0 && (
            <Button 
              size="small" 
              variant="outlined" 
              onClick={createTestPricingData}
              sx={{ mt: 1 }}
            >
              Create Test Pricing Data
            </Button>
          )}
        </Box>
      </Paper>

      {/* Customer Selection */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Customer Selection
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={filteredCustomers.length > 0 && filteredCustomers.every(c => selectedCustomers.includes(c.CustomerListID))}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
            }
            label={`Select All (${filteredCustomers.length} filtered customers)`}
          />
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <input
                    type="checkbox"
                    checked={filteredCustomers.length > 0 && filteredCustomers.every(c => selectedCustomers.includes(c.CustomerListID))}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </TableCell>
                <TableCell>Customer Name</TableCell>
                <TableCell>Customer ID</TableCell>
                <TableCell>Current Pricing</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography variant="body2" color="text.secondary" py={2}>
                      No customers found matching your filters
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCustomers.map((customer) => {
                  const currentPricing = customerPricing.find(p => p.customer_id === customer.CustomerListID);
                  const customerLease = leaseAgreements.find(a => 
                    (a.customer_id === customer.CustomerListID || a.customer_name === customer.name) &&
                    a.status === 'active'
                  );
                  const hasYearlyLease = customerLease && isYearlyBillingFrequency(customerLease.billing_frequency);
                  
                  return (
                    <TableRow key={customer.id}>
                      <TableCell padding="checkbox">
                        <input
                          type="checkbox"
                          checked={selectedCustomers.includes(customer.CustomerListID)}
                          onChange={(e) => handleCustomerSelection(customer.CustomerListID, e.target.checked)}
                          disabled={hasYearlyLease} // Disable selection for customers with yearly lease agreements
                        />
                      </TableCell>
                      <TableCell>{customer.name}</TableCell>
                      <TableCell>{customer.CustomerListID}</TableCell>
                      <TableCell>
                        {hasYearlyLease ? (
                          <Box>
                            <Chip 
                              label="Lease Agreement (Annual)" 
                              size="small" 
                              color="secondary" 
                              sx={{ mr: 1 }}
                            />
                            {customerLease.agreement_number && (
                              <Chip 
                                label={customerLease.agreement_number} 
                                size="small" 
                                color="info"
                              />
                            )}
                          </Box>
                        ) : currentPricing ? (
                          <Box>
                            <Chip 
                              label={`${currentPricing.discount_percent}% discount`} 
                              size="small" 
                              color="success" 
                              sx={{ mr: 1 }}
                            />
                            {currentPricing.fixed_rate_override && (
                              <Chip 
                                label={`$${currentPricing.fixed_rate_override}/${currentPricing.rental_period || 'month'}`} 
                                size="small" 
                                color="info"
                              />
                            )}
                          </Box>
                        ) : (
                          <Chip label="Standard Pricing" size="small" color="default" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="View Pricing Details">
                            <IconButton
                              size="small"
                              onClick={() => setPricingDetailDialog({ 
                                open: true, 
                                customer, 
                                pricing: hasYearlyLease ? { ...customerLease, isLease: true } : currentPricing 
                              })}
                              color="primary"
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                          {currentPricing && !hasYearlyLease && (
                            <Tooltip title="Remove Custom Pricing">
                              <IconButton
                                size="small"
                                onClick={() => deleteCustomerPricing(customer.CustomerListID)}
                                color="error"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={filteredCustomers.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50, 100]}
            labelRowsPerPage="Rows per page:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`}
          />
        </TableContainer>
      </Paper>

      {/* Pricing Detail Dialog */}
      <Dialog 
        open={pricingDetailDialog.open} 
        onClose={() => setPricingDetailDialog({ open: false, customer: null, pricing: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Pricing Details - {pricingDetailDialog.customer?.name || 'Customer'}
        </DialogTitle>
        <DialogContent>
          {pricingDetailDialog.pricing ? (
            <Box sx={{ mt: 2 }}>
              {pricingDetailDialog.pricing.isLease ? (
                // Lease Agreement Details
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Customer ID
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {pricingDetailDialog.customer?.CustomerListID || 'N/A'}
                    </Typography>
                  </Grid>
                  
                  {pricingDetailDialog.pricing.agreement_number && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Agreement Number
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {pricingDetailDialog.pricing.agreement_number}
                      </Typography>
                    </Grid>
                  )}
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Billing Frequency
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      <Chip 
                        label={pricingDetailDialog.pricing.billing_frequency?.toUpperCase() || 'ANNUAL'} 
                        size="small" 
                        color="secondary"
                      />
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Status
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      <Chip 
                        label={pricingDetailDialog.pricing.status || 'Active'} 
                        size="small" 
                        color="success"
                      />
                    </Typography>
                  </Grid>
                  
                  {pricingDetailDialog.pricing.annual_amount && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Annual Amount
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        ${parseFloat(pricingDetailDialog.pricing.annual_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Typography>
                    </Grid>
                  )}
                  
                  {pricingDetailDialog.pricing.start_date && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Start Date
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {new Date(pricingDetailDialog.pricing.start_date).toLocaleDateString()}
                      </Typography>
                    </Grid>
                  )}
                  
                  {pricingDetailDialog.pricing.end_date && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        End Date
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {new Date(pricingDetailDialog.pricing.end_date).toLocaleDateString()}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              ) : (
                // Customer Pricing Details
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Customer ID
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {pricingDetailDialog.customer?.CustomerListID || 'N/A'}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Rental Period
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      <Chip 
                        label={pricingDetailDialog.pricing.rental_period?.toUpperCase() || 'MONTHLY'} 
                        size="small" 
                        color="primary"
                      />
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Status
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      <Chip 
                        label={pricingDetailDialog.pricing.is_active ? 'Active' : 'Inactive'} 
                        size="small" 
                        color={pricingDetailDialog.pricing.is_active ? 'success' : 'default'}
                      />
                    </Typography>
                  </Grid>
                  
                  {pricingDetailDialog.pricing.discount_percent > 0 && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Discount Percentage
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {pricingDetailDialog.pricing.discount_percent}%
                      </Typography>
                    </Grid>
                  )}
                  
                  {pricingDetailDialog.pricing.markup_percent > 0 && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Markup Percentage
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {pricingDetailDialog.pricing.markup_percent}%
                      </Typography>
                    </Grid>
                  )}
                  
                  {pricingDetailDialog.pricing.fixed_rate_override && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Fixed Rate Override
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        ${pricingDetailDialog.pricing.fixed_rate_override} / {pricingDetailDialog.pricing.rental_period || 'month'}
                      </Typography>
                    </Grid>
                  )}
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Effective Date
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {new Date(pricingDetailDialog.pricing.effective_date).toLocaleDateString()}
                    </Typography>
                  </Grid>
                  
                  {pricingDetailDialog.pricing.expiry_date && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Expiry Date
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {new Date(pricingDetailDialog.pricing.expiry_date).toLocaleDateString()}
                      </Typography>
                    </Grid>
                  )}
                  
                  {pricingDetailDialog.pricing.notes && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Notes
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        {pricingDetailDialog.pricing.notes}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              )}
            </Box>
          ) : (
            <Box sx={{ mt: 2 }}>
              <Alert severity="info">
                This customer is using standard pricing tiers. No custom pricing has been configured.
              </Alert>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Customer ID: {pricingDetailDialog.customer?.CustomerListID || 'N/A'}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPricingDetailDialog({ open: false, customer: null, pricing: null })}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Yearly Rental Customers Section */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Yearly Rental Customers
        </Typography>
        
        {(() => {
          // Filter for yearly customers from customer_pricing table
          const yearlyPricingCustomers = customerPricing.filter(p => isYearlyPeriod(p.rental_period));
          
          // Filter for yearly customers from lease_agreements table
          const yearlyLeaseCustomers = leaseAgreements.filter(agreement => 
            isYearlyBillingFrequency(agreement.billing_frequency)
          );
          
          // Combine both sources
          const allYearlyCustomers = [
            ...yearlyPricingCustomers.map(p => ({
              type: 'pricing',
              id: p.id,
              customer_id: p.customer_id,
              customer_name: customers.find(c => c.CustomerListID === p.customer_id)?.name,
              discount_percent: p.discount_percent,
              fixed_rate_override: p.fixed_rate_override,
              effective_date: p.effective_date,
              expiry_date: p.expiry_date,
              rental_period: p.rental_period
            })),
            ...yearlyLeaseCustomers.map(agreement => ({
              type: 'lease',
              id: agreement.id,
              customer_id: agreement.customer_id || agreement.customer_name,
              customer_name: agreement.customer_name || customers.find(c => 
                c.CustomerListID === agreement.customer_id || c.name === agreement.customer_name
              )?.name,
              annual_amount: agreement.annual_amount,
              billing_frequency: agreement.billing_frequency,
              start_date: agreement.start_date,
              end_date: agreement.end_date,
              agreement_number: agreement.agreement_number
            }))
          ];
          
          // Debug: Log all rental periods if in dev mode
          if (import.meta.env.DEV) {
            logger.log('Yearly customers from pricing:', yearlyPricingCustomers.length);
            logger.log('Yearly customers from leases:', yearlyLeaseCustomers.length);
            logger.log('Total yearly customers:', allYearlyCustomers.length);
            if (leaseAgreements.length > 0) {
              logger.log('All lease agreements:', leaseAgreements.map(a => ({
                id: a.id,
                customer_name: a.customer_name,
                billing_frequency: a.billing_frequency,
                status: a.status
              })));
            }
          }
          
          return allYearlyCustomers.length === 0 ? (
            <Alert severity="info">
              No yearly rental customers configured. Use the rental period selector above to set up yearly pricing, or create a lease agreement with annual billing frequency.
              {import.meta.env.DEV && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" component="div">
                    Debug: Found {customerPricing.length} pricing records, {leaseAgreements.length} lease agreements.
                    {customerPricing.length > 0 && ` Rental periods: ${[...new Set(customerPricing.map(p => p.rental_period || 'null'))].join(', ')}`}
                    {leaseAgreements.length > 0 && ` Billing frequencies: ${[...new Set(leaseAgreements.map(a => a.billing_frequency || 'null'))].join(', ')}`}
                  </Typography>
                </Box>
              )}
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {allYearlyCustomers.map((item) => {
                return (
                  <Grid item xs={12} md={6} key={`${item.type}-${item.id}`}>
                    <Card variant="outlined" sx={{ borderColor: 'primary.main', borderWidth: 2 }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Chip 
                            label={item.type === 'lease' ? 'LEASE AGREEMENT' : 'YEARLY'} 
                            size="small" 
                            color={item.type === 'lease' ? 'secondary' : 'primary'} 
                            sx={{ mr: 1, fontWeight: 'bold' }}
                          />
                          <Typography variant="subtitle1" gutterBottom sx={{ mb: 0 }}>
                            {item.customer_name || `Customer ID: ${item.customer_id}`}
                          </Typography>
                        </Box>
                        
                        {item.type === 'pricing' ? (
                          <>
                            {item.discount_percent > 0 && (
                              <Typography variant="body2" color="text.secondary">
                                Discount: {item.discount_percent}%
                              </Typography>
                            )}
                            {item.fixed_rate_override && (
                              <Typography variant="body2" color="text.secondary">
                                Fixed Rate: ${item.fixed_rate_override}/year
                              </Typography>
                            )}
                            {item.effective_date && (
                              <Typography variant="body2" color="text.secondary">
                                Effective: {new Date(item.effective_date).toLocaleDateString()}
                              </Typography>
                            )}
                            {item.expiry_date && (
                              <Typography variant="body2" color="text.secondary">
                                Expires: {new Date(item.expiry_date).toLocaleDateString()}
                              </Typography>
                            )}
                          </>
                        ) : (
                          <>
                            {item.agreement_number && (
                              <Typography variant="body2" color="text.secondary">
                                Agreement: {item.agreement_number}
                              </Typography>
                            )}
                            {item.annual_amount && (
                              <Typography variant="body2" color="text.secondary">
                                Annual Amount: ${parseFloat(item.annual_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </Typography>
                            )}
                            <Typography variant="body2" color="text.secondary">
                              Billing: {item.billing_frequency || 'annual'}
                            </Typography>
                            {item.start_date && (
                              <Typography variant="body2" color="text.secondary">
                                Start: {new Date(item.start_date).toLocaleDateString()}
                              </Typography>
                            )}
                            {item.end_date && (
                              <Typography variant="body2" color="text.secondary">
                                End: {new Date(item.end_date).toLocaleDateString()}
                              </Typography>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          );
        })()}
      </Paper>
    </Box>
  );
}
