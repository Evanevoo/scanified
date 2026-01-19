import React from 'react';
import { Box, Typography } from '@mui/material';

export default function ThreeVisionPanel() {
  return (
    <Box sx={{ position: 'absolute', zIndex: 3, right: { xs: 12, md: '10%' }, top: { xs: '40%', md: '30%' }, width: { xs: 220, md: 360 }, pointerEvents: 'auto' }}>
      <Box sx={{ perspective: 1200, transformStyle: 'preserve-3d' }}>
        <Box sx={{ position: 'relative', width: '100%', height: 220 }}>
          {[0,1,2].map((i) => (
            <Box
              key={i}
              sx={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: '100%',
                height: '100%',
                borderRadius: 3,
                transformStyle: 'preserve-3d',
                background: `linear-gradient(135deg, rgba(255,255,255,${0.06 + i*0.03}), rgba(255,255,255,${0.02 + i*0.01}))`,
                boxShadow: `0 ${8 + i*4}px ${30 + i*10}px rgba(2,6,23,${0.08 + i*0.02})`,
                transform: `rotateY(${6 - i*6}deg) translateZ(${(i+1)*6}px) translateY(${i*6}px)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255,255,255,0.06)',
                transition: 'transform 0.9s ease',
                '@keyframes tilt': {
                  '0%': { transform: `rotateY(${6 - i*6}deg) translateZ(${(i+1)*6}px) translateY(${i*6}px)` },
                  '50%': { transform: `rotateY(${-(6 - i*6)}deg) translateZ(${(i+1)*6 + 8}px) translateY(${i*6 - 6}px)` },
                  '100%': { transform: `rotateY(${6 - i*6}deg) translateZ(${(i+1)*6}px) translateY(${i*6}px)` }
                },
                animation: 'tilt 8s ease-in-out infinite'
              }}
            >
              <Box sx={{ textAlign: 'center', px: 2 }}>
                <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>{i === 0 ? '3D Vision' : i === 1 ? 'Real-time' : 'Spatial UI'}</Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>{i === 0 ? 'Spatial previews of your assets' : i === 1 ? 'Live sync across devices' : 'Intuitive gestures & maps'}</Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
