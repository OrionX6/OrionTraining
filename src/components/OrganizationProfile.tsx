import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Typography,
  Paper,
} from '@mui/material';
import { Organization } from '../types/database';
import { useOrganizationService } from '../contexts/ServiceContext';
import { useAuthContext } from '../contexts/AuthContext';

interface OrganizationProfileProps {
  organization: Organization;
  onUpdate?: () => void;
}

export default function OrganizationProfile({ organization, onUpdate }: OrganizationProfileProps) {
  const [formData, setFormData] = useState({
    name: organization.name || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const organizationService = useOrganizationService();
  const auth = useAuthContext();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const updates: Partial<Organization> = {};

      // Only include changed fields
      if (formData.name !== organization.name) {
        updates.name = formData.name;
      }

      // Only submit if there are changes
      if (Object.keys(updates).length > 0) {
        const { data, error } = await organizationService.updateOrganization(
          organization.id,
          updates
        );

        if (error) {
          throw error;
        }

        if (data) {
          setSuccess(true);

          // Refresh the auth context to update organization data everywhere
          await auth.refreshProfile();

          // Call the onUpdate callback if provided
          if (onUpdate) {
            onUpdate();
          }
        }
      } else {
        setSuccess(true); // No changes needed
      }
    } catch (err) {
      console.error('Error updating organization:', err);
      setError(
        err instanceof Error ? err.message : 'An error occurred while updating the organization'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Organization Details
      </Typography>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Organization Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              disabled={loading}
              required
              error={formData.name.trim() === ''}
              helperText={formData.name.trim() === '' ? 'Organization name is required' : ''}
            />
          </Grid>

          {error && (
            <Grid item xs={12}>
              <Alert severity="error">{error}</Alert>
            </Grid>
          )}

          {success && (
            <Grid item xs={12}>
              <Alert severity="success">Organization updated successfully!</Alert>
            </Grid>
          )}

          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              disabled={loading || formData.name.trim() === ''}
              sx={{ minWidth: 120 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Save Changes'}
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
}
