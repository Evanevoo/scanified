import logger from '../utils/logger';
import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, 
  LinearProgress, Chip, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Paper,
  CircularProgress, Alert, Select, MenuItem, FormControl,
  InputLabel, Button
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  LocalShipping as DeliveryIcon,
  AttachMoney as RevenueIcon,
  People as CustomerIcon,
  Inventory as InventoryIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon
} from '@mui/icons-material';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';

export default function AnalyticsDashboard() {
  const { profile, organization } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('30');

  useEffect(() => {
    if (organization) {
      fetchAnalytics();
    }
  }, [organization, timeRange]);

  const fetchAnalytics = async () => {
    try {
      const days = parseInt(timeRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Fetch various analytics data
      const [
        { data: bottles },
        { data: customers },
        { data: rentals },
        { data: invoices },
        { data: revenue }
      ] = await Promise.all([
        supabase
          .from('bottles')
          .select('*')
          .eq('organization_id', organization.id)
          .gte('created_at', startDate.toISOString()),
        
        supabase
          .from('customers')
          .select('*')
          .eq('organization_id', organization.id)
          .gte('created_at', startDate.toISOString()),
        
        supabase
          .from('rentals')
          .select('*')
          .eq('organization_id', organization.id)
          .gte('created_at', startDate.toISOString()),
        
        supabase
          .from('invoices')
          .select('*')
          .eq('organization_id', organization.id)
          .gte('created_at', startDate.toISOString()),
        
        supabase
          .from('invoices')
          .select('total')
          .eq('organization_id', organization.id)
          .eq('status', 'paid')
          .gte('created_at', startDate.toISOString())
      ]);

      // Calculate metrics
      const totalRevenue = revenue?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;
      const activeBottles = bottles?.filter(b => b.status === 'active').length || 0;
      const pendingDeliveries = rentals?.filter(r => r.status === 'pending').length || 0;
      const completedDeliveries = rentals?.filter(r => r.status === 'delivered').length || 0;
      const newCustomers = customers?.length || 0;

      // Calculate growth rates (simplified)
      const previousPeriodStart = new Date(startDate);
      previousPeriodStart.setDate(previousPeriodStart.getDate() - days);
      
      const [
        { data: prevBottles },
        { data: prevRevenueData }
      ] = await Promise.all([
        supabase
          .from('bottles')
          .select('*')
          .eq('organization_id', organization.id)
          .gte('created_at', previousPeriodStart.toISOString())
          .lt('created_at', startDate.toISOString()),
        
        supabase
          .from('invoices')
          .select('total')
          .eq('organization_id', organization.id)
          .eq('status', 'paid')
          .gte('created_at', previousPeriodStart.toISOString())
          .lt('created_at', startDate.toISOString())
      ]);

      const prevRevenueTotal = prevRevenueData?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;
      const revenueGrowth = prevRevenueTotal > 0 ? ((totalRevenue - prevRevenueTotal) / prevRevenueTotal) * 100 : 0;

      setAnalytics({
        totalRevenue,
        revenueGrowth,
        activeBottles,
        pendingDeliveries,
        completedDeliveries,
        newCustomers,
        totalBottles: bottles?.length || 0,
        totalCustomers: customers?.length || 0,
        totalOrders: rentals?.length || 0,
        totalInvoices: invoices?.length || 0,
        recentOrders: rentals?.slice(0, 5) || [],
        topCustomers: customers?.slice(0, 5) || [],
        revenueByMonth: calculateRevenueByMonth(invoices),
        deliveryStatus: {
          pending: pendingDeliveries,
          inTransit: rentals?.filter(r => r.status === 'in_transit').length || 0,
          delivered: completedDeliveries,
          cancelled: rentals?.filter(r => r.status === 'cancelled').length || 0
        }
      });
    } catch (err) {
      logger.error('Error fetching analytics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateRevenueByMonth = (invoices) => {
    if (!invoices) return [];
    
    const monthlyRevenue = {};
    invoices.forEach(invoice => {
      const month = new Date(invoice.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (invoice.total || 0);
    });
    
    return Object.entries(monthlyRevenue).map(([month, revenue]) => ({ month, revenue }));
  };

  const getGrowthColor = (growth) => {
    return growth >= 0 ? 'success' : 'error';
  };

  const getGrowthIcon = (growth) => {
    return growth >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />;
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
        <Typography variant="h4">
          Analytics Dashboard
        </Typography>
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
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <RevenueIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Revenue</Typography>
              </Box>
              <Typography variant="h4" color="primary" gutterBottom>
                ${analytics?.totalRevenue.toFixed(2)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Chip
                  icon={getGrowthIcon(analytics?.revenueGrowth)}
                  label={`${analytics?.revenueGrowth >= 0 ? '+' : ''}${analytics?.revenueGrowth.toFixed(1)}%`}
                  color={getGrowthColor(analytics?.revenueGrowth)}
                  size="small"
                  sx={{ mr: 1 }}
                />
                <Typography variant="body2" color="text.secondary">
                  vs previous period
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CustomerIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">New Customers</Typography>
              </Box>
              <Typography variant="h4" color="primary" gutterBottom>
                {analytics?.newCustomers}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total: {analytics?.totalCustomers}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <DeliveryIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Deliveries</Typography>
              </Box>
              <Typography variant="h4" color="primary" gutterBottom>
                {analytics?.completedDeliveries}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {analytics?.pendingDeliveries} pending
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <InventoryIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Active Bottles</Typography>
              </Box>
              <Typography variant="h4" color="primary" gutterBottom>
                {analytics?.activeBottles}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total: {analytics?.totalBottles}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Delivery Status */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Delivery Status
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Pending</Typography>
                  <Typography variant="body2">{analytics?.deliveryStatus.pending}</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={(analytics?.deliveryStatus.pending / analytics?.totalOrders) * 100}
                  color="warning"
                />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">In Transit</Typography>
                  <Typography variant="body2">{analytics?.deliveryStatus.inTransit}</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={(analytics?.deliveryStatus.inTransit / analytics?.totalOrders) * 100}
                  color="info"
                />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Delivered</Typography>
                  <Typography variant="body2">{analytics?.deliveryStatus.delivered}</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={(analytics?.deliveryStatus.delivered / analytics?.totalOrders) * 100}
                  color="success"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Revenue Trend
              </Typography>
              {analytics?.revenueByMonth.map((item, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">{item.month}</Typography>
                    <Typography variant="body2">${item.revenue.toFixed(2)}</Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={(item.revenue / Math.max(...analytics.revenueByMonth.map(r => r.revenue))) * 100}
                    color="primary"
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Orders */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Orders
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Order ID</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analytics?.recentOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>#{order.id}</TableCell>
                        <TableCell>
                          <Chip
                            label={order.status}
                            color={order.status === 'delivered' ? 'success' : 'warning'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(order.created_at).toLocaleDateString()}
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
                Quick Actions
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<DeliveryIcon />}
                  >
                    New Order
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<CustomerIcon />}
                  >
                    Add Customer
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<InventoryIcon />}
                  >
                    Add Bottle
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<RevenueIcon />}
                  >
                    Generate Report
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
} 