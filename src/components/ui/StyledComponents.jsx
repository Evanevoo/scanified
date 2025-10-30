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
import { commonStyles } from '../../styles/theme';

// Styled Card Component
export const StyledCard = styled(MuiCard)(({ theme }) => ({
  ...commonStyles.card,
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3)
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

// Page Header Component
export const PageHeader = ({ title, subtitle, actions }) => (
  <Box sx={{ mb: 4 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      {actions && (
        <Box sx={{ display: 'flex', gap: 1 }}>
          {actions}
        </Box>
      )}
    </Box>
    {subtitle && (
      <Typography variant="body2" color="text.secondary">
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
  trend 
}) => (
  <StyledCard>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {title}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 700, color: `${color}.main`, mb: 0.5 }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
        {trend && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            {trend}
          </Box>
        )}
      </Box>
      {icon && (
        <Box sx={{ 
          p: 1.5, 
          borderRadius: 2, 
          backgroundColor: `${color}.light`,
          color: `${color}.main`,
          opacity: 0.1
        }}>
          {icon}
        </Box>
      )}
    </Box>
  </StyledCard>
);

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
