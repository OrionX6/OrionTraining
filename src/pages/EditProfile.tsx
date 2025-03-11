import React from 'react';
import { Container, Paper, Typography, Box, Button } from '@mui/material';
import { useAuthContext } from '../contexts/AuthContext';
import { Profile } from '../types/database';
import { useServices } from '../hooks/useServices';
import { useNavigate } from 'react-router-dom';
import LoadingScreen from '../components/LoadingScreen';
// Import from full path to avoid circular dependencies
import ProfileForm from '../../src/components/ProfileForm';

export default function EditProfile() {
  const { profile, loading, refreshProfile } = useAuthContext();
  const { userService } = useServices();
  const navigate = useNavigate();

  const handleUpdateProfile = async (updates: Partial<Profile>) => {
    const { error } = await userService.updateProfile(updates);
    if (!error) {
      await refreshProfile();
    }
    return { error };
  };

  if (loading || !profile) {
    return <LoadingScreen />;
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={2} sx={{ p: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            Edit Profile
          </Typography>
          <Button onClick={() => navigate('/profile')}>Back to Profile</Button>
        </Box>
        <ProfileForm profile={profile} onSubmit={handleUpdateProfile} />
      </Paper>
    </Container>
  );
}
