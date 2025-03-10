import React from 'react';
import { Container, Typography, Paper, Box, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const Terms: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Terms and Conditions
        </Typography>
        <Paper sx={{ p: 4, my: 2 }}>
          <Typography variant="h6" gutterBottom>
            1. Acceptance of Terms
          </Typography>
          <Typography paragraph>
            By accessing and using this training hub platform, you agree to be bound by these terms and conditions.
          </Typography>

          <Typography variant="h6" gutterBottom>
            2. User Accounts
          </Typography>
          <Typography paragraph>
            You are responsible for maintaining the confidentiality of your account credentials and for all activities
            that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
          </Typography>

          <Typography variant="h6" gutterBottom>
            3. Content Usage
          </Typography>
          <Typography paragraph>
            All training materials, quizzes, and content provided through this platform are for authorized users only.
            You agree not to share, distribute, or reproduce the content without explicit permission.
          </Typography>

          <Typography variant="h6" gutterBottom>
            4. Privacy
          </Typography>
          <Typography paragraph>
            Your use of this platform is also governed by our Privacy Policy. We collect and process your data as
            described in the privacy policy.
          </Typography>

          <Typography variant="h6" gutterBottom>
            5. Organizations
          </Typography>
          <Typography paragraph>
            Organization administrators are responsible for managing user access and content within their organization.
            They must ensure compliance with these terms and any applicable laws.
          </Typography>

          <Typography variant="h6" gutterBottom>
            6. Intellectual Property
          </Typography>
          <Typography paragraph>
            All content, features, and functionality of this platform are owned by us and are protected by
            international copyright, trademark, and other intellectual property laws.
          </Typography>

          <Typography variant="h6" gutterBottom>
            7. Termination
          </Typography>
          <Typography paragraph>
            We reserve the right to terminate or suspend your account and access to the platform for any violation
            of these terms or for any other reason at our sole discretion.
          </Typography>

          <Typography variant="h6" gutterBottom>
            8. Changes to Terms
          </Typography>
          <Typography paragraph>
            We may modify these terms at any time. Continued use of the platform after changes constitutes
            acceptance of the modified terms.
          </Typography>

          <Typography variant="h6" gutterBottom>
            9. Disclaimer
          </Typography>
          <Typography paragraph>
            The platform is provided "as is" without warranties of any kind, either express or implied, including
            but not limited to warranties of merchantability and fitness for a particular purpose.
          </Typography>

          <Typography variant="h6" gutterBottom>
            10. Contact
          </Typography>
          <Typography paragraph>
            If you have any questions about these terms, please contact us at support@traininghub.com
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

export default Terms;
