export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  VERIFY_EMAIL: '/verify-email',
  VERIFY_CONFIRMATION: '/verify-confirmation',
  VERIFY_SUCCESS: '/verify-success',
  PROFILE: '/profile',
  TERMS: '/terms',
  PRIVACY: '/privacy',
  NOT_FOUND: '/not-found',
  ADMIN: '/admin',
  SETTINGS: '/settings'
} as const;

export type RouteName = keyof typeof ROUTES;

export type RouteState = {
  email?: string;
  redirectTo?: string;
  from?: string;
  userId?: string;
  verificationSentAt?: string;
  organizationName?: string;
};

export interface NavigateOptions {
  replace?: boolean;
  state?: RouteState;
}
