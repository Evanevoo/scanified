import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Chip,
  Paper,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Security as SecurityIcon,
  Shield as ShieldIcon,
  Lock as LockIcon,
  Verified as VerifiedIcon,
  Cloud as CloudIcon,
  Backup as BackupIcon,
  MonitorHeart as MonitorIcon,
  AdminPanelSettings as AdminIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  Description as CertIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const securityFeatures = [
  {
    icon: <LockIcon />,
    title: 'Data Encryption',
    description: 'All data is encrypted in transit and at rest using industry-standard AES-256 encryption.',
    details: [
      'TLS 1.3 for data in transit',
      'AES-256 encryption for data at rest',
      'End-to-end encryption for sensitive data',
      'Regular key rotation policies'
    ]
  },
  {
    icon: <AdminIcon />,
    title: 'Access Control',
    description: 'Comprehensive access controls and user management with role-based permissions.',
    details: [
      'Multi-factor authentication (MFA)',
      'Single Sign-On (SSO) support',
      'Role-based access control (RBAC)',
      'Session management and timeout'
    ]
  },
  {
    icon: <CloudIcon />,
    title: 'Infrastructure Security',
    description: 'Hosted on enterprise-grade cloud infrastructure with advanced security measures.',
    details: [
      'AWS/Azure enterprise hosting',
      'Network segmentation and firewalls',
      'DDoS protection and mitigation',
      'Regular security patches and updates'
    ]
  },
  {
    icon: <BackupIcon />,
    title: 'Data Backup & Recovery',
    description: 'Automated backups and disaster recovery procedures to ensure data availability.',
    details: [
      'Automated daily backups',
      'Geographic backup distribution',
      '99.9% uptime guarantee',
      'Point-in-time recovery options'
    ]
  },
  {
    icon: <MonitorIcon />,
    title: 'Monitoring & Logging',
    description: 'Comprehensive monitoring and logging for security events and anomalies.',
    details: [
      '24/7 security monitoring',
      'Real-time threat detection',
      'Comprehensive audit logs',
      'Automated incident response'
    ]
  },
  {
    icon: <VerifiedIcon />,
    title: 'Compliance',
    description: 'We maintain compliance with industry standards and regulations.',
    details: [
      'SOC 2 Type II compliant',
      'GDPR compliant',
      'HIPAA ready architecture',
      'Regular third-party audits'
    ]
  }
];

const certifications = [
  {
    name: 'SOC 2 Type II',
    description: 'Security, availability, and confidentiality controls',
    status: 'Certified',
    icon: <CertIcon />
  },
  {
    name: 'ISO 27001',
    description: 'Information security management system',
    status: 'In Progress',
    icon: <CertIcon />
  },
  {
    name: 'GDPR',
    description: 'European data protection regulation',
    status: 'Compliant',
    icon: <CertIcon />
  },
  {
    name: 'HIPAA',
    description: 'Healthcare data protection standards',
    status: 'Ready',
    icon: <CertIcon />
  }
];

const securityPolicies = [
  {
    title: 'Data Privacy Policy',
    description: 'How we collect, use, and protect your personal information',
    lastUpdated: '2024-01-15'
  },
  {
    title: 'Security Incident Response',
    description: 'Our procedures for handling security incidents and breaches',
    lastUpdated: '2024-01-10'
  },
  {
    title: 'Access Control Policy',
    description: 'Guidelines for user access and authentication requirements',
    lastUpdated: '2024-01-05'
  },
  {
    title: 'Data Retention Policy',
    description: 'How long we keep your data and when it gets deleted',
    lastUpdated: '2023-12-20'
  }
];

const faqs = [
  {
    question: 'How is my data encrypted?',
    answer: 'All data is encrypted using AES-256 encryption both in transit (using TLS 1.3) and at rest. We also implement end-to-end encryption for the most sensitive data like passwords and payment information.'
  },
  {
    question: 'Where is my data stored?',
    answer: 'Your data is stored in enterprise-grade data centers operated by AWS and Azure. We use multiple geographic regions to ensure redundancy and compliance with local data residency requirements.'
  },
  {
    question: 'Can I control who has access to my data?',
    answer: 'Yes, you have full control over user access through our role-based permission system. You can create custom roles, manage user permissions, and monitor access logs.'
  },
  {
    question: 'How often do you backup data?',
    answer: 'We perform automated backups every 24 hours, with additional incremental backups every 4 hours. All backups are encrypted and stored across multiple geographic locations.'
  },
  {
    question: 'Are you compliant with GDPR?',
    answer: 'Yes, we are fully GDPR compliant. We provide data portability, right to deletion, and clear consent mechanisms. We also have a dedicated Data Protection Officer (DPO).'
  },
  {
    question: 'What happens if there\'s a security incident?',
    answer: 'We have a comprehensive incident response plan. We\'ll notify affected customers within 24 hours and provide regular updates throughout the resolution process.'
  }
];

