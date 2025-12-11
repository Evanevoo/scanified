import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Alert,
  Box,
  CircularProgress
} from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import { supabase } from '../supabase/client';
import logger from '../utils/logger';

export default function DNSConversionDialog({ dnsRental, customerId, customerName, onConverted }) {
  const [open, setOpen] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    if (!loading) {
      setOpen(false);
      setBarcode('');
      setError(null);
      setSuccess(false);
    }
  };

  const handleConvert = async () => {
    if (!barcode.trim()) {
      setError('Please enter a barcode');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Find the bottle by barcode
      const { data: bottles, error: bottleError } = await supabase
        .from('bottles')
        .select('*')
        .eq('barcode_number', barcode.trim())
        .limit(1);

      if (bottleError) throw bottleError;

      if (!bottles || bottles.length === 0) {
        setError(`Bottle with barcode "${barcode.trim()}" not found. Please ensure the bottle exists in the system.`);
        setLoading(false);
        return;
      }

      const bottle = bottles[0];

      // Check if bottle is already assigned to a different customer
      if (bottle.assigned_customer && bottle.assigned_customer !== customerId) {
        setError(`Bottle ${barcode.trim()} is already assigned to customer ${bottle.customer_name || bottle.assigned_customer}. Please unassign it first.`);
        setLoading(false);
        return;
      }

      // Update the bottle to assign it to this customer
      const { error: updateError } = await supabase
        .from('bottles')
        .update({
          assigned_customer: customerId,
          customer_name: customerName,
          status: 'RENTED',
          rental_start_date: dnsRental.rental_start_date || new Date().toISOString().split('T')[0]
        })
        .eq('id', bottle.id);

      if (updateError) throw updateError;

      // Update the DNS+ rental record to link it to the actual bottle
      const updateData = {
        bottle_id: bottle.id,
        bottle_barcode: bottle.barcode_number
      };

      // Try to update DNS+ specific fields if they exist
      try {
        updateData.is_dns = false;
        updateData.dns_product_code = null;
        updateData.dns_description = null;
        updateData.dns_order_number = null;
      } catch (e) {
        // Columns may not exist - that's okay
      }

      const { error: rentalUpdateError } = await supabase
        .from('rentals')
        .update(updateData)
        .eq('id', dnsRental.id);

      if (rentalUpdateError) {
        // If error is due to missing columns, try without DNS+ specific fields
        if (rentalUpdateError.message && rentalUpdateError.message.includes('column')) {
          const { error: retryError } = await supabase
            .from('rentals')
            .update({
              bottle_id: bottle.id,
              bottle_barcode: bottle.barcode_number
            })
            .eq('id', dnsRental.id);
          if (retryError) {
            logger.warn('Error updating DNS+ rental record:', retryError);
          }
        } else {
          logger.warn('Error updating DNS+ rental record:', rentalUpdateError);
        }
        // Don't throw - bottle is already assigned, which is the main goal
      }

      logger.log(`✅ Converted DNS+ record to bottle ${bottle.barcode_number}`);
      setSuccess(true);
      
      // Wait a moment to show success message
      setTimeout(() => {
        handleClose();
        if (onConverted) onConverted();
      }, 1000);

    } catch (err) {
      logger.error('Error converting DNS+ record:', err);
      setError(err.message || 'Failed to convert DNS+ record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        color="warning"
        size="small"
        startIcon={<QrCodeScannerIcon />}
        onClick={handleOpen}
      >
        Convert to Bottle
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          Convert DNS+ to Actual Bottle
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Product: <strong>{dnsRental.dns_product_code || 'N/A'}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Description: {dnsRental.dns_description || 'N/A'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Order: {dnsRental.dns_order_number || 'N/A'}
            </Typography>
          </Box>

          <TextField
            autoFocus
            margin="dense"
            label="Bottle Barcode"
            fullWidth
            variant="outlined"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !loading) {
                handleConvert();
              }
            }}
            disabled={loading}
            placeholder="Scan or enter barcode"
            sx={{ mt: 2 }}
          />

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Successfully converted DNS+ record to bottle {barcode.trim()}!
            </Alert>
          )}

          <Alert severity="info" sx={{ mt: 2 }}>
            Enter the barcode of the actual bottle that was delivered. The DNS+ record will be converted to a regular rental record linked to this bottle.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleConvert}
            variant="contained"
            color="primary"
            disabled={loading || !barcode.trim()}
            startIcon={loading ? <CircularProgress size={20} /> : <QrCodeScannerIcon />}
          >
            {loading ? 'Converting...' : 'Convert'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
