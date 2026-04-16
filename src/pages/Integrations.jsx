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

/** live = shipped workflows in the product; on_request = professional services / custom; coming_soon = roadmap */
const integrations = [
  {
    id: 1,
    name: 'SAP',
    description: 'ERP sync and custom data flows tailored to your SAP landscape',
    status: 'on_request',
    setupTime: 'Typically 2–5 days with services',
    popular: true
  },
  {
    id: 2,
    name: 'Salesforce',
    description: 'Align customer records and field operations with Salesforce',
    status: 'on_request',
    setupTime: 'Typically 1–3 days with services',
    popular: true
  },
  {
    id: 3,
    name: 'Slack',
    description: 'Operational alerts and notifications in Slack',
    status: 'on_request',
    setupTime: 'Typically under 1 week with services',
    popular: true
  },
  {
    id: 4,
    name: 'QuickBooks',
    description: 'Invoice and rental exports (CSV / desktop-friendly workflows)',
    status: 'live',
    setupTime: 'Built-in export tools',
    popular: false
  }
];

function integrationChip(status) {
  if (status === 'live') return { label: 'In product', color: 'success' };
  if (status === 'on_request') return { label: 'On request', color: 'info' };
  return { label: 'Coming soon', color: 'warning' };
}

function integrationCta(status, navigate) {
  if (status === 'live') {
    return { label: 'How it works', disabled: false, onClick: () => navigate('/documentation') };
  }
  if (status === 'on_request') {
    return { label: 'Contact us', disabled: false, onClick: () => navigate('/contact') };
  }
  return { label: 'Coming soon', disabled: true, onClick: () => {} };
}

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
              Connect Scanified with your stack — in-product exports, APIs, and tailored integrations
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
          {filteredIntegrations.map((integration) => {
            const chip = integrationChip(integration.status);
            const cta = integrationCta(integration.status, navigate);
            return (
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
                        label={chip.label}
                        size="small"
                        color={chip.color}
                      />
                    </Box>
                  </Box>
                  <Typography color="text.secondary" sx={{ mb: 2 }}>
                    {integration.description}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {integration.status === 'live' ? 'Availability: ' : 'Typical timeline: '}
                    {integration.setupTime}
                  </Typography>
                  <Button 
                    variant="outlined" 
                    fullWidth
                    disabled={cta.disabled}
                    onClick={cta.onClick}
                  >
                    {cta.label}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            );
          })}
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
          <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap">
            <Button variant="contained" size="large" onClick={() => navigate('/documentation')}>
              View API Docs
            </Button>
            <Button variant="outlined" size="large" onClick={() => navigate('/contact')}>
              Request API access
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