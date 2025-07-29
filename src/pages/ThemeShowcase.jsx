import React, { useState } from 'react';
import {
  Box, Paper, Typography, Grid, Card, CardContent, Button,
  Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  List, ListItem, ListItemText, ListItemIcon, Avatar, Badge,
  LinearProgress, CircularProgress, Alert, Tabs, Tab, Divider,
  FormControl, InputLabel, Select, MenuItem, TextField, Switch,
  FormControlLabel, Slider, Rating, Stepper, Step, StepLabel
} from '@mui/material';
import {
  Palette as PaletteIcon, Star as StarIcon, Check as CheckIcon,
  Warning as WarningIcon, Error as ErrorIcon, Info as InfoIcon,
  Favorite as FavoriteIcon, Share as ShareIcon, Download as DownloadIcon,
  Settings as SettingsIcon, Notifications as NotificationIcon,
  Dashboard as DashboardIcon, Person as PersonIcon, Business as BusinessIcon,
  Analytics as AnalyticsIcon, TrendingUp as TrendingUpIcon,
  ShoppingCart as CartIcon, LocalShipping as ShippingIcon,
  Inventory as InventoryIcon, Schedule as ScheduleIcon,
  LocationOn as LocationIcon, Security as SecurityIcon
} from '@mui/icons-material';
import { useTheme } from '../context/ThemeContext';
import { themes, themeMetadata } from '../theme/themes';

