import React, { useState } from 'react';
import { Box, CssBaseline, Stack, LinearProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useMonitoring } from '../hooks/useMonitoring';
import { useAuth } from '../contexts/AuthContext';
import UserMenu from '../components/UserMenu';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const theme = useTheme();
  const auth = useAuth();
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

          {/* Show user menu if authenticated or loading */}
          {(auth.isAuthenticated || auth.loading) && (
            <Box sx={{ p: 2 }}>
              <UserMenu />
            </Box>
          )}
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
