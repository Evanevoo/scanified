import React from 'react';
import { Card } from '@mui/material';
import Touch3D from './Touch3D';

/**
 * Card3D Component
 * A Card component with built-in 3D touch effects
 */
export default function Card3D({
  children,
  intensity = 'medium',
  sx = {},
  ...props
}) {
  return (
    <Touch3D intensity={intensity} sx={{ width: '100%', height: '100%' }}>
      <Card
        sx={{
          p: 4,
          height: '100%',
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          transition: 'border-color 0.3s ease',
          '&:hover': {
            borderColor: 'primary.main',
          },
          ...sx,
        }}
        {...props}
      >
        {children}
      </Card>
    </Touch3D>
  );
}

