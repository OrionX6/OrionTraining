import React, { useState, useCallback } from 'react';
import {
  Box,
  Container,
  TextField,
  Button,
  Typography,
  Alert,
  Paper,
  Avatar,
  Skeleton,
  Divider,
} from '@mui/material';
import { useRequireAuth } from '../contexts/AuthContext';
import { monitoring } from '../services/MonitoringService';

export default function Profile() {
  const auth = useRequireAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: auth.profile?.first_name || '',
    lastName: auth.profile?.last_name || '',
    avatarUrl: auth.profile?.avatar_url || '',
  });

  // Handle form changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // Handle save changes
  const handleSave = useCallback(async () => {
    const endMark = monitoring.startMetric('update_profile');
    setError(null);
    setIsSaving(true);

    try {
      // Only update changed fields
      const updates: Record<string, string> = {};
      if (formData.firstName !== auth.profile?.first_name) {
        updates.first_name = formData.firstName;
      }
      if (formData.lastName !== auth.profile?.last_name) {
        updates.last_name = formData.lastName;
      }
      if (formData.avatarUrl !== auth.profile?.avatar_url) {
        updates.avatar_url = formData.avatarUrl;
      }

      // Skip if no changes
      if (Object.keys(updates).length === 0) {
        setIsEditing(false);
        return;
      }

      // Update profile through auth context
      await auth.refreshProfile();
      setIsEditing(false);

    } catch (err) {
      console.error('Failed to update profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      monitoring.captureError(err as Error, {
        context: 'ProfileUpdate',
        userId: auth.user?.id,
      });
    } finally {
      setIsSaving(false);
      endMark();
    }
  }, [auth, formData]);

  // Reset form
  const handleCancel = () => {
    setFormData({
      firstName: auth.profile?.first_name || '',
      lastName: auth.profile?.last_name || '',
      avatarUrl: auth.profile?.avatar_url || '',
    });
    setIsEditing(false);
    setError(null);
  };

  if (!auth.profile) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ mt: 4 }}>
          <Skeleton variant="rectangular" height={200} />
          <Skeleton variant="text" sx={{ mt: 2 }} />
          <Skeleton variant="text" />
          <Skeleton variant="text" />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Paper sx={{ mt: 4, p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <Avatar
            src={auth.profile.avatar_url || undefined}
            sx={{ width: 80, height: 80, mr: 2 }}
          />
          <Box>
            <Typography variant="h5">
              {auth.profile.first_name ? 
                `${auth.profile.first_name} ${auth.profile.last_name}` : 
                'Complete Your Profile'}
            </Typography>
            <Typography color="textSecondary">
              {auth.profile.email}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Role: {auth.profile.role}
            </Typography>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" noValidate>
          <TextField
            margin="normal"
            fullWidth
            label="First Name"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            disabled={!isEditing || isSaving}
          />
          <TextField
            margin="normal"
            fullWidth
            label="Last Name"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            disabled={!isEditing || isSaving}
          />
          <TextField
            margin="normal"
            fullWidth
            label="Avatar URL"
            name="avatarUrl"
            value={formData.avatarUrl}
            onChange={handleChange}
            disabled={!isEditing || isSaving}
          />

          <Divider sx={{ my: 3 }} />

          {isEditing ? (
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </Button>
            </Box>
          )}
        </Box>
      </Paper>
    </Container>
  );
}
