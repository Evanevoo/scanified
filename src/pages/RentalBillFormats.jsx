import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Card, CardContent } from '@mui/material';
import { Receipt as ReceiptIcon } from '@mui/icons-material';

export default function RentalBillFormats() {
  const navigate = useNavigate();
  return (
    <Box sx={{ p: 4 }}>
      <Button onClick={() => navigate(-1)} sx={{ mb: 2 }} variant="outlined">Back</Button>
      <Typography variant="h5" fontWeight="bold" mb={3}>Rental Bill Formats</Typography>
      <Card>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 6 }}>
          <ReceiptIcon sx={{ fontSize: 48, color: 'action.disabled' }} />
          <Box>
            <Typography variant="body1" color="text.secondary">
              Bill formats control how rental charges appear on invoices — layout, line items, taxes, and summaries.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Coming soon — configure custom bill formats for your organization.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
} 