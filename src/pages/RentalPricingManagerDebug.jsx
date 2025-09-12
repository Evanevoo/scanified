import React, { useState, useEffect } from 'react';
import { Box, Typography, Alert, Button } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';

export default function RentalPricingManagerDebug() {
  const { organization, user } = useAuth();
  const [debugInfo, setDebugInfo] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    debugComponent();
  }, [organization]);

  const debugComponent = async () => {
    const info = {
      user: user ? 'User logged in' : 'No user',
      organization: organization ? `Org: ${organization.id}` : 'No organization',
      timestamp: new Date().toISOString()
    };

    try {
      // Test basic Supabase connection
      const { data: testData, error: testError } = await supabase
        .from('organizations')
        .select('id')
        .limit(1);
      
      info.supabaseConnection = testError ? `Error: ${testError.message}` : 'Connected';

      // Test pricing_tiers table
      if (organization?.id) {
        const { data: tiersData, error: tiersError } = await supabase
          .from('pricing_tiers')
          .select('*')
          .eq('organization_id', organization.id)
          .limit(1);
        
        info.pricingTiersTable = tiersError ? `Error: ${tiersError.message}` : `Found ${tiersData?.length || 0} tiers`;

        // Test customer_pricing table
        const { data: customerData, error: customerError } = await supabase
          .from('customer_pricing')
          .select('*')
          .eq('organization_id', organization.id)
          .limit(1);
        
        info.customerPricingTable = customerError ? `Error: ${customerError.message}` : `Found ${customerData?.length || 0} rates`;

        // Test demurrage_rules table
        const { data: demurrageData, error: demurrageError } = await supabase
          .from('demurrage_rules')
          .select('*')
          .eq('organization_id', organization.id)
          .limit(1);
        
        info.demurrageRulesTable = demurrageError ? `Error: ${demurrageError.message}` : `Found ${demurrageData?.length || 0} rules`;
      }

    } catch (error) {
      info.generalError = error.message;
    }

    setDebugInfo(info);
    setLoading(false);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading debug info...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Rental Pricing Manager Debug
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        This is a debug version to identify the white page issue
      </Alert>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>Debug Information:</Typography>
        <pre style={{ background: '#f5f5f5', padding: '16px', borderRadius: '4px', overflow: 'auto' }}>
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </Box>

      <Button 
        variant="contained" 
        onClick={debugComponent}
        sx={{ mr: 2 }}
      >
        Refresh Debug Info
      </Button>

      <Button 
        variant="outlined" 
        onClick={() => window.location.href = '/rental-pricing-manager'}
      >
        Back to Original Page
      </Button>
    </Box>
  );
}
