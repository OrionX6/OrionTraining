import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useServices } from '../hooks/useServices';
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '../types/routes';
import { Box, CircularProgress } from '@mui/material';

interface Props {
  children: React.ReactNode;
}

export default function PasswordChangeGuard({ children }: Props) {
  const location = useLocation();
  const { userService } = useServices();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [requiresChange, setRequiresChange] = useState(false);

  useEffect(() => {
    const checkPasswordChange = async () => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await userService.checkPasswordChangeRequired();
        setRequiresChange(data || false);
      } catch (error) {
        console.error('Error checking password change status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkPasswordChange();
  }, [isAuthenticated, userService]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (requiresChange && location.pathname !== ROUTES.CHANGE_PASSWORD) {
    return <Navigate to={ROUTES.CHANGE_PASSWORD} state={{ from: location }} replace />;
  }

  // Don't allow accessing the change password page unless required
  if (!requiresChange && location.pathname === ROUTES.CHANGE_PASSWORD) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return <>{children}</>;
}
