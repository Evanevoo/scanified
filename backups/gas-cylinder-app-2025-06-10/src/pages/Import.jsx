import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, Button, Stack } from '@mui/material';

export default function Import() {
  const navigate = useNavigate();
  return (
    <Box maxWidth="sm" mx="auto" mt={10}>
      <Paper elevation={4} sx={{ p: 5, borderRadius: 4 }}>
        <Typography variant="h4" fontWeight={800} color="primary" mb={4} align="center">
          Import Data
        </Typography>
        <Stack direction="row" spacing={4} justifyContent="center" mb={5}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            sx={{ px: 5, py: 2, fontWeight: 600, fontSize: 18, borderRadius: 2, boxShadow: 2 }}
            onClick={() => navigate('/import-invoices')}
          >
            Import Invoices
          </Button>
          <Button
            variant="contained"
            color="success"
            size="large"
            sx={{ px: 5, py: 2, fontWeight: 600, fontSize: 18, borderRadius: 2, boxShadow: 2 }}
            onClick={() => navigate('/import-sales-receipts')}
          >
            Import Sales Receipts
          </Button>
        </Stack>
        <Typography color="text.secondary" align="center" fontSize={15}>
          Choose which type of data you want to import. Each import page supports advanced mapping, validation, preview, and error logging.
        </Typography>
      </Paper>
    </Box>
  );
} 