import { BaseService, ServiceResult } from './BaseService';
import { Profile } from '../types/database';
import { monitoring } from './MonitoringService';

interface PendingRegistration {
  email: string;
  organizationName: string;
}

export class UserService extends BaseService<'profiles'> {
  private pendingRegistration: PendingRegistration | null = null;

  constructor() {
    super('profiles');
  }

  async getCurrentUser(): Promise<ServiceResult<Profile>> {
    try {
      const { data: session } = await this.supabase.auth.getSession();
      if (!session?.session?.user) {
        throw new Error('No authenticated user');
      }

      const { data, error } = await this.table
        .select('*, organizations(*)')
        .eq('id', session.session.user.id)
        .maybeSingle();

      if (error) throw error;
      return { data: data || null, error: null };
    } catch (error) {
      const err = this.handleError(error, {
        context: 'UserService',
        operation: 'getCurrentUser'
      });
      return { data: null, error: err };
    }
  }

  async initiateRegistration(
    email: string, 
    organizationName: string
  ): Promise<ServiceResult<void>> {
    try {
      // Store registration data for later
      this.pendingRegistration = { email, organizationName };
      monitoring.startMetric('registration_initiated', {
        email,
        organizationName
      });
      return { data: undefined, error: null };
    } catch (error) {
      const err = this.handleError(error, {
        context: 'UserService',
        operation: 'initiateRegistration',
        email
      });
      return { data: null, error: err };
    }
  }

  hasPendingRegistration(): boolean {
    return !!this.pendingRegistration;
  }

  async completeRegistration(): Promise<ServiceResult<void>> {
    try {
      const { data: session } = await this.supabase.auth.getSession();
      if (!session?.session?.user) {
        throw new Error('No authenticated user');
      }

      if (!this.pendingRegistration) {
        throw new Error('No pending registration');
      }

      const { email, organizationName } = this.pendingRegistration;

      // Create organization
      const { data: org, error: orgError } = await this.supabase
        .from('organizations')
        .insert({
          name: organizationName,
          owner_id: session.session.user.id
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Create profile
      const { error: profileError } = await this.table
        .insert({
          id: session.session.user.id,
          email,
          organization_id: org.id,
          role: 'admin'
        });

      if (profileError) throw profileError;

      // Clear pending registration
      this.pendingRegistration = null;

      monitoring.startMetric('registration_completed', {
        userId: session.session.user.id,
        organizationId: org.id
      });

      return { data: undefined, error: null };
    } catch (error) {
      const err = this.handleError(error, {
        context: 'UserService',
        operation: 'completeRegistration'
      });
      return { data: null, error: err };
    }
  }

  async updateProfile(
    updates: Partial<Profile>
  ): Promise<ServiceResult<Profile>> {
    try {
      const { data: session } = await this.supabase.auth.getSession();
      if (!session?.session?.user) {
        throw new Error('No authenticated user');
      }

      const { data, error } = await this.table
        .update(updates)
        .eq('id', session.session.user.id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      const err = this.handleError(error, {
        context: 'UserService',
        operation: 'updateProfile'
      });
      return { data: null, error: err };
    }
  }
}
