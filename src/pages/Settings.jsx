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

export default function Settings() {
  const { user, profile, organization } = useAuth();
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
  const [securityDialog, setSecurityDialog] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name || '');
    setEmail(user?.email || '');
  }, [profile, user]);

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

        <Grid container spacing={3}>
          {/* Profile Settings */}
          <Grid item xs={12} md={6}>
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <AccountCircleIcon color="primary" />
                  <Typography variant="h6">Profile Settings</Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
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
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Billing & Subscription */}
          <Grid item xs={12} md={6}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <PaymentIcon color="primary" />
                  <Typography variant="h6">Billing & Subscription</Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
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
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Security Settings */}
          <Grid item xs={12} md={6}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <SecurityIcon color="primary" />
                  <Typography variant="h6">Security</Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
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
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Appearance Settings */}
          <Grid item xs={12} md={6}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <DataUsageIcon color="primary" />
                  <Typography variant="h6">Appearance</Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={3}>
                  {/* Theme Selection */}
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>Theme</Typography>
                    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                      <Button
                        variant={mode === 'light' ? 'contained' : 'outlined'}
                        onClick={() => handleThemeChange('light')}
                        size="small"
                      >
                        Light
                      </Button>
                      <Button
                        variant={mode === 'dark' ? 'contained' : 'outlined'}
                        onClick={() => handleThemeChange('dark')}
                        size="small"
                      >
                        Dark
                      </Button>
                      <Button
                        variant={mode === 'system' ? 'contained' : 'outlined'}
                        onClick={() => handleThemeChange('system')}
                        size="small"
                      >
                        System
                      </Button>
                    </Stack>
                  </Box>

                  {/* Color Selection */}
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>Accent Color</Typography>
                    <Grid container spacing={1}>
                      {themeColors.map((color) => (
                        <Grid item key={color.value}>
                          <Tooltip title={color.name}>
                            <Box
                              sx={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                bgcolor: colorMap[color.value],
                                cursor: 'pointer',
                                border: accent === color.value ? 3 : 1,
                                borderColor: accent === color.value ? 'primary.main' : 'divider',
                                '&:hover': { transform: 'scale(1.1)' },
                                transition: 'transform 0.2s'
                              }}
                              onClick={() => handleColorChange(color.value)}
                            />
                          </Tooltip>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>

                  {/* Import Theme */}
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>Import Customers Page Theme</Typography>
                    <FormControl fullWidth>
                      <InputLabel>Theme</InputLabel>
                      <Select
                        value={importCustomersTheme}
                        label="Theme"
                        onChange={(e) => handleImportThemeChange(e.target.value)}
                      >
                        <MenuItem value="light">Light</MenuItem>
                        <MenuItem value="dark">Dark</MenuItem>
                        <MenuItem value="system">System</MenuItem>
                      </Select>
                    </FormControl>
                    <Button 
                      variant="outlined" 
                      color="primary"
                      onClick={handleImportThemeSave}
                      disabled={!importThemeChanged}
                      startIcon={<SaveIcon />}
                      sx={{ mt: 1 }}
                    >
                      Save Import Theme
                    </Button>
                  </Box>
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Notifications */}
          <Grid item xs={12} md={6}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <NotificationsIcon color="primary" />
                  <Typography variant="h6">Notifications</Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <Typography variant="subtitle1" gutterBottom>Notification Channels</Typography>
                  <FormControlLabel
                    control={<Switch checked={notifications.email} onChange={() => handleNotifChange('email')} />}
                    label="Email Notifications"
                  />
                  <FormControlLabel
                    control={<Switch checked={notifications.inApp} onChange={() => handleNotifChange('inApp')} />}
                    label="In-App Notifications"
                  />
                  <FormControlLabel
                    control={<Switch checked={notifications.browser} onChange={() => handleNotifChange('browser')} />}
                    label="Browser Push Notifications"
                  />
                  <FormControlLabel
                    control={<Switch checked={notifications.sms} onChange={() => handleNotifChange('sms')} />}
                    label="SMS Notifications"
                  />
                  
                  <Divider />
                  
                  <Typography variant="subtitle1" gutterBottom>Notification Types</Typography>
                  <FormControlLabel
                    control={<Switch checked={notifications.dailySummary} onChange={() => handleNotifChange('dailySummary')} />}
                    label="Daily Summary"
                  />
                  <FormControlLabel
                    control={<Switch checked={notifications.alerts} onChange={() => handleNotifChange('alerts')} />}
                    label="System Alerts"
                  />
                  <FormControlLabel
                    control={<Switch checked={notifications.reports} onChange={() => handleNotifChange('reports')} />}
                    label="Report Notifications"
                  />
                  
                  <Button 
                    variant="outlined" 
                    color="primary"
                    onClick={handleNotificationsSave}
                    disabled={!notificationsChanged}
                    startIcon={<SaveIcon />}
                  >
                    Save Notification Settings
                  </Button>
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Business Logic */}
          <Grid item xs={12} md={6}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <BusinessIcon color="primary" />
                  <Typography variant="h6">Business Logic</Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <Typography variant="subtitle1" gutterBottom>Scan Settings</Typography>
                  <FormControl fullWidth>
                    <InputLabel>Default Scan Mode</InputLabel>
                    <Select
                      value={businessSettings.defaultScanMode}
                      label="Default Scan Mode"
                      onChange={(e) => handleBusinessChange('defaultScanMode', e.target.value)}
                    >
                      <MenuItem value="SHIP">Ship</MenuItem>
                      <MenuItem value="RETURN">Return</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControlLabel
                    control={<Switch checked={businessSettings.autoAssignment} onChange={(e) => handleBusinessChange('autoAssignment', e.target.checked)} />}
                    label="Auto-assign Cylinders to Customers"
                  />
                  
                  <Divider />
                  
                  <Typography variant="subtitle1" gutterBottom>Billing Preferences</Typography>
                  <FormControlLabel
                    control={<Switch checked={businessSettings.billingPreferences.taxIncluded} onChange={(e) => handleBusinessChange('billingPreferences', { ...businessSettings.billingPreferences, taxIncluded: e.target.checked })} />}
                    label="Include Tax in Prices"
                  />
                  <FormControl fullWidth>
                    <InputLabel>Currency</InputLabel>
                    <Select
                      value={businessSettings.billingPreferences.currency}
                      label="Currency"
                      onChange={(e) => handleBusinessChange('billingPreferences', { ...businessSettings.billingPreferences, currency: e.target.value })}
                    >
                      <MenuItem value="USD">USD ($)</MenuItem>
                      <MenuItem value="EUR">EUR (€)</MenuItem>
                      <MenuItem value="GBP">GBP (£)</MenuItem>
                      <MenuItem value="CAD">CAD (C$)</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <Button 
                    variant="outlined" 
                    color="primary"
                    onClick={handleBusinessSave}
                    disabled={!businessChanged}
                    startIcon={<SaveIcon />}
                  >
                    Save Business Settings
                  </Button>
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Data & Export */}
          <Grid item xs={12} md={6}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <DownloadIcon color="primary" />
                  <Typography variant="h6">Data & Export</Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <Typography variant="subtitle1" gutterBottom>Export Settings</Typography>
                  <FormControl fullWidth>
                    <InputLabel>Default Export Format</InputLabel>
                    <Select
                      value={dataSettings.exportFormat}
                      label="Default Export Format"
                      onChange={(e) => handleDataChange('exportFormat', e.target.value)}
                    >
                      <MenuItem value="CSV">CSV</MenuItem>
                      <MenuItem value="XLSX">Excel (XLSX)</MenuItem>
                      <MenuItem value="PDF">PDF</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <FormControlLabel
                    control={<Switch checked={dataSettings.autoBackup} onChange={(e) => handleDataChange('autoBackup', e.target.checked)} />}
                    label="Automatic Backups"
                  />
                  
                  <FormControlLabel
                    control={<Switch checked={dataSettings.includeArchived} onChange={(e) => handleDataChange('includeArchived', e.target.checked)} />}
                    label="Include Archived Data in Exports"
                  />
                  
                  <Button 
                    variant="outlined" 
                    color="primary"
                    onClick={() => setExportDialog(true)}
                    startIcon={<DownloadIcon />}
                  >
                    Export Data
                  </Button>
                  
                  <Button 
                    variant="outlined" 
                    color="primary"
                    onClick={() => setBackupDialog(true)}
                  >
                    Create Backup
                  </Button>
                  
                  <Button 
                    variant="outlined" 
                    color="primary"
                    onClick={handleDataSave}
                    disabled={!dataChanged}
                    startIcon={<SaveIcon />}
                  >
                    Save Data Settings
                  </Button>
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Admin Settings */}
          {profile?.role === 'admin' && (
            <Grid item xs={12}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <AdminPanelSettingsIcon color="primary" />
                    <Typography variant="h6">Admin Settings</Typography>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <UserManagement />
                </AccordionDetails>
              </Accordion>
            </Grid>
          )}
        </Grid>

        {/* Snackbars */}
        <Snackbar open={profileSnackbar} autoHideDuration={6000} onClose={() => setProfileSnackbar(false)}>
          <Alert onClose={() => setProfileSnackbar(false)} severity={profileMsg.includes('error') ? 'error' : 'success'}>
            {profileMsg}
          </Alert>
        </Snackbar>

        <Snackbar open={passwordSnackbar} autoHideDuration={6000} onClose={() => setPasswordSnackbar(false)}>
          <Alert onClose={() => setPasswordSnackbar(false)} severity={passwordMsg.includes('error') ? 'error' : 'success'}>
            {passwordMsg}
          </Alert>
        </Snackbar>

        <Snackbar open={notifSnackbar} autoHideDuration={6000} onClose={() => setNotifSnackbar(false)}>
          <Alert onClose={() => setNotifSnackbar(false)} severity="success">
            {notifMsg}
          </Alert>
        </Snackbar>

        {/* Export Dialog */}
        <Dialog open={exportDialog} onClose={() => setExportDialog(false)}>
          <DialogTitle>Export Data</DialogTitle>
          <DialogContent>
            <Typography>Choose export format:</Typography>
            <Stack spacing={1} sx={{ mt: 2 }}>
              <Button onClick={() => handleExportData('CSV')} variant="outlined">CSV</Button>
              <Button onClick={() => handleExportData('XLSX')} variant="outlined">Excel (XLSX)</Button>
              <Button onClick={() => handleExportData('PDF')} variant="outlined">PDF</Button>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setExportDialog(false)}>Cancel</Button>
          </DialogActions>
        </Dialog>

        {/* Backup Dialog */}
        <Dialog open={backupDialog} onClose={() => setBackupDialog(false)}>
          <DialogTitle>Create Backup</DialogTitle>
          <DialogContent>
            <Typography>This will create a complete backup of your data.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBackupDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateBackup} variant="contained">Create Backup</Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
} 