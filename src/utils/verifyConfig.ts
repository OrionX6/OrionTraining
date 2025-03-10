import { supabase } from '../config/supabase';

export const verifySupabaseConfig = async () => {
  console.group('🔍 Verifying Supabase Configuration');
  
  // Check environment variables
  const envVars = {
    SUPABASE_URL: process.env.REACT_APP_SUPABASE_URL,
    ANON_KEY: process.env.REACT_APP_SUPABASE_ANON_KEY ? '***' + process.env.REACT_APP_SUPABASE_ANON_KEY.slice(-6) : null,
    ENABLE_REGISTRATION: process.env.REACT_APP_ENABLE_REGISTRATION,
    DEBUG: process.env.REACT_APP_DEBUG,
    NODE_ENV: process.env.NODE_ENV,
    REDIRECT_URL: process.env.REACT_APP_REDIRECT_URL
  };

  console.log('📝 Environment Variables:', envVars);

  try {
    // Test Supabase connection
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Supabase Connection Error:', error);
      return false;
    }

    // Get service status
    const { data: healthData, error: healthError } = await supabase.rpc('check_service_health');
    
    console.log('🏥 Service Health:', healthError ? 'Error' : 'OK');
    if (healthError) {
      console.warn('⚠️ Health Check Error:', healthError);
    }

    // Test auth configuration - but don't actually create a test user
    // Just check if the API is accessible
    console.log('🔍 Testing auth API access...');
    
    // Instead of creating a test user, just check if we can access the auth API
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Auth API Access Error:', sessionError);
    } else {
      console.log('✅ Auth API Access: OK');
    }
    
    // Check if email auth is configured in the dashboard
    console.log('ℹ️ Email Auth: Please verify in Supabase Dashboard');
    console.log('ℹ️ URL Configuration: Please verify in Supabase Dashboard');

    console.log('✅ Configuration verified');
    return true;

  } catch (err) {
    console.error('❌ Verification failed:', err);
    return false;
  } finally {
    console.groupEnd();
  }
};

// RPC function for health check
const healthCheckSQL = `
create or replace function check_service_health()
returns jsonb
language plpgsql
security definer
as $$
begin
  return jsonb_build_object(
    'timestamp', now(),
    'database', true,
    'auth', true
  );
end;
$$;
`;

export const setupHealthCheck = async () => {
  try {
    await supabase.rpc('check_service_health');
  } catch (err) {
    console.warn('Health check not available:', err);
  }
};
