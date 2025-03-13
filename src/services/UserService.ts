import { BaseService, ServiceResult } from './BaseService';
import { Profile, RegistrationResult, Database, Organization } from '../types/database';
import { monitoring } from './MonitoringService';
import { clearAuthCache } from '../utils/authCache';
import { createClient } from '@supabase/supabase-js';

interface PendingRegistration {
  email: string;
  organizationName: string;
}

interface CreateUserParams {
  email: string;
  password: string;
  role: Profile['role'];
  organizationId: string;
  firstName?: string;
  lastName?: string;
  regionId: string | null;
  sendEmail?: boolean;
}

type OrganizationResponse = {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
};

type RawProfileResponse = {
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
  organization: OrganizationResponse | null;
};

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

      const userId = session.session.user.id;

      // Query profile and organization in a single request
      const { data: profilesData, error: profileError } = await this.supabase
        .from('profiles')
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
          force_password_change,
          organization:organizations (
            id,
            name,
            owner_id,
            created_at,
            updated_at
          )
        `
        )
        .eq('id', userId)
        .limit(1);

      if (profileError) throw profileError;
      if (!profilesData?.length) return { data: null, error: null };

      // Cast the raw response to our known structure with intermediate step
      const rawData = profilesData[0] as unknown;
      const rawProfile = rawData as RawProfileResponse;

      // Create the full profile with explicitly typed data
      const fullProfile: Profile = {
        id: rawProfile.id,
        email: rawProfile.email,
        role: rawProfile.role,
        organization_id: rawProfile.organization_id,
        region_id: rawProfile.region_id,
        first_name: rawProfile.first_name,
        last_name: rawProfile.last_name,
        avatar_url: rawProfile.avatar_url,
        created_at: rawProfile.created_at,
        updated_at: rawProfile.updated_at,
        force_password_change: rawProfile.force_password_change || false,
        organization: rawProfile.organization || undefined,
      };

      return { data: fullProfile, error: null };
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error, {
          context: 'UserService.getCurrentUser',
          operation: 'getCurrentUser',
        }),
      };
    }
  }

  async updateProfile(updates: Partial<Profile>): Promise<ServiceResult<Profile>> {
    try {
      const { data: session } = await this.supabase.auth.getSession();
      if (!session?.session?.user) {
        throw new Error('No authenticated user');
      }

      const userId = session.session.user.id;

      // Update profile and get organization data in a single request
      const { data: updatedProfile, error: updateError } = await this.supabase
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
          force_password_change,
          organization:organizations (
            id,
            name,
            owner_id,
            created_at,
            updated_at
          )
          `
        )
        .single();

      if (updateError) throw updateError;

      // Cast the raw response to our known structure with intermediate step
      const rawData = updatedProfile as unknown;
      const rawProfile = rawData as RawProfileResponse;

      // Create the full profile with explicitly typed data
      const fullProfile: Profile = {
        id: rawProfile.id,
        email: rawProfile.email,
        role: rawProfile.role,
        organization_id: rawProfile.organization_id,
        region_id: rawProfile.region_id,
        first_name: rawProfile.first_name,
        last_name: rawProfile.last_name,
        avatar_url: rawProfile.avatar_url,
        created_at: rawProfile.created_at,
        updated_at: rawProfile.updated_at,
        force_password_change: rawProfile.force_password_change || false,
        organization: rawProfile.organization || undefined,
      };

      return { data: fullProfile, error: null };
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error, {
          context: 'UserService.updateProfile',
          operation: 'updateProfile',
        }),
      };
    }
  }

  async createUser({
    email,
    password,
    role,
    organizationId,
    firstName,
    lastName,
    regionId = null,
    sendEmail = false,
  }: CreateUserParams): Promise<ServiceResult<{ userId: string; emailSent?: boolean }>> {
    try {
      const { data: session } = await this.supabase.auth.getSession();
      if (!session?.session?.user) {
        throw new Error('Not authenticated');
      }

      const { data: authData, error: authError } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      const userId = authData.user.id;

      // Confirm email for admin-created users
      const supabaseAdmin = createClient(
        process.env.REACT_APP_SUPABASE_URL || '',
        process.env.REACT_APP_SUPABASE_SERVICE_KEY || ''
      );

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email_confirm: true,
      });

      if (updateError) throw updateError;

      const { data: profileData, error: profileError } = await this.supabase.rpc(
        'create_user_profile_v2',
        {
          p_user_id: userId,
          p_email: email,
          p_role: role,
          p_organization_id: organizationId,
          p_first_name: firstName || null,
          p_last_name: lastName || null,
          p_region_id: regionId || null,
          p_created_by: session.session.user.id,
        }
      );

      if (profileError) throw profileError;

      monitoring.startMetric('user_created', {
        role,
        organizationId,
        emailSent: sendEmail,
      });

      return {
        data: {
          userId,
          emailSent: sendEmail,
        },
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error, {
          context: 'UserService.createUser',
          email,
          role,
          organizationId,
        }),
      };
    }
  }

  async checkPasswordChangeRequired(): Promise<ServiceResult<boolean>> {
    try {
      const { data, error } = await this.supabase.rpc('check_password_change_required');
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return {
        data: false,
        error: this.handleError(error, {
          context: 'UserService.checkPasswordChangeRequired',
        }),
      };
    }
  }

  async completePasswordChange(newPassword: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await this.supabase.rpc('complete_password_change', {
        p_new_password: newPassword,
      });

      if (error) throw error;
      await this.supabase.auth.refreshSession();
      return { data: undefined, error: null };
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error, {
          context: 'UserService.completePasswordChange',
        }),
      };
    }
  }

  async uploadAvatar(file: File, userId: string): Promise<ServiceResult<string>> {
    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file');
      }
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('File size must be under 2MB');
      }

      const fileExt = file.name.split('.').pop();
      if (!fileExt) {
        throw new Error('Invalid file extension');
      }

      const filePath = `${userId}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await this.supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        if (uploadError.message.includes('Permission')) {
          throw new Error('You do not have permission to upload files');
        }
        if (uploadError.message.includes('Bucket')) {
          throw new Error('Storage system is not properly configured');
        }
        throw new Error('Failed to upload file: ' + uploadError.message);
      }

      const {
        data: { publicUrl },
      } = this.supabase.storage.from('avatars').getPublicUrl(filePath);

      if (!publicUrl) {
        throw new Error('Failed to get public URL for uploaded file');
      }

      return { data: publicUrl, error: null };
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error, {
          context: 'UserService.uploadAvatar',
        }),
      };
    }
  }

  async deleteAvatar(filePath: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await this.supabase.storage.from('avatars').remove([filePath]);

      if (error) {
        if (error.message.includes('Permission')) {
          throw new Error('You do not have permission to delete this file');
        }
        if (error.message.includes('Bucket')) {
          throw new Error('Storage system is not properly configured');
        }
        throw new Error('Failed to delete file: ' + error.message);
      }

      return { data: undefined, error: null };
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error, {
          context: 'UserService.deleteAvatar',
        }),
      };
    }
  }

  async initiateRegistration(
    email: string,
    organizationName: string
  ): Promise<ServiceResult<void>> {
    try {
      this.pendingRegistration = { email, organizationName };
      monitoring.startMetric('registration_initiated', {
        email,
        organizationName,
      });
      return { data: undefined, error: null };
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error, {
          context: 'UserService.initiateRegistration',
          email,
        }),
      };
    }
  }

  hasPendingRegistration(): boolean {
    return !!this.pendingRegistration;
  }

  async completeRegistration(): Promise<ServiceResult<RegistrationResult>> {
    try {
      const { data: session } = await this.supabase.auth.getSession();
      if (!session?.session?.user) {
        throw new Error('No authenticated user');
      }

      if (!this.pendingRegistration) {
        throw new Error('No pending registration');
      }

      const { email, organizationName } = this.pendingRegistration;
      clearAuthCache();

      const { data, error: rpcError } = await this.supabase.rpc('complete_user_registration', {
        p_user_id: session.session.user.id,
        p_email: email,
        p_organization_name: organizationName,
      });

      if (rpcError) {
        const err = rpcError?.message || 'Registration failed';

        if (err.includes('Profile already exists') || err.includes('profiles_pkey')) {
          return {
            data: {
              status: 'success',
              message: 'Profile already exists',
              user_id: session.session.user.id,
              email,
              organization_name: organizationName,
              role: 'admin',
              created_at: new Date().toISOString(),
              organization_id: null as any,
            } as RegistrationResult,
            error: null,
          };
        }

        throw new Error(err);
      }

      this.pendingRegistration = null;
      monitoring.startMetric('registration_completed', {
        userId: session.session.user.id,
        status: data?.status || 'unknown',
      });

      return { data: data as RegistrationResult, error: null };
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error, {
          context: 'UserService.completeRegistration',
        }),
      };
    }
  }
}
