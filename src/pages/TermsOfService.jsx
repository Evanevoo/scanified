import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Button, Divider
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

function TermsOfService() {
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
      <Card sx={{ maxWidth: 800, width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
        <CardContent sx={{ p: 4 }}>
          {/* Back to Home Button */}
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
            Terms of Service
          </Typography>
          
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 4 }}>
            Last updated: {new Date().toLocaleDateString()}
          </Typography>

          <Box sx={{ textAlign: 'left' }}>
            <Typography variant="h6" gutterBottom>
              1. Acceptance of Terms
            </Typography>
            <Typography variant="body2" paragraph>
              By accessing and using our gas cylinder management platform ("Service"), you agree to be bound 
              by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Service.
            </Typography>

            <Typography variant="h6" gutterBottom>
              2. Description of Service
            </Typography>
            <Typography variant="body2" paragraph>
              Our Service provides organizations with tools for tracking, managing, and analyzing gas cylinder 
              assets. This includes features for inventory management, customer records, delivery tracking, 
              and reporting. The Service is provided on a subscription basis.
            </Typography>

            <Typography variant="h6" gutterBottom>
              3. User Accounts and Responsibilities
            </Typography>
            <Typography variant="body2" paragraph>
              You are responsible for maintaining the confidentiality of your account credentials and for all 
              activities that occur under your account. You agree to:
            </Typography>
            <Box component="ul" sx={{ pl: 3, mb: 3 }}>
              <Typography component="li" variant="body2">Provide accurate and complete information during registration.</Typography>
              <Typography component="li" variant="body2">Keep your account information updated.</Typography>
              <Typography component="li" variant="body2">Notify us immediately of any unauthorized use of your account.</Typography>
            </Box>

            <Typography variant="h6" gutterBottom>
              4. Subscription and Payments
            </Typography>
            <Typography variant="body2" paragraph>
              Access to the Service requires a valid subscription. Fees are billed on a recurring basis as 
              specified in your chosen plan. All fees are non-refundable except as required by law. 
              Failure to pay may result in suspension or termination of your account.
            </Typography>

            <Typography variant="h6" gutterBottom>
              5. Acceptable Use
            </Typography>
            <Typography variant="body2" paragraph>
              You agree not to use the Service for any unlawful purpose or in any way that could harm our platform, 
              other users, or third parties. Prohibited activities include, but are not limited to:
            </Typography>
            <Box component="ul" sx={{ pl: 3, mb: 3 }}>
              <Typography component="li" variant="body2">Uploading malicious code or viruses.</Typography>
              <Typography component="li" variant="body2">Attempting to gain unauthorized access to our systems.</Typography>
              <Typography component="li" variant="body2">Infringing on intellectual property rights.</Typography>
              <Typography component="li" variant="body2">Harassing or abusing other users.</Typography>
            </Box>

            <Typography variant="h6" gutterBottom>
              6. Intellectual Property
            </Typography>
            <Typography variant="body2" paragraph>
              All rights, title, and interest in and to the Service (excluding your data) are and will remain 
              the exclusive property of LessAnnoyingScan and its licensors. You may not use our branding or 
              trademarks without our prior written consent.
            </Typography>

            <Typography variant="h6" gutterBottom>
              7. Limitation of Liability
            </Typography>
            <Typography variant="body2" paragraph>
              To the fullest extent permitted by law, LessAnnoyingScan shall not be liable for any indirect, 
              incidental, special, consequential, or punitive damages, or any loss of profits or revenues, 
              whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible 
              losses, resulting from your use of the Service.
            </Typography>

            <Typography variant="h6" gutterBottom>
              8. Termination
            </Typography>
            <Typography variant="body2" paragraph>
              We may terminate or suspend your account at any time, without prior notice or liability, 
              for any reason, including if you breach these Terms. Upon termination, your right to use 
              the Service will immediately cease.
            </Typography>

            <Typography variant="h6" gutterBottom>
              9. Governing Law
            </Typography>
            <Typography variant="body2" paragraph>
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction 
              in which our company is established, without regard to its conflict of law provisions.
            </Typography>

            <Typography variant="h6" gutterBottom>
              10. Changes to Terms
            </Typography>
            <Typography variant="body2" paragraph>
              We reserve the right to modify these Terms at any time. We will provide notice of material changes 
              by posting the updated Terms on our website. Your continued use of the Service after such changes 
              constitutes your acceptance of the new Terms.
            </Typography>

            <Divider sx={{ my: 3 }} />

            <Typography variant="body2" color="text.secondary" align="center">
              If you have any questions about these Terms, please contact us at legal@lessannoyingscan.com.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

export default TermsOfService; 