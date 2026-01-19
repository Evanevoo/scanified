import React, { useState } from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';

/**
 * Touch3D Component
 * Adds 3D touch/hover effects to any element
 * Works on both desktop (hover) and mobile (touch)
 * Optimized for mobile touch targets
 */
export default function Touch3D({
  children,
  intensity = 'medium', // 'light', 'medium', 'strong'
  perspective = 1000,
  enablePress = true,
  sx = {},
  ...props
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const intensityMap = {
    light: {
      hover: { translateY: -4, rotateY: 2, rotateX: -2, scale: 1.01 },
      press: { translateY: 2, scale: 0.98 },
      shadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
      shadowHover: '0 16px 32px rgba(0, 0, 0, 0.18)',
    },
    medium: {
      hover: { translateY: -8, rotateY: 5, rotateX: -5, scale: 1.02 },
      press: { translateY: 4, scale: 0.96 },
      shadow: '0 12px 32px rgba(0, 0, 0, 0.15)',
      shadowHover: '0 24px 48px rgba(0, 0, 0, 0.25)',
    },
    strong: {
      hover: { translateY: -12, rotateY: 8, rotateX: -8, scale: 1.04 },
      press: { translateY: 6, scale: 0.94 },
      shadow: '0 16px 40px rgba(0, 0, 0, 0.18)',
      shadowHover: '0 32px 64px rgba(0, 0, 0, 0.3)',
    },
  };

  const config = intensityMap[intensity] || intensityMap.medium;

  const getTransform = () => {
    if (isPressed && enablePress) {
      return `perspective(${perspective}px) translateY(${config.press.translateY}px) scale(${config.press.scale})`;
    }
    if (isHovered) {
      return `perspective(${perspective}px) rotateY(${config.hover.rotateY}deg) rotateX(${config.hover.rotateX}deg) translateY(${config.hover.translateY}px) scale(${config.hover.scale})`;
    }
    return `perspective(${perspective}px) rotateY(0deg) rotateX(0deg) translateY(0px) scale(1)`;
  };

  const getBoxShadow = () => {
    if (isPressed && enablePress) {
      return config.shadow;
    }
    if (isHovered) {
      return config.shadowHover;
    }
    return config.shadow;
  };

  return (
    <Box
      onMouseEnter={() => !isMobile && setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => !isMobile && enablePress && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onTouchStart={(e) => {
        if (enablePress) {
          setIsPressed(true);
          // Don't prevent default for interactive elements (buttons, links)
          // This allows click events to work properly
          const target = e.target;
          const isInteractive = target.tagName === 'BUTTON' || 
                               target.tagName === 'A' || 
                               target.closest('button') || 
                               target.closest('a') ||
                               target.closest('[role="button"]');
          if (!isInteractive && !props.onClick) {
            e.preventDefault();
          }
        }
      }}
      onClick={(e) => {
        // Forward click events if Touch3D has its own onClick
        // Otherwise, let child elements handle their own clicks
        if (props.onClick) {
          props.onClick(e);
        }
      }}
      onTouchEnd={() => setIsPressed(false)}
      onTouchCancel={() => setIsPressed(false)}
      sx={{
        transformStyle: 'preserve-3d',
        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        transform: getTransform(),
        boxShadow: getBoxShadow(),
        cursor: 'pointer',
        // Mobile optimizations
        ...(isMobile && {
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation', // Prevent double-tap zoom
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }),
        ...sx,
      }}
      {...props}
    >
      {children}
    </Box>
  );
}

