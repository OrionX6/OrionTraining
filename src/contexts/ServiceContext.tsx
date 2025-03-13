import React, { createContext, useContext } from 'react';
import {
  userService,
  quizService,
  studyMaterialService,
  organizationService,
  regionService,
} from '../services';
import type {
  UserService,
  QuizService,
  StudyMaterialService,
  OrganizationService,
  RegionService,
} from '../services';

export interface ServiceContextType {
  userService: UserService;
  quizService: QuizService;
  studyMaterialService: StudyMaterialService;
  organizationService: OrganizationService;
  regionService: RegionService;
}

const ServiceContext = createContext<ServiceContextType | null>(null);

interface ServiceProviderProps {
  children: React.ReactNode;
}

export function ServiceProvider({ children }: ServiceProviderProps) {
  const services: ServiceContextType = {
    userService,
    quizService,
    studyMaterialService,
    organizationService,
    regionService,
  };

  return <ServiceContext.Provider value={services}>{children}</ServiceContext.Provider>;
}

// Hooks to access individual services
export function useUserService(): UserService {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useUserService must be used within a ServiceProvider');
  }
  return context.userService;
}

export function useQuizService(): QuizService {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useQuizService must be used within a ServiceProvider');
  }
  return context.quizService;
}

export function useStudyMaterialService(): StudyMaterialService {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useStudyMaterialService must be used within a ServiceProvider');
  }
  return context.studyMaterialService;
}

export function useOrganizationService(): OrganizationService {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useOrganizationService must be used within a ServiceProvider');
  }
  return context.organizationService;
}

// Combined hook for accessing all services
export function useRegionService(): RegionService {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useRegionService must be used within a ServiceProvider');
  }
  return context.regionService;
}

export function useServices(): ServiceContextType {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useServices must be used within a ServiceProvider');
  }
  return context;
}

// Export context for testing purposes
export { ServiceContext };
