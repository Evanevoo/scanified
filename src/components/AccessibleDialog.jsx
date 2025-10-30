import React, { useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box
} from '@mui/material';
import {
  Close as CloseIcon
} from '@mui/icons-material';
import { ariaLabels, focusManagement, screenReader } from '../utils/accessibility';

/**
 * Accessible Dialog Component
 * Provides WCAG 2.1 AA compliant dialog with proper focus management and ARIA labels
 */
const AccessibleDialog = ({
  open,
  onClose,
  title,
  children,
  actions,
  maxWidth = 'sm',
  fullWidth = true,
  fullScreen = false,
  disableEscapeKeyDown = false,
  disableBackdropClick = false,
  loading = false,
  ...props
}) => {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const titleRef = useRef(null);

  // Save focus when dialog opens
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement;
      screenReader.announce(ariaLabels.dialog.open(title), 'assertive');
    } else if (previousFocusRef.current) {
      focusManagement.restoreFocus(previousFocusRef.current);
      screenReader.announce(ariaLabels.dialog.close(title), 'assertive');
    }
  }, [open, title]);

  // Focus management
  useEffect(() => {
    if (open && dialogRef.current) {
      const cleanup = focusManagement.trapFocus(dialogRef.current);
      
      // Focus the title or first focusable element
      setTimeout(() => {
        if (titleRef.current) {
          titleRef.current.focus();
        } else {
          focusManagement.focus.first(dialogRef.current);
        }
      }, 100);

      return cleanup;
    }
  }, [open]);

  // Handle escape key
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape' && !disableEscapeKeyDown) {
      onClose();
    }
  }, [onClose, disableEscapeKeyDown]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((event) => {
    if (event.target === event.currentTarget && !disableBackdropClick) {
      onClose();
    }
  }, [onClose, disableBackdropClick]);

  // Handle close button
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <Dialog
      ref={dialogRef}
      open={open}
      onClose={handleBackdropClick}
      onKeyDown={handleKeyDown}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      fullScreen={fullScreen}
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
      role="dialog"
      {...props}
    >
      {/* Dialog title */}
      <DialogTitle
        id="dialog-title"
        ref={titleRef}
        tabIndex={-1}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pr: 1
        }}
      >
        <Typography variant="h6" component="h2">
          {title}
        </Typography>
        
        <IconButton
          onClick={handleClose}
          disabled={loading}
          aria-label={ariaLabels.button.close()}
          size="small"
          sx={{ ml: 1 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* Dialog content */}
      <DialogContent
        id="dialog-description"
        sx={{ pt: 2 }}
      >
        {children}
      </DialogContent>

      {/* Dialog actions */}
      {actions && (
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {actions}
        </DialogActions>
      )}
    </Dialog>
  );
};

export default AccessibleDialog;
