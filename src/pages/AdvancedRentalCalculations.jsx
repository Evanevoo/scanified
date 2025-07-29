import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Chip,
  Divider
} from '@mui/material';
import {
  Calculate as CalculateIcon,
  Add as AddIcon,
  Edit as EditIcon,
  TrendingUp as TrendingUpIcon,
  Receipt as ReceiptIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useDynamicAssetTerms } from '../hooks/useDynamicAssetTerms';

export default function AdvancedRentalCalculations() {
  const { profile, organization } = useAuth();
  const { terms, isReady } = useDynamicAssetTerms();
  const [activeTab, setActiveTab] = useState(0);
  const [pricingRules, setPricingRules] = useState([]);
  const [calculations, setCalculations] = useState([]);
  const [newCalculation, setNewCalculation] = useState({
    customer: '',
    asset_type: '',
    rental_period: '',
    quantity: 1,
    start_date: '',
    end_date: ''
  });
  const [calcDialog, setCalcDialog] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    // Simulate loading pricing rules and calculations
    setTimeout(() => {
      setPricingRules([
        {
          id: 1,
          name: 'Standard Propane',
          asset_type: 'Propane',
          base_rate: 15.00,
          daily_rate: 2.50,
          weekly_rate: 12.00,
          monthly_rate: 35.00,
          quantity_discounts: [
            { min_qty: 10, discount: 0.10 },
            { min_qty: 25, discount: 0.15 },
            { min_qty: 50, discount: 0.20 }
          ],
          seasonal_multipliers: [
            { season: 'summer', multiplier: 1.2 },
            { season: 'winter', multiplier: 0.9 }
          ]
        },
        {
          id: 2,
          name: 'Industrial Oxygen',
          asset_type: 'Oxygen',
          base_rate: 25.00,
          daily_rate: 4.00,
          weekly_rate: 22.00,
          monthly_rate: 75.00,
          quantity_discounts: [
            { min_qty: 5, discount: 0.08 },
            { min_qty: 15, discount: 0.12 },
            { min_qty: 30, discount: 0.18 }
          ],
          hazmat_fee: 5.00
        }
      ]);

      setCalculations([
        {
          id: 1,
          customer: 'ABC Manufacturing',
          asset_type: 'Propane',
          quantity: 20,
          rental_period: '30 days',
          base_cost: 300.00,
          discount_applied: 30.00,
          taxes: 21.60,
          total: 291.60,
          created_date: '2024-01-15'
        },
        {
          id: 2,
          customer: 'XYZ Industries',
          asset_type: 'Oxygen',
          quantity: 8,
          rental_period: '14 days',
          base_cost: 448.00,
          hazmat_fee: 40.00,
          taxes: 39.04,
          total: 527.04,
          created_date: '2024-01-14'
        }
      ]);
    }, 1000);
  }, []);

  const calculateRental = () => {
    const rule = pricingRules.find(r => r.asset_type === newCalculation.asset_type);
    if (!rule) return;

    const days = Math.ceil((new Date(newCalculation.end_date) - new Date(newCalculation.start_date)) / (1000 * 60 * 60 * 24));
    const quantity = parseInt(newCalculation.quantity);

    // Base calculation
    let baseCost = 0;
    if (days <= 7) {
      baseCost = rule.daily_rate * days * quantity;
    } else if (days <= 30) {
      baseCost = rule.weekly_rate * Math.ceil(days / 7) * quantity;
    } else {
      baseCost = rule.monthly_rate * Math.ceil(days / 30) * quantity;
    }

    // Apply quantity discount
    let discount = 0;
    const applicableDiscount = rule.quantity_discounts?.find(d => quantity >= d.min_qty);
    if (applicableDiscount) {
      discount = baseCost * applicableDiscount.discount;
    }

    // Add fees
    let fees = 0;
    if (rule.hazmat_fee) {
      fees = rule.hazmat_fee * quantity;
    }

    // Calculate taxes (8% example)
    const subtotal = baseCost - discount + fees;
    const taxes = subtotal * 0.08;
    const total = subtotal + taxes;

    const calculationResult = {
      customer: newCalculation.customer,
      asset_type: newCalculation.asset_type,
      quantity: quantity,
      rental_period: `${days} days`,
      base_cost: baseCost,
      discount_applied: discount,
      fees: fees,
      taxes: taxes,
      total: total,
      breakdown: {
        daily_rate: rule.daily_rate,
        weekly_rate: rule.weekly_rate,
        monthly_rate: rule.monthly_rate,
        discount_percent: applicableDiscount?.discount || 0,
        tax_rate: 0.08
      }
    };

    setResult(calculationResult);
  };

  const saveCalculation = () => {
    if (result) {
      const newId = Math.max(...calculations.map(c => c.id), 0) + 1;
      setCalculations([{
        ...result,
        id: newId,
        created_date: new Date().toISOString().split('T')[0]
      }, ...calculations]);
      setCalcDialog(false);
      setResult(null);
      setNewCalculation({
        customer: '',
        asset_type: '',
        rental_period: '',
        quantity: 1,
        start_date: '',
        end_date: ''
      });
    }
  };

  const assetName = isReady ? terms.asset : 'Asset';
  const assetsName = isReady ? terms.assets : 'Assets';

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Advanced Rental Calculations
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        Complex pricing calculations for {assetsName.toLowerCase()} rentals
      </Typography>

      {/* Overview Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <CalculateIcon color="primary" fontSize="large" />
                <Box>
                  <Typography variant="h4" color="primary.main">
                    {calculations.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Calculations
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <SettingsIcon color="warning" fontSize="large" />
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {pricingRules.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pricing Rules
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <TrendingUpIcon color="success" fontSize="large" />
                <Box>
                  <Typography variant="h4" color="success.main">
                    ${calculations.reduce((sum, c) => sum + c.total, 0).toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Revenue
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <ReceiptIcon color="info" fontSize="large" />
                <Box>
                  <Typography variant="h4" color="info.main">
                    ${(calculations.reduce((sum, c) => sum + c.total, 0) / calculations.length || 0).toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg. Invoice
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Action Buttons */}
      <Box display="flex" gap={2} mb={3}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCalcDialog(true)}
        >
          New Calculation
        </Button>
        <Button
          variant="outlined"
          startIcon={<SettingsIcon />}
        >
          Manage Pricing Rules
        </Button>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="Recent Calculations" />
          <Tab label="Pricing Rules" />
          <Tab label="Analytics" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Customer</TableCell>
                  <TableCell>{assetName} Type</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Period</TableCell>
                  <TableCell>Base Cost</TableCell>
                  <TableCell>Discount</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {calculations.map((calc) => (
                  <TableRow key={calc.id}>
                    <TableCell>{calc.customer}</TableCell>
                    <TableCell>{calc.asset_type}</TableCell>
                    <TableCell>{calc.quantity}</TableCell>
                    <TableCell>{calc.rental_period}</TableCell>
                    <TableCell>${calc.base_cost.toFixed(2)}</TableCell>
                    <TableCell>
                      {calc.discount_applied > 0 && (
                        <Chip 
                          label={`-$${calc.discount_applied.toFixed(2)}`} 
                          color="success" 
                          size="small" 
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        ${calc.total.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>{calc.created_date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {activeTab === 1 && (
        <Grid container spacing={3}>
          {pricingRules.map((rule) => (
            <Grid item xs={12} md={6} key={rule.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {rule.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    {assetName} Type: {rule.asset_type}
                  </Typography>
                  
                  <Box mb={2}>
                    <Typography variant="subtitle2" gutterBottom>
                      Base Rates
                    </Typography>
                    <Typography variant="body2">
                      Daily: ${rule.daily_rate} | Weekly: ${rule.weekly_rate} | Monthly: ${rule.monthly_rate}
                    </Typography>
                  </Box>

                  {rule.quantity_discounts && (
                    <Box mb={2}>
                      <Typography variant="subtitle2" gutterBottom>
                        Quantity Discounts
                      </Typography>
                      {rule.quantity_discounts.map((discount, idx) => (
                        <Chip
                          key={idx}
                          label={`${discount.min_qty}+ units: ${(discount.discount * 100).toFixed(0)}% off`}
                          size="small"
                          sx={{ mr: 1, mb: 1 }}
                        />
                      ))}
                    </Box>
                  )}

                  {rule.hazmat_fee && (
                    <Box mb={2}>
                      <Typography variant="subtitle2" gutterBottom>
                        Additional Fees
                      </Typography>
                      <Chip label={`Hazmat: $${rule.hazmat_fee}`} color="warning" size="small" />
                    </Box>
                  )}

                  <Button size="small" startIcon={<EditIcon />}>
                    Edit Rule
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Revenue by {assetName} Type
                </Typography>
                <Box>
                  {['Propane', 'Oxygen', 'Nitrogen'].map((type) => {
                    const typeRevenue = calculations
                      .filter(c => c.asset_type === type)
                      .reduce((sum, c) => sum + c.total, 0);
                    return (
                      <Box key={type} display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2">{type}</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          ${typeRevenue.toFixed(2)}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Discount Analysis
                </Typography>
                <Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Total Discounts Given</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      ${calculations.reduce((sum, c) => sum + (c.discount_applied || 0), 0).toFixed(2)}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Avg. Discount %</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {calculations.length > 0 ? 
                        ((calculations.reduce((sum, c) => sum + (c.discount_applied || 0), 0) / 
                          calculations.reduce((sum, c) => sum + c.base_cost, 0)) * 100).toFixed(1)
                        : 0}%
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Calculation Dialog */}
      <Dialog open={calcDialog} onClose={() => setCalcDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>New Rental Calculation</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Customer Name"
                value={newCalculation.customer}
                onChange={(e) => setNewCalculation({ ...newCalculation, customer: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>{assetName} Type</InputLabel>
                <Select
                  value={newCalculation.asset_type}
                  onChange={(e) => setNewCalculation({ ...newCalculation, asset_type: e.target.value })}
                  label={`${assetName} Type`}
                >
                  {pricingRules.map((rule) => (
                    <MenuItem key={rule.id} value={rule.asset_type}>
                      {rule.asset_type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Quantity"
                value={newCalculation.quantity}
                onChange={(e) => setNewCalculation({ ...newCalculation, quantity: e.target.value })}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Start Date"
                value={newCalculation.start_date}
                onChange={(e) => setNewCalculation({ ...newCalculation, start_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="End Date"
                value={newCalculation.end_date}
                onChange={(e) => setNewCalculation({ ...newCalculation, end_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="outlined"
                onClick={calculateRental}
                disabled={!newCalculation.customer || !newCalculation.asset_type || !newCalculation.start_date || !newCalculation.end_date}
              >
                Calculate Pricing
              </Button>
            </Grid>

            {result && (
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Calculation Result
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2">Base Cost:</Typography>
                      <Typography variant="body1" fontWeight="bold">
                        ${result.base_cost.toFixed(2)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">Discount:</Typography>
                      <Typography variant="body1" fontWeight="bold" color="success.main">
                        -${result.discount_applied.toFixed(2)}
                      </Typography>
                    </Grid>
                    {result.fees > 0 && (
                      <Grid item xs={6}>
                        <Typography variant="body2">Fees:</Typography>
                        <Typography variant="body1" fontWeight="bold">
                          ${result.fees.toFixed(2)}
                        </Typography>
                      </Grid>
                    )}
                    <Grid item xs={6}>
                      <Typography variant="body2">Taxes:</Typography>
                      <Typography variant="body1" fontWeight="bold">
                        ${result.taxes.toFixed(2)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="h6">
                        Total: ${result.total.toFixed(2)}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCalcDialog(false)}>Cancel</Button>
          {result && (
            <Button onClick={saveCalculation} variant="contained">
              Save Calculation
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}