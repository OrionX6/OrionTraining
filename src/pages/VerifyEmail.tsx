import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  AlertTitle,
  Button,
  Link,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMonitoring } from '../hooks/useMonitoring';
import { MailOutline as MailIcon } from '@mui/icons-material';
import { supabase } from '../config/supabase';
import { ROUTES } from '../types/routes';

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { trackError, startOperation } = useMonitoring('VerifyEmail');
  
  const [isResending, setIsResending] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [resendCount, setResendCount] = useState(0);
  const [bypassVerification, setBypassVerification] = useState(false);
  const [isDevMode] = useState(process.env.NODE_ENV === 'development' || process.env.REACT_APP_EMAIL_VERIFY_TEST === 'true');

  const email = location.state?.email;
  const userId = location.state?.userId;
  const verificationSentAt = location.state?.verificationSentAt;
  
  // Check if we should enable development bypass
  useEffect(() => {
    if (isDevMode && bypassVerification) {
      const timer = setTimeout(() => {
        console.log('Development mode: Bypassing email verification');
        
        // Get the pending registration data from sessionStorage
        const pendingData = sessionStorage.getItem('pendingRegistration');
        if (!pendingData) {
          console.error('No pending registration data found for bypass mode');
          setDebugInfo('No pending registration data found for bypass mode');
          return;
        }
        
        // Log the data we're using for bypass
        console.log('Using pending registration data for bypass:', JSON.parse(pendingData));
        
        // Navigate to confirmation page with bypass mode enabled
        navigate(ROUTES.VERIFY_CONFIRMATION, { 
          replace: true,
          state: { 
            bypassMode: true,
            // Pass the email and userId to ensure they're available
            email: email || JSON.parse(pendingData).email,
            userId: userId || JSON.parse(pendingData).userId
          }
        });
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isDevMode, bypassVerification, navigate, email, userId]);

  // Handle resend verification
  const handleResendVerification = useCallback(async () => {
    const endMark = startOperation('resend_verification');
    setIsResending(true);
    setResendError(null);

    try {
      // Check if we've hit rate limit (3 attempts)
      if (resendCount >= 3) {
        throw new Error('Too many resend attempts. Please wait a while or contact support.');
      }

      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}${ROUTES.VERIFY_CONFIRMATION}`
        }
      });

      if (error) throw error;

      // Increment resend count
      setResendCount(prev => prev + 1);

      // Debug info in development
      if (process.env.NODE_ENV === 'development') {
        setDebugInfo(JSON.stringify({
          resendResponse: data,
          attempts: resendCount + 1,
          timestamp: new Date().toISOString(),
          userId,
          previousVerification: verificationSentAt
        }, null, 2));
      }

    } catch (err) {
      console.error('Failed to resend verification:', err);
      setResendError(
        err instanceof Error 
          ? err.message 
          : 'Failed to resend verification email'
      );
      trackError(err as Error, {
        context: 'VerifyEmail_Resend',
        email,
        userId,
        attempts: resendCount
      });
    } finally {
      setIsResending(false);
      endMark();
    }
  }, [email, userId, verificationSentAt, resendCount, trackError, startOperation]);

  // Track missing email error
  if (!email || !userId) {
    trackError(new Error('Missing registration data'), {
      context: 'VerifyEmail',
      state: location.state
    });
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          mt: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
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
            gap: 3
          }}
        >
          <MailIcon sx={{ fontSize: 48, color: 'primary.main' }} />

          <Typography variant="h5" component="h1" align="center" gutterBottom>
            Verify Your Email
          </Typography>

          {email ? (
            <>
              <Typography variant="body1" align="center" color="text.secondary">
                We've sent a verification email to:
              </Typography>
              
              <Typography variant="subtitle1" align="center" fontWeight="bold">
                {email}
              </Typography>

              <Typography variant="body2" align="center" color="text.secondary">
                Please check your inbox and click the verification link to complete your registration.
              </Typography>

              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  Waiting for verification...
                </Typography>
              </Box>

              {resendError && (
                <Alert severity="error" sx={{ width: '100%' }}>
                  <AlertTitle>Error Resending Email</AlertTitle>
                  {resendError}
                </Alert>
              )}

              {isDevMode && (
                <Alert severity="info" sx={{ width: '100%', mt: 2 }}>
                  <AlertTitle>Development Mode</AlertTitle>
                  <FormControlLabel
                    control={
                      <Checkbox 
                        checked={bypassVerification}
                        onChange={(e) => setBypassVerification(e.target.checked)}
                      />
                    }
                    label="Bypass email verification (development only)"
                  />
                </Alert>
              )}

              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                <Button
                  variant="outlined"
                  disabled={isResending || resendCount >= 3}
                  onClick={handleResendVerification}
                >
                  {isResending ? 'Sending...' : `Resend Verification Email ${resendCount > 0 ? `(${3 - resendCount} left)` : ''}`}
                </Button>

                <Button
                  variant="text"
                  color="inherit"
                  onClick={() => navigate(ROUTES.REGISTER, { replace: true })}
                >
                  Start Over
                </Button>
              </Box>
            </>
          ) : (
            <Alert severity="error" sx={{ width: '100%' }}>
              <AlertTitle>Registration Data Missing</AlertTitle>
              <Typography>
                The registration process was interrupted. Please{' '}
                <Link
                  component="button"
                  onClick={() => navigate(ROUTES.REGISTER, { replace: true })}
                >
                  start over
                </Link>
                .
              </Typography>
            </Alert>
          )}

          {debugInfo && process.env.NODE_ENV === 'development' && (
            <Alert severity="info" sx={{ width: '100%' }}>
              <AlertTitle>Debug Information</AlertTitle>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {debugInfo}
              </pre>
            </Alert>
          )}

          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" align="center">
              Having trouble? Make sure to check your spam folder or contact support.
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
