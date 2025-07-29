import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../context/PermissionsContext';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  Box, Grid, Card, CardContent, Typography, Button, Chip, 
  LinearProgress, Alert, IconButton, Tooltip, Divider,
  List, ListItem, ListItemText, ListItemIcon, Avatar,
  Paper, Stack
} from '@mui/material';
import {
  People, Inventory, LocalShipping, Receipt, Analytics,
  AdminPanelSettings, Settings, TrendingUp, Warning,
  CheckCircle, Schedule, Notifications, Add as AddIcon,
  Edit as EditIcon, Refresh as RefreshIcon, Dashboard as DashboardIcon,
  Work as WorkIcon, Security as SecurityIcon
} from '@mui/icons-material';
import { useTheme } from '../context/ThemeContext';

export default function Home() {
  const { profile, organization } = useAuth();
  const { can, isAdmin, isManager, isUser } = usePermissions();
  const { getTheme } = useTheme();
  const navigate = useNavigate();
  
  // Get the current theme colors
  const currentTheme = getTheme().palette;
  
  const [stats, setStats] = useState({
    customers: 0,
    cylinders: 0,
    activeRentals: 0,
    pendingDeliveries: 0,
    overdueInvoices: 0,
    totalUsers: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    if (profile && organization) {
      fetchDashboardData();
    }
  }, [profile, organization]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Core statistics - available to all users
      const [customersRes, cylindersRes, rentalsRes, deliveriesRes] = await Promise.all([
        supabase.from('customers').select('id', { count: 'exact' }).eq('organization_id', organization.id),
        supabase.from('bottles').select('id', { count: 'exact' }).eq('organization_id', organization.id),
        supabase.from('rentals').select('id', { count: 'exact' }).eq('organization_id', organization.id).eq('status', 'active'),
        supabase.from('deliveries').select('id', { count: 'exact' }).eq('organization_id', organization.id).eq('status', 'pending')
      ]);

      const newStats = {
        customers: customersRes.count || 0,
        cylinders: cylindersRes.count || 0,
        activeRentals: rentalsRes.count || 0,
        pendingDeliveries: deliveriesRes.count || 0,
        overdueInvoices: 0,
        totalUsers: 0,
        recentActivity: []
      };

      // Admin-only statistics
      if (isAdmin()) {
        const [invoicesRes, usersRes] = await Promise.all([
          supabase.from('invoices').select('id', { count: 'exact' }).eq('organization_id', organization.id).eq('status', 'overdue'),
          supabase.from('profiles').select('id', { count: 'exact' }).eq('organization_id', organization.id)
        ]);
        
        newStats.overdueInvoices = invoicesRes.count || 0;
        newStats.totalUsers = usersRes.count || 0;
      }

      // Recent activity for all users
      try {
        const activityRes = await supabase
          .from('audit_logs')
          .select('action, table_name, created_at, user_id, profiles(full_name)')
          .eq('organization_id', organization.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (activityRes.data) {
          setRecentActivity(activityRes.data);
        }
      } catch (error) {
        console.log('Audit logs not available yet:', error);
        setRecentActivity([]);
      }

      setStats(newStats);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getQuickActions = () => {
    if (isAdmin()) {
      return [
        { title: 'Add New Customer', path: '/customers', icon: <AddIcon />, color: 'primary' },
        { title: 'User Management', path: '/user-management', icon: <AdminPanelSettings />, color: 'secondary' },
        { title: 'View Analytics', path: '/analytics', icon: <Analytics />, color: 'info' },
        { title: 'Organization Settings', path: '/settings', icon: <Settings />, color: 'warning' },
        { title: 'Billing Management', path: '/billing', icon: <Receipt />, color: 'success' },
        { title: 'Organization Tools', path: '/organization-tools', icon: <SecurityIcon />, color: 'error' }
      ];
    } else if (isManager()) {
      return [
        { title: 'Add New Customer', path: '/customers', icon: <AddIcon />, color: 'primary' },
        { title: 'Manage Deliveries', path: '/deliveries', icon: <LocalShipping />, color: 'secondary' },
        { title: 'View Reports', path: '/reports', icon: <Analytics />, color: 'info' },
        { title: 'Truck Reconciliation', path: '/truck-reconciliation', icon: <CheckCircle />, color: 'success' },
        { title: 'Route Optimization', path: '/route-optimization', icon: <TrendingUp />, color: 'warning' },
        { title: 'Workflow Automation', path: '/workflow-automation', icon: <WorkIcon />, color: 'error' }
      ];
    } else {
      return [
        { title: 'View Customers', path: '/customers', icon: <People />, color: 'primary' },
        { title: 'Check Inventory', path: '/inventory', icon: <Inventory />, color: 'secondary' },
        { title: 'View Deliveries', path: '/deliveries', icon: <LocalShipping />, color: 'info' },
        { title: 'View Rentals', path: '/rentals', icon: <Schedule />, color: 'success' },
        { title: 'View Invoices', path: '/invoices', icon: <Receipt />, color: 'warning' },
        { title: 'Customer Portal', path: '/customer-portal', icon: <DashboardIcon />, color: 'error' }
      ];
    }
  };

  const getWelcomeMessage = () => {
    if (isAdmin()) {
      return {
        title: `Welcome back, ${profile?.full_name || 'Administrator'}!`,
        subtitle: 'You have full administrative access to manage your organization.',
        chip: { label: 'Administrator', color: 'primary' }
      };
    } else if (isManager()) {
      return {
        title: `Welcome back, ${profile?.full_name || 'Manager'}!`,
        subtitle: 'Manage your team\'s operations and advanced features.',
        chip: { label: 'Manager', color: 'secondary' }
      };
    } else {
      return {
        title: `Welcome back, ${profile?.full_name || 'User'}!`,
        subtitle: 'Access your daily operations and customer information.',
        chip: { label: 'Team Member', color: 'default' }
      };
    }
  };

  const getStatCards = () => {
    const baseCards = [
      { title: 'Customers', value: stats.customers, icon: <People />, color: currentTheme.primary.main },
      { title: 'Cylinders', value: stats.cylinders, icon: <Inventory />, color: currentTheme.secondary.main },
      { title: 'Active Rentals', value: stats.activeRentals, icon: <Schedule />, color: currentTheme.success.main },
      { title: 'Pending Deliveries', value: stats.pendingDeliveries, icon: <LocalShipping />, color: currentTheme.warning.main }
    ];

    if (isAdmin()) {
      baseCards.push(
        { title: 'Overdue Invoices', value: stats.overdueInvoices, icon: <Warning />, color: currentTheme.error.main },
        { title: 'Total Users', value: stats.totalUsers, icon: <AdminPanelSettings />, color: currentTheme.info.main }
      );
    }

    return baseCards;
  };

  const welcomeMessage = getWelcomeMessage();
  const quickActions = getQuickActions();
  const statCards = getStatCards();

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>Loading dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Welcome Section */}
      <Paper sx={{ p: 3, mb: 3, background: `linear-gradient(135deg, ${currentTheme.primary.main} 0%, ${currentTheme.secondary.main} 100%)`, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
              {welcomeMessage.title}
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9, mb: 2 }}>
              {welcomeMessage.subtitle}
            </Typography>
            <Chip 
              label={welcomeMessage.chip.label} 
              sx={{ 
                backgroundColor: 'rgba(255,255,255,0.2)', 
                color: 'white',
                fontWeight: 'bold'
              }} 
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Refresh Dashboard">
              <IconButton onClick={fetchDashboardData} sx={{ color: 'white' }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {statCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={index}>
            <Card sx={{ 
              height: '100%', 
              background: `linear-gradient(135deg, ${card.color} 0%, ${card.color}CC 100%)`,
              color: 'white',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-4px)' }
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                      {card.value}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      {card.title}
                    </Typography>
                  </Box>
                  <Box sx={{ opacity: 0.8 }}>
                    {card.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Quick Actions */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <WorkIcon color="primary" />
                Quick Actions
              </Typography>
              <Grid container spacing={2}>
                {quickActions.map((action, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Button
                      fullWidth
                      variant="outlined"
                      color={action.color}
                      startIcon={action.icon}
                      onClick={() => navigate(action.path)}
                      sx={{ 
                        py: 1.5, 
                        justifyContent: 'flex-start',
                        transition: 'all 0.2s',
                        '&:hover': { 
                          transform: 'translateY(-2px)',
                          boxShadow: 2
                        }
                      }}
                    >
                      {action.title}
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Notifications color="primary" />
                Recent Activity
              </Typography>
              {recentActivity.length > 0 ? (
                <List dense>
                  {recentActivity.map((activity, index) => (
                    <ListItem key={index} sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                          {activity.profiles?.full_name?.charAt(0) || '?'}
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={`${activity.action} ${activity.table_name}`}
                        secondary={`${activity.profiles?.full_name || 'Unknown'} • ${new Date(activity.created_at).toLocaleDateString()}`}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No recent activity to display.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Admin-only alerts */}
      {isAdmin() && stats.overdueInvoices > 0 && (
        <Alert 
          severity="warning" 
          sx={{ mt: 3 }}
          action={
            <Button color="inherit" size="small" onClick={() => navigate('/invoices')}>
              View Invoices
            </Button>
          }
        >
          You have {stats.overdueInvoices} overdue invoice{stats.overdueInvoices !== 1 ? 's' : ''} requiring attention.
        </Alert>
      )}
    </Box>
  );
} 