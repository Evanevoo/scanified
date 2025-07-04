import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  TextField,
  Button,
  Switch,
  Snackbar,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Alert,
  Stack,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  Grid,
  Card,
  CardContent,
  Tooltip,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import SecurityIcon from '@mui/icons-material/Security';
import NotificationsIcon from '@mui/icons-material/Notifications';
import BusinessIcon from '@mui/icons-material/Business';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import DataUsageIcon from '@mui/icons-material/DataUsage';
import SaveIcon from '@mui/icons-material/Save';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import PaymentIcon from '@mui/icons-material/Payment';
import { useThemeContext } from '../context/ThemeContext';
import UserManagement from './UserManagement';
import { usePermissions } from '../context/PermissionsContext';
import {
  People as PeopleIcon,
  Email as EmailIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';

const themeColors = [
  { name: 'Blue', value: 'blue-600' },
  { name: 'Emerald', value: 'emerald-500' },
  { name: 'Purple', value: 'purple-600' },
  { name: 'Rose', value: 'rose-500' },
  { name: 'Amber', value: 'amber-500' },
  { name: 'Teal', value: 'teal-500' },
  { name: 'Cyan', value: 'cyan-500' },
  { name: 'Green', value: 'green-500' },
  { name: 'Orange', value: 'orange-500' },
  { name: 'Red', value: 'red-500' },
  { name: 'Pink', value: 'pink-500' },
  { name: 'Indigo', value: 'indigo-500' },
  { name: 'Lime', value: 'lime-500' },
  { name: 'Violet', value: 'violet-600' },
  { name: 'Slate', value: 'slate-500' },
  { name: 'Sky', value: 'sky-500' },
];

const colorMap = {
  'blue-600': '#2563eb',
  'emerald-500': '#10b981',
  'purple-600': '#7c3aed',
  'rose-500': '#f43f5e',
  'amber-500': '#f59e42',
  'teal-500': '#14b8a6',
  'cyan-500': '#06b6d4',
  'green-500': '#22c55e',
  'orange-500': '#f97316',
  'red-500': '#ef4444',
  'pink-500': '#ec4899',
  'indigo-500': '#6366f1',
  'lime-500': '#84cc16',
  'violet-600': '#a21caf',
  'slate-500': '#64748b',
  'sky-500': '#0ea5e9',
};

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function Settings() {
  const { user, profile, organization, reloadOrganization } = useAuth();
  const { isOrgAdmin } = usePermissions();
  const navigate = useNavigate();
  const { mode, setMode, accent, setAccent } = useThemeContext();
  const [activeTab, setActiveTab] = useState(0);

  // Profile Info
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileSnackbar, setProfileSnackbar] = useState(false);
  const [profileChanged, setProfileChanged] = useState(false);

  // Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordSnackbar, setPasswordSnackbar] = useState(false);

  // Import Customers Page Theme
  const [importCustomersTheme, setImportCustomersTheme] = useState(localStorage.getItem('importCustomersTheme') || 'system');
  const [importThemeChanged, setImportThemeChanged] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState(
    JSON.parse(localStorage.getItem('notifications')) || {
      email: true,
      inApp: true,
      browser: false,
      sms: false,
      dailySummary: true,
      alerts: true,
      reports: false,
    }
  );
  const [notificationsChanged, setNotificationsChanged] = useState(false);
  const [notifMsg, setNotifMsg] = useState('');
  const [notifSnackbar, setNotifSnackbar] = useState(false);

  // Security Settings
  const [securitySettings, setSecuritySettings] = useState(
    JSON.parse(localStorage.getItem('securitySettings')) || {
      sessionTimeout: 30,
      twoFactorEnabled: false,
      loginHistory: true,
      passwordRequirements: true,
      accountLockout: true,
      failedAttempts: 5,
    }
  );
  const [securityChanged, setSecurityChanged] = useState(false);

  // Business Logic Settings
  const [businessSettings, setBusinessSettings] = useState(
    JSON.parse(localStorage.getItem('businessSettings')) || {
      defaultScanMode: 'SHIP',
      autoAssignment: false,
      billingPreferences: {
        taxIncluded: true,
        currency: 'USD',
        decimalPlaces: 2,
      },
      customerDefaults: {
        autoGroup: false,
        defaultStatus: 'active',
      },
      reportSettings: {
        autoGenerate: false,
        schedule: 'weekly',
        recipients: [],
      },
    }
  );
  const [businessChanged, setBusinessChanged] = useState(false);

  // Data & Export Settings
  const [dataSettings, setDataSettings] = useState(
    JSON.parse(localStorage.getItem('dataSettings')) || {
      exportFormat: 'CSV',
      backupFrequency: 'weekly',
      retentionDays: 365,
      autoBackup: true,
      includeArchived: false,
    }
  );
  const [dataChanged, setDataChanged] = useState(false);

  // Dialogs
  const [exportDialog, setExportDialog] = useState(false);
  const [backupDialog, setBackupDialog] = useState(false);

  // User Invites
  const [invites, setInvites] = useState([]);
  const [inviteDialog, setInviteDialog] = useState(false);
  const [newInvite, setNewInvite] = useState({
    email: '',
    role: 'user'
  });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [copiedToken, setCopiedToken] = useState('');
  const [securityDialog, setSecurityDialog] = useState(false);

  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState(organization?.logo_url || '');
  const [logoMsg, setLogoMsg] = useState('');

  useEffect(() => {
    setFullName(profile?.full_name || '');
    setEmail(user?.email || '');
    setLogoUrl(organization?.logo_url || '');
  }, [profile, user, organization]);

  useEffect(() => {
    if (profile?.role === 'owner') {
      fetchInvites();
    }
  }, [profile]);

  // Profile update
  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileMsg('');
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', user.id);
    if (!error) {
      setProfileMsg('Profile updated successfully!');
      setProfileSnackbar(true);
      setProfileChanged(false);
    } else {
      setProfileMsg(error.message);
      setProfileSnackbar(true);
    }
  };

  // Password update
  const handlePasswordSave = async (e) => {
    e.preventDefault();
    setPasswordMsg('');
    if (newPassword !== confirmPassword) {
      setPasswordMsg('Passwords do not match.');
      setPasswordSnackbar(true);
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg('Password must be at least 6 characters long.');
      setPasswordSnackbar(true);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) {
      setPasswordMsg('Password updated successfully!');
      setPasswordSnackbar(true);
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPasswordMsg(error.message);
      setPasswordSnackbar(true);
    }
  };

  // Theme update
  const handleThemeChange = (t) => {
    setMode(t);
    setProfileChanged(true);
    setNotifMsg('Theme updated successfully!');
    setNotifSnackbar(true);
  };

  const handleColorChange = (c) => {
    setAccent(c);
    setProfileChanged(true);
    setNotifMsg('Accent color updated successfully!');
    setNotifSnackbar(true);
  };

  // Import customers theme update
  const handleImportThemeChange = (theme) => {
    setImportCustomersTheme(theme);
    setImportThemeChanged(true);
  };

  const handleImportThemeSave = () => {
    localStorage.setItem('importCustomersTheme', importCustomersTheme);
    setImportThemeChanged(false);
    setNotifMsg('Import page theme saved!');
    setNotifSnackbar(true);
  };

  // Notifications update
  const handleNotifChange = (type) => {
    const updated = { ...notifications, [type]: !notifications[type] };
    setNotifications(updated);
    setNotificationsChanged(true);
  };

  const handleNotificationsSave = () => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
    setNotificationsChanged(false);
    setNotifMsg('Notification preferences saved!');
    setNotifSnackbar(true);
  };

  // Security settings update
  const handleSecurityChange = (key, value) => {
    const updated = { ...securitySettings, [key]: value };
    setSecuritySettings(updated);
    setSecurityChanged(true);
  };

  const handleSecuritySave = () => {
    localStorage.setItem('securitySettings', JSON.stringify(securitySettings));
    setSecurityChanged(false);
    setNotifMsg('Security settings saved!');
    setNotifSnackbar(true);
  };

  // Business settings update
  const handleBusinessChange = (key, value) => {
    const updated = { ...businessSettings, [key]: value };
    setBusinessSettings(updated);
    setBusinessChanged(true);
  };

  const handleBusinessSave = () => {
    localStorage.setItem('businessSettings', JSON.stringify(businessSettings));
    setBusinessChanged(false);
    setNotifMsg('Business settings saved!');
    setNotifSnackbar(true);
  };

  // Data settings update
  const handleDataChange = (key, value) => {
    const updated = { ...dataSettings, [key]: value };
    setDataSettings(updated);
    setDataChanged(true);
  };

  const handleDataSave = () => {
    localStorage.setItem('dataSettings', JSON.stringify(dataSettings));
    setDataChanged(false);
    setNotifMsg('Data settings saved!');
    setNotifSnackbar(true);
  };

  // Export data
  const handleExportData = async (format) => {
    // This would integrate with your actual data export logic
    console.log(`Exporting data in ${format} format`);
    setExportDialog(false);
    setNotifMsg(`Data exported successfully in ${format} format!`);
    setNotifSnackbar(true);
  };

  // Create backup
  const handleCreateBackup = async () => {
    // This would integrate with your actual backup logic
    console.log('Creating backup...');
    setBackupDialog(false);
    setNotifMsg('Backup created successfully!');
    setNotifSnackbar(true);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Track profile changes
  useEffect(() => {
    setProfileChanged(fullName !== (profile?.full_name || ''));
  }, [fullName, profile?.full_name]);

  // Admin-only logo upload handler
  // User Invite Functions
  const fetchInvites = async () => {
    try {
      const { data, error } = await supabase
        .from('organization_invites')
        .select(`
          *,
          invited_by:profiles!organization_invites_invited_by_fkey(full_name, email)
        `)
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvites(data || []);
    } catch (error) {
      console.error('Error fetching invites:', error);
      setInviteError('Failed to load invites: ' + error.message);
    }
  };

  const handleCreateInvite = async () => {
    if (!newInvite.email || !newInvite.role) {
      setInviteError('Please fill in all fields');
      return;
    }

    setInviteLoading(true);
    setInviteError('');

    try {
      // Check if email already exists in the organization
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('organization_id', profile.organization_id)
        .eq('email', newInvite.email)
        .single();

      if (existingUser) {
        throw new Error('This email is already registered in your organization');
      }

      // Check if there's already a pending invite for this email
      const { data: existingInvite } = await supabase
        .from('organization_invites')
        .select('id')
        .eq('organization_id', profile.organization_id)
        .eq('email', newInvite.email)
        .is('accepted_at', null)
        .single();

      if (existingInvite) {
        throw new Error('An invite has already been sent to this email');
      }

      // Create the invite using the database function
      const { data, error } = await supabase.rpc('create_organization_invite', {
        p_organization_id: profile.organization_id,
        p_email: newInvite.email,
        p_role: newInvite.role,
        p_expires_in_days: 7
      });

      if (error) throw error;

      setInviteSuccess(`Invite sent to ${newInvite.email}`);
      setNewInvite({ email: '', role: 'user' });
      setInviteDialog(false);
      fetchInvites();
    } catch (error) {
      console.error('Error creating invite:', error);
      setInviteError(error.message);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleDeleteInvite = async (inviteId) => {
    try {
      const { error } = await supabase
        .from('organization_invites')
        .delete()
        .eq('id', inviteId);

      if (error) throw error;

      setInviteSuccess('Invite deleted successfully');
      fetchInvites();
    } catch (error) {
      console.error('Error deleting invite:', error);
      setInviteError('Failed to delete invite: ' + error.message);
    }
  };

  const copyInviteLink = (token) => {
    const inviteLink = `${window.location.origin}/accept-invite?token=${token}`;
    navigator.clipboard.writeText(inviteLink);
    setCopiedToken(token);
    setInviteSuccess('Invite link copied to clipboard!');
    setTimeout(() => setCopiedToken(''), 2000);
  };

  const getInviteStatus = (invite) => {
    if (invite.accepted_at) {
      return { status: 'accepted', color: 'success', icon: <CheckCircleIcon />, label: 'Accepted' };
    } else if (new Date(invite.expires_at) < new Date()) {
      return { status: 'expired', color: 'error', icon: <WarningIcon />, label: 'Expired' };
    } else {
      return { status: 'pending', color: 'warning', icon: <ScheduleIcon />, label: 'Pending' };
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'owner': return 'error';
      case 'admin': return 'warning';
      case 'manager': return 'info';
      default: return 'default';
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    console.log('Logo upload started:', file.name, file.size);
    setLogoUploading(true);
    setLogoMsg('');
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `org-${organization.id}-${Date.now()}.${fileExt}`;
      console.log('Uploading to path:', filePath);
      
      // Upload to Supabase Storage
      let { error: uploadError } = await supabase.storage
        .from('organization-logos')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      console.log('File uploaded successfully');
      
      // Get public URL
      const { data } = supabase.storage.from('organization-logos').getPublicUrl(filePath);
      if (!data?.publicUrl) throw new Error('Failed to get public URL');
      console.log('Public URL obtained:', data.publicUrl);
      
      // Add cache-busting parameter to the URL
      const logoUrlWithCacheBust = `${data.publicUrl}?t=${Date.now()}`;
      console.log('Logo URL with cache busting:', logoUrlWithCacheBust);
      
      // Save to org
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ logo_url: logoUrlWithCacheBust })
        .eq('id', organization.id);
      if (updateError) throw updateError;
      console.log('Organization updated in database');
      
      setLogoUrl(logoUrlWithCacheBust);
      setLogoMsg('Logo updated!');
      
      // Refresh organization context/state so new logo appears immediately
      console.log('Calling reloadOrganization...');
      if (typeof reloadOrganization === 'function') {
        await reloadOrganization();
        console.log('reloadOrganization completed');
      } else {
        console.log('reloadOrganization function not available');
      }
      
      // Don't force page refresh - let the reloadOrganization handle it
      console.log('Logo upload process completed');
      
    } catch (err) {
      console.error('Logo upload error:', err);
      setLogoMsg('Error uploading logo: ' + err.message);
    } finally {
      setLogoUploading(false);
    }
  };

  return (
    <Box maxWidth={1200} mx="auto" mt={8} mb={4}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 4, bgcolor: 'background.default' }}>
        <Stack direction="row" alignItems="center" spacing={2} mb={4}>
          <IconButton color="primary" onClick={() => navigate('/dashboard')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" fontWeight={700}>
            Settings
          </Typography>
        </Stack>

        <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }} variant="scrollable" scrollButtons="auto">
          <Tab label="Profile" />
          <Tab label="Security" />
          <Tab label="Appearance" />
          <Tab label="Notifications" />
          <Tab label="Billing & Subscription" />
          {profile?.role === 'admin' && <Tab label="User Management" />}
          {profile?.role === 'owner' && <Tab label="User Invites" />}
        </Tabs>

        {/* Profile Tab */}
        <TabPanel value={activeTab} index={0}>
          <Box component="form" onSubmit={handleProfileSave} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Full Name"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                setProfileChanged(true);
              }}
              fullWidth
            />
            <TextField
              label="Email"
              value={email}
              fullWidth
              disabled
            />
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              disabled={!profileChanged}
              startIcon={<SaveIcon />}
            >
              Save Profile
            </Button>
          </Box>
        </TabPanel>

        {/* Security Tab */}
        <TabPanel value={activeTab} index={1}>
          <Stack spacing={3}>
            {/* Password Change */}
            <Box component="form" onSubmit={handlePasswordSave}>
              <Typography variant="subtitle1" gutterBottom>Change Password</Typography>
              <Stack spacing={2}>
                <TextField
                  type="password"
                  label="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  fullWidth
                />
                <TextField
                  type="password"
                  label="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  fullWidth
                />
                <Button type="submit" variant="contained" color="primary">
                  Update Password
                </Button>
              </Stack>
            </Box>
            
            <Divider />
            
            {/* Security Preferences */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>Security Preferences</Typography>
              <Stack spacing={2}>
                <FormControlLabel
                  control={<Switch checked={securitySettings.loginHistory} onChange={(e) => handleSecurityChange('loginHistory', e.target.checked)} />}
                  label="Track Login History"
                />
                <FormControlLabel
                  control={<Switch checked={securitySettings.twoFactorEnabled} onChange={(e) => handleSecurityChange('twoFactorEnabled', e.target.checked)} />}
                  label="Two-Factor Authentication"
                />
                <Box>
                  <Typography gutterBottom>Session Timeout (minutes)</Typography>
                  <Slider
                    value={securitySettings.sessionTimeout}
                    onChange={(e, value) => handleSecurityChange('sessionTimeout', value)}
                    min={15}
                    max={120}
                    step={15}
                    marks
                    valueLabelDisplay="auto"
                  />
                  <Typography variant="caption" color="text.secondary">
                    Current: {securitySettings.sessionTimeout} minutes
                  </Typography>
                </Box>
                <Button 
                  variant="outlined" 
                  color="primary"
                  onClick={handleSecuritySave}
                  disabled={!securityChanged}
                  startIcon={<SaveIcon />}
                >
                  Save Security Settings
                </Button>
              </Stack>
            </Box>
          </Stack>
        </TabPanel>

        {/* Appearance Tab */}
        <TabPanel value={activeTab} index={2}>
          <Stack spacing={3}>
            <FormControl fullWidth>
              <InputLabel>Theme</InputLabel>
              <Select
                value={mode}
                label="Theme"
                onChange={(e) => handleThemeChange(e.target.value)}
              >
                <MenuItem value="light">Light</MenuItem>
                <MenuItem value="dark">Dark</MenuItem>
                <MenuItem value="system">System</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel>Import Customers Page Theme</InputLabel>
              <Select
                value={importCustomersTheme}
                label="Import Customers Page Theme"
                onChange={(e) => setImportCustomersTheme(e.target.value)}
              >
                <MenuItem value="system">System/Global</MenuItem>
                <MenuItem value="light">Light</MenuItem>
                <MenuItem value="dark">Dark</MenuItem>
              </Select>
            </FormControl>
            
            <Box>
              <Typography variant="subtitle1" mb={1}>Accent Color</Typography>
              <Stack direction="row" spacing={2}>
                {themeColors.map(tc => (
                  <IconButton
                    key={tc.value}
                    onClick={() => handleColorChange(tc.value)}
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      border: accent === tc.value ? `3px solid #fff` : '2px solid #ccc',
                      background: colorMap[tc.value],
                      boxShadow: accent === tc.value ? '0 0 0 4px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    {accent === tc.value && (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                    )}
                  </IconButton>
                ))}
              </Stack>
              <Typography variant="caption" color="text.secondary">Your accent color is used for highlights, buttons, and tabs.</Typography>
            </Box>
            
            <Button 
              variant="outlined" 
              color="primary"
              onClick={handleImportThemeSave}
              startIcon={<SaveIcon />}
            >
              Save Appearance Settings
            </Button>

            {isOrgAdmin && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>Organization Logo</Typography>
                {logoUrl && (
                  <Box sx={{ mb: 1 }}>
                    <img src={logoUrl} alt="Organization Logo" style={{ maxHeight: 64, maxWidth: 128, borderRadius: 8, border: '1px solid #eee' }} />
                  </Box>
                )}
                <Button
                  variant="contained"
                  component="label"
                  disabled={logoUploading}
                  sx={{ mb: 1 }}
                >
                  {logoUploading ? 'Uploading...' : 'Upload Logo'}
                  <input type="file" accept="image/*" hidden onChange={handleLogoUpload} />
                </Button>
                {logoMsg && <Alert severity={logoMsg.startsWith('Error') ? 'error' : 'success'} sx={{ mt: 1 }}>{logoMsg}</Alert>}
                <Typography variant="body2" color="text.secondary">Recommended: PNG, JPG, or SVG. Max 1MB.</Typography>
              </Box>
            )}
          </Stack>
        </TabPanel>

        {/* Notifications Tab */}
        <TabPanel value={activeTab} index={3}>
          <Stack spacing={3}>
            <FormControlLabel
              control={<Switch checked={notifications.email} onChange={() => handleNotifChange('email')} color="primary" />}
              label="Email Notifications"
            />
            <FormControlLabel
              control={<Switch checked={notifications.inApp} onChange={() => handleNotifChange('inApp')} color="primary" />}
              label="In-App Notifications"
            />
            <FormControlLabel
              control={<Switch checked={notifications.sms} onChange={() => handleNotifChange('sms')} color="primary" />}
              label="SMS Notifications"
            />
            <Button 
              variant="outlined" 
              color="primary"
              onClick={handleNotificationsSave}
              startIcon={<SaveIcon />}
            >
              Save Notification Settings
            </Button>
          </Stack>
        </TabPanel>

        {/* Billing & Subscription Tab */}
        <TabPanel value={activeTab} index={4}>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Manage your subscription plan and billing information.
            </Typography>
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => navigate('/billing')}
              fullWidth
              startIcon={<PaymentIcon />}
            >
              Manage Billing & Plans
            </Button>
            {organization && (
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Current Plan: <Chip label={organization.subscription_plan || 'Trial'} size="small" />
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Organization: {organization.name}
                </Typography>
                {organization.trial_end_date && (
                  <Typography variant="body2" color="text.secondary">
                    Trial ends: {new Date(organization.trial_end_date).toLocaleDateString()}
                  </Typography>
                )}
              </Box>
            )}
          </Stack>
        </TabPanel>

        {/* User Management Tab (Admins Only) */}
        {profile?.role === 'admin' && (
          <TabPanel value={activeTab} index={5}>
            <UserManagement />
          </TabPanel>
        )}

        {/* User Invites Tab (Owners Only) */}
        {profile?.role === 'owner' && (
          <TabPanel value={activeTab} index={profile?.role === 'admin' ? 6 : 5}>
            <Stack spacing={3}>
              {inviteError && (
                <Alert severity="error" onClose={() => setInviteError('')}>
                  {inviteError}
                </Alert>
              )}

              {inviteSuccess && (
                <Alert severity="success" onClose={() => setInviteSuccess('')}>
                  {inviteSuccess}
                </Alert>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">
                  Pending Invites ({invites.filter(i => !i.accepted_at && new Date(i.expires_at) > new Date()).length})
                </Typography>
                <Box>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={fetchInvites}
                    sx={{ mr: 2 }}
                  >
                    Refresh
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setInviteDialog(true)}
                  >
                    Invite User
                  </Button>
                </Box>
              </Box>

              {invites.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No invites found. Create your first invite to get started.
                  </Typography>
                </Box>
              ) : (
                <Box>
                  {invites.map((invite) => {
                    const status = getInviteStatus(invite);
                    return (
                      <Paper key={invite.id} sx={{ p: 2, mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />
                              <Typography variant="subtitle1">
                                {invite.email}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                              <Chip
                                label={invite.role}
                                color={getRoleColor(invite.role)}
                                size="small"
                              />
                              <Chip
                                icon={status.icon}
                                label={status.label}
                                color={status.color}
                                size="small"
                              />
                              <Typography variant="caption" color="text.secondary">
                                Expires: {new Date(invite.expires_at).toLocaleDateString()}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {status.status === 'pending' && (
                              <>
                                <Tooltip title="Copy Invite Link">
                                  <IconButton
                                    size="small"
                                    onClick={() => copyInviteLink(invite.token)}
                                    color={copiedToken === invite.token ? 'success' : 'primary'}
                                  >
                                    <CopyIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete Invite">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDeleteInvite(invite.id)}
                                    sx={{ color: 'error.main' }}
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                            {status.status === 'expired' && (
                              <Tooltip title="Delete Expired Invite">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteInvite(invite.id)}
                                  sx={{ color: 'error.main' }}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </Box>
                      </Paper>
                    );
                  })}
                </Box>
              )}
            </Stack>
          </TabPanel>
        )}

        {/* Create Invite Dialog */}
        <Dialog
          open={inviteDialog}
          onClose={() => setInviteDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Typography variant="h6">
              Invite New User
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  value={newInvite.email}
                  onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })}
                  required
                  helperText="The user will receive an invite link at this email address"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={newInvite.role}
                    onChange={(e) => setNewInvite({ ...newInvite, role: e.target.value })}
                    label="Role"
                  >
                    <MenuItem value="user">User</MenuItem>
                    <MenuItem value="manager">Manager</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Alert severity="info">
                  <Typography variant="body2">
                    The invite will expire in 7 days. The user will receive a secure link to join your organization.
                  </Typography>
                </Alert>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setInviteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleCreateInvite}
              disabled={inviteLoading || !newInvite.email || !newInvite.role}
              startIcon={inviteLoading ? <CircularProgress size={20} /> : <AddIcon />}
            >
              Send Invite
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbars */}
        <Snackbar open={profileSnackbar} autoHideDuration={3000} onClose={() => setProfileSnackbar(false)}>
          <Alert onClose={() => setProfileSnackbar(false)} severity={profileMsg === 'Profile updated!' ? 'success' : 'error'} sx={{ width: '100%' }}>
            {profileMsg}
          </Alert>
        </Snackbar>
        
        <Snackbar open={passwordSnackbar} autoHideDuration={3000} onClose={() => setPasswordSnackbar(false)}>
          <Alert onClose={() => setPasswordSnackbar(false)} severity={passwordMsg === 'Password updated!' ? 'success' : 'error'} sx={{ width: '100%' }}>
            {passwordMsg}
          </Alert>
        </Snackbar>
        
        <Snackbar open={notifSnackbar} autoHideDuration={3000} onClose={() => setNotifSnackbar(false)}>
          <Alert onClose={() => setNotifSnackbar(false)} severity="success" sx={{ width: '100%' }}>
            {notifMsg}
          </Alert>
        </Snackbar>
      </Paper>
    </Box>
  );
} 