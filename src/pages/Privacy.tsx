import React from 'react';
import { Container, Typography, Paper, Box, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const Privacy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Privacy Policy
        </Typography>
        <Paper sx={{ p: 4, my: 2 }}>
          <Typography variant="h6" gutterBottom>
            1. Information We Collect
          </Typography>
          <Typography paragraph>
            We collect information that you provide directly to us, including:
            <ul>
              <li>Account information (email address, name, organization)</li>
              <li>Profile information you choose to add</li>
              <li>Training progress and quiz results</li>
              <li>Usage data and analytics</li>
            </ul>
          </Typography>

          <Typography variant="h6" gutterBottom>
            2. How We Use Your Information
          </Typography>
          <Typography paragraph>
            We use the collected information for:
            <ul>
              <li>Providing and improving our services</li>
              <li>Personalizing your training experience</li>
              <li>Communicating with you about your account</li>
              <li>Analyzing platform usage and trends</li>
            </ul>
          </Typography>

          <Typography variant="h6" gutterBottom>
            3. Information Sharing
          </Typography>
          <Typography paragraph>
            We share your information only with:
            <ul>
              <li>Your organization's administrators</li>
              <li>Service providers who assist in platform operation</li>
              <li>When required by law or to protect rights</li>
            </ul>
          </Typography>

          <Typography variant="h6" gutterBottom>
            4. Data Security
          </Typography>
          <Typography paragraph>
            We implement appropriate security measures to protect your information from unauthorized access,
            alteration, or destruction. This includes encryption, secure servers, and regular security audits.
          </Typography>

          <Typography variant="h6" gutterBottom>
            5. Data Retention
          </Typography>
          <Typography paragraph>
            We retain your information for as long as your account is active or as needed to provide services.
            You can request data deletion by contacting us.
          </Typography>

          <Typography variant="h6" gutterBottom>
            6. Your Rights
          </Typography>
          <Typography paragraph>
            You have the right to:
            <ul>
              <li>Access your personal information</li>
              <li>Correct inaccurate data</li>
              <li>Request data deletion</li>
              <li>Object to data processing</li>
              <li>Data portability</li>
            </ul>
          </Typography>

          <Typography variant="h6" gutterBottom>
            7. Cookies
          </Typography>
          <Typography paragraph>
            We use cookies and similar technologies to:
            <ul>
              <li>Keep you signed in</li>
              <li>Remember your preferences</li>
              <li>Analyze platform usage</li>
              <li>Improve user experience</li>
            </ul>
          </Typography>

          <Typography variant="h6" gutterBottom>
            8. Changes to Privacy Policy
          </Typography>
          <Typography paragraph>
            We may update this privacy policy from time to time. We will notify you of any material changes
            by posting the new policy on this page.
          </Typography>

          <Typography variant="h6" gutterBottom>
            9. Contact Us
          </Typography>
          <Typography paragraph>
            If you have questions about this privacy policy or our practices, please contact us at:
            privacy@traininghub.com
          </Typography>
        </Paper>
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
          <Button
            variant="outlined"
            onClick={() => navigate(-1)}
          >
            Go Back
          </Button>
          <Button
            variant="contained"
            onClick={() => navigate('/register')}
          >
            Create Account
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default Privacy;
