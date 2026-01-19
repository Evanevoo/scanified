import React from 'react';
import { Button, useMediaQuery, useTheme } from '@mui/material';
import Touch3D from './Touch3D';

/**
 * MobileButton Component
 * Optimized button for mobile with proper touch targets (min 44x44px)
 */
export default function MobileButton({
  children,
  intensity = 'medium',
  fullWidth = false,
  size = 'medium',
  sx = {},
  ...props
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const mobileStyles = isMobile
    ? {
        minHeight: 48, // iOS/Android recommended touch target
        minWidth: 48,
        py: 1.5,
        px: 3,
        fontSize: '1rem',
        fontWeight: 600,
        borderRadius: 2,
        textTransform: 'none',
        // Better touch feedback
        '&:active': {
          transform: 'scale(0.97)',
        },
      }
    : {};

  // Extract onClick to pass to both Touch3D and Button
  const { onClick, ...buttonProps } = props;

  return (
    <Touch3D 
      intensity={isMobile ? 'light' : intensity}
      onClick={onClick}
      sx={{ display: 'inline-block', width: fullWidth ? '100%' : 'auto' }}
    >
      <Button
        fullWidth={fullWidth}
        size={size}
        onClick={onClick}
        sx={{
          ...mobileStyles,
          ...sx,
        }}
        {...buttonProps}
      >
        {children}
      </Button>
    </Touch3D>
  );
}

