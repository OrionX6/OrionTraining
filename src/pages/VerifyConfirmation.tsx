import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  AlertTitle,
  Button,
} from '@mui/material';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { useMonitoring } from '../hooks/useMonitoring';
import { useUserService } from '../contexts/ServiceContext';
import { useAuthContext } from '../contexts/AuthContext';
import { ROUTES } from '../types/routes';
import { CheckCircleOutline as SuccessIcon } from '@mui/icons-material';
import LoadingScreen from '../components/LoadingScreen';
import { clearAuthCache } from '../utils/authCache';
import { RegistrationResult } from '../types/database';
import { Session } from '@supabase/supabase-js';

interface PendingRegistration {
  email: string;
  organizationName: string;
  userId: string;
}

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

export default function VerifyConfirmation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const userService = useUserService();
  const auth = useAuthContext();
  const { trackError, startOperation } = useMonitoring('VerifyConfirmation');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const isBypassMode = location.state?.bypassMode === true;

  // Function to handle registration result
  const handleRegistrationResponse = useCallback(
    async (result: { data: RegistrationResult | null; error: any }) => {
      try {
        if (result.error) {
          // If the error indicates profile exists, treat as success
          if (result.error.message?.includes('Profile already exists')) {
            console.log('Profile already exists, completing registration');
            setIsSuccess(true);
            clearAuthCache();
            await auth.refreshProfile(true);
            return true;
          }

          const errorMessage = result.error?.message || 'Registration failed';
          console.error('Registration error:', { error: result.error, message: errorMessage });
          setError(errorMessage);
          setDebugInfo((prev: any) => ({
            ...prev,
            error: result.error,
            message: errorMessage,
            timestamp: new Date().toISOString(),
          }));
          return false;
        }

        if (result.data?.status === 'success') {
          console.log('Registration successful:', result.data);

          // Clear cache and reload profile
          clearAuthCache();
          await auth.refreshProfile(true);

          // Update debug info with success data
          setDebugInfo((prev: any) => ({
            ...prev,
            registrationResult: result.data,
            message: 'Registration completed successfully',
            timestamp: new Date().toISOString(),
          }));

          setIsSuccess(true);
          sessionStorage.removeItem('pendingRegistration');

          setTimeout(() => {
            navigate(ROUTES.HOME, { replace: true });
          }, 3000);

          return true;
        }

        return false;
      } catch (err) {
        console.error('Error handling registration response:', err);
        setError('Failed to complete registration');
        return false;
      }
    },
    [auth, navigate]
  );

  // Function to handle authentication from URL
  const handleAuthFromUrl = useCallback(async (): Promise<Session> => {
    const endMark = startOperation('handle_auth_url');
    try {
      // Check if we have a token in the URL
      const hasTokenInUrl = window.location.hash.includes('access_token');

      if (hasTokenInUrl) {
        console.log('Found authentication token in URL, attempting to authenticate...');

        // Process the URL hash for authentication
        const { data, error } = await supabase.auth.setSession({
          access_token:
            new URLSearchParams(window.location.hash.substring(1)).get('access_token') || '',
          refresh_token:
            new URLSearchParams(window.location.hash.substring(1)).get('refresh_token') || '',
        });

        if (error) {
          console.error('Error getting session from URL:', error);
          throw error;
        }

        if (data?.session) {
          console.log('Successfully authenticated from URL token');
          return data.session;
        }
      }

      // If no token in URL or authentication failed, try to get existing session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      if (!session?.user) {
        throw new Error('No authenticated user found');
      }

      return session;
    } catch (err) {
      console.error('Authentication error:', err);
      throw err;
    } finally {
      endMark();
    }
  }, [startOperation]);

  // Function to complete registration with retry logic
  const completeRegistration = useCallback(
    async (currentRetry = 0): Promise<void> => {
      const endMark = startOperation('complete_registration');
      try {
        // Handle development bypass mode
        if (isBypassMode) {
          console.log('Development mode: Bypassing normal verification flow');
          setIsSuccess(true);
          setTimeout(() => {
            navigate(ROUTES.HOME, { replace: true });
          }, 3000);
          return;
        }

        // Get session
        const session = await handleAuthFromUrl();
        console.log('Got session:', {
          userId: session.user.id,
          email: session.user.email,
        });

        // Try to get pending registration data
        let registration: PendingRegistration;
        const pendingData = sessionStorage.getItem('pendingRegistration');

        if (pendingData) {
          registration = JSON.parse(pendingData);
          console.log('Using stored registration data:', registration);
        } else {
          // If no stored data, reconstruct from session
          if (!session?.user?.email) {
            throw new Error('User email not found in session');
          }

          registration = {
            email: session.user.email,
            organizationName: session.user.user_metadata?.organization_name || 'Organization',
            userId: session.user.id,
          };

          console.log('Reconstructed registration data:', registration);
          sessionStorage.setItem('pendingRegistration', JSON.stringify(registration));
        }

        // Store registration data in service
        await userService.initiateRegistration(registration.email, registration.organizationName);

        // Complete registration
        const result = await userService.completeRegistration();
        const success = await handleRegistrationResponse(result);

        if (!success && currentRetry < MAX_RETRIES) {
          const nextRetry = currentRetry + 1;
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, currentRetry); // Exponential backoff

          console.log(`Retrying registration (${nextRetry}/${MAX_RETRIES})...`);

          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, delay));
          return completeRegistration(nextRetry);
        }

        if (!success && currentRetry >= MAX_RETRIES) {
          throw new Error('Registration failed after maximum retries');
        }
      } catch (err) {
        console.error('Registration error:', err);
        setError(err instanceof Error ? err.message : 'Registration failed');
        trackError(err as Error, { context: 'email_verification' });
      } finally {
        setIsProcessing(false);
        endMark();
      }
    },
    [
      navigate,
      trackError,
      startOperation,
      isBypassMode,
      handleAuthFromUrl,
      userService,
      handleRegistrationResponse,
    ]
  );

  // Effect to run registration
  useEffect(() => {
    completeRegistration(0);
  }, [completeRegistration]);

  if (isProcessing) {
    return <LoadingScreen message="Completing your registration..." />;
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          mt: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
          }}
        >
          {process.env.NODE_ENV === 'development' && debugInfo && (
            <Alert severity="info" sx={{ width: '100%', mb: 3 }}>
              <AlertTitle>Debug Information</AlertTitle>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </Alert>
          )}

          {isSuccess ? (
            <>
              <SuccessIcon
                sx={{
                  fontSize: 48,
                  color: 'success.main',
                }}
              />
              <Typography variant="h5" component="h1" align="center">
                Registration Complete!
              </Typography>
              <Typography variant="body1" align="center" color="text.secondary">
                Your account has been verified and your organization is set up. Redirecting to the
                dashboard...
              </Typography>
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  Redirecting...
                </Typography>
              </Box>
            </>
          ) : (
            <>
              <Alert
                severity="error"
                sx={{ width: '100%' }}
                action={
                  <Button color="inherit" size="small" onClick={() => navigate(ROUTES.REGISTER)}>
                    Try Again
                  </Button>
                }
              >
                {error || 'Verification failed. Please try again.'}
              </Alert>
              <Typography variant="body2" color="text.secondary" align="center">
                If you continue to have problems, please contact support.
              </Typography>
            </>
          )}
        </Paper>
      </Box>
    </Container>
  );
}
