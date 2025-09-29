import React from 'react';
import { Box, Typography, Button } from '@mui/material';

export default function SimpleTestComponent() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Simple Test Component
      </Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        If you can see this, Material-UI is working correctly.
      </Typography>
      <Button variant="contained" color="primary">
        Test Button
      </Button>
    </Box>
  );
}
