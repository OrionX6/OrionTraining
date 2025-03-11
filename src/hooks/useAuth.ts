import { useEffect, useState, useCallback, useRef } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import { Profile } from '../types/database';
import { useUserService } from '../contexts/ServiceContext';
import { monitoring } from '../services/MonitoringService';
import { ROUTES, RouteName } from '../types/routes';
import {
  saveSessionToCache,
  saveUserToCache,
  saveProfileToCache,
  getSessionFromCache,
  getUserFromCache,
  getProfileFromCache,
  clearAuthCache,
  isCacheValid,
} from '../utils/authCache';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: Error | null;
}

interface SignUpOptions {
  email: string;
  password: string;
  metadata?: Record<string, any>;
}

export function useAuth() {
  const userService = useUserService();

  // Initialize state from cache if available
  const cachedSession = getSessionFromCache();
  const cachedUser = getUserFromCache();
  const cachedProfile = getProfileFromCache();
  const hasCachedAuth = !!(isCacheValid() && cachedSession && cachedUser);

  const [state, setState] = useState<AuthState>({
    session: cachedSession,
    user: cachedUser,
    profile: cachedProfile,
    isLoading: !hasCachedAuth || (hasCachedAuth && !cachedProfile), // Show loading if no profile
    isInitialized: hasCachedAuth && !!cachedProfile, // Only initialized with complete data
    error: null,
  });

  // Flag to track if we're loading in the background
  const isLoadingInBackground = useRef(false);

  // Debounce timer for profile loading
  const profileLoadingTimer = useRef<NodeJS.Timeout | null>(null);

  // Load profile data with timeout
  const loadProfile = useCallback(
    async (user: User, showLoading = true) => {
      // Prevent multiple simultaneous profile loading attempts
      if (isLoadingInBackground.current) {
        console.log('Profile loading already in progress, skipping');
        return;
      }

      // Set loading state if needed
      if (showLoading) {
        setState((current) => ({ ...current, isLoading: true }));
      } else {
        isLoadingInBackground.current = true;
      }

      const endMark = monitoring.startMetric('load_user_profile');

      // Create a promise that rejects after a timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Profile loading timed out'));
        }, 5000); // 5 second timeout

        // Clean up the timeout if the promise is resolved before the timeout
        return () => clearTimeout(timeoutId);
      });

      try {
        // Race the profile loading against the timeout
        const { data: profile, error } = (await Promise.race([
          userService.getCurrentUser(),
          timeoutPromise,
        ])) as { data: Profile | null; error: Error | null };

        if (error) {
          // If we get a "not found" error, it might be because the profile doesn't exist yet
          // This can happen during the registration process
          if (
            error.message &&
            (error.message.includes('No rows found') || error.message.includes('not found'))
          ) {
            console.log('Profile not found, user may be in registration process');
            setState((current) => ({
              ...current,
              profile: null,
              error: null, // Don't treat this as an error
              isLoading: false,
              isInitialized: true,
            }));
            return;
          }

          throw error;
        }

        // Update state with the profile
        setState((current) => ({
          ...current,
          profile,
          error: null,
          isLoading: false,
          isInitialized: true,
        }));

        // Cache the profile
        saveProfileToCache(profile);

        // If we have a session and user, cache them too
        if (state.session && state.user) {
          saveSessionToCache(state.session);
          saveUserToCache(state.user);
        }
      } catch (error) {
        console.error('Failed to load profile:', error);

        // If it's a timeout error, we still want to initialize the app
        // but mark that we couldn't load the profile
        const isTimeout = error instanceof Error && error.message === 'Profile loading timed out';

        setState((current) => ({
          ...current,
          profile: null,
          error: error as Error,
          isLoading: false,
          isInitialized: true, // Always mark as initialized even on error
        }));

        // Log the timeout specifically
        if (isTimeout) {
          monitoring.captureError(error as Error, {
            context: 'useAuth_loadProfile_timeout',
            userId: user.id,
            email: user.email,
          });
        }
      } finally {
        endMark();
        isLoadingInBackground.current = false;
      }
    },
    [userService, state.session, state.user]
  );

  // Background refresh of profile
  const refreshProfileInBackground = useCallback(
    (user: User) => {
      // Clear any existing timer
      if (profileLoadingTimer.current) {
        clearTimeout(profileLoadingTimer.current);
      }

      // Set a new timer to debounce multiple calls
      profileLoadingTimer.current = setTimeout(() => {
        loadProfile(user, false); // Load without showing loading state
      }, 300);
    },
    [loadProfile]
  );

  // Auth methods
  const signIn = useCallback(async (email: string, password: string) => {
    const endMark = monitoring.startMetric('sign_in');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Sign in failed:', error);
      return { data: null, error: error as AuthError };
    } finally {
      endMark();
    }
  }, []);

  const signUp = useCallback(async ({ email, password, metadata }: SignUpOptions) => {
    const endMark = monitoring.startMetric('sign_up');
    try {
      // Calculate redirect URL
      const baseUrl = window.location.origin;
      const redirectUrl = `${baseUrl}${ROUTES.VERIFY_CONFIRMATION}`;

      // Sign up with Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: metadata,
        },
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Sign up failed:', error);
      return { data: null, error: error as AuthError };
    } finally {
      endMark();
    }
  }, []);

  const signOut = useCallback(async () => {
    const endMark = monitoring.startMetric('sign_out');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clear the auth cache
      clearAuthCache();

      setState({
        session: null,
        user: null,
        profile: null,
        isLoading: false,
        isInitialized: true,
        error: null,
      });
    } catch (error) {
      console.error('Sign out failed:', error);
      setState((current) => ({
        ...current,
        error: error as Error,
      }));
    } finally {
      endMark();
    }
  }, []);

  const refreshProfile = useCallback(
    async (showLoading = true) => {
      if (!state.user) {
        console.warn('Cannot refresh profile: No user logged in');
        return;
      }

      if (showLoading) {
        setState((current) => ({ ...current, isLoading: true }));
        await loadProfile(state.user, true);
      } else {
        // Use the background refresh mechanism
        refreshProfileInBackground(state.user);
      }
    },
    [state.user, loadProfile, refreshProfileInBackground]
  );

  // Flag to prevent multiple initializations
  const isInitializing = useRef<boolean>(true);

  // Track last visibility change time to prevent too frequent refreshes
  const lastVisibilityChange = useRef<number>(0);

  // Initialize auth state
  useEffect(() => {
    if (!isInitializing.current) {
      return;
    }

    isInitializing.current = false;
    const endMark = monitoring.startMetric('auth_initialization');

    // Get initial session with timeout
    const initAuth = async () => {
      // If we have cached auth data, we can skip the loading state
      if (hasCachedAuth) {
        console.log('Using cached auth data for initial render');

        // Still fetch the latest data in the background, but only once
        if (cachedUser && !isLoadingInBackground.current) {
          refreshProfileInBackground(cachedUser);
        }

        return;
      }

      // Create a promise that rejects after a timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Auth initialization timed out'));
        }, 8000); // 8 second timeout

        // Clean up the timeout if the promise is resolved before the timeout
        return () => clearTimeout(timeoutId);
      });

      try {
        // Race the session loading against the timeout
        const { data, error } = (await Promise.race([
          supabase.auth.getSession(),
          timeoutPromise,
        ])) as { data: { session: Session | null }; error: Error | null };

        if (error) throw error;

        const session = data.session;
        if (session?.user) {
          // Update state with session and user
          setState((current) => ({
            ...current,
            session,
            user: session.user,
            isLoading: true,
            isInitialized: false,
          }));

          // Cache session and user
          saveSessionToCache(session);
          saveUserToCache(session.user);

          // Load profile
          await loadProfile(session.user);
        } else {
          // No session, clear cache and update state
          clearAuthCache();

          setState((current) => ({
            ...current,
            isLoading: false,
            isInitialized: true,
          }));
        }
      } catch (error) {
        console.error('Failed to get initial session:', error);

        // If it's a timeout error, we want to log it specifically
        const isTimeout =
          error instanceof Error && error.message === 'Auth initialization timed out';

        if (isTimeout) {
          console.warn('Auth initialization timed out, continuing without session');
          monitoring.captureError(error as Error, {
            context: 'useAuth_initAuth_timeout',
          });
        }

        // Always mark as initialized on error to prevent infinite loading
        setState((current) => ({
          ...current,
          error: error as Error,
          isLoading: false,
          isInitialized: true,
        }));
      }
    };

    initAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.debug('Auth state changed:', event, session ? 'session exists' : 'no session');

      if (session?.user) {
        // Update state with session and user
        setState((current) => ({
          ...current,
          session,
          user: session.user,
          isLoading: !hasCachedAuth, // Don't show loading if we have cached data
          isInitialized: hasCachedAuth, // Consider initialized if we have cached data
        }));

        // Cache session and user
        saveSessionToCache(session);
        saveUserToCache(session.user);

        // Always load profile, but decide on loading state
        if (!hasCachedAuth) {
          await loadProfile(session.user);
        } else {
          refreshProfileInBackground(session.user);
        }
      } else {
        // No session, clear cache and update state
        clearAuthCache();

        setState({
          session: null,
          user: null,
          profile: null,
          isLoading: false,
          isInitialized: true,
          error: null,
        });
      }
    });

    // Listen for visibility changes to refresh the profile when the user returns to the tab
    const handleVisibilityChange = () => {
      const now = Date.now();
      // Only refresh if it's been at least 5 seconds since the last refresh
      if (
        document.visibilityState === 'visible' &&
        state.user &&
        now - lastVisibilityChange.current > 5000
      ) {
        console.log('Tab became visible, refreshing profile in background');
        lastVisibilityChange.current = now;
        refreshProfileInBackground(state.user);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    endMark();

    // Cleanup
    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // Clear any pending timers
      if (profileLoadingTimer.current) {
        clearTimeout(profileLoadingTimer.current);
      }
    };
  }, [loadProfile, refreshProfileInBackground, hasCachedAuth, cachedUser, state.user]);

  return {
    ...state,
    loading: state.isLoading, // Backward compatibility
    isAuthenticated: !!state.session && !!state.user,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    refreshProfileInBackground: () => {
      if (state.user) {
        refreshProfileInBackground(state.user);
      } else {
        console.warn('Cannot refresh profile: No user logged in');
      }
    },
  };
}

// Helper hook for protected routes
export function useRequireAuth() {
  const auth = useAuth();

  useEffect(() => {
    if (!auth.loading && !auth.isAuthenticated) {
      const currentPath = window.location.pathname;
      if (currentPath !== ROUTES.LOGIN) {
        sessionStorage.setItem('redirectAfterLogin', currentPath);
      }
      window.location.href = ROUTES.LOGIN;
    }
  }, [auth.loading, auth.isAuthenticated]);

  return auth;
}

// Utility type for components that need auth
export type AuthProps = {
  auth: ReturnType<typeof useAuth>;
};
