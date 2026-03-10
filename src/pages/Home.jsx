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

      // Active rentals = Rented Assets (Billable) - same definition as Rentals page: bottles assigned to
      // CUSTOMER with status "rented", excluding vendors and customer-owned
      let activeRentalsCount = 0;
      try {
        const [
          { data: assignedBottles, error: bottlesErr },
          { data: customersData, error: customersErr }
        ] = await Promise.all([
          supabase.from('bottles').select('assigned_customer, status, ownership').eq('organization_id', organization.id).not('assigned_customer', 'is', null),
          supabase.from('customers').select('CustomerListID, customer_type').eq('organization_id', organization.id)
        ]);
        if (!bottlesErr && !customersErr && assignedBottles?.length > 0) {
          const customerTypesMap = (customersData || []).reduce((map, c) => {
            map[c.CustomerListID] = c.customer_type || 'CUSTOMER';
            return map;
          }, {});
          activeRentalsCount = assignedBottles.filter(bottle => {
            const customerType = customerTypesMap[bottle.assigned_customer] || 'CUSTOMER';
            const ownershipValue = String(bottle.ownership || '').trim().toLowerCase();
            const isCustomerOwned = ownershipValue.includes('customer') || ownershipValue.includes('owned') || ownershipValue === 'customer owned';
            return bottle.assigned_customer && customerType === 'CUSTOMER' && (bottle.status === 'rented' || bottle.status === 'RENTED') && !isCustomerOwned;
          }).length;
        }
        logger.log('Dashboard active rentals count (Rented Assets Billable):', { activeRentalsCount });
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
      <Box sx={{ p: 4 }}>
        <LinearProgress sx={{ borderRadius: 1, height: 6 }} />
        <Typography variant="body2" sx={{ mt: 2, color: '#6b7280' }}>Loading dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 3, sm: 4 }, backgroundColor: 'transparent', minHeight: '100%' }}>
      {/* Welcome Section */}
      <Box sx={{ mb: 4, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a1a1a', fontSize: '1.75rem', letterSpacing: '-0.02em' }}>
          {welcomeMessage.title}
        </Typography>
        {welcomeMessage.chip && (
          <Chip
            label={welcomeMessage.chip.label}
            size="small"
            color={welcomeMessage.chip.color}
            sx={{ fontWeight: 600, fontSize: '0.75rem' }}
          />
        )}
      </Box>
      <Typography variant="body1" sx={{ color: '#6b7280', fontSize: '0.9375rem', mb: 4 }}>
        {welcomeMessage.subtitle}
      </Typography>

      {/* Statistics Cards */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {statCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={index}>
            <Card 
              onClick={card.onClick}
              elevation={0}
              sx={{ 
                height: '100%', 
                backgroundColor: '#fff',
                borderRadius: 2,
                border: '1px solid rgba(0,0,0,0.06)',
                cursor: 'pointer',
                transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  transform: 'translateY(-1px)',
                }
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {card.title}
                  </Typography>
                  <Box 
                    sx={{ 
                      color: '#fff',
                      backgroundColor: card.color || primaryColor,
                      width: 36,
                      height: 36,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      '& .MuiSvgIcon-root': { fontSize: '1.25rem' },
                    }}
                  >
                    {card.icon}
                  </Box>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a', fontSize: '1.75rem', letterSpacing: '-0.02em' }}>
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
          <Card elevation={0} sx={{ height: '100%', p: 3, borderRadius: 2, border: '1px solid rgba(0,0,0,0.06)' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1a1a1a', mb: 2, display: 'flex', alignItems: 'center', gap: 1.25, fontSize: '1rem' }}>
              <Box sx={{ color: primaryColor, display: 'flex', alignItems: 'center' }}>
                <WorkIcon fontSize="small" />
              </Box>
              Quick Actions
            </Typography>
            <Grid container spacing={1.5}>
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
                      minHeight: 44,
                      py: 1.25,
                      px: 2,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 500,
                      fontSize: '0.875rem',
                      transition: 'background-color 0.15s, border-color 0.15s',
                      '&:hover': {
                        borderWidth: '1.5px',
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
          <Card elevation={0} sx={{ height: '100%', p: 3, borderRadius: 2, border: '1px solid rgba(0,0,0,0.06)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2.5 }}>
              <Box sx={{ color: primaryColor, display: 'flex', alignItems: 'center' }}>
                <NotificationsIcon fontSize="small" />
              </Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1a1a1a', fontSize: '1rem' }}>
                Recent Activity
              </Typography>
            </Box>
            {recentActivity.length > 0 ? (
              <List dense disablePadding>
                {recentActivity.map((activity, index) => (
                  <ListItem key={index} sx={{ px: 0, py: 1.25, borderBottom: index < recentActivity.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: `${primaryColor}20`, color: primaryColor, fontSize: '0.75rem', fontWeight: 600 }}>
                        {activity.profiles?.full_name?.charAt(0) || '?'}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={`${activity.action} ${activity.table_name}`}
                      secondary={`${activity.profiles?.full_name || 'Unknown'} · ${new Date(activity.created_at).toLocaleDateString()}`}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 500, color: '#1a1a1a' }}
                      secondaryTypographyProps={{ variant: 'caption', color: '#6b7280' }}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Box sx={{ textAlign: 'center', py: 5 }}>
                <Box 
                  component="svg" 
                  width="64" 
                  height="64" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  sx={{ 
                    color: '#d1d5db', 
                    mb: 1.5, 
                    mx: 'auto',
                    display: 'block',
                    opacity: 0.6
                  }}
                >
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                  <line x1="12" y1="12" x2="12" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="12" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </Box>
                <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
                  No recent activity. Activities will appear here once they occur.
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
          sx={{ mt: 3, borderRadius: 2, border: '1px solid rgba(0,0,0,0.06)' }}
          action={
            <Button color="inherit" size="small" onClick={() => navigate('/billing')} sx={{ fontWeight: 600 }}>
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