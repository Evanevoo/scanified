import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Chip } from '@mui/material';
import { supabase } from '../../supabase/client';
import { useAppStore } from '../../store/appStore';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

// A predefined list of all possible permissions in the system
const allPermissions = [
  'manage:users', 'manage:billing', 'manage:roles',
  'read:customers', 'write:customers', 'delete:customers',
  'read:cylinders', 'write:cylinders', 'delete:cylinders',
  'read:invoices', 'write:invoices', 'delete:invoices',
  'read:rentals', 'write:rentals',
  'update:cylinder_location'
];

function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentRole, setCurrentRole] = useState(null);
  const { addNotification } = useAppStore();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('roles').select('*').order('name');
    if (error) {
      addNotification({ type: 'error', title: 'Error fetching roles', message: error.message });
    } else {
      setRoles(data);
    }
    setLoading(false);
  };

  const handleOpen = (role = null) => {
    if (role) {
      setCurrentRole(role);
      setIsEditing(true);
    } else {
      setCurrentRole({ name: '', description: '', permissions: [] });
      setIsEditing(false);
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setCurrentRole(null);
  };

  const handlePermissionToggle = (permission) => {
    setCurrentRole(prev => {
      const permissions = prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission];
      return { ...prev, permissions };
    });
  };
  
  const handleSave = async () => {
    setSaving(true);
    let error;
    const { id, ...roleData } = currentRole;

    if (isEditing) {
      ({ error } = await supabase.from('roles').update(roleData).eq('id', id));
    } else {
      ({ error } = await supabase.from('roles').insert(roleData));
    }

    setSaving(false);
    if (error) {
      addNotification({ type: 'error', title: 'Error saving role', message: error.message });
    } else {
      addNotification({ type: 'success', title: 'Role saved successfully' });
      fetchRoles();
      handleClose();
    }
  };

  const handleDelete = async (roleId) => {
    if (window.confirm('Are you sure you want to delete this role? This could affect users currently assigned to it.')) {
      const { error } = await supabase.from('roles').delete().eq('id', roleId);
      if (error) {
        addNotification({ type: 'error', title: 'Error deleting role', message: error.message });
      } else {
        addNotification({ type: 'success', title: 'Role deleted' });
        fetchRoles();
      }
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Role Management</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
          Create New Role
        </Button>
      </Box>
      <Paper>
        <List>
          {roles.map(role => (
            <ListItem key={role.id} divider>
              <ListItemText primary={role.name} secondary={role.description} />
              <ListItemSecondaryAction>
                <IconButton edge="end" aria-label="edit" onClick={() => handleOpen(role)}>
                  <EditIcon />
                </IconButton>
                <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(role.id)}>
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Paper>

      {currentRole && (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
          <DialogTitle>{isEditing ? 'Edit Role' : 'Create New Role'}</DialogTitle>
          <DialogContent>
            <TextField label="Role Name" value={currentRole.name} onChange={(e) => setCurrentRole(p => ({...p, name: e.target.value}))} fullWidth margin="normal" />
            <TextField label="Description" value={currentRole.description} onChange={(e) => setCurrentRole(p => ({...p, description: e.target.value}))} fullWidth margin="normal" />
            <Typography variant="h6" sx={{ mt: 2 }}>Permissions</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
              {allPermissions.map(permission => (
                <Chip
                  key={permission}
                  label={permission}
                  clickable
                  color={currentRole.permissions.includes(permission) ? 'primary' : 'default'}
                  onClick={() => handlePermissionToggle(permission)}
                  onDelete={currentRole.permissions.includes(permission) ? () => handlePermissionToggle(permission) : undefined}
                />
              ))}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button onClick={handleSave} variant="contained" disabled={saving}>{saving ? 'Saving...' : 'Save Role'}</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}

export default RoleManagement; 