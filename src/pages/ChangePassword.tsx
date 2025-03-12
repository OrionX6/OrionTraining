import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  LinearProgress,
  Chip,
  Divider,
} from '@mui/material';
import { useServices } from '../hooks/useServices';
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '../types/routes';

// Calculate password strength score (0-100)
function calculatePasswordStrength(password: string): number {
  if (!password) return 0;

  let score = 0;

  // Length
  score += Math.min(password.length * 4, 25); // Max 25 points for length

  // Character variety
  if (/[a-z]/.test(password)) score += 10; // lowercase
  if (/[A-Z]/.test(password)) score += 15; // uppercase
  if (/[0-9]/.test(password)) score += 15; // numbers
  if (/[^a-zA-Z0-9]/.test(password)) score += 20; // special chars

  // Complexity bonus for mixed character types
  const charTypes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((regex) =>
    regex.test(password)
  ).length;
  score += (charTypes - 1) * 5; // Bonus for each additional char type

  return Math.min(score, 100); // Cap at 100
}

// Get color based on password strength
function getStrengthColor(strength: number): string {
  if (strength < 30) return '#f44336'; // red
  if (strength < 60) return '#ff9800'; // orange
  if (strength < 80) return '#ffeb3b'; // yellow
  return '#4caf50'; // green
}

// Get label based on password strength
function getStrengthLabel(strength: number): string {
  if (strength < 30) return 'Weak';
  if (strength < 60) return 'Fair';
  if (strength < 80) return 'Good';
  return 'Strong';
}

export default function ChangePassword() {
  const navigate = useNavigate();
  const { userService } = useServices();
  const { profile } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);

  // Calculate password strength
  const passwordStrength = calculatePasswordStrength(password);
  const strengthColor = getStrengthColor(passwordStrength);
  const strengthLabel = getStrengthLabel(passwordStrength);

  // Check if this is a new user
  useEffect(() => {
    const checkNewUser = async () => {
      try {
        // If created_by is set, this is a user created by an admin
        if (profile?.created_by) {
          setIsNewUser(true);
        }
      } catch (err) {
        console.error('Error checking new user status:', err);
      }
    };

    if (profile) {
      checkNewUser();
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate password
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Check all password requirements
    const requirements = [
      { test: password.length >= 8, message: 'Password must be at least 8 characters long' },
      {
        test: /[A-Z]/.test(password),
        message: 'Password must contain at least one uppercase letter',
      },
      { test: /[0-9]/.test(password), message: 'Password must contain at least one number' },
      {
        test: /[^a-zA-Z0-9]/.test(password),
        message: 'Password must contain at least one special character',
      },
    ];

    // Find the first failed requirement
    const failedRequirement = requirements.find((req) => !req.test);
    if (failedRequirement) {
      setError(failedRequirement.message);
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await userService.completePasswordChange(password);
      if (error) throw error;

      // Redirect to home page after successful password change
      navigate(ROUTES.HOME);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

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
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          {isNewUser ? (
            <>
              <Typography component="h1" variant="h5" align="center" gutterBottom>
                Welcome to the Team!
              </Typography>
              <Typography color="text.secondary" align="center" sx={{ mb: 1 }}>
                Your account has been created by an administrator.
              </Typography>
              <Typography color="text.secondary" align="center" sx={{ mb: 3 }}>
                Please set a permanent password to continue.
              </Typography>
            </>
          ) : (
            <>
              <Typography component="h1" variant="h5" align="center" gutterBottom>
                Change Password
              </Typography>
              <Typography color="text.secondary" align="center" sx={{ mb: 3 }}>
                Please set a new password for your account
              </Typography>
            </>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <Box sx={{ width: '100%' }}>
              <TextField
                margin="normal"
                required
                fullWidth
                label="New Password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />

              {/* Password strength indicator */}
              {password && (
                <Box sx={{ mt: 1, mb: 1 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      mb: 0.5,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      Password Strength
                    </Typography>
                    <Chip
                      label={strengthLabel}
                      size="small"
                      sx={{
                        bgcolor: strengthColor,
                        color: strengthColor === '#ffeb3b' ? 'text.primary' : 'white',
                        fontWeight: 'bold',
                      }}
                    />
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={passwordStrength}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: 'action.disabledBackground',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: strengthColor,
                      },
                    }}
                  />
                </Box>
              )}

              {/* Password requirements */}
              {password && (
                <Box sx={{ mt: 1, mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    Password requirements:
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography
                      variant="caption"
                      color={password.length >= 8 ? 'success.main' : 'text.secondary'}
                    >
                      • At least 8 characters
                    </Typography>
                    <Typography
                      variant="caption"
                      color={/[A-Z]/.test(password) ? 'success.main' : 'text.secondary'}
                    >
                      • At least one uppercase letter
                    </Typography>
                    <Typography
                      variant="caption"
                      color={/[0-9]/.test(password) ? 'success.main' : 'text.secondary'}
                    >
                      • At least one number
                    </Typography>
                    <Typography
                      variant="caption"
                      color={/[^a-zA-Z0-9]/.test(password) ? 'success.main' : 'text.secondary'}
                    >
                      • At least one special character
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>

            <TextField
              margin="normal"
              required
              fullWidth
              label="Confirm New Password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={isLoading}
              sx={{ mt: 3 }}
              startIcon={isLoading && <CircularProgress size={20} />}
            >
              Change Password
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
