import logger from '../utils/logger';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';
import { subscriptionService } from '../services/subscriptionService';
import {
  Box, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody, TableContainer, TextField, Button, Select, MenuItem, Snackbar, Alert, Stack, Chip, LinearProgress, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip, FormControl, InputLabel
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, Add as AddIcon, ContentCopy as CopyIcon } from '@mui/icons-material';
import { usePermissions } from '../context/PermissionsContext';

// Helper function to get role display name
const getRoleDisplayName = (user) => {
  // Try role from JOIN first (roles.name)
  if (user.roles?.name) return user.roles.name;
  
  // Fallback to direct role field
  if (user.role) return user.role;
  
  // Handle common role IDs/names
  if (user.role_id) {
    // If role_id looks like a UUID but we don't have the joined name, show a fallback
    if (user.role_id.includes('-')) {
      return 'Loading...';
    }
    return user.role_id;
  }
  
  return 'N/A';
};

// Helper function to get role color
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
    case 'user':
      return 'default';
    default:
      return 'default';
  }
};

// Helper function to check if a limit is effectively unlimited
const isUnlimited = (limit) => {
  // Handle null, undefined
  if (limit === null || limit === undefined) {
    return true;
  }
  
  // Handle -1 (common unlimited marker)
  if (limit === -1) {
    return true;
  }
  
  // Handle numeric values >= 999999 (common unlimited marker)
  if (typeof limit === 'number' && limit >= 999999) {
    return true;
  }
  
  // Handle string values like "unlimited", "Unlimited", etc.
  if (typeof limit === 'string' && limit.toLowerCase() === 'unlimited') {
    return true;
  }
  
  // Handle empty string (should be treated as unlimited)
  if (limit === '') {
    return true;
  }
  
  return false;
};

