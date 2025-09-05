import React from 'react';
import { Box, Typography, Alert } from '@mui/material';

export default function TestSimpleComponent() {
  console.log('🧪 TestSimpleComponent: Rendering...');
  
  return (
    <Box sx={{ p: 3, bgcolor: 'red', minHeight: '100vh' }}>
      <Typography variant="h1" color="white">
        🧪 TEST COMPONENT WORKS!
      </Typography>
      <Alert severity="success" sx={{ mt: 2 }}>
        If you see this red screen, components CAN render!
      </Alert>
    </Box>
  );
}
