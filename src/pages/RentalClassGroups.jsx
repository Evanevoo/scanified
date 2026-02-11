import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import { Box, Typography, Button, TextField, Table, TableBody, TableCell, TableHead, TableRow, Paper, Alert, CircularProgress } from '@mui/material';

export default function RentalClassGroups() {
  const { organization } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [form, setForm] = useState({ name: '', description: '' });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const fetchGroups = async () => {
    if (!organization?.id) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('rental_class_groups')
        .select('*')
        .eq('organization_id', organization.id)
        .order('name');
      if (err) throw err;
      setGroups(data || []);
    } catch (e) {
      setError(e.message);
      setGroups([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchGroups();
  }, [organization?.id]);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    if (!organization?.id) return;
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        const { error: err } = await supabase
          .from('rental_class_groups')
          .update({ name: form.name, description: form.description || null, updated_at: new Date().toISOString() })
          .eq('id', editingId)
          .eq('organization_id', organization.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from('rental_class_groups')
          .insert({ organization_id: organization.id, name: form.name, description: form.description || null });
        if (err) throw err;
      }
      setForm({ name: '', description: '' });
      setEditingId(null);
      await fetchGroups();
    } catch (e) {
      setError(e.message);
    }
    setSaving(false);
  };

  const handleEdit = group => {
    setEditingId(group.id);
    setForm({ name: group.name, description: group.description || '' });
  };

  const handleDelete = async id => {
    if (!organization?.id) return;
    if (!confirm('Delete this group?')) return;
    try {
      const { error: err } = await supabase
        .from('rental_class_groups')
        .delete()
        .eq('id', id)
        .eq('organization_id', organization.id);
      if (err) throw err;
      await fetchGroups();
      setEditingId(null);
      setForm({ name: '', description: '' });
    } catch (e) {
      setError(e.message);
    }
  };

  if (!organization?.id) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="info">Select an organization to manage rental class groups.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Button onClick={() => navigate(-1)} sx={{ mb: 2 }} variant="outlined">Back</Button>
      <Typography variant="h5" fontWeight="bold" mb={3}>Rental Class Groups</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', mb: 3, flexWrap: 'wrap' }}>
        <TextField name="name" label="Name" value={form.name} onChange={handleChange} required size="small" sx={{ minWidth: 200 }} />
        <TextField name="description" label="Description" value={form.description} onChange={handleChange} size="small" sx={{ minWidth: 280 }} />
        <Button type="submit" variant="contained" disabled={saving}>{editingId ? 'Update' : 'Add'}</Button>
        {editingId && <Button type="button" variant="outlined" onClick={() => { setEditingId(null); setForm({ name: '', description: '' }); }}>Cancel</Button>}
      </Box>
      <Paper>
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Name</strong></TableCell>
                <TableCell><strong>Description</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groups.map(group => (
                <TableRow key={group.id}>
                  <TableCell>{group.name}</TableCell>
                  <TableCell>{group.description || '—'}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => handleEdit(group)} sx={{ mr: 1 }}>Edit</Button>
                    <Button size="small" color="error" onClick={() => handleDelete(group.id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
              {groups.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 4 }}>No rental class groups yet. Add one above.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
} 