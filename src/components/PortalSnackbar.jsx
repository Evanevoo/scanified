import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Snackbar from '@mui/material/Snackbar';

/**
 * Snackbar that renders in a portal above the sidebar.
 * Use this instead of MUI Snackbar for page-level notifications so they're never hidden under the sidebar.
 */
export default function PortalSnackbar({ containerId = 'notification-layer', ...props }) {
  const [container, setContainer] = useState(null);

  useEffect(() => {
    const el = document.getElementById(containerId);
    setContainer(el || document.body);
  }, [containerId]);

  if (!container) return <Snackbar {...props} />;

  const snackbar = <Snackbar {...props} sx={{ ...props.sx, zIndex: 99999 }} />;
  return createPortal(snackbar, container);
}
