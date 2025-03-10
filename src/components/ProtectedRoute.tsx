import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useMonitoring } from '../hooks/useMonitoring';
import LoadingScreen from './LoadingScreen';
import { ErrorBoundary } from './ErrorBoundary';
import { ROUTES } from '../types/routes';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { trackNavigation, trackError } = useMonitoring('ProtectedRoute');

  useEffect(() => {
    const checkAccess = () => {
      if (!auth.isAuthenticated) {
        // Store the attempted path for redirect after login
        sessionStorage.setItem('redirectAfterLogin', location.pathname);
        
        trackNavigation(ROUTES.LOGIN, {
          reason: 'unauthenticated',
          from: location.pathname
        });
        
        navigate(ROUTES.LOGIN, { replace: true });
        return;
      }

      if (requireAdmin && auth.profile?.role !== 'admin') {
        trackError(new Error('Unauthorized access attempt'), {
          context: 'ProtectedRoute',
          path: location.pathname,
          userRole: auth.profile?.role,
          requireAdmin
        });

        navigate(ROUTES.HOME, { replace: true });
        return;
      }
    };

    if (!auth.loading) {
      checkAccess();
    }
  }, [
    auth.isAuthenticated,
    auth.loading,
    auth.profile?.role,
    location.pathname,
    navigate,
    requireAdmin,
    trackNavigation,
    trackError
  ]);

  // Show loading screen while checking auth
  if (auth.loading) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  // If user is not authenticated, the useEffect will handle redirect
  if (!auth.isAuthenticated) {
    return null;
  }

  // If admin is required but user is not admin
  if (requireAdmin && auth.profile?.role !== 'admin') {
    return null;
  }

  // Wrap the protected content in an error boundary
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        trackError(error, {
          context: 'ProtectedRoute',
          path: location.pathname,
          componentStack: errorInfo.componentStack,
          userRole: auth.profile?.role
        });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * HOC for protecting routes
 */
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<ProtectedRouteProps, 'children'> = {}
): React.ComponentType<P> {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

/**
 * Helper function for creating admin routes
 */
export function AdminRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requireAdmin>{children}</ProtectedRoute>;
}

/**
 * HOC for admin-only routes
 */
export function withAdminRoute<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function AdminComponent(props: P) {
    return (
      <AdminRoute>
        <Component {...props} />
      </AdminRoute>
    );
  };
}
