import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';
import {
  Box, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody, TableContainer, TextField, Button, Select, MenuItem, Snackbar, Alert, Stack
} from '@mui/material';

const ROLES = ['admin', 'user', 'manager'];

export default function UserManagement() {
  const { profile } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchUsers();
    }
  }, [profile]);

  async function fetchUsers() {
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('id, email, role');
    if (error) setError(error.message);
    else setUsers(data);
    setLoading(false);
  }

  async function handleAddUser(e) {
    e.preventDefault();
    setAdding(true);
    setError('');
    setSuccess('');
    // Invite user via Supabase Auth
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(newEmail);
    if (inviteError) {
      setError(inviteError.message);
      setAdding(false);
      return;
    }
    // Insert or update profile with email and role
    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert({ id: inviteData.user.id, email: newEmail, role: newRole }, { onConflict: ['id'] });
    if (upsertError) setError(upsertError.message);
    else setSuccess('User invited and role set!');
    setAdding(false);
    setNewEmail('');
    setNewRole('user');
    fetchUsers();
  }

  async function handleRoleChange(userId, newRole) {
    setError('');
    setSuccess('');
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) setError(error.message);
    else setSuccess('Role updated!');
    fetchUsers();
  }

  if (profile?.role !== 'admin') {
    return <Alert severity="error">Access denied. Admins only.</Alert>;
  }

  return (
    <Box maxWidth="md" mx="auto" mt={8}>
      <Paper elevation={4} sx={{ p: 5, borderRadius: 4 }}>
        <Typography variant="h4" fontWeight={800} color="primary" mb={4} align="center">
          User Management
        </Typography>
        <form onSubmit={handleAddUser}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3} alignItems="center">
            <TextField
              label="User Email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              required
              type="email"
              size="small"
            />
            <Select
              value={newRole}
              onChange={e => setNewRole(e.target.value)}
              size="small"
            >
              {ROLES.map(role => (
                <MenuItem key={role} value={role}>{role}</MenuItem>
              ))}
            </Select>
            <Button type="submit" variant="contained" color="primary" disabled={adding}>
              Add User
            </Button>
          </Stack>
        </form>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Change Role</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map(user => (
                <TableRow key={user.id}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>
                    <Select
                      value={user.role}
                      onChange={e => handleRoleChange(user.id, e.target.value)}
                      size="small"
                    >
                      {ROLES.map(role => (
                        <MenuItem key={role} value={role}>{role}</MenuItem>
                      ))}
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      <Snackbar
        open={!!success}
        autoHideDuration={3000}
        onClose={() => setSuccess('')}
        message={success}
      />
    </Box>
  );
} 