import { useCallback, useRef, useEffect } from 'react';
import { monitoring } from '../services/MonitoringService';
import type { MetricOptions, ApiMetric, MetricEndMark } from '../services/MonitoringService';

interface UseMonitoringOptions {
  autoTrackRender?: boolean;
  autoTrackErrors?: boolean;
}

/**
 * Hook for monitoring component performance and interactions
 */
export function useMonitoring(
  componentName: string,
  options: UseMonitoringOptions = {}
) {
  const { autoTrackRender = true, autoTrackErrors = true } = options;
  const renderStartRef = useRef(performance.now());

  // Track component render time
  useEffect(() => {
    if (!autoTrackRender) return;

    const renderDuration = performance.now() - renderStartRef.current;
    monitoring.markComponentRender(componentName, renderDuration, {
      timestamp: Date.now()
    });

    // Track cleanup
    return () => {
      if (autoTrackErrors) {
        monitoring.markComponentRender(componentName, performance.now() - renderStartRef.current, {
          timestamp: Date.now(),
          event: 'unmount'
        });
      }
    };
  });

  // Track API calls
  const trackApiCall = useCallback((metric: ApiMetric): void => {
    monitoring.markApiCall(metric);
  }, []);

  // Start timing an operation
  const startOperation = useCallback((
    operationName: string,
    options: MetricOptions = {}
  ): MetricEndMark => {
    return monitoring.startMetric(`${componentName}_${operationName}`, {
      component: componentName,
      ...options
    });
  }, [componentName]);

  // Track errors
  const trackError = useCallback((
    error: Error,
    context: Record<string, any> = {}
  ): void => {
    monitoring.captureError(error, {
      component: componentName,
      ...context
    });
  }, [componentName]);

  // Track navigation
  const trackNavigation = useCallback((
    path: string,
    options: MetricOptions = {}
  ): void => {
    monitoring.markNavigation(path, {
      component: componentName,
      ...options
    });
  }, [componentName]);

  return {
    trackApiCall,
    startOperation,
    trackError,
    trackNavigation,
    monitoring
  };
}

// Re-export types for convenience
export type { MetricOptions, ApiMetric, MetricEndMark, UseMonitoringOptions };
