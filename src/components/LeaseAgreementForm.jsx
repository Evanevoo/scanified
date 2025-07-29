import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Typography,
  Switch,
  FormControlLabel,
  InputAdornment,
  Chip,
  Autocomplete,
  Card,
  CardContent,
  Divider,
  Alert,
  Button,
  IconButton
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  AttachMoney as MoneyIcon,
  DateRange as DateIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';

export default function LeaseAgreementForm({ 
  formData, 
  setFormData, 
  mode = 'add', 
  onValidationChange 
}) {
  const { profile } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [assetTypes, setAssetTypes] = useState([]);
  const [locations, setLocations] = useState([]);
  const [lineItems, setLineItems] = useState([]);
  const [errors, setErrors] = useState({});
  const [calculatedAmounts, setCalculatedAmounts] = useState({
    subtotal: 0,
    taxAmount: 0,
    total: 0
  });

  useEffect(() => {
    if (profile?.organization_id) {
      fetchCustomers();
      fetchAssetTypes();
      fetchLocations();
    }
  }, [profile]);

  useEffect(() => {
    validateForm();
    calculateAmounts();
  }, [formData, lineItems]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('CustomerListID, name, email, phone, address')
        .eq('organization_id', profile.organization_id)
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchAssetTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('gas_types')
        .select('type, category, group_name')
        .order('category', { ascending: true });

      if (error) throw error;
      
      // Create unique asset types
      const uniqueTypes = [...new Set(data.map(item => item.type))];
      setAssetTypes(uniqueTypes);
    } catch (error) {
      console.error('Error fetching asset types:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('name, address')
        .eq('organization_id', profile.organization_id)
        .order('name');

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.customer_id) {
      newErrors.customer_id = 'Customer is required';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }

    if (!formData.end_date) {
      newErrors.end_date = 'End date is required';
    } else if (formData.start_date && new Date(formData.end_date) <= new Date(formData.start_date)) {
      newErrors.end_date = 'End date must be after start date';
    }

    if (!formData.annual_amount || parseFloat(formData.annual_amount) <= 0) {
      newErrors.annual_amount = 'Annual amount must be greater than 0';
    }

    if (!formData.billing_frequency) {
      newErrors.billing_frequency = 'Billing frequency is required';
    }

    setErrors(newErrors);
    
    if (onValidationChange) {
      onValidationChange(Object.keys(newErrors).length === 0);
    }
  };

  const calculateAmounts = () => {
    const annualAmount = parseFloat(formData.annual_amount) || 0;
    const taxRate = parseFloat(formData.tax_rate) || 0;
    
    const subtotal = annualAmount;
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;

    setCalculatedAmounts({
      subtotal,
      taxAmount,
      total
    });
  };

  const handleCustomerChange = (customerId) => {
    const customer = customers.find(c => c.CustomerListID === customerId);
    setFormData({
      ...formData,
      customer_id: customerId,
      customer_name: customer?.name || '',
      billing_contact_email: customer?.email || formData.billing_contact_email,
      billing_address: customer?.address || formData.billing_address
    });
  };

  const handleAssetTypeAdd = (assetType) => {
    if (assetType && !formData.asset_types.includes(assetType)) {
      setFormData({
        ...formData,
        asset_types: [...formData.asset_types, assetType]
      });
    }
  };

  const handleAssetTypeRemove = (assetType) => {
    setFormData({
      ...formData,
      asset_types: formData.asset_types.filter(type => type !== assetType)
    });
  };

  const handleLocationAdd = (location) => {
    if (location && !formData.asset_locations.includes(location)) {
      setFormData({
        ...formData,
        asset_locations: [...formData.asset_locations, location]
      });
    }
  };

  const handleLocationRemove = (location) => {
    setFormData({
      ...formData,
      asset_locations: formData.asset_locations.filter(loc => loc !== location)
    });
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: Date.now(),
        item_type: 'cylinder',
        description: '',
        quantity: 1,
        unit_price: 0,
        total_price: 0,
        product_code: '',
        gas_type: '',
        size: ''
      }
    ]);
  };

  const removeLineItem = (id) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const updateLineItem = (id, field, value) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // Recalculate total price
        if (field === 'quantity' || field === 'unit_price') {
          updatedItem.total_price = updatedItem.quantity * updatedItem.unit_price;
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const calculateBillingAmount = () => {
    const annualAmount = parseFloat(formData.annual_amount) || 0;
    const frequency = formData.billing_frequency;
    
    switch (frequency) {
      case 'monthly':
        return annualAmount / 12;
      case 'quarterly':
        return annualAmount / 4;
      case 'semi-annual':
        return annualAmount / 2;
      case 'annual':
        return annualAmount;
      default:
        return annualAmount / 12;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Customer Information */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <BusinessIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Customer Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth error={!!errors.customer_id}>
                    <InputLabel>Customer *</InputLabel>
                    <Select
                      value={formData.customer_id}
                      onChange={(e) => handleCustomerChange(e.target.value)}
                      label="Customer *"
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
                    label="Agreement Title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Billing Contact Email"
                    type="email"
                    value={formData.billing_contact_email}
                    onChange={(e) => setFormData({ ...formData, billing_contact_email: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Billing Address"
                    multiline
                    rows={2}
                    value={formData.billing_address}
                    onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Agreement Terms */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <DateIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Agreement Terms
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Start Date *"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.start_date}
                    helperText={errors.start_date}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="End Date *"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.end_date}
                    helperText={errors.end_date}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Payment Terms"
                    value={formData.payment_terms}
                    onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                    placeholder="e.g., Net 30, Net 15"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Maximum Asset Count"
                    type="number"
                    value={formData.max_asset_count}
                    onChange={(e) => setFormData({ ...formData, max_asset_count: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.auto_renewal}
                        onChange={(e) => setFormData({ ...formData, auto_renewal: e.target.checked })}
                      />
                    }
                    label="Auto Renewal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Renewal Notice Days"
                    type="number"
                    value={formData.renewal_notice_days}
                    onChange={(e) => setFormData({ ...formData, renewal_notice_days: e.target.value })}
                    disabled={!formData.auto_renewal}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Financial Terms */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <MoneyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Financial Terms
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Annual Amount *"
                    type="number"
                    value={formData.annual_amount}
                    onChange={(e) => setFormData({ ...formData, annual_amount: e.target.value })}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                    error={!!errors.annual_amount}
                    helperText={errors.annual_amount}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth error={!!errors.billing_frequency}>
                    <InputLabel>Billing Frequency *</InputLabel>
                    <Select
                      value={formData.billing_frequency}
                      onChange={(e) => setFormData({ ...formData, billing_frequency: e.target.value })}
                      label="Billing Frequency *"
                    >
                      <MenuItem value="monthly">Monthly</MenuItem>
                      <MenuItem value="quarterly">Quarterly</MenuItem>
                      <MenuItem value="semi-annual">Semi-Annual</MenuItem>
                      <MenuItem value="annual">Annual</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Tax Rate"
                    type="number"
                    value={formData.tax_rate}
                    onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                    inputProps={{ step: 0.0001, min: 0, max: 1 }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Alert severity="info">
                    <Typography variant="body2">
                      <strong>Billing Amount:</strong> {formatCurrency(calculateBillingAmount())} per {formData.billing_frequency.replace('-', ' ')}
                    </Typography>
                  </Alert>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Asset Coverage */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Asset Coverage
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Covered Asset Types
                  </Typography>
                  <Autocomplete
                    options={assetTypes}
                    value=""
                    onChange={(event, newValue) => {
                      if (newValue) {
                        handleAssetTypeAdd(newValue);
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Add asset type..."
                        size="small"
                      />
                    )}
                  />
                  <Box mt={1}>
                    {formData.asset_types.map((type) => (
                      <Chip
                        key={type}
                        label={type}
                        onDelete={() => handleAssetTypeRemove(type)}
                        size="small"
                        sx={{ mr: 1, mb: 1 }}
                      />
                    ))}
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Covered Locations
                  </Typography>
                  <Autocomplete
                    options={locations.map(loc => loc.name)}
                    value=""
                    onChange={(event, newValue) => {
                      if (newValue) {
                        handleLocationAdd(newValue);
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Add location..."
                        size="small"
                      />
                    )}
                  />
                  <Box mt={1}>
                    {formData.asset_locations.map((location) => (
                      <Chip
                        key={location}
                        label={location}
                        onDelete={() => handleLocationRemove(location)}
                        size="small"
                        sx={{ mr: 1, mb: 1 }}
                      />
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Terms and Conditions */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Terms and Conditions
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Terms & Conditions"
                    multiline
                    rows={4}
                    value={formData.terms_and_conditions}
                    onChange={(e) => setFormData({ ...formData, terms_and_conditions: e.target.value })}
                    placeholder="Enter the general terms and conditions for this lease agreement..."
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Special Provisions"
                    multiline
                    rows={3}
                    value={formData.special_provisions}
                    onChange={(e) => setFormData({ ...formData, special_provisions: e.target.value })}
                    placeholder="Enter any special provisions or custom terms..."
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Summary */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Financial Summary
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Annual Amount
                  </Typography>
                  <Typography variant="h6">
                    {formatCurrency(calculatedAmounts.subtotal)}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Annual Tax
                  </Typography>
                  <Typography variant="h6">
                    {formatCurrency(calculatedAmounts.taxAmount)}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Total Annual Value
                  </Typography>
                  <Typography variant="h6" color="primary">
                    {formatCurrency(calculatedAmounts.total)}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
} 