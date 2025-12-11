import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box,
  Typography, TextField, Grid, FormControlLabel, Switch, Tabs, Tab,
  Card, CardContent, Select, MenuItem, FormControl, InputLabel,
  IconButton, Alert, Divider, CircularProgress
} from '@mui/material';
import {
  Close as CloseIcon,
  Palette as PaletteIcon,
  ViewModule as LayoutIcon,
  TextFields as TextIcon,
  CloudUpload as UploadIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';
import logger from '../utils/logger';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index} style={{ padding: '20px 0' }}>
      {value === index && children}
    </div>
  );
}

export default function InvoiceTemplateManager({ open, onClose, onSave, currentTemplate }) {
  const { organization } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [logoUploading, setLogoUploading] = useState(false);
  const [template, setTemplate] = useState({
    name: 'Modern',
    primary_color: '#000000',
    secondary_color: '#666666',
    font_family: 'Arial',
    font_size: 10,
    logo_url: '',
    
    // Field visibility
    show_bill_to: true,
    show_ship_to: true,
    show_rental_period: true,
    show_account_numbers: true,
    show_territory: false,
    show_terms: true,
    show_due_date: true,
    show_purchase_order: false,
    show_rental_summary: true,
    show_serialized_assets: true,
    
    // Table columns
    show_start_count: true,
    show_ship: true,
    show_return: true,
    show_end_count: true,
    show_rent_days: true,
    show_rent_rate: true,
    show_total: true,
    show_barcode: true,
    show_serial_number: true,
    show_asset_type: true,
    show_delivered_date: true,
    show_days_held: true,
    
    // Payment settings
    tax_rate: 0.11,
    payment_terms: 'CREDIT CARD',
    invoice_footer: '',
    
    // Email settings
    email_subject: 'Your Invoice from {company_name}',
    email_body: 'Please find your invoice attached.'
  });

  useEffect(() => {
    if (currentTemplate) {
      setTemplate({ ...template, ...currentTemplate });
    }
  }, [currentTemplate, open]);

  const handleSave = () => {
    // Save to localStorage (organization-specific)
    localStorage.setItem(`invoiceTemplate_${organization.id}`, JSON.stringify(template));
    onSave(template);
    onClose();
  };

  const presetTemplates = {
    modern: {
      name: 'Modern',
      primary_color: '#000000',
      secondary_color: '#666666',
      font_family: 'Arial',
      font_size: 10
    },
    classic: {
      name: 'Classic',
      primary_color: '#1a4d7a',
      secondary_color: '#333333',
      font_family: 'Times New Roman',
      font_size: 11
    },
    bold: {
      name: 'Bold',
      primary_color: '#d32f2f',
      secondary_color: '#000000',
      font_family: 'Helvetica',
      font_size: 10
    },
    minimal: {
      name: 'Minimal',
      primary_color: '#424242',
      secondary_color: '#757575',
      font_family: 'Arial',
      font_size: 9
    }
  };

  const applyPreset = (presetKey) => {
    const preset = presetTemplates[presetKey];
    setTemplate({ ...template, ...preset });
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }
    
    setLogoUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `invoice-logos/org-${organization.id}-${Date.now()}.${fileExt}`;
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('organization-logos')
        .upload(filePath, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data } = supabase.storage.from('organization-logos').getPublicUrl(filePath);
      if (!data?.publicUrl) throw new Error('Failed to get public URL');
      
      const logoUrlWithCacheBust = `${data.publicUrl}?t=${Date.now()}`;
      
      // Update template with logo URL
      setTemplate({ ...template, logo_url: logoUrlWithCacheBust });
      
      logger.log('Logo uploaded successfully:', logoUrlWithCacheBust);
    } catch (err) {
      logger.error('Error uploading logo:', err);
      alert('Failed to upload logo: ' + err.message);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setTemplate({ ...template, logo_url: '' });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">⚙️ Customize Invoice Template</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
            <Tab icon={<PaletteIcon />} label="Design" />
            <Tab icon={<LayoutIcon />} label="Fields" />
            <Tab icon={<TextIcon />} label="Content" />
          </Tabs>
        </Box>

        {/* Design Tab */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            {/* Template Presets */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Template Presets
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Choose a preset or customize below
              </Typography>
              <Grid container spacing={2}>
                {Object.entries(presetTemplates).map(([key, preset]) => (
                  <Grid item xs={12} sm={6} md={3} key={key}>
                    <Card 
                      sx={{ 
                        cursor: 'pointer',
                        border: template.name === preset.name ? '2px solid' : '1px solid',
                        borderColor: template.name === preset.name ? 'primary.main' : 'grey.300'
                      }}
                      onClick={() => applyPreset(key)}
                    >
                      <CardContent>
                        <Box sx={{ height: 60, bgcolor: preset.primary_color, mb: 1, borderRadius: 1 }} />
                        <Typography variant="subtitle2" align="center">
                          {preset.name}
                        </Typography>
                        <Typography variant="caption" align="center" display="block" color="text.secondary">
                          {preset.font_family}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Grid>

            {/* Logo Upload */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Company Logo
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Upload a logo to display on your invoices
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                {template.logo_url && (
                  <Box sx={{ position: 'relative', display: 'inline-block' }}>
                    <img 
                      src={template.logo_url} 
                      alt="Company Logo" 
                      style={{ 
                        maxHeight: 80, 
                        maxWidth: 200, 
                        objectFit: 'contain',
                        border: '1px solid #ddd',
                        borderRadius: 4,
                        padding: 8
                      }}
                      onError={(e) => {
                        logger.error('Failed to load logo:', template.logo_url);
                        e.target.style.display = 'none';
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={handleRemoveLogo}
                      sx={{ 
                        position: 'absolute', 
                        top: -8, 
                        right: -8, 
                        bgcolor: 'error.main',
                        color: 'white',
                        '&:hover': { bgcolor: 'error.dark' }
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )}
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={logoUploading ? <CircularProgress size={20} /> : <UploadIcon />}
                  disabled={logoUploading}
                >
                  {logoUploading ? 'Uploading...' : template.logo_url ? 'Change Logo' : 'Upload Logo'}
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleLogoUpload}
                  />
                </Button>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
            </Grid>

            {/* Colors */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Colors
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Primary Color (Header)"
                type="color"
                value={template.primary_color}
                onChange={(e) => setTemplate({ ...template, primary_color: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Secondary Color (Text)"
                type="color"
                value={template.secondary_color}
                onChange={(e) => setTemplate({ ...template, secondary_color: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Fonts */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold" sx={{ mt: 2 }}>
                Typography
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Font Family</InputLabel>
                <Select
                  value={template.font_family}
                  onChange={(e) => setTemplate({ ...template, font_family: e.target.value })}
                  label="Font Family"
                >
                  <MenuItem value="Arial">Arial</MenuItem>
                  <MenuItem value="Helvetica">Helvetica</MenuItem>
                  <MenuItem value="Times New Roman">Times New Roman</MenuItem>
                  <MenuItem value="Courier New">Courier New</MenuItem>
                  <MenuItem value="Georgia">Georgia</MenuItem>
                  <MenuItem value="Verdana">Verdana</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Font Size (pt)"
                type="number"
                inputProps={{ min: 8, max: 16 }}
                value={template.font_size}
                onChange={(e) => setTemplate({ ...template, font_size: parseInt(e.target.value) })}
              />
            </Grid>
          </Grid>
        </TabPanel>

        {/* Fields Tab */}
        <TabPanel value={activeTab} index={1}>
          <Alert severity="info" sx={{ mb: 3 }}>
            Select which sections and columns to display on your invoices
          </Alert>

          <Typography variant="subtitle1" gutterBottom fontWeight="bold">
            Invoice Sections
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={<Switch checked={template.show_bill_to} onChange={(e) => setTemplate({ ...template, show_bill_to: e.target.checked })} />}
                label="Bill To"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={<Switch checked={template.show_ship_to} onChange={(e) => setTemplate({ ...template, show_ship_to: e.target.checked })} />}
                label="Ship To"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={<Switch checked={template.show_rental_period} onChange={(e) => setTemplate({ ...template, show_rental_period: e.target.checked })} />}
                label="Rental Period"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={<Switch checked={template.show_account_numbers} onChange={(e) => setTemplate({ ...template, show_account_numbers: e.target.checked })} />}
                label="Account Numbers"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={<Switch checked={template.show_territory} onChange={(e) => setTemplate({ ...template, show_territory: e.target.checked })} />}
                label="Territory"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={<Switch checked={template.show_terms} onChange={(e) => setTemplate({ ...template, show_terms: e.target.checked })} />}
                label="Payment Terms"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={<Switch checked={template.show_due_date} onChange={(e) => setTemplate({ ...template, show_due_date: e.target.checked })} />}
                label="Due Date"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={<Switch checked={template.show_purchase_order} onChange={(e) => setTemplate({ ...template, show_purchase_order: e.target.checked })} />}
                label="Purchase Order"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={<Switch checked={template.show_rental_summary} onChange={(e) => setTemplate({ ...template, show_rental_summary: e.target.checked })} />}
                label="Rental Summary"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={<Switch checked={template.show_serialized_assets} onChange={(e) => setTemplate({ ...template, show_serialized_assets: e.target.checked })} />}
                label="Serialized Assets"
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle1" gutterBottom fontWeight="bold">
            Rental Summary Columns
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={<Switch checked={template.show_start_count} onChange={(e) => setTemplate({ ...template, show_start_count: e.target.checked })} />}
                label="Start Count"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={<Switch checked={template.show_ship} onChange={(e) => setTemplate({ ...template, show_ship: e.target.checked })} />}
                label="Ship"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={<Switch checked={template.show_return} onChange={(e) => setTemplate({ ...template, show_return: e.target.checked })} />}
                label="Return"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={<Switch checked={template.show_end_count} onChange={(e) => setTemplate({ ...template, show_end_count: e.target.checked })} />}
                label="End Count"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={<Switch checked={template.show_rent_days} onChange={(e) => setTemplate({ ...template, show_rent_days: e.target.checked })} />}
                label="Rent Days"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={<Switch checked={template.show_rent_rate} onChange={(e) => setTemplate({ ...template, show_rent_rate: e.target.checked })} />}
                label="Rent Rate"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={<Switch checked={template.show_total} onChange={(e) => setTemplate({ ...template, show_total: e.target.checked })} />}
                label="Total"
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle1" gutterBottom fontWeight="bold">
            Serialized Assets Columns
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={<Switch checked={template.show_asset_type} onChange={(e) => setTemplate({ ...template, show_asset_type: e.target.checked })} />}
                label="Asset Type"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={<Switch checked={template.show_delivered_date} onChange={(e) => setTemplate({ ...template, show_delivered_date: e.target.checked })} />}
                label="Delivered Date"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={<Switch checked={template.show_days_held} onChange={(e) => setTemplate({ ...template, show_days_held: e.target.checked })} />}
                label="Days Held"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={<Switch checked={template.show_barcode} onChange={(e) => setTemplate({ ...template, show_barcode: e.target.checked })} />}
                label="Barcode"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={<Switch checked={template.show_serial_number} onChange={(e) => setTemplate({ ...template, show_serial_number: e.target.checked })} />}
                label="Serial Number"
              />
            </Grid>
          </Grid>
        </TabPanel>

        {/* Content Tab */}
        <TabPanel value={activeTab} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Payment Settings
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Tax Rate"
                type="number"
                inputProps={{ step: 0.01, min: 0, max: 1 }}
                value={template.tax_rate}
                onChange={(e) => setTemplate({ ...template, tax_rate: parseFloat(e.target.value) })}
                helperText="Enter as decimal (e.g., 0.11 for 11%)"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Payment Terms"
                value={template.payment_terms}
                onChange={(e) => setTemplate({ ...template, payment_terms: e.target.value })}
                placeholder="CREDIT CARD, Net 30, etc."
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Invoice Footer
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Footer Text"
                value={template.invoice_footer}
                onChange={(e) => setTemplate({ ...template, invoice_footer: e.target.value })}
                placeholder="Thank you for your business!"
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Email Settings
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email Subject"
                value={template.email_subject}
                onChange={(e) => setTemplate({ ...template, email_subject: e.target.value })}
                helperText="Use {company_name} for dynamic company name"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Email Body"
                value={template.email_body}
                onChange={(e) => setTemplate({ ...template, email_body: e.target.value })}
                helperText="Invoice will be attached as PDF"
              />
            </Grid>
          </Grid>
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save Template
        </Button>
      </DialogActions>
    </Dialog>
  );
}

