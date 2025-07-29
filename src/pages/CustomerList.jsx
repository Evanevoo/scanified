import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Skeleton, Table, TableBody, TableCell, TableRow, Alert } from '@mui/material';
import { TableSkeleton } from '../components/SmoothLoading';

export default function CustomerList() {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    // Simulate async fetch
    setLoading(true);
    setTimeout(() => {
      // TODO: Replace with real fetch from Supabase
      setCustomers([]); // Empty for now
      setLoading(false);
    }, 1200);
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight={700} mb={3}>Customer List</Typography>
      <Card>
        <CardContent>
          {loading ? (
            <TableSkeleton rows={5} columns={3} />
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : customers.length === 0 ? (
            <Alert severity="info">No customers found.</Alert>
          ) : (
            <Table>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>{customer.name}</TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>{customer.phone}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Box>
  );
} 