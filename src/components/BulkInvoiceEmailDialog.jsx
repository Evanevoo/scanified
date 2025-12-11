import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box,
  Typography, Checkbox, Alert, CircularProgress, LinearProgress,
  FormControlLabel, TextField, List, ListItem, ListItemText, ListItemIcon,
  Chip, Divider
} from '@mui/material';
import { 
  Email as EmailIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';
import logger from '../utils/logger';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function BulkInvoiceEmailDialog({ open, onClose, customers }) {
  const { organization, user, profile } = useAuth();
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState([]);
  const [invoiceTemplate, setInvoiceTemplate] = useState(null);
  const [formData, setFormData] = useState({
    invoice_date: new Date().toISOString().split('T')[0],
    period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    period_end: new Date().toISOString().split('T')[0],
    custom_message: ''
  });

  useEffect(() => {
    if (open && organization) {
      // Load invoice template
      try {
        const savedTemplate = localStorage.getItem(`invoiceTemplate_${organization.id}`);
        if (savedTemplate) {
          setInvoiceTemplate(JSON.parse(savedTemplate));
        } else {
          setInvoiceTemplate({
            primary_color: '#000000',
            secondary_color: '#666666',
            tax_rate: 0.11,
            payment_terms: 'CREDIT CARD',
            email_subject: `Your Invoice from ${organization.name}`,
            email_body: 'Please find your invoice attached.'
          });
        }
      } catch (error) {
        logger.error('Error loading invoice template:', error);
      }

      // Select all customers by default
      if (customers && customers.length > 0) {
        setSelectedCustomers(customers.map(c => c.customer?.CustomerListID || c.CustomerListID).filter(Boolean));
      }
    }
  }, [open, organization, customers]);

  const handleToggleCustomer = (customerId) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCustomers.length === customers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(customers.map(c => c.customer?.CustomerListID || c.CustomerListID).filter(Boolean));
    }
  };

  const generateInvoiceForCustomer = async (customerData) => {
    const customer = customerData.customer || customerData;
    const rentals = customerData.rentals || [];

    if (!rentals || rentals.length === 0) {
      return { success: false, error: 'No active rentals' };
    }

    try {
      // Calculate invoice data (simplified version of InvoiceGenerator logic)
      const startDate = new Date(formData.period_start);
      const endDate = new Date(formData.period_end);
      const startMonth = startDate.getMonth();
      const startYear = startDate.getFullYear();
      const endMonth = endDate.getMonth();
      const endYear = endDate.getFullYear();
      const rentalMonths = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
      const monthlyRate = 10;
      const numBottles = rentals.length;
      const subtotal = numBottles * monthlyRate * rentalMonths;
      
      // Get tax rate from location
      let taxRate = invoiceTemplate?.tax_rate || 0.11;
      if (rentals[0]?.location) {
        const { data: locationData } = await supabase
          .from('locations')
          .select('total_tax_rate')
          .eq('name', rentals[0].location)
          .eq('organization_id', organization.id)
          .single();
        if (locationData) {
          taxRate = locationData.total_tax_rate / 100;
        }
      }
      
      const taxAmount = subtotal * taxRate;
      const total = subtotal + taxAmount;

      // Generate invoice number
      let invoiceNumber = null;
      let invoiceSettings;
      try {
        let { data: settingsData, error: settingsError } = await supabase
          .from('invoice_settings')
          .select('invoice_prefix, next_invoice_number')
          .eq('organization_id', organization.id)
          .single();

        if (settingsError && settingsError.code === 'PGRST116') {
          // No settings exist, create default
          const { data: newSettings, error: createError } = await supabase
            .from('invoice_settings')
            .insert({
              organization_id: organization.id,
              invoice_prefix: 'W',
              next_invoice_number: 1
            })
            .select()
            .single();
          
          if (createError) {
            throw new Error('Failed to create invoice settings: ' + createError.message);
          }
          settingsData = newSettings;
        } else if (settingsError) {
          throw new Error('Failed to fetch invoice settings: ' + settingsError.message);
        }

        invoiceSettings = settingsData;
        const prefix = invoiceSettings?.invoice_prefix || 'W';
        const nextNumber = invoiceSettings?.next_invoice_number || 1;
        
        // Ensure we have a valid number (if it's null or 0, start from 1)
        const validNumber = nextNumber > 0 ? nextNumber : 1;
        
        // Format: W00001, W00002, etc. (5 digits)
        invoiceNumber = `${prefix}${String(validNumber).padStart(5, '0')}`;
        
        logger.log(`Generated invoice number: ${invoiceNumber} (next number was: ${validNumber})`);

        // Increment invoice number BEFORE saving invoice
        const { error: updateError } = await supabase
          .from('invoice_settings')
          .update({ next_invoice_number: validNumber + 1 })
          .eq('organization_id', organization.id);
        
        if (updateError) {
          logger.error('Failed to increment invoice number:', updateError);
          // Non-critical, continue with invoice generation, but log error
        }
      } catch (settingsErr) {
        logger.error('Error with invoice settings:', settingsErr);
        throw new Error('Failed to generate invoice number: ' + settingsErr.message);
      }

      // Generate PDF (simplified - you may want to extract the full PDF generation logic)
      const doc = new jsPDF();
      doc.setFillColor(0, 0, 0);
      doc.rect(0, 0, 210, 20, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.text('INVOICE', 105, 12, { align: 'center' });

      // Add company info, customer info, invoice details, etc.
      // (This is simplified - you should use the full PDF generation from InvoiceGenerator)

      // Get PDF as base64
      const pdfBase64 = doc.output('base64');
      const pdfFileName = `Invoice_${invoiceNumber}_${formData.invoice_date}.pdf`;

      // Save invoice to database
      logger.log(`Saving invoice ${invoiceNumber} for customer ${customer.name}...`);
      const { data: invoiceRecord, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          organization_id: organization.id,
          customer_id: customer.CustomerListID,
          customer_name: customer.name,
          customer_email: customer.email,
          invoice_number: invoiceNumber,
          invoice_date: formData.invoice_date,
          period_start: formData.period_start,
          period_end: formData.period_end,
          subtotal,
          tax_amount: taxAmount,
          total_amount: total,
          rental_days: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)),
          cylinders_count: numBottles
        })
        .select()
        .single();

      if (invoiceError) {
        logger.error(`Failed to save invoice ${invoiceNumber} for ${customer.name}:`, invoiceError);
        throw new Error('Failed to save invoice: ' + invoiceError.message);
      }

      // Ensure we have the invoice number from the record (fallback)
      const finalInvoiceNumber = invoiceNumber || invoiceRecord.invoice_number;
      if (!finalInvoiceNumber) {
        logger.error(`No invoice number found for customer ${customer.name} - invoiceNumber: ${invoiceNumber}, record: ${invoiceRecord.invoice_number}`);
        throw new Error('Invoice number is missing after saving invoice');
      }
      
      logger.log(`Invoice ${finalInvoiceNumber} saved successfully for customer ${customer.name}. Invoice ID: ${invoiceRecord.id}`);

      // Save line items
      logger.log(`Saving ${rentals.length} line items for invoice ${finalInvoiceNumber}...`);
      for (const rental of rentals) {
        const { error: lineItemError } = await supabase
          .from('invoice_line_items')
          .insert({
            invoice_id: invoiceRecord.id,
            item_description: rental.product_code || rental.product_type || rental.description || 'Cylinder',
            barcode: rental.barcode || rental.bottles?.barcode_number || rental.bottle_barcode,
            serial_number: rental.serial_number || rental.bottles?.serial_number,
            quantity: 1,
            rental_days: rental.daysHeld || rental.bottles?.days_at_location || rental.days_at_location || 0,
            monthly_rate: monthlyRate,
            line_total: monthlyRate * rentalMonths
          });
        
        if (lineItemError) {
          logger.warn(`Failed to save line item for invoice ${finalInvoiceNumber}:`, lineItemError);
          // Non-critical, continue
        }
      }
      logger.log(`Line items saved for invoice ${finalInvoiceNumber}`);

      // Send email if customer has email
      if (customer.email) {
        const emailSubject = (invoiceTemplate?.email_subject || `Invoice ${finalInvoiceNumber} from ${organization.name}`)
          .replace('{company_name}', organization.name);
        
        const emailBody = (invoiceTemplate?.email_body || 'Please find your invoice attached.')
          .replace('{company_name}', organization.name)
          .replace('{invoice_number}', finalInvoiceNumber)
          .replace('{customer_name}', customer.name)
          .replace('{total_amount}', `$${total.toFixed(2)}`)
          + (formData.custom_message ? `<br/><br/>${formData.custom_message.replace(/\n/g, '<br/>')}` : '');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        try {
          // Get the current user's email from Supabase auth to ensure we always have it
          let senderEmail = user?.email || profile?.email || organization?.email;
          if (!senderEmail) {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            senderEmail = authUser?.email;
          }
          
          if (!senderEmail) {
            throw new Error('Unable to determine sender email. Please ensure you are logged in.');
          }

          const emailResponse = await fetch('/.netlify/functions/send-invoice-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: customer.email,
              from: senderEmail,
              subject: emailSubject,
              body: emailBody,
              pdfBase64,
              pdfFileName,
              invoiceNumber: finalInvoiceNumber
            }),
            signal: controller.signal
          }).finally(() => clearTimeout(timeoutId));

          if (!emailResponse.ok) {
            const errorText = await emailResponse.text();
            throw new Error(`Email failed: ${errorText}`);
          }

          // Update invoice as sent
          await supabase
            .from('invoices')
            .update({ email_sent: true, email_sent_at: new Date().toISOString() })
            .eq('id', invoiceRecord.id);

          logger.log(`Invoice ${finalInvoiceNumber} sent successfully to ${customer.email} for customer ${customer.name}`);
          return { 
            success: true, 
            invoiceNumber: finalInvoiceNumber, 
            email: customer.email,
            customer: customer
          };
        } catch (emailError) {
          logger.error('Email error for customer:', customer.name, emailError);
          logger.log(`Invoice ${finalInvoiceNumber} was created but email failed for customer ${customer.name}`);
          return { 
            success: false, 
            error: 'Email failed: ' + emailError.message, 
            invoiceNumber: finalInvoiceNumber,
            customer: customer
          };
        }
      } else {
        logger.warn(`Customer ${customer.name} has no email address. Invoice ${finalInvoiceNumber} was created but not sent.`);
        return { 
          success: false, 
          error: 'No email address', 
          invoiceNumber: finalInvoiceNumber,
          customer: customer
        };
      }
    } catch (error) {
      logger.error('Error generating invoice for customer:', customer.name, error);
      // Always include invoiceNumber if it was generated before the error
      return { 
        success: false, 
        error: error.message,
        invoiceNumber: invoiceNumber || undefined,
        customer: customer
      };
    }
  };

  const handleBulkEmail = async () => {
    if (selectedCustomers.length === 0) {
      alert('Please select at least one customer');
      return;
    }

    setLoading(true);
    setProcessing(true);
    setResults([]);
    
    const customersToProcess = customers.filter(c => {
      const id = c.customer?.CustomerListID || c.CustomerListID;
      return selectedCustomers.includes(id);
    });

    setProgress({ current: 0, total: customersToProcess.length });

    const batchResults = [];
    
    // Process in batches of 5 to avoid overwhelming the system
    const BATCH_SIZE = 5;
    for (let i = 0; i < customersToProcess.length; i += BATCH_SIZE) {
      const batch = customersToProcess.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(async (customerData) => {
        const result = await generateInvoiceForCustomer(customerData);
        setProgress(prev => ({ ...prev, current: prev.current + 1 }));
        return {
          customer: customerData.customer || customerData,
          ...result
        };
      });

      const batchResultsData = await Promise.all(batchPromises);
      batchResults.push(...batchResultsData);
      setResults([...batchResults]);

      // Small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < customersToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setLoading(false);
    setProcessing(false);
  };

  const customersToShow = customers || [];
  const selectedCount = selectedCustomers.length;
  const customersWithEmail = customersToShow.filter(c => {
    const customer = c.customer || c;
    return customer.email && selectedCustomers.includes(customer.CustomerListID);
  }).length;
  const customersWithoutEmail = selectedCount - customersWithEmail;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <EmailIcon />
          <Typography variant="h6">Bulk Email Invoices</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        {!processing ? (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              Select customers to email invoices to. Only customers with email addresses will receive emails.
            </Alert>

            <Box mb={2}>
              <TextField
                fullWidth
                type="date"
                label="Invoice Date"
                value={formData.invoice_date}
                onChange={(e) => setFormData(prev => ({ ...prev, invoice_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2 }}
              />
              <Box display="flex" gap={2}>
                <TextField
                  fullWidth
                  type="date"
                  label="Period Start"
                  value={formData.period_start}
                  onChange={(e) => setFormData(prev => ({ ...prev, period_start: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  fullWidth
                  type="date"
                  label="Period End"
                  value={formData.period_end}
                  onChange={(e) => setFormData(prev => ({ ...prev, period_end: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Custom Message (optional)"
                value={formData.custom_message}
                onChange={(e) => setFormData(prev => ({ ...prev, custom_message: e.target.value }))}
                sx={{ mt: 2 }}
                placeholder="This message will be added to all emails"
              />
            </Box>

            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1">
                {selectedCount} of {customersToShow.length} customers selected
              </Typography>
              <Button size="small" onClick={handleSelectAll}>
                {selectedCount === customersToShow.length ? 'Deselect All' : 'Select All'}
              </Button>
            </Box>

            {customersWithoutEmail > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {customersWithoutEmail} selected customer(s) don't have email addresses and will be skipped.
              </Alert>
            )}

            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              <List>
                {customersToShow.map((customerData, index) => {
                  const customer = customerData.customer || customerData;
                  const customerId = customer.CustomerListID;
                  const isSelected = selectedCustomers.includes(customerId);
                  const hasEmail = !!customer.email;
                  const rentalCount = customerData.rentals?.length || 0;

                  return (
                    <React.Fragment key={customerId || index}>
                      <ListItem>
                        <ListItemIcon>
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleToggleCustomer(customerId)}
                            disabled={rentalCount === 0}
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography>{customer.name}</Typography>
                              {!hasEmail && <Chip label="No Email" size="small" color="warning" />}
                              {rentalCount === 0 && <Chip label="No Rentals" size="small" color="error" />}
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {customer.email || 'No email address'}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {rentalCount} active rental(s)
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < customersToShow.length - 1 && <Divider />}
                    </React.Fragment>
                  );
                })}
              </List>
            </Box>
          </>
        ) : (
          <Box>
            <Typography variant="h6" gutterBottom>
              Processing Invoices...
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={(progress.current / progress.total) * 100} 
              sx={{ mb: 2 }}
            />
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {progress.current} of {progress.total} customers processed
            </Typography>

            {results.length > 0 && (
              <Box sx={{ mt: 3, maxHeight: 400, overflow: 'auto' }}>
                <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                  Results ({results.length} processed):
                </Typography>
                {results.map((result, index) => (
                  <Box 
                    key={index} 
                    display="flex" 
                    alignItems="flex-start" 
                    gap={1.5} 
                    mb={1.5}
                    p={1.5}
                    sx={{ 
                      bgcolor: result.success ? 'success.light' : 'error.light',
                      borderRadius: 1,
                      border: `1px solid ${result.success ? 'success.main' : 'error.main'}`
                    }}
                  >
                    {result.success ? (
                      <CheckCircleIcon color="success" fontSize="small" sx={{ mt: 0.5 }} />
                    ) : (
                      <ErrorIcon color="error" fontSize="small" sx={{ mt: 0.5 }} />
                    )}
                    <Box flex={1}>
                      <Typography variant="body2" fontWeight="medium">
                        {result.customer.name}
                      </Typography>
                      {result.success ? (
                        <Typography variant="body2" color="text.secondary">
                          ✅ Invoice <strong>{result.invoiceNumber || 'N/A'}</strong> sent to {result.email}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="error">
                          ❌ {result.error}
                          {result.invoiceNumber ? (
                            <span> (Invoice <strong>{result.invoiceNumber}</strong> was created but email failed)</span>
                          ) : (
                            <span> (No invoice was created)</span>
                          )}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={processing}>
          {processing ? 'Processing...' : 'Cancel'}
        </Button>
        {!processing && (
          <Button
            variant="contained"
            onClick={handleBulkEmail}
            disabled={selectedCount === 0 || loading}
            startIcon={loading ? <CircularProgress size={20} /> : <EmailIcon />}
          >
            Send Invoices ({selectedCount})
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

