import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import theme, { type AppTheme } from '../theme';
import { AuthProvider } from '../contexts/AuthContext';
import { ServiceProvider } from '../contexts/ServiceContext';

// Utility type for components that need theme access
export type WithTheme = {
  theme: AppTheme;
};

interface AppProvidersProps {
  children: React.ReactNode;
}

export default function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ServiceProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ServiceProvider>
    </ThemeProvider>
  );
}

/**
 * Helper for wrapping test components with providers
 */
export function TestProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider theme={theme}>
      <ServiceProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ServiceProvider>
    </ThemeProvider>
  );
}

/**
 * Helper for wrapping components with specific providers
 */
export function withProviders<P extends object>(
  Component: React.ComponentType<P>,
  providers: Array<React.ComponentType<{ children: React.ReactNode }>> = []
): React.ComponentType<P> {
  return function WrappedComponent(props: P) {
    return providers.reduceRight(
      (children, Provider) => <Provider>{children}</Provider>,
      <Component {...props} />
    );
  };
}

/**
 * Helper for wrapping components that need theme access
 */
export function withTheme<P extends WithTheme>(
  Component: React.ComponentType<P>
): React.ComponentType<Omit<P, keyof WithTheme>> {
  return function ThemedComponent(props: Omit<P, keyof WithTheme>) {
    return (
      <ThemeProvider theme={theme}>
        <Component {...(props as P)} theme={theme} />
      </ThemeProvider>
    );
  };
}