export default function Security() {
  const navigate = useNavigate();

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
            <SecurityIcon sx={{ fontSize: 80, mb: 3 }} />
            <Typography variant="h2" fontWeight={700} gutterBottom>
              Security & Compliance
            </Typography>
            <Typography variant="h5" sx={{ mb: 4, opacity: 0.9, width: '100%' }}>
              Your data security is our top priority. Learn about our comprehensive security measures and compliance standards.
            </Typography>
            <Stack direction="row" spacing={4} justifyContent="center">
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" fontWeight={700}>99.9%</Typography>
                <Typography variant="body1" sx={{ opacity: 0.8 }}>Uptime SLA</Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" fontWeight={700}>256-bit</Typography>
                <Typography variant="body1" sx={{ opacity: 0.8 }}>Encryption</Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" fontWeight={700}>24/7</Typography>
                <Typography variant="body1" sx={{ opacity: 0.8 }}>Monitoring</Typography>
              </Box>
            </Stack>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 8 }}>
        {/* Security Features */}
        <Box sx={{ mb: 12 }}>
          <Typography variant="h3" fontWeight={700} textAlign="center" gutterBottom>
            Security Features
          </Typography>
          <Typography variant="h6" color="text.secondary" textAlign="center" sx={{ mb: 6, width: '100%' }}>
            Comprehensive security measures to protect your data and ensure business continuity
          </Typography>
          
          <Grid container spacing={4}>
            {securityFeatures.map((feature, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Card sx={{ p: 4, height: '100%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
                    <Box sx={{ 
                      p: 2,
                      borderRadius: 2,
                      bgcolor: 'primary.main',
                      color: 'white'
                    }}>
                      {feature.icon}
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h5" fontWeight={600} gutterBottom>
                        {feature.title}
                      </Typography>
                      <Typography color="text.secondary" sx={{ mb: 3 }}>
                        {feature.description}
                      </Typography>
                      <List dense>
                        {feature.details.map((detail, idx) => (
                          <ListItem key={idx} sx={{ px: 0 }}>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <CheckIcon color="primary" sx={{ fontSize: 16 }} />
                            </ListItemIcon>
                            <ListItemText 
                              primary={detail} 
                              primaryTypographyProps={{ variant: 'body2' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Certifications */}
        <Box sx={{ mb: 12 }}>
          <Typography variant="h3" fontWeight={700} textAlign="center" gutterBottom>
            Certifications & Compliance
          </Typography>
          <Typography variant="h6" color="text.secondary" textAlign="center" sx={{ mb: 6, width: '100%' }}>
            We maintain the highest standards of security and compliance
          </Typography>
          
          <Grid container spacing={4}>
            {certifications.map((cert, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Card sx={{ p: 3, textAlign: 'center', height: '100%' }}>
                  <Box sx={{ 
                    display: 'inline-flex',
                    p: 2,
                    borderRadius: '50%',
                    bgcolor: cert.status === 'Certified' || cert.status === 'Compliant' ? 'success.main' : 'warning.main',
                    color: 'white',
                    mb: 2
                  }}>
                    {cert.icon}
                  </Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    {cert.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {cert.description}
                  </Typography>
                  <Chip 
                    label={cert.status} 
                    color={cert.status === 'Certified' || cert.status === 'Compliant' ? 'success' : 'warning'}
                    size="small"
                  />
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Security Policies */}
        <Box sx={{ mb: 12 }}>
          <Typography variant="h3" fontWeight={700} textAlign="center" gutterBottom>
            Security Policies
          </Typography>
          <Typography variant="h6" color="text.secondary" textAlign="center" sx={{ mb: 6, width: '100%' }}>
            Transparent policies governing how we handle and protect your data
          </Typography>
          
          <Grid container spacing={3}>
            {securityPolicies.map((policy, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Paper sx={{ p: 4 }}>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    {policy.title}
                  </Typography>
                  <Typography color="text.secondary" sx={{ mb: 2 }}>
                    {policy.description}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Last updated: {new Date(policy.lastUpdated).toLocaleDateString()}
                  </Typography>
                  <Button variant="outlined" size="small" sx={{ mt: 2 }}>
                    View Policy
                  </Button>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Security FAQs */}
        <Box sx={{ mb: 8 }}>
          <Typography variant="h3" fontWeight={700} textAlign="center" gutterBottom>
            Security FAQs
          </Typography>
          <Typography variant="h6" color="text.secondary" textAlign="center" sx={{ mb: 6, width: '100%' }}>
            Common questions about our security practices
          </Typography>
          
          <Box sx={{ width: '100%' }}>
            {faqs.map((faq, index) => (
              <Accordion key={index}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6" fontWeight={600}>
                    {faq.question}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography color="text.secondary">
                    {faq.answer}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </Box>

        {/* Contact Security Team */}
        <Paper sx={{ 
          p: 6, 
          textAlign: 'center',
          background: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
          color: 'white'
        }}>
          <ShieldIcon sx={{ fontSize: 60, mb: 3 }} />
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Have Security Questions?
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
            Our security team is here to help. Contact us for security inquiries or to report vulnerabilities.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent="center">
            <Button
              variant="contained"
              size="large"
              onClick={() => window.open('mailto:security@scanified.com')}
              sx={{ 
                bgcolor: 'white',
                color: '#3B82F6',
                px: 4,
                py: 1.5,
                '&:hover': { bgcolor: '#f8fafc' }
              }}
            >
              Contact Security Team
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => window.open('mailto:security@scanified.com?subject=Vulnerability Report')}
              sx={{ 
                borderColor: 'white',
                color: 'white',
                px: 4,
                py: 1.5,
                '&:hover': { 
                  borderColor: 'white',
                  bgcolor: 'rgba(255,255,255,0.1)'
                }
              }}
            >
              Report Vulnerability
            </Button>
          </Stack>
          <Typography variant="body2" sx={{ mt: 3, opacity: 0.8 }}>
            We offer bug bounty rewards for responsibly disclosed security vulnerabilities
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}