import logger from '../utils/logger';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../context/PermissionsContext';
import { useTheme } from '../context/ThemeContext';
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
  CheckCircle, Schedule, Notifications as NotificationsIcon, Add as AddIcon,
  Edit as EditIcon, Refresh as RefreshIcon, Dashboard as DashboardIcon,
  Work as WorkIcon, Security as SecurityIcon
} from '@mui/icons-material';

export default function Home() {
  const { profile, organization } = useAuth();
  const { can, isAdmin, isManager, isUser } = usePermissions();
  const { organizationColors } = useTheme();
  const primaryColor = organizationColors?.primary || '#40B5AD';
  const navigate = useNavigate();
  
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
      const [customersRes, cylindersRes] = await Promise.all([
        supabase.from('customers').select('id', { count: 'exact' }).eq('organization_id', organization.id),
        supabase.from('bottles').select('id', { count: 'exact' }).eq('organization_id', organization.id)
      ]);

      // Get active rentals count - count bottles with status "rented" assigned to customers
      // This matches the logic used in Rentals.jsx
      let activeRentalsCount = 0;
      
      try {
        // First, try to count from rentals table (actual rental records)
        const { data: activeRentalsData, error: rentalsQueryError } = await supabase
          .from('rentals')
          .select('*')
          .is('rental_end_date', null)
          .eq('organization_id', organization.id);
        
        if (!rentalsQueryError && activeRentalsData && activeRentalsData.length > 0) {
          // Get all bottles to verify they exist and get customer types
          const { data: allBottles, error: allBottlesError } = await supabase
            .from('bottles')
            .select('barcode_number, assigned_customer, status, ownership')
            .eq('organization_id', organization.id);
          
          if (!allBottlesError && allBottles) {
            // Create bottles map for quick lookup
            const bottlesMap = (allBottles || []).reduce((map, bottle) => {
              const barcode = bottle.barcode_number || bottle.barcode;
              if (barcode) {
                map[barcode] = bottle;
              }
              return map;
            }, {});

            // Filter rentals to only include those with matching bottles in this organization
            const validRentals = (activeRentalsData || []).filter(rental => {
              const bottle = bottlesMap[rental.bottle_barcode];
              return bottle !== undefined;
            });

            // Get customer IDs and fetch customer types to exclude vendors
            const customerIds = Array.from(new Set(
              validRentals.map(r => r.customer_id).filter(Boolean)
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

            // Filter out vendors - only count actual customer rentals
            const customerRentals = validRentals.filter(r => {
              const customer = customersMap[r.customer_id];
              return r.customer_id && customer && customer.customer_type !== 'VENDOR';
            });

            activeRentalsCount = customerRentals.length;
          } else {
            // Fallback: count all active rentals if bottle lookup fails
            activeRentalsCount = (activeRentalsData || []).length;
          }
        } else {
          // No rental records found, count bottles with status "rented" assigned to customers
          // This matches Rentals.jsx logic
          const { data: assignedBottles, error: bottlesError } = await supabase
            .from('bottles')
            .select('assigned_customer, status, ownership')
            .eq('organization_id', organization.id)
            .not('assigned_customer', 'is', null)
            .in('status', ['rented', 'RENTED']);
          
          if (!bottlesError && assignedBottles && assignedBottles.length > 0) {
            // Get customer types to exclude vendors and customer-owned bottles
            const customerIds = Array.from(new Set(
              assignedBottles.map(b => b.assigned_customer).filter(Boolean)
            ));
            
            let customerTypesMap = {};
            if (customerIds.length > 0) {
              const { data: customersData } = await supabase
                .from('customers')
                .select('CustomerListID, customer_type')
                .eq('organization_id', organization.id)
                .in('CustomerListID', customerIds);
              
              if (customersData) {
                customerTypesMap = customersData.reduce((map, c) => {
                  map[c.CustomerListID] = c.customer_type || 'CUSTOMER';
                  return map;
                }, {});
              }
            }
            
            // Count rented bottles: assigned to customers with status "rented" (excluding vendors and customer-owned)
            activeRentalsCount = assignedBottles.filter(bottle => {
              const customerType = customerTypesMap[bottle.assigned_customer] || 'CUSTOMER';
              const ownershipValue = String(bottle.ownership || '').trim().toLowerCase();
              const isCustomerOwned = ownershipValue.includes('customer') || 
                                     ownershipValue.includes('owned') || 
                                     ownershipValue === 'customer owned';
              
              return bottle.assigned_customer && 
                     customerType === 'CUSTOMER' && 
                     (bottle.status === 'rented' || bottle.status === 'RENTED') &&
                     !isCustomerOwned;
            }).length;
          }
        }
        
        logger.log('Dashboard active rentals count:', {
          activeRentalsCount: activeRentalsCount
        });
      } catch (error) {
        logger.error('Error calculating active rentals:', error);
        activeRentalsCount = 0;
      }

      const newStats = {
        customers: customersRes.count || 0,
        cylinders: cylindersRes.count || 0,
        activeRentals: activeRentalsCount,
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

      // Recent activity: merge audit_logs, bottle_scans (movement), and rentals; sort by date; show full barcodes
      const activityItems = [];
      const addItem = (item) => {
        if (item && item.created_at) activityItems.push(item);
      };
      // 1) audit_logs
      try {
        const activityRes = await supabase
          .from('audit_logs')
          .select('action, table_name, created_at, user_id, profiles(full_name), details')
          .eq('organization_id', organization.id)
          .order('created_at', { ascending: false })
          .limit(5);
        if (activityRes.data && activityRes.data.length > 0) {
          activityRes.data.forEach(log => addItem({
            action: log.action || 'Action',
            table_name: log.table_name || (log.details?.table || 'System'),
            created_at: log.created_at,
            profiles: log.profiles || { full_name: 'System' }
          }));
        }
      } catch (_) { /* table may not exist */ }
      // 2) bottle_scans (bottle movement: SHIP, RETURN, Order scans)
      try {
        const { data: scans } = await supabase.from('bottle_scans').select('created_at, timestamp, order_number, bottle_barcode, customer_name, action, mode').eq('organization_id', organization.id).order('created_at', { ascending: false }).limit(10);
        if (scans && scans.length > 0) {
          scans.forEach(s => {
            const at = s.created_at || s.timestamp;
            const movement = (s.mode || s.action || 'Scan').toUpperCase();
            const barcode = s.bottle_barcode ? String(s.bottle_barcode).trim() : '';
            const detail = s.order_number ? `Order ${s.order_number}` : (s.customer_name || (barcode || 'Cylinder'));
            addItem({
              action: movement,
              table_name: barcode ? `${detail} • ${barcode}` : detail,
              created_at: at,
              profiles: { full_name: 'Movement' }
            });
          });
        }
      } catch (_) { /* column may differ */ }
      // 3) recent rentals (full barcode)
      try {
        const { data: rentals } = await supabase.from('rentals').select('created_at, bottle_barcode').eq('organization_id', organization.id).order('created_at', { ascending: false }).limit(10);
        if (rentals && rentals.length > 0) {
          rentals.forEach(r => addItem({
            action: 'Rental',
            table_name: r.bottle_barcode ? String(r.bottle_barcode).trim() : '—',
            created_at: r.created_at,
            profiles: { full_name: 'Rental' }
          }));
        }
      } catch (_) { /* ignore */ }
      // 4) If still empty: deliveries
      if (activityItems.length === 0) {
        try {
          const deliveriesRes = await supabase.from('deliveries').select('id, status, delivery_date, created_at').eq('organization_id', organization.id).order('created_at', { ascending: false }).limit(5);
          if (deliveriesRes.data && deliveriesRes.data.length > 0) {
            deliveriesRes.data.forEach(d => addItem({
              action: 'Delivery',
              table_name: d.status || 'Scheduled',
              created_at: d.created_at || d.delivery_date,
              profiles: { full_name: 'Delivery' }
            }));
          }
        } catch (_) { /* ignore */ }
      }
      // 5) If still empty: recently updated bottles
      if (activityItems.length === 0) {
        try {
          const { data: bottles } = await supabase.from('bottles').select('barcode_number, product_code, last_updated, created_at').eq('organization_id', organization.id).order('created_at', { ascending: false }).limit(5);
          if (bottles && bottles.length > 0) {
            bottles.forEach(b => addItem({
              action: 'Cylinder',
              table_name: b.product_code || b.barcode_number || 'Added',
              created_at: b.last_updated || b.created_at,
              profiles: { full_name: 'Inventory' }
            }));
          }
        } catch (_) { /* ignore */ }
      }
      // Sort by created_at descending and take top 5
      activityItems.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setRecentActivity(activityItems.slice(0, 5));

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
        { title: 'View Reports', path: '/reports', icon: <Analytics />, color: 'info' },
        { title: 'Truck Reconciliation', path: '/truck-reconciliation', icon: <CheckCircle />, color: 'success' },
        { title: 'Route Optimization', path: '/route-optimization', icon: <TrendingUp />, color: 'warning' },
        { title: 'Workflow Automation', path: '/workflow-automation', icon: <WorkIcon />, color: 'error' }
      ];
    } else {
      return [
        { title: 'View Customers', path: '/customers', icon: <People />, color: 'primary' },
        { title: 'Check Inventory', path: '/inventory', icon: <Inventory />, color: 'secondary' },
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
        color: primaryColor,
        onClick: () => {
          logger.log('🔄 Navigating to /customers');
          navigate('/customers');
        }
      },
      { 
        title: 'Cylinders', 
        value: stats.cylinders, 
        icon: <Inventory />, 
        color: primaryColor,
        onClick: () => {
          logger.log('🔄 Navigating to /inventory');
          navigate('/inventory');
        }
      },
      { 
        title: 'Active Rentals', 
        value: stats.activeRentals, 
        icon: <Schedule />, 
        color: primaryColor,
        onClick: () => {
          logger.log('🔄 Navigating to /rentals');
          navigate('/rentals');
        }
      },
    ];

    if (isAdmin()) {
      baseCards.push(
        { 
          title: 'Overdue Invoices', 
          value: stats.overdueInvoices, 
          icon: <Warning />, 
          color: '#EF4444',
          onClick: () => {
            logger.log('🔄 Navigating to /billing (invoices not available)');
            navigate('/billing');
          }
        },
        { 
          title: 'Total Users', 
          value: stats.totalUsers, 
          icon: <AdminPanelSettings />, 
          color: primaryColor,
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
    <Box sx={{ p: 4, backgroundColor: '#fff', minHeight: '100vh' }}>
      {/* Welcome Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#111', mb: 1, fontSize: '2rem' }}>
          {welcomeMessage.title}
        </Typography>
        <Typography variant="body1" sx={{ color: '#6B7280', fontSize: '1rem' }}>
          {welcomeMessage.subtitle}
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={index}>
            <Card 
              onClick={card.onClick}
              sx={{ 
                height: '100%', 
                backgroundColor: '#fff',
                borderRadius: 3,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                  transform: 'translateY(-2px)'
                }
              }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {card.title}
                  </Typography>
                  <Box sx={{ color: card.color || primaryColor, opacity: 0.8 }}>
                    {card.icon}
                  </Box>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#111', fontSize: '2rem' }}>
                  {card.value}
                </Typography>
              </CardContent>
            </Card>
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
          <Card sx={{ height: '100%', p: 3, borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <NotificationsIcon sx={{ color: '#9333EA', fontSize: '20px' }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#111', fontSize: '1.125rem' }}>
                Recent Activity
              </Typography>
            </Box>
            {recentActivity.length > 0 ? (
              <List dense>
                {recentActivity.map((activity, index) => (
                  <ListItem key={index} sx={{ px: 0, py: 1.5 }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: primaryColor, fontSize: '12px' }}>
                        {activity.profiles?.full_name?.charAt(0) || '?'}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={`${activity.action} ${activity.table_name}`}
                      secondary={`${activity.profiles?.full_name || 'Unknown'} • ${new Date(activity.created_at).toLocaleDateString()}`}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 500, color: '#111' }}
                      secondaryTypographyProps={{ variant: 'caption', color: '#6B7280' }}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Box 
                  component="svg" 
                  width="80" 
                  height="80" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  sx={{ 
                    color: '#D1D5DB', 
                    mb: 2, 
                    mx: 'auto',
                    display: 'block',
                    opacity: 0.4
                  }}
                >
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                  <line x1="12" y1="12" x2="12" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="12" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </Box>
                <Typography variant="body2" sx={{ color: '#6B7280', fontSize: '0.875rem' }}>
                  No recent activity to display. Activities will appear here once they occur.
                </Typography>
              </Box>
            )}
          </Card>
        </Grid>
      </Grid>

      {/* Admin-only alerts */}
      {isAdmin() && stats.overdueInvoices > 0 && (
        <Alert 
          severity="warning" 
          sx={{ mt: 3, borderRadius: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => navigate('/billing')}>
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