import React from 'react';
import { Box, Typography, Stack, Breadcrumbs, Link } from '@mui/material';
import { NavigateNext as NavigateNextIcon } from '@mui/icons-material';
import AnimatedSection from '../AnimatedSection';

/**
 * Modern Page Header Component
 * Provides consistent page headers with breadcrumbs
 */
export default function PageHeader({ 
  title, 
  subtitle, 
  breadcrumbs = [],
  actions,
  sx = {}
}) {
  return (
    <AnimatedSection animation="fadeInUp">
      <Box sx={{
        mb: 4,
        p: { xs: 2.5, sm: 3 },
        borderRadius: '24px',
        border: '1px solid rgba(255,255,255,0.8)',
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(14px)',
        boxShadow: '0 14px 40px rgba(99,102,241,0.08), 0 2px 12px rgba(15,23,42,0.04)',
        ...sx,
      }}>
        {breadcrumbs.length > 0 && (
          <Breadcrumbs
            separator={<NavigateNextIcon fontSize="small" />}
            sx={{ mb: 2 }}
          >
            {breadcrumbs.map((crumb, index) => (
              index === breadcrumbs.length - 1 ? (
                <Typography key={index} color="text.primary" fontWeight={600}>
                  {crumb.label}
                </Typography>
              ) : (
                <Link
                  key={index}
                  color="inherit"
                  href={crumb.to}
                  sx={{ 
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  {crumb.label}
                </Link>
              )
            ))}
          </Breadcrumbs>
        )}
        
        <Stack 
          direction={{ xs: 'column', sm: 'row' }} 
          justifyContent="space-between" 
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={2}
        >
          <Box>
            <Typography 
              variant="h3" 
              fontWeight={800} 
              sx={{ 
                mb: 1,
                fontSize: { xs: '2rem', md: '2.5rem' },
                background: 'linear-gradient(135deg, #40B5AD 0%, #8B7BA8 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          
          {actions && (
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {actions}
            </Box>
          )}
        </Stack>
      </Box>
    </AnimatedSection>
  );
}