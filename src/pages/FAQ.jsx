import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  Chip,
  Button,
  Stack
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  Help as HelpIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Chat as ChatIcon
} from '@mui/icons-material';

export default function FAQ() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', label: 'All Questions', count: 24 },
    { id: 'getting-started', label: 'Getting Started', count: 6 },
    { id: 'features', label: 'Features', count: 8 },
    { id: 'pricing', label: 'Pricing & Plans', count: 4 },
    { id: 'technical', label: 'Technical', count: 6 }
  ];

  const faqs = [
    // Getting Started
    {
      category: 'getting-started',
      question: 'How quickly can I get started with the platform?',
      answer: 'You can get started in minutes! Our self-service onboarding process takes about 5-10 minutes to complete. Simply sign up for a free trial, create your organization, and start adding cylinders immediately. No lengthy setup or training required.'
    },
    {
      category: 'getting-started',
      question: 'Do I need to install any software or hardware?',
      answer: 'No! Our platform is completely web-based and works on any modern browser. For mobile scanning, simply download our iOS app from the App Store. No expensive scanners or hardware required - use any iPhone or iPad.'
    },
    {
      category: 'getting-started',
      question: 'Can I migrate data from my current system?',
      answer: 'Yes, we provide data migration tools and support to help you transfer your existing cylinder data, customer information, and historical records. Our team can assist with migration from legacy systems, TIMS, Excel spreadsheets, or any other platform.'
    },
    {
      category: 'getting-started',
      question: 'Is there a free trial available?',
      answer: 'Yes! We offer a 7-day free trial with full access to all features. No credit card required to start. You can invite your team, add cylinders, and test all functionality before deciding to subscribe.'
    },
    {
      category: 'getting-started',
      question: 'What kind of training do you provide?',
      answer: 'We provide comprehensive onboarding resources including video tutorials, documentation, and live training sessions. Most users find our platform intuitive enough to use immediately, but we\'re always available for additional support.'
    },
    {
      category: 'getting-started',
      question: 'How do I invite my team members?',
      answer: 'From your dashboard, go to User Management and click "Invite User". Enter their email address and select their role (Admin, Manager, or User). They\'ll receive an invitation email with setup instructions.'
    },

    // Features
    {
      category: 'features',
      question: 'What types of cylinders can I track?',
      answer: 'Our platform supports all types of gas cylinders including industrial gases (oxygen, nitrogen, argon), specialty gases, medical gases, welding gases, and propane. You can customize cylinder types, sizes, and properties to match your inventory.'
    },
    {
      category: 'features',
      question: 'Does the mobile app work offline?',
      answer: 'Yes! Our mobile app includes robust offline capabilities. You can scan cylinders, update statuses, and record transactions even without internet connection. Data automatically syncs when you\'re back online.'
    },
    {
      category: 'features',
      question: 'Can I track cylinder locations and movements?',
      answer: 'Absolutely! Track cylinder locations in real-time, record movements between locations, and maintain complete chain of custody. GPS tracking is available for delivery trucks and field operations.'
    },
    {
      category: 'features',
      question: 'What reporting features are available?',
      answer: 'We offer comprehensive reporting including cylinder utilization, customer analytics, delivery performance, rental revenue, maintenance schedules, and custom reports. All reports can be exported to Excel or PDF.'
    },
    {
      category: 'features',
      question: 'How does the billing and invoicing work?',
      answer: 'Our platform includes built-in billing with Stripe integration. Automatically generate invoices for rentals, deliveries, and services. Support for multiple billing cycles, tax calculations, and payment tracking.'
    },
    {
      category: 'features',
      question: 'Can customers access their own portal?',
      answer: 'Yes! Customers get their own self-service portal where they can view cylinder status, track deliveries, place orders, pay invoices, and access their account history 24/7.'
    },
    {
      category: 'features',
      question: 'What integrations are available?',
      answer: 'We integrate with QuickBooks, Stripe, various ERP systems, and offer REST APIs for custom integrations. Our platform is designed to work with your existing business tools.'
    },
    {
      category: 'features',
      question: 'How secure is my data?',
      answer: 'We use enterprise-grade security including SSL encryption, SOC 2 compliance, regular security audits, and role-based access controls. Your data is backed up daily and stored in secure cloud infrastructure.'
    },

    // Pricing
    {
      category: 'pricing',
      question: 'How much does the platform cost?',
      answer: 'We offer flexible pricing starting at $29/month for small businesses. Pricing scales based on the number of users and cylinders. Enterprise plans include unlimited users and cylinders. Contact us for custom pricing.'
    },
    {
      category: 'pricing',
      question: 'Are there any setup fees or hidden costs?',
      answer: 'No setup fees, no hidden costs! Our pricing is transparent and includes all features, support, and updates. The only additional cost might be for premium integrations or custom development.'
    },
    {
      category: 'pricing',
      question: 'Can I change my plan anytime?',
      answer: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and billing is prorated. You can also cancel your subscription anytime with no penalties.'
    },
    {
      category: 'pricing',
      question: 'Do you offer discounts for annual payments?',
      answer: 'Yes! We offer a 15% discount for annual subscriptions. Enterprise customers may qualify for additional discounts based on volume and contract terms.'
    },

    // Technical
    {
      category: 'technical',
      question: 'What browsers are supported?',
      answer: 'Our platform works on all modern browsers including Chrome, Firefox, Safari, and Edge. We recommend using the latest version for the best experience.'
    },
    {
      category: 'technical',
      question: 'Is there an API available?',
      answer: 'Yes! We provide a comprehensive REST API with full documentation. Perfect for custom integrations, third-party applications, and automated workflows.'
    },
    {
      category: 'technical',
      question: 'How often do you release updates?',
      answer: 'We release updates continuously with new features and improvements. Major updates are released monthly, with bug fixes and security updates as needed. All updates are automatic with no downtime.'
    },
    {
      category: 'technical',
      question: 'What happens if there\'s an outage?',
      answer: 'We maintain 99.9% uptime with redundant systems and automatic failover. In the rare event of an outage, our mobile app continues to work offline, and we provide real-time status updates.'
    },
    {
      category: 'technical',
      question: 'Can I export my data?',
      answer: 'Yes, you can export all your data at any time in multiple formats (CSV, Excel, JSON). This includes cylinders, customers, transactions, and all historical data. No vendor lock-in!'
    },
    {
      category: 'technical',
      question: 'What support do you provide?',
      answer: 'We provide email support, live chat, phone support, and a comprehensive knowledge base. Response times are typically under 2 hours for technical issues and under 24 hours for general inquiries.'
    }
  ];

  const filteredFAQs = faqs.filter(faq => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch = searchTerm === '' || 
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh', py: 8 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography variant="h2" fontWeight={700} sx={{ mb: 3 }}>
            Frequently Asked Questions
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ width: '100%' }}>
            Find answers to common questions about our gas cylinder management platform.
            Can't find what you're looking for? Contact our support team.
          </Typography>
        </Box>

        {/* Search and Categories */}
        <Grid container spacing={6}>
          <Grid item xs={12} md={3}>
            {/* Search */}
            <TextField
              fullWidth
              placeholder="Search questions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 4 }}
            />

            {/* Categories */}
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Categories
            </Typography>
            <Stack spacing={1}>
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'contained' : 'outlined'}
                  onClick={() => setSelectedCategory(category.id)}
                  sx={{
                    justifyContent: 'space-between',
                    textTransform: 'none',
                    fontWeight: 500
                  }}
                >
                  {category.label}
                  <Chip 
                    label={category.count} 
                    size="small" 
                    color={selectedCategory === category.id ? 'secondary' : 'default'}
                  />
                </Button>
              ))}
            </Stack>

            {/* Contact Support */}
            <Card sx={{ mt: 4, p: 3, border: '1px solid #e2e8f0' }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                Still Need Help?
              </Typography>
              <Stack spacing={2}>
                <Button
                  variant="outlined"
                  startIcon={<ChatIcon />}
                  fullWidth
                  sx={{ textTransform: 'none' }}
                >
                  Live Chat
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<EmailIcon />}
                  fullWidth
                  sx={{ textTransform: 'none' }}
                  href="mailto:support@gascylinder.app"
                >
                  Email Support
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PhoneIcon />}
                  fullWidth
                  sx={{ textTransform: 'none' }}
                  href="tel:+1-555-123-4567"
                >
                  Call Support
                </Button>
              </Stack>
            </Card>
          </Grid>

          {/* FAQ Content */}
          <Grid item xs={12} md={9}>
            <Typography variant="h5" fontWeight={600} sx={{ mb: 3 }}>
              {selectedCategory === 'all' ? 'All Questions' : 
               categories.find(c => c.id === selectedCategory)?.label} 
              ({filteredFAQs.length})
            </Typography>

            {filteredFAQs.length === 0 ? (
              <Card sx={{ p: 6, textAlign: 'center' }}>
                <HelpIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" sx={{ mb: 2 }}>
                  No questions found
                </Typography>
                <Typography color="text.secondary">
                  Try adjusting your search or browse different categories.
                </Typography>
              </Card>
            ) : (
              <Stack spacing={2}>
                {filteredFAQs.map((faq, index) => (
                  <Accordion key={index} sx={{ border: '1px solid #e2e8f0' }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="h6" fontWeight={600}>
                        {faq.question}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                        {faq.answer}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Stack>
            )}
          </Grid>
        </Grid>

        {/* Bottom CTA */}
        <Box sx={{ textAlign: 'center', mt: 8, p: 6, bgcolor: 'white', borderRadius: 2 }}>
          <Typography variant="h4" fontWeight={600} sx={{ mb: 2 }}>
            Ready to Get Started?
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Start your free trial today and see how easy gas cylinder management can be.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
            <Button
              variant="contained"
              size="large"
              href="/register"
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Start Free Trial
            </Button>
            <Button
              variant="outlined"
              size="large"
              href="/contact"
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Contact Sales
            </Button>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
} 