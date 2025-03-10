import { Metric } from 'web-vitals';

/**
 * Options for monitoring metrics
 */
export interface MetricOptions extends Record<string, any> {
  timestamp?: number;
  value?: number;
  name?: string;
  label?: string;
  duration?: number;
  path?: string;
  component?: string;
}

/**
 * Return type for startMetric
 */
export interface MetricEndMark {
  (): number;
  mark: number;
}

/**
 * API call metric structure
 */
export interface ApiMetric {
  method: string;
  url: string;
  duration: number;
  status?: number;
  error?: Error;
}

export class MonitoringService {
  private initialized = false;
  private metrics: Map<string, number> = new Map();

  /**
   * Initialize monitoring service
   */
  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    // Add timestamp for initialization
    this.startMetric('monitoring_initialized', {
      timestamp: Date.now(),
      environment: process.env.NODE_ENV
    });
  }

  /**
   * Start timing a metric and return a function to end it
   */
  startMetric(
    name: string,
    options: MetricOptions = {}
  ): MetricEndMark {
    const startMark = performance.now();
    const markId = `${name}_${Date.now()}`;

    // Initialize metric
    this.metrics.set(markId, startMark);

    // Log metric start
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[Monitoring] Started ${name}`, options);
    }

    // Create end function
    const endMark: MetricEndMark = () => {
      const duration = performance.now() - startMark;
      this.metrics.delete(markId);

      // Log metric end in development
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[Monitoring] Completed ${name}`, {
          ...options,
          duration: `${duration.toFixed(2)}ms`
        });
      }

      return duration;
    };

    // Add mark for reference
    endMark.mark = startMark;
    return endMark;
  }

  /**
   * Mark component render time
   */
  markComponentRender(
    componentName: string,
    duration: number,
    options: MetricOptions = {}
  ): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[Monitoring] Component Render: ${componentName}`, {
        duration: `${duration.toFixed(2)}ms`,
        ...options
      });
    }
  }

  /**
   * Mark API call metrics
   */
  markApiCall(metric: ApiMetric): void {
    const { method, url, duration, status, error } = metric;
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[Monitoring] API Call: ${method} ${url}`, {
        duration: `${duration.toFixed(2)}ms`,
        status,
        error: error?.message
      });
    }
  }

  /**
   * Mark navigation events
   */
  markNavigation(path: string, options: MetricOptions = {}): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[Monitoring] Navigation: ${path}`, {
        timestamp: Date.now(),
        ...options
      });
    }
  }

  /**
   * Capture an error with context
   */
  captureError(error: Error, context: Record<string, any> = {}): void {
    console.error('[Monitoring] Error captured:', {
      error,
      ...context,
      timestamp: Date.now()
    });
  }

  /**
   * Track web vitals metrics
   */
  trackVitals(metric: Metric): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Monitoring] Web Vital:', {
        name: metric.name,
        value: metric.value,
        id: metric.id
      });
    }
  }

  /**
   * Clear all active metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
  }

  /**
   * Check if monitoring is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get active metrics count
   */
  getActiveMetricsCount(): number {
    return this.metrics.size;
  }
}

// Create singleton instance
export const monitoring = new MonitoringService();

// Export types for use in other files
export type { Metric };
