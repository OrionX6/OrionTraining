export const ROUTES = {
  JOIN_ORGANIZATION: '/join-organization',
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  VERIFY_EMAIL: '/verify-email',
  VERIFY_CONFIRMATION: '/verify-confirmation',
  VERIFY_SUCCESS: '/verify-success',
  PRIVACY: '/privacy',
  TERMS: '/terms',
  PROFILE: '/profile',
  EDIT_PROFILE: '/profile/edit',
  ORGANIZATION_SETTINGS: '/organization/settings',
  CHANGE_PASSWORD: '/change-password',
} as const;

export type RouteName = keyof typeof ROUTES;

export interface NavigateOptions {
  replace?: boolean;
  state?: any;
}
