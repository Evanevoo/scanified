import logger from '../utils/logger';
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent,
  LinearProgress, Chip, IconButton, Tooltip
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Analytics as AnalyticsIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';

export default function OrganizationAnalytics() {
  const { profile, organization } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    totalCustomers: 0,
    totalCylinders: 0,
    activeRentals: 0,
    monthlyRevenue: 0,
    growthRate: 0,
    customerSatisfaction: 0
  });
  const [monthlyData, setMonthlyData] = useState([]);
  const [cylinderTypes, setCylinderTypes] = useState([]);

  useEffect(() => {
    if (organization?.id) {
      fetchAnalytics();
    }
  }, [organization]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      if (!organization?.id) {
        throw new Error('No organization found');
      }

      // Fetch real data from database - using simpler queries first
      const [
        { count: customers, error: customersError },
        { count: cylinders, error: cylindersError },
        { count: rentals, error: rentalsError },
        { count: invoices, error: invoicesError }
      ] = await Promise.all([
        supabase
          .from('customers')
          .select('id', { count: 'exact' })
          .eq('organization_id', organization.id),
        
        supabase
          .from('bottles')
          .select('id', { count: 'exact' })
          .eq('organization_id', organization.id),
        
        supabase
          .from('rentals')
          .select('id', { count: 'exact' })
          .eq('organization_id', organization.id)
          .is('rental_end_date', null),
        
        supabase
          .from('invoices')
          .select('id', { count: 'exact' })
          .eq('organization_id', organization.id)
          .eq('status', 'paid')
          .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
      ]);

      if (customersError) throw customersError;
      if (cylindersError) throw cylindersError;
      if (rentalsError) throw rentalsError;
      if (invoicesError) throw invoicesError;

            // Calculate real metrics
      const totalCustomers = customers || 0;
      const totalCylinders = cylinders || 0;
      const activeRentals = rentals || 0;
      // Calculate monthly revenue from rentals
      const currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const nextMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
      
      const { data: currentMonthRentals } = await supabase
        .from('rentals')
        .select('rental_amount')
        .eq('organization_id', organization.id)
        .gte('created_at', currentMonth.toISOString())
        .lt('created_at', nextMonth.toISOString());
      
      const monthlyRevenue = currentMonthRentals?.reduce((sum, rental) => 
        sum + (rental.rental_amount || 0), 0) || 0;

      // Calculate growth rate (simplified - compare with previous month)
      const lastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
      const { count: lastMonthInvoices } = await supabase
        .from('invoices')
        .select('id', { count: 'exact' })
        .eq('organization_id', organization.id)
        .eq('status', 'paid')
        .gte('created_at', lastMonth.toISOString())
        .lt('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

      // Calculate last month's revenue for growth rate
      const { data: lastMonthRentals } = await supabase
        .from('rentals')
        .select('rental_amount')
        .eq('organization_id', organization.id)
        .gte('created_at', lastMonth.toISOString())
        .lt('created_at', currentMonth.toISOString());
      
      const lastMonthRevenue = lastMonthRentals?.reduce((sum, rental) => 
        sum + (rental.rental_amount || 0), 0) || 0;
      
      // Calculate growth rate percentage
      const growthRate = lastMonthRevenue > 0 
        ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : monthlyRevenue > 0 ? 100 : 0;

      // Generate monthly data for charts
      const monthlyChartData = await generateMonthlyData(organization.id);
      
      // Generate cylinder type distribution
      const cylinderTypeData = generateCylinderTypeData();

      setAnalytics({
        totalCustomers,
        totalCylinders,
        activeRentals,
        monthlyRevenue,
        growthRate: Math.round(growthRate * 10) / 10,
        customerSatisfaction: totalCustomers > 0 ? Math.min(95, 75 + (activeRentals / totalCustomers) * 20) : 0 // Estimated based on rental activity
      });

      setMonthlyData(monthlyChartData);
      setCylinderTypes(cylinderTypeData);

    } catch (error) {
      logger.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMonthlyData = async (orgId) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    const data = [];

    for (let i = 0; i < 6; i++) {
      const monthIndex = new Date().getMonth() - 5 + i;
      const month = months[monthIndex >= 0 ? monthIndex : monthIndex + 12];
      
      // Get data for this month
      const startDate = new Date(currentYear, monthIndex, 1);
      const endDate = new Date(currentYear, monthIndex + 1, 0);

             const [
         { count: monthCustomers },
         { count: monthInvoices },
         { count: monthCylinders },
         { data: monthRentals }
       ] = await Promise.all([
         supabase
           .from('customers')
           .select('id', { count: 'exact' })
           .eq('organization_id', orgId)
           .gte('created_at', startDate.toISOString())
           .lt('created_at', endDate.toISOString()),
         
         supabase
           .from('invoices')
           .select('id', { count: 'exact' })
           .eq('organization_id', orgId)
           .eq('status', 'paid')
           .gte('created_at', startDate.toISOString())
           .lt('created_at', endDate.toISOString()),
         
         supabase
           .from('bottles')
           .select('id', { count: 'exact' })
           .eq('organization_id', orgId)
           .gte('created_at', startDate.toISOString())
           .lt('created_at', endDate.toISOString()),
         
         supabase
           .from('rentals')
           .select('rental_amount')
           .eq('organization_id', orgId)
           .gte('created_at', startDate.toISOString())
           .lt('created_at', endDate.toISOString())
       ]);

       // Calculate monthly revenue from rentals
       const monthRevenue = monthRentals?.reduce((sum, rental) => 
         sum + (rental.rental_amount || 0), 0) || 0;

       data.push({
         month,
         customers: monthCustomers || 0,
         revenue: monthRevenue,
         cylinders: monthCylinders || 0
       });
    }

    return data;
  };

  const generateCylinderTypeData = (cylinders) => {
    // For now, return a simple placeholder since we don't have full cylinder data
    return [
      { name: 'No Data Available', value: 1, color: '#8884d8' }
    ];
  };

  const StatCard = ({ title, value, subtitle, icon, color, trend }) => (
    <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ 
            backgroundColor: `${color}.light`, 
            color: `${color}.main`,
            borderRadius: 2,
            p: 1,
            mr: 2
          }}>
            {icon}
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h4" fontWeight={800} color="primary">
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
          </Box>
          {trend && (
            <Chip
              icon={trend > 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
              label={`${Math.abs(trend)}%`}
              color={trend > 0 ? 'success' : 'error'}
              size="small"
            />
          )}
        </Box>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={800} color="primary">
          Organization Analytics
        </Typography>
        <IconButton onClick={fetchAnalytics} disabled={loading}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {loading && <LinearProgress sx={{ mb: 3 }} />}

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Customers"
            value={analytics.totalCustomers}
            subtitle="Active customers in system"
            icon={<AnalyticsIcon />}
            color="primary"
            trend={analytics.growthRate}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Cylinders"
            value={analytics.totalCylinders}
            subtitle="Cylinders in inventory"
            icon={<AnalyticsIcon />}
            color="secondary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Rentals"
            value={analytics.activeRentals}
            subtitle="Currently rented out"
            icon={<AnalyticsIcon />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Monthly Revenue"
            value={`$${analytics.monthlyRevenue.toLocaleString()}`}
            subtitle="This month's revenue"
            icon={<AnalyticsIcon />}
            color="warning"
            trend={analytics.growthRate}
          />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Customer Growth Chart */}
        <Grid item xs={12} lg={8}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={700} mb={3}>
              Customer Growth & Revenue
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <RechartsTooltip />
                <Line yAxisId="left" type="monotone" dataKey="customers" stroke="#8884d8" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#82ca9d" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Cylinder Types Distribution */}
        <Grid item xs={12} lg={4}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={700} mb={3}>
              Cylinder Types Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={cylinderTypes}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {cylinderTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Cylinder Inventory Chart */}
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={700} mb={3}>
              Cylinder Inventory Trends
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="cylinders" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
} 