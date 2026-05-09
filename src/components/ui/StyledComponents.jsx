import React from 'react';
import {
  Card as MuiCard,
  Button as MuiButton,
  TextField as MuiTextField,
  Paper as MuiPaper,
  Chip as MuiChip,
  TableContainer as MuiTableContainer,
  Alert as MuiAlert,
  Box,
  Typography,
  styled
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { commonStyles } from '../../styles/theme';

// Styled Card Component (8px grid padding; minimal border + hover)
export const StyledCard = styled(MuiCard)(({ theme }) => ({
  ...commonStyles.card,
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  border: `1px solid ${theme.palette.divider}`,
  transition: theme.transitions.create(['box-shadow', 'border-color', 'transform'], {
    duration: theme.transitions.duration.shorter,
    easing: theme.transitions.easing.easeOut,
  }),
  '&:hover': {
    ...commonStyles.card['&:hover'],
    borderColor: alpha(theme.palette.primary.main, 0.28),
  },
}));

// Styled Section Component
export const Section = ({ title, children, ...props }) => (
  <Box sx={commonStyles.section} {...props}>
    {title && (
      <Typography sx={commonStyles.sectionTitle}>
        {title}
      </Typography>
    )}
    {children}
  </Box>
);

// Styled Button Components
export const PrimaryButton = styled(MuiButton)(({ theme }) => ({
  ...commonStyles.primaryButton
}));

export const SecondaryButton = styled(MuiButton)(({ theme }) => ({
  ...commonStyles.secondaryButton
}));

// Styled TextField
export const StyledTextField = styled(MuiTextField)(({ theme }) => ({
  ...commonStyles.textField
}));

// Status Chip Component
export const StatusChip = ({ status, label, ...props }) => (
  <MuiChip
    label={label || status}
    sx={commonStyles.statusChip(status.toLowerCase())}
    size="small"
    {...props}
  />
);

// Styled Table Container
export const StyledTableContainer = styled(MuiTableContainer)(({ theme }) => ({
  ...commonStyles.tableContainer
}));

// Page Header Component — glass panel for app shell consistency
export const PageHeader = ({ title, subtitle, actions }) => (
  <Box
    sx={{
      mb: 3,
      p: { xs: 2.25, sm: 2.75 },
      borderRadius: '24px',
      border: '1px solid rgba(255,255,255,0.8)',
      background: 'rgba(255,255,255,0.72)',
      backdropFilter: 'blur(14px)',
      boxShadow: '0 14px 40px rgba(99,102,241,0.08), 0 2px 12px rgba(15,23,42,0.04)',
    }}
  >
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 2,
        mb: subtitle ? 1 : 0,
      }}
    >
      <Typography
        variant="h4"
        component="h1"
        sx={{
          fontWeight: 700,
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
          flex: 1,
          minWidth: 0,
          background: 'linear-gradient(135deg, #40B5AD 0%, #8B7BA8 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        {title}
      </Typography>
      {actions && (
        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0, alignItems: 'center' }}>
          {actions}
        </Box>
      )}
    </Box>
    {subtitle && (
      <Typography
        variant="subtitle1"
        color="text.secondary"
        sx={{ fontWeight: 400, maxWidth: 'min(100%, 720px)', lineHeight: 1.55 }}
      >
        {subtitle}
      </Typography>
    )}
  </Box>
);

// Loading Card Component
export const LoadingCard = ({ message = 'Loading...' }) => (
  <StyledCard>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
      <Typography variant="body1" color="text.secondary">
        {message}
      </Typography>
    </Box>
  </StyledCard>
);

// Empty State Component
export const EmptyState = ({ 
  title = 'No data found', 
  subtitle,
  icon,
  action 
}) => (
  <StyledCard>
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      py: 6,
      px: 3,
      textAlign: 'center'
    }}>
      {icon && (
        <Box sx={{ mb: 2, color: 'text.secondary' }}>
          {icon}
        </Box>
      )}
      <Typography variant="h6" sx={{ mb: 1 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {subtitle}
        </Typography>
      )}
      {action}
    </Box>
  </StyledCard>
);

// Info Card Component
export const InfoCard = ({
  title,
  value,
  subtitle,
  icon,
  color = 'primary',
  trend,
}) => {
  const theme = useTheme();
  const paletteColor = theme.palette[color] ?? theme.palette.primary;

  return (
    <StyledCard>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
            {title}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, color: `${color}.main`, mb: 0.5, letterSpacing: '-0.02em' }}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {subtitle}
            </Typography>
          )}
          {trend && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1.5, gap: 0.5 }}>
              {trend}
            </Box>
          )}
        </Box>
        {icon && (
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              backgroundColor: alpha(paletteColor.main, 0.12),
              color: paletteColor.main,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: theme.transitions.create(['background-color', 'transform'], {
                duration: theme.transitions.duration.shorter,
              }),
              '&:hover': {
                backgroundColor: alpha(paletteColor.main, 0.18),
                transform: 'scale(1.04)',
              },
            }}
          >
            {icon}
          </Box>
        )}
      </Box>
    </StyledCard>
  );
};

// Form Section Component
export const FormSection = ({ title, children }) => (
  <Box sx={{ mb: 3 }}>
    {title && (
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        {title}
      </Typography>
    )}
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {children}
    </Box>
  </Box>
);

// Styled Alert Component
export const StyledAlert = styled(MuiAlert)(({ theme }) => ({
  borderRadius: 8,
  '&.MuiAlert-standardSuccess': {
    backgroundColor: theme.palette.success.light + '20',
    color: theme.palette.success.dark
  },
  '&.MuiAlert-standardError': {
    backgroundColor: theme.palette.error.light + '20',
    color: theme.palette.error.dark
  },
  '&.MuiAlert-standardWarning': {
    backgroundColor: theme.palette.warning.light + '20',
    color: theme.palette.warning.dark
  },
  '&.MuiAlert-standardInfo': {
    backgroundColor: theme.palette.info.light + '20',
    color: theme.palette.info.dark
  }
}));

// Action Bar Component
export const ActionBar = ({ children, ...props }) => (
  <Box 
    sx={{ 
      display: 'flex', 
      gap: 2, 
      alignItems: 'center',
      flexWrap: 'wrap',
      ...props.sx
    }}
    {...props}
  >
    {children}
  </Box>
);

// Grid Container Component
export const GridContainer = ({ children, columns = 3, gap = 3, ...props }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: {
        xs: '1fr',
        sm: columns === 2 ? 'repeat(2, 1fr)' : '1fr',
        md: `repeat(${columns}, 1fr)`
      },
      gap: gap,
      ...props.sx
    }}
    {...props}
  >
    {children}
  </Box>
);

export default {
  StyledCard,
  Section,
  PrimaryButton,
  SecondaryButton,
  StyledTextField,
  StatusChip,
  StyledTableContainer,
  PageHeader,
  LoadingCard,
  EmptyState,
  InfoCard,
  FormSection,
  StyledAlert,
  ActionBar,
  GridContainer
};
