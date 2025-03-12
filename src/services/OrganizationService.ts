import { BaseService, ServiceResult, ListResult } from './BaseService';
import { Organization, Profile, Invitation } from '../types/database';
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
        .maybeSingle();

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
        .maybeSingle();

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
   * Send an invitation to join the organization
   */
  async inviteUserToOrganization(
    email: string,
    organizationId: string,
    role: Profile['role'] = 'user'
  ): Promise<ServiceResult<{ token: string }>> {
    try {
      // Create invitation using RPC function
      const { data: inviteResult, error } = (await this.supabase.rpc('create_invitation', {
        p_email: email,
        p_organization_id: organizationId,
        p_role: role,
      })) as {
        data: {
          success: boolean;
          invitation: {
            token: string;
            email: string;
            organization_id: string;
            role: string;
          };
        };
        error: any;
      };

      if (error) throw error;

      if (!inviteResult?.success) throw new Error('Failed to create invitation');

      const { error: emailError } = await this.supabase.auth.signInWithOtp({
        email,
        options: {
          data: {
            invitation_token: inviteResult.invitation.token,
            organization_id: organizationId,
            role: role,
            type: 'invite',
          },
          emailRedirectTo: `${window.location.origin}/join-organization?token=${inviteResult.invitation.token}`,
        },
      });

      if (emailError) throw emailError;

      // Track the invitation
      monitoring.startMetric('user_invited_to_organization', {
        email,
        organizationId,
      });

      return {
        data: {
          token: inviteResult.invitation.token,
        },
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error, {
          context: 'OrganizationService.inviteUserToOrganization',
          email,
          organizationId,
          role,
        }),
      };
    }
  }

  /**
   * Get pending invitations for an organization
   */
  async getPendingInvitations(organizationId: string): Promise<ServiceResult<any[]>> {
    try {
      const { data, error } = await this.supabase
        .from('invitations')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return {
        data: [],
        error: this.handleError(error, {
          context: 'OrganizationService.getPendingInvitations',
          organizationId,
        }),
      };
    }
  }

  /**
   * Accept an invitation to join an organization
   */
  /**
   * Check if an invitation token is valid
   */
  async checkInvitationToken(
    token: string
  ): Promise<ServiceResult<{ valid: boolean; invitation: Invitation | null }>> {
    try {
      const { data, error } = await this.supabase.rpc('check_invitation_token', {
        p_token: token,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return {
        data: { valid: false, invitation: null },
        error: this.handleError(error, {
          context: 'OrganizationService.checkInvitationToken',
          token,
        }),
      };
    }
  }

  /**
   * Cancel a pending invitation
   */
  async cancelInvitation(invitationId: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await this.supabase
        .from('invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      if (error) throw error;
      return { data: undefined, error: null };
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error, {
          context: 'OrganizationService.cancelInvitation',
          invitationId,
        }),
      };
    }
  }

  /**
   * Accept an invitation to join an organization
   */
  async acceptInvitation(token: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await this.supabase.rpc('accept_invitation', {
        p_token: token,
      });

      // Refresh authenticated session to reflect new organization membership
      await this.supabase.auth.refreshSession();

      if (error) throw error;

      return { data: undefined, error: null };
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error, {
          context: 'OrganizationService.acceptInvitation',
          token,
        }),
      };
    }
  }
}
