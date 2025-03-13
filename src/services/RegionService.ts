import { BaseService } from './BaseService';
import { Database, Region, RegionAdmin, Profile } from '../types/database';
import { SupabaseClient } from '@supabase/supabase-js';

export class RegionService extends BaseService<'regions'> {
  constructor() {
    super('regions');
  }

  /**
   * Create a new region
   */
  async createRegion(data: {
    name: string;
    description?: string;
    organizationId: string;
  }): Promise<Region> {
    const { data: region, error } = await this.supabase
      .from('regions')
      .insert({
        name: data.name,
        description: data.description,
        organization_id: data.organizationId,
      })
      .select(
        `
        id,
        name,
        description,
        organization_id,
        created_at,
        updated_at
      `
      )
      .single();

    if (error) {
      throw this.handleError(error, {
        context: 'RegionService.createRegion',
        data,
      });
    }

    return region;
  }

  /**
   * Update a region's details
   */
  async updateRegion(
    regionId: string,
    data: { name?: string; description?: string }
  ): Promise<Region> {
    const { data: region, error } = await this.supabase
      .from('regions')
      .update(data)
      .eq('id', regionId)
      .select(
        `
        id,
        name,
        description,
        organization_id,
        created_at,
        updated_at
      `
      )
      .single();

    if (error) {
      throw this.handleError(error, {
        context: 'RegionService.updateRegion',
        regionId,
        data,
      });
    }

    return region;
  }

  /**
   * Get a region by ID
   */
  async getRegion(regionId: string): Promise<Region | null> {
    const { data: region, error } = await this.supabase
      .from('regions')
      .select(
        `
        id,
        name,
        description,
        organization_id,
        created_at,
        updated_at
      `
      )
      .eq('id', regionId)
      .single();

    if (error) {
      throw this.handleError(error, {
        context: 'RegionService.getRegion',
        regionId,
      });
    }

    return region;
  }

  /**
   * List all regions for an organization
   */
  async listRegions(organizationId: string): Promise<Region[]> {
    const { data: regions, error } = await this.supabase
      .from('regions')
      .select(
        `
        id,
        name,
        description,
        organization_id,
        created_at,
        updated_at
      `
      )
      .eq('organization_id', organizationId)
      .order('name');

    if (error) {
      throw this.handleError(error, {
        context: 'RegionService.listRegions',
        organizationId,
      });
    }

    return regions;
  }

  /**
   * Assign a primary admin to a region
   */
  async assignPrimaryAdmin(regionId: string, userId: string): Promise<RegionAdmin> {
    const { data: admin, error } = await this.supabase
      .from('region_admins')
      .insert({
        region_id: regionId,
        user_id: userId,
        role: 'primary',
      })
      .select(
        `
        id,
        region_id,
        user_id,
        role,
        reports_to,
        created_at,
        updated_at
      `
      )
      .single();

    if (error) {
      throw this.handleError(error, {
        context: 'RegionService.assignPrimaryAdmin',
        regionId,
        userId,
      });
    }

    // Update the user's profile to include the region
    await this.supabase
      .from('profiles')
      .update({ region_id: regionId, role: 'primary_admin' })
      .eq('id', userId);

    return admin;
  }

  /**
   * Assign a secondary admin to a region
   */
  async assignSecondaryAdmin(
    regionId: string,
    userId: string,
    reportsTo: string
  ): Promise<RegionAdmin> {
    const { data: admin, error } = await this.supabase
      .from('region_admins')
      .insert({
        region_id: regionId,
        user_id: userId,
        role: 'secondary',
        reports_to: reportsTo,
      })
      .select(
        `
        id,
        region_id,
        user_id,
        role,
        reports_to,
        created_at,
        updated_at
      `
      )
      .single();

    if (error) {
      throw this.handleError(error, {
        context: 'RegionService.assignSecondaryAdmin',
        regionId,
        userId,
        reportsTo,
      });
    }

    // Update the user's profile to include the region
    await this.supabase
      .from('profiles')
      .update({ region_id: regionId, role: 'secondary_admin' })
      .eq('id', userId);

    return admin;
  }

  /**
   * Remove an admin from a region
   */
  async removeAdmin(regionId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('region_admins')
      .delete()
      .eq('region_id', regionId)
      .eq('user_id', userId);

    if (error) {
      throw this.handleError(error, {
        context: 'RegionService.removeAdmin',
        regionId,
        userId,
      });
    }

    // Reset the user's profile region and role
    await this.supabase.from('profiles').update({ region_id: null, role: 'user' }).eq('id', userId);
  }

  /**
   * Add a user to a region
   */
  async addUserToRegion(regionId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('profiles')
      .update({ region_id: regionId })
      .eq('id', userId);

    if (error) {
      throw this.handleError(error, {
        context: 'RegionService.addUserToRegion',
        regionId,
        userId,
      });
    }
  }

  /**
   * Remove a user from a region
   */
  async removeUserFromRegion(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('profiles')
      .update({ region_id: null })
      .eq('id', userId);

    if (error) {
      throw this.handleError(error, {
        context: 'RegionService.removeUserFromRegion',
        userId,
      });
    }
  }

  /**
   * Get all users in a region
   */
  async getRegionUsers(regionId: string): Promise<Profile[]> {
    const { data: users, error } = await this.supabase
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
        updated_at
      `
      )
      .eq('region_id', regionId)
      .order('role', { ascending: false })
      .order('email');

    if (error) {
      throw this.handleError(error, {
        context: 'RegionService.getRegionUsers',
        regionId,
      });
    }

    return users;
  }

  /**
   * Get region admins
   */
  async getRegionAdmins(regionId: string): Promise<Profile[]> {
    const { data: admins, error } = await this.supabase
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
        updated_at
      `
      )
      .eq('region_id', regionId)
      .in('role', ['primary_admin', 'secondary_admin'])
      .order('role')
      .order('email');

    if (error) {
      throw this.handleError(error, {
        context: 'RegionService.getRegionAdmins',
        regionId,
      });
    }

    return admins;
  }

  /**
   * Transfer primary admin role to another user
   */
  async transferPrimaryAdmin(
    regionId: string,
    currentAdminId: string,
    newAdminId: string
  ): Promise<void> {
    // Start a transaction
    const { error } = await this.supabase.rpc('transfer_primary_admin', {
      p_region_id: regionId,
      p_current_admin_id: currentAdminId,
      p_new_admin_id: newAdminId,
    });

    if (error) {
      throw this.handleError(error, {
        context: 'RegionService.transferPrimaryAdmin',
        regionId,
        currentAdminId,
        newAdminId,
      });
    }
  }

  /**
   * Check if current user can manage global content
   */
  async canManageGlobalContent(): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('can_manage_global_content');

    if (error) {
      throw this.handleError(error, {
        context: 'RegionService.canManageGlobalContent',
      });
    }

    return data;
  }

  /**
   * Get current user's region role
   */
  async getCurrentUserRegionRole(): Promise<'primary' | 'secondary' | null> {
    const { data, error } = await this.supabase.rpc('get_user_region_role');

    if (error) {
      throw this.handleError(error, {
        context: 'RegionService.getCurrentUserRegionRole',
      });
    }

    return data;
  }

  /**
   * Delete a region
   */
  async deleteRegion(id: string): Promise<void> {
    const { error } = await this.table.delete().eq('id', id);

    if (error) {
      throw this.handleError(error, {
        context: 'RegionService.deleteRegion',
        id,
      });
    }
  }
}
