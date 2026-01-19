import React from 'react';
import { Card, CardContent, useMediaQuery, useTheme } from '@mui/material';
import Touch3D from './Touch3D';

/**
 * MobileCard Component
 * Optimized card component for mobile devices with proper touch targets
 */
export default function MobileCard({
  children,
  intensity = 'medium',
  onClick,
  sx = {},
  ...props
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Touch3D intensity={isMobile ? 'light' : intensity}>
      <Card
        onClick={onClick}
        sx={{
          width: '100%',
          borderRadius: isMobile ? 2 : 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          cursor: onClick ? 'pointer' : 'default',
          // Mobile optimizations
          ...(isMobile && {
            minHeight: 120, // Ensure adequate touch target
            p: 2,
            '&:active': {
              bgcolor: 'action.selected',
            },
          }),
          // Desktop styles
          ...(!isMobile && {
            p: 4,
            transition: 'border-color 0.3s ease',
            '&:hover': {
              borderColor: 'primary.main',
            },
          }),
          ...sx,
        }}
        {...props}
      >
        {children}
      </Card>
    </Touch3D>
  );
}

