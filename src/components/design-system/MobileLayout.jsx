import React from 'react';
import { Box, Container, useMediaQuery, useTheme } from '@mui/material';

/**
 * MobileLayout Component
 * Responsive container optimized for mobile devices
 */
export default function MobileLayout({
  children,
  maxWidth = 'lg',
  sx = {},
  ...props
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  return (
    <Container
      maxWidth={maxWidth}
      sx={{
        px: isMobile ? 2 : isTablet ? 3 : 4,
        py: isMobile ? 2 : 3,
        ...sx,
      }}
      {...props}
    >
      {children}
    </Container>
  );
}

