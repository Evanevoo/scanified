import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Chip,
  LinearProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function CylinderLimitDialog({ 
  open, 
  onClose, 
  limitCheck, 
  message, 
  upgradeSuggestion,
  onProceed = null,
  proceedText = "Continue"
}) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    navigate('/billing');
    onClose();
  };

  if (!limitCheck) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          {message?.type === 'error' && '⚠️'}
          {message?.type === 'warning' && '⚠️'}
          {message?.type === 'success' && '✅'}
          {message?.title || 'Cylinder Limit Check'}
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2}>
          {/* Main Message */}
          <Alert severity={message?.type || 'info'}>
            {message?.message || 'Checking cylinder limits...'}
          </Alert>

          {/* Current Usage Display */}
          {!limitCheck.isUnlimited && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Current Usage
                </Typography>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2">
                    {limitCheck.current?.toLocaleString() || 0} / {limitCheck.max?.toLocaleString() || 0} cylinders
                  </Typography>
                  <Chip 
                    label={`${limitCheck.percentage || 0}% used`}
                    color={limitCheck.percentage > 90 ? 'error' : limitCheck.percentage > 70 ? 'warning' : 'primary'}
                    size="small"
                  />
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={limitCheck.percentage || 0}
                  color={limitCheck.percentage > 90 ? 'error' : limitCheck.percentage > 70 ? 'warning' : 'primary'}
                />
                {limitCheck.quantity && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Adding {limitCheck.quantity} cylinder{limitCheck.quantity > 1 ? 's' : ''} would bring total to {limitCheck.newTotal?.toLocaleString()}
                  </Typography>
                )}
              </CardContent>
            </Card>
          )}

          {/* Upgrade Suggestion */}
          {upgradeSuggestion && (
            <Card variant="outlined" sx={{ bgcolor: 'primary.50' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  🚀 Upgrade to {upgradeSuggestion.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Get more cylinders and unlock additional features:
                </Typography>
                <List dense>
                  {upgradeSuggestion.features.map((feature, index) => (
                    <ListItem key={index} sx={{ py: 0.5 }}>
                      <ListItemText 
                        primary={feature}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
                <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
                  <Typography variant="h6" color="primary">
                    {upgradeSuggestion.price}
                  </Typography>
                  <Button 
                    variant="contained" 
                    color="primary"
                    onClick={handleUpgrade}
                    size="small"
                  >
                    Upgrade Now
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Additional Info for Unlimited Plans */}
          {limitCheck.isUnlimited && (
            <Card variant="outlined" sx={{ bgcolor: 'success.50' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="success.main">
                  🎉 Unlimited Plan Active
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  You can add as many cylinders as needed. Current count: {limitCheck.current?.toLocaleString() || 0}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        {onProceed && limitCheck.canAdd && (
          <Button onClick={onProceed} variant="contained" color="primary">
            {proceedText}
          </Button>
        )}
        {!limitCheck.canAdd && upgradeSuggestion && (
          <Button onClick={handleUpgrade} variant="contained" color="primary">
            View Upgrade Options
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
} 