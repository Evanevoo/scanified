import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Card, CardContent } from '@mui/material';
import { AttachMoney as MoneyIcon } from '@mui/icons-material';

export default function FlatFees() {
  const navigate = useNavigate();
  return (
    <Box sx={{ p: 4 }}>
      <Button onClick={() => navigate(-1)} sx={{ mb: 2 }} variant="outlined">Back</Button>
      <Typography variant="h5" fontWeight="bold" mb={3}>Flat Fees</Typography>
      <Card>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 6 }}>
          <MoneyIcon sx={{ fontSize: 48, color: 'action.disabled' }} />
          <Box>
            <Typography variant="body1" color="text.secondary">
              Flat fees are fixed charges applied per customer or per order, independent of rental quantity.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Coming soon — define and manage flat fee rules for your rental billing.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
} 