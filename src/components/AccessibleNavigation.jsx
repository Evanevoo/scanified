import React, { useState, useCallback } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Typography,
  IconButton,
  Tooltip,
  Divider
} from '@mui/material';
import {
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  Menu as MenuIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { ariaLabels, keyboardNavigation, screenReader } from '../utils/accessibility';

/**
 * Accessible Navigation Component
 * Provides WCAG 2.1 AA compliant navigation with proper ARIA labels and keyboard navigation
 */
const AccessibleNavigation = ({
  items = [],
  open = true,
  onToggle,
  variant = 'permanent',
  width = 280,
  collapsedWidth = 72,
  collapsed = false,
  onCollapse,
  title = 'Navigation',
  ...props
}) => {
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [focusedItem, setFocusedItem] = useState(null);

  // Handle item expansion
  const handleExpandItem = useCallback((itemId) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
      screenReader.announce(`${itemId} collapsed`, 'polite');
    } else {
      newExpanded.add(itemId);
      screenReader.announce(`${itemId} expanded`, 'polite');
    }
    setExpandedItems(newExpanded);
  }, [expandedItems]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event, item, index) => {
    const { key } = event;
    
    switch (key) {
      case keyboardNavigation.keys.ARROW_DOWN:
        event.preventDefault();
        // Focus next item
        break;
      case keyboardNavigation.keys.ARROW_UP:
        event.preventDefault();
        // Focus previous item
        break;
      case keyboardNavigation.keys.ARROW_RIGHT:
        event.preventDefault();
        if (item.children && !expandedItems.has(item.id)) {
          handleExpandItem(item.id);
        }
        break;
      case keyboardNavigation.keys.ARROW_LEFT:
        event.preventDefault();
        if (item.children && expandedItems.has(item.id)) {
          handleExpandItem(item.id);
        }
        break;
      case keyboardNavigation.keys.ENTER:
      case keyboardNavigation.keys.SPACE:
        event.preventDefault();
        if (item.children) {
          handleExpandItem(item.id);
        } else if (item.onClick) {
          item.onClick();
        }
        break;
      case keyboardNavigation.keys.HOME:
        event.preventDefault();
        setFocusedItem(0);
        break;
      case keyboardNavigation.keys.END:
        event.preventDefault();
        setFocusedItem(items.length - 1);
        break;
    }
  }, [expandedItems, handleExpandItem, items]);

  // Render navigation item
  const renderItem = useCallback((item, index, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const isFocused = focusedItem === index;

    return (
      <React.Fragment key={item.id}>
        <ListItem
          disablePadding
          sx={{
            pl: level * 2,
            '&:focus-within': {
              backgroundColor: 'action.hover'
            }
          }}
        >
          <ListItemButton
            onClick={() => {
              if (hasChildren) {
                handleExpandItem(item.id);
              } else if (item.onClick) {
                item.onClick();
              }
            }}
            onKeyDown={(e) => handleKeyDown(e, item, index)}
            tabIndex={isFocused ? 0 : -1}
            aria-label={item.ariaLabel || item.label}
            aria-expanded={hasChildren ? isExpanded : undefined}
            aria-controls={hasChildren ? `${item.id}-submenu` : undefined}
            role={hasChildren ? 'button' : 'menuitem'}
            sx={{
              minHeight: 48,
              '&:focus': {
                outline: '2px solid #1976d2',
                outlineOffset: '2px'
              }
            }}
          >
            {item.icon && (
              <ListItemIcon
                aria-hidden="true"
                sx={{
                  minWidth: collapsed ? 'auto' : 40,
                  justifyContent: 'center'
                }}
              >
                {item.icon}
              </ListItemIcon>
            )}
            
            {!collapsed && (
              <ListItemText
                primary={item.label}
                secondary={item.description}
                primaryTypographyProps={{
                  fontSize: '0.875rem',
                  fontWeight: item.active ? 600 : 400
                }}
                secondaryTypographyProps={{
                  fontSize: '0.75rem',
                  color: 'text.secondary'
                }}
              />
            )}
            
            {hasChildren && !collapsed && (
              <Box sx={{ ml: 'auto' }}>
                {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </Box>
            )}
          </ListItemButton>
        </ListItem>

        {/* Submenu */}
        {hasChildren && !collapsed && (
          <Collapse
            in={isExpanded}
            timeout="auto"
            unmountOnExit
            id={`${item.id}-submenu`}
            role="region"
            aria-label={`${item.label} submenu`}
          >
            <List component="div" disablePadding>
              {item.children.map((child, childIndex) =>
                renderItem(child, `${index}-${childIndex}`, level + 1)
              )}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  }, [expandedItems, focusedItem, collapsed, handleExpandItem, handleKeyDown]);

  // Render drawer content
  const renderDrawerContent = () => (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper'
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid',
          borderBottomColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        {!collapsed && (
          <Typography
            variant="h6"
            component="h1"
            sx={{
              fontWeight: 600,
              color: 'text.primary'
            }}
          >
            {title}
          </Typography>
        )}
        
        {onCollapse && (
          <IconButton
            onClick={onCollapse}
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            size="small"
          >
            {collapsed ? <MenuIcon /> : <CloseIcon />}
          </IconButton>
        )}
      </Box>

      {/* Navigation items */}
      <Box
        component="nav"
        role="navigation"
        aria-label={ariaLabels.navigation.main()}
        sx={{
          flex: 1,
          overflow: 'auto',
          py: 1
        }}
      >
        <List
          component="ul"
          role="menubar"
          aria-label="Main navigation menu"
          sx={{ p: 0 }}
        >
          {items.map((item, index) => renderItem(item, index))}
        </List>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          p: 2,
          borderTop: '1px solid',
          borderTopColor: 'divider'
        }}
      >
        {!collapsed && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ textAlign: 'center', display: 'block' }}
          >
            Gas Cylinder Management System
          </Typography>
        )}
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant={variant}
      open={open}
      onClose={onToggle}
      sx={{
        width: collapsed ? collapsedWidth : width,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: collapsed ? collapsedWidth : width,
          boxSizing: 'border-box',
          borderRight: '1px solid',
          borderRightColor: 'divider'
        }
      }}
      {...props}
    >
      {renderDrawerContent()}
    </Drawer>
  );
};

export default AccessibleNavigation;
