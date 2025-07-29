import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Alert } from '@mui/material';
import { TableSkeleton } from '../../components/SmoothLoading';

export default function LostAssetsReport() {
  const [loading, setLoading] = useState(true);
  const [lostAssets, setLostAssets] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    // Simulate async fetch
    setLoading(true);
    setTimeout(() => {
      // TODO: Replace with real fetch from Supabase
      setLostAssets([]); // Empty for now
      setLoading(false);
    }, 1200);
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight={700} mb={3}>Lost Assets</Typography>
      <Card>
        <CardContent>
          {loading ? (
            <TableSkeleton rows={5} columns={4} />
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : lostAssets.length === 0 ? (
            <Alert severity="info">No lost assets found.</Alert>
          ) : (
            <div>/* Render lost assets table here */</div>
          )}
        </CardContent>
      </Card>
    </Box>
  );
} 