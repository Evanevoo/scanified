import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  Box, Card, CardContent, Typography, TextField, Button, 
  Alert, CircularProgress, Divider, Link, Dialog, DialogTitle,
  DialogContent, DialogActions, Snackbar, IconButton
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LogoutIcon from '@mui/icons-material/Logout';

function LoginPage() {
  const navigate = useNavigate();
  const { user, profile, organization, loading } = useAuth();
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [error, setError] = useState('');
  const [showOrgError, setShowOrgError] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');
  const [signupDialog, setSignupDialog] = useState(false);
  const [signupData, setSignupData] = useState({ name: '', email: '', password: '', organizationName: '' });
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState('');

  useEffect(() => {
    // Check if there's a pending organization to create (from OrganizationDeleted page)
    const pendingOrgName = sessionStorage.getItem('pending_org_name');
    const createOrgAfterLogin = sessionStorage.getItem('create_org_after_login');
    
    if (pendingOrgName && createOrgAfterLogin && !user) {
      // User came from organization creation page, open signup dialog
      setSignupData(prev => ({ ...prev, organizationName: pendingOrgName }));
      setSignupDialog(true);
    }
  }, [user]);

  useEffect(() => {
    // Simplified navigation logic
    if (!loading) {
      if (user && profile && organization) {
        // Full authenticated user with organization
        navigate('/dashboard');
      } else if (user && profile && !organization && profile.role === 'owner') {
        // Platform owner without organization
        navigate('/owner-portal');
      } else if (user && profile && !organization && profile.role !== 'owner') {
        // Check if there's a redirect flag set
        const redirectAfterLogin = sessionStorage.getItem('redirect_after_login');
        if (redirectAfterLogin) {
          sessionStorage.removeItem('redirect_after_login');
          navigate(redirectAfterLogin);
          return;
        }
        
        // User without organization (needs to create or join one)
        setShowOrgError(true);
        setError('Your account is not linked to any organization. Please create a new organization or contact support.');
      } else if (user && !profile) {
        // User is authenticated but profile is still loading
        // Check if there's a redirect flag set (for new users)
        const redirectAfterLogin = sessionStorage.getItem('redirect_after_login');
        if (redirectAfterLogin) {
          // Don't remove the flag yet, wait for profile to load
          console.log('User authenticated, waiting for profile to load before redirecting to:', redirectAfterLogin);
        }
      } else if (user && profile === null) {
        // User is authenticated but has no profile (new user)
        // Check if there's a pending organization to create
        const createOrgAfterLogin = sessionStorage.getItem('create_org_after_login');
        const pendingOrgName = sessionStorage.getItem('pending_org_name');
        
        if (createOrgAfterLogin && pendingOrgName) {
          // Create organization automatically
          createOrganizationForNewUser(pendingOrgName);
          return;
        }
        
        // Check if there's a redirect flag set
        const redirectAfterLogin = sessionStorage.getItem('redirect_after_login');
        if (redirectAfterLogin) {
          sessionStorage.removeItem('redirect_after_login');
          navigate(redirectAfterLogin);
          return;
        }
      }
      // Otherwise, stay on login page
    }
  }, [user, profile, organization, loading, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoadingLocal(true);
    setError('');
    setShowOrgError(false);

    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        // Make error messages more user-friendly
        if (error.message.includes('Invalid login credentials')) {
          setError('Email or password is incorrect. Please try again.');
        } else if (error.message.includes('Email not confirmed')) {
          setError('Please check your email and click the confirmation link before signing in.');
        } else {
          setError(error.message);
        }
      }
      // Do NOT navigate here! Let the useEffect handle it.
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoadingLocal(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError('');
    
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    if (error) {
      setResetError(error.message);
    } else {
      setResetSuccess(true);
      setForgotPasswordOpen(false);
      setResetEmail('');
    }
    setResetLoading(false);
  };

  const handleCloseForgotPassword = () => {
    setForgotPasswordOpen(false);
    setResetEmail('');
    setResetError('');
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setSignupLoading(true);
    setSignupError('');

    try {
      // Check if user already exists with a deleted profile
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id, email, deleted_at, disabled_at')
        .eq('email', signupData.email)
        .maybeSingle();

      if (existingProfile && (existingProfile.deleted_at || existingProfile.disabled_at || existingProfile.is_active === false)) {
        // User exists but is deleted/disabled, allow them to reactivate
        console.log('User exists but is deleted/disabled, allowing reactivation');
      } else if (existingProfile && !existingProfile.deleted_at && !existingProfile.disabled_at && existingProfile.is_active !== false) {
        // User exists and is active
        throw new Error('An account with this email already exists. Please sign in instead.');
      }

      // Sign up the user (no email confirmation required)
      const { data, error } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          emailRedirectTo: undefined, // No email confirmation
          data: {
            name: signupData.name,
            organizationName: signupData.organizationName,
          }
        }
      });

      if (error) {
        // If it's a "User already registered" error, check if we can reactivate
        if (error.message.includes('User already registered')) {
          if (existingProfile && (existingProfile.deleted_at || existingProfile.disabled_at || existingProfile.is_active === false)) {
            console.log('User already registered but profile is deleted/disabled, proceeding with reactivation');
            // Continue with the flow - we'll reactivate the profile
          } else {
            // User exists and is active, they should sign in instead
            throw new Error('An account with this email already exists. Please sign in instead.');
          }
        } else {
          throw error;
        }
      }

      // Store organization name for after email confirmation
      if (signupData.organizationName) {
        sessionStorage.setItem('pending_org_name', signupData.organizationName);
        sessionStorage.setItem('create_org_after_login', 'true');
      }
      
      // Show success message
      alert(`Account created successfully! Please check your email (${signupData.email}) to confirm your account, then sign in. ${signupData.organizationName ? 'Your organization will be created automatically after you confirm your email.' : ''}`);
      
      // Close dialog and reset form
      setSignupDialog(false);
      setSignupData({ name: '', email: '', password: '', organizationName: '' });
      
    } catch (err) {
      console.error('Signup error:', err);
      setSignupError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setSignupLoading(false);
    }
  };

  const generateUniqueSlug = async (orgName) => {
    // Generate base slug from organization name
    let baseSlug = orgName.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    // If slug is empty, use a default
    if (!baseSlug) {
      baseSlug = 'organization';
    }
    
    let slug = baseSlug;
    let counter = 1;
    
    // Keep checking until we find a unique slug
    while (true) {
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', slug)
        .is('deleted_at', null)
        .maybeSingle();
      
      if (!existingOrg) {
        return slug; // Found unique slug
      }
      
      // Try with a number suffix
      slug = `${baseSlug}-${counter}`;
      counter++;
      
      // Prevent infinite loop
      if (counter > 100) {
        // Use timestamp as fallback
        slug = `${baseSlug}-${Date.now()}`;
        break;
      }
    }
    
    return slug;
  };

  const createOrganizationForNewUser = async (orgName) => {
    try {
      console.log('Creating organization for new user:', orgName);
      
      // Generate unique slug
      const slug = await generateUniqueSlug(orgName);

      // Create new organization
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: orgName.trim(),
          slug: slug,
          subscription_status: 'trial',
          trial_end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days trial
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Create default admin role for the organization
      const { data: adminRole, error: roleError } = await supabase
        .from('roles')
        .insert({
          name: 'admin',
          organization_id: newOrg.id,
          permissions: {
            bottles: { view: true, create: true, edit: true, delete: true },
            customers: { view: true, create: true, edit: true, delete: true },
            reports: { view: true, create: true },
            settings: { view: true, edit: true }
          }
        })
        .select()
        .single();

      if (roleError) {
        console.error('Error creating admin role:', roleError);
      }

      // Update user profile to link to new organization (reactivate if deleted)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          organization_id: newOrg.id,
          role_id: adminRole?.id,
          role: 'admin',
          is_active: true,
          disabled_at: null,
          disabled_reason: null,
          deleted_at: null // Reactivate deleted profile
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      console.log('✅ Organization created successfully for new user');
      
      // Clear the flags
      sessionStorage.removeItem('create_org_after_login');
      sessionStorage.removeItem('pending_org_name');
      
      // Show success message
      alert(`Welcome! Your organization "${orgName}" has been created successfully. You now have admin access.`);
      
      // Redirect to home
      window.location.href = '/home';

    } catch (err) {
      console.error('Error creating organization for new user:', err);
      setError(`Failed to create organization: ${err.message}`);
      sessionStorage.removeItem('create_org_after_login');
      sessionStorage.removeItem('pending_org_name');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setShowOrgError(false);
    setError('');
  };

  // Don't show login form if still checking auth state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Show org error state if user is logged in but has no organization
  if (showOrgError && user) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        bgcolor: '#f5f5f5',
        p: 3
      }}>
        <Card sx={{ maxWidth: 500, width: '100%' }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" gutterBottom>
              Organization Required
            </Typography>
            <Alert severity="warning" sx={{ mb: 3 }}>
              {error}
            </Alert>
            <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
              <Button 
                variant="contained" 
                color="primary" 
                fullWidth
                onClick={() => navigate('/register')}
              >
                Create New Organization
              </Button>
              <Button 
                variant="outlined" 
                color="secondary" 
                fullWidth
                onClick={() => navigate('/contact')}
              >
                Contact Support
              </Button>
              <Button 
                variant="text" 
                startIcon={<LogoutIcon />}
                onClick={handleLogout}
              >
                Sign Out
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      p: 3
    }}>
      <Card sx={{ maxWidth: 400, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
              Welcome Back
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sign in to your account to continue
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleLogin}>
            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              required
              margin="normal"
              autoComplete="email"
              autoFocus
            />
            <TextField
              fullWidth
              label="Password"
              name="password"
              type="password"
              required
              margin="normal"
              autoComplete="current-password"
            />
            
            <Box sx={{ mt: 2, mb: 2, textAlign: 'right' }}>
              <Typography
                variant="body2"
                onClick={() => setForgotPasswordOpen(true)}
                sx={{ 
                  cursor: 'pointer',
                  color: 'primary.main',
                  '&:hover': {
                    textDecoration: 'underline'
                  }
                }}
              >
                Forgot password?
              </Typography>
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loadingLocal}
              sx={{ mb: 2 }}
            >
              {loadingLocal ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
          </form>

          <Divider sx={{ my: 3 }}>OR</Divider>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Don't have an account?
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={() => {
                  sessionStorage.setItem('redirect_after_login', '/connect-organization');
                  setSignupDialog(true);
                }}
                sx={{ mb: 1 }}
              >
                Create Free Account
              </Button>
              <Typography variant="caption" color="text.secondary" display="block" textAlign="center">
                Join an existing organization or start your own
              </Typography>
            </Box>
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Already have an account? Sign in above
              </Typography>
            </Box>
          </Box>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Box
              onClick={() => navigate('/')}
              sx={{ 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                color: 'primary.main',
                '&:hover': {
                  textDecoration: 'underline'
                }
              }}
            >
              <IconButton size="small" sx={{ padding: 0 }}>
                <ArrowBackIcon />
              </IconButton>
              <Typography variant="body2">
                Back to Home
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotPasswordOpen} onClose={handleCloseForgotPassword} maxWidth="xs" fullWidth>
        <DialogTitle>Reset Password</DialogTitle>
        <form onSubmit={handleForgotPassword}>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Enter your email address and we'll send you a link to reset your password.
            </Typography>
            {resetError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {resetError}
              </Alert>
            )}
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              required
              autoFocus
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseForgotPassword}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={resetLoading}>
              {resetLoading ? <CircularProgress size={20} /> : 'Send Reset Link'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={resetSuccess}
        autoHideDuration={6000}
        onClose={() => setResetSuccess(false)}
        message="Password reset link sent! Check your email."
      />

      {/* Signup Dialog */}
      <Dialog
        open={signupDialog}
        onClose={() => setSignupDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={handleSignup}>
          <DialogTitle>Create Your Free Account</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
              {signupData.organizationName 
                ? `Create an account to set up "${signupData.organizationName}"`
                : "Create an account to join an organization or start your own"
              }
            </Typography>
            {signupError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {signupError}
              </Alert>
            )}
            <TextField
              fullWidth
              label="Full Name"
              value={signupData.name}
              onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
              required
              autoFocus
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={signupData.email}
              onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={signupData.password}
              onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
              required
              helperText="Must be at least 6 characters"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Organization Name (Optional)"
              value={signupData.organizationName}
              onChange={(e) => setSignupData({ ...signupData, organizationName: e.target.value })}
              placeholder="e.g., ABC Gas Company"
              helperText="Leave blank if you want to join an existing organization"
              sx={{ mb: 2 }}
            />
            <Alert severity="info" sx={{ mt: 2 }}>
              After creating your account, you'll receive a confirmation email. Once confirmed, you can sign in. {signupData.organizationName ? 'Your organization will be created automatically.' : 'You can then join an existing organization or create your own.'}
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSignupDialog(false)}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={signupLoading || !signupData.name || !signupData.email || !signupData.password || signupData.password.length < 6}
            >
              {signupLoading ? <CircularProgress size={20} /> : 'Create Account'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}

export default LoginPage; 