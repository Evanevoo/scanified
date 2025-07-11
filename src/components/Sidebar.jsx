import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import { ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { AdminPanelSettings, Payment, People, Analytics, Storefront } from '@mui/icons-material';
import {
  Drawer, List, Divider, Box, Typography, Collapse
} from '@mui/material';
import {
  Dashboard, LocalShipping, Assessment,
  Receipt, Settings, Business, Notifications,
  Inventory, Map, Schedule, AccountCircle, Security, Support, Build as BuildIcon, CheckCircle,
  LocationOn as LocationIcon
} from '@mui/icons-material';

const drawerWidth = 280;

const Sidebar = ({ open, onClose }) => {
  const { profile, organization } = useAuth();
  console.log('Sidebar profile:', profile);
  if (!profile) return null;
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!search) {
      setSuggestions([]);
      return;
    }
    const fetchSuggestions = async () => {
      // Search assets (barcode/serial), customers (name/ID/phone), sales orders (number)
      const [assets, customers, salesOrders] = await Promise.all([
        supabase.from('bottles').select('id, barcode_number, serial_number, product_code, description').or(`barcode_number.ilike.%${search}%,serial_number.ilike.%${search}%,product_code.ilike.%${search}%`).limit(5),
        supabase.from('customers').select('CustomerListID, name, phone').or(`CustomerListID.ilike.%${search}%,name.ilike.%${search}%,phone.ilike.%${search}%`).limit(5),
        supabase.from('sales_orders').select('id, sales_order_number, customer_name').or(`sales_order_number.ilike.%${search}%,customer_name.ilike.%${search}%`).limit(5),
      ]);
      const assetResults = (assets.data || []).map(a => ({
        type: 'asset',
        id: a.barcode_number || a.serial_number || a.product_code,
        label: a.description || a.product_code || a.barcode_number || a.serial_number,
        sub: a.barcode_number || a.serial_number,
      }));
      const customerResults = (customers.data || []).map(c => ({
        type: 'customer',
        id: c.CustomerListID,
        label: c.name,
        sub: c.phone,
      }));
      const orderResults = (salesOrders.data || []).map(o => ({
        type: 'order',
        id: o.id,
        label: o.sales_order_number,
        sub: o.customer_name,
      }));
      setSuggestions([...assetResults, ...customerResults, ...orderResults]);
    };
    fetchSuggestions();
  }, [search]);

  const handleSelect = (item) => {
    setShowSuggestions(false);
    setSearch('');
    if (item.type === 'asset') navigate(`/bottle/${item.id}`);
    else if (item.type === 'customer') navigate(`/customer/${item.id}`);
    else if (item.type === 'order') navigate(`/integration`); // Adjust to actual order detail page if exists
    else alert('Unknown type');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (suggestions.length > 0) {
      handleSelect(suggestions[0]);
    } else {
      alert('No matching asset, customer, or order found.');
    }
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (onClose) onClose();
  };

  const isActive = (path) => location.pathname === path;

  const menuItems = profile?.role === 'owner' ? [
    {
      title: 'Dashboard',
      path: '/dashboard',
      icon: <Dashboard />, 
      roles: ['owner']
    },
    {
      title: 'Owner Portal',
      path: '/owner-portal',
      icon: <Business />, 
      roles: ['owner']
    }
  ] : [
    {
      title: 'Dashboard',
      path: '/dashboard',
      icon: <Dashboard />, 
      roles: ['admin', 'user', 'manager', 'owner']
    },
    {
      title: 'Analytics',
      path: '/analytics',
      icon: <Analytics />, 
      roles: ['admin', 'manager', 'owner']
    },
    {
      title: 'Organization Analytics',
      path: '/organization-analytics',
      icon: <Analytics />, 
      roles: ['admin', 'user', 'manager', 'owner']
    },
    {
      title: 'Customers',
      path: '/customers',
      icon: <People />, 
      roles: ['admin', 'user', 'manager', 'owner']
    },
    {
      title: 'Inventory',
      path: '/inventory',
      icon: <Inventory />, 
      roles: ['admin', 'user', 'manager', 'owner']
    },
    {
      title: 'Deliveries',
      path: '/deliveries',
      icon: <LocalShipping />, 
      roles: ['admin', 'user', 'manager', 'owner']
    },
    {
      title: 'Rentals',
      path: '/rentals',
      icon: <Schedule />, 
      roles: ['admin', 'user', 'manager', 'owner']
    },
    {
      title: 'Invoices',
      path: '/invoices',
      icon: <Receipt />, 
      roles: ['admin', 'user', 'manager', 'owner']
    },
    {
      title: 'Bottle Management',
      path: '/bottle-management',
      icon: <Inventory />, 
      roles: ['admin', 'user', 'manager', 'owner']
    },
    {
      title: 'Smart Inventory',
      path: '/smart-inventory',
      icon: <InventoryIcon />, 
      roles: ['admin', 'user', 'manager', 'owner']
    },
    {
      title: 'Customer Portal',
      path: '/customer-portal',
      icon: <PersonIcon />, 
      roles: ['admin', 'user', 'manager', 'owner']
    },
    {
      title: 'Organization Tools',
      path: '/organization-tools',
      icon: <BuildIcon />, 
      roles: ['admin', 'manager', 'owner']
    },
    {
      title: 'User Management',
      path: '/user-management',
      icon: <AdminPanelSettings />, 
      roles: ['admin', 'owner']
    },
    {
      title: 'Billing',
      path: '/billing',
      icon: <Payment />, 
      roles: ['admin', 'owner']
    },
    {
      title: 'Reports',
      path: '/reports',
      icon: <Assessment />, 
      roles: ['admin', 'manager', 'owner']
    },
    {
      title: 'Settings',
      path: '/settings',
      icon: <Settings />, 
      roles: ['admin', 'owner']
    },
    {
      title: 'Support Center',
      path: '/support',
      icon: <Support />, 
      roles: ['admin', 'user', 'manager', 'owner']
    },
    {
      title: 'Data Utilities',
      path: '/data-utilities',
      icon: <BuildIcon />, 
      roles: ['owner']
    }
  ];

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(profile?.role)
  );

  // Debug logging for organization and logo
  console.log('Sidebar - Organization data:', organization);
  console.log('Sidebar - Organization logo_url:', organization?.logo_url);
  console.log('Sidebar - Organization name:', organization?.name);
  console.log('Sidebar - Profile role:', profile?.role);
  console.log('Sidebar - Profile organization_id:', profile?.organization_id);

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          top: 0,
          height: '100%',
          zIndex: (theme) => theme.zIndex.drawer
        },
      }}
    >
      <Box sx={{ overflow: 'auto', mt: 8 }}>
        {/* Organization Info */}
        {organization && (
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
            {organization.logo_url ? (
              <img 
                key={organization.logo_url}
                src={organization.logo_url} 
                alt="Org Logo" 
                style={{ height: 40, width: 40, objectFit: 'contain', borderRadius: 6, background: '#fff', border: '1px solid #eee' }}
                onError={(e) => {
                  console.error('Failed to load logo:', organization.logo_url);
                  e.target.style.display = 'none';
                }}
                onLoad={() => {
                  console.log('Logo loaded successfully:', organization.logo_url);
                }}
              />
            ) : (
              <Box 
                sx={{ 
                  height: 40, 
                  width: 40, 
                  borderRadius: 6, 
                  background: '#f0f0f0', 
                  border: '1px solid #eee',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#999',
                  fontSize: '12px'
                }}
              >
                {organization.name?.charAt(0)?.toUpperCase() || '?'}
              </Box>
            )}
            <Box>
              <Typography variant="h6" color="primary">
                {organization.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {profile?.role} • {profile?.full_name}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Main Menu */}
        <List>
          {filteredMenuItems.map((item) => (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                selected={isActive(item.path)}
                onClick={() => handleNavigation(item.path)}
                sx={{
                  '&.Mui-selected': {
                    backgroundColor: 'primary.light',
                    '&:hover': {
                      backgroundColor: 'primary.light',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ color: isActive(item.path) ? 'primary.main' : 'inherit' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.title}
                  sx={{ 
                    '& .MuiListItemText-primary': {
                      fontWeight: isActive(item.path) ? 600 : 400,
                    }
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        {/* Support */}
        <Divider />
        <List>
          <ListItem disablePadding>
            <ListItemButton>
              <ListItemIcon>
                <Support />
              </ListItemIcon>
              <ListItemText primary="Support" />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </Drawer>
  );
};

export default Sidebar; 