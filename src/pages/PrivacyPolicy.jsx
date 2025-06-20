import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Button, Divider
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

function PrivacyPolicy() {
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
            Privacy Policy
          </Typography>
          
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 4 }}>
            Last updated: {new Date().toLocaleDateString()}
          </Typography>

          <Box sx={{ textAlign: 'left' }}>
            <Typography variant="h6" gutterBottom>
              1. Information We Collect
            </Typography>
            <Typography variant="body2" paragraph>
              We collect information you provide directly to us, such as when you create an account, 
              register your organization, or contact us for support. This may include:
            </Typography>
            <Box component="ul" sx={{ pl: 3, mb: 3 }}>
              <Typography component="li" variant="body2">Name and contact information</Typography>
              <Typography component="li" variant="body2">Organization details and business information</Typography>
              <Typography component="li" variant="body2">Gas cylinder and asset data</Typography>
              <Typography component="li" variant="body2">Customer and transaction records</Typography>
              <Typography component="li" variant="body2">Usage data and analytics</Typography>
            </Box>

            <Typography variant="h6" gutterBottom>
              2. How We Use Your Information
            </Typography>
            <Typography variant="body2" paragraph>
              We use the information we collect to:
            </Typography>
            <Box component="ul" sx={{ pl: 3, mb: 3 }}>
              <Typography component="li" variant="body2">Provide and maintain our gas cylinder management services</Typography>
              <Typography component="li" variant="body2">Process transactions and manage billing</Typography>
              <Typography component="li" variant="body2">Send you important updates and notifications</Typography>
              <Typography component="li" variant="body2">Provide customer support and respond to inquiries</Typography>
              <Typography component="li" variant="body2">Improve our services and develop new features</Typography>
              <Typography component="li" variant="body2">Comply with legal obligations</Typography>
            </Box>

            <Typography variant="h6" gutterBottom>
              3. Information Sharing and Disclosure
            </Typography>
            <Typography variant="body2" paragraph>
              We do not sell, trade, or otherwise transfer your personal information to third parties 
              except in the following circumstances:
            </Typography>
            <Box component="ul" sx={{ pl: 3, mb: 3 }}>
              <Typography component="li" variant="body2">With your explicit consent</Typography>
              <Typography component="li" variant="body2">To comply with legal requirements or court orders</Typography>
              <Typography component="li" variant="body2">To protect our rights, property, or safety</Typography>
              <Typography component="li" variant="body2">With service providers who assist in operating our platform</Typography>
            </Box>

            <Typography variant="h6" gutterBottom>
              4. Data Security
            </Typography>
            <Typography variant="body2" paragraph>
              We implement appropriate technical and organizational measures to protect your personal 
              information against unauthorized access, alteration, disclosure, or destruction. 
              This includes encryption, secure servers, and regular security assessments.
            </Typography>

            <Typography variant="h6" gutterBottom>
              5. Data Retention
            </Typography>
            <Typography variant="body2" paragraph>
              We retain your personal information for as long as necessary to provide our services, 
              comply with legal obligations, resolve disputes, and enforce our agreements. 
              You may request deletion of your data subject to legal requirements.
            </Typography>

            <Typography variant="h6" gutterBottom>
              6. Your Rights
            </Typography>
            <Typography variant="body2" paragraph>
              You have the right to:
            </Typography>
            <Box component="ul" sx={{ pl: 3, mb: 3 }}>
              <Typography component="li" variant="body2">Access and review your personal information</Typography>
              <Typography component="li" variant="body2">Update or correct inaccurate information</Typography>
              <Typography component="li" variant="body2">Request deletion of your personal information</Typography>
              <Typography component="li" variant="body2">Opt out of marketing communications</Typography>
              <Typography component="li" variant="body2">Export your data in a portable format</Typography>
            </Box>

            <Typography variant="h6" gutterBottom>
              7. Cookies and Tracking Technologies
            </Typography>
            <Typography variant="body2" paragraph>
              We use cookies and similar technologies to enhance your experience, analyze usage patterns, 
              and provide personalized content. You can control cookie settings through your browser preferences.
            </Typography>

            <Typography variant="h6" gutterBottom>
              8. Third-Party Services
            </Typography>
            <Typography variant="body2" paragraph>
              Our platform may integrate with third-party services for payment processing, analytics, 
              and other functionalities. These services have their own privacy policies, and we encourage 
              you to review them.
            </Typography>

            <Typography variant="h6" gutterBottom>
              9. International Data Transfers
            </Typography>
            <Typography variant="body2" paragraph>
              Your information may be transferred to and processed in countries other than your own. 
              We ensure appropriate safeguards are in place to protect your data in accordance with 
              applicable data protection laws.
            </Typography>

            <Typography variant="h6" gutterBottom>
              10. Children's Privacy
            </Typography>
            <Typography variant="body2" paragraph>
              Our services are not intended for children under 13 years of age. We do not knowingly 
              collect personal information from children under 13.
            </Typography>

            <Typography variant="h6" gutterBottom>
              11. Changes to This Policy
            </Typography>
            <Typography variant="body2" paragraph>
              We may update this Privacy Policy from time to time. We will notify you of any material 
              changes by posting the new policy on our website and updating the "Last updated" date.
            </Typography>

            <Typography variant="h6" gutterBottom>
              12. Contact Us
            </Typography>
            <Typography variant="body2" paragraph>
              If you have any questions about this Privacy Policy or our data practices, please contact us at:
            </Typography>
            <Typography variant="body2" sx={{ mb: 3 }}>
              Email: privacy@lessannoyingscan.com<br />
              Address: 123 Business St, Suite 100, City, State 12345
            </Typography>

            <Divider sx={{ my: 3 }} />
            
            <Typography variant="body2" color="text.secondary" align="center">
              This Privacy Policy is effective as of the date listed above and applies to all users of our platform.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

export default PrivacyPolicy; 