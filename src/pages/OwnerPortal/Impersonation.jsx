import logger from '../../utils/logger';
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Alert, CircularProgress,
  Chip, IconButton, Tooltip, FormControl, InputLabel, Select, MenuItem, Grid, Card, CardContent,
  Divider, Snackbar
} from '@mui/material';
import {
  Person as PersonIcon,
  Business as BusinessIcon,
  Login as LoginIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { supabase } from '../../supabase/client';
import { useAuth } from '../../hooks/useAuth';
import { useOwnerAccess } from '../../hooks/useOwnerAccess';

export default function Impersonation() {
  const { profile } = useAuth();
  useOwnerAccess(profile); // Restrict access to owners

  const [organizations, setOrganizations] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [impersonationDialog, setImpersonationDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [impersonating, setImpersonating] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchOrganizations();
    fetchAllUsers();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setOrganizations(data || []);
    } catch (err) {
      logger.error('Error fetching organizations:', err);
      setSnackbar({ open: true, message: 'Error loading organizations', severity: 'error' });
    }
  };

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
          last_sign_in_at,
          organizations(id, name, slug, subscription_status),
          roles(id, name, permissions)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      logger.error('Error fetching users:', err);
      setSnackbar({ open: true, message: 'Error loading users', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonate = async (user) => {
    setSelectedUser(user);
    setImpersonationDialog(true);
  };

  const confirmImpersonation = async () => {
    if (!selectedUser) return;

    setImpersonating(true);
    try {
      // Store current user session for restoration
      const { data: { session } } = await supabase.auth.getSession();
      const originalSession = session;
      
      // Store impersonation data in localStorage for restoration
      localStorage.setItem('originalOwnerSession', JSON.stringify({
        user: profile,
        session: originalSession,
        timestamp: new Date().toISOString()
      }));

      // For demo purposes, we'll simulate the impersonation
      // In production, you'd use a server-side function to generate impersonation links
      logger.log('Impersonation requested for:', selectedUser.email);

      // For demo purposes, we'll simulate the impersonation
      // In production, you'd use the generated link or a more secure method
      setSnackbar({ 
        open: true, 
        message: `Impersonating ${selectedUser.email} from ${selectedUser.organizations.name}`, 
        severity: 'success' 
      });

      // Simulate redirect to user's organization
      setTimeout(() => {
        window.open(`/home?impersonated=true&user=${selectedUser.id}`, '_blank');
      }, 1000);

    } catch (err) {
      logger.error('Error during impersonation:', err);
      setSnackbar({ open: true, message: 'Error during impersonation', severity: 'error' });
    } finally {
      setImpersonating(false);
      setImpersonationDialog(false);
      setSelectedUser(null);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.organizations.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesOrg = !selectedOrg || user.organizations.id === selectedOrg;
    const matchesRole = !selectedRole || user.roles.id === selectedRole;

    return matchesSearch && matchesOrg && matchesRole;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'trial': return 'warning';
      case 'cancelled': return 'error';
      case 'suspended': return 'error';
      default: return 'default';
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString() + ' ' + new Date(date).toLocaleTimeString();
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
        User Impersonation
      </Typography>
      
      <Alert severity="warning" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Warning:</strong> Impersonation allows you to access any user's account. 
          This should only be used for legitimate support and troubleshooting purposes. 
          All impersonation actions are logged for security and audit purposes.
        </Typography>
      </Alert>

      {/* Search and Filters */}
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
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Filter by Organization</InputLabel>
              <Select
                value={selectedOrg}
                onChange={(e) => setSelectedOrg(e.target.value)}
                label="Filter by Organization"
              >
                <MenuItem value="">All Organizations</MenuItem>
                {organizations.map(org => (
                  <MenuItem key={org.id} value={org.id}>
                    {org.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Filter by Role</InputLabel>
              <Select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                label="Filter by Role"
              >
                <MenuItem value="">All Roles</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="manager">Manager</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={() => {
                setSearchTerm('');
                setSelectedOrg('');
                setSelectedRole('');
              }}
              fullWidth
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Users Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Organization</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Last Sign In</TableCell>
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
                    <Box>
                      <Typography variant="subtitle2">
                        {user.organizations.name}
                      </Typography>
                      <Chip
                        label={user.organizations.subscription_status}
                        color={getStatusColor(user.organizations.subscription_status)}
                        size="small"
                      />
                    </Box>
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
                    {formatDate(user.last_sign_in_at)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatDate(user.created_at)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Tooltip title="Impersonate this user">
                    <IconButton
                      color="primary"
                      onClick={() => handleImpersonate(user)}
                      disabled={user.id === profile.id}
                    >
                      <LoginIcon />
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

      {/* Impersonation Confirmation Dialog */}
      <Dialog open={impersonationDialog} onClose={() => setImpersonationDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <WarningIcon color="warning" sx={{ mr: 1 }} />
            Confirm Impersonation
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                You are about to impersonate this user. This action will be logged for security purposes.
              </Alert>
              
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    User Details
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Name:</Typography>
                      <Typography variant="body1">{selectedUser.full_name || 'No name set'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Email:</Typography>
                      <Typography variant="body1">{selectedUser.email}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Organization:</Typography>
                      <Typography variant="body1">{selectedUser.organizations.name}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Role:</Typography>
                      <Typography variant="body1">{selectedUser.roles.name}</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              <Typography variant="body2" color="text.secondary">
                <InfoIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                You will be redirected to the user's organization dashboard in a new tab.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImpersonationDialog(false)} disabled={impersonating}>
            Cancel
          </Button>
          <Button
            onClick={confirmImpersonation}
            variant="contained"
            color="warning"
            disabled={impersonating}
            startIcon={impersonating ? <CircularProgress size={16} /> : <LoginIcon />}
          >
            {impersonating ? 'Impersonating...' : 'Start Impersonation'}
          </Button>
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