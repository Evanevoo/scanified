import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Alert, CircularProgress,
  Chip, IconButton, Tooltip, FormControl, InputLabel, Select, MenuItem, Grid, Snackbar
} from '@mui/material';
import {
  Person as PersonIcon,
  Business as BusinessIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { supabase } from '../../supabase/client';
import { useAuth } from '../../hooks/useAuth';
import { useOwnerAccess } from '../../hooks/useOwnerAccess';

export default function UserManagementAllOrgs() {
  const { profile } = useAuth();
  useOwnerAccess(profile); // Restrict access to owners

  const [users, setUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [editDialog, setEditDialog] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editRoleId, setEditRoleId] = useState('');
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchAllUsers();
    fetchOrganizations();
    fetchRoles();
  }, []);

  const fetchAllUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          role_id,
          created_at,
          organization_id,
          organizations(id, name),
          roles(id, name)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      setSnackbar({ open: true, message: 'Error loading users', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .order('name');
      if (error) throw error;
      setOrganizations(data || []);
    } catch (err) {
      // ignore
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
      // ignore
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.organizations.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesOrg = !selectedOrg || user.organization_id === selectedOrg;
    const matchesRole = !selectedRole || user.role_id === selectedRole;
    return matchesSearch && matchesOrg && matchesRole;
  });

  const handleEdit = (user) => {
    setEditUser(user);
    setEditRoleId(user.role_id);
    setEditDialog(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role_id: editRoleId })
        .eq('id', editUser.id);
      if (error) throw error;
      setSnackbar({ open: true, message: 'User role updated', severity: 'success' });
      setEditDialog(false);
      fetchAllUsers();
    } catch (err) {
      setSnackbar({ open: true, message: 'Error updating user', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        All Users (All Organizations)
      </Typography>
      <Alert severity="info" sx={{ mb: 3 }}>
        View and manage all users across all organizations. Use the edit button to change a user's role.
      </Alert>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Search users, emails, or organizations"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Filter by Organization</InputLabel>
              <Select
                value={selectedOrg}
                onChange={(e) => setSelectedOrg(e.target.value)}
                label="Filter by Organization"
              >
                <MenuItem value="">All Organizations</MenuItem>
                {organizations.map(org => (
                  <MenuItem key={org.id} value={org.id}>{org.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Filter by Role</InputLabel>
              <Select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                label="Filter by Role"
              >
                <MenuItem value="">All Roles</MenuItem>
                {roles.map(role => (
                  <MenuItem key={role.id} value={role.id}>{role.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Organization</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    <Box>
                      <Typography variant="subtitle2">
                        {user.full_name || 'No name set'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {user.email}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <BusinessIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2">
                      {user.organizations.name}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.roles.name}
                    color="primary"
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {new Date(user.created_at).toLocaleDateString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Tooltip title="Edit user role">
                    <IconButton color="primary" onClick={() => handleEdit(user)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {filteredUsers.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No users found matching your criteria
          </Typography>
        </Box>
      )}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User Role</DialogTitle>
        <DialogContent>
          {editUser && (
            <Box>
              <Typography variant="body2" color="text.secondary">User:</Typography>
              <Typography variant="body1">{editUser.full_name || 'No name set'} ({editUser.email})</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Organization:</Typography>
              <Typography variant="body1">{editUser.organizations.name}</Typography>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Role</InputLabel>
                <Select
                  value={editRoleId}
                  onChange={e => setEditRoleId(e.target.value)}
                  label="Role"
                >
                  {roles.map(role => (
                    <MenuItem key={role.id} value={role.id}>{role.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
} 