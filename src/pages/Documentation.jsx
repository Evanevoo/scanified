import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Button, Divider
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

function Documentation() {
  const navigate = useNavigate();

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      p: 2
    }}>
      <Card sx={{ width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/')}
              sx={{ 
                color: 'text.secondary',
                '&:hover': { 
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  color: 'text.primary'
                }
              }}
            >
              Back to Home
            </Button>
          </Box>
          <Typography variant="h4" align="center" gutterBottom>
            Documentation
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body1" align="center" color="text.secondary">
            This page is under construction. Comprehensive documentation is coming soon!
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}

export default Documentation; 