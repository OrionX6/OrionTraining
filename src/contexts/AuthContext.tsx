import React, { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { monitoring } from '../services/MonitoringService';
import LoadingScreen from '../components/LoadingScreen';
export type { AuthProps } from '../hooks/useAuth';

const AuthContext = React.createContext<ReturnType<typeof useAuth> | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const auth = useAuth();

  // Track auth state changes
  useEffect(() => {
    const endMark = monitoring.startMetric('auth_state_change');
    try {
      if (process.env.NODE_ENV === 'development') {
        console.debug('Auth state:', {
          isAuthenticated: auth.isAuthenticated,
          isInitialized: !auth.loading,
          hasError: !!auth.error,
        });
      }
    } finally {
      endMark();
    }
  }, [auth.isAuthenticated, auth.loading, auth.error]);

  // Track error states
  useEffect(() => {
    if (auth.error) {
      monitoring.captureError(auth.error, {
        context: 'AuthProvider',
        isAuthenticated: auth.isAuthenticated,
        hasProfile: !!auth.profile,
      });
    }
  }, [auth.error, auth.isAuthenticated, auth.profile]);

  // Don't show loading screen for public routes
  const isPublicRoute = window.location.pathname.match(/^\/(login|register|verify-email|verify-success|terms|privacy)?$/);
  if (auth.loading && !isPublicRoute) {
    return <LoadingScreen message="Initializing..." />;
  }

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context with proper error messages
export function useAuthContext() {
  const auth = React.useContext(AuthContext);
  
  if (!auth) {
    const error = new Error(
      'useAuthContext must be used within an AuthProvider'
    );
    monitoring.captureError(error, { context: 'useAuthContext' });
    throw error;
  }
  
  return auth;
}

// Re-export auth hooks
export { useAuth, useRequireAuth } from '../hooks/useAuth';

// Helper hook for admin-only routes
export function useRequireAdmin() {
  const auth = useAuthContext();

  useEffect(() => {
    if (!auth.loading && auth.isAuthenticated && auth.profile?.role !== 'admin') {
      const error = new Error('Unauthorized access attempt to admin route');
      monitoring.captureError(error, {
        userId: auth.profile?.id,
        userRole: auth.profile?.role,
        context: 'useRequireAdmin'
      });
      window.location.href = '/';
    }
  }, [auth.loading, auth.isAuthenticated, auth.profile?.role, auth.profile?.id]);

  return auth;
}

// Export for use in other files
export { AuthContext };
