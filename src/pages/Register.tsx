import React, { useState, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Link,
  Alert,
  AlertTitle,
  Paper,
  Collapse
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { useNavigation } from '../hooks/useNavigation';
import { useMonitoring } from '../hooks/useMonitoring';
import LoadingScreen from '../components/LoadingScreen';
import { supabase } from '../config/supabase';
import { ROUTES } from '../types/routes';

export default function Register() {
  const auth = useAuth();
  const navigation = useNavigation();
  const { trackError, startOperation } = useMonitoring('Register');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDebug, setShowDebug] = useState(process.env.NODE_ENV === 'development');

  // Handle registration
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const endMark = startOperation('registration_attempt');
    let signUpResponse: any = null;

    try {
      setError(null);
      setDebugInfo(null);
      setIsSubmitting(true);

      // Sign up with Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}${ROUTES.VERIFY_CONFIRMATION}`,
          data: {
            organization_name: organizationName,
            pending_setup: true
          }
        }
      });

      // Store response for debugging
      signUpResponse = { data: signUpData, error: signUpError };

      if (signUpError) throw signUpError;
      
      // Show debug info
      const debugData = {
        timestamp: new Date().toISOString(),
        user: signUpData.user,
        session: signUpData.session,
        emailConfirmed: signUpData.user?.email_confirmed_at,
        confirmationSent: signUpData.user?.confirmation_sent_at,
        redirectUrl: `${window.location.origin}${ROUTES.VERIFY_CONFIRMATION}`,
        origin: window.location.origin,
        apiUrl: process.env.REACT_APP_SUPABASE_URL,
        registrationEnabled: process.env.REACT_APP_ENABLE_REGISTRATION
      };
      
      setDebugInfo(debugData);
      console.log('Registration debug info:', debugData);

      if (!signUpData.user?.id) {
        throw new Error('No user ID returned from signup');
      }

      // We can't reliably check confirmation_sent_at due to auth schema restrictions
      // Instead, assume email was sent if user creation was successful
      
      // Store pending registration data with more details
      sessionStorage.setItem('pendingRegistration', JSON.stringify({
        email,
        organizationName,
        userId: signUpData.user.id,
        verificationSentAt: new Date().toISOString(),
        registrationComplete: false,
        // Add additional data that might be useful for debugging
        userMetadata: signUpData.user.user_metadata,
        appMetadata: signUpData.user.app_metadata,
        createdAt: signUpData.user.created_at
      }));
      
      // Log the stored data for debugging
      console.log('Stored registration data:', {
        email,
        userId: signUpData.user.id,
        organizationName,
        timestamp: new Date().toISOString()
      });

      // Navigate to verification page
      navigation.goTo('VERIFY_EMAIL', { 
        state: { 
          email,
          userId: signUpData.user.id,
          verificationSentAt: new Date().toISOString() // Use current time instead
        },
        replace: true
      });

    } catch (err) {
      console.error('Registration error:', err);
      console.log('Full signup response:', signUpResponse);
      
      let errorMessage = 'Registration failed. Please try again.';
      if (err instanceof Error) {
        if (err.message.includes('rate limit')) {
          errorMessage = 'Too many attempts. Please try again in a few minutes.';
        } else if (err.message.includes('already registered')) {
          errorMessage = 'This email is already registered. Please sign in instead.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      setDebugInfo({
        error: err,
        signUpResponse,
        timestamp: new Date().toISOString()
      });

      trackError(err as Error, {
        context: 'Registration',
        email,
        organizationName,
      });
    } finally {
      setIsSubmitting(false);
      endMark();
    }
  }, [email, password, organizationName, navigation, trackError, startOperation]);

  // Show loading screen if auth is initializing
  if (!auth.isInitialized) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  // Redirect if already authenticated
  if (auth.isAuthenticated) {
    navigation.goTo('HOME', { replace: true });
    return null;
  }

  // Form validation
  const minPasswordLength = Number(process.env.REACT_APP_MIN_PASSWORD_LENGTH) || 8;
  const isPasswordValid = password.length >= minPasswordLength;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isOrgNameValid = organizationName.length >= 3;
  const isFormValid = isEmailValid && isPasswordValid && isOrgNameValid && !isSubmitting;

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          mt: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography component="h1" variant="h5" align="center" gutterBottom>
            Create an Account
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <AlertTitle>Registration Failed</AlertTitle>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              id="organization"
              label="Organization Name"
              name="organization"
              autoComplete="organization"
              autoFocus
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              disabled={isSubmitting}
              error={organizationName !== '' && !isOrgNameValid}
              helperText={
                organizationName !== '' && !isOrgNameValid
                  ? 'Organization name must be at least 3 characters'
                  : ' '
              }
            />

            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              error={email !== '' && !isEmailValid}
              helperText={
                email !== '' && !isEmailValid
                  ? 'Please enter a valid email address'
                  : ' '
              }
            />

            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              error={password !== '' && !isPasswordValid}
              helperText={`Minimum ${minPasswordLength} characters`}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={!isFormValid}
            >
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </Button>

            {process.env.NODE_ENV === 'development' && (
              <Button
                fullWidth
                variant="outlined"
                color="inherit"
                size="small"
                onClick={() => setShowDebug(!showDebug)}
                sx={{ mb: 2 }}
              >
                {showDebug ? 'Hide Debug Info' : 'Show Debug Info'}
              </Button>
            )}

            <Collapse in={showDebug && !!debugInfo}>
              <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
                <AlertTitle>Debug Information</AlertTitle>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </Alert>
            </Collapse>

            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Already have an account?{' '}
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => navigation.goTo('LOGIN')}
                >
                  Sign in
                </Link>
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                By registering, you agree to our{' '}
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => navigation.goTo('TERMS')}
                >
                  Terms of Service
                </Link>
                {' '}and{' '}
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => navigation.goTo('PRIVACY')}
                >
                  Privacy Policy
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
