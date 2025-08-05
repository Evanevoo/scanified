import React from 'react';
import { Box } from '@mui/material';
import { useScrollAnimation, getAnimationStyles } from '../hooks/useScrollAnimation';

export default function AnimatedSection({ 
  children, 
  animation = 'fadeInUp',
  delay = 0,
  threshold = 0.1,
  ...props 
}) {
  const { ref, isVisible } = useScrollAnimation({ threshold });
  
  const animationStyles = getAnimationStyles(animation, isVisible);
  
  return (
    <Box
      ref={ref}
      sx={{
        ...animationStyles,
        transitionDelay: `${delay}s`,
        ...props.sx
      }}
      {...props}
    >
      {children}
    </Box>
  );
}