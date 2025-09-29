import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert
} from '@mui/material';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';

export default function InventoryManagement() {
  const { organization } = useAuth();
  const [bottles, setBottles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBottles();
  }, [organization]);

  const fetchBottles = async () => {
    if (!organization) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bottles')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setBottles(data || []);
    } catch (err) {
      console.error('Error fetching bottles:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Error loading inventory: {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Inventory Management
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 3 }}>
        Managing {bottles.length} bottles for {organization?.name}
      </Typography>

      <Button 
        variant="contained" 
        onClick={fetchBottles} 
        sx={{ mb: 3 }}
      >
        Refresh
      </Button>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Barcode</TableCell>
              <TableCell>Product Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Created</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bottles.map((bottle) => (
              <TableRow key={bottle.id}>
                <TableCell>{bottle.barcode_number}</TableCell>
                <TableCell>{bottle.product_type}</TableCell>
                <TableCell>{bottle.status}</TableCell>
                <TableCell>{bottle.location || 'Unknown'}</TableCell>
                <TableCell>
                  {bottle.created_at ? new Date(bottle.created_at).toLocaleDateString() : 'N/A'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {bottles.length === 0 && (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography color="text.secondary">
            No bottles found. Add some bottles to get started.
          </Typography>
        </Box>
      )}
    </Box>
  );
}
