import React from 'react';
import { Box, Paper, Typography } from '@mui/material';

export default function MovementBetweenLocationsReport() {
  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, bgcolor: '#f8fafc', minHeight: '100%' }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 2,
          border: '1px solid rgba(15, 23, 42, 0.08)',
          background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 55%, #f8fafc 100%)',
        }}
      >
        <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: -0.5, color: '#0f172a' }}>
          Movement between locations
        </Typography>
      </Paper>
    </Box>
  );
}
