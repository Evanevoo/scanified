import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Button, Stack } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';

export default function QuickAdd() {
  const navigate = useNavigate();
  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, mb: 3, borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.08)', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' }}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
            variant="outlined"
            sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none' }}
          >
            Back
          </Button>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em' }}>
            Quick Add
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
