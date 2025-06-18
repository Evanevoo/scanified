import React from 'react';
import { Box, Paper, Typography } from '@mui/material';

export default function QuickMapReport() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fff', py: 8, borderRadius: 0, overflow: 'visible' }}>
      <Paper elevation={0} sx={{ width: '100%', p: { xs: 2, md: 5 }, borderRadius: 0, boxShadow: '0 2px 12px 0 rgba(16,24,40,0.04)', border: '1px solid #eee', bgcolor: '#fff', overflow: 'visible' }}>
        <Typography variant="h3" fontWeight={900} color="primary" mb={2} sx={{ letterSpacing: -1 }}>Quick Map Report</Typography>
        <p>This will show a quick map visualization of assets or deliveries.</p>
      </Paper>
    </Box>
  );
} 