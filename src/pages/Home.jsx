import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, Grid, Button, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { useAppStore } from '../store/appStore';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';

/**
 * Home dashboard component
 * @param {Object} props - Component props
 * @param {Object} props.profile - User profile data
 * @returns {JSX.Element} Home dashboard component
 */
export default function Home() {
  const { user, profile, organization } = useAuth();
  const navigate = useNavigate();
  const { addNotification } = useAppStore();
  
  const [stats, setStats] = useState({
    totalCylinders: 0,
    rentedCylinders: 0,
    totalCustomers: 0,
    loading: true
  });

  // If user is logged in but has no organization, show create org option
  if (user && profile && !organization) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <Paper elevation={3} sx={{ p: 6, borderRadius: 4, textAlign: 'center', maxWidth: 500 }}>
          <Typography variant="h4" gutterBottom color="primary">
            Welcome to LessAnnoyingScan!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            You're almost ready to start managing your gas cylinders. Let's complete your organization setup.
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            size="large"
            onClick={() => navigate('/setup')}
            sx={{ px: 4, py: 1.5 }}
          >
            Complete Setup
          </Button>
        </Paper>
      </Box>
    );
  }

  useEffect(() => {
    const fetchStats = async () => {
      try {
        console.log('Home: Starting to fetch stats...');
        
        // Get user's organization_id first
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('No authenticated user found');
        }

        console.log('Home: Current user ID:', user.id);

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        console.log('Home: Profile data:', profile);
        console.log('Home: Profile error:', profileError);

        if (profileError || !profile?.organization_id) {
          throw new Error('User not assigned to an organization');
        }

        console.log('Home: Using organization_id:', profile.organization_id);

        // Test: Get total count without organization filter
        const { count: totalWithoutFilter, error: testError } = await supabase
          .from('bottles')
          .select('*', { count: 'exact', head: true });
        
        console.log('Home: Total bottles without organization filter:', totalWithoutFilter);

        // Test: Check what organization_ids exist in bottles table
        const { data: bottleOrgs, error: orgCheckError } = await supabase
          .from('bottles')
          .select('organization_id')
          .limit(10);
        
        console.log('Home: Sample bottle organization_ids:', bottleOrgs);
        console.log('Home: Organization check error:', orgCheckError);
        
        // Show the actual organization_id values
        const orgIds = bottleOrgs?.map(b => b.organization_id) || [];
        console.log('Home: Actual organization_id values:', orgIds);
        console.log('Home: Does user org exist in bottles?', orgIds.includes(profile.organization_id));

        // Get total cylinders for this organization
        const { count: totalCylinders, error: cylindersError } = await supabase
          .from('bottles')
          .select('*', { count: 'exact', head: true });
          // RLS will automatically filter by organization_id

        console.log('Home: Cylinders query result:', { totalCylinders, cylindersError });
        console.log('Home: Organization filter applied:', profile.organization_id);

        // Test: Get bottles the same way BottleManagement does
        const { data: bottlesData, error: bottlesError } = await supabase
          .from('bottles')
          .select('*')
          .order('barcode_number');
        
        console.log('Home: Bottles data length:', bottlesData?.length || 0);
        console.log('Home: Bottles error:', bottlesError);
        
        // Filter like BottleManagement does
        const realBottles = bottlesData?.filter(b =>
          (b.barcode_number && b.barcode_number !== '') ||
          (b.serial_number && b.serial_number !== '')
        ) || [];
        
        console.log('Home: Real bottles count (like BottleManagement):', realBottles.length);

        if (cylindersError) {
          console.error('Home: Cylinders error:', cylindersError);
          throw cylindersError;
        }

        // Get rented cylinders (active rentals) for this organization
        const { data: rentalsData, error: rentalsError } = await supabase
          .from('rentals')
          .select('*')
          .is('rental_end_date', null); // Only active rentals
          // RLS will automatically filter by organization_id

        console.log('Home: Rentals data length:', rentalsData?.length || 0);
        console.log('Home: Sample rentals:', rentalsData?.slice(0, 3) || []);
        console.log('Home: Rentals error:', rentalsError);
        
        // Get customer data like Rentals page does
        const customerIds = Array.from(new Set((rentalsData || []).map(r => r.customer_id).filter(Boolean)));
        let customersMap = {};
        
        if (customerIds.length > 0) {
          const { data: customersData, error: customersError } = await supabase
            .from('customers')
            .select('*')
            .in('CustomerListID', customerIds);
          
          if (!customersError && customersData) {
            customersMap = customersData.reduce((map, c) => {
              map[c.CustomerListID] = c;
              return map;
            }, {});
          }
        }
        
        // Attach customer info to each rental (like Rentals page does)
        const rentalsWithCustomer = (rentalsData || []).map(r => ({
          ...r,
          customer: customersMap[r.customer_id] || null
        }));
        
        // Count only rentals with valid customers (like Rentals page does)
        const validRentals = rentalsWithCustomer.filter(rental => rental.customer);
        const rentedCylinders = validRentals.length;
        
        console.log('Home: Valid rentals count (with customers):', rentedCylinders);
        console.log('Home: Sample valid rentals:', validRentals.slice(0, 3));

        if (rentalsError) {
          console.error('Home: Rentals error:', rentalsError);
          throw rentalsError;
        }

        // Get total customers for this organization
        const { count: totalCustomers, error: customersError } = await supabase
          .from('customers')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', profile.organization_id);

        console.log('Home: Customers query result:', { totalCustomers, customersError });

        if (customersError) {
          console.error('Home: Customers error:', customersError);
          throw customersError;
        }

        const newStats = {
          totalCylinders: realBottles.length,
          rentedCylinders: rentedCylinders || 0,
          totalCustomers: totalCustomers || 0,
          loading: false
        };

        console.log('Home: Setting stats:', newStats);
        setStats(newStats);

        // Add notification for successful stats load
        addNotification({
          type: 'success',
          title: 'Dashboard Updated',
          message: 'Statistics have been refreshed successfully'
        });
      } catch (error) {
        console.error('Home: Error fetching stats:', error);
        setStats({
          totalCylinders: 0,
          rentedCylinders: 0,
          totalCustomers: 0,
          loading: false
        });
        
        // Show error notification
        addNotification({
          type: 'error',
          title: 'Stats Loading Failed',
          message: 'Failed to load dashboard statistics. Please check your permissions.'
        });
      }
    };

    fetchStats();
  }, [addNotification]);

  const handleViewScannedOrders = () => {
    try {
      navigate('/scanned-orders');
    } catch (error) {
      console.error('Navigation error:', error);
      addNotification({
        type: 'error',
        title: 'Navigation Failed',
        message: 'Failed to navigate to scanned orders'
      });
    }
  };

  if (stats.loading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  // Ensure all values are numbers before calculations
  const totalCylinders = Number(stats.totalCylinders) || 0;
  const rentedCylinders = Number(stats.rentedCylinders) || 0;
  const totalCustomers = Number(stats.totalCustomers) || 0;
  const availableCylinders = totalCylinders - rentedCylinders;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', py: 4 }}>
      <Box sx={{ maxWidth: '1200px', mx: 'auto', px: 3 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" fontWeight={700} color="primary" sx={{ mb: 1 }}>
            Welcome back, {profile?.full_name?.split(' ')[0] || 'User'}
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Here's what's happening with your gas cylinder operations today
          </Typography>
        </Box>
        
        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 3, textAlign: 'center', border: '1px solid #e2e8f0' }}>
              <Typography variant="h4" fontWeight={700} color="primary">
                {totalCylinders.toLocaleString()}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Total Cylinders
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 3, textAlign: 'center', border: '1px solid #e2e8f0' }}>
              <Typography variant="h4" fontWeight={700} color="success.main">
                {availableCylinders.toLocaleString()}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Available
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 3, textAlign: 'center', border: '1px solid #e2e8f0' }}>
              <Typography variant="h4" fontWeight={700} color="warning.main">
                {rentedCylinders.toLocaleString()}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                In Use
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 3, textAlign: 'center', border: '1px solid #e2e8f0' }}>
              <Typography variant="h4" fontWeight={700} color="info.main">
                {totalCustomers.toLocaleString()}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Active Customers
              </Typography>
            </Card>
          </Grid>
        </Grid>

        {/* Quick Actions */}
        <Card sx={{ p: 4, border: '1px solid #e2e8f0' }}>
          <Typography variant="h5" fontWeight={600} sx={{ mb: 3 }}>
            Quick Actions
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Button 
                variant="contained" 
                color="primary" 
                fullWidth
                size="large"
                onClick={handleViewScannedOrders}
                sx={{ py: 2 }}
              >
                View Recent Orders
              </Button>
            </Grid>
            <Grid item xs={12} md={4}>
              <Button 
                variant="outlined" 
                color="primary" 
                fullWidth
                size="large"
                onClick={() => navigate('/assets')}
                sx={{ py: 2 }}
              >
                Manage Inventory
              </Button>
            </Grid>
            <Grid item xs={12} md={4}>
              <Button 
                variant="outlined" 
                color="primary" 
                fullWidth
                size="large"
                onClick={() => navigate('/customers')}
                sx={{ py: 2 }}
              >
                View Customers
              </Button>
            </Grid>
          </Grid>
        </Card>
      </Box>
    </Box>
  );
} 