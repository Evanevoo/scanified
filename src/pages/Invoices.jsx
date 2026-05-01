import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSubscriptions } from '../context/SubscriptionContext';
import { useTheme } from '../context/ThemeContext';
import { recordPayment } from '../services/subscriptionService';
import { supabase } from '../supabase/client';
import jsPDF from 'jspdf';
import { formatCurrency, formatDate, STATUS_COLORS } from '../utils/subscriptionUtils';
import {
  Box, Typography, Paper, Stack, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, LinearProgress,
  InputAdornment, Chip, Tabs, Tab, Grid, Card, CardContent, Collapse,
  FormControl, InputLabel, Select, MenuItem, Divider, Checkbox,
} from '@mui/material';
import {
  Search as SearchIcon, Refresh as RefreshIcon, Payment as PaymentIcon,
  Visibility as ViewIcon, Email as EmailIcon, Download as DownloadIcon,
  AccountBalance, CheckCircle, Warning, ExpandMore, ExpandLess,
} from '@mui/icons-material';

export default function Invoices() {
  const { organization, user, profile } = useAuth();
  const ctx = useSubscriptions();
  const { organizationColors } = useTheme();
  const primaryColor = organizationColors?.primary || '#40B5AD';

  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [payOpen, setPayOpen] = useState(false);
  const [payInvoice, setPayInvoice] = useState(null);
  const [payForm, setPayForm] = useState({ amount: '', method: '', reference: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailInvoice, setEmailInvoice] = useState(null);
  const [senderOptions, setSenderOptions] = useState([]);
  const [emailForm, setEmailForm] = useState({ to: '', from: '', subject: '', message: '' });
  const [legacyInvoices, setLegacyInvoices] = useState([]);
  const [bulkEmailOpen, setBulkEmailOpen] = useState(false);
  const [bulkEmailing, setBulkEmailing] = useState(false);
  const [bulkSelectedInvoiceIds, setBulkSelectedInvoiceIds] = useState([]);
  const [bulkEmailForm, setBulkEmailForm] = useState({ from: '', subjectTemplate: 'Invoice {invoice_number} from {organization}', message: 'Hello {customer_name},\n\nPlease find your invoice attached.\n\nThank you.' });
  const [bulkResults, setBulkResults] = useState([]);

  useEffect(() => {
    let active = true;
    const loadLegacyInvoices = async () => {
      if (!organization?.id) return;
      try {
        const { data, error: invErr } = await supabase
          .from('invoices')
          .select('*')
          .eq('organization_id', organization.id)
          .order('created_at', { ascending: false });
        if (!active) return;
        if (invErr) {
          if (invErr.code === '42P01') {
            setLegacyInvoices([]);
            return;
          }
          throw invErr;
        }
        setLegacyInvoices(data || []);
      } catch {
        if (active) setLegacyInvoices([]);
      }
    };
    loadLegacyInvoices();
    return () => { active = false; };
  }, [organization?.id, ctx.invoices.length]);

  const tabFilters = ['all', 'draft', 'sent', 'paid', 'overdue', 'void'];
  const getCustomerDisplayName = (invoice) => (
    invoice?.customer?.name
    || invoice?.customer?.Name
    || invoice?.customer?.customer_name
    || invoice?.customer?.CustomerName
    || invoice?.customer?.company_name
    || invoice?.customer?.CompanyName
    || invoice?.customer?.display_name
    || invoice?.customer?.DisplayName
    || invoice?.customer_name
    || invoice?.customer_id
    || ''
  );
  const applyLegacyInvoicePatch = (invoiceId, patch) => {
    setLegacyInvoices((prev) => (prev || []).map((inv) => (
      inv.id === invoiceId ? { ...inv, ...patch } : inv
    )));
  };

  const endOfMonthIso = (value) => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  };

  const enriched = useMemo(() => {
    const source = (ctx.invoices && ctx.invoices.length > 0)
      ? ctx.invoices
      : legacyInvoices.map((inv) => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        customer_id: inv.customer_id,
        customer_name: inv.customer_name,
        customer_email: inv.customer_email,
        period_start: inv.period_start || inv.invoice_date,
        period_end: inv.period_end || inv.invoice_date,
        subtotal: inv.subtotal ?? inv.total_amount ?? 0,
        tax_amount: inv.tax_amount ?? 0,
        total_amount: inv.total_amount ?? 0,
        status: inv.status || 'draft',
        due_date: inv.due_date || endOfMonthIso(inv.period_end || inv.invoice_date || inv.created_at),
        paid_at: inv.paid_at,
        created_at: inv.created_at,
        _sourceTable: 'invoices',
      }));
    return source.map((inv) => {
      const customer = ctx.customers.find((c) => c.id === inv.customer_id || c.CustomerListID === inv.customer_id);
      const sub = ctx.subscriptions.find((s) => s.id === inv.subscription_id);
      const invPayments = inv._sourceTable === 'invoices' ? [] : ctx.payments.filter((p) => p.invoice_id === inv.id);
      const totalPaid = invPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
      const customerFallback = customer ? null : {
        name: inv.customer_name || inv.customer_id,
        Name: inv.customer_name || inv.customer_id,
        email: inv.customer_email || '',
      };
      return { ...inv, customer: customer || customerFallback, subscription: sub, payments: invPayments, totalPaid };
    });
  }, [ctx.invoices, legacyInvoices, ctx.customers, ctx.subscriptions, ctx.payments]);

  const filtered = useMemo(() => {
    let list = enriched;
    const f = tabFilters[tab];
    if (f !== 'all') list = list.filter((i) => i.status === f);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) =>
        getCustomerDisplayName(i).toLowerCase().includes(q) ||
        String(i.invoice_number || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [enriched, tab, search]);

  const outstanding = enriched.filter((i) => i.status !== 'paid' && i.status !== 'void').reduce((s, i) => s + (parseFloat(i.total_amount) || 0), 0);
  const paidThisMonth = (() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return enriched.filter((i) => i.status === 'paid' && new Date(i.paid_at) >= monthStart).reduce((s, i) => s + (parseFloat(i.total_amount) || 0), 0);
  })();
  const overdueCount = enriched.filter((i) => i.status === 'overdue').length;

  const handleMarkPaid = async (inv) => {
    setPayInvoice(inv);
    setPayForm({ amount: inv.total_amount - (inv.totalPaid || 0), method: '', reference: '', notes: '' });
    setPayOpen(true);
  };

  const handleRecordPayment = async () => {
    if (payInvoice?._sourceTable === 'invoices') {
      setError('Payment recording for legacy invoices is not wired to the new payments table yet.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await recordPayment(payInvoice.id, organization.id, parseFloat(payForm.amount), payForm.method, payForm.reference, payForm.notes);
      setPayOpen(false);
      ctx.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkVoid = async (invoiceId) => {
    if (!window.confirm('Void this invoice? This cannot be undone.')) return;
    try {
      const inferredTable = enriched.find((i) => i.id === invoiceId)?._sourceTable === 'invoices' ? 'invoices' : 'subscription_invoices';
      const candidateTables = inferredTable === 'invoices'
        ? ['invoices', 'subscription_invoices']
        : ['subscription_invoices', 'invoices'];

      let updatedTable = null;
      let hadAnyNonMissingError = null;
      for (const table of candidateTables) {
        let query = supabase
          .from(table)
          .update({ status: 'void' })
          .eq('id', invoiceId);
        if (organization?.id) query = query.eq('organization_id', organization.id);
        const { data, error } = await query.select('id').maybeSingle();
        if (error) {
          // Ignore missing-table errors and keep trying fallback table.
          if (!(error.code === '42P01' || error.code === 'PGRST205' || error.status === 404)) {
            hadAnyNonMissingError = error;
          }
          continue;
        }
        if (!data) {
          continue;
        }
        updatedTable = table;
        break;
      }

      if (!updatedTable) {
        throw hadAnyNonMissingError || new Error('Invoice was not updated. It may not exist in either invoice table.');
      }

      if (updatedTable === 'invoices' || inferredTable === 'invoices') {
        applyLegacyInvoicePatch(invoiceId, { status: 'void' });
      }
      setSuccess('Invoice voided.');
      ctx.refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleMarkSent = async (invoiceId) => {
    try {
      const targetTable = enriched.find((i) => i.id === invoiceId)?._sourceTable === 'invoices' ? 'invoices' : 'subscription_invoices';
      let sentQuery = supabase.from(targetTable).update({ status: 'sent' }).eq('id', invoiceId);
      if (organization?.id) sentQuery = sentQuery.eq('organization_id', organization.id);
      const { data, error: err } = await sentQuery.select('id').maybeSingle();
      if (err) throw err;
      if (!data) throw new Error('Invoice not found for this organization.');
      if (targetTable === 'invoices') applyLegacyInvoicePatch(invoiceId, { status: 'sent' });
      setSuccess('Invoice marked sent.');
      ctx.refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const createInvoicePdfBase64 = (inv) => {
    const doc = new jsPDF();
    const customerName = inv.customer?.name || inv.customer?.Name || inv.customer_id || 'Customer';

    doc.setFontSize(16);
    doc.text(`Invoice ${inv.invoice_number || ''}`, 14, 18);
    doc.setFontSize(11);
    doc.text(`Organization: ${organization?.name || ''}`, 14, 28);
    doc.text(`Customer: ${customerName}`, 14, 35);
    doc.text(`Invoice Date: ${formatDate(inv.created_at || inv.invoice_date)}`, 14, 42);
    doc.text(`Period: ${formatDate(inv.period_start)} - ${formatDate(inv.period_end)}`, 14, 49);
    doc.text(`Due Date: ${formatDate(inv.due_date)}`, 14, 56);
    doc.text(`Status: ${inv.status || 'draft'}`, 14, 63);

    doc.setFontSize(12);
    doc.text(`Subtotal: ${formatCurrency(inv.subtotal || 0)}`, 14, 76);
    doc.text(`Tax: ${formatCurrency(inv.tax_amount || 0)}`, 14, 84);
    doc.setFont(undefined, 'bold');
    doc.text(`Total: ${formatCurrency(inv.total_amount || 0)}`, 14, 92);
    doc.setFont(undefined, 'normal');

    return doc.output('datauristring').split(',')[1];
  };

  const openEmailDialog = async (inv) => {
    setError(null);
    setSuccess(null);
    try {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('invoice_emails, default_invoice_email, email')
        .eq('id', organization.id)
        .single();

      const emails = new Set();
      (orgData?.invoice_emails || []).forEach((e) => e && emails.add(e));
      if (orgData?.email) emails.add(orgData.email);
      if (user?.email) emails.add(user.email);
      if (profile?.email) emails.add(profile.email);

      const options = Array.from(emails);
      const defaultFrom = orgData?.default_invoice_email || options[0] || '';
      const customerEmail = inv.customer?.email || inv.customer_email || '';

      setSenderOptions(options);
      setEmailInvoice(inv);
      setEmailForm({
        to: customerEmail,
        from: defaultFrom,
        subject: `Invoice ${inv.invoice_number} from ${organization?.name || 'your organization'}`,
        message: `Hello ${inv.customer?.name || inv.customer?.Name || ''},\n\nPlease find your invoice attached.\n\nThank you.`,
      });
      setEmailOpen(true);
    } catch (err) {
      setError(err.message || 'Unable to open email dialog.');
    }
  };

  const handleSendInvoiceEmail = async () => {
    if (!emailInvoice) return;
    if (!emailForm.to || !emailForm.from) {
      setError('Recipient and sender email are required.');
      return;
    }

    setEmailing(true);
    setError(null);
    setSuccess(null);
    try {
      const pdfBase64 = createInvoicePdfBase64(emailInvoice);
      const pdfFileName = `Invoice_${emailInvoice.invoice_number || emailInvoice.id}.pdf`;
      const bodyHtml = (emailForm.message || '').replace(/\n/g, '<br/>');

      const response = await fetch('/.netlify/functions/send-invoice-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailForm.to,
          from: emailForm.from,
          subject: emailForm.subject,
          body: bodyHtml,
          pdfBase64,
          pdfFileName,
          invoiceNumber: emailInvoice.invoice_number,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || payload?.details || `Email failed (${response.status})`);
      }

      const targetTable = emailInvoice?._sourceTable === 'invoices' ? 'invoices' : 'subscription_invoices';
      await supabase.from(targetTable).update({ status: 'sent' }).eq('id', emailInvoice.id);
      if (targetTable === 'invoices') applyLegacyInvoicePatch(emailInvoice.id, { status: 'sent' });

      setSuccess(`Invoice ${emailInvoice.invoice_number} emailed to ${emailForm.to}.`);
      setEmailOpen(false);
      ctx.refresh();
    } catch (err) {
      setError(err.message || 'Failed to send invoice email.');
    } finally {
      setEmailing(false);
    }
  };

  const sendInvoiceEmailForInvoice = async (invoice, customForm = null) => {
    const form = customForm || {
      to: invoice.customer?.email || invoice.customer_email || '',
      from: emailForm.from,
      subject: emailForm.subject,
      message: emailForm.message,
    };
    if (!form.to || !form.from) {
      throw new Error('Recipient and sender email are required.');
    }

    const pdfBase64 = createInvoicePdfBase64(invoice);
    const pdfFileName = `Invoice_${invoice.invoice_number || invoice.id}.pdf`;
    const bodyHtml = (form.message || '').replace(/\n/g, '<br/>');

    const response = await fetch('/.netlify/functions/send-invoice-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: form.to,
        from: form.from,
        subject: form.subject,
        body: bodyHtml,
        pdfBase64,
        pdfFileName,
        invoiceNumber: invoice.invoice_number,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || payload?.details || `Email failed (${response.status})`);
    }

    const targetTable = invoice?._sourceTable === 'invoices' ? 'invoices' : 'subscription_invoices';
    await supabase.from(targetTable).update({ status: 'sent' }).eq('id', invoice.id);
  };

  const openBulkEmailDialog = async () => {
    setError(null);
    setSuccess(null);
    setBulkResults([]);
    try {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('invoice_emails, default_invoice_email, email')
        .eq('id', organization.id)
        .single();

      const emails = new Set();
      (orgData?.invoice_emails || []).forEach((e) => e && emails.add(e));
      if (orgData?.email) emails.add(orgData.email);
      if (user?.email) emails.add(user.email);
      if (profile?.email) emails.add(profile.email);
      const options = Array.from(emails);
      const defaultFrom = orgData?.default_invoice_email || options[0] || '';
      setSenderOptions(options);
      setBulkEmailForm((prev) => ({ ...prev, from: defaultFrom }));

      const emailable = filtered
        .filter((inv) => (inv.customer?.email || inv.customer_email))
        .map((inv) => inv.id);
      setBulkSelectedInvoiceIds(emailable);
      setBulkEmailOpen(true);
    } catch (err) {
      setError(err.message || 'Unable to open bulk email dialog.');
    }
  };

  const handleBulkEmailSend = async () => {
    if (!bulkEmailForm.from) {
      setError('Sender email is required.');
      return;
    }
    const targets = filtered.filter((inv) => bulkSelectedInvoiceIds.includes(inv.id));
    if (targets.length === 0) {
      setError('Select at least one invoice to email.');
      return;
    }

    setBulkEmailing(true);
    setBulkResults([]);
    setError(null);
    setSuccess(null);

    const results = [];
    for (const inv of targets) {
      const to = inv.customer?.email || inv.customer_email || '';
      const customerName = inv.customer?.name || inv.customer?.Name || inv.customer_name || inv.customer_id || 'Customer';
      const subject = bulkEmailForm.subjectTemplate
        .replace(/\{invoice_number\}/g, inv.invoice_number || '')
        .replace(/\{organization\}/g, organization?.name || 'your organization');
      const message = bulkEmailForm.message
        .replace(/\{customer_name\}/g, customerName)
        .replace(/\{invoice_number\}/g, inv.invoice_number || '')
        .replace(/\{organization\}/g, organization?.name || 'your organization');

      try {
        await sendInvoiceEmailForInvoice(inv, { to, from: bulkEmailForm.from, subject, message });
        results.push({ id: inv.id, invoice: inv.invoice_number, customer: customerName, success: true });
      } catch (err) {
        results.push({ id: inv.id, invoice: inv.invoice_number, customer: customerName, success: false, error: err.message });
      }
      setBulkResults([...results]);
    }

    const ok = results.filter((r) => r.success).length;
    const fail = results.length - ok;
    if (ok > 0) setSuccess(`Bulk email complete: ${ok} sent${fail ? `, ${fail} failed` : ''}.`);
    if (fail > 0 && ok === 0) setError(`Bulk email failed for all ${fail} invoices.`);
    setBulkEmailing(false);
    ctx.refresh();
  };

  const exportCSV = () => {
    const cols = ['Invoice#', 'Customer', 'Period', 'Subtotal', 'Tax', 'Total', 'Status', 'Due Date', 'Paid Date'];
    const rows = filtered.map((i) => [
      i.invoice_number,
      i.customer?.name || i.customer?.Name || i.customer_id,
      `${i.period_start || ''} to ${i.period_end || ''}`,
      i.subtotal,
      i.tax_amount,
      i.total_amount,
      i.status,
      i.due_date || '',
      i.paid_at ? new Date(i.paid_at).toISOString().split('T')[0] : '',
    ]);
    const csv = [cols.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (ctx.loading) {
    return <Box sx={{ p: 4 }}><LinearProgress /><Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>Loading invoices...</Typography></Box>;
  }

  const headerCards = [
    { label: 'Outstanding', value: formatCurrency(outstanding), icon: <AccountBalance />, color: outstanding > 0 ? '#EF4444' : '#10B981' },
    { label: 'Paid This Month', value: formatCurrency(paidThisMonth), icon: <CheckCircle />, color: '#10B981' },
    { label: 'Overdue', value: overdueCount, icon: <Warning />, color: overdueCount > 0 ? '#F59E0B' : '#10B981' },
  ];

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, minHeight: '100%' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Invoices</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>Manage invoices, payments, and billing</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh"><IconButton onClick={ctx.refresh} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}><RefreshIcon /></IconButton></Tooltip>
          <Button variant="outlined" startIcon={<EmailIcon />} onClick={openBulkEmailDialog} sx={{ textTransform: 'none', borderRadius: 2 }}>Bulk Email</Button>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportCSV} sx={{ textTransform: 'none', borderRadius: 2 }}>Export CSV</Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>{success}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {headerCards.map((c, i) => (
          <Grid item xs={12} sm={4} key={i}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase' }}>{c.label}</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>{c.value}</Typography>
                  </Box>
                  <Box sx={{ bgcolor: `${c.color}18`, color: c.color, p: 1, borderRadius: 2, display: 'flex' }}>{c.icon}</Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ px: 2, pt: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.875rem' } }}>
            {tabFilters.map((f) => <Tab key={f} label={f === 'all' ? `All (${enriched.length})` : f.charAt(0).toUpperCase() + f.slice(1)} />)}
          </Tabs>
          <TextField size="small" placeholder="Search invoices..." value={search} onChange={(e) => setSearch(e.target.value)}
            sx={{ ml: 'auto', minWidth: 240, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: 'text.secondary' } }}>
                <TableCell />
                <TableCell>Invoice #</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Period</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>No invoices found.</TableCell></TableRow>
              ) : (
                filtered.map((inv) => (
                  <React.Fragment key={inv.id}>
                    <TableRow hover>
                      <TableCell sx={{ width: 40 }}>
                        <IconButton size="small" onClick={() => setExpandedId(expandedId === inv.id ? null : inv.id)}>
                          {expandedId === inv.id ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                        </IconButton>
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.8rem' }}>{inv.invoice_number}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{getCustomerDisplayName(inv)}</TableCell>
                      <TableCell>{formatDate(inv.period_start)} – {formatDate(inv.period_end)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>{formatCurrency(inv.total_amount)}</TableCell>
                      <TableCell><Chip label={inv.status} size="small" color={STATUS_COLORS[inv.status] || 'default'} sx={{ fontWeight: 600, textTransform: 'capitalize' }} /></TableCell>
                      <TableCell>{formatDate(inv.due_date)}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Tooltip title="Email Invoice">
                            <IconButton size="small" onClick={() => openEmailDialog(inv)}>
                              <EmailIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {inv.status === 'draft' && (
                            <Tooltip title="Mark Sent"><IconButton size="small" onClick={() => handleMarkSent(inv.id)}><CheckCircle fontSize="small" /></IconButton></Tooltip>
                          )}
                          {inv.status !== 'paid' && inv.status !== 'void' && (
                            <Tooltip title="Record Payment"><IconButton size="small" color="success" onClick={() => handleMarkPaid(inv)}><PaymentIcon fontSize="small" /></IconButton></Tooltip>
                          )}
                          {inv.status !== 'void' && inv.status !== 'paid' && (
                            <Tooltip title="Void"><IconButton size="small" color="error" onClick={() => handleMarkVoid(inv.id)}><span style={{ fontSize: '0.75rem', fontWeight: 700 }}>X</span></IconButton></Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={8} sx={{ py: 0, px: 0, borderBottom: expandedId === inv.id ? undefined : 'none' }}>
                        <Collapse in={expandedId === inv.id} unmountOnExit>
                          <Box sx={{ p: 2, bgcolor: 'action.hover' }}>
                            <Grid container spacing={2}>
                              <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Breakdown</Typography>
                                <Stack spacing={0.5}>
                                  <Stack direction="row" justifyContent="space-between"><Typography variant="body2">Subtotal</Typography><Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{formatCurrency(inv.subtotal)}</Typography></Stack>
                                  <Stack direction="row" justifyContent="space-between"><Typography variant="body2">Tax ({inv.tax_code || 'GST+PST'})</Typography><Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{formatCurrency(inv.tax_amount)}</Typography></Stack>
                                  <Divider />
                                  <Stack direction="row" justifyContent="space-between"><Typography variant="body2" sx={{ fontWeight: 700 }}>Total</Typography><Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{formatCurrency(inv.total_amount)}</Typography></Stack>
                                  <Stack direction="row" justifyContent="space-between"><Typography variant="body2">Paid</Typography><Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'success.main' }}>{formatCurrency(inv.totalPaid)}</Typography></Stack>
                                </Stack>
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Payment History</Typography>
                                {inv.payments.length === 0 ? (
                                  <Typography variant="body2" color="text.secondary">No payments recorded.</Typography>
                                ) : (
                                  inv.payments.map((p) => (
                                    <Stack key={p.id} direction="row" justifyContent="space-between" sx={{ py: 0.5 }}>
                                      <Typography variant="body2">{formatDate(p.payment_date)} {p.payment_method ? `(${p.payment_method})` : ''}</Typography>
                                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{formatCurrency(p.amount)}</Typography>
                                    </Stack>
                                  ))
                                )}
                              </Grid>
                            </Grid>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Record Payment Dialog */}
      <Dialog open={payOpen} onClose={() => setPayOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Record Payment</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">Invoice: {payInvoice?.invoice_number} — Total: {formatCurrency(payInvoice?.total_amount)}</Typography>
            <TextField size="small" label="Amount" type="number" value={payForm.amount} onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))} inputProps={{ min: 0, step: 0.01 }} />
            <TextField size="small" label="Payment Method" value={payForm.method} onChange={(e) => setPayForm((p) => ({ ...p, method: e.target.value }))} placeholder="e.g. cheque, e-transfer, cash" />
            <TextField size="small" label="Reference #" value={payForm.reference} onChange={(e) => setPayForm((p) => ({ ...p, reference: e.target.value }))} />
            <TextField size="small" label="Notes" value={payForm.notes} onChange={(e) => setPayForm((p) => ({ ...p, notes: e.target.value }))} multiline rows={2} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPayOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleRecordPayment} disabled={saving || !payForm.amount} sx={{ textTransform: 'none', bgcolor: primaryColor }}>
            {saving ? 'Recording...' : 'Record Payment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Email Invoice Dialog */}
      <Dialog open={emailOpen} onClose={() => setEmailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Email Invoice</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Invoice: {emailInvoice?.invoice_number} — Total: {formatCurrency(emailInvoice?.total_amount || 0)}
            </Typography>
            <TextField
              size="small"
              label="Recipient (To)"
              type="email"
              value={emailForm.to}
              onChange={(e) => setEmailForm((p) => ({ ...p, to: e.target.value }))}
              required
            />
            <FormControl size="small" fullWidth>
              <InputLabel>Sender (From)</InputLabel>
              <Select
                value={emailForm.from}
                label="Sender (From)"
                onChange={(e) => setEmailForm((p) => ({ ...p, from: e.target.value }))}
              >
                {senderOptions.map((email) => (
                  <MenuItem key={email} value={email}>{email}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              size="small"
              label="Subject"
              value={emailForm.subject}
              onChange={(e) => setEmailForm((p) => ({ ...p, subject: e.target.value }))}
            />
            <TextField
              size="small"
              label="Message"
              value={emailForm.message}
              onChange={(e) => setEmailForm((p) => ({ ...p, message: e.target.value }))}
              multiline
              rows={4}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEmailOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSendInvoiceEmail}
            disabled={emailing || !emailForm.to || !emailForm.from}
            sx={{ textTransform: 'none', bgcolor: primaryColor }}
          >
            {emailing ? 'Sending...' : 'Send Invoice'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Email Dialog */}
      <Dialog open={bulkEmailOpen} onClose={() => setBulkEmailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Bulk Email Invoices</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Select invoices from the current filtered list and send in bulk.
            </Typography>
            <FormControl size="small" fullWidth>
              <InputLabel>Sender (From)</InputLabel>
              <Select
                value={bulkEmailForm.from}
                label="Sender (From)"
                onChange={(e) => setBulkEmailForm((p) => ({ ...p, from: e.target.value }))}
              >
                {senderOptions.map((email) => (
                  <MenuItem key={email} value={email}>{email}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              size="small"
              label="Subject Template"
              value={bulkEmailForm.subjectTemplate}
              onChange={(e) => setBulkEmailForm((p) => ({ ...p, subjectTemplate: e.target.value }))}
              helperText="Placeholders: {invoice_number}, {organization}"
            />
            <TextField
              size="small"
              label="Message Template"
              value={bulkEmailForm.message}
              onChange={(e) => setBulkEmailForm((p) => ({ ...p, message: e.target.value }))}
              multiline
              rows={4}
              helperText="Placeholders: {customer_name}, {invoice_number}, {organization}"
            />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Invoices ({filtered.length})</Typography>
            <Box sx={{ maxHeight: 280, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
              {filtered.map((inv) => {
                const email = inv.customer?.email || inv.customer_email || '';
                const checked = bulkSelectedInvoiceIds.includes(inv.id);
                return (
                  <Stack key={inv.id} direction="row" alignItems="center" spacing={1} sx={{ py: 0.5 }}>
                    <Checkbox
                      size="small"
                      checked={checked}
                      disabled={!email}
                      onChange={(e) => {
                        setBulkSelectedInvoiceIds((prev) => (
                          e.target.checked ? [...prev, inv.id] : prev.filter((id) => id !== inv.id)
                        ));
                      }}
                    />
                    <Typography variant="body2" sx={{ minWidth: 120, fontFamily: 'monospace' }}>{inv.invoice_number}</Typography>
                    <Typography variant="body2" sx={{ flex: 1 }}>{inv.customer?.name || inv.customer?.Name || inv.customer_name || inv.customer_id}</Typography>
                    <Typography variant="caption" color={email ? 'text.secondary' : 'error.main'}>
                      {email || 'No email'}
                    </Typography>
                  </Stack>
                );
              })}
            </Box>
            {bulkResults.length > 0 && (
              <Box sx={{ maxHeight: 180, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                {bulkResults.map((r) => (
                  <Typography key={r.id} variant="caption" sx={{ display: 'block', color: r.success ? 'success.main' : 'error.main' }}>
                    {r.success ? 'Sent' : 'Failed'} — {r.invoice} ({r.customer}){r.error ? `: ${r.error}` : ''}
                  </Typography>
                ))}
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setBulkEmailOpen(false)} sx={{ textTransform: 'none' }}>Close</Button>
          <Button
            variant="contained"
            onClick={handleBulkEmailSend}
            disabled={bulkEmailing || bulkSelectedInvoiceIds.length === 0}
            sx={{ textTransform: 'none', bgcolor: primaryColor }}
          >
            {bulkEmailing ? 'Sending...' : `Send ${bulkSelectedInvoiceIds.length} Emails`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
