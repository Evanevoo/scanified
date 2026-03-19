import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Alert,
  Chip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Email as EmailIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import { getNextInvoiceNumbers } from '../utils/invoiceUtils';
import { buildYearlyInvoiceData, buildYearlyInvoicePdf } from '../utils/yearlyInvoicePdf';
import logger from '../utils/logger';

export default function SendYearlyLeaseEmails() {
  const { organization, user, profile } = useAuth();
  const [rows, setRows] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [emailOverrides, setEmailOverrides] = useState({});
  const [senderEmail, setSenderEmail] = useState('');
  const [invoiceEmails, setInvoiceEmails] = useState([]);
  const [customMessage, setCustomMessage] = useState('');
  const [invoiceTemplate, setInvoiceTemplate] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [agreementsRes, customersRes] = await Promise.all([
        supabase
          .from('lease_agreements')
          .select('*')
          .eq('organization_id', organization.id)
          .eq('status', 'active')
          .in('billing_frequency', ['annual', 'yearly', 'annually']),
        supabase
          .from('customers')
          .select('id, name, CustomerListID, email')
          .eq('organization_id', organization.id)
          .order('name'),
      ]);
      if (agreementsRes.error) throw agreementsRes.error;
      if (customersRes.error) throw customersRes.error;
      const agreements = agreementsRes.data || [];
      const custList = customersRes.data || [];
      setCustomers(custList);

      const byCustomerId = custList.reduce((acc, c) => {
        const id = (c.CustomerListID || '').toString().trim();
        if (id) acc[id] = c;
        if (c.name) acc[c.name.trim().toLowerCase()] = c;
        return acc;
      }, {});

      const merged = agreements.map((ag) => {
        const cust = byCustomerId[ag.customer_id] || byCustomerId[(ag.customer_name || '').trim().toLowerCase()];
        return {
          ...ag,
          customer: cust || {
            name: ag.customer_name,
            CustomerListID: ag.customer_id,
            email: null,
          },
        };
      });
      setRows(merged);
    } catch (err) {
      logger.error('SendYearlyLeaseEmails fetch error:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!organization?.id) return;
    const loadOrgSettings = async () => {
      let emails = [];
      let defaultSender = '';
      try {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('invoice_emails, default_invoice_email, email')
          .eq('id', organization.id)
          .single();
        if (orgData?.invoice_emails && Array.isArray(orgData.invoice_emails)) {
          emails = orgData.invoice_emails;
        } else if (orgData?.email) {
          emails = [orgData.email];
        }
        defaultSender = orgData?.default_invoice_email || orgData?.email || '';
      } catch (e) {
        logger.error('Load org settings:', e);
      }
      // Always include logged-in user's email so sender is never empty
      if (user?.email) emails = [...new Set([user.email, ...emails])];
      if (profile?.email) emails = [...new Set([profile.email, ...emails])];
      const filtered = emails.filter(Boolean);
      setInvoiceEmails(filtered);
      setSenderEmail(prev => defaultSender || user?.email || profile?.email || filtered[0] || prev || '');

      if (organization?.name) {
        const savedTemplate = localStorage.getItem(`invoiceTemplate_${organization.id}`);
        if (savedTemplate) {
          try {
            setInvoiceTemplate(JSON.parse(savedTemplate));
          } catch (_) {
            setInvoiceTemplate({
              primary_color: '#000000',
              payment_terms: 'Net 30',
              email_subject: `Your yearly lease invoice from ${organization.name}`,
              email_body: 'Please find your yearly lease invoice attached.',
            });
          }
        } else {
          setInvoiceTemplate({
            primary_color: '#000000',
            payment_terms: 'Net 30',
            email_subject: `Your yearly lease invoice from ${organization.name}`,
            email_body: 'Please find your yearly lease invoice attached.',
          });
        }
      }
    };
    loadOrgSettings();
  }, [organization?.id, organization?.name, user?.email, profile?.email, rows.length]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelected(new Set(rows.map((_, i) => i)));
    } else {
      setSelected(new Set());
    }
  };

  const handleSelectOne = (index) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleEmailOverride = (index, value) => {
    setEmailOverrides((prev) => ({ ...prev, [index]: value }));
  };

  const getRecipientEmail = (row, index) => {
    return emailOverrides[index] ?? row.customer?.email ?? '';
  };

  const selectedRows = rows.filter((_, i) => selected.has(i));
  const selectedWithEmail = selectedRows.filter((_, i) => {
    const idx = rows.findIndex((r) => r === selectedRows[i]);
    const row = selectedRows[i];
    const email = getRecipientEmail(row, rows.indexOf(row));
    return email && email.includes('@');
  });

  const handleSendSelected = async () => {
    if (selectedWithEmail.length === 0) {
      setError('Select at least one row and ensure each has a valid email address.');
      return;
    }
    const fromEmail = senderEmail || user?.email || profile?.email;
    if (!fromEmail) {
      setError('Please select a sender email in Settings or use your account email.');
      return;
    }
    setSending(true);
    setError(null);
    setResults([]);
    setProgress({ current: 0, total: selectedWithEmail.length });

    const template = invoiceTemplate || {
      primary_color: '#000000',
      payment_terms: 'Net 30',
      email_subject: `Your yearly lease invoice from ${organization.name}`,
      email_body: 'Please find your yearly lease invoice attached.',
    };

    const resList = [];
    for (let i = 0; i < selectedWithEmail.length; i++) {
      const row = selectedWithEmail[i];
      const rowIndex = rows.indexOf(row);
      const toEmail = getRecipientEmail(row, rowIndex);
      const customer = row.customer || { name: row.customer_name, CustomerListID: row.customer_id, email: toEmail };

      try {
        const { data: rentalsByCid } = await supabase
          .from('rentals')
          .select('*')
          .eq('organization_id', organization.id)
          .is('rental_end_date', null)
          .eq('customer_id', row.customer_id);
        let rentals = rentalsByCid || [];
        if (rentals.length === 0 && row.customer_name) {
          const { data: rentalsByName } = await supabase
            .from('rentals')
            .select('*')
            .eq('organization_id', organization.id)
            .is('rental_end_date', null)
            .eq('customer_name', row.customer_name);
          rentals = rentalsByName || [];
        }
        const taxRate = 0.11;
        const invoiceDateStr = new Date().toISOString().split('T')[0];
        const invoiceData = buildYearlyInvoiceData(customer, rentals, row, invoiceDateStr, taxRate);

        if (!invoiceData) {
          resList.push({ customer: customer.name, success: false, error: 'No rental data for yearly invoice' });
          setProgress((p) => ({ ...p, current: p.current + 1 }));
          continue;
        }

        const [invoiceNumber] = await getNextInvoiceNumbers(organization.id, 1);
        if (!invoiceNumber) {
          resList.push({ customer: customer.name, success: false, error: 'Could not get invoice number' });
          setProgress((p) => ({ ...p, current: p.current + 1 }));
          continue;
        }

        const doc = buildYearlyInvoicePdf(customer, rentals, row, organization, template, invoiceData, invoiceNumber, invoiceDateStr);
        const pdfBase64 = doc.output('base64');
        const pdfFileName = `Invoice_${invoiceNumber}_${invoiceDateStr}.pdf`;

        const periodStart = invoiceData.billingPeriodStart instanceof Date
          ? invoiceData.billingPeriodStart.toISOString().split('T')[0]
          : invoiceDateStr;
        const periodEnd = invoiceData.billingPeriodEnd instanceof Date
          ? invoiceData.billingPeriodEnd.toISOString().split('T')[0]
          : invoiceDateStr;

        const { data: invoiceRecord, error: invErr } = await supabase
          .from('invoices')
          .insert({
            organization_id: organization.id,
            customer_id: customer.CustomerListID,
            customer_name: customer.name,
            customer_email: toEmail,
            invoice_number: invoiceNumber,
            invoice_date: invoiceDateStr,
            period_start: periodStart,
            period_end: periodEnd,
            subtotal: invoiceData.subtotal,
            tax_amount: invoiceData.taxAmount,
            total_amount: invoiceData.total,
            rental_days: invoiceData.rentalDays,
            cylinders_count: rentals.length,
            email_sent: false,
          })
          .select()
          .single();

        if (invErr) {
          resList.push({ customer: customer.name, success: false, error: invErr.message });
          setProgress((p) => ({ ...p, current: p.current + 1 }));
          continue;
        }

        const lineItems = invoiceData.rentals.map((rental) => ({
          invoice_id: invoiceRecord.id,
          item_description: rental.product_code || rental.product_type || 'Cylinder',
          barcode: rental.bottle_barcode || null,
          serial_number: rental.serial_number || null,
          quantity: 1,
          rental_days: invoiceData.rentalDays,
          daily_rate: (rental.monthlyRate || 0) / 30,
          line_total: rental.lineTotal,
        }));
        await supabase.from('invoice_line_items').insert(lineItems);

        const subject = (template.email_subject || `Invoice ${invoiceNumber} from ${organization.name}`)
          .replace(/{company_name}/g, organization.name)
          .replace(/{invoice_number}/g, invoiceNumber)
          .replace(/{customer_name}/g, customer.name);
        const body = (template.email_body || 'Please find your invoice attached.')
          .replace(/{company_name}/g, organization.name)
          .replace(/{invoice_number}/g, invoiceNumber)
          .replace(/{customer_name}/g, customer.name)
          .replace(/{total_amount}/g, `$${invoiceData.total.toFixed(2)}`)
          + (customMessage ? `<br/><br/>${customMessage.replace(/\n/g, '<br/>')}` : '');

        const emailRes = await fetch('/.netlify/functions/send-invoice-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: toEmail,
            from: fromEmail,
            subject,
            body,
            pdfBase64,
            pdfFileName,
            invoiceNumber,
          }),
        });

        if (!emailRes.ok) {
          const errData = await emailRes.json().catch(() => ({}));
          resList.push({ customer: customer.name, success: false, error: errData.error || emailRes.statusText });
        } else {
          await supabase
            .from('invoices')
            .update({ email_sent: true, email_sent_at: new Date().toISOString() })
            .eq('id', invoiceRecord.id);
          resList.push({ customer: customer.name, success: true, invoiceNumber });
        }
      } catch (err) {
        logger.error('Send yearly email error:', err);
        resList.push({ customer: (row.customer || {}).name || row.customer_name, success: false, error: err.message });
      }
      setProgress((p) => ({ ...p, current: p.current + 1 }));
      setResults([...resList]);
    }

    setSending(false);
    setProgress({ current: 0, total: 0 });
    setSelected(new Set());
  };

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>Loading yearly lease agreements…</Typography>
        <LinearProgress sx={{ mt: 2 }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, mb: 3, borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.08)', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button startIcon={<ArrowBackIcon />} component={Link} to="/lease-agreements" sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none' }}>
            Back
          </Button>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em' }}>Send Yearly Lease Agreement Emails</Typography>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={0} sx={{ mb: 2, p: 2, borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
        <FormControl size="small" sx={{ minWidth: 280, mr: 2 }}>
          <InputLabel>Sender email</InputLabel>
          <Select
            value={senderEmail || (user?.email || profile?.email || '')}
            label="Sender email"
            onChange={(e) => setSenderEmail(e.target.value)}
            displayEmpty
          >
            {[...new Set([senderEmail || user?.email || profile?.email, ...invoiceEmails].filter(Boolean))].map((em) => (
              <MenuItem key={em} value={em}>{em}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small"
          label="Custom message (optional)"
          multiline
          rows={2}
          value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          sx={{ minWidth: 300, mt: 1 }}
          placeholder="Added to the end of the email body"
        />
      </Paper>

      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f8fafc' }}>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selected.size > 0 && selected.size < rows.length}
                  checked={rows.length > 0 && selected.size === rows.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Agreement #</TableCell>
              <TableCell>End date</TableCell>
              <TableCell>Annual amount</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No active yearly lease agreements.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => {
                const email = getRecipientEmail(row, index);
                const hasEmail = email && email.includes('@');
                return (
                  <TableRow key={row.id}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selected.has(index)}
                        onChange={() => handleSelectOne(index)}
                      />
                    </TableCell>
                    <TableCell>{row.customer_name || row.customer?.name}</TableCell>
                    <TableCell>{row.agreement_number || '—'}</TableCell>
                    <TableCell>{row.end_date ? new Date(row.end_date).toLocaleDateString() : '—'}</TableCell>
                    <TableCell>
                      {row.annual_amount != null ? `$${Number(row.annual_amount).toFixed(2)}` : '—'}
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="email"
                        value={email}
                        onChange={(e) => handleEmailOverride(index, e.target.value)}
                        placeholder="Email address"
                        sx={{ minWidth: 220 }}
                        error={selected.has(index) && !hasEmail}
                      />
                    </TableCell>
                    <TableCell>
                      {results.find((r) => r.customer === (row.customer_name || row.customer?.name))?.success ? (
                        <Chip icon={<CheckCircleIcon />} label="Sent" color="success" size="small" />
                      ) : results.find((r) => r.customer === (row.customer_name || row.customer?.name)) ? (
                        <Chip icon={<ErrorIcon />} label="Failed" color="error" size="small" />
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {sending && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress variant="determinate" value={progress.total ? (progress.current / progress.total) * 100 : 0} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Sending {progress.current} of {progress.total}…
          </Typography>
        </Box>
      )}

      <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Button
          variant="contained"
          startIcon={<EmailIcon />}
          onClick={handleSendSelected}
          disabled={sending || selectedWithEmail.length === 0}
          sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none' }}
        >
          Send selected ({selectedWithEmail.length})
        </Button>
        {results.some((r) => !r.success) && (
          <Typography variant="body2" color="error">
            {results.filter((r) => !r.success).length} failed. Check email addresses and sender configuration.
          </Typography>
        )}
      </Box>
    </Box>
  );
}
