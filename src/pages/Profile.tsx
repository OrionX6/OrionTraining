import React from 'react';
import { Box, Container, Button, Typography, Paper, Avatar, Skeleton, Stack } from '@mui/material';
import { useRequireAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useNavigation } from '../hooks/useNavigation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function Profile() {
  const auth = useRequireAuth();
  const navigate = useNavigate();
  const navigation = useNavigation();

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
      <Box sx={{ display: 'flex', justifyContent: 'flex-start', mt: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigation.goTo('HOME')}
          variant="text"
          color="primary"
        >
          Back to Home
        </Button>
      </Box>
      <Paper sx={{ mt: 2, p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <Avatar
            src={auth.profile.avatar_url || undefined}
            sx={{ width: 80, height: 80, mr: 2 }}
          />
          <Box>
            <Typography variant="h5">
              {auth.profile.first_name
                ? `${auth.profile.first_name} ${auth.profile.last_name}`
                : 'Complete Your Profile'}
            </Typography>
            <Typography color="textSecondary">{auth.profile.email}</Typography>
            <Typography variant="caption" color="textSecondary">
              Role: {auth.profile.role}
            </Typography>
          </Box>
        </Box>

        <Box component="div">
          <Box sx={{ textAlign: 'right', mt: 3 }}>
            <Button variant="contained" onClick={() => navigate('/profile/edit')}>
              Edit Profile
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
