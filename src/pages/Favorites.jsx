import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Button } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';

export default function Favorites() {
  const navigate = useNavigate();
  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 3 },
          mb: 3,
          borderRadius: 3,
          border: '1px solid rgba(15, 23, 42, 0.08)',
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        }}
      >
        <Button
          onClick={() => navigate(-1)}
          startIcon={<ArrowBackIcon />}
          sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none', mb: 2 }}
        >
          Back
        </Button>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em' }}>
          Favorites
        </Typography>
      </Paper>
    </Box>
  );
}
