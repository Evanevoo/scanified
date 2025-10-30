import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Alert, CircularProgress,
  Chip, IconButton, Tooltip, Grid, Snackbar, Card, CardContent, CardHeader, Divider,
  Tabs, Tab, FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel,
  Accordion, AccordionSummary, AccordionDetails, Checkbox, FormGroup, List, ListItem, ListItemText
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Security as SecurityIcon,
  AdminPanelSettings as AdminIcon,
  People as PeopleIcon,
  Business as BusinessIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';

export default function ComprehensiveRoleManager() {
  const { profile, organization } = useAuth();
  
  const [currentTab, setCurrentTab] = useState(0);
  const [roles, setRoles] = useState([]);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Dialog states
  const [editDialog, setEditDialog] = useState({ open: false, role: null, isNew: false });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, role: null });
  const [newRole, setNewRole] = useState({ name: '', display_name: '', description: '' });

  // All available menu items and permissions
  const allMenuSections = {
    admin: {
      title: 'Administration',
      icon: <AdminIcon />,
      items: [
        { id: 'import_data', title: 'Import Data', path: '/import' },
        { id: 'import_customers', title: 'Import Customers', path: '/import-customer-info' },
        { id: 'file_format_manager', title: 'File Format Manager', path: '/file-format-manager' },
        { id: 'import_asset_balance', title: 'Import Asset Balance', path: '/import-asset-balance' },
        { id: 'organization_tools', title: 'Organization Tools', path: '/organization-tools' },
        { id: 'user_management', title: 'User Management', path: '/user-management' },
        { id: 'join_codes', title: 'Join Codes', path: '/organization-join-codes' },
        { id: 'role_management', title: 'Role Management', path: '/comprehensive-role-manager' },
        { id: 'billing', title: 'Billing', path: '/billing' },
        { id: 'settings', title: 'Settings', path: '/settings' }
      ]
    },
    operations: {
      title: 'Operations',
      icon: <BusinessIcon />,
      items: [
        { id: 'dashboard', title: 'Dashboard', path: '/home' },
        { id: 'customers', title: 'Customers', path: '/customers' },
        { id: 'temp_customers', title: 'Temp Customers', path: '/temp-customers' },
        { id: 'locations', title: 'Locations', path: '/locations' },
        { id: 'assets', title: 'Assets', path: '/assets' },
        { id: 'inventory', title: 'Inventory Management', path: '/inventory-management' },
        { id: 'rentals', title: 'Rentals', path: '/rentals' },
        { id: 'orders', title: 'Orders', path: '/orders' },
        { id: 'deliveries', title: 'Deliveries', path: '/deliveries' }
      ]
    },
    reports: {
      title: 'Reports & Analytics',
      icon: <SettingsIcon />,
      items: [
        { id: 'analytics', title: 'Analytics', path: '/analytics' },
        { id: 'reports', title: 'Reports', path: '/reports' },
        { id: 'organization_analytics', title: 'Organization Analytics', path: '/organization-analytics' }
      ]
    }
  };

  useEffect(() => {
    fetchRoles();
    fetchRolePermissions();
  }, []);

  const fetchRoles = async () => {
    console.log('🔄 fetchRoles called - refreshing roles list');
    try {
      // Fetch from roles table (UUID-based)
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('*')
        .order('name');

      console.log('📊 Roles query result:', { rolesData, rolesError });

      if (rolesError && rolesError.code !== 'PGRST116') {
        console.error('Error fetching roles:', rolesError);
        throw rolesError;
      }

      console.log(`📋 Found ${rolesData?.length || 0} roles in database`);

      // Also fetch usage count for each role (filtered by organization)
      const rolesWithUsage = await Promise.all((rolesData || []).map(async (role) => {
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role_id', role.id)
          .eq('organization_id', organization?.id);

        return { ...role, usage_count: count || 0 };
      }));

      console.log('✅ Roles with usage counts:', rolesWithUsage);
      setRoles(rolesWithUsage);
      console.log('✅ setRoles called - UI should update now');
    } catch (err) {
      console.error('❌ Error in fetchRoles:', err);
      showSnackbar('Error fetching roles', 'error');
    }
  };

  const fetchRolePermissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('organization_id', organization?.id || 'global')
        .order('role_name');

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching role permissions:', error);
      }

      // If no custom permissions exist, create default ones
      if (!data || data.length === 0) {
        await createDefaultRolePermissions();
      } else {
        setRolePermissions(data);
      }
    } catch (err) {
      console.error('Error in fetchRolePermissions:', err);
      await createDefaultRolePermissions();
    } finally {
      setLoading(false);
    }
  };

  const createDefaultRolePermissions = async () => {
    const defaultRoles = [
      {
        role_name: 'admin',
        display_name: 'Administrator',
        description: 'Full access to all features',
        permissions: Object.values(allMenuSections).flatMap(section => 
          section.items.map(item => item.id)
        ),
        organization_id: organization?.id || 'global'
      },
      {
        role_name: 'manager',
        display_name: 'Manager', 
        description: 'Access to operations and reporting',
        permissions: [
          'dashboard', 'customers', 'temp_customers', 'locations',
          'assets', 'inventory', 'rentals', 'orders', 'deliveries',
          'analytics', 'reports', 'organization_analytics'
        ],
        organization_id: organization?.id || 'global'
      },
      {
        role_name: 'user',
        display_name: 'User',
        description: 'Basic access to core features',
        permissions: [
          'dashboard', 'customers', 'assets', 'inventory', 'orders'
        ],
        organization_id: organization?.id || 'global'
      }
    ];

    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .insert(defaultRoles)
        .select();

      if (error) throw error;
      setRolePermissions(data);
    } catch (err) {
      console.error('Error creating default role permissions:', err);
      setRolePermissions([]);
    }
  };

  const handleCreateRole = async () => {
    if (!newRole.name.trim()) {
      showSnackbar('Role name is required', 'error');
      return;
    }

    setSaving(true);
    try {
      // Normalize the role name (lowercase, no spaces)
      const normalizedName = newRole.name.toLowerCase().trim().replace(/\s+/g, '_');
      
      // Check if role already exists (case-insensitive)
      const { data: existingRole } = await supabase
        .from('roles')
        .select('id')
        .ilike('name', normalizedName);

      if (existingRole && existingRole.length > 0) {
        showSnackbar('A role with this name already exists', 'error');
        return;
      }

      // Create role in roles table
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .insert({
          name: normalizedName,
          display_name: newRole.display_name || newRole.name,
          description: newRole.description
        })
        .select()
        .single();

      if (roleError) throw roleError;

      // Also create in role_permissions table for compatibility
      const { error: permError } = await supabase
        .from('role_permissions')
        .insert({
          role_name: normalizedName,
          display_name: newRole.display_name || newRole.name,
          description: newRole.description,
          permissions: [], // Start with no permissions
          organization_id: organization?.id || 'global'
        });

      if (permError) {
        console.warn('Could not create role_permissions entry:', permError);
      }

      showSnackbar('Role created successfully', 'success');
      setEditDialog({ open: false, role: null, isNew: false });
      setNewRole({ name: '', display_name: '', description: '' });
      await fetchRoles();
      await fetchRolePermissions();

    } catch (err) {
      console.error('Error creating role:', err);
      showSnackbar('Failed to create role', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!editDialog.role) return;

    setSaving(true);
    try {
      // Check if role name was changed
      const originalRole = roles.find(r => r.id === editDialog.role.id);
      const nameChanged = originalRole && originalRole.name !== editDialog.role.name;
      
      if (nameChanged) {
        // Normalize the new role name
        const normalizedName = editDialog.role.name.toLowerCase().trim().replace(/\s+/g, '_');
        
        // Check if new name already exists
        const { data: existingRole } = await supabase
          .from('roles')
          .select('id')
          .ilike('name', normalizedName)
          .neq('id', editDialog.role.id);

        if (existingRole && existingRole.length > 0) {
          showSnackbar('A role with this name already exists', 'error');
          return;
        }
      }

      const updatedRole = {
        name: editDialog.role.name.toLowerCase().trim().replace(/\s+/g, '_'),
        display_name: editDialog.role.display_name,
        description: editDialog.role.description
      };

      // Update roles table
      const { error: roleError } = await supabase
        .from('roles')
        .update(updatedRole)
        .eq('id', editDialog.role.id);

      if (roleError) throw roleError;

      // Update role_permissions table too
      const { error: permError } = await supabase
        .from('role_permissions')
        .update({
          role_name: updatedRole.name,
          display_name: editDialog.role.display_name,
          description: editDialog.role.description
        })
        .eq('role_name', originalRole.name);

      if (permError) {
        console.warn('Could not update role_permissions entry:', permError);
      }

      showSnackbar('Role updated successfully', 'success');
      setEditDialog({ open: false, role: null, isNew: false });
      await fetchRoles();
      await fetchRolePermissions();

    } catch (err) {
      console.error('Error updating role:', err);
      showSnackbar('Failed to update role', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!deleteDialog.role) {
      console.error('No role selected for deletion');
      return;
    }

    console.log('🗑️ Attempting to delete role:', deleteDialog.role);

    if (deleteDialog.role.usage_count > 0) {
      showSnackbar(`Cannot delete role "${deleteDialog.role.display_name || deleteDialog.role.name}" - it's assigned to ${deleteDialog.role.usage_count} users`, 'error');
      return;
    }

    setSaving(true);
    try {
      console.log('🗑️ Deleting role from roles table:', deleteDialog.role.id);
      
      // Delete from roles table
      const { error: roleError, data: deletedData } = await supabase
        .from('roles')
        .delete()
        .eq('id', deleteDialog.role.id)
        .select(); // Get the deleted data to confirm

      console.log('🗑️ Delete result:', { roleError, deletedData });

      if (roleError) {
        console.error('❌ Role deletion failed:', roleError);
        throw roleError;
      }

      if (!deletedData || deletedData.length === 0) {
        console.warn('⚠️ No role was deleted - might not exist or no permission');
        throw new Error('Role not found or permission denied');
      }

      console.log('✅ Role deleted successfully from roles table');

      // Delete from role_permissions table (if table exists)
      try {
        console.log('🗑️ Attempting to delete from role_permissions table');
        const { error: permError } = await supabase
          .from('role_permissions')
          .delete()
          .eq('role_name', deleteDialog.role.name);

        if (permError && permError.code !== '42P01') { // 42P01 = table doesn't exist
          console.warn('Could not delete role_permissions entry:', permError);
        } else if (!permError) {
          console.log('✅ Role deleted from role_permissions table');
        }
      } catch (permErr) {
        console.warn('role_permissions table may not exist:', permErr);
      }

      showSnackbar(`Role "${deleteDialog.role.display_name || deleteDialog.role.name}" deleted successfully`, 'success');
      setDeleteDialog({ open: false, role: null });
      
      console.log('🔄 Refreshing roles list...');
      await fetchRoles();
      console.log('🔄 Refreshing role permissions...');
      await fetchRolePermissions();
      console.log('✅ UI refresh completed');

    } catch (err) {
      console.error('❌ Error deleting role:', err);
      showSnackbar(`Failed to delete role: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePermissionChange = async (roleName, permissionId, enabled) => {
    console.log('🔄 Permission change requested:', { roleName, permissionId, enabled });
    
    try {
      const rolePermission = rolePermissions.find(rp => rp.role_name === roleName);
      console.log('🔍 Found role permission:', rolePermission);
      
      if (!rolePermission) {
        console.error('❌ Role permission not found for:', roleName);
        showSnackbar(`Role "${roleName}" not found`, 'error');
        return;
      }

      const currentPermissions = rolePermission.permissions || [];
      console.log('📋 Current permissions:', currentPermissions);

      const updatedPermissions = enabled
        ? [...currentPermissions, permissionId]
        : currentPermissions.filter(p => p !== permissionId);
      
      console.log('📋 Updated permissions:', updatedPermissions);

      const updateData = {
        permissions: updatedPermissions,
        organization_id: organization?.id || 'global'
      };
      
      console.log('💾 Updating database with:', updateData);
      console.log('🎯 Update conditions:', { role_name: roleName, organization_id: organization?.id || 'global' });

      const { data: updateResult, error } = await supabase
        .from('role_permissions')
        .update({ permissions: updatedPermissions })
        .eq('role_name', roleName)
        .eq('organization_id', organization?.id || 'global')
        .select(); // Add select to see what was updated

      console.log('💾 Database update result:', { updateResult, error });

      if (error) {
        console.error('❌ Database update failed:', error);
        throw error;
      }

      if (!updateResult || updateResult.length === 0) {
        console.warn('⚠️ No rows were updated - role_permissions entry may not exist');
        showSnackbar(`No permission record found for role "${roleName}". Creating new record...`, 'warning');
        
        // Try to create a new record
        const { data: insertResult, error: insertError } = await supabase
          .from('role_permissions')
          .insert([{
            role_name: roleName,
            permissions: updatedPermissions,
            organization_id: organization?.id || 'global',
            display_name: roleName.charAt(0).toUpperCase() + roleName.slice(1),
            description: `Permissions for ${roleName} role`
          }])
          .select();

        console.log('➕ Insert result:', { insertResult, insertError });

        if (insertError) {
          console.error('❌ Insert failed:', insertError);
          throw insertError;
        }

        showSnackbar(`Created new permission record for "${roleName}"`, 'success');
      } else {
        console.log('✅ Database updated successfully');
        showSnackbar('Permissions updated successfully', 'success');
      }

      // Update local state
      setRolePermissions(prev => prev.map(rp => 
        rp.role_name === roleName 
          ? { ...rp, permissions: updatedPermissions }
          : rp
      ));

      console.log('✅ Local state updated');

    } catch (err) {
      console.error('❌ Error updating permissions:', err);
      showSnackbar(`Failed to update permissions: ${err.message}`, 'error');
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const getRoleIcon = (roleName) => {
    const role = roleName?.toLowerCase();
    switch (role) {
      case 'admin':
      case 'administrator':
        return <AdminIcon color="primary" />;
      case 'manager':
        return <BusinessIcon color="secondary" />;
      case 'owner':
        return <SecurityIcon color="error" />;
      default:
        return <PeopleIcon color="action" />;
    }
  };

  const getRoleColor = (roleName) => {
    const role = roleName?.toLowerCase();
    switch (role) {
      case 'admin':
      case 'administrator':
        return 'primary';
      case 'manager':
        return 'secondary';
      case 'owner':
        return 'error';
      default:
        return 'default';
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Role & Permission Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setEditDialog({ open: true, role: null, isNew: true })}
        >
          Add Role
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Comprehensive Role Management:</strong> Create and manage roles, then configure their permissions.
          Role names are case-insensitive and automatically normalized.
        </Typography>
      </Alert>

      <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Manage Roles" />
        <Tab label="Configure Permissions" />
      </Tabs>

      {/* Tab 1: Manage Roles */}
      {currentTab === 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Role</TableCell>
                <TableCell>Display Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Users</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getRoleIcon(role.name)}
                      <Chip 
                        label={role.name}
                        color={getRoleColor(role.name)}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {role.display_name || role.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {role.description || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={`${role.usage_count} users`}
                      size="small"
                      color={role.usage_count > 0 ? 'primary' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Edit role">
                        <IconButton
                          size="small"
                          onClick={() => setEditDialog({ open: true, role: { ...role }, isNew: false })}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={role.usage_count > 0 ? `Cannot delete - assigned to ${role.usage_count} users` : "Delete role"}>
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            disabled={role.usage_count > 0}
                            onClick={() => setDeleteDialog({ open: true, role })}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {roles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      No roles found. Create your first role to get started.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Tab 2: Configure Permissions */}
      {currentTab === 1 && (
        <Grid container spacing={3}>
          {rolePermissions.map((rolePermission) => (
            <Grid item xs={12} key={rolePermission.role_name}>
              <Card>
                <CardHeader
                  avatar={getRoleIcon(rolePermission.role_name)}
                  title={rolePermission.display_name || rolePermission.role_name}
                  subheader={rolePermission.description}
                />
                <CardContent>
                  {Object.entries(allMenuSections).map(([sectionKey, section]) => (
                    <Accordion key={sectionKey}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {section.icon}
                          <Typography variant="h6">{section.title}</Typography>
                          <Chip 
                            label={`${section.items.filter(item => 
                              rolePermission.permissions?.includes(item.id)
                            ).length}/${section.items.length}`}
                            size="small"
                            color="primary"
                          />
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <FormGroup>
                          {section.items.map((item) => (
                            <FormControlLabel
                              key={item.id}
                              control={
                                <Checkbox
                                  checked={rolePermission.permissions?.includes(item.id) || false}
                                  onChange={(e) => handlePermissionChange(
                                    rolePermission.role_name, 
                                    item.id, 
                                    e.target.checked
                                  )}
                                />
                              }
                              label={item.title}
                            />
                          ))}
                        </FormGroup>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create/Edit Role Dialog */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, role: null, isNew: false })} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editDialog.isNew ? 'Create New Role' : 'Edit Role'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Role Name"
                value={editDialog.isNew ? newRole.name : editDialog.role?.name || ''}
                onChange={(e) => {
                  if (editDialog.isNew) {
                    setNewRole({ ...newRole, name: e.target.value });
                  } else {
                    setEditDialog({
                      ...editDialog,
                      role: { ...editDialog.role, name: e.target.value }
                    });
                  }
                }}
                disabled={!editDialog.isNew && profile?.role !== 'owner'}
                helperText={
                  editDialog.isNew 
                    ? "Role name will be normalized (lowercase, underscores)" 
                    : profile?.role === 'owner' 
                      ? "Role name will be normalized (lowercase, underscores)" 
                      : "Only owners can change role names"
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Display Name"
                value={editDialog.isNew ? newRole.display_name : editDialog.role?.display_name || ''}
                onChange={(e) => {
                  if (editDialog.isNew) {
                    setNewRole({ ...newRole, display_name: e.target.value });
                  } else {
                    setEditDialog({
                      ...editDialog,
                      role: { ...editDialog.role, display_name: e.target.value }
                    });
                  }
                }}
                helperText="User-friendly name shown in the interface"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={editDialog.isNew ? newRole.description : editDialog.role?.description || ''}
                onChange={(e) => {
                  if (editDialog.isNew) {
                    setNewRole({ ...newRole, description: e.target.value });
                  } else {
                    setEditDialog({
                      ...editDialog,
                      role: { ...editDialog.role, description: e.target.value }
                    });
                  }
                }}
                helperText="Optional description of the role's purpose"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setEditDialog({ open: false, role: null, isNew: false });
            setNewRole({ name: '', display_name: '', description: '' });
          }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={editDialog.isNew ? handleCreateRole : handleUpdateRole}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            {saving ? 'Saving...' : (editDialog.isNew ? 'Create' : 'Update')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, role: null })}>
        <DialogTitle>Delete Role</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the role "{deleteDialog.role?.display_name || deleteDialog.role?.name}"?
          </Typography>
          {deleteDialog.role?.usage_count > 0 && (
            <Alert severity="error" sx={{ mt: 2 }}>
              This role is assigned to {deleteDialog.role.usage_count} users and cannot be deleted.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, role: null })}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteRole}
            disabled={saving || deleteDialog.role?.usage_count > 0}
            startIcon={saving ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {saving ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ 
          zIndex: 9999, // Ensure it appears above sidebar
          mt: 8 // Add top margin to avoid header overlap
        }}
      >
        <Alert 
          severity={snackbar.severity} 
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{ 
            minWidth: '300px',
            boxShadow: 3 // Add shadow for better visibility
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
