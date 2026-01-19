import React from 'react';
import { Box } from '@mui/material';

// Non-3D placeholder: preserves layout where `ThreeScene` was used but removes WebGL and three.js dependencies.
export default function ThreeScene() {
  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
        // subtle decorative gradient to keep the hero visually pleasant without 3D
        background: 'linear-gradient(180deg, rgba(59,130,246,0.06), rgba(30,41,59,0))',
      }}
      aria-hidden
    />
  );
}
