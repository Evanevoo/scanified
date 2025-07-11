import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, CardActions,
  Button, Chip, IconButton, TextField, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Alert, CircularProgress, Avatar, Tooltip, Badge,
  FormControl, InputLabel, Select, MenuItem, Container,
  Snackbar
} from '@mui/material';
import {
  People as PeopleIcon,
  Email as EmailIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Copy as CopyIcon
} from '@mui/icons-material';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';

export default function UserInvites() {
  const { profile } = useAuth();
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialog, setInviteDialog] = useState(false);
  const [newInvite, setNewInvite] = useState({
    email: '',
    role: 'user'
  });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedToken, setCopiedToken] = useState('');
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    if (profile?.role === 'owner') {
      fetchInvites();
      fetchRoles();
    }
  }, [profile]);

  const fetchInvites = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('organization_invites')
        .select(`
          *,
          invited_by:profiles!organization_invites_invited_by_fkey(full_name, email)
        `)
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvites(data || []);
    } catch (error) {
      console.error('Error fetching invites:', error);
      setError('Failed to load invites: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name');

      if (error) throw error;
      setRoles(data || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
      setError('Failed to load roles: ' + error.message);
    }
  };

  const handleCreateInvite = async () => {
    if (!newInvite.email || !newInvite.role) {
      setError('Please fill in all fields');
      return;
    }

    setInviteLoading(true);
    setError('');

    try {
      // Check if email already exists in the organization
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('organization_id', profile.organization_id)
        .eq('email', newInvite.email)
        .single();

      if (existingUser) {
        throw new Error('This email is already registered in your organization');
      }

      // Check if email is already registered with any other organization
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('email, organization_id, organizations(name)')
        .eq('email', newInvite.email)
        .single();

      if (existingProfile && existingProfile.organization_id && existingProfile.organization_id !== profile.organization_id) {
        throw new Error(`This email (${newInvite.email}) is already registered with organization "${existingProfile.organizations?.name}". Each email can only be associated with one organization. Please use a different email address.`);
      }

      // Check if there's already a pending invite for this email
      const { data: existingInvite } = await supabase
        .from('organization_invites')
        .select('id')
        .eq('organization_id', profile.organization_id)
        .eq('email', newInvite.email)
        .is('accepted_at', null)
        .single();

      if (existingInvite) {
        throw new Error('An invite has already been sent to this email');
      }

      // Create the invite using the database function
      const { data, error } = await supabase.rpc('create_organization_invite', {
        p_organization_id: profile.organization_id,
        p_email: newInvite.email,
        p_role: newInvite.role,
        p_expires_in_days: 7
      });

      if (error) throw error;

      setSuccess(`Invite sent to ${newInvite.email}`);
      setNewInvite({ email: '', role: 'user' });
      setInviteDialog(false);
      fetchInvites();
    } catch (error) {
      console.error('Error creating invite:', error);
      setError(error.message);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleDeleteInvite = async (inviteId) => {
    try {
      const { error } = await supabase
        .from('organization_invites')
        .delete()
        .eq('id', inviteId);

      if (error) throw error;

      setSuccess('Invite deleted successfully');
      fetchInvites();
    } catch (error) {
      console.error('Error deleting invite:', error);
      setError('Failed to delete invite: ' + error.message);
    }
  };

  const copyInviteLink = (token) => {
    const inviteLink = `${window.location.origin}/accept-invite?token=${token}`;
    navigator.clipboard.writeText(inviteLink);
    setCopiedToken(token);
    setSuccess('Invite link copied to clipboard!');
    setTimeout(() => setCopiedToken(''), 2000);
  };

  const getInviteStatus = (invite) => {
    if (invite.accepted_at) {
      return { status: 'accepted', color: 'success', icon: <CheckCircleIcon />, label: 'Accepted' };
    } else if (new Date(invite.expires_at) < new Date()) {
      return { status: 'expired', color: 'error', icon: <WarningIcon />, label: 'Expired' };
    } else {
      return { status: 'pending', color: 'warning', icon: <ScheduleIcon />, label: 'Pending' };
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'owner': return 'error';
      case 'admin': return 'warning';
      case 'manager': return 'info';
      default: return 'default';
    }
  };

  if (profile?.role !== 'owner') {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">
          Only organization owners can manage user invites.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          User Invites
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Invite new users to join your organization
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Pending Invites ({invites.filter(i => !i.accepted_at && new Date(i.expires_at) > new Date()).length})
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchInvites}
            sx={{ mr: 2 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setInviteDialog(true)}
          >
            Invite User
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Invited By</TableCell>
                <TableCell>Expires</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invites.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No invites found. Create your first invite to get started.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                invites.map((invite) => {
                  const status = getInviteStatus(invite);
                  return (
                    <TableRow key={invite.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />
                          {invite.email}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={invite.role}
                          color={getRoleColor(invite.role)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={status.icon}
                          label={status.label}
                          color={status.color}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {invite.invited_by?.full_name || invite.invited_by?.email || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(invite.expires_at).toLocaleDateString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(invite.expires_at).toLocaleTimeString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {status.status === 'pending' && (
                            <>
                              <Tooltip title="Copy Invite Link">
                                <IconButton
                                  size="small"
                                  onClick={() => copyInviteLink(invite.token)}
                                  color={copiedToken === invite.token ? 'success' : 'primary'}
                                >
                                  <CopyIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete Invite">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteInvite(invite.id)}
                                  sx={{ color: 'error.main' }}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          {status.status === 'expired' && (
                            <Tooltip title="Delete Expired Invite">
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteInvite(invite.id)}
                                sx={{ color: 'error.main' }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create Invite Dialog */}
      <Dialog
        open={inviteDialog}
        onClose={() => setInviteDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6">
            Invite New User
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={newInvite.email}
                onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })}
                required
                helperText="The user will receive an invite link at this email address"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                                  <Select
                    value={newInvite.role}
                    onChange={(e) => setNewInvite({ ...newInvite, role: e.target.value })}
                    label="Role"
                  >
                    {roles.map((role) => (
                      <MenuItem key={role.id} value={role.id}>
                        {role.name}
                      </MenuItem>
                    ))}
                  </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="body2">
                  The invite will expire in 7 days. The user will receive a secure link to join your organization.
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialog(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateInvite}
            disabled={inviteLoading || !newInvite.email || !newInvite.role}
            startIcon={inviteLoading ? <CircularProgress size={20} /> : <AddIcon />}
          >
            Send Invite
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
} 