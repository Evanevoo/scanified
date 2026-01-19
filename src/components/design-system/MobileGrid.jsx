import React from 'react';
import { Grid, useMediaQuery, useTheme } from '@mui/material';

/**
 * MobileGrid Component
 * Responsive grid optimized for mobile layouts
 */
export default function MobileGrid({
  children,
  spacing = { xs: 2, sm: 3 },
  columns = { xs: 1, sm: 2, md: 3 },
  sx = {},
  ...props
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Grid
      container
      spacing={isMobile ? spacing.xs : spacing.sm || spacing}
      sx={{
        // Mobile optimizations
        ...(isMobile && {
          '& .MuiGrid-item': {
            paddingTop: '12px !important',
          },
        }),
        ...sx,
      }}
      {...props}
    >
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;
        
        return React.cloneElement(child, {
          ...child.props,
          xs: child.props.xs || columns.xs,
          sm: child.props.sm || columns.sm,
          md: child.props.md || columns.md,
          lg: child.props.lg || columns.lg,
        });
      })}
    </Grid>
  );
}

