interface Config {
  app: {
    name: string;
    environment: 'development' | 'staging' | 'production';
    version: string;
  };
  supabase: {
    url: string;
    anonKey: string;
  };
  features: {
    enableRegistration: boolean;
    enablePasswordReset: boolean;
    enableSocialAuth: boolean;
  };
  auth: {
    cookieLifetime: number;
    minPasswordLength: number;
  };
  api: {
    timeout: number;
    retryAttempts: number;
  };
  quiz: {
    timeLimit: number;
    passThreshold: number;
  };
}

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[`REACT_APP_${key}`];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable REACT_APP_${key} is not defined`);
  }
  return value || defaultValue || '';
};

const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
  const value = process.env[`REACT_APP_${key}`];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
};

const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = process.env[`REACT_APP_${key}`];
  if (!value) return defaultValue;
  const num = parseInt(value, 10);
  return isNaN(num) ? defaultValue : num;
};

export const config: Config = {
  app: {
    name: getEnvVar('NAME', 'Training Hub'),
    environment: getEnvVar('ENVIRONMENT', 'development') as Config['app']['environment'],
    version: getEnvVar('VERSION', '0.1.0'),
  },
  supabase: {
    url: getEnvVar('SUPABASE_URL'),
    anonKey: getEnvVar('SUPABASE_ANON_KEY'),
  },
  features: {
    enableRegistration: getEnvBoolean('ENABLE_REGISTRATION', false),
    enablePasswordReset: getEnvBoolean('ENABLE_PASSWORD_RESET', false),
    enableSocialAuth: getEnvBoolean('ENABLE_SOCIAL_AUTH', false),
  },
  auth: {
    cookieLifetime: getEnvNumber('AUTH_COOKIE_LIFETIME', 7),
    minPasswordLength: getEnvNumber('MIN_PASSWORD_LENGTH', 8),
  },
  api: {
    timeout: getEnvNumber('API_TIMEOUT', 30000),
    retryAttempts: getEnvNumber('API_RETRY_ATTEMPTS', 3),
  },
  quiz: {
    timeLimit: getEnvNumber('QUIZ_TIME_LIMIT', 3600),
    passThreshold: getEnvNumber('QUIZ_PASS_THRESHOLD', 0.7),
  },
};

export default config;
