import logger from '../utils/logger';
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
import { Touch3D, Card3D, MobileCard, MobileButton, MobileGrid, MobileStack, MobileTypography } from '../components/design-system';

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
      const [customersRes, cylindersRes, deliveriesRes] = await Promise.all([
        supabase.from('customers').select('id', { count: 'exact' }).eq('organization_id', organization.id),
        supabase.from('bottles').select('id', { count: 'exact' }).eq('organization_id', organization.id),
        supabase.from('deliveries').select('id', { count: 'exact' }).eq('organization_id', organization.id).eq('status', 'pending')
      ]);

      // Get active rentals count (matching rental page logic - excluding vendors)
      let activeRentalsCount = 0;
      
      try {
        // 1. Get all active rentals (use select('*') like rental page)
        const { data: activeRentalsData, error: rentalsQueryError } = await supabase
          .from('rentals')
          .select('*')
          .is('rental_end_date', null);
        
        if (rentalsQueryError) {
          logger.error('Error fetching active rentals:', rentalsQueryError);
          // Fallback: use simple count query
          const { count } = await supabase
            .from('rentals')
            .select('*', { count: 'exact', head: true })
            .is('rental_end_date', null)
            .eq('organization_id', organization.id);
          activeRentalsCount = count || 0;
        } else {
          // 2. Get all bottles for this organization (matching rental page exactly)
          const { data: allBottles, error: allBottlesError } = await supabase
            .from('bottles')
            .select('*')
            .eq('organization_id', organization.id);
          
          // 2b. Get assigned bottles (matching rental page)
          const { data: assignedBottles, error: assignedBottlesError } = await supabase
            .from('bottles')
            .select('*')
            .eq('organization_id', organization.id)
            .not('assigned_customer', 'is', null);
          
          if (allBottlesError || assignedBottlesError) {
            logger.error('Error fetching bottles:', allBottlesError || assignedBottlesError);
            activeRentalsCount = 0;
          } else {
            // Create bottles map (matching rental page)
            const bottlesMap = (allBottles || []).reduce((map, bottle) => {
              map[bottle.barcode_number || bottle.barcode] = bottle;
              return map;
            }, {});

            // 3. Combine rentals with bottles (matching rental page logic exactly)
            const allRentalData = [];
            
            // Add rentals that have matching bottles in this organization
            for (const rental of activeRentalsData || []) {
              const bottle = bottlesMap[rental.bottle_barcode];
              if (bottle) {
                allRentalData.push({
                  ...rental,
                  source: 'rental',
                  bottles: bottle
                });
              }
            }

            // Add bottles that are assigned but don't have rental records
            const existingBottleBarcodes = new Set(allRentalData.map(r => r.bottle_barcode));
            
            for (const bottle of assignedBottles || []) {
              const barcode = bottle.barcode_number || bottle.barcode;
              if (barcode && !existingBottleBarcodes.has(barcode)) {
                allRentalData.push({
                  id: `bottle_${bottle.id}`,
                  source: 'bottle_assignment',
                  customer_id: bottle.assigned_customer,
                  bottle_barcode: barcode,
                  bottles: bottle,
                  rental_end_date: null
                });
              }
            }

            // Remove duplicates (keep rental records over bottle assignments)
            const deduplicatedData = [];
            const seenBarcodes = new Set();
            
            // First pass: Add all rental records (priority)
            for (const item of allRentalData) {
              if (item.source === 'rental' && !seenBarcodes.has(item.bottle_barcode)) {
                deduplicatedData.push(item);
                seenBarcodes.add(item.bottle_barcode);
              }
            }
            
            // Second pass: Add bottle assignments only if no rental record exists
            for (const item of allRentalData) {
              if (item.source === 'bottle_assignment' && !seenBarcodes.has(item.bottle_barcode)) {
                deduplicatedData.push(item);
                seenBarcodes.add(item.bottle_barcode);
              }
            }

            // 4. Get customer IDs and fetch customer types
            const customerIds = Array.from(new Set(
              deduplicatedData.map(r => r.customer_id).filter(Boolean)
            ));

            let customersMap = {};
            if (customerIds.length > 0) {
              const { data: customersData } = await supabase
                .from('customers')
                .select('CustomerListID, customer_type')
                .eq('organization_id', organization.id)
                .in('CustomerListID', customerIds);
              
              if (customersData) {
                customersMap = customersData.reduce((map, c) => {
                  map[c.CustomerListID] = c;
                  return map;
                }, {});
              }
            }

            // 5. Attach customer info and filter out vendors (matching rental page exactly)
            const rentalsWithCustomer = deduplicatedData.map(r => ({
              ...r,
              customer: customersMap[r.customer_id] || null
            }));

            // Filter out vendors (matching rental page logic exactly)
            const filteredRentals = rentalsWithCustomer.filter(r => 
              r.customer_id && 
              r.customer &&
              r.customer.customer_type !== 'VENDOR'  // Exclude vendors from rentals view
            );

            // Count rentals (excluding vendors) - this matches rental page's rentedToCustomers count
            activeRentalsCount = filteredRentals.length;

            logger.log('Dashboard active rentals count:', {
              allRentalData: allRentalData.length,
              deduplicatedData: deduplicatedData.length,
              filteredRentals: filteredRentals.length,
              total: activeRentalsCount
            });
          }
        }
      } catch (error) {
        logger.error('Error calculating active rentals:', error);
        activeRentalsCount = 0;
      }

      const newStats = {
        customers: customersRes.count || 0,
        cylinders: cylindersRes.count || 0,
        activeRentals: activeRentalsCount,
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
        logger.log('Audit logs not available yet:', error);
        setRecentActivity([]);
      }

      setStats(newStats);
    } catch (error) {
      logger.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getQuickActions = () => {
    if (isAdmin()) {
      return [
        { title: 'Add New Customer', path: '/customers', icon: <AddIcon />, color: 'primary' },
        { title: 'User Management', path: '/settings?tab=team', icon: <AdminPanelSettings />, color: 'secondary' },
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
      { 
        title: 'Customers', 
        value: stats.customers, 
        icon: <People />, 
        color: currentTheme.primary.main,
        onClick: () => {
          logger.log('🔄 Navigating to /customers');
          navigate('/customers');
        }
      },
      { 
        title: 'Cylinders', 
        value: stats.cylinders, 
        icon: <Inventory />, 
        color: currentTheme.secondary.main,
        onClick: () => {
          logger.log('🔄 Navigating to /inventory');
          navigate('/inventory');
        }
      },
      { 
        title: 'Active Rentals', 
        value: stats.activeRentals, 
        icon: <Schedule />, 
        color: currentTheme.success.main,
        onClick: () => {
          logger.log('🔄 Navigating to /rentals');
          navigate('/rentals');
        }
      },
      { 
        title: 'Pending Deliveries', 
        value: stats.pendingDeliveries, 
        icon: <LocalShipping />, 
        color: currentTheme.warning.main,
        onClick: () => {
          logger.log('🔄 Navigating to /deliveries');
          navigate('/deliveries');
        }
      }
    ];

    if (isAdmin()) {
      baseCards.push(
        { 
          title: 'Overdue Invoices', 
          value: stats.overdueInvoices, 
          icon: <Warning />, 
          color: currentTheme.error.main,
          onClick: () => {
            logger.log('🔄 Navigating to /billing (invoices not available)');
            navigate('/billing');
          }
        },
        { 
          title: 'Total Users', 
          value: stats.totalUsers, 
          icon: <AdminPanelSettings />, 
          color: currentTheme.info.main,
          onClick: () => {
            logger.log('🔄 Navigating to Settings Team tab');
            navigate('/settings?tab=team');
          }
        }
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
            <Touch3D intensity="medium">
              <Card 
                onClick={card.onClick}
                sx={{ 
                  height: '100%', 
                  background: `linear-gradient(135deg, ${card.color} 0%, ${card.color}CC 100%)`,
                  color: 'white',
                  cursor: 'pointer',
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
            </Touch3D>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Quick Actions */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%', p: 3 }}>
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
                    onClick={(e) => {
                      e.stopPropagation();
                      logger.log('Quick action clicked:', action.title, action.path);
                      navigate(action.path);
                    }}
                    sx={{ 
                      justifyContent: 'flex-start',
                      minHeight: 48,
                      py: 1.5,
                      transition: 'all 0.2s ease-in-out',
                      position: 'relative',
                      zIndex: 10,
                      pointerEvents: 'auto',
                      cursor: 'pointer',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 2,
                      },
                    }}
                  >
                    {action.title}
                  </Button>
                </Grid>
              ))}
            </Grid>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={4}>
          <Card3D intensity="light" sx={{ height: '100%' }}>
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
          </Card3D>
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