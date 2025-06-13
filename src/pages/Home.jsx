import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, Grid, Button, Paper, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';

export default function Home({ profile }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalCylinders: 0,
    rentedCylinders: 0,
    totalCustomers: 0,
    loading: true
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get total cylinders
        const { count: totalCylinders } = await supabase
          .from('bottles')
          .select('*', { count: 'exact', head: true });

        // Get rented cylinders (active rentals)
        const { count: rentedCylinders } = await supabase
          .from('rentals')
          .select('*', { count: 'exact', head: true })
          .is('rental_end_date', null); // Only active rentals

        // Get total customers
        const { count: totalCustomers } = await supabase
          .from('customers')
          .select('*', { count: 'exact', head: true });

        setStats({
          totalCylinders: totalCylinders || 0,
          rentedCylinders: rentedCylinders || 0,
          totalCustomers: totalCustomers || 0,
          loading: false
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    fetchStats();
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fff', py: 8, borderRadius: 0, overflow: 'visible' }}>
      <Paper elevation={0} sx={{ width: '100%', p: { xs: 2, md: 5 }, borderRadius: 0, boxShadow: '0 2px 12px 0 rgba(16,24,40,0.04)', border: '1px solid #eee', bgcolor: '#fff', overflow: 'visible' }}>
        <Typography variant="h3" fontWeight={900} color="primary" mb={2} sx={{ letterSpacing: -1 }}>Dashboard</Typography>
        
        {stats.loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto' }}>
            {/* Stats Cards */}
            <Grid container spacing={3} mb={4}>
              <Grid item xs={12} sm={6} md={3}>
                <Card elevation={3} sx={{ borderRadius: 3, bgcolor: '#f8f9fa' }}>
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <Typography variant="h4" fontWeight={900} color="primary" mb={1}>
                      {stats.totalCylinders}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Cylinders
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card elevation={3} sx={{ borderRadius: 3, bgcolor: '#e3f2fd' }}>
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <Typography variant="h4" fontWeight={900} color="primary" mb={1}>
                      {stats.rentedCylinders}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Rented Cylinders
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card elevation={3} sx={{ borderRadius: 3, bgcolor: '#f3e5f5' }}>
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <Typography variant="h4" fontWeight={900} color="primary" mb={1}>
                      {stats.totalCylinders - stats.rentedCylinders}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Available Cylinders
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card elevation={3} sx={{ borderRadius: 3, bgcolor: '#e8f5e8' }}>
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <Typography variant="h4" fontWeight={900} color="primary" mb={1}>
                      {stats.totalCustomers}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Customers
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* User Info Card */}
            <Card elevation={6} sx={{ borderRadius: 4, mb: 4 }}>
              <CardContent>
                <Grid container spacing={2} mb={2}>
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined" sx={{ bgcolor: 'primary.lighter', borderRadius: 3 }}>
                      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ fontSize: 32, color: 'primary.main' }}>👤</Box>
                        <Box>
                          <Typography fontWeight={700}>{profile?.full_name || 'User'}</Typography>
                          <Typography variant="caption" color="primary">Logged in</Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined" sx={{ bgcolor: 'primary.lighter', borderRadius: 3 }}>
                      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ fontSize: 32, color: 'primary.main' }}>⭐</Box>
                        <Box>
                          <Typography fontWeight={700} textTransform="capitalize">{profile?.role}</Typography>
                          <Typography variant="caption" color="primary">Role</Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
                {profile?.role === 'admin' && <Typography color="primary" fontWeight={600}>You have full access to all features.</Typography>}
                {profile?.role === 'manager' && <Typography color="primary" fontWeight={600}>You can view, assign cylinders, and generate invoices.</Typography>}
                {profile?.role === 'user' && <Typography color="primary" fontWeight={600}>You have view-only access to customers and assigned cylinders.</Typography>}
                <Typography mt={3}>Use the navigation bar to manage customers, cylinders, rentals, and invoices.</Typography>
                <Button variant="contained" color="primary" sx={{ mt: 4 }} onClick={() => navigate('/scanned-orders')}>
                  View Scanned Orders
                </Button>
              </CardContent>
            </Card>
          </Box>
        )}
      </Paper>
    </Box>
  );
} 