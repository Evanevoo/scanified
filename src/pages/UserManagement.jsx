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

// Helper function to check if a limit is effectively unlimited
const isUnlimited = (limit) => limit === -1 || limit >= 999999;

// Helper function to get role display name
const getRoleDisplayName = (user, rolesList = []) => {
  // Try role from JOIN first (roles.name)
  if (user.roles?.name) return user.roles.name;
  
  // Fallback to direct role field (if it's a string name, not a UUID)
  if (user.role && typeof user.role === 'string' && !user.role.includes('-')) {
    return user.role;
  }
  
  // Handle role_id - always try to look it up in rolesList first
  if (user.role_id) {
    const matchedRole = rolesList.find(r => r.id === user.role_id);
    if (matchedRole?.name) {
      return matchedRole.name;
    }
    // If role_id is a UUID but we don't have a match, show a placeholder instead of the UUID
    if (typeof user.role_id === 'string' && user.role_id.includes('-')) {
      return 'Unknown Role';
    }
    // If it's not a UUID, return as-is (shouldn't happen, but handle it)
    return user.role_id;
  }
  
  // If user.role exists but is a UUID, try to look it up
  if (user.role && typeof user.role === 'string' && user.role.includes('-')) {
    const matchedRole = rolesList.find(r => r.id === user.role);
    if (matchedRole?.name) {
      return matchedRole.name;
    }
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
  const [currentPlan, setCurrentPlan] = useState(null);

  const planMaxUsers = currentPlan?.max_users ?? organization?.max_users ?? 0;
  const isUnlimitedUsers = isUnlimited(planMaxUsers);
  const planMaxUsersLabel = isUnlimitedUsers
    ? 'Unlimited'
    : (planMaxUsers > 0 ? planMaxUsers : 'N/A');
  const reachedUserLimit = !isUnlimitedUsers && planMaxUsers > 0 && users.length >= planMaxUsers;

  useEffect(() => {
    if (organization && can('manage:users')) {
      fetchUsers();
      fetchUsage();
      fetchRoles();
      fetchPendingInvites();
      fetchCurrentPlan();
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

  async function fetchCurrentPlan() {
    try {
      // Get subscription_plan_id from organization
      if (!organization?.subscription_plan_id) {
        setCurrentPlan(null);
        return;
      }

      // Fetch plan details from subscription_plans table
      const { data: planData, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', organization.subscription_plan_id)
        .single();

      if (planError) {
        logger.error('Error fetching current plan:', planError);
        setCurrentPlan(null);
        return;
      }

      setCurrentPlan(planData);
    } catch (error) {
      logger.error('Error in fetchCurrentPlan:', error);
      setCurrentPlan(null);
    }
  }

  async function fetchPendingInvites() {
    try {
      // Try RPC function first (bypasses RLS)
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_pending_invites', {
        p_organization_id: organization.id
      });

      if (!rpcError && rpcData !== null) {
        // RPC function returns array directly
        setPendingInvites(rpcData || []);
        logger.log('Fetched pending invites via RPC:', (rpcData || []).length);
        return;
      }

      // If RPC function doesn't exist or has error, check the error type
      if (rpcError) {
        // Check if function doesn't exist (42883) or permission denied (42501)
        if (rpcError.code === '42883' || (rpcError.message?.includes('function') && rpcError.message?.includes('does not exist'))) {
          logger.warn('get_pending_invites function not found in database. Please run the SQL from get-pending-invites-function.sql in your Supabase SQL Editor.');
        } else {
          logger.error('RPC function error (run SQL in Supabase):', rpcError);
          // Log full error details for debugging
          console.error('Full RPC error:', JSON.stringify(rpcError, null, 2));
        }
      }

      // Fallback to direct query (may fail due to RLS)
      const { data, error } = await supabase
        .from('organization_invites')
        .select('*')
        .eq('organization_id', organization.id)
        .is('accepted_at', null)
        .order('invited_at', { ascending: false });
      
      if (error) {
        // Handle RLS permission errors gracefully
        if (error.code === '42501' || error.code === 'PGRST301' || error.message?.includes('permission denied') || error.code === 'PGRST116') {
          const isFunctionMissing = rpcError?.code === '42883' || (rpcError?.message?.includes('function') && rpcError?.message?.includes('does not exist'));
          
          if (isFunctionMissing) {
            const errorMsg = 'The get_pending_invites SQL function is not installed in your Supabase database.\n\n' +
              'To fix this:\n' +
              '1. Open your Supabase Dashboard (https://app.supabase.com)\n' +
              '2. Go to SQL Editor\n' +
              '3. Open the file: get-pending-invites-function.sql\n' +
              '4. Copy the entire SQL and paste it into the SQL Editor\n' +
              '5. Click "Run" to execute it\n\n' +
              'This function bypasses RLS so you can view pending invites.';
            logger.warn(errorMsg);
            // Don't show as error if there might not be any invites anyway
            // Just log it and set empty array
            setPendingInvites([]);
            return;
          } else {
            const errorMsg = 'Cannot fetch pending invites due to RLS permissions. The get_pending_invites function may need to be reinstalled or permissions may need to be granted.';
            logger.warn(errorMsg);
            setPendingInvites([]);
            return;
          }
        }
        logger.error('Error fetching pending invites:', error);
        setPendingInvites([]);
        return;
      }
      
      setPendingInvites(data || []);
    } catch (err) {
      // Handle RLS permission errors gracefully
      if (err.code === '42501' || err.code === 'PGRST301' || err.message?.includes('permission denied') || err.code === 'PGRST116') {
        logger.warn('Cannot fetch pending invites due to RLS permissions. Please run the SQL function: get_pending_invites');
        setError('⚠️ Cannot fetch pending invites due to RLS permissions. Please run the SQL function: get_pending_invites');
        setPendingInvites([]);
        return;
      }
      logger.error('Error in fetchPendingInvites:', err);
      setPendingInvites([]);
    }
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
        .maybeSingle();

      if (existingUser) {
        throw new Error('This email is already registered in your organization');
      }

      // Check if email is already registered with ANY organization (global check)
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('email, organization_id, is_active, disabled_at')
        .eq('email', newEmail)
        .maybeSingle();
      
      if (profileCheckError) {
        logger.warn('Error checking existing profile:', profileCheckError);
        // Continue anyway - the RPC function will handle duplicate checks
      }

      if (existingProfile) {
        // Check if profile is active and has an organization
        if (existingProfile.organization_id && existingProfile.is_active !== false && !existingProfile.disabled_at) {
          if (existingProfile.organization_id === organization.id) {
            throw new Error(`This email (${newEmail}) is already registered in your organization.`);
          } else {
            throw new Error(`This email (${newEmail}) is already registered with another organization. Each email can only be associated with one organization globally. Please use a different email address.`);
          }
        }
        // If profile exists but is deleted/disabled, we'll allow the invite
        // The user can reactivate their account when they accept the invite
      }

      // Check if there's already a pending invite for this email in the current organization
      // Note: This may fail due to RLS, but we'll handle it gracefully
      try {
        const { data: existingOrgInvite } = await supabase
          .from('organization_invites')
          .select('id, organization_id')
          .eq('organization_id', organization.id)
          .eq('email', newEmail)
          .is('accepted_at', null)
          .maybeSingle();
        
        if (existingOrgInvite) {
          throw new Error('An invite has already been sent to this email from your organization');
        }
      } catch (checkError) {
        // If RLS blocks the check, log it but continue - the RPC function will handle duplicates
        if (checkError.code === '42501' || checkError.code === 'PGRST301') {
          logger.warn('Could not check for existing invite due to RLS, continuing anyway:', checkError);
        } else if (checkError.message.includes('already been sent')) {
          // Re-throw the user-friendly error
          throw checkError;
        } else {
          logger.warn('Error checking for existing invite, continuing anyway:', checkError);
        }
      }

      // Create the invite using the database function
      // The RPC function should return the invite_token directly
      const { data: inviteToken, error } = await supabase.rpc('create_organization_invite', {
        p_organization_id: organization.id,
        p_email: newEmail,
        p_role: newRoleId,
        p_expires_in_days: 7
      });

      logger.log('RPC create_organization_invite response:', { inviteToken, error });

      if (error) {
        // Check if it's a constraint violation and provide user-friendly message
        if (error.message.includes('organization_invites_organization_id_email_key')) {
          throw new Error('An invite has already been sent to this email from your organization. Please check the existing invites or wait for the user to respond.');
        }
        if (error.message.includes('profiles_pkey') || error.message.includes('duplicate key value')) {
          throw new Error(`This email (${newEmail}) already has an account. They can sign in directly or contact support if they need to join your organization.`);
        }
        throw error;
      }

      // The RPC function should return the invite_token directly
      // Handle both string return and object return formats
      const token = typeof inviteToken === 'string' 
        ? inviteToken 
        : (inviteToken?.invite_token || inviteToken?.[0]?.invite_token || (Array.isArray(inviteToken) && inviteToken[0]) || inviteToken);
      
      logger.log('Extracted token:', token);

      if (!token) {
        logger.error('RPC function did not return invite token. Response:', inviteToken);
        throw new Error('Failed to create invite token. Please try again.');
      }

      const inviteLink = `${window.location.origin}/accept-invite?token=${token}`;
      
      try {
          logger.log('Sending invitation email to:', newEmail);
          logger.log('Invite link:', inviteLink);
          
          // Check if we're in local development
          const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
          if (isLocalDev) {
            logger.warn('Local development detected - Netlify functions may not be available. Use "netlify dev" to test email functionality.');
          }
          
          const emailResponse = await fetch('/.netlify/functions/send-invite-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: newEmail,
              inviteLink,
              organizationName: organization.name,
              inviter: profile.full_name || profile.email,
            })
          });

          logger.log('Email response status:', emailResponse.status);
          logger.log('Email response ok:', emailResponse.ok);

          // Parse response body
          let responseData;
          try {
            const responseText = await emailResponse.text();
            logger.log('Email response text:', responseText);
            responseData = responseText ? JSON.parse(responseText) : {};
          } catch (parseError) {
            logger.error('Error parsing email response:', parseError);
            responseData = {};
          }

          if (!emailResponse.ok) {
            const errorMessage = responseData.error || responseData.details || `Email service returned status ${emailResponse.status}`;
            logger.error('Email sending failed:', errorMessage, responseData);
            throw new Error(errorMessage);
          }

          // Check if response indicates success
          if (responseData.success) {
            logger.log('Invitation email sent successfully to:', newEmail, 'via', responseData.service);
          } else if (responseData.error) {
            logger.error('Email service returned error:', responseData.error);
            throw new Error(responseData.error);
          } else {
            logger.warn('Email response unclear, assuming success');
          }
        } catch (emailError) {
          logger.error('Error sending invitation email:', emailError);
          // Don't throw here - the invite was created successfully, just email failed
          const errorMsg = emailError.message || 'Unknown error';
          setError(`✅ Invite created successfully! However, email sending failed: ${errorMsg}\n\n📋 Copy the invite link from the "Pending Invites" section below and send it manually.\n\n🔗 Link: ${inviteLink}`);
          // Still fetch updated data even though email failed
          fetchUsers();
          fetchPendingInvites();
          setNewEmail('');
          setNewRoleId(roles.length > 0 ? roles[0].id : '');
          setShowAddDialog(false);
          return; // Exit early to avoid showing success message
        }

        setSuccess(`Invite sent to ${newEmail}. The user will receive an email with instructions to join your organization.`);
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
      logger.error('Error updating user:', err);
      setError(err.message);
    }
  }

  async function handleDeleteUser(userId, userEmail) {
    if (!confirm(`Are you sure you want to PERMANENTLY DELETE ${userEmail}? This will remove them from Supabase Auth and they will need to create a new account to rejoin.`)) {
      return;
    }

    try {
      // Check if we're in local development
      const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocalDev && window.location.port === '5175') {
        logger.warn('Running on Vite dev server. Netlify functions require "netlify dev" to be running on port 8888.');
      }

      const response = await fetch('/.netlify/functions/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          organizationId: organization.id
        })
      });

      // Parse response
      let responseData;
      try {
        const responseText = await response.text();
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        logger.error('Error parsing delete response:', parseError);
        responseData = {};
      }

      if (!response.ok) {
        let errorMessage = 'Unknown error removing user';
        
        if (response.status === 404) {
          if (isLocalDev) {
            errorMessage = 'Delete user function not found. To fix this:\n\n1. Stop the current dev server (Ctrl+C)\n2. Run "netlify dev" instead of "npm run dev"\n3. Access the app at http://localhost:8888 (not port 5175)\n\nThis will start both Vite and Netlify Functions servers.';
          } else {
            errorMessage = 'Delete user function not found. Please ensure the function is deployed to Netlify.';
          }
        } else {
          errorMessage = responseData.error || responseData.message || `Server returned status ${response.status}`;
          if (responseData.details) {
            logger.error('Delete user error details:', responseData.details);
          }
        }
        
        throw new Error(errorMessage);
      }

      // Success
      if (responseData.success) {
        logger.log('User deleted successfully:', responseData.deletedUser);
        setSuccess(`User ${userEmail} has been PERMANENTLY DELETED from Supabase. They will need to create a new account to rejoin.`);
        // Refresh the user list
        await fetchUsers();
      } else {
        throw new Error(responseData.error || 'User deletion may have failed');
      }
    } catch (err) {
      logger.error('Error deleting user:', err);
      
      // Handle network errors (function server not running)
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.name === 'TypeError') {
        const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isLocalDev) {
          setError('Cannot connect to Netlify Functions. Please run "netlify dev" (not "npm run dev") and access the app at http://localhost:8888');
        } else {
          setError(`Failed to delete user: ${err.message}`);
        }
      } else {
        setError(`Failed to delete user: ${err.message}`);
      }
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
                Users ({users.length} / {planMaxUsersLabel})
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={isUnlimitedUsers || planMaxUsers <= 0 ? 0 : Math.min((users.length / planMaxUsers) * 100, 100)}
                sx={{ mt: 1, width: 200 }}
              />
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Plan: {currentPlan?.name || organization?.subscription_plan || 'N/A'}
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
          disabled={reachedUserLimit || !can('manage:users')}
        >
          Invite User
        </Button>
        {reachedUserLimit && (
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
            {users.map((user) => {
              const roleLabel = getRoleDisplayName(user, roles);
              return (
                <TableRow key={user.id}>
                  <TableCell>{user.full_name || 'N/A'}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip 
                      label={roleLabel}
                      color={getRoleColor(roleLabel)}
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
              );
            })}
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
                    <TableCell>{new Date(invite.invited_at || invite.created_at).toLocaleDateString()}</TableCell>
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