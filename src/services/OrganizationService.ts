import { BaseService, ServiceResult, ListResult } from './BaseService';
import { Organization, Profile } from '../types/database';
import { monitoring } from './MonitoringService';

export class OrganizationService extends BaseService<'organizations'> {
  constructor() {
    super('organizations');
  }

  /**
   * Get organization by ID
   */
  async getOrganization(id: string): Promise<ServiceResult<Organization>> {
    try {
      const { data, error } = await this.supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error, {
          context: 'OrganizationService.getOrganization',
          id,
        }),
      };
    }
  }

  /**
   * Update organization details
   */
  async updateOrganization(
    id: string,
    updates: Partial<Organization>
  ): Promise<ServiceResult<Organization>> {
    try {
      const { data, error } = await this.supabase
        .from('organizations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error, {
          context: 'OrganizationService.updateOrganization',
          id,
          updates,
        }),
      };
    }
  }

  /**
   * Get organization members
   */
  async getOrganizationMembers(
    organizationId: string,
    options?: {
      page?: number;
      limit?: number;
    }
  ): Promise<ListResult<Profile>> {
    try {
      const page = options?.page || 1;
      const limit = options?.limit || 10;
      const offset = (page - 1) * limit;

      const { data, error, count } = await this.supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .eq('organization_id', organizationId)
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        data: data || [],
        count,
        error: null,
      };
    } catch (error) {
      return {
        data: [],
        count: null,
        error: this.handleError(error, {
          context: 'OrganizationService.getOrganizationMembers',
          organizationId,
        }),
      };
    }
  }

  /**
   * Update member role
   */
  async updateMemberRole(userId: string, role: Profile['role']): Promise<ServiceResult<Profile>> {
    try {
      // Verify the user exists and get their current profile
      const { data: currentProfile, error: fetchError } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;
      if (!currentProfile) throw new Error('User not found');

      // Update the role
      const { data, error } = await this.supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error, {
          context: 'OrganizationService.updateMemberRole',
          userId,
          role,
        }),
      };
    }
  }

  /**
   * Remove member from organization
   * Note: This doesn't delete the user, just removes their organization association
   */
  async removeMember(userId: string): Promise<ServiceResult<void>> {
    try {
      // Set organization_id to null for the user
      const { error } = await this.supabase
        .from('profiles')
        .update({ organization_id: null })
        .eq('id', userId);

      if (error) throw error;
      return { data: undefined, error: null };
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error, {
          context: 'OrganizationService.removeMember',
          userId,
        }),
      };
    }
  }

  /**
   * Check if user is organization admin
   */
  async isOrganizationAdmin(userId: string): Promise<ServiceResult<boolean>> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) throw error;

      const isAdmin = data?.role === 'admin' || data?.role === 'super_admin';
      return { data: isAdmin, error: null };
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error, {
          context: 'OrganizationService.isOrganizationAdmin',
          userId,
        }),
      };
    }
  }

  /**
   * Get current user's organization
   */
  async getCurrentUserOrganization(): Promise<ServiceResult<Organization>> {
    try {
      const { data: session } = await this.supabase.auth.getSession();
      if (!session?.session?.user) {
        throw new Error('No authenticated user');
      }

      const userId = session.session.user.id;

      // Get the user's profile to find their organization_id
      const { data: profile, error: profileError } = await this.supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      if (!profile?.organization_id) {
        return { data: null, error: null }; // User doesn't belong to an organization
      }

      // Get the organization details
      const { data: organization, error: orgError } = await this.supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single();

      if (orgError) throw orgError;
      return { data: organization, error: null };
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error, {
          context: 'OrganizationService.getCurrentUserOrganization',
        }),
      };
    }
  }

  /**
   * Invite user to organization (placeholder for future email invitation system)
   * Currently just adds the user to the organization if they exist
   */
  async inviteUserToOrganization(
    email: string,
    organizationId: string,
    role: Profile['role'] = 'user'
  ): Promise<ServiceResult<void>> {
    try {
      // Check if user with this email exists
      const { data: existingUser, error: userError } = await this.supabase
        .from('profiles')
        .select('id, organization_id')
        .eq('email', email)
        .single();

      if (userError && !userError.message.includes('No rows found')) {
        throw userError;
      }

      if (!existingUser) {
        throw new Error('User with this email does not exist');
      }

      if (existingUser.organization_id) {
        throw new Error('User already belongs to an organization');
      }

      // Update the user's organization_id
      const { error: updateError } = await this.supabase
        .from('profiles')
        .update({
          organization_id: organizationId,
          role,
        })
        .eq('id', existingUser.id);

      if (updateError) throw updateError;

      // In a real implementation, you would send an email invitation here
      monitoring.startMetric('user_invited_to_organization', {
        email,
        organizationId,
      });

      return { data: undefined, error: null };
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error, {
          context: 'OrganizationService.inviteUserToOrganization',
          email,
          organizationId,
        }),
      };
    }
  }
}
