import React from 'react';
import { Box, CircularProgress, Typography, Fade } from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';

const LoadingSpinner = ({ message = "Loading...", size = "large" }) => {
  const isFullscreen = size === "large";
  
  if (!isFullscreen) {
    return (
      <Fade in timeout={300}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 2,
          }}
        >
          <CircularProgress 
            size={24} 
            thickness={4}
            sx={{ 
              color: 'primary.main',
              '& .MuiCircularProgress-circle': {
                strokeLinecap: 'round',
              }
            }} 
          />
          {message && (
            <Typography variant="body2" sx={{ ml: 2, color: 'text.secondary' }}>
              {message}
            </Typography>
          )}
        </Box>
      </Fade>
    );
  }

  return (
    <Fade in timeout={500}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Animated background pattern */}
        <Box
          sx={{
            position: 'absolute',
            width: '200%',
            height: '200%',
            opacity: 0.1,
            background: `
              radial-gradient(circle at 20% 50%, white 2px, transparent 2px),
              radial-gradient(circle at 80% 50%, white 2px, transparent 2px),
              radial-gradient(circle at 40% 20%, white 1px, transparent 1px),
              radial-gradient(circle at 60% 80%, white 1px, transparent 1px)
            `,
            backgroundSize: '100px 100px, 100px 100px, 50px 50px, 50px 50px',
            animation: 'float 20s infinite linear',
            '@keyframes float': {
              '0%': { transform: 'translate(-50%, -50%) rotate(0deg)' },
              '100%': { transform: 'translate(-50%, -50%) rotate(360deg)' }
            }
          }}
        />

        {/* Logo/Icon */}
        <Box sx={{ mb: 4, position: 'relative' }}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
              backdropFilter: 'blur(10px)',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              animation: 'pulse 2s infinite ease-in-out',
              '@keyframes pulse': {
                '0%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(255, 255, 255, 0.4)' },
                '50%': { transform: 'scale(1.05)', boxShadow: '0 0 0 20px rgba(255, 255, 255, 0)' },
                '100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(255, 255, 255, 0)' }
              }
            }}
          >
            <QrCodeScannerIcon sx={{ fontSize: 40, color: 'white' }} />
          </Box>
          
          <CircularProgress 
            size={60} 
            thickness={3}
            sx={{ 
              color: 'white',
              position: 'absolute',
              top: 10,
              left: 10,
              '& .MuiCircularProgress-circle': {
                strokeLinecap: 'round',
              }
            }} 
          />
        </Box>

        {/* Loading text with typewriter effect */}
        <Typography 
          variant="h5" 
          sx={{ 
            fontWeight: 600, 
            opacity: 0.9,
            mb: 1,
            textAlign: 'center',
            animation: 'fadeInUp 0.8s ease-out 0.5s both',
            '@keyframes fadeInUp': {
              '0%': { opacity: 0, transform: 'translateY(20px)' },
              '100%': { opacity: 0.9, transform: 'translateY(0)' }
            }
          }}
        >
          {message}
        </Typography>
        
        <Typography 
          variant="h6" 
          sx={{ 
            fontWeight: 300, 
            opacity: 0.7,
            letterSpacing: '0.1em',
            animation: 'fadeInUp 0.8s ease-out 0.7s both',
          }}
        >
          SCANIFIED
        </Typography>

        {/* Loading dots */}
        <Box 
          sx={{ 
            display: 'flex', 
            gap: 0.5, 
            mt: 3,
            animation: 'fadeInUp 0.8s ease-out 0.9s both',
          }}
        >
          {[0, 1, 2].map((index) => (
            <Box
              key={index}
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: 'white',
                opacity: 0.6,
                animation: `bounce 1.4s infinite ease-in-out ${index * 0.16}s`,
                '@keyframes bounce': {
                  '0%, 80%, 100%': { 
                    transform: 'scale(0)',
                    opacity: 0.3
                  },
                  '40%': { 
                    transform: 'scale(1)',
                    opacity: 1
                  }
                }
              }}
            />
          ))}
        </Box>
      </Box>
    </Fade>
  );
};

export default LoadingSpinner; 