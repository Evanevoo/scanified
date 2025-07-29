import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';
import { subscriptionService } from '../services/subscriptionService';
import {
  Box, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody, TableContainer, TextField, Button, Select, MenuItem, Snackbar, Alert, Stack, Chip, LinearProgress, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip, FormControl, InputLabel
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, Add as AddIcon, ContentCopy as CopyIcon } from '@mui/icons-material';
import { usePermissions } from '../context/PermissionsContext';

// Roles are now fetched from the database

export default function UserManagement() {
  const { profile, organization } = useAuth();
  const { can, isOrgAdmin } = usePermissions();
  
  // Debug logging
  console.log('UserManagement Debug:');
  console.log('- Profile:', profile);
  console.log('- Organization:', organization);
  console.log('- Can manage users:', can('manage:users'));
  console.log('- IsOrgAdmin:', isOrgAdmin);
  console.log('- Profile role:', profile?.role);
  
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRoleId, setNewRoleId] = useState('');
  const [adding, setAdding] = useState(false);
  const [usage, setUsage] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [pendingInvites, setPendingInvites] = useState([]);

  useEffect(() => {
    if (organization && can('manage:users')) {
      fetchUsers();
      fetchUsage();
      fetchRoles();
      fetchPendingInvites();
    }
  }, [profile, organization, can]);

  async function fetchRoles() {
    const { data, error } = await supabase.from('roles').select('*');
    if (error) {
      setError(error.message);
    } else {
      setRoles(data);
      if (data && data.length > 0) {
        setNewRoleId(data[0].id);
      }
    }
  }

  async function fetchUsers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role_id, full_name, created_at')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false });
    
    if (error) setError(error.message);
    else setUsers(data);
    setLoading(false);
  }

  async function fetchUsage() {
    try {
      const usageData = await subscriptionService.getOrganizationUsage(organization.id);
      setUsage(usageData);
    } catch (error) {
      console.error('Error fetching usage:', error);
    }
  }

  async function fetchPendingInvites() {
    const { data, error } = await supabase
      .from('organization_invites')
      .select('*')
      .eq('organization_id', organization.id)
      .is('accepted_at', null)
      .order('created_at', { ascending: false });
    if (!error) setPendingInvites(data || []);
  }

  async function handleAddUser(e) {
    e.preventDefault();
    setAdding(true);
    setError('');
    setSuccess('');

    try {
      // Check if email already exists in the organization
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('organization_id', organization.id)
        .eq('email', newEmail)
        .single();

      if (existingUser) {
        throw new Error('This email is already registered in your organization');
      }

      // Check if email is already registered with any other organization
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('email, organization_id, organizations(name)')
        .eq('email', newEmail)
        .single();

      if (existingProfile && existingProfile.organization_id && existingProfile.organization_id !== organization.id) {
        throw new Error(`This email (${newEmail}) is already registered with organization "${existingProfile.organizations?.name}". Each email can only be associated with one organization. Please use a different email address.`);
      }

      // Check if there's already a pending invite for this email
      const { data: existingInvite } = await supabase
        .from('organization_invites')
        .select('id')
        .eq('organization_id', organization.id)
        .eq('email', newEmail)
        .is('accepted_at', null)
        .single();

      if (existingInvite) {
        throw new Error('An invite has already been sent to this email');
      }

      // Create the invite using the database function
      const { data, error } = await supabase.rpc('create_organization_invite', {
        p_organization_id: organization.id,
        p_email: newEmail,
        p_role: newRoleId,
        p_expires_in_days: 7
      });

      if (error) throw error;

      // Fetch the invite row to get the token
      const { data: inviteRow } = await supabase
        .from('organization_invites')
        .select('token')
        .eq('organization_id', organization.id)
        .eq('email', newEmail)
        .is('accepted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (inviteRow && inviteRow.token) {
        const inviteLink = `${window.location.origin}/accept-invite?token=${inviteRow.token}`;
        await fetch('/.netlify/functions/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: newEmail,
            subject: `You're invited to join ${organization.name}`,
            template: 'invite',
            data: {
              inviteLink,
              organizationName: organization.name,
              inviter: profile.full_name || profile.email,
            }
          })
        });
      }

      setSuccess(`Invite sent to ${newEmail}. The user will receive an email with instructions to join your organization.`);
      setNewEmail('');
      setNewRoleId(roles.length > 0 ? roles[0].id : '');
      setShowAddDialog(false);
      fetchUsers();
      fetchPendingInvites();
    } catch (err) {
      console.error('Error adding user:', err);
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function handleUpdateUser(userId, updates) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role_id: updates.role_id })
        .eq('id', userId)
        .eq('organization_id', organization.id);

      if (error) throw error;
      setSuccess('User updated successfully!');
      setShowEditDialog(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      console.error('Error updating user:', err);
      setError(err.message);
    }
  }

  async function handleDeleteUser(userId, userEmail) {
    if (!confirm(`Are you sure you want to remove ${userEmail} from your organization?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)
        .eq('organization_id', organization.id);

      if (error) throw error;
      setSuccess('User removed from organization successfully!');
      fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(err.message);
    }
  }

  async function handleCancelInvite(inviteId) {
    try {
      const { error } = await supabase
        .from('organization_invites')
        .delete()
        .eq('id', inviteId);
      if (error) throw error;
      setSuccess('Invite cancelled successfully.');
      fetchPendingInvites();
    } catch (err) {
      setError('Failed to cancel invite: ' + err.message);
    }
  }

  function handleCopyInviteLink(token) {
    const inviteLink = `${window.location.origin}/accept-invite?token=${token}`;
    navigator.clipboard.writeText(inviteLink);
    setSuccess('Invite link copied to clipboard!');
  }

  function getRoleName(roleId) {
    const role = roles.find(r => r.id === roleId);
    return role ? role.name : roleId;
  }

  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowEditDialog(true);
  };

  if (!can('manage:users')) {
    console.log('UserManagement Access Check:');
    console.log('- Profile:', profile);
    console.log('- Profile role:', profile?.role);
    console.log('- Can manage users:', can('manage:users'));
    console.log('- Is org admin:', isOrgAdmin);
    
    // Fallback for admin users
    if (profile?.role === 'admin' || isOrgAdmin) {
      console.log('- Allowing access via admin fallback');
    } else {
      return (
        <Box sx={{ p: 3 }}>
          <Alert severity="error">
            Access Denied. You do not have permission to manage users.
          </Alert>
          <Typography variant="body2" sx={{ mt: 2 }}>
            Debug info: Role = {profile?.role}, IsOrgAdmin = {isOrgAdmin.toString()}
          </Typography>
        </Box>
      );
    }
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        User Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Usage Information */}
      {usage && organization && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Organization Usage
          </Typography>
          <Stack direction="row" spacing={3}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Users ({users.length} / {organization?.max_users === 999999 ? 'Unlimited' : organization?.max_users ?? 'N/A'})
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={organization?.max_users && organization.max_users !== 999999 ? (users.length / organization.max_users) * 100 : 0}
                sx={{ mt: 1, width: 200 }}
              />
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Plan: {organization?.subscription_plan ?? 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Status: {organization?.subscription_status ?? 'N/A'}
              </Typography>
            </Box>
          </Stack>
        </Paper>
      )}

      {/* Add User Button */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowAddDialog(true)}
          disabled={(organization.max_users !== 999999 && users.length >= organization.max_users) || !can('manage:users')}
        >
          Invite User
        </Button>
        {organization.max_users !== 999999 && users.length >= organization.max_users && (
          <Typography variant="caption" color="error" sx={{ ml: 2 }}>
            User limit reached. Upgrade your plan to add more users.
          </Typography>
        )}
      </Box>

      {/* Users Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Joined</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.full_name || 'N/A'}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Chip 
                    label={users.find(u => u.id === user.id)?.roles?.name || 'N/A'}
                    color={users.find(u => u.id === user.id)?.roles?.name === 'admin' ? 'primary' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Date(user.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="Edit User">
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => handleEditUser(user)}
                          disabled={user.id === profile.id && !isOrgAdmin}
                        >
                          <EditIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Remove User">
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          disabled={user.id === profile.id}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pending Invites Section */}
      {pendingInvites.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>Pending Invites</Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Sent</TableCell>
                  <TableCell>Expires</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingInvites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell>{invite.email}</TableCell>
                    <TableCell>{getRoleName(invite.role)}</TableCell>
                    <TableCell>{new Date(invite.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(invite.expires_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="Copy Invite Link">
                          <span>
                            <IconButton size="small" onClick={() => handleCopyInviteLink(invite.token)}>
                              <CopyIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Cancel Invite">
                          <span>
                            <IconButton size="small" color="error" onClick={() => handleCancelInvite(invite.id)}>
                              <DeleteIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Add User Dialog */}
      <Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invite User to Organization</DialogTitle>
        <form onSubmit={handleAddUser}>
          <DialogContent>
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                helperText="The user will receive an invite link at this email address"
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>Role</InputLabel>
                <Select
                  value={newRoleId}
                  onChange={(e) => setNewRoleId(e.target.value)}
                  label="Role"
                >
                  {roles.map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      {role.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Alert severity="info">
                <Typography variant="body2">
                  The invite will expire in 7 days. The user will receive a secure link to join your organization.
                </Typography>
              </Alert>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={adding}
            >
              {adding ? 'Sending Invite...' : 'Send Invite'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onClose={() => setShowEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          {editingUser && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                fullWidth
                label="Full Name"
                value={editingUser.full_name || ''}
                onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>Role</InputLabel>
                <Select
                  value={editingUser.role_id}
                  onChange={(e) => setEditingUser({ ...editingUser, role_id: e.target.value })}
                  label="Role"
                >
                  {roles.map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      {role.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEditDialog(false)}>
            Cancel
          </Button>
          <Button 
            variant="contained"
            onClick={() => handleUpdateUser(editingUser.id, {
              role_id: editingUser.role_id
            })}
          >
            Update User
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!success} autoHideDuration={6000} onClose={() => setSuccess('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccess('')} severity="success">
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
} 