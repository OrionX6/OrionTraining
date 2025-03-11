import React from 'react';
import { Container, Paper, Typography, Box, Button, Stack } from '@mui/material';
import { useAuthContext } from '../contexts/AuthContext';
import { Profile } from '../types/database';
import { useServices } from '../hooks/useServices';
import { useNavigate } from 'react-router-dom';
import { useNavigation } from '../hooks/useNavigation';
import LoadingScreen from '../components/LoadingScreen';
import HomeIcon from '@mui/icons-material/Home';
// Import from full path to avoid circular dependencies
import ProfileForm from '../../src/components/ProfileForm';

export default function EditProfile() {
  const { profile, loading, refreshProfile } = useAuthContext();
  const { userService } = useServices();
  const navigate = useNavigate();
  const navigation = useNavigation();

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
          <Stack direction="row" spacing={2}>
            <Button startIcon={<HomeIcon />} onClick={() => navigation.goTo('HOME')} variant="text">
              Home
            </Button>
            <Button onClick={() => navigate('/profile')} variant="outlined">
              Back to Profile
            </Button>
          </Stack>
        </Box>
        <ProfileForm profile={profile} onSubmit={handleUpdateProfile} />
      </Paper>
    </Container>
  );
}
