import React from 'react';
import {
  Box,
  Grid,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';

const ResponsiveGrid = ({ 
  items, 
  renderItem, 
  columns = { xs: 1, sm: 2, md: 3, lg: 4 },
  spacing = 3,
  title,
  subtitle,
  actions,
  onItemClick,
  emptyMessage = 'No items found',
  loading = false
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'lg'));

  // Responsive column configuration
  const getResponsiveColumns = () => {
    if (isMobile) {
      return { xs: 1 };
    } else if (isTablet) {
      return { xs: 1, sm: 2, md: 3 };
    }
    return columns;
  };

  const renderDefaultItem = (item, index) => (
    <Card 
      key={item.id || index}
      sx={{ 
        height: '100%',
        cursor: onItemClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease-in-out',
        '&:hover': onItemClick ? {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[8]
        } : {}
      }}
      onClick={() => onItemClick && onItemClick(item)}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
              {item.name || item.title || 'Untitled'}
            </Typography>
            {item.subtitle && (
              <Typography variant="body2" color="text.secondary">
                {item.subtitle}
              </Typography>
            )}
          </Box>
          
          <Stack direction="row" spacing={1} alignItems="center">
            {item.status && (
              <Chip
                label={item.status}
                size="small"
                color={item.statusColor || 'default'}
                variant="outlined"
              />
            )}
            
            {item.actions && (
              <IconButton size="small">
                <MoreVertIcon />
              </IconButton>
            )}
          </Stack>
        </Box>

        {/* Content */}
        <Box sx={{ mb: 2 }}>
          {item.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {item.description}
            </Typography>
          )}
          
          {item.metadata && (
            <Stack spacing={0.5}>
              {Object.entries(item.metadata).slice(0, 3).map(([key, value]) => (
                <Typography key={key} variant="caption" color="text.secondary">
                  <strong>{key}:</strong> {value}
                </Typography>
              ))}
            </Stack>
          )}
        </Box>

        {/* Footer */}
        {item.footer && (
          <Box sx={{ mt: 'auto', pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
            {item.footer}
          </Box>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box>
        <Grid container spacing={spacing}>
          {[...Array(6)].map((_, index) => (
            <Grid item {...getResponsiveColumns()} key={index}>
              <Card sx={{ height: 200 }}>
                <CardContent sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  height: '100%'
                }}>
                  <Typography color="text.secondary">Loading...</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (!items || items.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
          {emptyMessage}
        </Typography>
        {actions && (
          <Box sx={{ mt: 3 }}>
            {actions}
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      {(title || subtitle || actions) && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
            <Box>
              {title && (
                <Typography variant="h5" fontWeight={600} sx={{ mb: 0.5 }}>
                  {title}
                </Typography>
              )}
              {subtitle && (
                <Typography variant="body1" color="text.secondary">
                  {subtitle}
                </Typography>
              )}
            </Box>
            
            {actions && (
              <Box>
                {actions}
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* Grid */}
      <Grid container spacing={spacing}>
        {items.map((item, index) => (
          <Grid item {...getResponsiveColumns()} key={item.id || index}>
            {renderItem ? renderItem(item, index) : renderDefaultItem(item, index)}
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ResponsiveGrid;
