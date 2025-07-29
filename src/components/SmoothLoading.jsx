import React from 'react';
import { Box, Skeleton, Card, CardContent, Table, TableBody, TableCell, TableRow } from '@mui/material';

// Smooth skeleton loader for tables
export const TableSkeleton = ({ rows = 5, columns = 4 }) => (
  <Table>
    <TableBody>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <TableCell key={colIndex}>
              <Skeleton 
                variant="text" 
                width={colIndex === 0 ? '60%' : '80%'} 
                height={20}
                animation="wave"
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

// Smooth skeleton for cards
export const CardSkeleton = ({ count = 3 }) => (
  <Box display="flex" flexDirection="column" gap={2}>
    {Array.from({ length: count }).map((_, index) => (
      <Card key={index}>
        <CardContent>
          <Skeleton variant="text" width="40%" height={24} sx={{ mb: 1 }} />
          <Skeleton variant="text" width="80%" height={16} sx={{ mb: 1 }} />
          <Skeleton variant="text" width="60%" height={16} />
        </CardContent>
      </Card>
    ))}
  </Box>
);

// Smooth skeleton for statistics cards
export const StatsSkeleton = ({ count = 4 }) => (
  <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(250px, 1fr))" gap={2}>
    {Array.from({ length: count }).map((_, index) => (
      <Card key={index}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2}>
            <Skeleton variant="circular" width={40} height={40} />
            <Box flex={1}>
              <Skeleton variant="text" width="80%" height={32} />
              <Skeleton variant="text" width="60%" height={16} />
            </Box>
          </Box>
        </CardContent>
      </Card>
    ))}
  </Box>
);

// Smooth loading overlay
export const LoadingOverlay = ({ loading, children }) => (
  <Box position="relative">
    {children}
    {loading && (
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        bgcolor="rgba(255, 255, 255, 0.8)"
        display="flex"
        alignItems="center"
        justifyContent="center"
        zIndex={1000}
        sx={{
          backdropFilter: 'blur(2px)',
          transition: 'all 0.3s ease-in-out'
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            border: '3px solid #f3f3f3',
            borderTop: '3px solid #1976d2',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            '@keyframes spin': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' }
            }
          }}
        />
      </Box>
    )}
  </Box>
);

// Smooth fade-in animation
export const FadeIn = ({ children, delay = 0, duration = 300 }) => (
  <Box
    sx={{
      animation: `fadeIn ${duration}ms ease-in-out ${delay}ms both`,
      '@keyframes fadeIn': {
        '0%': { opacity: 0, transform: 'translateY(20px)' },
        '100%': { opacity: 1, transform: 'translateY(0)' }
      }
    }}
  >
    {children}
  </Box>
);

// Smooth slide-in animation
export const SlideIn = ({ children, direction = 'left', delay = 0, duration = 300 }) => {
  const getTransform = () => {
    switch (direction) {
      case 'left': return 'translateX(-20px)';
      case 'right': return 'translateX(20px)';
      case 'up': return 'translateY(-20px)';
      case 'down': return 'translateY(20px)';
      default: return 'translateX(-20px)';
    }
  };

  return (
    <Box
      sx={{
        animation: `slideIn ${duration}ms ease-in-out ${delay}ms both`,
        '@keyframes slideIn': {
          '0%': { opacity: 0, transform: getTransform() },
          '100%': { opacity: 1, transform: 'translate(0)' }
        }
      }}
    >
      {children}
    </Box>
  );
};

// Smooth scale animation
export const ScaleIn = ({ children, delay = 0, duration = 300 }) => (
  <Box
    sx={{
      animation: `scaleIn ${duration}ms ease-in-out ${delay}ms both`,
      '@keyframes scaleIn': {
        '0%': { opacity: 0, transform: 'scale(0.9)' },
        '100%': { opacity: 1, transform: 'scale(1)' }
      }
    }}
  >
    {children}
  </Box>
);

// Smooth button with loading state
export const SmoothButton = ({ 
  loading, 
  children, 
  onClick, 
  disabled, 
  variant = 'contained',
  ...props 
}) => {
  const handleClick = async (e) => {
    if (loading || disabled) return;
    
    // Add ripple effect
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple');
    
    button.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 600);
    
    if (onClick) {
      await onClick(e);
    }
  };

  return (
    <Box
      component="button"
      onClick={handleClick}
      disabled={loading || disabled}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        px: 2,
        py: 1,
        border: variant === 'outlined' ? '1px solid #1976d2' : 'none',
        bgcolor: variant === 'contained' ? '#1976d2' : 'transparent',
        color: variant === 'contained' ? 'white' : '#1976d2',
        borderRadius: 1,
        cursor: loading || disabled ? 'not-allowed' : 'pointer',
        opacity: loading || disabled ? 0.6 : 1,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          bgcolor: variant === 'contained' ? '#1565c0' : 'rgba(25, 118, 210, 0.04)',
          transform: loading || disabled ? 'none' : 'translateY(-1px)',
          boxShadow: loading || disabled ? 'none' : '0 4px 8px rgba(0,0,0,0.1)'
        },
        '&:active': {
          transform: 'translateY(0)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        },
        '& .ripple': {
          position: 'absolute',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.6)',
          animation: 'ripple 0.6s linear',
          pointerEvents: 'none'
        },
        '@keyframes ripple': {
          '0%': {
            transform: 'scale(0)',
            opacity: 1
          },
          '100%': {
            transform: 'scale(4)',
            opacity: 0
          }
        }
      }}
      {...props}
    >
      {loading ? (
        <Box display="flex" alignItems="center" gap={1}>
          <Box
            sx={{
              width: 16,
              height: 16,
              border: '2px solid transparent',
              borderTop: '2px solid currentColor',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}
          />
          Loading...
        </Box>
      ) : (
        children
      )}
    </Box>
  );
};

// Smooth progress bar
export const SmoothProgress = ({ value, max = 100, color = '#1976d2' }) => (
  <Box
    sx={{
      width: '100%',
      height: 8,
      bgcolor: '#f5f5f5',
      borderRadius: 4,
      overflow: 'hidden',
      position: 'relative'
    }}
  >
    <Box
      sx={{
        height: '100%',
        bgcolor: color,
        borderRadius: 4,
        width: `${(value / max) * 100}%`,
        transition: 'width 0.3s ease-in-out',
        position: 'relative',
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
          animation: 'shimmer 1.5s infinite'
        },
        '@keyframes shimmer': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        }
      }}
    />
  </Box>
);

export default {
  TableSkeleton,
  CardSkeleton,
  StatsSkeleton,
  LoadingOverlay,
  FadeIn,
  SlideIn,
  ScaleIn,
  SmoothButton,
  SmoothProgress
}; 