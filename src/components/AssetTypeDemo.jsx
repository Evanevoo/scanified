import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Button, Select, MenuItem,
  FormControl, InputLabel, Chip, List, ListItem, ListItemText, Divider
} from '@mui/material';

// Mock asset configurations for different organization types
const assetConfigurations = {
  cylinder: {
    assetDisplayName: 'Gas Cylinder',
    assetDisplayNamePlural: 'Gas Cylinders',
    assetType: 'cylinder',
    primaryColor: '#2563eb',
    appName: 'CylinderTrack Pro',
    customTerminology: {
      scan: 'scan',
      track: 'track',
      inventory: 'inventory',
      manage: 'manage',
      delivery: 'delivery'
    }
  },
  pallet: {
    assetDisplayName: 'Pallet',
    assetDisplayNamePlural: 'Pallets',
    assetType: 'pallet',
    primaryColor: '#f59e0b',
    appName: 'PalletTracker',
    customTerminology: {
      scan: 'scan',
      track: 'track',
      inventory: 'warehouse',
      manage: 'coordinate',
      delivery: 'shipment'
    }
  },
  equipment: {
    assetDisplayName: 'Equipment',
    assetDisplayNamePlural: 'Equipment',
    assetType: 'equipment',
    primaryColor: '#10b981',
    appName: 'EquipManager',
    customTerminology: {
      scan: 'check-in',
      track: 'monitor',
      inventory: 'storage',
      manage: 'maintain',
      delivery: 'deployment'
    }
  },
  medical: {
    assetDisplayName: 'Medical Device',
    assetDisplayNamePlural: 'Medical Devices',
    assetType: 'medical',
    primaryColor: '#ef4444',
    appName: 'MedTrack',
    customTerminology: {
      scan: 'inspect',
      track: 'monitor',
      inventory: 'storage',
      manage: 'maintain',
      delivery: 'distribution'
    }
  },
  tool: {
    assetDisplayName: 'Tool',
    assetDisplayNamePlural: 'Tools',
    assetType: 'tool',
    primaryColor: '#8b5cf6',
    appName: 'ToolManager',
    customTerminology: {
      scan: 'check-out',
      track: 'locate',
      inventory: 'toolroom',
      manage: 'organize',
      delivery: 'dispatch'
    }
  }
};

export default function AssetTypeDemo() {
  const [selectedType, setSelectedType] = useState('cylinder');
  const config = assetConfigurations[selectedType];

  const generateDynamicContent = (config) => ({
    dashboardTitle: `${config.assetDisplayName} Management Dashboard`,
    searchPlaceholder: `Search ${config.assetDisplayNamePlural}...`,
    addButtonText: `Add New ${config.assetDisplayName}`,
    totalLabel: `Total ${config.assetDisplayNamePlural}`,
    quickActions: [
      `${config.customTerminology.scan} ${config.assetDisplayNamePlural}`,
      `${config.customTerminology.manage} ${config.customTerminology.inventory}`,
      `${config.customTerminology.track} ${config.customTerminology.delivery}`,
      `View ${config.assetDisplayName} Reports`
    ],
    features: [
      `Real-time ${config.assetDisplayName.toLowerCase()} tracking`,
      `${config.customTerminology.inventory} management`,
      `${config.customTerminology.delivery} optimization`,
      `Mobile ${config.customTerminology.scan} app`,
      `${config.assetDisplayName} analytics`,
      `Customer portal access`
    ],
    statusTypes: [
      `Available ${config.assetDisplayName}`,
      `${config.assetDisplayName} in Use`,
      `${config.assetDisplayName} Maintenance`,
      `${config.assetDisplayName} Transit`
    ]
  });

  const content = generateDynamicContent(config);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        🎯 Asset-Agnostic Platform Demo
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        See how the same platform adapts to different industries and asset types.
        Change the organization type below to see the UI dynamically update.
      </Typography>

      {/* Organization Type Selector */}
      <Card sx={{ mb: 3, bgcolor: '#f8fafc' }}>
        <CardContent>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Organization Type</InputLabel>
            <Select
              value={selectedType}
              label="Organization Type"
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <MenuItem value="cylinder">Gas Cylinder Company</MenuItem>
              <MenuItem value="pallet">Pallet Management</MenuItem>
              <MenuItem value="equipment">Equipment Rental</MenuItem>
              <MenuItem value="medical">Medical Device Tracking</MenuItem>
              <MenuItem value="tool">Tool Management</MenuItem>
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      {/* Dynamic Dashboard Preview */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" sx={{ color: config.primaryColor, fontWeight: 'bold' }}>
              {config.appName}
            </Typography>
            <Chip 
              label={`${config.assetType.toUpperCase()} INDUSTRY`} 
              sx={{ bgcolor: config.primaryColor, color: 'white' }}
            />
          </Box>

          <Typography variant="h6" gutterBottom>
            {content.dashboardTitle}
          </Typography>

          <Grid container spacing={3}>
            {/* Quick Actions */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Quick Actions
              </Typography>
              <List dense>
                {content.quickActions.map((action, index) => (
                  <ListItem key={index} sx={{ pl: 0 }}>
                    <Button 
                      variant="outlined" 
                      size="small" 
                      sx={{ 
                        borderColor: config.primaryColor, 
                        color: config.primaryColor,
                        textTransform: 'none',
                        mb: 1,
                        width: '100%',
                        justifyContent: 'flex-start'
                      }}
                    >
                      {action}
                    </Button>
                  </ListItem>
                ))}
              </List>
            </Grid>

            {/* Features */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Platform Features
              </Typography>
              <List dense>
                {content.features.map((feature, index) => (
                  <ListItem key={index} sx={{ pl: 0 }}>
                    <ListItemText 
                      primary={`✓ ${feature}`}
                      sx={{ 
                        '& .MuiListItemText-primary': { 
                          fontSize: '0.9rem',
                          color: config.primaryColor
                        }
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Status Examples */}
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
            {config.assetDisplayName} Status Types
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {content.statusTypes.map((status, index) => (
              <Chip 
                key={index}
                label={status}
                variant="outlined"
                size="small"
                sx={{ borderColor: config.primaryColor, color: config.primaryColor }}
              />
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Configuration Display */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Current Configuration
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Asset Type:</Typography>
              <Typography variant="body1">{config.assetDisplayName}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Plural Form:</Typography>
              <Typography variant="body1">{config.assetDisplayNamePlural}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">App Name:</Typography>
              <Typography variant="body1">{config.appName}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Primary Color:</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box 
                  sx={{ 
                    width: 20, 
                    height: 20, 
                    bgcolor: config.primaryColor, 
                    borderRadius: 1 
                  }} 
                />
                <Typography variant="body1">{config.primaryColor}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">Custom Terminology:</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                {Object.entries(config.customTerminology).map(([key, value]) => (
                  <Chip 
                    key={key} 
                    label={`${key}: "${value}"`} 
                    size="small" 
                    variant="outlined"
                  />
                ))}
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
} 