import logger from '../utils/logger';
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import PortalSnackbar from '../components/PortalSnackbar';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  TextField,
  Button,
  Switch,
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
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  Grid,
  Card,
  CardContent,
  Tooltip,
  CircularProgress
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SecurityIcon from '@mui/icons-material/Security';
import BusinessIcon from '@mui/icons-material/Business';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import DataUsageIcon from '@mui/icons-material/DataUsage';
import SaveIcon from '@mui/icons-material/Save';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import PaymentIcon from '@mui/icons-material/Payment';
import PeopleIcon from '@mui/icons-material/People';
import EditIcon from '@mui/icons-material/Edit';
import SettingsIcon from '@mui/icons-material/Settings';
import QrCodeIcon from '@mui/icons-material/QrCode';
import SupportIcon from '@mui/icons-material/Support';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PaletteIcon from '@mui/icons-material/Palette';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import DeleteIcon from '@mui/icons-material/Delete';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import DownloadIcon from '@mui/icons-material/Download';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ArticleIcon from '@mui/icons-material/Article';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import InvoiceTemplateManager from '../components/InvoiceTemplateManager';
import UserManagement from './UserManagement';
import { usePermissions } from '../context/PermissionsContext';

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

// Predefined barcode types for easy selection
const barcodeTypes = {
  'code128': {
    name: 'Code 128',
    pattern: '^[A-Za-z0-9\\-_]{1,48}$',
    description: 'Alphanumeric, up to 48 characters',
    example: 'ABC123-DEF456'
  },
  'code39': {
    name: 'Code 39',
    pattern: '^[A-Z0-9\\-\\.\\$\\/\\+\\%\\*\\s]{1,43}$',
    description: 'Uppercase letters, numbers, and special chars',
    example: 'ABC-123'
  },
  'ean13': {
    name: 'EAN-13',
    pattern: '^[0-9]{13}$',
    description: '13 digits (standard product barcodes)',
    example: '1234567890123'
  },
  'ean8': {
    name: 'EAN-8',
    pattern: '^[0-9]{8}$',
    description: '8 digits (short product barcodes)',
    example: '12345678'
  },
  'upc': {
    name: 'UPC-A',
    pattern: '^[0-9]{12}$',
    description: '12 digits (US product barcodes)',
    example: '123456789012'
  },
  'qr': {
    name: 'QR Code',
    pattern: '^.{1,2953}$',
    description: 'Any characters, up to 2953 chars',
    example: 'https://example.com/asset/123'
  },
  'datamatrix': {
    name: 'Data Matrix',
    pattern: '^.{1,2335}$',
    description: 'Any characters, up to 2335 chars',
    example: 'ASSET:CYL001:2024'
  },
  'alphanumeric': {
    name: 'Alphanumeric',
    pattern: '^[A-Z0-9]{4,20}$',
    description: 'Uppercase letters and numbers, 4-20 chars',
    example: 'CYL123456'
  },
  'numeric': {
    name: 'Numeric Only',
    pattern: '^[0-9]{4,15}$',
    description: 'Numbers only, 4-15 digits',
    example: '1234567890'
  },
  'custom': {
    name: 'Custom Pattern',
    pattern: '^[A-Z0-9]{6,12}$',
    description: 'Define your own regex pattern',
    example: 'ABC123456'
  }
};

const orderNumberTypes = {
  'ord_numeric': {
    name: 'ORD + Numbers',
    pattern: '^ORD[0-9]{4,8}$',
    description: 'ORD followed by 4-8 digits',
    prefix: 'ORD',
    example: 'ORD123456'
  },
  'po_numeric': {
    name: 'PO + Numbers',
    pattern: '^PO[0-9]{4,8}$',
    description: 'PO followed by 4-8 digits',
    prefix: 'PO',
    example: 'PO123456'
  },
  'del_numeric': {
    name: 'DEL + Numbers',
    pattern: '^DEL[0-9]{4,8}$',
    description: 'DEL followed by 4-8 digits',
    prefix: 'DEL',
    example: 'DEL123456'
  },
  'year_sequence': {
    name: 'Year + Sequence',
    pattern: '^[0-9]{4}-[0-9]{4,6}$',
    description: 'YYYY-NNNNNN format',
    prefix: '',
    example: '2024-001234'
  },
  'alphanumeric_order': {
    name: 'Alphanumeric',
    pattern: '^[A-Z0-9]{6,15}$',
    description: 'Letters and numbers, 6-15 chars',
    prefix: '',
    example: 'ORDER12345'
  },
  'flexible_5_digit': {
    name: 'Flexible 5-Digit',
    pattern: '^[A-Z]?[0-9]{5}[A-Z]?$',
    description: '5 digits, or letter+5 digits, or 5 digits+letter',
    prefix: '',
    example: '12345, A12345, 12345A'
  },
  'custom': {
    name: 'Custom Pattern',
    pattern: '^[A-Z]?[0-9]{5}[A-Z]?$',
    description: '5 digits, or letter+5 digits, or 5 digits+letter',
    prefix: '',
    example: '12345, A12345, 12345A'
  }
};

const serialNumberTypes = {
  'letter_number': {
    name: 'Letters + Numbers',
    pattern: '^[A-Z]{2}[0-9]{6,10}$',
    description: '2 letters followed by 6-10 digits',
    example: 'AB1234567890'
  },
  'manufacturer_serial': {
    name: 'Manufacturer Style',
    pattern: '^[A-Z]{3}-[0-9]{4}-[0-9]{4}$',
    description: 'XXX-YYYY-ZZZZ format',
    example: 'ABC-1234-5678'
  },
  'year_serial': {
    name: 'Year + Serial',
    pattern: '^[0-9]{4}[A-Z]{2}[0-9]{6}$',
    description: 'YYYYAANNNNNN format',
    example: '2024AB123456'
  },
  'simple_numeric': {
    name: 'Numeric Serial',
    pattern: '^[0-9]{8,15}$',
    description: '8-15 digit serial number',
    example: '123456789012'
  },
  'hex_style': {
    name: 'Hexadecimal Style',
    pattern: '^[A-F0-9]{8,16}$',
    description: 'Hexadecimal characters, 8-16 chars',
    example: 'A1B2C3D4E5F6'
  },
  'custom': {
    name: 'Custom Pattern',
    pattern: '^[A-Z]{2}[0-9]{8}$',
    description: 'Define your own pattern',
    example: 'AB12345678'
  }
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
      {value === index && (
        <Box sx={{ p: { xs: 2, sm: 3 }, width: '100%' }}>{children}</Box>
      )}
    </div>
  );
}

