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
  Warning as WarningIcon, Info as InfoIcon, Search as SearchIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';
import { useDebounce } from '../utils/performance';

export default function BulkRentalPricingManager() {
  const { organization } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [pricingTiers, setPricingTiers] = useState([]);
  const [customerPricing, setCustomerPricing] = useState([]);
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

      setCustomers(customersData || []);
      setPricingTiers(tiersData || []);
      setCustomerPricing(pricingData || []);
      
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
        
        if (sortByPeriod === 'no-pricing') {
          return !currentPricing;
        } else {
          // Check if customer has pricing with the specific rental period
          const customerPeriod = currentPricing?.rental_period || 'monthly';
          return currentPricing && customerPeriod === sortByPeriod;
        }
      });
    }

    return filtered;
  }, [customers, debouncedSearchTerm, sortByPeriod, customerPricing]);

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
      // Only select customers on current page
      setSelectedCustomers(prev => {
        const newSelection = new Set(prev);
        paginatedCustomers.forEach(c => newSelection.add(c.CustomerListID));
        return Array.from(newSelection);
      });
    } else {
      // Only deselect customers on current page
      setSelectedCustomers(prev => {
        const currentPageIds = new Set(paginatedCustomers.map(c => c.CustomerListID));
        return prev.filter(id => !currentPageIds.has(id));
      });
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
                <MenuItem value="monthly">Monthly Rentals ({customerPricing.filter(p => p.rental_period === 'monthly').length})</MenuItem>
                <MenuItem value="yearly">Yearly Rentals ({customerPricing.filter(p => p.rental_period === 'yearly').length})</MenuItem>
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
            <strong>Pricing Records:</strong> {customerPricing.length} total
            {customerPricing.length > 0 && (
              <>
                {' • '}
                Monthly: {customerPricing.filter(p => (p.rental_period || 'monthly') === 'monthly').length}
                {' • '}
                Yearly: {customerPricing.filter(p => p.rental_period === 'yearly').length}
              </>
            )}
          </Typography>
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
                checked={paginatedCustomers.length > 0 && paginatedCustomers.every(c => selectedCustomers.includes(c.CustomerListID))}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
            }
            label={`Select All (${paginatedCustomers.length} on this page)`}
          />
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <input
                    type="checkbox"
                    checked={paginatedCustomers.length > 0 && paginatedCustomers.every(c => selectedCustomers.includes(c.CustomerListID))}
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
                  return (
                    <TableRow key={customer.id}>
                      <TableCell padding="checkbox">
                        <input
                          type="checkbox"
                          checked={selectedCustomers.includes(customer.CustomerListID)}
                          onChange={(e) => handleCustomerSelection(customer.CustomerListID, e.target.checked)}
                        />
                      </TableCell>
                      <TableCell>{customer.name}</TableCell>
                      <TableCell>{customer.CustomerListID}</TableCell>
                      <TableCell>
                        {currentPricing ? (
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
                        {currentPricing && (
                          <IconButton
                            size="small"
                            onClick={() => deleteCustomerPricing(customer.CustomerListID)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
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

      {/* Current Pricing Overview */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Current Customer Pricing Overview
        </Typography>
        
        {customerPricing.length === 0 ? (
          <Alert severity="info">
            No custom pricing configured. All customers use standard pricing tiers.
          </Alert>
        ) : (
          <Grid container spacing={2}>
            {customerPricing.map((pricing) => {
              // Find customer name manually since we can't join
              const customer = customers.find(c => c.CustomerListID === pricing.customer_id);
              return (
                <Grid item xs={12} md={6} key={pricing.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        {customer?.name || `Customer ID: ${pricing.customer_id}`}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Discount: {pricing.discount_percent}%
                      </Typography>
                      {pricing.fixed_rate_override && (
                        <Typography variant="body2" color="text.secondary">
                          Fixed Rate: ${pricing.fixed_rate_override}/{pricing.rental_period || 'month'}
                        </Typography>
                      )}
                      <Typography variant="body2" color="text.secondary">
                        Effective: {new Date(pricing.effective_date).toLocaleDateString()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Paper>

      {/* Yearly Rental Customers Section */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Yearly Rental Customers
        </Typography>
        
        {(() => {
          const yearlyCustomers = customerPricing.filter(p => p.rental_period === 'yearly');
          return yearlyCustomers.length === 0 ? (
            <Alert severity="info">
              No yearly rental customers configured. Use the rental period selector above to set up yearly pricing.
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {yearlyCustomers.map((pricing) => {
                // Find customer name manually since we can't join
                const customer = customers.find(c => c.CustomerListID === pricing.customer_id);
                return (
                  <Grid item xs={12} md={6} key={pricing.id}>
                    <Card variant="outlined" sx={{ borderColor: 'primary.main', borderWidth: 2 }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Chip 
                            label="YEARLY" 
                            size="small" 
                            color="primary" 
                            sx={{ mr: 1, fontWeight: 'bold' }}
                          />
                          <Typography variant="subtitle1" gutterBottom sx={{ mb: 0 }}>
                            {customer?.name || `Customer ID: ${pricing.customer_id}`}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          Discount: {pricing.discount_percent}%
                        </Typography>
                        {pricing.fixed_rate_override && (
                          <Typography variant="body2" color="text.secondary">
                            Fixed Rate: ${pricing.fixed_rate_override}/year
                          </Typography>
                        )}
                        <Typography variant="body2" color="text.secondary">
                          Effective: {new Date(pricing.effective_date).toLocaleDateString()}
                        </Typography>
                        {pricing.expiry_date && (
                          <Typography variant="body2" color="text.secondary">
                            Expires: {new Date(pricing.expiry_date).toLocaleDateString()}
                          </Typography>
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
