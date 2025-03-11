import { BaseService, ServiceResult, ListResult } from './BaseService';
import { UserService } from './UserService';
import { QuizService } from './QuizService';
import { StudyMaterialService } from './StudyMaterialService';
import { OrganizationService } from './OrganizationService';
import { monitoring } from './MonitoringService';

// Initialize services
export const userService = new UserService();
export const quizService = new QuizService();
export const studyMaterialService = new StudyMaterialService();
export const organizationService = new OrganizationService();

// Export service types
export type { ServiceResult, ListResult };

// Export base service for extension
export { BaseService };

// Export monitoring service
export { monitoring };

// Export individual service classes
export { UserService, QuizService, StudyMaterialService, OrganizationService };
