import React from 'react';
import { Box, Card, CardContent, Typography, Grid, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function Home({ profile }) {
  const navigate = useNavigate();
  return (
    <Box maxWidth="lg" mx="auto" mt={4}>
      <Box sx={{ width: '100%', maxWidth: 700, mx: 'auto' }}>
        <Card elevation={6} sx={{ borderRadius: 4, mb: 4 }}>
          <CardContent>
            <Typography variant="h4" fontWeight={800} color="primary" gutterBottom>
              Dashboard
            </Typography>
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
    </Box>
  );
} 