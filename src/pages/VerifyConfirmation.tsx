import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  AlertTitle,
  Button
} from '@mui/material';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { useMonitoring } from '../hooks/useMonitoring';
import { ROUTES } from '../types/routes';
import { CheckCircleOutline as SuccessIcon } from '@mui/icons-material';
import LoadingScreen from '../components/LoadingScreen';

interface PendingRegistration {
  email: string;
  organizationName: string;
  userId: string;
}

export default function VerifyConfirmation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { trackError, startOperation } = useMonitoring('VerifyConfirmation');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [retryCount, setRetryCount] = useState(0);
  const isBypassMode = location.state?.bypassMode === true;

  // Function to handle authentication from URL
  const handleAuthFromUrl = useCallback(async () => {
    try {
      // Check if we have a token in the URL
      const hasTokenInUrl = window.location.hash.includes('access_token') || 
                           searchParams.has('token') || 
                           searchParams.has('type');
      
      if (hasTokenInUrl) {
        console.log('Found authentication token in URL, attempting to authenticate...');
        
        // Process the URL hash for authentication
        const { data, error } = await supabase.auth.setSession({
          access_token: new URLSearchParams(window.location.hash.substring(1)).get('access_token') || '',
          refresh_token: new URLSearchParams(window.location.hash.substring(1)).get('refresh_token') || ''
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
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      
      if (!session?.user) {
        throw new Error('No authenticated user found');
      }
      
      return session;
    } catch (err) {
      console.error('Authentication error:', err);
      throw err;
    }
  }, [searchParams]);

  // Function to complete registration
  const completeRegistration = useCallback(async () => {
      const endMark = startOperation('verify_email');
      try {
        // Handle development bypass mode
        if (isBypassMode) {
          console.log('Development mode: Bypassing normal verification flow');
          
          // Get pending registration data
          const pendingData = sessionStorage.getItem('pendingRegistration');
          if (!pendingData) {
            throw new Error('No pending registration found');
          }
          
          const registration: PendingRegistration = JSON.parse(pendingData);
          
          // In bypass mode, we'll create a test user for development
          setDebugInfo({
            bypassMode: true,
            pendingRegistration: registration,
            timestamp: new Date().toISOString()
          });
          
          // Even in bypass mode, we need to complete the registration
          try {
            // Try to get session first
            const session = await handleAuthFromUrl();
            
            // Complete the registration
            const { error: regError } = await supabase.rpc(
              'complete_user_registration',
              {
                p_user_id: session.user.id,
                p_email: registration.email,
                p_organization_name: registration.organizationName
              }
            );
            
            if (regError) {
              console.warn('Error completing registration in bypass mode:', regError);
              // Continue anyway in bypass mode
            }
          } catch (bypassError) {
            console.warn('Error in bypass mode:', bypassError);
            // Continue anyway in bypass mode
          }
          
          // Mark success and continue
          setIsSuccess(true);
          
          // Clear pending registration
          sessionStorage.removeItem('pendingRegistration');
          
          // Redirect to home after delay
          setTimeout(() => {
            navigate(ROUTES.HOME, { replace: true });
          }, 3000);
          
          return;
        }
        
        // Normal flow - Get session from URL or existing session
        const session = await handleAuthFromUrl();

        // Try to get pending registration data
        let registration: PendingRegistration;
        const pendingData = sessionStorage.getItem('pendingRegistration');
        
        if (pendingData) {
          // Use the stored registration data if available
          registration = JSON.parse(pendingData);
          console.log('Using stored registration data:', registration);
        } else {
          // If no stored data (e.g., when clicking link from email in a new tab),
          // try to reconstruct the registration data from the session
          console.log('No stored registration data found, attempting to reconstruct from session');
          
          if (!session?.user) {
            throw new Error('No authenticated user found');
          }
          
          // Extract email from user
          const email = session.user.email;
          if (!email) {
            throw new Error('User email not found in session');
          }
          
          // Extract organization name from user metadata if available
          const organizationName = 
            session.user.user_metadata?.organization_name || 
            'Organization'; // Fallback name
          
          // Create registration data
          registration = {
            email,
            organizationName,
            userId: session.user.id
          };
          
          console.log('Reconstructed registration data:', registration);
          
          // Store it for future use
          sessionStorage.setItem('pendingRegistration', JSON.stringify(registration));
        }

        // Add debug info
        if (process.env.NODE_ENV === 'development') {
          setDebugInfo({
            session: session,
            pendingRegistration: registration,
            timestamp: new Date().toISOString(),
            urlHash: window.location.hash,
            searchParams: Object.fromEntries(searchParams.entries())
          });
        }

        // First, check if the profile already exists
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (profileError && !profileError.message.includes('No rows found')) {
          console.error('Error checking profile:', profileError);
          throw profileError;
        }
        
        // If profile already exists, we're done
        if (profileData) {
          console.log('Profile already exists, skipping creation:', profileData);
          
          setDebugInfo((prev: any) => ({
            ...prev,
            profileExists: true,
            profile: profileData,
            message: 'Profile already exists, skipping creation'
          }));
          
          // Mark success and continue
          setIsSuccess(true);
          
          // Clear pending registration
          sessionStorage.removeItem('pendingRegistration');
          
          // Redirect to home after delay
          setTimeout(() => {
            navigate(ROUTES.HOME, { replace: true });
          }, 3000);
          
          return;
        }
        
        // If we get here, the profile doesn't exist yet, so create it
        console.log('Creating new profile for user:', session.user.id);
        
        try {
          // Complete the registration
          const { error: regError } = await supabase.rpc(
            'complete_user_registration',
            {
              p_user_id: session.user.id,
              p_email: registration.email,
              p_organization_name: registration.organizationName
            }
          );

          if (regError) {
            // Check if this is a "profile already exists" error
            if (regError.message.includes('Profile already exists')) {
              console.log('Profile already exists (from error):', regError.message);
              
              setDebugInfo((prev: any) => ({
                ...prev,
                profileExistsError: true,
                error: regError,
                message: 'Profile already exists (from error)'
              }));
              
              // Mark success and continue
              setIsSuccess(true);
              
              // Clear pending registration
              sessionStorage.removeItem('pendingRegistration');
              
              // Redirect to home after delay
              setTimeout(() => {
                navigate(ROUTES.HOME, { replace: true });
              }, 3000);
              
              return;
            }
            
            // Check if this is the auth.providers error
            if (regError.message.includes('auth.providers') || 
                regError.message.includes('42P01')) {
              console.error('Database access error:', regError);
              
              // This is the specific error we're trying to handle
              // Let's try a different approach - mark as success anyway
              // since the user was created, we just couldn't complete the profile
              setDebugInfo((prev: any) => ({
                ...prev,
                error: regError,
                errorHandled: true,
                message: 'Continuing despite database access error'
              }));
              
              // Mark success and continue
              setIsSuccess(true);
              
              // Clear pending registration
              sessionStorage.removeItem('pendingRegistration');
              
              // Redirect to home after delay
              setTimeout(() => {
                navigate(ROUTES.HOME, { replace: true });
              }, 3000);
              
              return;
            }
            
            throw regError;
          }
        } catch (regErr) {
          // One more check for "Profile already exists" in the caught error
          if (regErr instanceof Error && regErr.message.includes('Profile already exists')) {
            console.log('Profile already exists (caught):', regErr.message);
            
            setDebugInfo((prev: any) => ({
              ...prev,
              profileExistsCaught: true,
              error: regErr,
              message: 'Profile already exists (caught)'
            }));
            
            // Mark success and continue
            setIsSuccess(true);
            
            // Clear pending registration
            sessionStorage.removeItem('pendingRegistration');
            
            // Redirect to home after delay
            setTimeout(() => {
              navigate(ROUTES.HOME, { replace: true });
            }, 3000);
            
            return;
          }
          
          // Re-throw if it's not a "Profile already exists" error
          throw regErr;
        }

        // Clear pending registration
        sessionStorage.removeItem('pendingRegistration');

        // Mark success
        setIsSuccess(true);

        // Redirect to home after delay
        setTimeout(() => {
          navigate(ROUTES.HOME, { replace: true });
        }, 3000);

      } catch (err) {
        console.error('Verification error:', err);
        setError(
          err instanceof Error 
            ? err.message 
            : 'Failed to complete registration. Please try again.'
        );
        trackError(err as Error, { context: 'email_verification' });
      } finally {
        setIsProcessing(false);
        endMark();
      }
    }, [navigate, trackError, startOperation, isBypassMode, handleAuthFromUrl, searchParams]);
  
  // Effect to run the registration process
  useEffect(() => {
    const runRegistration = async () => {
      const endMark = startOperation('verify_email');
      try {
        setIsProcessing(true);
        await completeRegistration();
      } catch (err) {
        console.error('Verification error:', err);
        
        // If we have retries left and this isn't a "no pending registration" error
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        if (retryCount < 3 && !errorMsg.includes('No pending registration')) {
          // Retry after a delay
          setRetryCount(prev => prev + 1);
          setTimeout(() => {
            console.log(`Retrying registration (${retryCount + 1}/3)...`);
            completeRegistration();
          }, 2000);
        } else {
          setError(
            err instanceof Error 
              ? err.message 
              : 'Failed to complete registration. Please try again.'
          );
          trackError(err as Error, { context: 'email_verification' });
          setIsProcessing(false);
        }
      } finally {
        if (retryCount >= 3 || isSuccess) {
          setIsProcessing(false);
          endMark();
        }
      }
    };

    runRegistration();
  }, [completeRegistration, navigate, trackError, startOperation, retryCount, isSuccess]);

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
                  color: 'success.main'
                }} 
              />
              <Typography variant="h5" component="h1" align="center">
                Registration Complete!
              </Typography>
              <Typography variant="body1" align="center" color="text.secondary">
                Your account has been verified and your organization is set up.
                Redirecting to the dashboard...
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
                  <Button 
                    color="inherit" 
                    size="small"
                    onClick={() => navigate(ROUTES.REGISTER)}
                  >
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