function ComponentShowcase() {
  const [tabValue, setTabValue] = useState(0);
  const [sliderValue, setSliderValue] = useState(30);
  const [rating, setRating] = useState(4);
  const [progress] = useState(65);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Component Showcase
      </Typography>
      
      {/* Buttons */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Buttons & Actions
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
          <Button variant="contained">Primary Button</Button>
          <Button variant="outlined">Outlined Button</Button>
          <Button variant="text">Text Button</Button>
          <Button variant="contained" color="secondary">Secondary</Button>
          <Button variant="contained" color="error">Error</Button>
          <Button variant="contained" color="success">Success</Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button variant="contained" startIcon={<StarIcon />}>With Icon</Button>
          <Button variant="outlined" endIcon={<ShareIcon />}>Share</Button>
          <IconButton color="primary"><FavoriteIcon /></IconButton>
          <IconButton color="secondary"><NotificationIcon /></IconButton>
        </Box>
      </Box>

      {/* Cards & Surfaces */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Cards & Surfaces
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <Card className="card-hover">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                    <DashboardIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">Dashboard</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Overview & Analytics
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="body2">
                  Monitor your business performance with real-time insights and comprehensive analytics.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card className="card-hover">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                    <InventoryIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">Inventory</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Asset Management
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="body2">
                  Track and manage your cylinder inventory with advanced scanning and automation.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card className="card-hover">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                    <ShippingIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">Deliveries</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Route Optimization
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="body2">
                  Optimize delivery routes and track shipments with real-time GPS monitoring.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Chips & Badges */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Chips & Status Indicators
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <Chip label="Active" color="success" />
          <Chip label="Pending" color="warning" />
          <Chip label="Error" color="error" />
          <Chip label="Info" color="info" />
          <Chip label="Primary" color="primary" />
          <Chip label="Secondary" color="secondary" />
        </Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Badge badgeContent={4} color="primary">
            <NotificationIcon />
          </Badge>
          <Badge badgeContent={12} color="error">
            <InventoryIcon />
          </Badge>
          <Badge badgeContent="NEW" color="success">
            <StarIcon />
          </Badge>
        </Box>
      </Box>

      {/* Alerts */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Alerts & Messages
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Alert severity="success" icon={<CheckIcon />}>
            Operation completed successfully! Your data has been saved.
          </Alert>
          <Alert severity="warning" icon={<WarningIcon />}>
            Warning: Some items require attention before proceeding.
          </Alert>
          <Alert severity="error" icon={<ErrorIcon />}>
            Error: Unable to connect to the server. Please try again.
          </Alert>
          <Alert severity="info" icon={<InfoIcon />}>
            Information: New features are available in the latest update.
          </Alert>
        </Box>
      </Box>

      {/* Progress & Loading */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Progress & Loading States
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>
            Upload Progress ({progress}%)
          </Typography>
          <LinearProgress variant="determinate" value={progress} sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <CircularProgress size={24} />
            <Typography variant="body2">Loading...</Typography>
            <CircularProgress variant="determinate" value={progress} size={40} />
          </Box>
        </Box>
      </Box>

      {/* Form Elements */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Form Elements
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Customer Name"
              placeholder="Enter customer name"
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value="active" label="Status">
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch defaultChecked />}
              label="Enable notifications"
            />
          </Grid>
          <Grid item xs={12}>
            <Typography gutterBottom>Priority Level</Typography>
            <Slider
              value={sliderValue}
              onChange={(e, newValue) => setSliderValue(newValue)}
              valueLabelDisplay="auto"
              step={10}
              marks
              min={0}
              max={100}
            />
          </Grid>
          <Grid item xs={12}>
            <Typography gutterBottom>Rating</Typography>
            <Rating
              value={rating}
              onChange={(e, newValue) => setRating(newValue)}
              precision={0.5}
            />
          </Grid>
        </Grid>
      </Box>

      {/* Tabs */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Navigation Tabs
        </Typography>
        <Paper sx={{ width: '100%' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="Overview" />
            <Tab label="Analytics" />
            <Tab label="Reports" />
            <Tab label="Settings" />
          </Tabs>
          <Box sx={{ p: 3 }}>
            <Typography>
              Tab content for: {['Overview', 'Analytics', 'Reports', 'Settings'][tabValue]}
            </Typography>
          </Box>
        </Paper>
      </Box>

      {/* Data Tables */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Data Tables
        </Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Cylinder ID</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>CYL-001</TableCell>
                <TableCell>Acme Corp</TableCell>
                <TableCell>
                  <Chip label="Delivered" color="success" size="small" />
                </TableCell>
                <TableCell>Warehouse A</TableCell>
                <TableCell>
                  <IconButton size="small">
                    <SettingsIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>CYL-002</TableCell>
                <TableCell>Tech Solutions</TableCell>
                <TableCell>
                  <Chip label="In Transit" color="warning" size="small" />
                </TableCell>
                <TableCell>Route 5</TableCell>
                <TableCell>
                  <IconButton size="small">
                    <SettingsIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
}

function ThemePreviewGrid() {
  const { currentTheme, changeTheme } = useTheme();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Available Themes
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Click on any theme to apply it instantly. All themes maintain full functionality while providing unique visual experiences.
      </Typography>
      
      <Grid container spacing={3}>
        {Object.entries(themeMetadata).map(([themeName, metadata]) => (
          <Grid item xs={12} sm={6} md={4} key={themeName}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                border: currentTheme === themeName ? 2 : 1,
                borderColor: currentTheme === themeName ? 'primary.main' : 'divider',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                }
              }}
              onClick={() => changeTheme(themeName)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar 
                    sx={{ 
                      bgcolor: metadata.preview,
                      mr: 2,
                      width: 40,
                      height: 40
                    }}
                  >
                    <PaletteIcon />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6">
                      {metadata.name}
                    </Typography>
                    <Chip 
                      label={metadata.category}
                      size="small"
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                  {currentTheme === themeName && (
                    <CheckIcon color="primary" />
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {metadata.description}
                </Typography>
                
                {/* Mini preview */}
                <Box sx={{ mt: 2, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <Box 
                      sx={{ 
                        width: 20, 
                        height: 8, 
                        bgcolor: metadata.preview, 
                        borderRadius: 1 
                      }} 
                    />
                    <Box 
                      sx={{ 
                        width: 15, 
                        height: 8, 
                        bgcolor: 'text.secondary', 
                        borderRadius: 1,
                        opacity: 0.6
                      }} 
                    />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Box 
                      sx={{ 
                        width: 8, 
                        height: 8, 
                        bgcolor: 'success.main', 
                        borderRadius: '50%' 
                      }} 
                    />
                    <Box 
                      sx={{ 
                        width: 8, 
                        height: 8, 
                        bgcolor: 'warning.main', 
                        borderRadius: '50%' 
                      }} 
                    />
                    <Box 
                      sx={{ 
                        width: 8, 
                        height: 8, 
                        bgcolor: 'error.main', 
                        borderRadius: '50%' 
                      }} 
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export default function ThemeShowcase() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Theme Gallery" />
          <Tab label="Component Showcase" />
        </Tabs>
      </Box>
      
      {activeTab === 0 && <ThemePreviewGrid />}
      {activeTab === 1 && <ComponentShowcase />}
    </Box>
  );
} 