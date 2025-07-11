import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const LoadingSpinner = ({ message = "Loading..." }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}
    >
      <Box sx={{ mb: 3 }}>
        <CircularProgress 
          size={60} 
          thickness={4}
          sx={{ 
            color: 'white',
            '& .MuiCircularProgress-circle': {
              strokeLinecap: 'round',
            }
          }} 
        />
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 300, opacity: 0.9 }}>
        {message}
      </Typography>
      <Typography variant="body2" sx={{ mt: 1, opacity: 0.7 }}>
        LessAnnoyingScan
      </Typography>
    </Box>
  );
};

export default LoadingSpinner; 