export default function Settings() {
  const { user, profile, organization, reloadOrganization, reloadUserData } = useAuth();
  const { isOrgAdmin } = usePermissions();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(0);

  // Support ticket history
  const [supportTickets, setSupportTickets] = useState([]);
  const [supportTicketsLoading, setSupportTicketsLoading] = useState(false);

  // Data export / delete account
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteAccountDialog, setDeleteAccountDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Profile preferences (timezone, locale) — locale must be one of the Language select options (en, es, fr, de)
  const LOCALE_OPTIONS = ['en', 'es', 'fr', 'de'];
  const normalizeLocale = (locale) => {
    if (!locale) return 'en';
    const base = String(locale).split('-')[0].toLowerCase();
    return LOCALE_OPTIONS.includes(base) ? base : LOCALE_OPTIONS.includes(locale) ? locale : 'en';
  };
  const [preferences, setPreferences] = useState({
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    locale: normalizeLocale(typeof navigator !== 'undefined' ? (navigator.language || 'en') : 'en'),
  });
  const [preferencesChanged, setPreferencesChanged] = useState(false);

  // Guaranteed valid value for the Language Select (avoids MUI out-of-range when profile has e.g. en-US)
  const localeSelectValue = LOCALE_OPTIONS.includes(preferences.locale)
    ? preferences.locale
    : normalizeLocale(preferences.locale);

  // Loading states
  const [profileLoading, setProfileLoading] = useState(false);
  const [assetConfigLoading, setAssetConfigLoading] = useState(false);
  const [barcodeConfigLoading, setBarcodeConfigLoading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  // Messages
  const [profileMsg, setProfileMsg] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [notifMsg, setNotifMsg] = useState('');
  const [assetConfigMsg, setAssetConfigMsg] = useState('');
  const [barcodeConfigMsg, setBarcodeConfigMsg] = useState('');
  const [logoMsg, setLogoMsg] = useState('');

  // Snackbars
  const [profileSnackbar, setProfileSnackbar] = useState(false);
  const [passwordSnackbar, setPasswordSnackbar] = useState(false);
  const [notifSnackbar, setNotifSnackbar] = useState(false);

  // Profile Data
  const [profileData, setProfileData] = useState({
    full_name: profile?.full_name || '',
    email: user?.email || ''
  });
  const [profileChanged, setProfileChanged] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);


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

  // Asset Configuration (includes app icon)
  const [assetConfig, setAssetConfig] = useState({
    assetType: 'cylinder',
    assetDisplayName: '',
    assetDisplayNamePlural: '',
    appName: '',
    primaryColor: '#2563eb',
    secondaryColor: '#1e40af',
    appIconUrl: '',
    showAppIcon: true,
  });
  const [assetConfigChanged, setAssetConfigChanged] = useState(false);
  const [appIconUploading, setAppIconUploading] = useState(false);

  // Barcode Format Configuration
  const [barcodeConfig, setBarcodeConfig] = useState({
    barcodeType: 'custom',
    barcodePattern: '^[A-Z0-9]{6,12}$',
    barcodeDescription: '6-12 alphanumeric characters',
    orderNumberType: 'custom',
    orderNumberPattern: '^ORD[0-9]{6}$',
    orderNumberDescription: 'ORD followed by 6 digits',
    orderNumberPrefix: 'ORD',
    serialNumberType: 'custom',
    serialNumberPattern: '^[A-Z]{2}[0-9]{8}$',
    serialNumberDescription: '2 letters followed by 8 digits',
  });
  const [barcodeConfigChanged, setBarcodeConfigChanged] = useState(false);


  // Logo
  const [logoUrl, setLogoUrl] = useState(organization?.logo_url || '');

  // Support form
  const [supportForm, setSupportForm] = useState({
    subject: '',
    message: '',
    category: 'general'
  });
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportMsg, setSupportMsg] = useState('');
  const [supportSnackbar, setSupportSnackbar] = useState(false);

  // Invoice Template
  const [invoiceTemplate, setInvoiceTemplate] = useState(null);
  const [invoiceTemplateManagerOpen, setInvoiceTemplateManagerOpen] = useState(false);
  
  // Invoice Email Management
  const [invoiceEmails, setInvoiceEmails] = useState([]);
  const [defaultInvoiceEmail, setDefaultInvoiceEmail] = useState('');
  const [newInvoiceEmail, setNewInvoiceEmail] = useState('');
  const [invoiceEmailLoading, setInvoiceEmailLoading] = useState(false);
  const [invoiceEmailMsg, setInvoiceEmailMsg] = useState('');

  // Tab configuration based on user role
  const getTabsConfig = () => {
    const baseTabs = [
      { label: 'Profile', icon: <AccountCircleIcon />, id: 'profile' },
      { label: 'Security', icon: <SecurityIcon />, id: 'security' },
      { label: 'Appearance', icon: <BusinessIcon />, id: 'appearance' },
      { label: 'Billing', icon: <PaymentIcon />, id: 'billing' },
      { label: 'Help & Support', icon: <SupportIcon />, id: 'support' },
    ];

    const adminTabs = [];
    if (profile?.role === 'admin' || profile?.role === 'owner') {
      adminTabs.push(
        { label: 'Invoice Template', icon: <ReceiptIcon />, id: 'invoice-template' },
        { label: 'Team', icon: <PeopleIcon />, id: 'team' },
        { label: 'Assets', icon: <DataUsageIcon />, id: 'assets' },
        { label: 'Barcodes', icon: <QrCodeIcon />, id: 'barcodes' }
      );
    }

    return [...baseTabs, ...adminTabs];
  };

  const tabsConfig = getTabsConfig();

  // Initialize data
  useEffect(() => {
    if (profile) {
      setProfileData({
        full_name: profile.full_name || '',
        email: user?.email || ''
      });
    }
    
    if (organization) {
      setAssetConfig({
        assetType: organization.asset_type || 'cylinder',
        assetDisplayName: organization.asset_display_name || 'Gas Cylinder',
        assetDisplayNamePlural: organization.asset_display_name_plural || 'Gas Cylinders',
        appName: organization.app_name || 'Scanified',
        primaryColor: organization.primary_color || '#40B5AD',
        secondaryColor: organization.secondary_color || '#48C9B0',
        appIconUrl: organization.app_icon_url || '',
        showAppIcon: organization.show_app_icon !== false,
      });
      
      // Load barcode config from organization's format_configuration
      const formatConfig = organization.format_configuration || {};
      const barcodeFormat = formatConfig.barcode_format || {
        pattern: '^[A-Z0-9]{6,12}$',
        description: '6-12 alphanumeric characters',
        examples: ['123456789', '987654321'],
        validation_enabled: true
      };
      const orderNumberFormat = formatConfig.order_number_format || {
        pattern: '^ORD[0-9]{6}$',
        description: 'ORD followed by 6 digits',
        examples: ['ORD123456', 'SO789012'],
        prefix: 'ORD',
        validation_enabled: true
      };
      const customerIdFormat = formatConfig.customer_id_format || {
        pattern: '^[A-Z0-9]{4,10}$',
        description: '4-10 alphanumeric characters',
        examples: ['CUST123', 'CLIENT456'],
        prefix: '',
        validation_enabled: true
      };

      const detectBarcodeType = (pattern) => {
        for (const [key, type] of Object.entries(barcodeTypes)) {
          if (type.pattern === pattern) return key;
        }
        return 'custom';
      };

      const detectOrderNumberType = (pattern) => {
        for (const [key, type] of Object.entries(orderNumberTypes)) {
          if (type.pattern === pattern) return key;
        }
        return 'custom';
      };

      const detectSerialNumberType = (pattern) => {
        for (const [key, type] of Object.entries(serialNumberTypes)) {
          if (type.pattern === pattern) return key;
        }
        return 'custom';
      };

      setBarcodeConfig({
        barcodeType: detectBarcodeType(barcodeFormat.pattern),
        barcodePattern: barcodeFormat.pattern,
        barcodeDescription: barcodeFormat.description,
        orderNumberType: detectOrderNumberType(orderNumberFormat.pattern),
        orderNumberPattern: orderNumberFormat.pattern,
        orderNumberDescription: orderNumberFormat.description,
        orderNumberPrefix: orderNumberFormat.prefix || '',
        serialNumberType: detectSerialNumberType(customerIdFormat.pattern),
        serialNumberPattern: customerIdFormat.pattern,
        serialNumberDescription: customerIdFormat.description,
      });
      
      setLogoUrl(organization.logo_url || '');
    }
  }, [profile, organization]);


  // Track changes
  useEffect(() => {
    setProfileChanged(
      profileData.full_name !== (profile?.full_name || '')
    );
  }, [profileData, profile]);

  useEffect(() => {
    setAssetConfigChanged(
      assetConfig.assetType !== (organization?.asset_type || 'cylinder') ||
      assetConfig.assetDisplayName !== (organization?.asset_display_name || '') ||
      assetConfig.assetDisplayNamePlural !== (organization?.asset_display_name_plural || '') ||
      assetConfig.appName !== (organization?.app_name || '') ||
      assetConfig.primaryColor !== (organization?.primary_color || '#40B5AD') ||
      assetConfig.secondaryColor !== (organization?.secondary_color || '#48C9B0') ||
      assetConfig.appIconUrl !== (organization?.app_icon_url || '') ||
      assetConfig.showAppIcon !== (organization?.show_app_icon !== false)
    );
  }, [assetConfig, organization]);

  useEffect(() => {
    setBarcodeConfigChanged(
      barcodeConfig.barcodePattern !== (organization?.format_configuration?.barcode_format?.pattern || '^[A-Z0-9]{6,12}$') ||
      barcodeConfig.barcodeDescription !== (organization?.format_configuration?.barcode_format?.description || '6-12 alphanumeric characters') ||
      barcodeConfig.orderNumberPattern !== (organization?.format_configuration?.order_number_format?.pattern || '^ORD[0-9]{6}$') ||
      barcodeConfig.orderNumberDescription !== (organization?.format_configuration?.order_number_format?.description || 'ORD followed by 6 digits') ||
      barcodeConfig.orderNumberPrefix !== (organization?.format_configuration?.order_number_format?.prefix || 'ORD') ||
      barcodeConfig.serialNumberPattern !== (organization?.format_configuration?.customer_id_format?.pattern || '^[A-Z0-9]{4,10}$') ||
      barcodeConfig.serialNumberDescription !== (organization?.format_configuration?.customer_id_format?.description || '4-10 alphanumeric characters')
    );

    // Load invoice template
    if (organization?.id) {
      try {
        const savedTemplate = localStorage.getItem(`invoiceTemplate_${organization.id}`);
        if (savedTemplate) {
          setInvoiceTemplate(JSON.parse(savedTemplate));
        }
      } catch (error) {
        logger.error('Error loading invoice template:', error);
      }
      
      // Load invoice emails
      const loadInvoiceEmails = async () => {
        try {
          // Try to select the new columns, but handle if they don't exist
          const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .select('invoice_emails, default_invoice_email, email')
            .eq('id', organization.id)
            .single();

          if (orgError) {
            // If error is about missing columns, show helpful message
            if (orgError.message?.includes('invoice_emails') || orgError.message?.includes('default_invoice_email') || orgError.message?.includes('schema cache')) {
              logger.warn('Invoice email columns may not exist. Migration may need to be run.');
              setInvoiceEmailMsg('⚠️ Invoice email feature requires database migration. Please run VERIFY_AND_FIX_INVOICE_EMAILS.sql in Supabase SQL Editor, then wait 30 seconds and refresh this page.');
              // Fallback to using organization.email
              if (organization?.email) {
                setInvoiceEmails([organization.email]);
                setDefaultInvoiceEmail(organization.email);
              }
              return;
            }
            throw orgError;
          }

          if (orgData) {
            let emails = [];
            if (orgData.invoice_emails && Array.isArray(orgData.invoice_emails)) {
              emails = orgData.invoice_emails;
            } else if (orgData.email) {
              emails = [orgData.email];
            }
            setInvoiceEmails(emails);
            setDefaultInvoiceEmail(orgData.default_invoice_email || orgData.email || '');
          }
        } catch (error) {
          logger.error('Error loading invoice emails:', error);
          // Fallback to using organization.email
          if (organization?.email) {
            setInvoiceEmails([organization.email]);
            setDefaultInvoiceEmail(organization.email);
          }
        }
      };
      
      loadInvoiceEmails();
    }
  }, [barcodeConfig, organization]);

  // Profile update
  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileMsg('');
    setProfileLoading(true);
    
    try {
      logger.log('Updating profile with data:', { 
        id: user.id, 
        full_name: profileData.full_name 
      });
      
      const updates = { full_name: profileData.full_name };
      if (preferencesChanged) {
        updates.preferences = { timezone: preferences.timezone, locale: preferences.locale };
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();
        
      if (error) {
        logger.error('Profile update error:', error);
        throw error;
      }
      
      logger.log('Profile updated successfully:', data);
      setProfileMsg('Profile updated successfully!');
      setProfileChanged(false);
      if (preferencesChanged) setPreferencesChanged(false);
      
      // Reload auth context to get updated profile
      if (reloadUserData) {
        await reloadUserData();
      }
    } catch (error) {
      logger.error('Profile update failed:', error);
      setProfileMsg('Error updating profile: ' + error.message);
    } finally {
      setProfileLoading(false);
      setProfileSnackbar(true);
    }
  };

  // Password update with current password verification
  const handlePasswordSave = async (e) => {
    e.preventDefault();
    setPasswordMsg('');
    setPasswordChangeLoading(true);
    
    // Validate current password first
    if (!currentPassword) {
      setPasswordMsg('Please enter your current password.');
      setPasswordChangeLoading(false);
      setPasswordSnackbar(true);
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordMsg('New passwords do not match.');
      setPasswordChangeLoading(false);
      setPasswordSnackbar(true);
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordMsg('New password must be at least 6 characters long.');
      setPasswordChangeLoading(false);
      setPasswordSnackbar(true);
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordMsg('New password must be different from current password.');
      setPasswordChangeLoading(false);
      setPasswordSnackbar(true);
      return;
    }
    
    try {
      // Verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });

      if (signInError) {
        setPasswordMsg('Current password is incorrect. Please verify and try again.');
        setPasswordChangeLoading(false);
        setPasswordSnackbar(true);
        return;
      }

      // If current password is correct, update to new password
      const { error: updateError } = await supabase.auth.updateUser({ 
        password: newPassword 
      });
      
      if (updateError) throw updateError;
      
      setPasswordMsg('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      logger.error('Password update error:', error);
      setPasswordMsg(error.message || 'Failed to update password. Please try again.');
    } finally {
      setPasswordChangeLoading(false);
      setPasswordSnackbar(true);
    }
  };



  // Security settings update
  const handleSecurityChange = (key, value) => {
    const updated = { ...securitySettings, [key]: value };
    setSecuritySettings(updated);
    setSecurityChanged(true);
  };

  // Support form submission
  const handleSupportSubmit = async (e) => {
    e.preventDefault();
    setSupportMsg('');
    setSupportLoading(true);
    
    try {
      logger.log('Submitting support ticket:', supportForm);
      
      const { data, error } = await supabase
        .from('customer_support')
        .insert({
          user_id: user.id,
          organization_id: profile?.organization_id,
          email: user.email,
          subject: supportForm.subject,
          message: supportForm.message,
          category: supportForm.category,
          status: 'open',
          priority: 'medium'
        })
        .select()
        .single();
        
      if (error) {
        logger.error('Support ticket submission error:', error);
        throw error;
      }
      
      logger.log('Support ticket submitted successfully:', data);
      setSupportMsg('Support ticket submitted successfully! We\'ll get back to you soon.');
      loadSupportTickets();
      // Reset form
      setSupportForm({
        subject: '',
        message: '',
        category: 'general'
      });
    } catch (error) {
      logger.error('Support ticket submission failed:', error);
      setSupportMsg('Error submitting support ticket: ' + error.message);
    } finally {
      setSupportLoading(false);
      setSupportSnackbar(true);
    }
  };

  const handleSecuritySave = async () => {
    localStorage.setItem('securitySettings', JSON.stringify(securitySettings));
    
    // Save to database
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ security_settings: securitySettings })
        .eq('id', user.id);
      
      if (!error) {
        setSecurityChanged(false);
        setNotifMsg('Security settings saved!');
        setNotifSnackbar(true);
      }
    } catch (error) {
      logger.error('Error saving security settings:', error);
    }
  };

  // Asset Configuration update
  const handleSaveAssetConfig = async () => {
    setAssetConfigMsg('');
    setAssetConfigLoading(true);

    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          asset_type: assetConfig.assetType,
          asset_display_name: assetConfig.assetDisplayName,
          asset_display_name_plural: assetConfig.assetDisplayNamePlural,
          app_name: assetConfig.appName,
          primary_color: assetConfig.primaryColor,
          secondary_color: assetConfig.secondaryColor,
          app_icon_url: assetConfig.appIconUrl || null,
          show_app_icon: assetConfig.showAppIcon,
        })
        .eq('id', profile.organization_id);

      if (error) throw error;
      
      setAssetConfigMsg('Asset configuration updated successfully!');
      setAssetConfigChanged(false);
      
      // Reload organization context
      if (reloadOrganization) {
        await reloadOrganization();
      }
    } catch (error) {
      logger.error('Error saving asset config:', error);
      setAssetConfigMsg('Error saving asset configuration: ' + error.message);
    } finally {
      setAssetConfigLoading(false);
    }
  };

  // Barcode type change handlers
  const handleBarcodeTypeChange = (type) => {
    const selectedType = barcodeTypes[type];
    setBarcodeConfig(prev => ({
      ...prev,
      barcodeType: type,
      barcodePattern: selectedType.pattern,
      barcodeDescription: selectedType.description
    }));
  };

  const handleOrderNumberTypeChange = (type) => {
    const selectedType = orderNumberTypes[type];
    setBarcodeConfig(prev => ({
      ...prev,
      orderNumberType: type,
      orderNumberPattern: selectedType.pattern,
      orderNumberDescription: selectedType.description,
      orderNumberPrefix: selectedType.prefix
    }));
  };

  const handleSerialNumberTypeChange = (type) => {
    const selectedType = serialNumberTypes[type];
    setBarcodeConfig(prev => ({
      ...prev,
      serialNumberType: type,
      serialNumberPattern: selectedType.pattern,
      serialNumberDescription: selectedType.description
    }));
  };

  // Barcode Configuration update
  const handleSaveBarcodeConfig = async () => {
    setBarcodeConfigMsg('');
    setBarcodeConfigLoading(true);

    try {
      // Get current format_configuration to preserve other settings
      const { data: currentData } = await supabase
        .from('organizations')
        .select('format_configuration')
        .eq('id', profile.organization_id)
        .single();

      const currentFormatConfig = currentData?.format_configuration || {};

      const { error } = await supabase
        .from('organizations')
        .update({
          format_configuration: {
            ...currentFormatConfig,
            barcode_format: {
              pattern: barcodeConfig.barcodePattern,
              description: barcodeConfig.barcodeDescription,
              examples: ['123456789', '987654321'],
              validation_enabled: true
            },
            order_number_format: {
              pattern: barcodeConfig.orderNumberPattern,
              description: barcodeConfig.orderNumberDescription,
              examples: ['ORD123456', 'SO789012'],
              prefix: barcodeConfig.orderNumberPrefix,
              validation_enabled: true
            },
            customer_id_format: {
              pattern: barcodeConfig.serialNumberPattern,
              description: barcodeConfig.serialNumberDescription,
              examples: ['CUST123', 'CLIENT456'],
              prefix: '',
              validation_enabled: true
            }
          }
        })
        .eq('id', profile.organization_id);

      if (error) throw error;
      
      setBarcodeConfigMsg('Barcode configuration updated successfully!');
      setBarcodeConfigChanged(false);
      
      // Reload organization context
      if (reloadOrganization) {
        await reloadOrganization();
      }
    } catch (error) {
      logger.error('Error saving barcode config:', error);
      setBarcodeConfigMsg('Error saving barcode configuration: ' + error.message);
    } finally {
      setBarcodeConfigLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    // Update URL parameter when tab changes
    const tabId = tabsConfig[newValue]?.id;
    if (tabId) {
      setSearchParams({ tab: tabId });
    } else {
      setSearchParams({});
    }
  };

  // Sync URL tab param for all tabs (bookmarkable)
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      const idx = tabsConfig.findIndex(tab => tab.id === tabParam);
      if (idx >= 0 && idx !== activeTab) {
        setActiveTab(idx);
      }
    }
  }, [searchParams]);

  // Unsaved changes: warn on browser close/refresh (useBlocker requires data router, so we use beforeunload)
  const hasUnsavedChanges = profileChanged || securityChanged || assetConfigChanged || barcodeConfigChanged || preferencesChanged;
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Load support ticket history (user's own tickets)
  const loadSupportTickets = useCallback(async () => {
    if (!user?.id) return;
    setSupportTicketsLoading(true);
    try {
      const { data, error } = await supabase
        .from('customer_support')
        .select('id, subject, category, status, priority, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (!error) setSupportTickets(data || []);
    } catch (e) {
      logger.error('Error loading support tickets:', e);
    } finally {
      setSupportTicketsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (activeTab === 4) loadSupportTickets(); // Help & Support tab index
  }, [activeTab, loadSupportTickets]);

  // Load profile preferences from profile when it becomes available (e.g. after refresh)
  useEffect(() => {
    const prefs = profile?.preferences;
    if (profile && prefs !== undefined && prefs !== null && typeof prefs === 'object') {
      setPreferences(prev => ({
        timezone: prefs.timezone !== undefined && prefs.timezone !== null ? prefs.timezone : prev.timezone,
        locale: prefs.locale !== undefined && prefs.locale !== null ? normalizeLocale(prefs.locale) : prev.locale,
      }));
    }
  }, [profile?.id, profile?.preferences]);

  // If state ever has an invalid locale (e.g. en-US), normalize it so Select never receives it
  useEffect(() => {
    if (preferences.locale && !LOCALE_OPTIONS.includes(preferences.locale)) {
      setPreferences(prev => ({ ...prev, locale: normalizeLocale(prev.locale) }));
    }
  }, [preferences.locale]);


  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setLogoUploading(true);
    setLogoMsg('');
    
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `org-${organization.id}-${Date.now()}.${fileExt}`;
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('organization-logos')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data } = supabase.storage.from('organization-logos').getPublicUrl(filePath);
      if (!data?.publicUrl) throw new Error('Failed to get public URL');
      
      const logoUrlWithCacheBust = `${data.publicUrl}?t=${Date.now()}`;
      
      // Save to org
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ logo_url: logoUrlWithCacheBust })
        .eq('id', organization.id);
      if (updateError) throw updateError;
      
      setLogoUrl(logoUrlWithCacheBust);
      setLogoMsg('Logo updated successfully!');
      
      // Refresh organization context
      if (reloadOrganization) {
        await reloadOrganization();
      }
    } catch (err) {
      logger.error('Logo upload error:', err);
      setLogoMsg('Error uploading logo: ' + err.message);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleAppIconUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !organization?.id) return;
    setAppIconUploading(true);
    setAssetConfigMsg('');
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `org-${organization.id}-icon-${Date.now()}.${fileExt}`;
      const bucket = 'organization-logos';
      const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
      const url = data?.publicUrl ? `${data.publicUrl}?t=${Date.now()}` : '';
      setAssetConfig(prev => ({ ...prev, appIconUrl: url }));
      setAssetConfigChanged(true);
      setAssetConfigMsg('App icon selected. Click "Save Asset Configuration" to apply.');
      if (reloadOrganization) await reloadOrganization();
    } catch (err) {
      logger.error('App icon upload error:', err);
      setAssetConfigMsg('Error uploading app icon: ' + err.message);
    } finally {
      setAppIconUploading(false);
    }
  };

  const handleThemeToggle = async () => {
    toggleDarkMode();
    try {
      await supabase
        .from('profiles')
        .update({ theme_mode: isDarkMode ? 'dark' : 'light' })
        .eq('id', user.id);
    } catch (e) {
      logger.error('Error saving theme preference:', e);
    }
  };

  const handleExportData = async () => {
    setExportLoading(true);
    try {
      const payload = {
        exported_at: new Date().toISOString(),
        profile: { full_name: profile?.full_name, email: user?.email },
        organization: organization ? { name: organization.name, id: organization.id } : null,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `settings-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      logger.error('Export error:', e);
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setDeleteLoading(true);
    try {
      // Account deletion requires server-side/admin; submit support ticket and inform user
      setDeleteAccountDialog(false);
      setDeleteConfirmText('');
      setPasswordMsg('To delete your account, please submit a request via the Help & Support tab or contact support directly.');
      setPasswordSnackbar(true);
      setActiveTab(tabsConfig.findIndex(t => t.id === 'support'));
      setSearchParams({ tab: 'support' });
    } catch (e) {
      logger.error('Delete account error:', e);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ preferences: { timezone: preferences.timezone, locale: preferences.locale } })
        .eq('id', user.id);
      if (!error) {
        setPreferencesChanged(false);
        if (reloadUserData) await reloadUserData();
      }
    } catch (e) {
      logger.error('Error saving preferences:', e);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        py: { xs: 2, sm: 4 },
        px: { xs: 1, sm: 2 },
      }}
    >
      <Box sx={{ width: '100%' }}>
        <Box sx={{ mb: { xs: 2, sm: 4 }, px: { xs: 2, sm: 0 } }}>
          <Typography variant="h4" fontWeight={700} color="primary" sx={{ mb: 0.5 }}>
            Settings
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your account, organization, and preferences
          </Typography>
        </Box>

        <Card
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              px: { xs: 1, sm: 2 },
              minHeight: 56,
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                minHeight: 56,
                py: 2,
                px: { xs: 1.5, sm: 2 },
                fontSize: { xs: '0.875rem', sm: '1rem' },
                transition: 'none !important',
                '&.Mui-selected': {
                  color: 'primary.main',
                },
              },
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px 3px 0 0',
              },
              '& .MuiTouchRipple-root': { display: 'none' },
            }}
          >
            {tabsConfig.map((tab, index) => (
              <Tab
                key={tab.id}
                label={tab.label}
                icon={tab.icon}
                iconPosition="start"
                disableRipple
                sx={{ gap: 1 }}
              />
            ))}
          </Tabs>
          
          {/* Profile Tab */}
          <TabPanel value={activeTab} index={0}>
            <Typography variant="h5" fontWeight={600} gutterBottom sx={{ mb: 3 }}>
              Profile Settings
            </Typography>

            <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} color="text.secondary" sx={{ mb: 2 }}>
                Profile Information
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Full Name"
                    value={profileData.full_name}
                    onChange={(e) => {
                      setProfileData({ ...profileData, full_name: e.target.value });
                    }}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    value={profileData.email}
                    disabled
                    variant="outlined"
                    helperText="Contact support to change your email"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Timezone</InputLabel>
                    <Select
                      value={preferences.timezone}
                      label="Timezone"
                      onChange={(e) => {
                        setPreferences(prev => ({ ...prev, timezone: e.target.value }));
                        setPreferencesChanged(true);
                      }}
                    >
                      <MenuItem value="UTC">UTC</MenuItem>
                      <MenuItem value="America/New_York">Eastern (America/New_York)</MenuItem>
                      <MenuItem value="America/Chicago">Central (America/Chicago)</MenuItem>
                      <MenuItem value="America/Denver">Mountain (America/Denver)</MenuItem>
                      <MenuItem value="America/Los_Angeles">Pacific (America/Los_Angeles)</MenuItem>
                      <MenuItem value="Europe/London">Europe/London</MenuItem>
                      <MenuItem value="Europe/Paris">Europe/Paris</MenuItem>
                      <MenuItem value="Asia/Tokyo">Asia/Tokyo</MenuItem>
                      <MenuItem value="Australia/Sydney">Australia/Sydney</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Language</InputLabel>
                    <Select
                      value={localeSelectValue}
                      label="Language"
                      onChange={(e) => {
                        setPreferences(prev => ({ ...prev, locale: e.target.value }));
                        setPreferencesChanged(true);
                      }}
                    >
                      <MenuItem value="en">English</MenuItem>
                      <MenuItem value="es">Spanish</MenuItem>
                      <MenuItem value="fr">French</MenuItem>
                      <MenuItem value="de">German</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
              {(profileChanged || preferencesChanged) && (
                <Box sx={{ mt: 3 }}>
                  <Stack direction="row" spacing={2}>
                    <Button
                      variant="contained"
                      onClick={handleProfileSave}
                      disabled={profileLoading}
                      startIcon={profileLoading ? <CircularProgress size={20} /> : <SaveIcon />}
                    >
                      Save profile
                    </Button>
                    {preferencesChanged && (
                      <Button
                        variant="outlined"
                        onClick={handleSavePreferences}
                        startIcon={<SaveIcon />}
                      >
                        Save preferences
                      </Button>
                    )}
                  </Stack>
                </Box>
              )}
            </Paper>
          </TabPanel>

          {/* Security Tab */}
          <TabPanel value={activeTab} index={1}>
            <Typography variant="h5" fontWeight={600} gutterBottom sx={{ mb: 3 }}>
              Security
            </Typography>
            <Stack spacing={3}>
              <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, bgcolor: 'warning.light', borderColor: 'warning.main' }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ color: 'warning.dark' }}>
                  🔒 Change Password
                </Typography>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Security Requirement:</strong> For your security, you must enter your current password before setting a new one.
                  </Typography>
                </Alert>
                
                <Box component="form" onSubmit={handlePasswordSave}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        type="password"
                        label="Current Password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        fullWidth
                        required
                        helperText="Enter your current password to verify your identity"
                        sx={{ mb: 2 }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        type="password"
                        label="New Password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        fullWidth
                        required
                        helperText="Minimum 6 characters"
                        sx={{ mb: 2 }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        type="password"
                        label="Confirm New Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        fullWidth
                        required
                        helperText="Re-enter your new password"
                        sx={{ mb: 2 }}
                      />
                    </Grid>
                  </Grid>
                  
                  {/* Password Strength Indicators */}
                  {newPassword && (
                    <Card variant="outlined" sx={{ mt: 2, mb: 2, bgcolor: 'grey.50' }}>
                      <CardContent sx={{ py: 2 }}>
                        <Typography variant="body2" gutterBottom>
                          <strong>Password Requirements:</strong>
                        </Typography>
                        <Stack spacing={1}>
                          <Box display="flex" alignItems="center" gap={1}>
                            {newPassword.length >= 6 ? '✅' : '❌'}
                            <Typography variant="body2" fontSize="0.875rem">
                              At least 6 characters ({newPassword.length}/6)
                            </Typography>
                          </Box>
                          <Box display="flex" alignItems="center" gap={1}>
                            {newPassword !== currentPassword ? '✅' : '❌'}
                            <Typography variant="body2" fontSize="0.875rem">
                              Different from current password
                            </Typography>
                          </Box>
                          <Box display="flex" alignItems="center" gap={1}>
                            {newPassword === confirmPassword && newPassword ? '✅' : '❌'}
                            <Typography variant="body2" fontSize="0.875rem">
                              Passwords match
                            </Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  )}
                  
                  <Button 
                    type="submit" 
                    variant="contained" 
                    color="primary"
                    disabled={passwordChangeLoading || !currentPassword || !newPassword || !confirmPassword}
                    startIcon={passwordChangeLoading ? <CircularProgress size={20} /> : null}
                    fullWidth
                    sx={{ mb: 2 }}
                  >
                    {passwordChangeLoading ? 'Updating Password...' : 'Update Password'}
                  </Button>
                  
                  {passwordMsg && (
                    <Alert 
                      severity={passwordMsg.includes('successfully') ? 'success' : 'error'} 
                      sx={{ mt: 2 }}
                    >
                      {passwordMsg}
                    </Alert>
                  )}
                </Box>
              </Paper>
              
              <Divider />
              
              <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  🛡️ Security Preferences
                </Typography>
                {/* Current Security Status */}
                <Card variant="outlined" sx={{ mb: 3, bgcolor: 'action.hover' }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom color="primary">
                      Current Security Status
                    </Typography>
                    <Stack spacing={1}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Chip 
                          label={securitySettings.passwordRequirements ? "Strong Password Required" : "Basic Password"} 
                          color={securitySettings.passwordRequirements ? "success" : "warning"} 
                          size="small" 
                        />
                        <Typography variant="body2">
                          Password requirements: {securitySettings.passwordRequirements ? "Enabled" : "Disabled"}
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Chip 
                          label={securitySettings.loginHistory ? "Login Tracking On" : "Login Tracking Off"} 
                          color={securitySettings.loginHistory ? "success" : "default"} 
                          size="small" 
                        />
                        <Typography variant="body2">
                          Activity tracking: {securitySettings.loginHistory ? "Enabled" : "Disabled"}
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Chip 
                          label={securitySettings.twoFactorEnabled ? "2FA Enabled" : "2FA Disabled"} 
                          color={securitySettings.twoFactorEnabled ? "success" : "error"} 
                          size="small" 
                        />
                        <Typography variant="body2">
                          Two-factor authentication: {securitySettings.twoFactorEnabled ? "Enabled" : "Disabled"}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>

                <Stack spacing={2}>
                  <Typography variant="subtitle1" fontWeight={600}>Security Controls</Typography>
                  
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={securitySettings.loginHistory} 
                        onChange={(e) => handleSecurityChange('loginHistory', e.target.checked)} 
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography>Track Login History</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Keep records of login attempts and locations for security monitoring
                        </Typography>
                      </Box>
                    }
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={securitySettings.twoFactorEnabled} 
                        onChange={(e) => handleSecurityChange('twoFactorEnabled', e.target.checked)} 
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography>Two-Factor Authentication</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Requires a second verification step for enhanced security (coming soon)
                        </Typography>
                      </Box>
                    }
                  />

                  <FormControlLabel
                    control={
                      <Switch 
                        checked={securitySettings.accountLockout} 
                        onChange={(e) => handleSecurityChange('accountLockout', e.target.checked)} 
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography>Account Lockout Protection</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Lock account after {securitySettings.failedAttempts} failed login attempts
                        </Typography>
                      </Box>
                    }
                  />

                  <Box sx={{ mt: 2 }}>
                    <Typography gutterBottom>Session Timeout (minutes)</Typography>
                    <Slider
                      value={securitySettings.sessionTimeout}
                      onChange={(e, value) => handleSecurityChange('sessionTimeout', value)}
                      min={15}
                      max={120}
                      step={15}
                      marks
                      valueLabelDisplay="auto"
                      color="primary"
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      Current session will timeout after {securitySettings.sessionTimeout} minutes of inactivity
                    </Typography>
                  </Box>

                  <Box sx={{ mt: 3 }}>
                    <Stack direction="row" spacing={2}>
                      {securityChanged && (
                        <Button 
                          variant="contained" 
                          onClick={handleSecuritySave}
                          startIcon={<SaveIcon />}
                          sx={{ minWidth: 180 }}
                        >
                          Save Security Settings
                        </Button>
                      )}
                      <Button 
                        variant="outlined" 
                        onClick={() => {
                          const defaultSettings = {
                            sessionTimeout: 30,
                            twoFactorEnabled: false,
                            loginHistory: true,
                            passwordRequirements: true,
                            accountLockout: true,
                            failedAttempts: 5,
                          };
                          setSecuritySettings(defaultSettings);
                          setSecurityChanged(true);
                        }}
                        sx={{ minWidth: 180 }}
                      >
                        Reset to Defaults
                      </Button>
                    </Stack>
                    
                    {securityChanged && (
                      <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          You have unsaved security changes. Click "Save Security Settings" to apply them.
                        </Typography>
                      </Alert>
                    )}
                  </Box>
                </Stack>
              </Paper>

              <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WarningAmberIcon color="warning" /> Data & Privacy
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Export your account data or request account deletion.
                </Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap">
                  <Button
                    variant="outlined"
                    startIcon={exportLoading ? <CircularProgress size={20} /> : <DownloadIcon />}
                    onClick={handleExportData}
                    disabled={exportLoading}
                  >
                    Export my data
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => setDeleteAccountDialog(true)}
                  >
                    Request account deletion
                  </Button>
                </Stack>
              </Paper>
            </Stack>
          </TabPanel>

          {/* Appearance Tab */}
          <TabPanel value={activeTab} index={2}>
            <Typography variant="h5" fontWeight={600} gutterBottom sx={{ mb: 3 }}>
              Appearance
            </Typography>
            <Stack spacing={3}>
              <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>Theme</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Choose light or dark mode for the application.
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
                  onClick={handleThemeToggle}
                >
                  Switch to {isDarkMode ? 'Light' : 'Dark'} mode
                </Button>
              </Paper>

              {isOrgAdmin && (
                <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Organization Logo</Typography>
                  {logoUrl && (
                    <Box sx={{ mb: 2 }}>
                      <img 
                        src={logoUrl} 
                        alt="Organization Logo" 
                        style={{ 
                          maxHeight: 64, 
                          maxWidth: 128, 
                          borderRadius: 8, 
                          border: '1px solid #eee' 
                        }} 
                      />
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
                  {logoMsg && (
                    <Alert severity={logoMsg.includes('Error') ? 'error' : 'success'} sx={{ mt: 1 }}>
                      {logoMsg}
                    </Alert>
                  )}
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Recommended: PNG, JPG, or SVG. Max 1MB.
                  </Typography>
                </Paper>
              )}
            </Stack>
          </TabPanel>


          {/* Billing Tab */}
            <TabPanel value={activeTab} index={3}>
            <Typography variant="h5" fontWeight={600} gutterBottom sx={{ mb: 3 }}>
              Billing
            </Typography>
            {profile?.role === 'owner' ? (
              <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, textAlign: 'center', borderRadius: 2 }}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Platform Owner Account
                  </Typography>
                  <Typography variant="body2">
                    As a platform owner, billing is managed through the Owner Portal. 
                    Individual organization billing is not applicable to your account.
                  </Typography>
                </Alert>
                <Button 
                  variant="contained" 
                  onClick={() => navigate('/owner-portal')}
                  startIcon={<BusinessIcon />}
                >
                  Go to Owner Portal
                </Button>
              </Paper>
            ) : (
              <>
                <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Subscription & Billing
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Manage your subscription, billing information, and payment methods.
                  </Typography>
                  <Button
                    variant="outlined"
                    sx={{ mt: 2 }}
                    onClick={() => navigate('/billing')}
                  >
                    View Billing Details
                  </Button>
                </Paper>
              </>
            )}
          </TabPanel>

          {/* Invoice Template Tab (Admin/Owner only) */}
          {(profile?.role === 'admin' || profile?.role === 'owner') && (
            <TabPanel value={activeTab} index={5}>
              <Box sx={{ width: '100%' }}>
                <Typography variant="h4" gutterBottom>
                  📄 Invoice Template
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Customize your invoice appearance, layout, and default settings.
                </Typography>

                <Paper sx={{ p: 4, mb: 3, textAlign: 'center' }}>
                  <ReceiptIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h5" gutterBottom>
                    Customize Your Invoice Template
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    Design beautiful invoices with custom colors, fonts, and layouts.<br />
                    Choose which fields to show, customize sections, and set payment terms.
                  </Typography>

                  {invoiceTemplate && (
                    <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1, display: 'inline-block' }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Current Template: <strong>{invoiceTemplate.name || 'Modern'}</strong>
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 24, height: 24, bgcolor: invoiceTemplate.primary_color, borderRadius: 1, border: '1px solid #ccc' }} />
                          <Typography variant="caption">Primary</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 24, height: 24, bgcolor: invoiceTemplate.secondary_color, borderRadius: 1, border: '1px solid #ccc' }} />
                          <Typography variant="caption">Secondary</Typography>
                        </Box>
                        <Typography variant="caption" sx={{ ml: 2 }}>
                          Font: {invoiceTemplate.font_family || 'Arial'}
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<SettingsIcon />}
                    onClick={() => setInvoiceTemplateManagerOpen(true)}
                    sx={{ minWidth: 200 }}
                  >
                    Customize Template
                  </Button>
                </Paper>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Card>
                      <CardContent>
                        <PaletteIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                        <Typography variant="h6" gutterBottom>
                          Design
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Choose from preset templates or customize colors and fonts
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Card>
                      <CardContent>
                        <ViewModuleIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                        <Typography variant="h6" gutterBottom>
                          Layout
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Show/hide sections and columns to match your needs
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Card>
                      <CardContent>
                        <TextFieldsIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                        <Typography variant="h6" gutterBottom>
                          Content
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Set payment terms, tax rates, and custom messages
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                <Alert severity="info" sx={{ mt: 3 }}>
                  <Typography variant="body2">
                    <strong>💡 Pro Tip:</strong> You can also customize templates directly from the invoice generation dialog in the Rentals page by clicking the ⚙️ icon.
                  </Typography>
                </Alert>

                {/* Invoice Email Management */}
                <Paper sx={{ p: 3, mt: 3 }}>
                  <Typography variant="h5" gutterBottom>
                    📧 Invoice Email Addresses
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Manage email addresses that can be used to send invoices. Select a default email that will be pre-selected when sending invoices.
                  </Typography>
                  
                  {invoiceEmailMsg && invoiceEmailMsg.includes('migration') && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        <strong>Database Migration Required:</strong> To use invoice email management, please run the migration file:
                        <br />
                        <code>supabase/migrations/20250123_add_invoice_emails_to_organizations.sql</code>
                        <br />
                        <br />
                        After running the migration, refresh this page.
                      </Typography>
                    </Alert>
                  )}

                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Add New Email Address
                    </Typography>
                    <Box display="flex" gap={2} alignItems="flex-start">
                      <TextField
                        fullWidth
                        label="Email Address"
                        type="email"
                        value={newInvoiceEmail}
                        onChange={(e) => setNewInvoiceEmail(e.target.value)}
                        placeholder="billing@yourcompany.com"
                        helperText="Enter a valid email address that can send invoices"
                      />
                      <Button
                        variant="contained"
                        onClick={async () => {
                          if (!newInvoiceEmail || !newInvoiceEmail.includes('@')) {
                            setInvoiceEmailMsg('Please enter a valid email address');
                            return;
                          }
                          
                          if (invoiceEmails.includes(newInvoiceEmail)) {
                            setInvoiceEmailMsg('This email address is already added');
                            return;
                          }

                          setInvoiceEmailLoading(true);
                          setInvoiceEmailMsg('');
                          
                          try {
                            const updatedEmails = [...invoiceEmails, newInvoiceEmail];
                            
                            // Build update object conditionally
                            const updateData = { invoice_emails: updatedEmails };
                            
                            // Only include default_invoice_email if we're setting it
                            if (defaultInvoiceEmail || newInvoiceEmail) {
                              updateData.default_invoice_email = defaultInvoiceEmail || newInvoiceEmail;
                            }
                            
                            const { error } = await supabase
                              .from('organizations')
                              .update(updateData)
                              .eq('id', organization.id);

                            if (error) {
                              // If error is about missing column, try updating only invoice_emails
                              if (error.message?.includes('default_invoice_email') || error.message?.includes('schema cache')) {
                                logger.warn('default_invoice_email column may not exist, trying invoice_emails only');
                                const { error: emailOnlyError } = await supabase
                                  .from('organizations')
                                  .update({ invoice_emails: updatedEmails })
                                  .eq('id', organization.id);
                                
                                if (emailOnlyError) throw emailOnlyError;
                                
                                // Set default locally even if column doesn't exist yet
                                if (!defaultInvoiceEmail) {
                                  setDefaultInvoiceEmail(newInvoiceEmail);
                                }
                              } else {
                                throw error;
                              }
                            }

                            setInvoiceEmails(updatedEmails);
                            if (!defaultInvoiceEmail) {
                              setDefaultInvoiceEmail(newInvoiceEmail);
                            }
                            setNewInvoiceEmail('');
                            setInvoiceEmailMsg('Email address added successfully!');
                            
                            if (reloadOrganization) {
                              await reloadOrganization();
                            }
                          } catch (error) {
                            logger.error('Error adding invoice email:', error);
                            
                            // Check if it's a schema cache error
                            if (error.message?.includes('schema cache') || error.message?.includes('invoice_emails')) {
                              setInvoiceEmailMsg('Schema cache error. Please: 1) Run VERIFY_AND_FIX_INVOICE_EMAILS.sql in Supabase, 2) Wait 30 seconds, 3) Refresh this page and try again.');
                            } else {
                              setInvoiceEmailMsg('Failed to add email: ' + error.message);
                            }
                          } finally {
                            setInvoiceEmailLoading(false);
                          }
                        }}
                        disabled={invoiceEmailLoading || !newInvoiceEmail}
                      >
                        Add
                      </Button>
                    </Box>
                  </Box>

                  {invoiceEmailMsg && (
                    <Alert 
                      severity={invoiceEmailMsg.includes('successfully') ? 'success' : 'error'} 
                      sx={{ mb: 2 }}
                      onClose={() => setInvoiceEmailMsg('')}
                    >
                      {invoiceEmailMsg}
                    </Alert>
                  )}

                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Current Email Addresses
                    </Typography>
                    {invoiceEmails.length === 0 ? (
                      <Alert severity="info">
                        No invoice email addresses configured. Add an email address above.
                      </Alert>
                    ) : (
                      <List>
                        {invoiceEmails.map((email, index) => (
                          <ListItem
                            key={email}
                            sx={{
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 1,
                              mb: 1,
                              bgcolor: defaultInvoiceEmail === email ? 'action.selected' : 'background.paper'
                            }}
                          >
                            <ListItemText
                              primary={email}
                              secondary={defaultInvoiceEmail === email ? 'Default (pre-selected when sending invoices)' : 'Click to set as default'}
                            />
                            <Box display="flex" gap={1}>
                              {defaultInvoiceEmail !== email && (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={async () => {
                                    setInvoiceEmailLoading(true);
                                    try {
                                      const { error } = await supabase
                                        .from('organizations')
                                        .update({ default_invoice_email: email })
                                        .eq('id', organization.id);

                                      if (error) {
                                        // If column doesn't exist, just update locally
                                        if (error.message?.includes('default_invoice_email') || error.message?.includes('schema cache')) {
                                          logger.warn('default_invoice_email column may not exist, updating locally only');
                                          setDefaultInvoiceEmail(email);
                                          setInvoiceEmailMsg('Default email updated (migration may need to be run for persistence)');
                                        } else {
                                          throw error;
                                        }
                                      }

                                      setDefaultInvoiceEmail(email);
                                      setInvoiceEmailMsg('Default email updated successfully!');
                                      
                                      if (reloadOrganization) {
                                        await reloadOrganization();
                                      }
                                    } catch (error) {
                                      logger.error('Error setting default email:', error);
                                      setInvoiceEmailMsg('Failed to set default email: ' + error.message);
                                    } finally {
                                      setInvoiceEmailLoading(false);
                                    }
                                  }}
                                  disabled={invoiceEmailLoading}
                                >
                                  Set as Default
                                </Button>
                              )}
                              {defaultInvoiceEmail === email && (
                                <Chip label="Default" color="primary" size="small" />
                              )}
                              <IconButton
                                size="small"
                                color="error"
                                onClick={async () => {
                                  if (invoiceEmails.length === 1) {
                                    setInvoiceEmailMsg('Cannot remove the last email address');
                                    return;
                                  }
                                  
                                  if (defaultInvoiceEmail === email) {
                                    setInvoiceEmailMsg('Cannot remove the default email. Set another email as default first.');
                                    return;
                                  }

                                  setInvoiceEmailLoading(true);
                                  try {
                                    const updatedEmails = invoiceEmails.filter(e => e !== email);
                                    const { error } = await supabase
                                      .from('organizations')
                                      .update({ invoice_emails: updatedEmails })
                                      .eq('id', organization.id);

                                    if (error) {
                                      // If column doesn't exist, show helpful message
                                      if (error.message?.includes('invoice_emails') || error.message?.includes('schema cache')) {
                                        throw new Error('Invoice email columns do not exist. Please run the migration: 20250123_add_invoice_emails_to_organizations.sql');
                                      }
                                      throw error;
                                    }

                                    setInvoiceEmails(updatedEmails);
                                    setInvoiceEmailMsg('Email address removed successfully!');
                                    
                                    if (reloadOrganization) {
                                      await reloadOrganization();
                                    }
                                  } catch (error) {
                                    logger.error('Error removing invoice email:', error);
                                    setInvoiceEmailMsg('Failed to remove email: ' + error.message);
                                  } finally {
                                    setInvoiceEmailLoading(false);
                                  }
                                }}
                                disabled={invoiceEmailLoading}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Box>
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </Box>
                </Paper>
              </Box>
            </TabPanel>
          )}

          {/* Team Tab (Admin/Owner only) */}
          {(profile?.role === 'admin' || profile?.role === 'owner') && (
            <TabPanel value={activeTab} index={6}>
              <UserManagement />
            </TabPanel>
          )}


          {/* Assets Tab (Admin/Owner only) */}
          {(profile?.role === 'admin' || profile?.role === 'owner') && (
            <TabPanel value={activeTab} index={7}>
              <Box sx={{ width: '100%' }}>
                <Typography variant="h4" gutterBottom>
                  Asset Configuration
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Configure what type of assets your organization tracks and customize the app branding.
                </Typography>
                
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    <strong>New!</strong> Use our comprehensive Asset Configuration Manager for advanced setup 
                    including custom terminology, feature toggles, and barcode formats.
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    sx={{ mt: 2 }}
                    onClick={() => navigate('/asset-configuration')}
                    startIcon={<SettingsIcon />}
                  >
                    Open Advanced Configuration
                  </Button>
                </Alert>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Asset Type
                        </Typography>
                        <FormControl fullWidth sx={{ mb: 2 }}>
                          <InputLabel>Asset Type</InputLabel>
                          <Select
                            value={assetConfig.assetType || 'cylinder'}
                            label="Asset Type"
                            onChange={(e) => setAssetConfig(prev => ({ ...prev, assetType: e.target.value }))}
                          >
                            <MenuItem value="cylinder">Gas Cylinders</MenuItem>
                            <MenuItem value="bottle">Water Bottles</MenuItem>
                            <MenuItem value="extinguisher">Fire Extinguishers</MenuItem>
                            <MenuItem value="equipment">Equipment</MenuItem>
                            <MenuItem value="medical">Medical Devices</MenuItem>
                            <MenuItem value="tool">Tools</MenuItem>
                          </Select>
                        </FormControl>
                        
                        <TextField
                          fullWidth
                          label="Display Name (Singular)"
                          value={assetConfig.assetDisplayName || ''}
                          onChange={(e) => setAssetConfig(prev => ({ ...prev, assetDisplayName: e.target.value }))}
                          sx={{ mb: 2 }}
                          placeholder="e.g., Gas Cylinder"
                        />
                        
                        <TextField
                          fullWidth
                          label="Display Name (Plural)"
                          value={assetConfig.assetDisplayNamePlural || ''}
                          onChange={(e) => setAssetConfig(prev => ({ ...prev, assetDisplayNamePlural: e.target.value }))}
                          placeholder="e.g., Gas Cylinders"
                        />
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          App Branding
                        </Typography>
                        
                        <TextField
                          fullWidth
                          label="App Name"
                          value={assetConfig.appName || ''}
                          onChange={(e) => setAssetConfig(prev => ({ ...prev, appName: e.target.value }))}
                          sx={{ mb: 2 }}
                          placeholder="e.g., Scanified"
                        />
                        
                        <TextField
                          fullWidth
                          label="Primary Color"
                          type="color"
                          value={assetConfig.primaryColor || '#2563eb'}
                          onChange={(e) => setAssetConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                          sx={{ mb: 2 }}
                        />
                        
                        <TextField
                          fullWidth
                          label="Secondary Color"
                          type="color"
                          value={assetConfig.secondaryColor || '#1e40af'}
                          onChange={(e) => setAssetConfig(prev => ({ ...prev, secondaryColor: e.target.value }))}
                          sx={{ mb: 2 }}
                        />

                        <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>App icon</Typography>
                        {assetConfig.appIconUrl && (
                          <Box sx={{ mb: 2 }}>
                            <img
                              src={assetConfig.appIconUrl}
                              alt="App icon"
                              style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', border: '1px solid #ddd' }}
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          </Box>
                        )}
                        <Button
                          variant="outlined"
                          component="label"
                          disabled={appIconUploading}
                          sx={{ mb: 1 }}
                        >
                          {appIconUploading ? 'Uploading...' : (assetConfig.appIconUrl ? 'Change app icon' : 'Upload app icon')}
                          <input type="file" accept="image/*" hidden onChange={handleAppIconUpload} />
                        </Button>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={assetConfig.showAppIcon !== false}
                              onChange={(e) => setAssetConfig(prev => ({ ...prev, showAppIcon: e.target.checked }))}
                            />
                          }
                          label="Show app icon in header"
                          sx={{ mb: 1, display: 'block' }}
                        />
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12}>
                    {assetConfigChanged && (
                      <Button
                        variant="contained"
                        onClick={handleSaveAssetConfig}
                        disabled={assetConfigLoading}
                        startIcon={assetConfigLoading ? <CircularProgress size={20} /> : <SaveIcon />}
                      >
                        Save Asset Configuration
                      </Button>
                    )}
                    {assetConfigMsg && (
                      <Alert severity={assetConfigMsg.includes('Error') ? 'error' : 'success'} sx={{ mt: 2 }}>
                        {assetConfigMsg}
                      </Alert>
                    )}
                  </Grid>
                </Grid>
              </Box>
            </TabPanel>
          )}

          {/* Barcodes Tab (Admin/Owner only) */}
          {(profile?.role === 'admin' || profile?.role === 'owner') && (
            <TabPanel value={activeTab} index={8}>
              <Box sx={{ width: '100%' }}>
                <Typography variant="h4" gutterBottom sx={{ color: 'primary', fontWeight: 600 }}>
                  📋 Barcode & Number Format Configuration
                </Typography>
                
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    <strong>Primary Configuration:</strong> This is the main location for all barcode and number format settings. 
                    These settings are also accessible from the Asset Configuration page for convenience.
                  </Typography>
                </Alert>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Configure barcode formats, order number patterns, and serial number validation rules for your organization.
                  All format configurations are enforced across the application to ensure consistency.
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Barcode Format
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <FormControl fullWidth sx={{ mb: 2 }}>
                              <InputLabel>Barcode Type</InputLabel>
                              <Select
                                value={barcodeConfig.barcodeType || 'custom'}
                                onChange={(e) => handleBarcodeTypeChange(e.target.value)}
                                label="Barcode Type"
                              >
                                {Object.entries(barcodeTypes).map(([key, type]) => (
                                  <MenuItem key={key} value={key}>
                                    <Box>
                                      <Typography variant="body1">{type.name}</Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {type.description} - Example: {type.example}
                                      </Typography>
                                    </Box>
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                          {barcodeConfig.barcodeType === 'custom' && (
                            <>
                              <Grid item xs={12} md={6}>
                                <TextField
                                  fullWidth
                                  label="Barcode Pattern (Regex)"
                                  value={barcodeConfig.barcodePattern}
                                  onChange={(e) => setBarcodeConfig(prev => ({ ...prev, barcodePattern: e.target.value }))}
                                  sx={{ mb: 2 }}
                                  placeholder="^[A-Z0-9]{6,12}$"
                                />
                              </Grid>
                              <Grid item xs={12} md={6}>
                                <TextField
                                  fullWidth
                                  label="Barcode Description"
                                  value={barcodeConfig.barcodeDescription}
                                  onChange={(e) => setBarcodeConfig(prev => ({ ...prev, barcodeDescription: e.target.value }))}
                                  sx={{ mb: 2 }}
                                  placeholder="6-12 alphanumeric characters"
                                />
                              </Grid>
                            </>
                          )}
                          {barcodeConfig.barcodeType !== 'custom' && (
                            <Grid item xs={12}>
                              <Alert severity="info" sx={{ mb: 2 }}>
                                <Typography variant="body2">
                                  <strong>Selected:</strong> {barcodeTypes[barcodeConfig.barcodeType]?.name}<br/>
                                  <strong>Format:</strong> {barcodeTypes[barcodeConfig.barcodeType]?.description}<br/>
                                  <strong>Example:</strong> {barcodeTypes[barcodeConfig.barcodeType]?.example}
                                </Typography>
                              </Alert>
                            </Grid>
                          )}
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Order Number Format
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <FormControl fullWidth sx={{ mb: 2 }}>
                              <InputLabel>Order Number Type</InputLabel>
                              <Select
                                value={barcodeConfig.orderNumberType || 'custom'}
                                onChange={(e) => handleOrderNumberTypeChange(e.target.value)}
                                label="Order Number Type"
                              >
                                {Object.entries(orderNumberTypes).map(([key, type]) => (
                                  <MenuItem key={key} value={key}>
                                    <Box>
                                      <Typography variant="body1">{type.name}</Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {type.description} - Example: {type.example}
                                      </Typography>
                                    </Box>
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                          {barcodeConfig.orderNumberType === 'custom' && (
                            <>
                              <Grid item xs={12} md={4}>
                                <TextField
                                  fullWidth
                                  label="Order Number Prefix"
                                  value={barcodeConfig.orderNumberPrefix}
                                  onChange={(e) => setBarcodeConfig(prev => ({ ...prev, orderNumberPrefix: e.target.value }))}
                                  sx={{ mb: 2 }}
                                  placeholder="ORD"
                                />
                              </Grid>
                              <Grid item xs={12} md={4}>
                                <TextField
                                  fullWidth
                                  label="Order Number Pattern (Regex)"
                                  value={barcodeConfig.orderNumberPattern}
                                  onChange={(e) => setBarcodeConfig(prev => ({ ...prev, orderNumberPattern: e.target.value }))}
                                  sx={{ mb: 2 }}
                                  placeholder="^ORD[0-9]{6}$"
                                />
                              </Grid>
                              <Grid item xs={12} md={4}>
                                <TextField
                                  fullWidth
                                  label="Order Number Description"
                                  value={barcodeConfig.orderNumberDescription}
                                  onChange={(e) => setBarcodeConfig(prev => ({ ...prev, orderNumberDescription: e.target.value }))}
                                  sx={{ mb: 2 }}
                                  placeholder="ORD followed by 6 digits"
                                />
                              </Grid>
                            </>
                          )}
                          {barcodeConfig.orderNumberType !== 'custom' && (
                            <Grid item xs={12}>
                              <Alert severity="info" sx={{ mb: 2 }}>
                                <Typography variant="body2">
                                  <strong>Selected:</strong> {orderNumberTypes[barcodeConfig.orderNumberType]?.name}<br/>
                                  <strong>Format:</strong> {orderNumberTypes[barcodeConfig.orderNumberType]?.description}<br/>
                                  <strong>Example:</strong> {orderNumberTypes[barcodeConfig.orderNumberType]?.example}
                                </Typography>
                              </Alert>
                            </Grid>
                          )}
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Serial Number Format
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <FormControl fullWidth sx={{ mb: 2 }}>
                              <InputLabel>Serial Number Type</InputLabel>
                              <Select
                                value={barcodeConfig.serialNumberType || 'custom'}
                                onChange={(e) => handleSerialNumberTypeChange(e.target.value)}
                                label="Serial Number Type"
                              >
                                {Object.entries(serialNumberTypes).map(([key, type]) => (
                                  <MenuItem key={key} value={key}>
                                    <Box>
                                      <Typography variant="body1">{type.name}</Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {type.description} - Example: {type.example}
                                      </Typography>
                                    </Box>
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                          {barcodeConfig.serialNumberType === 'custom' && (
                            <>
                              <Grid item xs={12} md={6}>
                                <TextField
                                  fullWidth
                                  label="Serial Number Pattern (Regex)"
                                  value={barcodeConfig.serialNumberPattern}
                                  onChange={(e) => setBarcodeConfig(prev => ({ ...prev, serialNumberPattern: e.target.value }))}
                                  sx={{ mb: 2 }}
                                  placeholder="^[A-Z]{2}[0-9]{8}$"
                                />
                              </Grid>
                              <Grid item xs={12} md={6}>
                                <TextField
                                  fullWidth
                                  label="Serial Number Description"
                                  value={barcodeConfig.serialNumberDescription}
                                  onChange={(e) => setBarcodeConfig(prev => ({ ...prev, serialNumberDescription: e.target.value }))}
                                  sx={{ mb: 2 }}
                                  placeholder="2 letters followed by 8 digits"
                                />
                              </Grid>
                            </>
                          )}
                          {barcodeConfig.serialNumberType !== 'custom' && (
                            <Grid item xs={12}>
                              <Alert severity="info" sx={{ mb: 2 }}>
                                <Typography variant="body2">
                                  <strong>Selected:</strong> {serialNumberTypes[barcodeConfig.serialNumberType]?.name}<br/>
                                  <strong>Format:</strong> {serialNumberTypes[barcodeConfig.serialNumberType]?.description}<br/>
                                  <strong>Example:</strong> {serialNumberTypes[barcodeConfig.serialNumberType]?.example}
                                </Typography>
                              </Alert>
                            </Grid>
                          )}
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12}>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        <strong>How it works:</strong> Select predefined barcode types for easy setup, or choose "Custom Pattern" for advanced regex configuration. 
                        The mobile app will validate all scanned codes against these formats and reject invalid scans.
                      </Typography>
                    </Alert>
                    
                    {barcodeConfigChanged && (
                      <Button
                        variant="contained"
                        onClick={handleSaveBarcodeConfig}
                        disabled={barcodeConfigLoading}
                        startIcon={barcodeConfigLoading ? <CircularProgress size={20} /> : <SaveIcon />}
                      >
                        Save Barcode Configuration
                      </Button>
                    )}
                    {barcodeConfigMsg && (
                      <Alert severity={barcodeConfigMsg.includes('Error') ? 'error' : 'success'} sx={{ mt: 2 }}>
                        {barcodeConfigMsg}
                      </Alert>
                    )}
                  </Grid>

                  {/* Format Configuration is now handled in the Barcodes tab - removed duplicate section */}
                </Grid>
              </Box>
            </TabPanel>
          )}

          {/* Help & Support Tab */}
          <TabPanel value={activeTab} index={4}>
            <Typography variant="h5" fontWeight={600} gutterBottom sx={{ mb: 3 }}>
              Help & Support
            </Typography>

            <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ArticleIcon /> Documentation & resources
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 2 }}>
                <Button variant="outlined" startIcon={<ArticleIcon />} onClick={() => navigate('/documentation')}>
                  Documentation
                </Button>
                <Button variant="outlined" startIcon={<HelpOutlineIcon />} onClick={() => navigate('/faq')}>
                  FAQ
                </Button>
                <Button variant="outlined" startIcon={<SupportIcon />} onClick={() => navigate('/support')}>
                  Support Center
                </Button>
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                Contact Support
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Need help? Submit a support ticket and our team will get back to you as soon as possible.
              </Typography>
              
              <form onSubmit={handleSupportSubmit}>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Subject"
                      value={supportForm.subject}
                      onChange={(e) => setSupportForm({ ...supportForm, subject: e.target.value })}
                      variant="outlined"
                      required
                      placeholder="Brief description of your issue"
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Category</InputLabel>
                      <Select
                        value={supportForm.category}
                        onChange={(e) => setSupportForm({ ...supportForm, category: e.target.value })}
                        label="Category"
                      >
                        <MenuItem value="general">General Question</MenuItem>
                        <MenuItem value="technical">Technical Issue</MenuItem>
                        <MenuItem value="billing">Billing Question</MenuItem>
                        <MenuItem value="feature_request">Feature Request</MenuItem>
                        <MenuItem value="bug_report">Bug Report</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Message"
                      value={supportForm.message}
                      onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })}
                      variant="outlined"
                      multiline
                      rows={6}
                      required
                      placeholder="Please provide detailed information about your issue..."
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={supportLoading || !supportForm.subject || !supportForm.message}
                      startIcon={supportLoading ? <CircularProgress size={20} /> : <SupportIcon />}
                      sx={{ minWidth: 200 }}
                    >
                      {supportLoading ? 'Submitting...' : 'Submit Support Ticket'}
                    </Button>
                  </Grid>
                </Grid>
              </form>
              
              {supportMsg && (
                <Alert severity={supportMsg.includes('Error') ? 'error' : 'success'} sx={{ mt: 3 }}>
                  {supportMsg}
                </Alert>
              )}
            </Paper>

            <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                My support tickets
              </Typography>
              {supportTicketsLoading ? (
                <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}>
                  <CircularProgress size={32} />
                </Box>
              ) : supportTickets.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No support tickets yet. Submit one above.
                </Typography>
              ) : (
                <List dense>
                  {supportTickets.map((t) => (
                    <ListItem key={t.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 1 }}>
                      <ListItemText
                        primary={t.subject}
                        secondary={`${t.category} • ${t.status} • ${new Date(t.created_at).toLocaleDateString()}`}
                      />
                      <Chip label={t.status} size="small" color={t.status === 'resolved' || t.status === 'closed' ? 'success' : 'default'} />
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
            
            <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                Quick Help
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Common questions and solutions:
              </Typography>
              <List>
                <ListItem>
                  <ListItemText 
                    primary="How do I reset my password?" 
                    secondary="Go to Security tab → Change Password section"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="How do I invite team members?" 
                    secondary="Go to Team tab → Invite Users section"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="How do I customize my organization?" 
                    secondary="Go to Appearance tab → Organization Settings"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Need more help?" 
                    secondary="Submit a support ticket above or contact us directly"
                  />
                </ListItem>
              </List>
            </Paper>
          </TabPanel>

          {/* Snackbars — portaled so they appear above the sidebar */}
          <PortalSnackbar open={profileSnackbar} autoHideDuration={3000} onClose={() => setProfileSnackbar(false)}>
            <Alert onClose={() => setProfileSnackbar(false)} severity={profileMsg.includes('successfully') ? 'success' : 'error'} sx={{ width: '100%' }}>
              {profileMsg}
            </Alert>
          </PortalSnackbar>
          <PortalSnackbar open={passwordSnackbar} autoHideDuration={3000} onClose={() => setPasswordSnackbar(false)}>
            <Alert onClose={() => setPasswordSnackbar(false)} severity={passwordMsg.includes('successfully') ? 'success' : 'error'} sx={{ width: '100%' }}>
              {passwordMsg}
            </Alert>
          </PortalSnackbar>
          <PortalSnackbar open={supportSnackbar} autoHideDuration={3000} onClose={() => setSupportSnackbar(false)}>
            <Alert onClose={() => setSupportSnackbar(false)} severity={supportMsg.includes('Error') ? 'error' : 'success'} sx={{ width: '100%' }}>
              {supportMsg}
            </Alert>
          </PortalSnackbar>
          <PortalSnackbar open={notifSnackbar} autoHideDuration={3000} onClose={() => setNotifSnackbar(false)}>
            <Alert onClose={() => setNotifSnackbar(false)} severity="success" sx={{ width: '100%' }}>
              {notifMsg}
            </Alert>
          </PortalSnackbar>

          {/* Delete account confirmation */}
          <Dialog open={deleteAccountDialog} onClose={() => !deleteLoading && setDeleteAccountDialog(false)}>
            <DialogTitle>Request account deletion</DialogTitle>
            <DialogContent>
              <Alert severity="warning" sx={{ mb: 2 }}>
                This will direct you to submit a support request. Account deletion is processed by our team.
              </Alert>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Type <strong>DELETE</strong> below to continue.
              </Typography>
              <TextField
                fullWidth
                placeholder="DELETE"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                error={deleteConfirmText.length > 0 && deleteConfirmText !== 'DELETE'}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteAccountDialog(false)} disabled={deleteLoading}>Cancel</Button>
              <Button color="error" variant="contained" onClick={handleDeleteAccount} disabled={deleteConfirmText !== 'DELETE' || deleteLoading}>
                {deleteLoading ? 'Processing...' : 'Continue'}
              </Button>
            </DialogActions>
          </Dialog>
          
        </Card>

        {/* Invoice Template Manager Dialog */}
        <InvoiceTemplateManager
          open={invoiceTemplateManagerOpen}
          onClose={() => setInvoiceTemplateManagerOpen(false)}
          currentTemplate={invoiceTemplate}
          onSave={(newTemplate) => {
            setInvoiceTemplate(newTemplate);
            setInvoiceTemplateManagerOpen(false);
          }}
        />
      </Box>
    </Box>
  );
} 