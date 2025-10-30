import React from 'react';
import { Button, IconButton } from '@mui/material';
import { ariaLabels, keyboardNavigation } from '../utils/accessibility';

/**
 * Accessible Button Component
 * Provides WCAG 2.1 AA compliant button with proper ARIA labels and keyboard navigation
 */
const AccessibleButton = ({
  children,
  variant = 'contained',
  color = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon = false,
  ariaLabel,
  ariaDescribedBy,
  ariaExpanded,
  ariaControls,
  onClick,
  onKeyDown,
  type = 'button',
  fullWidth = false,
  startIcon,
  endIcon,
  ...props
}) => {
  // Generate appropriate ARIA label
  const getAriaLabel = () => {
    if (ariaLabel) return ariaLabel;
    if (typeof children === 'string') return children;
    return 'Button';
  };

  // Handle keyboard navigation
  const handleKeyDown = (event) => {
    // Default keyboard behavior for buttons
    if (event.key === keyboardNavigation.keys.ENTER || event.key === keyboardNavigation.keys.SPACE) {
      if (!disabled && !loading && onClick) {
        event.preventDefault();
        onClick(event);
      }
    }
    
    // Call custom key handler
    if (onKeyDown) {
      onKeyDown(event);
    }
  };

  // Common accessibility props
  const accessibilityProps = {
    'aria-label': getAriaLabel(),
    'aria-disabled': disabled || loading,
    'aria-describedby': ariaDescribedBy,
    'aria-expanded': ariaExpanded,
    'aria-controls': ariaControls,
    role: 'button',
    tabIndex: disabled ? -1 : 0,
    onKeyDown: handleKeyDown
  };

  // Loading state
  if (loading) {
    accessibilityProps['aria-label'] = 'Loading...';
  }

  // Icon button variant
  if (icon) {
    return (
      <IconButton
        {...accessibilityProps}
        {...props}
        variant={variant}
        color={color}
        size={size}
        disabled={disabled || loading}
        onClick={onClick}
        type={type}
      >
        {children}
      </IconButton>
    );
  }

  // Regular button variant
  return (
    <Button
      {...accessibilityProps}
      {...props}
      variant={variant}
      color={color}
      size={size}
      disabled={disabled || loading}
      onClick={onClick}
      type={type}
      fullWidth={fullWidth}
      startIcon={startIcon}
      endIcon={endIcon}
    >
      {children}
    </Button>
  );
};

export default AccessibleButton;
