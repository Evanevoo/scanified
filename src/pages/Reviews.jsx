import React from 'react';
import { Container, Typography, Box, Alert } from '@mui/material';
import ReviewSystem from '../components/ReviewSystem';

export default function Reviews() {
  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant="h2" fontWeight={700} sx={{ mb: 3 }}>
          Customer Reviews
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Share your experience with Scanified
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 4 }}>
        <Typography variant="body2">
          <strong>Genuine Reviews Only:</strong> We only display verified reviews from real customers. 
          All reviews are verified before publication to ensure authenticity and compliance with FTC guidelines.
        </Typography>
      </Alert>

      <ReviewSystem isAdminView={false} />
    </Container>
  );
} 