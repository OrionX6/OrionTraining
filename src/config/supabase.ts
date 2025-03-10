import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';
import { monitoring } from '../services/MonitoringService';

// Get environment variables
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Check required environment variables
const checkConfig = (): void => {
  const missingVars = [];
  if (!supabaseUrl) missingVars.push('REACT_APP_SUPABASE_URL');
  if (!supabaseAnonKey) missingVars.push('REACT_APP_SUPABASE_ANON_KEY');

  if (missingVars.length > 0) {
    const error = new Error(
      `Missing Supabase configuration: ${missingVars.join(', ')}. ` +
      'Check your .env file and make sure it matches .env.example'
    );
    monitoring.captureError(error, { 
      context: 'SupabaseConfig',
      missingVars,
    });
    throw error;
  }

  // Log config status in development
  if (process.env.NODE_ENV === 'development') {
    console.debug('Supabase configuration:', {
      url: supabaseUrl,
      anon_key_length: supabaseAnonKey?.length,
      registration_enabled: process.env.REACT_APP_ENABLE_REGISTRATION
    });
  }
};

// Verify config immediately
checkConfig();

// Create Supabase client
export const supabase = createClient<Database>(
  supabaseUrl!,
  supabaseAnonKey!,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        'x-application-name': 'training-hub',
        'x-application-version': process.env.REACT_APP_VERSION || 'dev',
      },
    },
  }
);

// Set up auth state monitoring
supabase.auth.onAuthStateChange((event, session) => {
  console.debug('Auth state changed:', event, session ? 'session exists' : 'no session');
  monitoring.startMetric('auth_event', {
    event,
    hasSession: !!session,
    context: 'SupabaseClient',
  });
});

// Connection check utility
export const checkSupabaseConnection = async (timeoutMs = 5000): Promise<boolean> => {
  const endMark = monitoring.startMetric('check_connection');
  
  try {
    // Create a timeout promise
    const timeout = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), timeoutMs)
    );

    // Create the actual check promise
    const check = supabase.auth.getSession().then(response => {
      if (response.error) throw response.error;
      return response;
    });

    // Race between timeout and check
    await Promise.race([check, timeout]);
    
    console.debug('Supabase connection verified');
    return true;
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown connection error');
    console.error('Failed to connect to Supabase:', error);
    monitoring.captureError(error, {
      context: 'SupabaseClient',
      operation: 'connection_check',
    });
    return false;
  } finally {
    endMark();
  }
};
