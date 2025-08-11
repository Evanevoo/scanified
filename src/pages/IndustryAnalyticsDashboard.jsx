import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  Tabs,
  Tab,
  Badge,
  Avatar,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  Inventory as InventoryIcon,
  People as PeopleIcon,
  LocalShipping as DeliveryIcon,
  TrendingUp as TrendingUpIcon,
  Notifications as NotificationsIcon,
  QrCodeScanner as ScanIcon,
  Dashboard as DashboardIcon,
  Speed as SpeedIcon,
  Assignment as AssignmentIcon,
  LocationOn as LocationIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import { useDebounce, useOptimizedFetch, usePagination } from '../utils/performance';
import { FadeIn, SlideIn, StatsSkeleton, TableSkeleton, SmoothButton } from '../components/SmoothLoading';
import { useNavigate } from 'react-router-dom';

export default function IndustryAnalyticsDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [quickStats, setQuickStats] = useState({
    totalAssets: 0,
    assetsInField: 0,
    assetsInHouse: 0,
    activeCustomers: 0,
    pendingDeliveries: 0,
    overdueReturns: 0
  });

  // Optimized data fetching with caching
  const { data: recentActivity, loading: activityLoading } = useOptimizedFetch(
    useCallback(async () => {
      if (!profile?.organization_id) return [];
      
      const { data, error } = await supabase
        .from('bottles')
        .select(`
          id,
          barcode_number,
          serial_number,
          assigned_customer,
          location,
          created_at,
          updated_at,
          customers(name)
        `)
        .eq('organization_id', profile.organization_id)
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    }, [profile?.organization_id]),
    [profile?.organization_id]
  );

  const { data: searchResults, loading: searchLoading } = useOptimizedFetch(
    useCallback(async () => {
      if (!debouncedSearch || !profile?.organization_id) return [];
      
      const { data, error } = await supabase
        .from('bottles')
        .select(`
          id,
          barcode_number,
          serial_number,
          assigned_customer,
          location,
          product_code,
          description,
          customers(name)
        `)
        .eq('organization_id', profile.organization_id)
        .or(`barcode_number.ilike.%${debouncedSearch}%,serial_number.ilike.%${debouncedSearch}%,assigned_customer.ilike.%${debouncedSearch}%`)
        .limit(50);

      if (error) throw error;
      return data || [];
    }, [debouncedSearch, profile?.organization_id]),
    [debouncedSearch, profile?.organization_id]
  );

  // Pagination for search results
  const { 
    currentPage, 
    totalPages, 
    paginatedData: paginatedResults, 
    goToPage 
  } = usePagination(searchResults || [], 20);

  // Fetch quick stats
  useEffect(() => {
    const fetchQuickStats = async () => {
      if (!profile?.organization_id) return;

      try {
        const [bottlesData, customersData, deliveriesData] = await Promise.all([
          supabase
            .from('bottles')
            .select('assigned_customer, location')
            .eq('organization_id', profile.organization_id),
          supabase
            .from('customers')
            .select('CustomerListID')
            .eq('organization_id', profile.organization_id),
          supabase
            .from('deliveries')
            .select('status')
            .eq('organization_id', profile.organization_id)
        ]);

        const bottles = bottlesData.data || [];
        const customers = customersData.data || [];
        const deliveries = deliveriesData.data || [];

        setQuickStats({
          totalAssets: bottles.length,
          assetsInField: bottles.filter(b => b.assigned_customer && b.assigned_customer !== 'Not Set').length,
          assetsInHouse: bottles.filter(b => !b.assigned_customer || b.assigned_customer === 'Not Set').length,
          activeCustomers: customers.length,
          pendingDeliveries: deliveries.filter(d => d.status === 'pending').length,
          overdueReturns: bottles.filter(b => b.location === 'overdue').length
        });
      } catch (error) {
        console.error('Error fetching quick stats:', error);
      }
    };

    fetchQuickStats();
  }, [profile?.organization_id]);

  const handleQuickAction = useCallback((action, id) => {
    switch (action) {
      case 'view':
        navigate(`/bottle/${id}`);
        break;
      case 'edit':
        navigate(`/bottle/${id}/edit`);
        break;
      case 'assign':
        navigate(`/bottle/${id}/assign`);
        break;
      default:
        break;
    }
  }, [navigate]);

  const StatCard = ({ title, value, icon, color = 'primary', trend, onClick }) => (
    <FadeIn>
      <Card 
        sx={{ 
          cursor: onClick ? 'pointer' : 'default',
          transition: 'all 0.2s ease-in-out',
          '&:hover': onClick ? {
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          } : {}
        }}
        onClick={onClick}
      >
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h4" color={`${color}.main`} fontWeight="bold">
                {value.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {title}
              </Typography>
              {trend && (
                <Box display="flex" alignItems="center" mt={1}>
                  <TrendingUpIcon 
                    sx={{ 
                      fontSize: 16, 
                      color: trend > 0 ? 'success.main' : 'error.main',
                      mr: 0.5 
                    }} 
                  />
                  <Typography 
                    variant="caption" 
                    color={trend > 0 ? 'success.main' : 'error.main'}
                  >
                    {trend > 0 ? '+' : ''}{trend}%
                  </Typography>
                </Box>
              )}
            </Box>
            <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.main` }}>
              {icon}
            </Avatar>
          </Box>
        </CardContent>
      </Card>
    </FadeIn>
  );

  const QuickSearchResults = () => (
    <Box>
      {searchLoading ? (
        <TableSkeleton rows={5} columns={4} />
      ) : (
        <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Barcode</TableCell>
                <TableCell>Serial</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedResults.map((bottle, index) => (
                <SlideIn key={bottle.id} delay={index * 50}>
                  <TableRow hover>
                    <TableCell>
                      <Typography 
                        variant="body2" 
                        color="primary" 
                        sx={{ cursor: 'pointer' }}
                        onClick={() => handleQuickAction('view', bottle.id)}
                      >
                        {bottle.barcode_number}
                      </Typography>
                    </TableCell>
                    <TableCell>{bottle.serial_number}</TableCell>
                    <TableCell>
                      {bottle.customers?.name || bottle.assigned_customer || 'Unassigned'}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={bottle.location || 'Unknown'} 
                        size="small"
                        color={bottle.location ? 'success' : 'warning'}
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <IconButton 
                          size="small" 
                          onClick={() => handleQuickAction('view', bottle.id)}
                        >
                          <SearchIcon />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => handleQuickAction('edit', bottle.id)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                </SlideIn>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={2} gap={1}>
          <Button 
            size="small" 
            disabled={currentPage === 1}
            onClick={() => goToPage(currentPage - 1)}
          >
            Previous
          </Button>
          <Typography variant="body2" sx={{ px: 2, py: 1 }}>
            Page {currentPage} of {totalPages}
          </Typography>
          <Button 
            size="small" 
            disabled={currentPage === totalPages}
            onClick={() => goToPage(currentPage + 1)}
          >
            Next
          </Button>
        </Box>
      )}
    </Box>
  );

  const RecentActivity = () => (
    <Box>
      {activityLoading ? (
        <TableSkeleton rows={5} columns={3} />
      ) : (
        <Box>
          {recentActivity?.slice(0, 10).map((activity, index) => (
            <SlideIn key={activity.id} delay={index * 100}>
              <Box 
                display="flex" 
                alignItems="center" 
                p={2} 
                borderBottom="1px solid #f0f0f0"
                sx={{
                  '&:hover': {
                    bgcolor: 'rgba(0,0,0,0.02)',
                    cursor: 'pointer'
                  }
                }}
                onClick={() => handleQuickAction('view', activity.id)}
              >
                <Avatar sx={{ mr: 2, bgcolor: 'primary.light' }}>
                  <InventoryIcon />
                </Avatar>
                <Box flex={1}>
                  <Typography variant="body2" fontWeight="medium">
                    {activity.barcode_number}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {activity.customers?.name || activity.assigned_customer || 'Unassigned'} • {activity.location}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {new Date(activity.updated_at).toLocaleDateString()}
                </Typography>
              </Box>
            </SlideIn>
          ))}
        </Box>
      )}
    </Box>
  );

  return (
    <Box p={3}>
      {/* Header */}
      <FadeIn>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" fontWeight="bold" color="primary">
              Asset Tracking Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Real-time visibility into your gas cylinder operations
            </Typography>
          </Box>
          <Box display="flex" gap={2}>
            <SmoothButton
              variant="outlined"
              startIcon={<ScanIcon />}
              onClick={() => navigate('/scan')}
            >
              Quick Scan
            </SmoothButton>
            <SmoothButton
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/bottles/add')}
            >
              Add Asset
            </SmoothButton>
          </Box>
        </Box>
      </FadeIn>

      {/* Quick Stats */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title="Total Assets"
            value={quickStats.totalAssets}
            icon={<InventoryIcon />}
            color="primary"
            onClick={() => navigate('/bottles')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title="In Field"
            value={quickStats.assetsInField}
            icon={<LocationIcon />}
            color="success"
            onClick={() => navigate('/bottles?filter=in-field')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title="In House"
            value={quickStats.assetsInHouse}
            icon={<DashboardIcon />}
            color="info"
            onClick={() => navigate('/bottles?filter=in-house')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title="Active Customers"
            value={quickStats.activeCustomers}
            icon={<PeopleIcon />}
            color="secondary"
            onClick={() => navigate('/customers')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title="Pending Deliveries"
            value={quickStats.pendingDeliveries}
            icon={<DeliveryIcon />}
            color="warning"
            onClick={() => navigate('/deliveries')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title="Overdue Returns"
            value={quickStats.overdueReturns}
            icon={<WarningIcon />}
            color="error"
            onClick={() => navigate('/bottles?filter=overdue')}
          />
        </Grid>
      </Grid>

      {/* Quick Search */}
      <FadeIn delay={200}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Quick Search
            </Typography>
            <TextField
              fullWidth
              placeholder="Search by barcode, serial number, or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />
            {debouncedSearch && <QuickSearchResults />}
          </CardContent>
        </Card>
      </FadeIn>

      {/* Main Content Tabs */}
      <FadeIn delay={300}>
        <Card>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
              <Tab label="Recent Activity" />
              <Tab label="Alerts" />
              <Tab label="Performance" />
            </Tabs>
          </Box>
          <CardContent>
            {activeTab === 0 && <RecentActivity />}
            {activeTab === 1 && (
              <Box textAlign="center" py={4}>
                <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                <Typography variant="h6">All Good!</Typography>
                <Typography variant="body2" color="text.secondary">
                  No alerts at this time
                </Typography>
              </Box>
            )}
            {activeTab === 2 && (
              <Box textAlign="center" py={4}>
                <SpeedIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6">Performance Metrics</Typography>
                <Typography variant="body2" color="text.secondary">
                  Coming soon...
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </FadeIn>
    </Box>
  );
} 