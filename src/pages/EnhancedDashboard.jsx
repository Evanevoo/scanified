import logger from '../utils/logger';
import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Grid, Card, CardContent, Box, Button,
  Avatar, Chip, LinearProgress, IconButton, Tooltip, Dialog,
  DialogTitle, DialogContent, DialogActions, Alert, Fade, Grow
} from '@mui/material';
import {
  TrendingUp as GrowthIcon,
  TrendingDown as DeclineIcon,
  LocalShipping as DeliveryIcon,
  Inventory as InventoryIcon,
  People as CustomersIcon,
  AttachMoney as RevenueIcon,
  Notifications as NotificationsIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  Schedule as ScheduleIcon,
  Assessment as AnalyticsIcon,
  Security as SecurityIcon,
  Assignment as TaskIcon,
  Speed as PerformanceIcon,
  Timeline as TimelineIcon,
  Refresh as RefreshIcon,
  Fullscreen as FullscreenIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
  BarElement
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement,
  BarElement
);

export default function EnhancedDashboard() {
  const { user, organization } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [quickActions, setQuickActions] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState({});
  const [chartData, setChartData] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState(null);

  // Load dashboard data
  useEffect(() => {
    if (organization?.id) {
      loadDashboardData();
      loadNotifications();
      loadQuickActions();
      loadPerformanceMetrics();
      loadChartData();
    }
  }, [organization?.id]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Parallel data loading for better performance
      const [
        bottlesResult,
        customersResult,
        rentalsResult,
        recentScansResult,
        reconciliationsResult,
        invoicesResult
      ] = await Promise.allSettled([
        supabase.from('bottles').select('id, status, product_type').eq('organization_id', organization.id),
        supabase.from('customers').select('id, name, created_at').eq('organization_id', organization.id),
        supabase.from('rentals').select('id, rental_amount, status, rental_type').eq('organization_id', organization.id),
        supabase.from('scans').select('id, created_at').eq('organization_id', organization.id).order('created_at', { ascending: false }).limit(100),
        supabase.from('truck_reconciliations').select('id, status, discrepancy_cost').eq('organization_id', organization.id),
        supabase.from('invoices').select('id, total_amount, status, created_at').eq('organization_id', organization.id)
      ]);

      // Process results
      const bottles = bottlesResult.status === 'fulfilled' ? bottlesResult.value.data || [] : [];
      const customers = customersResult.status === 'fulfilled' ? customersResult.value.data || [] : [];
      const rentals = rentalsResult.status === 'fulfilled' ? rentalsResult.value.data || [] : [];
      const recentScans = recentScansResult.status === 'fulfilled' ? recentScansResult.value.data || [] : [];
      const reconciliations = reconciliationsResult.status === 'fulfilled' ? reconciliationsResult.value.data || [] : [];
      const invoices = invoicesResult.status === 'fulfilled' ? invoicesResult.value.data || [] : [];

      // Calculate metrics
      const totalRevenue = rentals.reduce((sum, rental) => sum + (parseFloat(rental.rental_amount) || 0), 0);
      const monthlyRevenue = invoices
        .filter(inv => new Date(inv.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        .reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);

      const activeRentals = rentals.filter(r => r.status === 'active').length;
      const availableBottles = bottles.filter(b => b.status === 'available').length;
      const rentedBottles = bottles.filter(b => b.status === 'rented').length;

      // Recent activity (last 7 days)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentActivity = recentScans.filter(scan => new Date(scan.created_at) > weekAgo).length;

      // Growth calculations
      const lastMonthCustomers = customers.filter(c => 
        new Date(c.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ).length;

      setDashboardData({
        totalBottles: bottles.length,
        availableBottles,
        rentedBottles,
        totalCustomers: customers.length,
        activeRentals,
        totalRevenue,
        monthlyRevenue,
        recentActivity,
        lastMonthCustomers,
        reconciliationAccuracy: reconciliations.length > 0 
          ? ((reconciliations.filter(r => r.status === 'completed').length / reconciliations.length) * 100).toFixed(1)
          : 100,
        totalDiscrepancyCost: reconciliations.reduce((sum, r) => sum + (parseFloat(r.discrepancy_cost) || 0), 0)
      });

    } catch (error) {
      logger.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      // Mock notifications - in real app, these would come from your notifications system
      const mockNotifications = [
        {
          id: 1,
          type: 'warning',
          title: 'Overdue Rentals',
          message: `${Math.floor(Math.random() * 5) + 1} rentals are overdue and need attention`,
          time: '2 hours ago',
          priority: 'high'
        },
        {
          id: 2,
          type: 'success',
          title: 'Reconciliation Complete',
          message: 'Truck #TRK-001 reconciliation completed with 100% accuracy',
          time: '4 hours ago',
          priority: 'medium'
        },
        {
          id: 3,
          type: 'info',
          title: 'New Customer',
          message: 'ABC Manufacturing has been added to your customer list',
          time: '1 day ago',
          priority: 'low'
        },
        {
          id: 4,
          type: 'warning',
          title: 'Low Inventory',
          message: 'Propane 20lb cylinders are running low (< 10 available)',
          time: '2 days ago',
          priority: 'medium'
        }
      ];

      setNotifications(mockNotifications);
    } catch (error) {
      logger.error('Error loading notifications:', error);
    }
  };

  const loadQuickActions = async () => {
    const actions = [
      {
        id: 1,
        title: 'Add New Customer',
        description: 'Register a new customer',
        icon: <CustomersIcon />,
        color: '#2563eb',
        path: '/customers',
        count: null
      },
      {
        id: 2,
        title: 'Scan Cylinders',
        description: 'Quick cylinder scanning',
        icon: <InventoryIcon />,
        color: '#10B981',
        path: '/scan-cylinders',
        count: dashboardData.availableBottles
      },
      {
        id: 3,
        title: 'Create Invoice',
        description: 'Generate new invoice',
        icon: <RevenueIcon />,
        color: '#F59E0B',
        path: '/automated-billing',
        count: null
      },
      {
        id: 4,
        title: 'Schedule Delivery',
        description: 'Plan delivery routes',
        icon: <DeliveryIcon />,
        color: '#8B5CF6',
        path: '/truck-reconciliation-dashboard',
        count: null
      },
      {
        id: 5,
        title: 'View Reports',
        description: 'Analytics and insights',
        icon: <AnalyticsIcon />,
        color: '#EF4444',
        path: '/organization-analytics',
        count: null
      },
      {
        id: 6,
        title: 'Manage Users',
        description: 'User permissions',
        icon: <SecurityIcon />,
        color: '#6366F1',
        path: '/role-management',
        count: null
      }
    ];

    setQuickActions(actions);
  };

  const loadPerformanceMetrics = async () => {
    // Mock performance data - replace with real calculations
    setPerformanceMetrics({
      systemHealth: 98.5,
      userSatisfaction: 94.2,
      dataAccuracy: 99.1,
      responseTime: 245, // ms
      uptime: 99.9,
      securityScore: 96.8
    });
  };

  const loadChartData = async () => {
    // Revenue trend data
    const revenueData = {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [
        {
          label: 'Monthly Revenue',
          data: [12000, 15000, 13500, 18000, 16500, 22000],
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    };

    // Cylinder status distribution
    const cylinderData = {
      labels: ['Available', 'Rented', 'Maintenance', 'In Transit'],
      datasets: [
        {
          data: [
            dashboardData.availableBottles || 45,
            dashboardData.rentedBottles || 35,
            8,
            12
          ],
          backgroundColor: ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
          borderWidth: 0
        }
      ]
    };

    // Activity data
    const activityData = {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [
        {
          label: 'Scans',
          data: [45, 52, 38, 67, 73, 28, 15],
          backgroundColor: '#2563eb'
        },
        {
          label: 'Deliveries',
          data: [12, 18, 15, 22, 19, 8, 3],
          backgroundColor: '#10B981'
        }
      ]
    };

    setChartData({ revenueData, cylinderData, activityData });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadDashboardData(),
      loadNotifications(),
      loadPerformanceMetrics(),
      loadChartData()
    ]);
    setRefreshing(false);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'warning': return <WarningIcon sx={{ color: '#F59E0B' }} />;
      case 'success': return <SuccessIcon sx={{ color: '#10B981' }} />;
      case 'error': return <WarningIcon sx={{ color: '#EF4444' }} />;
      default: return <NotificationsIcon sx={{ color: '#2563eb' }} />;
    }
  };

  const MetricCard = ({ title, value, change, icon, color, subtitle, onClick }) => (
    <Grow in={!loading} timeout={500}>
      <Card 
        sx={{ 
          height: '100%', 
          cursor: onClick ? 'pointer' : 'default',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': onClick ? { 
            transform: 'translateY(-2px)', 
            boxShadow: 4 
          } : {}
        }}
        onClick={onClick}
      >
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Avatar sx={{ bgcolor: color, width: 48, height: 48 }}>
              {icon}
            </Avatar>
            {change && (
              <Chip
                size="small"
                icon={change > 0 ? <GrowthIcon /> : <DeclineIcon />}
                label={`${change > 0 ? '+' : ''}${change}%`}
                color={change > 0 ? 'success' : 'error'}
                variant="outlined"
              />
            )}
          </Box>
          
          <Typography variant="h4" component="h2" fontWeight="bold" mb={1}>
            {value}
          </Typography>
          
          <Typography color="text.primary" variant="h6" mb={0.5}>
            {title}
          </Typography>
          
          {subtitle && (
            <Typography color="text.secondary" variant="body2">
              {subtitle}
            </Typography>
          )}
        </CardContent>
      </Card>
    </Grow>
  );

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <Box textAlign="center">
            <LinearProgress sx={{ width: 300, mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Loading dashboard...
            </Typography>
          </Box>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h3" component="h1" fontWeight="bold" gutterBottom>
            Welcome back, {user?.user_metadata?.full_name || 'User'}! 👋
          </Typography>
          <Typography variant="h6" color="text.secondary">
            {organization?.name} • {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Typography>
        </Box>
        
        <Box display="flex" gap={1}>
          <Tooltip title="Refresh Data">
            <IconButton 
              onClick={handleRefresh} 
              disabled={refreshing}
              sx={{ 
                animation: refreshing ? 'spin 1s linear infinite' : 'none',
                '@keyframes spin': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' }
                }
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Dashboard Settings">
            <IconButton>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Cylinders"
            value={dashboardData.totalBottles?.toLocaleString() || '0'}
            change={8.2}
            icon={<InventoryIcon />}
            color="#2563eb"
            subtitle={`${dashboardData.availableBottles || 0} available`}
            onClick={() => setSelectedMetric('cylinders')}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Active Customers"
            value={dashboardData.totalCustomers?.toLocaleString() || '0'}
            change={12.5}
            icon={<CustomersIcon />}
            color="#10B981"
            subtitle={`${dashboardData.lastMonthCustomers || 0} new this month`}
            onClick={() => setSelectedMetric('customers')}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Monthly Revenue"
            value={`$${(dashboardData.monthlyRevenue || 0).toLocaleString()}`}
            change={15.3}
            icon={<RevenueIcon />}
            color="#F59E0B"
            subtitle="This month"
            onClick={() => setSelectedMetric('revenue')}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Active Rentals"
            value={dashboardData.activeRentals?.toLocaleString() || '0'}
            change={-2.1}
            icon={<ScheduleIcon />}
            color="#8B5CF6"
            subtitle="Currently rented"
            onClick={() => setSelectedMetric('rentals')}
          />
        </Grid>
      </Grid>

      {/* Performance Metrics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                <PerformanceIcon color="primary" />
                System Performance
              </Typography>
              
              <Box mt={2}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">System Health</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {performanceMetrics.systemHealth}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={performanceMetrics.systemHealth} 
                  sx={{ mb: 2, height: 8, borderRadius: 4 }}
                />
                
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Data Accuracy</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {performanceMetrics.dataAccuracy}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={performanceMetrics.dataAccuracy} 
                  color="success"
                  sx={{ mb: 2, height: 8, borderRadius: 4 }}
                />
                
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Security Score</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {performanceMetrics.securityScore}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={performanceMetrics.securityScore} 
                  color="warning"
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                <TimelineIcon color="primary" />
                Revenue Trend (Last 6 Months)
              </Typography>
              {chartData.revenueData && (
                <Box height={200}>
                  <Line 
                    data={chartData.revenueData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            callback: function(value) {
                              return '$' + value.toLocaleString();
                            }
                          }
                        }
                      }
                    }}
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts and Analytics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Cylinder Status Distribution
              </Typography>
              {chartData.cylinderData && (
                <Box height={250} display="flex" justifyContent="center">
                  <Doughnut 
                    data={chartData.cylinderData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom'
                        }
                      }
                    }}
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Weekly Activity
              </Typography>
              {chartData.activityData && (
                <Box height={250}>
                  <Bar 
                    data={chartData.activityData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top'
                        }
                      }
                    }}
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                <TaskIcon color="primary" />
                Quick Actions
              </Typography>
              
              <Grid container spacing={2} mt={1}>
                {quickActions.map((action, index) => (
                  <Grid item xs={12} sm={6} md={4} lg={2} key={action.id}>
                    <Fade in={!loading} timeout={500 + index * 100}>
                      <Card 
                        variant="outlined" 
                        sx={{ 
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: 2,
                            borderColor: action.color
                          }
                        }}
                      >
                        <CardContent sx={{ textAlign: 'center', p: 2 }}>
                          <Avatar 
                            sx={{ 
                              bgcolor: action.color, 
                              width: 40, 
                              height: 40, 
                              mx: 'auto', 
                              mb: 1 
                            }}
                          >
                            {action.icon}
                          </Avatar>
                          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                            {action.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                            {action.description}
                          </Typography>
                          {action.count !== null && (
                            <Chip 
                              label={action.count} 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                            />
                          )}
                        </CardContent>
                      </Card>
                    </Fade>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Notifications */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                <NotificationsIcon color="primary" />
                Recent Notifications
              </Typography>
              
              {notifications.map((notification, index) => (
                <Fade in={!loading} timeout={600 + index * 100} key={notification.id}>
                  <Alert 
                    severity={notification.type}
                    icon={getNotificationIcon(notification.type)}
                    sx={{ mb: 1, '&:last-child': { mb: 0 } }}
                    action={
                      <Typography variant="caption" color="text.secondary">
                        {notification.time}
                      </Typography>
                    }
                  >
                    <Typography variant="subtitle2" fontWeight="bold">
                      {notification.title}
                    </Typography>
                    <Typography variant="body2">
                      {notification.message}
                    </Typography>
                  </Alert>
                </Fade>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Metric Detail Dialog */}
      <Dialog 
        open={selectedMetric !== null} 
        onClose={() => setSelectedMetric(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedMetric === 'cylinders' && 'Cylinder Details'}
          {selectedMetric === 'customers' && 'Customer Details'}
          {selectedMetric === 'revenue' && 'Revenue Details'}
          {selectedMetric === 'rentals' && 'Rental Details'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            Detailed analytics and breakdown for {selectedMetric} would be displayed here.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedMetric(null)}>Close</Button>
          <Button variant="contained">View Full Report</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
