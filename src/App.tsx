import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import LoadingScreen from './components/LoadingScreen';
import ProtectedRoute, { AdminRoute } from './components/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';
import { useMonitoring } from './hooks/useMonitoring';
import { useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { monitoring } from './services/MonitoringService';
import MainLayout from './layouts/MainLayout';
import { ROUTES } from './types/routes';
import PasswordChangeGuard from './components/PasswordChangeGuard';

// Lazy load pages with error boundaries
const withErrorBoundaryAndSuspense = (
  Component: React.LazyExoticComponent<any>,
  isProtected = false,
  isAdmin = false,
  skipPasswordCheck = false
) => {
  const Wrapped = (
    <ErrorBoundary>
      <React.Suspense fallback={<LoadingScreen message="Loading page..." />}>
        {isProtected && !skipPasswordCheck ? (
          <PasswordChangeGuard>
            <Component />
          </PasswordChangeGuard>
        ) : (
          <Component />
        )}
      </React.Suspense>
    </ErrorBoundary>
  );

  if (isAdmin) {
    return <AdminRoute>{Wrapped}</AdminRoute>;
  }

  if (isProtected) {
    return <ProtectedRoute>{Wrapped}</ProtectedRoute>;
  }

  return Wrapped;
};

// Lazy load pages for better performance
const Home = React.lazy(() => import('./pages/Home'));
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const VerifyEmail = React.lazy(() => import('./pages/VerifyEmail'));
const VerifyConfirmation = React.lazy(() => import('./pages/VerifyConfirmation'));
const VerifySuccess = React.lazy(() => import('./pages/VerifySuccess'));
const Profile = React.lazy(() => import('./pages/Profile'));
const EditProfile = React.lazy(() => import('./pages/EditProfile'));
const OrganizationSettings = React.lazy(() => import('./pages/OrganizationSettings'));
const Terms = React.lazy(() => import('./pages/Terms'));
const Privacy = React.lazy(() => import('./pages/Privacy'));
const NotFound = React.lazy(() => import('./pages/NotFound'));
const JoinOrganization = React.lazy(() => import('./pages/JoinOrganization'));
const ChangePassword = React.lazy(() => import('./pages/ChangePassword'));

export default function App() {
  const auth = useAuth();
  const location = useLocation();
  const { trackNavigation, trackError } = useMonitoring('App', {
    autoTrackRender: false,
  });

  // Track route changes
  useEffect(() => {
    trackNavigation(location.pathname, {
      search: location.search,
      hash: location.hash,
      state: location.state,
    });
  }, [location, trackNavigation]);

  // Handle global errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      trackError(event.error, {
        type: 'global',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      trackError(event.reason, {
        type: 'unhandled_rejection',
        message: event.reason?.message || String(event.reason),
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [trackError]);

  // Add a timeout for auth initialization to prevent infinite loading
  const [forceInitialized, setForceInitialized] = React.useState(false);

  useEffect(() => {
    // If auth is already initialized, we don't need the timeout
    if (auth.isInitialized) {
      return;
    }

    // Set a timeout to force initialization after 10 seconds
    const timeoutId = setTimeout(() => {
      console.warn('Auth initialization timed out, forcing application to load');
      monitoring.captureError(new Error('Auth initialization timeout'), {
        context: 'App',
        isAuthenticated: auth.isAuthenticated,
        hasError: !!auth.error,
      });
      setForceInitialized(true);
    }, 10000); // 10 seconds timeout

    return () => clearTimeout(timeoutId);
  }, [auth.isInitialized, auth.isAuthenticated, auth.error]);

  // Show loading screen while auth is initializing
  if (!auth.isInitialized && !forceInitialized) {
    return <LoadingScreen message="Loading application..." />;
  }

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        monitoring.captureError(error, {
          context: 'AppRoot',
          componentStack: errorInfo.componentStack,
        });
      }}
    >
      <MainLayout>
        <Routes>
          {/* Change password route must be protected but without password check */}
          <Route
            path={ROUTES.CHANGE_PASSWORD}
            element={withErrorBoundaryAndSuspense(ChangePassword, true, false, true)}
          />

          {/* Public Routes */}
          <Route path={ROUTES.LOGIN} element={withErrorBoundaryAndSuspense(Login)} />
          <Route path={ROUTES.REGISTER} element={withErrorBoundaryAndSuspense(Register)} />
          <Route path={ROUTES.VERIFY_EMAIL} element={withErrorBoundaryAndSuspense(VerifyEmail)} />
          <Route
            path={ROUTES.VERIFY_CONFIRMATION}
            element={withErrorBoundaryAndSuspense(VerifyConfirmation)}
          />
          <Route
            path={ROUTES.VERIFY_SUCCESS}
            element={withErrorBoundaryAndSuspense(VerifySuccess)}
          />
          <Route path={ROUTES.TERMS} element={withErrorBoundaryAndSuspense(Terms)} />
          <Route path={ROUTES.PRIVACY} element={withErrorBoundaryAndSuspense(Privacy)} />
          <Route path="/not-found" element={withErrorBoundaryAndSuspense(NotFound)} />
          <Route
            path={ROUTES.JOIN_ORGANIZATION}
            element={withErrorBoundaryAndSuspense(JoinOrganization, true)}
          />

          {/* Protected Routes */}
          <Route path={ROUTES.PROFILE} element={withErrorBoundaryAndSuspense(Profile, true)} />
          <Route
            path={ROUTES.EDIT_PROFILE}
            element={withErrorBoundaryAndSuspense(EditProfile, true)}
          />
          <Route
            path={ROUTES.ORGANIZATION_SETTINGS}
            element={withErrorBoundaryAndSuspense(OrganizationSettings, true)}
          />

          {/* Protected Home Route */}
          <Route path={ROUTES.HOME} element={withErrorBoundaryAndSuspense(Home, true)} />

          {/* Catch-all route */}
          <Route path="*" element={withErrorBoundaryAndSuspense(NotFound)} />
        </Routes>
      </MainLayout>
    </ErrorBoundary>
  );
}
