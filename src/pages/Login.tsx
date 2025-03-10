import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Link,
  Alert,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../hooks/useNavigation';
import LoadingScreen from '../components/LoadingScreen';
import { monitoring } from '../services/MonitoringService';

export default function Login() {
  const auth = useAuth();
  const navigation = useNavigation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle login submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const endMark = monitoring.startMetric('login_attempt');

    try {
      setError(null);
      setIsSubmitting(true);

      const { error: signInError } = await auth.signIn(email, password);
      if (signInError) throw signInError;

      // Get redirect path or default to home
      const redirectPath = sessionStorage.getItem('redirectAfterLogin') || '/';
      sessionStorage.removeItem('redirectAfterLogin');
      
      // Navigate to saved path
      navigation.goTo('HOME');
    } catch (err) {
      console.error('Login failed:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
      monitoring.captureError(err as Error, {
        context: 'Login',
        email,
      });
    } finally {
      setIsSubmitting(false);
      endMark();
    }
  }, [auth, email, password, navigation]);

  // Show loading screen if auth is initializing
  if (!auth.isInitialized) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  // Redirect if already authenticated
  if (auth.isAuthenticated) {
    navigation.goTo('HOME');
    return null;
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5">
          Sign In
        </Typography>

        {error && (
          <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
            {error}
          </Alert>
        )}

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ mt: 1, width: '100%' }}
        >
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={isSubmitting}
            sx={{ mt: 3, mb: 2 }}
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </Button>
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            {process.env.REACT_APP_ENABLE_REGISTRATION === 'true' && (
              <Link
                component="button"
                variant="body2"
                onClick={() => navigation.goTo('REGISTER')}
                sx={{ mb: 2, display: 'block' }}
              >
                Don't have an account? Sign up
              </Link>
            )}
          </Box>
        </Box>
      </Box>
    </Container>
  );
}
