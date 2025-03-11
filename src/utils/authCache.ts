import { Session, User } from '@supabase/supabase-js';
import { Profile } from '../types/database';

// Cache keys
const SESSION_KEY = 'auth_session';
const USER_KEY = 'auth_user';
const PROFILE_KEY = 'auth_profile';
const CACHE_TIMESTAMP_KEY = 'auth_cache_timestamp';

// Cache expiration time (4 hours)
const CACHE_EXPIRATION = 4 * 60 * 60 * 1000;

// Save session to cache
export const saveSessionToCache = (session: Session | null): void => {
  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    updateCacheTimestamp();
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
};

// Save user to cache
export const saveUserToCache = (user: User | null): void => {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    updateCacheTimestamp();
  } else {
    localStorage.removeItem(USER_KEY);
  }
};

// Save profile to cache
export const saveProfileToCache = (profile: Profile | null): void => {
  if (profile) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    updateCacheTimestamp();
  } else {
    localStorage.removeItem(PROFILE_KEY);
  }
};

// Get session from cache
export const getSessionFromCache = (): Session | null => {
  try {
    if (!isCacheValid()) return null;
    const cached = localStorage.getItem(SESSION_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch (err) {
    console.error('Error reading session from cache:', err);
    clearAuthCache();
    return null;
  }
};

// Get user from cache
export const getUserFromCache = (): User | null => {
  try {
    if (!isCacheValid()) return null;
    const cached = localStorage.getItem(USER_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch (err) {
    console.error('Error reading user from cache:', err);
    clearAuthCache();
    return null;
  }
};

// Get profile from cache
export const getProfileFromCache = (): Profile | null => {
  try {
    if (!isCacheValid()) return null;
    const cached = localStorage.getItem(PROFILE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch (err) {
    console.error('Error reading profile from cache:', err);
    clearAuthCache();
    return null;
  }
};

// Clear all auth cache
export const clearAuthCache = (): void => {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(PROFILE_KEY);
  localStorage.removeItem(CACHE_TIMESTAMP_KEY);
  console.debug('Auth cache cleared');
};

// Update cache timestamp
const updateCacheTimestamp = (): void => {
  localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
};

// Check if cache is still valid
export const isCacheValid = (): boolean => {
  const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
  if (!timestamp) return false;

  const cacheAge = Date.now() - parseInt(timestamp, 10);
  return cacheAge < CACHE_EXPIRATION;
};

// Debug utility to log cache state
export const logCacheState = (): void => {
  if (process.env.NODE_ENV !== 'development') return;

  console.debug('Auth Cache State:', {
    isValid: isCacheValid(),
    session: getSessionFromCache()?.user?.id,
    user: getUserFromCache()?.id,
    profile: getProfileFromCache()?.id,
    timestamp: localStorage.getItem(CACHE_TIMESTAMP_KEY),
  });
};
