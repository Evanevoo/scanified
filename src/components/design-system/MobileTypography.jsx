import React from 'react';
import { Typography, useMediaQuery, useTheme } from '@mui/material';

/**
 * MobileTypography Component
 * Responsive typography optimized for mobile readability
 */
export default function MobileTypography({
  children,
  variant,
  mobileVariant,
  sx = {},
  ...props
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Map variants for mobile
  const variantMap = {
    h1: { mobile: 'h2', desktop: 'h1' },
    h2: { mobile: 'h3', desktop: 'h2' },
    h3: { mobile: 'h4', desktop: 'h3' },
    h4: { mobile: 'h5', desktop: 'h4' },
    h5: { mobile: 'h6', desktop: 'h5' },
    h6: { mobile: 'subtitle1', desktop: 'h6' },
  };

  const finalVariant = isMobile
    ? (mobileVariant || variantMap[variant]?.mobile || variant)
    : (variant || variantMap[variant]?.desktop || 'body1');

  return (
    <Typography
      variant={finalVariant}
      sx={{
        // Mobile optimizations
        ...(isMobile && {
          lineHeight: 1.5,
          letterSpacing: 'normal',
        }),
        ...sx,
      }}
      {...props}
    >
      {children}
    </Typography>
  );
}

