import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, List, ListItemButton, ListItemIcon, ListItemText, Typography
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Search as SearchIcon,
  Link as LinkIcon,
  Map as MapIcon,
} from '@mui/icons-material';

const links = [
  { to: '/rental/classes', label: 'Standard rate table', icon: <AssignmentIcon /> },
  { to: '/rental/assign-asset-types', label: 'Map products to classes', icon: <LinkIcon /> },
  { to: '/rental/tax-regions', label: 'Rental tax regions', icon: <MapIcon /> },
  { to: '/rental/invoice-search', label: 'Rental invoice search', icon: <SearchIcon /> },
];

export default function RentalSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/rental/classes') return location.pathname === path || location.pathname.startsWith(`${path}/`);
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
          Rates, tax &amp; class mapping
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
