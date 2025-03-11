import React, { useState } from 'react';
import { Box, CssBaseline, Stack, LinearProgress, Typography, Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useMonitoring } from '../hooks/useMonitoring';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../hooks/useNavigation';
import UserMenu from '../components/UserMenu';
import HomeIcon from '@mui/icons-material/Home';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const theme = useTheme();
  const auth = useAuth();
  const navigation = useNavigation();
  const { trackError } = useMonitoring('MainLayout');
  const [error, setError] = useState<Error | null>(null);

  // Handle caught errors
  const handleError = (error: Error) => {
    setError(error);
    trackError(error, {
      context: 'MainLayout',
      isAuthenticated: auth.isAuthenticated,
      hasProfile: !!auth.profile,
    });
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />

      {/* Main content area */}
      <Stack
        component="main"
        sx={{
          flex: 1,
          width: '100%',
          backgroundColor: theme.palette.background.default,
        }}
      >
        {/* Header area */}
        <Box
          sx={{
            position: 'relative',
            borderBottom: 1,
            borderColor: 'divider',
            minHeight: 64, // Match toolbar height
          }}
        >
          {/* Loading indicator */}
          {auth.loading && (
            <LinearProgress
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                zIndex: 1,
              }}
            />
          )}

          {/* Header content with app name/logo, organization name, and user menu */}
          <Box
            sx={{
              p: 2,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            {/* Left side: App name/logo and organization name */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Button
                startIcon={<HomeIcon />}
                onClick={() => navigation.goTo('HOME')}
                color="primary"
                sx={{ mr: 2, textTransform: 'none' }}
              >
                Training Hub
              </Button>

              {auth.isAuthenticated && !auth.loading && auth.profile?.organization && (
                <Typography
                  variant="subtitle1"
                  color="text.secondary"
                  sx={{
                    ml: 1,
                    borderLeft: 1,
                    borderColor: 'divider',
                    pl: 2,
                    display: { xs: 'none', sm: 'block' },
                  }}
                >
                  {auth.profile.organization.name}
                </Typography>
              )}
            </Box>

            {/* Right side: User menu */}
            {(auth.isAuthenticated || auth.loading) && <UserMenu />}
          </Box>
        </Box>

        {/* Page content */}
        <Box sx={{ flex: 1, p: 3 }}>{children}</Box>

        {/* Footer */}
        <Box
          component="footer"
          sx={{
            py: 3,
            px: 2,
            mt: 'auto',
            backgroundColor: theme.palette.background.paper,
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          <Stack direction="row" justifyContent="center" spacing={2}>
            {/* Add footer content here */}
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}
