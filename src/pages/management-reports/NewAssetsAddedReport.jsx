import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Card, CardContent, Alert } from '@mui/material';
import { TableSkeleton } from '../../components/SmoothLoading';

export default function NewAssetsAddedReport() {
  const [loading, setLoading] = useState(true);
  const [newAssets, setNewAssets] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setNewAssets([]);
      setLoading(false);
    }, 1200);
  }, []);

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, bgcolor: '#f8fafc', minHeight: '100%' }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 2,
          border: '1px solid rgba(15, 23, 42, 0.08)',
          background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 55%, #f8fafc 100%)',
          mb: 2,
        }}
      >
        <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: -0.5, color: '#0f172a' }}>
          New assets added
        </Typography>
      </Paper>
      <Card
        elevation={0}
        sx={{
          borderRadius: 2,
          border: '1px solid rgba(15, 23, 42, 0.08)',
          boxShadow: '0 2px 12px rgba(15, 23, 42, 0.04)',
        }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          {loading ? (
            <TableSkeleton rows={5} columns={4} />
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : newAssets.length === 0 ? (
            <Alert severity="info">No new assets found.</Alert>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Table view coming soon.
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
