import logger from '../utils/logger';
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Stack,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';

export default function UserInvites() {
  const { profile, organization } = useAuth();
  const [invites, setInvites] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingAction, setSendingAction] = useState(null); // 'generate' | 'send'
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'user'
  });

  useEffect(() => {
    if (organization?.id) {
      fetchInvites();
      fetchRoles();
    }
  }, [organization]);

  const fetchInvites = async () => {
    try {
      // Fetch invites
      const { data: invitesData, error: invitesError } = await supabase
        .from('organization_invites')
        .select('*')
        .eq('organization_id', organization.id)
        .is('accepted_at', null)
        .order('invited_at', { ascending: false });

      if (invitesError) throw invitesError;

      // Fetch join codes and match them to invites by email and role
      const { data: codesData } = await supabase
        .from('organization_join_codes')
        .select('code, assigned_role, notes, expires_at')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString());

      // Match codes to invites (codes with notes containing the email)
      const invitesWithCodes = (invitesData || []).map(invite => {
        const matchingCode = (codesData || []).find(code => 
          code.notes && code.notes.includes(invite.email) &&
          code.assigned_role === invite.role
        );
        return {
          ...invite,
          join_code: matchingCode?.code || null
        };
      });

      setInvites(invitesWithCodes);
    } catch (err) {
      logger.error('Error fetching invites:', err);
      setError('Failed to load invites');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setRoles(data || []);
    } catch (err) {
      logger.error('Error fetching roles:', err);
    }
  };

  const handleSendInvite = async (generateLinkOnly = false) => {
    if (!inviteForm.email || !inviteForm.role) {
      setError('Please fill in all fields');
      return;
    }

    setSending(true);
    setSendingAction(generateLinkOnly ? 'generate' : 'send');
    setError('');
    setSuccess('');

    try {
      // Normalize email to lowercase for consistent database queries
      const normalizedEmail = inviteForm.email.trim().toLowerCase();
      
      if (!normalizedEmail || !normalizedEmail.includes('@')) {
        setError('Please enter a valid email address');
        setSending(false);
        return;
      }

      // Create invite
      const { data: user } = await supabase.auth.getUser();
      
      const { data: tokenData, error: inviteError } = await supabase.rpc(
        'create_user_invite',
        {
          p_organization_id: organization.id,
          p_email: normalizedEmail,
          p_role: inviteForm.role,
          p_invited_by: user.user?.id
        }
      );

      if (inviteError) {
        throw inviteError;
      }

      // RPC may return token as string or as object (e.g. { invite_token: "..." })
      const token = typeof tokenData === 'string'
        ? tokenData
        : (tokenData?.invite_token ?? tokenData?.[0]?.invite_token ?? (Array.isArray(tokenData) && tokenData[0] ? tokenData[0] : null));
      if (!token) {
        throw new Error('Invite was created but no invite token was returned. Please copy the link from the table below.');
      }

      const inviteLink = `${window.location.origin}/accept-invite?token=${token}`;
      if (generateLinkOnly) {
        await navigator.clipboard.writeText(inviteLink);
        setSuccess(`Invitation link generated and copied to clipboard. Share it with ${normalizedEmail}. Expires in 7 days.`);
        setInviteForm({ email: '', role: 'user' });
        setShowDialog(false);
        fetchInvites();
        setSending(false);
        setSendingAction(null);
        return;
      }

      // Also create a join code for this invite
      let joinCode = null;
      try {
        const { data: codeData, error: codeError } = await supabase.rpc(
          'create_organization_join_code',
          {
            p_organization_id: organization.id,
            p_created_by: user.user?.id,
            p_expires_hours: 168, // 7 days (same as invite)
            p_max_uses: 1,
            p_assigned_role: inviteForm.role,
            p_notes: `Invite for ${normalizedEmail}`
          }
        );

        if (!codeError && codeData && codeData.length > 0) {
          joinCode = codeData[0].join_code;
          logger.log('✅ Join code created:', joinCode);
        }
      } catch (codeErr) {
        logger.warn('Failed to create join code (optional):', codeErr);
        // Don't fail the invite if code creation fails
      }

      // Try to send email
      try {
        const emailResponse = await fetch('/.netlify/functions/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: normalizedEmail,
            subject: `You're invited to join ${organization.name}`,
            template: 'invite',
            data: {
              inviteLink,
              organizationName: organization.name,
              inviterName: profile.name || profile.email,
              joinCode: joinCode // Include code in email if available
            }
          })
        });

        if (!emailResponse.ok) {
          // Try to parse error response, but handle empty responses
          let errorMessage = 'Unknown error';
          let errorDetails = '';
          try {
            const errorData = await emailResponse.json();
            errorMessage = errorData.error || errorData.message || 'Email service unavailable';
            errorDetails = errorData.details || '';
            
            // Provide actionable error messages
            if (errorMessage.includes('Email service not configured')) {
              errorMessage = '❌ Email service not configured in Netlify. ';
              errorMessage += 'Go to Netlify Dashboard → Site Settings → Environment Variables and add:\n';
              errorMessage += '• SMTP2GO_USER, SMTP2GO_PASSWORD, SMTP2GO_FROM (recommended)\n';
              errorMessage += 'OR\n';
              errorMessage += '• EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM (Gmail - use App Password)';
            } else if (errorMessage.includes('connection failed') || errorMessage.includes('SMTP')) {
              errorMessage = `❌ Email connection failed: ${errorDetails || errorMessage}\n\n`;
              errorMessage += 'Check:\n';
              errorMessage += '1. Email credentials are correct in Netlify environment variables\n';
              errorMessage += '2. For Gmail: Use an App Password, not your regular password\n';
              errorMessage += '3. Check Netlify function logs for detailed error messages';
            }
          } catch (parseError) {
            errorMessage = `Email service returned status ${emailResponse.status}. Check Netlify function logs for details.`;
          }
          logger.error('Email sending failed:', errorMessage, errorDetails);
          throw new Error(errorMessage + (errorDetails ? '\n\nDetails: ' + errorDetails : ''));
        }

        // Email sent successfully
        const responseData = await emailResponse.json();
        logger.log('Invitation email sent successfully to:', normalizedEmail, responseData);
        
        if (joinCode) {
          setSuccess(`✅ Invite sent to ${normalizedEmail}! Code: ${joinCode} (also copied to clipboard)`);
          navigator.clipboard.writeText(joinCode);
        } else {
          setSuccess(`✅ Invite sent to ${normalizedEmail}!`);
        }
      } catch (emailError) {
        logger.warn('Email failed:', emailError);
        const errorMsg = emailError.message || 'Unknown error';
        if (joinCode) {
          setSuccess(`✅ Invite created! Code: ${joinCode} (copied to clipboard). Email service unavailable - share the code or link manually.`);
          navigator.clipboard.writeText(joinCode);
        } else {
          setSuccess(`✅ Invite created! Email service unavailable - copy the link from the table below.`);
        }
        // Log the error for debugging
        logger.error('Email sending error details:', errorMsg);
      }

      // Reset form and refresh
      setInviteForm({ email: '', role: 'user' });
      setShowDialog(false);
      fetchInvites();

    } catch (err) {
      logger.error('Error sending invite:', err);
      setError(err.message || 'Failed to send invite');
    } finally {
      setSending(false);
      setSendingAction(null);
    }
  };

  const handleDeleteInvite = async (inviteId) => {
    if (!confirm('Delete this invite?')) return;

    try {
      const { error } = await supabase
        .from('organization_invites')
        .delete()
        .eq('id', inviteId);

      if (error) throw error;
      
      setSuccess('Invite deleted');
      fetchInvites();
    } catch (err) {
      logger.error('Error deleting invite:', err);
      setError('Failed to delete invite');
    }
  };

  const copyInviteLink = (token) => {
    const link = `${window.location.origin}/accept-invite?token=${token}`;
    navigator.clipboard.writeText(link);
    setSuccess('Invite link copied to clipboard!');
  };

  if (loading) {
    return (
      <Container sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight="bold">
          User Invitations
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowDialog(true)}
        >
          Send Invite
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Invited</TableCell>
              <TableCell>Expires</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invites.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="text.secondary" sx={{ py: 4 }}>
                    No pending invites
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              invites.map((invite) => (
                <TableRow key={invite.id}>
                  <TableCell>{invite.email}</TableCell>
                  <TableCell>
                    <Chip label={invite.role} size="small" />
                  </TableCell>
                  <TableCell>
                    {invite.join_code ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                          {invite.join_code}
                        </Typography>
                        <Tooltip title="Copy code">
                          <IconButton
                            size="small"
                            onClick={() => {
                              navigator.clipboard.writeText(invite.join_code);
                              setSuccess(`Code ${invite.join_code} copied!`);
                            }}
                          >
                            <CopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Link only
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(invite.invited_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {new Date(invite.expires_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {new Date(invite.expires_at) < new Date() ? (
                      <Chip label="Expired" size="small" color="error" />
                    ) : (
                      <Chip label="Pending" size="small" color="warning" />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Copy invite link">
                      <IconButton
                        size="small"
                        onClick={() => copyInviteLink(invite.invite_token)}
                      >
                        <CopyIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete invite">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteInvite(invite.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Send Invite Dialog */}
      <Dialog open={showDialog} onClose={() => setShowDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Send User Invitation</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={inviteForm.email}
              onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value.toLowerCase().trim() })}
              placeholder="user@example.com"
            />

            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={inviteForm.role}
                label="Role"
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
              >
                {roles.map((role) => (
                  <MenuItem key={role.id} value={role.name}>
                    {role.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Alert severity="info">
              An invitation link will be sent to this email address. The link expires in 7 days.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDialog(false)}>Cancel</Button>
          <Button
            variant="outlined"
            onClick={() => handleSendInvite(true)}
            disabled={sending}
            startIcon={sending && sendingAction === 'generate' ? <CircularProgress size={20} /> : <CopyIcon />}
          >
            {sending && sendingAction === 'generate' ? 'Generating...' : 'Generate link'}
          </Button>
          <Button
            variant="contained"
            onClick={() => handleSendInvite(false)}
            disabled={sending}
            startIcon={sending && sendingAction === 'send' ? <CircularProgress size={20} /> : <EmailIcon />}
          >
            {sending && sendingAction === 'send' ? 'Sending...' : 'Send Invite'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}


