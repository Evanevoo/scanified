import React from 'react';
import { Card, Box } from '@mui/material';

/**
 * Modern 3D Card Component
 * Provides consistent 3D hover effects across the application
 */
export default function ModernCard({ 
  children, 
  sx = {}, 
  hover3D = true,
  perspective = '1000px',
  ...props 
}) {
  return (
    <Card
      sx={{
        p: 4,
        borderRadius: 4,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        transformStyle: 'preserve-3d',
        position: 'relative',
        ...(hover3D && {
          '&:hover': {
            transform: `perspective(${perspective}) rotateY(5deg) rotateX(-5deg) translateY(-8px) scale(1.02)`,
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
            borderColor: 'primary.main',
          }
        }),
        ...sx
      }}
      {...props}
    >
      {children}
    </Card>
  );
}

