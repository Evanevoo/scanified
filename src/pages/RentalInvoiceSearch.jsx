import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Card, CardContent, Alert } from '@mui/material';
import { TableSkeleton } from '../components/SmoothLoading';

export default function RentalInvoiceSearch() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    // Simulate async fetch
    setLoading(true);
    setTimeout(() => {
      // TODO: Replace with real fetch from Supabase
      setInvoices([]); // Empty for now
      setLoading(false);
    }, 1200);
  }, []);

  return (
    <Box sx={{ p: 4 }}>
      <button onClick={() => navigate(-1)} className="mb-4 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded">Back</button>
      <Typography variant="h4" fontWeight={700} mb={3}>Rental Invoice Search</Typography>
      <Card>
        <CardContent>
          {loading ? (
            <TableSkeleton rows={5} columns={4} />
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : invoices.length === 0 ? (
            <Alert severity="info">No rental invoices found.</Alert>
          ) : (
            <div>/* Render rental invoice search results here */</div>
          )}
        </CardContent>
      </Card>
    </Box>
  );
} 