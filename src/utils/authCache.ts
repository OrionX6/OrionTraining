/**
 * Utility functions for caching authentication state and profile data
 */

import { Session, User } from '@supabase/supabase-js';
import { Profile } from '../types/database';

// Cache keys
const AUTH_SESSION_KEY = 'auth_session';
const AUTH_USER_KEY = 'auth_user';
const AUTH_PROFILE_KEY = 'auth_profile';
const AUTH_TIMESTAMP_KEY = 'auth_timestamp';

// Cache expiration time (24 hours in milliseconds)
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000;

/**
 * Save session to localStorage
 */
export function saveSessionToCache(session: Session | null): void {
  if (session) {
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(AUTH_TIMESTAMP_KEY, Date.now().toString());
  } else {
    localStorage.removeItem(AUTH_SESSION_KEY);
    localStorage.removeItem(AUTH_TIMESTAMP_KEY);
  }
}

/**
 * Save user to localStorage
 */
export function saveUserToCache(user: User | null): void {
  if (user) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_USER_KEY);
  }
}

/**
 * Save profile to localStorage
 */
export function saveProfileToCache(profile: Profile | null): void {
  if (profile) {
    localStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(profile));
  } else {
    localStorage.removeItem(AUTH_PROFILE_KEY);
  }
}

/**
 * Get session from localStorage
 */
export function getSessionFromCache(): Session | null {
  try {
    const cachedTimestamp = localStorage.getItem(AUTH_TIMESTAMP_KEY);
    const cachedSession = localStorage.getItem(AUTH_SESSION_KEY);
    
    // Check if cache is expired
    if (cachedTimestamp && cachedSession) {
      const timestamp = parseInt(cachedTimestamp, 10);
      if (Date.now() - timestamp < CACHE_EXPIRATION) {
        return JSON.parse(cachedSession);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting session from cache:', error);
    return null;
  }
}

/**
 * Get user from localStorage
 */
export function getUserFromCache(): User | null {
  try {
    const cachedUser = localStorage.getItem(AUTH_USER_KEY);
    return cachedUser ? JSON.parse(cachedUser) : null;
  } catch (error) {
    console.error('Error getting user from cache:', error);
    return null;
  }
}

/**
 * Get profile from localStorage
 */
export function getProfileFromCache(): Profile | null {
  try {
    const cachedProfile = localStorage.getItem(AUTH_PROFILE_KEY);
    return cachedProfile ? JSON.parse(cachedProfile) : null;
  } catch (error) {
    console.error('Error getting profile from cache:', error);
    return null;
  }
}

/**
 * Clear all auth cache
 */
export function clearAuthCache(): void {
  localStorage.removeItem(AUTH_SESSION_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(AUTH_PROFILE_KEY);
  localStorage.removeItem(AUTH_TIMESTAMP_KEY);
}

/**
 * Check if cache is valid
 */
export function isCacheValid(): boolean {
  try {
    const cachedTimestamp = localStorage.getItem(AUTH_TIMESTAMP_KEY);
    if (!cachedTimestamp) return false;
    
    const timestamp = parseInt(cachedTimestamp, 10);
    return Date.now() - timestamp < CACHE_EXPIRATION;
  } catch (error) {
    return false;
  }
}
