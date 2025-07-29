import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Card, CardContent, Alert } from '@mui/material';
import { TableSkeleton } from '../../components/SmoothLoading';

export default function NegativeBalanceReport() {
  const [loading, setLoading] = useState(true);
  const [negativeBalances, setNegativeBalances] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    // Simulate async fetch
    setLoading(true);
    setTimeout(() => {
      // TODO: Replace with real fetch from Supabase
      setNegativeBalances([]); // Empty for now
      setLoading(false);
    }, 1200);
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fff', py: 8, borderRadius: 0, overflow: 'visible' }}>
      <Paper elevation={0} sx={{ width: '100%', p: { xs: 2, md: 5 }, borderRadius: 0, boxShadow: '0 2px 12px 0 rgba(16,24,40,0.04)', border: '1px solid #eee', bgcolor: '#fff', overflow: 'visible' }}>
        <Typography variant="h3" fontWeight={900} color="primary" mb={2} sx={{ letterSpacing: -1 }}>Negative Balance Report</Typography>
        <Card>
          <CardContent>
            {loading ? (
              <TableSkeleton rows={5} columns={4} />
            ) : error ? (
              <Alert severity="error">{error}</Alert>
            ) : negativeBalances.length === 0 ? (
              <Alert severity="info">No negative balances found.</Alert>
            ) : (
              <div>/* Render negative balances table here */</div>
            )}
          </CardContent>
        </Card>
      </Paper>
    </Box>
  );
} 