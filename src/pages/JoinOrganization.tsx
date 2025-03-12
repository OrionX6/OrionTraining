import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { useServices } from '../hooks/useServices';
import { useAuth } from '../hooks/useAuth';
import { monitoring } from '../services/MonitoringService';
import { ROUTES } from '../types/routes';
import { CheckCircleOutline as SuccessIcon } from '@mui/icons-material';
import type { Invitation } from '../types/database';

export default function JoinOrganization() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { organizationService } = useServices();
  const { isAuthenticated, user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [invitation, setInvitation] = useState<Invitation | null>(null);

  // Get token from URL
  const token = searchParams.get('token');

  useEffect(() => {
    const verifyAndJoin = async () => {
      try {
        // Verify we have a token
        if (!token) {
          throw new Error('Invalid invitation link. No token provided.');
        }

        // Verify the user is authenticated
        if (!isAuthenticated || !user) {
          navigate(ROUTES.LOGIN, {
            state: { returnTo: window.location.pathname + window.location.search },
          });
          return;
        }

        // First verify the token and get invitation details
        const { data: inviteData, error: verifyError } =
          await organizationService.checkInvitationToken(token);

        if (verifyError) throw verifyError;

        if (!inviteData?.valid) {
          throw new Error('This invitation has expired or is no longer valid.');
        }

        setInvitation(inviteData.invitation);

        // Accept the invitation
        const { error: acceptError } = await organizationService.acceptInvitation(token);
        if (acceptError) throw acceptError;

        setIsSuccess(true);
        if (inviteData.invitation) {
          monitoring.startMetric('organization_join_success', {
            organizationId: inviteData.invitation.organization_id,
            role: inviteData.invitation.role,
          });
        }

        // Redirect to home after a short delay
        setTimeout(() => {
          navigate(ROUTES.HOME);
        }, 3000);
      } catch (err) {
        console.error('Failed to join organization:', err);
        setError(err instanceof Error ? err.message : 'Failed to join organization');
        monitoring.captureError(err as Error, {
          context: 'JoinOrganization',
          token,
        });
      } finally {
        setIsProcessing(false);
      }
    };

    verifyAndJoin();
  }, [token, isAuthenticated, user, navigate, organizationService]);

  if (isProcessing) {
    return (
      <Container maxWidth="sm">
        <Box
          sx={{
            mt: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <CircularProgress />
          <Typography>Verifying invitation...</Typography>
        </Box>
      </Container>
    );
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
          {isSuccess ? (
            <>
              <SuccessIcon sx={{ fontSize: 48, color: 'success.main' }} />
              <Typography variant="h5" component="h1" align="center">
                Welcome to the Organization!
              </Typography>
              <Typography variant="body1" align="center" color="text.secondary">
                You have successfully joined {invitation?.role ? `as a ${invitation.role}` : ''}.
              </Typography>
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  Redirecting to dashboard...
                </Typography>
              </Box>
            </>
          ) : (
            <>
              <Alert
                severity="error"
                sx={{ width: '100%' }}
                action={
                  <Button color="inherit" size="small" onClick={() => navigate(ROUTES.HOME)}>
                    Go Home
                  </Button>
                }
              >
                <AlertTitle>Failed to Join Organization</AlertTitle>
                {error || 'An unknown error occurred'}
              </Alert>
              <Typography variant="body2" color="text.secondary" align="center">
                Please contact your organization administrator or request a new invitation.
              </Typography>
            </>
          )}
        </Paper>
      </Box>
    </Container>
  );
}
