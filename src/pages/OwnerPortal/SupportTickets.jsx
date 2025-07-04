import React from 'react';
import { Box, Typography, Alert } from '@mui/material';

export default function SupportTickets() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Support Tickets
      </Typography>
      <Alert severity="info" sx={{ mt: 3 }}>
        No support tickets to display.
      </Alert>
    </Box>
  );
} 