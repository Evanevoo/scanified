import React from 'react';
import { Alert, AlertTitle } from '@mui/material';

/**
 * Shown on owner portal pages that use mock or simulated data.
 */
export default function OwnerPreviewBanner({ title = 'Preview only', children }) {
  return (
    <Alert severity="info" sx={{ mb: 3 }}>
      <AlertTitle>{title}</AlertTitle>
      {children || (
        <>
          This section does not yet use live production data. Metrics and events shown here are
          placeholders or samples — do not use them for operational decisions.
        </>
      )}
    </Alert>
  );
}
