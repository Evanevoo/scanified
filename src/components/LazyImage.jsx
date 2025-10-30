import React, { useState, useRef, useEffect } from 'react';
import { Box, CircularProgress, Skeleton } from '@mui/material';
import { useProgressiveImage } from '../hooks/useLazyLoading';

const LazyImage = ({
  src,
  alt = '',
  placeholder,
  width = '100%',
  height = 'auto',
  objectFit = 'cover',
  borderRadius = 0,
  loading = 'lazy',
  onLoad,
  onError,
  sx = {},
  ...props
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [imageSrc, setImageRef] = useProgressiveImage(src, placeholder);

  const handleLoad = () => {
    setLoaded(true);
    onLoad && onLoad();
  };

  const handleError = () => {
    setError(true);
    onError && onError();
  };

  return (
    <Box
      sx={{
        position: 'relative',
        width,
        height,
        borderRadius,
        overflow: 'hidden',
        backgroundColor: 'grey.100',
        ...sx
      }}
      {...props}
    >
      {/* Loading skeleton */}
      {!loaded && !error && (
        <Skeleton
          variant="rectangular"
          width="100%"
          height="100%"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 1
          }}
        />
      )}

      {/* Error placeholder */}
      {error && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'grey.200',
            color: 'text.secondary',
            fontSize: '0.875rem'
          }}
        >
          Failed to load image
        </Box>
      )}

      {/* Actual image */}
      {!error && (
        <img
          ref={setImageRef}
          src={imageSrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          loading={loading}
          style={{
            width: '100%',
            height: '100%',
            objectFit,
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out'
          }}
        />
      )}
    </Box>
  );
};

export default LazyImage;
