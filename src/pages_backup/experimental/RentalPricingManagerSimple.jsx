import logger from '../../utils/logger';
import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';

export default function RentalPricingManagerSimple() {
  const { organization } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({ tiers: 0, rates: 0, rules: 0 });

  useEffect(() => {
    if (organization?.id) {
      loadData();
    }
  }, [organization]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      logger.log('Loading data for organization:', organization.id);
      
      // Simple data loading
      const [tiersResult, ratesResult, rulesResult] = await Promise.all([
        supabase.from('pricing_tiers').select('id').eq('organization_id', organization.id),
        supabase.from('customer_pricing').select('id').eq('organization_id', organization.id),
        supabase.from('demurrage_rules').select('id').eq('organization_id', organization.id)
      ]);
      
      setData({
        tiers: tiersResult.data?.length || 0,
        rates: ratesResult.data?.length || 0,
        rules: rulesResult.data?.length || 0
      });
      
    } catch (error) {
      logger.error('Error loading data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (!organization) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Please connect to an organization to access the rental pricing manager.
        </Alert>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Error: {error}
        </Alert>
        <Button onClick={loadData} sx={{ mt: 2 }}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Rental Pricing Manager (Simple MUI)
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 3 }}>
        This is a simplified Material-UI version to test component rendering.
      </Typography>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Data Summary:
        </Typography>
        <Typography>Pricing Tiers: {data.tiers}</Typography>
        <Typography>Customer Rates: {data.rates}</Typography>
        <Typography>Demurrage Rules: {data.rules}</Typography>
      </Box>

      <Button 
        variant="contained" 
        onClick={loadData}
        sx={{ mr: 2 }}
      >
        Refresh Data
      </Button>

      <Button 
        variant="outlined" 
        onClick={() => window.location.href = '/rental-pricing-manager'}
      >
        Try Original Component
      </Button>
    </Box>
  );
}
