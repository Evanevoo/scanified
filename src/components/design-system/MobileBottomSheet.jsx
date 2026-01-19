import React from 'react';
import {
  Drawer,
  Box,
  IconButton,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

/**
 * MobileBottomSheet Component
 * Bottom sheet drawer optimized for mobile devices
 */
export default function MobileBottomSheet({
  open,
  onClose,
  title,
  children,
  height = '80vh',
  sx = {},
  ...props
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Drawer
      anchor={isMobile ? 'bottom' : 'right'}
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          ...(isMobile && {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: height,
            height: 'auto',
          }),
          ...(!isMobile && {
            width: 400,
            maxWidth: '90vw',
          }),
          ...sx,
        },
      }}
      {...props}
    >
      <Box sx={{ p: 2 }}>
        {title && (
          <>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 2,
              }}
            >
              <Box component="h2" sx={{ m: 0, fontSize: '1.25rem', fontWeight: 600 }}>
                {title}
              </Box>
              <IconButton onClick={onClose} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
            <Divider sx={{ mb: 2 }} />
          </>
        )}
        {children}
      </Box>
    </Drawer>
  );
}

