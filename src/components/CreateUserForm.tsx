import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
  Checkbox,
  FormControlLabel,
  LinearProgress,
  Paper,
  Tooltip,
  Divider,
  Chip,
} from '@mui/material';
import { useServices } from '../hooks/useServices';
import { useAuth } from '../hooks/useAuth';
import { Profile, Region } from '../types/database';
import {
  Refresh as RefreshIcon,
  ContentCopy as CopyIcon,
  Email as EmailIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import RegionSelect from './RegionSelect';

interface Props {
  organizationId: string;
  onSuccess?: () => void;
}

interface FormData {
  email: string;
  firstName: string;
  lastName: string;
  role: Profile['role'];
  regionId: string | null;
}

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

function generateTempPassword() {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
}

export default function CreateUserForm({ organizationId, onSuccess }: Props) {
  const { userService } = useServices();
  const { profile } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    firstName: '',
    lastName: '',
    role: 'user',
    regionId: null,
  });
  const [tempPassword, setTempPassword] = useState(generateTempPassword());
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [copied, setCopied] = useState(false);
  const [lastCreatedUser, setLastCreatedUser] = useState<{
    email: string;
    password: string;
  } | null>(null);

  // Calculate password strength
  const passwordStrength = calculatePasswordStrength(tempPassword);
  const strengthColor = getStrengthColor(passwordStrength);
  const strengthLabel = getStrengthLabel(passwordStrength);

  const isRegionalRole = (role: Profile['role']) =>
    ['primary_admin', 'secondary_admin'].includes(role);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsLoading(true);

    try {
      // Validate region selection for regional admin roles
      if (isRegionalRole(formData.role) && !formData.regionId) {
        throw new Error('Region selection is required for regional admin roles');
      }

      // Create the user account
      const { error, data } = await userService.createUser({
        email: formData.email,
        password: tempPassword,
        role: formData.role,
        organizationId,
        sendEmail,
        firstName: formData.firstName,
        lastName: formData.lastName,
        regionId: formData.regionId,
      });

      if (error) throw error;

      // Store the created user info for the success message
      setLastCreatedUser({
        email: formData.email,
        password: tempPassword,
      });

      setSuccess(true);

      // Reset form for next user
      setFormData({
        email: '',
        firstName: '',
        lastName: '',
        role: 'user',
        regionId: null,
      });
      setTempPassword(generateTempPassword());

      // Notify parent component
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegeneratePassword = () => {
    setTempPassword(generateTempPassword());
    setCopied(false);
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);

    // Reset copied state after 2 seconds
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  // Reset copied state when component unmounts
  useEffect(() => {
    return () => {
      setCopied(false);
    };
  }, []);

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        width: '100%',
        maxWidth: 400,
      }}
    >
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess(false)}>
          <Typography variant="subtitle2" gutterBottom>
            User created successfully!
          </Typography>

          {lastCreatedUser && (
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.paper', mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">
                  <strong>Email:</strong> {lastCreatedUser.email}
                </Typography>
                <Tooltip title="Copy email">
                  <IconButton
                    size="small"
                    onClick={() => {
                      navigator.clipboard.writeText(lastCreatedUser.email);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? (
                      <CheckIcon fontSize="small" color="success" />
                    ) : (
                      <CopyIcon fontSize="small" />
                    )}
                  </IconButton>
                </Tooltip>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">
                  <strong>Password:</strong> {lastCreatedUser.password}
                </Typography>
                <Tooltip title="Copy password">
                  <IconButton
                    size="small"
                    onClick={() => {
                      navigator.clipboard.writeText(lastCreatedUser.password);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? (
                      <CheckIcon fontSize="small" color="success" />
                    ) : (
                      <CopyIcon fontSize="small" />
                    )}
                  </IconButton>
                </Tooltip>
              </Box>
            </Paper>
          )}
          <Typography variant="body2" color="text.secondary">
            The user will be prompted to change their password on first login.
          </Typography>
          {sendEmail && (
            <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
              Note: Please manually share these credentials with the user.
            </Typography>
          )}
        </Alert>
      )}

      <TextField
        required
        fullWidth
        label="Email"
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        disabled={isLoading}
      />

      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField
          fullWidth
          label="First Name"
          value={formData.firstName}
          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
          disabled={isLoading}
        />

        <TextField
          fullWidth
          label="Last Name"
          value={formData.lastName}
          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
          disabled={isLoading}
        />
      </Box>

      <Box sx={{ width: '100%' }}>
        <TextField
          required
          fullWidth
          label="Temporary Password"
          value={tempPassword}
          disabled
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title="Generate new password">
                  <IconButton onClick={handleRegeneratePassword} disabled={isLoading}>
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={copied ? 'Copied!' : 'Copy password'}>
                  <IconButton onClick={handleCopyPassword} disabled={isLoading}>
                    {copied ? <CheckIcon color="success" /> : <CopyIcon />}
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
          }}
        />

        {/* Password strength indicator */}
        <Box sx={{ mt: 1, mb: 1 }}>
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}
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
      </Box>

      <FormControl fullWidth required>
        <InputLabel>Role</InputLabel>
        <Select
          value={formData.role}
          onChange={(e) => {
            const newRole = e.target.value as Profile['role'];
            setFormData((prev) => ({
              ...prev,
              role: newRole,
              // Clear region if switching to non-regional role
              regionId: isRegionalRole(newRole) ? prev.regionId : null,
            }));
          }}
          label="Role"
          disabled={isLoading}
        >
          {profile?.role === 'super_admin' && <MenuItem value="super_admin">Super Admin</MenuItem>}
          <MenuItem value="admin">Admin</MenuItem>
          <MenuItem value="primary_admin">
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              Primary Admin
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                (requires region)
              </Typography>
            </Box>
          </MenuItem>
          <MenuItem value="secondary_admin">
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              Secondary Admin
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                (requires region)
              </Typography>
            </Box>
          </MenuItem>
          <MenuItem value="user">User</MenuItem>
        </Select>
        <FormHelperText>Select the user's role in the organization</FormHelperText>
      </FormControl>

      <RegionSelect
        organizationId={organizationId}
        value={formData.regionId}
        onChange={(regionId) => setFormData((prev) => ({ ...prev, regionId }))}
        required={isRegionalRole(formData.role)}
        error={isRegionalRole(formData.role) && !formData.regionId}
        helperText={
          isRegionalRole(formData.role)
            ? 'Region selection is required for this role'
            : 'Optionally assign user to a region'
        }
        disabled={isLoading}
      />

      <FormControlLabel
        control={
          <Checkbox
            checked={sendEmail}
            onChange={(e) => setSendEmail(e.target.checked)}
            disabled={isLoading}
            color="primary"
          />
        }
        label={
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <EmailIcon fontSize="small" sx={{ mr: 1, color: 'action.active' }} />
            <Typography variant="body2">Send login credentials via email</Typography>
          </Box>
        }
      />

      <Divider sx={{ my: 1 }} />

      <Button
        type="submit"
        variant="contained"
        color="primary"
        disabled={isLoading || (isRegionalRole(formData.role) && !formData.regionId)}
        startIcon={isLoading ? <CircularProgress size={20} /> : null}
      >
        Create User
      </Button>
    </Box>
  );
}
