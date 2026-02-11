import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Card, CardContent } from '@mui/material';
import { Assignment as AssignmentIcon } from '@mui/icons-material';

export default function RentalClasses() {
  const navigate = useNavigate();
  return (
    <Box sx={{ p: 4 }}>
      <Button onClick={() => navigate(-1)} sx={{ mb: 2 }} variant="outlined">Back</Button>
      <Typography variant="h5" fontWeight="bold" mb={3}>Rental Classes</Typography>
      <Card>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 6 }}>
          <AssignmentIcon sx={{ fontSize: 48, color: 'action.disabled' }} />
          <Box>
            <Typography variant="body1" color="text.secondary">
              Rental classes define pricing tiers and grouping for rental assets. Configure classes within each rental class group.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Coming soon — connect rental classes to your class groups and asset types.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
} 