import { BaseService, ServiceResult, ListResult } from './BaseService';
import { Organization, Profile, Invitation, Region, Database } from '../types/database';
import { monitoring } from './MonitoringService';

// Define query result types
type RegionQueryResult = {
  id: string;
  name: string;
  description: string | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
};

type ProfileQueryResult = {
  id: string;
  email: string;
  role: Profile['role'];
  organization_id: string | null;
  region_id: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  force_password_change: boolean;
  region?: RegionQueryResult | null;
};

type ProfileWithRegion = Profile & {
  region: Region | undefined;
};

interface RpcInviteResult {
  success: boolean;
  invitation: {
    token: string;
    email: string;
    organization_id: string;
    role: string;
    region_id?: string;
  };
}

export interface OrganizationServiceInterface {
  getOrganizationMembers(
    organizationId: string,
    options?: { page?: number; limit?: number; includeRegions?: boolean }
  ): Promise<ListResult<ProfileWithRegion>>;
  updateMemberRole(
    userId: string,
    role: Profile['role'],
    regionId?: string | null
  ): Promise<ServiceResult<Profile>>;
  removeMember(userId: string): Promise<ServiceResult<void>>;
  getOrganization(id: string): Promise<ServiceResult<Organization>>;
  updateOrganization(
    id: string,
    updates: Partial<Organization>
  ): Promise<ServiceResult<Organization>>;
  getCurrentUserOrganization(): Promise<ServiceResult<Organization>>;
  inviteUserToOrganization(
    email: string,
    organizationId: string,
    role?: Profile['role'],
    regionId?: string
  ): Promise<ServiceResult<{ token: string }>>;
  getPendingInvitations(organizationId: string): Promise<ServiceResult<Invitation[]>>;
  checkInvitationToken(
    token: string
  ): Promise<ServiceResult<{ valid: boolean; invitation: Invitation | null }>>;
  cancelInvitation(invitationId: string): Promise<ServiceResult<void>>;
  acceptInvitation(token: string): Promise<ServiceResult<void>>;
}

