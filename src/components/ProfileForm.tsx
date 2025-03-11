import React, { useState } from 'react';
import { Box, TextField, Button, Grid, Alert, CircularProgress } from '@mui/material';
import { Profile } from '../types/database';
// Import from full path to avoid circular dependencies
import AvatarUpload from '../components/AvatarUpload';

interface ProfileFormProps {
  profile: Profile;
  onSubmit: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
}

export default function ProfileForm({ profile, onSubmit }: ProfileFormProps) {
  const [formData, setFormData] = useState({
    first_name: profile.first_name || '',
    last_name: profile.last_name || '',
    avatar_url: profile.avatar_url || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear messages when form changes
    setError(null);
    setSuccess(false);
  };

  const handleAvatarChange = (url: string | null) => {
    setFormData((prev) => ({
      ...prev,
      avatar_url: url || '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const updates: Partial<Profile> = {};

      // Only include changed fields
      if (formData.first_name !== profile.first_name) {
        updates.first_name = formData.first_name || null;
      }
      if (formData.last_name !== profile.last_name) {
        updates.last_name = formData.last_name || null;
      }
      if (formData.avatar_url !== profile.avatar_url) {
        updates.avatar_url = formData.avatar_url || null;
      }

      // Only submit if there are changes
      if (Object.keys(updates).length > 0) {
        const { error } = await onSubmit(updates);
        if (error) {
          setError(error.message);
        } else {
          setSuccess(true);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Grid container spacing={3}>
        <Grid item xs={12} display="flex" justifyContent="center">
          <AvatarUpload currentUrl={formData.avatar_url} onUrlChange={handleAvatarChange} />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="First Name"
            name="first_name"
            value={formData.first_name}
            onChange={handleInputChange}
            disabled={loading}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Last Name"
            name="last_name"
            value={formData.last_name}
            onChange={handleInputChange}
            disabled={loading}
          />
        </Grid>

        {error && (
          <Grid item xs={12}>
            <Alert severity="error">{error}</Alert>
          </Grid>
        )}

        {success && (
          <Grid item xs={12}>
            <Alert severity="success">Profile updated successfully!</Alert>
          </Grid>
        )}

        <Grid item xs={12}>
          <Button type="submit" variant="contained" disabled={loading} sx={{ minWidth: 120 }}>
            {loading ? <CircularProgress size={24} /> : 'Save Changes'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}
