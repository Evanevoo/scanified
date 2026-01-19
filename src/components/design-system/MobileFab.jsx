import React from 'react';
import { Fab, useMediaQuery, useTheme } from '@mui/material';
import Touch3D from './Touch3D';

/**
 * MobileFab Component
 * Floating Action Button optimized for mobile with proper touch target
 */
export default function MobileFab({
  children,
  color = 'primary',
  sx = {},
  ...props
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Touch3D intensity="light">
      <Fab
        color={color}
        sx={{
          ...(isMobile && {
            width: 56,
            height: 56,
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          }),
          ...sx,
        }}
        {...props}
      >
        {children}
      </Fab>
    </Touch3D>
  );
}

