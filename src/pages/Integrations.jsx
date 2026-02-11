import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Stack,
  Chip,
  TextField,
  InputAdornment,
  Avatar,
  Paper
} from '@mui/material';
import {
  Search as SearchIcon,
  Code as CodeIcon,
  Api as ApiIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const integrations = [
  {
    id: 1,
    name: 'SAP',
    description: 'Sync asset data with SAP ERP systems',
    status: 'available',
    setupTime: '2-3 days',
    popular: true
  },
  {
    id: 2,
    name: 'Salesforce',
    description: 'Connect customer data and asset information',
    status: 'available',
    setupTime: '1-2 days',
    popular: true
  },
  {
    id: 3,
    name: 'Slack',
    description: 'Get notifications in your Slack channels',
    status: 'available',
    setupTime: '< 1 hour',
    popular: true
  },
  {
    id: 4,
    name: 'QuickBooks',
    description: 'Sync financial data with QuickBooks',
    status: 'coming_soon',
    setupTime: '1-2 days',
    popular: false
  }
];

export default function Integrations() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredIntegrations = integrations.filter(integration =>
    integration.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* Hero Section */}
      <Box sx={{ 
        bgcolor: 'primary.main', 
        color: 'white', 
        py: 12,
        background: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)'
      }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center' }}>
            <CodeIcon sx={{ fontSize: 80, mb: 3 }} />
            <Typography variant="h2" fontWeight={700} gutterBottom>
              Integrations
            </Typography>
            <Typography variant="h5" sx={{ mb: 4, opacity: 0.9, width: '100%' }}>
              Connect Scanified with your existing tools and workflows
            </Typography>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 8 }}>
        {/* Search */}
        <Box sx={{ mb: 6 }}>
          <TextField
            fullWidth
            placeholder="Search integrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ width: '100%', display: 'block' }}
          />
        </Box>

        {/* Integrations Grid */}
        <Grid container spacing={4}>
          {filteredIntegrations.map((integration) => (
            <Grid item xs={12} sm={6} md={4} key={integration.id}>
              <Card sx={{ 
                height: '100%', 
                transition: 'all 0.3s ease',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 }
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar sx={{ width: 48, height: 48, bgcolor: 'grey.100' }}>
                      <Typography variant="h6">
                        {integration.name.charAt(0)}
                      </Typography>
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" fontWeight={600}>
                        {integration.name}
                      </Typography>
                      <Chip 
                        label={integration.status === 'available' ? 'Available' : 'Coming Soon'}
                        size="small"
                        color={integration.status === 'available' ? 'success' : 'warning'}
                      />
                    </Box>
                  </Box>
                  <Typography color="text.secondary" sx={{ mb: 2 }}>
                    {integration.description}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Setup time: {integration.setupTime}
                  </Typography>
                  <Button 
                    variant="outlined" 
                    fullWidth
                    disabled={integration.status !== 'available'}
                  >
                    {integration.status === 'available' ? 'Connect' : 'Coming Soon'}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* API Section */}
        <Box sx={{ mt: 12, textAlign: 'center' }}>
          <ApiIcon sx={{ fontSize: 60, color: 'primary.main', mb: 3 }} />
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Developer API
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4, width: '100%' }}>
            Build custom integrations with our comprehensive REST API
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button variant="contained" size="large">
              View API Docs
            </Button>
            <Button variant="outlined" size="large">
              Get API Key
            </Button>
          </Stack>
        </Box>

        {/* Custom Integration CTA */}
        <Paper sx={{ 
          p: 6, 
          textAlign: 'center',
          background: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
          color: 'white',
          mt: 8
        }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Need a Custom Integration?
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
            Our team can build custom integrations for your specific needs
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/contact')}
            sx={{ 
              bgcolor: 'white',
              color: '#3B82F6',
              '&:hover': { bgcolor: '#f8fafc' }
            }}
          >
            Contact Us
          </Button>
        </Paper>
      </Container>
    </Box>
  );
}