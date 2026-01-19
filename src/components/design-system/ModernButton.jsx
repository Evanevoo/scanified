import React from 'react';
import { Button } from '@mui/material';
import { ArrowForward as ArrowForwardIcon } from '@mui/icons-material';

/**
 * Modern 3D Button Component
 * High-contrast CTA with 3D hover effects
 */
export default function ModernButton({ 
  children, 
  variant = 'contained',
  size = 'large',
  showArrow = false,
  sx = {},
  ...props 
}) {
  return (
    <Button
      variant={variant}
      size={size}
      endIcon={showArrow ? <ArrowForwardIcon /> : undefined}
      sx={{
        py: variant === 'contained' ? 2.5 : 2,
        px: 6,
        fontSize: '1.1rem',
        fontWeight: 700,
        textTransform: 'none',
        borderRadius: 3,
        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        transform: 'perspective(1200px) rotateY(0deg)',
        ...(variant === 'contained' && {
          boxShadow: '0 8px 25px rgba(59, 130, 246, 0.3)',
          '&:hover': {
            transform: 'perspective(1200px) rotateY(0deg) rotateX(0deg) translateZ(20px) scale(1.05)',
            boxShadow: '0 12px 35px rgba(59, 130, 246, 0.5)',
          }
        }),
        ...(variant === 'outlined' && {
          borderWidth: 2,
          '&:hover': {
            borderWidth: 2,
            transform: 'translateY(-3px)',
            bgcolor: 'action.hover'
          }
        }),
        ...sx
      }}
      {...props}
    >
      {children}
    </Button>
  );
}

