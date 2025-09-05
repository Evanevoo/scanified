import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Button, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, FormControl, InputLabel, Select, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Tabs, Tab, Chip, Alert, Divider, IconButton, Tooltip
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Calculate as CalculateIcon, Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon, Warning as WarningIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';

export default function RentalPricingManager() {
  const { organization } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [pricingTiers, setPricingTiers] = useState([]);
  const [customerRates, setCustomerRates] = useState([]);
  const [demurrageRules, setDemurrageRules] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [tierDialog, setTierDialog] = useState({ open: false, tier: null, isNew: false });
  const [rateDialog, setRateDialog] = useState({ open: false, rate: null, isNew: false });
  const [demurrageDialog, setDemurrageDialog] = useState({ open: false, rule: null, isNew: false });

  useEffect(() => {
    if (organization?.id) {
      loadPricingData();
    }
  }, [organization]);

  const loadPricingData = async () => {
    try {
      setLoading(true);
      
      // Load pricing tiers (bracket-based rates)
      const { data: tiers } = await supabase
        .from('pricing_tiers')
        .select('*')
        .eq('organization_id', organization.id)
        .order('min_quantity');
      
      // Load customer-specific rates
      const { data: rates } = await supabase
        .from('customer_pricing')
        .select(`
          *,
          customer:customers(name, CustomerListID)
        `)
        .eq('organization_id', organization.id);
      
      // Load demurrage rules
      const { data: demurrage } = await supabase
        .from('demurrage_rules')
        .select('*')
        .eq('organization_id', organization.id)
        .order('grace_period_days');

      setPricingTiers(tiers || []);
      setCustomerRates(rates || []);
      setDemurrageRules(demurrage || []);
    } catch (error) {
      console.error('Error loading pricing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateRentalPrice = (quantity, days, customerType = 'standard', gasType = 'propane') => {
    // 1. Find applicable pricing tier (bracket-based)
    const tier = pricingTiers
      .filter(t => t.gas_type === gasType && quantity >= t.min_quantity)
      .sort((a, b) => b.min_quantity - a.min_quantity)[0]; // Highest applicable tier

    if (!tier) {
      return { error: 'No pricing tier found for this quantity' };
    }

    // 2. Calculate base rental cost
    let dailyRate = tier.daily_rate;
    let weeklyRate = tier.weekly_rate;
    let monthlyRate = tier.monthly_rate;

    let baseCost = 0;
    let rateType = '';

    if (days <= 7) {
      baseCost = dailyRate * days * quantity;
      rateType = 'daily';
    } else if (days <= 30) {
      const weeks = Math.ceil(days / 7);
      baseCost = weeklyRate * weeks * quantity;
      rateType = 'weekly';
    } else {
      const months = Math.ceil(days / 30);
      baseCost = monthlyRate * months * quantity;
      rateType = 'monthly';
    }

    // 3. Apply customer-specific discount if available
    let discount = 0;
    if (customerType !== 'standard') {
      const customerRate = customerRates.find(r => r.customer_type === customerType);
      if (customerRate) {
        discount = customerRate.discount_percent;
        baseCost = baseCost * (1 - discount / 100);
      }
    }

    // 4. Calculate demurrage if applicable
    let demurrageCost = 0;
    const demurrageRule = demurrageRules.find(r => r.gas_type === gasType);
    if (demurrageRule && days > demurrageRule.grace_period_days) {
      const overdueDays = days - demurrageRule.grace_period_days;
      demurrageCost = overdueDays * demurrageRule.daily_penalty * quantity;
    }

    const subtotal = baseCost + demurrageCost;
    const tax = subtotal * 0.08; // 8% tax
    const total = subtotal + tax;

    return {
      baseCost,
      demurrageCost,
      discount,
      subtotal,
      tax,
      total,
      rateType,
      tier: tier.name,
      breakdown: {
        quantity,
        days,
        rate: rateType === 'daily' ? dailyRate : rateType === 'weekly' ? weeklyRate : monthlyRate,
        rateType,
        discountPercent: discount
      }
    };
  };

  const savePricingTier = async (tierData) => {
    try {
      if (tierDialog.isNew) {
        const { error } = await supabase
          .from('pricing_tiers')
          .insert([{
            ...tierData,
            organization_id: organization.id
          }]);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pricing_tiers')
          .update(tierData)
          .eq('id', tierDialog.tier.id);
        if (error) throw error;
      }
      
      setTierDialog({ open: false, tier: null, isNew: false });
      loadPricingData();
    } catch (error) {
      console.error('Error saving pricing tier:', error);
    }
  };

  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading pricing data...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Rental Pricing Manager
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Configure advanced pricing rules, demurrage calculations, and customer-specific rates
      </Typography>

      {/* Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUpIcon color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="primary">
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
                <ScheduleIcon color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="success.main">
                    {customerRates.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Custom Rates
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
                <WarningIcon color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {demurrageRules.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Demurrage Rules
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
                <CalculateIcon color="info" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="info.main">
                    ${calculateRentalPrice(10, 30).total?.toFixed(2) || '0.00'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Sample Calculation
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Bracket Pricing" />
          <Tab label="Customer Rates" />
          <Tab label="Demurrage Rules" />
          <Tab label="Calculator" />
        </Tabs>
      </Paper>

      {/* Tab 1: Bracket Pricing (Pricing Tiers) */}
      <TabPanel value={activeTab} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Bracket-Based Pricing Tiers</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setTierDialog({ open: true, tier: null, isNew: true })}
          >
            Add Pricing Tier
          </Button>
        </Box>

        {pricingTiers.length === 0 ? (
          <Alert severity="info">
            No pricing tiers configured. Add your first tier to enable bracket-based pricing.
          </Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Tier Name</TableCell>
                  <TableCell>Gas Type</TableCell>
                  <TableCell>Min Quantity</TableCell>
                  <TableCell>Daily Rate</TableCell>
                  <TableCell>Weekly Rate</TableCell>
                  <TableCell>Monthly Rate</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pricingTiers.map((tier) => (
                  <TableRow key={tier.id}>
                    <TableCell>{tier.name}</TableCell>
                    <TableCell>
                      <Chip label={tier.gas_type} size="small" />
                    </TableCell>
                    <TableCell>{tier.min_quantity}</TableCell>
                    <TableCell>${tier.daily_rate}</TableCell>
                    <TableCell>${tier.weekly_rate}</TableCell>
                    <TableCell>${tier.monthly_rate}</TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => setTierDialog({ open: true, tier, isNew: false })}
                      >
                        <EditIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* Tab 2: Customer-Specific Rates */}
      <TabPanel value={activeTab} index={1}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Customer-Specific Pricing</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setRateDialog({ open: true, rate: null, isNew: true })}
          >
            Add Customer Rate
          </Button>
        </Box>

        {customerRates.length === 0 ? (
          <Alert severity="info">
            No customer-specific rates configured. All customers use standard pricing.
          </Alert>
        ) : (
          <Grid container spacing={2}>
            {customerRates.map((rate) => (
              <Grid item xs={12} md={6} key={rate.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {rate.customer?.name || rate.customer_type}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Discount: {rate.discount_percent}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Valid from: {new Date(rate.effective_date).toLocaleDateString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      {/* Tab 3: Demurrage Rules */}
      <TabPanel value={activeTab} index={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Demurrage Penalty Rules</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDemurrageDialog({ open: true, rule: null, isNew: true })}
          >
            Add Demurrage Rule
          </Button>
        </Box>

        <Alert severity="warning" sx={{ mb: 2 }}>
          Demurrage charges apply when cylinders are kept beyond the grace period.
        </Alert>

        {demurrageRules.length === 0 ? (
          <Alert severity="info">
            No demurrage rules configured. Cylinders can be kept indefinitely without penalty.
          </Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Gas Type</TableCell>
                  <TableCell>Grace Period (Days)</TableCell>
                  <TableCell>Daily Penalty</TableCell>
                  <TableCell>Max Penalty</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {demurrageRules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <Chip label={rule.gas_type} size="small" />
                    </TableCell>
                    <TableCell>{rule.grace_period_days} days</TableCell>
                    <TableCell>${rule.daily_penalty}</TableCell>
                    <TableCell>${rule.max_penalty || 'No limit'}</TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => setDemurrageDialog({ open: true, rule, isNew: false })}
                      >
                        <EditIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* Tab 4: Pricing Calculator */}
      <TabPanel value={activeTab} index={3}>
        <Typography variant="h6" gutterBottom>
          Rental Pricing Calculator
        </Typography>
        <Alert severity="info" sx={{ mb: 3 }}>
          Test your pricing rules with different scenarios
        </Alert>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Calculation Inputs
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Quantity"
                    type="number"
                    defaultValue={10}
                    id="calc-quantity"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Rental Days"
                    type="number"
                    defaultValue={30}
                    id="calc-days"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Gas Type</InputLabel>
                    <Select defaultValue="propane" id="calc-gas-type">
                      <MenuItem value="propane">Propane</MenuItem>
                      <MenuItem value="oxygen">Oxygen</MenuItem>
                      <MenuItem value="nitrogen">Nitrogen</MenuItem>
                      <MenuItem value="acetylene">Acetylene</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<CalculateIcon />}
                    onClick={() => {
                      const quantity = parseInt(document.getElementById('calc-quantity').value);
                      const days = parseInt(document.getElementById('calc-days').value);
                      const gasType = document.getElementById('calc-gas-type').value;
                      const result = calculateRentalPrice(quantity, days, 'standard', gasType);
                      console.log('Calculation result:', result);
                    }}
                  >
                    Calculate Price
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Pricing Breakdown
              </Typography>
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  Enter values and click Calculate to see pricing breakdown
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
}
