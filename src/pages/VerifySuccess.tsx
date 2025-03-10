import React, { useEffect, useState } from 'react';
import { Container, Box, Typography, Button } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../hooks/useNavigation';
import { useUserService } from '../contexts/ServiceContext';
import { supabase } from '../config/supabase';
import LoadingScreen from '../components/LoadingScreen';
import { monitoring } from '../services/MonitoringService';

export default function VerifySuccess() {
  const auth = useAuth();
  const navigation = useNavigation();
  const userService = useUserService();
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const completeRegistration = async () => {
      const endMark = monitoring.startMetric('complete_registration');
      setIsCompleting(true);

      try {
        // Get the hash parameters from the URL
        const hashParams = new URLSearchParams(window.location.hash.substr(1));
        const accessToken = hashParams.get('access_token');
        const type = hashParams.get('type');

        // Verify this is a valid email verification
        if (!accessToken || type !== 'email_change' && type !== 'signup') {
          throw new Error('Invalid verification link');
        }

        // Set the session
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: '',
        });

        if (sessionError) throw sessionError;

        // Complete the registration process
        if (userService.hasPendingRegistration()) {
          const { error: registrationError } = await userService.completeRegistration();
          if (registrationError) throw registrationError;
        }

        // Refresh the user's profile
        await auth.refreshProfile();

        // Navigate to home
        navigation.goTo('HOME', { replace: true });
      } catch (error) {
        console.error('Failed to complete registration:', error);
        setError('Failed to complete registration. Please try again.');
        monitoring.captureError(error as Error, {
          context: 'VerifySuccess',
          userId: auth.user?.id
        });
      } finally {
        setIsCompleting(false);
        endMark();
      }
    };

    completeRegistration();
  }, [auth, navigation, userService]);

  // Show error if something went wrong
  if (error) {
    return (
      <Container maxWidth="sm">
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <Typography component="h1" variant="h4" color="error" gutterBottom>
            Something Went Wrong
          </Typography>
          <Typography variant="body1" sx={{ mb: 4 }}>
            {error}
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigation.goTo('REGISTER', { replace: true })}
          >
            Try Again
          </Button>
        </Box>
      </Container>
    );
  }

  // Show loading screen while completing setup
  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <Typography component="h1" variant="h4" gutterBottom>
          {isCompleting ? 'Setting Up Your Account...' : 'Email Verified!'}
        </Typography>
        <LoadingScreen message="Please wait while we complete your registration..." />
      </Box>
    </Container>
  );
}
