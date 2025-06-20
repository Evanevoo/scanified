import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';
import { subscriptionService } from '../services/subscriptionService';
import {
  Box, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody, TableContainer, TextField, Button, Select, MenuItem, Snackbar, Alert, Stack, Chip, LinearProgress, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip, FormControl, InputLabel
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, Add as AddIcon } from '@mui/icons-material';
import { usePermissions } from '../context/PermissionsContext';

const ROLES = ['admin', 'user', 'manager'];

export default function UserManagement() {
  const { profile, organization } = useAuth();
  const { can, isOrgAdmin } = usePermissions();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRoleId, setNewRoleId] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [adding, setAdding] = useState(false);
  const [usage, setUsage] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  useEffect(() => {
    if (organization && can('manage:users')) {
      fetchUsers();
      fetchUsage();
      fetchRoles();
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

  async function handleAddUser(e) {
    e.preventDefault();
    setAdding(true);
    setError('');
    setSuccess('');

    try {
      const { data: existingUser, error: checkError } = await supabase.auth.admin.getUserByEmail(newEmail);
      
      if (existingUser.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: existingUser.user.id,
            email: newEmail,
            full_name: newFullName,
            role_id: newRoleId,
            organization_id: organization.id
          });

        if (profileError) throw profileError;
        setSuccess('User added to organization successfully!');
      } else {
        const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(newEmail, {
          data: {
            full_name: newFullName,
            role_id: newRoleId,
            organization_id: organization.id
          }
        });

        if (inviteError) throw inviteError;

        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: inviteData.user.id,
            email: newEmail,
            full_name: newFullName,
            role_id: newRoleId,
            organization_id: organization.id
          });

        if (profileError) throw profileError;
        setSuccess('User invited and added to organization!');
      }

      setNewEmail('');
      setNewRoleId(roles.length > 0 ? roles[0].id : '');
      setNewFullName('');
      setShowAddDialog(false);
      fetchUsers();
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

  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowEditDialog(true);
  };

  if (!can('manage:users')) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Access Denied. You do not have permission to manage users.
        </Alert>
      </Box>
    );
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
          Add User
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

      {/* Add User Dialog */}
      <Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add User to Organization</DialogTitle>
        <form onSubmit={handleAddUser}>
          <DialogContent>
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="Full Name"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                required
              />
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
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
              {adding ? 'Adding...' : 'Add User'}
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

      <Snackbar open={!!success} autoHideDuration={6000} onClose={() => setSuccess('')}>
        <Alert onClose={() => setSuccess('')} severity="success">
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
} 