export default function UserManagement() {
  const { profile, organization } = useAuth();
  const { can, isOrgAdmin } = usePermissions();
  
  // Debug logging (development only)
  if (import.meta.env.DEV) {
    logger.log('UserManagement Debug:', {
      profile,
      organization,
      canManageUsers: can('manage:users'),
      isOrgAdmin,
      profileRole: profile?.role
    });
  }
  
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
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  useEffect(() => {
    if (organization && can('manage:users')) {
      fetchUsers();
      fetchUsage();
      fetchRoles();
      fetchPendingInvites();
    }
  }, [profile, organization, can]);

  // Add timeout detection for loading organization
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!organization && profile) {
        setLoadingTimeout(true);
      }
    }, 10000); // 10 seconds timeout

    return () => clearTimeout(timer);
  }, [organization, profile]);

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
      .select(`
        id, 
        email, 
        role, 
        role_id, 
        full_name, 
        created_at,
        roles:role_id (
          id,
          name
        )
      `)
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false });
    
    logger.log('Fetched users with roles:', data);
    
    if (error) {
      logger.error('Error fetching users:', error);
      setError(error.message);
    } else {
      setUsers(data);
    }
    setLoading(false);
  }

  async function fetchUsage() {
    try {
      const usageData = await subscriptionService.getOrganizationUsage(organization.id);
      setUsage(usageData);
    } catch (error) {
      logger.error('Error fetching usage:', error);
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
      // Normalize email to lowercase for consistent database queries
      const normalizedEmail = newEmail.trim().toLowerCase();
      
      if (!normalizedEmail || !normalizedEmail.includes('@')) {
        throw new Error('Please enter a valid email address');
      }

      // Check if email already exists in the organization
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('organization_id', organization.id)
        .eq('email', normalizedEmail)
        .single();

      if (existingUser) {
        throw new Error('This email is already registered in your organization');
      }

      // Check if email is already registered with ANY organization (global check)
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('email, organization_id, is_active, deleted_at, disabled_at, organizations(name)')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (existingProfile) {
        // Check if profile is active and has an organization
        if (existingProfile.organization_id && existingProfile.is_active !== false && !existingProfile.deleted_at && !existingProfile.disabled_at) {
          if (existingProfile.organization_id === organization.id) {
            throw new Error(`This email (${normalizedEmail}) is already registered in your organization.`);
          } else {
            throw new Error(`This email (${normalizedEmail}) is already registered with another organization "${existingProfile.organizations?.name}". Each email can only be associated with one organization globally. Please use a different email address.`);
          }
        }
        // If profile exists but is deleted/disabled, we'll allow the invite
        // The user can reactivate their account when they accept the invite
      }

      // Check if there's already a pending invite for this email in ANY organization
      const { data: existingGlobalInvite, error: inviteCheckError } = await supabase
        .from('organization_invites')
        .select('id, organization_id, organizations(name)')
        .eq('email', normalizedEmail)
        .is('accepted_at', null)
        .maybeSingle();
      
      // Handle query errors gracefully
      if (inviteCheckError && inviteCheckError.code !== 'PGRST116') {
        logger.warn('Error checking for existing invites:', inviteCheckError);
        // Continue anyway - the RPC function will handle duplicates
      }

      if (existingGlobalInvite) {
        if (existingGlobalInvite.organization_id === organization.id) {
          throw new Error('An invite has already been sent to this email from your organization');
        } else {
          throw new Error(`This email already has a pending invite from organization "${existingGlobalInvite.organizations?.name}". Each email can only have one pending invite globally.`);
        }
      }

      // Create the invite using the database function
      const { data: rpcData, error } = await supabase.rpc('create_organization_invite', {
        p_organization_id: organization.id,
        p_email: normalizedEmail,
        p_role: newRoleId,
        p_expires_in_days: 7
      });

      if (error) {
        // Check if it's a constraint violation and provide user-friendly message
        if (error.message.includes('organization_invites_organization_id_email_key')) {
          throw new Error('An invite has already been sent to this email from your organization. Please check the existing invites or wait for the user to respond.');
        }
        if (error.message.includes('profiles_pkey') || error.message.includes('duplicate key value')) {
          throw new Error(`This email (${normalizedEmail}) already has an account. They can sign in directly or contact support if they need to join your organization.`);
        }
        throw error;
      }

      // Try to get the invite token - check if RPC returned it first
      let inviteToken = null;
      
      // Check if RPC function returned the token directly
      if (rpcData && typeof rpcData === 'string') {
        inviteToken = rpcData;
      } else if (rpcData && rpcData.invite_token) {
        inviteToken = rpcData.invite_token;
      } else if (rpcData && Array.isArray(rpcData) && rpcData.length > 0 && rpcData[0].invite_token) {
        inviteToken = rpcData[0].invite_token;
      }
      
      // If RPC didn't return token, try fetching it (but don't fail if this doesn't work)
      if (!inviteToken) {
        try {
          const { data: inviteRow, error: inviteFetchError } = await supabase
            .from('organization_invites')
            .select('invite_token')
            .eq('organization_id', organization.id)
            .eq('email', normalizedEmail)
            .is('accepted_at', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (!inviteFetchError && inviteRow && inviteRow.invite_token) {
            inviteToken = inviteRow.invite_token;
          } else if (inviteFetchError) {
            logger.warn('Could not fetch invite token (invite was still created):', inviteFetchError);
            // Don't throw - invite was created successfully, we just can't send email automatically
          }
        } catch (fetchErr) {
          logger.warn('Error fetching invite token (invite was still created):', fetchErr);
          // Continue - invite was created successfully
        }
      }

      if (inviteToken) {
        const inviteLink = `${window.location.origin}/accept-invite?token=${inviteToken}`;
        
        try {
          const emailResponse = await fetch('/.netlify/functions/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: normalizedEmail,
              subject: `You're invited to join ${organization.name}`,
              template: 'invite',
              data: {
                inviteLink,
                organizationName: organization.name,
                inviterName: profile.full_name || profile.email,
              }
            })
          });

          if (!emailResponse.ok) {
            // Try to parse error response, but handle empty responses
            let errorMessage = 'Unknown error';
            let errorDetails = '';
            try {
              const errorText = await emailResponse.text();
              let errorData;
              try {
                errorData = JSON.parse(errorText);
              } catch (e) {
                // If not JSON, use the text as error message
                errorMessage = errorText || `Email service returned status ${emailResponse.status}`;
                throw new Error(errorMessage);
              }
              
              errorMessage = errorData.error || errorData.message || 'Email service unavailable';
              errorDetails = errorData.details || '';
              
              // Provide actionable error messages
              if (errorMessage.includes('Email service not configured') || errorMessage.includes('not configured')) {
                errorMessage = '❌ Email service not configured in Netlify.\n\n';
                errorMessage += 'Go to Netlify Dashboard → Site Settings → Environment Variables and add:\n\n';
                errorMessage += 'For Gmail (what you have in Supabase):\n';
                errorMessage += '• EMAIL_USER=Scanified@gmail.com\n';
                errorMessage += '• EMAIL_PASSWORD=your-app-password (use App Password, not regular password)\n';
                errorMessage += '• EMAIL_FROM=Scanified@gmail.com\n\n';
                errorMessage += 'Then redeploy your site.';
              } else if (errorMessage.includes('connection failed') || errorMessage.includes('SMTP') || errorMessage.includes('Authentication')) {
                errorMessage = `❌ Email connection/authentication failed.\n\n`;
                errorMessage += `Error: ${errorDetails || errorMessage}\n\n`;
                errorMessage += 'Common fixes:\n';
                errorMessage += '1. For Gmail: Use an App Password (not regular password)\n';
                errorMessage += '   - Enable 2FA → Generate App Password → Use that in EMAIL_PASSWORD\n';
                errorMessage += '2. Verify credentials match Supabase SMTP settings exactly\n';
                errorMessage += '3. Redeploy site after adding/updating environment variables\n';
                errorMessage += '4. Check Netlify function logs: Functions → send-email → Logs';
              } else if (emailResponse.status === 500) {
                errorMessage = `❌ Email service error (500).\n\n`;
                errorMessage += `Details: ${errorDetails || errorMessage}\n\n`;
                errorMessage += 'Most likely causes:\n';
                errorMessage += '1. Email credentials not configured in Netlify\n';
                errorMessage += '2. Wrong password (Gmail needs App Password)\n';
                errorMessage += '3. SMTP connection failure\n\n';
                errorMessage += 'Check Netlify function logs for exact error: Functions → send-email → Logs';
              }
            } catch (parseError) {
              errorMessage = `Email service returned status ${emailResponse.status}.\n\n`;
              errorMessage += 'Check Netlify function logs: Functions → send-email → Logs\n\n';
              errorMessage += 'Most likely: Email credentials not configured in Netlify environment variables.';
            }
            logger.error('Email sending failed:', errorMessage, errorDetails);
            throw new Error(errorMessage + (errorDetails && !errorMessage.includes(errorDetails) ? '\n\nTechnical Details: ' + errorDetails : ''));
          }

          logger.log('Invitation email sent successfully to:', normalizedEmail);
          setSuccess(`Invite sent to ${normalizedEmail}. The user will receive an email with instructions to join your organization.`);
        } catch (emailError) {
          logger.error('Error sending invitation email:', emailError);
          // Don't throw here - the invite was created successfully, just email failed
          const errorMsg = emailError.message || 'Unknown error';
          setError(`✅ Invite created successfully! However, email sending failed: ${errorMsg}\n\n📋 Copy the invite link from the "Pending Invites" section below and send it manually.`);
          // Still fetch updated data even though email failed
          fetchUsers();
          fetchPendingInvites();
          setNewEmail('');
          setNewRoleId(roles.length > 0 ? roles[0].id : '');
          setShowAddDialog(false);
          return; // Exit early to avoid showing success message
        }
      } else {
        // Invite was created but we couldn't get the token - still show success
        logger.warn('Invite created but token not available for email sending');
        setSuccess(`✅ Invite created successfully! However, we couldn't retrieve the invite token to send email automatically.\n\n📋 Please copy the invite link from the "Pending Invites" section below and send it manually.`);
      }
      setNewEmail('');
      setNewRoleId(roles.length > 0 ? roles[0].id : '');
      setShowAddDialog(false);
      fetchUsers();
      fetchPendingInvites();
    } catch (err) {
      logger.error('Error adding user:', err);
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function handleUpdateUser(userId, updates) {
    try {
      const updateData = {};
      if (updates.role_id !== undefined) {
        updateData.role_id = updates.role_id;
      }
      if (updates.full_name !== undefined) {
        updateData.full_name = updates.full_name;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId)
        .eq('organization_id', organization.id);

      if (error) throw error;
      setSuccess('User updated successfully!');
      setShowEditDialog(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      logger.error('Error updating user:', err);
      setError(err.message);
    }
  }

  async function handleDeleteUser(userId, userEmail) {
    if (!confirm(`Are you sure you want to PERMANENTLY DELETE ${userEmail}? This will remove them from Supabase Auth and they will need to create a new account to rejoin.`)) {
      return;
    }

    try {
      // Step 1: Delete from Supabase Auth (permanent deletion)
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      
      if (authError) {
        logger.warn('Could not delete from auth (may not have admin privileges):', authError);
        // Continue with profile deletion even if auth deletion fails
      } else {
        logger.log('✅ User deleted from Supabase Auth');
      }

      // Step 2: Delete from profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)
        .eq('organization_id', organization.id);

      if (profileError) throw profileError;

      setSuccess(`User ${userEmail} has been PERMANENTLY DELETED from Supabase. They will need to create a new account to rejoin.`);
      fetchUsers();
    } catch (err) {
      logger.error('Error deleting user:', err);
      setError(`Failed to delete user: ${err.message}`);
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
    logger.log('UserManagement Access Check:');
    logger.log('- Profile:', profile);
    logger.log('- Profile role:', profile?.role);
    logger.log('- Can manage users:', can('manage:users'));
    logger.log('- Is org admin:', isOrgAdmin);
    
    // Fallback for admin users
    if (profile?.role === 'admin' || isOrgAdmin) {
      logger.log('- Allowing access via admin fallback');
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

  // Add safety check for organization
  if (!organization) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity={loadingTimeout ? "error" : "info"} sx={{ mb: 2 }}>
          <Typography variant="body2">
            {loadingTimeout 
              ? "Unable to load organization data. Please refresh the page or contact support if the issue persists."
              : "Loading organization data..."
            }
          </Typography>
          {!loadingTimeout && <LinearProgress sx={{ mt: 1 }} />}
        </Alert>
        {/* Debug info - remove in production */}
        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="caption">
            Debug: Profile loaded: {profile ? 'Yes' : 'No'} | 
            Profile org ID: {profile?.organization_id || 'None'} | 
            Organization: {organization ? 'Loaded' : 'Not loaded'} |
            Timeout: {loadingTimeout ? 'Yes' : 'No'}
          </Typography>
        </Alert>
        {loadingTimeout && (
          <Button 
            variant="outlined" 
            onClick={() => window.location.reload()} 
            sx={{ mt: 2 }}
          >
            Refresh Page
          </Button>
        )}
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
                Users ({users.length} / {isUnlimited(organization?.max_users) ? 'Unlimited' : organization?.max_users ?? 'N/A'})
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={!isUnlimited(organization?.max_users) && organization?.max_users ? (users.length / organization.max_users) * 100 : 0}
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
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowAddDialog(true)}
            disabled={(!isUnlimited(organization?.max_users) && users.length >= (organization?.max_users || 0)) || !can('manage:users')}
          >
            Invite User
          </Button>
          {!isUnlimited(organization?.max_users) && users.length >= (organization?.max_users || 0) && (
            <>
              <Typography variant="caption" color="error" sx={{ ml: 2 }}>
                User limit reached. Upgrade your plan to add more users.
              </Typography>
              {(isOrgAdmin || profile?.role === 'owner') && (
                <Button
                  variant="outlined"
                  size="small"
                  color="warning"
                  onClick={async () => {
                    if (confirm('Set unlimited users for this organization? This will allow adding unlimited users.')) {
                      try {
                        const { error } = await supabase
                          .from('organizations')
                          .update({ max_users: -1 })
                          .eq('id', organization.id);
                        if (error) throw error;
                        setSuccess('Organization updated to unlimited users. Please refresh the page.');
                        // Refresh organization data
                        window.location.reload();
                      } catch (err) {
                        setError(`Failed to update: ${err.message}`);
                      }
                    }
                  }}
                  sx={{ ml: 2 }}
                >
                  Set Unlimited (Admin)
                </Button>
              )}
            </>
          )}
        </Stack>
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
                    label={getRoleDisplayName(user)}
                    color={getRoleColor(getRoleDisplayName(user))}
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
                            <IconButton size="small" onClick={() => handleCopyInviteLink(invite.invite_token)}>
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
                onChange={(e) => setNewEmail(e.target.value.toLowerCase().trim())}
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
              role_id: editingUser.role_id,
              full_name: editingUser.full_name
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