import { BaseService, ServiceResult } from './BaseService';
import { Profile, RegistrationResult } from '../types/database';
import { monitoring } from './MonitoringService';
import { clearAuthCache } from '../utils/authCache';

interface PendingRegistration {
  email: string;
  organizationName: string;
}

export class UserService extends BaseService<'profiles'> {
  private pendingRegistration: PendingRegistration | null = null;

  constructor() {
    super('profiles');
  }

  async uploadAvatar(file: File, userId: string): Promise<ServiceResult<string>> {
    try {
      // Validate file
      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file');
      }
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('File size must be under 2MB');
      }

      // Generate file path
      const fileExt = file.name.split('.').pop();
      if (!fileExt) {
        throw new Error('Invalid file extension');
      }

      const filePath = `${userId}/${Date.now()}.${fileExt}`;

      // Upload file to avatars bucket
      const { error: uploadError } = await this.supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        // Check for specific storage errors
        if (uploadError.message.includes('Permission')) {
          throw new Error('You do not have permission to upload files');
        }
        if (uploadError.message.includes('Bucket')) {
          throw new Error('Storage system is not properly configured');
        }
        throw new Error('Failed to upload file: ' + uploadError.message);
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = this.supabase.storage.from('avatars').getPublicUrl(filePath);

      if (!publicUrl) {
        throw new Error('Failed to get public URL for uploaded file');
      }

