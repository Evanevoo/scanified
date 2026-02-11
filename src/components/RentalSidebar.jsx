import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, List, ListItemButton, ListItemIcon, ListItemText, Typography
} from '@mui/material';
import {
  Category as CategoryIcon,
  Assignment as AssignmentIcon,
  Receipt as ReceiptIcon,
  AttachMoney as MoneyIcon,
  EventBusy as ExpiringIcon,
  Settings as SettingsIcon,
  CalendarMonth as CalendarIcon,
  Code as CodeIcon,
  Map as MapIcon,
  LocalOffer as TagIcon,
  Search as SearchIcon,
  Inventory as InventoryIcon,
  Link as LinkIcon,
} from '@mui/icons-material';

const links = [
  { to: '/rental/class-groups', label: 'Rental Class Groups', icon: <CategoryIcon /> },
  { to: '/rental/classes', label: 'Rental Classes', icon: <AssignmentIcon /> },
  { to: '/rental/bill-formats', label: 'Rental Bill Formats', icon: <ReceiptIcon /> },
  { to: '/rental/flat-fees', label: 'Flat Fees', icon: <MoneyIcon /> },
  { to: '/rental/expiring-asset-agreements', label: 'Expiring Asset Agreements', icon: <ExpiringIcon /> },
  { to: '/rental/bill-configuration', label: 'Rental Bill Configuration', icon: <SettingsIcon /> },
  { to: '/rental/billing-periods', label: 'Show Rental Billing Periods', icon: <CalendarIcon /> },
  { to: '/rental/legacy-code-mappings', label: 'Rental Legacy Code Mappings', icon: <CodeIcon /> },
  { to: '/rental/tax-regions', label: 'Rental Tax Regions', icon: <MapIcon /> },
  { to: '/rental/tax-categories', label: 'Rental Tax Categories', icon: <TagIcon /> },
  { to: '/rental/invoice-search', label: 'Rental Invoice Search', icon: <SearchIcon /> },
  { to: '/rental/accounting-products', label: 'Accounting Asset Agreement Products', icon: <InventoryIcon /> },
  { to: '/rental/assign-asset-types', label: 'Assign Asset Types To Rental Classes', icon: <LinkIcon /> },
];

export default function RentalSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/rental/class-groups') return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <Box
      sx={{
        width: 260,
        minHeight: '100vh',
        borderRight: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Box sx={{ px: 2, py: 2.5, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" fontWeight="bold" color="primary">
          Rental
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Configuration & settings
        </Typography>
      </Box>
      <List disablePadding sx={{ py: 1 }}>
        {links.map((link) => (
          <ListItemButton
            key={link.to}
            selected={isActive(link.to)}
            onClick={() => navigate(link.to)}
            sx={{
              mx: 1,
              mb: 0.5,
              borderRadius: 1,
              '&.Mui-selected': {
                bgcolor: 'primary.light',
                color: 'primary.main',
                '&:hover': { bgcolor: 'primary.light' },
                '& .MuiListItemIcon-root': { color: 'primary.main' },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}>
              {link.icon}
            </ListItemIcon>
            <ListItemText
              primary={link.label}
              primaryTypographyProps={{
                fontSize: '0.9rem',
                fontWeight: isActive(link.to) ? 600 : 400,
              }}
            />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
} 