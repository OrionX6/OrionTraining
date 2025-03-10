import React from 'react';
import { Container, Box, Typography, Button, Paper } from '@mui/material';
import { useLocation } from 'react-router-dom';
import { useNavigation } from '../hooks/useNavigation';
import { useMonitoring } from '../hooks/useMonitoring';

export default function NotFound() {
  const location = useLocation();
  const navigation = useNavigation();
  const { trackError } = useMonitoring('NotFound');

  // Log the 404 error
  React.useEffect(() => {
    trackError(new Error('Page not found'), {
      context: 'NotFound',
      path: location.pathname
    });
  }, [location.pathname, trackError]);

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
          <Typography variant="h1" component="h1" align="center">
            404
          </Typography>

          <Typography variant="h5" component="h2" align="center">
            Page Not Found
          </Typography>

          <Typography variant="body1" color="text.secondary" align="center">
            The page you're looking for ({location.pathname}) doesn't exist or has been moved.
          </Typography>

          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigation.goTo('HOME')}
            >
              Go to Home
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigation.goBack()}
            >
              Go Back
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
