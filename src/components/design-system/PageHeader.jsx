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
      <Box sx={{ mb: 4, ...sx }}>
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
                background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
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

