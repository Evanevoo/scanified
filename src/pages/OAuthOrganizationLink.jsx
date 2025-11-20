import logger from '../utils/logger';
import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Alert, CircularProgress,
  TextField, FormControl, InputLabel, Select, MenuItem, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Chip,
  Container, Paper, AppBar, Toolbar, IconButton
} from '@mui/material';
import {
  Business as BusinessIcon,
  Link as LinkIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Email as EmailIcon,
  Google as GoogleIcon,
  Code as CodeIcon,
  CheckCircle as CheckIcon,
  ArrowBack as ArrowBackIcon,
  Home as HomeIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';

export default function OAuthOrganizationLink() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [organizationCode, setOrganizationCode] = useState('');
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [codeValidating, setCodeValidating] = useState(false);
  
  // Check for invite token in localStorage (set during OAuth redirect)
  const [inviteToken, setInviteToken] = useState('');
  const [invite, setInvite] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Check if user already has organization
    if (profile?.organization_id) {
      // Check if the organization was deleted
      checkIfOrganizationDeleted();
      return;
    }

    checkForInviteToken();
    checkEmailDomainMatch();
  }, [user, profile, navigate]);

  const checkIfOrganizationDeleted = async () => {
    try {
      const { data: orgData, error } = await supabase
        .from('organizations')
        .select('id, name, deleted_at, deletion_reason')
        .eq('id', profile.organization_id)
        .single();

      if (orgData && orgData.deleted_at) {
        // Organization was deleted, redirect to organization deleted page
        const email = encodeURIComponent(user.email);
        const reason = encodeURIComponent(orgData.deletion_reason || 'Your organization has been removed');
        window.location.href = `/organization-deleted?email=${email}&reason=${reason}`;
        return;
      }

      // Organization exists and is active, redirect to dashboard
      navigate('/dashboard');
    } catch (error) {
      logger.error('Error checking organization status:', error);
      // If we can't check, assume it's fine and redirect to dashboard
      navigate('/dashboard');
    }
  };

  const checkForInviteToken = () => {
    // Check if there's an invite token stored from OAuth redirect
    const storedToken = localStorage.getItem('pending_invite_token');
    if (storedToken) {
      setInviteToken(storedToken);
      verifyInviteToken(storedToken);
      localStorage.removeItem('pending_invite_token'); // Clean up
    }
    setLoading(false);
  };

  const checkEmailDomainMatch = async () => {
    if (!user?.email) return;
    
    const domain = user.email.split('@')[1];
    if (!domain) return;

    try {
      // Check if any organization has this email domain (exclude soft-deleted)
      const { data: matchingOrg, error } = await supabase
        .from('organizations')
        .select('id, name, domain')
        .eq('domain', domain)
        .is('deleted_at', null) // Exclude soft-deleted organizations
        .single();

      if (matchingOrg) {
        setSuccess(`We found an organization matching your email domain (${domain}). You can join ${matchingOrg.name} automatically.`);
        setSelectedOrgId(matchingOrg.id);
      }
    } catch (err) {
      // No matching domain found, that's okay
    }
  };

  const verifyInviteToken = async (token) => {
    try {
      const { data: inviteData, error } = await supabase
        .from('organization_invites')
        .select(`
          *,
          organization:organizations(name, slug)
        `)
        .eq('invite_token', token)
        .single();

      if (error) {
        logger.error('Error verifying invite token:', error);
        return;
      }

      if (inviteData.email.toLowerCase() === user.email.toLowerCase()) {
        setInvite(inviteData);
        setSuccess(`You have a pending invitation to join ${inviteData.organization.name}!`);
      }
    } catch (err) {
      logger.error('Error in verifyInviteToken:', err);
    }
  };

  const handleAcceptInvite = async () => {
    if (!invite) return;
    
    setLinking(true);
    setError('');

    try {
      // Update user profile with organization and role
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
          role: invite.role,
          organization_id: invite.organization_id
        });

      if (profileError) throw profileError;

      // Accept the invite
      const { error: acceptError } = await supabase
        .from('organization_invites')
        .update({ accepted_at: new Date().toISOString() })
        .eq('invite_token', inviteToken);

      if (acceptError) throw acceptError;

      setSuccess(`Welcome to ${invite.organization.name}! Redirecting to dashboard...`);
      setTimeout(() => {
        window.location.href = '/dashboard'; // Force full reload to update auth context
      }, 2000);

    } catch (err) {
      logger.error('Error accepting invite:', err);
      setError(err.message);
    } finally {
      setLinking(false);
    }
  };

  const handleJoinByCode = async () => {
    if (!organizationCode.trim()) {
      setError('Please enter a 6-digit join code');
      return;
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(organizationCode.trim())) {
      setError('Join code must be exactly 6 digits');
      return;
    }

    setCodeValidating(true);
    setError('');

    try {
      logger.log('🔍 Attempting to use join code:', organizationCode.trim());
      logger.log('👤 User ID:', user.id);
      logger.log('👤 User Email:', user.email);
      
      // First, let's check if the code exists in the database
      logger.log('🔍 Searching for code:', organizationCode.trim(), 'length:', organizationCode.trim().length);
      
      const { data: codeCheck, error: codeCheckError } = await supabase
        .from('organization_join_codes')
        .select('*')
        .eq('code', organizationCode.trim());

      // Also check for any codes that might be similar (debugging)
      const { data: allCodes, error: allCodesError } = await supabase
        .from('organization_join_codes')
        .select('code, organization_id, is_active, expires_at')
        .limit(10);
        
      logger.log('🔍 All recent codes in database:', allCodes);
      logger.log('🔍 Looking for code:', organizationCode.trim());
      logger.log('🔍 Code matches:', allCodes?.filter(c => c.code === organizationCode.trim()));
      
      logger.log('🔍 Code exists in database:', codeCheck);
      logger.log('🔍 Code check length:', codeCheck?.length);
      if (codeCheckError) logger.error('❌ Code check error:', codeCheckError);
      
      if (!codeCheck || codeCheck.length === 0) {
        logger.error('❌ CODE NOT FOUND IN DATABASE! Code:', organizationCode.trim());
        setError('This join code does not exist. Please check the code or ask your administrator for a new one.');
        return;
      }
      
      const codeInfo = codeCheck[0];
      logger.log('🔍 Code details:', {
        code: codeInfo.code,
        isActive: codeInfo.is_active,
        expires: codeInfo.expires_at,
        currentUses: codeInfo.current_uses,
        maxUses: codeInfo.max_uses,
        organizationId: codeInfo.organization_id
      });

      // Check if code is still valid before using it
      const now = new Date();
      const expiresAt = new Date(codeInfo.expires_at);
      
      if (!codeInfo.is_active) {
        logger.error('❌ CODE IS INACTIVE');
        setError('This join code has been deactivated. Please ask your administrator for a new one.');
        return;
      }
      
      if (expiresAt < now) {
        logger.error('❌ CODE IS EXPIRED');
        setError('This join code has expired. Please ask your administrator for a new one.');
        return;
      }
      
      if (codeInfo.current_uses >= codeInfo.max_uses) {
        logger.error('❌ CODE IS USED UP');
        setError('This join code has already been used the maximum number of times. Please ask your administrator for a new one.');
        return;
      }

      logger.log('✅ Code pre-validation passed, attempting to use...');
      
      // Use the join code via PostgreSQL function
      const { data, error } = await supabase
        .rpc('use_organization_join_code', {
          p_code: organizationCode.trim(),
          p_used_by: user.id
        });

      logger.log('📊 RPC Response:', { data, error });
      logger.log('📊 RPC Data Details:', data);

      if (error) {
        logger.error('❌ RPC Error:', error);
        
        // Handle specific database errors
        if (error.message.includes('foreign key constraint')) {
          setError('Account setup issue. Please contact support.');
          return;
        }
        
        if (error.message.includes('function') && error.message.includes('does not exist')) {
          setError('System configuration error. Please contact support.');
          return;
        }
        
        throw error;
      }

      if (!data || data.length === 0) {
        logger.error('❌ No data returned from RPC');
        setError('System error: No response from server. Please try again.');
        return;
      }

      const result = data[0];
      logger.log('✅ Join code result:', result);
      
      if (!result.success) {
        logger.error('❌ Join code validation failed:', result.message);
        
        // Handle specific validation failures
        if (result.message.includes('expired')) {
          setError('This join code has expired. Please ask your administrator for a new one.');
        } else if (result.message.includes('used')) {
          setError('This join code has already been used. Please ask your administrator for a new one.');
        } else if (result.message.includes('invalid')) {
          setError('Invalid join code. Please check the code and try again.');
        } else {
          setError(result.message || 'Join code validation failed. Please try again.');
        }
        return;
      }

      // Create/update profile with organization using the role from the join code
      const assignedRole = result.assigned_role || 'user'; // Fallback to 'user' if no role specified
      logger.log('👤 Assigning role:', assignedRole);
      
      // Get the role_id for the assigned role
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', assignedRole)
        .single();
      
      if (roleError) {
        logger.error('❌ Error fetching role ID:', roleError);
        // Fallback to text role if roles table lookup fails
      }
      
      const profileData = {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
        role: assignedRole, // Keep text role as backup
        organization_id: result.organization_id
      };
      
      // Add role_id if we found it
      if (roleData?.id) {
        profileData.role_id = roleData.id;
        logger.log('👤 Using role_id:', roleData.id);
      }
      
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData);

      if (profileError) throw profileError;

      // Get organization name for success message
      const { data: orgData } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', result.organization_id)
        .single();

      setSuccess(`Successfully joined ${orgData?.name || 'the organization'}! Redirecting to dashboard...`);
      setTimeout(() => {
        window.location.href = '/dashboard'; // Force full reload
      }, 2000);

    } catch (err) {
      logger.error('❌ Error joining organization:', err);
      logger.error('Error details:', {
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint
      });
      
      // Provide more specific error messages
      if (err.message.includes('function') && err.message.includes('does not exist')) {
        setError('Database setup incomplete. Please contact your administrator - the join code system needs to be configured.');
      } else if (err.message.includes('Invalid join code')) {
        setError('This join code is not valid. Please check the code and try again, or ask your administrator for a new one.');
      } else if (err.message.includes('expired')) {
        setError('This join code has expired. Please ask your administrator for a new one.');
      } else if (err.message.includes('already been used')) {
        setError('This join code has already been used. Please ask your administrator for a new one.');
      } else {
        setError(`Join failed: ${err.message}`);
      }
    } finally {
      setCodeValidating(false);
    }
  };

  const handleCreateOrganization = () => {
    // Redirect to the new create organization page
    window.location.href = '/create-organization';
  };

  const handleSignOut = async () => {
    try {
      // Clear any redirect flags
      sessionStorage.removeItem('skip_org_redirect_once');
      
      // Sign out completely
      await supabase.auth.signOut();
      
      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Force full navigation to clear any state
      window.location.href = '/login';
    } catch (error) {
      logger.error('Error signing out:', error);
      // Clear storage anyway
      localStorage.clear();
      sessionStorage.clear();
      // Force navigation anyway
      window.location.href = '/login';
    }
  };

  const handleGoBack = () => {
    logger.log('🔙 Back button clicked');
    logger.log('History length:', window.history.length);
    
    try {
      // Try multiple navigation options
      if (window.history.length > 1) {
        logger.log('Using history.back()');
        window.history.back();
      } else {
        logger.log('Using navigate to login');
        navigate('/login');
      }
    } catch (error) {
      logger.error('Navigation error:', error);
      navigate('/login');
    }
  };

  const handleGoHome = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <Container maxWidth="md">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Box>
      {/* Navigation Header */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={handleGoBack}
            sx={{ mr: 2 }}
            title="Go back"
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Connect to Organization
          </Typography>
          <Button
            color="inherit"
            startIcon={<HomeIcon />}
            onClick={handleGoHome}
            sx={{ mr: 1 }}
          >
            Home
          </Button>
          <Button
            color="inherit"
            onClick={() => navigate('/login')}
            sx={{ mr: 1 }}
          >
            Skip for Now
          </Button>
          <Button
            color="inherit"
            startIcon={<LogoutIcon />}
            onClick={handleSignOut}
          >
            Sign Out
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" align="center" gutterBottom>
            Connect to Organization
          </Typography>
          <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4 }}>
            You've successfully signed in! Now let's connect you to your organization.
          </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {success}
          </Alert>
        )}

        {/* User Info */}
        <Card sx={{ mb: 3, bgcolor: 'grey.50' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <EmailIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Signed in as: {user?.email}</Typography>
              <Chip 
                label={user?.app_metadata?.provider || 'Email'} 
                size="small" 
                sx={{ ml: 'auto' }}
                color="primary"
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Name: {user?.user_metadata?.full_name || user?.user_metadata?.name || 'Not provided'}
            </Typography>
          </CardContent>
        </Card>

        <Grid container spacing={3}>
          {/* Option 1: Accept Invite */}
          {invite && (
            <Grid item xs={12}>
              <Card sx={{ border: 2, borderColor: 'success.main' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <CheckIcon sx={{ mr: 1, color: 'success.main' }} />
                    <Typography variant="h6" color="success.main">
                      You Have an Invitation!
                    </Typography>
                  </Box>
                  <Typography variant="body1" gutterBottom>
                    You've been invited to join <strong>{invite.organization.name}</strong> as a <strong>{invite.role}</strong>.
                  </Typography>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={handleAcceptInvite}
                    disabled={linking}
                    startIcon={linking ? <CircularProgress size={20} /> : <LinkIcon />}
                    fullWidth
                    sx={{ mt: 2 }}
                  >
                    {linking ? 'Joining Organization...' : 'Accept Invitation'}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Option 2: Join by Organization Code */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CodeIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Organization Code</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Enter the code provided by your organization administrator.
                </Typography>
                <TextField
                  fullWidth
                  label="6-Digit Join Code"
                  value={organizationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').substring(0, 6);
                    setOrganizationCode(value);
                  }}
                  placeholder="123456"
                  inputProps={{ maxLength: 6, style: { textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' } }}
                  sx={{ mt: 2, mb: 2 }}
                  helperText="Enter the 6-digit code provided by your administrator"
                />
                <Button
                  variant="contained"
                  onClick={handleJoinByCode}
                  disabled={codeValidating || organizationCode.length !== 6}
                  startIcon={codeValidating ? <CircularProgress size={20} /> : <SearchIcon />}
                  fullWidth
                >
                  {codeValidating ? 'Validating Code...' : 'Join Organization'}
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Option 3: Create New Organization */}
          <Grid item xs={12}>
            <Card sx={{ bgcolor: 'primary.light' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AddIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Create New Organization</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Start your own organization and invite team members.
                </Typography>
                <Button
                  variant="contained"
                  onClick={handleCreateOrganization}
                  startIcon={<AddIcon />}
                  sx={{ mt: 2 }}
                >
                  Create Organization
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Help Section */}
        <Card sx={{ mt: 3, bgcolor: 'info.light' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Need Help?
            </Typography>
            <Typography variant="body2" gutterBottom>
              • <strong>Have an invite link?</strong> Click it to automatically join your organization
            </Typography>
            <Typography variant="body2" gutterBottom>
              • <strong>Need a join code?</strong> Ask your administrator for a 6-digit numeric code
            </Typography>
            <Typography variant="body2" gutterBottom>
              • <strong>Can't find your organization?</strong> Contact your administrator or create a new one
            </Typography>
            <Typography variant="body2">
              • <strong>Technical issues?</strong> Contact support for assistance
            </Typography>
          </CardContent>
        </Card>
        </Paper>
      </Container>
    </Box>
  );
}
