import logger from '../../utils/logger';
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Alert, CircularProgress,
  Chip, IconButton, Tooltip, FormControl, InputLabel, Select, MenuItem, Grid, Snackbar,
  Menu, ListItemIcon, ListItemText, Divider, DialogContentText
} from '@mui/material';
import {
  Person as PersonIcon,
  Business as BusinessIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  LockReset as LockResetIcon,
  SwapHoriz as SwapHorizIcon,
  Warning as WarningIcon,
  Email as EmailIcon
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
  
  // Edit dialog states
  const [editDialog, setEditDialog] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editRoleId, setEditRoleId] = useState('');
  const [editOrgId, setEditOrgId] = useState('');
  
  // Action menu states
  const [actionMenu, setActionMenu] = useState({ open: false, user: null, anchorEl: null });
  
  // Delete confirmation dialog
  const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });
  
  // Password reset dialog
  const [resetDialog, setResetDialog] = useState({ open: false, user: null });
  
  // Loading states
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchAllUsers();
    fetchOrganizations();
    fetchRoles();
  }, []);

  const fetchAllUsers = async () => {
    setLoading(true);
    try {
      logger.log('Fetching all users...');
      
      // First, try with role_id join
      let { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          role,
          role_id,
          created_at,
          organization_id,
          organizations(id, name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching users with joins:', error);
        
        // Fallback: fetch without joins
        const { data: basicData, error: basicError } = await supabase
          .from('profiles')
          .select('id, email, full_name, role, role_id, created_at, organization_id')
          .order('created_at', { ascending: false });
        
        if (basicError) {
          throw basicError;
        }
        
        data = basicData;
        logger.log('Fetched users without joins:', data?.length || 0);
      } else {
        logger.log('Fetched users with joins:', data?.length || 0);
      }

      // Enrich data with organization names if not joined
      if (data && data.length > 0 && !data[0].organizations) {
        const orgIds = [...new Set(data.map(u => u.organization_id).filter(Boolean))];
        if (orgIds.length > 0) {
          const { data: orgs } = await supabase
            .from('organizations')
            .select('id, name')
            .in('id', orgIds);
          
          const orgMap = (orgs || []).reduce((map, org) => {
            map[org.id] = org;
            return map;
          }, {});
          
          data = data.map(user => ({
            ...user,
            organizations: user.organization_id ? orgMap[user.organization_id] : null
          }));
        }
      }

      setUsers(data || []);
      logger.log('Final users data:', data);
      
    } catch (err) {
      logger.error('Error in fetchAllUsers:', err);
      setSnackbar({ open: true, message: `Error loading users: ${err.message}`, severity: 'error' });
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
      logger.log('Fetched organizations:', data?.length || 0);
    } catch (err) {
      logger.error('Error fetching organizations:', err);
    }
  };

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name')
        .order('name');
      if (error) {
        logger.log('Roles table not available, using default roles');
        setRoles([
          { id: 'admin', name: 'Admin' },
          { id: 'user', name: 'User' },
          { id: 'owner', name: 'Owner' }
        ]);
      } else {
        setRoles(data || []);
        logger.log('Fetched roles:', data?.length || 0);
      }
    } catch (err) {
      logger.error('Error fetching roles:', err);
      // Set default roles if table doesn't exist
      setRoles([
        { id: 'admin', name: 'Admin' },
        { id: 'user', name: 'User' },
        { id: 'owner', name: 'Owner' }
      ]);
    }
  };

  const filteredUsers = users.filter(user => {
    try {
      const matchesSearch = user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.organizations?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        false;
      
      const matchesOrg = !selectedOrg || user.organization_id === selectedOrg;
      const matchesRole = !selectedRole || user.role === selectedRole || user.role_id === selectedRole;
      
      return matchesSearch && matchesOrg && matchesRole;
    } catch (err) {
      logger.error('Error filtering user:', user, err);
      return false;
    }
  });

  const handleActionMenu = (event, user) => {
    setActionMenu({ open: true, user, anchorEl: event.currentTarget });
  };

  const closeActionMenu = () => {
    setActionMenu({ open: false, user: null, anchorEl: null });
  };

  const handleEdit = (user) => {
    setEditUser(user);
    setEditRoleId(user.role_id || user.role || '');
    setEditOrgId(user.organization_id || '');
    setEditDialog(true);
    closeActionMenu();
  };

  const handleDelete = (user) => {
    setDeleteDialog({ open: true, user });
    closeActionMenu();
  };

  const handlePasswordReset = (user) => {
    setResetDialog({ open: true, user });
    closeActionMenu();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update both role and role_id fields for compatibility
      const updateData = {
        role: editRoleId,
        role_id: editRoleId,
        organization_id: editOrgId || null
      };
      
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', editUser.id);
        
      if (error) throw error;
      
      setSnackbar({ open: true, message: 'User updated successfully', severity: 'success' });
      setEditDialog(false);
      fetchAllUsers();
    } catch (err) {
      logger.error('Error updating user:', err);
      setSnackbar({ open: true, message: `Error updating user: ${err.message}`, severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', deleteDialog.user.id);
        
      if (error) throw error;
      
      setSnackbar({ open: true, message: 'User deleted successfully', severity: 'success' });
      setDeleteDialog({ open: false, user: null });
      fetchAllUsers();
    } catch (err) {
      logger.error('Error deleting user:', err);
      setSnackbar({ open: true, message: `Error deleting user: ${err.message}`, severity: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const sendPasswordReset = async () => {
    setSendingReset(true);
    try {
      // Use production URL for password reset links to avoid Netlify routing issues
      const productionUrl = 'https://www.scanified.com';
      const redirectUrl = `${productionUrl}/reset-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(
        resetDialog.user.email,
        {
          redirectTo: redirectUrl
        }
      );
      
      if (error) throw error;
      
      setSnackbar({ 
        open: true, 
        message: `Password reset email sent to ${resetDialog.user.email}`, 
        severity: 'success' 
      });
      setResetDialog({ open: false, user: null });
    } catch (err) {
      logger.error('Error sending password reset:', err);
      setSnackbar({ 
        open: true, 
        message: `Error sending password reset: ${err.message}`, 
        severity: 'error' 
      });
    } finally {
      setSendingReset(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>Loading users...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        All Users (All Organizations)
      </Typography>
      <Alert severity="info" sx={{ mb: 3 }}>
        View and manage all users across all organizations. Use the actions menu to edit, delete, or send password reset links.
        {users.length > 0 && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            Found {users.length} total users, {filteredUsers.length} matching current filters.
          </Typography>
        )}
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
              <TableCell align="center">Actions</TableCell>
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
                      {user.organizations?.name || user.organization_id || 'No organization'}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.role || user.role_id || 'No role'}
                    color="primary"
                    size="small"
                    sx={{ textTransform: 'capitalize' }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="More actions">
                    <IconButton onClick={(e) => handleActionMenu(e, user)}>
                      <MoreVertIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Action Menu */}
      <Menu
        anchorEl={actionMenu.anchorEl}
        open={actionMenu.open}
        onClose={closeActionMenu}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => handleEdit(actionMenu.user)}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit User</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handlePasswordReset(actionMenu.user)}>
          <ListItemIcon>
            <LockResetIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Send Password Reset</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleDelete(actionMenu.user)} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete User</ListItemText>
        </MenuItem>
      </Menu>
      
      {filteredUsers.length === 0 && users.length > 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No users found matching your criteria
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your search or filter settings
          </Typography>
        </Box>
      )}
      
      {users.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No users found in the system
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This could indicate a database connection issue or no users have been created yet
          </Typography>
        </Box>
      )}
      
      {/* Edit User Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          {editUser && (
            <Box>
              <Typography variant="body2" color="text.secondary">User:</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {editUser.full_name || 'No name set'} ({editUser.email})
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Organization</InputLabel>
                <Select
                  value={editOrgId}
                  onChange={e => setEditOrgId(e.target.value)}
                  label="Organization"
                >
                  <MenuItem value="">No Organization</MenuItem>
                  {organizations.map(org => (
                    <MenuItem key={org.id} value={org.id}>{org.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth>
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
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, user: null })}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          <WarningIcon color="warning" sx={{ mr: 1 }} />
          Confirm Delete User
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the user <strong>{deleteDialog.user?.full_name || deleteDialog.user?.email}</strong>?
          </DialogContentText>
          <Alert severity="warning" sx={{ mt: 2 }}>
            This action cannot be undone. The user will lose access to all organizations and data.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, user: null })} disabled={deleting}>
            Cancel
          </Button>
          <Button onClick={confirmDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete User'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={resetDialog.open} onClose={() => setResetDialog({ open: false, user: null })}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          <EmailIcon color="primary" sx={{ mr: 1 }} />
          Send Password Reset
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Send a password reset email to <strong>{resetDialog.user?.email}</strong>?
          </DialogContentText>
          <Alert severity="info" sx={{ mt: 2 }}>
            The user will receive an email with instructions to reset their password.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialog({ open: false, user: null })} disabled={sendingReset}>
            Cancel
          </Button>
          <Button onClick={sendPasswordReset} variant="contained" disabled={sendingReset}>
            {sendingReset ? 'Sending...' : 'Send Reset Email'}
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}