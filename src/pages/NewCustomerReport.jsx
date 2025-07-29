import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { TableSkeleton } from '../components/SmoothLoading';

export default function NewCustomerReport() {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setCustomers([]); // TODO: Replace with real fetch
      setLoading(false);
    }, 1200);
  }, []);

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" fontWeight={700} mb={3}>New Customer Report</Typography>
      {loading ? (
        <TableSkeleton rows={4} columns={5} />
      ) : customers.length === 0 ? (
        <Card sx={{ mt: 4 }}><CardContent>No new customers found.</CardContent></Card>
      ) : (
        <div> {/* Render customers here */} </div>
      )}
    </Box>
  );
} 