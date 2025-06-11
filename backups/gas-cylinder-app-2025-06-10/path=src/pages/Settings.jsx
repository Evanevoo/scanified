import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  Box, Tabs, Tab, Typography, TextField, Button, Snackbar, Alert, Switch, FormControlLabel, IconButton, InputAdornment, Paper
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const themeColors = [
  { name: 'Blue', value: 'blue-600' },
  { name: 'Emerald', value: 'emerald-500' },
  { name: 'Purple', value: 'purple-600' },
  { name: 'Rose', value: 'rose-500' },
  { name: 'Amber', value: 'amber-500' },
];

const colorMap = {
  'blue-600': '#2563eb',
  'emerald-500': '#10b981',
  'purple-600': '#7c3aed',
  'rose-500': '#f43f5e',
  'amber-500': '#f59e42',
};

export default function Settings() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);

  // Profile Info
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Theme
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [color, setColor] = useState(localStorage.getItem('themeColor') || 'blue-600');
  const [importCustomersTheme, setImportCustomersTheme] = useState(localStorage.getItem('importCustomersTheme') || 'system');

  // Notifications
  const [notifications, setNotifications] = useState(
    JSON.parse(localStorage.getItem('notifications')) || {
      email: true,
      inApp: true,
    }
  );
  const [notifMsg, setNotifMsg] = useState('');

  // Snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    setFullName(profile?.full_name || '');
    setEmail(user?.email || '');
  }, [profile, user]);

  // Theme effect
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
    localStorage.setItem('themeColor', color);
  }, [theme, color]);

  useEffect(() => {
    localStorage.setItem('importCustomersTheme', importCustomersTheme);
  }, [importCustomersTheme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', colorMap[color] || colorMap['blue-600']);
  }, [color]);

  // Profile update
  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileMsg('');
    setProfileError('');
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', user.id);
    if (!error) {
      setProfileMsg('Profile updated!');
      setSnackbar({ open: true, message: 'Profile updated!', severity: 'success' });
    } else {
      setProfileError(error.message);
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  // Password update
  const handlePasswordSave = async (e) => {
    e.preventDefault();
    setPasswordMsg('');
    setPasswordError('');
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      setSnackbar({ open: true, message: 'Passwords do not match.', severity: 'error' });
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) {
      setPasswordMsg('Password updated!');
      setSnackbar({ open: true, message: 'Password updated!', severity: 'success' });
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPasswordError(error.message);
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  // Theme update
  const handleThemeChange = (t) => setTheme(t);
  const handleColorChange = (c) => setColor(c);

  // Notifications update
  const handleNotifChange = (type) => {
    const updated = { ...notifications, [type]: !notifications[type] };
    setNotifications(updated);
    localStorage.setItem('notifications', JSON.stringify(updated));
    setNotifMsg('Preferences saved!');
    setSnackbar({ open: true, message: 'Preferences saved!', severity: 'success' });
  };

  return (
    <Box maxWidth="sm" mx="auto" mt={4}>
      <Paper elevation={6} sx={{ borderRadius: 4, p: 4 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <IconButton onClick={() => navigate('/home')} color="primary">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" fontWeight={800} color="primary" ml={1}>
            Settings
          </Typography>
        </Box>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          indicatorColor="primary"
          textColor="primary"
          sx={{ mb: 3 }}
        >
          <Tab label="Profile" />
          <Tab label="Security" />
          <Tab label="Appearance" />
          <Tab label="Notifications" />
        </Tabs>
        {/* Profile Tab */}
        {activeTab === 0 && (
          <Box component="form" onSubmit={handleProfileSave} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Full Name"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              fullWidth
            />
            <TextField
              label="Email"
              value={email}
              fullWidth
              disabled
            />
            <Button type="submit" variant="contained" color="primary">Save</Button>
            {profileMsg && <Alert severity="success">{profileMsg}</Alert>}
            {profileError && <Alert severity="error">{profileError}</Alert>}
          </Box>
        )}
        {/* Security Tab */}
        {activeTab === 1 && (
          <Box component="form" onSubmit={handlePasswordSave} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="New Password"
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(v => !v)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="Confirm New Password"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              fullWidth
            />
            <Button type="submit" variant="contained" color="primary">Change Password</Button>
            {passwordMsg && <Alert severity="success">{passwordMsg}</Alert>}
            {passwordError && <Alert severity="error">{passwordError}</Alert>}
          </Box>
        )}
        {/* Appearance Tab */}
        {activeTab === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
              <Typography fontWeight={600} mb={1}>Theme</Typography>
              <Button
                variant={theme === 'light' ? 'contained' : 'outlined'}
                color="primary"
                onClick={() => handleThemeChange('light')}
                sx={{ mr: 2 }}
              >Light</Button>
              <Button
                variant={theme === 'dark' ? 'contained' : 'outlined'}
                color="primary"
                onClick={() => handleThemeChange('dark')}
              >Dark</Button>
            </Box>
            <Box>
              <Typography fontWeight={600} mb={1}>Import Customers Page Theme</Typography>
              <TextField
                select
                value={importCustomersTheme}
                onChange={e => setImportCustomersTheme(e.target.value)}
                fullWidth
                SelectProps={{ native: true }}
              >
                <option value="system">System/Global</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </TextField>
              <Typography variant="caption" color="text.secondary">
                Choose a theme for the Import Customers page, independent of the global theme.
              </Typography>
            </Box>
            <Box>
              <Typography fontWeight={600} mb={1}>Accent Color</Typography>
              <Box display="flex" gap={2}>
                {themeColors.map(tc => (
                  <IconButton
                    key={tc.value}
                    onClick={() => handleColorChange(tc.value)}
                    sx={{
                      width: 40, height: 40, borderRadius: '50%',
                      border: color === tc.value ? '3px solid #1976d2' : '2px solid #ccc',
                      background: colorMap[tc.value],
                      boxShadow: color === tc.value ? 3 : 0,
                      transform: color === tc.value ? 'scale(1.1)' : 'scale(1)'
                    }}
                  >
                    {color === tc.value && <Visibility sx={{ color: '#fff' }} />}
                  </IconButton>
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary">
                Your accent color is used for highlights, buttons, and tabs.
              </Typography>
            </Box>
          </Box>
        )}
        {/* Notifications Tab */}
        {activeTab === 3 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={notifications.email}
                  onChange={() => handleNotifChange('email')}
                  color="primary"
                />
              }
              label="Email Notifications"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={notifications.inApp}
                  onChange={() => handleNotifChange('inApp')}
                  color="primary"
                />
              }
              label="In-App Notifications"
            />
            {notifMsg && <Alert severity="success">{notifMsg}</Alert>}
          </Box>
        )}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Paper>
    </Box>
  );
} 