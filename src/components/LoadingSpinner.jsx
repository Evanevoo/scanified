import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

/**
 * Reusable loading spinner component
 * @param {Object} props - Component props
 * @param {string} props.message - Optional loading message
 * @param {string} props.size - Size of the spinner ('small', 'medium', 'large')
 * @param {boolean} props.fullScreen - Whether to display full screen
 * @returns {JSX.Element} Loading spinner component
 */
const LoadingSpinner = ({ 
  message = 'Loading...', 
  size = 'medium', 
  fullScreen = true 
}) => {
  const sizeMap = {
    small: 24,
    medium: 40,
    large: 60
  };

  const spinnerSize = sizeMap[size] || sizeMap.medium;

  const content = (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      gap={2}
    >
      <CircularProgress 
        size={spinnerSize} 
        thickness={4}
        sx={{ color: 'primary.main' }}
      />
      {message && (
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ fontWeight: 500 }}
        >
          {message}
        </Typography>
      )}
    </Box>
  );

  if (fullScreen) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        bgcolor="background.default"
      >
        {content}
      </Box>
    );
  }

  return content;
};

export default LoadingSpinner; 