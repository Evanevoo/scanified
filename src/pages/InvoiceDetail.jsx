import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { Box, Paper, Typography, Button, Alert, Card, CardContent } from '@mui/material';
import { CardSkeleton } from '../components/SmoothLoading';

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchInvoice() {
      setLoading(true);
      setError('');
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id)
        .single();
      if (error || !data) {
        setError('Invoice not found.');
        setInvoice(null);
      } else {
        setInvoice(data);
      }
      setLoading(false);
    }
    fetchInvoice();
  }, [id]);

  return (
    <Box maxWidth="sm" mx="auto" mt={6}>
      <Paper elevation={4} sx={{ p: 4, borderRadius: 3 }}>
        <Button variant="outlined" onClick={() => navigate(-1)} sx={{ mb: 3 }}>
          ← Back
        </Button>
        <Typography variant="h4" fontWeight={800} color="primary" mb={2}>
          Invoice Detail
        </Typography>
        {loading ? (
          <CardSkeleton count={1} />
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <Box>
            <Typography variant="h6" mb={2}>Invoice #{invoice.id}</Typography>
            <Typography><b>Customer ID:</b> {invoice.customer_id}</Typography>
            <Typography><b>Date:</b> {invoice.date || invoice.invoice_date || '-'}</Typography>
            <Typography><b>Amount:</b> ${invoice.amount || invoice.total_amount || 0}</Typography>
            {/* Add more invoice fields as needed */}
          </Box>
        )}
      </Paper>
    </Box>
  );
} 