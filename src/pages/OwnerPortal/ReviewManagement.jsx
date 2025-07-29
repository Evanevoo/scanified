import React from 'react';
import { Box, Typography, Alert } from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import { useOwnerAccess } from '../../hooks/useOwnerAccess';
import ReviewSystem from '../../components/ReviewSystem';

export default function ReviewManagement() {
  const { profile } = useAuth();
  useOwnerAccess(profile);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Review Management
      </Typography>
      
      <Alert severity="warning" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Legal Notice:</strong> Only approve genuine reviews from real customers who have actually used your service. 
          Fake reviews violate FTC guidelines and can result in fines up to $43,792 per violation.
        </Typography>
      </Alert>

      <ReviewSystem isAdminView={true} />
    </Box>
  );
} 