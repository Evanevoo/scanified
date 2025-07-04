import React from 'react';
import { Box, Typography, Alert } from '@mui/material';

export default function SecurityEvents() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Security Events
      </Typography>
      <Alert severity="info" sx={{ mt: 3 }}>
        No security events to display.
      </Alert>
    </Box>
  );
} 