import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, CircularProgress, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Chip, Button, Select, MenuItem, FormControl, InputLabel, LinearProgress
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  People as PeopleIcon,
  AttachMoney as MoneyIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { supabase } from '../supabase/client';
import { usageService } from '../services/usageService';

export default function OwnerAnalytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('30');
  const [analytics, setAnalytics] = useState({
    revenue: {},
    customers: {},
    usage: {},
    churn: {},
    organizations: []
  });

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // Get all organizations
      const { data: organizations } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (!organizations) throw new Error('Failed to load organizations');

      // Calculate analytics
      const analyticsData = await calculateAnalytics(organizations);
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = async (organizations) => {
    const now = new Date();
    const daysAgo = parseInt(timeRange);
    const startDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));

    // Revenue calculations
    const activeSubscriptions = organizations.filter(org => org.subscription_status === 'active');
    const trialSubscriptions = organizations.filter(org => org.subscription_status === 'trial');
    const cancelledSubscriptions = organizations.filter(org => org.subscription_status === 'cancelled');

    const monthlyRevenue = activeSubscriptions.reduce((total, org) => {
      const planPrices = { basic: 29, pro: 99, enterprise: 299 };
      return total + (planPrices[org.subscription_plan] || 0);
    }, 0);

    const annualRevenue = monthlyRevenue * 12;

    // Customer growth
    const newCustomers = organizations.filter(org => 
      new Date(org.created_at) >= startDate
    ).length;

    const totalCustomers = organizations.length;

    // Churn analysis
    const churnedCustomers = cancelledSubscriptions.length;
    const churnRate = totalCustomers > 0 ? (churnedCustomers / totalCustomers) * 100 : 0;

    // Usage analysis
    const usagePromises = organizations.map(org => 
      usageService.getOrganizationUsage(org.id).catch(() => null)
    );
    const usageResults = await Promise.all(usagePromises);

    const highUsageOrgs = usageResults.filter(usage => 
      usage && (usage.users.percentage > 80 || usage.customers.percentage > 80 || usage.bottles.percentage > 80)
    ).length;

    const lowUsageOrgs = usageResults.filter(usage => 
      usage && (usage.users.percentage < 20 && usage.customers.percentage < 20 && usage.bottles.percentage < 20)
    ).length;

    return {
      revenue: {
        monthly: monthlyRevenue,
        annual: annualRevenue,
        activeSubscriptions: activeSubscriptions.length,
        trialSubscriptions: trialSubscriptions.length
      },
      customers: {
        total: totalCustomers,
        new: newCustomers,
        growth: totalCustomers > 0 ? (newCustomers / totalCustomers) * 100 : 0
      },
      usage: {
        highUsage: highUsageOrgs,
        lowUsage: lowUsageOrgs,
        averageUsage: usageResults.filter(Boolean).length > 0 ? 
          usageResults.filter(Boolean).reduce((sum, usage) => 
            sum + (usage.users.percentage + usage.customers.percentage + usage.bottles.percentage) / 3, 0
          ) / usageResults.filter(Boolean).length : 0
      },
      churn: {
        rate: churnRate,
        count: churnedCustomers,
        riskCustomers: lowUsageOrgs
      },
      organizations: organizations
    };
  };

  const getMetricColor = (value, threshold = 0) => {
    if (value > threshold) return 'success.main';
    if (value < threshold) return 'error.main';
    return 'warning.main';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getPlanDistribution = () => {
    const planCounts = analytics.organizations.reduce((acc, org) => {
      acc[org.subscription_plan] = (acc[org.subscription_plan] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(planCounts).map(([plan, count]) => ({
      plan,
      count,
      percentage: (count / analytics.organizations.length) * 100
    }));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Business Analytics</Typography>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Time Range</InputLabel>
          <Select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            label="Time Range"
          >
            <MenuItem value="7">Last 7 days</MenuItem>
            <MenuItem value="30">Last 30 days</MenuItem>
            <MenuItem value="90">Last 90 days</MenuItem>
            <MenuItem value="365">Last year</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <MoneyIcon sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="h6">Monthly Revenue</Typography>
              </Box>
              <Typography variant="h4" color="success.main">
                {formatCurrency(analytics.revenue.monthly)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {analytics.revenue.activeSubscriptions} active subscriptions
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PeopleIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Total Customers</Typography>
              </Box>
              <Typography variant="h4" color="primary.main">
                {analytics.customers.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                +{analytics.customers.new} new ({analytics.customers.growth.toFixed(1)}% growth)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUpIcon sx={{ mr: 1, color: 'info.main' }} />
                <Typography variant="h6">Average Usage</Typography>
              </Box>
              <Typography variant="h4" color="info.main">
                {analytics.usage.averageUsage.toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {analytics.usage.highUsage} high usage, {analytics.usage.lowUsage} low usage
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <WarningIcon sx={{ mr: 1, color: 'warning.main' }} />
                <Typography variant="h6">Churn Rate</Typography>
              </Box>
              <Typography variant="h4" color={getMetricColor(analytics.churn.rate, 5)}>
                {analytics.churn.rate.toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {analytics.churn.count} cancelled, {analytics.churn.riskCustomers} at risk
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Plan Distribution */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Plan Distribution
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Plan</TableCell>
                      <TableCell>Customers</TableCell>
                      <TableCell>Percentage</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {getPlanDistribution().map((plan) => (
                      <TableRow key={plan.plan}>
                        <TableCell>
                          <Chip 
                            label={plan.plan.toUpperCase()} 
                            color={plan.plan === 'enterprise' ? 'success' : plan.plan === 'pro' ? 'primary' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{plan.count}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <LinearProgress
                              variant="determinate"
                              value={plan.percentage}
                              sx={{ width: 100, mr: 1 }}
                            />
                            {plan.percentage.toFixed(1)}%
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Subscription Status
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CheckCircleIcon sx={{ mr: 1, color: 'success.main' }} />
                    <Typography>Active</Typography>
                  </Box>
                  <Typography variant="h6">{analytics.revenue.activeSubscriptions}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <WarningIcon sx={{ mr: 1, color: 'warning.main' }} />
                    <Typography>Trial</Typography>
                  </Box>
                  <Typography variant="h6">{analytics.revenue.trialSubscriptions}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TrendingDownIcon sx={{ mr: 1, color: 'error.main' }} />
                    <Typography>Cancelled</Typography>
                  </Box>
                  <Typography variant="h6">{analytics.churn.count}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Organizations */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Organizations
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Organization</TableCell>
                  <TableCell>Plan</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {analytics.organizations.slice(0, 10).map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <Typography variant="subtitle2">{org.name}</Typography>
                      <Typography variant="body2" color="text.secondary">{org.slug}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={org.subscription_plan} 
                        size="small"
                        color={org.subscription_plan === 'enterprise' ? 'success' : org.subscription_plan === 'pro' ? 'primary' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={org.subscription_status}
                        color={org.subscription_status === 'active' ? 'success' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(org.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => window.open(`/owner-dashboard`, '_blank')}
                      >
                        Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
} 