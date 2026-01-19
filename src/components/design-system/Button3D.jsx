import React from 'react';
import { Button } from '@mui/material';
import Touch3D from './Touch3D';

/**
 * Button3D Component
 * A Button component with built-in 3D touch effects
 */
export default function Button3D({
  children,
  intensity = 'medium',
  sx = {},
  ...props
}) {
  return (
    <Touch3D intensity={intensity}>
      <Button
        sx={{
          py: 2.5,
          px: 6,
          fontSize: '1.1rem',
          fontWeight: 700,
          textTransform: 'none',
          borderRadius: 3,
          ...sx,
        }}
        {...props}
      >
        {children}
      </Button>
    </Touch3D>
  );
}

