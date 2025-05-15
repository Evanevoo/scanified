import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import MenuIcon from '@mui/icons-material/Menu';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import HomeIcon from '@mui/icons-material/Home';
import PeopleIcon from '@mui/icons-material/People';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import HistoryIcon from '@mui/icons-material/History';
import ImportExportIcon from '@mui/icons-material/ImportExport';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ReportIcon from '@mui/icons-material/Assessment';
import Button from '@mui/material/Button';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import { useAuth } from '../hooks/useAuth';

const drawerWidth = 240;

const navItems = [
  { to: '/home', label: 'Home', icon: <HomeIcon /> },
  { to: '/custom-reports', label: 'Custom Reports', icon: <ReportIcon /> },
  { to: '/customers', label: 'Customers', icon: <PeopleIcon /> },
  { to: '/locations', label: 'Locations', icon: <LocationOnIcon /> },
  { to: '/assets/history-lookup', label: 'Asset History Lookup', icon: <HistoryIcon /> },
  { to: '/all-asset-movements', label: 'All Asset Movements', icon: <HistoryIcon /> },
  { to: '/import', label: 'Import', icon: <ImportExportIcon /> },
  { to: '/import-customer-info', label: 'Import Customers', icon: <ImportExportIcon /> },
  { to: '/import-history', label: 'Import History', icon: <ImportExportIcon /> },
  { to: '/scanned-orders', label: 'Scanned Orders', icon: <AssignmentIcon /> },
  { to: '/orders-report', label: 'Orders Report', icon: <ReceiptIcon /> },
];

export default function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Gas Cylinder App
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {navItems.map(({ to, label, icon }) => (
          <ListItem key={to} disablePadding>
            <ListItemButton selected={location.pathname === to} onClick={() => navigate(to)}>
              <ListItemIcon>{icon}</ListItemIcon>
              <ListItemText primary={label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f4f6fa' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: '#1976d2', boxShadow: 3 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Gas Cylinder Dashboard
          </Typography>
          <Button color="inherit" onClick={() => navigate('/home')}>Home</Button>
          <Button color="inherit" onClick={() => navigate('/rentals')}>Rentals</Button>
          <Button color="inherit" onClick={() => navigate('/invoices')}>Invoices</Button>
          <Button color="inherit" onClick={() => navigate('/customers')}>Customers</Button>
          <Button color="inherit" onClick={() => navigate('/scanned-orders')}>Scanned Orders</Button>
          <IconButton color="inherit" onClick={() => navigate('/settings')}><SettingsIcon /></IconButton>
          <IconButton color="inherit" onClick={() => { /* TODO: Add logout logic */ }}><LogoutIcon /></IconButton>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        {/* The implementation can be swapped with js to avoid SEO duplication of links. */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` }, bgcolor: '#f4f6fa', minHeight: '100vh' }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
} 