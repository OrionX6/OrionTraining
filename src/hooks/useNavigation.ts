import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES, RouteName, NavigateOptions } from '../types/routes';
import { useMonitoring } from './useMonitoring';

export const useNavigation = () => {
  const navigate = useNavigate();
  const { trackNavigation } = useMonitoring('Navigation');

  const goTo = useCallback((
    route: RouteName,
    options: NavigateOptions = {}
  ) => {
    const path = ROUTES[route];
    trackNavigation(path, {
      from: window.location.pathname,
      state: options.state
    });
    navigate(path, options);
  }, [navigate, trackNavigation]);

  const goBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  return {
    goTo,
    goBack,
    routes: ROUTES
  };
};

export type { RouteName, NavigateOptions };
