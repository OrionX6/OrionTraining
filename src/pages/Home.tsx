import React, { useEffect } from 'react';
import { Container, Box, Typography, Alert, Paper } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import LoadingScreen from '../components/LoadingScreen';

export default function Home() {
  const auth = useAuth();
  const location = useLocation();
  const [showWelcome, setShowWelcome] = React.useState(false);

  useEffect(() => {
    // Show welcome message if user just verified their email
    if (location.state?.verified) {
      setShowWelcome(true);
      // Clear the state after showing welcome
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  if (auth.loading) {
    return <LoadingScreen message="Loading..." />;
  }

  return (
    <Container maxWidth="lg">
      {showWelcome && (
        <Alert 
          severity="success" 
          sx={{ 
            mt: 2, 
            mb: 4,
            '& .MuiAlert-message': {
              width: '100%'
            }
          }}
          onClose={() => setShowWelcome(false)}
        >
          <Box sx={{ mb: 1 }}>
            <Typography variant="h6" component="div">
              Welcome to Training Hub!
            </Typography>
          </Box>
          <Typography variant="body2">
            Your account has been verified and your organization has been set up.
            You can now start using all features of the platform.
          </Typography>
        </Alert>
      )}
      
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome {auth.profile?.organization?.name ? `to ${auth.profile.organization.name}` : ''}
        </Typography>

        {auth.isAuthenticated ? (
          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="body1" gutterBottom>
              You're signed in as <strong>{auth.profile?.email}</strong>
            </Typography>
            {auth.profile?.role === 'admin' && (
              <Typography variant="body2" color="text.secondary">
                You have administrative access to manage your organization.
              </Typography>
            )}
          </Paper>
        ) : (
          <Typography variant="body1">
            Please sign in to access your training materials.
          </Typography>
        )}
      </Box>
      
      {auth.isAuthenticated && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Quick Start
          </Typography>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Study Materials
              </Typography>
              <Typography variant="body2">
                Access your training materials and start learning.
              </Typography>
            </Paper>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Practice Tests
              </Typography>
              <Typography variant="body2">
                Test your knowledge with practice quizzes.
              </Typography>
            </Paper>
            {auth.profile?.role === 'admin' && (
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Organization Settings
                </Typography>
                <Typography variant="body2">
                  Manage your organization's settings and users.
                </Typography>
              </Paper>
            )}
          </Box>
        </Box>
      )}
    </Container>
  );
}
