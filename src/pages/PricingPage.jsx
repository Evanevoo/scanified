import logger from '../utils/logger';
import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Button, Grid, Chip, CircularProgress } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';

function PricingPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) {
        logger.error('Error fetching pricing plans:', error);
      } else {
        setPlans(data);
      }
      setLoading(false);
    };
    fetchPlans();
  }, []);

  const handleGetStarted = (plan) => {
    if (plan.name.toLowerCase() === 'enterprise') {
      navigate('/contact');
    } else {
      navigate(`/register?plan=${plan.id}`);
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: 'grey.50', py: 8, px: 2 }}>
      <Typography variant="h3" align="center" gutterBottom fontWeight="bold">
        Simple, Transparent Pricing
      </Typography>
      <Typography variant="h6" align="center" color="text.secondary" sx={{ mb: 6 }}>
        Choose the plan that fits your business needs
      </Typography>

      <Grid container spacing={4} justifyContent="center" alignItems="stretch">
        {plans.map((plan) => (
          <Grid item key={plan.name} xs={12} sm={6} md={4}>
            <Card 
              raised={plan.is_most_popular} 
              sx={{ 
                p: 3, 
                borderRadius: 4,
                border: plan.is_most_popular ? '2px solid' : '1px solid',
                borderColor: plan.is_most_popular ? 'primary.main' : 'grey.300',
                position: 'relative',
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {plan.is_most_popular && (
                <Chip 
                  label="Most Popular" 
                  color="primary" 
                  sx={{ 
                    position: 'absolute', 
                    top: -12, 
                    left: '50%', 
                    transform: 'translateX(-50%)',
                    fontWeight: 'bold'
                  }} 
                />
              )}
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h5" gutterBottom fontWeight="bold">
                  {plan.name}
                </Typography>
                <Box display="flex" alignItems="baseline" mb={2}>
                  <Typography variant="h4" fontWeight="bold">
                    {plan.name.toLowerCase().includes('enterprise') ? 'Contact Sales' : 
                     plan.price_interval === 'custom' ? 'Custom' : `$${plan.price}`}
                  </Typography>
                  {!plan.name.toLowerCase().includes('enterprise') && plan.price_interval !== 'custom' && (
                    <Typography variant="subtitle1" color="text.secondary">
                      /month
                    </Typography>
                  )}
                </Box>
                <Box component="ul" sx={{ p: 0, listStyle: 'none' }}>
                  {plan.features.map((feature) => (
                    <Box component="li" key={feature} sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                      <CheckIcon color="primary" sx={{ mr: 1.5 }} />
                      <Typography variant="body1">{feature}</Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
              <Button
                variant={plan.is_most_popular ? 'contained' : 'outlined'}
                fullWidth
                size="large"
                sx={{ mt: 2, py: 1.5, borderRadius: 2 }}
                onClick={() => handleGetStarted(plan)}
              >
                {plan.name.toLowerCase() === 'enterprise' ? 'Contact Sales' : 'Get Started'}
              </Button>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export default PricingPage; 