export class OrganizationService
  extends BaseService<'organizations'>
  implements OrganizationServiceInterface
{
  constructor() {
    super('organizations');
  }

  /**
   * Get organization members with their region information
   */
  async getOrganizationMembers(
    organizationId: string,
    options?: {
      page?: number;
      limit?: number;
      includeRegions?: boolean;
    }
  ): Promise<ListResult<ProfileWithRegion>> {
    try {
      const page = options?.page || 1;
      const limit = options?.limit || 10;
      const offset = (page - 1) * limit;

      const query = this.supabase
        .from('profiles')
        .select(
          options?.includeRegions
            ? `
              id,
              email,
              role,
              organization_id,
              region_id,
              first_name,
              last_name,
              avatar_url,
              created_at,
              updated_at,
              force_password_change,
              region:regions (
                id,
                name,
                description,
                organization_id,
                created_at,
                updated_at
              )
            `
            : `
              id,
              email,
              role,
              organization_id,
              region_id,
              first_name,
              last_name,
              avatar_url,
              created_at,
              updated_at,
              force_password_change
            `,
          { count: 'exact' }
        )
        .eq('organization_id', organizationId)
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      // Cast and format the data with explicit type definitions
      const queryResult = (data || []) as unknown as ProfileQueryResult[];
      const formattedData = queryResult.map((profile) => {
        // Convert the query result to match our Profile type
        const formattedProfile: Profile = {
          id: profile.id,
          email: profile.email,
          role: profile.role,
          organization_id: profile.organization_id,
          region_id: profile.region_id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          avatar_url: profile.avatar_url,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
          force_password_change: profile.force_password_change,
        };

        // Add the region if it exists
        const withRegion: ProfileWithRegion = {
          ...formattedProfile,
          region: profile.region
            ? ({
                id: profile.region.id,
                name: profile.region.name,
                description: profile.region.description,
                organization_id: profile.region.organization_id,
                created_at: profile.region.created_at,
                updated_at: profile.region.updated_at,
              } as Region)
            : undefined,
        };

        return withRegion;
      });

      return {
        data: formattedData,
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
   * Update member role and optionally their region
   */
  async updateMemberRole(
    userId: string,
    role: Profile['role'],
    regionId?: string | null
  ): Promise<ServiceResult<Profile>> {
    try {
      // Verify the user exists and get their current profile
      const { data: currentProfile, error: fetchError } = await this.supabase
        .from('profiles')
        .select(
          `
          id,
          organization_id,
          role,
          region_id
        `
        )
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;
      if (!currentProfile) throw new Error('User not found');

      // Prepare updates
      const updates: Partial<Profile> = { role };
      if (regionId !== undefined) {
        updates.region_id = regionId;
      }

      // If setting a regional admin role, verify the region belongs to the organization
      if ((role === 'primary_admin' || role === 'secondary_admin') && regionId) {
        const { data: region, error: regionError } = await this.supabase
          .from('regions')
          .select('organization_id')
          .eq('id', regionId)
          .single();

        if (regionError) throw regionError;
        if (region.organization_id !== currentProfile.organization_id) {
          throw new Error('Region does not belong to the organization');
        }
      }

      // Update the profile
      const { data, error } = await this.supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select(
          `
          id,
          email,
          role,
          organization_id,
          region_id,
          first_name,
          last_name,
          avatar_url,
          created_at,
          updated_at,
          force_password_change
        `
        )
        .single();

      if (error) throw error;

      // If this is a regional admin role, update or create region_admins entry
      if (role === 'primary_admin' || role === 'secondary_admin') {
        if (regionId) {
          await this.supabase.from('region_admins').upsert({
            user_id: userId,
            region_id: regionId,
            role: role === 'primary_admin' ? 'primary' : 'secondary',
          });
        }
      } else {
        // If not a regional admin role, remove from region_admins if exists
        await this.supabase.from('region_admins').delete().eq('user_id', userId);
      }

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
   * Remove member from organization and clean up their records
   */
  async removeMember(userId: string): Promise<ServiceResult<void>> {
    try {
      // Clean up any regional admin roles first
      await this.supabase.from('region_admins').delete().eq('user_id', userId);

      // Set organization_id and region_id to null for the user
      const { error } = await this.supabase
        .from('profiles')
        .update({
          organization_id: null,
          region_id: null,
          role: 'user',
        })
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
   * Get organization by ID
   */
  async getOrganization(id: string): Promise<ServiceResult<Organization>> {
    try {
      const { data, error } = await this.supabase
        .from('organizations')
        .select(
          `
          id,
          name,
          owner_id,
          created_at,
          updated_at
        `
        )
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
        .select(
          `
          id,
          name,
          owner_id,
          created_at,
          updated_at
        `
        )
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
        .select(
          `
          id,
          name,
          owner_id,
          created_at,
          updated_at
        `
        )
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
    role: Profile['role'] = 'user',
    regionId?: string
  ): Promise<ServiceResult<{ token: string }>> {
    try {
      // Create invitation using RPC function
      const { data: inviteResult, error } = await this.supabase.rpc('create_invitation', {
        p_email: email,
        p_organization_id: organizationId,
        p_role: role,
        p_region_id: regionId,
      });

      if (error) throw error;
      if (!inviteResult?.success) throw new Error('Failed to create invitation');

      const result = inviteResult as RpcInviteResult;

      const { error: emailError } = await this.supabase.auth.signInWithOtp({
        email,
        options: {
          data: {
            invitation_token: result.invitation.token,
            organization_id: organizationId,
            role: role,
            region_id: regionId,
            type: 'invite',
          },
          emailRedirectTo: `${window.location.origin}/join-organization?token=${result.invitation.token}`,
        },
      });

      if (emailError) throw emailError;

      monitoring.startMetric('user_invited_to_organization', {
        email,
        organizationId,
        hasRegion: !!regionId,
      });

      return {
        data: {
          token: result.invitation.token,
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
  async getPendingInvitations(organizationId: string): Promise<ServiceResult<Invitation[]>> {
    try {
      const { data, error } = await this.supabase
        .from('invitations')
        .select(
          `
          id,
          email,
          organization_id,
          role,
          token,
          created_at,
          expires_at,
          accepted_at,
          status,
          region:regions (
            id,
            name
          )
        `
        )
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
