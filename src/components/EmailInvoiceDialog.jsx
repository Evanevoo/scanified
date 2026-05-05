import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Stack, Typography, FormControl,
  InputLabel, Select, MenuItem, Chip, Box,
} from '@mui/material';

function EmailInvoiceDialog({
  open,
  onClose,
  onSend,
  sending,
  emailRow,
  senderOptions,
  initialForm,
  primaryColor,
}) {
  const [form, setForm] = useState({ to: '', from: '', subject: '', message: '' });
  const [recipientInput, setRecipientInput] = useState('');
  const [recipients, setRecipients] = useState([]);

  useEffect(() => {
    if (open && initialForm) {
      setForm(initialForm);
      const initial = String(initialForm.to || '').trim();
      if (initial) {
        setRecipients(initial.split(',').map((e) => e.trim()).filter(Boolean));
      } else {
        setRecipients([]);
      }
      setRecipientInput('');
    }
  }, [open, initialForm]);

  const addRecipient = useCallback((raw) => {
    const emails = String(raw || '')
      .split(/[,;\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e && e.includes('@'));
    if (emails.length === 0) return;
    setRecipients((prev) => {
      const existing = new Set(prev.map((e) => e.toLowerCase()));
      const next = [...prev];
      for (const email of emails) {
        if (!existing.has(email)) {
          next.push(email);
          existing.add(email);
        }
      }
      return next;
    });
    setRecipientInput('');
  }, []);

  const handleRecipientKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === 'Tab' || e.key === ',') {
      e.preventDefault();
      addRecipient(recipientInput);
    }
  }, [recipientInput, addRecipient]);

  const handleRecipientBlur = useCallback(() => {
    if (recipientInput.trim()) {
      addRecipient(recipientInput);
    }
  }, [recipientInput, addRecipient]);

  const removeRecipient = useCallback((email) => {
    setRecipients((prev) => prev.filter((e) => e !== email));
  }, []);

  const handleSend = useCallback(() => {
    let finalRecipients = [...recipients];
    if (recipientInput.trim()) {
      const extra = String(recipientInput)
        .split(/[,;\s]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e && e.includes('@'));
      const existing = new Set(finalRecipients.map((e) => e.toLowerCase()));
      for (const email of extra) {
        if (!existing.has(email)) {
          finalRecipients.push(email);
          existing.add(email);
        }
      }
    }
    onSend({ ...form, to: finalRecipients.join(', ') });
  }, [form, recipients, recipientInput, onSend]);

  const customerLabel =
    emailRow?.customer?.name || emailRow?.customer?.Name || emailRow?.customer_id || '—';

  const hasRecipients = recipients.length > 0 || (recipientInput.trim() && recipientInput.includes('@'));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Email Invoice</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Customer: {customerLabel}
          </Typography>
          <Box>
            {recipients.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                {recipients.map((email) => (
                  <Chip
                    key={email}
                    label={email}
                    size="small"
                    onDelete={() => removeRecipient(email)}
                    sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                  />
                ))}
              </Box>
            )}
            <TextField
              size="small"
              fullWidth
              label={recipients.length > 0 ? 'Add another recipient' : 'Recipient (To)'}
              placeholder="Type email and press Enter"
              value={recipientInput}
              onChange={(e) => setRecipientInput(e.target.value)}
              onKeyDown={handleRecipientKeyDown}
              onBlur={handleRecipientBlur}
              helperText="Press Enter, Tab, or comma to add multiple recipients"
            />
          </Box>
          <FormControl size="small" fullWidth>
            <InputLabel>Sender (From)</InputLabel>
            <Select
              value={form.from}
              label="Sender (From)"
              onChange={(e) => setForm((p) => ({ ...p, from: e.target.value }))}
            >
              {(senderOptions || []).map((email) => (
                <MenuItem key={email} value={email}>{email}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            size="small"
            label="Subject"
            value={form.subject}
            onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
          />
          <TextField
            size="small"
            label="Message"
            value={form.message}
            onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
            multiline
            rows={10}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSend}
          disabled={sending || !hasRecipients || !form.from}
          sx={{ textTransform: 'none', bgcolor: primaryColor, '&:hover': { bgcolor: primaryColor, opacity: 0.9 } }}
        >
          {sending
            ? 'Sending...'
            : recipients.length > 1
              ? `Send to ${recipients.length} recipients`
              : 'Send Invoice'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default React.memo(EmailInvoiceDialog);
