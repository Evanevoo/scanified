import React from 'react';
import { Stack, useMediaQuery, useTheme } from '@mui/material';

/**
 * MobileStack Component
 * Responsive stack with mobile-optimized spacing
 */
export default function MobileStack({
  children,
  spacing = { xs: 2, sm: 3 },
  direction = { xs: 'column', sm: 'row' },
  sx = {},
  ...props
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Stack
      spacing={isMobile ? spacing.xs : spacing.sm || spacing}
      direction={isMobile ? direction.xs : direction.sm || direction}
      sx={{
        width: '100%',
        ...sx,
      }}
      {...props}
    >
      {children}
    </Stack>
  );
}

