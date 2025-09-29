import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Alert, Card, CardContent } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';

export default function RentalPricingManagerStep1() {
  const { organization } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pricingTiers, setPricingTiers] = useState([]);

  useEffect(() => {
    if (organization?.id) {
      loadPricingData();
    }
  }, [organization]);

  const loadPricingData = async () => {
    try {
      setLoading(true);
      
      const { data: tiers, error: tiersError } = await supabase
        .from('pricing_tiers')
        .select('*')
        .eq('organization_id', organization.id)
        .order('min_quantity');
      
      if (tiersError) {
        console.error('Error loading pricing tiers:', tiersError);
      }

      setPricingTiers(tiers || []);
    } catch (error) {
      console.error('Error loading pricing data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading pricing data...</Typography>
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

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Rental Pricing Manager (Step 1 - Basic Components)
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 3 }}>
        Testing basic Material-UI components: Box, Typography, Button, Alert, Card
      </Typography>

      {/* Overview Cards */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Pricing Tiers: {pricingTiers.length}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure bracket-based pricing for different quantities
          </Typography>
        </CardContent>
      </Card>

      {pricingTiers.length === 0 ? (
        <Alert severity="info">
          No pricing tiers configured. Add your first tier to enable bracket-based pricing.
        </Alert>
      ) : (
        <Box>
          <Typography variant="h6" gutterBottom>
            Current Pricing Tiers:
          </Typography>
          {pricingTiers.map((tier) => (
            <Card key={tier.id} sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle1">{tier.name}</Typography>
                <Typography variant="body2">
                  Gas Type: {tier.gas_type} | Min Qty: {tier.min_quantity}
                </Typography>
                <Typography variant="body2">
                  Daily: ${tier.daily_rate} | Weekly: ${tier.weekly_rate} | Monthly: ${tier.monthly_rate}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <Button 
        variant="contained" 
        onClick={loadPricingData}
        sx={{ mt: 2 }}
      >
        Refresh Data
      </Button>
    </Box>
  );
}
