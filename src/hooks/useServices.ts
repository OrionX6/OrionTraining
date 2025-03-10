import { useCallback } from 'react';
import { useServices as useServicesContext, type ServiceContextType } from '../contexts/ServiceContext';
import type { ServiceResult, ListResult } from '../services';
import { monitoring } from '../services/MonitoringService';

type ServiceNames = keyof ServiceContextType;
type ServiceMethods<T extends ServiceNames> = keyof ServiceContextType[T];

/**
 * Hook to safely access services with monitoring and error handling
 */
export function useServices() {
  const services = useServicesContext();

  /**
   * Wraps a service method call with monitoring
   */
  const callService = useCallback(async <T>(
    serviceName: ServiceNames,
    methodName: string,
    serviceCall: () => Promise<ServiceResult<T> | ListResult<T>>,
    context: Record<string, any> = {}
  ): Promise<ServiceResult<T> | ListResult<T>> => {
    const endMark = monitoring.startMetric(`service_call`, {
      service: serviceName,
      method: methodName,
      ...context
    });

    try {
      const result = await serviceCall();

      if (result.error) {
        monitoring.captureError(result.error, {
          context: 'ServiceCall',
          service: serviceName,
          method: methodName,
          ...context
        });
      } else {
        monitoring.startMetric(`service_success`, {
          service: serviceName,
          method: methodName,
          ...context
        });
      }

      return result;
    } catch (error) {
      monitoring.captureError(error as Error, {
        context: 'ServiceCall',
        service: serviceName,
        method: methodName,
        ...context
      });
      return {
        data: null,
        error: error as Error,
        count: 0
      } as ServiceResult<T> | ListResult<T>;
    } finally {
      endMark();
    }
  }, []);

  /**
   * Wraps sync service access with monitoring
   */
  const withService = useCallback(<T>(
    serviceName: ServiceNames,
    methodName: string,
    serviceAccess: () => T,
    context: Record<string, any> = {}
  ): T => {
    const endMark = monitoring.startMetric(`service_access`, {
      service: serviceName,
      method: methodName,
      ...context
    });

    try {
      const result = serviceAccess();
      return result;
    } catch (error) {
      monitoring.captureError(error as Error, {
        context: 'ServiceAccess',
        service: serviceName,
        method: methodName,
        ...context
      });
      throw error;
    } finally {
      endMark();
    }
  }, []);

  // Return wrapped services and helper methods
  return {
    ...services,
    callService,
    withService
  };
}

export type { ServiceNames, ServiceMethods };