      return { data: publicUrl, error: null };
    } catch (error) {
      const err = this.handleError(error, {
        context: 'UserService',
        operation: 'uploadAvatar',
      });
      return { data: null, error: err };
    }
  }

  async deleteAvatar(filePath: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await this.supabase.storage.from('avatars').remove([filePath]);

      if (error) {
        // Check for specific storage errors
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
      const err = this.handleError(error, {
        context: 'UserService',
        operation: 'deleteAvatar',
      });
      return { data: null, error: err };
    }
  }

  async getCurrentUser(): Promise<ServiceResult<Profile>> {
    try {
      const { data: session } = await this.supabase.auth.getSession();
      if (!session?.session?.user) {
        throw new Error('No authenticated user');
      }

      const userId = session.session.user.id;

      console.debug('Getting current user profile:', {
        userId,
        email: session.session.user.email,
      });

      // Use a direct query approach to prevent parameter duplication
      const { data: profile, error: profileError } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // Handle the case where the query fails because the profile doesn't exist
      if (profileError) {
        // Check if it's a "not found" error, which is expected during registration
        if (
          profileError.code === 'PGRST116' ||
          profileError.message?.includes('No rows found') ||
          profileError.message?.includes('not found')
        ) {
          console.debug('No profile found for user:', userId);
          return { data: null, error: null };
        }

        console.error('Error getting current user:', {
          error: profileError,
          userId,
        });
        throw profileError;
      }

      if (!profile) {
        console.debug('No profile found for user:', userId);
        return { data: null, error: null };
      }

      // If the profile has an organization_id, fetch the organization separately
      if (profile.organization_id) {
        try {
          // Use a direct query approach to prevent parameter duplication
          const { data: organization, error: orgError } = await this.supabase
            .from('organizations')
            .select('*')
            .eq('id', profile.organization_id)
            .single();

          if (orgError) {
            // Check if it's a "not found" error
            if (
              orgError.code === 'PGRST116' ||
              orgError.message?.includes('No rows found') ||
              orgError.message?.includes('not found')
            ) {
              console.warn('Organization not found:', profile.organization_id);
            } else {
              console.warn('Error fetching organization:', {
                error: orgError,
                organizationId: profile.organization_id,
              });
            }
            // Continue without the organization data
          } else if (organization) {
            // Manually add the organization to the profile
            profile.organization = organization;
          }
        } catch (orgFetchError) {
          console.warn('Exception fetching organization:', orgFetchError);
          // Continue without the organization data
        }
      }

      return { data: profile, error: null };
    } catch (error) {
      const err = this.handleError(error, {
        context: 'UserService',
        operation: 'getCurrentUser',
      });
      return { data: null, error: err };
    }
  }

  async initiateRegistration(
    email: string,
    organizationName: string
  ): Promise<ServiceResult<void>> {
    try {
      console.debug('Initiating registration:', { email, organizationName });
      this.pendingRegistration = { email, organizationName };
      monitoring.startMetric('registration_initiated', {
        email,
        organizationName,
      });
      return { data: undefined, error: null };
    } catch (error) {
      const err = this.handleError(error, {
        context: 'UserService',
        operation: 'initiateRegistration',
        email,
      });
      return { data: null, error: err };
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

      console.debug('Starting registration completion:', {
        userId: session.session.user.id,
        email,
        organizationName,
        metadata: session.session.user.user_metadata,
      });

      // Clear auth cache before registration
      clearAuthCache();

      // Complete registration using RPC
      const { data, error: rpcError } = await this.supabase.rpc('complete_user_registration', {
        p_user_id: session.session.user.id,
        p_email: email,
        p_organization_name: organizationName,
      });

      // Handle RPC error
      if (rpcError) {
        // Check for known error cases
        const err = rpcError?.message || 'Registration failed';

        // Log the error details
        console.error('Registration completion failed:', {
          error: rpcError,
          userId: session.session.user.id,
          email,
          organizationName,
        });

        // If profile already exists, treat as success
        if (err.includes('Profile already exists') || err.includes('profiles_pkey')) {
          console.log('Profile already exists, returning success');
          return {
            data: {
              status: 'success',
              message: 'Profile already exists',
              user_id: session.session.user.id,
              email,
              organization_name: organizationName,
              role: 'admin',
              created_at: new Date().toISOString(),
              organization_id: null as any, // Will be loaded by auth context
            } as RegistrationResult,
            error: null,
          };
        }

        throw new Error(err);
      }

      // Clear pending registration on success
      this.pendingRegistration = null;

      monitoring.startMetric('registration_completed', {
        userId: session.session.user.id,
        status: data?.status || 'unknown',
      });

      return { data: data as RegistrationResult, error: null };
    } catch (error) {
      const err = this.handleError(error, {
        context: 'UserService',
        operation: 'completeRegistration',
      });
      return { data: null, error: err };
    }
  }

  async updateProfile(updates: Partial<Profile>): Promise<ServiceResult<Profile>> {
    try {
      const { data: session } = await this.supabase.auth.getSession();
      if (!session?.session?.user) {
        throw new Error('No authenticated user');
      }

      console.debug('Updating profile:', {
        userId: session.session.user.id,
        updates,
      });

      const userId = session.session.user.id;

      // Use a direct query approach to prevent parameter duplication
      const { data: updatedProfile, error } = await this.supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select('*')
        .single();

      if (error) throw error;

      console.debug('Profile updated successfully:', {
        userId: session.session.user.id,
        profileId: updatedProfile.id,
      });

      // If the profile has an organization_id, fetch the organization separately
      if (updatedProfile.organization_id) {
        try {
          // Use a direct query approach to prevent parameter duplication
          const { data: organization, error: orgError } = await this.supabase
            .from('organizations')
            .select('*')
            .eq('id', updatedProfile.organization_id)
            .single();

          if (orgError) {
            // Check if it's a "not found" error
            if (
              orgError.code === 'PGRST116' ||
              orgError.message?.includes('No rows found') ||
              orgError.message?.includes('not found')
            ) {
              console.warn(
                'Organization not found after profile update:',
                updatedProfile.organization_id
              );
            } else {
              console.warn('Error fetching organization after profile update:', {
                error: orgError,
                organizationId: updatedProfile.organization_id,
              });
            }
            // Continue without the organization data
          } else if (organization) {
            // Manually add the organization to the profile
            updatedProfile.organization = organization;
          }
        } catch (orgFetchError) {
          console.warn('Exception fetching organization after profile update:', orgFetchError);
          // Continue without the organization data
        }
      }

      return { data: updatedProfile, error: null };
    } catch (error) {
      const err = this.handleError(error, {
        context: 'UserService',
        operation: 'updateProfile',
      });
      return { data: null, error: err };
    }
  }
}
