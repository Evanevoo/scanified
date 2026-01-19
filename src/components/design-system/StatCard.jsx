import React from 'react';
import { Paper, Box, Typography } from '@mui/material';
import AnimatedSection from '../AnimatedSection';

/**
 * Modern Stat Card Component
 * Displays statistics with 3D hover effects
 */
export default function StatCard({ 
  label, 
  value, 
  icon, 
  color = '#3B82F6',
  delay = 0,
  ...props 
}) {
  return (
    <AnimatedSection animation="fadeInUp" delay={delay}>
      <Paper
        elevation={0}
        sx={{
          p: 4,
          textAlign: 'center',
          borderRadius: 4,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          transformStyle: 'preserve-3d',
          position: 'relative',
          '&:hover': {
            transform: 'perspective(1000px) rotateY(5deg) rotateX(-5deg) translateY(-8px) scale(1.02)',
            boxShadow: `0 20px 40px ${color}40, 0 0 0 1px ${color}20`,
            borderColor: color,
            '& .stat-icon-3d': {
              transform: 'perspective(1000px) rotateY(0deg) rotateX(0deg) translateZ(20px)',
            },
            '& .stat-value-3d': {
              transform: 'translateZ(10px)',
            }
          },
          ...props.sx
        }}
        {...props}
      >
        <Box 
          className="stat-icon-3d"
          sx={{ 
            display: 'inline-flex', 
            p: 2, 
            borderRadius: 3, 
            bgcolor: `${color}15`,
            color: color,
            mb: 2,
            transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          }}
        >
          {React.cloneElement(icon, { sx: { fontSize: 36 } })}
        </Box>
        <Typography 
          className="stat-value-3d"
          variant="h3" 
          fontWeight={800} 
          sx={{ 
            mb: 0.5, 
            color: color,
            transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          }}
        >
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary" fontWeight={600}>
          {label}
        </Typography>
      </Paper>
    </AnimatedSection>
  );
}

