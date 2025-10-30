import logger from '../utils/logger';
import React, { useState } from 'react';
import {
  Box, Paper, Typography, Grid, Card, CardContent, CardActionArea,
  Button, Chip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, FormControl, InputLabel, Select, MenuItem,
  Switch, FormControlLabel, Divider, Avatar, Badge
} from '@mui/material';
import {
  Palette as PaletteIcon, Check as CheckIcon, 
  DarkMode as DarkModeIcon, LightMode as LightModeIcon,
  Preview as PreviewIcon, Close as CloseIcon,
  Brightness4 as AutoIcon, ColorLens as ColorIcon
} from '@mui/icons-material';
import { useTheme } from '../context/ThemeContext';
import { themes, themeMetadata } from '../theme/themes';

function ThemePreview({ themeName, theme, isSelected, onSelect }) {
  const metadata = themeMetadata[themeName];
  
  // Safety check - if metadata is undefined, provide defaults
  if (!metadata) {
    logger.warn(`Theme metadata not found for: ${themeName}`);
    return null; // or return a default preview
  }
  
  return (
    <Card 
      sx={{ 
        position: 'relative',
        cursor: 'pointer',
        border: isSelected ? 2 : 1,
        borderColor: isSelected ? 'primary.main' : 'divider',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
        }
      }}
    >
      <CardActionArea onClick={() => onSelect(themeName)}>
        <Box sx={{ p: 2 }}>
          {/* Theme Preview */}
          <Box 
            sx={{ 
              height: 120,
              borderRadius: 2,
              overflow: 'hidden',
              position: 'relative',
              background: theme.palette.background.default,
              border: `1px solid ${theme.palette.divider}`,
              mb: 2
            }}
          >
            {/* Header Bar */}
            <Box 
              sx={{ 
                height: 24,
                background: theme.palette.primary.main,
                display: 'flex',
                alignItems: 'center',
                px: 1,
                gap: 0.5
              }}
            >
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'white', opacity: 0.8 }} />
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'white', opacity: 0.8 }} />
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'white', opacity: 0.8 }} />
            </Box>
            
            {/* Content Area */}
            <Box sx={{ p: 1, height: 'calc(100% - 24px)' }}>
              {/* Sidebar */}
              <Box 
                sx={{ 
                  width: 32,
                  height: '100%',
                  bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[100],
                  borderRadius: 1,
                  float: 'left',
                  mr: 1
                }}
              />
              
              {/* Main Content */}
              <Box sx={{ overflow: 'hidden' }}>
                <Box 
                  sx={{ 
                    height: 8,
                    bgcolor: theme.palette.text.primary,
                    borderRadius: 1,
                    mb: 1,
                    width: '60%',
                    opacity: 0.8
                  }}
                />
                <Box 
                  sx={{ 
                    height: 6,
                    bgcolor: theme.palette.text.secondary,
                    borderRadius: 1,
                    mb: 1,
                    width: '80%',
                    opacity: 0.6
                  }}
                />
                <Box 
                  sx={{ 
                    height: 6,
                    bgcolor: theme.palette.text.secondary,
                    borderRadius: 1,
                    mb: 1,
                    width: '40%',
                    opacity: 0.6
                  }}
                />
                
                {/* Buttons */}
                <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                  <Box 
                    sx={{ 
                      width: 20,
                      height: 12,
                      bgcolor: theme.palette.primary.main,
                      borderRadius: 1,
                      opacity: 0.8
                    }}
                  />
                  <Box 
                    sx={{ 
                      width: 20,
                      height: 12,
                      bgcolor: theme.palette.secondary.main,
                      borderRadius: 1,
                      opacity: 0.8
                    }}
                  />
                </Box>
              </Box>
            </Box>
          </Box>
          
          {/* Theme Info */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              {metadata.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {metadata.description}
            </Typography>
            <Chip 
              label={metadata.category}
              size="small"
              sx={{ 
                bgcolor: metadata.preview,
                color: 'white',
                fontWeight: 600
              }}
            />
          </Box>
        </Box>
      </CardActionArea>
      
      {/* Selection Indicator */}
      {isSelected && (
        <Box 
          sx={{ 
            position: 'absolute',
            top: 8,
            right: 8,
            bgcolor: 'primary.main',
            color: 'white',
            borderRadius: '50%',
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <CheckIcon sx={{ fontSize: 16 }} />
        </Box>
      )}
    </Card>
  );
}

function ThemeCustomizer({ open, onClose, currentTheme, onThemeChange }) {
  const [selectedTheme, setSelectedTheme] = useState(currentTheme);
  
  const handleApply = () => {
    onThemeChange(selectedTheme);
    onClose();
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        pb: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ColorIcon />
          <Typography variant="h6">Theme Customizer</Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 2 }}>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Choose a theme that matches your style and work environment. All themes are designed to maintain functionality while enhancing visual appeal.
        </Typography>
        
        <Grid container spacing={3}>
          {Object.entries(themeMetadata).map(([themeName, metadata]) => (
            <Grid item xs={12} sm={6} md={4} key={themeName}>
              <ThemePreview
                themeName={themeName}
                theme={themes[themeName]}
                isSelected={selectedTheme === themeName}
                onSelect={setSelectedTheme}
              />
            </Grid>
          ))}
        </Grid>
      </DialogContent>
      
      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button 
          onClick={handleApply} 
          variant="contained" 
          startIcon={<CheckIcon />}
          disabled={selectedTheme === currentTheme}
        >
          Apply Theme
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function ThemeSelector() {
  const { currentTheme, isDarkMode, changeTheme, toggleDarkMode, availableThemes } = useTheme();
  const [customizerOpen, setCustomizerOpen] = useState(false);
  
  const currentMetadata = themeMetadata[currentTheme] || {
    name: 'Unknown Theme',
    description: 'Theme metadata not found',
    preview: '#1976d2',
    category: 'Unknown'
  };
  
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <PaletteIcon color="primary" />
        <Typography variant="h6">Theme & Appearance</Typography>
      </Box>
      
      <Grid container spacing={3}>
        {/* Current Theme Display */}
        <Grid item xs={12} md={6}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Current Theme
            </Typography>
            <Card sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar 
                  sx={{ 
                    bgcolor: currentMetadata.preview,
                    width: 48,
                    height: 48
                  }}
                >
                  <PaletteIcon />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6">
                    {currentMetadata.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {currentMetadata.description}
                  </Typography>
                  <Chip 
                    label={currentMetadata.category}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Box>
              </Box>
            </Card>
          </Box>
          
          <Button 
            variant="contained" 
            startIcon={<PreviewIcon />}
            onClick={() => setCustomizerOpen(true)}
            fullWidth
            sx={{ mb: 2 }}
          >
            Change Theme
          </Button>
        </Grid>
        
        {/* Theme Settings */}
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1" gutterBottom>
            Theme Settings
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={isDarkMode}
                  onChange={toggleDarkMode}
                  icon={<LightModeIcon />}
                  checkedIcon={<DarkModeIcon />}
                />
              }
              label={
                <Box>
                  <Typography variant="body1">
                    Dark Mode
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'}
                  </Typography>
                </Box>
              }
            />
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          {/* Quick Theme Switcher */}
          <Typography variant="subtitle2" gutterBottom>
            Quick Switch
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {Object.entries(themeMetadata).slice(0, 4).map(([themeName, metadata]) => {
              // Safety check for metadata
              if (!metadata) return null;
              
              return (
                <Button
                  key={themeName}
                  variant={currentTheme === themeName ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => changeTheme(themeName)}
                  sx={{ 
                    minWidth: 'auto',
                    px: 2,
                    borderColor: metadata.preview,
                    color: currentTheme === themeName ? 'white' : metadata.preview,
                    bgcolor: currentTheme === themeName ? metadata.preview : 'transparent',
                    '&:hover': {
                      bgcolor: metadata.preview,
                      color: 'white'
                    }
                  }}
                >
                  {metadata.name}
                </Button>
              );
            })}
          </Box>
        </Grid>
      </Grid>
      
      <ThemeCustomizer
        open={customizerOpen}
        onClose={() => setCustomizerOpen(false)}
        currentTheme={currentTheme}
        onThemeChange={changeTheme}
      />
    </Paper>
  );
} 